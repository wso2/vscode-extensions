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
	ComponentDisplayType,
	type ComponentKind,
	type DeploymentLogsData,
	type DeploymentLogsDataStep,
	DeploymentStepStatus,
	type Organization,
	type ProjectBuildLogsData,
	getComponentKindRepoSource,
	getTimeAgo,
} from "@wso2/choreo-core";
import { ProgressIndicator } from "@wso2/ui-toolkit";
import classNames from "classnames";
import React, { type ReactNode, type FC } from "react";
import { Button } from "../../../components/Button";
import { Codicon } from "../../../components/Codicon";
import { CommitLink } from "../../../components/CommitLink";
import { Divider } from "../../../components/Divider";
import { SkeletonText } from "../../../components/SkeletonText";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";

interface Props {
	component: ComponentKind;
	data: DeploymentLogsData;
	loadingData?: boolean;
	isVisible?: boolean;
	org: Organization;
	buildItem: BuildKind;
}

// todo: handle trivy failures

export enum DeployedBuildResultSteps {
	CHECKOV = "Dockerfile scan",
	TRIVY = "Container (Trivy) vulnerability scan",
	TRIVY_LIBRARY = "Library (Trivy) vulnerability scan",
	TRIVY_DROPINS = "Dropins (Trivy) vulnerability scan",
	INTEGRATION_PROJECT_BUILD = "Integration Project Build",
	DOCKER_BUILD = "Docker Build",
	PACK_BUILD = "Build Component",
	BALLERINA_BUILD = "Ballerina Build",
	POST_BUILD_CHECK = "Post-Build Check",
	MI_VERSION_VALIDATION = "MI Version Validation",
	MAIN_SEQUENCE_VALIDATION = "Main Sequence Validation",
	GIT_CHECKOUT = "Checkout Source Code",
	GENERATE_CODE = "Generate Code",
	BUILD_MEDIATION = "Build mediation source",
	OAS_VALIDATION = "Validate OAS",
	UPDATE_API = "Update API",
	SOURCE_CONFIGURATION_FILE_VALIDATION = "Source Configuration File Validation",
	API_GOVERNANCE = "Validate Against Governance Rules",
	READ_COMOPNENT_CONFIG = "Read Component Yaml",
}

export const BuildDetailsSection: FC<Props> = ({ component, data, loadingData, isVisible, org, buildItem }) => {
	const isGitProxy = component.spec?.type === ComponentDisplayType.GitProxy;
	const buildId = buildItem?.status?.runId;
	const buildConclusion = buildItem?.status?.conclusion;
	const [rootRef] = useAutoAnimate();

	let status: ReactNode = buildItem?.status?.conclusion;
	if (buildItem?.status?.conclusion === "") {
		status = <span className="animate-pulse text-vsc-charts-orange capitalize">{buildItem?.status?.status?.replaceAll("_", " ")}</span>;
	} else {
		if (buildItem?.status?.conclusion === "success") {
			status = <span className="text-vsc-charts-green capitalize">{status}</span>;
		} else if (buildItem?.status?.conclusion === "failure") {
			status = <span className="text-vsc-errorForeground capitalize">{status}</span>;
		}
	}

	return (
		<div className="flex flex-col gap-4 overflow-y-auto">
			<div className="flex flex-col gap-4 px-4 sm:px-6" ref={rootRef}>
				{buildItem && (
					<div className="flex flex-col gap-2">
						<div className="flex justify-between">
							<div className="font-extralight opacity-75">Time</div>
							<div className="text-right">{getTimeAgo(new Date(buildItem?.status?.startedAt))}</div>
						</div>
						<div className="flex justify-between">
							<div className="font-extralight opacity-75">Commit</div>
							<div className="text-right">
								<CommitLink
									commitHash={buildItem.spec?.revision}
									commitMessage={buildItem.status?.gitCommit?.message}
									repoPath={getComponentKindRepoSource(component?.spec?.source).repo}
								/>
							</div>
						</div>
						<div className="flex justify-between">
							<div className="font-extralight opacity-75">Status</div>
							<div className="text-right">{status}</div>
						</div>
					</div>
				)}

				<Divider className="my-2" />

				<div className="mb-2 rounded-sm bg-vsc-editorIndentGuide-background p-1 text-center font-thin text-xs opacity-75">
					The default retention period for logs is 90 days.
				</div>

				{loadingData ? (
					Array.from(new Array(3)).map((_, index) => (
						<React.Fragment key={`skeleton-section-${index}`}>
							<BuildDetailsSectionSkeleton index={index} key={index} />
							{index < 2 && <Divider className="opacity-50" />}
						</React.Fragment>
					))
				) : (
					<>
						{data &&
							(isGitProxy ? (
								<>
									<BuildDetailsSectionItem
										title="Initialization"
										steps={data.init?.steps}
										conclusion={data.init?.status}
										// todo: check console behavior
										// logs={data?.oasValidation?.log}
										isVisible={isVisible}
										buildId={buildId}
										component={component}
										org={org}
										buildConclusion={buildConclusion}
									/>
									<Divider className="opacity-50" />
									<BuildDetailsSectionItem
										title="API definition validation"
										steps={data.oasValidation?.steps}
										conclusion={data.oasValidation?.status}
										// todo: check console behavior
										// logs={data?.oasValidation?.log}
										isVisible={isVisible}
										buildId={buildId}
										component={component}
										org={org}
										buildConclusion={buildConclusion}
									/>
									<Divider className="opacity-50" />
									<BuildDetailsSectionItem
										title="API update"
										steps={data.updateApi?.steps}
										conclusion={data.updateApi?.status}
										// todo: check console behavior
										// logs={data?.updateApi?.log}
										isVisible={isVisible}
										buildId={buildId}
										component={component}
										org={org}
										buildConclusion={buildConclusion}
									/>
									<Divider className="opacity-50" />
									<BuildDetailsSectionItem
										title="API governance"
										steps={data.governanceCheck?.steps}
										conclusion={data.governanceCheck?.status}
										// todo: check console behavior
										// logs={data?.governanceCheck?.log}
										isVisible={isVisible}
										buildId={buildId}
										component={component}
										org={org}
										buildConclusion={buildConclusion}
									/>
								</>
							) : (
								<>
									<BuildDetailsSectionItem
										title="Initialization"
										steps={data.init?.steps}
										conclusion={data.init?.status}
										logs={data?.init?.log}
										isVisible={isVisible}
										buildId={buildId}
										component={component}
										org={org}
										buildConclusion={buildConclusion}
									/>
									<Divider className="opacity-50" />
									<BuildDetailsSectionItem
										title="Build"
										steps={data.build?.steps}
										conclusion={data.build?.status}
										logs={data?.build?.log}
										isVisible={isVisible}
										buildId={buildId}
										component={component}
										org={org}
										buildConclusion={buildConclusion}
									/>
									<Divider className="opacity-50" />
									<BuildDetailsSectionItem
										title="Finalization"
										steps={data.deploy?.steps}
										conclusion={data.deploy?.status}
										isVisible={isVisible}
										buildId={buildId}
										component={component}
										org={org}
										buildConclusion={buildConclusion}
									/>
								</>
							))}
					</>
				)}
			</div>
		</div>
	);
};

const BuildDetailsSectionSkeleton: FC<{ index: number }> = ({ index }) => {
	return (
		<div className="flex w-full flex-col gap-2">
			<SkeletonText className={index % 2 === 0 ? "w-20" : "w-12"} />
			<ul className="flex flex-col gap-2">
				{Array.from(new Array(index % 2 === 0 ? 3 : 2)).map((_, index) => (
					<li className="flex items-center justify-between gap-2" key={index}>
						<SkeletonText className={index % 2 ? "w-32" : "w-28"} />
						<SkeletonText className="h-4 w-4" />
					</li>
				))}
			</ul>
		</div>
	);
};

const BuildDetailsSectionItem: FC<{
	title: string;
	conclusion: string;
	steps: DeploymentLogsDataStep[];
	logs?: string;
	buildId: number;
	component: ComponentKind;
	org: Organization;
	isVisible?: boolean;
	buildConclusion: string;
}> = ({ title, steps = [], logs, conclusion, buildId, component, org, isVisible, buildConclusion }) => {
	const [itemRootRef] = useAutoAnimate();
	const [subItemsRef] = useAutoAnimate();

	const logVal = getLogsVal(logs);

	return (
		<div className="flex flex-col gap-2" ref={itemRootRef}>
			<div className={classNames("flex items-center justify-between gap-2", conclusion === "queued" && "opacity-80")}>
				<div className="flex flex-1 items-center gap-2">
					<span className="font-semibold text-base">{title}</span>
					{logVal && <ViewLogsButton logs={logVal} />}
				</div>
				{steps?.length === 0 && <BuildItemIcon conclusion={conclusion || "queued"} />}
			</div>
			{steps?.length > 0 && (
				<ul className="flex flex-col gap-2" ref={subItemsRef}>
					{steps
						.sort((a, b) => a.number - b.number)
						.map((step) => (
							<BuildDetailsSectionSubItem
								key={step.name}
								step={step}
								buildId={buildId}
								component={component}
								org={org}
								isVisible={isVisible}
								buildConclusion={buildConclusion}
							/>
						))}
				</ul>
			)}
		</div>
	);
};

const BuildDetailsSectionSubItem: FC<{
	step: DeploymentLogsDataStep;
	component: ComponentKind;
	buildId: number;
	isVisible: boolean;
	org: Organization;
	buildConclusion: string;
}> = ({ step, isVisible, component, org, buildId, buildConclusion }) => {
	const { data: logData } = useQuery({
		queryKey: [
			"build-logs-step",
			{ step: step.name, component: component.metadata?.id, org: org?.id, buildId, type: getLogTypeForStepName(step), buildConclusion },
		],
		queryFn: async () => {
			try {
				const response = await ChoreoWebViewAPI.getInstance()
					.getChoreoRpcClient()
					.getBuildLogsForType({
						logType: getLogTypeForStepName(step),
						buildId,
						componentId: component.metadata?.id,
						orgId: org?.id?.toString(),
					});
				return response || null;
			} catch {
				return null;
			}
		},
		select: (data) => getLogsVal(getLogStrFromBuildLogData(step, data), step.name),
		enabled: ["success", "failure"].includes(step.conclusion) && isVisible && getLogTypeForStepName(step) !== "" && buildConclusion !== "",
		retry: 3,
		retryDelay: 5000,
	});

	const status = step.status === DeploymentStepStatus.InProgress ? DeploymentStepStatus.InProgress : step.conclusion || step.status || "queued";

	return (
		<li className={classNames("flex items-center justify-between gap-2", status === "skipped" && "opacity-50")}>
			<div className="flex flex-1 items-center gap-2">
				<span className="font-normal">- {step.name}</span>
				{logData && <ViewLogsButton logs={logData} />}
			</div>
			<BuildItemIcon conclusion={status} />
		</li>
	);
};

const ViewLogsButton: FC<{ logs: string }> = ({ logs }) => {
	const { mutate: showLogs } = useMutation({
		mutationFn: () => ChoreoWebViewAPI.getInstance().showTextInOutputPanel({ key: "Choreo: Build Logs", output: logs }),
	});

	return (
		<Button appearance="icon" title="View Logs" onClick={() => showLogs()}>
			<Codicon name="console" className="mr-1" /> Logs
		</Button>
	);
};

const BuildItemIcon: FC<{ conclusion: string }> = ({ conclusion }) => {
	return (
		<>
			{
				{
					completed: <Codicon name="pass" className="text-vsc-charts-green" title="Completed" />,
					success: <Codicon name="pass" className="text-vsc-charts-green" title="Success" />,
					skipped: <Codicon name="debug-step-over" title="Skipped" />,
					in_progress: <Codicon name="circle-filled" className="animate-pulse text-vsc-charts-orange" title="In Progress" />,
					queued: <Codicon name="circle-filled" className="animate-pulse" title="Queued" />,
					pending: <Codicon name="circle-filled" className="animate-pulse" title="Pending" />,
					failure: <Codicon name="warning" className="text-vsc-errorForeground" title="Failed" />,
				}[conclusion]
			}
		</>
	);
};

const getLogTypeForStepName = (step: DeploymentLogsDataStep) => {
	if (step.name === DeployedBuildResultSteps.TRIVY_LIBRARY) {
		return "libraryTrivyReport";
	}
	if (step.name === DeployedBuildResultSteps.TRIVY_DROPINS) {
		return "dropinsTrivyReport";
	}
	if (step.name === DeployedBuildResultSteps.INTEGRATION_PROJECT_BUILD) {
		return "integrationProjectBuild";
	}
	if (step.name === DeployedBuildResultSteps.POST_BUILD_CHECK) {
		return "postBuildCheckLogs";
	}
	if (step.name === DeployedBuildResultSteps.MAIN_SEQUENCE_VALIDATION) {
		return "mainSequenceValidation";
	}
	if (step.name === DeployedBuildResultSteps.MI_VERSION_VALIDATION) {
		return "mIVersionValidation";
	}
	if (step.name === DeployedBuildResultSteps.UPDATE_API) {
		return "mIVersionValidation";
	}
	if (step.name === DeployedBuildResultSteps.OAS_VALIDATION) {
		return "proxyBuildLogs";
	}
	if (step.name === DeployedBuildResultSteps.API_GOVERNANCE) {
		return "governanceLogs";
	}
	if (step.name === DeployedBuildResultSteps.READ_COMOPNENT_CONFIG) {
		return "configValidationLogs";
	}
	return "";
};

const getLogStrFromBuildLogData = (step: DeploymentLogsDataStep, data: ProjectBuildLogsData) => {
	if (!data) {
		return "";
	}
	if (step.name === DeployedBuildResultSteps.TRIVY_LIBRARY) {
		return data.libraryTrivyReport;
	}
	if (step.name === DeployedBuildResultSteps.TRIVY_DROPINS) {
		return data.dropinsTrivyReport;
	}
	if (step.name === DeployedBuildResultSteps.INTEGRATION_PROJECT_BUILD) {
		return data.integrationProjectBuild;
	}
	if (step.name === DeployedBuildResultSteps.POST_BUILD_CHECK) {
		return data.postBuildCheckLogs;
	}
	if (step.name === DeployedBuildResultSteps.MAIN_SEQUENCE_VALIDATION) {
		return data.mainSequenceValidation;
	}
	if (step.name === DeployedBuildResultSteps.MI_VERSION_VALIDATION) {
		return data.mIVersionValidation;
	}
	if (step.name === DeployedBuildResultSteps.UPDATE_API) {
		return data.mIVersionValidation;
	}
	if (step.name === DeployedBuildResultSteps.OAS_VALIDATION) {
		return data.proxyBuildLogs;
	}
	if (step.name === DeployedBuildResultSteps.API_GOVERNANCE) {
		return data.governanceLogs;
	}
	if (step.name === DeployedBuildResultSteps.READ_COMOPNENT_CONFIG) {
		return data.configValidationLogs;
	}
	return "";
};

const getLogsVal = (dataVal: string | undefined, logType?: string) => {
	try {
		if (
			logType &&
			[DeployedBuildResultSteps.TRIVY, DeployedBuildResultSteps.TRIVY_LIBRARY, DeployedBuildResultSteps.TRIVY_DROPINS].includes(
				logType as DeployedBuildResultSteps,
			)
		) {
			const base64Decoded = atob(dataVal || "");
			const urlDecoded = decodeURIComponent(escape(base64Decoded));
			return urlDecoded?.trim();
		}
		const decoded = window.atob(dataVal || "");
		return decoded !== "No log data available" ? decoded?.trim() : "";
	} catch (e) {
		return "";
	}
};
