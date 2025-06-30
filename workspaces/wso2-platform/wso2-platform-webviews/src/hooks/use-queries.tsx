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

import { type UseQueryOptions, useMutation, useQueries, useQuery } from "@tanstack/react-query";
import {
	type ApiVersion,
	type BuildKind,
	type Buildpack,
	type CheckWorkflowStatusResp,
	ChoreoComponentType,
	type CommitHistory,
	type ComponentDeployment,
	type ComponentEP,
	type ComponentKind,
	type ConnectionListItem,
	type DeploymentLogsData,
	type DeploymentTrack,
	type Environment,
	type GetAutoBuildStatusResp,
	type GetTestKeyResp,
	type Organization,
	type Project,
	type ProxyDeploymentInfo,
	getTypeForDisplayType,
} from "@wso2/wso2-platform-core";
import { ChoreoWebViewAPI } from "../utilities/vscode-webview-rpc";

export const queryKeys = {
	getHasLocalChanges: (directoryPath: string) => ["has-local-changes", { directoryPath }],
	getComponentConfigDraft: (directoryPath: string, component: ComponentKind, branch: string) => [
		"has-config-drift",
		{ directoryPath, component: component?.metadata?.id, branch },
	],
	getProjectEnvs: (project: Project, org: Organization) => ["get-project-envs", { organization: org.handle, project: project.handler }],
	getTestKey: (endpointApimId: string, env: Environment, org: Organization) => [
		"get-test-key",
		{ endpoint: endpointApimId, env: env.id, org: org.handle },
	],
	getSwaggerSpec: (apiRevisionId: string, org: Organization) => ["get-swagger-spec", { selectedEndpoint: apiRevisionId, org: org.handle }],
	getBuildPacks: (selectedType: string, org: Organization) => ["build-packs", { selectedType, orgId: org?.id }],
	getGitBranches: (repoUrl: string, org: Organization, credRef: string, isAccessible: boolean) => [
		"get-git-branches",
		{ repo: repoUrl, orgId: org?.id, credRef, isAccessible },
	],
	getDeployedEndpoints: (deploymentTrack: DeploymentTrack, component: ComponentKind, org: Organization) => [
		"get-deployed-endpoints",
		{ organization: org.handle, component: component.metadata.id, deploymentTrackId: deploymentTrack?.id },
	],
	getProxyDeploymentInfo: (component: ComponentKind, org: Organization, env: Environment, apiVersion: ApiVersion) => [
		"get-proxy-deployment-info",
		{ org: org.handle, component: component.metadata.id, env: env?.id, apiVersion: apiVersion?.id },
	],
	getDeploymentStatus: (deploymentTrack: DeploymentTrack, component: ComponentKind, org: Organization, env: Environment) => [
		"get-deployment-status",
		{
			organization: org.handle,
			component: component.metadata.id,
			deploymentTrackId: deploymentTrack?.id,
			envId: env.id,
		},
	],
	getWorkflowStatus: (org: Organization, env: Environment, buildId: string) => [
		"get-workflow-status",
		{
			organization: org?.handle,
			envId: env?.id,
			buildId,
		},
	],
	getBuilds: (deploymentTrack: DeploymentTrack, component: ComponentKind, project: Project, org: Organization) => [
		"get-builds",
		{ component: component.metadata.id, organization: org.handle, project: project.handler, branch: deploymentTrack?.branch },
	],
	getBuildsLogs: (component: ComponentKind, project: Project, org: Organization, build: BuildKind) => [
		"get-build-logs",
		{ component: component.metadata.id, organization: org.handle, project: project.handler, build: build?.status?.runId },
	],
	getComponentConnections: (component: ComponentKind, project: Project, org: Organization) => [
		"get-component-connections",
		{ component: component.metadata.id, organization: org.handle, project: project.handler },
	],
	useComponentList: (project: Project, org: Organization) => ["get-components", { organization: org.handle, project: project.handler }],
	getProjectConnections: (project: Project, org: Organization) => ["get-project-connections", { organization: org.handle, project: project.handler }],
	getAutoBuildStatus: (component: ComponentKind, deploymentTrack: DeploymentTrack, org: Organization) => [
		"get-auto-build-status",
		{ component: component.metadata.id, organization: org.handle, versionId: deploymentTrack?.id },
	],
};

export const useGetProjectEnvs = (project: Project, org: Organization, options?: UseQueryOptions<Environment[]>) =>
	useQuery<Environment[]>(
		queryKeys.getProjectEnvs(project, org),
		() =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getEnvs({
				orgId: org.id.toString(),
				orgUuid: org.uuid,
				projectId: project.id,
			}),
		options,
	);

export const useGetTestKey = (endpointApimId: string, env: Environment, org: Organization, options?: UseQueryOptions<GetTestKeyResp>) =>
	useQuery<GetTestKeyResp>(
		queryKeys.getTestKey(endpointApimId, env, org),
		() =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getTestKey({
				apimId: endpointApimId,
				envName: env.name,
				orgId: org.id.toString(),
				orgUuid: org.uuid,
			}),
		options,
	);

export const useGetSwaggerSpec = (apiRevisionId: string, org: Organization, options?: UseQueryOptions<object>) =>
	useQuery<object>(
		queryKeys.getSwaggerSpec(apiRevisionId, org),
		() =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getSwaggerSpec({
				apimRevisionId: apiRevisionId,
				orgId: org.id.toString(),
				orgUuid: org.uuid,
			}),
		options,
	);

export const useGetBuildPacks = (selectedType: string, org: Organization, options?: UseQueryOptions<Buildpack[]>) =>
	useQuery<Buildpack[]>(
		queryKeys.getBuildPacks(selectedType, org),
		() =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getBuildPacks({
				componentType: selectedType,
				orgUuid: org.uuid,
				orgId: org.id.toString(),
			}),
		options,
	);

export const useGetGitBranches = (repoUrl: string, org: Organization, credRef = "", isAccessible = false, options?: UseQueryOptions<string[]>) =>
	useQuery<string[]>(
		queryKeys.getGitBranches(repoUrl, org, credRef, isAccessible),
		async () => {
			try {
				const branches = await ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getRepoBranches({
					repoUrl,
					orgId: org.id.toString(),
					credRef,
				});
				return branches ?? [];
			} catch {
				return [];
			}
		},
		options,
	);

export const useGetDeployedEndpoints = (
	deploymentTrack: DeploymentTrack,
	component: ComponentKind,
	org: Organization,
	options?: UseQueryOptions<ComponentEP[]>,
) =>
	useQuery<ComponentEP[]>(
		queryKeys.getDeployedEndpoints(deploymentTrack, component, org),
		async () => {
			try {
				const resp = await ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getComponentEndpoints({
					orgId: org.id.toString(),
					orgHandler: org.handle,
					componentId: component.metadata.id,
					deploymentTrackId: deploymentTrack?.id,
				});
				return resp ?? [];
			} catch {
				return [];
			}
		},
		options,
	);

export const useGetProxyDeploymentInfo = (
	component: ComponentKind,
	org: Organization,
	env: Environment,
	apiVersion: ApiVersion,
	options?: UseQueryOptions<ProxyDeploymentInfo>,
) =>
	useQuery<ProxyDeploymentInfo>(
		queryKeys.getProxyDeploymentInfo(component, org, env, apiVersion),
		async () => {
			try {
				const resp = await ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getProxyDeploymentInfo({
					orgId: org.id?.toString(),
					orgUuid: org.uuid,
					orgHandler: org.handle,
					componentId: component.metadata?.id,
					envId: env?.id,
					versionId: apiVersion?.id,
				});
				return resp || null;
			} catch {
				return null;
			}
		},
		options,
	);

export const useGetDeploymentStatus = (
	deploymentTrack: DeploymentTrack,
	component: ComponentKind,
	org: Organization,
	env: Environment,
	options?: UseQueryOptions<ComponentDeployment>,
) =>
	useQuery<ComponentDeployment>(
		queryKeys.getDeploymentStatus(deploymentTrack, component, org, env),
		() =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getDeploymentStatus({
				orgId: org.id.toString(),
				orgUuid: org.uuid,
				orgHandler: org.handle,
				componentId: component.metadata.id,
				deploymentTrackId: deploymentTrack?.id,
				envId: env.id,
			}),
		options,
	);

export const useGetDeploymentStatuses = (
	deploymentTrack: DeploymentTrack,
	component: ComponentKind,
	org: Organization,
	envs: Environment[],
	options?: UseQueryOptions,
) =>
	useQueries<ComponentDeployment[]>({
		queries: envs.map((env) => ({
			queryKeys: queryKeys.getDeploymentStatus(deploymentTrack, component, org, env),
			queryFn: () =>
				ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getDeploymentStatus({
					orgId: org.id.toString(),
					orgUuid: org.uuid,
					orgHandler: org.handle,
					componentId: component.metadata.id,
					deploymentTrackId: deploymentTrack?.id,
					envId: env.id,
				}),
			...options,
		})),
	});

export const useGetWorkflowStatus = (org: Organization, env: Environment, buildId: string, options?: UseQueryOptions<CheckWorkflowStatusResp>) =>
	useQuery<CheckWorkflowStatusResp>(
		queryKeys.getWorkflowStatus(org, env, buildId),
		() =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().checkWorkflowStatus({
				buildId,
				envId: env?.id,
				orgId: org?.id?.toString(),
			}),
		options,
	);

export const useGetBuildList = (
	deploymentTrack: DeploymentTrack,
	component: ComponentKind,
	project: Project,
	org: Organization,
	options?: UseQueryOptions<BuildKind[]>,
) =>
	useQuery<BuildKind[]>(
		queryKeys.getBuilds(deploymentTrack, component, project, org),
		async () => {
			try {
				const builds = await ChoreoWebViewAPI.getInstance()
					.getChoreoRpcClient()
					.getBuilds({
						componentId: component.metadata.id,
						componentName: component.metadata.name,
						displayType: component.spec.type,
						branch: deploymentTrack?.branch,
						orgId: org.id?.toString(),
						apiVersionId:
							getTypeForDisplayType(component.spec.type) === ChoreoComponentType.ApiProxy
								? component?.apiVersions?.find((item) => item.latest)?.versionId
								: deploymentTrack?.id,
					});
				return builds ?? [];
			} catch {
				return [];
			}
		},
		options,
	);

export const useComponentConnectionList = (
	component: ComponentKind,
	project: Project,
	org: Organization,
	options?: UseQueryOptions<ConnectionListItem[]>,
) =>
	useQuery<ConnectionListItem[]>(
		queryKeys.getComponentConnections(component, project, org),
		() =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getConnections({
				componentId: component.metadata?.id,
				orgId: org.id.toString(),
				projectId: project.id,
			}),
		options,
	);

export const useComponentList = (project: Project, org: Organization, options?: UseQueryOptions<ComponentKind[]>) =>
	useQuery<ComponentKind[]>(
		queryKeys.useComponentList(project, org),
		() =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getComponentList({
				orgHandle: org.handle,
				orgId: org.id.toString(),
				projectHandle: project.handler,
				projectId: project.id,
			}),
		options,
	);

export const useProjectConnectionList = (project: Project, org: Organization, options?: UseQueryOptions<ConnectionListItem[]>) =>
	useQuery<ConnectionListItem[]>(
		queryKeys.getProjectConnections(project, org),
		() =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getConnections({
				componentId: "",
				orgId: org.id.toString(),
				projectId: project.id,
			}),
		options,
	);

export const useGetAutoBuildStatus = (
	component: ComponentKind,
	deploymentTrack: DeploymentTrack,
	org: Organization,
	options?: UseQueryOptions<GetAutoBuildStatusResp>,
) =>
	useQuery<GetAutoBuildStatusResp>(
		queryKeys.getAutoBuildStatus(component, deploymentTrack, org),
		() =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getAutoBuildStatus({
				componentId: component.metadata?.id,
				orgId: org.id.toString(),
				versionId: deploymentTrack?.id,
			}),
		options,
	);

export const useGoToSource = () => {
	const { mutate: openFile } = useMutation({
		mutationFn: async (fsPaths: string[]) => {
			const filePath = await ChoreoWebViewAPI.getInstance().joinFsFilePaths(fsPaths);
			const fileExists = await ChoreoWebViewAPI.getInstance().fileExist(filePath);
			if (fileExists) {
				return ChoreoWebViewAPI.getInstance().goToSource(filePath);
			}
			ChoreoWebViewAPI.getInstance().showErrorMsg("File does not not exist");
		},
		onError: () => {
			ChoreoWebViewAPI.getInstance().showErrorMsg("Failed to open file");
		},
	});
	return { openFile };
};

export const useGetBuildLogs = (
	component: ComponentKind,
	org: Organization,
	project: Project,
	build: BuildKind,
	options?: UseQueryOptions<DeploymentLogsData>,
) =>
	useQuery<DeploymentLogsData>(
		queryKeys.getBuildsLogs(component, project, org, build),
		async () => {
			try {
				const buildLog = await ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getBuildLogs({
					componentId: component.metadata.id,
					displayType: component.spec.type,
					orgHandler: org.handle,
					orgId: org.id.toString(),
					projectId: project.id,
					buildId: build.status?.runId,
				});
				return buildLog ?? null;
			} catch {
				return null;
			}
		},
		options,
	);

export const useCreateNewOpenApiFile = ({ onSuccess, directoryFsPath }: { directoryFsPath: string; onSuccess?: (subPath: string) => void }) => {
	const sampleOpenAPIContent = `openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
paths:
  /example:
    get:
      summary: Retrieve an example resource
      responses:
        '200':
          description: Successful response
`;
	const { mutate: createNewOpenApiFile } = useMutation({
		mutationFn: async () => {
			return ChoreoWebViewAPI.getInstance().saveFile({
				baseDirectoryFs: directoryFsPath,
				fileContent: sampleOpenAPIContent,
				shouldPromptDirSelect: true,
				fileName: "swagger.yaml",
				isOpenApiFile: true,
				successMessage: `A sample OpenAPI specification file has been created at ${directoryFsPath}`,
			});
		},
		onSuccess: async (createdPath) => {
			const subPath = await ChoreoWebViewAPI.getInstance().getSubPath({
				subPath: createdPath,
				parentPath: directoryFsPath,
			});
			if (onSuccess) {
				onSuccess(subPath);
			}
		},
		onError: () => ChoreoWebViewAPI.getInstance().showErrorMsg("Failed to create openapi file"),
	});
	return { createNewOpenApiFile };
};
