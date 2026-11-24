import assert from "node:assert/strict";
import {
	CLOUD_EDITOR_COMPONENT_ENV,
	CLOUD_EDITOR_COMPONENT_HEADER,
	type CloudError,
	type CreateComponentRequest,
	buildCreateComponentRequest,
	editorComponentHeader,
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

	it("sends an AI agent's LLM providers, MCP servers and tracing choice, and leaves unset ones out", () => {
		const base = {
			projectName: "p",
			name: "task-agent",
			type: "ai-agent" as const,
			runtime: "wso2-integrator" as const,
			repo: { url: "https://github.com/acme/agent.git", branch: "main" },
		};
		const modelConfig = [
			{
				providerName: "openai",
				environmentVariables: [
					{ key: "url", name: "OPENAI_URL" },
					{ key: "apikey", name: "OPENAI_API_KEY" },
				],
			},
		];
		const mcpConfig = [{ proxyName: "deepwiki", environmentVariables: [{ key: "url", name: "DEEPWIKI_MCP_URL" }] }];

		const request = buildCreateComponentRequest({ ...base, modelConfig, mcpConfig });
		assert.deepEqual(request.modelConfig, modelConfig);
		assert.deepEqual(request.mcpConfig, mcpConfig);

		const bare = buildCreateComponentRequest({ ...base, modelConfig: [], mcpConfig: [] });
		assert.equal("modelConfig" in bare, false);
		assert.equal("mcpConfig" in bare, false);
		assert.equal("enableAutoInstrumentation" in bare, false);

		assert.equal(buildCreateComponentRequest({ ...base, autoInstrumentation: true }).enableAutoInstrumentation, true);
		assert.equal("enableAutoInstrumentation" in buildCreateComponentRequest({ ...base, autoInstrumentation: false }), false);
	});

	it("refuses LLM providers, MCP servers or tracing for anything but an AI agent", () => {
		const base = {
			projectName: "p",
			name: "order-api",
			type: "integration-as-api" as const,
			runtime: "wso2-integrator" as const,
			repo: { url: "https://github.com/acme/orders.git", branch: "main" },
		};
		const environmentVariables = [{ key: "url", name: "URL" }];
		assert.throws(
			() => buildCreateComponentRequest({ ...base, modelConfig: [{ providerName: "openai", environmentVariables }] }),
			/only an ai-agent/,
		);
		assert.throws(() => buildCreateComponentRequest({ ...base, mcpConfig: [{ proxyName: "deepwiki", environmentVariables }] }), /only an ai-agent/);
		assert.throws(() => buildCreateComponentRequest({ ...base, autoInstrumentation: true }), /only an ai-agent/);

		const plain = buildCreateComponentRequest({ ...base, modelConfig: [], mcpConfig: [], autoInstrumentation: false });
		assert.equal("enableAutoInstrumentation" in plain, false);
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

describe("RuntimeConfigApi links", () => {
	it("links a configurable to an endpoint of its own project", async () => {
		const { client, fake } = harness([{ match: "PUT /components/consumer/link", body: { workload: "next_deploy" } }]);

		const result = await client.config.putLink("consumer", { configurable: "acme/consumer:ordersUrl", endpoint: "shop/orders/api" }, "shop");

		assert.equal(fake.last()?.line, `${api("PUT /components/consumer/link")}?projectName=shop`);
		assert.deepEqual(fake.last()?.body, { configurable: "acme/consumer:ordersUrl", endpoint: "shop/orders/api" });
		assert.equal(result.workload, "next_deploy");
	});

	it("links a configurable to an output of another project's endpoint", async () => {
		const { client, fake } = harness([{ match: "PUT /components/consumer/link", body: { workload: "unchanged" } }]);

		await client.config.putLink("consumer", { configurable: "acme/consumer:billingKey", endpoint: "finance/billing/api", key: "apiKey" }, "shop");

		assert.deepEqual(fake.last()?.body, { configurable: "acme/consumer:billingKey", endpoint: "finance/billing/api", key: "apiKey" });
	});

	it("lists the endpoints the integration may connect to", async () => {
		const billing = {
			project: "finance",
			component: "billing",
			endpoint: "api",
			displayName: "Billing",
			scope: "organization",
			ref: "finance-billing-api",
			outputs: [
				{ name: "url", secret: false },
				{ name: "apiKey", secret: true },
			],
			environments: [{ name: "development", connectable: true, exposure: "public" }],
		};
		const { client, fake } = harness([{ match: "GET /components/consumer/connectable-services", body: [billing] }]);

		const endpoints = await client.config.listConnectableServices("consumer", "shop");

		assert.equal(fake.last()?.line, `${api("GET /components/consumer/connectable-services")}?projectName=shop`);
		assert.deepEqual(endpoints, [billing]);
	});

	it("passes through where an endpoint can't be connected, and an own project's endpoint with no exposure", async () => {
		const orders = {
			project: "shop",
			component: "orders",
			endpoint: "api",
			displayName: "Orders",
			scope: "project",
			environments: [
				{ name: "development", connectable: true },
				{ name: "production", connectable: false, reason: "not_deployed", detail: "endpoint api of orders is not running in production" },
			],
		};
		const ledger = {
			project: "finance",
			component: "ledger",
			endpoint: "api",
			displayName: "Ledger",
			scope: "organization",
			ref: "finance-ledger-api",
			outputs: [{ name: "url", secret: false }],
			environments: [
				{
					name: "development",
					connectable: false,
					reason: "endpoint_not_internal",
					detail: "endpoint api of ledger is not visible in production",
					exposure: "organization",
				},
				{
					name: "production",
					connectable: false,
					reason: "endpoint_not_internal",
					detail: "endpoint api of ledger is not visible in production",
					exposure: "none",
				},
			],
		};
		const { client } = harness([{ match: "GET /components/consumer/connectable-services", body: [orders, ledger] }]);

		const endpoints = await client.config.listConnectableServices("consumer", "shop");

		assert.deepEqual(endpoints, [orders, ledger]);
		assert.equal(endpoints[0].environments[0].exposure, undefined);
		assert.equal(endpoints[1].environments[0].connectable, false);
		assert.equal(endpoints[1].environments[0].exposure, "organization");
	});

	it("reads an empty connectable list from a null body", async () => {
		const { client } = harness([{ match: "GET /components/consumer/connectable-services", body: null }]);

		assert.deepEqual(await client.config.listConnectableServices("consumer", "shop"), []);
	});

	it("reads which configurables endpoints fill", async () => {
		const { client, fake } = harness([
			{
				match: "GET /components/consumer/links",
				body: { kind: "ballerina", sourceDefined: false, endpointLinks: { "acme/consumer:ordersUrl": "shop/orders/api" } },
			},
		]);

		const links = await client.config.listLinks("consumer", "shop");

		assert.equal(fake.last()?.line, `${api("GET /components/consumer/links")}?projectName=shop`);
		assert.deepEqual(links.endpointLinks, { "acme/consumer:ordersUrl": "shop/orders/api" });
	});
});

describe("naming the cloud editor on a create", () => {
	const request = { metadata: { name: "orders" }, spec: {} } as CreateComponentRequest;

	it("sends the editor's own component name", async () => {
		const { client, fake } = harness([{ match: "POST /projects/shop/components", status: 201, body: { id: "orders" } }]);
		const previous = process.env[CLOUD_EDITOR_COMPONENT_ENV];
		process.env[CLOUD_EDITOR_COMPONENT_ENV] = "code-server-a1b2c3d4e5f6";

		try {
			await client.components.createRaw("shop", request);
		} finally {
			if (previous === undefined) {
				delete process.env[CLOUD_EDITOR_COMPONENT_ENV];
			} else {
				process.env[CLOUD_EDITOR_COMPONENT_ENV] = previous;
			}
		}

		assert.equal(fake.last()?.headers[CLOUD_EDITOR_COMPONENT_HEADER.toLowerCase()], "code-server-a1b2c3d4e5f6");
	});

	// Outside a cloud editor there is no editor to bind, and an empty header
	// would claim there is one.
	it("sends no header when the variable is unset", async () => {
		const { client, fake } = harness([{ match: "POST /projects/shop/components", status: 201, body: { id: "orders" } }]);
		const previous = process.env[CLOUD_EDITOR_COMPONENT_ENV];
		delete process.env[CLOUD_EDITOR_COMPONENT_ENV];

		try {
			await client.components.createRaw("shop", request);
		} finally {
			if (previous !== undefined) {
				process.env[CLOUD_EDITOR_COMPONENT_ENV] = previous;
			}
		}

		assert.equal(fake.last()?.headers[CLOUD_EDITOR_COMPONENT_HEADER.toLowerCase()], undefined);
	});

	it("reads the name from the environment it is given, trimming it", () => {
		assert.deepEqual(editorComponentHeader({ [CLOUD_EDITOR_COMPONENT_ENV]: "  code-server-abc  " }), {
			[CLOUD_EDITOR_COMPONENT_HEADER]: "code-server-abc",
		});
		assert.deepEqual(editorComponentHeader({}), {});
		assert.deepEqual(editorComponentHeader({ [CLOUD_EDITOR_COMPONENT_ENV]: "   " }), {});
	});
});
