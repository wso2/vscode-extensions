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
 * Ballerina+Devant tool: creates a Devant connection from a marketplace
 * service item in the platform backend.
 *
 * This tool combines Devant platform operations (creating connections,
 * fetching marketplace items) with Ballerina workspace knowledge.
 */
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { tool } from "ai";
import { z } from "zod";
import { ConnectionDetailed, IWso2PlatformExtensionAPI, MarketplaceItem, MarketplaceItemSchema, Project, ServiceInfoVisibilityEnum } from "@wso2/wso2-platform-core";
import { ModulePart, STKindChecker, CaptureBindingPattern } from "@wso2/syntax-tree";
import { CopilotEventHandler } from "../../../utils/events";
import { WI_EXTENSION_ID, getOrgPackageName } from "../../../../../utils/config";
import { platformExtStore } from "../../../../../rpc-managers/platform-ext/platform-store";
import { processOpenApiWithApiKeyAuth } from "../../../../../rpc-managers/platform-ext/platform-utils";
import { StateMachine } from "../../../../../stateMachine";
import { writeConfigBal, writeConnectionsBal } from "./devant-connection-utils";
import { log } from "../../../../../utils";

export const DEVANT_CREATE_CONNECTION_TOOL = "DevantCreateConnectionTool";

const DevantCreateConnectionInputSchema = z.object({
    serviceId: z.string().describe("The marketplace service ID (obtained from DevantListMarketplaceServicesTool)"),
    connectionName: z.string().describe("A unique name for the connection (alphanumeric and underscores, min 3 chars)"),
    orgId: z.string().describe("Numeric organization ID from DevantGetSelectedIntegrationTool"),
    orgUuid: z.string().describe("Organization UUID from DevantGetSelectedIntegrationTool"),
    projectId: z.string().describe("Project ID from DevantGetSelectedIntegrationTool"),
    componentId: z.string().describe("Component ID from DevantGetSelectedIntegrationTool (empty string for project-level connections)"),
    componentType: z.string().describe("Component type from DevantGetSelectedIntegrationTool (empty string for project-level connections)"),
});

export function createDevantCreateConnectionTool(
    eventHandler: CopilotEventHandler,
    tempProjectPath?: string,
    rootTempPath?: string,
    modifiedFiles?: string[],
) {
    return tool({
        description: `Creates a Devant connection from a marketplace service and initializes configuration files.

**Prerequisites (call in order):**
1. DevantGetSelectedIntegrationTool → provides orgId, orgUuid, projectId, componentId, componentType, connectionScope
2. DevantListMarketplaceServicesTool → provides serviceId

**When to use this tool:**
- Connect to an API service or external service
- Integrate with an internal service (running in Devant)
- Integrate with a 3rd party API service (e.g. Salesforce, GitHub, Stripe)
- Any time user says: "connect to X", "use the X service", "call the X API", "add a connection to X"

**Connection scope:**
- Pass \`componentId\` from DevantGetSelectedIntegrationTool as-is:
  - Non-empty → integration-level connection (scoped to that component)
  - Empty string → project-level connection (no integration selected)

**connectionName rules (enforced automatically, but suggest a clean name):**
- Only letters, digits, underscores — no spaces or special characters
- Must not start with a digit
- Must be unique in connections.bal — a numeric suffix (2, 3, …) is added automatically if already taken
- The resolved name is returned as \`resolvedConnectionName\` — use it for all subsequent tools

**What this tool does:**
1. Sanitizes and resolves a unique connectionName
2. Fetches the marketplace item details (serviceType, visibility, connection schemas)
3. Creates the connection record in the Devant platform backend
4. For REST services: fetches the OpenAPI spec from the marketplace, injects auth schemes, and saves the spec
5. Writes configurable declarations to \`config.bal\` (service URL, API keys, OAuth tokens, proxy config)
6. For REST services with spec: writes import + client initialization to \`connections.bal\`

**Returns:**
- \`resolvedConnectionName\`: The actual connection variable name used (may differ from input if sanitized/suffixed)
- \`isRest\`: true → includes \`specFilePath\` and \`moduleName\` for ConnectorGeneratorTool; false → use LibrarySearchTool
- \`specFilePath\`: (if REST) path to the pre-saved OpenAPI spec file — pass to ConnectorGeneratorTool
- \`moduleName\`: (if REST) derived module name for the connector
- \`detectedSecurityType\`: "" | "oauth" | "apikey"
- \`requireProxy\`: true when the service has ORGANIZATION or PROJECT visibility
- \`configEntries\`: array of { id, name, envVariableName, isSecret }
- \`connectionCode\`: (if written) the client initialization code written to connections.bal
- \`importStatement\`: (if written) the import statement written to connections.bal`,
        inputSchema: DevantCreateConnectionInputSchema,
        execute: async (input, context?: { toolCallId?: string }) => {
            const toolCallId = context?.toolCallId ?? `fallback-${Date.now()}`;

            eventHandler({
                type: "tool_call",
                toolName: DEVANT_CREATE_CONNECTION_TOOL,
                toolInput: input,
                toolCallId,
            });

            try {
                const result = await executeCreateConnection(input, tempProjectPath, rootTempPath, modifiedFiles);

                eventHandler({
                    type: "tool_result",
                    toolName: DEVANT_CREATE_CONNECTION_TOOL,
                    toolCallId,
                    toolOutput: result,
                });

                return result;
            } catch (error: any) {
                const errorResult = {
                    success: false,
                    message: `Failed to create Devant connection: ${error.message}`,
                    error: error.message,
                };

                eventHandler({
                    type: "tool_result",
                    toolName: DEVANT_CREATE_CONNECTION_TOOL,
                    toolCallId,
                    toolOutput: errorResult,
                });

                return errorResult;
            }
        },
    });
}

async function executeCreateConnection(
    input: {
        serviceId: string;
        connectionName: string;
        orgId: string;
        orgUuid: string;
        projectId: string;
        componentId: string;
        componentType: string;
    },
    tempProjectPath?: string,
    rootTempPath?: string,
    modifiedFiles?: string[],
) {
    // 1. Sanitize the raw name into a valid Ballerina identifier (no API calls needed)
    const sanitized = sanitizeName(input.connectionName);

    // 2. Get platform extension API
    const wiExt = vscode.extensions.getExtension(WI_EXTENSION_ID);
    if (!wiExt) {
        return {
            success: false,
            message: "WSO2 Platform extension is not installed. Please install it to use Devant connections.",
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

    const { orgId, orgUuid, projectId, componentId, componentType } = input;


    // Fetch marketplace item details
    const marketplaceItem = await cloudAPIs.getMarketplaceItem({
        orgId,
        serviceId: input.serviceId,
    });

    if (!marketplaceItem) {
        return {
            success: false,
            message: `Marketplace service not found for serviceId: ${input.serviceId}`,
        };
    }

    // 3. Collect existing names from connections.bal (ST) and Devant platform in parallel,
    //    then resolve to a unique candidate before making any platform mutation calls.
    const [localNames, devantNames] = await Promise.all([
        getExistingConnectionNamesFromFile(tempProjectPath
            ? path.join(tempProjectPath, "connections.bal")
            : undefined),
        getExistingDevantConnectionNames(cloudAPIs, orgId, projectId),
    ]);
    const existingNames = new Set([...localNames, ...devantNames]);
    const resolvedConnectionName = resolveUniqueName(sanitized, existingNames);

    const isRest = marketplaceItem.serviceType === "REST";
    const isThirdParty = !!marketplaceItem.isThirdParty;
    const defaultSchema = getPossibleSchema(marketplaceItem, input.projectId);

    let connectionDetailed: ConnectionDetailed;

    if (!isThirdParty) {
        // Internal service connection
        // const visibilities = getPossibleVisibilities(marketplaceItem, input.projectId);
        connectionDetailed = await cloudAPIs.createComponentConnection({
            orgId,
            orgUuid,
            projectId,
            componentId,
            componentPath: "",
            componentType: componentType,
            serviceId: input.serviceId,
            serviceVisibility: getVisibilityOfConnectionSchema(defaultSchema),
            serviceSchemaId: defaultSchema?.id || "",
            name: resolvedConnectionName,
            generateCreds: true,
        });
    } else {
        // Third-party service connection
        const sensitiveKeys: string[] = [];

        if (defaultSchema?.entries) {
            for (const entry of defaultSchema.entries) {
                if (entry.isSensitive) {
                    sensitiveKeys.push(entry.name);
                }
            }
        }

        connectionDetailed = await cloudAPIs.createThirdPartyConnection({
            orgId,
            orgUuid,
            projectId,
            componentId,
            name: resolvedConnectionName,
            serviceId: input.serviceId,
            serviceSchemaId: defaultSchema?.id || "",
            endpointRefs: marketplaceItem.endpointRefs,
            sensitiveKeys,
        });
    }

    if (!connectionDetailed) {
        return {
            success: false,
            message: "Failed to create connection in Devant platform. The API returned no result.",
        };
    }

    // Extract configuration entries for the agent
    const envIds = Object.keys(connectionDetailed.configurations || {});
    const firstEnvConfig = envIds.length > 0 ? connectionDetailed.configurations[envIds[0]] : undefined;

    // Derive Ballerina configurable variable names, ensuring uniqueness against
    // existing config variables already declared in the project.
    const connPrefix = resolvedConnectionName.replace(/[^a-zA-Z0-9]/g, "");
    const existingConfigVarNames = await getExistingConfigVariableNames(tempProjectPath);
    const configEntries = firstEnvConfig?.entries
        ? Object.entries(firstEnvConfig.entries).map(([entryKey, entry]) => {
            // entryKey is like "ChoreoAPIKey", "ServiceURL", "ConsumerKey" etc.
            // Build a Ballerina variable name: {connPrefix}{EntryKey} → e.g. "paymentServiceServiceURL"
            const baseName = connPrefix + entryKey.charAt(0).toUpperCase() + entryKey.slice(1);
            const name = resolveUniqueName(baseName, existingConfigVarNames);
            existingConfigVarNames.add(name); // prevent within-batch collisions
            return {
                id: entryKey,
                name,                           // Ballerina configurable variable name
                envVariableName: entry.envVariableName,
                isSecret: entry.isSensitive,
            };
        })
        : [];

    // Detect security type and proxy requirement from the connection's schema name.
    // Both use connectionDetailed.schemaName — mirrors DevantConnectorPopup.tsx and rpc-manager.ts.
    const schemaName = connectionDetailed.schemaName?.toLowerCase() ?? "";

    let detectedSecurityType: "" | "oauth" | "apikey" = "";
    if (!isThirdParty) {
        detectedSecurityType = schemaName?.toLowerCase().includes("oauth") ? "oauth" : "apikey";
    }

    // requireProxy mirrors rpc-manager.ts:821-824 — using the same ServiceInfoVisibilityEnum.
    // Third-party services always default to PUBLIC visibility → no proxy needed.
    const visibility = getVisibilityOfConnectionSchema(defaultSchema);
    const requireProxy = !isThirdParty && [
        ServiceInfoVisibilityEnum.Organization.toString(),
        ServiceInfoVisibilityEnum.Project.toString(),
    ].includes(visibility);

    // For REST services, fetch the OpenAPI spec from the marketplace and save it for
    // ConnectorGeneratorTool to use directly (avoiding a separate tool round-trip).
    let specFilePath: string | undefined;
    let moduleName: string | undefined;

    if (isRest && tempProjectPath) {
        try {
            const serviceIdl = await cloudAPIs.getMarketplaceIdl({
                orgId,
                serviceId: input.serviceId,
            });

            if (serviceIdl?.content && serviceIdl.idlType === "OpenAPI") {
                const processedSpec = processOpenApiWithApiKeyAuth(serviceIdl.content, detectedSecurityType);
                moduleName = resolvedConnectionName.replace(/[_\-\s]/g, "").toLowerCase();

                const choreoDir = path.join(tempProjectPath, ".choreo");
                if (!fs.existsSync(choreoDir)) {
                    fs.mkdirSync(choreoDir, { recursive: true });
                }

                specFilePath = path.join(choreoDir, `${moduleName}-spec.yaml`);
                fs.writeFileSync(specFilePath, processedSpec, "utf8");

                if (modifiedFiles) {
                    const trackingBase = rootTempPath || tempProjectPath;
                    modifiedFiles.push(path.relative(trackingBase, specFilePath));
                }
            }
        } catch {
            // IDL fetch failure is non-fatal — agent will fall back to LibrarySearchTool
        }
    }

    // Write config.bal and connections.bal using shared Templates (same as GUI flow).
    // This is done eagerly so the agent doesn't need a separate initialization step.
    let connectionCode = "";
    let importStatement = "";

    if (tempProjectPath && configEntries.length > 0) {
        // --- config.bal (always written) ---
        writeConfigBal({
            tempProjectPath,
            configEntries,
            requireProxy,
            rootTempPath,
            modifiedFiles,
        });

        // --- connections.bal (only when module name is known — REST with spec) ---
        const { packageName: pkgName } = getOrgPackageName(tempProjectPath);
        if (pkgName && moduleName) {
            const result = writeConnectionsBal({
                tempProjectPath,
                packageName: pkgName,
                moduleName,
                connectionName: resolvedConnectionName,
                securityType: detectedSecurityType,
                requireProxy,
                configEntries,
                rootTempPath,
                modifiedFiles,
            });
            connectionCode = result.connectionCode;
            importStatement = result.importStatement;
        }
    }

    // Update component YAML with connection config
    if (tempProjectPath){
        try {
            const componentYamlPath = await cloudAPIs.createConnectionConfig({
                componentDir: tempProjectPath,
                name: resolvedConnectionName,
                visibility,
                marketplaceItem,
            });
            if (componentYamlPath && modifiedFiles) {
                const trackingBase = rootTempPath || tempProjectPath;
                modifiedFiles.push(path.relative(trackingBase, componentYamlPath));
            }
        } catch (err){
            // non-fatal — component YAML update is best-effort
            log("Failed to write connection config to component YAML: " + (err as Error).message);
        }
    }

    return {
        success: true,
        serviceType: marketplaceItem.serviceType,
        isRest,
        isThirdParty,
        resolvedConnectionName,
        connectionName: resolvedConnectionName,
        serviceName: marketplaceItem.name,
        detectedSecurityType,
        requireProxy,
        configEntries,
        specFilePath,
        moduleName,
        connectionCode: connectionCode.trim() || undefined,
        importStatement: importStatement.trim() || undefined,
        message: `Successfully created Devant connection "${resolvedConnectionName}" for service "${marketplaceItem.name}" (${marketplaceItem.serviceType}).` +
            (resolvedConnectionName !== input.connectionName ? ` Note: connection name was resolved to "${resolvedConnectionName}" (sanitized/suffixed for uniqueness).` : "") +
            (requireProxy ? " This service uses ORGANIZATION or PROJECT visibility — proxy config has been written to config.bal." : "") +
            (connectionCode ? ` Connection initialization written to connections.bal and config.bal.` : "") +
            (isRest && specFilePath
                ? ` This is a REST service — call ConnectorGeneratorTool with specFilePath="${specFilePath}" and moduleName="${moduleName}" to generate a Ballerina connector. After generation, connections.bal will be ready to use.`
                : isRest
                    ? " This is a REST service but the OpenAPI spec could not be fetched — use LibrarySearchTool to find a Ballerina Central connector, then call DevantWriteConnectionTool with the library module name to write connections.bal."
                    : " This is a non-REST service — use LibrarySearchTool to find an appropriate Ballerina Central connector, then call DevantWriteConnectionTool with the library module name to write connections.bal."),
    };
}

const getPossibleSchema = (marketplaceItem: MarketplaceItem, projectId: string) => {
    const projectLevel = marketplaceItem.connectionSchemas.find((schema) => schema.name?.toLowerCase().includes("project"));
    if (projectLevel && marketplaceItem.projectId === projectId) {
        return projectLevel;
    }
    const orgLevel = marketplaceItem.connectionSchemas.find((schema) => schema.name?.toLowerCase().includes("organization"));
    if (orgLevel) {
        return orgLevel;
    }
    return marketplaceItem.connectionSchemas[0];
};

const getVisibilityOfConnectionSchema = (connectionSchema: MarketplaceItemSchema) => {
    if(connectionSchema.name?.toLowerCase().includes("project")) {
        return ServiceInfoVisibilityEnum.Project;
    } else if(connectionSchema.name?.toLowerCase().includes("organization")) {
        return ServiceInfoVisibilityEnum.Organization;
    }
    return ServiceInfoVisibilityEnum.Public;
};

/**
 * Sanitizes a raw name into a valid Ballerina identifier.
 * - Replaces spaces/special chars with underscores, keeps [a-zA-Z0-9_]
 * - Strips leading underscores, then prepends underscore if first char is a digit
 */
function sanitizeName(rawName: string): string {
    let sanitized = rawName.replace(/[^a-zA-Z0-9_]/g, "_");
    sanitized = sanitized.replace(/^_+/, "") || "connection";
    if (/^\d/.test(sanitized)) {
        sanitized = "_" + sanitized;
    }
    return sanitized;
}

/**
 * Appends a numeric suffix (2, 3, …) to `base` until the candidate
 * is not present in `existingNames`.
 */
function resolveUniqueName(base: string, existingNames: Set<string>): string {
    let candidate = base;
    let suffix = 2;
    while (existingNames.has(candidate)) {
        candidate = `${base}${suffix}`;
        suffix++;
    }
    return candidate;
}

/**
 * Returns all module-level variable declaration names in connections.bal
 * by traversing its syntax tree. Mirrors the pattern in DevantConnectorPopup.tsx.
 * Returns an empty set if the file doesn't exist or the ST fetch fails.
 */
async function getExistingConnectionNamesFromFile(connectionsBal?: string): Promise<Set<string>> {
    const names = new Set<string>();
    if (!connectionsBal || !fs.existsSync(connectionsBal)) {
        return names;
    }
    try {
        const uri = vscode.Uri.file(connectionsBal).toString();
        StateMachine;
        const stResp = await StateMachine.context().langClient.getSyntaxTree({ documentIdentifier: { uri } }) as any;
        for (const member of (stResp?.syntaxTree as ModulePart)?.members ?? []) {
            if (STKindChecker.isModuleVarDecl(member)) {
                const bindingPattern = member.typedBindingPattern?.bindingPattern;
                if (STKindChecker.isCaptureBindingPattern(bindingPattern)) {
                    const varName = (bindingPattern as CaptureBindingPattern).variableName?.value;
                    if (varName) {
                        names.add(varName);
                    }
                }
            }
        }
    } catch {
        // ST fetch failed — return what we have so far
    }
    return names;
}

/**
 * Fetches all existing Devant connection names across the project:
 * - Project-level connections (componentId: "")
 * - Per-component connections (all components in the project)
 *
 * Mirrors the pattern in DevantConnectorPopup.tsx existingDevantConnNames query.
 * Returns an empty set if any API call fails.
 */
async function getExistingDevantConnectionNames(
    cloudAPIs: IWso2PlatformExtensionAPI,
    orgId: string,
    projectId: string,
): Promise<Set<string>> {
    const names = new Set<string>();
    try {
        const state = platformExtStore.getState().state;
        const orgHandle = state?.selectedContext?.org?.handle ?? "";
        const projectHandle = state?.selectedContext?.project?.handler ?? "";

        // Fetch project-level connections and all components in parallel
        const [projectConns, components] = await Promise.all([
            cloudAPIs.getConnections({ orgId, projectId, componentId: "" }),
            cloudAPIs.getComponentList({ orgId, projectId, orgHandle, projectHandle }),
        ]);

        projectConns?.forEach((conn) => names.add(conn.name));

        // Fetch each component's connections in parallel
        const componentConns = await Promise.all(
            (components ?? []).map((comp) =>
                cloudAPIs.getConnections({
                    orgId,
                    projectId,
                    componentId: comp.metadata?.id ?? "",
                }),
            ),
        );
        componentConns.forEach((conns) => conns?.forEach((conn) => names.add(conn.name)));
    } catch {
        // API failed — return what we have so far
    }
    return names;
}

/**
 * Returns all configurable variable names already declared in the project
 * by calling getConfigVariablesV2 on the language server.
 * Mirrors the pattern in DevantConnectorPopup.tsx createTempConfigs mutation.
 * Returns an empty set if the project path is not available or the call fails.
 */
async function getExistingConfigVariableNames(tempProjectPath?: string): Promise<Set<string>> {
    const names = new Set<string>();
    if (!tempProjectPath) {
        return names;
    }
    try {
        const response = await StateMachine.context().langClient.getConfigVariablesV2({
            projectPath: tempProjectPath,
            includeLibraries: false,
        }) as any;

        const { orgName, packageName } = getOrgPackageName(tempProjectPath);
        if (!orgName || !packageName) {
            return names;
        }

        const pkgKey = `${orgName}/${packageName}`;
        const configVars = response?.configVariables?.[pkgKey]?.[""] as any[] | undefined;
        configVars?.forEach((configVar: any) => {
            const varName = configVar?.properties?.variable?.value?.toString();
            if (varName) {
                names.add(varName);
            }
        });
    } catch {
        // Language server unavailable — return what we have so far
    }
    return names;
}