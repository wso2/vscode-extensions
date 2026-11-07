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
import { NetworkError, TimeoutError, UnauthenticatedError, errorMessage, isCloudError } from "../errors";
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
 * still handed out while it is not yet expired.
 */
export class SessionManager {
	private readonly logger: Logger;
	private readonly margin: number;
	private readonly now: () => Date;
	private loaded = false;
	private session?: StoredSession;
	private refreshing?: Promise<StoredSession>;
	/** Bumped whenever the session is replaced or ended, so a refresh in flight for the old one is dropped. */
	private generation = 0;
	private readonly listeners = new Set<(event: SessionChangeEvent) => void>();

	constructor(private readonly deps: SessionManagerDeps) {
		this.logger = deps.logger ?? silentLogger;
		this.margin = deps.refreshMarginMs ?? REFRESH_MARGIN_MS;
		this.now = deps.now ?? (() => new Date());
	}

	/** The stored session, if any, without refreshing it. */
	async current(): Promise<StoredSession | undefined> {
		if (!this.loaded) {
			this.session = await this.deps.store.load(this.deps.env.name);
			this.loaded = true;
		}
		return this.session;
	}

	/** Keeps a session a sign-in produced. */
	async setSession(session: StoredSession): Promise<void> {
		this.generation++;
		this.session = session;
		this.loaded = true;
		await this.deps.store.save(session);
		this.emit({ reason: "signed-in" });
	}

	/** Changes members of the stored session, such as the organization's uuid once read. */
	async update(change: (session: StoredSession) => StoredSession): Promise<StoredSession | undefined> {
		const session = await this.current();
		if (!session) {
			return undefined;
		}
		this.session = change(session);
		await this.deps.store.save(this.session);
		return this.session;
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
		const refreshed = await this.refresh(session, options.signal);
		return refreshed.tokens.accessToken;
	}

	/** Whether the session's token is good for at least the refresh margin. */
	isFresh(session: StoredSession): boolean {
		return Date.parse(session.tokens.expiresAt) - this.margin > this.now().getTime();
	}

	/**
	 * Joins the refresh in flight, or starts one. The shared refresh runs with
	 * no caller's signal (the endpoints' own timeouts bound it), so one caller
	 * giving up does not fail it for the others; `signal` ends this caller's
	 * wait only.
	 */
	private refresh(session: StoredSession, signal?: AbortSignal): Promise<StoredSession> {
		if (!this.refreshing) {
			this.refreshing = this.refreshOnce(session).finally(() => {
				this.refreshing = undefined;
			});
		}
		return untilAborted(this.refreshing, signal, () => new TimeoutError("Waiting for the session refresh was cancelled.", { reason: "cancelled" }));
	}

	/** One refresh against the issuer. The result is merged onto the current session and kept only if the session was not replaced or ended meanwhile. */
	private async refreshOnce(session: StoredSession): Promise<StoredSession> {
		const generation = this.generation;
		if (!session.tokens.refreshToken) {
			await this.expire("the session holds no refresh token");
			throw new UnauthenticatedError("session_expired");
		}
		let discovery: Awaited<ReturnType<typeof discover>>;
		try {
			discovery = await discover(session.issuer, this.deps.fetch);
		} catch (error) {
			return this.keepIfUnexpired(session, error);
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
			await this.deps.store.save(refreshed);
			this.logger.debug("Refreshed the WSO2 Cloud session");
			this.emit({ reason: "refreshed" });
			return refreshed;
		} catch (error) {
			if (generation !== this.generation) {
				throw error;
			}
			if (error instanceof OAuthError && isRefusal(error)) {
				await this.expire(`the identity provider answered ${error.error}`);
				throw new UnauthenticatedError("session_expired", undefined, { apiError: error.error, apiMessage: error.errorDescription });
			}
			return this.keepIfUnexpired(session, error);
		}
	}

	/** A refresh lost to the network, or to an issuer that is down, is not the end of the session. */
	private keepIfUnexpired(session: StoredSession, error: unknown): StoredSession {
		const unexpired = Date.parse(session.tokens.expiresAt) > this.now().getTime();
		if (unexpired) {
			this.logger.warn(`Could not refresh the WSO2 Cloud session (${errorMessage(error)}); using the current token while it lasts`);
			return session;
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
		await this.deps.store.clear(this.deps.env.name);
		this.emit({ reason: "expired" });
	}

	/** Ends the session, asking the issuer to revoke the refresh token first when it can. */
	async signOut(options: { revoke?: boolean; signal?: AbortSignal } = {}): Promise<void> {
		const session = await this.current();
		this.generation++;
		this.session = undefined;
		await this.deps.store.clear(this.deps.env.name);
		if (session && options.revoke !== false && session.tokens.refreshToken) {
			try {
				const discovery = await discover(session.issuer, this.deps.fetch, { signal: options.signal });
				if (discovery.revocation_endpoint) {
					await revokeToken({
						revocationEndpoint: discovery.revocation_endpoint,
						clientId: session.clientId,
						token: session.tokens.refreshToken,
						tokenTypeHint: "refresh_token",
						fetch: this.deps.fetch,
						signal: options.signal,
					});
				}
			} catch {
				// Revocation is best effort; the session is gone locally either way.
			}
		}
		this.emit({ reason: "signed-out" });
	}

	onDidChange(listener: (event: SessionChangeEvent) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
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
