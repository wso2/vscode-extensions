/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import type { AuthState, UserInfo } from "@wso2/wso2-platform-core";
import {
	type AuthenticationProvider,
	type AuthenticationProviderAuthenticationSessionsChangeEvent,
	type AuthenticationProviderSessionOptions,
	type AuthenticationSession,
	Disposable,
	EventEmitter,
	type SecretStorage,
	window,
} from "vscode";
import { ext } from "../extensionVariables";
import { getLogger } from "../logger/logger";
import { contextStore } from "../stores/context-store";
import { dataCacheStore } from "../stores/data-cache-store";

export const WSO2_AUTH_PROVIDER_ID = "wso2-platform";
const WSO2_SESSIONS_SECRET_KEY = `${WSO2_AUTH_PROVIDER_ID}.sessions`;

interface SessionData {
	id: string;
	accessToken: string;
	account: {
		id: string;
		label: string;
	};
	scopes: string[];
	userInfo: UserInfo;
	region: "US" | "EU";
}

export class WSO2AuthenticationProvider implements AuthenticationProvider, Disposable {
	private _sessionChangeEmitter = new EventEmitter<AuthenticationProviderAuthenticationSessionsChangeEvent>();
	private _stateChangeEmitter = new EventEmitter<{ state: AuthState }>();
	private _disposable: Disposable;
	private _state: AuthState = { userInfo: null, region: "US" };

	constructor(private readonly secretStorage: SecretStorage) {
		this._disposable = Disposable.from(this._sessionChangeEmitter, this._stateChangeEmitter);
	}

	get onDidChangeSessions() {
		return this._sessionChangeEmitter.event;
	}

	/**
	 * Subscribe to auth state changes
	 */
	public subscribe(callback: (store: { state: AuthState }) => void): () => void {
		const disposable = this._stateChangeEmitter.event(callback);
		// Call immediately with current state
		callback({ state: this._state });
		return () => disposable.dispose();
	}

	/**
	 * Get the current state
	 */
	public getState() {
		return {
			state: this._state,
			resetState: this.resetState.bind(this),
			loginSuccess: this.loginSuccess.bind(this),
			logout: this.logout.bind(this),
			initAuth: this.initAuth.bind(this),
		};
	}

	/**
	 * Get current auth state
	 */
	get state(): AuthState {
		return this._state;
	}

	/**
	 * Get the existing sessions
	 */
	public async getSessions(scopes: readonly string[] | undefined, options: AuthenticationProviderSessionOptions): Promise<AuthenticationSession[]> {
		const allSessions = await this.readSessions();

		if (scopes && scopes.length > 0) {
			const sessions = allSessions.filter((session) => scopes.every((scope) => session.scopes.includes(scope)));
			return sessions;
		}

		return allSessions;
	}

	/**
	 * Create a new auth session - NOT USED (auth is handled by RPC)
	 * This is required by the AuthenticationProvider interface but not called directly
	 */
	public async createSession(scopes: string[]): Promise<AuthenticationSession> {
		throw new Error("Direct session creation not supported. Use RPC authentication flow.");
	}

	/**
	 * Reset state to initial values
	 */
	public resetState() {
		this._state = { userInfo: null, region: "US" };
		this._stateChangeEmitter.fire({ state: this._state });
	}

	/**
	 * Handle successful login - updates state and stores session
	 */
	public async loginSuccess(userInfo: UserInfo, region: "US" | "EU") {
		// Update local state
		this._state = { userInfo, region };

		// Update related stores
		dataCacheStore.getState().setOrgs(userInfo.organizations);
		contextStore.getState().refreshState();

		// Store session in secure storage
		await this.storeSession(userInfo, region);

		// Notify subscribers
		this._stateChangeEmitter.fire({ state: this._state });
	}

	/**
	 * Handle logout - signs out from RPC and clears all state
	 */
	public async logout(silent = false, skipClearSessions = false) {
		getLogger().debug("Signing out from WSO2 Platform");
		
		// Call RPC signOut first
		try {
			await ext.clients.rpcClient.signOut();
		} catch (error) {
			getLogger().error("Error during RPC signOut", error);
		}

		// Clear VS Code session storage (unless already cleared by removeSession)
		if (!skipClearSessions) {
			try {
				await this.clearSessions();
			} catch (error) {
				getLogger().error("Error clearing sessions", error);
			}
		}

		// Clear local state
		this.resetState();

		if (!silent) {
			window.showInformationMessage("Successfully signed out from WSO2 Platform!");
		}
	}

	/**
	 * Initialize authentication on startup
	 */
	public async initAuth() {
		try {
			// Try to get session from VS Code secure storage first
			const sessionData = await this.getSessionData();
			if (sessionData?.userInfo) {
				// We have a stored session, update the state
				this._state = { userInfo: sessionData.userInfo, region: sessionData.region };
				dataCacheStore.getState().setOrgs(sessionData.userInfo.organizations);
				contextStore.getState().refreshState();
				this._stateChangeEmitter.fire({ state: this._state });

				const contextStoreState = contextStore.getState().state;
				if (contextStoreState.selected?.org) {
					ext?.clients?.rpcClient?.changeOrgContext(contextStoreState.selected?.org?.id?.toString());
				}
				return;
			}

			// Fallback: check RPC for existing session
			const userInfo = await ext.clients.rpcClient.getUserInfo();
			if (userInfo) {
				const region = await ext.clients.rpcClient.getCurrentRegion();
				await this.loginSuccess(userInfo, region);
				const contextStoreState = contextStore.getState().state;
				if (contextStoreState.selected?.org) {
					ext?.clients?.rpcClient?.changeOrgContext(contextStoreState.selected?.org?.id?.toString());
				}
			} else {
				await this.logout(true);
			}
		} catch (err) {
			getLogger().error("Error during auth initialization", err);
			await this.logout(true);
		}
	}

	/**
	 * Store or update a session with user info and region
	 * Called internally after successful RPC authentication
	 */
	private async storeSession(userInfo: UserInfo, region: "US" | "EU"): Promise<AuthenticationSession> {
		// Remove any existing sessions first (single account support)
		const existingSessions = await this.readSessions();
		const removedSessions = [...existingSessions];

		const sessionId = this.generateSessionId();
		const sessionData: SessionData = {
			id: sessionId,
			accessToken: "rpc-authenticated", // Placeholder since RPC handles auth
			account: {
				label: userInfo.displayName || userInfo.userEmail,
				id: userInfo.userId,
			},
			scopes: [],
			userInfo,
			region,
		};

		const session: AuthenticationSession = {
			id: sessionData.id,
			accessToken: sessionData.accessToken,
			account: sessionData.account,
			scopes: sessionData.scopes,
		};

		await this.storeSessions([session], sessionData);

		this._sessionChangeEmitter.fire({ 
			added: [session], 
			removed: removedSessions, 
			changed: [] 
		});

		return session;
	}

	/**
	 * Remove an existing session
	 * This is called when user signs out from VS Code's Accounts menu
	 */
	public async removeSession(sessionId: string): Promise<void> {
		const allSessions = await this.readSessions();
		const sessionIdx = allSessions.findIndex((s) => s.id === sessionId);
		const session = allSessions[sessionIdx];
		if (!session) {
			return;
		}

		allSessions.splice(sessionIdx, 1);
		await this.storeSessions(allSessions);
		this._sessionChangeEmitter.fire({ added: [], removed: [session], changed: [] });
		
		// Trigger full logout flow (skipClearSessions=true to avoid loop)
		await this.logout(false, true);
	}

	/**
	 * Remove all sessions
	 */
	public async clearSessions(): Promise<void> {
		const allSessions = await this.readSessions();
		if (allSessions.length === 0) {
			return;
		}

		await this.secretStorage.delete(WSO2_SESSIONS_SECRET_KEY);

		this._sessionChangeEmitter.fire({ added: [], removed: allSessions, changed: [] });
	}

	/**
	 * Get session data including userInfo and region
	 */
	public async getSessionData(sessionId?: string): Promise<SessionData | undefined> {
		const sessions = await this.readSessionsData();
		if (sessionId) {
			return sessions.find((s) => s.id === sessionId);
		}
		// Return the first session if no ID is provided (single account support)
		return sessions[0];
	}

	/**
	 * Dispose the provider
	 */
	public async dispose() {
		this._disposable.dispose();
	}

	/**
	 * Get the user info from stored session (for backward compatibility)
	 */
	public getUserInfo(): UserInfo | null {
		return this._state.userInfo;
	}

	/**
	 * Get the region from stored session (for backward compatibility)  
	 */
	public getRegion(): "US" | "EU" {
		return this._state.region;
	}

	/**
	 * Read sessions from secret storage
	 */
	private async readSessions(): Promise<AuthenticationSession[]> {
		try {
			const sessionsJson = await this.secretStorage.get(WSO2_SESSIONS_SECRET_KEY);
			if (!sessionsJson) {
				return [];
			}

			const sessionData: SessionData[] = JSON.parse(sessionsJson);
			return sessionData.map((data) => ({
				id: data.id,
				accessToken: data.accessToken,
				account: data.account,
				scopes: data.scopes,
			}));
		} catch (e) {
			getLogger().error("Error reading sessions", e);
			return [];
		}
	}

	/**
	 * Store sessions to secret storage
	 */
	private async storeSessions(sessions: readonly AuthenticationSession[], newSessionData?: SessionData): Promise<void> {
		try {
			const existingSessions = await this.readSessionsData();
			let updatedSessions: SessionData[];

			if (newSessionData) {
				// Add or update session
				const existingIndex = existingSessions.findIndex((s) => s.id === newSessionData.id);
				if (existingIndex >= 0) {
					updatedSessions = [...existingSessions];
					updatedSessions[existingIndex] = newSessionData;
				} else {
					updatedSessions = [...existingSessions, newSessionData];
				}
			} else {
				// Filter out removed sessions
				const sessionIds = sessions.map((s) => s.id);
				updatedSessions = existingSessions.filter((s) => sessionIds.includes(s.id));
			}

			await this.secretStorage.store(WSO2_SESSIONS_SECRET_KEY, JSON.stringify(updatedSessions));
		} catch (e) {
			getLogger().error("Error storing sessions", e);
		}
	}

	/**
	 * Read full session data including userInfo and region
	 */
	private async readSessionsData(): Promise<SessionData[]> {
		try {
			const sessionsJson = await this.secretStorage.get(WSO2_SESSIONS_SECRET_KEY);
			if (!sessionsJson) {
				return [];
			}

			return JSON.parse(sessionsJson);
		} catch (e) {
			getLogger().error("Error reading session data", e);
			return [];
		}
	}

	/**
	 * Generate a session ID
	 */
	private generateSessionId(): string {
		return `wso2-${Date.now()}-${Math.random().toString(36).substring(2)}`;
	}
}

/**
 * Helper function to wait for user login
 */
export const waitForLogin = async (): Promise<UserInfo> => {
	return new Promise((resolve) => {
		ext.authProvider?.subscribe(({ state }) => {
			if (state.userInfo) {
				resolve(state.userInfo);
			}
		});
	});
};
