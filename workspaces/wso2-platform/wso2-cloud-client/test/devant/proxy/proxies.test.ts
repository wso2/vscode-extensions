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
import { BadRequestError, NotFoundError } from "../../../src";
import { DevantProxies } from "../../../src/devant/proxy";
import type { FakeRoute } from "../../doubles";
import { rejection } from "../../support";
import type { DevantApiHarness } from "../api/support";
import { devantApi } from "../api/support";
import type { FakeBridge } from "./support";
import { DEV_ENV, ORG, PROD_ENV, endpoint, fakeBridge, graphqlBy, json, viaProxy } from "./support";

const CONNECTIONS = "/connections/v1/configurations/service-configs/connections";
const TRACK = { id: "track-1", apiVersion: "v1.0.2", branch: "", latest: true };
const ORGANIZATIONS = async () => [{ ...ORG, name: "Acme" }];

/** Devant with a project whose bridge is deployed and active, its REST endpoint at `bridgeUrl`. */
function devant(bridgeUrl: string, extra: FakeRoute[] = []): DevantApiHarness {
	const components = [
		{
			id: "bridge-1",
			name: "choreo-local-bridge",
			handler: "choreo-local-bridge",
			version: "v1.0.2",
			isSystemComponent: "true",
			deploymentTracks: [TRACK],
		},
		{ id: "comp-1", name: "orders", handler: "orders", version: "1.0", isSystemComponent: "false", deploymentTracks: [] },
	];
	return devantApi([
		graphqlBy([
			[/projects\(/, { projects: [{ id: "proj-1", name: "Shop", handler: "shop" }] }],
			[/environments\(/, { environments: [PROD_ENV, DEV_ENV] }],
			[/components\(/, { components }],
			[
				/component\(componentHandler/,
				{ component: { apiVersions: [{ id: TRACK.id, appEnvVersions: [{ environmentId: DEV_ENV.id, releaseId: "r-1" }] }] } },
			],
			[/componentEndpoints/, { componentEndpoints: [endpoint({ publicUrl: bridgeUrl })] }],
			[/componentDeployment/, { componentDeployment: { deploymentStatusV2: "ACTIVE" } }],
		]),
		{
			match: `GET ${CONNECTIONS}?projectId=proj-1&scope=PROJECT`,
			body: [{ name: "orders-api", groupUuid: "g-1", schemaName: "Organization Service" }],
		},
		{ match: `GET ${CONNECTIONS}?projectId=proj-1&componentId=comp-1`, body: [{ name: "weather", groupUuid: "g-2", schemaName: "Third Party" }] },
		{
			match: `GET ${CONNECTIONS}/g-1`,
			body: {
				configurations: {
					"tpl-dev": {
						environmentUuid: "env-dev",
						entries: {
							ServiceURL: {
								key: "ServiceURL",
								value: "https://orders.internal/v1/",
								envVariableName: "CHOREO_ORDERS_SERVICEURL",
								isSensitive: false,
								isFile: false,
								valueRef: "",
							},
						},
					},
				},
			},
		},
		{
			match: `GET ${CONNECTIONS}/g-2`,
			body: {
				configurations: {
					"tpl-dev": {
						environmentUuid: "env-dev",
						entries: {
							url: { key: "url", value: "http://weather.example", envVariableName: "WEATHER_URL", isSensitive: false, isFile: false, valueRef: "" },
						},
					},
				},
			},
		},
		{ match: "POST /api/am/publisher/v2/apis/apim-1/generate-key", body: { apikey: "bridge-key", validityTime: 3600 } },
		...extra,
	]);
}

describe("Devant local proxies", () => {
	let bridge: FakeBridge;
	let proxies: DevantProxies | undefined;

	beforeEach(async () => {
		bridge = await fakeBridge();
	});

	afterEach(async () => {
		await proxies?.dispose();
		proxies = undefined;
		await bridge.close();
	});

	it("starts a proxy to the project's bridge, with the connections' variables and the proxy's", async () => {
		const api = devant(bridge.url);
		proxies = new DevantProxies(api.http, { organizations: ORGANIZATIONS, pollIntervalMs: 1 });
		const started = await proxies.start({ orgId: "101", project: "shop", component: "orders" });

		assert.ok(started.proxyServerPort > 0);
		assert.deepEqual(started.envVars, {
			CHOREO_ORDERS_SERVICEURL: "http://orders.internal/v1",
			WEATHER_URL: "http://weather.example",
			http_proxy: `http://127.0.0.1:${started.proxyServerPort}`,
			no_proxy: "localhost,127.0.0.1",
		});

		bridge.answer = (_request, res) => json(res, 200, { request_id: "", status_code: 200, headers: { "X-From": "bridge" }, body: "pong" });
		const answer = await viaProxy(started.proxyServerPort, "http://orders.internal:80/v1/ping");
		assert.equal(answer.status, 200);
		assert.equal(answer.body, "pong");
		assert.equal(bridge.received[0].headers["api-key"], "bridge-key");
		const details = JSON.parse(bridge.received[0].body);
		assert.equal(details.isSecure, true);
		assert.equal(details.port, "");
		assert.equal(api.fake.last(/generate-key/)?.url.searchParams.get("keyType"), DEV_ENV.name);

		await proxies.stop({ proxyPort: started.proxyServerPort });
		assert.deepEqual(proxies.ports(), []);
		await assert.rejects(viaProxy(started.proxyServerPort, "http://orders.internal/v1/ping"), /ECONNREFUSED/);
	});

	it("leaves out the component's connections when no component of that name exists", async () => {
		const api = devant(bridge.url);
		proxies = new DevantProxies(api.http, { organizations: ORGANIZATIONS });
		const started = await proxies.start({ orgId: "101", project: "proj-1", component: "missing", skipConnection: ["orders-api"] });
		assert.deepEqual(Object.keys(started.envVars).sort(), ["http_proxy", "no_proxy"]);
	});

	it("refuses a critical environment before touching the bridge", async () => {
		const api = devant(bridge.url);
		proxies = new DevantProxies(api.http, { organizations: ORGANIZATIONS });
		const error = await rejection(proxies.start({ orgId: "101", project: "Shop", env: "Production" }));
		assert.ok(error instanceof BadRequestError);
		assert.match((error as Error).message, /critical/);
		assert.ok(api.queries().every((query) => !/components\(/.test(query)));
	});

	it("refuses an unknown organization, project or environment", async () => {
		const api = devant(bridge.url);
		proxies = new DevantProxies(api.http, { organizations: ORGANIZATIONS });
		assert.ok((await rejection(proxies.start({ orgId: "999", project: "shop" }))) instanceof NotFoundError);
		assert.ok((await rejection(proxies.start({ orgId: "101", project: "nope" }))) instanceof NotFoundError);
		assert.ok((await rejection(proxies.start({ orgId: "101", project: "shop", env: "Staging" }))) instanceof NotFoundError);
	});

	it("reads the organizations from Devant when the session's are not given", async () => {
		const api = devant(bridge.url, [{ match: "GET /orgs/1.0.0/orgs", body: [{ id: 101, uuid: ORG.uuid, handle: ORG.handle, name: "Acme" }] }]);
		proxies = new DevantProxies(api.http);
		const started = await proxies.start({ orgId: "101", project: "shop", env: "dev" });
		assert.ok(started.proxyServerPort > 0);
		assert.match(api.queries().find((query) => /environments\(/.test(query)) ?? "", /orgUuid: "uuid-acme"/);
	});

	it("refuses to stop a port it did not start", async () => {
		proxies = new DevantProxies(devant(bridge.url).http, { organizations: ORGANIZATIONS });
		const error = await rejection(proxies.stop({ proxyPort: 1 }));
		assert.ok(error instanceof NotFoundError);
		assert.match((error as Error).message, /no server found running on port 1/);
	});

	it("stops the proxies running when the session they were started for ends, and starts again after", async () => {
		const api = devant(bridge.url);
		proxies = new DevantProxies(api.http, { organizations: ORGANIZATIONS });
		const first = await proxies.start({ orgId: "101", project: "shop" });
		await proxies.stopAll();
		assert.deepEqual(proxies.ports(), []);
		await assert.rejects(viaProxy(first.proxyServerPort, "http://a.internal/"), /ECONNREFUSED/);
		const again = await proxies.start({ orgId: "101", project: "shop" });
		assert.deepEqual(proxies.ports(), [again.proxyServerPort]);
	});

	it("closes every proxy it started when disposed", async () => {
		const api = devant(bridge.url);
		proxies = new DevantProxies(api.http, { organizations: ORGANIZATIONS });
		const first = await proxies.start({ orgId: "101", project: "shop" });
		const second = await proxies.start({ orgId: "101", project: "shop" });
		assert.notEqual(first.proxyServerPort, second.proxyServerPort);
		await proxies.dispose();
		assert.deepEqual(proxies.ports(), []);
		for (const port of [first.proxyServerPort, second.proxyServerPort]) {
			await assert.rejects(viaProxy(port, "http://a.internal/"), /ECONNREFUSED/);
		}
		const late = await rejection(proxies.start({ orgId: "101", project: "shop" }));
		assert.match((late as Error).message, /cancelled/);
	});
});
