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
import { assertSecureUrl, trimBaseUrl } from "../config/environments";
import { LoginError, NetworkError } from "../errors";

/** The members of the OpenID discovery document the client uses. */
export interface OidcDiscovery {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	revocation_endpoint?: string;
	code_challenge_methods_supported?: string[];
}

const DISCOVERY_TTL_MS = 60 * 60_000;

/** How long one read of the discovery document may take. */
export const DISCOVERY_TIMEOUT_MS = 30_000;

const cache = new Map<string, { document: OidcDiscovery; readAt: number }>();

/** The issuer's OpenID discovery document URL. */
export function discoveryUrl(issuer: string): string {
	return `${trimBaseUrl(issuer)}/.well-known/openid-configuration`;
}

/**
 * Reads the issuer's discovery document, keeping it for an hour. It must
 * name itself as the issuer asked for (OpenID Connect Discovery §4.3), name
 * an authorization and a token endpoint over https, and offer PKCE S256;
 * anything else is a provider the login cannot use.
 */
export async function discover(
	issuer: string,
	fetchImpl: FetchLike,
	options: { signal?: AbortSignal; fresh?: boolean; now?: () => number } = {},
): Promise<OidcDiscovery> {
	const now = options.now ?? Date.now;
	const key = trimBaseUrl(issuer);
	const cached = cache.get(key);
	if (cached && !options.fresh && now() - cached.readAt < DISCOVERY_TTL_MS) {
		return cached.document;
	}
	let response: Response;
	const abort = linkAbort(options.signal, DISCOVERY_TIMEOUT_MS);
	try {
		response = await fetchImpl(discoveryUrl(issuer), { method: "GET", headers: { Accept: "application/json" }, signal: abort.signal });
	} catch (error) {
		abort.dispose();
		throw new NetworkError(`The identity provider at ${issuer} could not be reached.`, { cause: error });
	}
	let document: Partial<OidcDiscovery>;
	try {
		if (!response.ok) {
			throw new LoginError("discovery_failed", `The identity provider at ${issuer} answered ${response.status} for its discovery document.`, {
				status: response.status,
			});
		}
		try {
			document = (await response.json()) as Partial<OidcDiscovery>;
		} catch (error) {
			throw new LoginError("discovery_failed", `The identity provider at ${issuer} answered its discovery document with something other than JSON.`, {
				cause: error,
			});
		}
	} finally {
		// The bound covers reading the document too, not the headers alone.
		abort.dispose();
	}
	if (!document.authorization_endpoint || !document.token_endpoint || !document.issuer) {
		throw new LoginError("discovery_failed", `The discovery document at ${issuer} names no issuer, authorization endpoint or token endpoint.`);
	}
	if (trimBaseUrl(document.issuer) !== key) {
		throw new LoginError("discovery_failed", `The discovery document at ${issuer} is for another issuer, ${document.issuer}.`);
	}
	for (const endpoint of ["authorization_endpoint", "token_endpoint", "revocation_endpoint"] as const) {
		const value = document[endpoint];
		if (value) {
			try {
				assertSecureUrl(endpoint, value);
			} catch (error) {
				throw new LoginError(
					"discovery_failed",
					`The identity provider at ${issuer} names a ${endpoint} the login cannot use: ${(error as Error).message}`,
				);
			}
		}
	}
	if (document.code_challenge_methods_supported && !document.code_challenge_methods_supported.includes("S256")) {
		throw new LoginError("discovery_failed", `The identity provider at ${issuer} does not offer PKCE with S256, which the login needs.`);
	}
	const complete = document as OidcDiscovery;
	cache.set(key, { document: complete, readAt: now() });
	return complete;
}

/** For tests: forgets every cached document. */
export function resetDiscoveryCache(): void {
	cache.clear();
}
