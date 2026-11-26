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
import { BadRequestError, PlanLimitError } from "../../../src";
import { createProject, getEnvs, getProjects, projectHandle, updateProject } from "../../../src/devant/api/projects";
import { rejection } from "../../support";
import { EU } from "../fake-devant";
import { GRAPHQL, devantApi, graphqlRoute } from "./support";

describe("Devant projects", () => {
	it("lists an organization's projects by its numeric id, with the session's token", async () => {
		const api = devantApi([graphqlRoute({ projects: [{ id: "p1", name: "One", orgId: 101 }] })]);
		const projects = await getProjects(api.http, "101");
		assert.deepEqual(projects, [{ id: "p1", name: "One", orgId: 101 }]);
		assert.match(api.queries()[0], /projects\(orgId: 101\)/);
		assert.equal(api.fake.last(GRAPHQL)?.headers.authorization, "Bearer devant-token");
		assert.equal(api.fake.last(GRAPHQL)?.url.host, "apis.choreo.dev");
		await rejection(getProjects(api.http, "101) { id } } #"));
	});

	it("calls the region in use", async () => {
		const api = devantApi([graphqlRoute({ projects: null })], EU);
		assert.deepEqual(await getProjects(api.http, "7"), []);
		assert.equal(api.fake.last(GRAPHQL)?.url.host, "apis.eu.choreo.dev");
	});

	it("creates a project with a handle from its name, and quotes what the person typed", async () => {
		const api = devantApi([graphqlRoute({ createProject: { id: "p2", handler: "my-app" } })]);
		const created = await createProject(api.http, { orgId: "101", orgHandler: "acme", projectName: 'My "App"', region: "US" });
		assert.equal(created.id, "p2");
		const [query] = api.queries();
		assert.match(query, /name: "My \\"App\\""/);
		assert.match(query, /projectHandler: "my-app"/);
		assert.match(query, /orgId: 101, orgHandler: "acme", version: "1.0.0", region: "US"/);
		assert.equal(projectHandle("  Hello_World--2 "), "hello-world-2-");
	});

	it("says the plan's project limit is reached as a plan limit", async () => {
		const api = devantApi([
			{ match: GRAPHQL, status: 403, body: { message: "Forbidden", metadata: { additionalData: "MAX_PROJECT_LIMIT_REACHED" } } },
		]);
		const error = await rejection(createProject(api.http, { orgId: "101", orgHandler: "acme", projectName: "x", region: "US" }));
		assert.ok(error instanceof PlanLimitError);
	});

	it("refuses an answer that carries GraphQL errors", async () => {
		const api = devantApi([{ match: GRAPHQL, body: { data: { updateProject: null }, errors: [{ message: "no such project" }] } }]);
		const error = await rejection(updateProject(api.http, { orgId: "101", projectId: "p1", name: "New" }));
		assert.ok(error instanceof BadRequestError);
		assert.match((error as Error).message, /no such project/);
	});

	it("lists a project's environments", async () => {
		const api = devantApi([graphqlRoute({ environments: [{ id: "e1", name: "Development" }] })]);
		assert.deepEqual(await getEnvs(api.http, { orgId: "101", orgUuid: "uuid-acme", projectId: "p1" }), [{ id: "e1", name: "Development" }]);
		assert.match(api.queries()[0], /environments\(orgUuid: "uuid-acme", projectId: "p1"\)/);
	});
});
