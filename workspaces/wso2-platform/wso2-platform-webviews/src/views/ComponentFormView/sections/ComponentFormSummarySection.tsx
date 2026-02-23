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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	type Buildpack,
	ChoreoBuildPackNames,
	ChoreoComponentType,
	type MultiComponentSectionProps,
	WebAppSPATypes,
	getComponentTypeText,
	getIntegrationComponentTypeText,
} from "@wso2/wso2-platform-core";
import classNames from "classnames";
import React, { type HTMLProps, type FC, type ReactNode, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod/v3";
import { Banner } from "../../../components/Banner";
import { Button } from "../../../components/Button";
import { queryKeys } from "../../../hooks/use-queries";
import { useExtWebviewContext } from "../../../providers/ext-vewview-ctx-provider";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";
import type {
	componentBuildDetailsSchema,
	componentEndpointsFormSchema,
	componentGeneralDetailsSchema,
	componentGitProxyFormSchema,
} from "../componentFormSchema";
import type { PerComponentFormData } from "../hooks";
import { MultiComponentSummary } from "./MultiComponentSummary";

type ComponentFormGenDetailsType = z.infer<typeof componentGeneralDetailsSchema>;
type ComponentFormBuildDetailsType = z.infer<typeof componentBuildDetailsSchema>;
type ComponentFormEndpointsType = z.infer<typeof componentEndpointsFormSchema>;
type ComponentFormGitProxyType = z.infer<typeof componentGitProxyFormSchema>;

interface Props extends MultiComponentSectionProps {
	isCreating: boolean;
	onNextClick: () => void;
	onBackClick: () => void;
	genDetailsForm: UseFormReturn<ComponentFormGenDetailsType>;
	buildDetailsForm: UseFormReturn<ComponentFormBuildDetailsType>;
	endpointDetailsForm: UseFormReturn<ComponentFormEndpointsType>;
	gitProxyForm: UseFormReturn<ComponentFormGitProxyType>;
	/** Per-component form data map (for multi-component mode) */
	componentDataMap?: Map<number, PerComponentFormData>;
	/** Whether all per-component data has been loaded */
	isMultiComponentDataLoaded?: boolean;
}

export const ComponentFormSummarySection: FC<Props> = ({
	organization,
	onBackClick,
	onNextClick,
	directoryFsPath,
	isCreating,
	buildDetailsForm,
	endpointDetailsForm,
	genDetailsForm,
	gitProxyForm,
	initialValues,
	isMultiComponentMode,
	allComponents,
	selectedComponents,
	componentDataMap,
	isMultiComponentDataLoaded,
}) => {
	const [summaryWrapRef] = useAutoAnimate();
	const queryClient = useQueryClient();
	const { extensionName } = useExtWebviewContext();

	const genDetails = genDetailsForm.getValues();
	const buildDetails = buildDetailsForm.getValues();
	const endpointDetails = endpointDetailsForm.getValues();
	const gitProxyDetails = gitProxyForm.getValues();
	const type = initialValues?.type;

	const {
		data: configDriftFiles = [],
		isLoading: isLoadingConfigDriftFiles,
		isFetching: isFetchingConfigDrift,
		refetch: refetchConfigDrift,
	} = useQuery({
		queryKey: ["get-config-drift", { directoryFsPath }],
		queryFn: () =>
			ChoreoWebViewAPI.getInstance().getConfigFileDrifts({
				type,
				repoDir: directoryFsPath,
				branch: genDetails.branch,
				repoUrl: genDetails.repoUrl,
			}),
		refetchOnWindowFocus: true,
		enabled: genDetails?.repoUrl?.length > 0,
	});

	const { data: hasLocalChanges } = useQuery({
		queryKey: ["has-local-changes", { directoryFsPath }],
		queryFn: () => ChoreoWebViewAPI.getInstance().hasDirtyLocalGitRepo(directoryFsPath),
		refetchOnWindowFocus: true,
	});

	const buildPackName = useMemo(() => {
		const buildPackQueryKey = queryKeys.getBuildPacks(type, organization);
		const buildPacks: Buildpack[] | undefined = queryClient.getQueryData(buildPackQueryKey);
		return buildPacks?.find((item) => item.language === buildDetails?.buildPackLang)?.displayName || buildDetails?.buildPackLang;
	}, [type, buildDetails?.buildPackLang, organization]);

	const items: ReactNode[] = [];
	if (type === ChoreoComponentType.ApiProxy) {
		items.push(<ComponentSummaryItem title="Type" text={gitProxyDetails?.componentConfig?.type} />);
		items.push(<ComponentSummaryItem title="API Context" text={gitProxyDetails?.proxyContext} />);
		items.push(<ComponentSummaryItem title="Version" text={gitProxyDetails?.proxyVersion} />);
		// TODO: Re-enable this once networkVisibilities is supported in the git proxy schema
		// items.push(<ComponentSummaryItem title={gitProxyDetails?.componentConfig?.networkVisibilities?.length>1 ?"Visibilities" :"Visibility"} text={gitProxyDetails?.componentConfig?.networkVisibilities?.join(",")} />);
		if (gitProxyDetails?.componentConfig?.type === "REST" && gitProxyDetails?.componentConfig?.schemaFilePath) {
			items.push(<ComponentSummaryItem title="Schema Path" text={gitProxyDetails?.componentConfig?.schemaFilePath} />);
		}
		if (gitProxyDetails?.componentConfig?.docPath) {
			items.push(<ComponentSummaryItem title="Documentation Path" text={gitProxyDetails?.componentConfig?.docPath} />);
		}
		if (gitProxyDetails?.componentConfig?.thumbnailPath) {
			items.push(<ComponentSummaryItem title="Thumbnail Path" text={gitProxyDetails?.componentConfig?.thumbnailPath} />);
		}
		items.push(<ComponentSummaryItem title="Target URL" text={gitProxyDetails?.proxyTargetUrl} className="col-span-2" />);
	} else if (buildPackName) {
		items.push(<ComponentSummaryItem title={extensionName === "Devant" ? "Technology" : "Build Pack"} text={buildPackName} />);

		if (
			[ChoreoBuildPackNames.Ballerina, ChoreoBuildPackNames.MicroIntegrator, ChoreoBuildPackNames.StaticFiles].includes(
				buildDetails?.buildPackLang as ChoreoBuildPackNames,
			)
		) {
			// do nothing
		} else if (buildDetails?.buildPackLang === ChoreoBuildPackNames.Docker) {
			items.push(<ComponentSummaryItem title="Docker File" text={buildDetails?.dockerFile} />);

			if (type === ChoreoComponentType.WebApplication) {
				items.push(<ComponentSummaryItem title="Port" text={buildDetails?.webAppPort} />);
			}
		} else if (WebAppSPATypes.includes(buildDetails?.buildPackLang as ChoreoBuildPackNames)) {
			items.push(<ComponentSummaryItem title="Node Version" text={buildDetails?.spaNodeVersion} />);
			items.push(<ComponentSummaryItem title="Build Command" text={buildDetails?.spaBuildCommand} />);
			items.push(<ComponentSummaryItem title="Output directory" text={buildDetails?.spaOutputDir} />);
		} else if (buildDetails?.langVersion) {
			// Build pack type
			items.push(<ComponentSummaryItem title="Language Version" text={buildDetails?.langVersion} />);
			if (type === ChoreoComponentType.WebApplication) {
				items.push(<ComponentSummaryItem title="Port" text={buildDetails?.webAppPort} />);
			}
		}

		if (type === ChoreoComponentType.Service && endpointDetails?.endpoints?.length) {
			if ([ChoreoBuildPackNames.MicroIntegrator, ChoreoBuildPackNames.Ballerina].includes(buildDetails?.buildPackLang as ChoreoBuildPackNames)) {
				// if ballerina or MI
				if (!buildDetails?.useDefaultEndpoints) {
					// if not using default endpoints
					items.push(
						<ComponentSummaryItem
							title="Endpoints"
							text={`${endpointDetails?.endpoints?.length} endpoint${endpointDetails?.endpoints?.length > 1 ? "s" : ""}`}
						/>,
					);
				}
			} else {
				// if not using ballerina or MI
				items.push(
					<ComponentSummaryItem
						title="Endpoints"
						text={`${endpointDetails?.endpoints?.length} endpoint${endpointDetails?.endpoints?.length > 1 ? "s" : ""}`}
					/>,
				);
			}
		}
	}

	return (
		<div ref={summaryWrapRef} className="flex flex-col gap-4 pt-2">
			{configDriftFiles.length > 0 && (
				<Banner
					type="warning"
					className="mb-4"
					title="Configuration Changes Detected"
					subTitle={`${extensionName} requires the metadata in the ${configDriftFiles.join(",")} ${configDriftFiles?.length > 1 ? "files" : "file"} to be committed and pushed to the selected remote repository for proper functionality.`}
					refreshBtn={{ isRefreshing: isFetchingConfigDrift, onClick: refetchConfigDrift }}
				/>
			)}

			{configDriftFiles.length === 0 && hasLocalChanges && (
				<Banner
					className="mb-4"
					title="Local Changes Detected"
					subTitle={`${extensionName} builds your ${extensionName === "Devant" ? "integration" : "component"} from the source code in the selected remote repository. Please commit and push your local changes to the remote Git repository.`}
				/>
			)}

			{isMultiComponentMode && selectedComponents ? (
				<MultiComponentSummary
					selectedComponents={selectedComponents}
					allComponents={allComponents}
					genDetails={genDetails}
					extensionName={extensionName}
					isLoading={isLoadingConfigDriftFiles || !isMultiComponentDataLoaded}
					componentDataMap={componentDataMap}
					organization={organization}
				/>
			) : (
				<div
					className={classNames("grid grid-cols-2 gap-1 md:grid-cols-3 md:gap-2 xl:grid-cols-4 xl:gap-3", isLoadingConfigDriftFiles && "animate-pulse")}
				>
					<ComponentSummaryItem title="Name" text={genDetails?.name} />
					<ComponentSummaryItem
						title="Type"
						text={extensionName === "Devant" ? getIntegrationComponentTypeText(type, initialValues?.subType) : getComponentTypeText(type)}
					/>
					<ComponentSummaryItem title="Repository" text={genDetails?.repoUrl} className="col-span-2" />
					<ComponentSummaryItem title="Branch" text={genDetails?.branch} />
					{genDetails?.subPath && genDetails?.subPath !== "." && <ComponentSummaryItem title="Directory" text={genDetails?.subPath} />}
					{items}
				</div>
			)}

			<div className="flex justify-end gap-3 pt-6 pb-2">
				<Button appearance="secondary" onClick={onBackClick} disabled={isCreating}>
					Back
				</Button>
				<Button onClick={onNextClick} disabled={isCreating || isLoadingConfigDriftFiles || configDriftFiles.length > 0}>
					{isCreating ? "Creating..." : "Create"}
				</Button>
			</div>
		</div>
	);
};

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
