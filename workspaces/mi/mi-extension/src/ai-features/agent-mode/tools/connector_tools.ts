/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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
import { CONNECTOR_DOCUMENTATION } from '../context/connectors_guide';
import { ToolResult } from './types';
import { logInfo, logDebug } from '../../copilot/logger';
import { getConnectorStoreCatalog } from './connector_store_cache';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get full connector definitions by names
 */
function getConnectorDefinitions(connectorNames: string[], connectors: any[]): Record<string, any> {
    const definitions: Record<string, any> = {};

    for (const name of connectorNames) {
        const connector = connectors.find(c => c.connectorName === name);
        if (connector) {
            definitions[name] = connector;
        }
    }

    return definitions;
}

/**
 * Get full inbound endpoint definitions by names
 */
function getInboundEndpointDefinitions(inboundNames: string[], inbounds: any[]): Record<string, any> {
    const definitions: Record<string, any> = {};

    for (const name of inboundNames) {
        const inbound = inbounds.find(i => i.connectorName === name);
        if (inbound) {
            definitions[name] = inbound;
        }
    }

    return definitions;
}

function toNames(items: any[]): string[] {
    const names = new Set<string>();
    for (const item of items) {
        const name = item?.connectorName;
        if (typeof name === 'string' && name.length > 0) {
            names.add(name);
        }
    }
    return Array.from(names);
}

export interface AvailableConnectorCatalog {
    connectors: string[];
    inboundEndpoints: string[];
}

export async function getAvailableConnectorCatalog(projectPath: string): Promise<AvailableConnectorCatalog> {
    const { connectors, inbounds } = await getConnectorStoreCatalog(projectPath, CONNECTOR_DB, INBOUND_DB);
    return {
        connectors: toNames(connectors),
        inboundEndpoints: toNames(inbounds),
    };
}

/**
 * Get all available connector names
 */
export async function getAvailableConnectors(projectPath: string): Promise<string[]> {
    const catalog = await getAvailableConnectorCatalog(projectPath);
    return catalog.connectors;
}

/**
 * Get all available inbound endpoint names
 */
export async function getAvailableInboundEndpoints(projectPath: string): Promise<string[]> {
    const catalog = await getAvailableConnectorCatalog(projectPath);
    return catalog.inboundEndpoints;
}

// ============================================================================
// Execute Function Type
// ============================================================================

export type ConnectorExecuteFn = (args: {
    connector_names?: string[];
    inbound_endpoint_names?: string[];
    include_documentation?: boolean;
}) => Promise<ToolResult>;

// ============================================================================
// Execute Function
// ============================================================================

/**
 * Creates the execute function for get_connector_definitions tool
 */
export function createConnectorExecute(projectPath: string): ConnectorExecuteFn {
    return async (args: {
        connector_names?: string[];
        inbound_endpoint_names?: string[];
        include_documentation?: boolean;
    }): Promise<ToolResult> => {
        const {
            connector_names = [],
            inbound_endpoint_names = [],
            include_documentation = true,
        } = args;
        
        logInfo(`[ConnectorTool] Fetching ${connector_names.length} connectors and ${inbound_endpoint_names.length} inbound endpoints`);

        // Validate that at least one array has items
        if (connector_names.length === 0 && inbound_endpoint_names.length === 0) {
            return {
                success: false,
                message: 'At least one connector name or inbound endpoint name must be provided.',
                error: 'Error: No connector or inbound endpoint names provided'
            };
        }

        const { connectors, inbounds } = await getConnectorStoreCatalog(projectPath, CONNECTOR_DB, INBOUND_DB);

        // Get connector definitions
        const connectorDefinitions = connector_names.length > 0
            ? getConnectorDefinitions(connector_names, connectors)
            : {};

        // Get inbound endpoint definitions
        const inboundDefinitions = inbound_endpoint_names.length > 0
            ? getInboundEndpointDefinitions(inbound_endpoint_names, inbounds)
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
                const versionTag = def?.version?.tagName || 'unknown';
                const operations = Array.isArray(def?.version?.operations)
                    ? def.version.operations
                    : (Array.isArray(def?.operations) ? def.operations : []);
                message += `\n### ${name}\n`;
                message += `- Description: ${def.description}\n`;
                message += `- Maven: ${def.mavenGroupId}:${def.mavenArtifactId}\n`;
                message += `- Version: ${versionTag}\n`;
                if (operations.length > 0) {
                    message += `- Operations: ${operations.map((op: any) => op.name).join(', ')}\n`;
                } else {
                    message += `- Operations: unavailable\n`;
                }
                message += `\nFull Definition:\n\`\`\`json\n${JSON.stringify(def, null, 2)}\n\`\`\`\n`;
            });
        }

        if (inboundsFound > 0) {
            message += `\nFound ${inboundsFound} inbound endpoint(s):\n`;
            Object.entries(inboundDefinitions).forEach(([name, def]: [string, any]) => {
                const versionTag = def?.version?.tagName || 'unknown';
                message += `\n### ${name}\n`;
                message += `- Description: ${def.description}\n`;
                message += `- Maven: ${def.mavenGroupId}:${def.mavenArtifactId}\n`;
                message += `- Version: ${versionTag}\n`;
                message += `\nFull Definition:\n\`\`\`json\n${JSON.stringify(def, null, 2)}\n\`\`\`\n`;
            });
        }

        if (connectorsNotFound.length > 0) {
            message += `\n Connectors not found: ${connectorsNotFound.join(', ')}`;
        }

        if (inboundsNotFound.length > 0) {
            message += `\n Inbound endpoints not found: ${inboundsNotFound.join(', ')}`;
        }

        // Append general connector documentation by default, unless explicitly disabled.
        if (include_documentation) {
            message += `\n\n---\n\n${CONNECTOR_DOCUMENTATION}`;
        }

        const success = connectorsFound > 0 || inboundsFound > 0;

        logDebug(
            `[ConnectorTool] Retrieved ${connectorsFound} connectors and ${inboundsFound} inbound endpoints` +
            `${include_documentation ? ' (with connector docs)' : ' (without docs)'}`
        );

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
    include_documentation: z.boolean()
        .optional()
        .default(true)
        .describe('Whether to append connector usage documentation to the response. Defaults to true. Set false to save context when docs are already available.'),
});

/**
 * Creates the get_connector_definitions tool
 */
export function createConnectorTool(execute: ConnectorExecuteFn) {
    // Type assertion to avoid TypeScript deep instantiation issues with Zod
    return (tool as any)({
        description: `Retrieves full definitions for MI connectors and/or inbound endpoints by name.
            Returns: operations, parameters, Maven coordinates, and connector usage documentation.
            Available names are listed in <AVAILABLE_CONNECTORS> and <AVAILABLE_INBOUND_ENDPOINTS> sections of the user prompt.
            At least one of connector_names or inbound_endpoint_names must be provided.
            include_documentation defaults to true; set it to false when connector documentation is already in context to save tokens.
            For specialized guidance (for example, AI connector app development), use load_skill_context on demand.`,
        inputSchema: connectorInputSchema,
        execute
    });
}
