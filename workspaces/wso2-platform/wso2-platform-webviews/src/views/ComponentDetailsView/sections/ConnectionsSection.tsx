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

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import {
	type ComponentKind,
	ComponentViewDrawers,
	type ConnectionDetailed,
	type ConnectionListItem,
	type DeploymentTrack,
	type MarketplaceItem,
	type Organization,
	type Project,
	getComponentKey,
} from "@wso2/wso2-platform-core";
import classNames from "classnames";
import React, { useState, type FC } from "react";
import { BreadCrumb, type BreadCrumbItem } from "../../../components/BreadCrumb";
import { Button } from "../../../components/Button";
import { Codicon } from "../../../components/Codicon";
import { ConnectionGuide } from "../../../components/Connections/ConnectionGuide";
import { CreateConnection } from "../../../components/Connections/CreateConnection";
import { MarketplaceItemDetails } from "../../../components/Connections/MarketplaceItemDetails";
import { MarketplaceGrid } from "../../../components/Connections/MarketplaceList";
import { Drawer } from "../../../components/Drawer";
import { Empty } from "../../../components/Empty";
import { SkeletonText } from "../../../components/SkeletonText";
import { queryKeys, useComponentConnectionList, useProjectConnectionList } from "../../../hooks/use-queries";
import { useExtWebviewContext } from "../../../providers/ext-vewview-ctx-provider";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";
import { RightPanelSection } from "./RightPanelSection";

type Props = {
	org: Organization;
	project: Project;
	component: ComponentKind;
	directoryFsPath: string;
	deploymentTrack: DeploymentTrack;
};

export const ConnectionsSection: FC<Props> = ({ org, project, component, directoryFsPath, deploymentTrack }) => {
	const webviewState = useExtWebviewContext();
	const [selectedItem, setSelectedItem] = useState<MarketplaceItem>();

	const [step, setStep] = useState<"list" | "details" | "create">("list");
	const queryClient = useQueryClient();

	const {
		data: componentConnections = [],
		isLoading: isLoadingComponentConnections,
		refetch: refetchComponentConnectionList,
		isRefetching: isRefetchingComponentConnectionList,
	} = useComponentConnectionList(component, project, org);

	const {
		data: projectConnections = [],
		isLoading: isLoadingProjectConnections,
		refetch: refetchProjectConnectionList,
		isRefetching: isRefetchingProjectConnectionList,
	} = useProjectConnectionList(project, org);

	const {
		mutate: deleteConnection,
		isLoading: isDeletingConnection,
		variables: deletingVars,
	} = useMutation({
		mutationFn: async (connectionItem: ConnectionListItem) =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().deleteConnection({
				connectionId: connectionItem.groupUuid,
				connectionName: connectionItem.name,
				orgId: org.id.toString(),
				componentPath: directoryFsPath,
			}),
		onError: (_, params) => ChoreoWebViewAPI.getInstance().showErrorMsg(`Failed to delete connection ${params.name}`),
		onSuccess: (_, params) => {
			const connectionQueryKey = queryKeys.getComponentConnections(component, project, org);
			const connectionItems: ConnectionListItem[] = queryClient.getQueryData(connectionQueryKey) ?? [];
			queryClient.setQueryData(
				connectionQueryKey,
				connectionItems.filter((item) => item.groupUuid !== params.groupUuid),
			);
			ChoreoWebViewAPI.getInstance().deleteLocalConnectionsConfig({ connectionName: params.name, componentDir: directoryFsPath });
			ChoreoWebViewAPI.getInstance().showInfoMsg(`Successfully deleted connection ${params.name}`);
		},
		onSettled: () => {
			refetchComponentConnectionList();
			refetchProjectConnectionList();
		},
	});

	const { mutate: confirmDelete } = useMutation({
		mutationFn: async (connectionItem: ConnectionListItem) => {
			const resp = await ChoreoWebViewAPI.getInstance().showConfirmMessage({
				buttonText: "Delete Dependency",
				message: `Are you sure you want to delete this dependency '${connectionItem.name}'. This action is not reversible.`,
			});
			if (resp) {
				deleteConnection(connectionItem);
			}
		},
	});

	let breadCrumbs: BreadCrumbItem[] = [];
	if (step === "create") {
		breadCrumbs = [
			{
				label: "Marketplace",
				onClick: () => {
					setStep("list");
					setSelectedItem(undefined);
				},
			},
			{ label: selectedItem.name, onClick: () => setStep("details") },
			{ label: "Create Dependency" },
		];
	} else if (step === "details" && selectedItem) {
		breadCrumbs = [
			{
				label: "Marketplace",
				onClick: () => {
					setStep("list");
					setSelectedItem(undefined);
				},
			},
			{ label: selectedItem.name },
		];
	} else if (step === "list") {
		breadCrumbs = [{ label: "Marketplace" }];
	}

	const componentKey = getComponentKey(org, project, component);

	const openCreatePanel = () =>
		ChoreoWebViewAPI.getInstance().openComponentViewDrawer({ componentKey, drawer: ComponentViewDrawers.CreateConnection });
	const openGuidePanel = (connection: ConnectionListItem | ConnectionDetailed) =>
		ChoreoWebViewAPI.getInstance().openComponentViewDrawer({ componentKey, drawer: ComponentViewDrawers.ConnectionGuide, params: { connection } });
	const closePanel = () => ChoreoWebViewAPI.getInstance().closeComponentViewDrawer(componentKey);
	const isCreatePanelOpen = webviewState?.componentViews?.[componentKey]?.openedDrawer === ComponentViewDrawers.CreateConnection;
	const isGuidePanelOpen = webviewState?.componentViews?.[componentKey]?.openedDrawer === ComponentViewDrawers.ConnectionGuide;
	const selectedConnItem = webviewState?.componentViews?.[componentKey]?.drawerParams?.connection;

	return (
		<RightPanelSection
			key="Dependencies"
			title={
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<span className="line-clamp-1 break-all">API Dependencies</span>
						{!isLoadingComponentConnections && !isLoadingProjectConnections && (
							<Button
								onClick={() => {
									refetchComponentConnectionList();
									refetchProjectConnectionList();
								}}
								appearance="icon"
								title={`${isRefetchingComponentConnectionList || isRefetchingProjectConnectionList ? "Refreshing" : "Refresh"} Dependency List`}
								className="opacity-50"
								disabled={isRefetchingComponentConnectionList || isRefetchingProjectConnectionList}
							>
								<Codicon
									name="refresh"
									className={classNames((isRefetchingComponentConnectionList || isRefetchingProjectConnectionList) && "animate-spin")}
								/>
							</Button>
						)}
					</div>
					<Button
						appearance="icon"
						title={directoryFsPath ? "Add API Dependency" : "Only allowed if you are within the Git repo directory"}
						onClick={() => {
							openCreatePanel();
							setStep("list");
						}}
						disabled={!directoryFsPath}
					>
						<Codicon name="plus" />
					</Button>
				</div>
			}
		>
			{componentConnections?.map((item) => (
				<ConnectionItem
					item={item}
					key={item.name}
					onDelete={() => confirmDelete(item)}
					deletingItem={item.groupUuid === deletingVars?.groupUuid}
					isDeleting={isDeletingConnection}
					onGuideClick={() => openGuidePanel(item)}
				/>
			))}

			{projectConnections?.map((item) => (
				<ConnectionItem
					item={item}
					key={item.name}
					onDelete={() => confirmDelete(item)}
					deletingItem={item.groupUuid === deletingVars?.groupUuid}
					isDeleting={isDeletingConnection}
					onGuideClick={() => openGuidePanel(item)}
				/>
			))}

			{(isLoadingComponentConnections || isLoadingProjectConnections) &&
				componentConnections.length === 0 &&
				projectConnections.length === 0 &&
				Array.from(new Array(3)).map((_, index) => (
					<SkeletonText key={`connection-skeleton-${index}`} className={classNames(index % 2 === 1 ? "w-1/2" : "w-1/3")} />
				))}

			{!isLoadingComponentConnections && componentConnections?.length === 0 && !isLoadingProjectConnections && projectConnections?.length === 0 && (
				<Empty
					text="No dependencies available"
					className="!p-2 !min-h-0 !gap-1 !md:p-4"
					subText="Connect with another service API by adding it as a dependency."
					showIcon={false}
				/>
			)}

			<Drawer open={isCreatePanelOpen} onClose={closePanel} title={<BreadCrumb items={breadCrumbs} />}>
				{
					{
						list: (
							<MarketplaceGrid
								enabled={isCreatePanelOpen}
								org={org}
								project={project}
								component={component}
								onSelectItem={(item) => {
									setSelectedItem(item);
									setStep("details");
								}}
							/>
						),
						details: (
							<MarketplaceItemDetails directoryFsPath={directoryFsPath} onCreateClick={() => setStep("create")} item={selectedItem} org={org} />
						),
						create: (
							<CreateConnection
								item={selectedItem}
								org={org}
								project={project}
								component={component}
								directoryFsPath={directoryFsPath}
								deploymentTrack={deploymentTrack}
								allItems={[...componentConnections, ...projectConnections]}
								onCreate={(item) => {
									refetchComponentConnectionList();
									openGuidePanel(item);
								}}
							/>
						),
					}[step]
				}
			</Drawer>
			<Drawer open={isGuidePanelOpen} onClose={closePanel} title={"Connection Guide"}>
				<ConnectionGuide component={component} item={selectedConnItem as ConnectionListItem} org={org} isVisible={isGuidePanelOpen} />
			</Drawer>
		</RightPanelSection>
	);
};

const ConnectionItem: FC<{
	item: ConnectionListItem;
	onDelete: () => void;
	deletingItem: boolean;
	isDeleting: boolean;
	onGuideClick: () => void;
}> = ({ item, onDelete, onGuideClick, deletingItem, isDeleting }) => {
	return (
		<div className={classNames("group flex flex-wrap items-center gap-0.5", isDeleting && deletingItem && "animate-pulse")}>
			{item.groupUuid ? (
				<VSCodeLink onClick={onGuideClick} className="line-clamp-1 flex-1 font-light text-vsc-foreground" title="View connection guide">
					{item.name}
				</VSCodeLink>
			) : (
				<div className="line-clamp-1 flex-1 animate-pulse font-light">{item.name}</div>
			)}
			{item.groupUuid && (
				<Button
					appearance="icon"
					className="text-vsc-descriptionForeground opacity-0 duration-200 hover:text-vsc-errorForeground group-hover:opacity-100"
					onClick={onDelete}
					disabled={isDeleting}
				>
					<Codicon name="trash" title="Delete connection" />
				</Button>
			)}
		</div>
	);
};
