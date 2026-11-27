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

import type { FetchLike } from "../../api/http";
import type { RefreshedTokens, SessionRefresher } from "../../auth/session-manager";
import type { TokenResponse } from "../../auth/token-endpoint";
import type { StoredSession } from "../../auth/types";
import { LoginError, NetworkError, errorMessage } from "../../errors";
import type { PlatformClaims } from "../../jwt";
import { decodeJwtPayload } from "../../jwt";
import type { DevantDeployment, DevantRegion } from "../environments";
import { refreshOrganizationTokens } from "./tokens";

/** An organization a person belongs to on Devant. `id` is numeric, as a string; GraphQL takes it as a number. */
export interface DevantOrganization {
	id: string;
	uuid: string;
	handle: string;
	name: string;
	region?: string;
}

/** The person signed in, as Devant's user service answers. */
export interface DevantUser {
	displayName: string;
	userEmail: string;
	userProfilePictureUrl?: string;
	idpId: string;
	userId: string;
}

/** What a Devant session holds beyond any session: the region, the person, and every organization they can switch to. */
export interface DevantSessionDetails {
	region: DevantRegion;
	user: DevantUser;
	organizations: DevantOrganization[];
}

/** A session for one organization, with the details switching to another needs. */
export interface DevantStoredSession extends StoredSession {
	devant: DevantSessionDetails;
}

export function isDevantSession(session: StoredSession | undefined): session is DevantStoredSession {
	const details = (session as DevantStoredSession | undefined)?.devant;
	return !!details && Array.isArray(details.organizations) && !!details.user && (details.region === "US" || details.region === "EU");
}

/** The account a person has, from their Asgardeo token; a person with none is pointed to Choreo Cloud. */
export async function validateUser(
	deployment: DevantDeployment,
	asgardeoToken: string,
	fetch: FetchLike,
	signal?: AbortSignal,
): Promise<{ user: DevantUser; organizations: DevantOrganization[] }> {
	let response: Response;
	try {
		response = await fetch(`${deployment.apiHost}/user-mgt/1.0.0/validate/user`, {
			headers: { Authorization: `Bearer ${asgardeoToken}`, Accept: "application/json" },
			signal: signal ?? AbortSignal.timeout(30_000),
		});
	} catch (error) {
		throw new NetworkError("WSO2 Cloud's user service could not be reached.", { cause: error });
	}
	const text = await response.text().catch(() => "");
	let body: Record<string, unknown> = {};
	try {
		body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
	} catch {
		body = {};
	}
	if (!response.ok) {
		if (body.code === 1003) {
			throw new LoginError(
				"no_account",
				"There is no WSO2 Cloud account for this sign-in. WSO2 Cloud is being replaced by Choreo Cloud: sign in to Choreo Cloud instead.",
				{ status: response.status },
			);
		}
		throw new LoginError(
			"provider_error",
			`WSO2 Cloud's user service answered ${response.status}: ${typeof body.message === "string" ? body.message : text}`,
			{
				status: response.status,
			},
		);
	}
	const organizations = Array.isArray(body.organizations) ? (body.organizations as DevantOrganization[]).map(organizationOf) : [];
	const user: DevantUser = {
		displayName: String(body.displayName ?? ""),
		userEmail: String(body.userEmail ?? ""),
		userProfilePictureUrl: typeof body.userProfilePictureUrl === "string" ? body.userProfilePictureUrl : undefined,
		idpId: String(body.idpId ?? ""),
		userId: String(body.userId ?? ""),
	};
	return { user, organizations };
}

function organizationOf(raw: DevantOrganization): DevantOrganization {
	return { id: String(raw.id), uuid: raw.uuid, handle: raw.handle, name: raw.name, region: raw.region ?? undefined };
}

/**
 * The claims a session of the shared clients carries, for an organization's token. The token service's token names
 * the organization by handle; the rest comes from the organization chosen.
 */
export function organizationClaims(
	deployment: DevantDeployment,
	accessToken: string,
	org: DevantOrganization,
	user: DevantUser,
	expiresIn?: number,
): PlatformClaims {
	const payload = decodeJwtPayload(accessToken) ?? {};
	const idp = (payload.idp_claims ?? {}) as { name?: string; email?: string };
	const exp = typeof payload.exp === "number" ? payload.exp : Math.floor(Date.now() / 1000) + (expiresIn ?? 3600);
	return {
		...payload,
		sub: typeof payload.sub === "string" ? payload.sub : user.idpId,
		iss: typeof payload.iss === "string" ? payload.iss : deployment.stsTokenUrl,
		client_id: deployment.stsClientId,
		ouId: org.id,
		ouName: org.name,
		ouHandle: org.handle,
		exp,
		email: idp.email ?? user.userEmail,
		name: idp.name ?? user.displayName,
		// The user service's picture; the token service's tokens carry none.
		...(user.userProfilePictureUrl?.startsWith("https://") ? { picture: user.userProfilePictureUrl } : {}),
	};
}

/** The session of the organization `org`, for the tokens the token service gave for it. */
export function sessionFor(
	deployment: DevantDeployment,
	tokens: TokenResponse,
	org: DevantOrganization,
	details: DevantSessionDetails,
	now: Date = new Date(),
): DevantStoredSession {
	const claims = organizationClaims(deployment, tokens.access_token, org, details.user, tokens.expires_in);
	return {
		version: 1,
		env: deployment.deployment,
		issuer: deployment.stsTokenUrl,
		clientId: deployment.stsClientId,
		tokens: {
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			expiresAt: expiryOf(tokens, claims, now),
			scope: tokens.scope ?? deployment.stsScopes.join(" "),
		},
		claims,
		org: { id: org.id, handle: org.handle, name: org.name, uuid: org.uuid, numericId: Number(org.id) },
		account: { id: details.user.idpId || claims.sub, label: details.user.userEmail || details.user.displayName || claims.sub },
		obtainedVia: "browser",
		createdAt: now.toISOString(),
		devant: details,
	};
}

function expiryOf(tokens: TokenResponse, claims: Pick<PlatformClaims, "exp">, now: Date): string {
	if (typeof tokens.expires_in === "number" && tokens.expires_in > 0) {
		return new Date(now.getTime() + tokens.expires_in * 1000).toISOString();
	}
	return new Date(claims.exp * 1000).toISOString();
}

/**
 * Refreshes a Devant session at the token service of its region: the refresh grant, then an exchange for the
 * session's organization. The token service has no revocation an editor can use, so revoking does nothing.
 */
export function devantRefresher(deployments: Readonly<Record<DevantRegion, DevantDeployment>>, fetch: FetchLike): SessionRefresher {
	return {
		async prepare(session) {
			if (!isDevantSession(session)) {
				throw new LoginError("provider_error", "The stored session is not a WSO2 Cloud session.");
			}
			const deployment = deployments[session.devant.region];
			const org = session.devant.organizations.find((item) => item.handle === session.org.handle);
			if (!org) {
				throw new LoginError("provider_error", `The organization ${session.org.handle} is not among the person's WSO2 Cloud organizations.`);
			}
			return async (refreshToken): Promise<RefreshedTokens> => {
				const tokens = await refreshOrganizationTokens(deployment, refreshToken, org.handle, fetch);
				return { tokens, claims: organizationClaims(deployment, tokens.access_token, org, session.devant.user, tokens.expires_in) };
			};
		},
		async revoke() {
			// Nothing to revoke: the session is gone locally either way.
		},
	};
}

/** What a failed step of a Devant sign-in is reported as, with the step named. */
export function signInFailure(step: string, error: unknown): LoginError {
	if (error instanceof LoginError) {
		return error;
	}
	return new LoginError("token_endpoint_failed", `Signing in to WSO2 Cloud failed while ${step}: ${errorMessage(error)}`, { cause: error });
}
