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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ChoreoBuildPackNames,
	ChoreoComponentType,
	ChoreoImplementationType,
	type ComponentSelectionItem,
	type CreateComponentReq,
	type Endpoint,
	GitProvider,
	type ComponentFormWebviewProps,
	type SubmitComponentCreateReq,
	WebAppSPATypes,
	buildGitURL,
	getComponentTypeText,
	getIntegrationComponentTypeText,
	getIntegrationTypeFromComponentType,
	getRandomNumber,
	getTypeOfIntegrationType,
	makeURLSafe,
	parseGitURL,
} from "@wso2/wso2-platform-core";
import React, { type FC, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod/v3";
import { HeaderSection } from "../../components/HeaderSection";
import type { HeaderTag } from "../../components/HeaderSection/HeaderSection";
import { type StepItem, VerticalStepper } from "../../components/VerticalStepper";
import { queryKeys, useComponentList } from "../../hooks/use-queries";
import { useExtWebviewContext } from "../../providers/ext-vewview-ctx-provider";
import { ChoreoWebViewAPI } from "../../utilities/vscode-webview-rpc";
import {
	type componentBuildDetailsSchema,
	type componentEndpointsFormSchema,
	type componentGeneralDetailsSchema,
	type componentGitProxyFormSchema,
	type componentRepoInitSchema,
	getComponentEndpointsFormSchema,
	getComponentFormSchemaBuildDetails,
	getComponentFormSchemaGenDetails,
	getComponentGitProxyFormSchema,
	getRepoInitSchemaGenDetails,
	sampleEndpointItem,
} from "./componentFormSchema";
import { useMultiComponentFormData } from "./hooks";
import { ComponentFormBuildSection } from "./sections/ComponentFormBuildSection";
import { ComponentFormEndpointsSection } from "./sections/ComponentFormEndpointsSection";
import { ComponentFormGenDetailsSection } from "./sections/ComponentFormGenDetailsSection";
import { ComponentFormGitProxySection } from "./sections/ComponentFormGitProxySection";
import { ComponentFormRepoInitSection } from "./sections/ComponentFormRepoInitSection";
import { ComponentFormSummarySection } from "./sections/ComponentFormSummarySection";

type ComponentFormGenDetailsType = z.infer<typeof componentGeneralDetailsSchema>;
type ComponentRepoInitType = z.infer<typeof componentRepoInitSchema>;
type ComponentFormBuildDetailsType = z.infer<typeof componentBuildDetailsSchema>;
type ComponentFormEndpointsType = z.infer<typeof componentEndpointsFormSchema>;
type ComponentFormGitProxyType = z.infer<typeof componentGitProxyFormSchema>;

export const ComponentFormView: FC<ComponentFormWebviewProps> = (props) => {
	const {
		project,
		organization,
		components,
		existingComponents: existingComponentsCache,
		rootDirectory,
	} = props;

	// Support multiple components - currently working with the first component (can be extended for multi-component wizard)
	const [currentComponentIndex, setCurrentComponentIndex] = useState(0);
	const currentComponent = components[currentComponentIndex];
	const isMultiComponentMode = components.length > 1;

	// State for component selection in multi-component mode
	const [selectedComponents, setSelectedComponents] = useState<ComponentSelectionItem[]>(() =>
		components.map((comp, index) => {
			// For Devant, convert ChoreoComponentType to DevantScopes for UI consistency
			let componentType = comp.initialValues?.type || ChoreoComponentType.Service;
			if (props.extensionName === "Devant" && comp.initialValues?.type) {
				const convertedType = getIntegrationTypeFromComponentType(
					comp.initialValues.type,
					comp.initialValues?.subType
				);
				componentType = convertedType || comp.initialValues.type;
			}
			
			return {
				index,
				selected: true, // Select all by default (library components must always be selected)
				componentType,
				name: comp.initialValues?.name || comp.directoryName,
				directoryName: comp.directoryName
			};
		}),
	);

	// Hook to manage per-component form data (build details, endpoints, proxy config) for multi-component mode
	const {
		componentDataMap,
		isDataLoaded: isMultiComponentDataLoaded,
	} = useMultiComponentFormData(components, selectedComponents, isMultiComponentMode);

	// Destructure current component properties
	const { directoryFsPath, directoryUriPath, directoryName, initialValues, isNewCodeServerComp } = currentComponent;

	// Create flattened props for section components (combines common props with current component config)
	const sectionProps = {
		type: props.type,
		organization,
		project,
		existingComponents: existingComponentsCache,
		extensionName: props.extensionName,
		directoryFsPath,
		directoryUriPath,
		directoryName,
		initialValues,
		isNewCodeServerComp,
	};

	const type = initialValues?.type;
	const queryClient = useQueryClient();
	const [formSections] = useAutoAnimate();
	const { extensionName } = useExtWebviewContext();

	const [stepIndex, setStepIndex] = useState(0);

	const { data: existingComponents = [] } = useComponentList(project, organization, { initialData: existingComponentsCache });

	const genDetailsForm = useForm<ComponentFormGenDetailsType>({
		resolver: zodResolver(getComponentFormSchemaGenDetails(existingComponents, isMultiComponentMode)),
		mode: "all",
		defaultValues: { name: initialValues?.name || "", subPath: "", gitRoot: "", repoUrl: "", branch: "", credential: "", gitProvider: "" },
	});

	const repoInitForm = useForm<ComponentRepoInitType>({
		resolver: zodResolver(getRepoInitSchemaGenDetails(existingComponents)),
		mode: "all",
		defaultValues: {
			org: "",
			repo: "",
			branch: "main",
			subPath: "/",
			name: initialValues?.name || "",
			gitProvider: GitProvider.GITHUB,
			serverUrl: "",
		},
	});

	const name = genDetailsForm.watch("name");
	const gitRoot = genDetailsForm.watch("gitRoot");
	const subPath = genDetailsForm.watch("subPath");

	const buildDetailsForm = useForm<ComponentFormBuildDetailsType>({
		resolver: zodResolver(getComponentFormSchemaBuildDetails(type, directoryFsPath, gitRoot)),
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

	const endpointDetailsForm = useForm<ComponentFormEndpointsType, any, ComponentFormEndpointsType>({
		resolver: zodResolver(getComponentEndpointsFormSchema(directoryFsPath)),
		mode: "all",
		defaultValues: { endpoints: [] },
	});

	const gitProxyForm = useForm<ComponentFormGitProxyType>({
		resolver: zodResolver(getComponentGitProxyFormSchema(directoryFsPath)),
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

	const { mutateAsync: initializeRepoAsync, isLoading: initializingRepo } = useMutation({
		mutationFn: async () => {
			if (isNewCodeServerComp) {
				const repoInitDetails = repoInitForm.getValues();
				const repoUrl = buildGitURL(repoInitDetails?.orgHandler, repoInitDetails.repo, repoInitDetails.gitProvider, false, repoInitDetails.serverUrl);
				const branchesCache: string[] = queryClient.getQueryData(queryKeys.getGitBranches(repoUrl, organization, "", true));
				const newWorkspacePath = await ChoreoWebViewAPI.getInstance().cloneRepositoryIntoCompDir({
					cwd: directoryFsPath,
					subpath: repoInitDetails.subPath,
					org: props.organization,
					componentName: makeURLSafe(repoInitDetails.name),
					repo: {
						orgHandler: repoInitDetails.orgHandler,
						orgName: repoInitDetails.org,
						branch: branchesCache?.length > 0 ? repoInitDetails.branch : undefined,
						provider: repoInitDetails.gitProvider,
						repo: repoInitDetails.repo,
						serverUrl: repoInitDetails.serverUrl,
						secretRef: repoInitDetails.credential || "",
						isBareRepo: !(branchesCache?.length > 0),
					},
				});

				return newWorkspacePath;
			}
		},
	});

	const { mutate: createComponent, isLoading: isCreatingComponent } = useMutation({
		mutationFn: async (newWorkspaceDir?: string) => {
			const genDetails = genDetailsForm.getValues();
			const repoInitDetails = repoInitForm.getValues();

			// Multi-component mode: use batch creation for optimized flow
			if (isMultiComponentMode) {
				const selectedToCreate = selectedComponents.filter((comp) => comp.selected);
				if (selectedToCreate.length === 0) {
					console.error("No components selected for batch creation");
					return;
				}
				const parsedRepo = parseGitURL(genDetails.repoUrl);
				if (!parsedRepo) {
				    console.error("Invalid repo URL", genDetails.repoUrl);
				    return;
				}
				const provider = parsedRepo[2];

				// Build array of component creation requests
				const componentRequests = selectedToCreate
					.map((selectedComp) => {
						if (selectedComp.componentType === "library") {
							// Library components are not created on Devant.
							return null;
						}
						const componentConfig = components[selectedComp.index];
						const componentFormData = componentDataMap.get(selectedComp.index);

						if (!componentConfig || !componentFormData) {
							console.error(`Missing data for component at index ${selectedComp.index}`);
							return null;
						}

						// Map DevantScopes (e.g., "AUTOMATION") to ChoreoComponentType (e.g., "ScheduledTask")
						const mappedType = getTypeOfIntegrationType(selectedComp.componentType);
						const compType = mappedType.type || selectedComp.componentType;
						const compSubType = mappedType.subType || componentConfig.initialValues?.subType || "";

						const compName = selectedComp.name;
						const compBuildDetails = componentFormData.buildDetails;

						const createParams: Partial<CreateComponentReq> = {
							orgId: organization.id.toString(),
							orgUUID: organization.uuid,
							projectId: project.id,
							projectHandle: project.handler,
							name: makeURLSafe(compName),
							displayName: compName,
							type: compType,
							componentSubType: compSubType,
							buildPackLang: componentConfig.initialValues?.buildPackLang || compBuildDetails.buildPackLang,
							componentDir: componentConfig.directoryFsPath,
							repoUrl: genDetails.repoUrl,
							gitProvider: provider,
							branch: genDetails.branch,
							langVersion: compBuildDetails.langVersion,
							port: compBuildDetails.webAppPort,
							originCloud: extensionName === "Devant" ? "devant" : "choreo",
						};

						if (provider !== GitProvider.GITHUB) {
							createParams.gitCredRef = genDetails?.credential;
						}

						if (WebAppSPATypes.includes(compBuildDetails.buildPackLang as ChoreoBuildPackNames)) {
							createParams.spaBuildCommand = compBuildDetails.spaBuildCommand;
							createParams.spaNodeVersion = compBuildDetails.spaNodeVersion;
							createParams.spaOutputDir = compBuildDetails.spaOutputDir;
						}

						return {
							createParams: createParams as CreateComponentReq,
							autoBuildOnCommit: compType === ChoreoComponentType.ApiProxy ? false : compBuildDetails?.autoBuildOnCommit,
							type: compType,
						};
					})
					.filter((req): req is NonNullable<typeof req> => req !== null);

				// Use batch API for optimized creation with single progress notification
				const result = await ChoreoWebViewAPI.getInstance().submitBatchComponentCreate({
					org: organization,
					project: project,
					components: componentRequests,
				});

				// Close webview after batch processing completes (extension handles success/error messages)
				if (result.created.length > 0) {
					ChoreoWebViewAPI.getInstance().closeWebView();
				}
				return;
			}

			// Single component mode
			const buildDetails = buildDetailsForm.getValues();
			const gitProxyDetails = gitProxyForm.getValues();

			const name = isNewCodeServerComp ? repoInitDetails.name : genDetails.name;
			const componentName = makeURLSafe(isNewCodeServerComp ? repoInitDetails.name : genDetails.name);
			const branch = isNewCodeServerComp ? repoInitDetails.branch : genDetails.branch;
			const parsedRepo = parseGitURL(genDetails.repoUrl);
			if (!parsedRepo && !isNewCodeServerComp) {
				console.error("Invalid repo URL", genDetails.repoUrl);
				return;
			}
			const provider = isNewCodeServerComp ? repoInitDetails.gitProvider : parsedRepo[2];

			const repoUrl = isNewCodeServerComp
				? buildGitURL(repoInitDetails.orgHandler, repoInitDetails.repo, repoInitDetails.gitProvider, false, repoInitDetails.serverUrl)
				: genDetails.repoUrl;

			const createParams: Partial<CreateComponentReq> = {
				orgId: organization.id.toString(),
				orgUUID: organization.uuid,
				projectId: project.id,
				projectHandle: project.handler,
				name: componentName,
				displayName: name,
				type,
				componentSubType: initialValues?.subType || "",
				buildPackLang: buildDetails.buildPackLang,
				componentDir: newWorkspaceDir || directoryFsPath,
				repoUrl: repoUrl,
				gitProvider: provider,
				branch: branch,
				langVersion: buildDetails.langVersion,
				port: buildDetails.webAppPort,
				originCloud: extensionName === "Devant" ? "devant" : "choreo",
			};

			if (provider !== GitProvider.GITHUB) {
				createParams.gitCredRef = isNewCodeServerComp ? repoInitDetails.credential : genDetails?.credential;
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

	const handleNextClick = () => {
		gitProxyForm.setValue("proxyContext", `/${makeURLSafe(genDetailsForm.getValues()?.name)}`);
		setStepIndex(stepIndex + 1);
	};

	const steps: StepItem[] = [];

	if (isNewCodeServerComp) {
		steps.push({
			label: "Repository Details",
			content: (
				<ComponentFormRepoInitSection
					{...sectionProps}
					key="repo-init-section"
					form={repoInitForm}
					componentType={type}
					initializingRepo={initializingRepo || isCreatingComponent}
					onNextClick={async () => {
						const newDirPath = await initializeRepoAsync();
						if (steps.length > 1) {
							gitProxyForm.setValue("proxyContext", `/${makeURLSafe(genDetailsForm.getValues()?.name)}`);
							setStepIndex(stepIndex + 1);
						} else {
							createComponent(newDirPath);
						}
					}}
					rootDirectory={rootDirectory}
				/>
			),
		});
	} else {
		steps.push({
			label: "General Details",
			content: (
				<ComponentFormGenDetailsSection
					{...sectionProps}
					key="gen-details-step"
					form={genDetailsForm}
					componentType={type}
					onNextClick={handleNextClick}
					rootDirectory={rootDirectory}
					isMultiComponentMode={isMultiComponentMode}
					allComponents={components}
					selectedComponents={selectedComponents}
					onComponentSelectionChange={setSelectedComponents}
				/>
			),
		});

		// In multi-component mode, skip build/endpoint/proxy configuration steps
		// Each component uses its auto-detected/default configuration
		if (!isMultiComponentMode) {
			let showBuildDetails = false;
			if (type !== ChoreoComponentType.ApiProxy) {
				if (!initialValues?.buildPackLang) {
					showBuildDetails = true;
				} else if (
					![ChoreoBuildPackNames.Ballerina, ChoreoBuildPackNames.MicroIntegrator].includes(initialValues?.buildPackLang as ChoreoBuildPackNames)
				) {
					showBuildDetails = true;
				}
			}

			if (showBuildDetails) {
				steps.push({
					label: "Build Details",
					content: (
						<ComponentFormBuildSection
							{...sectionProps}
							key="build-details-step"
							onNextClick={() => setStepIndex(stepIndex + 1)}
							onBackClick={() => setStepIndex(stepIndex - 1)}
							form={buildDetailsForm}
							selectedType={type}
							subPath={subPath}
							gitRoot={gitRoot}
							baseUriPath={directoryUriPath}
							rootDirectory={rootDirectory}
						/>
					),
				});
			}

			if (type === ChoreoComponentType.Service && extensionName !== "Devant") {
				if (
					![ChoreoBuildPackNames.MicroIntegrator, ChoreoBuildPackNames.Ballerina].includes(buildPackLang as ChoreoBuildPackNames) ||
					([ChoreoBuildPackNames.MicroIntegrator, ChoreoBuildPackNames.Ballerina].includes(buildPackLang as ChoreoBuildPackNames) &&
						!useDefaultEndpoints)
				) {
					steps.push({
						label: "Endpoint Details",
						content: (
							<ComponentFormEndpointsSection
								{...sectionProps}
								key="endpoints-step"
								componentName={name || "component"}
								onNextClick={(data) => submitEndpoints(data.endpoints as Endpoint[])}
								onBackClick={() => setStepIndex(stepIndex - 1)}
								isSaving={isSubmittingEndpoints}
								form={endpointDetailsForm}
								rootDirectory={rootDirectory}
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
							{...sectionProps}
							key="git-proxy-step"
							onNextClick={(data) => submitProxyConfig(data)}
							onBackClick={() => setStepIndex(stepIndex - 1)}
							isSaving={isSubmittingProxyConfig}
							form={gitProxyForm}
							rootDirectory={rootDirectory}
						/>
					),
				});
			}
		}

		steps.push({
			label: "Summary",
			content: (
				<ComponentFormSummarySection
					{...sectionProps}
					key="summary-step"
					genDetailsForm={genDetailsForm}
					buildDetailsForm={buildDetailsForm}
					endpointDetailsForm={endpointDetailsForm}
					gitProxyForm={gitProxyForm}
					onNextClick={() => createComponent(undefined)}
					onBackClick={() => setStepIndex(stepIndex - 1)}
					isCreating={isCreatingComponent}
					rootDirectory={rootDirectory}
					isMultiComponentMode={isMultiComponentMode}
					allComponents={components}
					selectedComponents={selectedComponents}
					componentDataMap={componentDataMap}
					isMultiComponentDataLoaded={isMultiComponentDataLoaded}
				/>
			),
		});
	}

	const componentTypeText = extensionName === "Devant" ? getIntegrationComponentTypeText(type, initialValues?.subType) : getComponentTypeText(type);

	const headerTags: HeaderTag[] = [];

	if (!isNewCodeServerComp) {
		if (isMultiComponentMode) {
			const directoryName = rootDirectory.split(/[/\\]/).pop();
			headerTags.push({ label: "Source Directory", value: directoryName });
		} else {
			headerTags.push({ label: "Source Directory", value: subPath && subPath !== "." ? subPath : directoryName });
		}
	}
	headerTags.push({ label: "Project", value: project.name }, { label: "Organization", value: organization.name });

	return (
		<div className="flex flex-row justify-center p-1 md:p-3 lg:p-4 xl:p-6">
			<div className="container">
				<form className="mx-auto flex max-w-4xl flex-col gap-2 p-4">
					<HeaderSection
						title={
							isMultiComponentMode
								? `${extensionName === "Devant" ? "Deploy" : "Create"} Multiple Components as a Batch`
								: `${extensionName === "Devant" ? "Deploy" : "Create"} ${["a", "e", "i", "o", "u"].includes(componentTypeText[0].toLowerCase()) ? "an" : "a"} ${componentTypeText}`
						}
						tags={headerTags}
					/>

					<div className="mt-4 flex flex-col gap-6" ref={formSections}>
						<VerticalStepper currentStep={stepIndex} steps={steps} />
					</div>
				</form>
			</div>
		</div>
	);
};
