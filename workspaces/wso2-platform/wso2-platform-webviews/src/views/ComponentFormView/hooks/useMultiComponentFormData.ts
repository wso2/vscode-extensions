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

import { useQueries } from "@tanstack/react-query";
import {
	ChoreoComponentType,
	type ComponentConfig,
	type ComponentSelectionItem,
	type Endpoint,
} from "@wso2/wso2-platform-core";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { z } from "zod/v3";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";
import type {
	componentBuildDetailsSchema,
	componentEndpointsFormSchema,
	componentGitProxyFormSchema,
} from "../componentFormSchema";
import { sampleEndpointItem } from "../componentFormSchema";

type ComponentFormBuildDetailsType = z.infer<typeof componentBuildDetailsSchema>;
type ComponentFormEndpointsType = z.infer<typeof componentEndpointsFormSchema>;
type ComponentFormGitProxyType = z.infer<typeof componentGitProxyFormSchema>;

/**
 * Per-component form data that varies between components.
 * This includes build details, endpoint details, and proxy details.
 */
export interface PerComponentFormData {
	/** Component index in the original components array */
	index: number;
	/** Build configuration for this component */
	buildDetails: ComponentFormBuildDetailsType;
	/** Endpoint configuration for Service components */
	endpointDetails: ComponentFormEndpointsType;
	/** Git proxy configuration for ApiProxy components */
	gitProxyDetails: ComponentFormGitProxyType;
	/** Whether endpoint data has been loaded from local config */
	endpointsLoaded: boolean;
	/** Whether proxy config has been loaded from local config */
	proxyConfigLoaded: boolean;
}

/**
 * Creates default build details for a component based on its initial values.
 */
const createDefaultBuildDetails = (component: ComponentConfig): ComponentFormBuildDetailsType => ({
	buildPackLang: component.initialValues?.buildPackLang ?? "",
	dockerFile: "",
	langVersion: "",
	spaBuildCommand: "npm run build",
	spaNodeVersion: "20.0.0",
	spaOutputDir: "build",
	webAppPort: 8080,
	autoBuildOnCommit: true,
	useDefaultEndpoints: true,
});

/**
 * Creates default endpoint details for a component.
 */
const createDefaultEndpointDetails = (componentName: string): ComponentFormEndpointsType => ({
	endpoints: [{ ...sampleEndpointItem, name: componentName || "endpoint-1" }],
});

/**
 * Creates default git proxy details for a component.
 */
const createDefaultGitProxyDetails = (componentName: string): ComponentFormGitProxyType => ({
	proxyTargetUrl: "",
	proxyVersion: "v1.0",
	proxyContext: `/${componentName || "proxy"}`,
	componentConfig: { type: "REST", schemaFilePath: "", docPath: "", thumbnailPath: "" },
});

/**
 * Hook to manage per-component form data for multi-component deployment.
 * 
 * In single component mode, this manages data for just one component.
 * In multi-component mode, this manages data for all selected components.
 * 
 * @param components - All component configurations
 * @param selectedComponents - Currently selected components with their configurations
 * @param isMultiComponentMode - Whether we're in multi-component mode
 */
export function useMultiComponentFormData(
	components: ComponentConfig[],
	selectedComponents: ComponentSelectionItem[],
	isMultiComponentMode: boolean,
) {
	// Store per-component form data keyed by component index
	const [componentDataMap, setComponentDataMap] = useState<Map<number, PerComponentFormData>>(() => {
		const map = new Map<number, PerComponentFormData>();
		components.forEach((comp, index) => {
			const name = comp.initialValues?.name || comp.directoryName;
			map.set(index, {
				index,
				buildDetails: createDefaultBuildDetails(comp),
				endpointDetails: createDefaultEndpointDetails(name),
				gitProxyDetails: createDefaultGitProxyDetails(name),
				endpointsLoaded: false,
				proxyConfigLoaded: false,
			});
		});
		return map;
	});

	// Get indices of selected Service components that need endpoint data
	const serviceComponentIndices = useMemo(() => {
		return selectedComponents
			.filter(
				(comp) =>
					comp.selected &&
					comp.componentType === ChoreoComponentType.Service &&
					!componentDataMap.get(comp.index)?.endpointsLoaded,
			)
			.map((comp) => comp.index);
	}, [selectedComponents, componentDataMap]);

	// Get indices of selected ApiProxy components that need proxy config data
	const proxyComponentIndices = useMemo(() => {
		return selectedComponents
			.filter(
				(comp) =>
					comp.selected &&
					comp.componentType === ChoreoComponentType.ApiProxy &&
					!componentDataMap.get(comp.index)?.proxyConfigLoaded,
			)
			.map((comp) => comp.index);
	}, [selectedComponents, componentDataMap]);

	// Fetch endpoint configs for all Service components
	const endpointQueries = useQueries({
		queries: serviceComponentIndices.map((index) => ({
			queryKey: ["service-dir-endpoints-multi", { directoryFsPath: components[index].directoryFsPath, index }],
			queryFn: async () => {
				const result = await ChoreoWebViewAPI.getInstance().readLocalEndpointsConfig(components[index].directoryFsPath);
				return { index, endpoints: result?.endpoints };
			},
			refetchOnWindowFocus: false,
			enabled: isMultiComponentMode,
		})),
	});

	// Fetch proxy configs for all ApiProxy components
	const proxyQueries = useQueries({
		queries: proxyComponentIndices.map((index) => ({
			queryKey: ["read-local-proxy-config-multi", { directoryFsPath: components[index].directoryFsPath, index }],
			queryFn: async () => {
				const result = await ChoreoWebViewAPI.getInstance().readLocalProxyConfig(components[index].directoryFsPath);
				return { index, proxy: result?.proxy };
			},
			refetchOnWindowFocus: false,
			enabled: isMultiComponentMode,
		})),
	});

	// Update component data when endpoint queries complete
	useEffect(() => {
		endpointQueries.forEach((query) => {
			if (query.isSuccess && query.data) {
				const { index, endpoints } = query.data;
				setComponentDataMap((prev) => {
					const current = prev.get(index);
					if (current && !current.endpointsLoaded) {
						const newMap = new Map(prev);
						const componentName = components[index].initialValues?.name || components[index].directoryName;
						newMap.set(index, {
							...current,
							endpointDetails: {
								endpoints: endpoints?.length > 0 ? endpoints : [{ ...sampleEndpointItem, name: componentName || "endpoint-1" }],
							},
							endpointsLoaded: true,
						});
						return newMap;
					}
					return prev;
				});
			}
		});
	}, [endpointQueries, components]);

	// Update component data when proxy queries complete
	useEffect(() => {
		proxyQueries.forEach((query) => {
			if (query.isSuccess && query.data) {
				const { index, proxy } = query.data;
				setComponentDataMap((prev) => {
					const current = prev.get(index);
					if (current && !current.proxyConfigLoaded) {
						const newMap = new Map(prev);
						newMap.set(index, {
							...current,
							gitProxyDetails: {
								...current.gitProxyDetails,
								componentConfig: {
									type: proxy?.type ?? "REST",
									schemaFilePath: proxy?.schemaFilePath ?? "",
									thumbnailPath: proxy?.thumbnailPath ?? "",
									docPath: proxy?.docPath ?? "",
								},
							},
							proxyConfigLoaded: true,
						});
						return newMap;
					}
					return prev;
				});
			}
		});
	}, [proxyQueries]);

	// Update a specific component's build details
	const updateBuildDetails = useCallback((index: number, buildDetails: Partial<ComponentFormBuildDetailsType>) => {
		setComponentDataMap((prev) => {
			const current = prev.get(index);
			if (current) {
				const newMap = new Map(prev);
				newMap.set(index, {
					...current,
					buildDetails: { ...current.buildDetails, ...buildDetails },
				});
				return newMap;
			}
			return prev;
		});
	}, []);

	// Update a specific component's endpoint details
	const updateEndpointDetails = useCallback((index: number, endpoints: Endpoint[]) => {
		setComponentDataMap((prev) => {
			const current = prev.get(index);
			if (current) {
				const newMap = new Map(prev);
				newMap.set(index, {
					...current,
					endpointDetails: { endpoints },
				});
				return newMap;
			}
			return prev;
		});
	}, []);

	// Update a specific component's git proxy details
	const updateGitProxyDetails = useCallback((index: number, gitProxyDetails: Partial<ComponentFormGitProxyType>) => {
		setComponentDataMap((prev) => {
			const current = prev.get(index);
			if (current) {
				const newMap = new Map(prev);
				newMap.set(index, {
					...current,
					gitProxyDetails: { ...current.gitProxyDetails, ...gitProxyDetails },
				});
				return newMap;
			}
			return prev;
		});
	}, []);

	// Get form data for a specific component
	const getComponentFormData = useCallback(
		(index: number): PerComponentFormData | undefined => {
			return componentDataMap.get(index);
		},
		[componentDataMap],
	);

	// Get form data for all selected components
	const getSelectedComponentsFormData = useCallback((): PerComponentFormData[] => {
		return selectedComponents
			.filter((comp) => comp.selected)
			.map((comp) => componentDataMap.get(comp.index))
			.filter((data): data is PerComponentFormData => data !== undefined);
	}, [selectedComponents, componentDataMap]);

	// Check if all endpoint/proxy data has been loaded for selected components
	const isDataLoaded = useMemo(() => {
		const selectedServiceComponents = selectedComponents.filter(
			(comp) => comp.selected && comp.componentType === ChoreoComponentType.Service,
		);
		const selectedProxyComponents = selectedComponents.filter(
			(comp) => comp.selected && comp.componentType === ChoreoComponentType.ApiProxy,
		);

		const allEndpointsLoaded = selectedServiceComponents.every(
			(comp) => componentDataMap.get(comp.index)?.endpointsLoaded,
		);
		const allProxyConfigsLoaded = selectedProxyComponents.every(
			(comp) => componentDataMap.get(comp.index)?.proxyConfigLoaded,
		);

		return allEndpointsLoaded && allProxyConfigsLoaded;
	}, [selectedComponents, componentDataMap]);

	return {
		componentDataMap,
		updateBuildDetails,
		updateEndpointDetails,
		updateGitProxyDetails,
		getComponentFormData,
		getSelectedComponentsFormData,
		isDataLoaded,
		isLoadingEndpoints: endpointQueries.some((q) => q.isLoading),
		isLoadingProxyConfigs: proxyQueries.some((q) => q.isLoading),
	};
}
