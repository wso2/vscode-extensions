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

	availability(): Promise<DbAvailability> {
		return this.http.get<DbAvailability>("/db-servers/availability");
	}

	offering(): Promise<DbOffering> {
		return this.http.get<DbOffering>("/db-servers/offering");
	}

	async list(): Promise<DbServer[]> {
		const listing = await this.http.get<Schemas["DatabaseServerList"]>("/db-servers");
		return itemsOf(listing);
	}

	get(serverId: string): Promise<DbServer> {
		return this.http.get<DbServer>(`/db-servers/${encodeURIComponent(serverId)}`);
	}

	create(request: CreateDbServerRequest): Promise<DbServer> {
		return this.http.post<DbServer>("/db-servers", request);
	}

	delete(serverId: string): Promise<void> {
		return this.http.delete(`/db-servers/${encodeURIComponent(serverId)}`);
	}

	/**
	 * `GET /db-servers/{serverId}/credentials`: the administrator login. The
	 * platform answers with `Cache-Control: no-store`; the caller shows it once
	 * and writes it where it is needed.
	 */
	revealCredentials(serverId: string): Promise<DbCredentials> {
		return this.http.get<DbCredentials>(`/db-servers/${encodeURIComponent(serverId)}/credentials`, { timeoutMs: 60_000 });
	}

	enableBackups(serverId: string): Promise<void> {
		return this.http.post(`/db-servers/${encodeURIComponent(serverId)}/backups/enable`);
	}
}

export class KnowledgeBasesApi {
	constructor(private readonly http: HttpClient) {}

	async list(): Promise<KnowledgeBase[]> {
		const listing = await this.http.get<Schemas["KnowledgeBaseList"]>("/knowledge-bases");
		return itemsOf(listing);
	}

	get(name: string): Promise<KnowledgeBase> {
		return this.http.get<KnowledgeBase>(`/knowledge-bases/${encodeURIComponent(name)}`);
	}

	create(request: CreateKnowledgeBaseRequest): Promise<KnowledgeBase> {
		return this.http.post<KnowledgeBase>("/knowledge-bases", request);
	}

	update(name: string, request: UpdateKnowledgeBaseRequest): Promise<KnowledgeBase> {
		return this.http.put<KnowledgeBase>(`/knowledge-bases/${encodeURIComponent(name)}`, request);
	}

	delete(name: string): Promise<void> {
		return this.http.delete(`/knowledge-bases/${encodeURIComponent(name)}`);
	}

	addDataSource(name: string, request: CreateKnowledgeBaseDataSourceRequest): Promise<Schemas["KnowledgeBaseDataSource"]> {
		return this.http.post<Schemas["KnowledgeBaseDataSource"]>(`/knowledge-bases/${encodeURIComponent(name)}/data-sources`, request);
	}

	retrieve<T = unknown>(name: string, body: unknown): Promise<T> {
		return this.http.post<T>(`/knowledge-bases/${encodeURIComponent(name)}/retrieve`, body);
	}
}

/** Consumer applications, which hold API keys for exposed endpoints. */
export class ApplicationsApi {
	constructor(private readonly http: HttpClient) {}

	async list(projectName?: string): Promise<Application[]> {
		const listing = await this.http.get<{ items?: Application[] } | Application[]>("/applications", { query: { projectName } });
		return itemsOf(listing);
	}

	get(applicationId: string): Promise<Application> {
		return this.http.get<Application>(`/applications/${encodeURIComponent(applicationId)}`);
	}

	create(request: CreateApplicationRequest): Promise<Application> {
		return this.http.post<Application>("/applications", request);
	}

	update(applicationId: string, request: UpdateApplicationRequest): Promise<Application> {
		return this.http.put<Application>(`/applications/${encodeURIComponent(applicationId)}`, request);
	}

	delete(applicationId: string): Promise<void> {
		return this.http.delete(`/applications/${encodeURIComponent(applicationId)}`);
	}
}

/** The caller's Cloud Editor. */
export class CodeServerApi {
	constructor(private readonly http: HttpClient) {}

	/** `POST /code-server`: gets or creates the editor; poll until `ready`. */
	ensure(input: CreateCodeServerInput): Promise<CodeServerResult> {
		return this.http.post<CodeServerResult>("/code-server", input);
	}

	/** `GET /code-server?projectId=&componentId=`. */
	poll(projectId: string, componentId?: string): Promise<CodeServerResult> {
		return this.http.get<CodeServerResult>("/code-server", { query: { projectId, componentId } });
	}
}

/** The organization's Ballerina Central token. */
export class BallerinaCentralApi {
	constructor(private readonly http: HttpClient) {}

	getToken(): Promise<Schemas["BalCentralTokenDetails"]> {
		return this.http.get<Schemas["BalCentralTokenDetails"]>("/ballerina-central/token");
	}

	saveToken(request: Schemas["SaveBalCentralTokenRequest"]): Promise<void> {
		return this.http.put("/ballerina-central/token", request);
	}

	removeToken(): Promise<void> {
		return this.http.delete("/ballerina-central/token");
	}
}
