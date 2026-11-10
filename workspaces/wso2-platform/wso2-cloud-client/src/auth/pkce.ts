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

import { createHash, randomBytes } from "node:crypto";

/** Base64url without padding, as PKCE and JWTs use it. */
export function base64Url(bytes: Buffer): string {
	return bytes.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** `length` random bytes, base64url-encoded: a state, a nonce, a verifier. */
export function randomUrlSafe(length = 32): string {
	return base64Url(randomBytes(length));
}

/** A PKCE code verifier (RFC 7636): 43 characters from 32 random bytes. */
export function createVerifier(): string {
	return randomUrlSafe(32);
}

/** The S256 challenge of a verifier. */
export function challengeS256(verifier: string): string {
	return base64Url(createHash("sha256").update(verifier).digest());
}

export interface AuthorizeUrlInput {
	authorizationEndpoint: string;
	clientId: string;
	redirectUri: string;
	scopes: readonly string[];
	state: string;
	nonce: string;
	codeChallenge: string;
	/** Extra members, such as a parameter that forces organization re-selection. */
	extra?: Record<string, string>;
}

/** The authorization request as a URL to open in the browser. */
export function buildAuthorizeUrl(input: AuthorizeUrlInput): string {
	const url = new URL(input.authorizationEndpoint);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("client_id", input.clientId);
	url.searchParams.set("redirect_uri", input.redirectUri);
	url.searchParams.set("scope", input.scopes.join(" "));
	url.searchParams.set("state", input.state);
	url.searchParams.set("nonce", input.nonce);
	url.searchParams.set("code_challenge", input.codeChallenge);
	url.searchParams.set("code_challenge_method", "S256");
	for (const [key, value] of Object.entries(input.extra ?? {})) {
		url.searchParams.set(key, value);
	}
	return url.toString();
}
