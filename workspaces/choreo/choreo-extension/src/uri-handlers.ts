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

import { IWso2PlatformExtensionAPI } from "@wso2/wso2-platform-core";
import { type ProviderResult, type Uri, extensions, window } from "vscode";
import { getLogger } from "./logger/logger";

export function activateURIHandlers() {
	window.registerUriHandler({
		handleUri(uri: Uri): ProviderResult<void> {
			getLogger().debug(`Handling URI: ${uri.toString()}`);

			if (uri.path === "/open") {
				const urlParams = new URLSearchParams(uri.query);
				const orgHandle = urlParams.get("org") || "";
				const projectHandle = urlParams.get("project") || "";
				const componentName = urlParams.get("component") || "";
				const technology = urlParams.get("technology") || "";
				const integrationType = urlParams.get("integrationType") || "";
				const integrationDisplayType = urlParams.get("integrationDisplayType") || "";

				(async () => {
					const platformExt = extensions.getExtension("wso2.wso2-platform");
					if(!platformExt){
						return
					}
					if(!platformExt.isActive){
						await platformExt.activate();
					}
					const platformExtAPI: IWso2PlatformExtensionAPI = platformExt.exports
					platformExtAPI.openClonedDir({
						orgHandle,projectHandle,componentName,technology, integrationType, integrationDisplayType
					});
				})();
			}
		},
	});
}