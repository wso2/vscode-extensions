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

import type { DatabaseAdminCredential, DatabaseCredential, DatabaseServer, GetDatabaseServerReq } from "@wso2/wso2-platform-core";
import { segment } from "../../api/path";
import type { DevantHttp } from "./http";
import { goBool, goList, goString, record } from "./marketplace";

const PLATFORM_SERVICES = "/platform-services/v1.0";

function serverPath(databaseServerId: string): string {
	return `${PLATFORM_SERVICES}/db-servers/${segment(databaseServerId)}`;
}

/** A database server with the fields, and the omissions, of the CLI's `DatabaseServer`. */
function databaseServer(value: unknown): DatabaseServer {
	const raw = record(value);
	const allowed = record(raw.allowed_ips);
	const allowList = goList(allowed.allow_list, (item) => {
		const entry = record(item);
		return { description: goString(entry.description), network: goString(entry.network) };
	});
	const params = record(raw.connection_params);
	const maintenance = record(raw.maintenance);
	const nodes = goList(raw.nodes, (item) => {
		const node = record(item);
		return { name: goString(node.name), role: goString(node.role), state: goString(node.state) };
	});
	return {
		id: goString(raw.id),
		type: goString(raw.type),
		name: goString(raw.name),
		cloud_provider: goString(raw.cloud_provider),
		cloud_region: goString(raw.cloud_region),
		display_on_marketplace: goBool(raw.display_on_marketplace),
		is_vector_enabled: goBool(raw.is_vector_enabled),
		service_plan_id: goString(raw.service_plan_id),
		created_at: goString(raw.created_at),
		status: goString(raw.status),
		allowed_ips: { ...(allowList?.length ? { allow_list: allowList } : {}), mode: goString(allowed.mode) },
		connection_params: {
			database: goString(params.database),
			host: goString(params.host),
			password_reset: goBool(params.password_reset),
			port: goString(params.port),
			ssl_required: goBool(params.ssl_required),
			user: goString(params.user),
		},
		maintenance: { day: goString(maintenance.day), time: goString(maintenance.time) },
		...(nodes?.length ? { nodes } : {}),
		...(goString(raw.service_version) ? { service_version: raw.service_version } : {}),
	} as unknown as DatabaseServer;
}

export async function getDatabaseServer(http: DevantHttp, params: GetDatabaseServerReq): Promise<DatabaseServer> {
	return databaseServer(await http.rest<unknown>("GET", serverPath(params.databaseServerId)));
}

/** The server's admin user. The answer carries a password. */
export async function getDatabaseAdminCredential(http: DevantHttp, params: GetDatabaseServerReq): Promise<DatabaseAdminCredential> {
	const answer = record(await http.rest<unknown>("GET", `${serverPath(params.databaseServerId)}/admin-user`));
	return { name: goString(answer.name), password: goString(answer.password) };
}

/** The credentials made on the server, for the environments each applies to. */
export async function getDatabaseCredentials(http: DevantHttp, params: GetDatabaseServerReq): Promise<DatabaseCredential[]> {
	const answer = await http.rest<unknown>("GET", `${serverPath(params.databaseServerId)}/credentials`);
	const credentials = goList(answer, (item) => {
		const raw = record(item);
		return {
			applicable_environments: goList(raw.applicable_environments, goString),
			created_at: goString(raw.created_at),
			database_name: goString(raw.database_name),
			display_name: goString(raw.display_name),
			id: goString(raw.id),
			is_super_admin: goBool(raw.is_super_admin),
			privilege_levels: goList(raw.privilege_levels, goString),
			updated_at: goString(raw.updated_at),
		};
	});
	return (credentials ?? []) as DatabaseCredential[];
}
