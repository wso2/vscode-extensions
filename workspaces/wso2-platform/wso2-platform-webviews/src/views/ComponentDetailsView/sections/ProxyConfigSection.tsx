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
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import {
	ChoreoComponentType,
	type ComponentKind,
	type ProxyConfig,
	ReadLocalProxyConfigResp,
	getTypeForDisplayType,
} from "@wso2/wso2-platform-core";
import React, { type FC } from "react";
import { Button } from "../../../components/Button";
import { Codicon } from "../../../components/Codicon";
import { useGoToSource } from "../../../hooks/use-queries";
import { ChoreoWebViewAPI } from "../../../utilities/vscode-webview-rpc";
import { RightPanelSection, RightPanelSectionItem } from "./RightPanelSection";

interface Props {
	directoryFsPath: string;
	proxyConfig: ProxyConfig;
	configFilePath: string;
}

export const ProxyConfigSection: FC<Props> = ({ directoryFsPath, configFilePath, proxyConfig }) => {
	const { openFile } = useGoToSource();

	return (
		<>
			{proxyConfig && Object.keys(proxyConfig).length > 0 && (
				<RightPanelSection
					key="proxy-local-config"
					title={
						<div className="flex items-center justify-between gap-2">
							<span className="line-clamp-1 break-all">Proxy Configurations</span>
							<Button appearance="icon" title="Edit proxy configurations" onClick={() => openFile([configFilePath])}>
								<Codicon name="edit" />
							</Button>
						</div>
					}
				>
					{proxyConfig?.type && <RightPanelSectionItem label="Type" value={proxyConfig?.type} />}

					{proxyConfig?.schemaFilePath && (
						<RightPanelSectionItem
							label="API Schema"
							tooltip="View API Schema"
							value={
								<VSCodeLink onClick={() => openFile([directoryFsPath, proxyConfig?.schemaFilePath])} className="text-vsc-foreground">
									View File
								</VSCodeLink>
							}
						/>
					)}
					{proxyConfig?.docPath && (
						<RightPanelSectionItem
							label="Documentation"
							tooltip="View API Documentation"
							value={
								<VSCodeLink onClick={() => openFile([directoryFsPath, proxyConfig?.docPath])} className="text-vsc-foreground">
									View File
								</VSCodeLink>
							}
						/>
					)}
					{proxyConfig?.thumbnailPath && (
						<RightPanelSectionItem
							label="Thumbnail"
							tooltip="View Thumbnail image"
							value={
								<VSCodeLink onClick={() => openFile([directoryFsPath, proxyConfig?.thumbnailPath])} className="ext-vsc-foreground">
									View File
								</VSCodeLink>
							}
						/>
					)}
					{proxyConfig?.networkVisibilities?.length > 0 && (
						<RightPanelSectionItem
							label={proxyConfig?.networkVisibilities?.length > 1 ? "Visibilities" : "Visibility"}
							value={proxyConfig?.networkVisibilities?.join(",")}
						/>
					)}
				</RightPanelSection>
			)}
		</>
	);
};
