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

import type { TokenSource } from "../auth/types";
import type { CloudEnvironment } from "../config/environments";
import type { UnauthenticatedError } from "../errors";
import type { Logger } from "../logger";
import { BuildsApi } from "./builds";
import { ComponentsApi } from "./components";
import { DeploymentsApi } from "./deployments";
import { EnvironmentsApi, PipelinesApi } from "./environments";
import type { FetchLike } from "./http";
import { HttpClient } from "./http";
import { ObservabilityApi } from "./logs";
import { OrgsApi } from "./orgs";
import { ApplicationsApi, BallerinaCentralApi, CodeServerApi, DbServersApi, KnowledgeBasesApi } from "./platform-services";
import { ProjectsApi } from "./projects";
import { GitProxyApi, ReposApi } from "./repos";
import { EndpointsApi, RuntimeConfigApi } from "./runtime-config";

export interface CloudClientOptions {
	environment: CloudEnvironment;
	tokenSource: TokenSource;
	fetch?: FetchLike;
	timeoutMs?: number;
	userAgent?: string;
	logger?: Logger;
	onUnauthenticated?: (error: UnauthenticatedError) => void;
}

/**
 * Everything the extensions ask of the platform, one namespace per resource,
 * all sharing one token source and one `fetch`.
 */
export interface CloudClient {
	readonly environment: CloudEnvironment;
	/** The API itself, for a route no namespace covers yet. */
	readonly http: HttpClient;
	readonly orgs: OrgsApi;
	readonly projects: ProjectsApi;
	readonly components: ComponentsApi;
	readonly builds: BuildsApi;
	readonly deployments: DeploymentsApi;
	readonly environments: EnvironmentsApi;
	readonly pipelines: PipelinesApi;
	readonly endpoints: EndpointsApi;
	readonly config: RuntimeConfigApi;
	readonly observability: ObservabilityApi;
	readonly repos: ReposApi;
	readonly git: GitProxyApi;
	readonly dbServers: DbServersApi;
	readonly knowledgeBases: KnowledgeBasesApi;
	readonly applications: ApplicationsApi;
	readonly codeServer: CodeServerApi;
	readonly ballerinaCentral: BallerinaCentralApi;
}

/** Builds the API client for one environment: one HTTP client for the API, one for the observability proxy, and a resource API over each. */
export function createCloudClient(options: CloudClientOptions): CloudClient {
	const { environment, ...rest } = options;
	const http = new HttpClient({ ...rest, baseUrl: environment.apiBaseUrl });
	const observabilityHttp = new HttpClient({ ...rest, baseUrl: environment.observabilityBaseUrl });
	const environments = new EnvironmentsApi(http);
	const pipelines = new PipelinesApi(http);
	const builds = new BuildsApi(http);
	return {
		environment,
		http,
		orgs: new OrgsApi(http),
		projects: new ProjectsApi(http),
		components: new ComponentsApi(http),
		builds,
		deployments: new DeploymentsApi(http, environments, pipelines, builds),
		environments,
		pipelines,
		endpoints: new EndpointsApi(http),
		config: new RuntimeConfigApi(http),
		observability: new ObservabilityApi(observabilityHttp),
		repos: new ReposApi(http),
		git: new GitProxyApi(http),
		dbServers: new DbServersApi(http),
		knowledgeBases: new KnowledgeBasesApi(http),
		applications: new ApplicationsApi(http),
		codeServer: new CodeServerApi(http),
		ballerinaCentral: new BallerinaCentralApi(http),
	};
}
