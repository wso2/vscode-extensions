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

import type {
	ConnectionDetailed,
	ConnectionListItem,
	CreateComponentConnectionReq,
	CreateDatabaseConnectionReq,
	CreateThirdPartyConnectionReq,
	DeleteConnectionReq,
	GetConnectionItemReq,
	GetConnectionsReq,
	ResolveConnectionSecretsReq,
	ResolveConnectionSecretsResp,
} from "@wso2/wso2-platform-core";
import type { DevantHttp } from "./http";
import { orgNumber } from "./http";
import { getConnectionConfiguration, goBool, goList, goMap, goString, record } from "./marketplace";
import type { Raw } from "./marketplace";
import { getEnvs } from "./projects";

const SERVICE_CONFIGS = "/connections/v1/configurations/service-configs";
const CONFIG_SVC = "/config-svc/v1.0";

function configEntry(value: unknown) {
	const raw = record(value);
	return {
		key: goString(raw.key),
		keyUuid: goString(raw.keyUuid),
		value: goString(raw.value),
		isSensitive: goBool(raw.isSensitive),
		isFile: goBool(raw.isFile),
		valueRef: goString(raw.valueRef),
		envVariableName: goString(raw.envVariableName),
	};
}

function visibility(value: unknown) {
	const raw = record(value);
	return {
		projectUuid: goString(raw.projectUuid),
		organizationUuid: goString(raw.organizationUuid),
		...(goString(raw.componentUuid) ? { componentUuid: raw.componentUuid } : {}),
		...(goString(raw.componentType) ? { componentType: raw.componentType } : {}),
	};
}

/** A connection with the fields of the CLI's `Connection`, which lists and single reads share. */
function connection(value: unknown): ConnectionDetailed {
	const raw = record(value);
	return {
		groupUuid: goString(raw.groupUuid),
		serviceName: goString(raw.serviceName),
		schemaName: goString(raw.schemaName),
		status: raw.status ?? null,
		isPartiallyCreated: goBool(raw.isPartiallyCreated),
		configurations: goMap(raw.configurations, (config) => {
			const entry = record(config);
			return { environmentUuid: goString(entry.environmentUuid), entries: goMap(entry.entries, configEntry) };
		}),
		name: goString(raw.name),
		description: goString(raw.description),
		schemaReference: goString(raw.schemaReference),
		visibilities: goList(raw.visibilities, visibility),
		serviceId: goString(raw.serviceId),
		envMapping: raw.envMapping ?? null,
		componentId: goString(raw.componentId),
		dependentComponentId: goString(raw.dependentComponentId),
		version: goString(raw.version),
		resourceType: goString(raw.resourceType),
	} as unknown as ConnectionDetailed;
}

/** Who may use a new connection: the component when one is given, otherwise the whole project. */
function connectionVisibility(orgUuid: string, projectId: string, componentId: string) {
	return [{ projectUuid: projectId, organizationUuid: orgUuid, ...(componentId ? { componentUuid: componentId } : {}) }];
}

/** A component's connections, or the project's own when no component is given. */
export async function getConnections(http: DevantHttp, params: GetConnectionsReq): Promise<ConnectionListItem[]> {
	const answer = await http.rest<unknown>("GET", `${SERVICE_CONFIGS}/connections`, {
		query: params.componentId ? { projectId: params.projectId, componentId: params.componentId } : { projectId: params.projectId, scope: "PROJECT" },
	});
	return goList(answer, connection) ?? [];
}

export async function getConnectionItem(http: DevantHttp, params: GetConnectionItemReq): Promise<ConnectionDetailed> {
	return connection(await http.rest<unknown>("GET", `${SERVICE_CONFIGS}/connections/${encodeURIComponent(params.connectionGroupId)}`));
}

/** Connects to a Devant service, with credentials for every environment of the project. */
export async function createComponentConnection(http: DevantHttp, params: CreateComponentConnectionReq): Promise<ConnectionDetailed> {
	const orgIdInteger = orgNumber(params.orgId);
	const envs = await getEnvs(http, { orgId: params.orgId, orgUuid: params.orgUuid, projectId: params.projectId });
	const answer = await http.rest<unknown>("POST", `${SERVICE_CONFIGS}/choreo-connections`, {
		query: { generateCreds: params.generateCreds === true },
		body: {
			name: params.name,
			componentType: params.componentType || undefined,
			description: "",
			serviceId: params.serviceId,
			schemaReference: params.serviceSchemaId,
			environments: envs.length > 0 ? envs.map((env) => ({ id: env.templateId ?? "", isCritical: env.critical === true })) : null,
			visibilities: connectionVisibility(params.orgUuid, params.projectId, params.componentId),
			requestingServiceVisibility: params.serviceVisibility,
			orgIdInteger,
		},
	});
	return connection(answer);
}

/**
 * Connects to a third-party service of the marketplace: for each endpoint referred to, every environment its
 * configuration applies to gets that endpoint's keys, with empty values for the person to fill in.
 */
export async function createThirdPartyConnection(http: DevantHttp, params: CreateThirdPartyConnectionReq): Promise<ConnectionDetailed> {
	const envs = await getEnvs(http, { orgId: params.orgId, orgUuid: params.orgUuid, projectId: params.projectId });
	const configs = await getConnectionConfiguration(http, params.serviceId, params.serviceSchemaId);
	const sensitive = new Set(params.sensitiveKeys ?? []);
	const envMapping: Raw = {};
	const configurations: Raw = {};
	for (const endpointName of Object.keys(params.endpointRefs ?? {})) {
		const selected = record(configs[endpointName]);
		const values = Array.isArray(selected.values) ? selected.values.map(record) : [];
		for (const templateId of goList(selected.environmentTemplateIds, goString) ?? []) {
			envMapping[templateId] = { parameterReference: endpointName, resourceId: templateId };
			const entries: Raw = {};
			for (const value of values) {
				const key = goString(value.key);
				entries[key] = { key, value: "", isFile: false, isSensitive: sensitive.has(key) };
			}
			configurations[templateId] = {
				environmentUuid: templateId,
				isCritical: envs.find((env) => env.templateId === templateId)?.critical === true,
				entries,
			};
		}
	}
	const answer = await http.rest<unknown>("POST", `${SERVICE_CONFIGS}/third-party-connections`, {
		query: { wellKnownService: true },
		body: {
			name: params.name,
			componentType: "non-component",
			description: "",
			serviceId: params.serviceId,
			schemaReference: params.serviceSchemaId,
			visibilities: connectionVisibility(params.orgUuid, params.projectId, params.componentId),
			envMapping,
			configurations,
		},
	});
	return connection(answer);
}

/** Connects to a marketplace database, with the database credential each environment uses. */
export async function createDatabaseConnection(http: DevantHttp, params: CreateDatabaseConnectionReq): Promise<ConnectionDetailed> {
	const answer = await http.rest<unknown>("POST", `${SERVICE_CONFIGS}/choreo-database-connections`, {
		body: {
			name: params.name,
			description: "",
			serviceId: params.serviceId,
			schemaReference: params.schemaReference,
			visibilities: [
				{
					componentUuid: params.componentId || undefined,
					organizationUuid: params.orgUuid || undefined,
					projectUuid: params.projectId || undefined,
				},
			],
			envMapping: goMap(params.envMapping, (detail) => {
				const raw = record(detail);
				return { resourceId: goString(raw.resourceId), parameterReference: goString(raw.parameterReference) };
			}),
		},
	});
	return connection(answer);
}

export async function deleteConnection(http: DevantHttp, params: DeleteConnectionReq): Promise<void> {
	await http.text("DELETE", `${SERVICE_CONFIGS}/choreo-connections/${encodeURIComponent(params.connectionId)}`);
}

/** The values behind a connection's secret references, for one environment. The answer carries secrets. */
export async function resolveConnectionSecrets(http: DevantHttp, params: ResolveConnectionSecretsReq): Promise<ResolveConnectionSecretsResp> {
	const answer = record(
		await http.rest<unknown>("POST", `${CONFIG_SVC}/configs/groups/${encodeURIComponent(params.groupId)}/resolve-secrets`, {
			body: {
				projectId: params.projectId,
				componentId: params.componentId,
				envTemplateId: params.envTemplateId,
				secrets: goList(params.secrets, (secret) => {
					const raw = record(secret);
					return { key: goString(raw.key), valueRef: goString(raw.valueRef) };
				}),
			},
		}),
	);
	return {
		secrets: goList(answer.secrets, (secret) => {
			const raw = record(secret);
			return { key: goString(raw.key), valueRef: goString(raw.valueRef), value: goString(raw.value) };
		}),
	} as ResolveConnectionSecretsResp;
}
