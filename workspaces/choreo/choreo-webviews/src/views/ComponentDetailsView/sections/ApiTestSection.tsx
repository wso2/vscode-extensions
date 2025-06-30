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

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import type { ComponentKind, Environment, Organization } from "@wso2/choreo-core";
import classNames from "classnames";
import clipboardy from "clipboardy";
import React, { useMemo, useState, type FC } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../../components/Button";
import { Codicon } from "../../../components/Codicon";
import { Dropdown } from "../../../components/FormElements/Dropdown";
import { FormElementWrap } from "../../../components/FormElements/FormElementWrap";
import { SkeletonText } from "../../../components/SkeletonText";
import { SwaggerUI } from "../../../components/SwaggerUI";
import { SwaggerUISkeleton } from "../../../components/SwaggerUI/SwaggerUI";
import { useGetSwaggerSpec, useGetTestKey } from "../../../hooks/use-queries";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";

const MAX_RESPONSE_SIZE = 4 * 1024 * 1024;

interface SwaggerSecuritySchemasValue {
	type: string;
	name: string;
	in: string;
	scheme?: string;
	bearerFormat?: string;
}

interface SwaggerSecuritySchemas {
	key: string;
	value: SwaggerSecuritySchemasValue;
}

const endpointFormSchema = z.object({
	endpoint: z.string().min(1, "Required"),
});

type TestEndpointFormType = z.infer<typeof endpointFormSchema>;

const disableAuthorizeAndInfoPluginDefaultSecuritySchema = {
	statePlugins: {
		spec: {
			wrapSelectors: {
				servers: () => (): any[] => [],
				securityDefinitions: () => (): any => null,
				schemes: () => (): any[] => [],
			},
		},
	},
	wrapComponents: { info: () => (): any => null, authorizeBtn: () => (): any => null },
};

const disableAuthorizeAndInfoPluginCustomSecuritySchema = {
	statePlugins: { spec: { wrapSelectors: { servers: () => (): any[] => [], schemes: () => (): any[] => [] } } },
	wrapComponents: { info: () => (): any => null },
};

interface Props {
	org: Organization;
	component: ComponentKind;
	env: Environment;
	choreoEnv: string;
	endpoints: {
		revisionId: string;
		apimId: string;
		publicUrl: string;
		displayName?: string;
	}[];
}

export const ApiTestSection: FC<Props> = ({ endpoints = [], env, org, choreoEnv }) => {
	const INTERNAL_KEY_HEADER_NAME = choreoEnv === "prod" ? "api-key" : "test-key";
	const [refetchInterval, setRefetchInterval] = useState(10 * 60 * 1000);
	const [isRefreshPressed, setIsRefreshPressed] = useState(false);

	const form = useForm<TestEndpointFormType>({
		resolver: zodResolver(endpointFormSchema),
		mode: "all",
		defaultValues: { endpoint: endpoints[0]?.revisionId || "" },
	});

	const selectedEndpointId = form.watch("endpoint");

	const selectedEndpoint = endpoints.find((item) => item.revisionId === selectedEndpointId);
	const selectedEndpointRevisionId = selectedEndpoint?.revisionId || "";
	const selectedEndpointApimId = selectedEndpoint?.apimId || "";

	const { mutate: copyUrl } = useMutation({
		mutationFn: (params: { value: string; label: string }) => clipboardy.write(params.value),
		onSuccess: (_, params) => ChoreoWebViewAPI.getInstance().showInfoMsg(`${params.label} has been copied to the clipboard.`),
	});

	const {
		data: testKeyResp,
		refetch: refetchTestKey,
		isLoading: isLoadingTestKey,
		isFetching: isFetchingTestKey,
	} = useGetTestKey(selectedEndpointApimId, env, org, {
		enabled: !!selectedEndpointApimId,
		refetchInterval: refetchInterval - 15000, // Refetch every 10 minutes minus 15 seconds
		cacheTime: 0,
		onSuccess: (data) => {
			setRefetchInterval(data.validityTime * 1000);
			setIsRefreshPressed(false);
		},
	});

	const { data: swaggerSpec, isLoading: isLoadingSwagger } = useGetSwaggerSpec(selectedEndpointRevisionId, org, {
		enabled: !!selectedEndpointRevisionId,
	});

	const securitySchemas = useMemo(() => {
		if (swaggerSpec && (swaggerSpec as any)?.components?.securitySchemes) {
			const securitySchemasArray: SwaggerSecuritySchemas[] = [];
			Object.keys((swaggerSpec as any).components.securitySchemes).forEach((key) => {
				securitySchemasArray.push({ key, value: (swaggerSpec as any).components.securitySchemes[key] });
			});
			return securitySchemasArray;
		}
		return null;
	}, [swaggerSpec]);

	const getDisableAuthorizeAndInfoPlugin = () => {
		if (securitySchemas && securitySchemas.length > 1) {
			return [disableAuthorizeAndInfoPluginCustomSecuritySchema];
		}
		return [disableAuthorizeAndInfoPluginDefaultSecuritySchema];
	};

	const swaggerObj = useMemo(() => {
		let newSwaggerObj: any = null;
		if (swaggerSpec && Object.keys(swaggerSpec as any).length > 0 && selectedEndpoint?.publicUrl) {
			newSwaggerObj = swaggerSpec;
			// Checking if OpenAPI spec is 2.0 or 3.0
			if (newSwaggerObj.swagger?.startsWith("2")) {
				newSwaggerObj = {
					...newSwaggerObj,
					host: selectedEndpoint?.publicUrl.substring(8),
					basePath: selectedEndpoint?.publicUrl.slice(-1) === "/" ? "" : "/",
				};
			} else if (newSwaggerObj.openapi?.startsWith("3")) {
				newSwaggerObj = { ...newSwaggerObj, servers: [{ url: selectedEndpoint?.publicUrl }] };
			}
		}
		return newSwaggerObj;
	}, [swaggerSpec, selectedEndpoint]);

	const requestInterceptor = (req: any) => {
		req.headers[INTERNAL_KEY_HEADER_NAME] = testKeyResp?.apiKey;
		const { url } = req;
		req.url = url.replace("/*", "");
		return req;
	};

	const responseInterceptor = (response: any) => {
		if (response.status >= 200 && response.status < 300) {
			const responsePayload = response.data;
			const responseSize = new Blob([responsePayload]).size;
			if (responseSize > MAX_RESPONSE_SIZE) {
				return { ...response, text: "Response is too large to render" };
			}
		}
		return response;
	};

	return (
		<div className="flex flex-col gap-4 overflow-y-auto">
			<div className="flex flex-col gap-4 px-4 sm:px-6">
				{endpoints.length > 1 && (
					<Dropdown
						wrapClassName="max-w-xs"
						label="Endpoint"
						required
						name="endpoint"
						items={endpoints.map((item) => ({ label: item.displayName, value: item.revisionId }))}
						control={form.control}
					/>
				)}
				<FormElementWrap label="Invoke URL" wrapClassName="max-w-sm">
					<div className="flex items-center gap-2">
						<span className="line-clamp-1 break-all">{selectedEndpoint?.publicUrl}</span>
						{selectedEndpoint?.publicUrl && (
							<Button appearance="icon" onClick={() => copyUrl({ value: selectedEndpoint?.publicUrl, label: "Invocation URL" })}>
								<Codicon name="chrome-restore" className="mr-1" /> Copy
							</Button>
						)}
					</div>
				</FormElementWrap>
				<FormElementWrap label="Security Header" wrapClassName="max-w-md">
					<div className="flex items-center gap-2">
						{isLoadingTestKey || !testKeyResp?.apiKey ? (
							<SkeletonText className="w-full max-w-72" />
						) : (
							<>
								<span className="line-clamp-1 text-clip">{testKeyResp?.apiKey?.replace(/./g, "*")}</span>
								<Button
									disabled={isFetchingTestKey || !testKeyResp?.apiKey}
									appearance="icon"
									onClick={() => copyUrl({ value: testKeyResp?.apiKey, label: "Security Header" })}
								>
									<Codicon name="chrome-restore" className="mr-1" /> Copy
								</Button>
							</>
						)}
						<Button
							appearance="icon"
							disabled={isFetchingTestKey}
							onClick={() => {
								refetchTestKey();
								setIsRefreshPressed(true);
							}}
						>
							<Codicon name="refresh" className={classNames("mr-1", isFetchingTestKey && "animate-spin")} /> Regenerate
						</Button>
					</div>
				</FormElementWrap>
			</div>
			{(isLoadingSwagger || isFetchingTestKey) && <SwaggerUISkeleton className="px-4 sm:px-6" />}
			<div className="flex-1 overflow-y-auto px-4 sm:px-6">
				{swaggerObj && !isFetchingTestKey && testKeyResp?.apiKey && !isRefreshPressed && (
					<SwaggerUI
						spec={swaggerObj}
						requestInterceptor={requestInterceptor}
						responseInterceptor={responseInterceptor}
						plugins={getDisableAuthorizeAndInfoPlugin()}
						defaultModelExpandDepth={-1}
						docExpansion="list"
						tryItOutEnabled={true}
					/>
				)}
			</div>
		</div>
	);
};
