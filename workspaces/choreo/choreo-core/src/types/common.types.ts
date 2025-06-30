/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import type { ChoreoComponentType, DeploymentStatus } from "../enums";

export interface Organization {
	id: number;
	uuid: string;
	handle: string;
	name: string;
	owner: { id: string; idpId: string; createdAt: Date };
}

export interface UserInfo {
	displayName: string;
	userEmail: string;
	userProfilePictureUrl: string;
	idpId: string;
	organizations: Organization[];
	userId: string;
	userCreatedAt: Date;
}

export interface ComponentKindGitProviderSource {
	repository: string;
	branch: string;
	path: string;
}

export interface ComponentKindSource {
	bitbucket?: ComponentKindGitProviderSource;
	github?: ComponentKindGitProviderSource;
	gitlab?: ComponentKindGitProviderSource;
}

export interface ComponentKindBuildDocker {
	dockerFilePath: string;
	dockerContextPath: string;
	port?: number;
}

export interface ComponentKindBuildBallerina {
	sampleTemplate: string;
	enableCellDiagram: boolean;
}

export interface ComponentKindBuildWebapp {
	buildCommand: string;
	nodeVersion: string;
	outputDir: string;
	type: string;
}

export interface ComponentKindBuildBuildpack {
	language: string;
	version: string;
	port?: number;
}

export interface ComponentKindSpecBuild {
	docker?: ComponentKindBuildDocker;
	ballerina?: ComponentKindBuildBallerina;
	webapp?: ComponentKindBuildWebapp;
	buildpack?: ComponentKindBuildBuildpack;
}

export interface ComponentKindMetadata {
	name: string;
	displayName: string;
	projectName: string;
	id: string;
	handler: string;
}

export interface ComponentKindSpec {
	type: string;
	source: ComponentKindSource;
	build: ComponentKindSpecBuild;
}

export interface ComponentKind {
	apiVersion: string;
	kind: string;
	metadata: ComponentKindMetadata;
	spec: ComponentKindSpec;
	deploymentTracks: DeploymentTrack[];
	apiVersions: ApiVersion[];
	createdAt: string;
}

export interface Project {
	createdData: string;
	handler: string;
	id: string;
	name: string;
	orgId: string;
	region: string;
	version: string;
	description: string;
	repository?: string;
	credentialId?: string;
	branch?: string;
	gitOrganization?: string;
	gitProvider?: string;
}

export interface Buildpack {
	id: string;
	buildpackImage: string;
	language: string;
	supportedVersions: string;
	displayName: string;
	isDefault: true;
	versionEnvVariable: string;
	iconUrl: string;
	provider: string;
	builder: { id: string; builderImage: string; displayName: string; imageHash: string };
	componentTypes: { id: string; displayName: string; type: string }[];
}

export interface BuildKind {
	apiVersion: string;
	kind: string;
	metadata: {
		name: string;
		componentName: string;
		projectName: string;
	};
	spec: { revision: string };
	status: {
		runId: number;
		conclusion: string;
		status: string;
		startedAt: string;
		completedAt: string;
		images: { id: string; createdAt: string; updatedAt: string }[];
		gitCommit: { message: string; author: string; date: string; email: string };
	};
}

export interface DeploymentTrack {
	id: string;
	createdAt: string;
	updatedAt: string;
	apiVersion: string;
	branch: string;
	description: string;
	componentId: string;
	latest: boolean;
	versionStrategy: string;
}

export interface ApiVersion {
	apiVersion: string;
	proxyName: string;
	proxyUrl: string;
	proxyId: string;
	id: string;
	state: string;
	latest: boolean;
	branch: string;
	versionId: string;
	appEnvVersions: AppEnvVersions[];
}

export interface AppEnvVersions {
	environmentId: string;
	releaseId: string;
}

export interface CommitHistory {
	message: string;
	sha: string;
	isLatest: boolean;
}

export enum ChoreoBuildPackNames {
	Ballerina = "ballerina",
	Docker = "docker",
	React = "react",
	Angular = "angular",
	Vue = "vuejs",
	StaticFiles = "staticweb",
	MicroIntegrator = "microintegrator",
	Prism = "prism",
}

export interface WebviewQuickPickItem {
	kind?: WebviewQuickPickItemKind;
	/**  A human-readable string which is rendered prominent. */
	label: string;
	/** A human-readable string which is rendered less prominent in the same line. */
	description?: string;
	/** A human-readable string which is rendered less prominent in a separate line */
	detail?: string;
	/** Always show this item. */
	alwaysShow?: boolean;
	/** Optional flag indicating if this item is picked initially.  */
	picked?: boolean;
	/** Any data to be passed */
	// biome-ignore lint/suspicious/noExplicitAny: can be any type of data
	item?: any;
}

export enum WebviewQuickPickItemKind {
	Separator = -1,
	Default = 0,
}

export interface Environment {
	id: string;
	name: string;
	organizationUuid: string;
	projectId?: string;
	description: string;
	promoteFrom?: string[];
	orgShared?: boolean;
	choreoEnv: string;
	critical: boolean;
	apiEnvName: string;
	internalApiEnvName: string;
	externalApiEnvName: string;
	sandboxApiEnvName: string;
	namespace: string;
	vhost?: string;
	sandboxVhost?: string;
	apimSandboxEnvId?: string;
	apimEnvId?: string;
	isMigrating: boolean;
}

export interface ComponentEP {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	releaseId: string;
	environmentId: string;
	displayName: string;
	port: number;
	type: string;
	apiContext: string;
	apiDefinitionPath: string;
	invokeUrl: string;
	visibility: string;
	networkVisibilities: string[];
	hostName: string;
	isAutoGenerated: boolean;
	apimId: string;
	apimRevisionId: string;
	apimName: string;
	projectUrl: string;
	organizationUrl: string;
	publicUrl: string;
	state: EndpointDeploymentStatus;
	stateReason: StateReason;
	isDeleted: boolean;
	deletedAt: Date;
}

export enum EndpointDeploymentStatus {
	Pending = "Pending",
	InProgress = "Progressing",
	Active = "Active",
	Error = "Error",
}

export interface ComponentDeployment {
	environmentId: string;
	configCount: number;
	apiId: string;
	releaseId: string;
	apiRevision: string;
	build: {
		buildId: string;
		deployedAt: string;
		commit: {
			author: { name: string; date: string; email: string; avatarUrl: string };
			sha: string;
			message: string;
			isLatest: boolean;
		};
		runId: string;
	};
	imageUrl: string;
	invokeUrl: string;
	versionId: string;
	deploymentStatus: string;
	deploymentStatusV2: DeploymentStatus;
	version: string;
	cron: string;
	cronTimezone: string;
}

export interface ICreateComponentParams {
	type: ChoreoComponentType;
	buildPackLang: string;
	name: string;
	/** Full path of the component directory */
	componentDir: string;
}

export interface GHAppConfig {
	installUrl: string;
	authUrl: string;
	clientId: string;
	redirectUrl: string;
}

export interface StateReason {
	code: string;
	message: string;
	details: string;
	workerId: string;
}

export interface WorkspaceConfig {
	folders: { name: string; path: string }[];
}

export interface Pagination {
	/** @format int64 */
	limit: number;
	/** @format int64 */
	total: number;
	/** @format int64 */
	offset: number;
}

export interface MarketplaceItemSchemaEntry {
	name: string;
	type: string;
	description?: string;
	isSensitive: boolean;
	isOptional: boolean;
}

export interface MarketplaceItemSchema {
	name: string;
	id?: string;
	description: string;
	isDefault: boolean;
	entries: MarketplaceItemSchemaEntry[];
}

export interface MarketplaceItem {
	serviceId: string;
	status: "DEPRECATED" | "PUBLISHED" | "PROTOTYPE";
	serviceType: "ASYNC_API" | "GRPC" | "GRAPHQL" | "SOAP" | "REST";
	connectionSchemas: MarketplaceItemSchema[];
	resourceId: string;
	thumbnailUrl: string;
	/** @format float */
	averageRating: number;
	/** @format int64 */
	totalRatingCount: number;
	createdTime: string;
	name: string;
	version: string;
	resourceType: "SERVICE";
	organizationId: string;
	projectId?: string;
	/** Choreo component info of a marketplace resource. */
	component?: {
		componentId: string;
		endpointId: string;
		apimId: string;
	};
	summary?: string;
	description?: string;
	tags?: string[];
	categories?: string[];
	visibility: ("PUBLIC" | "ORGANIZATION" | "PROJECT")[];
}

export interface ConnectionStatus {
	stage: string;
	result: string;
	success: boolean;
}

interface ConnectionBase {
	name: string;
	description: string;
	groupUuid: string;
	serviceName: string;
	serviceId: string;
	schemaName: string;
	schemaReference: string;
	isPartiallyCreated: boolean;
	status: {
		[key: string]: ConnectionStatus[];
	};
}

export interface ConnectionListItem extends ConnectionBase {
	componentId: string;
	dependentComponentId: string;
	version: string;
	resourceType: string;
}

export interface ConnectionDetailed {
	configurations: {
		[id: string]: {
			environmentUuid: string;
			entries: {
				[entryName: string]: {
					key: string;
					keyUuid: string;
					value: string;
					isSensitive: boolean;
					isFile: boolean;
				};
			};
		};
	};
	envMapping: object;
	visibilities: {
		organizationUuid: string;
		projectUuid: string;
		componentUuid: string;
	}[];
}

export interface ProxyDeploymentInfo {
	apiId: string;
	environment: {
		choreoEnv: string;
		name: string;
		id: string;
	};
	lifecycleStatus: string;
	version: string;
	invokeUrl: string;
	endpoint: string;
	sandboxEndpoint: string;
	apiRevision: {
		id: string;
		displayName: string;
		createdTime: number;
	};
	build: {
		id: string;
		baseRevisionId: string;
		deployedRevisionId: string;
	};
	deployedTime: number;
	successDeployedTime: number;
}

export type DeploymentLogsConclusion = "success" | "skipped" | "in_progress" | "queued" | "failure";

export interface DeploymentLogsDataStep {
	completed_at: string;
	conclusion: DeploymentLogsConclusion;
	name: string;
	number: number;
	started_at: string;
	status: DeploymentStepStatus;
	log?: string;
}

export enum DeploymentStepStatus {
	InProgress = "in_progress",
	Completed = "completed",
	Skipped = "skipped",
	Failure = "failure",
	Queued = "queued",
}

export interface DeploymentLogsData {
	codeGen?: {
		status: string | null;
		steps: DeploymentLogsDataStep[];
	};
	init: {
		log: string | null;
		status: string | null;
		steps: DeploymentLogsDataStep[];
	};
	deploy: { status: string | null; steps: DeploymentLogsDataStep[] };
	build: {
		log: string | null;
		status: string | null;
		steps: DeploymentLogsDataStep[];
	};
	oasValidation?: {
		log: string | null;
		status: string | null;
		steps: DeploymentLogsDataStep[];
	};
	governanceCheck?: {
		log: string | null;
		status: string | null;
		steps: DeploymentLogsDataStep[];
	};
	updateApi?: {
		log: string | null;
		status: string | null;
		steps: DeploymentLogsDataStep[];
	};
}

export interface ProjectBuildLogsData {
	integrationProjectBuild: string;
	libraryTrivyReport: string;
	dropinsTrivyReport: string;
	postBuildCheckLogs: string;
	mainSequenceValidation: string;
	mIVersionValidation: string;
	proxyBuildLogs?: string;
	governanceLogs?: string;
	configValidationLogs?: string;
}

export interface OpenApiSpec {
	openapi: string | number;
	swagger: string | number;
	servers?: { url?: string }[];
}

export interface CredentialItem {
	id: string;
	name: string;
	createdAt: string;
	organizationUuid: string;
	type: string;
	referenceToken: string;
}
