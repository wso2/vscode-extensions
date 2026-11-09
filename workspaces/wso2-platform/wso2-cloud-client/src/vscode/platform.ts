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

import * as vscode from "vscode";
import type { CloudClient } from "../api/client";
import { createCloudClient } from "../api/client";
import type { FetchLike } from "../api/http";
import { defaultFetch } from "../api/http";
import { LoginFlow } from "../auth/login-flow";
import { SessionManager } from "../auth/session-manager";
import { BrowserLoginTokenSource, InjectedTokenSource, hasInjectedToken } from "../auth/sources";
import type { StoredSession, TokenSource } from "../auth/types";
import type { CloudEnvironment } from "../config/environments";
import { ENVIRONMENTS, missingEnvironmentUrls } from "../config/environments";
import { LoginError, errorMessage } from "../errors";
import type { UnauthenticatedError } from "../errors";
import type { Logger } from "../logger";
import { silentLogger } from "../logger";
import { WSO2CloudAuthenticationProvider } from "./auth-provider";
import { SecretStorageSessionStore } from "./secret-session-store";
import { readCloudEnvName, readCloudEnvironment } from "./settings";
import type { UriCallbackReceiver } from "./uri-callback";
import type { ChosenReceivers } from "./uri-callback";
import { chooseReceivers } from "./uri-callback";

export interface PlatformClientsOptions {
	/** `publisher.name` of the hosting extension; the sign-in URI's authority. */
	extensionId: string;
	context: vscode.ExtensionContext;
	environment?: CloudEnvironment;
	fetch?: FetchLike;
	userAgent?: string;
	logger?: Logger;
	/** Called when the API rejects the session's token twice; the host signs out and says so. */
	onUnauthenticated?: (error: UnauthenticatedError) => void;
	/** For tests: where the token comes from instead of the browser or the environment. */
	tokenSource?: TokenSource;
}

/**
 * Everything a hosting extension holds for the platform: the environment,
 * the sessions, the token source, the API client, the authentication
 * provider, and the login the provider runs.
 */
export interface PlatformClients extends vscode.Disposable {
	readonly environment: CloudEnvironment;
	readonly sessions: SessionManager;
	readonly tokenSource: TokenSource;
	readonly cloud: CloudClient;
	readonly auth: WSO2CloudAuthenticationProvider;
	/** Set when sign-in happens in the browser; absent in a cloud editor started with a token. */
	readonly login?: LoginFlow;
	/** The URI receiver to feed from the extension's `handleUri`, when the sign-in comes back that way. */
	readonly uriReceiver?: UriCallbackReceiver;
	/** Whether the editor was started with a token, which cannot be signed out of. */
	readonly injected: boolean;
}

/**
 * Wires the pieces for a hosting extension: secret storage for sessions,
 * the browser login or the injected token, the API client, and the
 * `wso2-cloud` authentication provider, registered on `context`. A
 * configuration that cannot be used does not make it throw; see
 * {@link readEnvironmentOrFallback}.
 */
export function createPlatformClients(options: PlatformClientsOptions): PlatformClients {
	const logger = options.logger ?? silentLogger;
	const environment = options.environment ?? readEnvironmentOrFallback(logger);
	const fetchImpl: FetchLike = options.fetch ?? defaultFetch;
	const store = new SecretStorageSessionStore(options.context.secrets);
	const sessions = new SessionManager({ env: environment, store, fetch: fetchImpl, logger });
	const injected = !options.tokenSource && hasInjectedToken();

	let login: LoginFlow | undefined;
	let uriReceiver: UriCallbackReceiver | undefined;
	let tokenSource: TokenSource;
	if (options.tokenSource) {
		tokenSource = options.tokenSource;
	} else if (injected) {
		tokenSource = new InjectedTokenSource();
	} else {
		let chosen: ChosenReceivers | undefined;
		try {
			chosen = chooseReceivers({ extensionId: options.extensionId });
		} catch (error) {
			// Sign-in is what this editor lacks, not the rest of the extension; a stored session still works.
			logger.warn(`WSO2 Cloud sign-in is not available in this editor: ${errorMessage(error)}`);
		}
		uriReceiver = chosen?.uriReceiver;
		login = chosen
			? new LoginFlow({
					env: environment,
					fetch: fetchImpl,
					receiver: chosen.receiver,
					openBrowser: async (url) => {
						// False when the person declined to open the site; waiting for a callback then would only time out.
						if (!(await vscode.env.openExternal(vscode.Uri.parse(url)))) {
							throw new LoginError("cancelled", "The sign-in page was not opened.");
						}
					},
					logger,
				})
			: undefined;
		tokenSource = new BrowserLoginTokenSource(sessions);
	}

	const cloud = createCloudClient({
		environment,
		tokenSource,
		fetch: fetchImpl,
		userAgent: options.userAgent,
		logger,
		onUnauthenticated: options.onUnauthenticated,
	});

	const auth = new WSO2CloudAuthenticationProvider({
		env: environment,
		sessions,
		tokenSource,
		startLogin: login ? (runOptions) => (login as LoginFlow).run(runOptions) : undefined,
		cancelLogin: login ? () => login?.cancel() : undefined,
		resolveOrg: async (session: StoredSession) => {
			const org = await cloud.orgs.current();
			return { ...session.org, uuid: org?.uuid, numericId: org?.numericId };
		},
		logger,
	});
	auth.register(options.context);

	return {
		environment,
		sessions,
		tokenSource,
		cloud,
		auth,
		login,
		uriReceiver,
		injected,
		dispose: () => {
			sessions.dispose();
			uriReceiver?.dispose();
			login?.cancel();
		},
	};
}

/**
 * The configured environment. A configuration that cannot be used (`dev`
 * without its URLs, an override that is not https) must not stop the host
 * from activating, so the named environment is used without any override,
 * or prod when that environment has no URLs of its own, and a warning names
 * what was used. Sessions are kept per environment, so none is sent to the
 * fallback's issuer.
 */
function readEnvironmentOrFallback(logger: Logger): CloudEnvironment {
	try {
		return readCloudEnvironment();
	} catch (error) {
		const named = ENVIRONMENTS[readCloudEnvName()];
		const fallback = missingEnvironmentUrls(named).length === 0 ? named : ENVIRONMENTS.prod;
		const message = `The WSO2 Cloud settings cannot be used (${errorMessage(error)}); using the ${fallback.name} environment without overrides instead.`;
		logger.warn(message);
		void Promise.resolve(vscode.window.showWarningMessage(message)).catch(() => undefined);
		return fallback;
	}
}
