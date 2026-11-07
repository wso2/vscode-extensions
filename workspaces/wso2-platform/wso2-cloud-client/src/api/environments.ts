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

import { NotFoundError } from "../errors";
import type { HttpClient } from "./http";
import { projectPath } from "./projects";
import type { Schemas } from "./schema";
import { itemsOf } from "./schema";

export type Environment = Schemas["Environment"];
export type DeploymentPipeline = Schemas["DeploymentPipeline"];
export type PromotionPath = Schemas["PromotionPath"];
export type DataPlane = Schemas["DataPlane"];

/**
 * Finds the environment `ref` names: by id, then ignoring case by id or
 * display name, so a user may type what the console shows. An unknown one is
 * refused naming the ids there are.
 */
export function resolveEnvironment(environments: Environment[], ref: string): Environment {
	const exact = environments.find((e) => e.id === ref);
	if (exact) {
		return exact;
	}
	const lowered = ref.toLowerCase();
	const loose = environments.find((e) => e.id.toLowerCase() === lowered || e.name.toLowerCase() === lowered);
	if (loose) {
		return loose;
	}
	throw new NotFoundError(`${ref} is not an environment of this organization. Use one of ${environments.map((e) => e.id).join(", ")}.`, {
		reason: "environment_unknown",
	});
}

/**
 * Where a pipeline starts: the promotion source that is never itself a
 * target, as the platform picks it for a first deploy. `undefined` when the
 * pipeline has no promotion paths, in which case every environment is reached
 * by deploying to it directly. A cycle has no entry, so declaration order
 * decides.
 */
export function entryEnvironmentOf(pipeline: Pick<DeploymentPipeline, "promotionPaths">): string | undefined {
	const paths = pipeline.promotionPaths ?? [];
	if (paths.length === 0) {
		return undefined;
	}
	const targets = new Set(paths.flatMap((path) => path.targetEnvironments));
	return (paths.find((path) => !targets.has(path.sourceEnvironment)) ?? paths[0]).sourceEnvironment;
}

/**
 * Orders environments the way the pipeline promotes through them: the entry
 * first, then each target as it is first reached, then any the pipeline does
 * not mention. The order the UI shows environments in.
 */
export function orderByPipeline(environments: Environment[], pipeline: Pick<DeploymentPipeline, "promotionPaths"> | undefined): Environment[] {
	const paths = pipeline?.promotionPaths ?? [];
	const ordered: string[] = [];
	const push = (id: string) => {
		if (!ordered.includes(id)) {
			ordered.push(id);
		}
	};
	const entry = pipeline ? entryEnvironmentOf(pipeline) : undefined;
	if (entry) {
		push(entry);
	}
	let frontier = entry ? [entry] : [];
	while (frontier.length > 0) {
		const next: string[] = [];
		for (const source of frontier) {
			for (const path of paths.filter((p) => p.sourceEnvironment === source)) {
				for (const target of path.targetEnvironments) {
					if (!ordered.includes(target)) {
						push(target);
						next.push(target);
					}
				}
			}
		}
		frontier = next;
	}
	for (const path of paths) {
		push(path.sourceEnvironment);
		for (const target of path.targetEnvironments) {
			push(target);
		}
	}
	const byId = new Map(environments.map((e) => [e.id, e]));
	const result = ordered.map((id) => byId.get(id)).filter((e): e is Environment => e !== undefined);
	for (const e of environments) {
		if (!result.includes(e)) {
			result.push(e);
		}
	}
	return result;
}

export class EnvironmentsApi {
	constructor(private readonly http: HttpClient) {}

	/** `GET /environments`: the organization's environments, which every project shares. */
	async list(): Promise<Environment[]> {
		const listing = await this.http.get<Schemas["EnvironmentList"]>("/environments");
		return itemsOf(listing);
	}

	/** `GET /environments/{environmentName}`. */
	get(environmentName: string): Promise<Environment> {
		return this.http.get<Environment>(`/environments/${encodeURIComponent(environmentName)}`);
	}

	/** Lists, then picks the one `ref` names by id or display name. */
	async resolve(ref: string): Promise<Environment> {
		return resolveEnvironment(await this.list(), ref);
	}

	/** `GET /dataplanes`. */
	async dataPlanes(): Promise<DataPlane[]> {
		const listing = await this.http.get<Schemas["DataPlaneList"]>("/dataplanes");
		return itemsOf(listing);
	}
}

export class PipelinesApi {
	constructor(private readonly http: HttpClient) {}

	/** `GET /deploymentpipelines`. */
	async list(): Promise<DeploymentPipeline[]> {
		const listing = await this.http.get<Schemas["DeploymentPipelineList"]>("/deploymentpipelines");
		return itemsOf(listing);
	}

	/** `GET /deploymentpipelines/{pipelineName}`. */
	get(pipelineName: string): Promise<DeploymentPipeline> {
		return this.http.get<DeploymentPipeline>(`/deploymentpipelines/${encodeURIComponent(pipelineName)}`);
	}

	/**
	 * The project's pipeline and where it starts. Both are `undefined` for a
	 * project with no pipeline; `entry` alone is `undefined` for a pipeline
	 * with no promotion paths.
	 */
	async ofProject(projectName: string): Promise<{ pipeline?: DeploymentPipeline; entry?: string }> {
		const project = await this.http.get<Schemas["Project"]>(projectPath(projectName));
		if (!project?.defaultDeploymentPipelineId) {
			return {};
		}
		const pipeline = await this.get(project.defaultDeploymentPipelineId);
		return { pipeline, entry: entryEnvironmentOf(pipeline) };
	}
}
