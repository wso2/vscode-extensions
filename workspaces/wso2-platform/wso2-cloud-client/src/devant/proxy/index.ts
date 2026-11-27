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

import type { Environment, StartProxyServerReq, StartProxyServerResp, StopProxyServerReq } from "@wso2/wso2-platform-core";
import type { FetchLike } from "../../api/http";
import { BadRequestError, NotFoundError, TimeoutError } from "../../errors";
import type { Logger } from "../../logger";
import { silentLogger } from "../../logger";
import { getConnections } from "../api/connections";
import type { DevantHttp } from "../api/http";
import { getEnvs, getProjects } from "../api/projects";
import type { DevantOrganization } from "../auth/session";
import type { BridgeOrg } from "./bridge";
import { bridgeApiKey, bridgeRestEndpoint, listProjectComponents, provisionBridge } from "./bridge";
import type { ConnectionEnv } from "./connection-env";
import { addConnectionEnvs } from "./connection-env";
import { LocalProxy } from "./local-proxy";

export type { Bridge, BridgeOrg, ProjectComponent } from "./bridge";
export type { ConnectionEnv, ConnectionEnvTarget } from "./connection-env";
export type { BridgeApiKey, LocalProxyOptions, RequestDetails, ResponseDetails } from "./local-proxy";
export { LocalProxy } from "./local-proxy";

export interface DevantProxiesOptions {
	/** For calls to the bridge component; the global `fetch` when absent. */
	fetch?: FetchLike;
	logger?: Logger;
	/** How often the bridge's deployment is asked about while it comes up. */
	pollIntervalMs?: number;
	/** How long the bridge may take to come up. */
	readyTimeoutMs?: number;
	/** The person's organizations, as the session holds them; Devant's organization list is read when absent. */
	organizations?: () => Promise<readonly DevantOrganization[]>;
}

/**
 * Local proxies through a Devant project's bridge component, so an integration running on this machine reaches the
 * project's services and connections as it would deployed.
 */
export class DevantProxies {
	private readonly servers = new Map<number, LocalProxy>();
	private readonly disposing = new AbortController();
	private readonly logger: Logger;

	constructor(
		private readonly http: DevantHttp,
		private readonly options: DevantProxiesOptions = {},
	) {
		this.logger = options.logger ?? silentLogger;
	}

	/**
	 * Deploys the project's bridge in the environment when needed, starts a proxy to it on 127.0.0.1 and answers its
	 * port with the variables a local run needs: the connections' values, `http_proxy` and `no_proxy`.
	 */
	async start(params: StartProxyServerReq): Promise<StartProxyServerResp> {
		const signal = this.disposing.signal;
		const org = await this.organization(params.orgId);
		const project = (await getProjects(this.http, org.id)).find(
			(item) => item.id === params.project || item.handler === params.project || item.name === params.project,
		);
		if (!project) {
			throw new NotFoundError("failed to find matching project");
		}
		const env = selectEnv(await getEnvs(this.http, { orgId: org.id, orgUuid: org.uuid, projectId: project.id }), params.env);
		const components = await listProjectComponents(this.http, org.handle, project.id);

		const bridge = await provisionBridge(
			this.http,
			{ org, projectId: project.id, env, components },
			{ pollIntervalMs: this.options.pollIntervalMs, readyTimeoutMs: this.options.readyTimeoutMs, signal },
		);
		const restEndpoint = bridgeRestEndpoint(bridge.endpoints, env.id);

		const connectionEnv: ConnectionEnv = { envVars: {}, secureHosts: new Set() };
		const target = { orgId: org.id, projectId: project.id, envTemplateId: env.templateId, skip: params.skipConnection ?? [] };
		const projectConnections = await getConnections(this.http, { orgId: org.id, projectId: project.id, componentId: "" });
		await addConnectionEnvs(this.http, projectConnections, target, connectionEnv, this.logger);
		if (params.component) {
			const component = bridge.components.find(
				(item) => item.id === params.component || item.handler === params.component || item.name === params.component,
			);
			if (component) {
				const componentConnections = await getConnections(this.http, { orgId: org.id, projectId: project.id, componentId: component.id });
				await addConnectionEnvs(this.http, componentConnections, { ...target, componentId: component.id }, connectionEnv, this.logger);
			}
		}

		checkCancelled(signal);
		const proxy = await LocalProxy.start({
			bridgeUrl: restEndpoint.publicUrl,
			apiKeyHeader: this.http.deployment.deployment === "dev" ? "Test-Key" : "Api-Key",
			fetchApiKey: () => bridgeApiKey(this.http, org, restEndpoint, env),
			secureHosts: connectionEnv.secureHosts,
			fetch: this.options.fetch,
			logger: this.logger,
		});
		if (signal.aborted) {
			await proxy.close();
			checkCancelled(signal);
		}
		this.servers.set(proxy.port, proxy);

		return {
			proxyServerPort: proxy.port,
			envVars: { ...connectionEnv.envVars, http_proxy: `http://127.0.0.1:${proxy.port}`, no_proxy: "localhost,127.0.0.1" },
		};
	}

	/** Stops the proxy on `proxyPort`; one this instance did not start is refused. */
	async stop(params: StopProxyServerReq): Promise<void> {
		const proxy = this.servers.get(params.proxyPort);
		if (!proxy) {
			throw new NotFoundError(`no server found running on port ${params.proxyPort}`);
		}
		this.servers.delete(params.proxyPort);
		await proxy.close();
	}

	/** Stops every proxy started and cancels starts in progress. */
	async dispose(): Promise<void> {
		this.disposing.abort();
		const proxies = [...this.servers.values()];
		this.servers.clear();
		await Promise.all(proxies.map((proxy) => proxy.close()));
	}

	/** The ports of the proxies running. */
	ports(): number[] {
		return [...this.servers.keys()];
	}

	private async organization(orgId: string): Promise<BridgeOrg> {
		const organizations = this.options.organizations
			? await this.options.organizations()
			: ((await this.http.rest<DevantOrganization[] | null>("GET", "/orgs/1.0.0/orgs")) ?? []);
		const org = organizations.find((item) => String(item.id) === String(orgId));
		if (!org) {
			throw new NotFoundError(`no organization found with ID ${orgId}`);
		}
		return { id: String(org.id), uuid: org.uuid, handle: org.handle };
	}
}

function checkCancelled(signal: AbortSignal): void {
	if (signal.aborted) {
		throw new TimeoutError("Starting the local proxy was cancelled.", { reason: "cancelled", retryable: false });
	}
}

/** The environment named, or the first non-critical one; a critical environment is refused. */
function selectEnv(envs: readonly Environment[], name: string | undefined): Environment {
	if (!name) {
		const env = envs.find((item) => !item.critical);
		if (!env) {
			throw new NotFoundError("Unable to select a non-critical project env");
		}
		return env;
	}
	const env = envs.find((item) => item.name === name || item.choreoEnv === name);
	if (!env) {
		throw new NotFoundError(`failed to find environment ${name}`);
	}
	if (env.critical) {
		throw new BadRequestError("Cannot connect with critical environments");
	}
	return env;
}
