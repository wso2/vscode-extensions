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

import { createHash } from "node:crypto";
import * as vscode from "vscode";
import type { SessionManager } from "../auth/session-manager";
import type { OrgInfo, StoredSession, TokenSource } from "../auth/types";
import { accountOf, orgOf } from "../auth/types";
import type { CloudEnvName, CloudEnvironment } from "../config/environments";
import { LoginError, errorMessage, isCloudError } from "../errors";
import type { Logger } from "../logger";
import { silentLogger } from "../logger";

/** The id other extensions pass to `vscode.authentication.getSession`. */
export const WSO2_CLOUD_AUTH_PROVIDER_ID = "wso2-cloud";

export const WSO2_CLOUD_AUTH_PROVIDER_LABEL = "WSO2 Cloud";

/** The scope that names the deployment a session is for. */
export function scopeForEnv(env: CloudEnvName): string {
	return `env:${env}`;
}

export function scopeForOrg(handle: string): string {
	return `org:${handle}`;
}

export interface AuthProviderDeps {
	env: CloudEnvironment;
	sessions: SessionManager;
	tokenSource: TokenSource;
	/** Runs a browser sign-in and answers the session it produced. Absent where no browser can be used. */
	startLogin?: (options: { extraAuthParams?: Record<string, string> }) => Promise<StoredSession>;
	/** Abandons a sign-in waiting for the browser. */
	cancelLogin?: () => void;
	/** Fills in what only the API knows about the organization, once per session. */
	resolveOrg?: (session: StoredSession) => Promise<OrgInfo>;
	logger?: Logger;
}

/**
 * The `wso2-cloud` authentication provider. Sessions carry the real access
 * token, so another extension gets one with
 * `vscode.authentication.getSession("wso2-cloud", ["env:prod"])` and never
 * depends on this extension's exported API for it.
 *
 * One provider serves the environment it was made for; a session for
 * another environment is not surfaced until the setting changes and the
 * window reloads, which is how the setting already behaves.
 */
export class WSO2CloudAuthenticationProvider implements vscode.AuthenticationProvider, vscode.Disposable {
	private readonly emitter = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
	readonly onDidChangeSessions = this.emitter.event;
	private readonly logger: Logger;
	private readonly disposables: (() => void)[] = [];
	/** The session last handed out, so its removal can be reported. */
	private last?: vscode.AuthenticationSession;

	constructor(private readonly deps: AuthProviderDeps) {
		this.logger = deps.logger ?? silentLogger;
		this.disposables.push(
			deps.sessions.onDidChange((event) => {
				this.deps.sessions.current().then(
					(session) => {
						const converted = session ? [this.toSession(session)] : [];
						const removed = this.last ? [this.last] : [];
						this.last = converted[0];
						switch (event.reason) {
							case "signed-in":
								this.emitter.fire({ added: converted, removed, changed: [] });
								break;
							case "refreshed":
								this.emitter.fire({ added: [], removed: [], changed: converted });
								break;
							default:
								this.emitter.fire({ added: [], removed, changed: [] });
						}
					},
					(error) => this.logger.error("The WSO2 Cloud session could not be read after it changed", error),
				);
			}),
		);
	}

	register(context: vscode.ExtensionContext): vscode.Disposable {
		const registration = vscode.authentication.registerAuthenticationProvider(WSO2_CLOUD_AUTH_PROVIDER_ID, WSO2_CLOUD_AUTH_PROVIDER_LABEL, this, {
			supportsMultipleAccounts: false,
		});
		context.subscriptions.push(registration, this);
		return registration;
	}

	/** Whether `scopes` name this provider's environment, or name none. */
	private serves(scopes: readonly string[] | undefined): boolean {
		const named = (scopes ?? []).filter((s) => s.startsWith("env:"));
		return named.length === 0 || named.includes(scopeForEnv(this.deps.env.name));
	}

	async getSessions(scopes?: readonly string[]): Promise<vscode.AuthenticationSession[]> {
		if (!this.serves(scopes)) {
			return [];
		}
		const session = await this.deps.sessions.current();
		if (!session) {
			const injected = await this.injectedSession();
			if (injected) {
				this.last = injected;
				return [injected];
			}
			return [];
		}
		try {
			// A stale token is refreshed here, so a session handed out is usable.
			await this.deps.tokenSource.getAccessToken();
		} catch (error) {
			if (isCloudError(error) && (error.code === "session_expired" || error.code === "unauthenticated")) {
				return [];
			}
			// A network failure keeps the session; the token may still be good.
		}
		const current = await this.deps.sessions.current();
		if (!current) {
			return [];
		}
		this.last = this.toSession(current);
		return [this.last];
	}

	async createSession(scopes: readonly string[]): Promise<vscode.AuthenticationSession> {
		if (!this.serves(scopes)) {
			throw new LoginError("provider_error", `This provider signs in to ${this.deps.env.name}; ${scopes.join(" ")} names another environment.`);
		}
		if (!this.deps.startLogin) {
			throw new LoginError("not_available_in_cloud_editor", "This editor was started with a WSO2 Cloud token and cannot sign in as someone else.");
		}
		this.deps.cancelLogin?.();
		const prompt = scopes.includes("prompt:login") ? { prompt: "login" } : undefined;
		let session = await this.deps.startLogin({ extraAuthParams: prompt });
		// Stored first, so the organization is read with the token just issued, not the one before.
		await this.deps.sessions.setSession(session);
		if (this.deps.resolveOrg) {
			try {
				const org = await this.deps.resolveOrg(session);
				session = (await this.deps.sessions.update((stored) => ({ ...stored, org: { ...stored.org, ...org } }))) ?? session;
			} catch (error) {
				this.logger.warn(`Signed in, but the organization could not be read from the API: ${errorMessage(error)}`);
			}
		}
		this.last = this.toSession(session);
		return this.last;
	}

	/** Signs out; the session manager's event reports the removal. */
	async removeSession(_sessionId: string): Promise<void> {
		await this.deps.sessions.signOut({ revoke: true });
	}

	/**
	 * In an editor started with a WSO2 Cloud token there is no stored session,
	 * but there is a signed-in person: the token's claims. Other extensions
	 * asking `vscode.authentication` get that session, read afresh each time
	 * since the token can be rotated in place.
	 */
	private async injectedSession(): Promise<vscode.AuthenticationSession | undefined> {
		if (this.deps.tokenSource.kind !== "injected") {
			return undefined;
		}
		try {
			const claims = await this.deps.tokenSource.getClaims();
			if (!claims) {
				return undefined;
			}
			const accessToken = await this.deps.tokenSource.getAccessToken();
			const org = orgOf(claims);
			const account = accountOf(claims);
			return {
				id: sessionId({ env: this.deps.env.name, account, org }),
				accessToken,
				account: { id: account.id, label: `${account.label} (${org.name})` },
				scopes: [scopeForEnv(this.deps.env.name), scopeForOrg(org.handle)],
			};
		} catch (error) {
			this.logger.warn(`The editor's WSO2 Cloud token could not be read: ${errorMessage(error)}`);
			return undefined;
		}
	}

	/** The stored session, with the platform's claims, for the host's own UI. */
	getStoredSession(): Promise<StoredSession | undefined> {
		return this.deps.sessions.current();
	}

	cancelPendingLogin(): void {
		this.deps.cancelLogin?.();
	}

	toSession(session: StoredSession): vscode.AuthenticationSession {
		return {
			id: sessionId(session),
			accessToken: session.tokens.accessToken,
			account: { id: session.account.id, label: `${session.account.label} (${session.org.name})` },
			scopes: [scopeForEnv(session.env), scopeForOrg(session.org.handle)],
		};
	}

	dispose(): void {
		for (const dispose of this.disposables) {
			dispose();
		}
		this.emitter.dispose();
	}
}

/** Stable across refreshes: the environment, the person and the organization. */
export function sessionId(session: Pick<StoredSession, "env" | "account" | "org">): string {
	return createHash("sha256").update(`${session.env}|${session.account.id}|${session.org.id}`).digest("hex").slice(0, 16);
}
