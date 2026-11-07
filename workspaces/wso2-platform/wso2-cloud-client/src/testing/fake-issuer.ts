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

import type { FetchLike } from "../api/http";
import { challengeS256 } from "../auth/pkce";
import type { PlatformClaims } from "../jwt";

export interface FakeIssuerOptions {
	issuer?: string;
	clientId?: string;
	/** The claims every issued access token carries. */
	claims?: Partial<PlatformClaims>;
	/** Access-token lifetime in seconds. */
	expiresIn?: number;
	/** Whether a refresh rotates the refresh token. */
	rotateRefreshTokens?: boolean;
	now?: () => Date;
}

interface IssuedCode {
	challenge: string;
	nonce: string;
	redirectUri: string;
}

/**
 * An OpenID provider in a function: discovery, a token endpoint that checks
 * PKCE, refreshes (with rotation) and exchanges (setting `aud`), and
 * revocation. The browser step is {@link authorize}: a test "opens" the
 * authorization URL and gets the callback URL the provider would redirect
 * to. Tokens are unsigned JWTs; nothing here verifies signatures.
 */
export class FakeIssuer {
	readonly issuer: string;
	readonly clientId: string;
	readonly calls: { url: string; form: Record<string, string> }[] = [];
	readonly revoked: string[] = [];
	/** Makes the next refresh fail with `invalid_grant`. */
	refreshRefusal?: string;
	private readonly codes = new Map<string, IssuedCode>();
	private readonly refreshTokens = new Set<string>();
	private counter = 0;

	constructor(private readonly options: FakeIssuerOptions = {}) {
		this.issuer = options.issuer ?? "https://idp.example.invalid";
		this.clientId = options.clientId ?? "WSO2_INTEGRATOR_EXTENSION";
	}

	get discoveryUrl(): string {
		return `${this.issuer}/.well-known/openid-configuration`;
	}

	get tokenEndpoint(): string {
		return `${this.issuer}/oauth2/token`;
	}

	/**
	 * Plays the browser: reads the authorization URL, records the PKCE
	 * challenge and nonce, and answers the redirect the provider would send.
	 */
	authorize(authorizeUrl: string, options: { error?: string } = {}): URL {
		const url = new URL(authorizeUrl);
		const redirectUri = url.searchParams.get("redirect_uri") ?? "";
		const back = new URL(redirectUri);
		const state = url.searchParams.get("state") ?? "";
		if (options.error) {
			back.searchParams.set("error", options.error);
			back.searchParams.set("state", state);
			return back;
		}
		if (url.searchParams.get("client_id") !== this.clientId) {
			back.searchParams.set("error", "invalid_client");
			back.searchParams.set("state", state);
			return back;
		}
		const code = `code-${++this.counter}`;
		this.codes.set(code, { challenge: url.searchParams.get("code_challenge") ?? "", nonce: url.searchParams.get("nonce") ?? "", redirectUri });
		back.searchParams.set("code", code);
		back.searchParams.set("state", state);
		return back;
	}

	/** A `fetch` that answers this issuer's URLs and rejects every other. */
	readonly fetch: FetchLike = async (input, init) => {
		if (input === this.discoveryUrl) {
			return json(200, {
				issuer: this.issuer,
				authorization_endpoint: `${this.issuer}/oauth2/authorize`,
				token_endpoint: this.tokenEndpoint,
				revocation_endpoint: `${this.issuer}/oauth2/revoke`,
				code_challenge_methods_supported: ["S256"],
			});
		}
		const form = Object.fromEntries(new URLSearchParams(typeof init?.body === "string" ? init.body : ""));
		this.calls.push({ url: input, form });
		if (input === `${this.issuer}/oauth2/revoke`) {
			this.revoked.push(form.token);
			return json(200, {});
		}
		if (input !== this.tokenEndpoint) {
			throw new TypeError(`fetch failed: the fake issuer does not serve ${input}`);
		}
		switch (form.grant_type) {
			case "authorization_code":
				return this.answerCode(form);
			case "refresh_token":
				return this.answerRefresh(form);
			case "urn:ietf:params:oauth:grant-type:token-exchange":
				return this.answerExchange(form);
			default:
				return json(400, { error: "unsupported_grant_type" });
		}
	};

	private answerCode(form: Record<string, string>): Response {
		const issued = this.codes.get(form.code);
		this.codes.delete(form.code);
		if (!issued) {
			return json(400, { error: "invalid_grant", error_description: "unknown code" });
		}
		if (challengeS256(form.code_verifier ?? "") !== issued.challenge) {
			return json(400, { error: "invalid_grant", error_description: "PKCE verifier mismatch" });
		}
		if (form.redirect_uri !== issued.redirectUri) {
			return json(400, { error: "invalid_grant", error_description: "redirect_uri mismatch" });
		}
		return json(200, this.tokens({ nonce: issued.nonce }));
	}

	private answerRefresh(form: Record<string, string>): Response {
		if (this.refreshRefusal) {
			const error = this.refreshRefusal;
			this.refreshRefusal = undefined;
			return json(400, { error, error_description: "refused by the test" });
		}
		if (!this.refreshTokens.has(form.refresh_token)) {
			return json(400, { error: "invalid_grant", error_description: "unknown refresh token" });
		}
		if (this.options.rotateRefreshTokens !== false) {
			this.refreshTokens.delete(form.refresh_token);
		}
		return json(200, this.tokens({ rotate: this.options.rotateRefreshTokens !== false }));
	}

	private answerExchange(form: Record<string, string>): Response {
		if (!form.subject_token || !form.resource) {
			return json(400, { error: "invalid_request" });
		}
		return json(200, {
			access_token: this.accessToken({ aud: form.resource }),
			token_type: "Bearer",
			expires_in: this.options.expiresIn ?? 3600,
			issued_token_type: "urn:ietf:params:oauth:token-type:access_token",
		});
	}

	private tokens(options: { nonce?: string; rotate?: boolean }): Record<string, unknown> {
		const refresh = `refresh-${++this.counter}`;
		this.refreshTokens.add(refresh);
		const expiresIn = this.options.expiresIn ?? 3600;
		const answer: Record<string, unknown> = {
			access_token: this.accessToken({}),
			token_type: "Bearer",
			expires_in: expiresIn,
			scope: "openid offline_access profile email",
		};
		if (options.rotate !== false) {
			answer.refresh_token = refresh;
		}
		if (options.nonce !== undefined) {
			const now = Math.floor((this.options.now ?? (() => new Date()))().getTime() / 1000);
			answer.id_token = unsignedJwt({
				iss: this.issuer,
				aud: this.clientId,
				sub: this.claims().sub,
				nonce: options.nonce,
				exp: now + expiresIn,
				iat: now,
			});
		}
		return answer;
	}

	/** An access token with the platform claims and any extras, as this issuer issues them. */
	accessToken(extra: Record<string, unknown>): string {
		const now = Math.floor((this.options.now ?? (() => new Date()))().getTime() / 1000);
		return unsignedJwt({ ...this.claims(), iat: now, exp: now + (this.options.expiresIn ?? 3600), jti: `t-${++this.counter}`, ...extra });
	}

	claims(): PlatformClaims {
		return {
			sub: "user-1",
			iss: this.issuer,
			client_id: this.clientId,
			ouId: "ou-1",
			ouName: "Acme",
			ouHandle: "acme",
			email: "jane@example.com",
			name: "Jane Doe",
			exp: 0,
			...this.options.claims,
		};
	}
}

function json(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** A JWT with `alg: none`: enough for code that decodes claims without verifying. */
export function unsignedJwt(payload: Record<string, unknown>): string {
	const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
	return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.`;
}

/** Routes each URL to the first `fetch` whose origin matches, for a test that needs an issuer and an API. */
export function composeFetch(routes: { origin: string; fetch: FetchLike }[]): FetchLike {
	return (input, init) => {
		const origin = new URL(input).origin;
		const route = routes.find((r) => new URL(r.origin).origin === origin);
		if (!route) {
			return Promise.reject(new TypeError(`fetch failed: nothing serves ${origin}`));
		}
		return route.fetch(input, init);
	};
}
