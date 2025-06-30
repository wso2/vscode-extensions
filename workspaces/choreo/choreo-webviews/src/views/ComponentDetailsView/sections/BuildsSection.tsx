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
import { type UseQueryResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react";
import {
	type BuildKind,
	ChoreoComponentType,
	type ComponentKind,
	type CreateBuildReq,
	type DeploymentLogsData,
	type DeploymentTrack,
	type Environment,
	type GetAutoBuildStatusResp,
	type Organization,
	type Project,
	type ToggleAutoBuildReq,
	getComponentKindRepoSource,
	getTimeAgo,
	getTypeForDisplayType,
} from "@wso2/choreo-core";
import classNames from "classnames";
import React, { type FC, type ReactNode, useState } from "react";
import { Button } from "../../../components/Button";
import { Codicon } from "../../../components/Codicon";
import { CommitLink } from "../../../components/CommitLink";
import { Drawer } from "../../../components/Drawer";
import { Empty } from "../../../components/Empty";
import { SkeletonText } from "../../../components/SkeletonText";
import { queryKeys, useGetAutoBuildStatus } from "../../../hooks/use-queries";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";
import { BuildDetailsSection } from "./BuildDetailsSection";

interface Props {
	component: ComponentKind;
	project: Project;
	organization: Organization;
	deploymentTrack?: DeploymentTrack;
	buildListQueryData: UseQueryResult<BuildKind[], unknown>;
	openBuildDetailsPanel: (item: BuildKind) => void;
}

export const BuildsSection: FC<Props> = (props) => {
	const { component, organization, project, deploymentTrack, openBuildDetailsPanel, buildListQueryData } = props;
	const { isLoading: isLoadingBuilds, isRefetching: isRefetchingBuilds, data: builds = [], refetch: refetchBuilds } = buildListQueryData;
	const [visibleBuildCount, setVisibleBuildCount] = useState(5);
	const [buildListRef] = useAutoAnimate();
	const queryClient = useQueryClient();
	const type = getTypeForDisplayType(component.spec.type);

	const { mutate: triggerBuild, isLoading: isTriggeringBuild } = useMutation({
		mutationFn: async (params: CreateBuildReq) => {
			await ChoreoWebViewAPI.getInstance().getChoreoRpcClient().createBuild(params);
		},
		onSuccess: () => {
			const buildQueryKey = queryKeys.getBuilds(deploymentTrack, component, project, organization);
			const currentBuilds: BuildKind[] = queryClient.getQueryData(buildQueryKey) ?? [];
			queryClient.setQueryData(buildQueryKey, [{ status: { status: "Triggered" } } as BuildKind, ...currentBuilds]);
			ChoreoWebViewAPI.getInstance().showInfoMsg("Build for selected commit has been successfully triggered");
		},
		onSettled:()=> {
			refetchBuilds();
		}
	});

	const { mutate: selectCommitForBuild } = useMutation({
		mutationFn: async () => {
			const pickedItem = await ChoreoWebViewAPI.getInstance().selectCommitToBuild({
				component,
				deploymentTrack,
				org: organization,
				project,
			});

			if (pickedItem) {
				triggerBuild({
					commitHash: pickedItem.sha,
					componentName: component.metadata.name,
					deploymentTrackId:
						type === ChoreoComponentType.ApiProxy ? component?.apiVersions?.find((item) => item.latest)?.versionId : deploymentTrack?.id,
					projectHandle: project.handler,
					orgId: organization.id?.toString(),
					displayType: component.spec.type,
					gitRepoUrl: getComponentKindRepoSource(component.spec.source).repo,
					gitBranch: deploymentTrack?.branch,
					subPath: getComponentKindRepoSource(component.spec.source).path,
				});
			}
		},
	});

	const buildInProgress = builds[0] && !builds[0].status?.conclusion;

	return (
		<div>
			<div className="mb-3 flex flex-wrap items-center justify-end gap-2">
				<h3 className="text-base lg:text-lg">Builds</h3>
				{!isLoadingBuilds && (
					<Button
						onClick={() => refetchBuilds()}
						appearance="icon"
						title={`${isRefetchingBuilds ? "Refreshing" : "Refresh"} Build List`}
						className="opacity-50"
						disabled={isRefetchingBuilds}
					>
						<Codicon name="refresh" className={classNames(isRefetchingBuilds && "animate-spin")} />
					</Button>
				)}
				<div className="flex-1" />
				{/** TODO: enable autoBuildOnCommit once its stable */}
				{/* {type !== ChoreoComponentType.ApiProxy && (
					<AutoBuildSwitch component={component} envs={envs} organization={organization} deploymentTrack={deploymentTrack} />
				)} */}
				{!isLoadingBuilds && (
					<Button disabled={isTriggeringBuild || buildInProgress} onClick={() => selectCommitForBuild()} appearance="secondary">
						{isTriggeringBuild || buildInProgress ? "Building..." : "Build"}
					</Button>
				)}
			</div>

			<div className="hidden grid-cols-2 gap-x-5 py-2 font-light text-xs md:grid md:grid-cols-3 ">
				<div>Build ID</div>
				<div>Commit</div>
				<div>Status</div>
			</div>
			<div className="lg:min-h-44" ref={buildListRef}>
				{isLoadingBuilds ? (
					<>
						{Array.from(new Array(5)).map((_, index) => (
							<LoadingBuildRow key={index} />
						))}
						<div className="hidden h-10 lg:block" />
					</>
				) : (
					<>
						{builds.length === 0 ? (
							<Empty text="There aren't any builds available" />
						) : (
							<>
								{builds?.slice(0, visibleBuildCount)?.map((item, index) => (
									<React.Fragment key={index}>
										{item.status.status === "Triggered" ? (
											<LoadingBuildRow key={index} />
										) : (
											<BuiltItemRow key={item.status?.runId} item={item} onViewBuildDetails={() => openBuildDetailsPanel(item)} {...props} />
										)}
									</React.Fragment>
								))}
								{builds.length > visibleBuildCount && (
									<div className="mt-2 flex flex-row justify-end">
										<Button appearance="icon" onClick={() => setVisibleBuildCount((v) => v + 5)}>
											View More
										</Button>
									</div>
								)}
							</>
						)}
					</>
				)}
			</div>
		</div>
	);
};

const LoadingBuildRow = () => {
	return (
		<div className="grid grid-cols-2 gap-x-5 py-1 md:grid-cols-3">
			<GridColumnItem label="Build ID" index={0}>
				<SkeletonText className="w-20" />
			</GridColumnItem>
			<GridColumnItem label="Commit" index={1}>
				<div className="flex w-full justify-end md:justify-start">
					<SkeletonText className="w-14" />
				</div>
			</GridColumnItem>
			<GridColumnItem label="Status" index={2} lastItem>
				<div className="flex items-center justify-start gap-2 md:justify-between">
					<SkeletonText className="w-12" />
					<SkeletonText className="w-10" />
				</div>
			</GridColumnItem>
		</div>
	);
};

const BuiltItemRow: FC<Props & { item: BuildKind; onViewBuildDetails: () => void }> = ({ item, component, onViewBuildDetails }) => {
	let status: ReactNode = item.status?.conclusion;
	if (item.status?.conclusion === "") {
		status = <span className="animate-pulse text-vsc-charts-orange capitalize">{item.status?.status?.replaceAll("_", " ")}</span>;
	} else {
		if (item.status?.conclusion === "success") {
			status = <span className="text-vsc-charts-green capitalize">{status}</span>;
		} else if (item.status?.conclusion === "failure") {
			status = <span className="text-vsc-errorForeground capitalize">{status}</span>;
		}
	}

	return (
		<div
			className="grid cursor-pointer grid-cols-2 gap-x-5 py-1 duration-200 hover:bg-vsc-editorHoverWidget-background md:grid-cols-3"
			onClick={() => onViewBuildDetails()}
			title={`View Build Details: Build Id:${item.status?.runId || "-"}`}
		>
			<GridColumnItem label="Build ID" index={0}>
				{item.status?.runId || "-"}
			</GridColumnItem>
			<GridColumnItem label="Commit ID" index={1}>
				<CommitLink
					commitHash={item.spec?.revision}
					commitMessage={item.status?.gitCommit?.message}
					repoPath={getComponentKindRepoSource(component?.spec?.source).repo}
				/>
			</GridColumnItem>
			<GridColumnItem label="Status" index={2} lastItem>
				<div className="flex items-center justify-start gap-2 md:justify-between">
					<div>{status}</div>
					<div className="font-thin text-[11px] opacity-70">{getTimeAgo(new Date(item.status?.startedAt))}</div>
				</div>
			</GridColumnItem>
		</div>
	);
};

const GridColumnItem: FC<{ label: string; index?: number; children?: ReactNode; lastItem?: boolean }> = ({ label, index, children, lastItem }) => (
	<div className={classNames("flex flex-col", lastItem ? "col-span-full md:col-span-1" : index % 2 === 1 && "items-end md:items-start")}>
		<div className="block font-light text-[9px] md:hidden">{label}</div>
		<div className={classNames("w-full", index % 2 === 1 && "text-right md:text-left")}>{children}</div>
	</div>
);

const AutoBuildSwitch: FC<{
	component: ComponentKind;
	organization: Organization;
	deploymentTrack?: DeploymentTrack;
	envs: Environment[];
}> = ({ component, envs = [], organization, deploymentTrack }) => {
	const queryClient = useQueryClient();

	const { data: autoBuildStatus, isLoading: isLoadingAutoBuildStatus } = useGetAutoBuildStatus(component, deploymentTrack, organization, {
		enabled: envs?.length > 0 && !!deploymentTrack,
	});

	const { mutate: toggleAutoBuild } = useMutation({
		mutationFn: (autoBuildEnabled: boolean) => {
			const rpcClient = ChoreoWebViewAPI.getInstance().getChoreoRpcClient();
			const req: ToggleAutoBuildReq = {
				componentId: component.metadata?.id,
				orgId: organization.id.toString(),
				versionId: deploymentTrack.id,
				// will always be dev env
				envId: envs[0]?.id ?? "",
			};
			return autoBuildEnabled ? rpcClient.enableAutoBuildOnCommit(req) : rpcClient.disableAutoBuildOnCommit(req);
		},
		onMutate: async (autoBuildEnabled) => {
			const queryKey = queryKeys.getAutoBuildStatus(component, deploymentTrack, organization);
			await queryClient.cancelQueries({ queryKey });
			const previous: GetAutoBuildStatusResp | undefined = queryClient.getQueryData(queryKey);
			if (previous) {
				queryClient.setQueryData(queryKey, { ...previous, autoBuildEnabled });
			}
			return { previous };
		},
		onError: (_err, _resp, context) => {
			ChoreoWebViewAPI.getInstance().showErrorMsg("Failed to toggle auto build on commit");
			const queryKey = queryKeys.getAutoBuildStatus(component, deploymentTrack, organization);
			queryClient.setQueryData(queryKey, context.previous);
		},
		onSettled: () => {
			const queryKey = queryKeys.getAutoBuildStatus(component, deploymentTrack, organization);
			queryClient.invalidateQueries({ queryKey });
		},
	});

	if (envs.length === 0) {
		return null;
	}

	return (
		<VSCodeCheckbox
			className={classNames("flex-row-reverse text-[11px]", isLoadingAutoBuildStatus && "animate-pulse")}
			disabled={isLoadingAutoBuildStatus}
			checked={autoBuildStatus?.autoBuildEnabled}
			onChange={isLoadingAutoBuildStatus ? undefined : (event: any) => toggleAutoBuild(event.target.checked)}
		>
			Auto Build on Commit
		</VSCodeCheckbox>
	);
};
