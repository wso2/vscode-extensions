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

import assert from "node:assert/strict";
import { NotFoundError, ServerError } from "../../../src";
import {
	getConnectionGuide,
	getMarketplaceDatabaseItem,
	getMarketplaceDatabases,
	getMarketplaceIdl,
	getMarketplaceItem,
	getMarketplaceItems,
	registerMarketplaceConnection,
} from "../../../src/devant/api/marketplace";
import { rejection } from "../../support";
import { EU } from "../fake-devant";
import { GRAPHQL, devantApi, graphqlRoute } from "./support";

const SERVICES = "GET /marketplace/0.1.0/services";

const BACKEND_SERVICE = {
	serviceId: "svc-1",
	name: "Weather",
	status: "PUBLISHED",
	serviceType: "REST",
	isThirdParty: false,
	component: { componentId: "c1", endpointId: "ep1", apimId: "a1" },
	endpointRefs: {},
	connectionSchemas: [{ id: "s1", name: "Default", isDefault: true, entries: [{ name: "url", type: "string", isSensitive: false }] }],
	visibility: ["ORGANIZATION"],
	properties: { dropped: "yes" },
	resourceDetails: { databaseServerId: "dropped" },
};

describe("Devant marketplace", () => {
	it("lists services with every filter the CLI sent, and the fields its struct kept", async () => {
		const api = devantApi([{ match: SERVICES, body: { count: 1, pagination: { limit: 20, total: 1, offset: 0 }, data: [BACKEND_SERVICE] } }]);
		const list = await getMarketplaceItems(api.http, {
			orgId: "101",
			request: { limit: 20, networkVisibilityFilter: "org", isThirdParty: false, query: null },
		});
		const request = api.fake.last(SERVICES);
		assert.equal(request?.url.host, "apis.choreo.dev");
		assert.equal(request?.headers.authorization, "Bearer devant-token");
		const query = Object.fromEntries(request?.url.searchParams ?? []);
		assert.deepEqual(query, {
			limit: "20",
			offset: "0",
			sortBy: "",
			sortAscending: "false",
			searchContent: "false",
			networkVisibilityFilter: "org",
			isThirdParty: "false",
		});
		assert.equal(list.count, 1);
		assert.deepEqual(list.pagination, { limit: 20, total: 1, offset: 0 });
		const [item] = list.data;
		assert.deepEqual(item.component, { componentId: "c1", endpointId: "ep1", apimId: "a1" });
		assert.equal("endpointRefs" in item, false);
		assert.equal("properties" in item, false);
		assert.equal("resourceDetails" in item, false);
		assert.equal(item.resourceId, "");
		assert.equal(item.averageRating, 0);
		assert.equal(item.tags, null);
		assert.deepEqual(item.connectionSchemas, [
			{
				id: "s1",
				name: "Default",
				description: "",
				isDefault: true,
				entries: [{ name: "url", type: "string", description: "", isSensitive: false, isOptional: false }],
			},
		]);
	});

	it("reads one service from the region in use, its id a single path segment", async () => {
		const api = devantApi([{ match: "GET /marketplace/0.1.0/services/svc%2F1", body: { ...BACKEND_SERVICE, component: null } }], EU);
		const item = await getMarketplaceItem(api.http, { orgId: "101", serviceId: "svc/1" });
		assert.equal(api.fake.last()?.url.host, "apis.eu.choreo.dev");
		assert.equal(item.serviceId, "svc-1");
		assert.equal("component" in item, false);
	});

	it("says an unknown service is not found", async () => {
		const api = devantApi([{ match: "GET /marketplace/0.1.0/services/nope", status: 404, body: { message: "Service not found" } }]);
		assert.ok((await rejection(getMarketplaceItem(api.http, { orgId: "101", serviceId: "nope" }))) instanceof NotFoundError);
	});

	it("reads a service's IDL as text, and refuses content that is not", async () => {
		const api = devantApi([
			{ match: "GET /marketplace/0.1.0/services/svc-1/idl", body: { environmentId: "e1", content: "openapi: 3.0.0", idlType: "OpenAPI", extra: 1 } },
			{ match: "GET /marketplace/0.1.0/services/svc-2/idl", body: { environmentId: "e1", content: { openapi: "3.0.0" } } },
		]);
		assert.deepEqual(await getMarketplaceIdl(api.http, { orgId: "101", serviceId: "svc-1" }), {
			environmentId: "e1",
			content: "openapi: 3.0.0",
			idlType: "OpenAPI",
		});
		assert.ok((await rejection(getMarketplaceIdl(api.http, { orgId: "101", serviceId: "svc-2" }))) instanceof ServerError);
	});

	it("lists databases with the CLI's database fields, which carry no service id", async () => {
		const database = {
			resourceId: "db-1",
			name: "orders",
			serviceId: "dropped",
			resourceDetails: { databaseServerId: "srv-1", databaseType: "postgres", status: "ACTIVE", ca_certificate: "dropped" },
			properties: { engine: "pg" },
		};
		const api = devantApi([
			{ match: "GET /marketplace/0.1.0/databases", body: { count: 1, pagination: { limit: 10, total: 1, offset: 0 }, data: [database] } },
			{ match: "GET /marketplace/0.1.0/databases/db-1", body: database },
		]);
		const list = await getMarketplaceDatabases(api.http, { orgId: "101" });
		const [item] = list.data;
		assert.equal("serviceId" in item, false);
		assert.deepEqual(item.resourceDetails, {
			databaseServerId: "srv-1",
			databaseServerName: "",
			databaseType: "postgres",
			status: "ACTIVE",
			isRestricted: false,
			cloudProvider: "",
			cloudRegion: "",
		});
		assert.deepEqual(item.properties, { engine: "pg" });
		assert.equal(item.connectionSchemas, null);
		const one = await getMarketplaceDatabaseItem(api.http, { orgId: "101", resourceId: "db-1" });
		assert.equal(one.resourceId, "db-1");
		assert.equal(api.fake.last()?.line, "GET /marketplace/0.1.0/databases/db-1");
	});

	it("asks for a connection guide with every field, empty ones too", async () => {
		const route = "GET /marketplace/0.1.0/services/svc-1/connection-schemas/s1/how-to-use";
		const api = devantApi([{ match: route, body: "# Use it\n\nCall `GET /weather`." }]);
		const answer = await getConnectionGuide(api.http, {
			orgId: "101",
			orgUuid: "uuid-acme",
			serviceId: "svc-1",
			configGroupId: "g1",
			connectionSchemaId: "s1",
			audience: "",
			isSpa: true,
			isProjectLvlConnection: false,
			buildpackType: "ballerina",
			connectionName: "weather",
			configFileType: "component_v11",
		});
		assert.equal(answer.guide, "# Use it\n\nCall `GET /weather`.");
		const request = api.fake.last(route);
		assert.deepEqual(Object.fromEntries(request?.url.searchParams ?? []), {
			configGroupId: "g1",
			audience: "",
			orgId: "uuid-acme",
			componentType: "WEB_APP_SPA",
			isProjectLvlConnection: "false",
			configFileType: "component_v11",
			connectionName: "weather",
			buildpackType: "ballerina",
		});
		assert.equal(request?.headers.accept, "application/json, text/plain, */*");
	});

	it("registers a third-party service, configures its schema and marks it a prototype, whatever the status change answers", async () => {
		const api = devantApi([
			{ match: "POST /marketplace/0.1.0/services", status: 201, body: { id: "svc-9", details: "created" } },
			{ match: "GET /marketplace/0.1.0/services/svc-9", body: { ...BACKEND_SERVICE, serviceId: "svc-9", status: "CREATED" } },
			graphqlRoute({ environments: [{ id: "e1", templateId: "t1", critical: false }] }),
			{ match: "POST /marketplace/0.1.0/services/svc-9/connection-schemas/s1/config", status: 201, body: { message: "ok", configs: {} } },
			{ match: "PUT /marketplace/0.1.0/services/svc-9/status", status: 500, body: { message: "status refused" } },
		]);
		const service = await registerMarketplaceConnection(api.http, {
			orgId: "101",
			orgUuid: "uuid-acme",
			projectId: "p1",
			name: "Weather",
			serviceType: "REST",
			idlType: "OpenAPI",
			idlContent: "openapi: 3.0.0",
			schemaEntries: [{ name: "url", type: "string", isSensitive: false }],
			configs: { ep: { name: "ep", environmentTemplateIds: ["t1"], values: [{ key: "url", value: "https://x", isOptional: false }] } },
		});
		assert.equal(service.serviceId, "svc-9");
		assert.equal(service.status, "CREATED");

		assert.deepEqual(api.fake.last("POST /marketplace/0.1.0/services")?.body, {
			name: "Weather",
			version: "v1",
			resourceType: "SERVICE",
			organizationId: "uuid-acme",
			projectId: "p1",
			serviceType: "REST",
			status: "CREATED",
			isThirdParty: true,
			connectionSchemas: [
				{
					name: "Weather - Connection Configuration",
					id: "",
					description: "",
					isDefault: true,
					entries: [{ name: "url", type: "string", description: "", isSensitive: false, isOptional: false }],
				},
			],
			idl: { environmentId: "third-party-service", content: "openapi: 3.0.0", idlType: "OpenAPI" },
			visibility: ["PROJECT"],
		});
		assert.match(api.queries()[0], /environments\(orgUuid: "uuid-acme", projectId: "p1"\)/);
		assert.deepEqual(api.fake.last("POST /marketplace/0.1.0/services/svc-9/connection-schemas/s1/config")?.body, {
			configs: { ep: { environmentTemplateIds: ["t1"], values: [{ key: "url", value: "https://x" }], name: "ep" } },
			message: "",
		});
		assert.equal(api.fake.last("PUT /marketplace/0.1.0/services/svc-9/status")?.url.search, "?status=PROTOTYPE");
		assert.equal(api.fake.calls(GRAPHQL).length, 1);
	});

	it("fails a registration whose service came back with no connection schema", async () => {
		const api = devantApi([
			{ match: "POST /marketplace/0.1.0/services", status: 201, body: { id: "svc-9" } },
			{ match: "GET /marketplace/0.1.0/services/svc-9", body: { serviceId: "svc-9", connectionSchemas: [] } },
			graphqlRoute({ environments: [] }),
		]);
		const error = await rejection(
			registerMarketplaceConnection(api.http, {
				orgId: "101",
				orgUuid: "uuid-acme",
				projectId: "p1",
				name: "Weather",
				serviceType: "REST",
				idlType: "OpenAPI",
				idlContent: "",
				schemaEntries: [],
				configs: {},
			}),
		);
		assert.ok(error instanceof ServerError);
	});
});
