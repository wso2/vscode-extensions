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

import { BadRequestError, ForbiddenError, NotFoundError, ServerError, isCloudError } from "../errors";
import type { BuildsApi } from "./builds";
import { buildSucceeded } from "./builds";
import { componentPath } from "./components";
import type { Environment, EnvironmentsApi, PipelinesApi } from "./environments";
import { resolveEnvironment } from "./environments";
import type { HttpClient } from "./http";
import type { Schemas } from "./schema";
import { itemsOf } from "./schema";
import type { PollOptions } from "./wait";
import { poll } from "./wait";

export type Deployment = Schemas["ComponentDeployment"];
export type DeploymentStatus = NonNullable<Deployment["deploymentStatusV2"]>;
export type DeployPrebuiltRequest = Schemas["DeployPrebuiltInput"];
export type ReleaseBinding = Schemas["ReleaseBinding"];

export interface DeployInput {
	/** The environment's id, or its display name. */
	environment: string;
	/** A succeeded build's name; the current image when absent. */
	imageId?: string;
	cron?: string;
	cronTimezone?: string;
	projectName?: string;
	/**
	 * Deploy even when the project's pipeline starts elsewhere. The platform
	 * accepts any environment; the console and CLI deploy only to the entry
	 * and promote from there.
	 */
	allowAnyEnvironment?: boolean;
	/**
	 * How long to look for the deployment when the platform's answer to the
	 * request is lost (see {@link DeployResult.observed}); 90 seconds by
	 * default, 5 seconds apart.
	 */
	observe?: PollOptions;
}

export interface DeployResult {
	/** The release's name; empty when the platform did not say. */
	releaseId: string;
	environment: Environment;
	/**
	 * True when the request's answer was lost (the gateway answered 504
	 * "upstream request timeout", or the call timed out) and the deployment
	 * was found by reading the environment instead: the platform goes on
	 * deploying after the gateway gives up on it.
	 */
	observed?: boolean;
}

/** How long a lost deploy answer is followed up by reading the environment. */
export const DEPLOY_OBSERVE_MS = 90_000;

export interface PromoteInput {
	from: string;
	to: string;
	projectName?: string;
}

export interface EnvironmentDeployment {
	environment: Environment;
	deployment: Deployment | undefined;
}

export class DeploymentsApi {
	constructor(
		private readonly http: HttpClient,
		private readonly environments: EnvironmentsApi,
		private readonly pipelines: PipelinesApi,
		private readonly builds: BuildsApi,
	) {}

	/**
	 * `GET /components/{componentName}/deployments?environmentId=`. The
	 * platform answers 200 with no body when the integration was never
	 * deployed there, which is `undefined` here.
	 */
	get(componentName: string, environmentId: string, projectName?: string): Promise<Deployment | undefined> {
		return this.http.get<Deployment | undefined>(`${componentPath(componentName)}/deployments`, {
			query: { environmentId, projectName },
		});
	}

	/** One read per environment: what the integration runs everywhere. */
	async listAll(componentName: string, projectName?: string): Promise<EnvironmentDeployment[]> {
		const environments = await this.environments.list();
		return Promise.all(
			environments.map(async (environment) => ({ environment, deployment: await this.get(componentName, environment.id, projectName) })),
		);
	}

	/** `GET /components/{componentName}/deployments/history`. */
	async history(componentName: string, projectName?: string): Promise<Schemas["BuildRun"][]> {
		const listing = await this.http.get<Schemas["BuildRunList"]>(`${componentPath(componentName)}/deployments/history`, { query: { projectName } });
		return itemsOf(listing);
	}

	/**
	 * `POST /components/{componentName}/deployments`. The platform deploys the
	 * current image when it cannot resolve `imageId` and still reports
	 * success, so a named build is checked first. Schedule members are left
	 * out unless given, so an automation keeps its schedule. Answers the
	 * release's name. The gateway sometimes gives up on the request before
	 * the platform answers (504 "upstream request timeout") while the
	 * deployment still goes ahead; the environment is then read for up to
	 * `observe.timeoutMs` and the deployment that appears is the answer,
	 * marked `observed`.
	 */
	async deploy(componentName: string, input: DeployInput): Promise<DeployResult> {
		const environment = resolveEnvironment(await this.environments.list(), input.environment);
		if (!input.allowAnyEnvironment && input.projectName) {
			const { entry } = await this.pipelines.ofProject(input.projectName);
			if (entry && entry !== environment.id) {
				throw new BadRequestError(
					`The project ${input.projectName}'s deployment pipeline starts at ${entry}, not ${environment.id}. Deploy there, then promote.`,
					{
						reason: "not_pipeline_entry",
					},
				);
			}
		}
		if (input.imageId) {
			const build = await this.builds.get(componentName, input.imageId, input.projectName);
			if (!buildSucceeded(build)) {
				throw new BadRequestError(`The build ${input.imageId} is ${build.status ?? "unknown"} and has no image to deploy.`, {
					reason: "build_not_deployable",
				});
			}
		}
		const body: Schemas["DeployDeploymentTrackInput"] = { environmentId: environment.id, imageId: input.imageId ?? "" };
		if (input.cron !== undefined) {
			body.cron = input.cron;
		}
		if (input.cronTimezone !== undefined) {
			body.cronTimezone = input.cronTimezone;
		}
		// Only for telling a new deployment from the old one when the answer is
		// lost; a failed read must not stop the deploy, but then nothing can be
		// told apart, so a lost answer stays an error.
		let before: Deployment | undefined;
		let beforeKnown = true;
		try {
			before = await this.get(componentName, environment.id, input.projectName);
		} catch {
			beforeKnown = false;
		}
		try {
			const accepted = await this.http.post<Schemas["MessageResponse"]>(`${componentPath(componentName)}/deployments`, body, {
				query: { projectName: input.projectName },
			});
			return { releaseId: accepted?.message ?? "", environment };
		} catch (error) {
			const lost = isCloudError(error) && (error.code === "timeout" || error.details.status === 504);
			if (!lost) {
				throw error;
			}
			const seen = beforeKnown ? await this.observeDeployment(componentName, environment.id, before, input) : undefined;
			if (!seen) {
				throw error;
			}
			return { releaseId: seen.releaseId ?? "", environment, observed: true };
		}
	}

	/**
	 * Reads the environment until a deployment other than `before` is there:
	 * a first one, another release, or the same release rolling out again.
	 * Undefined when nothing changed within the time given.
	 */
	private async observeDeployment(
		componentName: string,
		environmentId: string,
		before: Deployment | undefined,
		input: DeployInput,
	): Promise<Deployment | undefined> {
		const changed = (current: Deployment | undefined): boolean => {
			if (!current?.releaseId) {
				return false;
			}
			if (!before?.releaseId) {
				return true;
			}
			return (
				current.releaseId !== before.releaseId ||
				current.deploymentStatusV2 !== before.deploymentStatusV2 ||
				(current.build?.buildId ?? "") !== (before.build?.buildId ?? "")
			);
		};
		try {
			return await poll(
				async () => {
					const current = await this.get(componentName, environmentId, input.projectName);
					return { done: changed(current), value: current };
				},
				{
					timeoutMs: DEPLOY_OBSERVE_MS,
					...input.observe,
					describe: () => `Looking for the deployment of ${componentName} in ${environmentId}`,
				},
			);
		} catch (error) {
			if (isCloudError(error) && error.code === "timeout" && error.details.reason === "wait_timeout") {
				return undefined;
			}
			throw error;
		}
	}

	/** `POST /components/{componentName}/deploy?environment=`: the current image, no build named. */
	deployCurrent(componentName: string, environmentId: string, projectName?: string): Promise<Deployment> {
		return this.http.post<Deployment>(`${componentPath(componentName)}/deploy`, undefined, { query: { environment: environmentId, projectName } });
	}

	/** `POST /components/{componentName}/deploy-prebuilt`. */
	deployPrebuilt(componentName: string, request: DeployPrebuiltRequest, projectName?: string): Promise<void> {
		return this.http.post(`${componentPath(componentName)}/deploy-prebuilt`, request, { query: { projectName } });
	}

	/**
	 * `POST /components/{componentName}/deployments/promote`. The platform
	 * wants the source release and the pipeline by id; both are looked up so
	 * a caller deals only in names. A hop the pipeline does not allow is a
	 * {@link ForbiddenError} whose `reason` is `promotion_refused`.
	 */
	async promote(componentName: string, input: PromoteInput): Promise<{ releaseId: string; from: Environment; to: Environment }> {
		const environments = await this.environments.list();
		const from = resolveEnvironment(environments, input.from);
		const to = resolveEnvironment(environments, input.to);
		if (from.id === to.id) {
			throw new BadRequestError(`${from.id} is both the source and the target of the promotion.`);
		}
		if (!input.projectName) {
			throw new BadRequestError("Promoting needs the integration's project, which names the deployment pipeline.");
		}
		const source = await this.get(componentName, from.id, input.projectName);
		if (!source?.releaseId) {
			throw new NotFoundError(`${componentName} has nothing deployed in ${from.id} to promote.`, { reason: "not_deployed" });
		}
		const { pipeline } = await this.pipelines.ofProject(input.projectName);
		if (!pipeline) {
			throw new NotFoundError(`The project ${input.projectName} has no deployment pipeline to promote along. Deploy to ${to.id} directly.`, {
				reason: "no_pipeline",
			});
		}
		const body: Schemas["PromoteInput"] = {
			sourceReleaseId: source.releaseId,
			sourceEnvironmentId: from.id,
			targetEnvironmentId: to.id,
			deploymentPipelineId: pipeline.name,
		};
		try {
			const accepted = await this.http.post<Schemas["PromoteResponse"]>(`${componentPath(componentName)}/deployments/promote`, body, {
				query: { projectName: input.projectName },
			});
			return { releaseId: accepted?.message || source.releaseId, from, to };
		} catch (error) {
			if (isCloudError(error) && error.details.status === 403) {
				throw new ForbiddenError(
					`The pipeline does not promote ${componentName} from ${from.id} to ${to.id}: ${error.details.apiMessage ?? error.message}`,
					{
						...error.details,
						reason: "promotion_refused",
					},
				);
			}
			throw error;
		}
	}

	/** `PUT /components/{componentName}/deployments/stop`: stops it there, keeping the deployment. */
	async stop(componentName: string, environment: string, projectName?: string): Promise<void> {
		const env = resolveEnvironment(await this.environments.list(), environment);
		await this.http.put<Schemas["MessageResponse"]>(
			`${componentPath(componentName)}/deployments/stop`,
			{ environment: env.id },
			{ query: { projectName } },
		);
	}

	/** `POST /components/{componentName}/deployments/redeploy?environment=`: restarts it, or starts it again after a stop. */
	async redeploy(componentName: string, environment: string, projectName?: string): Promise<void> {
		const env = resolveEnvironment(await this.environments.list(), environment);
		await this.http.post<Schemas["MessageResponse"]>(`${componentPath(componentName)}/deployments/redeploy`, undefined, {
			query: { environment: env.id, projectName },
		});
	}

	/**
	 * Polls until the release (any release when `releaseId` is absent) is
	 * `ACTIVE` in the environment. A rollout that ends in one of `failedOn`
	 * is a {@link ServerError} whose `reason` is `deployment_failed`. A
	 * redeploy after a stop reads `SUSPENDED` until it starts, so it passes
	 * only `ERROR`.
	 */
	async waitForRollout(
		componentName: string,
		environmentId: string,
		options: {
			releaseId?: string;
			projectName?: string;
			failedOn?: DeploymentStatus[];
			onProgress?: (d: Deployment | undefined) => void;
		} & PollOptions = {},
	): Promise<Deployment> {
		const failedOn = options.failedOn ?? ["ERROR", "SUSPENDED"];
		return poll(
			async () => {
				const current = await this.get(componentName, environmentId, options.projectName);
				options.onProgress?.(current);
				if (!current?.releaseId || (options.releaseId && current.releaseId !== options.releaseId)) {
					return { done: false, value: current as Deployment };
				}
				if (current.deploymentStatusV2 === "ACTIVE") {
					return { done: true, value: current };
				}
				if (current.deploymentStatusV2 && failedOn.includes(current.deploymentStatusV2)) {
					throw new ServerError(`The release ${current.releaseId} of ${componentName} is ${current.deploymentStatusV2} in ${environmentId}.`, {
						reason: "deployment_failed",
					});
				}
				return { done: false, value: current };
			},
			{ ...options, describe: () => `The rollout of ${componentName} in ${environmentId}` },
		);
	}

	/** `GET /components/{componentName}/schedules`: an automation's release bindings. */
	async schedules(componentName: string, projectName?: string): Promise<ReleaseBinding[]> {
		const listing = await this.http.get<Schemas["ReleaseBindingList"]>(`${componentPath(componentName)}/schedules`, { query: { projectName } });
		return itemsOf(listing);
	}
}
