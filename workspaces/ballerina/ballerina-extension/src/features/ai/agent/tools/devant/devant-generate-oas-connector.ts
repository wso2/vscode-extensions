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
 * Ballerina+Devant tool: fetches an OpenAPI spec from a Devant marketplace
 * service and generates a custom Ballerina connector in the temp project.
 *
 * This combines:
 *   - Devant platform operations (fetching marketplace IDL)
 *   - Ballerina Language Server (OpenAPI client generation)
 *   - Temp project file management
 */
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { tool } from "ai";
import { z } from "zod";
import { IWso2PlatformExtensionAPI } from "@wso2/wso2-platform-core";
import { CopilotEventHandler } from "../../../utils/events";
import { WI_EXTENSION_ID } from "../../../../../utils/config";
import { platformExtStore } from "../../../../../rpc-managers/platform-ext/platform-store";
import { processOpenApiWithApiKeyAuth } from "../../../../../rpc-managers/platform-ext/platform-utils";
import { langClient } from "../../../activator";
import { applyTextEdits } from "../../utils";
import { sendAiSchemaDidOpen } from "../../../utils/project/ls-schema-notifications";
import { LIBRARY_SEARCH_TOOL } from "../library-search";

export const DEVANT_GENERATE_OAS_CONNECTOR_TOOL = "DevantGenerateOASConnectorTool";

const DevantGenerateOASConnectorInputSchema = z.object({
    serviceId: z.string().describe("The marketplace service ID"),
    connectionName: z.string().describe("Connection name (used to derive module name)"),
    securityType: z.enum(["", "oauth", "apikey"]).optional().default("").describe(
        "Authentication scheme: '' (unsecured), 'oauth' (OAuth2 client credentials), 'apikey' (API key)"
    ),
});

export function createDevantGenerateOASConnectorTool(
    eventHandler: CopilotEventHandler,
    tempProjectPath?: string,
    projectName?: string,
    modifiedFiles?: string[],
) {
    return tool({
        description: `Fetches the OpenAPI specification from a Devant marketplace service and generates a custom Ballerina connector module.

Use this tool for **REST services only** (when DevantCreateConnectionTool returns \`isRest: true\`).
If the service is not REST, or this tool fails (returns \`success: false\`), fall back to:
1. ${LIBRARY_SEARCH_TOOL} — search Ballerina Central for a matching connector
2. LibraryGetTool — get full API details for the best match

**When to call this tool:**
After DevantCreateConnectionTool returns \`isRest: true\`. Pass \`serviceId\`, \`connectionName\`, and \`detectedSecurityType\` directly from that tool's output.

**What it does:**
1. Fetches the OpenAPI IDL for the given marketplace service
2. Processes the spec (injects auth security scheme if needed)
3. Generates a complete Ballerina connector module via the Language Server

**Returns (use these values directly — DO NOT read or re-open the generated files):**
- moduleName: Name of the generated submodule (e.g. "paymentservice")
- importStatement: Import to use (e.g. "import project.paymentservice")
- generatedFiles: Array of { path, content } for each generated .bal file

**Input:**
- serviceId: Marketplace service ID (from DevantCreateConnectionTool)
- connectionName: Same connection name used in DevantCreateConnectionTool
- securityType: "" | "oauth" | "apikey" — use \`detectedSecurityType\` from DevantCreateConnectionTool`,
        inputSchema: DevantGenerateOASConnectorInputSchema,
        execute: async (input, context?: { toolCallId?: string }) => {
            const toolCallId = context?.toolCallId ?? `fallback-${Date.now()}`;

            eventHandler({
                type: "tool_call",
                toolName: DEVANT_GENERATE_OAS_CONNECTOR_TOOL,
                toolInput: input,
                toolCallId,
            });

            try {
                const result = await executeGenerateOASConnector(
                    input,
                    tempProjectPath,
                    projectName,
                    modifiedFiles,
                );

                eventHandler({
                    type: "tool_result",
                    toolName: DEVANT_GENERATE_OAS_CONNECTOR_TOOL,
                    toolCallId,
                    toolOutput: result,
                });

                return result;
            } catch (error: any) {
                const errorResult = {
                    success: false,
                    message: `Failed to generate OAS connector: ${error.message}. Consider using ${LIBRARY_SEARCH_TOOL} to find a Ballerina Central connector instead.`,
                    error: error.message,
                };

                eventHandler({
                    type: "tool_result",
                    toolName: DEVANT_GENERATE_OAS_CONNECTOR_TOOL,
                    toolCallId,
                    toolOutput: errorResult,
                });

                return errorResult;
            }
        },
    });
}

async function executeGenerateOASConnector(
    input: { serviceId: string; connectionName: string; securityType?: "" | "oauth" | "apikey" },
    tempProjectPath?: string,
    projectName?: string,
    modifiedFiles?: string[],
) {
    if (!tempProjectPath) {
        return {
            success: false,
            message: "Temp project path is not available. Cannot generate connector outside of agent context.",
        };
    }

    // Get platform extension API
    const wiExt = vscode.extensions.getExtension(WI_EXTENSION_ID);
    if (!wiExt) {
        return {
            success: false,
            message: "WSO2 Platform extension is not installed.",
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

    // Get org context
    const state = platformExtStore.getState().state;
    const orgId = state?.selectedContext?.org?.id?.toString();
    if (!orgId) {
        return {
            success: false,
            message: "No Devant organization selected. Please associate your workspace with a Devant project.",
        };
    }

    // Fetch marketplace IDL
    const serviceIdl = await cloudAPIs.getMarketplaceIdl({
        orgId,
        serviceId: input.serviceId,
    });

    if (!serviceIdl?.content) {
        return {
            success: false,
            isNonRestService: true,
            message: `No IDL content found for service ${input.serviceId}. Use ${LIBRARY_SEARCH_TOOL} to find a Ballerina Central connector instead.`,
        };
    }

    if (serviceIdl.idlType !== "OpenAPI") {
        return {
            success: false,
            isNonRestService: true,
            idlType: serviceIdl.idlType,
            message: `Service uses ${serviceIdl.idlType} (not OpenAPI). Use ${LIBRARY_SEARCH_TOOL} to find a Ballerina Central connector for this service type.`,
        };
    }

    // Process the OpenAPI spec
    const securityType = input.securityType || "";
    const processedSpec = processOpenApiWithApiKeyAuth(serviceIdl.content, securityType);

    // Derive module name
    const moduleName = input.connectionName.replace(/[_\-\s]/g, "").toLowerCase();

    // Write spec to temp project
    const choreoDir = path.join(tempProjectPath, ".choreo");
    if (!fs.existsSync(choreoDir)) {
        fs.mkdirSync(choreoDir, { recursive: true });
    }

    const specFilePath = path.join(choreoDir, `${moduleName}-spec.yaml`);
    fs.writeFileSync(specFilePath, processedSpec, "utf8");

    if (modifiedFiles) {
        modifiedFiles.push(path.relative(tempProjectPath, specFilePath));
    }

    // Generate connector via Language Server
    const response = await langClient.openApiGenerateClient({
        openApiContractPath: specFilePath,
        projectPath: tempProjectPath,
        module: moduleName,
    });

    if (!response?.source?.textEditsMap) {
        return {
            success: false,
            message: `Language Server returned empty result for OpenAPI client generation. Use ${LIBRARY_SEARCH_TOOL} to find a Ballerina Central connector instead.`,
        };
    }

    // Apply text edits and collect generated files
    const textEditsMap = new Map(Object.entries(response.source.textEditsMap));
    const generatedFiles: Array<{ path: string; content: string }> = [];
    const importStatement = `import ${projectName || "project"}.${moduleName}`;

    for (const [filePath, edits] of textEditsMap.entries()) {
        await applyTextEdits(filePath, edits);

        const relativePath = path.relative(tempProjectPath, filePath);

        // Send didOpen notification for AI schema
        sendAiSchemaDidOpen(tempProjectPath, relativePath);

        // Collect .bal files for agent visibility
        if (filePath.endsWith(".bal") && edits.length > 0) {
            generatedFiles.push({
                path: relativePath,
                content: edits[0].newText,
            });
        }

        // Track all generated files
        if (modifiedFiles) {
            modifiedFiles.push(relativePath);
        }
    }

    return {
        success: true,
        moduleName,
        importStatement,
        generatedFiles,
        message: `Successfully generated Ballerina connector module "${moduleName}" from OpenAPI spec. Use import: ${importStatement}`,
    };
}
