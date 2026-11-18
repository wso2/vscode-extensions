import assert from "node:assert/strict";
import type { CloudError } from "../../src";
import { createCloudClient, decodeSchemaContent, inspectGitHubTree, inspectRepoPath, isGitHubAuthRequired, parseGitHubRepoUrl } from "../../src";
import { StaticTokenSource } from "../doubles";
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
			isTruncated: false,
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

	it("decodes a base64 OpenAPI document and leaves plain text alone", () => {
		assert.equal(decodeSchemaContent(Buffer.from("openapi: 3.0.0").toString("base64")), "openapi: 3.0.0");
		assert.equal(decodeSchemaContent('{"openapi":"3.0.0"}'), '{"openapi":"3.0.0"}');
	});
});

describe("GitApi", () => {
	it("lists and connects GitHub App installations", async () => {
		const { client, fake } = harness([
			{ match: "GET /git/github/installations", body: { items: [{ installationId: 7, githubAccount: "acme" }] } },
			{ match: "POST /git/github/installations", status: 201, body: { items: [{ installationId: 7, githubAccount: "acme" }] } },
		]);

		assert.deepEqual(await client.git.listGitHubInstallations(), [{ installationId: 7, githubAccount: "acme" }]);
		assert.equal((await client.git.connectGitHubInstallations("c0de"))[0].githubAccount, "acme");
		assert.deepEqual(fake.last()?.body, { code: "c0de" });
	});

	it("connects with the PKCE verifier of a code authorized with a challenge", async () => {
		const { client, fake } = harness([{ match: "POST /git/github/installations", status: 201, body: { items: [] } }]);

		await client.git.connectGitHubInstallations("c0de", "the-verifier");
		assert.deepEqual(fake.last()?.body, { code: "c0de", codeVerifier: "the-verifier" });
	});

	it("reports a GitHub user with no installation as a conflict", async () => {
		const { client } = harness([
			{ match: "POST /git/github/installations", status: 409, body: { error: "no accessible GitHub App installations; install the app first" } },
		]);

		const err = (await rejection(client.git.connectGitHubInstallations("c0de"))) as CloudError;
		assert.equal(err.code, "conflict");
	});

	it("reads branches and the tree through an installation", async () => {
		const { client, fake } = harness([
			{ match: "GET /git/github/branches", body: { items: ["main"] } },
			{
				match: "GET /git/github/tree",
				body: {
					items: [
						{ path: "svc", type: "tree" },
						{ path: "svc/Ballerina.toml", type: "blob" },
					],
					truncated: true,
				},
			},
		]);

		assert.deepEqual(await client.git.listGitHubBranches(7, "acme", "orders"), ["main"]);
		assert.ok(fake.last()?.line.endsWith("/git/github/branches?installationId=7&owner=acme&repo=orders"));
		const inspection = await client.git.inspectGitHubPath(7, "acme", "orders", "main", "svc");
		assert.equal(inspection.hasBallerinaToml, true);
		assert.equal(inspection.isTruncated, true, "the client passes the tree's truncation on");
		assert.ok(fake.last()?.line.endsWith("/git/github/tree?installationId=7&owner=acme&repo=orders&branch=main"));
	});

	it("cancels a tree read whose signal aborted before it was sent", async () => {
		const hanging: typeof fetch = (_input, init) =>
			new Promise((_resolve, reject) => {
				const abort = () => reject(new DOMException("aborted", "AbortError"));
				if (init?.signal?.aborted) {
					abort();
				}
				init?.signal?.addEventListener("abort", abort);
			});
		const client = createCloudClient({ environment: DEV, tokenSource: new StaticTokenSource("t0"), fetch: hanging });
		const controller = new AbortController();

		const call = rejection(client.git.inspectGitHubPath(7, "acme", "orders", "main", "svc", controller.signal));
		controller.abort();
		const error = (await call) as CloudError;
		assert.equal(error.details.reason, "cancelled");
	});

	it("cancels a tree read that is already in flight", async () => {
		let started: () => void = () => undefined;
		const inFlight = new Promise<void>((resolve) => {
			started = resolve;
		});
		const hanging: typeof fetch = (_input, init) =>
			new Promise((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
				started();
			});
		const client = createCloudClient({ environment: DEV, tokenSource: new StaticTokenSource("t0"), fetch: hanging });
		const controller = new AbortController();

		const call = rejection(client.git.inspectGitHubPath(7, "acme", "orders", "main", "svc", controller.signal));
		await inFlight;
		controller.abort();
		const error = (await call) as CloudError;
		assert.equal(error.details.reason, "cancelled");
	});

	it("lists the repositories an installation was given, and tells an expired GitHub authorization apart", async () => {
		const repo = { fullName: "acme/orders", name: "orders", owner: "acme", private: true, defaultBranch: "main" };
		const { client, fake } = harness([{ match: "GET /git/github/repos", body: { items: [repo] } }]);
		assert.deepEqual(await client.git.listGitHubRepos(7), [repo]);
		assert.ok(fake.last()?.line.endsWith("/git/github/repos?installationId=7"));

		const expired = harness([{ match: "GET /git/github/repos", status: 409, body: { error: "github-auth-required" } }]);
		assert.equal(isGitHubAuthRequired(await rejection(expired.client.git.listGitHubRepos(7))), true);
		const conflict = harness([{ match: "POST /git/github/installations", status: 409, body: { error: "no accessible GitHub App installations" } }]);
		assert.equal(isGitHubAuthRequired(await rejection(conflict.client.git.connectGitHubInstallations("c0de"))), false);
		assert.equal(isGitHubAuthRequired({ cloudError: true, code: "conflict" }), false, "a cloud error without details is no match");
	});

	it("unbinds an integration's source", async () => {
		const { client, fake } = harness([{ match: "DELETE /git/github/sources/shop/orders", status: 204 }]);

		await client.git.deleteGitHubSource("shop", "orders");
		assert.ok(fake.last()?.line.endsWith("/git/github/sources/shop/orders"));
	});

	it("binds an integration's source", async () => {
		const { client, fake } = harness([{ match: "PUT /git/github/sources/shop/orders", status: 204 }]);

		await client.git.putGitHubSource("shop", "orders", { installationId: 7, owner: "acme", repo: "orders", branch: "main", appPath: "svc" });
		assert.deepEqual(fake.last()?.body, { installationId: 7, owner: "acme", repo: "orders", branch: "main", appPath: "svc" });
	});

	it("inspects a path in a flat tree", () => {
		const tree = [
			{ path: "README.md", type: "blob" },
			{ path: "svc", type: "tree" },
			{ path: "svc/Ballerina.toml", type: "blob" },
			{ path: "svc/modules", type: "tree" },
			{ path: "svc/modules/a.bal", type: "blob" },
			{ path: "empty", type: "tree" },
		];
		assert.deepEqual(inspectGitHubTree(tree, "/svc/"), {
			isBareRepo: false,
			isSubPathValid: true,
			isSubPathEmpty: false,
			isTruncated: false,
			hasBallerinaToml: true,
			hasPomXml: false,
			hasDockerfile: false,
		});
		assert.equal(inspectGitHubTree(tree, "").hasBallerinaToml, false);
		assert.equal(inspectGitHubTree(tree, "empty").isSubPathEmpty, true);
		assert.equal(inspectGitHubTree(tree, "missing").isSubPathValid, false);
		assert.equal(inspectGitHubTree([], "").isBareRepo, true);
		assert.equal(inspectGitHubTree([], "deep/path", true).isSubPathValid, true, "a truncated tree does not prove the path missing");
		assert.equal(inspectGitHubTree([{ path: "svc", type: "blob" }], "svc", true).isSubPathValid, false, "a file is no directory, truncated or not");
		assert.equal(
			inspectGitHubTree([{ path: "svc", type: "tree" }], "svc", true).isSubPathEmpty,
			false,
			"a truncated tree may leave the children out",
		);
		assert.equal(inspectGitHubTree([{ path: "svc/main.bal", type: "blob" }], "svc", true).isSubPathValid, true, "children prove the directory");
		assert.equal(inspectGitHubTree([{ path: "svc/main.bal", type: "blob" }], "svc", true).isTruncated, true, "a truncated tree says so");
		assert.equal(
			inspectGitHubTree([{ path: "svc", type: "blob" }], "svc/app", true).isSubPathValid,
			false,
			"a file on the way proves the path missing",
		);
		assert.equal(
			inspectGitHubTree([{ path: "svc-x", type: "blob" }], "svc/app", true).isSubPathValid,
			true,
			"ancestors match on whole segments only",
		);
		assert.equal(inspectGitHubTree(tree, "svc").isTruncated, false);
		assert.equal(inspectGitHubTree(tree, "svc//modules/").isSubPathValid, true, "empty segments are dropped, as inspectRepoPath does");
		assert.equal(inspectGitHubTree(tree, "//svc//modules").isSubPathEmpty, false);
		const dirs = [
			{ path: "svc/Dockerfile", type: "tree" },
			{ path: "svc/Ballerina.toml", type: "tree" },
			{ path: "svc/pom.xml", type: "tree" },
		];
		assert.deepEqual(
			inspectGitHubTree(dirs, "svc"),
			{
				isBareRepo: false,
				isSubPathValid: true,
				isSubPathEmpty: false,
				isTruncated: false,
				hasBallerinaToml: false,
				hasPomXml: false,
				hasDockerfile: false,
			},
			"directories named like project files are not project files",
		);
	});
});
