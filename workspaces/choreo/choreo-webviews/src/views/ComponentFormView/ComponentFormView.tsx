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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	ChoreoBuildPackNames,
	ChoreoComponentType,
	ChoreoImplementationType,
	type CreateComponentReq,
	type Endpoint,
	GitProvider,
	type NewComponentWebviewProps,
	type SubmitComponentCreateReq,
	WebAppSPATypes,
	getComponentTypeText,
	getRandomNumber,
	makeURLSafe,
	parseGitURL,
} from "@wso2/choreo-core";
import React, { type FC, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { HeaderSection } from "../../components/HeaderSection";
import { type StepItem, VerticalStepper } from "../../components/VerticalStepper";
import { useComponentList } from "../../hooks/use-queries";
import { ChoreoWebViewAPI } from "../../utilities/vscode-webview-rpc";
import {
	type componentBuildDetailsSchema,
	type componentEndpointsFormSchema,
	type componentGeneralDetailsSchema,
	type componentGitProxyFormSchema,
	getComponentEndpointsFormSchema,
	getComponentFormSchemaBuildDetails,
	getComponentFormSchemaGenDetails,
	getComponentGitProxyFormSchema,
	sampleEndpointItem,
} from "./componentFormSchema";
import { ComponentFormBuildSection } from "./sections/ComponentFormBuildSection";
import { ComponentFormEndpointsSection } from "./sections/ComponentFormEndpointsSection";
import { ComponentFormGenDetailsSection } from "./sections/ComponentFormGenDetailsSection";
import { ComponentFormGitProxySection } from "./sections/ComponentFormGitProxySection";
import { ComponentFormSummarySection } from "./sections/ComponentFormSummarySection";

type ComponentFormGenDetailsType = z.infer<typeof componentGeneralDetailsSchema>;
type ComponentFormBuildDetailsType = z.infer<typeof componentBuildDetailsSchema>;
type ComponentFormEndpointsType = z.infer<typeof componentEndpointsFormSchema>;
type ComponentFormGitProxyType = z.infer<typeof componentGitProxyFormSchema>;

export const ComponentFormView: FC<NewComponentWebviewProps> = (props) => {
	const {
		project,
		organization,
		directoryFsPath,
		directoryUriPath,
		initialValues,
		directoryName,
		existingComponents: existingComponentsCache,
	} = props;
	const type = initialValues?.type;
	const [formSections] = useAutoAnimate();

	const [stepIndex, setStepIndex] = useState(0);

	const { data: existingComponents = [] } = useComponentList(project, organization, { initialData: existingComponentsCache });

	const genDetailsForm = useForm<ComponentFormGenDetailsType>({
		resolver: zodResolver(getComponentFormSchemaGenDetails(existingComponents), { async: true }, { mode: "async" }),
		mode: "all",
		defaultValues: { name: initialValues?.name || "", subPath: "", gitRoot: "", repoUrl: "", branch: "", credential: "", gitProvider: "" },
	});

	const name = genDetailsForm.watch("name");
	const gitRoot = genDetailsForm.watch("gitRoot");
	const subPath = genDetailsForm.watch("subPath");

	const buildDetailsForm = useForm<ComponentFormBuildDetailsType>({
		resolver: zodResolver(getComponentFormSchemaBuildDetails(type, directoryFsPath, gitRoot), { async: true }, { mode: "async" }),
		mode: "all",
		defaultValues: {
			buildPackLang: initialValues?.buildPackLang ?? "",
			dockerFile: "",
			langVersion: "",
			spaBuildCommand: "npm run build",
			spaNodeVersion: "20.0.0",
			spaOutputDir: "build",
			webAppPort: 8080,
			autoBuildOnCommit: true,
			useDefaultEndpoints: true,
		},
	});

	const useDefaultEndpoints = buildDetailsForm.watch("useDefaultEndpoints");
	const buildPackLang = buildDetailsForm.watch("buildPackLang");

	const endpointDetailsForm = useForm<ComponentFormEndpointsType, any, undefined>({
		resolver: zodResolver(getComponentEndpointsFormSchema(directoryFsPath), { async: true }, { mode: "async" }),
		mode: "all",
		defaultValues: { endpoints: [] },
	});

	const gitProxyForm = useForm<ComponentFormGitProxyType>({
		resolver: zodResolver(getComponentGitProxyFormSchema(directoryFsPath), { async: true }, { mode: "async" }),
		mode: "all",
		defaultValues: {
			proxyTargetUrl: "",
			proxyVersion: "v1.0",
			// TODO: Re-enable this once networkVisibilities is supported in the git proxy schema. add back networkVisibilities: "Public"
			componentConfig: { type: "REST", schemaFilePath: "", docPath: "", thumbnailPath: "" },
		},
	});

	useQuery({
		queryKey: ["service-dir-endpoints", { directoryFsPath, type }],
		queryFn: () => ChoreoWebViewAPI.getInstance().readLocalEndpointsConfig(directoryFsPath),
		select: (resp) => resp?.endpoints,
		refetchOnWindowFocus: false,
		enabled: type === ChoreoComponentType.Service,
		onSuccess: (resp) => {
			endpointDetailsForm.setValue("endpoints", resp?.length > 0 ? resp : [{ ...sampleEndpointItem, name: name || "endpoint-1" }]);
		},
	});

	useQuery({
		queryKey: ["read-local-proxy-config", { directoryFsPath, type }],
		queryFn: () => ChoreoWebViewAPI.getInstance().readLocalProxyConfig(directoryFsPath),
		select: (resp) => resp?.proxy,
		refetchOnWindowFocus: false,
		enabled: type === ChoreoComponentType.ApiProxy,
		onSuccess: (resp) => {
			gitProxyForm.setValue("componentConfig.type", resp?.type ?? "REST");
			gitProxyForm.setValue("componentConfig.schemaFilePath", resp?.schemaFilePath ?? "");
			gitProxyForm.setValue("componentConfig.thumbnailPath", resp?.thumbnailPath ?? "");
			gitProxyForm.setValue("componentConfig.docPath", resp?.docPath ?? "");
			// TODO: Re-enable this once networkVisibilities is supported in the git proxy schema
			// gitProxyForm.setValue("componentConfig.networkVisibilities", resp?.networkVisibilities ?? []);
		},
	});

	const { mutate: createComponent, isLoading: isCreatingComponent } = useMutation({
		mutationFn: async () => {
			const genDetails = genDetailsForm.getValues();
			const buildDetails = buildDetailsForm.getValues();
			const gitProxyDetails = gitProxyForm.getValues();

			const componentName = makeURLSafe(genDetails.name);

			const parsedRepo = parseGitURL(genDetails.repoUrl);
			const provider = parsedRepo ? parsedRepo[2] : null;

			const createParams: Partial<CreateComponentReq> = {
				orgId: organization.id.toString(),
				orgUUID: organization.uuid,
				projectId: project.id,
				projectHandle: project.handler,
				name: componentName,
				displayName: genDetails.name,
				type,
				buildPackLang: buildDetails.buildPackLang,
				componentDir: directoryFsPath,
				repoUrl: genDetails.repoUrl,
				gitProvider: genDetails.gitProvider,
				branch: genDetails.branch,
				langVersion: buildDetails.langVersion,
				port: buildDetails.webAppPort,
			};

			if (provider !== GitProvider.GITHUB) {
				createParams.gitCredRef = genDetails?.credential;
			}

			if (buildDetails.buildPackLang === ChoreoImplementationType.Docker) {
				createParams.dockerFile = buildDetails.dockerFile.replace(/\\/g, "/");
			}

			if (WebAppSPATypes.includes(buildDetails.buildPackLang as ChoreoBuildPackNames)) {
				createParams.spaBuildCommand = buildDetails.spaBuildCommand;
				createParams.spaNodeVersion = buildDetails.spaNodeVersion;
				createParams.spaOutputDir = buildDetails.spaOutputDir;
			}

			if (type === ChoreoComponentType.ApiProxy) {
				createParams.proxyAccessibility = "external"; // TODO: remove after CLI change
				createParams.proxyApiContext =
					gitProxyDetails.proxyContext?.charAt(0) === "/" ? gitProxyDetails.proxyContext.substring(1) : gitProxyDetails.proxyContext;
				createParams.proxyApiVersion = gitProxyDetails.proxyVersion;
				createParams.proxyEndpointUrl = gitProxyDetails.proxyTargetUrl;
			}

			const createCompCommandParams: SubmitComponentCreateReq = {
				org: organization,
				project: project,
				autoBuildOnCommit: type === ChoreoComponentType.ApiProxy ? false : buildDetails?.autoBuildOnCommit,
				type,
				createParams: createParams as CreateComponentReq,
			};

			const created = await ChoreoWebViewAPI.getInstance().submitComponentCreate(createCompCommandParams);

			if (created) {
				ChoreoWebViewAPI.getInstance().closeWebView();
			}
		},
	});

	const { mutate: submitEndpoints, isLoading: isSubmittingEndpoints } = useMutation({
		mutationFn: (endpoints: Endpoint[] = []) => {
			return ChoreoWebViewAPI.getInstance().createLocalEndpointsConfig({ componentDir: directoryFsPath, endpoints });
		},
		onSuccess: () => setStepIndex(stepIndex + 1),
	});

	const { mutate: submitProxyConfig, isLoading: isSubmittingProxyConfig } = useMutation({
		mutationFn: (data: ComponentFormGitProxyType) => {
			return ChoreoWebViewAPI.getInstance().createLocalProxyConfig({
				componentDir: directoryFsPath,
				proxy: {
					type: data.componentConfig?.type,
					schemaFilePath: data.componentConfig?.schemaFilePath,
					docPath: data.componentConfig?.docPath,
					thumbnailPath: data.componentConfig?.thumbnailPath,
					// TODO: Re-enable this once networkVisibilities is supported in the git proxy schema
					// networkVisibilities: data.componentConfig?.networkVisibilities?.length>0 ? data.componentConfig?.networkVisibilities : undefined,
				},
			});
		},
		onSuccess: () => setStepIndex(stepIndex + 1),
	});

	const steps: StepItem[] = [
		{
			label: "General Details",
			content: (
				<ComponentFormGenDetailsSection
					{...props}
					key="gen-details-step"
					form={genDetailsForm}
					componentType={type}
					onNextClick={() => {
						gitProxyForm.setValue(
							"proxyContext",
							genDetailsForm.getValues()?.name ? `/${makeURLSafe(genDetailsForm.getValues()?.name)}` : `/path-${getRandomNumber()}`,
						);
						setStepIndex(stepIndex + 1);
					}}
				/>
			),
		},
	];

	if (type !== ChoreoComponentType.ApiProxy) {
		steps.push({
			label: "Build Details",
			content: (
				<ComponentFormBuildSection
					{...props}
					key="build-details-step"
					onNextClick={() => setStepIndex(stepIndex + 1)}
					onBackClick={() => setStepIndex(stepIndex - 1)}
					form={buildDetailsForm}
					selectedType={type}
					subPath={subPath}
					gitRoot={gitRoot}
					baseUriPath={directoryUriPath}
				/>
			),
		});
	}

	if (type === ChoreoComponentType.Service) {
		if (buildPackLang !== ChoreoBuildPackNames.MicroIntegrator || (buildPackLang === ChoreoBuildPackNames.MicroIntegrator && !useDefaultEndpoints)) {
			steps.push({
				label: "Endpoint Details",
				content: (
					<ComponentFormEndpointsSection
						{...props}
						key="endpoints-step"
						componentName={name || "component"}
						onNextClick={(data) => submitEndpoints(data.endpoints as Endpoint[])}
						onBackClick={() => setStepIndex(stepIndex - 1)}
						isSaving={isSubmittingEndpoints}
						form={endpointDetailsForm}
					/>
				),
			});
		}
	}
	if (type === ChoreoComponentType.ApiProxy) {
		steps.push({
			label: "Proxy Details",
			content: (
				<ComponentFormGitProxySection
					{...props}
					key="git-proxy-step"
					onNextClick={(data) => submitProxyConfig(data)}
					onBackClick={() => setStepIndex(stepIndex - 1)}
					isSaving={isSubmittingProxyConfig}
					form={gitProxyForm}
				/>
			),
		});
	}

	steps.push({
		label: "Summary",
		content: (
			<ComponentFormSummarySection
				{...props}
				key="summary-step"
				genDetailsForm={genDetailsForm}
				buildDetailsForm={buildDetailsForm}
				endpointDetailsForm={endpointDetailsForm}
				gitProxyForm={gitProxyForm}
				onNextClick={() => createComponent()}
				onBackClick={() => setStepIndex(stepIndex - 1)}
				isCreating={isCreatingComponent}
			/>
		),
	});

	const componentTypeText = getComponentTypeText(type);

	return (
		<div className="flex flex-row justify-center p-1 md:p-3 lg:p-4 xl:p-6">
			<div className="container">
				<form className="mx-auto flex max-w-4xl flex-col gap-2 p-4">
					<HeaderSection
						title={`Create ${["a", "e", "i", "o", "u"].includes(componentTypeText[0].toLowerCase()) ? "an" : "a"} ${componentTypeText}`}
						tags={[
							{ label: "Source Directory", value: subPath && subPath !== "." ? subPath : directoryName },
							{ label: "Project", value: project.name },
							{ label: "Organization", value: organization.name },
						]}
					/>
					<div className="mt-4 flex flex-col gap-6" ref={formSections}>
						<VerticalStepper currentStep={stepIndex} steps={steps} />
					</div>
				</form>
			</div>
		</div>
	);
};
