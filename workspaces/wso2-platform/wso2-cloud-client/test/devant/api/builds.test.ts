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
import type { GetBuildLogsReq } from "@wso2/wso2-platform-core";
import { BadRequestError, NotFoundError } from "../../../src";
import {
	createBuild,
	disableAutoBuildOnCommit,
	enableAutoBuildOnCommit,
	getAutoBuildStatus,
	getBuildLogs,
	getBuildLogsForType,
	getBuilds,
} from "../../../src/devant/api/builds";
import type { FakeRoute } from "../../doubles";
import { rejection } from "../../support";
import { GRAPHQL, devantApi, graphqlRoute } from "./support";

/** A GraphQL route answering each query by the first pattern it matches; others fail. */
function graphqlBy(answers: [RegExp, unknown][]): FakeRoute {
	return {
		match: GRAPHQL,
		respond: (request) => {
			const query = (request.body as { query: string }).query;
			const found = answers.find(([pattern]) => pattern.test(query));
			return found ? { body: { data: found[1] } } : { status: 500, body: { message: "unexpected query" } };
		},
	};
}

const BUILDS_PARAMS = { orgId: "101", componentId: "c1", componentName: "orders", displayType: "byocService", branch: "main", apiVersionId: "t1" };
const EMPTY_PHASE = { status: "", steps: null, log: "" };

describe("Devant builds", () => {
	it("starts a build of a deployment track at a commit", async () => {
		const path = "POST /declarative-api/v1.0/core/v1alpha1/projects/proj/components/orders/deploymentTracks/t1/builds";
		const api = devantApi([
			{ match: path, body: { kind: "Build", metadata: { name: "b-1", componentName: "orders" }, spec: { revision: "abc" }, extra: true } },
		]);
		const build = await createBuild(api.http, {
			orgId: "101",
			componentName: "orders",
			displayType: "byocService",
			projectHandle: "proj",
			deploymentTrackId: "t1",
			commitHash: "abc",
			gitRepoUrl: "",
			gitBranch: "main",
			subPath: "",
		});
		const body = api.fake.last(path)?.body as { metadata: { name: string } };
		assert.match(body.metadata.name, /^[0-9a-f-]{36}$/);
		assert.deepEqual(body, {
			apiVersion: "core.choreo.dev/v1alpha1",
			kind: "Build",
			metadata: { name: body.metadata.name, componentName: "orders", projectName: "proj" },
			spec: { revision: "abc" },
		});
		assert.deepEqual(build, {
			apiVersion: "",
			kind: "Build",
			metadata: { name: "b-1", componentName: "orders", projectName: "" },
			spec: { revision: "abc" },
		});
	});

	it("lists a track's builds with the images they made and their commits", async () => {
		const api = devantApi([
			graphqlBy([
				[
					/deploymentStatusByVersion\(versionId: "t1", componentId: "c1"\)/,
					{
						deploymentStatusByVersion: [
							{
								id: 7,
								sourceCommitId: "abc",
								status: "completed",
								conclusion: "success",
								started_at: "s",
								completed_at: "e",
								clusterId: "dp1",
								buildRef: "wf-7",
							},
							{ id: 8, sourceCommitId: "def", status: "in_progress" },
						],
					},
				],
				[
					/deploymentTrackImages\(input: \{ componentId: "c1", id: "t1" \}\)/,
					{ deploymentTrackImages: [{ imageId: "i1", commitHash: "abc", createdAt: "c", updatedAt: "u" }] },
				],
				[
					/commitHistory\(componentId: "c1", branch: "main"\)/,
					{ commitHistory: [{ sha: "abc", message: "fix", author: { name: "Ann", date: "d", email: "ann@x" } }] },
				],
			]),
		]);
		const builds = await getBuilds(api.http, BUILDS_PARAMS);
		assert.deepEqual(builds, [
			{
				apiVersion: "",
				kind: "Build",
				metadata: { name: "7", componentName: "orders", projectName: "" },
				spec: { revision: "abc" },
				status: {
					runId: 7,
					conclusion: "success",
					status: "completed",
					startedAt: "s",
					completedAt: "e",
					gitCommit: { message: "fix", author: "Ann", date: "d", email: "ann@x" },
					clusterId: "dp1",
					buildRef: "wf-7",
					images: [{ id: "i1", createdAt: "c", updatedAt: "u" }],
				},
			},
			{
				apiVersion: "",
				kind: "Build",
				metadata: { name: "8", componentName: "orders", projectName: "" },
				spec: { revision: "def" },
				status: {
					runId: 8,
					conclusion: "",
					status: "in_progress",
					startedAt: "",
					completedAt: "",
					gitCommit: { message: "", author: "", date: "", email: "" },
					clusterId: "",
					buildRef: "",
				},
			},
		]);
	});

	it("asks no images for a git proxy, and takes a failed read as empty", async () => {
		const api = devantApi([graphqlBy([[/deploymentStatusByVersion/, { deploymentStatusByVersion: [{ id: 1, sourceCommitId: "abc" }] }]])]);
		const builds = await getBuilds(api.http, { ...BUILDS_PARAMS, displayType: "gitProxy" });
		assert.equal(builds.length, 1);
		assert.equal(builds[0].status.images, undefined);
		assert.ok(api.queries().every((query) => !query.includes("deploymentTrackImages")));

		const failing = devantApi([{ match: GRAPHQL, status: 500, body: { message: "down" } }]);
		assert.deepEqual(await getBuilds(failing.http, BUILDS_PARAMS), []);
	});

	it("reads a build's logs from the component management service, phase by phase", async () => {
		const api = devantApi([
			{
				match: "GET /component-mgt/1.0.0/orgs/acme/projects/p1/components/c1/runs/7/logs",
				body: {
					success: true,
					data: {
						codeGen: { status: "completed" },
						build: {
							status: "completed",
							log: "built",
							steps: [{ name: "compile", number: 1, status: "completed", conclusion: "success", log: "dropped" }],
						},
						deploy: { status: "queued", steps: [] },
					},
				},
			},
		]);
		const logs = await getBuildLogs(api.http, logParams({ clusterId: "" }));
		assert.deepEqual(logs, {
			init: EMPTY_PHASE,
			build: {
				status: "completed",
				steps: [{ name: "compile", status: "completed", conclusion: "success", number: 1, started_at: "", completed_at: "" }],
				log: "built",
			},
			oasValidation: EMPTY_PHASE,
			governanceCheck: EMPTY_PHASE,
			updateApi: EMPTY_PHASE,
			deploy: { status: "queued", steps: [] },
		});
	});

	it("reads a data plane build's logs from that data plane's logging API", async () => {
		const api = devantApi([
			{ match: "GET /devops/1.0.0/api/v1/clusters/clouddataplanes", body: [{ id: "other", external_gateway_virtual_host: "x.dev" }] },
			{ match: "GET /devops/1.0.0/api/v1/clusters/dataplanes", body: [{ id: "DP1", externalGatewayVirtualHost: "e1.choreoapis.dev" }] },
			{ match: "POST /systemapis/choreologgingapi/0.2.0/logs/component/build", body: { data: { init: { status: "completed", steps: [] } } } },
		]);
		const logs = await getBuildLogs(api.http, logParams({ clusterId: "dp1" }));
		assert.deepEqual(logs.init, { status: "completed", steps: [], log: "" });
		assert.equal(
			api.fake.last("GET /devops/1.0.0/api/v1/clusters/clouddataplanes")?.line,
			"GET /devops/1.0.0/api/v1/clusters/clouddataplanes?org_uuid=uuid-acme",
		);
		assert.equal(api.fake.last("GET /devops/1.0.0/api/v1/clusters/dataplanes")?.line, "GET /devops/1.0.0/api/v1/clusters/dataplanes?org_id=101");
		const request = api.fake.last("POST /systemapis/choreologgingapi/0.2.0/logs/component/build");
		assert.equal(request?.url.host, "5659b6b7-1063-41ed-8e39-d91857699255-systemapis.e1.choreoapis.dev");
		assert.deepEqual(request?.body, { componentId: "c1", deploymentTrackId: "t1", workflowName: "wf-7" });
	});

	it("says so when the build's data plane is unknown", async () => {
		const api = devantApi([
			{ match: "GET /devops/1.0.0/api/v1/clusters/clouddataplanes", body: [] },
			{ match: "GET /devops/1.0.0/api/v1/clusters/dataplanes", body: null },
		]);
		assert.ok((await rejection(getBuildLogs(api.http, logParams({ clusterId: "dp9" })))) instanceof NotFoundError);
	});

	it("reads one type of a build's logs, every other type empty", async () => {
		const api = devantApi([graphqlRoute({ buildLogs: { integrationProjectBuild: "log text" } })]);
		const logs = await getBuildLogsForType(api.http, { orgId: "101", componentId: "c1", logType: "integrationProjectBuild", buildId: 7 });
		assert.match(api.queries()[0], /buildLogs\(componentId: "c1", runId: "7"\) \{ integrationProjectBuild \}/);
		assert.deepEqual(logs, {
			integrationProjectBuild: "log text",
			libraryTrivyReport: "",
			dropinsTrivyReport: "",
			postBuildCheckLogs: "",
			mainSequenceValidation: "",
			mIVersionValidation: "",
			proxyBuildLogs: "",
			governanceLogs: "",
			configValidationLogs: "",
		});
		const error = await rejection(getBuildLogsForType(api.http, { orgId: "101", componentId: "c1", logType: "x } evil { y", buildId: 7 }));
		assert.ok(error instanceof BadRequestError);
		assert.equal(api.queries().length, 1);
	});

	it("reads whether a track builds on commit, empty when Devant answers nothing", async () => {
		const api = devantApi([
			graphqlRoute(
				{ autoBuildTrigger: { success: true, data: { autoBuildId: "ab", autoBuildEnabled: true, componentId: "c1", versionId: "t1", envId: "e1" } } },
				{ autoBuildTrigger: { success: false, data: null } },
			),
		]);
		const params = { orgId: "101", componentId: "c1", versionId: "t1" };
		assert.deepEqual(await getAutoBuildStatus(api.http, params), {
			autoBuildId: "ab",
			autoBuildEnabled: true,
			componentId: "c1",
			versionId: "t1",
			envId: "e1",
		});
		assert.match(api.queries()[0], /autoBuildTrigger\(componentId: "c1", versionId: "t1"\)/);
		assert.deepEqual(await getAutoBuildStatus(api.http, params), {
			autoBuildId: "",
			autoBuildEnabled: false,
			componentId: "",
			versionId: "",
			envId: "",
		});
	});

	it("turns building on commit on and off", async () => {
		const api = devantApi([graphqlRoute({ handleEnableAutoBuild: { success: true, message: "ok" } }, { handleDisableAutoBuild: { success: true } })]);
		const params = { orgId: "101", componentId: "c1", versionId: "t1", envId: "e1" };
		assert.deepEqual(await enableAutoBuildOnCommit(api.http, params), { success: true });
		assert.deepEqual(await disableAutoBuildOnCommit(api.http, params), { success: true });
		const [enable, disable] = api.queries();
		assert.match(enable, /mutation \{ handleEnableAutoBuild\(componentId: "c1", versionId: "t1", envId: "e1"\)/);
		assert.match(disable, /mutation \{ handleDisableAutoBuild\(componentId: "c1", versionId: "t1", envId: "e1"\)/);
	});
});

function logParams(overrides: Partial<GetBuildLogsReq>): GetBuildLogsReq {
	return {
		orgId: "101",
		orgHandler: "acme",
		orgUuid: "uuid-acme",
		componentId: "c1",
		displayType: "byocService",
		projectId: "p1",
		buildId: 7,
		buildRef: "wf-7",
		deploymentTrackId: "t1",
		clusterId: "",
		...overrides,
	};
}
