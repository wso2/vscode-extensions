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

import { type } from "node:os";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { UseQueryResult, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { VSCodeDropdown, VSCodeLink, VSCodeOption } from "@vscode/webview-ui-toolkit/react";
import {
	type BuildKind,
	type CheckWorkflowStatusResp,
	ChoreoComponentType,
	type ComponentDeployment,
	ComponentDisplayType,
	type ComponentEP,
	type ComponentKind,
	type CreateDeploymentReq,
	DeploymentLogsData,
	DeploymentStatus,
	type DeploymentTrack,
	EndpointDeploymentStatus,
	type Environment,
	type Organization,
	type Project,
	type ProxyDeploymentInfo,
	type StateReason,
	type WebviewQuickPickItem,
	WebviewQuickPickItemKind,
	WorkflowInstanceStatus,
	capitalizeFirstLetter,
	getComponentKindRepoSource,
	getShortenedHash,
	getTimeAgo,
	getTypeForDisplayType,
	toTitleCase,
} from "@wso2/wso2-platform-core";
import classNames from "classnames";
import classnames from "classnames";
import clipboardy from "clipboardy";
import React, { type FC, type ReactNode, useState, useEffect } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { listTimeZones } from "timezone-support";
import { z } from "zod";
import { Banner } from "../../../components/Banner";
import { Button } from "../../../components/Button";
import { Codicon } from "../../../components/Codicon";
import { CommitLink } from "../../../components/CommitLink";
import { Divider } from "../../../components/Divider";
import { Drawer } from "../../../components/Drawer";
import { Empty } from "../../../components/Empty";
import { Dropdown } from "../../../components/FormElements/Dropdown";
import { TextArea } from "../../../components/FormElements/TextArea";
import { TextField } from "../../../components/FormElements/TextField";
import { SkeletonText } from "../../../components/SkeletonText";
import {
	queryKeys,
	useGetDeployedEndpoints,
	useGetDeploymentStatus,
	useGetProxyDeploymentInfo,
	useGetWorkflowStatus,
} from "../../../hooks/use-queries";
import { useExtWebviewContext } from "../../../providers/ext-vewview-ctx-provider";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";
import { httpsUrlSchema } from "../../ComponentFormView/componentFormSchema";
import { ApiTestSection } from "../sections/ApiTestSection";

interface Props {
	component: ComponentKind;
	project: Project;
	organization: Organization;
	deploymentTrack?: DeploymentTrack;
	envs: Environment[];
	loadingEnvs: boolean;
	builds: BuildKind[];
	openBuildDetailsPanel: (item: BuildKind) => void;
}

// todo: check visibilities instead of visibility when showing endpoints

export const DeploymentsSection: FC<Props> = (props) => {
	const { envs, loadingEnvs, deploymentTrack, component, organization, project, builds = [], openBuildDetailsPanel } = props;
	const [hasInactiveEndpoints, setHasInactiveEndpoints] = useState(false);
	const componentType = getTypeForDisplayType(component.spec.type);

	const [triggeredDeployment, setTriggeredDeployment] = useState<{ [key: string]: boolean }>({});
	const onTriggerDeployment = (env: Environment, deploying: boolean) => {
		setTriggeredDeployment({ ...triggeredDeployment, [`${deploymentTrack?.branch}-${env.name}`]: deploying });
	};

	const { data: endpoints = [], refetch: refetchEndpoints } = useGetDeployedEndpoints(deploymentTrack, component, organization, {
		enabled: !!deploymentTrack?.id && componentType === ChoreoComponentType.Service,
		onSuccess: (data = []) => setHasInactiveEndpoints(data.some((item) => item.state !== "Active")),
		refetchInterval: hasInactiveEndpoints ? 5000 : false,
	});

	const [deploymentStatusMap, setDeploymentStatusMap] = useState<{ [key: string]: ComponentDeployment }>({});
	const [proxyDeploymentStatusMap, setProxyDeploymentStatusMap] = useState<{ [key: string]: ProxyDeploymentInfo }>({});

	if (loadingEnvs) {
		return (
			<>
				{Array.from(new Array(2)).map((_, index) => (
					<EnvItemSkeleton key={index} index={index} />
				))}
			</>
		);
	}

	if (componentType === ChoreoComponentType.ApiProxy) {
		return (
			<>
				{envs?.map((item, index) => {
					let nextEnv: Environment;
					let nextEnvDeploymentStatus: ProxyDeploymentInfo;
					if (
						envs[index + 1] &&
						envs[index + 1].promoteFrom.includes(item.id) &&
						["CREATED", "PUBLISHED"].includes(proxyDeploymentStatusMap[item.name]?.lifecycleStatus)
					) {
						nextEnv = envs[index + 1];
						nextEnvDeploymentStatus = proxyDeploymentStatusMap[envs[index + 1].name];
					}
					// TODO: nextEnv should be a list of envs
					return (
						<ProxyEnvItem
							key={item.name}
							index={index}
							env={item}
							component={component}
							organization={organization}
							project={project}
							deploymentTrack={deploymentTrack}
							triggeredDeployment={triggeredDeployment[`${deploymentTrack?.branch}-${item.name}`]}
							loadedDeploymentStatus={(deploying) => onTriggerDeployment(item, deploying)}
							builds={builds}
							loadedNextEnvDeploymentStatus={nextEnv ? (deploying) => onTriggerDeployment(nextEnv, deploying) : undefined}
							nextEnv={nextEnv}
							nextEnvProxyDeploymentStatus={nextEnvDeploymentStatus}
							setDeploymentStatus={(deploymentStatus) => setProxyDeploymentStatusMap({ ...proxyDeploymentStatusMap, [item.name]: deploymentStatus })}
						/>
					);
				})}
			</>
		);
	}

	return (
		<>
			{envs?.map((item, index) => {
				let nextEnv: Environment;
				let nextEnvDeploymentStatus: ComponentDeployment;
				if (
					envs[index + 1] &&
					envs[index + 1].promoteFrom.includes(item.id) &&
					deploymentStatusMap[item.name]?.deploymentStatusV2 === DeploymentStatus.Active
				) {
					nextEnv = envs[index + 1];
					nextEnvDeploymentStatus = deploymentStatusMap[envs[index + 1].name];
				}
				// TODO: nextEnv should be a list of envs
				return (
					<EnvItem
						key={item.name}
						index={index}
						env={item}
						nextEnv={nextEnv}
						endpoints={endpoints.filter((endpointItem) => endpointItem.environmentId === item.id)}
						refetchEndpoint={componentType === ChoreoComponentType.Service ? refetchEndpoints : undefined}
						component={component}
						organization={organization}
						project={project}
						deploymentTrack={deploymentTrack}
						builds={builds}
						triggeredDeployment={triggeredDeployment[`${deploymentTrack?.branch}-${item.name}`]}
						loadedDeploymentStatus={(deploying) => onTriggerDeployment(item, deploying)}
						openBuildDetailsPanel={openBuildDetailsPanel}
						loadedNextEnvDeploymentStatus={nextEnv ? (deploying) => onTriggerDeployment(nextEnv, deploying) : undefined}
						nextEnvDeploymentStatus={nextEnvDeploymentStatus}
						setDeploymentStatus={(deploymentStatus) => setDeploymentStatusMap({ ...deploymentStatusMap, [item.name]: deploymentStatus })}
					/>
				);
			})}
		</>
	);
};

const EnvItem: FC<{
	index: number;
	component: ComponentKind;
	project: Project;
	organization: Organization;
	deploymentTrack?: DeploymentTrack;
	env: Environment;
	nextEnv?: Environment;
	endpoints: ComponentEP[];
	refetchEndpoint: () => void;
	builds: BuildKind[];
	triggeredDeployment?: boolean;
	loadedDeploymentStatus: (deploying: boolean) => void;
	loadedNextEnvDeploymentStatus: (deploying: boolean) => void;
	openBuildDetailsPanel: (item: BuildKind) => void;
	nextEnvDeploymentStatus?: ComponentDeployment;
	setDeploymentStatus?: (deploymentStatus?: ComponentDeployment) => void;
}> = ({
	organization,
	index,
	project,
	deploymentTrack,
	component,
	env,
	nextEnv,
	endpoints,
	refetchEndpoint,
	builds = [],
	loadedDeploymentStatus,
	triggeredDeployment,
	openBuildDetailsPanel,
	loadedNextEnvDeploymentStatus,
	nextEnvDeploymentStatus,
	setDeploymentStatus,
}) => {
	const componentType = getTypeForDisplayType(component.spec.type);
	const [envDetailsRef] = useAutoAnimate();
	const [isDeploymentInProgress, setDeploymentInProgress] = useState(false);
	const webviewState = useExtWebviewContext();
	const choreoEnv = webviewState?.choreoEnv;
	const extName = webviewState.extensionName;
	const [isTestPanelOpen, setTestPanelOpen] = useState(false);
	const [isEndpointsPanelOpen, setIsEndpointsPanelOpen] = useState(false);

	const {
		data: deploymentStatus,
		isLoading: loadingDeploymentStatus,
		isRefetching: isRefetchingDeploymentStatus,
		refetch: refetchDeploymentStatus,
	} = useGetDeploymentStatus(deploymentTrack, component, organization, env, {
		enabled: !!deploymentTrack?.id,
		onSuccess: (data) => {
			if (refetchEndpoint) {
				refetchEndpoint();
			}
			if (triggeredDeployment) {
				loadedDeploymentStatus(false);
			}
			setDeploymentStatus(data);
			setDeploymentInProgress(data?.deploymentStatusV2 === DeploymentStatus.InProgress);
			if (nextEnv?.critical) {
				refetchWorkflowStatus();
			}
		},
		refetchInterval: isDeploymentInProgress ? 5000 : false,
	});

	const buildId = deploymentStatus?.build?.buildId;
	const {
		data: workflowStatus,
		refetch: refetchWorkflowStatus,
		isLoading: isLoadingWorkflowStatus,
	} = useGetWorkflowStatus(organization, nextEnv, buildId, {
		enabled: !!nextEnv && !!nextEnv?.critical && !!buildId,
	});

	let timeAgo = "";
	if (deploymentStatus?.build?.deployedAt) {
		timeAgo = getTimeAgo(new Date(deploymentStatus?.build?.deployedAt));
	}

	let statusStr: string = deploymentStatus?.deploymentStatusV2;
	if (statusStr === DeploymentStatus.Active) {
		statusStr = "Deployed";
	}

	const { viewRuntimeLogs } = useViewRunTimeLogs(component, organization, project, env, deploymentTrack);

	const { selectLogType } = useSelectLogType(componentType, (logType) => viewRuntimeLogs(logType));

	const publicEndpoints = endpoints?.filter((item) => item.visibility === "Public");
	const activePublicEndpoints = endpoints?.filter((item) => item.visibility === "Public" && item.state === "Active");

	const getStatusText = () => {
		if (deploymentStatus) {
			if (triggeredDeployment) {
				if (
					[DeploymentStatus.Active, DeploymentStatus.Suspended, DeploymentStatus.Error].includes(
						deploymentStatus?.deploymentStatusV2 as DeploymentStatus,
					)
				) {
					return "Redeploying";
				}
				return "In Progress";
			}
			return toTitleCase(statusStr);
		}
		if (triggeredDeployment) {
			return "In Progress";
		}
		return "Not Deployed";
	};

	const getLogTypeLabel = (componentType: string) => {
		if ([ChoreoComponentType.Service, ChoreoComponentType.Webhook].includes(componentType as ChoreoComponentType)) {
			return "Runtime Logs";
		}
		if (componentType === ChoreoComponentType.ApiProxy) {
			return "Gateway Logs";
		}
		return "Application Logs";
	};

	const deployedBuild = builds?.find((item) => item.status?.runId?.toString() === deploymentStatus?.build?.runId);

	return (
		<>
			<Drawer
				open={isTestPanelOpen}
				onClose={() => setTestPanelOpen(false)}
				maxWidthClassName="max-w-4xl"
				title={`OpenAPI Console - ${capitalizeFirstLetter(env.name)} Environment`}
			>
				<ApiTestSection
					choreoEnv={choreoEnv}
					component={component}
					env={env}
					org={organization}
					endpoints={
						endpoints?.length > 0
							? endpoints?.map((item) => ({
									publicUrl: item.publicUrl,
									displayName: item.displayName,
									apimId: item.apimId,
									revisionId: item.apimRevisionId,
								}))
							: []
					}
				/>
			</Drawer>
			<Drawer
				open={isEndpointsPanelOpen}
				onClose={() => setIsEndpointsPanelOpen(false)}
				maxWidthClassName="max-w-sm"
				title={`Endpoint${endpoints.length > 1 ? "s" : ""} - ${capitalizeFirstLetter(env.name)} Environment`}
			>
				<EndpointDetailsSection endpoints={endpoints} />
			</Drawer>
			<Divider />
			<div>
				<div className="mb-3 flex flex-wrap items-center justify-end gap-2">
					<h3 className="text-base capitalize lg:text-lg">{capitalizeFirstLetter(env.name)} Environment</h3>
					{!loadingDeploymentStatus && (
						<Button
							onClick={() => refetchDeploymentStatus()}
							appearance="icon"
							title={`${isRefetchingDeploymentStatus ? "Refreshing" : "Refresh"} Deployment Details`}
							className="opacity-50"
							disabled={isRefetchingDeploymentStatus}
						>
							<Codicon name="refresh" className={classNames(isRefetchingDeploymentStatus && "animate-spin")} />
						</Button>
					)}
					<div className="flex-1" />
					{index === 0 && !loadingDeploymentStatus && builds.length > 0 && (
						<DeployButton
							builds={builds}
							component={component}
							componentType={componentType}
							deploymentTrack={deploymentTrack}
							env={env}
							loadedDeploymentStatus={loadedDeploymentStatus}
							organization={organization}
							project={project}
							deploymentStatus={deploymentStatus}
						/>
					)}
					{nextEnv && !!deploymentStatus && (
						<DeployButton
							builds={builds}
							component={component}
							componentType={componentType}
							deploymentTrack={deploymentTrack}
							env={nextEnv}
							loadedDeploymentStatus={loadedNextEnvDeploymentStatus}
							organization={organization}
							project={project}
							deploymentStatus={nextEnvDeploymentStatus}
							promotion={{
								prevEnv: env,
								prevBuild: deployedBuild,
								prevDeploymentStatus: deploymentStatus,
								workflowStatus: workflowStatus,
								refetchWorkflowStatus: refetchWorkflowStatus,
								isLoadingWorkflowStatus: nextEnv?.critical && isLoadingWorkflowStatus,
							}}
						/>
					)}
				</div>

				<div className="flex flex-col gap-3 ">
					<div className="grid grid-cols-1 gap-2 gap-x-5 md:grid-cols-2 xl:grid-cols-3" ref={envDetailsRef}>
						{loadingDeploymentStatus ? (
							<>
								<GridColumnItem label="Status">
									<SkeletonText className="w-24" />
								</GridColumnItem>
								<GridColumnItem label="Build">
									<SkeletonText className="w-12" />
								</GridColumnItem>
								<GridColumnItem label="URL">
									<SkeletonText className="max-w-44" />
								</GridColumnItem>
							</>
						) : (
							<>
								<GridColumnItem label="Status">
									<span
										className={classNames({
											"font-medium text-vsc-errorForeground": deploymentStatus?.deploymentStatusV2 === DeploymentStatus.Error,
											"text-vsc-charts-lines": deploymentStatus?.deploymentStatusV2 === DeploymentStatus.Suspended,
											"text-vsc-foreground": deploymentStatus?.deploymentStatusV2 === DeploymentStatus.NotDeployed,
											"font-medium text-vsc-charts-green": deploymentStatus?.deploymentStatusV2 === DeploymentStatus.Active,
											"animate-pulse text-vsc-charts-orange":
												deploymentStatus?.deploymentStatusV2 === DeploymentStatus.InProgress || triggeredDeployment,
										})}
									>
										{getStatusText()}
									</span>
									{timeAgo && <span className="ml-2 font-thin text-[11px] opacity-70">{`${timeAgo}`}</span>}
								</GridColumnItem>
								{deployedBuild && (
									<GridColumnItem label={deploymentStatus?.deploymentStatusV2 === DeploymentStatus.Active ? "Deployed Build" : "Build"}>
										<VSCodeLink title="View Build Details" className="text-vsc-foreground" onClick={() => openBuildDetailsPanel(deployedBuild)}>
											{deployedBuild.status?.runId}
										</VSCodeLink>
									</GridColumnItem>
								)}
								{deploymentStatus?.build?.commit?.sha && (
									<GridColumnItem label="Commit">
										<CommitLink
											commitHash={deploymentStatus?.build?.commit?.sha}
											commitMessage={deploymentStatus?.build?.commit?.message}
											repoPath={getComponentKindRepoSource(component?.spec?.source).repo}
										/>
									</GridColumnItem>
								)}
								{[DeploymentStatus.Active, DeploymentStatus.InProgress].includes(deploymentStatus?.deploymentStatusV2) && (
									<>
										{deploymentStatus?.invokeUrl && (
											<EndpointItem
												type="Invoke"
												name="invoke-url"
												state={EndpointDeploymentStatus.Active}
												url={deploymentStatus?.invokeUrl}
												showOpen={true}
											/>
										)}
										{[ChoreoComponentType.Service, ChoreoComponentType.Webhook].includes(componentType as ChoreoComponentType) &&
											endpoints?.length > 0 && (
												<GridColumnItem label={`${endpoints.length} Endpoint${endpoints.length > 1 ? "s" : ""}`}>
													<VSCodeLink
														className={classNames({
															"text-vsc-foreground": !endpoints?.some((item) => item.state === EndpointDeploymentStatus.Error),
															"text-vsc-errorForeground": endpoints?.some((item) => item.state === EndpointDeploymentStatus.Error),
															"animate-pulse": endpoints?.some((item) =>
																[EndpointDeploymentStatus.InProgress, EndpointDeploymentStatus.Pending].includes(item.state),
															),
														})}
														title="View Endpoint Details"
														onClick={() => setIsEndpointsPanelOpen(true)}
													>
														Details
													</VSCodeLink>
												</GridColumnItem>
											)}
										{publicEndpoints.length > 0 && (
											<GridColumnItem label="Test">
												<VSCodeLink
													className={classNames("text-vsc-foreground", activePublicEndpoints.length === 0 && "cursor-not-allowed opacity-50")}
													onClick={activePublicEndpoints.length > 0 ? () => setTestPanelOpen(true) : undefined}
													title={`View OpenAPI console to test the deployed ${extName === "Devant" ? "integration" : "component"}`}
												>
													OpenAPI Console
												</VSCodeLink>
											</GridColumnItem>
										)}
									</>
								)}
								{[DeploymentStatus.Active, DeploymentStatus.InProgress, DeploymentStatus.Error].includes(deploymentStatus?.deploymentStatusV2) && (
									<GridColumnItem label="Observability">
										<VSCodeLink
											className="text-vsc-foreground"
											onClick={() => selectLogType()}
											title={`View ${getLogTypeLabel(componentType)} of your deployed ${extName === "Devant" ? "integration" : "component"}`}
										>
											{getLogTypeLabel(componentType)}
										</VSCodeLink>
									</GridColumnItem>
								)}
							</>
						)}
					</div>
				</div>
			</div>
		</>
	);
};

const ProxyEnvItem: FC<{
	component: ComponentKind;
	project: Project;
	organization: Organization;
	deploymentTrack?: DeploymentTrack;
	env: Environment;
	triggeredDeployment?: boolean;
	loadedDeploymentStatus: (deploying: boolean) => void;
	builds: BuildKind[];
	index: number;
	nextEnv?: Environment;
	nextEnvProxyDeploymentStatus?: ProxyDeploymentInfo;
	loadedNextEnvDeploymentStatus: (deploying: boolean) => void;
	setDeploymentStatus?: (deploymentStatus?: ProxyDeploymentInfo) => void;
}> = ({
	organization,
	project,
	deploymentTrack,
	component,
	env,
	triggeredDeployment,
	loadedDeploymentStatus,
	builds = [],
	setDeploymentStatus,
	nextEnv,
	loadedNextEnvDeploymentStatus,
	index,
	nextEnvProxyDeploymentStatus,
}) => {
	const [isTestPanelOpen, setTestPanelOpen] = useState(false);
	const componentType = getTypeForDisplayType(component.spec.type);
	const [envDetailsRef] = useAutoAnimate();
	const latestApiVersion = component?.apiVersions?.find((item) => item.latest);
	const webviewState = useExtWebviewContext();
	const choreoEnv = webviewState?.choreoEnv;
	const extName = webviewState?.extensionName;

	const {
		data: proxyDeploymentData,
		refetch: refetchProxyDeploymentData,
		isLoading: isLoadingProxyDeploymentData,
		isRefetching: isRefetchingProxyDeploymentData,
	} = useGetProxyDeploymentInfo(component, organization, env, latestApiVersion, {
		enabled: !!latestApiVersion,
		onSuccess: (data) => {
			loadedDeploymentStatus(false);
			setDeploymentStatus(data);
			if (nextEnv?.critical) {
				refetchWorkflowStatus();
			}
		},
		refetchInterval: triggeredDeployment ? 5000 : false,
	});

	const buildId = proxyDeploymentData?.build?.id;
	const {
		data: workflowStatus,
		refetch: refetchWorkflowStatus,
		isLoading: isLoadingWorkflowStatus,
	} = useGetWorkflowStatus(organization, nextEnv, buildId, {
		enabled: !!nextEnv && !!nextEnv?.critical && !!buildId,
	});

	let timeAgo = "";
	if (proxyDeploymentData?.deployedTime) {
		timeAgo = getTimeAgo(new Date(proxyDeploymentData?.deployedTime));
	}

	const { viewRuntimeLogs } = useViewRunTimeLogs(component, organization, project, env, deploymentTrack);

	const { selectLogType } = useSelectLogType(componentType, (logType) => viewRuntimeLogs(logType));

	const getStatusText = () => {
		if (proxyDeploymentData) {
			if (triggeredDeployment) {
				return "Redeploying";
			}
			if (["CREATED", "PUBLISHED"].includes(proxyDeploymentData?.lifecycleStatus)) {
				return "Deployed";
			}
			return toTitleCase(proxyDeploymentData?.lifecycleStatus);
		}
		if (triggeredDeployment) {
			return "In Progress";
		}
		return "Not Deployed";
	};

	return (
		<>
			<Drawer
				open={isTestPanelOpen}
				onClose={() => setTestPanelOpen(false)}
				maxWidthClassName="max-w-4xl"
				title={`OpenAPI Console - ${capitalizeFirstLetter(env.name)} Environment`}
			>
				<ApiTestSection
					choreoEnv={choreoEnv}
					component={component}
					env={env}
					org={organization}
					// todo: add sandbox url here as well
					endpoints={
						proxyDeploymentData
							? [{ apimId: proxyDeploymentData?.apiId, publicUrl: proxyDeploymentData?.invokeUrl, revisionId: proxyDeploymentData?.apiRevision?.id }]
							: []
					}
				/>
			</Drawer>
			<Divider />
			<div>
				<div className="mb-3 flex flex-wrap items-center justify-end gap-2">
					<h3 className="text-base capitalize lg:text-lg">{capitalizeFirstLetter(env.name)} Environment</h3>
					{!isLoadingProxyDeploymentData && (
						<Button
							onClick={() => refetchProxyDeploymentData()}
							appearance="icon"
							title={`${isRefetchingProxyDeploymentData ? "Refreshing" : "Refresh"} Deployment Details`}
							className="opacity-50"
							disabled={isRefetchingProxyDeploymentData}
						>
							<Codicon name="refresh" className={classNames(isRefetchingProxyDeploymentData && "animate-spin")} />
						</Button>
					)}
					<div className="flex-1" />
					{index === 0 && !isLoadingProxyDeploymentData && builds.length > 0 && (
						<DeployButton
							builds={builds}
							component={component}
							componentType={componentType}
							deploymentTrack={deploymentTrack}
							env={env}
							loadedDeploymentStatus={loadedDeploymentStatus}
							organization={organization}
							project={project}
							proxyDeploymentData={proxyDeploymentData}
						/>
					)}
					{nextEnv && !!proxyDeploymentData && (
						<DeployButton
							builds={builds}
							component={component}
							componentType={componentType}
							deploymentTrack={deploymentTrack}
							env={nextEnv}
							loadedDeploymentStatus={loadedNextEnvDeploymentStatus}
							organization={organization}
							project={project}
							proxyDeploymentData={nextEnvProxyDeploymentStatus}
							promotion={{
								prevEnv: env,
								prevProxyDeploymentData: proxyDeploymentData,
								workflowStatus: workflowStatus,
								refetchWorkflowStatus: refetchWorkflowStatus,
								isLoadingWorkflowStatus: nextEnv?.critical && isLoadingWorkflowStatus,
							}}
						/>
					)}
				</div>

				<div className="flex flex-col gap-3 ">
					<div className="grid grid-cols-1 gap-2 gap-x-5 md:grid-cols-2 xl:grid-cols-3" ref={envDetailsRef}>
						{isLoadingProxyDeploymentData ? (
							<>
								<GridColumnItem label="Lifecycle Status">
									<SkeletonText className="w-24" />
								</GridColumnItem>
								<GridColumnItem label="Proxy URL">
									<SkeletonText className="max-w-44" />
								</GridColumnItem>
								<GridColumnItem label="Observability">
									<SkeletonText className="max-w-24" />
								</GridColumnItem>
							</>
						) : (
							<>
								<GridColumnItem label="Status">
									<span
										className={classNames({
											"font-medium text-vsc-charts-green": ["CREATED", "PUBLISHED"].includes(proxyDeploymentData?.lifecycleStatus),
											"animate-pulse text-vsc-charts-orange": triggeredDeployment,
										})}
									>
										{getStatusText()}
									</span>
									{timeAgo && <span className="ml-2 font-thin text-[11px] opacity-70">{`${timeAgo}`}</span>}
								</GridColumnItem>
								{proxyDeploymentData?.invokeUrl && (
									<EndpointItem type="Proxy" name="proxy-url" state={EndpointDeploymentStatus.Active} url={proxyDeploymentData?.invokeUrl} />
								)}
								{proxyDeploymentData && (
									<GridColumnItem label="Observability">
										<VSCodeLink
											className="text-vsc-foreground"
											onClick={() => selectLogType()}
											title={`View Gateway of your deployed ${extName === "Devant" ? "integration" : "component"}`}
										>
											Gateway Logs
										</VSCodeLink>
									</GridColumnItem>
								)}
								{proxyDeploymentData && (
									<GridColumnItem label="Test">
										<VSCodeLink
											className="text-vsc-foreground"
											onClick={() => setTestPanelOpen(true)}
											title="View OpenAPI console to test the deployed proxy"
										>
											OpenAPI Console
										</VSCodeLink>
									</GridColumnItem>
								)}
							</>
						)}
					</div>
				</div>
			</div>
		</>
	);
};

const EnvItemSkeleton: FC<{ index: number }> = ({ index }) => {
	return (
		<>
			<Divider />
			<div>
				<div className="mb-3 flex flex-wrap items-center justify-end gap-2">
					<SkeletonText className={classNames(index % 2 === 0 ? "w-52" : "w-48")} />
					<Button disabled appearance="icon" className="opacity-50">
						<Codicon name="refresh" />
					</Button>
					<div className="flex-1" />
					{index === 0 && (
						<Button appearance="secondary" disabled className="animate-pulse">
							Deploy
						</Button>
					)}
				</div>
				<div className="flex flex-col gap-3 ">
					<div className="grid grid-cols-1 gap-2 gap-x-5 md:grid-cols-2 xl:grid-cols-3">
						<GridColumnItem label="Status">
							<SkeletonText className="w-24" />
						</GridColumnItem>
						<GridColumnItem label="Build">
							<SkeletonText className="w-12" />
						</GridColumnItem>
						<GridColumnItem label="URL">
							<SkeletonText className="max-w-44" />
						</GridColumnItem>
					</div>
				</div>
			</div>
		</>
	);
};

const GridColumnItem: FC<{ label: string; children?: ReactNode }> = ({ label, children }) => (
	<div className={classNames("flex flex-col")}>
		<div className="font-light text-[9px] opacity-75 md:text-xs">{label}</div>
		<div className="line-clamp-1 w-full">{children}</div>
	</div>
);

const EndpointItem: FC<{
	type: string;
	name: string;
	url: string;
	state?: EndpointDeploymentStatus;
	showOpen?: boolean;
}> = ({ name, type, url, state, showOpen }) => {
	const { mutate: copyUrl } = useMutation({
		mutationFn: (url: string) => clipboardy.write(url),
		onSuccess: () => ChoreoWebViewAPI.getInstance().showInfoMsg("The URL has been copied to the clipboard."),
	});

	const openExternal = (url: string) => ChoreoWebViewAPI.getInstance().openExternal(url);

	return (
		<GridColumnItem label={`${type} URL`} key={`${name}-${type}`}>
			{url ? (
				<div className="flex items-center gap-1">
					<VSCodeLink
						title="Copy URL"
						className={classNames({
							"flex-1 text-vsc-foreground": true,
							"animate-pulse": [EndpointDeploymentStatus.Pending, EndpointDeploymentStatus.InProgress].includes(state),
							"text-vsc-errorForeground": state === EndpointDeploymentStatus.Error,
						})}
						onClick={() => copyUrl(url)}
					>
						<p className="line-clamp-1 break-all">
							{url ||
								([EndpointDeploymentStatus.Pending, EndpointDeploymentStatus.InProgress].includes(state) && <SkeletonText className="max-w-44" />) ||
								state === EndpointDeploymentStatus.Error ||
								"-"}
						</p>
					</VSCodeLink>
					{showOpen && state === EndpointDeploymentStatus.Active && (
						<Button appearance="icon" title="Open URL" onClick={() => openExternal(url)} disabled={!url}>
							<Codicon name="link-external" />
						</Button>
					)}
				</div>
			) : (
				<>{state !== EndpointDeploymentStatus.Error && <SkeletonText className="w-24" />}</>
			)}
		</GridColumnItem>
	);
};

const DeployButton: FC<{
	componentType: string;
	component: ComponentKind;
	organization: Organization;
	env: Environment;
	project: Project;
	deploymentTrack: DeploymentTrack;
	builds?: BuildKind[];
	loadedDeploymentStatus: (deploying: boolean) => void;
	deploymentStatus?: ComponentDeployment;
	proxyDeploymentData?: ProxyDeploymentInfo;
	promotion?: {
		prevBuild?: BuildKind;
		prevProxyDeploymentData?: ProxyDeploymentInfo;
		prevDeploymentStatus?: ComponentDeployment;
		workflowStatus?: CheckWorkflowStatusResp;
		refetchWorkflowStatus?: () => void;
		isLoadingWorkflowStatus?: boolean;
		prevEnv?: Environment;
	};
}> = ({
	componentType,
	component,
	organization,
	env,
	project,
	deploymentTrack,
	builds = [],
	loadedDeploymentStatus,
	deploymentStatus,
	proxyDeploymentData,
	promotion,
}) => {
	const queryClient = useQueryClient();
	const [isDeployPanelOpen, setIsDeployPanelOpen] = useState(false);
	const [isDeployRequestPanelOpen, setIsDeployRequestPanelOpen] = useState(false);
	const [selectedBuild, setSelectedBuild] = useState<BuildKind>();
	const isDeployed = !!deploymentStatus || !!proxyDeploymentData;
	const buildId = promotion?.prevProxyDeploymentData?.build?.id || promotion?.prevDeploymentStatus?.build?.buildId;
	const webviewState = useExtWebviewContext();
	const extName = webviewState?.extensionName;

	// can deploy if type is truthy & (disabled or approved)
	const showRequestToPromote =
		env?.critical &&
		promotion?.workflowStatus &&
		![WorkflowInstanceStatus.DISABLED, WorkflowInstanceStatus.APPROVED].includes(promotion?.workflowStatus?.status as WorkflowInstanceStatus);

	const { mutate: triggerDeployment, isLoading: isDeploying } = useMutation({
		mutationFn: async (params: {
			build: BuildKind;
			args?: { cronExpression?: string; cronTimeZone?: string; proxyTargetUrl?: string; proxySandboxUrl?: string };
		}) => {
			if (promotion && componentType === ChoreoComponentType.ApiProxy) {
				// if promoting proxy, call call promoteProxyDeployment
				await ChoreoWebViewAPI.getInstance()
					.getChoreoRpcClient()
					.promoteProxyDeployment({
						componentId: component.metadata.id,
						buildId,
						envId: env?.id,
						promoteFromEnvId: promotion?.prevEnv?.id,
						orgId: organization?.id.toString(),
						apiId: component?.apiVersions?.find((item) => item.latest)?.id,
					});
			} else {
				const req: CreateDeploymentReq = {
					commitHash: params.build.spec.revision,
					buildRef: componentType === ChoreoComponentType.ApiProxy ? params.build.status?.runId?.toString() : params.build.status.images?.[0]?.id,
					componentName: component.metadata.name,
					componentId: component.metadata.id,
					componentHandle: component.metadata.handler,
					componentDisplayType: component.spec.type,
					envId: env.id,
					envName: env.name,
					versionId:
						componentType === ChoreoComponentType.ApiProxy ? component?.apiVersions?.find((item) => item.latest)?.versionId : deploymentTrack?.id,
					orgId: organization.id.toString(),
					orgHandler: organization.handle,
					projectId: project.id,
					projectHandle: project.handler,
				};
				if (componentType === ChoreoComponentType.ScheduledTask && params?.args?.cronExpression && params?.args?.cronTimeZone) {
					req.cronExpression = params?.args?.cronExpression;
					req.cronTimezone = params?.args?.cronTimeZone;
				}
				if (componentType === ChoreoComponentType.ApiProxy) {
					if (params?.args?.proxyTargetUrl) {
						req.proxyTargetUrl = params?.args?.proxyTargetUrl;
					}
					if (params?.args?.proxySandboxUrl) {
						req.proxySandboxUrl = params?.args?.proxySandboxUrl;
					}
				}
				await ChoreoWebViewAPI.getInstance().getChoreoRpcClient().createDeployment(req);
			}

			loadedDeploymentStatus(true);
		},
		onSuccess: () => {
			ChoreoWebViewAPI.getInstance().showInfoMsg(
				`Deployment of ${extName === "Devant" ? "integration" : "component"} ${component.metadata.displayName} for the ${env?.name} environment has been successfully triggered`,
			);
		},
		onSettled: () => {
			queryClient.refetchQueries({
				queryKey: queryKeys.getDeploymentStatus(deploymentTrack, component, organization, env),
			});
			queryClient.refetchQueries({
				queryKey: queryKeys.getDeployedEndpoints(deploymentTrack, component, organization),
			});

			setSelectedBuild(undefined);
			setIsDeployPanelOpen(false);
		},
	});

	const { mutate: selectBuildToDeploy } = useMutation({
		mutationFn: async (showConfigMenu?: boolean) => {
			if (promotion?.prevBuild) {
				if (showConfigMenu) {
					setSelectedBuild(promotion?.prevBuild);
					setIsDeployPanelOpen(true);
				} else {
					triggerDeployment({ build: promotion?.prevBuild });
				}
			} else if (builds.length > 1) {
				const latestItem = builds[0];
				const selected = await ChoreoWebViewAPI.getInstance().showQuickPicks({
					title: "Select Build to Deploy",
					items: [
						{ label: "Latest Build", kind: WebviewQuickPickItemKind.Separator },
						{
							label: `Build ID: ${latestItem?.status?.runId}`,
							detail: `Commit: ${getShortenedHash(latestItem.spec?.revision)} | ${latestItem.status?.gitCommit?.message || "-"}`,
							description: getTimeAgo(new Date(latestItem.status?.startedAt)),
							item: latestItem,
						},
						{ kind: WebviewQuickPickItemKind.Separator, label: "Previous Builds" },
						...builds.slice(1, builds.length).map((item) => ({
							label: `Build ID: ${item?.status?.runId}`,
							detail: `Commit: ${getShortenedHash(item.spec?.revision)} | ${item.status?.gitCommit?.message || "-"}`,
							description: getTimeAgo(new Date(item.status?.startedAt)),
							item,
						})),
					],
				});
				if (selected?.item) {
					if (showConfigMenu) {
						setSelectedBuild(selected?.item);
						setIsDeployPanelOpen(true);
					} else {
						triggerDeployment({ build: selected?.item });
					}
				}
			} else if (builds.length === 1) {
				if (showConfigMenu) {
					setSelectedBuild(builds[0]);
					setIsDeployPanelOpen(true);
				} else {
					triggerDeployment({ build: builds[0] });
				}
			}
		},
	});

	const { mutate: reqCancelApproval, isLoading: isLoadingCancelReq } = useMutation({
		mutationFn: (wkfInstanceId: string) =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().cancelApprovalRequest({
				orgId: organization?.id?.toString(),
				wkfInstanceId: wkfInstanceId,
			}),
		onSuccess: () => {
			queryClient.setQueryData(queryKeys.getWorkflowStatus(organization, env, buildId), {
				...promotion?.workflowStatus,
				status: WorkflowInstanceStatus?.CANCELLED,
			});
			if (promotion?.refetchWorkflowStatus) {
				promotion?.refetchWorkflowStatus();
			}
		},
	});

	const { mutate: reqPromoteApproval, isLoading: isLoadingPromoteApproval } = useMutation({
		mutationFn: (requestComment: string) =>
			ChoreoWebViewAPI.getInstance()
				.getChoreoRpcClient()
				.requestPromoteApproval({
					componentName: component?.metadata?.name,
					orgHandler: organization?.handle,
					orgId: organization?.id?.toString(),
					envFromId: promotion?.prevEnv?.id,
					envFromName: promotion?.prevEnv?.name,
					envId: env?.id,
					envName: env?.name,
					projectId: project?.id,
					projectName: project?.name,
					requestComment,
					buildId: promotion?.prevProxyDeploymentData?.build?.id || promotion?.prevDeploymentStatus?.build?.buildId,
				}),
		onSuccess: () => {
			setIsDeployRequestPanelOpen(false);
			queryClient.setQueryData(queryKeys.getWorkflowStatus(organization, env, buildId), {
				...promotion?.workflowStatus,
				status: WorkflowInstanceStatus?.PENDING,
			});
			if (promotion?.refetchWorkflowStatus) {
				promotion?.refetchWorkflowStatus();
			}
		},
	});

	return (
		<>
			<Drawer
				open={isDeployPanelOpen}
				onClose={() => setIsDeployPanelOpen(false)}
				maxWidthClassName="max-w-sm"
				title={`Configure Deployment - ${capitalizeFirstLetter(env.name)} Environment`}
			>
				<div className="flex h-[calc(100vh-96px)] flex-col gap-4 overflow-y-auto">
					<form className="relative flex flex-col gap-4 px-4 sm:px-6">
						{
							{
								[ChoreoComponentType.ScheduledTask]: (
									<CronDeployForm
										deploymentStatus={deploymentStatus}
										onSubmit={(args) => triggerDeployment({ build: selectedBuild, args })}
										isDeploying={isDeploying}
									/>
								),
								[ChoreoComponentType.ApiProxy]: (
									<GitProxyDeployForm
										proxyDeploymentData={proxyDeploymentData}
										onSubmit={(args) => triggerDeployment({ build: selectedBuild, args })}
										isDeploying={isDeploying}
									/>
								),
							}[componentType]
						}
					</form>
				</div>
			</Drawer>

			<Drawer
				open={isDeployRequestPanelOpen}
				onClose={() => setIsDeployRequestPanelOpen(false)}
				maxWidthClassName="max-w-sm"
				title={`Request to ${promotion ? "Promote" : "Deploy"} to ${capitalizeFirstLetter(env.name)} Environment`}
			>
				<div className="flex h-[calc(100vh-96px)] flex-col gap-4 overflow-y-auto">
					<form className="relative flex flex-col gap-4 px-4 sm:px-6">
						<RequestForDeploymentForm onSubmit={(requestMessage) => reqPromoteApproval(requestMessage)} isLoading={isLoadingPromoteApproval} />
					</form>
				</div>
			</Drawer>

			<div className="flex items-center gap-1">
				{/* {displayType === ComponentDisplayType.GitProxy && proxyDeploymentData && (
					<Button
						appearance="icon"
						title="Configure Proxy and deploy"
						onClick={() => selectBuildToDeploy(true)}
						className="opacity-60 duration-200 hover:opacity-100"
					>
						<Codicon name="settings-gear" />
					</Button>
				)} */}
				{showRequestToPromote ? (
					<>
						{promotion?.workflowStatus?.status === WorkflowInstanceStatus.PENDING ? (
							<Button
								appearance="icon"
								disabled={isLoadingCancelReq || promotion?.isLoadingWorkflowStatus}
								title={`Cancel request to promote to ${capitalizeFirstLetter(env.name)} environment`}
								onClick={() => {
									ChoreoWebViewAPI.getInstance()
										.showConfirmMessage({ buttonText: "Cancel Request", message: "Are you sure you want to cancel your request to promote?" })
										.then((res) => {
											if (res) {
												reqCancelApproval(promotion?.workflowStatus?.wkfInstanceId);
											}
										});
								}}
							>
								{isLoadingCancelReq ? "Cancelling" : "Cancel"} Request to {promotion ? "Promote" : "Deploy"}
							</Button>
						) : (
							<Button appearance="icon" disabled={promotion?.isLoadingWorkflowStatus} onClick={() => setIsDeployRequestPanelOpen(true)}>
								Request to {promotion ? "Promote" : "Deploy"}
							</Button>
						)}
					</>
				) : (
					<Button
						title={
							promotion ? `Promote to ${capitalizeFirstLetter(env.name)} environment` : `Deploy to ${capitalizeFirstLetter(env.name)} environment`
						}
						disabled={isDeploying || promotion?.isLoadingWorkflowStatus}
						onClick={() => selectBuildToDeploy(componentType === ChoreoComponentType.ScheduledTask)}
						appearance="secondary"
					>
						{promotion ? (
							<>{isDeploying ? `Promoting to ${capitalizeFirstLetter(env.name)}...` : `Promote to ${capitalizeFirstLetter(env.name)}`}</>
						) : (
							<>{isDeploying ? "Deploying..." : isDeployed ? "Redeploy" : "Deploy"}</>
						)}
					</Button>
				)}
			</div>
		</>
	);
};

const CronDeployForm: FC<{
	deploymentStatus: ComponentDeployment;
	onSubmit: (params: { cronExpression?: string; cronTimezone?: string }) => void;
	isDeploying: boolean;
}> = ({ deploymentStatus, onSubmit, isDeploying }) => {
	const deploySchema = z.object({
		cronTimeZone: z.string().min(1, "Required"),
		cronExpression: z
			.string()
			.min(1, "Required")
			.regex(/^((\*|\d+|\d+-\d+)(\/\d+)? ){4}(\*|\d+|\d+-\d+)(\/\d+)?$/, "Invalid Cron Expression"),
	});

	const form = useForm<z.infer<typeof deploySchema>>({
		resolver: zodResolver(deploySchema),
		mode: "all",
		defaultValues: {
			cronExpression: deploymentStatus?.cron || "",
			cronTimeZone: deploymentStatus?.cronTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone?.toString() || "UTC",
		},
	});

	const onSubmitForm: SubmitHandler<z.infer<typeof deploySchema>> = (data) => onSubmit(data);

	useEffect(() => {
		form.reset({
			cronExpression: deploymentStatus?.cron || "",
			cronTimeZone: deploymentStatus?.cronTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone?.toString() || "UTC",
		});
	}, [deploymentStatus]);

	return (
		<>
			<TextField label="Cron Expression" required name="cronExpression" placeholder="0 */1 * * *" control={form.control} />
			<Dropdown label="Time Zone" required name="cronTimeZone" items={listTimeZones().map((item) => ({ value: item }))} control={form.control} />
			<div className="flex justify-end gap-3 pt-6 pb-2">
				<Button onClick={form.handleSubmit(onSubmitForm)} disabled={isDeploying}>
					{isDeploying ? "Deploying..." : "Deploy"}
				</Button>
			</div>
		</>
	);
};

const RequestForDeploymentForm: FC<{
	onSubmit: (requestMessage: string) => void;
	isLoading?: boolean;
}> = ({ onSubmit, isLoading }) => {
	const deployRequestSchema = z.object({
		requestMessage: z.string().min(1, "Required"),
	});

	const form = useForm<z.infer<typeof deployRequestSchema>>({
		resolver: zodResolver(deployRequestSchema),
		mode: "all",
		defaultValues: { requestMessage: "" },
	});

	const onSubmitForm: SubmitHandler<z.infer<typeof deployRequestSchema>> = (data) => onSubmit(data.requestMessage);

	return (
		<>
			<TextArea
				label="Request Message"
				required
				name="requestMessage"
				placeholder="Enter a message for your request"
				control={form.control}
				rows={10}
			/>
			<div className="flex justify-end gap-3 pt-6 pb-2">
				<Button onClick={form.handleSubmit(onSubmitForm)} disabled={isLoading}>
					{isLoading ? "Requesting..." : "Request"}
				</Button>
			</div>
		</>
	);
};

const GitProxyDeployForm: FC<{
	proxyDeploymentData: ProxyDeploymentInfo;
	onSubmit: (params: { proxyTargetUrl?: string; proxySandboxUrl?: string }) => void;
	isDeploying: boolean;
}> = ({ proxyDeploymentData, onSubmit, isDeploying }) => {
	const deploySchema = z.object({ proxyTargetUrl: httpsUrlSchema, proxySandboxUrl: z.union([z.literal(""), httpsUrlSchema]) });

	const form = useForm<z.infer<typeof deploySchema>>({
		resolver: zodResolver(deploySchema),
		mode: "all",
		defaultValues: { proxyTargetUrl: proxyDeploymentData?.endpoint || "", proxySandboxUrl: proxyDeploymentData?.sandboxEndpoint || "" },
	});

	const onSubmitForm: SubmitHandler<z.infer<typeof deploySchema>> = (data) => onSubmit(data);

	useEffect(() => {
		form.reset({
			proxyTargetUrl: proxyDeploymentData?.endpoint || "",
			proxySandboxUrl: proxyDeploymentData?.sandboxEndpoint || "",
		});
	}, [proxyDeploymentData]);

	return (
		<>
			<TextField label="Endpoint" required name="proxyTargetUrl" placeholder="https://url.com/api/v1" control={form.control} />
			<TextField label="Sandbox Endpoint" name="proxySandboxUrl" placeholder="https://sandbox-url.com/api/v1" control={form.control} />
			<div className="flex justify-end gap-3 pt-6 pb-2">
				<Button onClick={form.handleSubmit(onSubmitForm)} disabled={isDeploying}>
					{isDeploying ? "Deploying..." : "Deploy"}
				</Button>
			</div>
		</>
	);
};

const useViewRunTimeLogs = (
	component: ComponentKind,
	organization: Organization,
	project: Project,
	env: Environment,
	deploymentTrack: DeploymentTrack,
) => {
	const { mutate: viewRuntimeLogs } = useMutation({
		mutationFn: (logType: "application" | "gateway") =>
			ChoreoWebViewAPI.getInstance().viewRuntimeLogs({
				componentName: component.metadata.name,
				projectName: project.name,
				orgName: organization.name,
				deploymentTrackName: deploymentTrack?.branch,
				envName: env.name,
				type: logType,
			}),
	});
	return { viewRuntimeLogs };
};

const useSelectLogType = (componentType: string, onSelectLogType: (logType: "gateway" | "application") => void) => {
	const { mutate: selectLogType } = useMutation({
		mutationFn: async () => {
			if ([ChoreoComponentType.Service, ChoreoComponentType.Webhook].includes(componentType as ChoreoComponentType)) {
				const pickedItem = await ChoreoWebViewAPI.getInstance().showQuickPicks({
					title: "Select Log Type",
					items: [
						{ label: "Application Logs", item: "application" },
						{ label: "Gateway Logs", item: "gateway" },
					],
				});

				if (pickedItem) {
					onSelectLogType(pickedItem.item);
				}
			} else if (componentType === ChoreoComponentType.ApiProxy) {
				onSelectLogType("gateway");
			} else {
				onSelectLogType("application");
			}
		},
	});
	return { selectLogType };
};

const EndpointDetailsSectionDetailItem: FC<{ label: string; value: ReactNode }> = ({ label, value }) => (
	<div className="flex items-center justify-between">
		<div className="font-extralight opacity-75">{label}</div>
		<div className="text-right">{value}</div>
	</div>
);

export const EndpointDetailsSection: FC<{ endpoints: ComponentEP[] }> = ({ endpoints = [] }) => {
	return (
		<div className="flex flex-col gap-4 overflow-y-auto">
			<div className="flex flex-col gap-4 px-4 sm:px-6">
				{endpoints.length === 0 ? (
					<Empty text="No Endpoints Found" />
				) : (
					<>
						{endpoints?.map((item, index) => (
							<React.Fragment key={item.id}>
								{index !== 0 && <Divider className="my-2" />}
								{item?.state === EndpointDeploymentStatus.Error && (
									<Banner type="error" title={item?.stateReason?.message ?? "Failed to load endpoint"} subTitle={item?.stateReason?.details} />
								)}
								<div className="mb-1 flex flex-col gap-2">
									<EndpointDetailsSectionDetailItem label="Name" value={item.displayName} />
									<EndpointDetailsSectionDetailItem
										label="Status"
										value={
											<span
												className={classNames({
													"text-vsc-errorForeground": item.state === EndpointDeploymentStatus.Error,
													"text-vsc-charts-green": item.state === EndpointDeploymentStatus.Active,
													"animate-pulse text-vsc-charts-orange": [EndpointDeploymentStatus.InProgress, EndpointDeploymentStatus.Pending].includes(
														item.state,
													),
												})}
											>
												{item.state}
											</span>
										}
									/>
									<EndpointDetailsSectionDetailItem label="Port" value={item.port} />
									<EndpointDetailsSectionDetailItem label="Type" value={item.type} />
									{item.networkVisibilities?.length > 0 && (
										<EndpointDetailsSectionDetailItem label="Network Visibilities" value={item.networkVisibilities.join(", ")} />
									)}
									{item.apiDefinitionPath && <EndpointDetailsSectionDetailItem label="Schema" value={item.apiDefinitionPath} />}
									{item.apiContext && <EndpointDetailsSectionDetailItem label="API Context" value={item.apiContext} />}
								</div>
								{item.projectUrl && <EndpointItem type="Project" name={item.displayName} url={item.projectUrl} state={item.state} />}
								{item.visibility === "Organization" && item.organizationUrl && (
									<EndpointItem type="Organization" name={item.displayName} url={item.organizationUrl} state={item.state} />
								)}
								{item.visibility === "Public" && item.publicUrl && (
									<EndpointItem type="Public" name={item.displayName} url={item.publicUrl} showOpen={true} state={item.state} />
								)}
							</React.Fragment>
						))}
					</>
				)}
			</div>
		</div>
	);
};
