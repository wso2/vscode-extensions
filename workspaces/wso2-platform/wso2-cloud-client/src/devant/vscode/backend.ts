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
import { segment } from "../../api/path";
import { SessionManager } from "../../auth/session-manager";
import { BrowserLoginTokenSource } from "../../auth/sources";
import type { CloudEnvName, CloudEnvironment } from "../../config/environments";
import { LoginError, errorMessage } from "../../errors";
import type { PlatformBackend, PlatformBackendHost, PlatformBundle } from "../../vscode/platform";
import { SecretStorageSessionStore } from "../../vscode/secret-session-store";
import { DevantApiClient } from "../api/client";
import { DevantHttp } from "../api/http";
import { DevantLogin, switchOrganization } from "../auth/login";
import type { DevantOrganization, DevantStoredSession } from "../auth/session";
import { devantRefresher, isDevantSession } from "../auth/session";
import type { DevantDeployment, DevantRegion } from "../environments";
import { DEVANT_LABEL, asCloudEnvironment, devantDeployment } from "../environments";
import { DevantUriReceiver } from "./uri-receiver";

export const DEVANT_PLATFORM = "devant";
export { DEVANT_LABEL };
/** Where the region last signed in to is kept, so the next sign-in starts on its console. */
export const DEVANT_REGION_STATE_KEY = "wso2-cloud.devant.region";
/** The namespace Devant's sessions are stored under, apart from Choreo Cloud's. */
export const DEVANT_SESSION_NAMESPACE = "devant";

/** What a host reaches Devant through beyond the shared pieces, as `backendClient("devant")` answers it. */
export interface DevantClient {
	/** Devant's API, with the Choreo CLI editor client's methods, on the session in use. */
	readonly api: DevantApiClient;
	readonly deployments: Readonly<Record<DevantRegion, DevantDeployment>>;
	/** The region in use: the session's, else the one last signed in to. */
	readonly region: DevantRegion;
	deployment(): DevantDeployment;
	session(): Promise<DevantStoredSession | undefined>;
	/** The organizations the person signed in can switch to; none when signed out. */
	organizations(): Promise<DevantOrganization[]>;
	/** Moves the session to another of the person's organizations, with no browser. */
	selectOrganization(handle: string): Promise<DevantStoredSession>;
}

export interface DevantBackendOptions {
	/** The deployment to reach, as the host's configuration names it; `prod-eu` is the same deployment as `prod`. */
	deployment?: CloudEnvName;
	env?: NodeJS.ProcessEnv;
	/** For tests: the time sessions are stamped with. */
	now?: () => Date;
}

/**
 * Devant as a platform the clients can switch to. Undefined when the deployment is not described: development and
 * staging are, only through the file `WSO2_DEVANT_CONFIG` names.
 */
export function devantBackend(options: DevantBackendOptions = {}): PlatformBackend | undefined {
	const name = options.deployment ?? "prod";
	const deployments = devantDeployment(name, options.env);
	if (!deployments) {
		return undefined;
	}
	return {
		name: DEVANT_PLATFORM,
		label: DEVANT_LABEL,
		build: (host) => buildDevant(host, deployments, options.now),
	};
}

function buildDevant(host: PlatformBackendHost, deployments: Readonly<Record<DevantRegion, DevantDeployment>>, now?: () => Date): PlatformBundle {
	const { context, fetch, logger } = host;
	const keyEnvironment: CloudEnvironment = { ...asCloudEnvironment(deployments.US), name: deployments.US.deployment };
	const sessions = new SessionManager({
		env: keyEnvironment,
		store: new SecretStorageSessionStore(context.secrets, DEVANT_SESSION_NAMESPACE),
		fetch,
		logger,
		now,
		refresher: devantRefresher(deployments, fetch),
		serviceName: DEVANT_LABEL,
	});
	const tokenSource = new BrowserLoginTokenSource(sessions);
	const receiver = new DevantUriReceiver(host.extensionId);
	const login = new DevantLogin({
		deployments,
		fetch,
		callback: receiver,
		logger,
		now,
		openBrowser: async (url) => {
			if (!(await vscode.env.openExternal(vscode.Uri.parse(url)))) {
				throw new LoginError("cancelled", "The sign-in page was not opened.");
			}
		},
	});

	const listeners = new Set<(environment: CloudEnvironment) => void>();
	let region: DevantRegion = context.globalState.get<string>(DEVANT_REGION_STATE_KEY) === "EU" ? "EU" : "US";
	let disposed = false;

	const follow = (session: DevantStoredSession | undefined) => {
		if (disposed || !session || session.devant.region === region) {
			return;
		}
		region = session.devant.region;
		void Promise.resolve(context.globalState.update(DEVANT_REGION_STATE_KEY, region)).catch(() => undefined);
		const environment = asCloudEnvironment(deployments[region]);
		for (const listener of listeners) {
			listener(environment);
		}
	};
	const current = async (): Promise<DevantStoredSession | undefined> => {
		const session = await sessions.current();
		return isDevantSession(session) ? session : undefined;
	};
	// Organizations whose region was looked at in this window, or is being looked at; one that failed is tried again.
	const initialized = new Set<string>();
	// The organization the proxies running were started for; they stop when the session leaves it.
	let proxiesFor: string | undefined;
	let settled: Promise<void> = Promise.resolve();
	const refollow = () => {
		settled = current().then(
			(session) => {
				follow(session);
				if (session?.org.handle !== proxiesFor) {
					proxiesFor = session?.org.handle;
					void client.api.stopProxies().catch((error) => logger.warn(`The local proxies did not all stop: ${errorMessage(error)}`));
				}
				if (session && !initialized.has(session.org.handle)) {
					const handle = session.org.handle;
					initialized.add(handle);
					void initOrganization(http, session).catch((error) => {
						initialized.delete(handle);
						logger.debug(`The organization's region was not initialized: ${errorMessage(error)}`);
					});
				}
			},
			(error) => logger.warn(`The session could not be read: ${errorMessage(error)}`),
		);
	};

	const http = new DevantHttp({
		deployment: () => deployments[region],
		ready: () => settled,
		tokenSource,
		fetch,
		logger,
		userAgent: host.userAgent,
		onUnauthenticated: (error) => host.onUnauthenticated(error),
	});
	const client: DevantClient = {
		api: new DevantApiClient(http, async () => (await current())?.devant.organizations ?? [], { fetch, logger }),
		deployments,
		get region() {
			return region;
		},
		deployment: () => deployments[region],
		session: current,
		organizations: async () => (await current())?.devant.organizations ?? [],
		selectOrganization: async (handle) => {
			if (!(await current())) {
				throw new LoginError("provider_error", `Sign in to ${DEVANT_LABEL} before choosing an organization.`);
			}
			// The exchange takes the session's token: refreshed first when it has aged.
			await sessions.getAccessToken();
			const generation = sessions.sessionGeneration;
			const session = await current();
			const org = session?.devant.organizations.find((item) => item.handle === handle);
			if (!session || !org) {
				throw new LoginError("provider_error", `You do not belong to an organization ${handle}.`);
			}
			const next = await switchOrganization(session, org, deployments, fetch, now?.());
			// A sign-out, a sign-in or another switch meanwhile wins: this one is dropped.
			if (disposed || sessions.sessionGeneration !== generation) {
				throw new LoginError("cancelled", "The sign-in changed while the organization was being switched.");
			}
			await sessions.setSession(next);
			return next;
		},
	};
	const stopWatching = sessions.onDidChange(refollow);
	refollow();

	return {
		get environment() {
			return asCloudEnvironment(deployments[region]);
		},
		sessions,
		tokenSource,
		uriReceiver: receiver,
		client,
		providerRegion: () => ({
			env: asCloudEnvironment(deployments[region]),
			sessions,
			tokenSource,
			startLogin: async () => {
				const session = await login.run({ region, organization: (await current().catch(() => undefined))?.org.handle });
				// The region signed in to is known before the session is stored, so the first calls go to its host.
				follow(session);
				return session;
			},
			cancelLogin: () => login.cancel(),
		}),
		cancelLogin: () => login.cancel(),
		onDidChangeEnvironment: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		dispose: () => {
			disposed = true;
			listeners.clear();
			stopWatching();
			login.cancel();
			void client.api.dispose().catch((error) => logger.warn(`Devant's local proxies did not all stop: ${errorMessage(error)}`));
			receiver.dispose();
			sessions.dispose();
		},
	};
}

/**
 * An organization that never deployed has no deployment pipeline until its region is initialized, which the editor
 * does on the organization's first use, as the Choreo CLI did.
 */
async function initOrganization(http: DevantHttp, session: DevantStoredSession): Promise<void> {
	const uuid = session.org.uuid;
	if (!uuid) {
		return;
	}
	const base = `/devops/1.0.0/api/v1/organizations/${segment(uuid)}`;
	const pipelines = await http.rest<{ data?: unknown[] | null } | null>("GET", `${base}/deployment-pipelines`);
	if (pipelines?.data && pipelines.data.length === 0) {
		await http.text("POST", `${base}/projects/init`, { body: { region: session.devant.region } });
	}
}
