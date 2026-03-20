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
 * Ballerina+Devant tool: initializes a connector (custom OAS-generated or
 * Ballerina Central connector) with configuration variables by writing the
 * import statement and client initialization code to connections.bal, and
 * writing all configurable declarations to config.bal in the temp project.
 */
import * as fs from "fs";
import * as path from "path";
import { tool } from "ai";
import { z } from "zod";
import { CopilotEventHandler } from "../../../utils/events";
import { Templates } from "../../../../../rpc-managers/platform-ext/platform-utils";

export const DEVANT_INITIALIZE_CONNECTOR_TOOL = "DevantInitializeConnectorTool";

const DevantInitializeConnectorInputSchema = z.object({
    connectionName: z.string().describe("The connection variable name (e.g. 'paymentService')"),
    moduleName: z.string().describe("The connector module name (e.g. 'paymentservice' from DevantGenerateOASConnectorTool, or a Ballerina Central package module)"),
    securityType: z.enum(["", "oauth", "apikey"]).describe("Authentication scheme: '' (unsecured), 'oauth' (OAuth2), 'apikey' (API key)"),
    requireProxy: z.boolean().describe("Whether the connection requires a Devant proxy (true for Organization/Project visibility)"),
    configs: z.object({
        serviceUrlVarName: z.string().describe("Config variable name for the service URL"),
        apiKeyVarName: z.string().optional().describe("Config variable name for the API key (required for 'apikey' securityType)"),
        tokenUrlVarName: z.string().optional().describe("Config variable name for the OAuth2 token URL (required for 'oauth' securityType)"),
        clientIdVarName: z.string().optional().describe("Config variable name for the OAuth2 client ID (required for 'oauth' securityType)"),
        clientSecretVarName: z.string().optional().describe("Config variable name for the OAuth2 client secret (required for 'oauth' securityType)"),
    }).describe("Configuration variable names for initializing the connector"),
    configEntries: z.array(z.object({
        name: z.string().describe("Ballerina configurable variable name"),
        envVariableName: z.string().describe("Devant environment variable name"),
        isSecret: z.boolean().describe("Whether this config value is sensitive"),
    })).describe("Config entries from DevantCreateConnectionTool — written as configurable declarations to config.bal"),
});

export function createDevantInitializeConnectorTool(
    eventHandler: CopilotEventHandler,
    tempProjectPath?: string,
    projectName?: string,
    modifiedFiles?: string[],
) {
    return tool({
        description: `Initializes a Ballerina connector with Devant connection configurations.

Writes to two files in the project:
- **connections.bal**: import statement + client initialization code
- **config.bal**: \`configurable string\` declarations for all connection config variables (URLs, keys, tokens)

Use this tool as the final step after:
1. DevantCreateConnectionTool (created the platform connection, returned configEntries)
2. DevantGenerateOASConnectorTool or LibrarySearchTool (obtained the connector module)

**What it writes to connections.bal:**
- Import statement for the connector module
- Client initialization with auth config and service URL

**What it writes to config.bal:**
- \`import ballerina/os;\` (if not already present)
- One \`configurable string <name> = os:getEnv("<ENV_VAR>");\` per configEntry
- If requireProxy: \`import ballerina/http;\` + \`devantProxyConfig\` declaration

**Input:**
- connectionName: Variable name for the client instance
- moduleName: Connector module name (from OAS generator or Ballerina Central)
- securityType: "" | "oauth" | "apikey"
- requireProxy: true when service visibility includes ORGANIZATION or PROJECT
- configEntries: Pass the \`configEntries\` array directly from DevantCreateConnectionTool
- configs: Object with config variable names — derive from DevantCreateConnectionTool's configEntries:
  - \`serviceUrlVarName\`: name from configEntries where id === "ServiceURL"
  - \`apiKeyVarName\`: name from configEntries where id === "ChoreoAPIKey" (apikey auth)
  - \`tokenUrlVarName\`: name from configEntries where id === "TokenURL" (oauth)
  - \`clientIdVarName\`: name from configEntries where id === "ConsumerKey" (oauth)
  - \`clientSecretVarName\`: name from configEntries where id === "ConsumerSecret" (oauth)`,
        inputSchema: DevantInitializeConnectorInputSchema,
        execute: async (input, context?: { toolCallId?: string }) => {
            const toolCallId = context?.toolCallId ?? `fallback-${Date.now()}`;

            eventHandler({
                type: "tool_call",
                toolName: DEVANT_INITIALIZE_CONNECTOR_TOOL,
                toolInput: input,
                toolCallId,
            });

            try {
                const result = await executeInitializeConnector(
                    input,
                    tempProjectPath,
                    projectName,
                    modifiedFiles,
                );

                eventHandler({
                    type: "tool_result",
                    toolName: DEVANT_INITIALIZE_CONNECTOR_TOOL,
                    toolCallId,
                    toolOutput: result,
                });

                return result;
            } catch (error: any) {
                const errorResult = {
                    success: false,
                    message: `Failed to initialize connector: ${error.message}`,
                    error: error.message,
                };

                eventHandler({
                    type: "tool_result",
                    toolName: DEVANT_INITIALIZE_CONNECTOR_TOOL,
                    toolCallId,
                    toolOutput: errorResult,
                });

                return errorResult;
            }
        },
    });
}

interface InitializeConnectorInput {
    connectionName: string;
    moduleName: string;
    securityType: "" | "oauth" | "apikey";
    requireProxy: boolean;
    configs: {
        serviceUrlVarName: string;
        apiKeyVarName?: string;
        tokenUrlVarName?: string;
        clientIdVarName?: string;
        clientSecretVarName?: string;
    };
    configEntries: Array<{
        name: string;
        envVariableName: string;
        isSecret: boolean;
    }>;
}

async function executeInitializeConnector(
    input: InitializeConnectorInput,
    tempProjectPath?: string,
    projectName?: string,
    modifiedFiles?: string[],
) {
    if (!tempProjectPath) {
        return {
            success: false,
            message: "Temp project path is not available. Cannot initialize connector outside of agent context.",
        };
    }

    // Sanitize connection variable name
    const connVarName = input.connectionName.replaceAll("-", "_").replaceAll(" ", "_");

    // Build import statement and connection code using Templates
    const pkgName = projectName || "project";
    const importStatement = Templates.importConnection({ PACKAGE_NAME: pkgName, MODULE_NAME: input.moduleName });

    let connectionCode = "";
    if (input.securityType === "") {
        connectionCode = Templates.newConnectionNoSecurity({
            MODULE_NAME: input.moduleName,
            CONNECTION_NAME: connVarName,
            SERVICE_URL_VAR_NAME: input.configs.serviceUrlVarName,
        });
    } else if (input.securityType === "oauth") {
        connectionCode = Templates.newConnectionWithOAuth({
            requireProxy: input.requireProxy,
            MODULE_NAME: input.moduleName,
            CONNECTION_NAME: connVarName,
            SERVICE_URL_VAR_NAME: input.configs.serviceUrlVarName,
            API_KEY_VAR_NAME: input.configs.apiKeyVarName || "",
            TOKEN_URL: input.configs.tokenUrlVarName || "",
            CLIENT_ID: input.configs.clientIdVarName || "",
            CLIENT_SECRET: input.configs.clientSecretVarName || "",
        });
    } else if (input.securityType === "apikey") {
        connectionCode = Templates.newConnectionWithApiKey({
            requireProxy: input.requireProxy,
            MODULE_NAME: input.moduleName,
            CONNECTION_NAME: connVarName,
            SERVICE_URL_VAR_NAME: input.configs.serviceUrlVarName,
            API_KEY_VAR_NAME: input.configs.apiKeyVarName || "",
        });
    }

    // Write connections.bal
    const connectionsBal = path.join(tempProjectPath, "connections.bal");
    let connectionsContent = fs.existsSync(connectionsBal) ? fs.readFileSync(connectionsBal, "utf8") : "";
    if (!connectionsContent.includes(`import ${pkgName}.${input.moduleName}`)) {
        connectionsContent = importStatement + connectionsContent;
    }
    connectionsContent = connectionsContent + "\n" + connectionCode;
    fs.writeFileSync(connectionsBal, connectionsContent, "utf8");

    if (modifiedFiles) {
        const relativePath = path.relative(tempProjectPath, connectionsBal);
        if (!modifiedFiles.includes(relativePath)) {
            modifiedFiles.push(relativePath);
        }
    }

    // Write config.bal — configurable declarations + optional proxy config
    const configBal = path.join(tempProjectPath, "config.bal");
    let configContent = fs.existsSync(configBal) ? fs.readFileSync(configBal, "utf8") : "";
    let configChanged = false;

    if (input.configEntries.length > 0 && !configContent.includes("import ballerina/os")) {
        configContent = Templates.importBalOs() + configContent;
        configChanged = true;
    }

    for (const entry of input.configEntries) {
        if (!configContent.includes(`configurable string ${entry.name}`)) {
            configContent = configContent + Templates.newEnvConfigurable({
                CONFIG_NAME: entry.name,
                CONFIG_ENV_NAME: entry.envVariableName,
            });
            configChanged = true;
        }
    }

    if (input.requireProxy) {
        if (!configContent.includes("import ballerina/http")) {
            configContent = Templates.importBalHttp() + configContent;
            configChanged = true;
        }
        if (!configContent.includes("devantProxyConfig")) {
            configContent = configContent + Templates.proxyConfigurable();
            configChanged = true;
        }
    }

    if (configChanged) {
        fs.writeFileSync(configBal, configContent, "utf8");
        if (modifiedFiles) {
            const relativeConfigPath = path.relative(tempProjectPath, configBal);
            if (!modifiedFiles.includes(relativeConfigPath)) {
                modifiedFiles.push(relativeConfigPath);
            }
        }
    }

    return {
        success: true,
        connectionCode: connectionCode.trim(),
        importStatement: importStatement.trim(),
        filePath: "connections.bal",
        connectionVarName: connVarName,
        message: `Successfully initialized connector "${connVarName}" in connections.bal. ` +
            `Written ${input.configEntries.length} configurable declaration(s) to config.bal.` +
            (input.requireProxy ? " Proxy config (devantProxyHost, devantProxyPort, devantProxyConfig) also written to config.bal." : ""),
    };
}
