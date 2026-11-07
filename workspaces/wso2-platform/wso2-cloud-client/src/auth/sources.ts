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

import { readFileSync } from "node:fs";
import type { FetchLike } from "../api/http";
import { UnauthenticatedError } from "../errors";
import type { PlatformClaims } from "../jwt";
import { audiencesOf, isExpired, readPlatformClaims } from "../jwt";
import { discover } from "./discovery";
import type { SessionManager } from "./session-manager";
import { exchangeToken } from "./token-endpoint";
import type { GetAccessTokenOptions, SessionChangeEvent, TokenSource } from "./types";

/** The tokens of a session a person signed in to with the browser. */
export class BrowserLoginTokenSource implements TokenSource {
	readonly kind = "browser" as const;

	constructor(private readonly sessions: SessionManager) {}

	getAccessToken(options: GetAccessTokenOptions = {}): Promise<string> {
		return this.sessions.getAccessToken({ forceRefresh: options.forceRefresh, signal: options.signal });
	}

	async getClaims(): Promise<PlatformClaims | undefined> {
		return (await this.sessions.current())?.claims;
	}

	onDidChange(listener: (event: SessionChangeEvent) => void): () => void {
		return this.sessions.onDidChange(listener);
	}
}

/** The names a hosting environment may hand a token in by. */
export const INJECTED_TOKEN_ENV = "WSO2_CLOUD_TOKEN";
export const INJECTED_TOKEN_FILE_ENV = "WSO2_CLOUD_TOKEN_FILE";
/** The old Choreo CLI name, read for one release so an unchanged cloud editor keeps working. */
export const LEGACY_INJECTED_TOKEN_ENV = "CLOUD_STS_TOKEN";

export interface InjectedTokenOptions {
	/** Where the token comes from; defaults to the environment variables above. */
	read?: () => string | undefined;
	now?: () => Date;
}

/** Reads the variables an injected token may arrive in, the file form first. */
export function readInjectedToken(env: NodeJS.ProcessEnv = process.env): string | undefined {
	const file = env[INJECTED_TOKEN_FILE_ENV];
	if (file) {
		try {
			const token = readFileSync(file, "utf8").trim();
			if (token) {
				return token;
			}
		} catch {
			// A missing or unreadable file is the same as no token.
		}
	}
	return env[INJECTED_TOKEN_ENV]?.trim() || env[LEGACY_INJECTED_TOKEN_ENV]?.trim() || undefined;
}

export function hasInjectedToken(env: NodeJS.ProcessEnv = process.env): boolean {
	return !!(env[INJECTED_TOKEN_FILE_ENV] || env[INJECTED_TOKEN_ENV] || env[LEGACY_INJECTED_TOKEN_ENV]);
}

/**
 * A token the hosting environment supplies, as the cloud editor does. It is
 * read again on every request, so a host that rotates the file in place is
 * honoured; nothing can be refreshed, so an expired one is reported as such.
 */
export class InjectedTokenSource implements TokenSource {
	readonly kind = "injected" as const;
	private readonly read: () => string | undefined;
	private readonly now: () => Date;

	constructor(options: InjectedTokenOptions = {}) {
		this.read = options.read ?? (() => readInjectedToken());
		this.now = options.now ?? (() => new Date());
	}

	async getAccessToken(): Promise<string> {
		const token = this.read();
		if (!token) {
			throw new UnauthenticatedError("no_session", "This editor was started without a WSO2 Cloud token.");
		}
		const claims = readPlatformClaims(token);
		if (claims && isExpired(claims, this.now())) {
			throw new UnauthenticatedError("injected_token_expired");
		}
		return token;
	}

	async getClaims(): Promise<PlatformClaims | undefined> {
		const token = this.read();
		return token ? readPlatformClaims(token) : undefined;
	}
}

export interface ExchangingTokenOptions {
	issuer: string;
	clientId: string;
	fetch: FetchLike;
	now?: () => Date;
	/** A token this close to expiry is exchanged again. */
	marginMs?: number;
}

/**
 * Wraps a source so that each resource gets a token bound to it (RFC 8693),
 * for a platform that wants `aud` to name the API rather than the client.
 * Off by default: `CloudEnvironment.tokenExchange` turns it on.
 */
export class ExchangingTokenSource implements TokenSource {
	readonly kind = "exchanging" as const;
	private readonly cache = new Map<string, { token: string; expiresAt: number }>();
	private readonly inFlight = new Map<string, Promise<string>>();

	constructor(
		private readonly inner: TokenSource,
		private readonly options: ExchangingTokenOptions,
	) {
		// A token exchanged for one session must not outlive it.
		inner.onDidChange?.(() => this.cache.clear());
	}

	private now(): number {
		return (this.options.now ?? (() => new Date()))().getTime();
	}

	async getAccessToken(options: GetAccessTokenOptions = {}): Promise<string> {
		if (!options.resource) {
			return this.inner.getAccessToken(options);
		}
		const resource = options.resource;
		const now = this.now();
		const cached = this.cache.get(resource);
		if (cached && !options.forceRefresh && cached.expiresAt - (this.options.marginMs ?? 60_000) > now) {
			return cached.token;
		}
		let pending = this.inFlight.get(resource);
		if (!pending) {
			pending = this.exchange(resource, options).finally(() => this.inFlight.delete(resource));
			this.inFlight.set(resource, pending);
		}
		return pending;
	}

	private async exchange(resource: string, options: GetAccessTokenOptions): Promise<string> {
		const subject = await this.inner.getAccessToken({ forceRefresh: options.forceRefresh, signal: options.signal });
		const discovery = await discover(this.options.issuer, this.options.fetch, { signal: options.signal });
		const issued = await exchangeToken({
			tokenEndpoint: discovery.token_endpoint,
			clientId: this.options.clientId,
			fetch: this.options.fetch,
			subjectToken: subject,
			resource,
			signal: options.signal,
		});
		const claims = readPlatformClaims(issued.access_token);
		const audiences = audiencesOf(claims?.aud);
		if (!audiences.includes(resource)) {
			throw new UnauthenticatedError(
				"rejected",
				`The identity provider issued a token for ${audiences.join(", ") || "no audience"}, not ${resource}.`,
			);
		}
		const issuedAt = this.now();
		const expiresAt = issued.expires_in ? issuedAt + issued.expires_in * 1000 : claims ? claims.exp * 1000 : issuedAt;
		this.cache.set(resource, { token: issued.access_token, expiresAt });
		return issued.access_token;
	}

	getClaims(): Promise<PlatformClaims | undefined> {
		return this.inner.getClaims();
	}

	onDidChange(listener: (event: SessionChangeEvent) => void): () => void {
		return this.inner.onDidChange?.(listener) ?? (() => undefined);
	}
}
