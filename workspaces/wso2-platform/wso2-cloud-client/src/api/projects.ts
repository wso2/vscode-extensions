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

import { BadRequestError, isCloudError } from "../errors";
import type { HttpClient } from "./http";
import type { Schemas } from "./schema";
import { itemsOf } from "./schema";

export type Project = Schemas["Project"];
export type CreateProjectRequest = Schemas["CreateProjectRequest"];
export type UpdateProjectRequest = Schemas["UpdateProjectRequest"];
export type ProjectRepository = Schemas["ProjectRepository"];
export type ProjectHandlerAvailability = Schemas["ProjectHandlerAvailability"];
export type ProjectContributor = Schemas["ProjectContributor"];

/** The hosts a repository link may name, mapped to the API's git provider. */
const REPOSITORY_HOSTS: Record<string, string> = { "github.com": "github", "bitbucket.org": "bitbucket" };

/**
 * Reads `https://<host>/<organization>/<repository>[.git]`, with or without
 * the scheme, into the API's project-repository link. Other hosts, such as a
 * self-hosted GitLab, are linked in the console.
 */
export function parseProjectRepository(url: string): { gitProvider: string; gitOrganization: string; repository: string } {
	const trimmed = url
		.trim()
		.replace(/\/+$/, "")
		.replace(/\.git$/, "")
		.replace(/^https?:\/\//, "");
	const parts = trimmed.split("/");
	if (parts.length !== 3 || !parts[1] || !parts[2]) {
		throw new BadRequestError(`${url} does not name an organization and a repository. Give https://github.com/<organization>/<repository>.`);
	}
	const gitProvider = REPOSITORY_HOSTS[parts[0].toLowerCase()];
	if (!gitProvider) {
		throw new BadRequestError(`${parts[0]} is not GitHub or Bitbucket; link other repositories in the Integration Platform console.`);
	}
	return { gitProvider, gitOrganization: parts[1], repository: parts[2] };
}

/** The API path of a project, its name encoded. */
export function projectPath(name: string): string {
	return `/projects/${encodeURIComponent(name)}`;
}

export class ProjectsApi {
	constructor(private readonly http: HttpClient) {}

	/** `GET /projects`: at most one page, with no continuation cursor. */
	async list(): Promise<Project[]> {
		const listing = await this.http.get<Schemas["ProjectList"]>("/projects");
		return itemsOf(listing);
	}

	/** `GET /projects/{projectName}`. */
	get(name: string): Promise<Project> {
		return this.http.get<Project>(projectPath(name));
	}

	/**
	 * `POST /projects`. A 503 means the project exists but its per-environment
	 * release bindings are not all in place, and that the same request
	 * completes them, so one is retried once before being reported.
	 */
	async create(request: CreateProjectRequest): Promise<Project> {
		try {
			return await this.createOnce(request);
		} catch (error) {
			if (isCloudError(error) && error.details.status === 503) {
				return this.createOnce(request);
			}
			throw error;
		}
	}

	/** One `POST /projects`; a sparse or empty answer is completed from the request, since the project exists by then. */
	private async createOnce(request: CreateProjectRequest): Promise<Project> {
		const created = await this.http.post<Project | undefined>("/projects", request);
		return { ...(created as Project), id: created?.id || request.name, handler: created?.handler || created?.id || request.name };
	}

	/** `PUT /projects/{projectName}`. */
	update(name: string, request: UpdateProjectRequest): Promise<Project> {
		return this.http.put<Project>(projectPath(name), request);
	}

	/** `DELETE /projects/{projectName}`: accepted; the project lists as `deleting` until gone. */
	delete(name: string): Promise<void> {
		return this.http.delete(projectPath(name));
	}

	/** `PUT /projects/{projectName}/repository`: the link is sent whole or not at all. */
	linkRepository(name: string, repository: ProjectRepository): Promise<Project> {
		return this.http.put<Project>(`${projectPath(name)}/repository`, repository);
	}

	/** `GET /projects/handler-availability?candidate=`. */
	checkHandler(candidate: string): Promise<ProjectHandlerAvailability> {
		return this.http.get<ProjectHandlerAvailability>("/projects/handler-availability", { query: { candidate } });
	}

	/** `GET /projects/{projectName}/contributors`. */
	async contributors(name: string): Promise<ProjectContributor[]> {
		const listing = await this.http.get<Schemas["ProjectContributorList"]>(`${projectPath(name)}/contributors`);
		return itemsOf(listing);
	}
}
