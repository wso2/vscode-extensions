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
import { CONNECTOR_DB } from '../context/connectors/connector_db';
import { INBOUND_DB } from '../context/connectors/inbound_db';
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

type ConnectorTargetType = 'connector' | 'inbound endpoint';
type ParameterAvailabilityStatus = 'available' | 'partial' | 'unavailable' | 'unknown';

function normalizeIdentifier(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().toLowerCase();
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

function getConnectionList(definition: any): any[] {
    if (Array.isArray(definition?.version?.connections)) {
        return definition.version.connections;
    }

    if (Array.isArray(definition?.connections)) {
        return definition.connections;
    }

    return [];
}

function getMavenCoordinate(definition: any): string {
    const groupId = typeof definition?.mavenGroupId === 'string' ? definition.mavenGroupId : 'unknown-group';
    const artifactId = typeof definition?.mavenArtifactId === 'string' ? definition.mavenArtifactId : 'unknown-artifact';
    return `${groupId}:${artifactId}`;
}

function normalizeSelectionNames(names: unknown): string[] {
    if (!Array.isArray(names)) {
        return [];
    }

    return Array.from(
        new Set(
            names
                .map((name) => normalizeIdentifier(name))
                .filter((name) => name.length > 0)
        )
    );
}

function getParameterAvailability(definition: any): {
    status: ParameterAvailabilityStatus;
    withParameters: number;
    total: number;
    summary: string;
} {
    const operations = getOperationList(definition);
    const total = operations.length;

    if (total === 0) {
        return {
            status: 'unknown',
            withParameters: 0,
            total: 0,
            summary: 'unknown (operations list unavailable)',
        };
    }

    let withParameters = 0;
    for (const operation of operations) {
        const parameters = Array.isArray(operation?.parameters) ? operation.parameters : [];
        if (parameters.length > 0) {
            withParameters += 1;
        }
    }

    if (withParameters === 0) {
        return {
            status: 'unavailable',
            withParameters,
            total,
            summary: `unavailable (${withParameters}/${total} operations have parameter data)`,
        };
    }

    if (withParameters === total) {
        return {
            status: 'available',
            withParameters,
            total,
            summary: `available (${withParameters}/${total} operations have parameter data)`,
        };
    }

    return {
        status: 'partial',
        withParameters,
        total,
        summary: `partial (${withParameters}/${total} operations have parameter data)`,
    };
}

function getInitializationGuidance(
    connectionLocalEntryNeeded: boolean,
    noInitializationNeeded: boolean
): string {
    if (noInitializationNeeded) {
        return 'noInitializationNeeded=true. Use connector operations directly; do not configure localEntry or init.';
    }

    if (connectionLocalEntryNeeded) {
        return 'connectionLocalEntryNeeded=true. Configure a localEntry using init and use configKey in operations; do not re-init in-sequence.';
    }

    return 'connectionLocalEntryNeeded=false. Fetch init details and call init in-sequence before connector operations (no localEntry configKey flow).';
}

function buildSelectedOperationDetail(
    name: string,
    definition: any,
    requestedOperationNames: string[],
    requestedConnectionNames: string[],
    warnings: Set<string>
): Record<string, any> | null {
    const operations = getOperationList(definition);
    const connections = getConnectionList(definition);
    const selectedOperations: any[] = [];
    const selectedConnections: any[] = [];

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

    for (const requestedConnection of requestedConnectionNames) {
        const connection = connections.find(
            (candidate) => normalizeIdentifier(candidate?.name) === requestedConnection
        );

        if (!connection) {
            warnings.add(`Requested connection '${requestedConnection}' was not found for '${name}'.`);
            continue;
        }

        const parameters = Array.isArray(connection?.parameters) ? connection.parameters : [];
        if (parameters.length === 0) {
            warnings.add(
                `Connection parameter details are not available for '${name}.${connection?.name || requestedConnection}' in connector store/local fallback data.`
            );
        }

        selectedConnections.push({
            name: connection?.name || requestedConnection,
            description: typeof connection?.description === 'string' ? connection.description : '',
            parameters,
        });
    }

    const connectionNames = connections
        .map((connection) => (typeof connection?.name === 'string' ? connection.name : ''))
        .filter((connectionName) => connectionName.length > 0);
    const hasInitOperation = operations.some((operation) => normalizeIdentifier(operation?.name) === 'init');
    const noInitializationNeeded = connectionNames.length === 0;
    const connectionLocalEntryNeeded = noInitializationNeeded ? false : !hasInitOperation;

    if (selectedOperations.length === 0 && selectedConnections.length === 0) {
        return null;
    }

    return {
        name: definition?.connectorName || name,
        maven: getMavenCoordinate(definition),
        version: definition?.version?.tagName || 'unknown',
        operations: selectedOperations,
        connections: selectedConnections,
        connectionLocalEntryNeeded,
        noInitializationNeeded,
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
    name?: string;
    include_full_descriptions?: boolean;
    operation_names?: string[];
    connection_names?: string[];
}) => Promise<ToolResult>;

// ============================================================================
// Execute Function
// ============================================================================

/**
 * Creates the execute function for get_connector_definitions tool
 */
export function createConnectorExecute(projectPath: string): ConnectorExecuteFn {
    return async (args: {
        name?: string;
        include_full_descriptions?: boolean;
        operation_names?: string[];
        connection_names?: string[];
    }): Promise<ToolResult> => {
        const {
            name,
            include_full_descriptions = false,
            operation_names = [],
            connection_names = [],
        } = args;

        const requestedName = typeof name === 'string' ? name.trim() : '';
        if (requestedName.length === 0) {
            return {
                success: false,
                message: 'Provide name for a connector or inbound endpoint.',
                error: 'Error: Missing name for get_connector_definitions'
            };
        }

        const firstLookupType: ConnectorTargetType = /\(inbound\)/i.test(requestedName)
            ? 'inbound endpoint'
            : 'connector';
        const secondLookupType: ConnectorTargetType = firstLookupType === 'connector'
            ? 'inbound endpoint'
            : 'connector';

        logInfo(`[ConnectorTool] Fetching definition for name: ${requestedName}`);

        const firstLookup: ConnectorDefinitionLookupResult = firstLookupType === 'connector'
            ? await getConnectorDefinitionLookup(projectPath, [requestedName], CONNECTOR_DB)
            : await getInboundDefinitionLookup(projectPath, [requestedName], INBOUND_DB);
        const firstDefinition = firstLookup.definitionsByName[requestedName];

        let secondLookup: ConnectorDefinitionLookupResult | null = null;
        let targetType: ConnectorTargetType | null = null;
        let definition: any | null = firstDefinition || null;

        if (definition) {
            targetType = firstLookupType;
        } else {
            secondLookup = secondLookupType === 'connector'
                ? await getConnectorDefinitionLookup(projectPath, [requestedName], CONNECTOR_DB)
                : await getInboundDefinitionLookup(projectPath, [requestedName], INBOUND_DB);
            const secondDefinition = secondLookup.definitionsByName[requestedName];
            if (secondDefinition) {
                definition = secondDefinition;
                targetType = secondLookupType;
            }
        }

        const resolvedType = targetType || 'connector or inbound endpoint';
        const warningSet = new Set<string>([
            ...firstLookup.warnings,
            ...(secondLookup?.warnings || []),
        ]);
        const requestedOperations = normalizeSelectionNames(operation_names);
        const requestedConnections = normalizeSelectionNames(connection_names);

        if (include_full_descriptions && requestedOperations.length === 0 && requestedConnections.length === 0) {
            warningSet.add(
                'include_full_descriptions=true but both operation_names and connection_names are empty. ' +
                'Provide exact names to retrieve detailed parameter descriptions.'
            );
        }

        let message = '';
        const storeUnavailable = firstLookup.storeFailureNames.includes(requestedName)
            || !!secondLookup?.storeFailureNames.includes(requestedName);
        const fallbackUsed = firstLookup.fallbackUsedNames.includes(requestedName)
            || !!secondLookup?.fallbackUsedNames.includes(requestedName);
        const missingTarget = !definition;

        if (storeUnavailable) {
            message += `<system-reminder>\n`;
            message += `Connector store was unavailable for '${requestedName}' (${resolvedType}).\n`;
            message += `Used stale cache/local fallback where available.\n`;
            message += `</system-reminder>\n\n`;
            message += `Connector store unavailable for '${requestedName}' (${resolvedType}).\n`;
        }

        if (fallbackUsed) {
            message += `Used local fallback definition for '${requestedName}' (${resolvedType}).\n`;
        }

        if (!missingTarget && definition) {
            const versionTag = definition?.version?.tagName || 'unknown';
            const maven = getMavenCoordinate(definition);
            const operations = getOperationList(definition);
            const connections = getConnectionList(definition);
            const parameterAvailability = getParameterAvailability(definition);
            const operationList = operations
                .map((op: any) => (typeof op?.name === 'string' ? op.name : ''))
                .filter((name: string) => name.length > 0);
            const connectionList = connections
                .map((connection: any) => (typeof connection?.name === 'string' ? connection.name : ''))
                .filter((name: string) => name.length > 0);
            const hasInitOperation = operations.some((operation: any) => normalizeIdentifier(operation?.name) === 'init');
            const noInitializationNeeded = connectionList.length === 0;
            const connectionLocalEntryNeeded = noInitializationNeeded ? false : !hasInitOperation;
            const initializationGuidance = getInitializationGuidance(
                connectionLocalEntryNeeded,
                noInitializationNeeded
            );

            message += `<system-reminder>\n`;
            message += `Initialization guidance for '${requestedName}': ${initializationGuidance}\n`;
            message += `</system-reminder>\n`;

            const repoName = definition?.repoName || '';

            message += `\n### ${requestedName}\n`;
            if (repoName) {
                message += `- GitHub: wso2-extensions/${repoName}\n`;
            }
            message += `- Maven: ${maven}\n`;
            message += `- Version: ${versionTag}\n`;
            message += `- Parameter Details: ${parameterAvailability.summary}\n`;
            message += `- connectionLocalEntryNeeded: ${connectionLocalEntryNeeded}\n`;
            message += `- noInitializationNeeded: ${noInitializationNeeded}\n`;
            if (operationList.length > 0) {
                message += `- Operations: ${operationList.join(', ')}\n`;
            } else {
                message += `- Operations: unavailable\n`;
            }
            if (connectionList.length > 0) {
                message += `- Connections: ${connectionList.join(', ')}\n`;
            } else {
                message += `- Connections: unavailable\n`;
            }

            if (parameterAvailability.status === 'unavailable') {
                warningSet.add(
                    `Parameter details are currently unavailable for '${requestedName}' in store/fallback data. ` +
                    `Avoid include_full_descriptions calls for this item; they will not provide parameter data.`
                );
            } else if (parameterAvailability.status === 'partial') {
                warningSet.add(
                    `Parameter details are only partially available for '${requestedName}' ` +
                    `(${parameterAvailability.withParameters}/${parameterAvailability.total} operations). ` +
                    `Use include_full_descriptions only for selected operations.`
                );
            }

            if (include_full_descriptions && (requestedOperations.length > 0 || requestedConnections.length > 0)) {
                const detailPayload = buildSelectedOperationDetail(
                    requestedName,
                    definition,
                    requestedOperations,
                    requestedConnections,
                    warningSet
                );
                if (detailPayload) {
                    message += `\nSelected Operation Details:\n\`\`\`json\n${JSON.stringify(detailPayload, null, 2)}\n\`\`\`\n`;
                }
            }
        } else {
            message += `\nMissing ${resolvedType}: ${requestedName}\n`;
        }

        const warnings = Array.from(warningSet);
        if (warnings.length > 0) {
            message = `Warnings: ${warnings.join(' | ')}\n\n${message}`;
        }

        const success = !missingTarget && !!definition;

        logDebug(
            `[ConnectorTool] Retrieved ${resolvedType}: ${requestedName}` +
            ` | found=${success}` +
            ` | fallbackUsed=${fallbackUsed}, storeFailures=${storeUnavailable}` +
            ` | includeFull=${include_full_descriptions}`
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
    name: z.string()
        .min(1)
        .describe('Name of a single connector or inbound endpoint to fetch (e.g., "Gmail" or "Kafka (Inbound)"). Use the exact name from available catalogs; inbound endpoints usually include "(Inbound)".'),
    include_full_descriptions: z.boolean()
        .optional()
        .default(false)
        .describe('When true, returns detailed parameter descriptions for selected operation_names and/or connection_names. Use this only after checking summary availability lines to avoid unnecessary detail calls.'),
    operation_names: z.array(z.string())
        .optional()
        .describe('Operation names for targeted detailed output when include_full_descriptions=true. Example: ["sendMail","readMail"].'),
    connection_names: z.array(z.string())
        .optional()
        .describe('Connection names for targeted detailed output when include_full_descriptions=true. Example: ["IMAP","SMTP"].'),
});

/**
 * Creates the get_connector_definitions tool
 */
export function createConnectorTool(execute: ConnectorExecuteFn) {
    // Type assertion to avoid TypeScript deep instantiation issues with Zod
    return (tool as any)({
        description: `Retrieves definition for exactly one MI connector or inbound endpoint by name.
            Default output is a compact summary with Maven coordinate, version, operations, connections, and initialization flags.
            Set include_full_descriptions=true to include detailed parameter metadata for selected operation_names and/or connection_names.
            Call this tool in parallel for multiple connector or inbound names.`,
        inputSchema: connectorInputSchema,
        execute
    });
}
