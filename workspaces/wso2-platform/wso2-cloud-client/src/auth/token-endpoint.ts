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
import { CloudError, NetworkError } from "../errors";

/** How long one call to the token or revocation endpoint may take. */
export const TOKEN_ENDPOINT_TIMEOUT_MS = 30_000;

/** What a token endpoint answers (RFC 6749 §5.1). */
export interface TokenResponse {
	access_token: string;
	token_type?: string;
	expires_in?: number;
	refresh_token?: string;
	refresh_expires_in?: number;
	id_token?: string;
	scope?: string;
	issued_token_type?: string;
}

/** A token endpoint's refusal (RFC 6749 §5.2), carried so callers can tell `invalid_grant` apart. */
export class OAuthError extends CloudError {
	readonly error: string;
	readonly errorDescription?: string;

	constructor(error: string, description: string | undefined, status: number) {
		super("login_failed", description ? `${error}: ${description}` : error, { status, reason: error, apiError: error, apiMessage: description });
		this.name = "OAuthError";
		this.error = error;
		this.errorDescription = description;
	}
}

export interface TokenEndpointOptions {
	tokenEndpoint: string;
	clientId: string;
	fetch: FetchLike;
	signal?: AbortSignal;
}

export const TOKEN_EXCHANGE_GRANT = "urn:ietf:params:oauth:grant-type:token-exchange";
export const ACCESS_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:access_token";

/** `grant_type=authorization_code` with the PKCE verifier. */
export function exchangeCode(options: TokenEndpointOptions & { code: string; redirectUri: string; codeVerifier: string }): Promise<TokenResponse> {
	return postForm(options, {
		grant_type: "authorization_code",
		client_id: options.clientId,
		code: options.code,
		redirect_uri: options.redirectUri,
		code_verifier: options.codeVerifier,
	});
}

/** `grant_type=refresh_token`. An `invalid_grant` means the session is over. */
export function refreshTokens(options: TokenEndpointOptions & { refreshToken: string; scope?: string }): Promise<TokenResponse> {
	const form: Record<string, string> = { grant_type: "refresh_token", client_id: options.clientId, refresh_token: options.refreshToken };
	if (options.scope) {
		form.scope = options.scope;
	}
	return postForm(options, form);
}

/** RFC 8693: a token bound to `resource`, from the login token. */
export function exchangeToken(options: TokenEndpointOptions & { subjectToken: string; resource: string; scope?: string }): Promise<TokenResponse> {
	const form: Record<string, string> = {
		grant_type: TOKEN_EXCHANGE_GRANT,
		client_id: options.clientId,
		subject_token: options.subjectToken,
		subject_token_type: ACCESS_TOKEN_TYPE,
		requested_token_type: ACCESS_TOKEN_TYPE,
		resource: options.resource,
	};
	if (options.scope) {
		form.scope = options.scope;
	}
	return postForm(options, form);
}

/** RFC 7009. Best effort: a provider that cannot revoke still forgets the session locally. */
export async function revokeToken(options: {
	revocationEndpoint: string;
	clientId: string;
	token: string;
	tokenTypeHint?: "refresh_token" | "access_token";
	fetch: FetchLike;
	signal?: AbortSignal;
}): Promise<boolean> {
	const form: Record<string, string> = { token: options.token, client_id: options.clientId };
	if (options.tokenTypeHint) {
		form.token_type_hint = options.tokenTypeHint;
	}
	const abort = linkAbort(options.signal, TOKEN_ENDPOINT_TIMEOUT_MS);
	try {
		const response = await options.fetch(options.revocationEndpoint, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
			body: new URLSearchParams(form).toString(),
			signal: abort.signal,
		});
		return response.ok;
	} catch {
		return false;
	} finally {
		abort.dispose();
	}
}

/** One form POST to the token endpoint within its timeout; a refusal is an `OAuthError` carrying the OAuth error code. */
async function postForm(options: TokenEndpointOptions, form: Record<string, string>): Promise<TokenResponse> {
	let response: Response;
	const abort = linkAbort(options.signal, TOKEN_ENDPOINT_TIMEOUT_MS);
	try {
		response = await options.fetch(options.tokenEndpoint, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
			body: new URLSearchParams(form).toString(),
			signal: abort.signal,
		});
	} catch (error) {
		abort.dispose();
		throw new NetworkError("The identity provider's token endpoint could not be reached.", { cause: error });
	}
	let text: string;
	try {
		text = await response.text();
	} catch (error) {
		throw new NetworkError("The identity provider's token endpoint stopped answering.", { cause: error });
	} finally {
		abort.dispose();
	}
	let parsed: Record<string, unknown> = {};
	try {
		parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
	} catch {
		parsed = {};
	}
	if (!response.ok) {
		const error = typeof parsed.error === "string" ? parsed.error : `http_${response.status}`;
		const description = typeof parsed.error_description === "string" ? parsed.error_description : undefined;
		throw new OAuthError(error, description, response.status);
	}
	if (typeof parsed.access_token !== "string" || !parsed.access_token) {
		throw new OAuthError("invalid_response", "the token endpoint answered without an access token", response.status);
	}
	return parsed as unknown as TokenResponse;
}
