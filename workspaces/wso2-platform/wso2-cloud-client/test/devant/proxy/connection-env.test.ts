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
import type { ConnectionListItem } from "@wso2/wso2-platform-core";
import type { ConnectionEnv } from "../../../src/devant/proxy/connection-env";
import { addConnectionEnvs, domainOf } from "../../../src/devant/proxy/connection-env";
import { devantApi } from "../api/support";
import { recordingLogger } from "./support";

const CONNECTIONS = "/connections/v1/configurations/service-configs/connections";

function listed(name: string, groupUuid: string, schemaName: string): ConnectionListItem {
	return { name, groupUuid, schemaName } as ConnectionListItem;
}

function entry(key: string, envVariableName: string, value: string, extra: Record<string, unknown> = {}) {
	return { key, keyUuid: `${key}-uuid`, value, isSensitive: false, isFile: false, valueRef: "", envVariableName, ...extra };
}

describe("Devant connection variables", () => {
	it("hands out an organization service's HTTPS URL as HTTP, marking its host secure", async () => {
		const api = devantApi([
			{
				match: `GET ${CONNECTIONS}/g-org`,
				body: {
					groupUuid: "g-org",
					configurations: {
						"tpl-dev": {
							environmentUuid: "env-dev",
							entries: {
								ServiceURL: entry("ServiceURL", "CHOREO_ORDERS_SERVICEURL", "https://orders.internal:8443/api/"),
								ConsumerKey: entry("ConsumerKey", "CHOREO_ORDERS_CONSUMERKEY", "ck"),
							},
						},
						"tpl-prod": { environmentUuid: "env-prod", entries: { ServiceURL: entry("ServiceURL", "PROD_ONLY", "https://prod") } },
					},
				},
			},
			{
				match: `GET ${CONNECTIONS}/g-third`,
				body: {
					groupUuid: "g-third",
					configurations: {
						"tpl-dev": {
							environmentUuid: "env-dev",
							entries: { url: entry("ServiceURL", "WEATHER_URL", "https://weather.example/") },
						},
					},
				},
			},
		]);
		const into: ConnectionEnv = { envVars: {}, secureHosts: new Set() };
		await addConnectionEnvs(
			api.http,
			[listed("orders", "g-org", "Organization Service"), listed("weather", "g-third", "Third Party")],
			{ orgId: "101", projectId: "proj-1", envTemplateId: "tpl-dev" },
			into,
		);
		assert.deepEqual(into.envVars, {
			CHOREO_ORDERS_SERVICEURL: "http://orders.internal:8443/api",
			CHOREO_ORDERS_CONSUMERKEY: "ck",
			WEATHER_URL: "https://weather.example",
		});
		assert.deepEqual([...into.secureHosts], ["orders.internal"]);
	});

	it("resolves sensitive values per connection group, and leaves out skipped connections", async () => {
		const api = devantApi([
			{
				match: `GET ${CONNECTIONS}/g-db`,
				body: {
					groupUuid: "g-db",
					configurations: {
						"tpl-dev": {
							environmentUuid: "env-dev",
							entries: {
								host: entry("HOST", "DB_HOST", "db.internal"),
								password: entry("PASSWORD", "DB_PASSWORD", "", { isSensitive: true, valueRef: "ref-pw" }),
								cert: entry("CERT", "DB_CERT", "", { isSensitive: true, isFile: true, valueRef: "ref-cert" }),
							},
						},
					},
				},
			},
			{
				match: "POST /config-svc/v1.0/configs/groups/g-db/resolve-secrets",
				body: { secrets: [{ key: "PASSWORD", valueRef: "ref-pw", value: "s3cret" }] },
			},
		]);
		const into: ConnectionEnv = { envVars: {}, secureHosts: new Set() };
		await addConnectionEnvs(
			api.http,
			[listed("db", "g-db", "Database"), listed("skipped", "g-skip", "Database")],
			{ orgId: "101", projectId: "proj-1", componentId: "comp-1", envTemplateId: "tpl-dev", skip: ["skipped"] },
			into,
		);
		assert.deepEqual(into.envVars, { DB_HOST: "db.internal", DB_PASSWORD: "s3cret" });
		assert.deepEqual(api.fake.last(/resolve-secrets/)?.body, {
			projectId: "proj-1",
			componentId: "comp-1",
			envTemplateId: "tpl-dev",
			secrets: [{ key: "PASSWORD", valueRef: "ref-pw" }],
		});
		assert.equal(api.fake.calls(`GET ${CONNECTIONS}/g-skip`).length, 0);
	});

	it("leaves secrets unset when they cannot be resolved, without failing or logging them", async () => {
		const logger = recordingLogger();
		const api = devantApi([
			{
				match: `GET ${CONNECTIONS}/g-db`,
				body: {
					groupUuid: "g-db",
					configurations: {
						"tpl-dev": {
							environmentUuid: "env-dev",
							entries: { password: entry("PASSWORD", "DB_PASSWORD", "", { isSensitive: true, valueRef: "ref-pw" }) },
						},
					},
				},
			},
			{ match: "POST /config-svc/v1.0/configs/groups/g-db/resolve-secrets", status: 500, body: { message: "boom ref-pw" } },
		]);
		const into: ConnectionEnv = { envVars: {}, secureHosts: new Set() };
		await addConnectionEnvs(api.http, [listed("db", "g-db", "Database")], { orgId: "101", projectId: "p", envTemplateId: "tpl-dev" }, into, logger);
		assert.deepEqual(into.envVars, {});
		assert.equal(logger.lines.length, 1);
		assert.ok(!logger.lines[0].includes("ref-pw"));
	});

	it("takes a URL's host without its port", () => {
		assert.equal(domainOf("https://a.example:8443/x"), "a.example");
		assert.equal(domainOf("https://a.example/x"), "a.example");
		assert.equal(domainOf("https://user:pw@a.example:1/"), "a.example");
		assert.equal(domainOf("http://[::1]:80/"), "::1");
		assert.equal(domainOf("/relative"), "");
	});
});
