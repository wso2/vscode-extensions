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

import type { CloudEnvName } from "../config/environments";
import type { PlatformClaims } from "../jwt";

export type TokenSourceKind = "browser" | "injected" | "static";

export type SessionChangeReason = "signed-in" | "refreshed" | "signed-out" | "expired";

export interface SessionChangeEvent {
	reason: SessionChangeReason;
}

export interface GetAccessTokenOptions {
	/** Refresh before answering, because the last token was rejected. */
	forceRefresh?: boolean;
	signal?: AbortSignal;
}

/**
 * Where the bearer token for a request comes from. The HTTP client asks for
 * one per request, so a source may refresh lazily and must answer quickly
 * when nothing has changed.
 */
export interface TokenSource {
	readonly kind: TokenSourceKind;
	getAccessToken(options?: GetAccessTokenOptions): Promise<string>;
	getClaims(): Promise<PlatformClaims | undefined>;
	onDidChange?(listener: (event: SessionChangeEvent) => void): () => void;
}

/** The organization a session is bound to, from the token's claims and `GET /orgs`. */
export interface OrgInfo {
	/** The `ouId` claim. */
	id: string;
	/** The `ouHandle` claim, which API paths and context files name. */
	handle: string;
	/** The `ouName` claim. */
	name: string;
	/** From `GET /orgs`, once read; what the subscription routes take. */
	uuid?: string;
	numericId?: number;
}

export interface TokenSet {
	accessToken: string;
	refreshToken?: string;
	idToken?: string;
	/** ISO 8601. */
	expiresAt: string;
	/** ISO 8601, when the issuer stated a refresh-token lifetime. */
	refreshExpiresAt?: string;
	scope: string;
}

export interface SessionAccount {
	/** The `sub` claim. */
	id: string;
	/** What a person sees: the email, else the name, else the subject. */
	label: string;
}

/** What is persisted for a signed-in session. Versioned so a later shape can migrate it. */
export interface StoredSession {
	version: 1;
	env: CloudEnvName;
	issuer: string;
	clientId: string;
	tokens: TokenSet;
	claims: PlatformClaims;
	org: OrgInfo;
	account: SessionAccount;
	obtainedVia: "browser" | "injected";
	/** ISO 8601. */
	createdAt: string;
}

export const STORED_SESSION_VERSION = 1 as const;

/** Where sessions are kept. The vscode adapter backs it with SecretStorage. */
export interface SessionStore {
	load(env: CloudEnvName): Promise<StoredSession | undefined>;
	save(session: StoredSession): Promise<void>;
	clear(env: CloudEnvName): Promise<void>;
	/**
	 * Calls `listener` when the session kept for an environment may have
	 * changed, including by another window sharing the store. Optional: a
	 * store nothing else writes has nothing to report.
	 */
	onDidChange?(listener: (env: CloudEnvName) => void): () => void;
}

/** Who the token is for, labelled by email, then name, then subject. */
export function accountOf(claims: PlatformClaims): SessionAccount {
	return { id: claims.sub, label: claims.email ?? claims.name ?? claims.sub };
}

/** The organization the token is scoped to. */
export function orgOf(claims: PlatformClaims): OrgInfo {
	return { id: claims.ouId, handle: claims.ouHandle, name: claims.ouName };
}

/** Reads a persisted session back, refusing one of another shape. */
export function parseStoredSession(raw: string | undefined): StoredSession | undefined {
	if (!raw) {
		return undefined;
	}
	try {
		const parsed = JSON.parse(raw) as Partial<StoredSession>;
		if (parsed.version !== STORED_SESSION_VERSION || !parsed.tokens?.accessToken || !parsed.claims || !parsed.org) {
			return undefined;
		}
		return parsed as StoredSession;
	} catch {
		return undefined;
	}
}
