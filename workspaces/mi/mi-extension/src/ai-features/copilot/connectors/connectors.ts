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
import { logInfo, logWarn, logError } from "../logger";
import { buildMessageContent } from "../message-utils";

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
 * Get full connector definitions by names
 */
function getConnectorDefinitions(connectorNames: string[]): Record<string, string> {
    const definitions: Record<string, string> = {};
    
    for (const name of connectorNames) {
        const connector = CONNECTOR_DB.find(c => c.connectorName === name);
        if (connector) {
            definitions[name] = JSON.stringify(connector, null, 2);
        }
    }
    
    return definitions;
}

/**
 * Get full inbound endpoint definitions by names
 */
function getInboundEndpointDefinitions(inboundNames: string[]): Record<string, string> {
    const definitions: Record<string, string> = {};
    
    for (const name of inboundNames) {
        const inbound = INBOUND_DB.find(i => i.connectorName === name);
        if (inbound) {
            definitions[name] = JSON.stringify(inbound, null, 2);
        }
    }
    
    return definitions;
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
        
        // Get full definitions for selected connectors
        const connectorDefinitions = selectedConnectors.selected_connector_names.length > 0
            ? getConnectorDefinitions(selectedConnectors.selected_connector_names)
            : {};
            
        const inboundDefinitions = selectedConnectors.selected_inbound_endpoint_names.length > 0
            ? getInboundEndpointDefinitions(selectedConnectors.selected_inbound_endpoint_names)
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
