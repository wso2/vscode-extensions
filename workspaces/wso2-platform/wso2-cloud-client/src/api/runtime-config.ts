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

/** The API path of a component in one environment. */
function envPath(componentName: string, environmentName: string): string {
	return `${componentPath(componentName)}/environments/${encodeURIComponent(environmentName)}`;
}

/** The API path of one endpoint of a component in one environment. */
function endpointPath(componentName: string, environmentName: string, endpointName: string): string {
	return `${envPath(componentName, environmentName)}/endpoints/${encodeURIComponent(endpointName)}`;
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
		const answer = await this.http.get<Schemas["APIResourcesResponse"]>(
			`${componentPath(componentName)}/releases/${encodeURIComponent(releaseId)}/endpoints`,
			{
				query: { projectName },
			},
		);
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
	createTestKey(componentName: string, environmentName: string, endpointName: string, projectName?: string): Promise<ApiKeyResult> {
		return this.http.post<ApiKeyResult>(`${endpointPath(componentName, environmentName, endpointName)}/test-key`, undefined, {
			query: { projectName },
		});
	}

	/** `POST …/endpoints/{endpointName}/api-keys`. */
	createApiKey(
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
	revokeApiKey(componentName: string, environmentName: string, endpointName: string, keyName: string, projectName?: string): Promise<void> {
		return this.http.delete(`${endpointPath(componentName, environmentName, endpointName)}/api-keys/${encodeURIComponent(keyName)}`, {
			query: { projectName },
		});
	}

	/** `POST …/endpoints/{endpointName}/expose`. */
	expose(componentName: string, environmentName: string, endpointName: string, projectName?: string): Promise<Schemas["EndpointVisibilityResponse"]> {
		return this.http.post<Schemas["EndpointVisibilityResponse"]>(`${endpointPath(componentName, environmentName, endpointName)}/expose`, undefined, {
			query: { projectName },
		});
	}

	/** `PUT …/endpoints/{endpointName}/visibility`. */
	setVisibility(
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
	getSecurity(componentName: string, environmentName: string, endpointName: string, projectName?: string): Promise<Schemas["SecurityConfig"]> {
		return this.http.get<Schemas["SecurityConfig"]>(`${endpointPath(componentName, environmentName, endpointName)}/security`, {
			query: { projectName },
		});
	}

	/** `PUT …/endpoints/{endpointName}/security/api-key`. */
	setApiKeyAuth(
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
	setJwtAuth(
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
	getPolicies(componentName: string, environmentName: string, endpointName: string, projectName?: string): Promise<EndpointPolicyConfig> {
		return this.http.get<EndpointPolicyConfig>(`${endpointPath(componentName, environmentName, endpointName)}/policies`, { query: { projectName } });
	}

	/** `PUT …/endpoints/{endpointName}/policies`. */
	setPolicies(
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
	getEnvGroup(componentName: string, environmentName: string, groupName: string, projectName?: string): Promise<EnvVarGroup> {
		return this.http.get<EnvVarGroup>(`${envPath(componentName, environmentName)}/env-groups/${encodeURIComponent(groupName)}`, {
			query: { projectName },
		});
	}

	/** `PUT …/env-groups/{groupName}`: creates or replaces the group. */
	putEnvGroup(componentName: string, environmentName: string, groupName: string, group: EnvVarGroup, projectName?: string): Promise<void> {
		return this.http.put(`${envPath(componentName, environmentName)}/env-groups/${encodeURIComponent(groupName)}`, group, { query: { projectName } });
	}

	/** `DELETE .../env-groups/{groupName}`. */
	deleteEnvGroup(componentName: string, environmentName: string, groupName: string, projectName?: string): Promise<void> {
		return this.http.delete(`${envPath(componentName, environmentName)}/env-groups/${encodeURIComponent(groupName)}`, { query: { projectName } });
	}

	/** `GET .../files`: the files mounted into the integration in one environment. */
	async listFiles(componentName: string, environmentName: string, projectName?: string): Promise<FileMountItem[]> {
		const listing = await this.http.get<Schemas["FileMountListResponse"]>(`${envPath(componentName, environmentName)}/files`, {
			query: { projectName },
		});
		return listing?.files ?? [];
	}

	/** `GET .../files/{fileName}`. */
	getFile(componentName: string, environmentName: string, fileName: string, projectName?: string): Promise<FileMount> {
		return this.http.get<FileMount>(`${envPath(componentName, environmentName)}/files/${encodeURIComponent(fileName)}`, { query: { projectName } });
	}

	/** `PUT .../files/{fileName}`: creates or replaces a mounted file. */
	putFile(componentName: string, environmentName: string, fileName: string, file: FileMount, projectName?: string): Promise<void> {
		return this.http.put(`${envPath(componentName, environmentName)}/files/${encodeURIComponent(fileName)}`, file, { query: { projectName } });
	}

	/** `DELETE .../files/{fileName}`. */
	deleteFile(componentName: string, environmentName: string, fileName: string, projectName?: string): Promise<void> {
		return this.http.delete(`${envPath(componentName, environmentName)}/files/${encodeURIComponent(fileName)}`, { query: { projectName } });
	}

	/** `GET .../config-schema`: the configurables the integration declares. */
	getConfigSchema(componentName: string, environmentName: string, projectName?: string): Promise<ConfigSchema> {
		return this.http.get<ConfigSchema>(`${envPath(componentName, environmentName)}/config-schema`, { query: { projectName } });
	}

	/** `POST .../config-schema`: saves the values for the integration's configurables. */
	saveConfigSchema(componentName: string, environmentName: string, request: SaveConfigSchemaRequest, projectName?: string): Promise<ConfigSchema> {
		return this.http.post<ConfigSchema>(`${envPath(componentName, environmentName)}/config-schema`, request, { query: { projectName } });
	}
}
