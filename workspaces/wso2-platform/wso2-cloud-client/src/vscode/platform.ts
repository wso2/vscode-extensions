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
import { BadRequestError, LoginError, NotSupportedError, errorMessage } from "../errors";
import type { UnauthenticatedError } from "../errors";
import { decodeJwtPayload } from "../jwt";
import type { Logger } from "../logger";
import { silentLogger } from "../logger";
import { ApiKeys } from "./api-key";
import type { AuthProviderRegion } from "./auth-provider";
import { WSO2CloudAuthenticationProvider } from "./auth-provider";
import { SecretStorageSessionStore } from "./secret-session-store";
import {
	CLOUD_ENV_VARS,
	hasUnusableCloudEditorComponent,
	isCloudEnvironmentPinned,
	readCloudEditorComponent,
	readCloudEnvName,
	readCloudEnvironment,
} from "./settings";
import type { UriCallbackReceiver, UriCallbackSink } from "./uri-callback";
import type { ChosenReceivers } from "./uri-callback";
import { chooseReceivers } from "./uri-callback";

/** The `globalState` key the region the person last switched to is kept under. */
export const CLOUD_REGION_STATE_KEY = "wso2-cloud.region";

/** The `globalState` key the platform the person last switched to is kept under. */
export const CLOUD_PLATFORM_STATE_KEY = "wso2-cloud.platform";

/** The platform these clients serve themselves; any other comes from a {@link PlatformBackend}. */
export const CHOREO_CLOUD_PLATFORM = "choreo-cloud";

/** A platform the clients can switch to, as a person picks it. */
export interface PlatformChoice {
	name: string;
	label: string;
}

/** What a {@link PlatformBackend} is given to build its pieces with. */
export interface PlatformBackendHost {
	readonly context: vscode.ExtensionContext;
	readonly fetch: FetchLike;
	readonly logger: Logger;
	readonly extensionId: string;
	readonly productName?: string;
	readonly userAgent?: string;
	/** Reports the API rejecting the session's token; passed on to the host only while the backend is the one in use. */
	onUnauthenticated(error: UnauthenticatedError): void;
}

/** One build of a {@link PlatformBackend}'s pieces, used until the clients switch away from it. */
export interface PlatformBundle {
	/** The deployment in use; it may change while the bundle is used, as {@link onDidChangeEnvironment} reports. */
	readonly environment: CloudEnvironment;
	readonly sessions: SessionManager;
	readonly tokenSource: TokenSource;
	readonly uriReceiver?: UriCallbackSink;
	/** The platform's own API client, as {@link PlatformClients.backendClient} hands it out. */
	readonly client: unknown;
	/** What the authentication provider serves while the bundle is in use; its `platform` names the backend. */
	providerRegion(): AuthProviderRegion;
	/** Abandons a sign-in waiting for the browser. */
	cancelLogin(): void;
	onDidChangeEnvironment?(listener: (environment: CloudEnvironment) => void): () => void;
	dispose(): void;
}

/** Another platform the clients can serve beside Choreo Cloud, through the same provider and the same key. */
export interface PlatformBackend {
	readonly name: string;
	readonly label: string;
	/** Builds the platform's pieces; called each time the clients switch to it, and the result disposed when they leave. */
	build(host: PlatformBackendHost): PlatformBundle;
}

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
	/** Platforms to offer beside Choreo Cloud. None are offered when an environment, a token source or a token is handed to the editor. */
	backends?: readonly PlatformBackend[];
	/** The platform to start on; the one last switched to when absent, else Choreo Cloud. */
	initialPlatform?: string;
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
	/** The platform in use: {@link CHOREO_CLOUD_PLATFORM} or a backend's name. */
	readonly platform: string;
	/** The platforms {@link switchPlatform} can move between, the current one among them. */
	readonly platforms: readonly PlatformChoice[];
	readonly sessions: SessionManager;
	readonly tokenSource: TokenSource;
	/** Choreo Cloud's API client; a `NotSupportedError` (`platform_mismatch`) while another platform is in use. */
	readonly cloud: CloudClient;
	readonly auth: WSO2CloudAuthenticationProvider;
	/** The key the provider's sessions carry; the host's exported API answers only to it. */
	readonly apiKeys: ApiKeys;
	/** Set when sign-in happens in the browser; absent in a cloud editor started with a token. */
	readonly login?: LoginFlow;
	/** The URI receiver to feed from the extension's `handleUri`, when the sign-in comes back that way. */
	readonly uriReceiver?: UriCallbackSink;
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
	/**
	 * Moves to another of {@link platforms}, and remembers it for the next start. As with a region, the session kept
	 * for that platform becomes the one in use, the one left stays stored, and the key is replaced.
	 */
	switchPlatform(name: string): Promise<void>;
	/** Fires with the platform's name after a platform switch, before {@link onDidChangeEnvironment} and the provider's report. */
	readonly onDidChangePlatform: vscode.Event<string>;
	/** The API client of the backend `name` names, while that platform is in use; undefined otherwise. */
	backendClient<T>(name: string): T | undefined;
}

/** One region's own pieces: nothing in it is shared with another region. */
interface RegionClients {
	environment: CloudEnvironment;
	sessions: SessionManager;
	tokenSource: TokenSource;
	cloud: CloudClient;
	login?: LoginFlow;
	uriReceiver?: UriCallbackSink;
	loginUnavailable?: string;
}

/** The pieces in use: Choreo Cloud's region, or a backend's bundle. */
interface ActivePlatform {
	readonly name: string;
	readonly environment: CloudEnvironment;
	readonly sessions: SessionManager;
	readonly tokenSource: TokenSource;
	readonly uriReceiver?: UriCallbackSink;
	readonly cloud?: CloudClient;
	readonly login?: LoginFlow;
	readonly client?: unknown;
	/** Set for Choreo Cloud. */
	readonly region?: RegionClients;
	/** Set for a backend. */
	readonly bundle?: PlatformBundle;
	providerRegion(): AuthProviderRegion;
	cancelLogin(): void;
	dispose(): void;
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
	readonly auth: WSO2CloudAuthenticationProvider;
	readonly apiKeys = new ApiKeys();
	readonly injected: boolean;
	readonly platforms: readonly PlatformChoice[];
	private readonly builtinRegions: readonly CloudEnvironment[];
	private readonly backends: readonly PlatformBackend[];
	private active: ActivePlatform;
	private readonly configured: CloudEnvironment;
	private readonly logger: Logger;
	private readonly fetchImpl: FetchLike;
	private readonly store: SessionStore;
	private readonly environmentEmitter = new vscode.EventEmitter<CloudEnvironment>();
	readonly onDidChangeEnvironment = this.environmentEmitter.event;
	private readonly platformEmitter = new vscode.EventEmitter<string>();
	readonly onDidChangePlatform = this.platformEmitter.event;
	private readonly sessionListeners = new Set<(event: SessionChangeEvent) => void>();
	private stopForwarding: () => void = () => undefined;
	/** The region or platform a switch is moving to, so a second one waits for it. */
	private switching: Promise<void> = Promise.resolve();
	private disposed = false;

	constructor(private readonly options: PlatformClientsOptions) {
		this.logger = options.logger ?? silentLogger;
		this.fetchImpl = options.fetch ?? defaultFetch;
		this.store = new SecretStorageSessionStore(options.context.secrets);
		this.injected = !options.tokenSource && hasInjectedToken();
		if (hasUnusableCloudEditorComponent()) {
			this.logger.warn("The editor's own component name is not a component name, so this editor is not named to the platform.");
		}
		this.configured =
			options.environment ?? (this.injected ? injectedTokenEnvironment(this.logger) : undefined) ?? readEnvironmentOrFallback(this.logger);
		// An environment handed in, a token the editor was started with, or one chosen by a variable or
		// pointed elsewhere by an override is used as it is: another region would leave those behind.
		const pinned = !!options.environment || !!options.tokenSource || this.injected || isCloudEnvironmentPinned();
		this.builtinRegions = pinned ? [this.configured] : regionsOf(this.configured.name).map((name) => ENVIRONMENTS[name]);
		// The editor's token, or a source or environment handed in, is Choreo Cloud's: no other platform is offered.
		const platformPinned = !!options.environment || !!options.tokenSource || this.injected;
		this.backends = platformPinned ? [] : (options.backends ?? []).filter((backend) => backend.name !== CHOREO_CLOUD_PLATFORM);
		this.platforms = [{ name: CHOREO_CLOUD_PLATFORM, label: "Choreo Cloud" }, ...this.backends.map(({ name, label }) => ({ name, label }))];

		const initial = this.backendNamed(options.initialPlatform ?? this.savedPlatform());
		this.active = initial ? this.buildBackend(initial) : this.buildBuiltin(this.startingRegion());
		this.forwardSessionEvents();

		this.auth = new WSO2CloudAuthenticationProvider({ ...this.active.providerRegion(), apiKeys: this.apiKeys, logger: this.logger });
		this.auth.register(options.context);
	}

	get environment(): CloudEnvironment {
		return this.active.environment;
	}

	get regions(): readonly CloudEnvironment[] {
		return this.active.region ? this.builtinRegions : [this.active.environment];
	}

	get platform(): string {
		return this.active.name;
	}

	get sessions(): SessionManager {
		return this.active.sessions;
	}

	get tokenSource(): TokenSource {
		return this.active.tokenSource;
	}

	get cloud(): CloudClient {
		if (!this.active.cloud) {
			throw new NotSupportedError(`This is not available on ${this.labelOf(this.active.name)}; it is a Choreo Cloud feature.`, {
				reason: "platform_mismatch",
			});
		}
		return this.active.cloud;
	}

	get login(): LoginFlow | undefined {
		return this.active.login;
	}

	get uriReceiver(): UriCallbackSink | undefined {
		return this.active.uriReceiver;
	}

	backendClient<T>(name: string): T | undefined {
		return this.active.name === name && this.active.bundle ? (this.active.client as T) : undefined;
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

	switchPlatform(name: string): Promise<void> {
		const run = this.switching.then(() => this.switchPlatformNow(name));
		this.switching = run.catch(() => undefined);
		return run;
	}

	private async switchNow(name: CloudEnvName): Promise<void> {
		if (this.disposed) {
			throw new BadRequestError("Choreo Cloud cannot switch regions after the extension was disposed.");
		}
		if (name === this.active.environment.name) {
			return;
		}
		const target = this.regions.find((region) => region.name === name);
		if (!this.active.region || !target) {
			throw new BadRequestError(
				`${this.labelOf(this.active.name)} cannot switch from ${this.active.environment.name} to ${name} here; the regions on offer are ${this.regions.map((region) => region.name).join(", ")}.`,
			);
		}
		const reported = this.activate(this.buildBuiltin(target));
		this.logger.info(`Switched Choreo Cloud to ${target.name} (${target.apiBaseUrl})`);
		// Before the provider reports the change of session, which waits for the new region's session to be read.
		this.environmentEmitter.fire(target);
		await reported;
		if (!this.disposed) {
			await this.saveRegion(target.name);
		}
	}

	private async switchPlatformNow(name: string): Promise<void> {
		if (this.disposed) {
			throw new BadRequestError("The platform cannot be switched after the extension was disposed.");
		}
		if (name === this.active.name) {
			return;
		}
		const backend = this.backendNamed(name);
		if (name !== CHOREO_CLOUD_PLATFORM && !backend) {
			throw new BadRequestError(`${name} cannot be switched to here; the platforms on offer are ${this.platforms.map((p) => p.name).join(", ")}.`);
		}
		const reported = this.activate(backend ? this.buildBackend(backend) : this.buildBuiltin(this.startingRegion()));
		this.logger.info(`Switched to ${this.labelOf(name)} (${this.active.environment.name})`);
		// Before the provider reports the change of session, as for a region.
		this.platformEmitter.fire(name);
		this.environmentEmitter.fire(this.active.environment);
		await reported;
		if (!this.disposed) {
			await this.savePlatform(name);
		}
	}

	/**
	 * Puts `next` in use. The pieces, the provider and the key move together, before anything is awaited: no moment
	 * has the new pieces beside the old provider or a key still valid for it. The promise settles once the provider
	 * has reported the change of session.
	 */
	private activate(next: ActivePlatform): Promise<void> {
		const previous = this.active;
		previous.cancelLogin();
		this.active = next;
		this.forwardSessionEvents();
		const reported = this.auth.useRegion(next.providerRegion());
		previous.dispose();
		return reported;
	}

	/** Choreo Cloud's region in use: the one last switched to, when chosen under the environment the settings name now. */
	private startingRegion(): CloudEnvironment {
		const saved = this.savedRegion();
		return this.builtinRegions.find((region) => region.name === saved) ?? this.configured;
	}

	private backendNamed(name: string | undefined): PlatformBackend | undefined {
		return name ? this.backends.find((backend) => backend.name === name) : undefined;
	}

	private labelOf(name: string): string {
		return this.platforms.find((p) => p.name === name)?.label ?? name;
	}

	/** Choreo Cloud's pieces for `environment`. */
	private buildBuiltin(environment: CloudEnvironment): ActivePlatform {
		const region = this.buildRegion(environment);
		return {
			name: CHOREO_CLOUD_PLATFORM,
			environment: region.environment,
			sessions: region.sessions,
			tokenSource: region.tokenSource,
			uriReceiver: region.uriReceiver,
			cloud: region.cloud,
			login: region.login,
			region,
			providerRegion: () => this.providerRegion(region),
			cancelLogin: () => region.login?.cancel(),
			dispose: () => disposeRegion(region),
		};
	}

	/** A backend's pieces, with its environment changes passed on while it is in use. */
	private buildBackend(backend: PlatformBackend): ActivePlatform {
		// Filled once the backend has built its bundle; a report before then is no report of the bundle in use.
		const built: { bundle?: PlatformBundle } = {};
		const host: PlatformBackendHost = {
			context: this.options.context,
			fetch: this.fetchImpl,
			logger: this.logger,
			extensionId: this.options.extensionId,
			productName: this.options.productName,
			userAgent: this.options.userAgent,
			onUnauthenticated: (error) => {
				if (built.bundle && this.active.bundle === built.bundle && !this.disposed) {
					this.options.onUnauthenticated?.(error);
				}
			},
		};
		const bundle = backend.build(host);
		built.bundle = bundle;
		const stopFollowing = bundle.onDidChangeEnvironment?.((environment) => {
			if (this.active.bundle === bundle && !this.disposed) {
				this.environmentEmitter.fire(environment);
			}
		});
		return {
			name: backend.name,
			get environment() {
				return bundle.environment;
			},
			sessions: bundle.sessions,
			tokenSource: bundle.tokenSource,
			uriReceiver: bundle.uriReceiver,
			client: bundle.client,
			bundle,
			providerRegion: () => ({ ...bundle.providerRegion(), platform: backend.name, platformLabel: backend.label }),
			cancelLogin: () => bundle.cancelLogin(),
			dispose: () => {
				stopFollowing?.();
				bundle.dispose();
			},
		};
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
			cloudEditorComponent: readCloudEditorComponent(),
			logger,
			onUnauthenticated: (error) => {
				// The host signs out of the region in use: a request of a region left must not end that session.
				if (this.active.region === region && !this.disposed) {
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
		this.stopForwarding = this.active.sessions.onDidChange((event) => {
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

	/** The platform last switched to. */
	private savedPlatform(): string | undefined {
		return this.options.context.globalState?.get<string>(CLOUD_PLATFORM_STATE_KEY);
	}

	private async savePlatform(name: string): Promise<void> {
		try {
			await this.options.context.globalState?.update(CLOUD_PLATFORM_STATE_KEY, name);
		} catch (error) {
			this.logger.warn(`The platform could not be remembered: ${errorMessage(error)}`);
		}
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
		this.platformEmitter.dispose();
		this.active.dispose();
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
