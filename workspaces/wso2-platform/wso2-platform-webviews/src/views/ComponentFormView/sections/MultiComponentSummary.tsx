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

import { useQueryClient } from "@tanstack/react-query";
import {
	type Buildpack,
	ChoreoBuildPackNames,
	ChoreoComponentType,
	type ComponentConfig,
	type ComponentSelectionItem,
	type Organization,
	WebAppSPATypes,
	getComponentTypeText,
	getIntegrationComponentTypeText,
    getTypeOfIntegrationType,
} from "@wso2/wso2-platform-core";
import classNames from "classnames";
import React, { type HTMLProps, type FC, type ReactNode } from "react";
import { queryKeys } from "../../../hooks/use-queries";
import type { PerComponentFormData } from "../hooks";

export interface MultiComponentSummaryProps {
	selectedComponents: ComponentSelectionItem[];
	allComponents?: ComponentConfig[];
	genDetails: { repoUrl?: string; branch?: string; subPath?: string };
	extensionName: string;
	isLoading: boolean;
	componentDataMap?: Map<number, PerComponentFormData>;
	organization: Organization;
}

const ComponentSummaryItem: FC<{ title: string; text: string | number; className?: HTMLProps<HTMLElement>["className"] }> = ({
	text,
	title,
	className,
}) => {
	return (
		<div key={title} title={`${title}: ${text}`} className={className}>
			<div className="line-clamp-1 text-sm">{title}</div>
			<div className="line-clamp-1 break-all font-light opacity-80">{text}</div>
		</div>
	);
};

export const MultiComponentSummary: FC<MultiComponentSummaryProps> = ({
	selectedComponents,
	allComponents,
	genDetails,
	extensionName,
	isLoading,
	componentDataMap,
	organization,
}) => {
	const queryClient = useQueryClient();
	const selectedComponentsToDisplay = selectedComponents.filter((comp) => comp.selected);

	// Helper function to get build pack display name
	const getBuildPackDisplayName = (componentType: string, buildPackLang: string): string => {
		const buildPackQueryKey = queryKeys.getBuildPacks(componentType, organization);
		const buildPacks: Buildpack[] | undefined = queryClient.getQueryData(buildPackQueryKey);
		return buildPacks?.find((item) => item.language === buildPackLang)?.displayName || buildPackLang || "-";
	};

	// Helper function to get per-component details as items
	const getComponentDetails = (comp: ComponentSelectionItem, componentData: PerComponentFormData | undefined): ReactNode[] => {
		const items: ReactNode[] = [];
		const componentConfig = allComponents?.[comp.index];
		const componentType = comp.componentType;
        const choreoComponentType = extensionName === "Devant"
            ? getTypeOfIntegrationType(componentType).type
            : componentType;
		const buildDetails = componentData?.buildDetails;
		const endpointDetails = componentData?.endpointDetails;
		const gitProxyDetails = componentData?.gitProxyDetails;

		// Build pack / Technology (from initialValues or buildDetails)
		const buildPackLang = componentConfig?.initialValues?.buildPackLang || buildDetails?.buildPackLang;
		if (buildPackLang) {
			const buildPackName = getBuildPackDisplayName(choreoComponentType, buildPackLang);
			items.push(
				<ComponentSummaryItem
					key={`buildpack-${comp.index}`}
					title={extensionName === "Devant" ? "Technology" : "Build Pack"}
					text={buildPackName}
				/>,
			);
		}

		// API Proxy specific fields
		if (choreoComponentType === ChoreoComponentType.ApiProxy && gitProxyDetails) {
			if (gitProxyDetails.componentConfig?.type) {
				items.push(<ComponentSummaryItem key={`proxy-type-${comp.index}`} title="Proxy Type" text={gitProxyDetails.componentConfig.type} />);
			}
			if (gitProxyDetails.proxyContext) {
				items.push(<ComponentSummaryItem key={`api-context-${comp.index}`} title="API Context" text={gitProxyDetails.proxyContext} />);
			}
			if (gitProxyDetails.proxyVersion) {
				items.push(<ComponentSummaryItem key={`version-${comp.index}`} title="Version" text={gitProxyDetails.proxyVersion} />);
			}
			if (gitProxyDetails.proxyTargetUrl) {
				items.push(<ComponentSummaryItem key={`target-url-${comp.index}`} title="Target URL" text={gitProxyDetails.proxyTargetUrl} />);
			}
		}

		// Build details based on build pack type
		if (buildPackLang && buildDetails) {
			if (buildPackLang === ChoreoBuildPackNames.Docker) {
				if (buildDetails.dockerFile) {
					items.push(<ComponentSummaryItem key={`dockerfile-${comp.index}`} title="Docker File" text={buildDetails.dockerFile} />);
				}
				if (choreoComponentType === ChoreoComponentType.WebApplication && buildDetails.webAppPort) {
					items.push(<ComponentSummaryItem key={`port-${comp.index}`} title="Port" text={buildDetails.webAppPort} />);
				}
			} else if (WebAppSPATypes.includes(buildPackLang as ChoreoBuildPackNames)) {
				if (buildDetails.spaNodeVersion) {
					items.push(<ComponentSummaryItem key={`node-version-${comp.index}`} title="Node Version" text={buildDetails.spaNodeVersion} />);
				}
				if (buildDetails.spaBuildCommand) {
					items.push(<ComponentSummaryItem key={`build-cmd-${comp.index}`} title="Build Command" text={buildDetails.spaBuildCommand} />);
				}
				if (buildDetails.spaOutputDir) {
					items.push(<ComponentSummaryItem key={`output-dir-${comp.index}`} title="Output Directory" text={buildDetails.spaOutputDir} />);
				}
			} else if (buildDetails.langVersion) {
				items.push(<ComponentSummaryItem key={`lang-version-${comp.index}`} title="Language Version" text={buildDetails.langVersion} />);
				if (choreoComponentType === ChoreoComponentType.WebApplication && buildDetails.webAppPort) {
					items.push(<ComponentSummaryItem key={`port-${comp.index}`} title="Port" text={buildDetails.webAppPort} />);
				}
			}
		}

		// Endpoints for Service components
		if (choreoComponentType === ChoreoComponentType.Service && endpointDetails?.endpoints?.length) {
			items.push(
				<ComponentSummaryItem
					key={`endpoints-${comp.index}`}
					title="Endpoints"
					text={`${endpointDetails.endpoints.length} endpoint${endpointDetails.endpoints.length > 1 ? "s" : ""}`}
				/>,
			);
		}

		return items;
	};

	return (
		<div className={classNames("flex flex-col gap-4", isLoading && "animate-pulse")}>
			{/* Common Configuration (Repository & Branch) */}
			<div>
				<h4 className="mb-2 text-sm font-medium opacity-80">Repository Configuration</h4>
				<div className="grid grid-cols-2 gap-1 md:grid-cols-3 md:gap-2 xl:grid-cols-4 xl:gap-3">
					<ComponentSummaryItem key="repo" title="Repository" text={genDetails?.repoUrl || "-"} className="col-span-2" />
					<ComponentSummaryItem key="branch" title="Branch" text={genDetails?.branch || "-"} />
				</div>
			</div>

			{/* Components List with Per-Component Details */}
			<div>
				<h4 className="mb-2 text-sm font-medium opacity-80">
					{extensionName === "Devant" ? "Integrations" : "Components"} ({selectedComponentsToDisplay.length})
				</h4>
				<div className="flex flex-col gap-3">
					{selectedComponentsToDisplay.map((comp) => {
						const componentConfig = allComponents?.[comp.index];
						const componentType = comp.componentType;
						const subType = componentConfig?.initialValues?.subType;
						const componentData = componentDataMap?.get(comp.index);
						const componentDetails = getComponentDetails(comp, componentData);

						return (
							<div
								key={comp.index}
								className="rounded-lg border border-[var(--vscode-widget-border)] bg-[var(--vscode-editor-background)] p-4"
							>
								{/* Component Header */}
								<div className="mb-3 flex items-center gap-2 border-b border-[var(--vscode-widget-border)] pb-2">
									<span className="font-medium">{comp.name}</span>
									<span className="rounded bg-[var(--vscode-badge-background)] px-2 py-0.5 text-xs text-[var(--vscode-badge-foreground)]">
										{extensionName === "Devant"
											? getIntegrationComponentTypeText(componentType, subType)
											: getComponentTypeText(componentType)}
									</span>
									<span className="text-xs opacity-60">({comp.directoryName})</span>
								</div>

								{/* Component Details Grid */}
								<div className="grid grid-cols-2 gap-1 md:grid-cols-3 md:gap-2 xl:grid-cols-4 xl:gap-3">
									{componentDetails.length > 0 ? (
										componentDetails
									) : (
										<span className="col-span-full text-sm opacity-60">Using default configuration</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
