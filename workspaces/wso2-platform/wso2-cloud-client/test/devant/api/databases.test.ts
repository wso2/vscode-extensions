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
import { ForbiddenError } from "../../../src";
import { getDatabaseAdminCredential, getDatabaseCredentials, getDatabaseServer } from "../../../src/devant/api/databases";
import { rejection } from "../../support";
import { devantApi } from "./support";

const SERVER = "GET /platform-services/v1.0/db-servers/srv-1";

describe("Devant databases", () => {
	it("reads a database server with the fields the CLI kept, empty lists left out", async () => {
		const api = devantApi([
			{
				match: SERVER,
				body: {
					id: "srv-1",
					type: "postgres",
					name: "orders",
					allowed_ips: { mode: "allow_all", allow_list: [] },
					connection_params: { host: "db.example", port: "5432", ssl_required: true },
					nodes: [],
					project_id: "dropped",
					service_plan: { name: "dropped" },
				},
			},
		]);
		const server = await getDatabaseServer(api.http, { orgId: "101", databaseServerId: "srv-1" });
		assert.equal(api.fake.last(SERVER)?.url.host, "apis.choreo.dev");
		assert.deepEqual(server, {
			id: "srv-1",
			type: "postgres",
			name: "orders",
			cloud_provider: "",
			cloud_region: "",
			display_on_marketplace: false,
			is_vector_enabled: false,
			service_plan_id: "",
			created_at: "",
			status: "",
			allowed_ips: { mode: "allow_all" },
			connection_params: { database: "", host: "db.example", password_reset: false, port: "5432", ssl_required: true, user: "" },
			maintenance: { day: "", time: "" },
		});
	});

	it("reads the server's admin user", async () => {
		const api = devantApi([{ match: `${SERVER}/admin-user`, body: { name: "admin", password: "pw", extra: 1 } }]);
		assert.deepEqual(await getDatabaseAdminCredential(api.http, { orgId: "101", databaseServerId: "srv-1" }), { name: "admin", password: "pw" });
	});

	it("says an admin user the session may not see is forbidden", async () => {
		const api = devantApi([{ match: `${SERVER}/admin-user`, status: 403, body: { message: "Forbidden" } }]);
		assert.ok((await rejection(getDatabaseAdminCredential(api.http, { orgId: "101", databaseServerId: "srv-1" }))) instanceof ForbiddenError);
	});

	it("lists the server's credentials", async () => {
		const api = devantApi([
			{ match: `${SERVER}/credentials`, body: [{ id: "cred-1", database_name: "orders", applicable_environments: ["t-dev"], is_super_admin: true }] },
		]);
		assert.deepEqual(await getDatabaseCredentials(api.http, { orgId: "101", databaseServerId: "srv-1" }), [
			{
				applicable_environments: ["t-dev"],
				created_at: "",
				database_name: "orders",
				display_name: "",
				id: "cred-1",
				is_super_admin: true,
				privilege_levels: null,
				updated_at: "",
			},
		]);
		api.fake.route({ match: `${SERVER}/credentials`, body: "null" });
		assert.deepEqual(await getDatabaseCredentials(api.http, { orgId: "101", databaseServerId: "srv-1" }), []);
	});
});
