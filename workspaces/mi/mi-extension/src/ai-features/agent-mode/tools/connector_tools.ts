/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { CONNECTOR_DB } from '../context/connector_db';
import { INBOUND_DB } from '../context/inbound_db';
import { CONNECTOR_DOCUMENTATION, AI_CONNECTOR_DOCUMENTATION } from '../context/connectors_guide';
import { ToolResult, CONNECTOR_TOOL_NAME, GET_CONNECTOR_GUIDE_TOOL_NAME, GET_AI_CONNECTOR_GUIDE_TOOL_NAME } from './types';
import { logInfo, logDebug } from '../../copilot/logger';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get full connector definitions by names
 */
function getConnectorDefinitions(connectorNames: string[]): Record<string, any> {
    const definitions: Record<string, any> = {};

    for (const name of connectorNames) {
        const connector = CONNECTOR_DB.find(c => c.connectorName === name);
        if (connector) {
            definitions[name] = connector;
        }
    }

    return definitions;
}

/**
 * Get full inbound endpoint definitions by names
 */
function getInboundEndpointDefinitions(inboundNames: string[]): Record<string, any> {
    const definitions: Record<string, any> = {};

    for (const name of inboundNames) {
        const inbound = INBOUND_DB.find(i => i.connectorName === name);
        if (inbound) {
            definitions[name] = inbound;
        }
    }

    return definitions;
}

/**
 * Get all available connector names
 */
export function getAvailableConnectors(): string[] {
    return CONNECTOR_DB.map(connector => connector.connectorName);
}

/**
 * Get all available inbound endpoint names
 */
export function getAvailableInboundEndpoints(): string[] {
    return INBOUND_DB.map(inbound => inbound.connectorName);
}

// ============================================================================
// Execute Function Type
// ============================================================================

export type ConnectorExecuteFn = (args: {
    connector_names?: string[];
    inbound_endpoint_names?: string[];
}) => Promise<ToolResult>;

// ============================================================================
// Execute Function
// ============================================================================

/**
 * Creates the execute function for get_connector_definitions tool
 */
export function createConnectorExecute(): ConnectorExecuteFn {
    return async (args: {
        connector_names?: string[];
        inbound_endpoint_names?: string[];
    }): Promise<ToolResult> => {
        const { connector_names = [], inbound_endpoint_names = [] } = args;
        
        logInfo(`[ConnectorTool] Fetching ${connector_names.length} connectors and ${inbound_endpoint_names.length} inbound endpoints`);

        // Validate that at least one array has items
        if (connector_names.length === 0 && inbound_endpoint_names.length === 0) {
            return {
                success: false,
                message: 'At least one connector name or inbound endpoint name must be provided.',
                error: 'Error: No connector or inbound endpoint names provided'
            };
        }

        // Get connector definitions
        const connectorDefinitions = connector_names.length > 0
            ? getConnectorDefinitions(connector_names)
            : {};

        // Get inbound endpoint definitions
        const inboundDefinitions = inbound_endpoint_names.length > 0
            ? getInboundEndpointDefinitions(inbound_endpoint_names)
            : {};

        // Count found vs requested
        const connectorsFound = Object.keys(connectorDefinitions).length;
        const inboundsFound = Object.keys(inboundDefinitions).length;
        const connectorsNotFound = connector_names.filter(name => !connectorDefinitions[name]);
        const inboundsNotFound = inbound_endpoint_names.filter(name => !inboundDefinitions[name]);

        // Build response message
        let message = '';

        if (connectorsFound > 0) {
            message += `Found ${connectorsFound} connector(s):\n`;
            Object.entries(connectorDefinitions).forEach(([name, def]: [string, any]) => {
                message += `\n### ${name}\n`;
                message += `- Description: ${def.description}\n`;
                message += `- Maven: ${def.mavenGroupId}:${def.mavenArtifactId}\n`;
                message += `- Version: ${def.version.tagName}\n`;
                if (def.version.operations && def.version.operations.length > 0) {
                    message += `- Operations: ${def.version.operations.map((op: any) => op.name).join(', ')}\n`;
                }
                message += `\nFull Definition:\n\`\`\`json\n${JSON.stringify(def, null, 2)}\n\`\`\`\n`;
            });
        }

        if (inboundsFound > 0) {
            message += `\nFound ${inboundsFound} inbound endpoint(s):\n`;
            Object.entries(inboundDefinitions).forEach(([name, def]: [string, any]) => {
                message += `\n### ${name}\n`;
                message += `- Description: ${def.description}\n`;
                message += `- Maven: ${def.mavenGroupId}:${def.mavenArtifactId}\n`;
                message += `- Version: ${def.version.tagName}\n`;
                message += `\nFull Definition:\n\`\`\`json\n${JSON.stringify(def, null, 2)}\n\`\`\`\n`;
            });
        }

        if (connectorsNotFound.length > 0) {
            message += `\n Connectors not found: ${connectorsNotFound.join(', ')}`;
        }

        if (inboundsNotFound.length > 0) {
            message += `\n Inbound endpoints not found: ${inboundsNotFound.join(', ')}`;
        }

        // Append general connector documentation
        message += `\n\n---\n\n${CONNECTOR_DOCUMENTATION}`;

        // If AI connector is selected, append AI-specific documentation
        const hasAIConnector = connector_names.some(name => name.toLowerCase() === 'ai');
        if (hasAIConnector) {
            message += `\n\n---\n\n${AI_CONNECTOR_DOCUMENTATION}`;
        }

        const success = connectorsFound > 0 || inboundsFound > 0;

        logDebug(`[ConnectorTool] Retrieved ${connectorsFound} connectors and ${inboundsFound} inbound endpoints${hasAIConnector ? ' (with AI guide)' : ''}`);

        return {
            success,
            message
        };
    };
}

// ============================================================================
// Tool Definition (Vercel AI SDK format)
// ============================================================================

const connectorInputSchema = z.object({
    connector_names: z.array(z.string())
        .optional()
        .describe('Array of connector names to fetch definitions for (e.g., ["AI", "Salesforce", "Gmail"])'),
    inbound_endpoint_names: z.array(z.string())
        .optional()
        .describe('Array of inbound endpoint names to fetch definitions for (e.g., ["Kafka (Inbound)", "HTTP (Inbound)"])'),
});

/**
 * Creates the get_connector_definitions tool
 */
export function createConnectorTool(execute: ConnectorExecuteFn) {
    // Type assertion to avoid TypeScript deep instantiation issues with Zod
    return (tool as any)({
        description: `
            Retrieves full definitions for MI connectors and inbound endpoints by name.

            Usage:
            - Use this tool to get detailed information about specific connectors or inbound endpoints.
            - The tool returns complete definitions including:
              * Description
              * Maven coordinates (groupId, artifactId, version)
              * Available operations and their parameters
              * Configuration options
              * General connector usage documentation
              * AI connector documentation (if AI connector is requested)
            - Available connector names are listed in the <AVAILABLE_CONNECTORS> section of the user prompt.
            - Available inbound endpoint names are listed in the <AVAILABLE_INBOUND_ENDPOINTS> section.

            When to use:
            - When you need detailed operation signatures for a connector
            - When you need to know the exact parameters for a connector operation
            - When you need Maven coordinates to add a connector to the project
            - When you need to understand what a connector or inbound endpoint does
            - When you need connector usage guidelines and best practices

            Example:
            - To get definitions for AI and Salesforce connectors:
              connector_names: ["AI", "Salesforce"]
            - To get definitions for Kafka inbound endpoint:
              inbound_endpoint_names: ["Kafka (Inbound)"]

            Parameters:
            - connector_names: Array of connector names to fetch (optional, but at least one of connector_names or inbound_endpoint_names must be provided)
            - inbound_endpoint_names: Array of inbound endpoint names to fetch (optional, but at least one of connector_names or inbound_endpoint_names must be provided)

            Note: This tool automatically appends connector usage documentation to help you use connectors correctly.`,
        inputSchema: connectorInputSchema,
        execute
    });
}

// ============================================================================
// Documentation Reading Tools
// ============================================================================

/**
 * Execute function type for get_connector_guide tool
 */
export type GetConnectorGuideExecuteFn = () => Promise<ToolResult>;

/**
 * Execute function type for get_ai_connector_guide tool
 */
export type GetAIConnectorGuideExecuteFn = () => Promise<ToolResult>;

/**
 * Creates the execute function for get_connector_guide tool
 */
export function createGetConnectorGuideExecute(): GetConnectorGuideExecuteFn {
    return async (): Promise<ToolResult> => {
        logDebug(`[GetConnectorGuideTool] Fetching connector usage guide`);

        return {
            success: true,
            message: CONNECTOR_DOCUMENTATION
        };
    };
}

/**
 * Creates the execute function for get_ai_connector_guide tool
 */
export function createGetAIConnectorGuideExecute(): GetAIConnectorGuideExecuteFn {
    return async (): Promise<ToolResult> => {
        logDebug(`[GetAIConnectorGuideTool] Fetching AI connector guide`);

        return {
            success: true,
            message: AI_CONNECTOR_DOCUMENTATION
        };
    };
}

/**
 * Creates the get_connector_guide tool
 */
export function createGetConnectorGuideTool(execute: GetConnectorGuideExecuteFn) {
    return (tool as any)({
        description: `
            Retrieves the general connector usage guide and best practices.

            This tool returns comprehensive documentation on:
            - How to use connectors with connection-based support
            - Local entry configuration for connectors
            - Init operation usage patterns
            - Connector operation response handling (responseVariable and overwriteBody)
            - Best practices and common patterns

            When to use:
            - When you need to understand general connector usage patterns
            - When you're unsure about connection initialization
            - When you need to know about responseVariable vs overwriteBody
            - When you want to refresh your knowledge on connector best practices

            This tool takes no parameters and returns the full connector guide.`,
        inputSchema: z.object({}),
        execute
    });
}

/**
 * Creates the get_ai_connector_guide tool
 */
export function createGetAIConnectorGuideTool(execute: GetAIConnectorGuideExecuteFn) {
    return (tool as any)({
        description: `
            Retrieves the AI connector guide for building AI-powered integrations.

            This tool returns comprehensive documentation on:
            - Creating basic chat operations with LLM and memory connections
            - Implementing RAG (Retrieval Augmented Generation) chat
            - Working with vector stores and embeddings
            - Creating AI agents with custom tools
            - Using templates for agent tools
            - Connecting various AI models (OpenAI, etc.)

            When to use:
            - When you need to implement AI features in Synapse
            - When building chatbots or conversational interfaces
            - When implementing RAG patterns
            - When creating AI agents with tool calling capabilities
            - When you need to understand AI connector patterns

            This tool takes no parameters and returns the full AI connector guide.`,
        inputSchema: z.object({}),
        execute
    });
}
