import assert from "node:assert/strict";
import { type CloudError, buildLogWindow, entryEnvironmentOf, orderByPipeline, resolveEnvironment } from "../../src";
import { api, harness, rejection } from "../support";

const noSleep = { sleep: async () => undefined, intervalMs: 1 };

const twoEnvironments = {
	items: [
		{ id: "development", name: "Development", critical: false },
		{ id: "production", name: "Production", critical: true },
	],
};

describe("BuildsApi", () => {
	it("reports the platform's 500 for an unknown build name as not found", async () => {
		const { client } = harness([{ match: "GET /components/a/builds/nope", status: 500, body: { error: "Internal", message: "unknown" } }]);

		const error = (await rejection(client.builds.get("a", "nope"))) as CloudError;
		assert.equal(error.code, "not_found");
		assert.equal(error.details.reason, "build_unknown");
	});

	it("refuses a short commit before calling, and lowercases a full one", async () => {
		const { client, fake } = harness([{ match: "POST /components/a/builds", status: 201, body: { message: "queued", success: true } }]);

		await assert.rejects(client.builds.trigger("a", { sha: "abc123" }), /full 40-character/);
		await client.builds.trigger("a", { sha: "ABCDEF0123456789ABCDEF0123456789ABCDEF01" });
		assert.deepEqual(fake.last()?.body, { sha: "abcdef0123456789abcdef0123456789abcdef01" });
	});

	it("finds the build it started as the new name and follows it to the end", async () => {
		const progress: string[] = [];
		const { client } = harness([
			{
				match: "GET /components/a/builds",
				sequence: [
					{ body: { items: [{ name: "b1", status: "Succeeded" }] } },
					{ body: { items: [{ name: "b2", status: "Pending" }, { name: "b1" }] } },
				],
			},
			{ match: "POST /components/a/builds", status: 201, body: { message: "queued", success: true } },
			{
				match: "GET /components/a/builds/b2",
				sequence: [{ body: { name: "b2", status: "Running" } }, { body: { name: "b2", status: "Succeeded", image: "registry/a:b2" } }],
			},
		]);

		const build = await client.builds.triggerAndWait("a", { ...noSleep, onProgress: (b) => progress.push(b.status ?? "") });

		assert.equal(build.name, "b2");
		assert.equal(build.image, "registry/a:b2");
		assert.deepEqual(progress, ["Running", "Succeeded"]);
	});

	it("follows the build of the commit it asked for, not another that started meanwhile", async () => {
		const sha = "abcdef0123456789abcdef0123456789abcdef01";
		const { client } = harness([
			{
				match: "GET /components/a/builds",
				sequence: [
					{ body: { items: [{ name: "b1", status: "Succeeded", trigger: "manual" }] } },
					{
						body: {
							items: [
								{ name: "b3", status: "Pending", commit: "1111111111111111111111111111111111111111", trigger: "automatic" },
								{ name: "b2", status: "Pending", commit: sha, trigger: "manual" },
								{ name: "b1", trigger: "manual" },
							],
						},
					},
				],
			},
			{ match: "POST /components/a/builds", status: 201, body: { message: "queued", success: true } },
			{ match: "GET /components/a/builds/b2", body: { name: "b2", status: "Succeeded", image: "registry/a:b2" } },
		]);

		const build = await client.builds.triggerAndWait("a", { ...noSleep, sha: sha.toUpperCase() });

		assert.equal(build.name, "b2");
	});

	it("reports a build that did not succeed", async () => {
		const { client } = harness([
			{ match: "GET /components/a/builds", sequence: [{ body: { items: [] } }, { body: { items: [{ name: "b1" }] } }] },
			{ match: "POST /components/a/builds", status: 201, body: { message: "queued", success: true } },
			{ match: "GET /components/a/builds/b1", body: { name: "b1", status: "Failed" } },
		]);

		const error = (await rejection(client.builds.triggerAndWait("a", noSleep))) as CloudError;
		assert.equal(error.details.reason, "build_failed");
	});

	it("gives up when the build never appears", async () => {
		const { client } = harness([
			{ match: "GET /components/a/builds", body: { items: [] } },
			{ match: "POST /components/a/builds", status: 201, body: { message: "queued", success: true } },
		]);
		let clock = 0;
		const error = (await rejection(
			client.builds.triggerAndWait("a", {
				...noSleep,
				timeoutMs: 10,
				now: () => {
					clock += 4;
					return clock;
				},
			}),
		)) as CloudError;
		assert.equal(error.code, "timeout");
		assert.equal(error.details.reason, "wait_timeout");
	});

	it("widens a build's run for its log window and looks back 30 days without a start", () => {
		const now = new Date("2026-11-05T12:00:00Z");
		const window = buildLogWindow({ startedAt: "2026-11-05T10:00:00Z", completedAt: "2026-11-05T10:10:00Z" }, now);
		assert.equal(window.start.toISOString(), "2026-11-05T09:55:00.000Z");
		assert.equal(window.end.toISOString(), "2026-11-05T10:15:00.000Z");
		assert.equal(buildLogWindow({ startedAt: "2026-11-05T10:00:00Z" }, now).end, now);
		assert.equal(buildLogWindow({}, now).start.toISOString(), "2026-10-06T12:00:00.000Z");
	});
});

describe("environments and pipelines", () => {
	it("resolves by id, then by id or display name ignoring case", () => {
		const envs = twoEnvironments.items as never[];
		assert.equal(resolveEnvironment(envs, "production").id, "production");
		assert.equal(resolveEnvironment(envs, "PRODUCTION").id, "production");
		assert.equal(resolveEnvironment(envs, "Development").id, "development");
		assert.throws(() => resolveEnvironment(envs, "staging"), /Use one of development, production/);
	});

	it("finds the entry of a pipeline and orders environments along it", () => {
		const pipeline = {
			promotionPaths: [
				{ sourceEnvironment: "development", targetEnvironments: ["staging"] },
				{ sourceEnvironment: "staging", targetEnvironments: ["production"] },
			],
		};
		assert.equal(entryEnvironmentOf(pipeline), "development");
		assert.equal(entryEnvironmentOf({ promotionPaths: [] }), undefined);
		const envs = [{ id: "production" }, { id: "sandbox" }, { id: "staging" }, { id: "development" }] as never[];
		assert.deepEqual(
			orderByPipeline(envs, pipeline).map((e: { id: string }) => e.id),
			["development", "staging", "production", "sandbox"],
		);
	});
});

describe("DeploymentsApi", () => {
	const routes = () => [
		{ match: "GET /environments", body: twoEnvironments },
		{ match: "GET /projects/orders", body: { id: "orders", defaultDeploymentPipelineId: "default" } },
		{
			match: "GET /deploymentpipelines/default",
			body: { name: "default", promotionPaths: [{ sourceEnvironment: "development", targetEnvironments: ["production"] }] },
		},
		{ match: "GET /components/a/builds/b2", body: { name: "b2", status: "Succeeded", image: "registry/a:b2" } },
		{ match: "GET /components/a/builds/b1", body: { name: "b1", status: "Failed" } },
		{ match: "POST /components/a/deployments", body: { message: "a-r4" } },
	];

	it("deploys a succeeded build to the pipeline's entry environment", async () => {
		const { client, fake } = harness(routes());

		const result = await client.deployments.deploy("a", { environment: "Development", imageId: "b2", projectName: "orders" });

		assert.equal(result.releaseId, "a-r4");
		assert.equal(result.environment.id, "development");
		assert.equal(fake.last()?.line, `${api("POST /components/a/deployments")}?projectName=orders`);
		assert.deepEqual(fake.last()?.body, { environmentId: "development", imageId: "b2" });
	});

	it("finds the deployment itself when the gateway loses the platform's answer", async () => {
		const { client, fake } = harness([
			...routes().filter((route) => route.match !== "POST /components/a/deployments"),
			{ match: "POST /components/a/deployments", status: 504, body: "upstream request timeout" },
			{
				match: "GET /components/a/deployments?environmentId=development&projectName=orders",
				sequence: [{ body: "" }, { body: "" }, { body: { releaseId: "a-r1", deploymentStatusV2: "IN_PROGRESS", build: { buildId: "b2" } } }],
			},
		]);

		const result = await client.deployments.deploy("a", { environment: "development", imageId: "b2", projectName: "orders", observe: noSleep });

		assert.equal(result.releaseId, "a-r1");
		assert.equal(result.observed, true);
		assert.equal(fake.calls(api("GET /components/a/deployments")).length, 3);
	});

	it("does not take a rollout of another build that merely finishes for the lost deployment", async () => {
		const { client } = harness([
			...routes().filter((route) => route.match !== "POST /components/a/deployments"),
			{ match: "POST /components/a/deployments", status: 504, body: "upstream request timeout" },
			{
				match: "GET /components/a/deployments?environmentId=development&projectName=orders",
				sequence: [
					{ body: { releaseId: "a-r1", deploymentStatusV2: "IN_PROGRESS", build: { buildId: "b1" } } },
					{ body: { releaseId: "a-r1", deploymentStatusV2: "ACTIVE", build: { buildId: "b1" } } },
				],
			},
		]);

		const error = (await rejection(
			client.deployments.deploy("a", { environment: "development", imageId: "b2", projectName: "orders", observe: { ...noSleep, timeoutMs: 3 } }),
		)) as CloudError;

		assert.equal(error.code, "unavailable", "the gateway's error, not a success for b1");
	});

	it("does not go looking after a 502, which is a refusal rather than a lost answer", async () => {
		const { client, fake } = harness([
			...routes().filter((route) => route.match !== "POST /components/a/deployments"),
			{ match: "POST /components/a/deployments", status: 502, body: { error: "Bad Gateway", message: "git integration unavailable" } },
			{ match: "GET /components/a/deployments?environmentId=development&projectName=orders", body: "" },
		]);

		const error = (await rejection(
			client.deployments.deploy("a", { environment: "development", imageId: "b2", projectName: "orders" }),
		)) as CloudError;

		assert.equal(error.code, "unavailable");
		assert.equal(fake.calls(api("GET /components/a/deployments")).length, 1, "only the read before the request");
	});

	it("keeps the gateway's error when no deployment appears after a lost answer", async () => {
		const { client } = harness([
			...routes().filter((route) => route.match !== "POST /components/a/deployments"),
			{ match: "POST /components/a/deployments", status: 504, body: "upstream request timeout" },
			{
				match: "GET /components/a/deployments?environmentId=development&projectName=orders",
				body: { releaseId: "a-r1", deploymentStatusV2: "ACTIVE", build: { buildId: "b1" } },
			},
		]);

		const error = (await rejection(
			client.deployments.deploy("a", { environment: "development", imageId: "b2", projectName: "orders", observe: { ...noSleep, timeoutMs: 3 } }),
		)) as CloudError;

		assert.equal(error.code, "unavailable");
		assert.match(error.message, /upstream request timeout/);
	});

	it("refuses an environment the pipeline does not start at, and a build with no image", async () => {
		const { client, fake } = harness(routes());

		const wrongEnv = (await rejection(client.deployments.deploy("a", { environment: "production", projectName: "orders" }))) as CloudError;
		assert.equal(wrongEnv.details.reason, "not_pipeline_entry");

		const badBuild = (await rejection(
			client.deployments.deploy("a", { environment: "development", imageId: "b1", projectName: "orders" }),
		)) as CloudError;
		assert.equal(badBuild.details.reason, "build_not_deployable");
		assert.equal(fake.calls(api("POST /components/a/deployments")).length, 0);
	});

	it("promotes with the source release and the pipeline looked up", async () => {
		const { client, fake } = harness([
			...routes(),
			{
				match: "GET /components/a/deployments?environmentId=development&projectName=orders",
				body: { releaseId: "a-r3", deploymentStatusV2: "ACTIVE" },
			},
			{ match: "POST /components/a/deployments/promote", body: { message: "a-r3" } },
		]);

		const result = await client.deployments.promote("a", { from: "development", to: "production", projectName: "orders" });

		assert.equal(result.releaseId, "a-r3");
		assert.deepEqual(fake.last()?.body, {
			sourceReleaseId: "a-r3",
			sourceEnvironmentId: "development",
			targetEnvironmentId: "production",
			deploymentPipelineId: "default",
		});
	});

	it("reports nothing deployed, and a hop the pipeline refuses", async () => {
		const { client } = harness([...routes(), { match: "GET /components/a/deployments?environmentId=development&projectName=orders", body: "" }]);
		const nothing = (await rejection(
			client.deployments.promote("a", { from: "development", to: "production", projectName: "orders" }),
		)) as CloudError;
		assert.equal(nothing.details.reason, "not_deployed");

		const refused = harness([
			...routes(),
			{ match: "GET /components/a/deployments?environmentId=development&projectName=orders", body: { releaseId: "a-r3" } },
			{ match: "POST /components/a/deployments/promote", status: 403, body: { error: "Forbidden", message: "no such hop" } },
		]);
		const error = (await rejection(
			refused.client.deployments.promote("a", { from: "development", to: "production", projectName: "orders" }),
		)) as CloudError;
		assert.equal(error.code, "forbidden");
		assert.equal(error.details.reason, "promotion_refused");
	});

	it("stops and redeploys by environment name", async () => {
		const { client, fake } = harness([
			...routes(),
			{ match: "PUT /components/a/deployments/stop", body: { message: "stopped" } },
			{ match: "POST /components/a/deployments/redeploy", body: { message: "redeployed" } },
		]);

		await client.deployments.stop("a", "Production");
		assert.deepEqual(fake.last()?.body, { environment: "production" });
		await client.deployments.redeploy("a", "production");
		assert.equal(fake.last()?.line, `${api("POST /components/a/deployments/redeploy")}?environment=production`);
	});

	it("waits for a rollout to become active, and reports one that errors", async () => {
		const { client } = harness([
			{
				match: "GET /components/a/deployments",
				sequence: [
					{ body: "" },
					{ body: { releaseId: "a-r4", deploymentStatusV2: "IN_PROGRESS" } },
					{ body: { releaseId: "a-r4", deploymentStatusV2: "ACTIVE" } },
				],
			},
		]);
		const active = await client.deployments.waitForRollout("a", "development", { ...noSleep, releaseId: "a-r4" });
		assert.equal(active.deploymentStatusV2, "ACTIVE");

		const failing = harness([{ match: "GET /components/a/deployments", body: { releaseId: "a-r4", deploymentStatusV2: "ERROR" } }]);
		const error = (await rejection(failing.client.deployments.waitForRollout("a", "development", noSleep))) as CloudError;
		assert.equal(error.details.reason, "deployment_failed");

		// A redeploy after a stop reads SUSPENDED until it starts, so it is not a failure there.
		const restarting = harness([
			{
				match: "GET /components/a/deployments",
				sequence: [{ body: { releaseId: "a-r4", deploymentStatusV2: "SUSPENDED" } }, { body: { releaseId: "a-r4", deploymentStatusV2: "ACTIVE" } }],
			},
		]);
		const restarted = await restarting.client.deployments.waitForRollout("a", "development", { ...noSleep, failedOn: ["ERROR"] });
		assert.equal(restarted.deploymentStatusV2, "ACTIVE");
	});

	it("lists every environment with what runs there", async () => {
		const { client } = harness([
			{ match: "GET /environments", body: twoEnvironments },
			{ match: "GET /components/a/deployments?environmentId=development", body: { releaseId: "a-r3", deploymentStatusV2: "ACTIVE" } },
			{ match: "GET /components/a/deployments?environmentId=production", body: "" },
		]);

		const all = await client.deployments.listAll("a");

		assert.deepEqual(
			all.map((e) => [e.environment.id, e.deployment?.releaseId]),
			[
				["development", "a-r3"],
				["production", undefined],
			],
		);
	});
});
