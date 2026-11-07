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

import type * as vscode from "vscode";
import { sessionKey } from "../auth/session-store";
import type { SessionStore, StoredSession } from "../auth/types";
import { parseStoredSession } from "../auth/types";
import type { CloudEnvName } from "../config/environments";

/** The key the old WSO2 Integrator auth provider kept its placeholder sessions under. */
export const LEGACY_SECRET_KEY = "wso2-wi.sessions";

/**
 * Sessions in VS Code's secret storage, which the desktop keeps in the OS
 * keychain and a remote session forwards to the local client, so no
 * keyring is needed where the extension host runs.
 */
export class SecretStorageSessionStore implements SessionStore {
	constructor(private readonly secrets: vscode.SecretStorage) {}

	/** The session kept for `env` in SecretStorage, if any and readable. */
	async load(env: CloudEnvName): Promise<StoredSession | undefined> {
		return parseStoredSession(await this.secrets.get(sessionKey(env)));
	}

	/** Keeps the session in SecretStorage. */
	async save(session: StoredSession): Promise<void> {
		await this.secrets.store(sessionKey(session.env), JSON.stringify(session));
	}

	/** Removes the session for `env` from SecretStorage. */
	async clear(env: CloudEnvName): Promise<void> {
		await this.secrets.delete(sessionKey(env));
	}

	/** Forgets what the CLI-era auth provider stored; it held no tokens. */
	async removeLegacy(): Promise<void> {
		await this.secrets.delete(LEGACY_SECRET_KEY);
	}
}
