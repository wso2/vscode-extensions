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
 * Devant tool registry factory.
 * Delegates to wi-extension's exported AI tool factory so that the generic
 * Devant tools live in wi-extension while still being registered in the
 * Ballerina copilot's agent tool registry.
 *
 * Ballerina+Devant specific tools (future) should be added directly here.
 */
import * as vscode from "vscode";
import { DevantToolEventHandler } from "@wso2/wso2-platform-core";
import { CopilotEventHandler } from '../utils/events';
import { WI_EXTENSION_ID } from '../../../utils/config';
import {
    createDevantGetSelectedIntegrationTool,
    DEVANT_GET_SELECTED_INTEGRATION_TOOL,
} from './tools/devant/devant-get-selected-integration';
import {
    createDevantCreateConnectionTool,
    DEVANT_CREATE_CONNECTION_TOOL,
} from './tools/devant/devant-create-connection';
import {
    createDevantRegisterThirdPartyServiceTool,
    DEVANT_REGISTER_THIRD_PARTY_SERVICE_TOOL,
} from './tools/devant/devant-register-third-party-service';

export interface DevantToolRegistryOptions {
    eventHandler: CopilotEventHandler;
    tempProjectPath?: string;
    /** Root temp workspace path — used for computing modifiedFiles relative paths so that integrateCodeToWorkspace can resolve them. */
    rootTempPath?: string;
    modifiedFiles?: string[];
}

export async function createDevantToolRegistry(opts: DevantToolRegistryOptions) {
    const wiExt = vscode.extensions.getExtension(WI_EXTENSION_ID);
    if (!wiExt?.isActive) {
        await wiExt.activate();
    }
    const wiDevantTools = wiExt.exports.ai.createDevantToolRegistry(opts.eventHandler as unknown as DevantToolEventHandler);

    // Ballerina+Devant specific tools are added here.
    // These combine Ballerina workspace knowledge with Devant platform operations
    // and therefore belong in the ballerina extension rather than wi-extension.
    const ballerinaDevantTools = {
        [DEVANT_GET_SELECTED_INTEGRATION_TOOL]: createDevantGetSelectedIntegrationTool(opts.eventHandler),
        [DEVANT_CREATE_CONNECTION_TOOL]: createDevantCreateConnectionTool(opts.eventHandler, opts.tempProjectPath, opts.rootTempPath, opts.modifiedFiles),
        [DEVANT_REGISTER_THIRD_PARTY_SERVICE_TOOL]: createDevantRegisterThirdPartyServiceTool(opts.eventHandler),
    };

    return { ...wiDevantTools, ...ballerinaDevantTools };
}
    