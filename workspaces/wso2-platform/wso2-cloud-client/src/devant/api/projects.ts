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

import type { CreateProjectReq, Environment, GetProjectEnvsReq, Project, UpdateProjectReq } from "@wso2/wso2-platform-core";
import { PlanLimitError } from "../../errors";
import type { DevantHttp } from "./http";
import { errorField, gql, orgNumber } from "./http";

const PROJECT_FIELDS = "id, orgId, name, version, createdDate, handler, region, description, repository, branch, gitProvider, gitOrganization";
const ENVIRONMENT_FIELDS =
	"name, id, choreoEnv, vhost, apiEnvName, isMigrating, apimEnvId, namespace, sandboxVhost, critical, isPdp, promoteFrom, dpId, templateId";

/** The organization's projects. */
export async function getProjects(http: DevantHttp, orgId: string): Promise<Project[]> {
	const data = await http.graphql<{ projects: Project[] | null }>(`query { projects(orgId: ${gql(orgNumber(orgId))}) { ${PROJECT_FIELDS} } }`);
	return data.projects ?? [];
}

/** A handle from a project name: lower case letters and digits, words joined by single hyphens. */
export function projectHandle(name: string): string {
	let handle = "";
	for (const char of name.toLowerCase()) {
		if ((char >= "a" && char <= "z") || (char >= "0" && char <= "9")) {
			handle += char;
		} else if ((char === " " || char === "_" || char === "-") && handle.length > 0 && !handle.endsWith("-")) {
			handle += "-";
		}
	}
	return handle;
}

export async function createProject(http: DevantHttp, params: CreateProjectReq): Promise<Project> {
	const fields = [
		`name: ${gql(params.projectName)}`,
		`description: ${gql("")}`,
		`projectHandler: ${gql(params.projectHandler || projectHandle(params.projectName))}`,
		`orgId: ${gql(orgNumber(params.orgId))}`,
		`orgHandler: ${gql(params.orgHandler)}`,
		`version: ${gql("1.0.0")}`,
		`region: ${gql(params.region)}`,
	];
	const data = await http.graphql<{ createProject: Project }>(
		`mutation { createProject(project: { ${fields.join(", ")} }) { id, orgId, name, version, createdDate, handler, region, description, deploymentPipelineId } }`,
		{
			mapStatus: (status, body, text) =>
				status === 403 && errorField(text, "metadata", "additionalData") === "MAX_PROJECT_LIMIT_REACHED"
					? new PlanLimitError("The organization has as many projects as its Devant plan allows.", { status, apiMessage: body.message })
					: undefined,
		},
	);
	return data.createProject;
}

export async function updateProject(http: DevantHttp, params: UpdateProjectReq): Promise<Project> {
	const fields = [
		`id: ${gql(params.projectId)}`,
		`name: ${gql(params.name)}`,
		`description: ${gql("")}`,
		`orgId: ${gql(orgNumber(params.orgId))}`,
		`version: ${gql("")}`,
	];
	const data = await http.graphql<{ updateProject: Project }>(
		`mutation { updateProject(project: { ${fields.join(", ")} }) { id, name, description, orgId, version, handler, createdDate } }`,
	);
	return data.updateProject;
}

/** The environments a project deploys to, in promotion order. */
export async function getEnvs(http: DevantHttp, params: GetProjectEnvsReq): Promise<Environment[]> {
	const data = await http.graphql<{ environments: Environment[] | null }>(
		`query { environments(orgUuid: ${gql(params.orgUuid)}, projectId: ${gql(params.projectId)}) { ${ENVIRONMENT_FIELDS} } }`,
	);
	return data.environments ?? [];
}
