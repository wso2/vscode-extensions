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

import { linkAbort } from "../abort";
import type { FetchLike } from "../api/http";
import type { CloudEnvironment } from "../config/environments";
import { LoginError, errorMessage, isCloudError } from "../errors";
import type { PlatformClaims } from "../jwt";
import { decodeJwtPayload, missingPlatformClaims } from "../jwt";
import type { Logger } from "../logger";
import { silentLogger } from "../logger";
import type { CallbackReceiver } from "./callback/types";
import { discover } from "./discovery";
import { validateIdToken } from "./id-token";
import { buildAuthorizeUrl, challengeS256, createVerifier, randomUrlSafe } from "./pkce";
import type { TokenResponse } from "./token-endpoint";
import { OAuthError, exchangeCode } from "./token-endpoint";
import type { StoredSession, TokenSet } from "./types";
import { STORED_SESSION_VERSION, accountOf, orgOf } from "./types";

/** The scopes a sign-in asks for: identity, a refresh token, and the profile claims the UI shows. */
export const LOGIN_SCOPES: readonly string[] = ["openid", "offline_access", "profile", "email"];

/** How long the browser is given before the sign-in is abandoned. */
export const LOGIN_TIMEOUT_MS = 5 * 60_000;

export interface LoginFlowDeps {
	env: CloudEnvironment;
	fetch: FetchLike;
	openBrowser: (url: string) => Promise<void>;
	receiver: CallbackReceiver;
	scopes?: readonly string[];
	now?: () => Date;
	logger?: Logger;
}

export interface LoginRunOptions {
	signal?: AbortSignal;
	timeoutMs?: number;
	/** Extra authorization-request members, such as one that forces organization re-selection. */
	extraAuthParams?: Record<string, string>;
}

/**
 * One browser sign-in: discovery, PKCE, the browser, the callback, the token
 * endpoint, the ID-token checks, and the claims the platform needs. The
 * result is a session ready to store; the organization's uuid is filled in
 * later by whoever can call the API.
 */
export class LoginFlow {
	private readonly logger: Logger;
	/** The sign-in in progress, if any; `cancel()` ends it, and `settled` resolves once it has let go of the receiver. */
	private current?: { abort: () => void; cancelled: boolean; settled: Promise<void> };

	constructor(private readonly deps: LoginFlowDeps) {
		this.logger = deps.logger ?? silentLogger;
	}

	/** Runs one browser sign-in to a session ready to store. One at a time: a second run while one is waiting is refused, and one after a cancel waits for the cancelled run to let go of the receiver. */
	async run(options: LoginRunOptions = {}): Promise<StoredSession> {
		const { env, fetch, receiver } = this.deps;
		const now = this.deps.now ?? (() => new Date());
		if (this.current?.cancelled) {
			// A cancelled sign-in is still letting go of the receiver; this one waits for that.
			await this.current.settled;
		}
		if (this.current) {
			throw new LoginError("provider_error", "A sign-in is already in progress; cancel it first.");
		}
		const linked = linkAbort(options.signal, options.timeoutMs ?? LOGIN_TIMEOUT_MS);
		const controller = new AbortController();
		linked.signal.addEventListener("abort", () => controller.abort(), { once: true });
		let settle: () => void = () => undefined;
		const run = {
			abort: () => controller.abort(),
			cancelled: false,
			settled: new Promise<void>((resolve) => {
				settle = resolve;
			}),
		};
		this.current = run;
		try {
			const discovery = await discover(env.issuer, fetch, { signal: controller.signal });
			await receiver.start?.();
			const verifier = createVerifier();
			const state = randomUrlSafe(16);
			const nonce = randomUrlSafe(16);
			const scopes = this.deps.scopes ?? LOGIN_SCOPES;
			const authorizeUrl = buildAuthorizeUrl({
				authorizationEndpoint: discovery.authorization_endpoint,
				clientId: env.clientId,
				redirectUri: receiver.redirectUri,
				scopes,
				state,
				nonce,
				codeChallenge: challengeS256(verifier),
				extra: options.extraAuthParams,
			});
			this.logger.info(`Opening the browser to sign in at ${env.issuer}`);
			const waiting = receiver.waitForCode(state, controller.signal);
			// A cancel or timeout while the browser is still opening (VS Code may be asking whether to
			// open the link) ends the wait at once; racing also gives `waiting` a handler meanwhile.
			await Promise.race([this.deps.openBrowser(authorizeUrl), waiting.then(noop, noop)]);
			const code = await waiting;
			let tokens: TokenResponse;
			try {
				tokens = await exchangeCode({
					tokenEndpoint: discovery.token_endpoint,
					clientId: env.clientId,
					fetch,
					code,
					redirectUri: receiver.redirectUri,
					codeVerifier: verifier,
					signal: controller.signal,
				});
			} catch (error) {
				if (error instanceof OAuthError) {
					throw new LoginError("token_endpoint_failed", `The identity provider refused the sign-in: ${error.message}`, error.details);
				}
				throw error;
			}
			if (tokens.id_token) {
				validateIdToken({ idToken: tokens.id_token, issuer: discovery.issuer, clientId: env.clientId, nonce, now: now() });
			}
			const claims = readClaims(tokens.access_token);
			const issuedAt = now();
			const tokenSet: TokenSet = {
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				idToken: tokens.id_token,
				expiresAt: expiryOf(tokens.expires_in, claims, issuedAt),
				refreshExpiresAt: tokens.refresh_expires_in ? new Date(issuedAt.getTime() + tokens.refresh_expires_in * 1000).toISOString() : undefined,
				scope: tokens.scope ?? scopes.join(" "),
			};
			return {
				version: STORED_SESSION_VERSION,
				env: env.name,
				issuer: discovery.issuer,
				clientId: env.clientId,
				tokens: tokenSet,
				claims,
				org: orgOf(claims),
				account: accountOf(claims),
				obtainedVia: "browser",
				createdAt: issuedAt.toISOString(),
			};
		} catch (error) {
			if (controller.signal.aborted) {
				// The timer, the caller's signal or cancel() ended it; say which.
				if (linked.timedOut() && !run.cancelled) {
					throw new LoginError("timed_out", "The sign-in was not completed in time.");
				}
				throw new LoginError("cancelled", "The sign-in was cancelled.");
			}
			if (isCloudError(error)) {
				throw error;
			}
			throw new LoginError("provider_error", `The sign-in failed: ${errorMessage(error)}`, { cause: error });
		} finally {
			linked.dispose();
			receiver.dispose?.();
			if (this.current === run) {
				this.current = undefined;
			}
			settle();
		}
	}

	/** Abandons a sign-in that is waiting for the browser. */
	cancel(): void {
		if (this.current) {
			this.current.cancelled = true;
			this.current.abort();
		}
	}

	/** Whether a sign-in is in progress. */
	get running(): boolean {
		return this.current !== undefined;
	}
}

/** The claims the platform requires, from the access token; refuses one without them. */
export function readClaims(accessToken: string): PlatformClaims {
	const payload = decodeJwtPayload(accessToken);
	if (!payload) {
		throw new LoginError("claims_missing", "The access token the identity provider issued is not a JWT the platform can read.");
	}
	const missing = missingPlatformClaims(payload);
	if (missing.length > 0) {
		throw new LoginError("claims_missing", `The access token carries no ${missing.join(", ")}. Sign in again and choose an organization.`);
	}
	return payload as unknown as PlatformClaims;
}

/** When the access token expires: what the endpoint said, else the token's own `exp`. */
export function expiryOf(expiresIn: number | undefined, claims: Pick<PlatformClaims, "exp">, issuedAt: Date): string {
	if (typeof expiresIn === "number" && expiresIn > 0) {
		return new Date(issuedAt.getTime() + expiresIn * 1000).toISOString();
	}
	return new Date(claims.exp * 1000).toISOString();
}

function noop(): void {}
