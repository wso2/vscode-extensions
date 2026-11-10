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

import type { HttpClient } from "./http";
import { segment } from "./path";
import type { Schemas } from "./schema";
import { itemsOf } from "./schema";

export type DbServer = Schemas["DatabaseServer"];
export type DbCredentials = Schemas["DatabaseCredentials"];
export type DbAvailability = Schemas["DatabaseAvailability"];
export type DbOffering = Schemas["DatabaseOffering"];
export type CreateDbServerRequest = Schemas["CreateDatabaseServerRequest"];
export type KnowledgeBase = Schemas["KnowledgeBase"];
export type CreateKnowledgeBaseRequest = Schemas["CreateKnowledgeBaseRequest"];
export type UpdateKnowledgeBaseRequest = Schemas["UpdateKnowledgeBaseRequest"];
export type CreateKnowledgeBaseDataSourceRequest = Schemas["CreateKnowledgeBaseDataSourceRequest"];
export type Application = Schemas["Application"];
export type CreateApplicationRequest = Schemas["CreateApplicationRequest"];
export type UpdateApplicationRequest = Schemas["UpdateApplicationRequest"];
export type CodeServerResult = Schemas["CodeServerResult"];
export type CreateCodeServerInput = Schemas["CreateCodeServerInput"];

/** The organization's managed PostgreSQL servers. */
export class DbServersApi {
	constructor(private readonly http: HttpClient) {}

	/** `GET /db-servers/availability`: whether the organization may create a database server. */
	async availability(): Promise<DbAvailability> {
		return this.http.get<DbAvailability>("/db-servers/availability");
	}

	/** `GET /db-servers/offering`: the plans and regions on offer. */
	async offering(): Promise<DbOffering> {
		return this.http.get<DbOffering>("/db-servers/offering");
	}

	/** `GET /db-servers`: the organization's database servers. */
	async list(): Promise<DbServer[]> {
		const listing = await this.http.get<Schemas["DatabaseServerList"]>("/db-servers");
		return itemsOf(listing);
	}

	/** `GET /db-servers/{serverId}`. */
	async get(serverId: string): Promise<DbServer> {
		return this.http.get<DbServer>(`/db-servers/${segment(serverId)}`);
	}

	/** `POST /db-servers`: accepted; the server lists as provisioning until it is ready. */
	async create(request: CreateDbServerRequest): Promise<DbServer> {
		return this.http.post<DbServer>("/db-servers", request);
	}

	/** `DELETE /db-servers/{serverId}`. */
	async delete(serverId: string): Promise<void> {
		return this.http.delete(`/db-servers/${segment(serverId)}`);
	}

	/**
	 * `GET /db-servers/{serverId}/credentials`: the administrator login. The
	 * platform answers with `Cache-Control: no-store`; the caller shows it once
	 * and writes it where it is needed.
	 */
	async revealCredentials(serverId: string): Promise<DbCredentials> {
		return this.http.get<DbCredentials>(`/db-servers/${segment(serverId)}/credentials`, { timeoutMs: 60_000 });
	}

	/** `POST /db-servers/{serverId}/backups/enable`: turns scheduled backups on. */
	async enableBackups(serverId: string): Promise<void> {
		return this.http.post(`/db-servers/${segment(serverId)}/backups/enable`);
	}
}

export class KnowledgeBasesApi {
	constructor(private readonly http: HttpClient) {}

	/** `GET /knowledge-bases`: the organization's knowledge bases. */
	async list(): Promise<KnowledgeBase[]> {
		const listing = await this.http.get<Schemas["KnowledgeBaseList"]>("/knowledge-bases");
		return itemsOf(listing);
	}

	/** `GET /knowledge-bases/{name}`. */
	async get(name: string): Promise<KnowledgeBase> {
		return this.http.get<KnowledgeBase>(`/knowledge-bases/${segment(name)}`);
	}

	/** `POST /knowledge-bases`. */
	async create(request: CreateKnowledgeBaseRequest): Promise<KnowledgeBase> {
		return this.http.post<KnowledgeBase>("/knowledge-bases", request);
	}

	/** `PUT /knowledge-bases/{name}`. */
	async update(name: string, request: UpdateKnowledgeBaseRequest): Promise<KnowledgeBase> {
		return this.http.put<KnowledgeBase>(`/knowledge-bases/${segment(name)}`, request);
	}

	/** `DELETE /knowledge-bases/{name}`. */
	async delete(name: string): Promise<void> {
		return this.http.delete(`/knowledge-bases/${segment(name)}`);
	}

	/** `POST /knowledge-bases/{name}/data-sources`. */
	async addDataSource(name: string, request: CreateKnowledgeBaseDataSourceRequest): Promise<Schemas["KnowledgeBaseDataSource"]> {
		return this.http.post<Schemas["KnowledgeBaseDataSource"]>(`/knowledge-bases/${segment(name)}/data-sources`, request);
	}

	/** `POST /knowledge-bases/{name}/retrieve`: a retrieval query, answered as the service shapes it. */
	async retrieve<T = unknown>(name: string, body: unknown): Promise<T> {
		return this.http.post<T>(`/knowledge-bases/${segment(name)}/retrieve`, body);
	}
}

/** Consumer applications, which hold API keys for exposed endpoints. */
export class ApplicationsApi {
	constructor(private readonly http: HttpClient) {}

	/** `GET /applications`, optionally for one project. */
	async list(projectName?: string): Promise<Application[]> {
		const listing = await this.http.get<{ items?: Application[] } | Application[]>("/applications", { query: { projectName } });
		return itemsOf(listing);
	}

	/** `GET /applications/{applicationId}`. */
	async get(applicationId: string): Promise<Application> {
		return this.http.get<Application>(`/applications/${segment(applicationId)}`);
	}

	/** `POST /applications`. */
	async create(request: CreateApplicationRequest): Promise<Application> {
		return this.http.post<Application>("/applications", request);
	}

	/** `PUT /applications/{applicationId}`. */
	async update(applicationId: string, request: UpdateApplicationRequest): Promise<Application> {
		return this.http.put<Application>(`/applications/${segment(applicationId)}`, request);
	}

	/** `DELETE /applications/{applicationId}`. */
	async delete(applicationId: string): Promise<void> {
		return this.http.delete(`/applications/${segment(applicationId)}`);
	}
}

/** The caller's Cloud Editor. */
export class CodeServerApi {
	constructor(private readonly http: HttpClient) {}

	/** `POST /code-server`: gets or creates the editor; poll until `ready`. */
	async ensure(input: CreateCodeServerInput): Promise<CodeServerResult> {
		return this.http.post<CodeServerResult>("/code-server", input);
	}

	/** `GET /code-server?projectId=&componentId=`. */
	async poll(projectId: string, componentId?: string): Promise<CodeServerResult> {
		return this.http.get<CodeServerResult>("/code-server", { query: { projectId, componentId } });
	}
}

/** The organization's Ballerina Central token. */
export class BallerinaCentralApi {
	constructor(private readonly http: HttpClient) {}

	/** `GET /ballerina-central/token`: the stored Ballerina Central token's details, never its value. */
	async getToken(): Promise<Schemas["BalCentralTokenDetails"]> {
		return this.http.get<Schemas["BalCentralTokenDetails"]>("/ballerina-central/token");
	}

	/** `PUT /ballerina-central/token`: stores a Ballerina Central token for the organization's builds. */
	async saveToken(request: Schemas["SaveBalCentralTokenRequest"]): Promise<void> {
		return this.http.put("/ballerina-central/token", request);
	}

	/** `DELETE /ballerina-central/token`. */
	async removeToken(): Promise<void> {
		return this.http.delete("/ballerina-central/token");
	}
}
