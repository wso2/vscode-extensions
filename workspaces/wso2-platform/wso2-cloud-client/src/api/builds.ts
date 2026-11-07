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

import { BadRequestError, NotFoundError, ServerError } from "../errors";
import { componentPath } from "./components";
import type { HttpClient } from "./http";
import type { Schemas } from "./schema";
import { itemsOf } from "./schema";
import type { PollOptions } from "./wait";
import { poll } from "./wait";

export type Build = Schemas["WorkflowRun"];
export type DeployableBuild = Schemas["DeploymentTrackImage"];
export type TriggerBuildResponse = Schemas["TriggerBuildResponse"];

/** A build can be pinned only to a full SHA: it fetches the commit as a ref. */
export const FULL_COMMIT_SHA = /^[0-9a-fA-F]{40}$/;

/** A build status it can still leave; every other status is final. */
export function buildInProgress(status: string | undefined): boolean {
	return !status || status === "Pending" || status === "Running";
}

/** Whether a build finished well and left an image to deploy. */
export function buildSucceeded(build: Pick<Build, "status" | "image">): boolean {
	return build.status === "Succeeded" && !!build.image;
}

export class BuildsApi {
	constructor(private readonly http: HttpClient) {}

	/** `GET /components/{componentName}/builds`: at most 20, newest first. */
	async list(componentName: string, projectName?: string): Promise<Build[]> {
		const listing = await this.http.get<Schemas["WorkflowRunList"]>(`${componentPath(componentName)}/builds`, { query: { projectName } });
		return itemsOf(listing);
	}

	/**
	 * `GET /components/{componentName}/builds/{buildName}`. The platform
	 * answers a name it does not know with a 500 rather than a 404; it is
	 * reported as not found, which is what it is.
	 */
	async get(componentName: string, buildName: string, projectName?: string): Promise<Build> {
		const build = await this.http.get<Build>(`${componentPath(componentName)}/builds/${encodeURIComponent(buildName)}`, {
			query: { projectName },
			mapStatus: (status, body) =>
				status === 500
					? new NotFoundError(`No build of ${componentName} is named ${buildName}: ${body.message ?? body.error ?? "the platform answered 500"}`, {
							status,
							reason: "build_unknown",
						})
					: undefined,
		});
		return { ...build, name: build.name || buildName, componentName: build.componentName || componentName };
	}

	/**
	 * `POST /components/{componentName}/builds`. The answer does not name the
	 * build it started; {@link triggerAndWait} finds it in the listing.
	 */
	async trigger(componentName: string, options: { sha?: string; projectName?: string } = {}): Promise<TriggerBuildResponse> {
		const body: Schemas["TriggerBuildRequest"] = {};
		if (options.sha) {
			if (!FULL_COMMIT_SHA.test(options.sha)) {
				throw new BadRequestError(`${options.sha} is not a full 40-character commit SHA, and a build can fetch only a full one.`);
			}
			body.sha = options.sha.toLowerCase();
		}
		return this.http.post<TriggerBuildResponse>(`${componentPath(componentName)}/builds`, body, { query: { projectName: options.projectName } });
	}

	/**
	 * Starts a build and follows it until it finishes. The build is found as
	 * the name the listing did not hold before the request. A build that does
	 * not succeed is a {@link ServerError} whose `reason` is `build_failed`.
	 */
	async triggerAndWait(
		componentName: string,
		options: { sha?: string; projectName?: string; onProgress?: (build: Build) => void } & PollOptions = {},
	): Promise<Build> {
		const before = new Set((await this.list(componentName, options.projectName)).map((b) => b.name));
		await this.trigger(componentName, options);
		const describe = () => `The build of ${componentName}`;
		const started = await poll(
			async () => {
				const listed = await this.list(componentName, options.projectName);
				const fresh = listed.find((b) => b.name && !before.has(b.name));
				return { done: fresh !== undefined, value: fresh as Build };
			},
			{ ...options, describe },
		);
		const name = started.name as string;
		const finished = await poll(
			async () => {
				const build = await this.get(componentName, name, options.projectName);
				options.onProgress?.(build);
				return { done: !buildInProgress(build.status), value: build };
			},
			{ ...options, describe: () => `The build ${name} of ${componentName}` },
		);
		if (finished.status !== "Succeeded") {
			throw new ServerError(`The build ${name} of ${componentName} finished as ${finished.status ?? "unknown"}.`, { reason: "build_failed" });
		}
		return finished;
	}

	/** `GET /components/{componentName}/releases`: the builds that can be deployed. */
	async listDeployable(componentName: string, projectName?: string): Promise<DeployableBuild[]> {
		const listing = await this.http.get<Schemas["DeploymentTrackImageList"]>(`${componentPath(componentName)}/releases`, { query: { projectName } });
		return itemsOf(listing);
	}
}
