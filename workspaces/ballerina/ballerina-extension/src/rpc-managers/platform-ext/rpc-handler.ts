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

import { getMarketplaceItems, getSelectedContext, isLoggedIn, getDirectoryComponents, getMarketplaceIdl, createDevantComponentConnection } from "@wso2/ballerina-core";
import { Messenger } from "vscode-messenger";
import { PlatformExtRpcManager } from "./rpc-manager";
import { GetMarketplaceIdlReq, GetMarketplaceListReq } from "@wso2/wso2-platform-core";
import { CreateDevantConnectionReq } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";

export function registerPlatformExtRpcHandlers(messenger: Messenger) {
    const rpcManger = new PlatformExtRpcManager();
    
    messenger.onRequest(isLoggedIn, () => rpcManger.isLoggedIn());
    messenger.onRequest(getMarketplaceItems, (params: GetMarketplaceListReq) => rpcManger.getMarketplaceItems(params));
    messenger.onRequest(getSelectedContext, () => rpcManger.getSelectedContext());
    messenger.onRequest(getDirectoryComponents, (fsPath: string) => rpcManger.getDirectoryComponents(fsPath));
    messenger.onRequest(getMarketplaceIdl, (params: GetMarketplaceIdlReq) => rpcManger.getMarketplaceIdl(params));
    messenger.onRequest(createDevantComponentConnection, (params: CreateDevantConnectionReq) => rpcManger.createDevantComponentConnection(params));
}
