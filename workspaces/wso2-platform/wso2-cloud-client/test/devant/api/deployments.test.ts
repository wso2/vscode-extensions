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
import type { CreateDeploymentReq } from "@wso2/wso2-platform-core";
import type { CloudError } from "../../../src";
import { BadRequestError, ServerError } from "../../../src";
import {
	cancelApprovalRequest,
	checkWorkflowStatus,
	createDeployment,
	getDeploymentStatus,
	getProxyDeploymentInfo,
	promoteProxyDeployment,
	readDeployment,
	requestPromoteApproval,
} from "../../../src/devant/api/deployments";
import { rejection } from "../../support";
import { GRAPHQL, devantApi, graphqlRoute } from "./support";

const STATUS_REQ = { orgId: "101", orgHandler: "acme", orgUuid: "uuid-acme", componentId: "c1", deploymentTrackId: "t1", envId: "e1" };
const DEPLOY_PATH = "POST /declarative-api/v1.0/core/v1alpha1/projects/proj/components/svc/deploymentTracks/t1/deployments";

function deployReq(overrides: Partial<CreateDeploymentReq> = {}): CreateDeploymentReq {
	return {
		orgId: "101",
		orgHandler: "acme",
		componentName: "svc",
		componentId: "c1",
		componentHandle: "svc-handle",
		componentDisplayType: "manualTrigger",
		projectHandle: "proj",
		projectId: "p1",
		versionId: "t1",
		commitHash: "abc123",
		envName: "Development",
		envId: "e1",
		buildRef: "img-1",
		...overrides,
	};
}

describe("Devant deployments", () => {
	it("reads a deployment's status with every field present", async () => {
		const api = devantApi([
			graphqlRoute({
				componentDeployment: {
					environmentId: "e1",
					configCount: 2,
					apiRevision: { id: "r1", displayName: "1" },
					build: { buildId: "b1", runId: 42, commit: { sha: "abc", isLatest: true, author: { name: "Dev" } } },
					deploymentStatusV2: "ACTIVE",
					invokeUrl: null,
				},
			}),
		]);
		const status = await getDeploymentStatus(api.http, STATUS_REQ);
		assert.equal(status?.environmentId, "e1");
		assert.equal(status?.configCount, 2);
		assert.equal(status?.apiRevision, "");
		assert.equal(status?.build.runId, "42");
		assert.equal(status?.build.commit.sha, "abc");
		assert.equal(status?.build.commit.author.email, "");
		assert.equal(status?.invokeUrl, "");
		assert.equal(status?.deploymentStatusV2, "ACTIVE");
		assert.match(
			api.queries()[0],
			/componentDeployment\(orgHandler: "acme", orgUuid: "uuid-acme", componentId: "c1", versionId: "t1", environmentId: "e1"\)/,
		);
	});

	it("answers an empty deployment when there is none, and null when the read fails", async () => {
		const empty = devantApi([graphqlRoute({ componentDeployment: null })]);
		const none = await getDeploymentStatus(empty.http, STATUS_REQ);
		assert.equal(none?.deploymentStatusV2, "");
		assert.equal(none?.build.buildId, "");
		const failing = devantApi([{ match: GRAPHQL, status: 500, body: { message: "boom" } }]);
		assert.equal(await getDeploymentStatus(failing.http, STATUS_REQ), null);
	});

	it("tells a deployment that is not there from a read that failed", async () => {
		const empty = devantApi([graphqlRoute({ componentDeployment: null })]);
		assert.equal(await readDeployment(empty.http, STATUS_REQ), null);
		const gone = devantApi([{ match: GRAPHQL, status: 404, body: { message: "no such component" } }]);
		assert.equal(await readDeployment(gone.http, STATUS_REQ), null);
		const failing = devantApi([{ match: GRAPHQL, status: 500, body: { message: "boom" } }]);
		assert.equal(((await rejection(readDeployment(failing.http, STATUS_REQ))) as CloudError).code, "server");
		const forbidden = devantApi([{ match: GRAPHQL, status: 403, body: { message: "no" } }]);
		assert.equal(((await rejection(readDeployment(forbidden.http, STATUS_REQ))) as CloudError).code, "forbidden");
	});

	it("reads a proxy's deployment", async () => {
		const api = devantApi([
			graphqlRoute({
				proxyDeployment: { apiId: "a1", environment: { name: "Development" }, apiRevision: { id: "r1", createdTime: 7 }, deployedTime: 9 },
			}),
		]);
		const info = await getProxyDeploymentInfo(api.http, {
			orgId: "101",
			orgHandler: "acme",
			orgUuid: "uuid-acme",
			componentId: "c1",
			versionId: "v1",
			envId: "e1",
		});
		assert.equal(info?.apiId, "a1");
		assert.deepEqual(info?.environment, { choreoEnv: "", name: "Development", id: "" });
		assert.deepEqual(info?.apiRevision, { id: "r1", displayName: "", createdTime: 7 });
		assert.equal(info?.successDeployedTime, 0);
		assert.match(
			api.queries()[0],
			/proxyDeployment\(orgHandler: "acme", orgUuid: "uuid-acme", componentId: "c1", versionId: "v1", environmentId: "e1"\)/,
		);
	});

	it("generates a service's endpoints for the environment's release before deploying it", async () => {
		const api = devantApi([
			graphqlRoute(
				{ component: { apiVersions: [{ id: "t1", appEnvVersions: [{ environmentId: "e1", releaseId: "rel-1" }] }] } },
				{ generateComponentEndpoints: [{ id: "ep" }] },
			),
			{ match: DEPLOY_PATH, body: { deployDeploymentTrack: "ok" } },
		]);
		await createDeployment(api.http, deployReq({ componentDisplayType: "ballerinaService" }));
		const [lookup, generate] = api.queries();
		assert.match(lookup, /component\(componentHandler: "svc-handle", projectId: "p1"\)/);
		assert.match(generate, /generateComponentEndpoints\(input: \{ componentId: "c1", versionId: "t1", releaseId: "rel-1", commitHash: "abc123" \}\)/);
		const deploy = api.fake.last(DEPLOY_PATH);
		assert.equal(deploy?.url.host, "apis.choreo.dev");
		const body = deploy?.body as { apiVersion: string; kind: string; metadata: Record<string, string>; spec: Record<string, unknown> };
		assert.equal(body.kind, "Deployment");
		assert.equal(body.apiVersion, "core.choreo.dev/v1alpha1");
		assert.match(body.metadata.name, /^[0-9a-f-]{36}$/);
		assert.deepEqual(
			{ ...body.metadata, name: undefined },
			{ name: undefined, deploymentTrackId: "t1", environment: "Development", componentName: "svc", projectName: "proj" },
		);
		assert.deepEqual(body.spec, { buildRef: "img-1" });
	});

	it("refuses to deploy a service whose track has no release in the environment", async () => {
		const api = devantApi([graphqlRoute({ component: { apiVersions: [{ id: "t1", appEnvVersions: [] }] } })]);
		const error = await rejection(createDeployment(api.http, deployReq({ componentDisplayType: "restAPI" })));
		assert.ok(error instanceof BadRequestError);
		assert.equal(api.fake.calls(DEPLOY_PATH).length, 0);
	});

	it("carries a scheduled task's schedule and a Git proxy's target URLs", async () => {
		const api = devantApi([{ match: DEPLOY_PATH, body: {} }]);
		await createDeployment(api.http, deployReq({ componentDisplayType: "byocCronjob", cronExpression: "0 * * * *", cronTimezone: "UTC" }));
		assert.deepEqual((api.fake.last(DEPLOY_PATH)?.body as { spec: unknown }).spec, {
			buildRef: "img-1",
			scheduleExpression: "0 * * * *",
			scheduleTimezone: "UTC",
		});
		await createDeployment(api.http, deployReq({ componentDisplayType: "gitProxy", proxySandboxUrl: "https://sandbox" }));
		assert.deepEqual((api.fake.last(DEPLOY_PATH)?.body as { spec: unknown }).spec, {
			buildRef: "img-1",
			proxyConfig: { keys: { productionEndpoint: "", sandboxEndpoint: "https://sandbox" } },
		});
		assert.equal(api.queries().length, 0);
	});

	it("reads a promotion's approval state", async () => {
		const api = devantApi([
			{ match: "GET /workflow-mgt/v1.0/workflow-instances/status", body: { status: "PENDING", wkfInstanceId: "w1", extra: 1 } },
		]);
		assert.deepEqual(await checkWorkflowStatus(api.http, { orgId: "101", buildId: "b1", envId: "e2" }), { status: "PENDING", wkfInstanceId: "w1" });
		const request = api.fake.last();
		assert.equal(request?.url.searchParams.get("wkfDefinitionId"), "ENV_PROMOTION");
		assert.equal(request?.url.searchParams.get("resource"), "b1_e2");
	});

	it("asks for a promotion's approval, whatever the answer's format", async () => {
		const api = devantApi([{ match: "POST /workflow-mgt/v1.0/workflow-instances", body: "wf-instance-1" }]);
		await requestPromoteApproval(api.http, {
			orgId: "101",
			orgHandler: "acme",
			envId: "e2",
			envName: "Production",
			buildId: "b1",
			projectId: "p1",
			projectName: "Proj",
			requestComment: "please",
			componentName: "svc",
			envFromId: "e1",
			envFromName: "Development",
		});
		assert.deepEqual(api.fake.last()?.body, {
			projectId: "p1",
			requestComment: "please",
			context: { workflowDefinitionIdentifier: "ENV_PROMOTION", resource: "b1_e2" },
			data: {
				payload: {
					orgName: "acme",
					projectName: "Proj",
					componentName: "svc",
					buildId: "b1",
					envFrom: { id: "e1", name: "Development" },
					envTo: { id: "e2", name: "Production" },
				},
				metadata: {},
			},
		});
	});

	it("cancels an approval request, and reports a failure", async () => {
		const api = devantApi([{ match: "POST /workflow-mgt/v1.0/workflow-instances/w%2F1/cancellation", body: "" }]);
		await cancelApprovalRequest(api.http, { orgId: "101", wkfInstanceId: "w/1" });
		assert.equal(api.fake.last()?.method, "POST");
		const failing = devantApi([{ match: "POST /workflow-mgt/v1.0/workflow-instances/w1/cancellation", status: 500, body: { message: "no" } }]);
		assert.ok((await rejection(cancelApprovalRequest(failing.http, { orgId: "101", wkfInstanceId: "w1" }))) instanceof ServerError);
	});

	it("promotes a proxy through the proxy deployer on the app host", async () => {
		const api = devantApi([{ match: "POST /proxy/deployer/v1/components/c1/versions/api-1/promote", body: { success: true } }]);
		await promoteProxyDeployment(api.http, { orgId: "101", componentId: "c1", apiId: "api-1", promoteFromEnvId: "e1", envId: "e2", buildId: "b1" });
		const request = api.fake.last();
		assert.equal(request?.url.host, "app.choreo.dev");
		assert.equal(request?.url.search, "?fromEnv=e1&targetEnv=e2&buildId=b1&accessMode=external");
	});
});
