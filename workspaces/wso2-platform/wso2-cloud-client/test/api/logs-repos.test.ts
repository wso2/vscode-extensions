import assert from "node:assert/strict";
import { decodeSchemaContent, inspectGitHubTree, inspectRepoPath, isGitHubAuthRequired, parseGitHubRepoUrl } from "../../src";
import { DEV, harness, rejection } from "../support";

const obs = new URL(DEV.observabilityBaseUrl).pathname;

describe("ObservabilityApi", () => {
	it("queries the proxy with an empty namespace and the window, oldest first", async () => {
		const { client, fake } = harness([
			{
				match: "POST /api/v1/logs/query",
				body: {
					logs: [
						{ timestamp: "t1", log: "one\n" },
						{ timestamp: "t2", log: "two" },
					],
					total: 2,
				},
			},
		]);

		const result = await client.observability.query(
			{ project: "orders", component: "a", environment: "development" },
			{ start: new Date("2026-11-05T10:00:00.000Z"), end: new Date("2026-11-05T11:00:00.000Z") },
		);

		assert.equal(fake.last()?.line, `POST ${obs}/api/v1/logs/query`);
		assert.equal(fake.last()?.headers.authorization, "Bearer t0");
		assert.deepEqual(fake.last()?.body, {
			searchScope: { namespace: "", project: "orders", component: "a", environment: "development" },
			startTime: "2026-11-05T10:00:00Z",
			endTime: "2026-11-05T11:00:00Z",
			limit: 1000,
			sortOrder: "asc",
		});
		assert.deepEqual(result, { lines: ["t1 one", "t2 two"], total: 2 });
	});

	it("asks for the newest lines first for a tail and puts them back in order", async () => {
		const { client, fake } = harness([
			{
				match: "POST /api/v1/logs/query",
				body: {
					logs: [
						{ timestamp: "t3", log: "three" },
						{ timestamp: "t2", log: "two" },
					],
					total: 3,
				},
			},
		]);

		const result = await client.observability.buildLogs(
			{ name: "b1", startedAt: "2026-11-05T10:00:00Z" },
			{ tail: 2, now: new Date("2026-11-05T10:30:00Z") },
		);

		const body = fake.last()?.body as { limit: number; sortOrder: string; searchScope: unknown };
		assert.equal(body.limit, 2);
		assert.equal(body.sortOrder, "desc");
		assert.deepEqual(body.searchScope, { namespace: "", workflowRunName: "b1" });
		assert.deepEqual(result.lines, ["t2 two", "t3 three"]);
		assert.equal(result.total, 3);
	});

	it("reads runtime logs over the last `since`", async () => {
		const { client, fake } = harness([{ match: "POST /api/v1/logs/query", body: { logs: [], total: 0 } }]);

		await client.observability.runtimeLogs({ project: "p", component: "c", environment: "e" }, 15 * 60_000, {
			now: new Date("2026-11-05T10:30:00.400Z"),
		});

		const body = fake.last()?.body as { startTime: string; endTime: string };
		assert.equal(body.startTime, "2026-11-05T10:15:00Z");
		assert.equal(body.endTime, "2026-11-05T10:30:00Z");
	});
});

describe("ReposApi", () => {
	it("parses GitHub URLs", () => {
		assert.deepEqual(parseGitHubRepoUrl("https://github.com/acme/orders.git"), { owner: "acme", repo: "orders" });
		assert.deepEqual(parseGitHubRepoUrl("git@github.com:acme/orders.git"), { owner: "acme", repo: "orders" });
		assert.equal(parseGitHubRepoUrl("https://gitlab.com/acme/orders"), undefined);
	});

	it("inspects a path in the tree", () => {
		const tree = [
			{ path: "README.md", subPath: "README.md", type: "file" },
			{ path: "svc", subPath: "svc", type: "dir", children: [{ path: "svc/Ballerina.toml", subPath: "svc/Ballerina.toml", type: "file" }] },
			{ path: "empty", subPath: "empty", type: "dir", children: [] },
		];
		assert.deepEqual(inspectRepoPath(tree, "/svc/"), {
			isBareRepo: false,
			isSubPathValid: true,
			isSubPathEmpty: false,
			hasBallerinaToml: true,
			hasPomXml: false,
			hasDockerfile: false,
		});
		assert.equal(inspectRepoPath(tree, "empty").isSubPathEmpty, true);
		assert.equal(inspectRepoPath(tree, "missing").isSubPathValid, false);
		assert.equal(inspectRepoPath([], "").isBareRepo, true);
		assert.equal(inspectRepoPath([], "").isSubPathValid, true);
	});

	it("lists branches and reads the tree with the branch", async () => {
		const { client, fake } = harness([
			{ match: "GET /repos/acme/orders/branches", body: { items: [{ name: "main", isDefault: true }] } },
			{ match: "GET /repos/acme/orders/contents", body: { items: [] } },
		]);

		assert.equal((await client.repos.listBranches("acme", "orders"))[0].name, "main");
		await client.repos.getTree("acme", "orders", "dev");
		assert.ok(fake.last()?.line.endsWith("/repos/acme/orders/contents?branch=dev"));
	});

	it("inspects a path in the GitHub App's flat tree", () => {
		const tree = {
			entries: [
				{ path: "README.md", type: "blob" },
				{ path: "svc", type: "tree" },
				{ path: "svc/Ballerina.toml", type: "blob" },
				{ path: "svc/modules/db.bal", type: "blob" },
				{ path: "empty", type: "tree" },
			],
			truncated: false,
		};
		assert.deepEqual(inspectGitHubTree(tree, "/svc/"), {
			isBareRepo: false,
			isSubPathValid: true,
			isSubPathEmpty: false,
			hasBallerinaToml: true,
			hasPomXml: false,
			hasDockerfile: false,
		});
		assert.equal(inspectGitHubTree(tree, "empty").isSubPathEmpty, true);
		assert.equal(inspectGitHubTree(tree, "sv").isSubPathValid, false);
		assert.equal(inspectGitHubTree({ entries: [], truncated: false }, "").isBareRepo, true);
		assert.equal(inspectGitHubTree({ entries: [], truncated: false }, "").isSubPathValid, true);
	});

	it("does not report a path missing from a truncated GitHub tree as empty", () => {
		const inspection = inspectGitHubTree({ entries: [{ path: "README.md", type: "blob" }], truncated: true }, "svc");
		assert.equal(inspection.isSubPathValid, true);
		assert.equal(inspection.isSubPathEmpty, false);
		assert.equal(inspectGitHubTree({ entries: [], truncated: true }, "").isBareRepo, false);
	});

	it("decodes a base64 OpenAPI document and leaves plain text alone", () => {
		assert.equal(decodeSchemaContent(Buffer.from("openapi: 3.0.0").toString("base64")), "openapi: 3.0.0");
		assert.equal(decodeSchemaContent('{"openapi":"3.0.0"}'), '{"openapi":"3.0.0"}');
	});
});

describe("GitProxyApi", () => {
	it("reads the GitHub App's installations, repositories, branches and tree with their query", async () => {
		const orders = { fullName: "acme/orders", owner: "acme", name: "orders", private: true, defaultBranch: "main" };
		const { client, fake } = harness([
			{ match: "GET /git/github/installations", body: { items: [{ installationId: 7, githubAccount: "acme" }] } },
			{ match: /^GET \S+\/git\/github\/repos\?installationId=7$/, body: { items: [orders] } },
			{ match: /^GET \S+\/git\/github\/branches\?/, body: { items: ["main"] } },
			{ match: /^GET \S+\/git\/github\/tree\?/, body: { items: [{ path: "svc", type: "tree" }], truncated: false } },
		]);

		assert.deepEqual(await client.git.listGitHubInstallations(), [{ installationId: 7, githubAccount: "acme" }]);
		assert.deepEqual(await client.git.listGitHubRepos(7), [orders]);
		assert.deepEqual(await client.git.listGitHubBranches(7, "acme", "orders"), ["main"]);
		assert.ok(fake.last()?.line.endsWith("/git/github/branches?installationId=7&owner=acme&repo=orders"));
		assert.deepEqual(await client.git.listGitHubTree(7, "acme", "orders", "main"), { entries: [{ path: "svc", type: "tree" }], truncated: false });
	});

	it("binds installations with the authorization code alone", async () => {
		const { client, fake } = harness([
			{ match: "POST /git/github/installations", status: 201, body: { items: [{ installationId: 7, githubAccount: "acme" }] } },
		]);

		assert.equal((await client.git.bindGitHubInstallations("c0de"))[0].githubAccount, "acme");
		assert.deepEqual(fake.last()?.body, { code: "c0de" });
	});

	it("tells a missing GitHub authorization from other conflicts", async () => {
		const { client } = harness([
			{ match: /^GET \S+\/git\/github\/branches\?.*repo=orders/, status: 409, body: { success: false, error: "github-auth-required" } },
			{ match: /^GET \S+\/git\/github\/branches\?.*repo=other/, status: 409, body: { error: "installation-shared-with-other-org" } },
		]);

		assert.equal(isGitHubAuthRequired(await rejection(client.git.listGitHubBranches(7, "acme", "orders"))), true);
		assert.equal(isGitHubAuthRequired(await rejection(client.git.listGitHubBranches(7, "acme", "other"))), false);
	});
});
