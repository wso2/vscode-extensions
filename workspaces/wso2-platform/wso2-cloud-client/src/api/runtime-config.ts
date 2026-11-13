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

import { Buffer } from "node:buffer";
import { componentPath } from "./components";
import type { HttpClient } from "./http";
import { segment } from "./path";
import type { Schemas } from "./schema";
import { itemsOf } from "./schema";

export type EndpointResources = Schemas["EndpointResources"];
export type ApiKeyResult = Schemas["APIKeyResult"];
export type CreateApiKeyRequest = Schemas["CreateAPIKeyRequest"];
export type EnvVarGroup = Schemas["EnvVarGroup"];
export type FileMount = Schemas["FileMount"];
export type FileMountItem = Schemas["FileMountItem"];
export type ConfigSchema = Schemas["ConfigSchemaResponse"];
export type SaveConfigSchemaRequest = Schemas["SaveConfigSchemaRequest"];
export type ConfigurationItem = Schemas["ConfigurationItem"];
export type SetEndpointVisibilityRequest = Schemas["SetEndpointVisibilityRequest"];
export type SetApiKeyAuthRequest = Schemas["SetAPIKeyAuthRequest"];
export type SetJwtAuthRequest = Schemas["SetJWTAuthRequest"];
export type EndpointPolicyConfig = Schemas["EndpointPolicyConfig"];

/**
 * One link write: a target of the integration and what fills it. The target
 * is a Ballerina configurable (`<org>/<module>:<name>`), a connection's
 * configurables (`connection`) or an env var (`env`); the source is a
 * resource key (`ref`, `key`) or an endpoint (`endpoint`,
 * `<project>/<component>/<endpoint>`), which fills a configurable, or the env
 * var of an MI integration from another project's endpoint. An endpoint of the
 * integration's own project gives the configurable its address and takes no
 * `key`; an endpoint of another project is reached through a connection the
 * platform makes for the project, and `key` names which of its outputs
 * (`url`, `apiKey`, …) fills the configurable. A write with no source
 * unlinks the target. The platform does not publish these routes in its
 * OpenAPI, so the shapes are written here.
 */
export interface LinkRequest {
	configurable?: string;
	connection?: string;
	env?: string;
	ref?: string;
	key?: string;
	endpoint?: string;
}

/**
 * What a link write did to the integration's Workload: `updated` (auto
 * deploy releases it), `next_deploy` (the next deploy carries it),
 * `unchanged`, or `no_workload` (its first build carries it). Unknown values
 * read as `next_deploy`.
 */
export interface LinkWriteResult {
	workload: string;
}

/** A resource key a link reads: `ref` is a resource, or the project's connection to another project's endpoint. */
export interface LinkKeyRef {
	ref: string;
	key: string;
}

/** A link whose target the integration's build does not declare (yet): `kind` is `configurable`, `connection` or `endpoint`. */
export interface OrphanedLink {
	target: string;
	kind: string;
	/** For `endpoint`, the endpoint (`<project>/<component>/<endpoint>`); otherwise the resource. */
	ref: string;
	key?: string;
}

/** The parts of an integration's links read here. */
export interface IntegrationLinks {
	/** `ballerina` or `mi`. */
	kind: string;
	/** The Workload is from the integration's `workload.yaml`, so links can't be written. */
	sourceDefined: boolean;
	/** Each configurable of the build filled from an endpoint of the integration's own project, to `<project>/<component>/<endpoint>`. */
	endpointLinks?: Record<string, string>;
	/** Each configurable of the build filled from a resource key, a connection to another project's endpoint among them. */
	fieldLinks?: Record<string, LinkKeyRef>;
	/** Links the build has no target for, such as one written before the build that declares its configurable. */
	orphaned?: OrphanedLink[];
}

/**
 * How an integration reaches an endpoint: `project`, directly, for an
 * endpoint of its own project; `organization`, through the gateway with an
 * API key, for one of another project.
 */
export type ConnectableScope = "project" | "organization";

/**
 * Where another project's endpoint is served on the gateway in an environment: `public` on its external
 * host, `organization` on its internal host, `none` not at all. A connection to a Public endpoint gets the
 * external URL, to an Organization one the internal URL.
 */
export type ConnectableExposure = "public" | "organization" | "none";

/** An endpoint an integration may connect to, from `GET /components/{componentName}/connectable-services`. */
export interface ConnectableEndpoint {
	project: string;
	component: string;
	endpoint: string;
	/** The component's display name, or its name when it has none. */
	displayName: string;
	scope: ConnectableScope;
	/** The project's connection to the endpoint, when it has one; a link to the endpoint makes one otherwise. */
	ref?: string;
	/** For `organization` scope: the values a link may take, one per configurable (`url`, `apiKeyHeader`, `apiKey`). */
	outputs?: { name: string; secret: boolean }[];
	/**
	 * One per environment, in deployment pipeline order. `reason` is `endpoint_not_internal`, `not_deployed` or
	 * `upstream_error`. `exposure` is answered for `organization` scope only.
	 */
	environments: { name: string; connectable: boolean; reason?: string; detail?: string; exposure?: ConnectableExposure }[];
}

/** The API path of a component in one environment. */
function envPath(componentName: string, environmentName: string): string {
	return `${componentPath(componentName)}/environments/${segment(environmentName)}`;
}

/** The API path of one endpoint of a component in one environment. */
function endpointPath(componentName: string, environmentName: string, endpointName: string): string {
	return `${envPath(componentName, environmentName)}/endpoints/${segment(endpointName)}`;
}

/** An integration's endpoints in one environment, and how they are exposed. */
export class EndpointsApi {
	constructor(private readonly http: HttpClient) {}

	/**
	 * `GET /components/{componentName}/environments/{environmentName}/endpoints`.
	 * (`GET /components/{componentName}/endpoints` is a documented safe
	 * default that answers nothing; this is the route with the data.)
	 */
	async listForEnvironment(componentName: string, environmentName: string, projectName?: string): Promise<EndpointResources[]> {
		const answer = await this.http.get<Schemas["APIResourcesResponse"]>(`${envPath(componentName, environmentName)}/endpoints`, {
			query: { projectName },
		});
		return answer?.endpoints ?? [];
	}

	/** `GET /components/{componentName}/releases/{releaseId}/endpoints`. */
	async listForRelease(componentName: string, releaseId: string, projectName?: string): Promise<EndpointResources[]> {
		const answer = await this.http.get<Schemas["APIResourcesResponse"]>(`${componentPath(componentName)}/releases/${segment(releaseId)}/endpoints`, {
			query: { projectName },
		});
		return answer?.endpoints ?? [];
	}

	/** The endpoint's OpenAPI document, decoded from `schemaContent`, when it carries one. */
	async getOpenApi(componentName: string, environmentName: string, endpointName: string, projectName?: string): Promise<string | undefined> {
		const endpoints = await this.listForEnvironment(componentName, environmentName, projectName);
		const endpoint = endpoints.find((e) => e.name === endpointName);
		if (!endpoint?.schemaContent) {
			return undefined;
		}
		return decodeSchemaContent(endpoint.schemaContent);
	}

	/** `POST …/endpoints/{endpointName}/test-key`: a one-hour key; also turns api-key auth on. */
	async createTestKey(componentName: string, environmentName: string, endpointName: string, projectName?: string): Promise<ApiKeyResult> {
		return this.http.post<ApiKeyResult>(`${endpointPath(componentName, environmentName, endpointName)}/test-key`, undefined, {
			query: { projectName },
		});
	}

	/** `POST …/endpoints/{endpointName}/api-keys`. */
	async createApiKey(
		componentName: string,
		environmentName: string,
		endpointName: string,
		request: CreateApiKeyRequest,
		projectName?: string,
	): Promise<ApiKeyResult> {
		return this.http.post<ApiKeyResult>(`${endpointPath(componentName, environmentName, endpointName)}/api-keys`, request, {
			query: { projectName },
		});
	}

	/** `GET …/endpoints/{endpointName}/api-keys`. */
	async listApiKeys(componentName: string, environmentName: string, endpointName: string, projectName?: string): Promise<Schemas["APIKeySummary"][]> {
		const listing = await this.http.get<{ items?: Schemas["APIKeySummary"][] } | Schemas["APIKeySummary"][]>(
			`${endpointPath(componentName, environmentName, endpointName)}/api-keys`,
			{ query: { projectName } },
		);
		return itemsOf(listing);
	}

	/** `DELETE …/endpoints/{endpointName}/api-keys/{keyName}`. */
	async revokeApiKey(componentName: string, environmentName: string, endpointName: string, keyName: string, projectName?: string): Promise<void> {
		return this.http.delete(`${endpointPath(componentName, environmentName, endpointName)}/api-keys/${segment(keyName)}`, {
			query: { projectName },
		});
	}

	/** `POST …/endpoints/{endpointName}/expose`. */
	async expose(
		componentName: string,
		environmentName: string,
		endpointName: string,
		projectName?: string,
	): Promise<Schemas["EndpointVisibilityResponse"]> {
		return this.http.post<Schemas["EndpointVisibilityResponse"]>(`${endpointPath(componentName, environmentName, endpointName)}/expose`, undefined, {
			query: { projectName },
		});
	}

	/** `PUT …/endpoints/{endpointName}/visibility`. */
	async setVisibility(
		componentName: string,
		environmentName: string,
		endpointName: string,
		request: SetEndpointVisibilityRequest,
		projectName?: string,
	): Promise<Schemas["EndpointVisibilityResponse"]> {
		return this.http.put<Schemas["EndpointVisibilityResponse"]>(`${endpointPath(componentName, environmentName, endpointName)}/visibility`, request, {
			query: { projectName },
		});
	}

	/** `GET …/endpoints/{endpointName}/security`. */
	async getSecurity(componentName: string, environmentName: string, endpointName: string, projectName?: string): Promise<Schemas["SecurityConfig"]> {
		return this.http.get<Schemas["SecurityConfig"]>(`${endpointPath(componentName, environmentName, endpointName)}/security`, {
			query: { projectName },
		});
	}

	/** `PUT …/endpoints/{endpointName}/security/api-key`. */
	async setApiKeyAuth(
		componentName: string,
		environmentName: string,
		endpointName: string,
		request: SetApiKeyAuthRequest,
		projectName?: string,
	): Promise<Schemas["AuthToggleResponse"]> {
		return this.http.put<Schemas["AuthToggleResponse"]>(`${endpointPath(componentName, environmentName, endpointName)}/security/api-key`, request, {
			query: { projectName },
		});
	}

	/** `PUT …/endpoints/{endpointName}/security/jwt`. */
	async setJwtAuth(
		componentName: string,
		environmentName: string,
		endpointName: string,
		request: SetJwtAuthRequest,
		projectName?: string,
	): Promise<Schemas["AuthToggleResponse"]> {
		return this.http.put<Schemas["AuthToggleResponse"]>(`${endpointPath(componentName, environmentName, endpointName)}/security/jwt`, request, {
			query: { projectName },
		});
	}

	/** `GET …/endpoints/{endpointName}/policies`. */
	async getPolicies(componentName: string, environmentName: string, endpointName: string, projectName?: string): Promise<EndpointPolicyConfig> {
		return this.http.get<EndpointPolicyConfig>(`${endpointPath(componentName, environmentName, endpointName)}/policies`, { query: { projectName } });
	}

	/** `PUT …/endpoints/{endpointName}/policies`. */
	async setPolicies(
		componentName: string,
		environmentName: string,
		endpointName: string,
		request: EndpointPolicyConfig,
		projectName?: string,
	): Promise<EndpointPolicyConfig> {
		return this.http.put<EndpointPolicyConfig>(`${endpointPath(componentName, environmentName, endpointName)}/policies`, request, {
			query: { projectName },
		});
	}
}

/** An endpoint's schema as text: as is when it is already JSON or YAML, decoded from base64 otherwise. */
export function decodeSchemaContent(content: string): string {
	const trimmed = content.trim();
	if (/^[{\[]/.test(trimmed) || /^(openapi|swagger):/m.test(trimmed)) {
		return trimmed;
	}
	return Buffer.from(trimmed, "base64").toString("utf8");
}

/**
 * An integration's configuration in one environment: environment-variable
 * groups, mounted files and the configurable values its build declared.
 * Sensitive values are write-only: a read answers the keys and empty values.
 */
export class RuntimeConfigApi {
	constructor(private readonly http: HttpClient) {}

	/** `GET .../env-groups`: the integration's environment-variable groups in one environment. */
	async listEnvGroups(componentName: string, environmentName: string, projectName?: string): Promise<EnvVarGroup[]> {
		const listing = await this.http.get<Schemas["EnvVarGroupListResponse"]>(`${envPath(componentName, environmentName)}/env-groups`, {
			query: { projectName },
		});
		return listing?.groups ?? [];
	}

	/** `GET .../env-groups/{groupName}`; sensitive values read back empty. */
	async getEnvGroup(componentName: string, environmentName: string, groupName: string, projectName?: string): Promise<EnvVarGroup> {
		return this.http.get<EnvVarGroup>(`${envPath(componentName, environmentName)}/env-groups/${segment(groupName)}`, {
			query: { projectName },
		});
	}

	/** `PUT …/env-groups/{groupName}`: creates or replaces the group. */
	async putEnvGroup(componentName: string, environmentName: string, groupName: string, group: EnvVarGroup, projectName?: string): Promise<void> {
		return this.http.put(`${envPath(componentName, environmentName)}/env-groups/${segment(groupName)}`, group, { query: { projectName } });
	}

	/** `DELETE .../env-groups/{groupName}`. */
	async deleteEnvGroup(componentName: string, environmentName: string, groupName: string, projectName?: string): Promise<void> {
		return this.http.delete(`${envPath(componentName, environmentName)}/env-groups/${segment(groupName)}`, { query: { projectName } });
	}

	/** `GET .../files`: the files mounted into the integration in one environment. */
	async listFiles(componentName: string, environmentName: string, projectName?: string): Promise<FileMountItem[]> {
		const listing = await this.http.get<Schemas["FileMountListResponse"]>(`${envPath(componentName, environmentName)}/files`, {
			query: { projectName },
		});
		return listing?.files ?? [];
	}

	/** `GET .../files/{fileName}`. */
	async getFile(componentName: string, environmentName: string, fileName: string, projectName?: string): Promise<FileMount> {
		return this.http.get<FileMount>(`${envPath(componentName, environmentName)}/files/${segment(fileName)}`, { query: { projectName } });
	}

	/** `PUT .../files/{fileName}`: creates or replaces a mounted file. */
	async putFile(componentName: string, environmentName: string, fileName: string, file: FileMount, projectName?: string): Promise<void> {
		return this.http.put(`${envPath(componentName, environmentName)}/files/${segment(fileName)}`, file, { query: { projectName } });
	}

	/** `DELETE .../files/{fileName}`. */
	async deleteFile(componentName: string, environmentName: string, fileName: string, projectName?: string): Promise<void> {
		return this.http.delete(`${envPath(componentName, environmentName)}/files/${segment(fileName)}`, { query: { projectName } });
	}

	/** `GET /components/{componentName}/links`: what fills the integration's configurables and env vars. */
	async listLinks(componentName: string, projectName?: string): Promise<IntegrationLinks> {
		return this.http.get<IntegrationLinks>(`${componentPath(componentName)}/links`, { query: { projectName } });
	}

	/**
	 * `PUT /components/{componentName}/link`: links one target, or unlinks it.
	 * A configurable linked to an endpoint gets the endpoint's address (or,
	 * for another project's, the connection output `key` names) in every
	 * environment, resolved by the platform; the link applies from the
	 * integration's next deploy of a build that has the configurable.
	 */
	async putLink(componentName: string, link: LinkRequest, projectName?: string): Promise<LinkWriteResult> {
		return this.http.put<LinkWriteResult>(`${componentPath(componentName)}/link`, link, { query: { projectName } });
	}

	/**
	 * `GET /components/{componentName}/connectable-services`: the endpoints of
	 * the organization the integration may connect to, its own left out, with
	 * where each can be connected and, for another project's, where it is
	 * exposed. Another project's endpoint can be connected where it is Public
	 * or Organization. Binding is still checked at deploy. The platform does
	 * not work out the component's project here, so it is named.
	 */
	async listConnectableServices(componentName: string, projectName: string): Promise<ConnectableEndpoint[]> {
		return (
			(await this.http.get<ConnectableEndpoint[] | null>(`${componentPath(componentName)}/connectable-services`, { query: { projectName } })) ?? []
		);
	}

	/** `GET .../config-schema`: the configurables the integration declares. */
	async getConfigSchema(componentName: string, environmentName: string, projectName?: string): Promise<ConfigSchema> {
		return this.http.get<ConfigSchema>(`${envPath(componentName, environmentName)}/config-schema`, { query: { projectName } });
	}

	/** `POST .../config-schema`: saves the values for the integration's configurables. */
	async saveConfigSchema(
		componentName: string,
		environmentName: string,
		request: SaveConfigSchemaRequest,
		projectName?: string,
	): Promise<ConfigSchema> {
		return this.http.post<ConfigSchema>(`${envPath(componentName, environmentName)}/config-schema`, request, { query: { projectName } });
	}
}
