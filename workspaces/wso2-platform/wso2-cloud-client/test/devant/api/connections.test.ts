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
import { BadRequestError, ServerError } from "../../../src";
import {
	createComponentConnection,
	createDatabaseConnection,
	createThirdPartyConnection,
	deleteConnection,
	getConnectionItem,
	getConnections,
	resolveConnectionSecrets,
} from "../../../src/devant/api/connections";
import { rejection } from "../../support";
import { GRAPHQL, devantApi, graphqlRoute } from "./support";

const CONFIGS = "/connections/v1/configurations/service-configs";

const BACKEND_CONNECTION = {
	groupUuid: "g1",
	name: "weather",
	serviceId: "svc-1",
	status: { dev: [{ stage: "CREATE", result: "OK", success: true }] },
	configurations: {
		t1: { environmentUuid: "t1", extra: 1, entries: { url: { key: "url", value: "https://x", isSensitive: false } } },
	},
	visibilities: [{ projectUuid: "p1", organizationUuid: "uuid-acme", componentUuid: "" }],
	envMapping: { t1: "url" },
	unknownField: "dropped",
};

const ENVIRONMENTS = graphqlRoute({
	environments: [
		{ id: "e1", name: "Development", templateId: "t-dev", critical: false },
		{ id: "e2", name: "Production", templateId: "t-prod", critical: true },
	],
});

describe("Devant connections", () => {
	it("lists the project's own connections, or a component's, with the fields the CLI kept", async () => {
		const route = `GET ${CONFIGS}/connections`;
		const api = devantApi([{ match: route, body: [BACKEND_CONNECTION] }]);
		const [item] = await getConnections(api.http, { orgId: "101", projectId: "p1", componentId: "" });
		assert.equal(api.fake.last(route)?.url.search, "?projectId=p1&scope=PROJECT");
		assert.equal(api.fake.last(route)?.url.host, "apis.choreo.dev");
		assert.equal("unknownField" in item, false);
		assert.equal(item.schemaName, "");
		assert.equal(item.dependentComponentId, "");
		assert.deepEqual(item.status, BACKEND_CONNECTION.status);

		await getConnections(api.http, { orgId: "101", projectId: "p1", componentId: "c1" });
		assert.equal(api.fake.last(route)?.url.search, "?projectId=p1&componentId=c1");

		api.fake.route({ match: route, body: "null" });
		assert.deepEqual(await getConnections(api.http, { orgId: "101", projectId: "p1", componentId: "" }), []);
	});

	it("reads one connection, its entries and visibilities as the CLI encoded them", async () => {
		const api = devantApi([{ match: `GET ${CONFIGS}/connections/g%201`, body: BACKEND_CONNECTION }]);
		const item = await getConnectionItem(api.http, { orgId: "101", connectionGroupId: "g 1" });
		assert.deepEqual(item.configurations, {
			t1: {
				environmentUuid: "t1",
				entries: { url: { key: "url", keyUuid: "", value: "https://x", isSensitive: false, isFile: false, valueRef: "", envVariableName: "" } },
			},
		});
		assert.deepEqual(item.visibilities, [{ projectUuid: "p1", organizationUuid: "uuid-acme" }]);
		assert.deepEqual(item.envMapping, { t1: "url" });
	});

	it("connects a component to a service with the project's environments by template", async () => {
		const route = `POST ${CONFIGS}/choreo-connections`;
		const api = devantApi([ENVIRONMENTS, { match: route, body: BACKEND_CONNECTION }]);
		const created = await createComponentConnection(api.http, {
			orgId: "101",
			orgUuid: "uuid-acme",
			projectId: "p1",
			componentId: "c1",
			componentPath: "/work/c1",
			componentType: "",
			serviceId: "svc-1",
			serviceVisibility: "Project",
			serviceSchemaId: "s1",
			name: "weather",
			generateCreds: true,
		});
		assert.equal(created.groupUuid, "g1");
		assert.match(api.queries()[0], /environments\(orgUuid: "uuid-acme", projectId: "p1"\)/);
		const request = api.fake.last(route);
		assert.equal(request?.url.search, "?generateCreds=true");
		assert.deepEqual(request?.body, {
			name: "weather",
			description: "",
			serviceId: "svc-1",
			schemaReference: "s1",
			environments: [
				{ id: "t-dev", isCritical: false },
				{ id: "t-prod", isCritical: true },
			],
			visibilities: [{ projectUuid: "p1", organizationUuid: "uuid-acme", componentUuid: "c1" }],
			requestingServiceVisibility: "Project",
			orgIdInteger: 101,
		});
	});

	it("refuses an organization id that is not a number before calling anything", async () => {
		const api = devantApi([ENVIRONMENTS]);
		const error = await rejection(
			createComponentConnection(api.http, {
				orgId: "acme",
				orgUuid: "uuid-acme",
				projectId: "p1",
				componentId: "",
				componentPath: "",
				componentType: "",
				serviceId: "svc-1",
				serviceVisibility: "Project",
				serviceSchemaId: "s1",
				name: "weather",
				generateCreds: false,
			}),
		);
		assert.ok(error instanceof BadRequestError);
		assert.equal(api.fake.requests.length, 0);
	});

	it("connects to a third-party service with empty values for each endpoint's keys in each of its environments", async () => {
		const route = `POST ${CONFIGS}/third-party-connections`;
		const api = devantApi([
			ENVIRONMENTS,
			{
				match: "GET /marketplace/0.1.0/services/svc-3/connection-schemas/s3/config",
				body: {
					message: "",
					configs: {
						main: {
							name: "main",
							environmentTemplateIds: ["t-dev", "t-prod"],
							values: [
								{ key: "url", value: "https://x" },
								{ key: "apiKey", value: "k" },
							],
						},
						other: { name: "other", environmentTemplateIds: ["t-other"], values: [{ key: "url", value: "" }] },
					},
				},
			},
			{ match: route, body: BACKEND_CONNECTION },
		]);
		await createThirdPartyConnection(api.http, {
			orgId: "101",
			orgUuid: "uuid-acme",
			projectId: "p1",
			componentId: "",
			name: "stripe",
			serviceId: "svc-3",
			serviceSchemaId: "s3",
			endpointRefs: { main: "ref" },
			sensitiveKeys: ["apiKey"],
		});
		const request = api.fake.last(route);
		assert.equal(request?.url.search, "?wellKnownService=true");
		const entries = {
			url: { key: "url", value: "", isFile: false, isSensitive: false },
			apiKey: { key: "apiKey", value: "", isFile: false, isSensitive: true },
		};
		assert.deepEqual(request?.body, {
			name: "stripe",
			componentType: "non-component",
			description: "",
			serviceId: "svc-3",
			schemaReference: "s3",
			visibilities: [{ projectUuid: "p1", organizationUuid: "uuid-acme" }],
			envMapping: {
				"t-dev": { parameterReference: "main", resourceId: "t-dev" },
				"t-prod": { parameterReference: "main", resourceId: "t-prod" },
			},
			configurations: {
				"t-dev": { environmentUuid: "t-dev", isCritical: false, entries },
				"t-prod": { environmentUuid: "t-prod", isCritical: true, entries },
			},
		});
	});

	it("connects to a database with the credential each environment uses", async () => {
		const route = `POST ${CONFIGS}/choreo-database-connections`;
		const api = devantApi([{ match: route, body: BACKEND_CONNECTION }]);
		await createDatabaseConnection(api.http, {
			orgId: "101",
			orgUuid: "uuid-acme",
			projectId: "p1",
			componentId: "",
			name: "orders",
			serviceId: "db-1",
			schemaReference: "s-db",
			envMapping: { "t-dev": { resourceId: "cred-1", parameterReference: "dev", extra: true } as never },
		});
		assert.deepEqual(api.fake.last(route)?.body, {
			name: "orders",
			description: "",
			serviceId: "db-1",
			schemaReference: "s-db",
			visibilities: [{ organizationUuid: "uuid-acme", projectUuid: "p1" }],
			envMapping: { "t-dev": { resourceId: "cred-1", parameterReference: "dev" } },
		});
		assert.equal(api.fake.calls(GRAPHQL).length, 0);
	});

	it("deletes a connection", async () => {
		const route = `DELETE ${CONFIGS}/choreo-connections/g1`;
		const api = devantApi([{ match: route, status: 204 }]);
		await deleteConnection(api.http, { orgId: "101", connectionId: "g1", connectionName: "weather", componentPath: "" });
		await assert.rejects(
			deleteConnection(api.http, { orgId: "101", connectionId: "..", connectionName: "weather", componentPath: "" }),
			/cannot name a resource/,
		);
		assert.equal(api.fake.calls(route).length, 1);
	});

	it("resolves secret references through the config service, and keeps the values out of its errors", async () => {
		const route = "POST /config-svc/v1.0/configs/groups/g1/resolve-secrets";
		const api = devantApi([{ match: route, body: { secrets: [{ key: "apiKey", valueRef: "ref-1", value: "s3cret", extra: 1 }] } }]);
		const answer = await resolveConnectionSecrets(api.http, {
			orgId: "101",
			groupId: "g1",
			projectId: "p1",
			componentId: "c1",
			envTemplateId: "t-dev",
			secrets: [{ key: "apiKey", valueRef: "ref-1" }],
		});
		assert.deepEqual(answer, { secrets: [{ key: "apiKey", valueRef: "ref-1", value: "s3cret" }] });
		assert.deepEqual(api.fake.last(route)?.body, {
			projectId: "p1",
			componentId: "c1",
			envTemplateId: "t-dev",
			secrets: [{ key: "apiKey", valueRef: "ref-1" }],
		});

		api.fake.route({ match: route, status: 500, body: { message: "vault unavailable" } });
		const error = await rejection(
			resolveConnectionSecrets(api.http, {
				orgId: "101",
				groupId: "g1",
				projectId: "p1",
				componentId: "c1",
				envTemplateId: "t-dev",
				secrets: [{ key: "apiKey", valueRef: "ref-1" }],
			}),
		);
		assert.ok(error instanceof ServerError);
		assert.doesNotMatch(JSON.stringify(error), /ref-1|s3cret/);
	});
});
