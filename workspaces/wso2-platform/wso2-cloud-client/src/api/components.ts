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

import { BadRequestError, NotFoundError } from "../errors";
import type { HttpClient } from "./http";
import { segment } from "./path";
import { projectPath } from "./projects";
import type { Schemas } from "./schema";
import { itemsOf } from "./schema";

export type Component = Schemas["Component"];
export type ComponentDetail = Schemas["ComponentDetail"];
export type CreatedComponent = Schemas["CreatedComponent"];
export type ComponentRepository = Schemas["ComponentRepository"];
export type CreateComponentRequest = Schemas["CreateComponentRequest"];
export type UpdateComponentRequest = Schemas["UpdateComponentRequest"];
export type ComponentWorkflowSpec = Schemas["ComponentWorkflowSpec"];
export type GitHubAppSource = Schemas["GitHubAppSource"];
export type AzureDevOpsSource = Schemas["AzureDevOpsSource"];
export type ComponentNameAvailability = Schemas["ComponentNameAvailability"];
export type UpdateBuildpackConfigRequest = Schemas["UpdateBuildpackConfigRequest"];
export type DeploymentTrack = Schemas["DeploymentTrack"];
export type CommitModel = Schemas["CommitModel"];
export type ComponentType = NonNullable<Component["componentType"]>;

/**
 * What an integration is, in the words the platform's own create tool and
 * the CLI use, mapped to the platform integration type that creates it.
 */
export const INTEGRATION_TYPES = {
	"integration-as-api": "deployment/integration-as-api",
	automation: "cronjob/scheduled-task",
	"event-integration": "deployment/event-integration",
	"file-integration": "deployment/file-integration",
	"mcp-server": "deployment/mcp-server",
	"ai-agent": "proxy/agent-api",
} as const;

export type IntegrationType = keyof typeof INTEGRATION_TYPES;

/** What an integration's source is built with, mapped to the build workflow. */
export const INTEGRATION_RUNTIMES = {
	"wso2-integrator": "ballerina-buildpack-builder",
	"wso2-integrator-mi": "mi-buildpack-builder",
	dockerfile: "dockerfile-builder",
} as const;

export type IntegrationRuntime = keyof typeof INTEGRATION_RUNTIMES;

/** The `componentType` the API reports, back in the words create takes. */
export const REPORTED_TYPES: Record<ComponentType, IntegrationType | "proxy"> = {
	service: "integration-as-api",
	automation: "automation",
	eventIntegration: "event-integration",
	fileIntegration: "file-integration",
	mcpServer: "mcp-server",
	aiAgent: "ai-agent",
	proxy: "proxy",
};

/** The integration type a component's platform type stands for; `proxy` for an API proxy, undefined for a type the extensions do not show. */
export function integrationTypeOf(component: Pick<Component, "componentType">): IntegrationType | "proxy" | undefined {
	return component.componentType ? ownValue(REPORTED_TYPES, component.componentType) : undefined;
}

/** The `buildpackType` the API reports, back in the words create takes. */
export function integrationRuntimeOf(
	component: Pick<Component, "buildpackType" | "isPrebuilt">,
): IntegrationRuntime | "prebuilt" | "other" | undefined {
	switch (component.buildpackType) {
		case "BI":
			return "wso2-integrator";
		case "MI":
			return "wso2-integrator-mi";
		case "other":
			return "other";
		default:
			return component.isPrebuilt ? "prebuilt" : undefined;
	}
}

/** What the platform accepts as a resource name: lowercase letters, digits and hyphens, at most 63 characters. */
export const RESOURCE_NAME = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export interface CreateIntegrationInput {
	projectName: string;
	name: string;
	type: IntegrationType;
	runtime: IntegrationRuntime;
	repo: { url: string; branch: string; appPath?: string };
	displayName?: string;
	description?: string;
	/** Deploy to the pipeline's first environment after every successful build. */
	autoDeploy?: boolean;
	/** For a private GitHub repository, the app installation that may read it. */
	githubApp?: GitHubAppSource;
	azureDevOps?: AzureDevOpsSource;
}

/** The repository as a workflow names it; `appPath` only when there is one. */
export function repositorySpec(repo: { url: string; branch: string; appPath?: string }): Schemas["WorkflowRepository"] {
	const repository: Schemas["WorkflowRepository"] = { url: repo.url, revision: { branch: repo.branch } };
	if (repo.appPath) {
		repository.appPath = repo.appPath;
	}
	return repository;
}

/** Only the table's own keys count: an input such as `"toString"` must not find `Object.prototype`. */
function ownValue<V>(table: Record<string, V>, key: string): V | undefined {
	return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

/** The platform's component type for an integration type; a `BadRequestError` for anything else. */
export function componentTypeFor(type: string): string {
	const componentType = ownValue(INTEGRATION_TYPES as Record<string, string>, type);
	if (!componentType) {
		throw new BadRequestError(`${type} is not an integration type. Use one of ${Object.keys(INTEGRATION_TYPES).join(", ")}.`);
	}
	return componentType;
}

/** The platform's build workflow for a runtime; a `BadRequestError` for anything else. */
export function workflowNameFor(runtime: string): string {
	const workflow = ownValue(INTEGRATION_RUNTIMES as Record<string, string>, runtime);
	if (!workflow) {
		throw new BadRequestError(`${runtime} is not a runtime. Use one of ${Object.keys(INTEGRATION_RUNTIMES).join(", ")}.`);
	}
	return workflow;
}

/**
 * Builds the body `POST /components` takes, exactly as the platform's own
 * create tool and the CLI send it. `autoBuild` is always set: it starts the
 * first build, without which a new integration has nothing to deploy.
 */
export function buildCreateComponentRequest(input: CreateIntegrationInput): CreateComponentRequest {
	if (!RESOURCE_NAME.test(input.name)) {
		throw new BadRequestError(`${input.name} is not a name the platform accepts: use lowercase letters, digits and hyphens, at most 63 characters.`);
	}
	const componentType = componentTypeFor(input.type);
	const workflow = workflowNameFor(input.runtime);
	if (!input.repo.url.startsWith("https://")) {
		throw new BadRequestError(`${input.repo.url} is not an https clone URL.`);
	}
	const annotations: Record<string, string> = {};
	if (input.displayName) {
		annotations["openchoreo.dev/display-name"] = input.displayName;
	}
	if (input.description) {
		annotations["openchoreo.dev/description"] = input.description;
	}
	const repository = repositorySpec(input.repo);
	const request: CreateComponentRequest = {
		metadata: { name: input.name, annotations },
		spec: {
			owner: { projectName: input.projectName },
			componentType: { name: componentType },
			autoBuild: true,
			autoDeploy: input.autoDeploy ?? false,
			workflow: { kind: "ClusterWorkflow", name: workflow, parameters: { repository } },
		},
	};
	if (input.githubApp) {
		request.githubApp = input.githubApp;
	}
	if (input.azureDevOps) {
		request.azureDevOps = input.azureDevOps;
	}
	return request;
}

/** The API path of a component, its name encoded. */
export function componentPath(name: string): string {
	return `/components/${segment(name)}`;
}

/**
 * Finds the integration `ref` names in a listing: by id first, since only ids
 * are unique, then by display name, refusing a display name more than one
 * carries.
 */
export function findComponent(components: Component[], ref: string): Component {
	const byId = components.find((c) => c.id === ref || c.handler === ref);
	if (byId) {
		return byId;
	}
	const named = components.filter((c) => c.name === ref || c.displayName === ref);
	if (named.length === 1) {
		return named[0];
	}
	if (named.length === 0) {
		throw new NotFoundError(`No integration has the id or name ${ref}.`, { reason: "component_unknown" });
	}
	throw new BadRequestError(`More than one integration is named ${ref}: ${named.map((c) => c.id).join(", ")}. Name it by its id.`);
}

export class ComponentsApi {
	constructor(private readonly http: HttpClient) {}

	/**
	 * `GET /projects/{projectName}/components`: at most 100 per project, no
	 * continuation cursor. There is no organization-wide listing.
	 * Items carry no repository; see {@link repository}.
	 */
	async list(projectName: string): Promise<Component[]> {
		const listing = await this.http.get<Schemas["ComponentList"]>(`${projectPath(projectName)}/components`);
		return itemsOf(listing).map((c) => (c.projectId ? c : { ...c, projectId: projectName }));
	}

	/** `GET /projects/{projectName}/components/{componentName}`. */
	async get(projectName: string, name: string): Promise<ComponentDetail> {
		return this.http.get<ComponentDetail>(`${projectPath(projectName)}/components/${segment(name)}`);
	}

	/** Lists, then picks the one `ref` names by id or display name. */
	async find(ref: string, projectName: string): Promise<Component> {
		return findComponent(await this.list(projectName), ref);
	}

	/**
	 * `GET /components/{componentName}/repository`. The platform answers a 500
	 * for an integration with no repository (one created prebuilt, or from an
	 * existing API), which is reported as not found.
	 */
	async repository(name: string, projectName?: string): Promise<ComponentRepository> {
		return this.http.get<ComponentRepository>(`${componentPath(name)}/repository`, {
			query: { projectName },
			mapStatus: (status, body) =>
				status === 500
					? new NotFoundError(`${name} has no source repository: ${body.message ?? body.error ?? "the platform answered 500"}`, {
							status,
							reason: "repository_missing",
						})
					: undefined,
		});
	}

	/**
	 * `POST /projects/{projectName}/components`. Names are unique across the
	 * organization and a taken one is suffixed rather than refused, so the
	 * caller acts on the returned `id`.
	 */
	async create(input: CreateIntegrationInput): Promise<CreatedComponent> {
		return this.createRaw(input.projectName, buildCreateComponentRequest(input));
	}

	/**
	 * `POST /projects/{projectName}/components` with a request built elsewhere.
	 * A sparse or empty answer is completed from the request, since the
	 * component exists by then either way.
	 */
	async createRaw(projectName: string, request: CreateComponentRequest): Promise<CreatedComponent> {
		const created = await this.http.post<CreatedComponent | undefined>(`${projectPath(projectName)}/components`, request);
		return {
			...(created as CreatedComponent),
			id: created?.id || request.metadata.name,
			handler: created?.handler || created?.id || request.metadata.name,
			projectId: created?.projectId || projectName,
		};
	}

	/** `PUT /components/{componentName}`. */
	async update(name: string, request: UpdateComponentRequest, projectName?: string): Promise<Component> {
		return this.http.put<Component>(componentPath(name), request, { query: { projectName } });
	}

	/** `DELETE /components/{componentName}?projectName=`: accepted; lists as `deleting` until gone. */
	async delete(name: string, projectName?: string): Promise<void> {
		return this.http.delete(componentPath(name), { query: { projectName } });
	}

	/** `GET /projects/{projectName}/components/name-availability?candidate=`. */
	async checkName(projectName: string, candidate: string): Promise<ComponentNameAvailability> {
		return this.http.get<ComponentNameAvailability>(`${projectPath(projectName)}/components/name-availability`, { query: { candidate } });
	}

	/**
	 * `PUT /components/{componentName}/build-parameters`: points the build at
	 * another repository, branch or path. Whether it also turns a prebuilt
	 * integration into a source-built one is for the platform to confirm.
	 */
	async updateBuildParameters(name: string, workflow: ComponentWorkflowSpec, projectName?: string): Promise<Schemas["ComponentModel"]> {
		return this.http.put<Schemas["ComponentModel"]>(`${componentPath(name)}/build-parameters`, { workflow }, { query: { projectName } });
	}

	/** Builds the workflow `updateBuildParameters` takes for a runtime and repository. */
	workflowFor(runtime: IntegrationRuntime, repo: { url: string; branch: string; appPath?: string }): ComponentWorkflowSpec {
		return { kind: "ClusterWorkflow", name: workflowNameFor(runtime), parameters: { repository: repositorySpec(repo) } };
	}

	/** `PUT /components/{componentName}/buildpack-config`. */
	async updateBuildpackConfig(name: string, request: UpdateBuildpackConfigRequest, projectName?: string): Promise<void> {
		return this.http.put(`${componentPath(name)}/buildpack-config`, request, { query: { projectName } });
	}

	/** `PATCH /components/{componentName}/auto-build`. */
	async setAutoBuild(name: string, enabled: boolean, projectName?: string): Promise<void> {
		return this.http.patch(`${componentPath(name)}/auto-build`, { autoBuildEnabled: enabled }, { query: { projectName } });
	}

	/** `PATCH /components/{componentName}/auto-deploy`. */
	async setAutoDeploy(name: string, enabled: boolean, projectName?: string): Promise<void> {
		return this.http.patch(`${componentPath(name)}/auto-deploy`, { autoDeployEnabled: enabled }, { query: { projectName } });
	}

	/** `GET /components/{componentName}/commit-history?branch=`: at most 30, empty for non-GitHub sources. */
	async listCommits(name: string, branch?: string, projectName?: string): Promise<CommitModel[]> {
		const listing = await this.http.get<Schemas["CommitList"]>(`${componentPath(name)}/commit-history`, { query: { branch, projectName } });
		return itemsOf(listing);
	}

	/** `GET /components/{componentName}/deployment-tracks`. */
	async listTracks(name: string, projectName?: string): Promise<DeploymentTrack[]> {
		const listing = await this.http.get<Schemas["DeploymentTrackList"]>(`${componentPath(name)}/deployment-tracks`, { query: { projectName } });
		return itemsOf(listing);
	}

	/** `GET /components/{componentName}/deployment-track`: the default track. */
	async getDefaultTrack(name: string, projectName?: string): Promise<DeploymentTrack> {
		return this.http.get<DeploymentTrack>(`${componentPath(name)}/deployment-track`, { query: { projectName } });
	}
}
