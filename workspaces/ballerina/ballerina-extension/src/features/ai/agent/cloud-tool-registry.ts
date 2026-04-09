// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

/**
 * WSO2 Cloud tool registry factory.
 * Delegates to wi-extension's exported AI tool factory so that the generic
 * WSO2 Cloud tools live in wi-extension while still being registered in the
 * Ballerina copilot's agent tool registry.
 *
 * Ballerina+WSO2 Cloud specific tools (future) should be added directly here.
 */
import * as vscode from "vscode";
import { DevantToolEventHandler } from "@wso2/wso2-platform-core";
import { CopilotEventHandler } from '../utils/events';
import { WI_EXTENSION_ID } from '../../../utils/config';
import {
    createCloudGetSelectedIntegrationTool,
    CLOUD_GET_SELECTED_INTEGRATION_TOOL,
} from './tools/cloud/cloud-get-selected-integration';
import {
    createCloudCreateConnectionTool,
    CLOUD_CREATE_CONNECTION_TOOL,
} from './tools/cloud/cloud-create-connection';
import {
    createCloudRegisterThirdPartyServiceTool,
    CLOUD_REGISTER_THIRD_PARTY_SERVICE_TOOL,
} from './tools/cloud/cloud-register-third-party-service';

export interface CloudToolRegistryOptions {
    eventHandler: CopilotEventHandler;
    tempProjectPath?: string;
    /** Root temp workspace path — used for computing modifiedFiles relative paths so that integrateCodeToWorkspace can resolve them. */
    rootTempPath?: string;
    modifiedFiles?: string[];
}

export async function createCloudToolRegistry(opts: CloudToolRegistryOptions) {
    const wiExt = vscode.extensions.getExtension(WI_EXTENSION_ID);
    if (!wiExt?.isActive) {
        await wiExt.activate();
    }
    const wiCloudTools = wiExt.exports.ai.createCloudToolRegistry(opts.eventHandler as unknown as DevantToolEventHandler);

    // Ballerina+WSO2 Cloud specific tools are added here.
    // These combine Ballerina workspace knowledge with WSO2 Cloud platform operations
    // and therefore belong in the ballerina extension rather than wi-extension.
    const ballerinaCloudTools = {
        [CLOUD_GET_SELECTED_INTEGRATION_TOOL]: createCloudGetSelectedIntegrationTool(opts.eventHandler),
        [CLOUD_CREATE_CONNECTION_TOOL]: createCloudCreateConnectionTool(opts.eventHandler, opts.tempProjectPath, opts.rootTempPath, opts.modifiedFiles),
        [CLOUD_REGISTER_THIRD_PARTY_SERVICE_TOOL]: createCloudRegisterThirdPartyServiceTool(opts.eventHandler),
    };

    return { ...wiCloudTools, ...ballerinaCloudTools };
}
    