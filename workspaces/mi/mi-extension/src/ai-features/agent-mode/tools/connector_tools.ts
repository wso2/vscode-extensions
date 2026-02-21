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
import {
    getConnectorStoreCatalog,
    getConnectorDefinitions as getConnectorDefinitionLookup,
    getInboundDefinitions as getInboundDefinitionLookup,
    ConnectorDefinitionLookupResult,
    ConnectorStoreSource,
} from './connector_store_cache';

// ============================================================================
// Utility Functions
// ============================================================================

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
    storeStatus: 'healthy' | 'degraded';
    warnings: string[];
    runtimeVersionUsed: string;
    source: {
        connectors: ConnectorStoreSource;
        inbounds: ConnectorStoreSource;
    };
}

export async function getAvailableConnectorCatalog(projectPath: string): Promise<AvailableConnectorCatalog> {
    const catalog = await getConnectorStoreCatalog(projectPath, CONNECTOR_DB, INBOUND_DB);
    return {
        connectors: toNames(catalog.connectors),
        inboundEndpoints: toNames(catalog.inbounds),
        storeStatus: catalog.storeStatus,
        warnings: catalog.warnings,
        runtimeVersionUsed: catalog.runtimeVersionUsed,
        source: catalog.source,
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

        const emptyLookup: ConnectorDefinitionLookupResult = {
            definitionsByName: {},
            missingNames: [],
            fallbackUsedNames: [],
            storeFailureNames: [],
            warnings: [],
            runtimeVersionUsed: 'unknown',
        };

        const [connectorLookup, inboundLookup] = await Promise.all([
            connector_names.length > 0
                ? getConnectorDefinitionLookup(projectPath, connector_names, CONNECTOR_DB)
                : Promise.resolve(emptyLookup),
            inbound_endpoint_names.length > 0
                ? getInboundDefinitionLookup(projectPath, inbound_endpoint_names, INBOUND_DB)
                : Promise.resolve(emptyLookup),
        ]);

        const connectorDefinitions = connectorLookup.definitionsByName;
        const inboundDefinitions = inboundLookup.definitionsByName;

        // Count found vs requested
        const connectorsFound = Object.keys(connectorDefinitions).length;
        const inboundsFound = Object.keys(inboundDefinitions).length;
        const connectorsNotFound = connectorLookup.missingNames;
        const inboundsNotFound = inboundLookup.missingNames;
        const fallbackUsedNames = [
            ...connectorLookup.fallbackUsedNames.map((name) => `${name} (connector)`),
            ...inboundLookup.fallbackUsedNames.map((name) => `${name} (inbound endpoint)`),
        ];
        const storeFailureNames = [
            ...connectorLookup.storeFailureNames.map((name) => `${name} (connector)`),
            ...inboundLookup.storeFailureNames.map((name) => `${name} (inbound endpoint)`),
        ];
        const warnings = Array.from(new Set([...connectorLookup.warnings, ...inboundLookup.warnings]));

        // Build response message
        let message = '';

        if (storeFailureNames.length > 0) {
            message += `<system-reminder>\n`;
            message += `Connector store was unavailable for: ${storeFailureNames.join(', ')}.\n`;
            message += `Used stale cache/local fallback where available.\n`;
            message += `</system-reminder>\n\n`;
            message += `Connector store unavailable for: ${storeFailureNames.join(', ')}.\n`;
        }

        if (fallbackUsedNames.length > 0) {
            message += `Used local fallback definitions for: ${fallbackUsedNames.join(', ')}.\n`;
        }

        if (warnings.length > 0) {
            message += `Warnings: ${warnings.join(' | ')}\n\n`;
        }

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

        if (connectorsNotFound.length > 0) {
            message += `\nMissing connectors: ${connectorsNotFound.join(', ')}`;
        }

        if (inboundsNotFound.length > 0) {
            message += `\nMissing inbound endpoints: ${inboundsNotFound.join(', ')}`;
        }

        // Append general connector documentation by default, unless explicitly disabled.
        if (include_documentation) {
            message += `\n\n---\n\n${CONNECTOR_DOCUMENTATION}`;
        }

        const success = connectorsFound > 0 || inboundsFound > 0;

        logDebug(
            `[ConnectorTool] Retrieved ${connectorsFound} connectors and ${inboundsFound} inbound endpoints` +
            ` | fallbackUsed=${fallbackUsedNames.length}, storeFailures=${storeFailureNames.length}` +
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
        .default(true)
        .describe('Whether to append connector usage documentation to the response. Defaults to true. Set false to save context when </CONNECTORS_DOCUMENTATION> are already in context.'),
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
