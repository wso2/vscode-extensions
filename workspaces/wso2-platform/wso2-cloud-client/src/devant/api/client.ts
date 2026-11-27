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

import type {
	BuildKind,
	BuildPackReq,
	Buildpack,
	CancelApprovalReq,
	ChangePrebuiltIntegrationRepositoryReq,
	CheckWorkflowStatusReq,
	CheckWorkflowStatusResp,
	CommitHistory,
	ComponentDeployment,
	ComponentEP,
	ComponentKind,
	ConnectionDetailed,
	ConnectionListItem,
	CreateBuildReq,
	CreateComponentConnectionReq,
	CreateComponentReq,
	CreateConfigYamlReq,
	CreateDatabaseConnectionReq,
	CreateDeploymentReq,
	CreateProjectReq,
	CreateThirdPartyConnectionReq,
	CredentialItem,
	DatabaseAdminCredential,
	DatabaseCredential,
	DatabaseServer,
	DeleteCompReq,
	DeleteConnectionReq,
	DeploymentLogsData,
	DeploymentTrack,
	Environment,
	GetAuthorizedGitOrgsReq,
	GetAuthorizedGitOrgsResp,
	GetAutoBuildStatusReq,
	GetAutoBuildStatusResp,
	GetBranchesReq,
	GetBuildLogsForTypeReq,
	GetBuildLogsReq,
	GetBuildsReq,
	GetCommitsReq,
	GetComponentEndpointsReq,
	GetComponentItemReq,
	GetComponentUsageReq,
	GetComponentUsageResp,
	GetComponentsReq,
	GetConnectionGuideReq,
	GetConnectionGuideResp,
	GetConnectionItemReq,
	GetConnectionsReq,
	GetCredentialDetailsReq,
	GetCredentialsReq,
	GetDatabaseItemReq,
	GetDatabaseServerReq,
	GetDeploymentStatusReq,
	GetDeploymentTracksReq,
	GetGitMetadataReq,
	GetGitMetadataResp,
	GetGitTokenForRepositoryReq,
	GetGitTokenForRepositoryResp,
	GetMarketplaceIdlReq,
	GetMarketplaceItemReq,
	GetMarketplaceListReq,
	GetProjectEnvsReq,
	GetProxyDeploymentInfoReq,
	GetSubscriptionsReq,
	GetSwaggerSpecReq,
	GetTestKeyReq,
	GetTestKeyResp,
	IChoreoRPCClient,
	IsRepoAuthorizedReq,
	IsRepoAuthorizedResp,
	MarketplaceDatabaseListResp,
	MarketplaceIdlResp,
	MarketplaceItem,
	MarketplaceListResp,
	Project,
	ProjectBuildLogsData,
	PromoteProxyDeploymentReq,
	ProxyDeploymentInfo,
	RegisterMarketplaceConnectionReq,
	RequestPromoteApprovalReq,
	ResolveConnectionSecretsReq,
	ResolveConnectionSecretsResp,
	StartProxyServerReq,
	StartProxyServerResp,
	StopProxyServerReq,
	SubscriptionsResp,
	ToggleAutoBuildReq,
	ToggleAutoBuildResp,
	UpdateCodeServerReq,
	UpdateProjectReq,
} from "@wso2/wso2-platform-core";
import type { DevantOrganization } from "../auth/session";
import type { DevantProxiesOptions } from "../proxy";
import { DevantProxies } from "../proxy";
import * as apim from "./apim";
import * as builds from "./builds";
import * as components from "./components";
import * as connections from "./connections";
import * as databases from "./databases";
import * as deployments from "./deployments";
import type { DevantHttp } from "./http";
import * as marketplace from "./marketplace";
import * as projects from "./projects";
import * as repos from "./repos";
import * as subscriptions from "./subscriptions";

/**
 * Devant's API with the methods, requests and answers of the Choreo CLI's editor client, so code written against that
 * client runs unchanged. Signing in and switching organization are elsewhere.
 */
export class DevantApiClient implements IChoreoRPCClient {
	private readonly proxies: DevantProxies;

	constructor(
		readonly http: DevantHttp,
		/** The person's organizations, which the billing service and the proxy address them by. */
		private readonly organizations: () => Promise<readonly DevantOrganization[]>,
		proxyOptions: Omit<DevantProxiesOptions, "organizations"> = {},
	) {
		this.proxies = new DevantProxies(http, { ...proxyOptions, organizations });
	}

	/** Starts a local proxy through the project's bridge, deploying the bridge when needed. */
	startProxyServer(params: StartProxyServerReq): Promise<StartProxyServerResp> {
		return this.proxies.start(params);
	}

	stopProxyServer(params: StopProxyServerReq): Promise<void> {
		return this.proxies.stop(params);
	}

	/** Stops every local proxy this client started. */
	dispose(): Promise<void> {
		return this.proxies.dispose();
	}

	createProject(params: CreateProjectReq): Promise<Project> {
		return projects.createProject(this.http, params);
	}

	updateProject(params: UpdateProjectReq): Promise<Project> {
		return projects.updateProject(this.http, params);
	}

	createComponent(params: CreateComponentReq): Promise<ComponentKind> {
		return components.createComponent(this.http, params);
	}

	createComponentConfig(params: CreateConfigYamlReq): Promise<string> {
		return components.createComponentConfig(this.http, params);
	}

	deleteComponent(params: DeleteCompReq): Promise<void> {
		return components.deleteComponent(this.http, params);
	}

	getProjects(orgID: string): Promise<Project[]> {
		return projects.getProjects(this.http, orgID);
	}

	getComponentItem(params: GetComponentItemReq): Promise<ComponentKind> {
		return components.getComponentItem(this.http, params);
	}

	getComponentList(params: GetComponentsReq): Promise<ComponentKind[]> {
		return components.getComponentList(this.http, params);
	}

	resolveConnectionSecrets(params: ResolveConnectionSecretsReq): Promise<ResolveConnectionSecretsResp> {
		return connections.resolveConnectionSecrets(this.http, params);
	}

	getBuildPacks(params: BuildPackReq): Promise<Buildpack[]> {
		return components.getBuildPacks(this.http, params);
	}

	getRepoBranches(params: GetBranchesReq): Promise<string[]> {
		return repos.getRepoBranches(this.http, params);
	}

	isRepoAuthorized(params: IsRepoAuthorizedReq): Promise<IsRepoAuthorizedResp> {
		return repos.isRepoAuthorized(this.http, params);
	}

	getAuthorizedGitOrgs(params: GetAuthorizedGitOrgsReq): Promise<GetAuthorizedGitOrgsResp> {
		return repos.getAuthorizedGitOrgs(this.http, params);
	}

	getCredentials(params: GetCredentialsReq): Promise<CredentialItem[]> {
		return repos.getCredentials(this.http, params);
	}

	getCredentialDetails(params: GetCredentialDetailsReq): Promise<CredentialItem> {
		return repos.getCredentialDetails(this.http, params);
	}

	createBuild(params: CreateBuildReq): Promise<BuildKind> {
		return builds.createBuild(this.http, params);
	}

	getDeploymentTracks(params: GetDeploymentTracksReq): Promise<DeploymentTrack[]> {
		return components.getDeploymentTracks(this.http, params);
	}

	getBuilds(params: GetBuildsReq): Promise<BuildKind[]> {
		return builds.getBuilds(this.http, params);
	}

	getCommits(params: GetCommitsReq): Promise<CommitHistory[]> {
		return components.getCommits(this.http, params);
	}

	getEnvs(params: GetProjectEnvsReq): Promise<Environment[]> {
		return projects.getEnvs(this.http, params);
	}

	getComponentEndpoints(params: GetComponentEndpointsReq): Promise<ComponentEP[]> {
		return components.getComponentEndpoints(this.http, params);
	}

	getDeploymentStatus(params: GetDeploymentStatusReq): Promise<ComponentDeployment | null> {
		return deployments.getDeploymentStatus(this.http, params);
	}

	getProxyDeploymentInfo(params: GetProxyDeploymentInfoReq): Promise<ProxyDeploymentInfo | null> {
		return deployments.getProxyDeploymentInfo(this.http, params);
	}

	createDeployment(params: CreateDeploymentReq): Promise<void> {
		return deployments.createDeployment(this.http, params);
	}

	getBuildLogs(params: GetBuildLogsReq): Promise<DeploymentLogsData> {
		return builds.getBuildLogs(this.http, params);
	}

	getBuildLogsForType(params: GetBuildLogsForTypeReq): Promise<ProjectBuildLogsData | null> {
		return builds.getBuildLogsForType(this.http, params);
	}

	obtainGithubToken(params: { code: string; orgId: string }): Promise<void> {
		return repos.obtainGithubToken(this.http, params);
	}

	getTestKey(params: GetTestKeyReq): Promise<GetTestKeyResp> {
		return apim.getTestKey(this.http, params);
	}

	getSwaggerSpec(params: GetSwaggerSpecReq): Promise<object> {
		return apim.getSwaggerSpec(this.http, params);
	}

	getMarketplaceItems(params: GetMarketplaceListReq): Promise<MarketplaceListResp> {
		return marketplace.getMarketplaceItems(this.http, params);
	}

	getMarketplaceDatabases(params: { orgId: string }): Promise<MarketplaceDatabaseListResp> {
		return marketplace.getMarketplaceDatabases(this.http, params);
	}

	getMarketplaceDatabaseItem(params: GetDatabaseItemReq): Promise<MarketplaceItem> {
		return marketplace.getMarketplaceDatabaseItem(this.http, params);
	}

	getDatabaseServer(params: GetDatabaseServerReq): Promise<DatabaseServer> {
		return databases.getDatabaseServer(this.http, params);
	}

	getDatabaseAdminCredential(params: GetDatabaseServerReq): Promise<DatabaseAdminCredential> {
		return databases.getDatabaseAdminCredential(this.http, params);
	}

	getDatabaseCredentials(params: GetDatabaseServerReq): Promise<DatabaseCredential[]> {
		return databases.getDatabaseCredentials(this.http, params);
	}

	getMarketplaceIdl(params: GetMarketplaceIdlReq): Promise<MarketplaceIdlResp> {
		return marketplace.getMarketplaceIdl(this.http, params);
	}

	getMarketplaceItem(params: GetMarketplaceItemReq): Promise<MarketplaceItem> {
		return marketplace.getMarketplaceItem(this.http, params);
	}

	getConnections(params: GetConnectionsReq): Promise<ConnectionListItem[]> {
		return connections.getConnections(this.http, params);
	}

	getConnectionItem(params: GetConnectionItemReq): Promise<ConnectionDetailed> {
		return connections.getConnectionItem(this.http, params);
	}

	createComponentConnection(params: CreateComponentConnectionReq): Promise<ConnectionDetailed> {
		return connections.createComponentConnection(this.http, params);
	}

	createThirdPartyConnection(params: CreateThirdPartyConnectionReq): Promise<ConnectionDetailed> {
		return connections.createThirdPartyConnection(this.http, params);
	}

	createDatabaseConnection(params: CreateDatabaseConnectionReq): Promise<ConnectionDetailed> {
		return connections.createDatabaseConnection(this.http, params);
	}

	deleteConnection(params: DeleteConnectionReq): Promise<void> {
		return connections.deleteConnection(this.http, params);
	}

	getConnectionGuide(params: GetConnectionGuideReq): Promise<GetConnectionGuideResp> {
		return marketplace.getConnectionGuide(this.http, params);
	}

	registerMarketplaceConnection(params: RegisterMarketplaceConnectionReq): Promise<MarketplaceItem> {
		return marketplace.registerMarketplaceConnection(this.http, params);
	}

	getAutoBuildStatus(params: GetAutoBuildStatusReq): Promise<GetAutoBuildStatusResp> {
		return builds.getAutoBuildStatus(this.http, params);
	}

	enableAutoBuildOnCommit(params: ToggleAutoBuildReq): Promise<ToggleAutoBuildResp> {
		return builds.enableAutoBuildOnCommit(this.http, params);
	}

	disableAutoBuildOnCommit(params: ToggleAutoBuildReq): Promise<ToggleAutoBuildResp> {
		return builds.disableAutoBuildOnCommit(this.http, params);
	}

	checkWorkflowStatus(params: CheckWorkflowStatusReq): Promise<CheckWorkflowStatusResp> {
		return deployments.checkWorkflowStatus(this.http, params);
	}

	cancelApprovalRequest(params: CancelApprovalReq): Promise<void> {
		return deployments.cancelApprovalRequest(this.http, params);
	}

	requestPromoteApproval(params: RequestPromoteApprovalReq): Promise<void> {
		return deployments.requestPromoteApproval(this.http, params);
	}

	promoteProxyDeployment(params: PromoteProxyDeploymentReq): Promise<void> {
		return deployments.promoteProxyDeployment(this.http, params);
	}

	async getSubscriptions(params: GetSubscriptionsReq): Promise<SubscriptionsResp> {
		return subscriptions.getSubscriptions(this.http, params, await this.organizations());
	}

	getGitTokenForRepository(params: GetGitTokenForRepositoryReq): Promise<GetGitTokenForRepositoryResp> {
		return repos.getGitTokenForRepository(this.http, params);
	}

	getGitRepoMetadata(params: GetGitMetadataReq): Promise<GetGitMetadataResp> {
		return repos.getGitRepoMetadata(this.http, params);
	}

	getGitRepoMetadataBatch(params: GetGitMetadataReq[]): Promise<GetGitMetadataResp[]> {
		return repos.getGitRepoMetadataBatch(this.http, params);
	}

	updateCodeServer(params: UpdateCodeServerReq): Promise<void> {
		return components.updateCodeServer(this.http, params);
	}

	changePrebuiltIntegrationRepository(params: ChangePrebuiltIntegrationRepositoryReq): Promise<void> {
		return components.changePrebuiltIntegrationRepository(this.http, params);
	}

	getComponentUsage(params: GetComponentUsageReq): Promise<GetComponentUsageResp> {
		return components.getComponentUsage(this.http, params);
	}
}
