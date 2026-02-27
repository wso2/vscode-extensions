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
	ChoreoComponentType,
	type ComponentConfig,
	type ComponentSelectionItem,
	type Organization,
	getComponentTypeText,
	getIntegrationComponentTypeText,
	getIntegrationScopeText,
	getTypeOfIntegrationType,
} from "@wso2/wso2-platform-core";
import { Icon } from "@wso2/ui-toolkit";
import classNames from "classnames";
import React, { type HTMLProps, type FC } from "react";
import { Codicon } from "../../../components/Codicon";
import { queryKeys } from "../../../hooks/use-queries";
import {
	getIntegrationTypeColor,
	getIntegrationTypeIcon,
	getTypeChipStyle,
} from "../../../utilities/integration-type-styles";
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

/** Compact summary item for repository section */
const SummaryItem: FC<{ title: string; text: string | number; className?: HTMLProps<HTMLElement>["className"] }> = ({
	text,
	title,
	className,
}) => (
	<div key={title} title={`${title}: ${text}`} className={className}>
		<div className="line-clamp-1 text-sm">{title}</div>
		<div className="line-clamp-1 break-all font-light opacity-80">{text}</div>
	</div>
);

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
	const isDevant = extensionName === "Devant";

	// Helper function to get build pack display name
	const getBuildPackDisplayName = (componentType: string, buildPackLang: string): string => {
		const buildPackQueryKey = queryKeys.getBuildPacks(componentType, organization);
		const buildPacks: Buildpack[] | undefined = queryClient.getQueryData(buildPackQueryKey);
		return buildPacks?.find((item) => item.language === buildPackLang)?.displayName || buildPackLang || "-";
	};

	// Helper function to get technology/buildpack name for a component
	const getTechnologyName = (comp: ComponentSelectionItem, componentData: PerComponentFormData | undefined): string => {
		const componentConfig = allComponents?.[comp.index];
		const componentType = comp.componentType;
		const choreoComponentType = isDevant ? getTypeOfIntegrationType(componentType).type : componentType;
		const buildPackLang = componentConfig?.initialValues?.buildPackLang || componentData?.buildDetails?.buildPackLang;
		return buildPackLang ? getBuildPackDisplayName(choreoComponentType, buildPackLang) : "-";
	};

	// Helper function to get endpoint count for a component
	const getEndpointCount = (comp: ComponentSelectionItem, componentData: PerComponentFormData | undefined): string => {
		const componentType = comp.componentType;
		const choreoComponentType = isDevant ? getTypeOfIntegrationType(componentType).type : componentType;
		const endpointDetails = componentData?.endpointDetails;

		if (choreoComponentType === ChoreoComponentType.Service && endpointDetails?.endpoints?.length) {
			return String(endpointDetails.endpoints.length);
		}
		return "-";
	};

	return (
		<div className={classNames("flex flex-col gap-5", isLoading && "animate-pulse")}>
			{/* Repository Configuration - Compact grid matching single component view */}
			<div className="grid grid-cols-2 gap-1 md:grid-cols-3 md:gap-2 xl:grid-cols-4 xl:gap-3">
				<SummaryItem title="Repository" text={genDetails?.repoUrl || "-"} className="col-span-2" />
				<SummaryItem title="Branch" text={genDetails?.branch || "-"} />
			</div>

			{/* Components Table */}
			<div className="rounded-lg border border-vsc-input-border bg-vsc-editor-background">
				{/* Table using actual table element for proper alignment */}
				<table className="w-full border-collapse text-sm">
					<thead>
						<tr className="border-b border-vsc-input-border text-left text-xs text-vsc-descriptionForeground">
							<th className="px-4 py-2.5 font-medium">Name</th>
							<th className="px-4 py-2.5 font-medium">Type</th>
							<th className="px-4 py-2.5 font-medium">{isDevant ? "Technology" : "Build Pack"}</th>
							<th className="px-4 py-2.5 font-medium">Endpoints</th>
							<th className="px-4 py-2.5 font-medium">Directory</th>
						</tr>
					</thead>
					<tbody>
						{selectedComponentsToDisplay.map((comp, idx) => {
							const componentConfig = allComponents?.[comp.index];
							const componentType = comp.componentType;
							const subType = componentConfig?.initialValues?.subType;
							const componentData = componentDataMap?.get(comp.index);
							const technologyName = getTechnologyName(comp, componentData);
							const endpointCount = getEndpointCount(comp, componentData);
							const isLast = idx === selectedComponentsToDisplay.length - 1;

							return (
								<tr
									key={comp.index}
									className={classNames(
										"transition-colors hover:bg-vsc-list-hoverBackground/25",
										!isLast && "border-b border-vsc-input-border"
									)}
								>
									{/* Name */}
									<td className="px-4 py-3">
										<span className="font-medium text-vsc-foreground" title={comp.name}>
											{comp.name}
										</span>
									</td>

									{/* Type */}
									<td className="px-4 py-3">
										{(() => {
											const typeColor = isDevant ? getIntegrationTypeColor(componentType, subType) : undefined;
											const chipStyle = getTypeChipStyle(typeColor);
											const iconConfig = isDevant ? getIntegrationTypeIcon(componentType, subType) : null;
											const typeText = isDevant
												? getIntegrationScopeText(getIntegrationComponentTypeText(componentType, subType))
												: getComponentTypeText(componentType);

											return chipStyle ? (
												<span style={chipStyle} className="inline-flex items-center gap-1">
													{iconConfig &&
														(iconConfig.isCodicon ? (
															<Codicon name={iconConfig.name} className="text-[10px]" />
														) : (
															<Icon
																name={iconConfig.name}
																iconSx={{ fontSize: 12, opacity: 0.9 }}
																sx={{ height: 12, width: 12 }}
															/>
														))}
													{typeText}
												</span>
											) : (
												<span className="whitespace-nowrap rounded-full border border-vsc-input-border bg-vsc-input-background px-2.5 py-1 text-xs font-medium text-vsc-foreground">
													{typeText}
												</span>
											);
										})()}
									</td>

									{/* Technology */}
									<td className="px-4 py-3">
										<span className="text-vsc-foreground opacity-80" title={technologyName}>
											{technologyName}
										</span>
									</td>

									{/* Endpoints */}
									<td className="px-4 py-3">
										<span className="text-vsc-foreground opacity-80">
											{endpointCount}
										</span>
									</td>

									{/* Directory */}
									<td className="px-4 py-3">
										<span className="font-mono text-xs text-vsc-descriptionForeground" title={comp.directoryName}>
											{comp.directoryName}
										</span>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>

				{/* Footer with count */}
				<div className="border-t border-vsc-input-border px-4 py-2 text-xs text-vsc-descriptionForeground">
					{selectedComponentsToDisplay.length} {isDevant ? "integration" : "component"}
					{selectedComponentsToDisplay.length !== 1 ? "s" : ""} selected
				</div>
			</div>
		</div>
	);
};
