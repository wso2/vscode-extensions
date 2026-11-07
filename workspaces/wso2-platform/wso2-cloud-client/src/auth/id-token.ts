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

import { LoginError } from "../errors";
import { audiencesOf, decodeJwtPayload } from "../jwt";

export interface IdTokenChecks {
	idToken: string;
	issuer: string;
	clientId: string;
	nonce: string;
	now?: Date;
	/** Allowed clock skew, 5 minutes by default. */
	skewMs?: number;
}

/**
 * The checks OpenID Connect Core §3.1.3.7 asks of an ID token that arrived
 * straight from the token endpoint over TLS: issuer, audience, nonce and
 * expiry. The signature is not checked, as that section permits for this
 * case, so no JWKS read is needed.
 */
export function validateIdToken(checks: IdTokenChecks): Record<string, unknown> {
	const payload = decodeJwtPayload(checks.idToken);
	if (!payload) {
		throw new LoginError("provider_error", "The identity provider's ID token could not be read.");
	}
	const issuer = String(payload.iss ?? "").replace(/\/+$/, "");
	if (issuer !== checks.issuer.replace(/\/+$/, "")) {
		throw new LoginError("provider_error", `The ID token names the issuer ${issuer}, not ${checks.issuer}.`);
	}
	if (!audiencesOf(payload.aud).includes(checks.clientId)) {
		throw new LoginError("provider_error", "The ID token was not issued to this client.");
	}
	if (payload.nonce !== checks.nonce) {
		throw new LoginError("nonce_mismatch", "The ID token does not carry the nonce this login sent.");
	}
	const now = (checks.now ?? new Date()).getTime();
	const skew = checks.skewMs ?? 5 * 60_000;
	if (typeof payload.exp === "number" && payload.exp * 1000 + skew < now) {
		throw new LoginError("provider_error", "The ID token has already expired.");
	}
	return payload;
}
