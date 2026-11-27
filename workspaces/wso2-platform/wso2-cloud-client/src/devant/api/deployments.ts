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
	CancelApprovalReq,
	CheckWorkflowStatusReq,
	CheckWorkflowStatusResp,
	ComponentDeployment,
	CreateDeploymentReq,
	GetDeploymentStatusReq,
	GetProxyDeploymentInfoReq,
	PromoteProxyDeploymentReq,
	ProxyDeploymentInfo,
	RequestPromoteApprovalReq,
} from "@wso2/wso2-platform-core";
import { segment } from "../../api/path";
import { BadRequestError, NotSupportedError } from "../../errors";
import type { DevantHttp } from "./http";
import { gql } from "./http";

const DECLARATIVE_API = "/declarative-api/v1.0/core/v1alpha1";
const WORKFLOW_API = "/workflow-mgt/v1.0";
const PROXY_DEPLOYER = "/proxy/deployer/v1";

/** Display types deployed as services, whose endpoints are generated before a deployment. */
const SERVICE_DISPLAY_TYPES = new Set([
	"restAPI",
	"ballerinaService",
	"byocService",
	"graphql",
	"miApiService",
	"miRestApi",
	"buildpackService",
	"buildpackRestApi",
	"webSocket",
	"prismMockService",
	"byoiService",
	"byocRestApi",
]);

/** Display types deployed on a schedule. */
const SCHEDULED_DISPLAY_TYPES = new Set(["scheduledTask", "byocCronjob", "buildpackCronjob", "miCronjob", "byoiCronjob"]);

const GIT_PROXY_DISPLAY_TYPE = "gitProxy";

const DEPLOYMENT_FIELDS = `environmentId configCount apiId releaseId apiRevision { id displayName }
	build { buildId deployedAt commit { author { name date email avatarUrl } sha message isLatest } runId }
	imageUrl invokeUrl versionId deploymentStatus deploymentStatusV2 version cron cronTimezone`;

const PROXY_DEPLOYMENT_FIELDS = `apiId environment { choreoEnv name id } lifecycleStatus version invokeUrl endpoint sandboxEndpoint
	apiRevision { id displayName createdTime } build { id baseRevisionId deployedRevisionId } deployedTime successDeployedTime`;

/**
 * The component's deployment in an environment, every field present ("" or 0 when the backend has none); null when
 * the read fails, which the console takes as nothing to show.
 */
export async function getDeploymentStatus(http: DevantHttp, params: GetDeploymentStatusReq): Promise<ComponentDeployment | null> {
	const args = [
		`orgHandler: ${gql(params.orgHandler)}`,
		`orgUuid: ${gql(params.orgUuid)}`,
		`componentId: ${gql(params.componentId)}`,
		`versionId: ${gql(params.deploymentTrackId)}`,
		`environmentId: ${gql(params.envId)}`,
	];
	try {
		const data = await http.graphql<{ componentDeployment: Record<string, unknown> | null }>(
			`query { componentDeployment(${args.join(", ")}) { ${DEPLOYMENT_FIELDS} } }`,
		);
		return componentDeployment(data.componentDeployment ?? {});
	} catch {
		return null;
	}
}

function componentDeployment(raw: Record<string, unknown>): ComponentDeployment {
	const build = record(raw.build);
	const commit = record(build.commit);
	const author = record(commit.author);
	return {
		environmentId: text(raw.environmentId),
		configCount: number(raw.configCount),
		apiId: text(raw.apiId),
		releaseId: text(raw.releaseId),
		// The selection asks for an object here, while the shape WI reads is a string; nothing reads it.
		apiRevision: text(raw.apiRevision),
		build: {
			buildId: text(build.buildId),
			deployedAt: text(build.deployedAt),
			commit: {
				author: { name: text(author.name), date: text(author.date), email: text(author.email), avatarUrl: text(author.avatarUrl) },
				sha: text(commit.sha),
				message: text(commit.message),
				isLatest: commit.isLatest === true,
			},
			runId: text(build.runId),
		},
		imageUrl: text(raw.imageUrl),
		invokeUrl: text(raw.invokeUrl),
		versionId: text(raw.versionId),
		deploymentStatus: text(raw.deploymentStatus),
		deploymentStatusV2: text(raw.deploymentStatusV2) as ComponentDeployment["deploymentStatusV2"],
		version: text(raw.version),
		cron: text(raw.cron),
		cronTimezone: text(raw.cronTimezone),
	};
}

/** A proxy's deployment in an environment, every field present ("" or 0 when it was never deployed there). */
export async function getProxyDeploymentInfo(http: DevantHttp, params: GetProxyDeploymentInfoReq): Promise<ProxyDeploymentInfo | null> {
	const args = [
		`orgHandler: ${gql(params.orgHandler)}`,
		`orgUuid: ${gql(params.orgUuid)}`,
		`componentId: ${gql(params.componentId)}`,
		`versionId: ${gql(params.versionId)}`,
		`environmentId: ${gql(params.envId)}`,
	];
	const data = await http.graphql<{ proxyDeployment: Record<string, unknown> | null }>(
		`query { proxyDeployment(${args.join(", ")}) { ${PROXY_DEPLOYMENT_FIELDS} } }`,
	);
	const raw = data.proxyDeployment ?? {};
	const environment = record(raw.environment);
	const revision = record(raw.apiRevision);
	const build = record(raw.build);
	return {
		apiId: text(raw.apiId),
		environment: { choreoEnv: text(environment.choreoEnv), name: text(environment.name), id: text(environment.id) },
		lifecycleStatus: text(raw.lifecycleStatus),
		version: text(raw.version),
		invokeUrl: text(raw.invokeUrl),
		endpoint: text(raw.endpoint),
		sandboxEndpoint: text(raw.sandboxEndpoint),
		apiRevision: { id: text(revision.id), displayName: text(revision.displayName), createdTime: number(revision.createdTime) },
		build: { id: text(build.id), baseRevisionId: text(build.baseRevisionId), deployedRevisionId: text(build.deployedRevisionId) },
		deployedTime: number(raw.deployedTime),
		successDeployedTime: number(raw.successDeployedTime),
	};
}

/**
 * Deploys a build to an environment. A service's endpoints are generated for the release first; a scheduled task
 * carries its schedule, a Git proxy its target URLs.
 */
export async function createDeployment(http: DevantHttp, params: CreateDeploymentReq): Promise<void> {
	const spec: Record<string, unknown> = { buildRef: params.buildRef };
	if (SERVICE_DISPLAY_TYPES.has(params.componentDisplayType)) {
		await generateEndpoints(http, params);
	} else if (SCHEDULED_DISPLAY_TYPES.has(params.componentDisplayType)) {
		if (params.cronExpression) {
			spec.scheduleExpression = params.cronExpression;
		}
		if (params.cronTimezone) {
			spec.scheduleTimezone = params.cronTimezone;
		}
	} else if (params.componentDisplayType === GIT_PROXY_DISPLAY_TYPE && (params.proxyTargetUrl || params.proxySandboxUrl)) {
		const keys: Record<string, string> = { productionEndpoint: params.proxyTargetUrl ?? "" };
		if (params.proxySandboxUrl) {
			keys.sandboxEndpoint = params.proxySandboxUrl;
		}
		spec.proxyConfig = { keys };
	}
	const path = `${DECLARATIVE_API}/projects/${segment(params.projectHandle)}/components/${segment(params.componentName)}/deploymentTracks/${segment(params.versionId)}/deployments`;
	await http.rest("POST", path, {
		body: {
			apiVersion: "core.choreo.dev/v1alpha1",
			kind: "Deployment",
			metadata: {
				name: randomUUID(),
				deploymentTrackId: params.versionId,
				environment: params.envName,
				componentName: params.componentName,
				projectName: params.projectHandle,
			},
			spec,
		},
	});
}

/** Generates a service's endpoints for the release of its deployment track in the target environment. */
async function generateEndpoints(http: DevantHttp, params: CreateDeploymentReq): Promise<void> {
	const data = await http.graphql<{ component: { apiVersions?: ApiVersion[] | null } | null }>(
		`query { component(componentHandler: ${gql(params.componentHandle)}, projectId: ${gql(params.projectId)}) { apiVersions { id appEnvVersions { environmentId releaseId } } } }`,
	);
	const track = data.component?.apiVersions?.find((version) => version.id === params.versionId);
	if (!track) {
		throw new BadRequestError(`${params.componentName} has no deployment track ${params.versionId}.`);
	}
	const release = track.appEnvVersions?.find((version) => version.environmentId === params.envId);
	if (!release) {
		throw new BadRequestError(`${params.componentName} has no release for environment ${params.envName} on this deployment track.`);
	}
	const input = [
		`componentId: ${gql(params.componentId)}`,
		`versionId: ${gql(params.versionId)}`,
		`releaseId: ${gql(release.releaseId ?? "")}`,
		`commitHash: ${gql(params.commitHash)}`,
	];
	await http.graphql(`mutation { generateComponentEndpoints(input: { ${input.join(", ")} }) { id } }`);
}

interface ApiVersion {
	id?: string;
	appEnvVersions?: { environmentId?: string; releaseId?: string }[] | null;
}

/** The state of the promotion approval for a build into an environment. */
export async function checkWorkflowStatus(http: DevantHttp, params: CheckWorkflowStatusReq): Promise<CheckWorkflowStatusResp> {
	const answer = await http.rest<{ status?: unknown; wkfInstanceId?: unknown } | null>("GET", `${WORKFLOW_API}/workflow-instances/status`, {
		query: { wkfDefinitionId: "ENV_PROMOTION", resource: `${params.buildId}_${params.envId}` },
	});
	return { status: text(answer?.status), wkfInstanceId: text(answer?.wkfInstanceId) };
}

export async function cancelApprovalRequest(http: DevantHttp, params: CancelApprovalReq): Promise<void> {
	// The workflow service may answer plain text, such as an instance id; the answer is not read.
	await http.text("POST", `${WORKFLOW_API}/workflow-instances/${segment(params.wkfInstanceId)}/cancellation`);
}

/** Asks for approval to promote a build into an environment. */
export async function requestPromoteApproval(http: DevantHttp, params: RequestPromoteApprovalReq): Promise<void> {
	await http.text("POST", `${WORKFLOW_API}/workflow-instances`, {
		body: {
			projectId: params.projectId,
			requestComment: params.requestComment,
			context: { workflowDefinitionIdentifier: "ENV_PROMOTION", resource: `${params.buildId}_${params.envId}` },
			data: {
				payload: {
					orgName: params.orgHandler,
					projectName: params.projectName,
					componentName: params.componentName,
					buildId: params.buildId,
					envFrom: { id: params.envFromId, name: params.envFromName },
					envTo: { id: params.envId, name: params.envName },
				},
				metadata: {},
			},
		},
	});
}

/** Promotes a proxy's build from one environment to another. */
export async function promoteProxyDeployment(http: DevantHttp, params: PromoteProxyDeploymentReq): Promise<void> {
	await http.rest("POST", `${PROXY_DEPLOYER}/components/${segment(params.componentId)}/versions/${segment(params.apiId)}/promote`, {
		baseUrl: appHost(http),
		query: { fromEnv: params.promoteFromEnvId, targetEnv: params.envId, buildId: params.buildId, accessMode: "external" },
	});
}

function appHost(http: DevantHttp): string {
	const host = http.deployment.appHost;
	if (!host) {
		throw new NotSupportedError("This WSO2 Cloud deployment names no app host, which proxies are deployed through.");
	}
	return host;
}

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
	return typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "";
}

function number(value: unknown): number {
	return typeof value === "number" ? value : 0;
}
