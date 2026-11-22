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
import { BrowserLoginTokenSource, InjectedTokenSource, hasInjectedToken, readInjectedToken } from "../auth/sources";
import type { SessionChangeEvent, SessionStore, StoredSession, TokenSource } from "../auth/types";
import type { CloudEnvName, CloudEnvironment } from "../config/environments";
import { ENVIRONMENTS, environmentIssuedBy, missingEnvironmentUrls, regionsOf } from "../config/environments";
import { BadRequestError, LoginError, errorMessage } from "../errors";
import type { UnauthenticatedError } from "../errors";
import { decodeJwtPayload } from "../jwt";
import type { Logger } from "../logger";
import { silentLogger } from "../logger";
import { ApiKeys } from "./api-key";
import type { AuthProviderRegion } from "./auth-provider";
import { WSO2CloudAuthenticationProvider } from "./auth-provider";
import { SecretStorageSessionStore } from "./secret-session-store";
import { CLOUD_ENV_VARS, isCloudEnvironmentPinned, readCloudEnvName, readCloudEnvironment } from "./settings";
import type { UriCallbackReceiver } from "./uri-callback";
import type { ChosenReceivers } from "./uri-callback";
import { chooseReceivers } from "./uri-callback";

/** The `globalState` key the region the person last switched to is kept under. */
export const CLOUD_REGION_STATE_KEY = "wso2-cloud.region";

export interface PlatformClientsOptions {
	/** `publisher.name` of the hosting extension; the sign-in URI's authority. */
	extensionId: string;
	/** The product the browser's sign-in pages name. */
	productName?: string;
	context: vscode.ExtensionContext;
	/** An environment to use as it is, with no switching to another region; read from the settings when absent. */
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
 *
 * A deployment that runs in several regions (production: the United States
 * and Europe) can be switched between while the editor runs. Each region has
 * its own sessions, login and API client, so a token is only ever sent to the
 * region that issued it; the members here answer for the current region, so
 * read them when they are used rather than keeping them.
 */
export interface PlatformClients extends vscode.Disposable {
	readonly environment: CloudEnvironment;
	/** The regions {@link switchEnvironment} can move between, the current one among them; only it where there is no choice. */
	readonly regions: readonly CloudEnvironment[];
	readonly sessions: SessionManager;
	readonly tokenSource: TokenSource;
	readonly cloud: CloudClient;
	readonly auth: WSO2CloudAuthenticationProvider;
	/** The key the provider's sessions carry; the host's exported API answers only to it. */
	readonly apiKeys: ApiKeys;
	/** Set when sign-in happens in the browser; absent in a cloud editor started with a token. */
	readonly login?: LoginFlow;
	/** The URI receiver to feed from the extension's `handleUri`, when the sign-in comes back that way. */
	readonly uriReceiver?: UriCallbackReceiver;
	/** Whether the editor was started with a token, which cannot be signed out of. */
	readonly injected: boolean;
	/**
	 * Moves to another of {@link regions}, and remembers it for the next start.
	 * The session kept for that region, if any, becomes the one in use; the one
	 * left stays stored for coming back. A sign-in waiting for the browser is
	 * given up. The authentication provider reports the change of session.
	 */
	switchEnvironment(name: CloudEnvName): Promise<void>;
	/** Fires with the new environment after a switch, before the provider reports the change of session. */
	readonly onDidChangeEnvironment: vscode.Event<CloudEnvironment>;
	/** The current region's session changes, whichever region that is; a switch itself is reported by {@link onDidChangeEnvironment}. */
	onDidChangeSession(listener: (event: SessionChangeEvent) => void): () => void;
}

/** One region's own pieces: nothing in it is shared with another region. */
interface RegionClients {
	environment: CloudEnvironment;
	sessions: SessionManager;
	tokenSource: TokenSource;
	cloud: CloudClient;
	login?: LoginFlow;
	uriReceiver?: UriCallbackReceiver;
	loginUnavailable?: string;
}

/** What the region choice is kept as: the region chosen, under the environment the settings named then. */
interface SavedRegion {
	configured: CloudEnvName;
	chosen: CloudEnvName;
}

/**
 * Wires the pieces for a hosting extension: secret storage for sessions,
 * the browser login or the injected token, the API client, and the
 * `wso2-cloud` authentication provider, registered on `context`. A
 * configuration that cannot be used does not make it throw; see
 * {@link readEnvironmentOrFallback}.
 */
export function createPlatformClients(options: PlatformClientsOptions): PlatformClients {
	return new SwitchablePlatformClients(options);
}

class SwitchablePlatformClients implements PlatformClients {
	readonly regions: readonly CloudEnvironment[];
	readonly auth: WSO2CloudAuthenticationProvider;
	readonly apiKeys = new ApiKeys();
	readonly injected: boolean;
	private current: RegionClients;
	private readonly configured: CloudEnvironment;
	private readonly logger: Logger;
	private readonly fetchImpl: FetchLike;
	private readonly store: SessionStore;
	private readonly environmentEmitter = new vscode.EventEmitter<CloudEnvironment>();
	readonly onDidChangeEnvironment = this.environmentEmitter.event;
	private readonly sessionListeners = new Set<(event: SessionChangeEvent) => void>();
	private stopForwarding: () => void = () => undefined;
	/** The region a switch is moving to, so a second one waits for it. */
	private switching: Promise<void> = Promise.resolve();
	private disposed = false;

	constructor(private readonly options: PlatformClientsOptions) {
		this.logger = options.logger ?? silentLogger;
		this.fetchImpl = options.fetch ?? defaultFetch;
		this.store = new SecretStorageSessionStore(options.context.secrets);
		this.injected = !options.tokenSource && hasInjectedToken();
		this.configured =
			options.environment ?? (this.injected ? injectedTokenEnvironment(this.logger) : undefined) ?? readEnvironmentOrFallback(this.logger);
		// An environment handed in, a token the editor was started with, or one chosen by a variable or
		// pointed elsewhere by an override is used as it is: another region would leave those behind.
		const pinned = !!options.environment || !!options.tokenSource || this.injected || isCloudEnvironmentPinned();
		this.regions = pinned ? [this.configured] : regionsOf(this.configured.name).map((name) => ENVIRONMENTS[name]);
		const saved = this.savedRegion();
		this.current = this.buildRegion(this.regions.find((region) => region.name === saved) ?? this.configured);
		this.forwardSessionEvents();

		this.auth = new WSO2CloudAuthenticationProvider({ ...this.providerRegion(this.current), apiKeys: this.apiKeys, logger: this.logger });
		this.auth.register(options.context);
	}

	get environment(): CloudEnvironment {
		return this.current.environment;
	}

	get sessions(): SessionManager {
		return this.current.sessions;
	}

	get tokenSource(): TokenSource {
		return this.current.tokenSource;
	}

	get cloud(): CloudClient {
		return this.current.cloud;
	}

	get login(): LoginFlow | undefined {
		return this.current.login;
	}

	get uriReceiver(): UriCallbackReceiver | undefined {
		return this.current.uriReceiver;
	}

	onDidChangeSession(listener: (event: SessionChangeEvent) => void): () => void {
		this.sessionListeners.add(listener);
		return () => this.sessionListeners.delete(listener);
	}

	switchEnvironment(name: CloudEnvName): Promise<void> {
		const run = this.switching.then(() => this.switchNow(name));
		this.switching = run.catch(() => undefined);
		return run;
	}

	private async switchNow(name: CloudEnvName): Promise<void> {
		if (this.disposed) {
			throw new BadRequestError("Choreo Cloud cannot switch regions after the extension was disposed.");
		}
		if (name === this.current.environment.name) {
			return;
		}
		const target = this.regions.find((region) => region.name === name);
		if (!target) {
			throw new BadRequestError(
				`Choreo Cloud cannot switch from ${this.current.environment.name} to ${name} here; the regions on offer are ${this.regions.map((region) => region.name).join(", ")}.`,
			);
		}
		const previous = this.current;
		previous.login?.cancel();
		// The clients, the provider and the key move together, before anything is awaited: no moment
		// has the new region's clients beside the old region's provider or a key still valid for it.
		this.current = this.buildRegion(target);
		this.forwardSessionEvents();
		const reported = this.auth.useRegion(this.providerRegion(this.current));
		disposeRegion(previous);
		this.logger.info(`Switched Choreo Cloud to ${target.name} (${target.apiBaseUrl})`);
		// Before the provider reports the change of session, which waits for the new region's session to be read.
		this.environmentEmitter.fire(target);
		await reported;
		if (!this.disposed) {
			await this.saveRegion(target.name);
		}
	}

	/** Builds a region's sessions, token source, login and API client. */
	private buildRegion(environment: CloudEnvironment): RegionClients {
		const { options, logger } = this;
		const sessions = new SessionManager({ env: environment, store: this.store, fetch: this.fetchImpl, logger });
		let login: LoginFlow | undefined;
		let uriReceiver: UriCallbackReceiver | undefined;
		let tokenSource: TokenSource;
		let loginUnavailable: string | undefined;
		if (options.tokenSource) {
			tokenSource = options.tokenSource;
		} else if (this.injected) {
			// Only for the environment that issued it: a configuration that cannot be used falls back to
			// another environment, and the editor's token must not follow it there.
			tokenSource = new InjectedTokenSource({ issuer: environment.issuer });
		} else {
			let chosen: ChosenReceivers | undefined;
			try {
				chosen = chooseReceivers({ extensionId: options.extensionId, productName: options.productName });
			} catch (error) {
				// Sign-in is what this editor lacks, not the rest of the extension; a stored session still works.
				loginUnavailable = errorMessage(error);
				logger.warn(`Choreo Cloud sign-in is not available in this editor: ${loginUnavailable}`);
			}
			uriReceiver = chosen?.uriReceiver;
			login = chosen
				? new LoginFlow({
						env: environment,
						fetch: this.fetchImpl,
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
			fetch: this.fetchImpl,
			userAgent: options.userAgent,
			logger,
			onUnauthenticated: (error) => {
				// The host signs out of the region in use: a request of a region left must not end that session.
				if (this.current === region && !this.disposed) {
					options.onUnauthenticated?.(error);
				}
			},
		});
		const region: RegionClients = { environment, sessions, tokenSource, cloud, login, uriReceiver, loginUnavailable };
		return region;
	}

	/** What the authentication provider needs of a region. */
	private providerRegion(region: RegionClients): AuthProviderRegion {
		const { login, cloud } = region;
		return {
			env: region.environment,
			sessions: region.sessions,
			tokenSource: region.tokenSource,
			startLogin: login ? (runOptions) => login.run(runOptions) : undefined,
			cancelLogin: login ? () => login.cancel() : undefined,
			loginUnavailable: region.loginUnavailable,
			resolveOrg: async (session: StoredSession) => {
				const org = await cloud.orgs.current();
				return { ...session.org, uuid: org?.uuid, numericId: org?.numericId };
			},
		};
	}

	/** Passes the current region's session changes on to {@link onDidChangeSession}'s listeners. */
	private forwardSessionEvents(): void {
		this.stopForwarding();
		this.stopForwarding = this.current.sessions.onDidChange((event) => {
			for (const listener of [...this.sessionListeners]) {
				listener(event);
			}
		});
	}

	/** The region last switched to, when it was chosen under the environment the settings name now. */
	private savedRegion(): CloudEnvName | undefined {
		const saved = this.options.context.globalState?.get<SavedRegion>(CLOUD_REGION_STATE_KEY);
		return saved?.configured === this.configured.name ? saved.chosen : undefined;
	}

	private async saveRegion(chosen: CloudEnvName): Promise<void> {
		const saved: SavedRegion = { configured: this.configured.name, chosen };
		try {
			await this.options.context.globalState?.update(CLOUD_REGION_STATE_KEY, saved);
		} catch (error) {
			this.logger.warn(`The Choreo Cloud region could not be remembered: ${errorMessage(error)}`);
		}
	}

	dispose(): void {
		this.disposed = true;
		this.stopForwarding();
		this.sessionListeners.clear();
		this.environmentEmitter.dispose();
		disposeRegion(this.current);
	}
}

function disposeRegion(region: RegionClients): void {
	region.sessions.dispose();
	region.uriReceiver?.dispose();
	region.login?.cancel();
}

/**
 * The environment whose identity provider issued the token the editor was
 * started with: the one that token can be used in. The cloud editor names no
 * environment of its own, so without this a Europe or staging editor would
 * take the configured one (production in the United States, by default) and
 * send its token there. Overrides (URLs, client id) still apply. Undefined
 * when the issuer is not a built-in environment's.
 */
function injectedTokenEnvironment(logger: Logger): CloudEnvironment | undefined {
	const token = readInjectedToken();
	const issuer = token ? decodeJwtPayload(token)?.iss : undefined;
	const issued = typeof issuer === "string" ? environmentIssuedBy(issuer) : undefined;
	if (!issued) {
		return undefined;
	}
	const named = readCloudEnvName();
	if (named !== issued.name) {
		logger.info(`The editor's Choreo Cloud token was issued in ${issued.name}; using ${issued.name}, not ${named}.`);
	}
	try {
		return readCloudEnvironment({ ...process.env, [CLOUD_ENV_VARS[0]]: issued.name });
	} catch (error) {
		// As for a configured environment: an override that cannot be used is said, not dropped in silence.
		const message = `The Choreo Cloud settings cannot be used (${errorMessage(error)}); using the ${issued.name} environment without overrides instead.`;
		logger.warn(message);
		void Promise.resolve(vscode.window.showWarningMessage(message)).catch(() => undefined);
		return issued;
	}
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
		const message = `The Choreo Cloud settings cannot be used (${errorMessage(error)}); using the ${fallback.name} environment without overrides instead.`;
		logger.warn(message);
		void Promise.resolve(vscode.window.showWarningMessage(message)).catch(() => undefined);
		return fallback;
	}
}
