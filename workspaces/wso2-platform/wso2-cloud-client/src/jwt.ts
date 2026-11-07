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

import { Buffer } from "node:buffer";

/**
 * The claims a WSO2 Cloud ThunderID access token carries that the platform
 * reads. `ouId`, `ouName` and `ouHandle` name the organization chosen at
 * sign-in; the platform API refuses a token without them.
 */
export interface PlatformClaims {
	sub: string;
	iss: string;
	client_id: string;
	ouId: string;
	ouName: string;
	ouHandle: string;
	exp: number;
	iat?: number;
	aud?: string | string[];
	scope?: string;
	email?: string;
	name?: string;
	given_name?: string;
	family_name?: string;
	picture?: string;
	[claim: string]: unknown;
}

/** Decodes a JWT's payload without verifying it: the caller decides what to trust. */
export function decodeJwtPayload(token: string): Record<string, unknown> | undefined {
	const parts = token.split(".");
	if (parts.length !== 3) {
		return undefined;
	}
	try {
		const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
		const parsed = JSON.parse(json);
		return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : undefined;
	} catch {
		return undefined;
	}
}

const REQUIRED_CLAIMS = ["sub", "iss", "client_id", "ouId", "ouName", "ouHandle"] as const;

/** Names the required claims a payload leaves out, empty when it carries them all. */
export function missingPlatformClaims(payload: Record<string, unknown>): string[] {
	const missing: string[] = REQUIRED_CLAIMS.filter((claim) => typeof payload[claim] !== "string" || payload[claim] === "");
	if (typeof payload.exp !== "number") {
		missing.push("exp");
	}
	return missing;
}

export function readPlatformClaims(token: string): PlatformClaims | undefined {
	const payload = decodeJwtPayload(token);
	if (!payload || missingPlatformClaims(payload).length > 0) {
		return undefined;
	}
	return payload as unknown as PlatformClaims;
}

/** When the token stops being accepted, as the issuer stated it. */
export function expiresAt(claims: Pick<PlatformClaims, "exp">): Date {
	return new Date(claims.exp * 1000);
}

export function isExpired(claims: Pick<PlatformClaims, "exp">, now: Date = new Date(), marginMs = 0): boolean {
	return expiresAt(claims).getTime() - marginMs <= now.getTime();
}

/** The `aud` claim as a list: a token may name one audience or many. */
export function audiencesOf(aud: unknown): string[] {
	if (aud === undefined || aud === null) {
		return [];
	}
	return (Array.isArray(aud) ? aud : [aud]).map(String);
}
