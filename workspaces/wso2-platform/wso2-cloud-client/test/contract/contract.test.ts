import assert from "node:assert/strict";
import {
	buildConsoleUrl,
	contextKey,
	integrationTypeFromScope,
	readContextDocument,
	removeContextEntry,
	runtimeForBuildPack,
	toContextDocument,
	upsertContextEntry,
} from "../../src";

describe("context document", () => {
	it("reads the v2 document, the v1 list and the oldest single object", () => {
		const v2 = { version: 2, contexts: [{ org: "acme", project: "orders", env: "development", integrations: [{ name: "a", path: "svc/a" }] }] };
		assert.deepEqual(readContextDocument(v2), [{ org: "acme", project: "orders", env: "development", integrations: [{ name: "a", path: "svc/a" }] }]);
		assert.deepEqual(readContextDocument([{ org: "acme", project: "orders", local: true }]), [{ org: "acme", project: "orders", local: true }]);
		assert.deepEqual(readContextDocument({ org: "acme", project: "orders" }), [{ org: "acme", project: "orders" }]);
		assert.deepEqual(readContextDocument([{ org: "acme" }, null, "x"]), []);
		assert.deepEqual(readContextDocument(undefined), []);
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
		assert.deepEqual(updated, [{ org: "acme", project: "orders", env: "development", local: undefined }]);
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
