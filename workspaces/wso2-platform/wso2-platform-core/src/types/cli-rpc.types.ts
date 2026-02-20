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

import type { RequestType } from "vscode-messenger-common";
import { HOST_EXTENSION } from "vscode-messenger-common";
import type { Messenger } from "vscode-messenger-webview";
import type {
	BuildKind,
	Buildpack,
	CommitHistory,
	ComponentDeployment,
	ComponentEP,
	ComponentKind,
	ConnectionDetailed,
	ConnectionListItem,
	CredentialItem,
	DeploymentLogsData,
	DeploymentTrack,
	Environment,
	GitRepoMetadata,
	GithubOrganization,
	MarketplaceItem,
	Pagination,
	Project,
	ProjectBuildLogsData,
	ProxyDeploymentInfo,
	SubscriptionItem,
} from "./common.types";
import type { InboundConfig } from "./config-file.types";

export interface BuildPackReq {
	orgId: string;
	orgUuid: string;
	componentType: string;
}
export interface GetBranchesReq {
	orgId: string;
	repoUrl: string;
	credRef: string;
}
export interface GetCredentialsReq {
	orgId: string;
	orgUuid: string;
}
export interface GetCredentialDetailsReq {
	orgId: string;
	orgUuid: string;
	credentialId: string;
}
export interface IsRepoAuthorizedReq {
	orgId: string;
	repoUrl: string;
	credRef: string;
}
export interface GetComponentItemReq {
	orgId: string;
	projectHandle: string;
	componentName: string;
}
export interface GetComponentsReq {
	orgId: string;
	orgHandle: string;
	projectId: string;
	projectHandle: string;
}
export interface CreateProjectReq {
	orgId: string;
	orgHandler: string;
	projectName: string;
	region: string;
}
export interface DeleteCompReq {
	orgId: string;
	orgHandler: string;
	projectId: string;
	componentId: string;
	componentName: string;
}
export interface CreateComponentReq {
	orgId: string;
	orgUUID: string;
	projectId: string;
	projectHandle: string;
	name: string;
	displayName: string;
	type: string;
	componentSubType: string;
	buildPackLang: string;
	componentDir: string;
	repoUrl: string;
	gitProvider: string;
	gitCredRef: string;
	branch: string;
	langVersion: string;
	dockerFile?: string;
	port: number;
	spaBuildCommand: string;
	spaNodeVersion: string;
	spaOutputDir: string;
	proxyApiVersion?: string;
	proxyEndpointUrl?: string;
	proxyApiContext?: string;
	originCloud?: string;
	// todo: remove
	proxyAccessibility?: string;
}
export interface CreateConfigYamlReq {
	componentDir: string;
	type: string;
	inbound?: InboundConfig;
}
export interface GetBuildsReq {
	orgId: string;
	componentId: string;
	componentName: string;
	displayType: string;
	branch: string;
	apiVersionId: string;
}
export interface CreateBuildReq {
	orgId: string;
	componentName: string;
	displayType: string;
	projectHandle: string;
	deploymentTrackId: string;
	commitHash: string;
	gitRepoUrl: string;
	gitBranch: string;
	subPath: string;
}

export interface GetDeploymentTracksReq {
	orgId: string;
	orgHandler: string;
	projectId: string;
	componentHandle: string;
}
export interface GetCommitsReq {
	orgId: string;
	orgHandler: string;
	componentId: string;
	branch: string;
}
export interface GetProjectEnvsReq {
	orgId: string;
	orgUuid: string;
	projectId: string;
}
export interface GetComponentEndpointsReq {
	orgId: string;
	orgHandler: string;
	componentId: string;
	deploymentTrackId: string;
}
export interface GetDeploymentStatusReq {
	orgId: string;
	orgHandler: string;
	orgUuid: string;
	componentId: string;
	deploymentTrackId: string;
	envId: string;
}
export interface CreateDeploymentReq {
	orgId: string;
	orgHandler: string;
	componentName: string;
	componentId: string;
	componentHandle: string;
	componentDisplayType: string;
	projectHandle: string;
	projectId: string;
	versionId: string;
	commitHash: string;
	envName: string;
	envId: string;
	buildRef: string;
	cronExpression?: string;
	cronTimezone?: string;
	proxyTargetUrl?: string;
	proxySandboxUrl?: string;
}
export interface GetTestKeyReq {
	apimId: string;
	orgUuid: string;
	orgId: string;
	envName: string;
}
export interface GetSwaggerSpecReq {
	apimRevisionId: string;
	orgUuid: string;
	orgId: string;
}

export interface IsRepoAuthorizedResp {
	retrievedRepos: boolean;
	isAccessible: boolean;
}
export interface GetTestKeyResp {
	apiKey: string;
	validityTime: number;
}

export interface MarketplaceListResp {
	/** @format int64 */
	count: number;
	pagination: Pagination;
	data: MarketplaceItem[];
}

export interface MarketplaceIdlResp {
	environmentId: string;
	// biome-ignore lint/suspicious/noExplicitAny: can be any type of data
	content: any;
	idlType: string;
}

export interface GetMarketplaceItemsParams {
	/** @format int64 @default 20 */
	limit?: number;
	/**  Offset of the results. @default 0  */
	offset?: number;
	/** Sort by `name`, `createdTime`. By default sorted by `name` */
	sortBy?: string;
	/** Whether to sort in ascending order. By default `true`.  @default true */
	sortAscending?: boolean;
	/** Search within the content (description, summary and IDL) of the service. @default false */
	searchContent?: boolean;
	/** Filter services based on network visibility. Possible values are "project", "org", "public". @default "org" */
	networkVisibilityFilter?: string;
	/** Optionally filter services based on service name, description, summary and IDL. */
	query?: string | null;
	/** Optionally filter services based on tags. Multiple tags can be provided as a comma separated list. */
	tags?: string | null;
	/** Optionally filter services based on categories. Multiple categories can be provided as a comma separated list. */
	categories?: string | null;
	/** Optionally filter services based on whether they are third party or not. By default null, meaning this filter is not effective. */
	isThirdParty?: boolean | null;
	/** When networkVisibilityFilter is "project", this parameter can be used to filter services */
	networkVisibilityprojectId?: string | null;
}

export interface GetMarketplaceListReq {
	orgId: string;
	request: GetMarketplaceItemsParams;
}

export interface GetMarketplaceItemReq {
	orgId: string;
	serviceId: string;
}

export interface GetMarketplaceIdlReq {
	orgId: string;
	serviceId: string;
}

export interface GetConnectionsReq {
	orgId: string;
	projectId: string;
	componentId: string;
}

export interface GetConnectionItemReq {
	orgId: string;
	connectionGroupId: string;
}

export interface CreateComponentConnectionReq {
	orgId: string;
	orgUuid: string;
	projectId: string;
	componentId: string;
	componentPath: string;
	componentType: string;
	serviceId: string;
	serviceVisibility: string;
	serviceSchemaId: string;
	name: string;
	generateCreds: boolean;
}

export interface CreateThirdPartyConnectionReq {
	orgId: string;
	orgUuid: string;
	projectId: string;
	componentId: string;
	name: string;
	serviceId: string;
	serviceSchemaId: string;
	endpointRefs: Record<string, string>;
	sensitiveKeys: string[];
}

export type  MarketplaceIdlTypes = 'UDP' | 'TCP' | 'WSDL' | 'Proto3' | 'GraphQL_SDL' | 'OpenAPI' | 'AsyncAPI';

export type MarketplaceServiceTypes = 'ASYNC_API' | 'GRPC' | 'GRAPHQL' | 'SOAP' | 'REST';

export type RegisterMarketplaceConfigMap = Record<
    string,
    {
        environmentTemplateIds: string[];
        values: {
            key: string;
            value: string;
            isOptional?: boolean;
        }[];
        name: string;
    }
>;

export interface RegisterMarketplaceConnectionReq {
	orgId: string;
	orgUuid: string;
	projectId: string;
	name: string;
	serviceType: MarketplaceServiceTypes;
	idlType: MarketplaceIdlTypes;
	idlContent: string;
	schemaEntries: {
		name: string;
		type: string;
		description?: string;
		isSensitive: boolean;
		isOptional?: boolean;
	}[];
	configs: RegisterMarketplaceConfigMap;
}

export interface DeleteConnectionReq {
	orgId: string;
	connectionId: string;
	connectionName: string;
	componentPath: string;
}

export interface GetConnectionGuideReq {
	orgId: string;
	orgUuid: string;
	serviceId: string;
	configGroupId: string;
	connectionSchemaId: string;
	audience: string;
	isSpa: boolean;
	isProjectLvlConnection: boolean;
	buildpackType: string;
	connectionName: string;
	configFileType: string;
}

export interface GetAutoBuildStatusReq {
	orgId: string;
	componentId: string;
	versionId: string;
}

export interface GetAutoBuildStatusResp {
	autoBuildId: string;
	autoBuildEnabled: boolean;
	componentId: string;
	versionId: string;
	envId: string;
}

export interface ToggleAutoBuildReq {
	orgId: string;
	componentId: string;
	versionId: string;
	envId: string;
}

export interface GetConnectionGuideResp {
	guide: string;
}

export interface ToggleAutoBuildResp {
	success: boolean;
}

export interface GetProxyDeploymentInfoReq {
	orgId: string;
	orgHandler: string;
	orgUuid: string;
	componentId: string;
	versionId: string;
	envId: string;
}

export interface CheckWorkflowStatusReq {
	orgId: string;
	buildId: string;
	envId: string;
}

export interface CancelApprovalReq {
	orgId: string;
	wkfInstanceId: string;
}

export interface RequestPromoteApprovalReq {
	orgId: string;
	orgHandler: string;
	envId: string;
	envName: string;
	buildId: string;
	projectId: string;
	projectName: string;
	requestComment: string;
	componentName: string;
	envFromId: string;
	envFromName: string;
}

export interface PromoteProxyDeploymentReq {
	orgId: string;
	componentId: string;
	apiId: string;
	promoteFromEnvId: string;
	envId: string;
	buildId: string;
}

export interface CheckWorkflowStatusResp {
	status: string;
	wkfInstanceId: string;
}

export interface GetBuildLogsReq {
	orgId: string;
	orgHandler: string;
	componentId: string;
	displayType: string;
	projectId: string;
	buildId: number;
	orgUuid: string;
	buildRef: string;
	deploymentTrackId: string;
	clusterId: string;
}

export interface GetBuildLogsForTypeReq {
	orgId: string;
	componentId: string;
	logType: string;
	buildId: number;
}

export interface GetSubscriptionsReq {
	orgId: string;
	cloudType?: string;
}

export interface UpdateCodeServerReq {
	orgId: string;
	orgUuid: string;
	orgHandle: string;
	projectId: string;
	componentId: string;
	sourceCommitHash: string;
}

export interface GetGitTokenForRepositoryReq {
	orgId: string;
	gitOrg: string;
	gitRepo: string;
	secretRef: string;
}

export interface GetGitTokenForRepositoryResp {
	token: string;
	gitOrganization: string;
	gitRepository: string;
	vendor: string;
	username: string;
	serverUrl: string;
}

export interface GetGitMetadataReq {
	orgId: string;
	gitOrgName: string;
	gitRepoName: string;
	branch: string;
	relativePath: string;
	secretRef: string;
}

export interface GetGitMetadataResp {
	metadata: GitRepoMetadata;
}

export interface SubscriptionsResp {
	count: number;
	list: SubscriptionItem[];
	cloudType: string;
	emailType: string;
}

export interface GetAuthorizedGitOrgsReq {
	orgId: string;
	credRef: string;
}

export interface GetAuthorizedGitOrgsResp {
	gitOrgs: GithubOrganization[];
}

export interface GetCliRpcResp {
	billingConsoleUrl: string;
	choreoConsoleUrl: string;
	devantConsoleUrl: string;
	ghApp: {
		installUrl: string;
		authUrl: string;
		clientId: string;
	};
}

export interface IChoreoRPCClient {
	getComponentItem(params: GetComponentItemReq): Promise<ComponentKind>;
	getDeploymentTracks(params: GetDeploymentTracksReq): Promise<DeploymentTrack[]>;
	// can remove above ones
	getProjects(orgID: string): Promise<Project[]>;
	getComponentList(params: GetComponentsReq): Promise<ComponentKind[]>;
	createProject(params: CreateProjectReq): Promise<Project>;
	createComponent(params: CreateComponentReq): Promise<ComponentKind>;
	getBuildPacks(params: BuildPackReq): Promise<Buildpack[]>;
	getRepoBranches(params: GetBranchesReq): Promise<string[]>;
	isRepoAuthorized(params: IsRepoAuthorizedReq): Promise<IsRepoAuthorizedResp>;
	getAuthorizedGitOrgs(params: GetAuthorizedGitOrgsReq): Promise<GetAuthorizedGitOrgsResp>;
	getCredentials(params: GetCredentialsReq): Promise<CredentialItem[]>;
	getCredentialDetails(params: GetCredentialDetailsReq): Promise<CredentialItem>;
	deleteComponent(params: DeleteCompReq): Promise<void>;
	getBuilds(params: GetBuildsReq): Promise<BuildKind[]>;
	createBuild(params: CreateBuildReq): Promise<BuildKind>;
	getCommits(params: GetCommitsReq): Promise<CommitHistory[]>;
	getEnvs(params: GetProjectEnvsReq): Promise<Environment[]>;
	getComponentEndpoints(params: GetComponentEndpointsReq): Promise<ComponentEP[]>;
	getDeploymentStatus(params: GetDeploymentStatusReq): Promise<ComponentDeployment | null>;
	createDeployment(params: CreateDeploymentReq): Promise<void>;
	getTestKey(params: GetTestKeyReq): Promise<GetTestKeyResp>;
	getSwaggerSpec(params: GetSwaggerSpecReq): Promise<object>;
	getMarketplaceItems(params: GetMarketplaceListReq): Promise<MarketplaceListResp>;
	getMarketplaceIdl(params: GetMarketplaceIdlReq): Promise<MarketplaceIdlResp>;
	getConnections(params: GetConnectionsReq): Promise<ConnectionListItem[]>;
	getConnectionItem(params: GetConnectionItemReq): Promise<ConnectionDetailed>;
	createComponentConnection(params: CreateComponentConnectionReq): Promise<ConnectionDetailed>;
	deleteConnection(params: DeleteConnectionReq): Promise<void>;
	getConnectionGuide(params: GetConnectionGuideReq): Promise<GetConnectionGuideResp>;
	getAutoBuildStatus(params: GetAutoBuildStatusReq): Promise<GetAutoBuildStatusResp>;
	enableAutoBuildOnCommit(params: ToggleAutoBuildReq): Promise<ToggleAutoBuildResp>;
	disableAutoBuildOnCommit(params: ToggleAutoBuildReq): Promise<ToggleAutoBuildResp>;
	getProxyDeploymentInfo(params: GetProxyDeploymentInfoReq): Promise<ProxyDeploymentInfo | null>;
	getBuildLogs(params: GetBuildLogsReq): Promise<DeploymentLogsData | null>;
	getBuildLogsForType(params: GetBuildLogsForTypeReq): Promise<ProjectBuildLogsData | null>;
	checkWorkflowStatus(params: CheckWorkflowStatusReq): Promise<CheckWorkflowStatusResp>;
	cancelApprovalRequest(params: CancelApprovalReq): Promise<void>;
	requestPromoteApproval(params: RequestPromoteApprovalReq): Promise<void>;
	promoteProxyDeployment(params: PromoteProxyDeploymentReq): Promise<void>;
	getSubscriptions(params: GetSubscriptionsReq): Promise<SubscriptionsResp>;
	getGitTokenForRepository(params: GetGitTokenForRepositoryReq): Promise<GetGitTokenForRepositoryResp>;
	getGitRepoMetadata(params: GetGitMetadataReq): Promise<GetGitMetadataResp>;
	getGitRepoMetadataBatch(params: GetGitMetadataReq[]): Promise<GetGitMetadataResp[]>;
}

export class ChoreoRpcWebview implements IChoreoRPCClient {
	constructor(private _messenger: Messenger) {}

	getProjects(orgID: string): Promise<Project[]> {
		return this._messenger.sendRequest(ChoreoRpcGetProjectsRequest, HOST_EXTENSION, orgID);
	}
	getComponentItem(params: GetComponentItemReq): Promise<ComponentKind> {
		return this._messenger.sendRequest(ChoreoRpcGetComponentItemRequest, HOST_EXTENSION, params);
	}
	getComponentList(params: GetComponentsReq): Promise<ComponentKind[]> {
		return this._messenger.sendRequest(ChoreoRpcGetComponentsRequest, HOST_EXTENSION, params);
	}
	createProject(params: CreateProjectReq): Promise<Project> {
		return this._messenger.sendRequest(ChoreoRpcCreateProjectRequest, HOST_EXTENSION, params);
	}
	createComponent(params: CreateComponentReq): Promise<ComponentKind> {
		return this._messenger.sendRequest(ChoreoRpcCreateComponentRequest, HOST_EXTENSION, params);
	}
	getBuildPacks(params: BuildPackReq): Promise<Buildpack[]> {
		return this._messenger.sendRequest(ChoreoRpcGetBuildPacksRequest, HOST_EXTENSION, params);
	}
	getRepoBranches(params: GetBranchesReq): Promise<string[]> {
		return this._messenger.sendRequest(ChoreoRpcGetBranchesRequest, HOST_EXTENSION, params);
	}
	isRepoAuthorized(params: IsRepoAuthorizedReq): Promise<IsRepoAuthorizedResp> {
		return this._messenger.sendRequest(ChoreoRpcIsRepoAuthorizedRequest, HOST_EXTENSION, params);
	}
	getAuthorizedGitOrgs(params: GetAuthorizedGitOrgsReq): Promise<GetAuthorizedGitOrgsResp> {
		return this._messenger.sendRequest(ChoreoRpcGetAuthorizedGitOrgsRequest, HOST_EXTENSION, params);
	}
	getCredentials(params: GetCredentialsReq): Promise<CredentialItem[]> {
		return this._messenger.sendRequest(ChoreoRpcGetCredentialsRequest, HOST_EXTENSION, params);
	}
	getCredentialDetails(params: GetCredentialDetailsReq): Promise<CredentialItem> {
		return this._messenger.sendRequest(ChoreoRpcGetCredentialDetailsRequest, HOST_EXTENSION, params);
	}
	deleteComponent(params: DeleteCompReq): Promise<void> {
		return this._messenger.sendRequest(ChoreoRpcDeleteComponentRequest, HOST_EXTENSION, params);
	}
	getBuilds(params: GetBuildsReq): Promise<BuildKind[]> {
		return this._messenger.sendRequest(ChoreoRpcGetBuildsRequest, HOST_EXTENSION, params);
	}
	createBuild(params: CreateBuildReq): Promise<BuildKind> {
		return this._messenger.sendRequest(ChoreoRpcCreateBuildRequest, HOST_EXTENSION, params);
	}
	getDeploymentTracks(params: GetDeploymentTracksReq): Promise<DeploymentTrack[]> {
		return this._messenger.sendRequest(ChoreoRpcGetDeploymentTracksRequest, HOST_EXTENSION, params);
	}
	getCommits(params: GetCommitsReq): Promise<CommitHistory[]> {
		return this._messenger.sendRequest(ChoreoRpcGetCommitsRequest, HOST_EXTENSION, params);
	}
	getEnvs(params: GetProjectEnvsReq): Promise<Environment[]> {
		return this._messenger.sendRequest(ChoreoRpcGetEnvsRequest, HOST_EXTENSION, params);
	}
	getComponentEndpoints(params: GetComponentEndpointsReq): Promise<ComponentEP[]> {
		return this._messenger.sendRequest(ChoreoRpcGetEndpointsRequest, HOST_EXTENSION, params);
	}
	getDeploymentStatus(params: GetDeploymentStatusReq): Promise<ComponentDeployment | null> {
		return this._messenger.sendRequest(ChoreoRpcGetDeploymentStatusRequest, HOST_EXTENSION, params);
	}
	createDeployment(params: CreateDeploymentReq): Promise<void> {
		return this._messenger.sendRequest(ChoreoRpcCreateDeploymentRequest, HOST_EXTENSION, params);
	}
	getTestKey(params: GetTestKeyReq): Promise<GetTestKeyResp> {
		return this._messenger.sendRequest(ChoreoRpcGetTestKeyRequest, HOST_EXTENSION, params);
	}
	getSwaggerSpec(params: GetSwaggerSpecReq): Promise<object> {
		return this._messenger.sendRequest(ChoreoRpcGetSwaggerRequest, HOST_EXTENSION, params);
	}
	getMarketplaceItems(params: GetMarketplaceListReq): Promise<MarketplaceListResp> {
		return this._messenger.sendRequest(ChoreoRpcGetMarketplaceItems, HOST_EXTENSION, params);
	}
	getMarketplaceIdl(params: GetMarketplaceIdlReq): Promise<MarketplaceIdlResp> {
		return this._messenger.sendRequest(ChoreoRpcGetMarketplaceItemIdl, HOST_EXTENSION, params);
	}
	getConnections(params: GetConnectionsReq): Promise<ConnectionListItem[]> {
		return this._messenger.sendRequest(ChoreoRpcGetConnections, HOST_EXTENSION, params);
	}
	getConnectionItem(params: GetConnectionItemReq): Promise<ConnectionDetailed> {
		return this._messenger.sendRequest(ChoreoRpcGetConnectionItem, HOST_EXTENSION, params);
	}
	createComponentConnection(params: CreateComponentConnectionReq): Promise<ConnectionDetailed> {
		return this._messenger.sendRequest(ChoreoRpcCreateComponentConnection, HOST_EXTENSION, params);
	}
	deleteConnection(params: DeleteConnectionReq): Promise<void> {
		return this._messenger.sendRequest(ChoreoRpcDeleteConnection, HOST_EXTENSION, params);
	}
	getConnectionGuide(params: GetConnectionGuideReq): Promise<GetConnectionGuideResp> {
		return this._messenger.sendRequest(ChoreoRpcGetConnectionGuide, HOST_EXTENSION, params);
	}
	getAutoBuildStatus(params: GetAutoBuildStatusReq): Promise<GetAutoBuildStatusResp> {
		return this._messenger.sendRequest(ChoreoRpcGetAutoBuildStatus, HOST_EXTENSION, params);
	}
	enableAutoBuildOnCommit(params: ToggleAutoBuildReq): Promise<ToggleAutoBuildResp> {
		return this._messenger.sendRequest(ChoreoRpcEnableAutoBuild, HOST_EXTENSION, params);
	}
	disableAutoBuildOnCommit(params: ToggleAutoBuildReq): Promise<ToggleAutoBuildResp> {
		return this._messenger.sendRequest(ChoreoRpcDisableAutoBuild, HOST_EXTENSION, params);
	}
	getProxyDeploymentInfo(params: GetProxyDeploymentInfoReq): Promise<ProxyDeploymentInfo | null> {
		return this._messenger.sendRequest(ChoreoRpcGetProxyDeploymentInfo, HOST_EXTENSION, params);
	}
	getBuildLogs(params: GetBuildLogsReq): Promise<DeploymentLogsData | null> {
		return this._messenger.sendRequest(ChoreoRpcGetBuildLogs, HOST_EXTENSION, params);
	}
	getBuildLogsForType(params: GetBuildLogsForTypeReq): Promise<ProjectBuildLogsData | null> {
		return this._messenger.sendRequest(ChoreoRpcGetBuildLogsForType, HOST_EXTENSION, params);
	}
	checkWorkflowStatus(params: CheckWorkflowStatusReq): Promise<CheckWorkflowStatusResp> {
		return this._messenger.sendRequest(ChoreoRpcCheckWorkflowStatus, HOST_EXTENSION, params);
	}
	cancelApprovalRequest(params: CancelApprovalReq): Promise<void> {
		return this._messenger.sendRequest(ChoreoRpcCancelWorkflowApproval, HOST_EXTENSION, params);
	}
	requestPromoteApproval(params: RequestPromoteApprovalReq): Promise<void> {
		return this._messenger.sendRequest(ChoreoRpcRequestPromoteApproval, HOST_EXTENSION, params);
	}
	promoteProxyDeployment(params: PromoteProxyDeploymentReq): Promise<void> {
		return this._messenger.sendRequest(ChoreoRpcPromoteProxyDeployment, HOST_EXTENSION, params);
	}
	getSubscriptions(params: GetSubscriptionsReq): Promise<SubscriptionsResp> {
		return this._messenger.sendRequest(ChoreoRpcGetSubscriptions, HOST_EXTENSION, params);
	}
	getGitTokenForRepository(params: GetGitTokenForRepositoryReq): Promise<GetGitTokenForRepositoryResp> {
		return this._messenger.sendRequest(ChoreoRpcGetGitTokenForRepository, HOST_EXTENSION, params);
	}
	getGitRepoMetadata(params: GetGitMetadataReq): Promise<GetGitMetadataResp> {
		return this._messenger.sendRequest(ChoreoRpcGetGitRepoMetadata, HOST_EXTENSION, params);
	}
	getGitRepoMetadataBatch(params: GetGitMetadataReq[]): Promise<GetGitMetadataResp[]> {
		return this._messenger.sendRequest(ChoreoRpcGetGitRepoMetadataBatch, HOST_EXTENSION, params);
	}
}

export const ChoreoRpcGetProjectsRequest: RequestType<string, Project[]> = { method: "rpc/project/getProjects" };
export const ChoreoRpcGetComponentsRequest: RequestType<GetComponentsReq, ComponentKind[]> = { method: "rpc/component/getList" };
export const ChoreoRpcGetComponentItemRequest: RequestType<GetComponentItemReq, ComponentKind> = { method: "rpc/component/getItem" };
export const ChoreoRpcCreateProjectRequest: RequestType<CreateProjectReq, Project> = { method: "rpc/project/create" };
export const ChoreoRpcCreateComponentRequest: RequestType<CreateComponentReq, ComponentKind> = { method: "rpc/component/create" };
export const ChoreoRpcGetBuildPacksRequest: RequestType<BuildPackReq, Buildpack[]> = { method: "rpc/component/getBuildPacks" };
export const ChoreoRpcGetBranchesRequest: RequestType<GetBranchesReq, string[]> = { method: "rpc/repo/getBranches" };
export const ChoreoRpcIsRepoAuthorizedRequest: RequestType<IsRepoAuthorizedReq, IsRepoAuthorizedResp> = { method: "rpc/repo/isRepoAuthorized" };
export const ChoreoRpcGetAuthorizedGitOrgsRequest: RequestType<GetAuthorizedGitOrgsReq, GetAuthorizedGitOrgsResp> = {
	method: "rpc/repo/getAuthorizedGitOrgs",
};
export const ChoreoRpcGetCredentialsRequest: RequestType<GetCredentialsReq, CredentialItem[]> = { method: "rpc/repo/getCredentials" };
export const ChoreoRpcGetCredentialDetailsRequest: RequestType<GetCredentialDetailsReq, CredentialItem> = { method: "rpc/repo/getCredentialDetails" };
export const ChoreoRpcDeleteComponentRequest: RequestType<DeleteCompReq, void> = { method: "rpc/component/delete" };
export const ChoreoRpcCreateBuildRequest: RequestType<CreateBuildReq, BuildKind> = { method: "rpc/build/create" };
export const ChoreoRpcGetDeploymentTracksRequest: RequestType<GetDeploymentTracksReq, DeploymentTrack[]> = {
	method: "rpc/component/getDeploymentTracks",
};
export const ChoreoRpcGetBuildsRequest: RequestType<GetBuildsReq, BuildKind[]> = { method: "rpc/build/getList" };
export const ChoreoRpcGetCommitsRequest: RequestType<GetCommitsReq, CommitHistory[]> = { method: "rpc/component/getCommits" };
export const ChoreoRpcGetEnvsRequest: RequestType<GetProjectEnvsReq, Environment[]> = { method: "rpc/project/getEnvs" };
export const ChoreoRpcGetEndpointsRequest: RequestType<GetComponentEndpointsReq, ComponentEP[]> = { method: "rpc/component/getEndpoints" };
export const ChoreoRpcGetDeploymentStatusRequest: RequestType<GetDeploymentStatusReq, ComponentDeployment | null> = {
	method: "rpc/component/getDeploymentStatus",
};
export const ChoreoRpcCreateDeploymentRequest: RequestType<CreateDeploymentReq, void> = { method: "rpc/deployment/create" };
export const ChoreoRpcGetTestKeyRequest: RequestType<GetTestKeyReq, GetTestKeyResp> = { method: "rpc/apim/getTestKey" };
export const ChoreoRpcGetSwaggerRequest: RequestType<GetSwaggerSpecReq, object> = { method: "rpc/apim/getSwaggerSpec" };
export const ChoreoRpcGetMarketplaceItems: RequestType<GetMarketplaceListReq, MarketplaceListResp> = {
	method: "rpc/connections/getMarketplaceItems",
};
export const ChoreoRpcGetMarketplaceItemIdl: RequestType<GetMarketplaceIdlReq, MarketplaceIdlResp> = {
	method: "rpc/connections/getMarketplaceItemIdl",
};
export const ChoreoRpcGetConnections: RequestType<GetConnectionsReq, ConnectionListItem[]> = {
	method: "rpc/connections/getConnections",
};
export const ChoreoRpcGetConnectionItem: RequestType<GetConnectionItemReq, ConnectionDetailed> = {
	method: "rpc/connections/getConnectionItem",
};
export const ChoreoRpcCreateComponentConnection: RequestType<CreateComponentConnectionReq, ConnectionDetailed> = {
	method: "rpc/connections/createComponentConnection",
};
export const ChoreoRpcDeleteConnection: RequestType<DeleteConnectionReq, void> = { method: "rpc/connections/deleteConnection" };
export const ChoreoRpcGetConnectionGuide: RequestType<GetConnectionGuideReq, GetConnectionGuideResp> = { method: "rpc/connections/getGuide" };
export const ChoreoRpcGetAutoBuildStatus: RequestType<GetAutoBuildStatusReq, GetAutoBuildStatusResp> = { method: "rpc/build/getAutoBuildStatus" };
export const ChoreoRpcEnableAutoBuild: RequestType<ToggleAutoBuildReq, ToggleAutoBuildResp> = { method: "rpc/build/enableAutoBuild" };
export const ChoreoRpcDisableAutoBuild: RequestType<ToggleAutoBuildReq, ToggleAutoBuildResp> = { method: "rpc/build/disableAutoBuild" };
export const ChoreoRpcGetProxyDeploymentInfo: RequestType<GetProxyDeploymentInfoReq, ProxyDeploymentInfo | null> = {
	method: "rpc/deployment/getProxyDeploymentInfo",
};
export const ChoreoRpcGetBuildLogs: RequestType<GetBuildLogsReq, DeploymentLogsData> = { method: "rpc/build/logs" };
export const ChoreoRpcGetBuildLogsForType: RequestType<GetBuildLogsForTypeReq, ProjectBuildLogsData> = { method: "rpc/build/getLogsForType" };
export const ChoreoRpcCheckWorkflowStatus: RequestType<CheckWorkflowStatusReq, CheckWorkflowStatusResp> = {
	method: "rpc/deployment/checkWorkflowStatus",
};
export const ChoreoRpcCancelWorkflowApproval: RequestType<CancelApprovalReq, void> = {
	method: "rpc/deployment/cancelApprovalRequest",
};
export const ChoreoRpcRequestPromoteApproval: RequestType<RequestPromoteApprovalReq, void> = {
	method: "rpc/deployment/requestPromoteApproval",
};
export const ChoreoRpcPromoteProxyDeployment: RequestType<PromoteProxyDeploymentReq, void> = {
	method: "rpc/deployment/promoteProxy",
};
export const ChoreoRpcGetSubscriptions: RequestType<GetSubscriptionsReq, SubscriptionsResp> = {
	method: "rpc/auth/getSubscriptions",
};
export const ChoreoRpcGetGitTokenForRepository: RequestType<GetGitTokenForRepositoryReq, GetGitTokenForRepositoryResp> = {
	method: "rpc/repo/gitTokenForRepository",
};
export const ChoreoRpcGetGitRepoMetadata: RequestType<GetGitMetadataReq, GetGitMetadataResp> = {
	method: "rpc/repo/getRepoMetadata",
};
export const ChoreoRpcGetGitRepoMetadataBatch: RequestType<GetGitMetadataReq[], GetGitMetadataResp[]> = {
	method: "rpc/repo/getRepoMetadataBatch",
};
