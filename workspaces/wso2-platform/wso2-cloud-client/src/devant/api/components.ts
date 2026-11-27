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

import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import type {
	ApiVersion,
	BuildPackReq,
	Buildpack,
	ChangePrebuiltIntegrationRepositoryReq,
	CommitHistory,
	ComponentEP,
	ComponentKind,
	ComponentKindGitProviderSource,
	ComponentKindSource,
	ComponentKindSpecBuild,
	CreateComponentReq,
	CreateConfigYamlReq,
	DeleteCompReq,
	DeploymentTrack,
	GetCommitsReq,
	GetComponentEndpointsReq,
	GetComponentItemReq,
	GetComponentUsageReq,
	GetComponentUsageResp,
	GetComponentsReq,
	GetDeploymentTracksReq,
	UpdateCodeServerReq,
} from "@wso2/wso2-platform-core";
import { segment } from "../../api/path";
import { BadRequestError, ConflictError, NotFoundError, PlanLimitError, UnauthenticatedError } from "../../errors";
import type { DevantHttp } from "./http";
import { gql, orgNumber } from "./http";

/** The declarative API, which creates and reads components and builds as resources. */
export const DECLARATIVE_API = "/declarative-api/v1.0/core/v1alpha1";
export const COMPONENT_MGT_API = "/component-mgt/1.0.0";
export const DEVOPS_API = "/devops/1.0.0";

const DEPLOYMENT_TRACK_FIELDS = "id, createdAt, updatedAt, apiVersion, branch, description, componentId, latest, versionStrategy";
const LIST_FIELDS = `projectId, id, description, name, handler, displayName, displayType, version, createdAt, lastBuildDate, orgHandler, isPrebuilt, apiVersions { apiVersion, proxyName, proxyUrl, proxyId, id, state, latest, branch, accessibility }, deploymentTracks { ${DEPLOYMENT_TRACK_FIELDS} }, isSystemComponent`;
const REPOSITORY_FIELDS =
	"bitbucketServerUrl, serverUrl, gitProvider, nameApp, nameConfig, branch, branchApp, organizationApp, organizationConfig, isUserManage, appSubPath";
const COMPONENT_FIELDS = `name, version, description, handler, orgHandler, projectId, displayName, displayType, createdAt, id, isPrebuilt, apiVersions { id, apiVersion, latest, versionId, appEnvVersions { environmentId, releaseId } }, deploymentTracks { ${DEPLOYMENT_TRACK_FIELDS} }`;
const FULL_COMPONENT_FIELDS = `${COMPONENT_FIELDS}, repository { ${REPOSITORY_FIELDS}, repoCredRef, byocBuildConfig { id, isMainContainer, containerId, componentId, repositoryId, dockerContext, dockerfilePath, oasFilePath }, buildpackConfig { versionId, buildContext, languageVersion, buildpack { id, language } }, byocWebAppBuildConfig { id, containerId, componentId, repositoryId, dockerContext, webAppType, buildCommand, packageManagerVersion, outputDirectory } }, project { id, orgId, name, version, createdDate, handler, region, description, repository, branch, gitProvider, gitOrganization }`;
// A git proxy's component answers 500 when the build configurations are asked for, so only the repository is.
const PROXY_COMPONENT_FIELDS = `${COMPONENT_FIELDS}, repository { ${REPOSITORY_FIELDS} }`;

const GIT_PROXY = "gitProxy";
/** The public registry Devant's sample and system images are pulled from. */
export const SAMPLES_REGISTRY_HOST = "choreoanonymouspullable.azurecr.io";
/** At most this many component reads run at once when a list is filled in. */
const FAN_OUT = 4;

/** A component as Devant's GraphQL answers it. */
interface RawComponent {
	id?: string;
	name?: string;
	handler?: string;
	displayName?: string;
	displayType?: string;
	componentSubType?: string;
	createdAt?: string;
	isPrebuilt?: boolean;
	apiVersions?: ApiVersion[] | null;
	deploymentTracks?: DeploymentTrack[] | null;
	repository?: RawRepository | null;
}

interface RawRepository {
	bitbucketServerUrl?: string;
	serverUrl?: string;
	repoCredRef?: string;
	gitProvider?: string;
	nameApp?: string;
	organizationApp?: string;
	appSubPath?: string;
	byocBuildConfig?: { dockerContext?: string; dockerfilePath?: string } | null;
	buildpackConfig?: { buildContext?: string; languageVersion?: string; buildpack?: { language?: string } | null }[] | null;
	byocWebAppBuildConfig?: { webAppType?: string; buildCommand?: string; packageManagerVersion?: string; outputDirectory?: string } | null;
}

/** A component resource as the declarative API answers it; any field may be missing. */
interface RawComponentKind {
	apiVersion?: string;
	kind?: string;
	metadata?: Record<string, unknown> | null;
	spec?: {
		type?: string;
		subType?: string;
		source?: Record<string, unknown> | null;
		build?: Record<string, unknown> | null;
		proxyConfig?: Record<string, unknown> | null;
	} | null;
	originCloud?: string | null;
}

interface ProxyConfig {
	version: string;
	context: string;
	endpointUrl: string;
	accessibility: string;
}

interface ComponentMetadata {
	name: string;
	displayName: string;
	projectName: string;
	description: string;
	id?: string;
	handler?: string;
	isPrebuilt?: boolean;
}

interface ComponentBuild extends ComponentKindSpecBuild {
	enableAutoBuild?: boolean;
	enableAutoDeploy?: boolean;
}

/** A component resource in the shape WSO2 Integrator reads: what the Choreo CLI encoded, empty fields and all. */
interface ComponentResource {
	apiVersion: string;
	kind: string;
	metadata: ComponentMetadata;
	spec: { type: string; subType: string; source: ComponentKindSource; build: ComponentBuild; proxyConfig: ProxyConfig };
}

/** A component of a list, with what its own read adds. */
interface ListedComponent extends ComponentResource {
	deploymentTracks: DeploymentTrack[];
	apiVersions: ApiVersion[];
	createdAt: string;
}

/** The components of a project, newest first, each filled in from its own read. */
export async function getComponentList(http: DevantHttp, params: GetComponentsReq): Promise<ComponentKind[]> {
	const data = await http.graphql<{ components: RawComponent[] | null }>(
		`query { components(orgHandler: ${gql(params.orgHandle)}, projectId: ${gql(params.projectId)}) { ${LIST_FIELDS} } }`,
	);
	const items = (data.components ?? []).map((raw) => {
		const item = listedComponent(
			metadataOf(str(raw.name), str(raw.displayName), str(raw.id), str(raw.handler), raw.isPrebuilt === true),
			str(raw.displayType),
			str(raw.componentSubType),
		);
		item.deploymentTracks = raw.deploymentTracks ?? [];
		return item;
	});
	await mapLimit(items, FAN_OUT, (item) => fillIn(http, item, params.projectId));
	return newestFirst(items) as unknown as ComponentKind[];
}

/** A component as the declarative API holds it. */
export async function getComponentItem(http: DevantHttp, params: GetComponentItemReq): Promise<ComponentKind> {
	const raw = await http.rest<RawComponentKind>(
		"GET",
		`${DECLARATIVE_API}/projects/${segment(params.projectHandle)}/components/${segment(params.componentName)}`,
	);
	return componentResourceOf(raw) as unknown as ComponentKind;
}

/** The build packs a type of component can be built with. */
export async function getBuildPacks(http: DevantHttp, params: BuildPackReq): Promise<Buildpack[]> {
	const packs = await http.rest<Record<string, unknown>[] | null>("GET", `${DEVOPS_API}/api/v1/buildpacks`, {
		query: { orgUuid: params.orgUuid, componentType: params.componentType },
	});
	const list = [...(packs ?? [])];
	// The Ballerina build pack is not offered yet.
	const ballerina = list.findIndex((pack) => pack?.displayName === "Ballerina Buildpack");
	if (ballerina >= 0) {
		list.splice(ballerina, 1);
	}
	return list.map(buildPackOf) as unknown as Buildpack[];
}

/**
 * Creates a component from a directory of a local Git repository, then reads it back as a list item. The
 * repository is found from the directory; the component builds from that directory, relative to its root.
 */
export async function createComponent(http: DevantHttp, params: CreateComponentReq): Promise<ComponentKind> {
	const subPath = await repositorySubPath(params.componentDir);
	assertGitUrl(params.repoUrl);
	const created = await http.rest<RawComponentKind>("POST", `${DECLARATIVE_API}/projects/${segment(params.projectHandle)}/components`, {
		body: componentRequest(params, subPath),
		mapStatus: (status, body) =>
			(status === 403 || status === 404) && body.message?.includes("free tier")
				? new PlanLimitError("The organization has as many components as its WSO2 Cloud plan allows.", { status, apiMessage: body.message })
				: undefined,
	});
	const metadata = created?.metadata ?? {};
	const item = listedComponent(
		metadataOf(str(metadata.name), str(metadata.displayName), str(metadata.id), params.name, false),
		str(created?.spec?.type),
		"",
	);
	const info = await fillIn(http, item, params.projectId);
	item.deploymentTracks = info?.deploymentTracks ?? [];
	return item as unknown as ComponentKind;
}

/**
 * Writes `.choreo/component.yaml` into the component's directory, with the service's endpoint for a service, and
 * answers its path. An existing file is replaced.
 */
export async function createComponentConfig(_http: DevantHttp, params: CreateConfigYamlReq): Promise<string> {
	const lines = ["schemaVersion: 1.2"];
	if (params.type === "service") {
		lines.push("endpoints:", ...endpointYaml(params.inbound));
	}
	const file = join(params.componentDir, ".choreo", "component.yaml");
	await mkdir(dirname(file), { recursive: true, mode: 0o755 });
	await writeFile(file, `${lines.join("\n")}\n`, { mode: 0o644 });
	return file;
}

export async function deleteComponent(http: DevantHttp, params: DeleteCompReq): Promise<void> {
	const data = await http.graphql<{ deleteComponentV2: { status?: string; canDelete?: boolean; message?: string } | null }>(
		`mutation { deleteComponentV2(orgHandler: ${gql(params.orgHandler)}, componentId: ${gql(params.componentId)}, projectId: ${gql(params.projectId)}) { status, canDelete, message, encodedData } }`,
	);
	const answer = data.deleteComponentV2;
	if (answer?.status === "error") {
		throw new ConflictError(answer.message || "WSO2 Cloud did not delete the component.", { apiMessage: answer.message });
	}
}

/** A component's deployment tracks, one per branch it builds from. */
export async function getDeploymentTracks(http: DevantHttp, params: GetDeploymentTracksReq): Promise<DeploymentTrack[]> {
	const data = await http.graphql<{ component: { deploymentTracks?: DeploymentTrack[] | null } | null }>(
		`query { component(componentHandler: ${gql(params.componentHandle)}, projectId: ${gql(params.projectId)}) { deploymentTracks { ${DEPLOYMENT_TRACK_FIELDS} } } }`,
	);
	return data.component?.deploymentTracks ?? [];
}

/** The commits of a component's branch, newest first, as Devant reads them from its repository. */
export async function getCommits(http: DevantHttp, params: GetCommitsReq): Promise<CommitHistory[]> {
	return commitHistory(http, params.componentId, params.branch);
}

/** The commits of a component's branch, with their authors. */
export async function commitHistory(http: DevantHttp, componentId: string, branch: string): Promise<CommitHistoryWithAuthor[]> {
	const data = await http.graphql<{ commitHistory: CommitHistoryWithAuthor[] | null }>(
		`query { commitHistory(componentId: ${gql(componentId)}, branch: ${gql(branch)}) { message, sha, isLatest, author { name, date, email, avatarUrl } } }`,
	);
	return data.commitHistory ?? [];
}

export interface CommitHistoryWithAuthor extends CommitHistory {
	author?: { name?: string; date?: string; email?: string; avatarUrl?: string } | null;
}

/** The endpoints a deployment track of a component exposes, in every environment. */
export async function getComponentEndpoints(http: DevantHttp, params: GetComponentEndpointsReq): Promise<ComponentEP[]> {
	const fields =
		"id, createdAt, updatedAt, releaseId, environmentId, displayName, port, type, apiContext, apiDefinitionPath, invokeUrl, visibility, networkVisibilities, hostName, isAutoGenerated, apimId, apimRevisionId, apimName, projectUrl, organizationUrl, publicUrl, state, stateReason { code, message, details, workerId }, isDeleted, deletedAt";
	const data = await http.graphql<{ componentEndpoints: ComponentEP[] | null }>(
		`query { componentEndpoints(input: { componentId: ${gql(params.componentId)}, versionId: ${gql(params.deploymentTrackId)} }) { ${fields} } }`,
	);
	return data.componentEndpoints ?? [];
}

/** How many components the organization has against its plan's limits. */
export async function getComponentUsage(http: DevantHttp, params: GetComponentUsageReq): Promise<GetComponentUsageResp> {
	return http.rest<GetComponentUsageResp>("GET", `${COMPONENT_MGT_API}/orgs/${segment(params.orgUuid)}/component-limits`, {
		query: { originCloud: params.cloudOrigin },
	});
}

/** Points a component's code server at a commit, with Devant's code server image for the signed-in person. */
export async function updateCodeServer(http: DevantHttp, params: UpdateCodeServerReq): Promise<void> {
	const userId = await signedInUserId(http);
	const registry = await samplesRegistry(http, params.orgUuid);
	const samples = await http.rest<{ data?: { images?: { name?: string; image_url?: string }[] | null } } | null>(
		"GET",
		`${DEVOPS_API}/api/v1/byoi/components/choreo-sample-images`,
		{ query: { organization_id: params.orgUuid, project_id: params.projectId } },
	);
	const image = samples?.data?.images?.find((item) => item.name === "Code Server");
	if (!image) {
		throw new NotFoundError("WSO2 Cloud offers no code server image.");
	}
	const input = [
		`userId: ${gql(userId)}`,
		`organizationId: ${gql(params.orgUuid)}`,
		`projectId: ${gql(params.projectId)}`,
		`componentId: ${gql(params.componentId)}`,
		`orgHandle: ${gql(params.orgHandle)}`,
		`imageUrl: ${gql(str(image.image_url))}`,
		`registryId: ${gql(registry)}`,
		`sourceCommitHash: ${gql(params.sourceCommitHash)}`,
	];
	await http.graphql(`mutation { updateCodeServer(input: { ${input.join(", ")} }) }`);
}

/** Moves a prebuilt integration's source to a repository of the person's own. */
export async function changePrebuiltIntegrationRepository(http: DevantHttp, params: ChangePrebuiltIntegrationRepositoryReq): Promise<void> {
	const fields = [
		`orgId: ${gql(orgNumber(params.orgId))}`,
		`orgHandler: ${gql(params.orgHandler)}`,
		`projectId: ${gql(params.projectId)}`,
		`componentId: ${gql(params.componentId)}`,
		`srcGitRepoUrl: ${gql(params.srcGitRepoUrl)}`,
		`repositorySubPath: ${gql(params.repositorySubPath)}`,
		`repositoryType: ${gql("UserManagedNonEmpty")}`,
		`repositoryBranch: ${gql(params.repositoryBranch)}`,
		`secretRef: ${gql(params.secretRef)}`,
		`isPublicRepo: ${gql(params.isPublicRepo === true)}`,
		`originCloud: ${gql(params.originCloud)}`,
	];
	await http.graphql(`mutation { changePrebuiltIntegrationRepository(newRepository: { ${fields.join(", ")} }) }`);
}

function str(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function metadataOf(name: string, displayName: string, id: string, handler: string, isPrebuilt: boolean): ComponentMetadata {
	const metadata: ComponentMetadata = { name, displayName, projectName: "", description: "" };
	if (id) {
		metadata.id = id;
	}
	if (handler) {
		metadata.handler = handler;
	}
	if (isPrebuilt) {
		metadata.isPrebuilt = true;
	}
	return metadata;
}

function emptyProxyConfig(): ProxyConfig {
	return { version: "", context: "", endpointUrl: "", accessibility: "" };
}

function listedComponent(metadata: ComponentMetadata, type: string, subType: string): ListedComponent {
	return {
		apiVersion: "",
		kind: "",
		metadata,
		spec: { type, subType, source: { secretRef: "" }, build: {}, proxyConfig: emptyProxyConfig() },
		deploymentTracks: [],
		apiVersions: [],
		createdAt: "",
	};
}

/**
 * Fills a listed component in from its own read: tracks, API versions, creation time, source and build. A read that
 * fails leaves the item as the list gave it; the component read is answered.
 */
async function fillIn(http: DevantHttp, item: ListedComponent, projectId: string): Promise<RawComponent | undefined> {
	const fields = item.spec.type === GIT_PROXY ? PROXY_COMPONENT_FIELDS : FULL_COMPONENT_FIELDS;
	let info: RawComponent | null;
	try {
		const data = await http.graphql<{ component: RawComponent | null }>(
			`query { component(componentHandler: ${gql(item.metadata.handler ?? "")}, projectId: ${gql(projectId)}) { ${fields} } }`,
		);
		info = data.component;
	} catch {
		return undefined;
	}
	const component = info ?? {};
	if (component.deploymentTracks?.length) {
		item.deploymentTracks = component.deploymentTracks;
	}
	if (component.apiVersions?.length) {
		item.apiVersions = component.apiVersions;
	}
	item.createdAt = str(component.createdAt);
	const source = sourceOf(component);
	if (source) {
		item.spec.source = source;
	}
	const build = buildOf(component);
	if (build) {
		item.spec.build = build;
	}
	return component;
}

/** Where a component's code is: the repository's URL as its provider writes it, and the directory in it. */
function sourceOf(component: RawComponent): ComponentKindSource | undefined {
	const repo = component.repository ?? {};
	const displayType = str(component.displayType);
	let path = "";
	if (displayType.startsWith("mi")) {
		path = str(repo.appSubPath);
	} else if (repo.byocBuildConfig) {
		path = str(repo.byocBuildConfig.dockerContext);
	} else if (repo.buildpackConfig?.length) {
		path = str(repo.buildpackConfig[0].buildContext);
	} else if (repo.appSubPath) {
		path = repo.appSubPath;
	}
	const org = str(repo.organizationApp);
	const name = str(repo.nameApp);
	const secretRef = str(repo.repoCredRef);
	const at = (repository: string): ComponentKindGitProviderSource => ({ repository, branch: "", path });
	switch (repo.gitProvider) {
		case "github":
			return { github: at(`https://github.com/${org}/${name}`), secretRef: "" };
		case "bitbucket":
			return { bitbucket: at(`https://bitbucket.org/${org}/${name}`), secretRef };
		case "bitbucket-server":
			return { bitbucket: at(`${str(repo.bitbucketServerUrl)}/projects/${org}/${name}`), secretRef };
		case "gitlab-server":
			return { gitlab: at(`${str(repo.serverUrl)}/${org}/${name}`), secretRef };
		default:
			return undefined;
	}
}

/** How a component is built, from its display type and the repository's build configuration. */
function buildOf(component: RawComponent): ComponentBuild | undefined {
	const repo = component.repository ?? {};
	const displayType = str(component.displayType);
	if (displayType === "byocWebAppsDockerfileLess") {
		const webapp = repo.byocWebAppBuildConfig ?? {};
		return {
			webapp: {
				buildCommand: str(webapp.buildCommand),
				nodeVersion: str(webapp.packageManagerVersion),
				outputDir: str(webapp.outputDirectory),
				type: str(webapp.webAppType),
			},
		};
	}
	if (displayType.startsWith("byoc")) {
		const docker = repo.byocBuildConfig ?? {};
		return { docker: { dockerFilePath: str(docker.dockerfilePath), dockerContextPath: str(docker.dockerContext) } };
	}
	if (displayType.startsWith("buildpack")) {
		const config = repo.buildpackConfig?.[0];
		return config ? { buildpack: { language: str(config.buildpack?.language), version: str(config.languageVersion) } } : undefined;
	}
	if (displayType.startsWith("mi")) {
		return { buildpack: { language: "WSO2 MI", version: "Auto Detected" } };
	}
	return undefined;
}

const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i;

/** Most recently created first; those without a readable time last, in the order they came. */
function newestFirst(items: ListedComponent[]): ListedComponent[] {
	const time = (item: ListedComponent) => (RFC3339.test(item.createdAt) ? Date.parse(item.createdAt) : Number.NaN);
	const dated = items.filter((item) => !Number.isNaN(time(item))).sort((a, b) => time(b) - time(a));
	return [...dated, ...items.filter((item) => Number.isNaN(time(item)))];
}

/** Runs `task` over `items`, at most `limit` at a time. */
async function mapLimit<T>(items: readonly T[], limit: number, task: (item: T) => Promise<unknown>): Promise<void> {
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const item = items[next++];
			await task(item);
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/** A component resource with only the fields the CLI's model kept, and their empty values where missing. */
function componentResourceOf(raw: RawComponentKind | null | undefined): ComponentResource & { originCloud: string | null } {
	const metadata = raw?.metadata ?? {};
	const spec = raw?.spec ?? {};
	return {
		apiVersion: str(raw?.apiVersion),
		kind: str(raw?.kind),
		metadata: {
			...metadataOf(str(metadata.name), str(metadata.displayName), str(metadata.id), str(metadata.handler), metadata.isPrebuilt === true),
			projectName: str(metadata.projectName),
			description: str(metadata.description),
		},
		spec: {
			type: str(spec.type),
			subType: str(spec.subType),
			source: resourceSourceOf(spec.source ?? {}),
			build: resourceBuildOf(spec.build ?? {}),
			proxyConfig: {
				version: str(spec.proxyConfig?.version),
				context: str(spec.proxyConfig?.context),
				endpointUrl: str(spec.proxyConfig?.endpointUrl),
				accessibility: str(spec.proxyConfig?.accessibility),
			},
		},
		originCloud: typeof raw?.originCloud === "string" ? raw.originCloud : null,
	};
}

function resourceSourceOf(source: Record<string, unknown>): ComponentKindSource {
	const result: ComponentKindSource = {};
	for (const provider of ["bitbucket", "github", "gitlab"] as const) {
		const value = source[provider] as Record<string, unknown> | null | undefined;
		if (value) {
			result[provider] = { repository: str(value.repository), branch: str(value.branch), path: str(value.path) };
		}
	}
	result.secretRef = str(source.secretRef);
	return result;
}

function resourceBuildOf(build: Record<string, unknown>): ComponentBuild {
	const result: ComponentBuild = {};
	const docker = build.docker as Record<string, unknown> | null | undefined;
	if (docker) {
		result.docker = { dockerFilePath: str(docker.dockerFilePath), dockerContextPath: str(docker.dockerContextPath) };
		if (num(docker.port)) {
			result.docker.port = num(docker.port);
		}
	}
	const ballerina = build.ballerina as Record<string, unknown> | null | undefined;
	if (ballerina) {
		result.ballerina = { sampleTemplate: str(ballerina.sampleTemplate), enableCellDiagram: ballerina.enableCellDiagram === true };
	}
	const webapp = build.webapp as Record<string, unknown> | null | undefined;
	if (webapp) {
		result.webapp = {
			buildCommand: str(webapp.buildCommand),
			nodeVersion: str(webapp.nodeVersion),
			outputDir: str(webapp.outputDir),
			type: str(webapp.type),
		};
	}
	const buildpack = build.buildpack as Record<string, unknown> | null | undefined;
	if (buildpack) {
		result.buildpack = { language: str(buildpack.language), version: str(buildpack.version) };
		if (num(buildpack.port)) {
			result.buildpack.port = num(buildpack.port);
		}
	}
	if (build.enableAutoBuild === true) {
		result.enableAutoBuild = true;
	}
	if (build.enableAutoDeploy === true) {
		result.enableAutoDeploy = true;
	}
	return result;
}

/** A build pack with the fields the CLI's model kept, under the names it wrote them with. */
function buildPackOf(raw: Record<string, unknown>): Record<string, unknown> {
	const builder = (raw?.builder ?? {}) as Record<string, unknown>;
	const types = raw?.componentTypes as Record<string, unknown>[] | null | undefined;
	return {
		id: str(raw?.id),
		language: str(raw?.language),
		supportedVersions: str(raw?.supportedVersions),
		displayName: str(raw?.displayName),
		isDefault: raw?.isDefault === true,
		versionEnvVariable: str(raw?.versionEnvVariable),
		iconUrl: str(raw?.iconUrl),
		provider: str(raw?.provider),
		buidpackProviderOrgUuid: str(raw?.buidpackProviderOrgUuid),
		// The CLI's model had no JSON names for these two, so they went out capitalized.
		Builder: {
			id: str(builder.id),
			builderImage: str(builder.builderImage),
			displayName: str(builder.displayName),
			imageHash: str(builder.imageHash),
		},
		ComponentTypes: Array.isArray(types)
			? types.map((type) => ({ id: str(type?.id), displayName: str(type?.displayName), type: str(type?.type) }))
			: null,
	};
}

/** The directory, relative to the root of the Git repository it is in, with forward slashes; empty at the root. */
async function repositorySubPath(componentDir: string): Promise<string> {
	let dir = componentDir;
	for (;;) {
		if (await exists(join(dir, ".git"))) {
			const subPath = relative(dir, componentDir);
			return subPath === "." ? "" : subPath.split(sep).join("/");
		}
		const parent = dirname(dir);
		if (parent === dir) {
			throw new BadRequestError(`${componentDir} is not in a Git repository.`);
		}
		dir = parent;
	}
}

async function exists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

/** Refuses a repository URL with no organization and repository in it. */
function assertGitUrl(url: string): void {
	let parts: string[] = [];
	if (url.startsWith("https://") || url.startsWith("http://")) {
		parts = url.split("/");
	} else if (url.startsWith("git@")) {
		parts = (url.split(":")[1] ?? "").split("/");
	}
	if (parts.length < 2) {
		throw new BadRequestError(`${url} is not a Git repository URL.`);
	}
}

const SPA_BUILD_PACKS = ["react", "vuejs", "angular"];

/** The display type a component type and build pack make, such as `byocService`. */
export function displayTypeFor(type: string, buildPack: string): string {
	const pick = (byPack: Record<string, string>, otherwise: string) => byPack[buildPack] ?? otherwise;
	switch (type) {
		case "service":
			return pick(
				{ ballerina: "ballerinaService", docker: "byocService", microintegrator: "miApiService", prism: "prismMockService" },
				"buildpackService",
			);
		case "manualTask":
			return pick({ ballerina: "manualTrigger", docker: "byocJob", microintegrator: "miJob" }, "buildpackJob");
		case "webApp":
			return buildPack === "docker"
				? "byocWebApp"
				: [...SPA_BUILD_PACKS, "staticweb"].includes(buildPack)
					? "byocWebAppsDockerfileLess"
					: "buildpackWebApp";
		case "webhook":
			return "webhook";
		case "scheduleTask":
			return pick({ ballerina: "scheduledTask", docker: "byocCronjob", microintegrator: "miCronjob" }, "buildpackCronjob");
		case "eventHandler":
			return pick({ ballerina: "ballerinaEventHandler", docker: "byocEventHandler", microintegrator: "miEventHandler" }, "buildpackEventHandler");
		case "proxy":
			return "gitProxy";
		default:
			return "";
	}
}

/** The component resource the declarative API creates a component from. */
function componentRequest(params: CreateComponentReq, subPath: string): Record<string, unknown> {
	const displayType = displayTypeFor(params.type, params.buildPackLang);
	const name = params.name
		.toLowerCase()
		.replace(/ /g, "-")
		.replace(/[^a-z0-9-]/g, "")
		.slice(0, 25);
	const repo: ComponentKindGitProviderSource = { repository: params.repoUrl, branch: params.branch, path: subPath };
	const source: ComponentKindSource =
		params.gitProvider === "gitlab-server"
			? { gitlab: repo, secretRef: params.gitCredRef }
			: params.gitProvider === "bitbucket"
				? { bitbucket: repo, secretRef: params.gitCredRef }
				: { github: repo, secretRef: "" };

	let proxyConfig = emptyProxyConfig();
	if (params.type === "proxy") {
		const context = params.proxyApiContext ?? "";
		proxyConfig = {
			version: params.proxyApiVersion ?? "",
			context: context.startsWith(`${params.projectHandle}/`) ? context : `${params.orgUUID}/${params.projectHandle}/${context}`,
			endpointUrl: params.proxyEndpointUrl ?? "",
			accessibility: params.proxyAccessibility ?? "",
		};
	}

	let subType = params.componentSubType;
	if (subType === "fileIntegration") {
		if (params.buildPackLang === "ballerina" && displayType === "ballerinaEventHandler") {
			subType = "ballerinaFileIntegration";
		} else if (params.buildPackLang === "microintegrator" && displayType === "miEventHandler") {
			subType = "miFileIntegration";
		}
	}

	const port = params.type === "webApp" && params.port ? { port: params.port } : {};
	const build: ComponentBuild = {};
	if (params.buildPackLang === "docker") {
		build.docker = { dockerFilePath: params.dockerFile ?? "", dockerContextPath: subPath, ...port };
	} else if (params.buildPackLang === "ballerina") {
		build.ballerina = { sampleTemplate: "", enableCellDiagram: true };
	} else if ([...SPA_BUILD_PACKS, "staticweb"].includes(params.buildPackLang)) {
		const type = params.buildPackLang === "staticweb" ? "StaticFiles" : params.buildPackLang;
		build.webapp = {
			buildCommand: params.spaBuildCommand,
			nodeVersion: params.spaNodeVersion,
			outputDir: params.spaOutputDir,
			type: type.charAt(0).toUpperCase() + type.slice(1),
		};
	} else if (params.buildPackLang !== "microintegrator") {
		build.buildpack = { language: params.buildPackLang, version: params.langVersion, ...port };
	}
	build.enableAutoBuild = true;
	build.enableAutoDeploy = true;

	return {
		apiVersion: "core.choreo.dev/v1alpha1",
		kind: "Component",
		metadata: { name, displayName: params.displayName || params.name, projectName: params.projectHandle, description: "" },
		spec: { type: displayType, subType, source, build, proxyConfig },
		originCloud: params.originCloud || "choreo",
	};
}

/** The YAML lines of a service's one endpoint, under `endpoints:`. */
function endpointYaml(inbound: CreateConfigYamlReq["inbound"]): string[] {
	const endpoint = (inbound ?? {}) as Partial<NonNullable<CreateConfigYamlReq["inbound"]>> & { displayName?: string; networkVisibilities?: string[] };
	const lines = [`  - name: ${yamlString(endpoint.name ?? "")}`];
	if (endpoint.displayName) {
		lines.push(`    displayName: ${yamlString(endpoint.displayName)}`);
	}
	lines.push("    service:");
	if (endpoint.context) {
		lines.push(`      basePath: ${yamlString(endpoint.context)}`);
	}
	lines.push(`      port: ${num(endpoint.port)}`, `    type: ${yamlString(endpoint.type ?? "")}`);
	if (endpoint.networkVisibilities?.length) {
		lines.push("    networkVisibilities:", ...endpoint.networkVisibilities.map((visibility) => `      - ${yamlString(visibility)}`));
	}
	if (endpoint.schemaFilePath) {
		lines.push(`    schemaFilePath: ${yamlString(endpoint.schemaFilePath)}`);
	}
	return lines;
}

/** A string as a YAML scalar: plain when that reads back as the same string, double quoted otherwise. */
function yamlString(value: string): string {
	return /^[A-Za-z_/][\w./-]*$/.test(value) && !/^(true|false|null|yes|no|on|off|y|n)$/i.test(value) ? value : JSON.stringify(value);
}

/** The id of the samples registry, registered for the organization when it is not yet. */
export async function samplesRegistry(http: DevantHttp, orgUuid: string): Promise<string> {
	const path = `${DEVOPS_API}/api/v1/container-registries`;
	const query = { organization_id: orgUuid };
	const find = async () => {
		const answer = await http.rest<{ data?: { id?: string; host?: string }[] | null } | null>("GET", path, { query });
		return answer?.data?.find((registry) => registry.host === SAMPLES_REGISTRY_HOST)?.id;
	};
	const found = await find();
	if (found) {
		return found;
	}
	await http.rest("POST", path, {
		query,
		body: { name: "Choreo Samples Registry", type: "vendor-specific", provider: "Azure", credential: { host: SAMPLES_REGISTRY_HOST } },
	});
	const registered = await find();
	if (!registered) {
		throw new NotFoundError("WSO2 Cloud did not register its samples registry for the organization.");
	}
	return registered;
}

/** The signed-in person's IdP id: the `sub` of the session's token. */
async function signedInUserId(http: DevantHttp): Promise<string> {
	const sub = (await http.claims())?.sub;
	if (!sub) {
		throw new UnauthenticatedError("no_session", "Not signed in to WSO2 Cloud.");
	}
	return sub;
}
