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

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	type BuildKind,
	ChoreoComponentType,
	ComponentDisplayType,
	type ComponentsDetailsWebviewProps,
	type DeploymentTrack,
	type Environment,
	WebviewQuickPickItemKind,
	getComponentKindRepoSource,
	getTypeForDisplayType,
} from "@wso2/choreo-core";
import classNames from "classnames";
import React, { type FC, useEffect, useState, type ReactNode, useMemo } from "react";
import { Banner } from "../../components/Banner";
import { Divider } from "../../components/Divider";
import { Drawer } from "../../components/Drawer";
import { queryKeys, useGetBuildList, useGetBuildLogs, useGetProjectEnvs } from "../../hooks/use-queries";
import { ChoreoWebViewAPI } from "../../utilities/vscode-webview-rpc";
import { BuildConfigsSection } from "./sections/BuildConfigsSection";
import { BuildDetailsSection } from "./sections/BuildDetailsSection";
import { BuildsSection } from "./sections/BuildsSection";
import { ConnectionsSection } from "./sections/ConnectionsSection";
import { DeploymentsSection } from "./sections/DeploymentsSection";
import { EndpointsSection } from "./sections/EndpointsSection";
import { HeaderSection } from "./sections/HeaderSection";
import { ProxyConfigSection } from "./sections/ProxyConfigSection";
import { RightPanelSection } from "./sections/RightPanelSection";

export const ComponentDetailsView: FC<ComponentsDetailsWebviewProps> = (props) => {
	const { component, project, organization, directoryFsPath, initialEnvs = [] } = props;
	const deploymentTracks = component?.deploymentTracks ?? [];
	const [rightPanelRef] = useAutoAnimate();
	const type = getTypeForDisplayType(props.component.spec?.type);

	const [deploymentTrack, setDeploymentTrack] = useState<DeploymentTrack | undefined>(deploymentTracks?.find((item) => item.latest));
	const [hasOngoingBuilds, setHasOngoingBuilds] = useState(false);
	const [buildDetailsPanel, setBuildDetailsPanel] = useState<{ open: boolean; build?: BuildKind }>({ open: false, build: null });

	useEffect(() => {
		if (!deploymentTrack || !deploymentTracks?.find((item) => item.id === deploymentTrack.id)) {
			setDeploymentTrack(deploymentTracks?.find((item) => item.latest));
		}
	}, [deploymentTrack, deploymentTracks]);

	// todo: need to add and delete deployment tracks too
	const { mutate: switchDeploymentTrack } = useMutation({
		mutationFn: async () => {
			const pickedItem = await ChoreoWebViewAPI.getInstance().showQuickPicks({
				title: "Select Deployment Track",
				items: [
					{ kind: WebviewQuickPickItemKind.Separator, label: "Selected" },
					{ label: deploymentTrack.branch, picked: true, detail: deploymentTrack.description, description: `API ${deploymentTrack.apiVersion}` },
					{ kind: WebviewQuickPickItemKind.Separator, label: "Available Tracks" },
					...deploymentTracks
						.filter((item) => item.branch !== deploymentTrack.branch)
						.map((item) => ({ label: item.branch, detail: item.description, description: `API ${item.apiVersion}`, item })),
				],
			});
			if (pickedItem?.item) {
				setDeploymentTrack(pickedItem.item);
			}
		},
	});

	const {
		data: envs = [],
		isLoading: loadingEnvs,
		isFetching: isFetchingEnvs,
	} = useGetProjectEnvs(project, organization, {
		initialData: initialEnvs,
		enabled: initialEnvs.length === 0,
	});

	const { data: hasLocalChanges } = useQuery({
		queryKey: queryKeys.getHasLocalChanges(directoryFsPath),
		queryFn: () => ChoreoWebViewAPI.getInstance().hasDirtyLocalGitRepo(directoryFsPath),
		enabled: !!directoryFsPath,
		refetchOnWindowFocus: true,
	});

	const { data: configDriftFiles = [] } = useQuery({
		queryKey: queryKeys.getComponentConfigDraft(directoryFsPath, component, deploymentTrack?.branch),
		queryFn: () =>
			ChoreoWebViewAPI.getInstance().getConfigFileDrifts({
				type: getTypeForDisplayType(component?.spec?.type),
				repoDir: directoryFsPath,
				branch: deploymentTrack?.branch,
				repoUrl: getComponentKindRepoSource(component?.spec?.source).repo,
			}),
		enabled: !!directoryFsPath,
		refetchOnWindowFocus: true,
	});

	const { data: endpointsResp } = useQuery({
		queryKey: ["get-service-endpoints", { directoryFsPath }],
		queryFn: () => ChoreoWebViewAPI.getInstance().readLocalEndpointsConfig(directoryFsPath),
		enabled: !!directoryFsPath && type === ChoreoComponentType.Service,
		refetchOnWindowFocus: true,
	});

	const { data: localProxyConfig } = useQuery({
		queryKey: ["get-local-proxy-config", { directoryFsPath }],
		queryFn: () => ChoreoWebViewAPI.getInstance().readLocalProxyConfig(directoryFsPath),
		enabled: !!directoryFsPath && type === ChoreoComponentType.ApiProxy,
		refetchOnWindowFocus: true,
	});

	const buildLogsQueryData = useGetBuildLogs(component, organization, project, buildDetailsPanel?.build, {
		enabled: !!buildDetailsPanel?.build,
	});

	const buildListQueryData = useGetBuildList(deploymentTrack, component, project, organization, {
		onSuccess: (builds) => {
			setHasOngoingBuilds(builds.some((item) => item.status?.conclusion === ""));
			if (buildDetailsPanel?.open && buildDetailsPanel?.build) {
				const matchingItem = builds.find((item) => item.status?.runId === buildDetailsPanel?.build?.status?.runId);
				if (matchingItem) {
					setBuildDetailsPanel((state) => ({ ...state, build: matchingItem }));
				}
				buildLogsQueryData.refetch();
			}
		},
		enabled: !!deploymentTrack,
		refetchInterval: hasOngoingBuilds ? 5000 : false,
	});

	const succeededBuilds = useMemo(
		() => buildListQueryData?.data?.filter((item) => item.status?.conclusion === "success"),
		[buildListQueryData?.data],
	);

	const rightPanel: { node: ReactNode; key: string }[] = [];
	if (configDriftFiles?.length > 0) {
		rightPanel.push({
			key: "config-drift",
			node: (
				<RightPanelSection>
					<Banner
						type="warning"
						className="my-1"
						title="Configuration Drift Detected"
						subTitle={`Please commit and push the changes in the ${configDriftFiles.join(",")} ${configDriftFiles?.length > 1 ? "files" : "file"} to your remote Git repo.`}
					/>
				</RightPanelSection>
			),
		});
	} else if (hasLocalChanges) {
		rightPanel.push({
			key: "local-changes",
			node: (
				<RightPanelSection>
					<Banner className="my-1" title="Local Changes Detected" subTitle="Please commit and push your local changes to the remote repository." />
				</RightPanelSection>
			),
		});
	}
	if (type !== ChoreoComponentType.ApiProxy) {
		rightPanel.push({ key: "build-config", node: <BuildConfigsSection component={component} /> });
	}
	if (type === ChoreoComponentType.Service && endpointsResp?.endpoints?.length > 0) {
		rightPanel.push({
			key: "endpoints",
			node: <EndpointsSection endpointFilePath={endpointsResp?.filePath} endpoints={endpointsResp?.endpoints} directoryFsPath={directoryFsPath} />,
		});
	}
	if (type === ChoreoComponentType.ApiProxy && localProxyConfig?.proxy) {
		rightPanel.push({
			key: "git-proxy-config",
			node: (
				<ProxyConfigSection proxyConfig={localProxyConfig?.proxy} configFilePath={localProxyConfig?.filePath} directoryFsPath={directoryFsPath} />
			),
		});
	}
	if (type !== ChoreoComponentType.ApiProxy && component?.spec?.type !== ComponentDisplayType.PrismMockService) {
		rightPanel.push({
			key: "connections",
			node: (
				<ConnectionsSection
					org={organization}
					project={project}
					component={component}
					directoryFsPath={directoryFsPath}
					deploymentTrack={deploymentTrack}
				/>
			),
		});
	}

	return (
		<div className="flex flex-row justify-center p-1 md:p-3 lg:p-4 xl:p-6">
			<Drawer
				open={buildDetailsPanel?.open}
				onClose={() => setBuildDetailsPanel((state) => ({ ...state, open: false }))}
				maxWidthClassName="max-w-sm"
				title={`Build Details ${buildDetailsPanel?.build?.status?.runId ? `- ${buildDetailsPanel?.build?.status?.runId}` : ""}`}
			>
				<BuildDetailsSection
					component={component}
					data={buildLogsQueryData?.data}
					loadingData={buildLogsQueryData?.isLoading}
					org={organization}
					isVisible={buildDetailsPanel?.open}
					buildItem={buildDetailsPanel?.build}
				/>
			</Drawer>
			<div className="container">
				<div className="mx-auto flex max-w-6xl flex-col p-4">
					<HeaderSection
						{...props}
						deploymentTrack={deploymentTrack}
						allDeploymentTracks={deploymentTracks}
						onChangeDeploymentTrack={switchDeploymentTrack}
					/>
					<div className="grid grid-cols-1 gap-3 lg:grid-cols-4 lg:gap-0">
						<Divider className="mt-4 block lg:hidden" />
						<div
							className={classNames(
								"relative col-span-1 flex flex-col gap-6 pt-6 lg:p-4",
								rightPanel.length === 0 ? "lg:col-span-full" : "border-vsc-editorIndentGuide-background lg:col-span-3 lg:border-r-1",
							)}
						>
							<BuildsSection
								{...props}
								deploymentTrack={deploymentTrack}
								buildListQueryData={buildListQueryData}
								openBuildDetailsPanel={(build) => setBuildDetailsPanel({ open: true, build })}
							/>
							<DeploymentsSection
								{...props}
								deploymentTrack={deploymentTrack}
								envs={envs}
								loadingEnvs={loadingEnvs || (initialEnvs.length === 0 && isFetchingEnvs)}
								builds={succeededBuilds}
								openBuildDetailsPanel={(build) => setBuildDetailsPanel({ open: true, build })}
							/>
						</div>
						{rightPanel.length > 0 && (
							<div className="order-first flex flex-col gap-6 pt-6 lg:order-last lg:p-4" ref={rightPanelRef}>
								{rightPanel.map((item, index) => (
									<React.Fragment key={item.key}>
										{index !== 0 && <Divider key={`right-panel-divider-${item.key}`} />}
										{item.node}
									</React.Fragment>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
