import assert from "node:assert/strict";
import { type CloudError, HttpClient, NetworkError, isCloudError } from "../../src";
import { StaticTokenSource, fakeFetch } from "../doubles";
import { api, harness, rejection } from "../support";

describe("HttpClient", () => {
	it("presents the bearer token and the JSON headers", async () => {
		const { client, fake } = harness([{ match: "GET /projects", body: { items: [] } }]);

		await client.projects.list();

		const request = fake.last();
		assert.equal(request?.headers.authorization, "Bearer t0");
		assert.equal(request?.headers.accept, "application/json");
		assert.equal(request?.headers["content-type"], undefined);
	});

	it("does not follow a redirect, and refuses an answer that is too large", async () => {
		const { client } = harness([
			{ match: "GET /projects", status: 302, headers: { location: "https://elsewhere.example.invalid/" } },
			{ match: "GET /environments", status: 200, body: "{}", headers: { "content-length": String(9 << 20) } },
		]);

		const redirected = (await rejection(client.projects.list())) as CloudError;
		assert.equal(redirected.code, "server");
		assert.match(redirected.message, /redirect/);

		const oversized = (await rejection(client.environments.list())) as CloudError;
		assert.equal(oversized.code, "network");
		assert.match(oversized.message, /more than 8 MiB/);
	});

	it("does not end the session over a 401 a pass-through route relays from upstream", async () => {
		let unauthenticated = 0;
		const { client, fake } = harness(
			[
				{ match: "GET /git/github/sources/p/c", status: 401, body: { message: "token audience not in allowed set" } },
				{ match: "POST /api/v1/logs/query", status: 401, body: { message: "unauthorized" } },
			],
			{ onUnauthenticated: () => unauthenticated++ },
		);

		const git = (await rejection(client.git.raw("GET", "github/sources/p/c"))) as CloudError;
		assert.equal(git.code, "unauthenticated");
		assert.equal(fake.calls(/\/git\//).length, 1, "a new token cannot change git-app-service's allowlist, so it is not retried");
		const logs = (await rejection(
			client.observability.query(
				{ project: "orders", component: "a", environment: "development" },
				{ start: new Date("2026-11-05T10:00:00.000Z"), end: new Date("2026-11-05T11:00:00.000Z") },
			),
		)) as CloudError;
		assert.equal(logs.code, "unauthenticated");
		assert.equal(unauthenticated, 0, "the platform's own routes decide that, not a proxy");
	});

	it("retries a 401 exactly once with a refreshed token, then reports it", async () => {
		let unauthenticated = 0;
		const { client, fake, tokens } = harness(
			[
				{
					match: "GET /projects",
					sequence: [{ status: 401, body: { error: "Unauthorized", message: "expired" } }, { body: { items: [{ id: "p" }] } }],
				},
			],
			{ onUnauthenticated: () => unauthenticated++ },
		);
		tokens.rotate("t1");

		const projects = await client.projects.list();

		assert.equal(projects.length, 1);
		assert.deepEqual(
			tokens.requests.map((r) => r.forceRefresh ?? false),
			[false, true],
		);
		assert.equal(fake.calls(api("GET /projects")).length, 2);
		assert.equal(unauthenticated, 0);

		fake.route({ match: api("GET /projects"), status: 401, body: { error: "Unauthorized", message: "revoked" } });
		const error = (await rejection(client.projects.list())) as CloudError;
		assert.equal(error.code, "unauthenticated");
		assert.equal(error.details.reason, "rejected");
		assert.equal(unauthenticated, 1);
	});

	it("maps each status to its error class", async () => {
		const cases: [number, string][] = [
			[400, "bad_request"],
			[402, "plan_limit"],
			[403, "forbidden"],
			[404, "not_found"],
			[409, "conflict"],
			[429, "rate_limited"],
			[500, "server"],
			[502, "unavailable"],
			[503, "unavailable"],
		];
		for (const [status, code] of cases) {
			const { client } = harness([
				{ match: "GET /projects", status, body: { error: "E", message: "the platform's words" }, headers: { "retry-after": "7" } },
			]);
			const error = (await rejection(client.projects.list())) as CloudError;
			assert.equal(error.code, code, `status ${status}`);
			assert.equal(error.details.status, status);
			assert.equal(error.details.apiMessage, "the platform's words");
			assert.ok(error.message.includes("the platform's words"), error.message);
			if (status === 429) {
				assert.equal(error.details.retryAfterSeconds, 7);
			}
		}
	});

	it("keeps only the start of an error body that is not the API's JSON", async () => {
		const page = `<html><body>${"Bad gateway. ".repeat(5000)}</body></html>`;
		const { client } = harness([{ match: "GET /projects", status: 502, body: page, headers: { "content-type": "text/html" } }]);

		const error = (await rejection(client.projects.list())) as CloudError;

		assert.equal(error.code, "unavailable");
		assert.ok(error.message.length < 500, `${error.message.length} characters`);
		assert.ok(error.message.includes("<html><body>Bad gateway."));
	});

	it("reads an empty 2xx body as undefined", async () => {
		const { client } = harness([{ match: "GET /components/x/deployments", status: 200, body: "" }]);

		assert.equal(await client.deployments.get("x", "development"), undefined);
	});

	it("reports an unreachable host as a network error", async () => {
		const { client } = harness([{ match: "GET /projects", throws: new TypeError("fetch failed") }]);

		const error = (await rejection(client.projects.list())) as CloudError;
		assert.equal(error.code, "network");
		assert.equal(error.details.retryable, true);
	});

	it("reports a call that outlives its timeout", async () => {
		const never = fakeFetch([]);
		const hanging: typeof never.fetch = (_input, init) =>
			new Promise((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
			});
		const http = new HttpClient({ baseUrl: "https://api.example.invalid", tokenSource: new StaticTokenSource("t"), fetch: hanging, timeoutMs: 20 });

		const error = (await rejection(http.get("/slow"))) as CloudError;
		assert.equal(error.code, "timeout");
	});

	it("reports a caller's cancel as a cancel that is not retried", async () => {
		const never = fakeFetch([]);
		const hanging: typeof never.fetch = (_input, init) =>
			new Promise((_resolve, reject) => {
				const abort = () => reject(new DOMException("aborted", "AbortError"));
				if (init?.signal?.aborted) {
					abort();
				}
				init?.signal?.addEventListener("abort", abort);
			});
		const http = new HttpClient({
			baseUrl: "https://api.example.invalid",
			tokenSource: new StaticTokenSource("t"),
			fetch: hanging,
			timeoutMs: 5_000,
		});
		const controller = new AbortController();

		const call = rejection(http.get("/slow", { signal: controller.signal }));
		controller.abort();
		const error = (await call) as CloudError;
		assert.equal(error.code, "timeout");
		assert.equal(error.details.reason, "cancelled");
		assert.equal(error.details.retryable, false);
	});

	it("leaves undefined query members out and encodes the rest", async () => {
		const { client, fake } = harness([{ match: "GET /components", body: { items: [] } }]);

		await client.http.get("/components", { query: { projectName: "a b", other: undefined } });

		assert.equal(fake.last()?.line, `${api("GET /components")}?projectName=a+b`);
	});

	it("marks errors structurally so they survive a bundle boundary", async () => {
		const { client } = harness([{ match: "GET /projects", status: 404, body: { error: "Not Found", message: "" } }]);
		const error = await rejection(client.projects.list());
		const copy = JSON.parse(JSON.stringify(error));
		assert.ok(isCloudError(copy));
		assert.equal(copy.code, "not_found");
		assert.ok(!(copy instanceof NetworkError));
	});
});
