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

import { useMutation, useQuery } from "@tanstack/react-query";
import { VSCodePanelTab, VSCodePanelView, VSCodePanels } from "@vscode/webview-ui-toolkit/react";
import type { MarketplaceItem, Organization } from "@wso2/wso2-platform-core";
import * as yaml from "js-yaml";
import React, { type FC, type ReactNode } from "react";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";
import { Badge } from "../../Badge";
import { Banner } from "../../Banner";
import { Button } from "../../Button";
import { Markdown } from "../../Markdown";
import { SwaggerUI } from "../../SwaggerUI";
import { SwaggerUISkeleton } from "../../SwaggerUI/SwaggerUI";

type Props = {
	item?: MarketplaceItem;
	org: Organization;
	onCreateClick: () => void;
	directoryFsPath: string;
};

const isXML = (xml: string) => {
	const parser = new DOMParser();
	const xmlDoc = parser.parseFromString(xml, "text/xml");
	const parseErrors = xmlDoc.getElementsByTagName("parsererror");
	return parseErrors.length === 0;
};

const isSwagger = (content: string) => content.includes("swagger") || content.includes("openapi");

const getIdlFileExt = (content: string | object) => {
	if (typeof content === "object") {
		return "json";
	}

	if (isXML(content)) {
		return "xml";
	}

	if (isSwagger(content)) {
		try {
			JSON.parse(content);
			return "json";
		} catch (e) {
			try {
				yaml.load(content);
				return "yaml";
			} catch (e1) {
				return "txt";
			}
		}
	}

	return "txt";
};

const disableAuthorizeAndInfoPlugin = () => ({
	wrapComponents: { info: () => (): any => null, authorizeBtn: () => (): any => null },
});

const disableTryItOutPlugin = () => ({
	statePlugins: {
		spec: {
			wrapSelectors: {
				servers: () => (): any[] => [],
				securityDefinitions: () => (): any => null,
				schemes: () => (): any[] => [],
				allowTryItOutFor: () => () => false,
			},
		},
	},
});

export const MarketplaceItemDetails: FC<Props> = ({ item, org, onCreateClick, directoryFsPath }) => {
	let visibility = "Project";
	if (item?.visibility.includes("PUBLIC")) {
		visibility = "Public";
	} else if (item?.visibility.includes("ORGANIZATION")) {
		visibility = "Organization";
	}

	const {
		data: serviceIdl,
		error: serviceIdlError,
		isLoading: isLoadingIdl,
	} = useQuery({
		queryKey: ["marketplace_idl", { orgId: org.id, serviceId: item.serviceId, type: item.serviceType }],
		queryFn: () =>
			ChoreoWebViewAPI.getInstance().getChoreoRpcClient().getMarketplaceIdl({
				serviceId: item.serviceId,
				orgId: org.id.toString(),
			}),
	});

	const { mutate: saveApiDefinitionFile } = useMutation({
		mutationFn: async (fileContent: string | object) => {
			ChoreoWebViewAPI.getInstance().saveFile({
				baseDirectoryFs: directoryFsPath,
				fileContent: typeof fileContent === "object" ? JSON.stringify(fileContent) : fileContent,
				shouldPromptDirSelect: true,
				fileName: `idl.${getIdlFileExt(fileContent)}`,
				shouldOpen: false,
				dialogTitle: "Select directory to save IDL file",
				successMessage: `The API definition file of ${item.name} has been saved successfully within the selected directory`,
			});
		},
		onError: () => ChoreoWebViewAPI.getInstance().showErrorMsg("Failed to download file."),
	});

	const panelTabs: { key: string; title: string; view: ReactNode }[] = [
		{
			key: "api-definition",
			title: "API Definition",
			view: (
				<div className="w-full">
					<div className="flex justify-end">
						<Button
							disabled={!serviceIdl?.content}
							appearance="secondary"
							title="Download API definition"
							onClick={() => saveApiDefinitionFile(serviceIdl?.content)}
						>
							Download IDL
						</Button>
					</div>
					{serviceIdl?.content ? (
						<>
							{serviceIdl?.idlType === "OpenAPI" ? (
								<SwaggerUI
									spec={serviceIdl?.content}
									defaultModelExpandDepth={-1}
									docExpansion="list"
									tryItOutEnabled={false}
									plugins={[disableAuthorizeAndInfoPlugin, disableTryItOutPlugin]}
								/>
							) : (
								<div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center lg:px-8">
									<h4 className="font-semibold text-lg opacity-70">No preview available</h4>
									<p className="opacity-50">The IDL for this service is not available for preview. Please download the IDL to view it.</p>
								</div>
							)}
						</>
					) : (
						<>
							{isLoadingIdl && <SwaggerUISkeleton />}
							{serviceIdlError && <Banner type="error" title="Failed to load API definition" />}
						</>
					)}
				</div>
			),
		},
	];

	if (item.description?.trim()) {
		panelTabs.unshift({
			key: "overview",
			title: "Overview",
			view: <Markdown>{item.description?.trim()}</Markdown>,
		});
	}

	return (
		<div className="flex flex-col gap-2 overflow-y-auto px-4 sm:px-6">
			<div className="flex flex-wrap gap-1">
				<Badge>Type: {item?.serviceType}</Badge>
				<Badge>Version: {item?.version}</Badge>
				<Badge className="capitalize">Status: {item?.status}</Badge>
			</div>
			{item.summary?.trim() && <p className="mt-4 text-xs">{item.summary?.trim()}</p>}
			{item?.tags.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-1 opacity-80">
					{item.tags?.map((tagItem) => (
						<Badge key={tagItem} className="border-1 border-vsc-editorIndentGuide-background bg-vsc-editor-background">
							{tagItem}
						</Badge>
					))}
				</div>
			)}
			<div className="mt-3 flex flex-wrap justify-between gap-4">
				<Button onClick={onCreateClick}>Use Dependency</Button>
			</div>
			<div className="mt-5">
				<VSCodePanels>
					{panelTabs.map((item) => (
						<VSCodePanelTab id={`tab-${item.key}`} key={`tab-${item.key}`}>
							{item.title}
						</VSCodePanelTab>
					))}
					{panelTabs.map((item) => (
						<VSCodePanelView id={`view-${item.key}`} key={`view-${item.key}`}>
							{item.view}
						</VSCodePanelView>
					))}
				</VSCodePanels>
			</div>
		</div>
	);
};
