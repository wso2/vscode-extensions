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
import { UnauthenticatedError } from "../errors";
import type { PlatformClaims } from "../jwt";
import { isExpired, readPlatformClaims } from "../jwt";
import type { SessionManager } from "./session-manager";
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
	return env[INJECTED_TOKEN_ENV]?.trim() || undefined;
}

/** Whether the editor was started with a WSO2 Cloud token (the cloud editor), which replaces the browser sign-in. */
export function hasInjectedToken(env: NodeJS.ProcessEnv = process.env): boolean {
	return !!(env[INJECTED_TOKEN_FILE_ENV] || env[INJECTED_TOKEN_ENV]);
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
