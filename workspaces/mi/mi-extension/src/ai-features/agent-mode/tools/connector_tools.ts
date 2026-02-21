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

type OperationSelectionMap = Record<string, string[]>;

function normalizeIdentifier(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().toLowerCase();
}

function stripConnectorPrefix(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }

    return value.replace(/^mi-(connector|module|inbound)-/i, '');
}

function getOperationList(definition: any): any[] {
    if (Array.isArray(definition?.version?.operations)) {
        return definition.version.operations;
    }

    if (Array.isArray(definition?.operations)) {
        return definition.operations;
    }

    return [];
}

function getMavenCoordinate(definition: any): string {
    const groupId = typeof definition?.mavenGroupId === 'string' ? definition.mavenGroupId : 'unknown-group';
    const artifactId = typeof definition?.mavenArtifactId === 'string' ? definition.mavenArtifactId : 'unknown-artifact';
    return `${groupId}:${artifactId}`;
}

function buildOperationMap(source?: OperationSelectionMap): Map<string, string[]> {
    const operationMap = new Map<string, string[]>();
    if (!source) {
        return operationMap;
    }

    for (const [key, operations] of Object.entries(source)) {
        const normalizedKey = normalizeIdentifier(key);
        if (!normalizedKey || !Array.isArray(operations)) {
            continue;
        }

        const normalizedOps = Array.from(
            new Set(
                operations
                    .map((op) => normalizeIdentifier(op))
                    .filter((op) => op.length > 0)
            )
        );

        if (normalizedOps.length > 0) {
            operationMap.set(normalizedKey, normalizedOps);
        }
    }

    return operationMap;
}

function getOperationRequestKeys(name: string, definition: any): string[] {
    const keys = new Set<string>();

    const normalizedName = normalizeIdentifier(name);
    if (normalizedName.length > 0) {
        keys.add(normalizedName);
    }

    const connectorName = normalizeIdentifier(definition?.connectorName);
    if (connectorName.length > 0) {
        keys.add(connectorName);
    }

    const artifactId = normalizeIdentifier(definition?.mavenArtifactId);
    if (artifactId.length > 0) {
        keys.add(artifactId);
    }

    const shortArtifact = normalizeIdentifier(stripConnectorPrefix(definition?.mavenArtifactId));
    if (shortArtifact.length > 0) {
        keys.add(shortArtifact);
    }

    return Array.from(keys);
}

function resolveRequestedOperationNames(
    operationMap: Map<string, string[]>,
    name: string,
    definition: any
): string[] {
    const requested = new Set<string>();
    const keys = getOperationRequestKeys(name, definition);

    for (const key of keys) {
        const operations = operationMap.get(key) || [];
        operations.forEach((operation) => requested.add(operation));
    }

    return Array.from(requested);
}

function buildSelectedOperationDetail(
    name: string,
    definition: any,
    requestedOperationNames: string[],
    warnings: Set<string>
): Record<string, any> | null {
    const operations = getOperationList(definition);
    const selectedOperations: any[] = [];

    for (const requestedOperation of requestedOperationNames) {
        const operation = operations.find(
            (candidate) => normalizeIdentifier(candidate?.name) === requestedOperation
        );

        if (!operation) {
            warnings.add(`Requested operation '${requestedOperation}' was not found for '${name}'.`);
            continue;
        }

        const parameters = Array.isArray(operation?.parameters) ? operation.parameters : [];
        if (parameters.length === 0) {
            warnings.add(
                `Parameter details are not available for '${name}.${operation?.name || requestedOperation}' in connector store/local fallback data.`
            );
        }

        selectedOperations.push({
            name: operation?.name || requestedOperation,
            description: typeof operation?.description === 'string' ? operation.description : '',
            parameters,
        });
    }

    if (selectedOperations.length === 0) {
        return null;
    }

    return {
        connectorName: definition?.connectorName || name,
        maven: getMavenCoordinate(definition),
        version: definition?.version?.tagName || 'unknown',
        operations: selectedOperations,
    };
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
    include_full_descriptions?: boolean;
    connector_operation_names?: OperationSelectionMap;
    inbound_operation_names?: OperationSelectionMap;
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
        include_full_descriptions?: boolean;
        connector_operation_names?: OperationSelectionMap;
        inbound_operation_names?: OperationSelectionMap;
    }): Promise<ToolResult> => {
        const {
            connector_names = [],
            inbound_endpoint_names = [],
            include_documentation = true,
            include_full_descriptions = false,
            connector_operation_names,
            inbound_operation_names,
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

        const warningSet = new Set<string>([...connectorLookup.warnings, ...inboundLookup.warnings]);
        const connectorOperationMap = buildOperationMap(connector_operation_names);
        const inboundOperationMap = buildOperationMap(inbound_operation_names);

        if (include_full_descriptions && connectorOperationMap.size === 0 && inboundOperationMap.size === 0) {
            warningSet.add(
                'include_full_descriptions=true but no operation names were provided. ' +
                'Set connector_operation_names and/or inbound_operation_names to retrieve operation parameter details.'
            );
        }

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

        if (connectorsFound > 0) {
            message += `Found ${connectorsFound} connector(s):\n`;
            Object.entries(connectorDefinitions).forEach(([name, def]: [string, any]) => {
                const versionTag = def?.version?.tagName || 'unknown';
                const maven = getMavenCoordinate(def);
                const operations = getOperationList(def);

                message += `\n### ${name}\n`;
                message += `- Maven: ${maven}\n`;
                message += `- Version: ${versionTag}\n`;
                if (operations.length > 0) {
                    message += `- Operations: ${operations.map((op: any) => op.name).join(', ')}\n`;
                } else {
                    message += `- Operations: unavailable\n`;
                }

                if (include_full_descriptions) {
                    const requestedOperationNames = resolveRequestedOperationNames(connectorOperationMap, name, def);
                    if (requestedOperationNames.length === 0) {
                        warningSet.add(
                            `No connector operation names provided for '${name}'. ` +
                            `Skipping full operation details for this connector.`
                        );
                    } else {
                        const detailPayload = buildSelectedOperationDetail(name, def, requestedOperationNames, warningSet);
                        if (detailPayload) {
                            message += `\nSelected Operation Details:\n\`\`\`json\n${JSON.stringify(detailPayload, null, 2)}\n\`\`\`\n`;
                        }
                    }
                }
            });
        }

        if (inboundsFound > 0) {
            message += `\nFound ${inboundsFound} inbound endpoint(s):\n`;
            Object.entries(inboundDefinitions).forEach(([name, def]: [string, any]) => {
                const versionTag = def?.version?.tagName || 'unknown';
                const maven = getMavenCoordinate(def);
                const operations = getOperationList(def);

                message += `\n### ${name}\n`;
                message += `- Maven: ${maven}\n`;
                message += `- Version: ${versionTag}\n`;
                if (operations.length > 0) {
                    message += `- Operations: ${operations.map((op: any) => op.name).join(', ')}\n`;
                } else {
                    message += `- Operations: unavailable\n`;
                }

                if (include_full_descriptions) {
                    const requestedOperationNames = resolveRequestedOperationNames(inboundOperationMap, name, def);
                    if (requestedOperationNames.length === 0) {
                        warningSet.add(
                            `No inbound operation names provided for '${name}'. ` +
                            `Skipping full operation details for this inbound endpoint.`
                        );
                    } else {
                        const detailPayload = buildSelectedOperationDetail(name, def, requestedOperationNames, warningSet);
                        if (detailPayload) {
                            message += `\nSelected Operation Details:\n\`\`\`json\n${JSON.stringify(detailPayload, null, 2)}\n\`\`\`\n`;
                        }
                    }
                }
            });
        }

        const warnings = Array.from(warningSet);
        if (warnings.length > 0) {
            message = `Warnings: ${warnings.join(' | ')}\n\n${message}`;
        }

        if (connectorsNotFound.length > 0) {
            message += `\nMissing connectors: ${connectorsNotFound.join(', ')}`;
        }

        if (inboundsNotFound.length > 0) {
            message += `\nMissing inbound endpoints: ${inboundsNotFound.join(', ')}`;
        }

        if (include_documentation) {
            message += `\n\n---\n\n${CONNECTOR_DOCUMENTATION}`;
        }

        const success = connectorsFound > 0 || inboundsFound > 0;

        logDebug(
            `[ConnectorTool] Retrieved ${connectorsFound} connectors and ${inboundsFound} inbound endpoints` +
            ` | fallbackUsed=${fallbackUsedNames.length}, storeFailures=${storeFailureNames.length}` +
            ` | includeFull=${include_full_descriptions}` +
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
    include_full_descriptions: z.boolean()
        .optional()
        .default(false)
        .describe('Whether to include operation-level parameter details. Defaults to false. When true, operation names should be provided.'),
    connector_operation_names: z.record(z.string(), z.array(z.string()))
        .optional()
        .describe('Connector operation names keyed by connector name. Used only when include_full_descriptions=true. Example: {"Gmail":["sendMail","readMail"]}'),
    inbound_operation_names: z.record(z.string(), z.array(z.string()))
        .optional()
        .describe('Inbound operation names keyed by inbound endpoint name. Used only when include_full_descriptions=true. Example: {"Amazon Simple Queue Service (Inbound)":["init"]}'),
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
        description: `Retrieves definitions for MI connectors and/or inbound endpoints by name.
            Default output is compact summary only: Maven coordinate, version, and operation names.
            Set include_full_descriptions=true and provide connector_operation_names/inbound_operation_names
            to fetch parameter details only for selected operations.
            Available names are listed in <AVAILABLE_CONNECTORS> and <AVAILABLE_INBOUND_ENDPOINTS> sections of the user prompt.
            At least one of connector_names or inbound_endpoint_names must be provided.
            include_documentation defaults to true; set it to false when connector documentation is already in context to save tokens.
            For specialized guidance (for example, AI connector app development), use load_skill_context on demand.`,
        inputSchema: connectorInputSchema,
        execute
    });
}
