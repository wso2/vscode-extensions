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
	GetConnectionGuideReq,
	GetConnectionGuideResp,
	GetDatabaseItemReq,
	GetMarketplaceIdlReq,
	GetMarketplaceItemReq,
	GetMarketplaceListReq,
	MarketplaceDatabaseListResp,
	MarketplaceIdlResp,
	MarketplaceItem,
	MarketplaceListResp,
	RegisterMarketplaceConnectionReq,
} from "@wso2/wso2-platform-core";
import { segment } from "../../api/path";
import { ServerError } from "../../errors";
import { DEVANT_SERVICE } from "./http";
import type { DevantHttp } from "./http";
import { getEnvs } from "./projects";

const MARKETPLACE = "/marketplace/0.1.0";

/** A JSON object as decoded, or an empty one for anything else. */
export type Raw = Record<string, unknown>;

export function record(value: unknown): Raw {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : {};
}

// Go's zero values, for answers the CLI decoded into structs and re-encoded.
export const goString = (value: unknown): string => (typeof value === "string" ? value : "");
export const goNumber = (value: unknown): number => (typeof value === "number" ? value : 0);
export const goBool = (value: unknown): boolean => value === true;

/** A slice: null when absent, as Go encodes a nil one. */
export function goList<T>(value: unknown, item: (entry: unknown) => T): T[] | null {
	return Array.isArray(value) ? value.map(item) : null;
}

/** A map: null when absent, as Go encodes a nil one. */
export function goMap<T>(value: unknown, item: (entry: unknown) => T): Record<string, T> | null {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return Object.fromEntries(Object.entries(value as Raw).map(([key, entry]) => [key, item(entry)]));
}

function schemaEntry(value: unknown) {
	const raw = record(value);
	return {
		name: goString(raw.name),
		type: goString(raw.type),
		description: goString(raw.description),
		isSensitive: goBool(raw.isSensitive),
		isOptional: goBool(raw.isOptional),
	};
}

function connectionSchema(value: unknown) {
	const raw = record(value);
	return {
		id: goString(raw.id),
		name: goString(raw.name),
		description: goString(raw.description),
		isDefault: goBool(raw.isDefault),
		entries: goList(raw.entries, schemaEntry),
	};
}

function pagination(value: unknown) {
	const raw = record(value);
	return { limit: goNumber(raw.limit), total: goNumber(raw.total), offset: goNumber(raw.offset) };
}

/** A marketplace service with the fields, and the omissions, of the CLI's `MarketplaceService`. */
function marketplaceService(value: unknown): MarketplaceItem {
	const raw = record(value);
	const item: Raw = {};
	if (raw.component !== null && typeof raw.component === "object") {
		const component = record(raw.component);
		item.component = {
			componentId: goString(component.componentId),
			endpointId: goString(component.endpointId),
			apimId: goString(component.apimId),
			...(goString(component.endpointName) ? { endpointName: component.endpointName } : {}),
		};
	}
	const endpointRefs = goMap(raw.endpointRefs, goString);
	if (endpointRefs && Object.keys(endpointRefs).length > 0) {
		item.endpointRefs = endpointRefs;
	}
	Object.assign(item, {
		serviceId: goString(raw.serviceId),
		status: goString(raw.status),
		serviceType: goString(raw.serviceType),
		isThirdParty: goBool(raw.isThirdParty),
		connectionSchemas: goList(raw.connectionSchemas, connectionSchema),
		resourceId: goString(raw.resourceId),
		thumbnailUrl: goString(raw.thumbnailUrl),
		averageRating: goNumber(raw.averageRating),
		totalRatingCount: goNumber(raw.totalRatingCount),
		createdTime: goString(raw.createdTime),
		name: goString(raw.name),
		version: goString(raw.version),
		resourceType: goString(raw.resourceType),
		organizationId: goString(raw.organizationId),
		projectId: goString(raw.projectId),
		summary: goString(raw.summary),
		description: goString(raw.description),
		categories: goList(raw.categories, goString),
		visibility: goList(raw.visibility, goString),
		tags: goList(raw.tags, goString),
	});
	if (goString(raw.templateType)) {
		item.templateType = raw.templateType;
	}
	return item as unknown as MarketplaceItem;
}

/** A marketplace database with the fields of the CLI's `DatabaseEntry`; it carries no `serviceId`. */
function databaseEntry(value: unknown): MarketplaceItem {
	const raw = record(value);
	const details = record(raw.resourceDetails);
	return {
		resourceDetails: {
			databaseServerId: goString(details.databaseServerId),
			databaseServerName: goString(details.databaseServerName),
			databaseType: goString(details.databaseType),
			status: goString(details.status),
			isRestricted: goBool(details.isRestricted),
			cloudProvider: goString(details.cloudProvider),
			cloudRegion: goString(details.cloudRegion),
		},
		connectionSchemas: goList(raw.connectionSchemas, connectionSchema),
		thumbnailUrl: goString(raw.thumbnailUrl),
		averageRating: goNumber(raw.averageRating),
		totalRatingCount: goNumber(raw.totalRatingCount),
		createdTime: goString(raw.createdTime),
		name: goString(raw.name),
		version: goString(raw.version),
		resourceType: goString(raw.resourceType),
		organizationId: goString(raw.organizationId),
		summary: goString(raw.summary),
		description: goString(raw.description),
		tags: goList(raw.tags, goString),
		categories: goList(raw.categories, goString),
		visibility: goList(raw.visibility, goString),
		properties: goMap(raw.properties, goString),
		resourceId: goString(raw.resourceId),
	} as unknown as MarketplaceItem;
}

function servicePath(serviceId: string): string {
	return `${MARKETPLACE}/services/${segment(serviceId)}`;
}

/** The marketplace's services. Every non-optional filter is sent, its zero value when absent, as the CLI sent them. */
export async function getMarketplaceItems(http: DevantHttp, params: GetMarketplaceListReq): Promise<MarketplaceListResp> {
	const request = params.request ?? {};
	const answer = record(
		await http.rest<unknown>("GET", `${MARKETPLACE}/services`, {
			query: {
				limit: request.limit ?? 0,
				offset: request.offset ?? 0,
				sortBy: request.sortBy ?? "",
				sortAscending: request.sortAscending ?? false,
				searchContent: request.searchContent ?? false,
				networkVisibilityFilter: request.networkVisibilityFilter ?? "",
				query: request.query ?? undefined,
				tags: request.tags ?? undefined,
				categories: request.categories ?? undefined,
				isThirdParty: request.isThirdParty ?? undefined,
				networkVisibilityprojectId: request.networkVisibilityprojectId ?? undefined,
			},
		}),
	);
	return {
		count: goNumber(answer.count),
		pagination: pagination(answer.pagination),
		data: goList(answer.data, marketplaceService),
	} as MarketplaceListResp;
}

export async function getMarketplaceItem(http: DevantHttp, params: GetMarketplaceItemReq): Promise<MarketplaceItem> {
	return marketplaceService(await http.rest<unknown>("GET", servicePath(params.serviceId)));
}

export async function getMarketplaceIdl(http: DevantHttp, params: GetMarketplaceIdlReq): Promise<MarketplaceIdlResp> {
	const answer = record(await http.rest<unknown>("GET", `${servicePath(params.serviceId)}/idl`));
	const content = answer.content ?? "";
	if (typeof content !== "string") {
		// The CLI decoded the IDL as a string and failed on anything else.
		throw new ServerError(`${DEVANT_SERVICE} answered the IDL of ${params.serviceId} with content that is not text.`);
	}
	return { environmentId: goString(answer.environmentId), content, idlType: goString(answer.idlType) };
}

export async function getMarketplaceDatabases(http: DevantHttp, _params: { orgId: string }): Promise<MarketplaceDatabaseListResp> {
	const answer = record(await http.rest<unknown>("GET", `${MARKETPLACE}/databases`));
	return {
		count: goNumber(answer.count),
		pagination: pagination(answer.pagination),
		data: goList(answer.data, databaseEntry),
	} as MarketplaceDatabaseListResp;
}

export async function getMarketplaceDatabaseItem(http: DevantHttp, params: GetDatabaseItemReq): Promise<MarketplaceItem> {
	return databaseEntry(await http.rest<unknown>("GET", `${MARKETPLACE}/databases/${segment(params.resourceId)}`));
}

/** The per-environment configuration of a service's connection schema. */
export async function getConnectionConfiguration(http: DevantHttp, serviceId: string, schemaId: string): Promise<Raw> {
	const answer = record(await http.rest<unknown>("GET", `${servicePath(serviceId)}/connection-schemas/${segment(schemaId)}/config`));
	return record(answer.configs);
}

/** The developer guide of a connection, in Markdown. */
export async function getConnectionGuide(http: DevantHttp, params: GetConnectionGuideReq): Promise<GetConnectionGuideResp> {
	const guide = await http.text("GET", `${servicePath(params.serviceId)}/connection-schemas/${segment(params.connectionSchemaId)}/how-to-use`, {
		// Every field is sent, empty ones too.
		query: {
			configGroupId: params.configGroupId ?? "",
			audience: params.audience ?? "",
			orgId: params.orgUuid ?? "",
			componentType: params.isSpa ? "WEB_APP_SPA" : "SERVICE",
			isProjectLvlConnection: params.isProjectLvlConnection === true,
			configFileType: params.configFileType ?? "",
			connectionName: params.connectionName ?? "",
			buildpackType: params.buildpackType ?? "",
		},
		headers: { Accept: "application/json, text/plain, */*" },
	});
	return { guide };
}

/**
 * Registers a third-party service in the project's marketplace, sets its connection configuration for each
 * environment and marks it a prototype. Answers the service as read before the status change.
 */
export async function registerMarketplaceConnection(http: DevantHttp, params: RegisterMarketplaceConnectionReq): Promise<MarketplaceItem> {
	const created = record(
		await http.rest<unknown>("POST", `${MARKETPLACE}/services`, {
			body: {
				name: params.name,
				version: "v1",
				resourceType: "SERVICE",
				organizationId: params.orgUuid || undefined,
				projectId: params.projectId || undefined,
				serviceType: params.serviceType || undefined,
				status: "CREATED",
				isThirdParty: true,
				connectionSchemas: [
					{
						name: `${params.name} - Connection Configuration`,
						id: "",
						description: "",
						isDefault: true,
						entries: goList(params.schemaEntries, schemaEntry),
					},
				],
				idl: { environmentId: "third-party-service", content: params.idlContent ?? "", idlType: params.idlType ?? "" },
				visibility: ["PROJECT"],
			},
		}),
	);
	const service = await getMarketplaceItem(http, { orgId: params.orgId, serviceId: goString(created.id) });
	await getEnvs(http, { orgId: params.orgId, orgUuid: params.orgUuid, projectId: params.projectId });
	const schemaId = service.connectionSchemas?.[0]?.id;
	if (schemaId === undefined) {
		throw new ServerError(`${DEVANT_SERVICE} registered ${params.name} with no connection schema to configure.`);
	}
	await http.rest<unknown>("POST", `${servicePath(service.serviceId)}/connection-schemas/${segment(schemaId)}/config`, {
		body: { configs: goMap(params.configs, envConfig), message: "" },
	});
	// A failure here leaves a registered service still in CREATED, which the CLI ignored too.
	await http.rest<unknown>("PUT", `${servicePath(service.serviceId)}/status`, { query: { status: "PROTOTYPE" } }).catch(() => undefined);
	return service;
}

function envConfig(value: unknown) {
	const raw = record(value);
	return {
		environmentTemplateIds: goList(raw.environmentTemplateIds, goString),
		values: goList(raw.values, (entry) => {
			const config = record(entry);
			return { key: goString(config.key), value: goString(config.value), ...(config.isOptional === true ? { isOptional: true } : {}) };
		}),
		name: goString(raw.name),
	};
}
