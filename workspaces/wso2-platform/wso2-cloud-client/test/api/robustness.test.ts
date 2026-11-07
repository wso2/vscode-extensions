import assert from "node:assert/strict";
import { type CloudError, DEPLOY_OBSERVE_MS, HttpClient, buildCreateComponentRequest, componentTypeFor, poll, workflowNameFor } from "../../src";
import { StaticTokenSource } from "../doubles";
import { DEV, api, harness, rejection } from "../support";

describe("input validation", () => {
	it("rejects integration types and runtimes that are only inherited keys", () => {
		for (const key of ["toString", "constructor", "__proto__"]) {
			assert.throws(() => componentTypeFor(key), /is not an integration type/);
			assert.throws(() => workflowNameFor(key), /is not a runtime/);
		}
		assert.throws(
			() =>
				buildCreateComponentRequest({
					projectName: "orders",
					name: "a",
					type: "toString" as never,
					runtime: "wso2-integrator",
					repo: { url: "https://github.com/acme/a", branch: "main" },
				}),
			/is not an integration type/,
		);
	});

	it("validates the runtime of a workflow built for new build parameters", () => {
		const { client } = harness();
		assert.throws(
			() => client.components.workflowFor("constructor" as never, { url: "https://github.com/acme/a", branch: "main" }),
			/is not a runtime/,
		);
		assert.equal(client.components.workflowFor("wso2-integrator", { url: "https://github.com/acme/a", branch: "main" }).kind, "ClusterWorkflow");
	});
});

describe("sparse create answers", () => {
	it("completes an empty answer to a component or project create from the request", async () => {
		const { client } = harness([
			{ match: "POST /projects/orders/components", status: 201 },
			{ match: "POST /projects", status: 201 },
		]);
		const component = await client.components.create({
			projectName: "orders",
			name: "a",
			type: "integration-as-api",
			runtime: "wso2-integrator",
			repo: { url: "https://github.com/acme/a", branch: "main" },
		});
		assert.equal(component.id, "a");
		assert.equal(component.projectId, "orders");
		const project = await client.projects.create({ name: "orders", displayName: "Orders" });
		assert.equal(project.id, "orders");
	});
});

describe("deploy with a lost answer", () => {
	it("does not report an old deployment as new when the read before the request failed", async () => {
		const { client, fake } = harness([
			{ match: "GET /environments", body: { items: [{ id: "development", name: "Development", critical: false }] } },
			{
				match: "GET /components/a/deployments?environmentId=development&projectName=orders",
				sequence: [{ status: 503, body: { message: "busy" } }, { body: { releaseId: "a-old", deploymentStatusV2: "ACTIVE" } }],
			},
			{ match: "POST /components/a/deployments", status: 504, body: "upstream request timeout" },
		]);

		const error = (await rejection(
			client.deployments.deploy("a", { environment: "development", projectName: "orders", allowAnyEnvironment: true }),
		)) as CloudError;

		assert.equal(error.code, "unavailable");
		assert.match(error.message, /upstream request timeout/);
		assert.equal(fake.calls(api("GET /components/a/deployments")).length, 1, "no observation without a baseline");
		assert.ok(DEPLOY_OBSERVE_MS > 0);
	});
});

describe("HttpClient body reads", () => {
	it("reports a body that stalls past the timeout as a timeout", async () => {
		const stalled = (_input: string, init?: RequestInit) => {
			const body = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(new TextEncoder().encode("{"));
					init?.signal?.addEventListener("abort", () => controller.error(new DOMException("aborted", "AbortError")), { once: true });
				},
			});
			return Promise.resolve(new Response(body, { status: 200, headers: { "content-type": "application/json" } }));
		};
		const http = new HttpClient({ baseUrl: DEV.apiBaseUrl, tokenSource: new StaticTokenSource("t0"), fetch: stalled, timeoutMs: 20 });

		const error = (await rejection(http.get("/projects"))) as CloudError;

		assert.equal(error.code, "timeout");
		assert.match(error.message, /did not finish answering/);
	});
});

describe("observability tails", () => {
	it("asks for the newest lines for any tail, capped at the query limit", async () => {
		const { client, fake } = harness([{ match: "POST /api/v1/logs/query", body: { logs: [{ log: "b" }, { log: "a" }], total: 2 } }]);
		const window = { start: new Date("2026-11-05T10:00:00.000Z"), end: new Date("2026-11-05T11:00:00.000Z") };

		const result = await client.observability.query({ project: "orders", component: "a", environment: "development" }, window, { tail: 5000 });

		const body = fake.last()?.body as { limit: number; sortOrder: string };
		assert.equal(body.sortOrder, "desc");
		assert.equal(body.limit, 1000);
		assert.deepEqual(result.lines, ["a", "b"]);
	});
});

describe("poll", () => {
	it("stops at once when the signal was aborted during a check", async () => {
		const controller = new AbortController();
		const started = Date.now();
		const error = (await rejection(
			poll(
				async () => {
					controller.abort();
					return { done: false, value: undefined };
				},
				{ intervalMs: 60_000, signal: controller.signal },
			),
		)) as CloudError;
		assert.equal(error.details.reason, "cancelled");
		assert.ok(Date.now() - started < 1_000, "the interval was not waited out");
	});
});
