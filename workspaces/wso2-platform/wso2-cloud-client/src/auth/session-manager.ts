/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { untilAborted } from "../abort";
import type { FetchLike } from "../api/http";
import type { CloudEnvironment } from "../config/environments";
import { NetworkError, TimeoutError, UnauthenticatedError, UnavailableError, errorMessage, isCloudError } from "../errors";
import type { Logger } from "../logger";
import { silentLogger } from "../logger";
import { discover } from "./discovery";
import { expiryOf, readClaims } from "./login-flow";
import { OAuthError, refreshTokens, revokeToken } from "./token-endpoint";
import type { SessionChangeEvent, SessionStore, StoredSession } from "./types";

/** A token this close to expiry is refreshed before it is used. */
export const REFRESH_MARGIN_MS = 60_000;

/**
 * The token endpoint's answers that mean the refresh token is no good any
 * more (RFC 6749 §5.2). Anything else, an HTML 400 from a gateway or an
 * `invalid_scope` included, says nothing about the refresh token.
 */
const REFUSALS = new Set(["invalid_grant", "unauthorized_client"]);

/** Whether the issuer refused the refresh token, judged by the OAuth error code alone. */
export function isRefusal(error: OAuthError): boolean {
	return REFUSALS.has(error.error);
}

/** What a refresh produced: the session to use, and the failure when its old token was kept because the issuer could not be reached. */
interface RefreshOutcome {
	session: StoredSession;
	failure?: unknown;
}

export interface SessionManagerDeps {
	env: CloudEnvironment;
	store: SessionStore;
	fetch: FetchLike;
	now?: () => Date;
	logger?: Logger;
	refreshMarginMs?: number;
}

/**
 * Holds the one session for an environment: loads it, hands out a fresh
 * access token, refreshes lazily and only once at a time, and ends it.
 *
 * Refreshing is single-flight: every caller that needs a token while one
 * refresh is in flight awaits that same refresh, including a caller whose
 * request just got a 401 and asked for `forceRefresh`. A refresh the issuer
 * refuses (`invalid_grant` and its kin) ends the session; one lost to the
 * network, or to an issuer that is down, keeps it, and the old token is
 * still handed out while it is not yet expired, except to a caller whose
 * request just got a 401 with it.
 *
 * The store is shared with other windows: a change one makes is picked up
 * here when the store reports it, and a refused refresh first checks
 * whether another window already rotated the refresh token.
 */
export class SessionManager {
	private readonly logger: Logger;
	private readonly margin: number;
	private readonly now: () => Date;
	private loaded = false;
	private session?: StoredSession;
	private refreshing?: { generation: number; promise: Promise<RefreshOutcome> };
	/** Bumped whenever the session is replaced or ended, so a refresh in flight for the old one is dropped. */
	private generation = 0;
	private readonly listeners = new Set<(event: SessionChangeEvent) => void>();
	/** This manager's own writes to the store still in flight, and how many it has started, so a reload never takes an older value for a newer one. */
	private readonly pendingWrites = new Set<Promise<void>>();
	private writeCount = 0;
	private readonly unsubscribeStore?: () => void;

	constructor(private readonly deps: SessionManagerDeps) {
		this.logger = deps.logger ?? silentLogger;
		this.margin = deps.refreshMarginMs ?? REFRESH_MARGIN_MS;
		this.now = deps.now ?? (() => new Date());
		this.unsubscribeStore = deps.store.onDidChange?.((env) => {
			if (env === deps.env.name) {
				void this.reload();
			}
		});
	}

	/** The stored session, if any, without refreshing it. */
	async current(): Promise<StoredSession | undefined> {
		if (!this.loaded) {
			const generation = this.generation;
			const stored = await this.deps.store.load(this.deps.env.name);
			// A sign-in or sign-out while the store was read is newer than what it held.
			if (!this.loaded && generation === this.generation) {
				this.session = stored;
				this.loaded = true;
			}
		}
		return this.session;
	}

	/** Keeps a session a sign-in produced. The refresh token of a session it replaces is revoked, best effort. */
	async setSession(session: StoredSession): Promise<void> {
		const replaced = await this.current();
		this.generation++;
		this.session = session;
		this.loaded = true;
		await this.persist(this.deps.store.save(session));
		this.emit({ reason: "signed-in" });
		if (replaced?.tokens.refreshToken && replaced.tokens.refreshToken !== session.tokens.refreshToken) {
			void this.revoke(replaced);
		}
	}

	/**
	 * Changes members of the stored session, such as the organization's uuid
	 * once read. Nothing changes, and the answer is undefined, when the session
	 * was replaced or ended while `change` was being decided.
	 */
	async update(change: (session: StoredSession) => StoredSession): Promise<StoredSession | undefined> {
		const generation = this.generation;
		const session = await this.current();
		if (!session || generation !== this.generation) {
			return undefined;
		}
		this.session = change(session);
		await this.persist(this.deps.store.save(this.session));
		return this.session;
	}

	/** The generation of the session held now; a later sign-in or sign-out changes it. */
	get sessionGeneration(): number {
		return this.generation;
	}

	/** A token that is good for at least the refresh margin, refreshing when it is not. */
	async getAccessToken(options: { forceRefresh?: boolean; signal?: AbortSignal } = {}): Promise<string> {
		const session = await this.current();
		if (!session) {
			throw new UnauthenticatedError("no_session");
		}
		const fresh = this.isFresh(session) && !options.forceRefresh;
		if (fresh) {
			return session.tokens.accessToken;
		}
		const outcome = await this.refresh(session, options.signal);
		if (options.forceRefresh && outcome.failure !== undefined) {
			// The API just rejected the token that was kept: handing it out again would only be rejected again and
			// read as a sign-out, while all that failed is the issuer, for now.
			throw new UnavailableError(`The session's token was rejected and could not be refreshed right now: ${errorMessage(outcome.failure)}`, {
				reason: "refresh_unavailable",
				cause: outcome.failure,
			});
		}
		return outcome.session.tokens.accessToken;
	}

	/** Whether the session's token is good for at least the refresh margin. */
	isFresh(session: StoredSession): boolean {
		return Date.parse(session.tokens.expiresAt) - this.margin > this.now().getTime();
	}

	/** Whether the session's access token is past its expiry. */
	isExpired(session: StoredSession): boolean {
		return Date.parse(session.tokens.expiresAt) <= this.now().getTime();
	}

	/**
	 * Joins the refresh in flight, or starts one. The shared refresh runs with
	 * no caller's signal (the endpoints' own timeouts bound it), so one caller
	 * giving up does not fail it for the others; `signal` ends this caller's
	 * wait only.
	 */
	private refresh(session: StoredSession, signal?: AbortSignal): Promise<RefreshOutcome> {
		// A refresh started for a session that has since been replaced is not joined: it ends in no_session.
		if (!this.refreshing || this.refreshing.generation !== this.generation) {
			const entry = { generation: this.generation, promise: Promise.resolve<RefreshOutcome>({ session }) };
			entry.promise = this.refreshOnce(session).finally(() => {
				if (this.refreshing === entry) {
					this.refreshing = undefined;
				}
			});
			this.refreshing = entry;
		}
		return untilAborted(
			this.refreshing.promise,
			signal,
			() => new TimeoutError("Waiting for the session refresh was cancelled.", { reason: "cancelled", retryable: false }),
		);
	}

	/** One refresh against the issuer. The result is merged onto the current session and kept only if the session was not replaced or ended meanwhile. */
	private async refreshOnce(session: StoredSession): Promise<RefreshOutcome> {
		const generation = this.generation;
		if (!session.tokens.refreshToken) {
			await this.expire("the session holds no refresh token");
			throw new UnauthenticatedError("session_expired");
		}
		let discovery: Awaited<ReturnType<typeof discover>>;
		try {
			discovery = await discover(session.issuer, this.deps.fetch);
		} catch (error) {
			return this.keepIfUnexpired(session, error, generation);
		}
		try {
			const tokens = await refreshTokens({
				tokenEndpoint: discovery.token_endpoint,
				clientId: session.clientId,
				fetch: this.deps.fetch,
				refreshToken: session.tokens.refreshToken,
				scope: session.tokens.scope,
			});
			const issuedAt = this.now();
			const claims = readClaims(tokens.access_token);
			if (generation !== this.generation || !this.session) {
				// Signed out, or signed in as someone else, while this refresh ran: it is not kept.
				throw new UnauthenticatedError("no_session");
			}
			// The current session, not the one the refresh started from: an update made meanwhile (the org's uuid) stays.
			const current = this.session;
			const refreshed: StoredSession = {
				...current,
				claims,
				tokens: {
					...current.tokens,
					accessToken: tokens.access_token,
					// A provider that rotates refresh tokens sends a new one; one that does not sends none.
					refreshToken: tokens.refresh_token ?? current.tokens.refreshToken,
					idToken: tokens.id_token ?? current.tokens.idToken,
					expiresAt: expiryOf(tokens.expires_in, claims, issuedAt),
					scope: tokens.scope ?? current.tokens.scope,
				},
			};
			this.session = refreshed;
			await this.persist(this.deps.store.save(refreshed));
			this.logger.debug("Refreshed the WSO2 Cloud session");
			this.emit({ reason: "refreshed" });
			return { session: refreshed };
		} catch (error) {
			if (generation !== this.generation) {
				throw error;
			}
			if (error instanceof OAuthError && isRefusal(error)) {
				// Another window may have refreshed first and rotated the refresh token this one held; its session is not over.
				const stored = await this.loadQuietly();
				if (generation !== this.generation) {
					throw error;
				}
				if (stored && stored.tokens.refreshToken !== session.tokens.refreshToken) {
					this.logger.debug("Took the WSO2 Cloud session another window refreshed");
					this.adopt(stored);
					return { session: stored };
				}
				await this.expire(`the identity provider answered ${error.error}`);
				throw new UnauthenticatedError("session_expired", undefined, { apiError: error.error, apiMessage: error.errorDescription });
			}
			return this.keepIfUnexpired(session, error, generation);
		}
	}

	/** A refresh lost to the network, or to an issuer that is down, is not the end of the session. */
	private keepIfUnexpired(session: StoredSession, error: unknown, generation: number): RefreshOutcome {
		if (generation !== this.generation) {
			// Signed out, or signed in as someone else, while the refresh ran: the old token is not handed out.
			throw new UnauthenticatedError("no_session");
		}
		if (!this.isExpired(session)) {
			this.logger.warn(`Could not refresh the WSO2 Cloud session (${errorMessage(error)}); using the current token while it lasts`);
			return { session, failure: error };
		}
		if (isCloudError(error)) {
			throw error;
		}
		throw new NetworkError("The identity provider could not be reached to refresh the session.", { cause: error });
	}

	/** Ends the session because the issuer will not refresh it, and says so. */
	private async expire(why: string): Promise<void> {
		this.logger.info(`The WSO2 Cloud session has ended: ${why}`);
		this.generation++;
		this.session = undefined;
		await this.persist(this.deps.store.clear(this.deps.env.name));
		this.emit({ reason: "expired" });
	}

	/** The stored session, or undefined when the store cannot be read. */
	private async loadQuietly(): Promise<StoredSession | undefined> {
		try {
			return await this.deps.store.load(this.deps.env.name);
		} catch (error) {
			this.logger.warn(`The stored WSO2 Cloud session could not be read: ${errorMessage(error)}`);
			return undefined;
		}
	}

	/** Takes a session another window stored as this one's: a refresh when it is the same person and organization, a new sign-in otherwise. */
	private adopt(stored: StoredSession): void {
		const current = this.session;
		const same = current !== undefined && current.account.id === stored.account.id && current.org.id === stored.org.id;
		if (!same) {
			this.generation++;
		}
		this.session = stored;
		this.loaded = true;
		this.emit({ reason: same ? "refreshed" : "signed-in" });
	}

	/**
	 * Picks up what the store holds after it reported a change, which may be
	 * another window's sign-in, refresh or sign-out. A change this manager
	 * made itself finds the same tokens and changes nothing.
	 */
	private async reload(): Promise<void> {
		for (;;) {
			if (!this.loaded) {
				// Nothing is cached yet; the first read will see the change.
				return;
			}
			// A write of this manager's own still in flight is newer than what the store would answer now.
			await Promise.allSettled([...this.pendingWrites]);
			const generation = this.generation;
			const writes = this.writeCount;
			let stored: StoredSession | undefined;
			try {
				stored = await this.deps.store.load(this.deps.env.name);
			} catch (error) {
				// Unreadable is not signed out: what is cached stays.
				this.logger.warn(`The stored WSO2 Cloud session could not be read after it changed: ${errorMessage(error)}`);
				return;
			}
			if (generation !== this.generation || writes !== this.writeCount || this.pendingWrites.size > 0) {
				// Changed here while the store was read: read again once that is stored.
				continue;
			}
			const current = this.session;
			if (!stored) {
				if (current) {
					this.generation++;
					this.session = undefined;
					this.emit({ reason: "signed-out" });
				}
				return;
			}
			if (current && current.tokens.accessToken === stored.tokens.accessToken && current.tokens.refreshToken === stored.tokens.refreshToken) {
				// The same tokens: this manager's own write, or another window's change to something else, such as the org's uuid.
				this.session = stored;
				return;
			}
			this.adopt(stored);
			return;
		}
	}

	/** Runs one of this manager's own writes to the store, tracked so a reload waits for it. */
	private async persist(write: Promise<void>): Promise<void> {
		this.writeCount++;
		this.pendingWrites.add(write);
		try {
			await write;
		} finally {
			this.pendingWrites.delete(write);
		}
	}

	/** Ends the session, asking the issuer to revoke the refresh token first when it can. */
	async signOut(options: { revoke?: boolean; signal?: AbortSignal } = {}): Promise<void> {
		const session = await this.current();
		this.generation++;
		this.session = undefined;
		await this.persist(this.deps.store.clear(this.deps.env.name));
		if (session && options.revoke !== false) {
			await this.revoke(session, options.signal);
		}
		this.emit({ reason: "signed-out" });
	}

	/** Asks the issuer to revoke a session's refresh token; best effort, it never throws. */
	private async revoke(session: StoredSession, signal?: AbortSignal): Promise<void> {
		if (!session.tokens.refreshToken) {
			return;
		}
		try {
			const discovery = await discover(session.issuer, this.deps.fetch, { signal });
			if (discovery.revocation_endpoint) {
				await revokeToken({
					revocationEndpoint: discovery.revocation_endpoint,
					clientId: session.clientId,
					token: session.tokens.refreshToken,
					tokenTypeHint: "refresh_token",
					fetch: this.deps.fetch,
					signal,
				});
			}
		} catch {
			// The session is gone locally either way.
		}
	}

	onDidChange(listener: (event: SessionChangeEvent) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	/** Stops following the store's changes. */
	dispose(): void {
		this.unsubscribeStore?.();
	}

	/** Tells every listener; one that throws does not stop the others. */
	private emit(event: SessionChangeEvent): void {
		for (const listener of this.listeners) {
			try {
				listener(event);
			} catch (error) {
				this.logger.error("A session listener failed", error);
			}
		}
	}
}
