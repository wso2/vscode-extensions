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
import { Buffer } from "node:buffer";
import type { ComponentEP } from "@wso2/wso2-platform-core";
import { ConflictError, NotFoundError, ServerError, TimeoutError } from "../../../src";
import type { ProjectComponent } from "../../../src/devant/proxy/bridge";
import { BRIDGE_IMAGE, bridgeApiKey, bridgeRestEndpoint, listProjectComponents, provisionBridge } from "../../../src/devant/proxy/bridge";
import { rejection } from "../../support";
import { devantApi } from "../api/support";
import { DEV_ENV, ORG, endpoint, graphqlBy } from "./support";

const TRACK = { id: "track-1", apiVersion: "v1.0.2", branch: "", latest: true };
const REGISTRIES = "GET /devops/1.0.0/api/v1/container-registries";
const ENDPOINTS_CREATE = "POST /devops/1.0.0/api/v1/byoi/components/bridge-1/releases/release-1/endpoints";

function bridgeComponent(overrides: Partial<ProjectComponent> = {}): ProjectComponent {
	return {
		id: "bridge-1",
		name: "choreo-local-bridge",
		handler: "choreo-local-bridge",
		version: "v1.0.2",
		isSystemComponent: "true",
		deploymentTracks: [TRACK as ProjectComponent["deploymentTracks"][number]],
		...overrides,
	};
}

const COMPONENT_INFO = {
	component: { apiVersions: [{ id: TRACK.id, appEnvVersions: [{ environmentId: DEV_ENV.id, releaseId: "release-1" }] }] },
};

function target(components: ProjectComponent[]) {
	return { org: ORG, projectId: "proj-1", env: DEV_ENV, components };
}

describe("Devant bridge component", () => {
	it("lists the project's components with the system ones", async () => {
		const api = devantApi([graphqlBy([[/components\(/, { components: [bridgeComponent()] }]])]);
		const components = await listProjectComponents(api.http, ORG.handle, "proj-1");
		assert.equal(components[0].name, "choreo-local-bridge");
		assert.match(api.queries()[0], /components\(orgHandler: "acme", projectId: "proj-1", options: \{ filter: \{ withSystemComponents: true \} \}\)/);
	});

	it("uses a deployed bridge as it is", async () => {
		const api = devantApi([
			graphqlBy([
				[/component\(componentHandler/, COMPONENT_INFO],
				[/componentEndpoints/, { componentEndpoints: [endpoint()] }],
				[/componentDeployment/, { componentDeployment: { deploymentStatusV2: "ACTIVE" } }],
			]),
		]);
		const bridge = await provisionBridge(api.http, target([bridgeComponent()]), { pollIntervalMs: 1 });
		assert.equal(bridge.component.id, "bridge-1");
		assert.equal(bridgeRestEndpoint(bridge.endpoints, DEV_ENV.id).publicUrl, "https://bridge.example/rest");
		assert.ok(api.queries().every((query) => !/mutation/.test(query)));
		assert.equal(api.fake.calls(REGISTRIES).length, 0);
	});

	it("creates, deploys and waits for a bridge the project lacks", async () => {
		let created = false;
		const api = devantApi([
			graphqlBy([
				[
					/createByoiComponent/,
					() => {
						created = true;
						return { createByoiComponent: { id: "bridge-1" } };
					},
				],
				[/components\(/, () => ({ components: created ? [bridgeComponent()] : [] })],
				[/component\(componentHandler/, COMPONENT_INFO],
				[/deployImage/, { deployImage: { success: true, message: "" } }],
				[
					/componentDeployment/,
					(_query: string, call: number) => ({ componentDeployment: { deploymentStatusV2: call < 2 ? "IN_PROGRESS" : "ACTIVE" } }),
				],
				[
					/componentEndpoints/,
					(_query: string, call: number) => ({
						componentEndpoints: call === 0 ? [] : [endpoint({ state: call === 1 ? "Progressing" : "Active" })],
					}),
				],
			]),
			{ match: REGISTRIES, sequence: [{ body: { data: [] } }, { body: { data: [{ id: "reg-1", host: "choreoanonymouspullable.azurecr.io" }] } }] },
			{ match: "POST /devops/1.0.0/api/v1/container-registries", body: {} },
			{ match: ENDPOINTS_CREATE, body: {} },
		]);

		const bridge = await provisionBridge(api.http, target([]), { pollIntervalMs: 1, readyTimeoutMs: 5_000 });

		assert.equal(bridge.component.id, "bridge-1");
		assert.equal(bridge.endpoints[0].state, "Active");
		assert.equal(bridge.components.length, 1);

		const register = api.fake.last("POST /devops/1.0.0/api/v1/container-registries");
		assert.equal(register?.url.searchParams.get("organization_id"), ORG.uuid);
		assert.deepEqual(register?.body, {
			name: "Choreo Samples Registry",
			type: "vendor-specific",
			provider: "Azure",
			credential: { host: "choreoanonymouspullable.azurecr.io" },
		});

		const queries = api.queries();
		const create = queries.find((query) => /createByoiComponent/.test(query)) ?? "";
		assert.match(create, /name: "choreo-local-bridge", displayName: "Connect Bridge"/);
		assert.match(create, /projectId: "proj-1", componentType: "byoiService"/);
		assert.match(create, /metadata: \{ version: "v1\.0\.2", labels: "", isSystemComponent: "true" \}, port: null/);
		assert.match(create, new RegExp(`imageUrl: "${BRIDGE_IMAGE.replace(/\./g, "\\.")}", registryId: "reg-1"`));
		assert.match(
			queries.find((query) => /component\(componentHandler/.test(query)) ?? "",
			/componentHandler: "choreo-local-bridge", projectId: "proj-1"/,
		);

		const endpoints = api.fake.last(ENDPOINTS_CREATE);
		assert.equal(endpoints?.url.searchParams.get("organization_id"), ORG.uuid);
		assert.equal(endpoints?.url.searchParams.get("project_id"), "proj-1");
		const body = endpoints?.body as { main: string; apiSchemas: { filename: string; content: string }[] };
		const main = Buffer.from(body.main, "base64").toString("utf8");
		assert.match(main, /- name: rest-bridge-[0-9a-f-]{36}\n/);
		assert.match(main, /port: 8080/);
		assert.match(main, /networkVisibility: Public/);
		assert.equal(body.apiSchemas[0].filename, "openapi.yaml");
		assert.match(Buffer.from(body.apiSchemas[0].content, "base64").toString("utf8"), /\/handle-client-req:/);

		const deploy = queries.find((query) => /deployImage/.test(query)) ?? "";
		assert.match(
			deploy,
			/componentId: "bridge-1", releaseId: "release-1", imageUrl: "choreoanonymouspullable\.azurecr\.io\/choreo-local-bridge:1\.0\.2"/,
		);
		assert.match(deploy, /imageId: "", cron: "", cronTimezone: ""/);
		assert.equal(queries.filter((query) => /componentDeployment/.test(query)).length, 3);
		assert.equal(queries.filter((query) => /componentEndpoints/.test(query)).length, 3);
	});

	it("gives up when the bridge does not come up in time", async () => {
		const api = devantApi([
			graphqlBy([
				[/component\(componentHandler/, COMPONENT_INFO],
				[/componentEndpoints/, { componentEndpoints: [endpoint({ state: "Progressing" })] }],
				[/componentDeployment/, { componentDeployment: { deploymentStatusV2: "IN_PROGRESS" } }],
				[/deployImage/, { deployImage: { success: true } }],
			]),
		]);
		const error = await rejection(provisionBridge(api.http, target([bridgeComponent()]), { pollIntervalMs: 5, readyTimeoutMs: 30 }));
		assert.ok(error instanceof TimeoutError);
		assert.equal((error as TimeoutError).details.reason, "wait_timeout");
	});

	it("stops waiting when cancelled", async () => {
		const api = devantApi([
			graphqlBy([
				[/component\(componentHandler/, COMPONENT_INFO],
				[/componentEndpoints/, { componentEndpoints: [endpoint({ state: "Progressing" })] }],
				[/componentDeployment/, { componentDeployment: { deploymentStatusV2: "IN_PROGRESS" } }],
				[/deployImage/, { deployImage: { success: true } }],
			]),
		]);
		const controller = new AbortController();
		const pending = provisionBridge(api.http, target([bridgeComponent()]), {
			pollIntervalMs: 1_000,
			readyTimeoutMs: 60_000,
			signal: controller.signal,
		});
		setTimeout(() => controller.abort(), 20);
		const error = await rejection(pending);
		assert.ok(error instanceof TimeoutError);
		assert.equal((error as TimeoutError).details.reason, "cancelled");
	});

	it("reports an endpoint that failed to come up", async () => {
		const failed = endpoint({ state: "Error", stateReason: { message: "image pull failed", details: "denied", code: "E1", workerId: "w1" } });
		const api = devantApi([
			graphqlBy([
				[/component\(componentHandler/, COMPONENT_INFO],
				[/componentEndpoints/, (_q: string, call: number) => ({ componentEndpoints: [call === 0 ? endpoint({ state: "Progressing" }) : failed] })],
				[/componentDeployment/, (_q: string, call: number) => ({ componentDeployment: { deploymentStatusV2: call === 0 ? "" : "ACTIVE" } })],
				[/deployImage/, { deployImage: { success: true } }],
			]),
		]);
		const error = await rejection(provisionBridge(api.http, target([bridgeComponent()]), { pollIntervalMs: 1 }));
		assert.ok(error instanceof ServerError);
		assert.equal((error as Error).message, "image pull failed, Details:denied, Code:E1, WorkerId:w1 ");
	});

	it("refuses a deployment Devant does not accept", async () => {
		const api = devantApi([
			graphqlBy([
				[/component\(componentHandler/, COMPONENT_INFO],
				[/componentEndpoints/, { componentEndpoints: [endpoint()] }],
				[/componentDeployment/, { componentDeployment: { deploymentStatusV2: "NOT_DEPLOYED" } }],
				[/deployImage/, { deployImage: { success: false, message: "quota" } }],
			]),
		]);
		const error = await rejection(provisionBridge(api.http, target([bridgeComponent()]), { pollIntervalMs: 1 }));
		assert.match((error as Error).message, /Failed to deploy bridge component/);
	});

	it("deletes a bridge of another version, and refuses a component of the bridge's name that is not the system's", async () => {
		const api = devantApi([
			graphqlBy([
				[/deleteComponentV2/, { deleteComponentV2: { status: "success" } }],
				[/createByoiComponent/, { createByoiComponent: { id: "bridge-1" } }],
				[/components\(/, { components: [] }],
			]),
			{ match: REGISTRIES, body: { data: [{ id: "reg-1", host: "choreoanonymouspullable.azurecr.io" }] } },
		]);
		const error = await rejection(provisionBridge(api.http, target([bridgeComponent({ id: "old", version: "v1.0.1" })])));
		assert.ok(error instanceof NotFoundError);
		assert.match(api.queries().find((query) => /deleteComponentV2/.test(query)) ?? "", /componentId: "old", projectId: "proj-1"/);

		const refused = await rejection(provisionBridge(api.http, target([bridgeComponent({ isSystemComponent: "false" })])));
		assert.ok(refused instanceof ConflictError);
	});

	it("picks the environment's REST endpoint, which must be active", () => {
		const endpoints = [
			endpoint({ id: "other-env", environmentId: "env-other" }),
			endpoint({ id: "ws", type: "WS" }),
			endpoint({ id: "rest" }),
		] as unknown as ComponentEP[];
		assert.equal(bridgeRestEndpoint(endpoints, DEV_ENV.id).id, "rest");
		assert.throws(() => bridgeRestEndpoint(endpoints, "env-none"), NotFoundError);
		assert.throws(() => bridgeRestEndpoint([endpoint({ state: "Progressing" })] as unknown as ComponentEP[], DEV_ENV.id), ConflictError);
	});

	it("asks the publisher for a key of the environment's type", async () => {
		const api = devantApi([{ match: "POST /api/am/publisher/v2/apis/apim-1/generate-key", body: { apikey: "bridge-key", validityTime: 3600 } }]);
		const key = await bridgeApiKey(api.http, ORG, endpoint() as unknown as ComponentEP, DEV_ENV);
		assert.deepEqual(key, { apiKey: "bridge-key", validityTime: 3600 });
		const call = api.fake.last();
		assert.equal(call?.url.searchParams.get("organizationId"), ORG.uuid);
		assert.equal(call?.url.searchParams.get("keyType"), "Development");
	});
});
