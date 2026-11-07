import assert from "node:assert/strict";
import {
	type CloudError,
	buildCreateComponentRequest,
	findComponent,
	integrationRuntimeOf,
	integrationTypeOf,
	parseProjectRepository,
} from "../../src";
import { api, harness, rejection } from "../support";

describe("ProjectsApi", () => {
	it("lists one page of projects", async () => {
		const { client } = harness([{ match: "GET /projects", body: { items: [{ id: "orders", name: "Orders" }] } }]);

		const projects = await client.projects.list();

		assert.deepEqual(
			projects.map((p) => p.id),
			["orders"],
		);
	});

	it("creates with only the members given, and retries once on 503", async () => {
		const { client, fake } = harness([
			{
				match: "POST /projects",
				sequence: [
					{ status: 503, body: { error: "incomplete", message: "bindings pending" } },
					{ status: 201, body: { id: "orders", handler: "orders" } },
				],
			},
		]);

		const created = await client.projects.create({ name: "orders", displayName: "Orders" });

		assert.equal(created.id, "orders");
		assert.equal(fake.calls(api("POST /projects")).length, 2);
		assert.deepEqual(fake.last()?.body, { name: "orders", displayName: "Orders" });
	});

	it("reports a 409 as a conflict", async () => {
		const { client } = harness([{ match: "POST /projects", status: 409, body: { error: "Conflict", message: "exists" } }]);

		const error = (await rejection(client.projects.create({ name: "orders" }))) as CloudError;
		assert.equal(error.code, "conflict");
	});

	it("parses a repository URL into the API's link", () => {
		assert.deepEqual(parseProjectRepository("https://github.com/acme/orders.git/"), {
			gitProvider: "github",
			gitOrganization: "acme",
			repository: "orders",
		});
		assert.deepEqual(parseProjectRepository("bitbucket.org/acme/orders"), {
			gitProvider: "bitbucket",
			gitOrganization: "acme",
			repository: "orders",
		});
		assert.throws(() => parseProjectRepository("https://gitlab.example/acme/orders"), /not GitHub or Bitbucket/);
		assert.throws(() => parseProjectRepository("https://github.com/acme"), /organization and a repository/);
	});
});

describe("ComponentsApi", () => {
	it("builds the create body the platform's own tool sends", () => {
		const request = buildCreateComponentRequest({
			projectName: "orders",
			name: "order-api",
			type: "integration-as-api",
			runtime: "wso2-integrator",
			repo: { url: "https://github.com/acme/orders.git", branch: "main", appPath: "/order-api" },
			displayName: "Order API",
			description: "Takes orders",
			autoDeploy: true,
		});

		// The same shape, member for member, as the Go reference client's
		// createRequest and the platform's create_integration tool.
		assert.deepEqual(request, {
			metadata: { name: "order-api", annotations: { "openchoreo.dev/display-name": "Order API", "openchoreo.dev/description": "Takes orders" } },
			spec: {
				owner: { projectName: "orders" },
				componentType: { name: "deployment/integration-as-api" },
				autoBuild: true,
				autoDeploy: true,
				workflow: {
					kind: "ClusterWorkflow",
					name: "ballerina-buildpack-builder",
					parameters: { repository: { url: "https://github.com/acme/orders.git", revision: { branch: "main" }, appPath: "/order-api" } },
				},
			},
		});
	});

	it("refuses a bad name, type, runtime or clone URL before calling", () => {
		const base = {
			projectName: "p",
			name: "ok",
			type: "automation" as const,
			runtime: "dockerfile" as const,
			repo: { url: "https://x/y.git", branch: "main" },
		};
		assert.throws(() => buildCreateComponentRequest({ ...base, name: "Order_API" }), /lowercase/);
		assert.throws(() => buildCreateComponentRequest({ ...base, type: "service" as never }), /not an integration type/);
		assert.throws(() => buildCreateComponentRequest({ ...base, runtime: "java" as never }), /not a runtime/);
		assert.throws(() => buildCreateComponentRequest({ ...base, repo: { url: "http://x/y.git", branch: "main" } }), /https clone URL/);
	});

	it("creates in the project and acts on the name the platform chose", async () => {
		const { client, fake } = harness([
			{ match: "POST /projects/orders/components", status: 201, body: { id: "order-api-2", handler: "order-api-2", warning: "suffixed" } },
		]);

		const created = await client.components.create({
			projectName: "orders",
			name: "order-api",
			type: "mcp-server",
			runtime: "wso2-integrator-mi",
			repo: { url: "https://github.com/acme/orders.git", branch: "main" },
		});

		assert.equal(created.id, "order-api-2");
		assert.equal(created.projectId, "orders");
		assert.equal(created.warning, "suffixed");
		assert.equal(fake.last()?.line, api("POST /projects/orders/components"));
	});

	it("lists a project's integrations, filling the project in", async () => {
		const { client } = harness([
			{
				match: "GET /projects/orders/components",
				body: {
					items: [
						{ id: "a", projectId: "" },
						{ id: "b", projectId: "orders" },
					],
				},
			},
		]);

		const listed = await client.components.list("orders");

		assert.deepEqual(
			listed.map((c) => c.projectId),
			["orders", "orders"],
		);
	});

	it("reads the repository, and reports the platform's 500 for a missing one as not found", async () => {
		const { client, fake } = harness([
			{ match: "GET /components/a/repository", body: { gitProvider: "github", organizationApp: "acme", nameApp: "orders", branch: "main" } },
			{ match: "GET /components/prebuilt/repository", status: 500, body: { error: "Internal", message: "no repository" } },
		]);

		const repo = await client.components.repository("a", "orders");
		assert.equal(repo.branch, "main");
		assert.equal(fake.last()?.line, `${api("GET /components/a/repository")}?projectName=orders`);

		const error = (await rejection(client.components.repository("prebuilt"))) as CloudError;
		assert.equal(error.code, "not_found");
		assert.equal(error.details.reason, "repository_missing");
	});

	it("finds by id first, then by a unique display name", () => {
		const components = [
			{ id: "a", handler: "a", name: "Order API", displayName: "Order API" },
			{ id: "b", handler: "b", name: "Order API", displayName: "Order API" },
			{ id: "c", handler: "c", name: "Billing", displayName: "Billing" },
		] as never[];
		assert.equal(findComponent(components, "b").id, "b");
		assert.equal(findComponent(components, "Billing").id, "c");
		assert.throws(() => findComponent(components, "Order API"), /More than one/);
		assert.throws(() => findComponent(components, "nope"), /No integration/);
	});

	it("reads the type and runtime back in create's words", () => {
		assert.equal(integrationTypeOf({ componentType: "service" }), "integration-as-api");
		assert.equal(integrationTypeOf({ componentType: "aiAgent" }), "ai-agent");
		assert.equal(integrationRuntimeOf({ buildpackType: "BI", isPrebuilt: false }), "wso2-integrator");
		assert.equal(integrationRuntimeOf({ buildpackType: undefined, isPrebuilt: true }), "prebuilt");
	});

	it("deletes with the project as a query member only when given", async () => {
		const { client, fake } = harness([{ match: "DELETE /components/a", status: 204 }]);

		await client.components.delete("a");
		assert.equal(fake.last()?.line, api("DELETE /components/a"));
		await client.components.delete("a", "orders");
		assert.equal(fake.last()?.line, `${api("DELETE /components/a")}?projectName=orders`);
	});
});
