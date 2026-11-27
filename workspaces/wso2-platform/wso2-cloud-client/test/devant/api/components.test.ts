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
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CreateComponentReq } from "@wso2/wso2-platform-core";
import { BadRequestError, ConflictError, NotFoundError, PlanLimitError } from "../../../src";
import {
	changePrebuiltIntegrationRepository,
	createComponent,
	createComponentConfig,
	deleteComponent,
	getBuildPacks,
	getCommits,
	getComponentEndpoints,
	getComponentItem,
	getComponentList,
	getComponentUsage,
	getDeploymentTracks,
	updateCodeServer,
} from "../../../src/devant/api/components";
import { DevantHttp } from "../../../src/devant/api/http";
import type { FakeRoute } from "../../doubles";
import { StaticTokenSource, fakeFetch } from "../../doubles";
import { rejection } from "../../support";
import { US } from "../fake-devant";
import { GRAPHQL, devantApi, graphqlRoute } from "./support";

/** A GraphQL route answering each query by the first pattern it matches. */
function graphqlBy(answers: [RegExp, unknown][]): FakeRoute {
	return {
		match: GRAPHQL,
		respond: (request) => {
			const query = (request.body as { query: string }).query;
			const found = answers.find(([pattern]) => pattern.test(query));
			return found ? { body: { data: found[1] } } : { status: 500, body: { message: `unexpected query ${query}` } };
		},
	};
}

const TRACK = { id: "t1", branch: "main", latest: true };

describe("Devant components", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "devant-components-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it("lists a project's components newest first, each filled in from its own read", async () => {
		const api = devantApi([
			graphqlBy([
				[
					/components\(orgHandler: "acme", projectId: "p1"\)/,
					{
						components: [
							{ id: "c1", name: "old", handler: "old", displayName: "Old", displayType: "byocService", deploymentTracks: [TRACK] },
							{ id: "c2", name: "new", handler: "new", displayName: "New", displayType: "gitProxy", isPrebuilt: true },
							{ id: "c3", name: "gone", handler: "gone", displayName: "Gone", displayType: "byocService" },
						],
					},
				],
				[
					/componentHandler: "old"/,
					{
						component: {
							displayType: "byocService",
							createdAt: "2026-01-01T00:00:00Z",
							repository: {
								gitProvider: "github",
								organizationApp: "acme",
								nameApp: "app",
								byocBuildConfig: { dockerContext: "svc", dockerfilePath: "svc/Dockerfile" },
							},
						},
					},
				],
				[
					/componentHandler: "new"/,
					{
						component: {
							displayType: "gitProxy",
							createdAt: "2026-02-01T00:00:00Z",
							apiVersions: [{ id: "a1", latest: true }],
							repository: { gitProvider: "bitbucket", organizationApp: "acme", nameApp: "proxy", appSubPath: "api", repoCredRef: "cred" },
						},
					},
				],
			]),
		]);
		const list = await getComponentList(api.http, { orgId: "101", orgHandle: "acme", projectId: "p1", projectHandle: "proj" });

		assert.deepEqual(
			list.map((item) => item.metadata.name),
			["new", "old", "gone"],
		);
		const [proxy, service, gone] = list;
		assert.deepEqual(proxy.metadata, {
			name: "new",
			displayName: "New",
			projectName: "",
			description: "",
			id: "c2",
			handler: "new",
			isPrebuilt: true,
		});
		assert.deepEqual(proxy.spec.source, {
			bitbucket: { repository: "https://bitbucket.org/acme/proxy", branch: "", path: "api" },
			secretRef: "cred",
		});
		assert.deepEqual(proxy.apiVersions, [{ id: "a1", latest: true }]);
		assert.deepEqual(service.spec.source, { github: { repository: "https://github.com/acme/app", branch: "", path: "svc" }, secretRef: "" });
		assert.deepEqual(service.spec.build, { docker: { dockerFilePath: "svc/Dockerfile", dockerContextPath: "svc" } });
		assert.deepEqual(service.deploymentTracks, [TRACK]);
		assert.equal(service.createdAt, "2026-01-01T00:00:00Z");
		// The component whose read failed stays as the list gave it.
		assert.deepEqual(gone.spec, {
			type: "byocService",
			subType: "",
			source: { secretRef: "" },
			build: {},
			proxyConfig: { version: "", context: "", endpointUrl: "", accessibility: "" },
		});

		const queries = api.queries();
		assert.equal(queries.length, 4);
		const proxyRead = queries.find((query) => query.includes('componentHandler: "new"'));
		assert.match(proxyRead ?? "", /projectId: "p1"/);
		assert.doesNotMatch(proxyRead ?? "", /byocBuildConfig/);
		assert.match(queries.find((query) => query.includes('componentHandler: "old"')) ?? "", /byocBuildConfig/);
	});

	it("answers an empty list when a project has no components", async () => {
		const api = devantApi([graphqlRoute({ components: null })]);
		assert.deepEqual(await getComponentList(api.http, { orgId: "101", orgHandle: "acme", projectId: "p1", projectHandle: "proj" }), []);
	});

	it("reads a component resource, keeping only what the CLI's model had", async () => {
		const api = devantApi([
			{
				match: "GET /declarative-api/v1.0/core/v1alpha1/projects/proj/components/my%20app",
				body: {
					apiVersion: "core.choreo.dev/v1alpha1",
					kind: "Component",
					metadata: { name: "my-app", id: "c1", extra: 1 },
					spec: { type: "byocService", build: { docker: { dockerFilePath: "Dockerfile" } } },
				},
			},
		]);
		const item = await getComponentItem(api.http, { orgId: "101", projectHandle: "proj", componentName: "my app" });
		assert.deepEqual(item, {
			apiVersion: "core.choreo.dev/v1alpha1",
			kind: "Component",
			metadata: { name: "my-app", displayName: "", projectName: "", description: "", id: "c1" },
			spec: {
				type: "byocService",
				subType: "",
				source: { secretRef: "" },
				build: { docker: { dockerFilePath: "Dockerfile", dockerContextPath: "" } },
				proxyConfig: { version: "", context: "", endpointUrl: "", accessibility: "" },
			},
			originCloud: null,
		});
		assert.equal(api.fake.last()?.url.host, "apis.choreo.dev");
	});

	it("creates a component from a directory of a Git repository and reads it back", async () => {
		await mkdir(join(dir, ".git"));
		await mkdir(join(dir, "services", "orders"), { recursive: true });
		const api = devantApi([
			{
				match: "POST /declarative-api/v1.0/core/v1alpha1/projects/proj/components",
				body: { metadata: { name: "orders-api", displayName: "Orders API", id: "c9" }, spec: { type: "byocService" } },
			},
			graphqlRoute({ component: { displayType: "byocService", createdAt: "2026-03-01T00:00:00Z", deploymentTracks: [TRACK] } }),
		]);
		const created = await createComponent(api.http, createParams(join(dir, "services", "orders")));

		const request = api.fake.last("POST /declarative-api/v1.0/core/v1alpha1/projects/proj/components");
		assert.deepEqual(request?.body, {
			apiVersion: "core.choreo.dev/v1alpha1",
			kind: "Component",
			metadata: { name: "orders-api", displayName: "Orders API", projectName: "proj", description: "" },
			spec: {
				type: "byocService",
				subType: "",
				source: { github: { repository: "https://github.com/acme/orders.git", branch: "main", path: "services/orders" }, secretRef: "" },
				build: {
					docker: { dockerFilePath: "services/orders/Dockerfile", dockerContextPath: "services/orders" },
					enableAutoBuild: true,
					enableAutoDeploy: true,
				},
				proxyConfig: { version: "", context: "", endpointUrl: "", accessibility: "" },
			},
			originCloud: "choreo",
		});
		assert.match(api.queries()[0], /component\(componentHandler: "Orders API!", projectId: "p1"\)/);
		assert.deepEqual(created.metadata, {
			name: "orders-api",
			displayName: "Orders API",
			projectName: "",
			description: "",
			id: "c9",
			handler: "Orders API!",
		});
		assert.deepEqual(created.deploymentTracks, [TRACK]);
		assert.equal(created.createdAt, "2026-03-01T00:00:00Z");
	});

	it("builds a web app's request with its port and a Bitbucket source with its credential", async () => {
		await mkdir(join(dir, ".git"));
		const api = devantApi([
			{
				match: "POST /declarative-api/v1.0/core/v1alpha1/projects/proj/components",
				body: { metadata: { name: "web" }, spec: { type: "buildpackWebApp" } },
			},
			graphqlRoute({ component: null }),
		]);
		const created = await createComponent(api.http, {
			...createParams(dir),
			type: "webApp",
			buildPackLang: "nodejs",
			langVersion: "20",
			gitProvider: "bitbucket",
			gitCredRef: "cred-1",
			port: 3000,
		});
		const spec = (api.fake.last(/^POST \/declarative/)?.body as { spec: Record<string, unknown> }).spec;
		assert.equal(spec.type, "buildpackWebApp");
		assert.deepEqual(spec.source, { bitbucket: { repository: "https://github.com/acme/orders.git", branch: "main", path: "" }, secretRef: "cred-1" });
		assert.deepEqual(spec.build, { buildpack: { language: "nodejs", version: "20", port: 3000 }, enableAutoBuild: true, enableAutoDeploy: true });
		assert.deepEqual(created.deploymentTracks, []);
	});

	it("says the plan's component limit is reached as a plan limit", async () => {
		await mkdir(join(dir, ".git"));
		const api = devantApi([{ match: /^POST /, status: 403, body: { statusCode: "403", message: "Component limit reached for free tier" } }]);
		const error = await rejection(createComponent(api.http, createParams(dir)));
		assert.ok(error instanceof PlanLimitError);
	});

	it("refuses a directory outside a Git repository before calling Devant", async () => {
		const api = devantApi([]);
		const error = await rejection(createComponent(api.http, createParams(dir)));
		assert.ok(error instanceof BadRequestError);
		assert.equal(api.fake.requests.length, 0);
	});

	it("writes a service's component.yaml with its endpoint", async () => {
		const path = await createComponentConfig(devantApi().http, {
			componentDir: dir,
			type: "service",
			inbound: { name: "orders", port: 8080, type: "REST", context: "/orders" },
		});
		assert.equal(path, join(dir, ".choreo", "component.yaml"));
		assert.equal(
			await readFile(path, "utf8"),
			"schemaVersion: 1.2\nendpoints:\n  - name: orders\n    service:\n      basePath: /orders\n      port: 8080\n    type: REST\n",
		);
		await createComponentConfig(devantApi().http, { componentDir: dir, type: "webApp" });
		assert.equal(await readFile(path, "utf8"), "schemaVersion: 1.2\n");
	});

	it("deletes a component, and says why when Devant will not", async () => {
		const api = devantApi([
			graphqlRoute({ deleteComponentV2: { status: "success" } }, { deleteComponentV2: { status: "error", canDelete: false, message: "in use" } }),
		]);
		const params = { orgId: "101", orgHandler: "acme", projectId: "p1", componentId: "c1", componentName: "x" };
		await deleteComponent(api.http, params);
		assert.match(api.queries()[0], /deleteComponentV2\(orgHandler: "acme", componentId: "c1", projectId: "p1"\)/);
		const error = await rejection(deleteComponent(api.http, params));
		assert.ok(error instanceof ConflictError);
		assert.match((error as Error).message, /in use/);
	});

	it("lists build packs without the Ballerina one, as the CLI wrote them", async () => {
		const api = devantApi([
			{
				match: "GET /devops/1.0.0/api/v1/buildpacks",
				body: [
					{ id: "b1", displayName: "Ballerina Buildpack" },
					{
						id: "b2",
						language: "nodejs",
						displayName: "Node",
						isDefault: true,
						buildpackImage: "img",
						builder: { id: "r1" },
						componentTypes: [{ id: "t", type: "service" }],
					},
				],
			},
		]);
		const packs = await getBuildPacks(api.http, { orgId: "101", orgUuid: "uuid-acme", componentType: "service" });
		assert.equal(api.fake.last()?.line, "GET /devops/1.0.0/api/v1/buildpacks?orgUuid=uuid-acme&componentType=service");
		assert.deepEqual(packs, [
			{
				id: "b2",
				language: "nodejs",
				supportedVersions: "",
				displayName: "Node",
				isDefault: true,
				versionEnvVariable: "",
				iconUrl: "",
				provider: "",
				buidpackProviderOrgUuid: "",
				Builder: { id: "r1", builderImage: "", displayName: "", imageHash: "" },
				ComponentTypes: [{ id: "t", displayName: "", type: "service" }],
			},
		]);
	});

	it("reads a component's deployment tracks", async () => {
		const api = devantApi([graphqlRoute({ component: { deploymentTracks: [TRACK] } })]);
		const tracks = await getDeploymentTracks(api.http, { orgId: "101", orgHandler: "acme", projectId: "p1", componentHandle: "orders" });
		assert.deepEqual(tracks, [TRACK]);
		assert.match(api.queries()[0], /component\(componentHandler: "orders", projectId: "p1"\) \{ deploymentTracks/);
	});

	it("reads a branch's commits", async () => {
		const commit = { message: "fix", sha: "abc", isLatest: true, author: { name: "A", date: "d", email: "e", avatarUrl: "" } };
		const api = devantApi([graphqlRoute({ commitHistory: [commit] })]);
		assert.deepEqual(await getCommits(api.http, { orgId: "101", orgHandler: "acme", componentId: "c1", branch: "main" }), [commit]);
		assert.match(api.queries()[0], /commitHistory\(componentId: "c1", branch: "main"\)/);
	});

	it("reads a deployment track's endpoints", async () => {
		const api = devantApi([graphqlRoute({ componentEndpoints: [{ id: "e1", port: 8080 }] })]);
		const endpoints = await getComponentEndpoints(api.http, { orgId: "101", orgHandler: "acme", componentId: "c1", deploymentTrackId: "t1" });
		assert.deepEqual(endpoints, [{ id: "e1", port: 8080 }]);
		assert.match(api.queries()[0], /componentEndpoints\(input: \{ componentId: "c1", versionId: "t1" \}\)/);
	});

	it("reads the organization's component usage for a cloud", async () => {
		const usage = { success: true, message: "", data: { componentCount: 3 } };
		const api = devantApi([{ match: "GET /component-mgt/1.0.0/orgs/uuid-acme/component-limits", body: usage }]);
		assert.deepEqual(await getComponentUsage(api.http, { orgId: "101", orgUuid: "uuid-acme", cloudOrigin: "devant" }), usage);
		assert.equal(api.fake.last()?.line, "GET /component-mgt/1.0.0/orgs/uuid-acme/component-limits?originCloud=devant");
	});

	describe("code server", () => {
		const params = { orgId: "101", orgUuid: "uuid-acme", orgHandle: "acme", projectId: "p1", componentId: "c1", sourceCommitHash: "abc" };
		const REGISTRIES = "GET /devops/1.0.0/api/v1/container-registries";
		const SAMPLES = "GET /devops/1.0.0/api/v1/byoi/components/choreo-sample-images";
		const registry = { id: "r1", host: "choreoanonymouspullable.azurecr.io" };
		const samples = { data: { images: [{ name: "Other" }, { name: "Code Server", image_url: "registry/code-server:1" }] } };

		function codeServerApi(routes: FakeRoute[]) {
			const fake = fakeFetch(routes);
			const claims = { sub: "user-sub", iss: "", client_id: "", ouId: "101", ouName: "Acme", ouHandle: "acme", exp: 0 };
			const http = new DevantHttp({ deployment: () => US, tokenSource: new StaticTokenSource("devant-token", claims), fetch: fake.fetch });
			return { http, fake };
		}

		it("points the code server at a commit for the signed-in person", async () => {
			const { http, fake } = codeServerApi([
				{ match: REGISTRIES, body: { data: [registry] } },
				{ match: SAMPLES, body: samples },
				graphqlRoute({ updateCodeServer: true }),
			]);
			await updateCodeServer(http, params);
			assert.equal(fake.last(REGISTRIES)?.line, `${REGISTRIES}?organization_id=uuid-acme`);
			assert.equal(fake.last(SAMPLES)?.line, `${SAMPLES}?organization_id=uuid-acme&project_id=p1`);
			const query = (fake.last(GRAPHQL)?.body as { query: string }).query;
			assert.match(
				query,
				/updateCodeServer\(input: \{ userId: "user-sub", organizationId: "uuid-acme", projectId: "p1", componentId: "c1", orgHandle: "acme", imageUrl: "registry\/code-server:1", registryId: "r1", sourceCommitHash: "abc" \}\)/,
			);
			assert.equal(fake.calls(/^POST \/devops/).length, 0);
		});

		it("registers the samples registry when the organization has none", async () => {
			const { http, fake } = codeServerApi([
				{ match: REGISTRIES, sequence: [{ body: { data: [] } }, { body: { data: [registry] } }] },
				{ match: "POST /devops/1.0.0/api/v1/container-registries", body: {} },
				{ match: SAMPLES, body: samples },
				graphqlRoute({ updateCodeServer: true }),
			]);
			await updateCodeServer(http, params);
			assert.deepEqual(fake.last("POST /devops/1.0.0/api/v1/container-registries")?.body, {
				name: "Choreo Samples Registry",
				type: "vendor-specific",
				provider: "Azure",
				credential: { host: "choreoanonymouspullable.azurecr.io" },
			});
			assert.match((fake.last(GRAPHQL)?.body as { query: string }).query, /registryId: "r1"/);
		});

		it("says so when Devant offers no code server image", async () => {
			const { http } = codeServerApi([
				{ match: REGISTRIES, body: { data: [registry] } },
				{ match: SAMPLES, body: { data: { images: [] } } },
			]);
			assert.ok((await rejection(updateCodeServer(http, params))) instanceof NotFoundError);
		});
	});

	it("moves a prebuilt integration to the person's repository", async () => {
		const api = devantApi([graphqlRoute({ changePrebuiltIntegrationRepository: true })]);
		await changePrebuiltIntegrationRepository(api.http, {
			orgId: "101",
			orgHandler: "acme",
			projectId: "p1",
			componentId: "c1",
			srcGitRepoUrl: "https://github.com/acme/int",
			repositorySubPath: "flows",
			repositoryBranch: "main",
			secretRef: "",
			originCloud: "devant",
			isPublicRepo: false,
		});
		assert.match(
			api.queries()[0],
			/changePrebuiltIntegrationRepository\(newRepository: \{ orgId: 101, orgHandler: "acme", projectId: "p1", componentId: "c1", srcGitRepoUrl: "https:\/\/github.com\/acme\/int", repositorySubPath: "flows", repositoryType: "UserManagedNonEmpty", repositoryBranch: "main", secretRef: "", isPublicRepo: false, originCloud: "devant" \}\)/,
		);
	});
});

function createParams(componentDir: string): CreateComponentReq {
	return {
		orgId: "101",
		orgUUID: "uuid-acme",
		projectId: "p1",
		projectHandle: "proj",
		name: "Orders API!",
		displayName: "Orders API",
		type: "service",
		componentSubType: "",
		buildPackLang: "docker",
		componentDir,
		repoUrl: "https://github.com/acme/orders.git",
		gitProvider: "github",
		gitCredRef: "",
		branch: "main",
		langVersion: "",
		dockerFile: "services/orders/Dockerfile",
		port: 8080,
		spaBuildCommand: "",
		spaNodeVersion: "",
		spaOutputDir: "",
	};
}
