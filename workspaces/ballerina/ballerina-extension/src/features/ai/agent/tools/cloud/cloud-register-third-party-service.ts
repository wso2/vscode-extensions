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
 * Ballerina+WSO2 Cloud tool: collects runtime env config values from the user
 * via an inline webview UI, then registers a third-party service in the
 * WSO2 Cloud marketplace.
 *
 * After registration the agent should call CloudCreateConnectionTool
 * with the returned serviceId to create the actual connection.
 */
import * as vscode from "vscode";
import * as fs from "fs";
import * as crypto from "crypto";
import { tool } from "ai";
import { z } from "zod";
import { IWso2PlatformExtensionAPI, RegisterMarketplaceConfigMap } from "@wso2/wso2-platform-core";
import { CopilotEventHandler } from "../../../utils/events";
import { WI_EXTENSION_ID } from "../../../../../utils/config";
import { approvalManager } from "../../../state/ApprovalManager";
import { findUniqueConnectionName } from "../../../../../rpc-managers/platform-ext/platform-utils";
import { CLOUD_CREATE_CONNECTION_TOOL } from "./cloud-create-connection";
import { CLOUD_GET_SELECTED_INTEGRATION_TOOL } from "./cloud-get-selected-integration";

export const CLOUD_REGISTER_THIRD_PARTY_SERVICE_TOOL = "CloudRegisterThirdPartyServiceTool";

const InputSchema = z.object({
    serviceName: z.string().describe("Name of the third-party service being registered (min 3 characters)"),
    serviceType: z.enum(["REST", "GRPC", "GRAPHQL", "SOAP", "ASYNC_API"])
        .describe("The protocol / service type"),
    idlType: z.enum(["OpenAPI", "TCP"])
        .describe("The IDL type. Use 'OpenAPI' when an OpenAPI spec is available, 'TCP' otherwise"),
    idlFilePath: z.string().optional()
        .describe("Absolute path to the OpenAPI spec file if available (e.g. from ConnectorGeneratorTool)"),
    initialConfigKeys: z.array(z.object({
        key: z.string().describe("Environment config key name (e.g. smtpHost, apiKey, serviceUrl)"),
        isSecret: z.boolean().describe("Whether this is a sensitive value (password, API key, token, etc.)"),
        description: z.string().optional().describe("Human-readable description of the config"),
    })).describe("Initial environment config keys the agent has identified. The user can modify, add, or remove entries in the UI."),
    orgId: z.string().describe(`Numeric organization ID from ${CLOUD_GET_SELECTED_INTEGRATION_TOOL}`),
    orgUuid: z.string().describe(`Organization UUID from ${CLOUD_GET_SELECTED_INTEGRATION_TOOL}`),
    projectId: z.string().describe(`Project ID from ${CLOUD_GET_SELECTED_INTEGRATION_TOOL}`),
});

export function createCloudRegisterThirdPartyServiceTool(eventHandler: CopilotEventHandler) {
    return tool({
        description: `Registers a third-party service in the WSO2 Cloud marketplace by collecting runtime environment variable values from the user.

**When to use this tool:**
- The user wants to connect to an external/third-party service that is NOT already registered in the WSO2 Cloud marketplace
- After generating a custom connector from an OpenAPI spec (via ConnectorGeneratorTool) for a service not in the marketplace
- After identifying a Ballerina connector (via LibrarySearchTool) for a service not in the marketplace
- Any time the user says: "register this service", "add this as a third-party service", "connect to a new external API"

**Prerequisites:**
1. ${CLOUD_GET_SELECTED_INTEGRATION_TOOL} → provides orgId, orgUuid, projectId
2. Identify the env config keys needed (from OpenAPI spec, connector init params, or user input)

**What this tool does:**
1. Shows an inline UI in the chat for the user to review/modify env config keys and provide runtime values
2. On submit, registers the service in the WSO2 Cloud marketplace
3. Returns the registered service's serviceId

**After this tool:**
Call ${CLOUD_CREATE_CONNECTION_TOOL} with the returned serviceId to create the WSO2 Cloud connection and write config.bal/connections.bal.

**Returns:**
- \`serviceId\`: The ID of the newly registered marketplace service — pass this to ${CLOUD_CREATE_CONNECTION_TOOL}
- \`serviceName\`: The name of the registered service`,
        inputSchema: InputSchema,
        execute: async (input, context?: { toolCallId?: string }) => {
            const toolCallId = context?.toolCallId ?? `fallback-${Date.now()}`;

            eventHandler({
                type: "tool_call",
                toolName: CLOUD_REGISTER_THIRD_PARTY_SERVICE_TOOL,
                toolInput: input,
                toolCallId,
            });

            try {
                const result = await executeRegisterThirdPartyService(input, eventHandler);

                eventHandler({
                    type: "tool_result",
                    toolName: CLOUD_REGISTER_THIRD_PARTY_SERVICE_TOOL,
                    toolCallId,
                    toolOutput: result,
                });

                return result;
            } catch (error: any) {
                const errorResult = {
                    success: false,
                    message: `Failed to register third-party service: ${error.message}`,
                    error: error.message,
                };

                eventHandler({
                    type: "tool_result",
                    toolName: CLOUD_REGISTER_THIRD_PARTY_SERVICE_TOOL,
                    toolCallId,
                    toolOutput: errorResult,
                });

                return errorResult;
            }
        },
    });
}

async function executeRegisterThirdPartyService(
    input: z.infer<typeof InputSchema>,
    eventHandler: CopilotEventHandler,
) {
    // 1. Get platform extension API
    const wiExt = vscode.extensions.getExtension(WI_EXTENSION_ID);
    if (!wiExt) {
        return {
            success: false,
            message: "WSO2 Platform extension is not installed. Please install it to use WSO2 Cloud connections.",
        };
    }
    if (!wiExt.isActive) {
        await wiExt.activate();
    }
    const cloudAPIs = wiExt.exports?.cloudAPIs as IWso2PlatformExtensionAPI | undefined;
    if (!cloudAPIs) {
        return {
            success: false,
            message: "WSO2 Platform extension API is not available.",
        };
    }

    // 2. Show inline UI to collect runtime env config values from user
    const requestId = crypto.randomUUID();
    const initialConfigs = input.initialConfigKeys.map((cfg) => ({
        key: cfg.key,
        value: "",
        isSecret: cfg.isSecret,
        description: cfg.description,
    }));

    const userResponse = await approvalManager.requestEnvConfig(
        requestId,
        input.serviceName,
        initialConfigs,
        eventHandler,
    );

    if (!userResponse.provided || !userResponse.configs || userResponse.configs.length === 0) {
        // Update the chat component to show skipped state
        eventHandler({
            type: "chat_component",
            componentType: "env_config",
            id: requestId,
            data: {
                requestId,
                stage: "skipped",
                serviceName: input.serviceName,
                message: userResponse.comment || "Service registration was skipped by the user.",
            },
        } as any);

        return {
            success: false,
            reason: "USER_SKIPPED",
            message: userResponse.comment || "User skipped the env config collection. Ask the user how they would like to proceed.",
        };
    }

    // 3. Fetch existing marketplace items for unique name resolution
    const marketplaceItems = await cloudAPIs.getMarketplaceItems({
        orgId: input.orgId,
        request: {
            query: input.serviceName,
            limit: 100,
            networkVisibilityFilter: "all",
            sortBy: "createdTime",
        },
    });

    // 4. Read IDL content if provided
    let idlContent = "";
    if (input.idlFilePath) {
        try {
            const idlFileContent = await fs.promises.readFile(input.idlFilePath, { encoding: "utf-8" });
            idlContent = Buffer.from(idlFileContent).toString("base64");
        } catch {
            // IDL read failure is non-fatal — register without IDL
        }
    }

    // 5. Fetch project environments and build config map
    const envs = await cloudAPIs.getProjectEnvs({
        orgId: input.orgId,
        orgUuid: input.orgUuid,
        projectId: input.projectId,
    });

    const configs: RegisterMarketplaceConfigMap = {};
    for (const env of envs) {
        const endpointName = `${env.name}Endpoint`;
        if (env.critical) {
            configs[endpointName] = {
                name: endpointName,
                environmentTemplateIds: [env.templateId],
                values: userResponse.configs.map((item) => ({ key: item.key, value: "" })),
            };
        } else {
            configs[endpointName] = {
                name: endpointName,
                environmentTemplateIds: [env.templateId],
                values: userResponse.configs.map((item) => ({ key: item.key, value: item.value || "" })),
            };
        }
    }

    // 6. Build schema entries from user-provided configs
    const schemaEntries = userResponse.configs.map((item) => ({
        name: item.key,
        type: "string" as const,
        isSensitive: item.isSecret,
    }));

    // 7. Register the marketplace service
    const uniqueName = findUniqueConnectionName(input.serviceName, marketplaceItems?.data ?? []);

    const registeredItem = await cloudAPIs.registerMarketplaceConnection({
        orgId: input.orgId,
        orgUuid: input.orgUuid,
        projectId: input.projectId,
        serviceType: input.serviceType,
        idlType: input.idlType,
        idlContent,
        configs,
        schemaEntries,
        name: uniqueName,
    });

    if (!registeredItem?.serviceId) {
        return {
            success: false,
            message: "Failed to register the third-party service in WSO2 Cloud. The API returned no result.",
        };
    }

    // 8. Re-fetch the full marketplace item details
    const marketplaceService = await cloudAPIs.getMarketplaceItem({
        orgId: input.orgId,
        serviceId: registeredItem.serviceId,
    });

    // Update inline UI to show submitted state
    eventHandler({
        type: "chat_component",
        componentType: "env_config",
        id: requestId,
        data: {
            requestId,
            stage: "submitted",
            serviceName: marketplaceService?.name || input.serviceName,
            message: `Service "${marketplaceService?.name || input.serviceName}" registered successfully.`,
        },
    } as any);

    return {
        success: true,
        serviceName: marketplaceService?.name || input.serviceName,
        serviceId: registeredItem.serviceId,
        isThirdParty: true,
        message: `Successfully registered third-party service "${marketplaceService?.name || input.serviceName}" in WSO2 Cloud marketplace. ` +
            `Now call ${CLOUD_CREATE_CONNECTION_TOOL} with serviceId="${registeredItem.serviceId}" to create the connection.`,
    };
}
