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

import { randomUUID } from "node:crypto";
import type {
	BuildKind,
	CreateBuildReq,
	DeploymentLogsData,
	GetAutoBuildStatusReq,
	GetAutoBuildStatusResp,
	GetBuildLogsForTypeReq,
	GetBuildLogsReq,
	GetBuildsReq,
	ProjectBuildLogsData,
	ToggleAutoBuildReq,
	ToggleAutoBuildResp,
} from "@wso2/wso2-platform-core";
import { BadRequestError, NotFoundError } from "../../errors";
import type { CommitHistoryWithAuthor } from "./components";
import { COMPONENT_MGT_API, DECLARATIVE_API, DEVOPS_API, commitHistory } from "./components";
import type { DevantHttp } from "./http";
import { gql } from "./http";

/** The log fields a build's logs of one type can be read from, each a log of its own. */
const LOG_TYPES = [
	"integrationProjectBuild",
	"libraryTrivyReport",
	"dropinsTrivyReport",
	"postBuildCheckLogs",
	"mainSequenceValidation",
	"mIVersionValidation",
	"proxyBuildLogs",
	"governanceLogs",
	"configValidationLogs",
] as const;

/** One build of a deployment track, as Devant's GraphQL answers it. */
interface RawBuildRun {
	id?: number;
	completed_at?: string;
	started_at?: string;
	status?: string;
	conclusion?: string;
	sourceCommitId?: string;
	buildRef?: string;
	clusterId?: string;
}

interface RawTrackImage {
	imageId?: string;
	commitHash?: string;
	createdAt?: string;
	updatedAt?: string;
}

type BuildStatus = Omit<BuildKind["status"], "images"> & { images?: BuildKind["status"]["images"] };

/** A build in the shape WSO2 Integrator reads: `status` and its `images` left out when there are none. */
interface BuildResource extends Omit<BuildKind, "status"> {
	status?: BuildStatus;
}

/** Starts a build of a deployment track at a commit. */
export async function createBuild(http: DevantHttp, params: CreateBuildReq): Promise<BuildKind> {
	const path = `${DECLARATIVE_API}/projects/${encodeURIComponent(params.projectHandle)}/components/${encodeURIComponent(params.componentName)}/deploymentTracks/${encodeURIComponent(params.deploymentTrackId)}/builds`;
	const build = await http.rest<Record<string, unknown> | null>("POST", path, {
		body: {
			apiVersion: "core.choreo.dev/v1alpha1",
			kind: "Build",
			metadata: { name: randomUUID(), componentName: params.componentName, projectName: params.projectHandle },
			spec: { revision: params.commitHash },
		},
	});
	return buildResourceOf(build ?? {}) as BuildKind;
}

/**
 * The builds of a deployment track, each with the images it made and its commit. As the CLI did, a read that fails
 * is taken as empty: no builds, no images or no commits.
 */
export async function getBuilds(http: DevantHttp, params: GetBuildsReq): Promise<BuildKind[]> {
	const quiet = <T>(promise: Promise<T>, empty: T) => promise.catch(() => empty);
	const [runs, images, commits] = await Promise.all([
		quiet(
			http
				.graphql<{ deploymentStatusByVersion: RawBuildRun[] | null }>(
					`query { deploymentStatusByVersion(versionId: ${gql(params.apiVersionId)}, componentId: ${gql(params.componentId)}) { id, sha, completed_at, started_at, name, status, conclusion, isAutoDeploy, failureReason, sourceCommitId, buildRef, clusterId } }`,
				)
				.then((data) => data.deploymentStatusByVersion ?? []),
			[] as RawBuildRun[],
		),
		params.displayType === "gitProxy"
			? ([] as RawTrackImage[])
			: quiet(
					http
						.graphql<{ deploymentTrackImages: RawTrackImage[] | null }>(
							`query { deploymentTrackImages(input: { componentId: ${gql(params.componentId)}, id: ${gql(params.apiVersionId)} }) { imageId, commitHash, commitMessage, createdAt, updatedAt } }`,
						)
						.then((data) => data.deploymentTrackImages ?? []),
					[] as RawTrackImage[],
				),
		quiet(commitHistory(http, params.componentId, params.branch), [] as CommitHistoryWithAuthor[]),
	]);

	const commitBySha = new Map(
		commits.map((commit) => [
			str(commit.sha),
			{ message: str(commit.message), author: str(commit.author?.name), date: str(commit.author?.date), email: str(commit.author?.email) },
		]),
	);
	const imagesByCommit = new Map<string, BuildKind["status"]["images"]>();
	for (const image of images) {
		const list = imagesByCommit.get(str(image.commitHash)) ?? [];
		list.push({ id: str(image.imageId), createdAt: str(image.createdAt), updatedAt: str(image.updatedAt) });
		imagesByCommit.set(str(image.commitHash), list);
	}

	return runs.map((run) => {
		const revision = str(run.sourceCommitId);
		const status: BuildStatus = {
			runId: num(run.id),
			conclusion: str(run.conclusion),
			status: str(run.status),
			startedAt: str(run.started_at),
			completedAt: str(run.completed_at),
			gitCommit: commitBySha.get(revision) ?? { message: "", author: "", date: "", email: "" },
			clusterId: str(run.clusterId),
			buildRef: str(run.buildRef),
		};
		const images = imagesByCommit.get(revision);
		if (images) {
			status.images = images;
		}
		const build: BuildResource = {
			apiVersion: "",
			kind: "Build",
			metadata: { name: String(num(run.id)), componentName: params.componentName, projectName: "" },
			spec: { revision },
			status,
		};
		return build as BuildKind;
	});
}

/**
 * A build's logs, phase by phase. A build that ran on a data plane cluster (`clusterId`) is read from that data
 * plane's logging API; any other from the component management service.
 */
export async function getBuildLogs(http: DevantHttp, params: GetBuildLogsReq): Promise<DeploymentLogsData> {
	let answer: { data?: Record<string, unknown> | null } | null;
	if (params.clusterId) {
		const host = await dataPlaneHost(http, params.orgId, params.orgUuid, params.clusterId);
		answer = await http.rest("POST", "/systemapis/choreologgingapi/0.2.0/logs/component/build", {
			baseUrl: `${http.deployment.sysApiPrefixUrl}.${host}`,
			body: { componentId: params.componentId, deploymentTrackId: params.deploymentTrackId, workflowName: params.buildRef },
		});
	} else {
		answer = await http.rest(
			"GET",
			`${COMPONENT_MGT_API}/orgs/${encodeURIComponent(params.orgHandler)}/projects/${encodeURIComponent(params.projectId)}/components/${encodeURIComponent(params.componentId)}/runs/${encodeURIComponent(String(params.buildId))}/logs`,
		);
	}
	return buildLogsOf(answer?.data ?? {});
}

/** One log of a build, such as its integration project build: the field `logType` names. */
export async function getBuildLogsForType(http: DevantHttp, params: GetBuildLogsForTypeReq): Promise<ProjectBuildLogsData | null> {
	// The log type is a field of the query, so it cannot be quoted; anything but a field name is refused.
	if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(params.logType)) {
		throw new BadRequestError(`${params.logType} is not a type of build log.`);
	}
	const data = await http.graphql<{ buildLogs: Record<string, unknown> | null }>(
		`query { buildLogs(componentId: ${gql(params.componentId)}, runId: ${gql(String(params.buildId))}) { ${params.logType} } }`,
	);
	const logs = {} as Record<(typeof LOG_TYPES)[number], string>;
	for (const type of LOG_TYPES) {
		logs[type] = str(data.buildLogs?.[type]);
	}
	return logs;
}

/** Whether a deployment track builds on every commit to its branch. */
export async function getAutoBuildStatus(http: DevantHttp, params: GetAutoBuildStatusReq): Promise<GetAutoBuildStatusResp> {
	const data = await http.graphql<{ autoBuildTrigger: { data?: Partial<GetAutoBuildStatusResp> | null } | null }>(
		`query { autoBuildTrigger(componentId: ${gql(params.componentId)}, versionId: ${gql(params.versionId)}) { success, data { autoBuildId, autoBuildEnabled, componentId, versionId, envId }, message } }`,
	);
	const status = data.autoBuildTrigger?.data ?? {};
	return {
		autoBuildId: str(status.autoBuildId),
		autoBuildEnabled: status.autoBuildEnabled === true,
		componentId: str(status.componentId),
		versionId: str(status.versionId),
		envId: str(status.envId),
	};
}

export async function enableAutoBuildOnCommit(http: DevantHttp, params: ToggleAutoBuildReq): Promise<ToggleAutoBuildResp> {
	return toggleAutoBuild(http, "handleEnableAutoBuild", params);
}

export async function disableAutoBuildOnCommit(http: DevantHttp, params: ToggleAutoBuildReq): Promise<ToggleAutoBuildResp> {
	return toggleAutoBuild(http, "handleDisableAutoBuild", params);
}

async function toggleAutoBuild(
	http: DevantHttp,
	mutation: "handleEnableAutoBuild" | "handleDisableAutoBuild",
	params: ToggleAutoBuildReq,
): Promise<ToggleAutoBuildResp> {
	const data = await http.graphql<Record<string, { success?: boolean } | null>>(
		`mutation { ${mutation}(componentId: ${gql(params.componentId)}, versionId: ${gql(params.versionId)}, envId: ${gql(params.envId)}) { success, message } }`,
	);
	return { success: data[mutation]?.success === true };
}

function str(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** A build resource with only the fields the CLI's model kept. */
function buildResourceOf(raw: Record<string, unknown>): BuildResource {
	const metadata = (raw.metadata ?? {}) as Record<string, unknown>;
	const spec = (raw.spec ?? {}) as Record<string, unknown>;
	const build: BuildResource = {
		apiVersion: str(raw.apiVersion),
		kind: str(raw.kind),
		metadata: { name: str(metadata.name), componentName: str(metadata.componentName), projectName: str(metadata.projectName) },
		spec: { revision: str(spec.revision) },
	};
	const status = raw.status as Record<string, unknown> | null | undefined;
	if (status) {
		const commit = (status.gitCommit ?? {}) as Record<string, unknown>;
		const images = status.images as Record<string, unknown>[] | null | undefined;
		build.status = {
			runId: num(status.runId),
			conclusion: str(status.conclusion),
			status: str(status.status),
			startedAt: str(status.startedAt),
			completedAt: str(status.completedAt),
			gitCommit: { message: str(commit.message), author: str(commit.author), date: str(commit.date), email: str(commit.email) },
			clusterId: str(status.clusterId),
			buildRef: str(status.buildRef),
		};
		if (images?.length) {
			build.status.images = images.map((image) => ({ id: str(image?.id), createdAt: str(image?.createdAt), updatedAt: str(image?.updatedAt) }));
		}
	}
	return build;
}

type LogPhase = DeploymentLogsData["build"];

/**
 * A build's logs with the phases the CLI's model kept, each present: an empty status and log where missing, and
 * `steps` null where there are none, which the build view tells apart from an empty list.
 */
function buildLogsOf(data: Record<string, unknown>): DeploymentLogsData {
	const phase = (value: unknown): LogPhase => {
		const raw = (value ?? {}) as Record<string, unknown>;
		return { status: str(raw.status), steps: stepsOf(raw.steps), log: str(raw.log) };
	};
	const deploy = (data.deploy ?? {}) as Record<string, unknown>;
	return {
		init: phase(data.init),
		build: phase(data.build),
		oasValidation: phase(data.oasValidation),
		governanceCheck: phase(data.governanceCheck),
		updateApi: phase(data.updateApi),
		deploy: { status: str(deploy.status), steps: stepsOf(deploy.steps) },
	};
}

function stepsOf(value: unknown): LogPhase["steps"] {
	if (!Array.isArray(value)) {
		return null as unknown as LogPhase["steps"];
	}
	return value.map((raw) => {
		const step = (raw ?? {}) as Record<string, unknown>;
		return {
			name: str(step.name),
			status: str(step.status),
			conclusion: str(step.conclusion),
			number: num(step.number),
			started_at: str(step.started_at),
			completed_at: str(step.completed_at),
		} as LogPhase["steps"][number];
	});
}

/** The external gateway host of the data plane cluster a build ran on, among the cloud's and the organization's. */
async function dataPlaneHost(http: DevantHttp, orgId: string, orgUuid: string, clusterId: string): Promise<string> {
	type Plane = { id?: string; external_gateway_virtual_host?: string; externalGatewayVirtualHost?: string };
	const [cloud, own] = await Promise.all([
		http.rest<Plane[] | null>("GET", `${DEVOPS_API}/api/v1/clusters/clouddataplanes`, { query: { org_uuid: orgUuid } }),
		http.rest<Plane[] | null>("GET", `${DEVOPS_API}/api/v1/clusters/dataplanes`, { query: { org_id: orgId } }),
	]);
	const wanted = clusterId.toLowerCase();
	const inCloud = (cloud ?? []).find((plane) => str(plane.id).toLowerCase() === wanted);
	if (inCloud) {
		return str(inCloud.external_gateway_virtual_host);
	}
	const inOrg = (own ?? []).find((plane) => str(plane.id).toLowerCase() === wanted);
	if (inOrg) {
		return str(inOrg.externalGatewayVirtualHost);
	}
	throw new NotFoundError(`Devant knows no data plane ${clusterId} for the organization.`);
}
