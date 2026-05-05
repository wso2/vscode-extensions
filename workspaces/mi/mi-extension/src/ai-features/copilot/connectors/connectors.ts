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

import { generateObject } from "ai";
import { z } from "zod";
import * as Handlebars from "handlebars";
import { FileObject, ImageObject } from "@wso2/mi-core";
import { getAnthropicClient, ANTHROPIC_HAIKU_4_5, getProviderCacheControl } from "../../connection";
import { SYSTEM_TEMPLATE } from "./system";
import { CONNECTOR_PROMPT } from "./prompt";
import { CONNECTOR_DB } from "./connector_db";
import { INBOUND_DB } from "./inbound_db";
import { logInfo, logWarn, logError, logDebug } from "../logger";
import { buildMessageContent } from "../message-utils";
import { getConnectorInfoFromLS, getInboundInfoFromLS } from "../../agent-mode/tools/connector_ls_client";

// Type definition for selected connectors
type SelectedConnectors = {
    selected_connector_names: string[];
    selected_inbound_endpoint_names: string[];
};

// Zod schema for structured output - matches Python Pydantic model
const selectedConnectorsSchema: z.ZodType<SelectedConnectors> = z.object({
    selected_connector_names: z.array(z.string())
        .describe("The names of the selected connectors."),
    selected_inbound_endpoint_names: z.array(z.string())
        .describe("The names of the selected inbound endpoints/event listeners."),
});

/**
 * Render a template using Handlebars
 */
function renderTemplate(templateContent: string, context: Record<string, any>): string {
    const template = Handlebars.compile(templateContent);
    return template(context);
}

/**
 * Get available connector names for LLM selection
 */
function getAvailableConnectors(): string[] {
    return CONNECTOR_DB.map(connector => connector.connectorName);
}

/**
 * Get available inbound endpoint names for LLM selection
 */
function getAvailableInboundEndpoints(): string[] {
    return INBOUND_DB.map(inbound => inbound.connectorName);
}

/**
 * Get full connector definitions by names.
 * When projectPath is provided, enriches definitions with LS data (xsdType, allowedConnectionTypes, supportsResponseModel).
 */
async function getConnectorDefinitions(connectorNames: string[], projectPath?: string): Promise<Record<string, string>> {
    const definitions: Record<string, string> = {};

    for (const name of connectorNames) {
        const connector = CONNECTOR_DB.find(c => c.connectorName === name);
        if (connector) {
            const enriched = await enrichWithLSData(connector, name, projectPath);
            definitions[name] = JSON.stringify(enriched, null, 2);
        }
    }

    return definitions;
}

/**
 * Get full inbound endpoint definitions by names.
 * When projectPath is provided, enriches definitions with LS data via
 * `synapse/getInboundInfo` (the inbound LS endpoint). Using the connector
 * endpoint for inbounds would return the wrong shape or silently fail.
 */
async function getInboundEndpointDefinitions(inboundNames: string[], projectPath?: string): Promise<Record<string, string>> {
    const definitions: Record<string, string> = {};

    for (const name of inboundNames) {
        const inbound = INBOUND_DB.find(i => i.connectorName === name);
        if (inbound) {
            const enriched = await enrichInboundWithLSData(inbound, name, projectPath);
            definitions[name] = JSON.stringify(enriched, null, 2);
        }
    }

    return definitions;
}

/**
 * Enrich a static INBOUND_DB entry with LS data via `synapse/getInboundInfo`.
 * Best-effort: returns the original definition if LS fails or the inbound has
 * no Maven coordinates to resolve. Inbound LS responses have a flat
 * `parameters` array (not `operations[].parameters`) — we merge it into the
 * DB's init operation shape so downstream prompt rendering stays uniform.
 */
async function enrichInboundWithLSData(definition: any, name: string, projectPath?: string): Promise<any> {
    if (!projectPath) {
        return definition;
    }

    try {
        const groupId = definition.mavenGroupId;
        const artifactId = definition.mavenArtifactId;
        const version = definition.version?.tagName;

        if (!groupId || !artifactId || !version) {
            return definition;
        }

        const lsResult = await getInboundInfoFromLS(projectPath, { groupId, artifactId, version });
        if ('error' in lsResult) {
            logDebug(`LS inbound enrichment skipped for '${name}': ${lsResult.error}`);
            return definition;
        }

        const enriched = JSON.parse(JSON.stringify(definition));
        const operations = enriched.version?.operations || enriched.operations || [];
        const lsParameters = Array.isArray(lsResult.parameters) ? lsResult.parameters : [];
        if (lsParameters.length > 0 && operations.length > 0) {
            // Inbounds conventionally expose a single `init` operation in the static
            // DB; fall through to the first operation if `init` isn't present.
            const target = operations.find((op: any) => (op.name || '').toLowerCase() === 'init') ?? operations[0];
            target.parameters = lsParameters.map(p => ({
                name: p.name,
                type: p.xsdType,
                required: p.required,
                description: p.description,
            }));
        }

        logInfo(`Enriched inbound '${name}' with LS data (${lsParameters.length} parameters)`);
        return enriched;
    } catch (error) {
        logWarn(`Failed to enrich inbound '${name}' with LS data: ${error instanceof Error ? error.message : String(error)}`);
        return definition;
    }
}

/**
 * Enrich a static DB connector definition with LS data when available.
 * Best-effort: returns original definition if LS fails.
 */
async function enrichWithLSData(definition: any, name: string, projectPath?: string): Promise<any> {
    if (!projectPath) {
        return definition;
    }

    try {
        const groupId = definition.mavenGroupId;
        const artifactId = definition.mavenArtifactId;
        const version = definition.version?.tagName;

        if (!groupId || !artifactId || !version) {
            return definition;
        }

        // Single LS call: downloads + extracts + parses, returns the full Connector
        // (or a { error } envelope which we treat as "LS data unavailable").
        const lsResult = await getConnectorInfoFromLS(projectPath, groupId, artifactId, version);
        if ('error' in lsResult) {
            logDebug(`LS enrichment skipped for '${name}': ${lsResult.error}`);
            return definition;
        }

        // Deep clone to avoid mutating the static DB
        const enriched = JSON.parse(JSON.stringify(definition));

        // Merge LS operation data into the definition
        const operations = enriched.version?.operations || enriched.operations || [];
        for (const op of operations) {
            const lsOperation = lsResult.operations.find(a =>
                (a.name || '').toLowerCase() === (op.name || '').toLowerCase()
            );
            if (lsOperation) {
                // Replace parameters with LS versions (has xsdType)
                op.parameters = lsOperation.parameters.map(p => ({
                    name: p.name,
                    type: p.xsdType,
                    required: p.required,
                    description: p.description,
                    defaultValue: p.defaultValue ?? '',
                }));
                // Add LS-only fields
                op.allowedConnectionTypes = lsOperation.allowedConnectionTypes;
                op.supportsResponseModel = lsOperation.supportsResponseModel;
            }
        }

        logInfo(`Enriched connector '${name}' with LS data (${lsResult.operations.length} operations)`);
        return enriched;
    } catch (error) {
        logWarn(`Failed to enrich connector '${name}' with LS data: ${error instanceof Error ? error.message : String(error)}`);
        return definition;
    }
}

/**
 * Parameters for getting connectors
 */
export interface GetConnectorsParams {
    /** The user's question or request */
    question: string;
    /** Additional files for context (optional) - FileObject array */
    files?: FileObject[];
    /** Images for context (optional) - ImageObject array */
    images?: ImageObject[];
    /** Project path for LS enrichment (optional) */
    projectPath?: string;
}

/**
 * Result of connector selection
 */
export interface GetConnectorsResult {
    /** Selected connector definitions */
    connectors: Record<string, string>;
    /** Selected inbound endpoint definitions */
    inbound_endpoints: Record<string, string>;
}

/**
 * Gets relevant connectors and inbound endpoints for the user's query
 * Uses AI to intelligently select from available options
 */
export async function getConnectors(
    params: GetConnectorsParams
): Promise<GetConnectorsResult> {
    // Get available connectors and inbound endpoints
    const availableConnectors = getAvailableConnectors();
    const availableInboundEndpoints = getAvailableInboundEndpoints();
    
    if (availableConnectors.length === 0) {
        logWarn("No connector details available - returning empty list");
        return { connectors: {}, inbound_endpoints: {} };
    }
    
    // Render the prompt with the user's question and available options
    const prompt = renderTemplate(CONNECTOR_PROMPT, {
        question: params.question,
        available_connectors: availableConnectors.join(", "),
        available_inbound_endpoints: availableInboundEndpoints.join(", "),
    });

    const model = await getAnthropicClient(ANTHROPIC_HAIKU_4_5);
    const cacheOptions = await getProviderCacheControl();

    // Check if files or images are present
    const hasFiles = params.files && params.files.length > 0;
    const hasImages = params.images && params.images.length > 0;

    // Build user message content with files and images if present
    let userMessageContent: string | any[];
    if (hasFiles || hasImages) {
        logInfo(`Including ${params.files?.length || 0} files and ${params.images?.length || 0} images in connector selection`);
        // Note: Attachments are pre-validated in RPC manager via validateAttachments()
        userMessageContent = buildMessageContent(prompt, params.files, params.images);
    } else {
        userMessageContent = prompt;
    }

    // Build messages array with cache control on system message
    const messages: any[] = [
        {
            role: "system" as const,
            content: SYSTEM_TEMPLATE,
            providerOptions: cacheOptions, // Cache system prompt only
        },
        {
            role: "user" as const,
            content: userMessageContent,
        }
    ];

    try {
        // Use structured output to get selected connectors
        // Type assertion to avoid TypeScript deep instantiation issues with Zod
        const result = await (generateObject as any)({
            model: model,
            messages: messages,
            schema: selectedConnectorsSchema,
            maxOutputTokens: 2000,
            temperature: 0.3,
        });
        
        // Extract the selected connectors from the result
        const selectedConnectors = result.object as SelectedConnectors;
        
        // Get full definitions for selected connectors (enriched with LS data when projectPath available)
        const connectorDefinitions = selectedConnectors.selected_connector_names.length > 0
            ? await getConnectorDefinitions(selectedConnectors.selected_connector_names, params.projectPath)
            : {};

        const inboundDefinitions = selectedConnectors.selected_inbound_endpoint_names.length > 0
            ? await getInboundEndpointDefinitions(selectedConnectors.selected_inbound_endpoint_names, params.projectPath)
            : {};
        
        logInfo(`Selected ${selectedConnectors.selected_connector_names.length} connectors and ${selectedConnectors.selected_inbound_endpoint_names.length} inbound endpoints`);

        return {
            connectors: connectorDefinitions,
            inbound_endpoints: inboundDefinitions,
        };
    } catch (error) {
        logError("Error selecting connectors", error);
        // Return empty if selection fails
        return { connectors: {}, inbound_endpoints: {} };
    }
}
