import assert from "node:assert/strict";
import {
	DATABASE_CONNECTION_VARS,
	buildConsoleUrl,
	connectionVarName,
	connectionVarPrefix,
	connectionVarSuffix,
	contextKey,
	integrationTypeFromScope,
	isIntegrationType,
	readContextDocument,
	removeContextEntry,
	runtimeForBuildPack,
	toContextDocument,
	upsertContextEntry,
} from "../../src";

describe("context document", () => {
	it("reads the v2 document and nothing else", () => {
		const v2 = { version: 2, contexts: [{ org: "acme", project: "orders", env: "development", integrations: [{ name: "a", path: "svc/a" }] }] };
		assert.deepEqual(readContextDocument(v2), [{ org: "acme", project: "orders", env: "development", integrations: [{ name: "a", path: "svc/a" }] }]);
		assert.deepEqual(readContextDocument({ version: 2, contexts: [{ org: "acme", project: "orders", local: true }, { org: "acme" }, null, "x"] }), [
			{ org: "acme", project: "orders", local: true },
		]);
		// Only the v2 document is read; lists and single objects from the Choreo-era extensions are not.
		assert.deepEqual(readContextDocument([{ org: "acme", project: "orders" }]), []);
		assert.deepEqual(readContextDocument({ org: "acme", project: "orders" }), []);
		assert.deepEqual(readContextDocument(undefined), []);
	});

	it("drops an integration whose path leaves the repository", () => {
		const paths = ["svc/a", "/etc/passwd", "../outside", "svc/../../outside", "C:\\Windows", "\\\\server\\share", "svc\\..\\..\\x", "svc/..x"];
		const [entry] = readContextDocument({
			version: 2,
			contexts: [{ org: "acme", project: "orders", integrations: paths.map((path, i) => ({ name: `i${i}`, path })) }],
		});
		assert.deepEqual(
			entry.integrations?.map((i) => i.path),
			["svc/a", "svc/..x"],
		);
	});

	it("keys entries so a hyphen in a handle cannot collide", () => {
		assert.notEqual(contextKey({ org: "a-b", project: "c" }), contextKey({ org: "a", project: "b-c" }));
	});

	it("writes a v2 document with nothing empty, in a stable order", () => {
		const document = toContextDocument([{ org: "acme", project: "orders", integrations: [], local: false, env: undefined }]);
		assert.deepEqual(document, { version: 2, contexts: [{ org: "acme", project: "orders" }] });
		assert.deepEqual(Object.keys(toContextDocument([{ org: "a", project: "p", local: true, env: "e" }]).contexts[0]), [
			"org",
			"project",
			"env",
			"local",
		]);
	});

	it("upserts by org and project, clearing local once the project exists", () => {
		const entries = [{ org: "acme", project: "orders", local: true }];
		const updated = upsertContextEntry(entries, { org: "acme", project: "orders", env: "development" });
		assert.deepEqual(updated, [{ org: "acme", project: "orders", env: "development" }]);
		assert.equal("local" in updated[0], false);
		assert.equal(upsertContextEntry(entries, { org: "acme", project: "billing" }).length, 2);
		assert.deepEqual(removeContextEntry(updated, { org: "acme", project: "orders" }), []);
		assert.equal(contextKey({ org: "acme", project: "orders" }), "acme/orders");
	});
});

describe("console links", () => {
	it("builds the organization, project and integration pages under the integration section", () => {
		assert.equal(buildConsoleUrl("https://console.example/"), "https://console.example");
		assert.equal(buildConsoleUrl("https://console.example", { orgHandle: "acme" }), "https://console.example/integration/organizations/acme");
		assert.equal(
			buildConsoleUrl("https://console.example", { orgHandle: "acme", section: "/admin/databases/" }),
			"https://console.example/integration/organizations/acme/admin/databases",
		);
		assert.equal(
			buildConsoleUrl("https://console.example", { orgHandle: "acme", project: "orders" }),
			"https://console.example/integration/organizations/acme/projects/orders",
		);
		assert.equal(
			buildConsoleUrl("https://console.example", { orgHandle: "acme", project: "orders", integration: "order-api" }),
			"https://console.example/integration/organizations/acme/projects/orders/components/order-api/overview",
		);
		assert.equal(
			buildConsoleUrl("https://console.example", { orgHandle: "acme", project: "orders", integration: "order-api", page: "deploy" }),
			"https://console.example/integration/organizations/acme/projects/orders/components/order-api/deploy",
		);
		assert.equal(
			buildConsoleUrl("https://console.example", { orgHandle: "acme", section: "admin/a b", project: "x" }),
			"https://console.example/integration/organizations/acme/admin/a%20b",
		);
		assert.equal(
			buildConsoleUrl("https://console.example", { orgHandle: "acme", project: "orders", integration: "order-api", page: "a?b" }),
			"https://console.example/integration/organizations/acme/projects/orders/components/order-api/a%3Fb",
		);
	});
});

describe("vocabulary", () => {
	it("maps the extensions' scopes to platform types and leaves the unsupported unmapped", () => {
		assert.equal(integrationTypeFromScope("integration-as-api"), "integration-as-api");
		assert.equal(integrationTypeFromScope("mcp-server"), "mcp-server");
		assert.equal(integrationTypeFromScope("workflow"), undefined);
		assert.equal(runtimeForBuildPack("microintegrator"), "wso2-integrator-mi");
		assert.equal(runtimeForBuildPack("ballerina"), "wso2-integrator");
	});
});

describe("connection variables", () => {
	it("prefixes each connection's variables with its name, so two connections never share one", () => {
		assert.equal(connectionVarName("orders-db", DATABASE_CONNECTION_VARS.HostName), "ORDERS_DB_DB_HOST");
		assert.notEqual(connectionVarName("orders", "DB_HOST"), connectionVarName("billing", "DB_HOST"));
		assert.equal(connectionVarPrefix("2nd db"), "C_2ND_DB", "a variable cannot start with a digit");
		assert.equal(connectionVarPrefix("--"), "CONNECTION");
	});

	it("reads a variable back by its suffix, with or without a prefix", () => {
		const suffixes = Object.values(DATABASE_CONNECTION_VARS);
		assert.equal(connectionVarSuffix("ORDERS_DB_PASSWORD", suffixes), "DB_PASSWORD");
		assert.equal(connectionVarSuffix("DB_HOST", suffixes), undefined, "every variable carries its connection's prefix");
		assert.equal(connectionVarSuffix("LOG_LEVEL", suffixes), undefined);
	});
});

describe("vocabulary lookups", () => {
	it("finds only the tables' own keys", () => {
		assert.equal(isIntegrationType("toString"), false);
		assert.equal(isIntegrationType("automation"), true);
		assert.equal(integrationTypeFromScope("constructor"), undefined);
	});
});
