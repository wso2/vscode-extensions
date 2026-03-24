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
import { ToolResult } from './types';
import { MiVisualizerRpcManager } from '../../../rpc-managers/mi-visualizer/rpc-manager';
import { MILanguageClient } from '../../../lang-client/activator';
import { DependencyDetails } from '@wso2/mi-core';
import { logDebug, logError } from '../../copilot/logger';
import { AgentUndoCheckpointManager } from '../undo/checkpoint-manager';
import { CONNECTOR_DB } from '../context/connectors/connector_db';
import { INBOUND_DB } from '../context/connectors/inbound_db';
import {
    getConnectorDefinitions,
    getInboundDefinitions,
    ConnectorDefinitionLookupResult,
    getRuntimeVersionFromPom,
} from './connector_store_cache';

// ============================================================================
// Execute Function Types
// ============================================================================

export type ManageConnectorExecuteFn = (args: {
    operation: 'add' | 'remove';
    connector_names?: string[];
    inbound_endpoint_names?: string[];
}) => Promise<ToolResult>;

interface ProcessItemResult {
    name: string;
    type: 'connector' | 'inbound';
    success: boolean;
    alreadyAdded?: boolean;
    usedFallback?: boolean;
    storeFailure?: boolean;
    error?: string;
}

interface ConnectorDefinition {
    mavenGroupId?: string;
    mavenArtifactId?: string;
    version?: {
        tagName?: string;
    };
}

interface ExistingDependency {
    groupId: string;
    artifact: string;
    version?: string;
}

interface ExistingDependencies {
    connectorDependencies?: ExistingDependency[];
    otherDependencies?: ExistingDependency[];
}

// ============================================================================
// Execute Functions
// ============================================================================

/**
 * Creates the execute function for manage_connector tool
 * Handles both add and remove operations for connectors and inbound endpoints
 */
export function createManageConnectorExecute(
    projectPath: string,
    undoCheckpointManager?: AgentUndoCheckpointManager
): ManageConnectorExecuteFn {
    return async (args: { operation: 'add' | 'remove'; connector_names?: string[]; inbound_endpoint_names?: string[] }): Promise<ToolResult> => {
        const { operation, connector_names = [], inbound_endpoint_names = [] } = args;
        const isAdd = operation === 'add';
        const toolName = isAdd ? 'ManageConnector[add]' : 'ManageConnector[remove]';

        // Validate that at least one array has items
        if (connector_names.length === 0 && inbound_endpoint_names.length === 0) {
            return {
                success: false,
                message: 'At least one connector or inbound endpoint name must be provided.',
                error: 'Error: No connector or inbound endpoint names provided'
            };
        }

        logDebug(`[${toolName}] ${isAdd ? 'Adding' : 'Removing'} connectors: [${connector_names.join(', ')}], inbound endpoints: [${inbound_endpoint_names.join(', ')}]`);

        try {
            const miVisualizerRpcManager = new MiVisualizerRpcManager(projectPath);
            await undoCheckpointManager?.captureBeforeChange('pom.xml');

            // Get MI runtime version from pom.xml
            const runtimeVersion = await getRuntimeVersionFromPom(projectPath);
            logDebug(`[${toolName}] Runtime version: ${runtimeVersion}`);

            // For add operation, get existing dependencies to check for duplicates
            let existingDependencies: ExistingDependencies = { connectorDependencies: [], otherDependencies: [] };
            if (isAdd) {
                const langClient = await MILanguageClient.getInstance(projectPath);
                const projectDetails = await langClient.getProjectDetails();
                existingDependencies = projectDetails.dependencies || { connectorDependencies: [], otherDependencies: [] };
                logDebug(`[${toolName}] Existing connector dependencies: ${existingDependencies.connectorDependencies?.length || 0}`);
            }

            const emptyLookup: ConnectorDefinitionLookupResult = {
                definitionsByName: {},
                missingNames: [],
                fallbackUsedNames: [],
                storeFailureNames: [],
                warnings: [],
                runtimeVersionUsed: runtimeVersion || 'unknown',
            };

            const results: ProcessItemResult[] = [];
            const [connectorLookup, inboundLookup] = await Promise.all([
                connector_names.length > 0
                    ? getConnectorDefinitions(projectPath, connector_names, CONNECTOR_DB)
                    : Promise.resolve(emptyLookup),
                inbound_endpoint_names.length > 0
                    ? getInboundDefinitions(projectPath, inbound_endpoint_names, INBOUND_DB)
                    : Promise.resolve(emptyLookup),
            ]);

            if (connectorLookup.warnings.length > 0 || inboundLookup.warnings.length > 0) {
                logDebug(`[${toolName}] Connector lookup warnings: ${[...connectorLookup.warnings, ...inboundLookup.warnings].join(' | ')}`);
            }

            // Process connectors if any
            if (connector_names.length > 0) {
                for (const connectorName of connector_names) {
                    const result = await processItem(
                        connectorName,
                        'connector',
                        connectorLookup.definitionsByName[connectorName] ?? null,
                        connectorLookup.fallbackUsedNames.includes(connectorName),
                        connectorLookup.storeFailureNames.includes(connectorName),
                        existingDependencies,
                        miVisualizerRpcManager,
                        isAdd,
                        operation,
                        toolName
                    );
                    results.push(result);
                }
            }

            // Process inbound endpoints if any
            if (inbound_endpoint_names.length > 0) {
                for (const inboundName of inbound_endpoint_names) {
                    const result = await processItem(
                        inboundName,
                        'inbound',
                        inboundLookup.definitionsByName[inboundName] ?? null,
                        inboundLookup.fallbackUsedNames.includes(inboundName),
                        inboundLookup.storeFailureNames.includes(inboundName),
                        existingDependencies,
                        miVisualizerRpcManager,
                        isAdd,
                        operation,
                        toolName
                    );
                    results.push(result);
                }
            }

            logDebug(`[${toolName}] Results: ${JSON.stringify(results)}`);

            // Update connector dependencies (refresh connector list)
            try {
                await miVisualizerRpcManager.updateConnectorDependencies();
                logDebug(`[${toolName}] Connector dependencies updated`);
            } catch (updateError) {
                logError(`[${toolName}] Failed to update connector dependencies`, updateError);
            }

            // Reload dependencies after operation
            try {
                await miVisualizerRpcManager.reloadDependencies();
                logDebug(`[${toolName}] Dependencies reloaded successfully`);
            } catch (error) {
                logDebug(`[${toolName}] Warning: Failed to reload dependencies: ${error instanceof Error ? error.message : String(error)}`);
            }

            // Build response message
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            const fallbackUsed = results.filter(r => r.success && r.usedFallback);
            const storeFailed = results.filter((r) => !r.success && r.storeFailure);

            let message = '';

            if (fallbackUsed.length > 0) {
                message += `Used local fallback definitions for ${fallbackUsed.length} item(s):\n`;
                fallbackUsed.forEach(r => {
                    message += `  - ${r.name} (${r.type})\n`;
                });
                message += '\n';
            }

            if (isAdd) {
                const alreadyAdded = results.filter(r => r.success && r.alreadyAdded);
                const newlyAdded = results.filter(r => r.success && !r.alreadyAdded);

                if (newlyAdded.length > 0) {
                    message += `Successfully added ${newlyAdded.length} item(s):\n`;
                    newlyAdded.forEach(r => {
                        message += `  - ${r.name} (${r.type})\n`;
                    });
                }

                if (alreadyAdded.length > 0) {
                    if (message) message += '\n';
                    message += `${alreadyAdded.length} item(s) already present in project:\n`;
                    alreadyAdded.forEach(r => {
                        message += `  - ${r.name} (${r.type}, already added)\n`;
                    });
                }

                logDebug(`[${toolName}] Completed: ${newlyAdded.length} added, ${alreadyAdded.length} already present, ${failed.length} failed`);
            } else {
                if (successful.length > 0) {
                    message += `Successfully removed ${successful.length} item(s):\n`;
                    successful.forEach(r => {
                        message += `  - ${r.name} (${r.type})\n`;
                    });
                }

                logDebug(`[${toolName}] Removed ${successful.length}/${connector_names.length + inbound_endpoint_names.length} items`);
            }

            if (failed.length > 0) {
                if (message) message += '\n';
                message += `Failed to ${operation} ${failed.length} item(s):\n`;
                failed.forEach(r => {
                    message += `  - ${r.name} (${r.type}): ${r.error}\n`;
                });
            }

            if (storeFailed.length > 0) {
                message += `\nConnector store outage impacted ${storeFailed.length} item(s). `;
                message += `Those items were not in cache or fallback data.`;
            }

            return {
                success: successful.length > 0,
                message: message.trim()
            };
        } catch (error) {
            logError(`[${toolName}] Error ${isAdd ? 'adding' : 'removing'} items: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                message: `Failed to ${operation} connectors/inbound endpoints`,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    };
}

/**
 * Helper function to process a single connector or inbound endpoint
 */
async function processItem(
    itemName: string,
    itemType: 'connector' | 'inbound',
    resolvedItem: ConnectorDefinition | null,
    usedFallback: boolean,
    storeFailure: boolean,
    existingDependencies: ExistingDependencies,
    miVisualizerRpcManager: MiVisualizerRpcManager,
    isAdd: boolean,
    operation: 'add' | 'remove',
    toolName: string
): Promise<ProcessItemResult> {
    try {
        if (!resolvedItem) {
            return {
                name: itemName,
                type: itemType,
                success: false,
                storeFailure,
                error: storeFailure
                    ? `${itemType === 'connector' ? 'Connector' : 'Inbound endpoint'} is unavailable because connector store is unavailable and no cache/fallback definition exists`
                    : `${itemType === 'connector' ? 'Connector' : 'Inbound endpoint'} not found in connector store or fallback`
            };
        }

        const mavenGroupId = typeof resolvedItem?.mavenGroupId === 'string' ? resolvedItem.mavenGroupId.trim() : '';
        const mavenArtifactId = typeof resolvedItem?.mavenArtifactId === 'string' ? resolvedItem.mavenArtifactId.trim() : '';
        const versionTag = typeof resolvedItem?.version?.tagName === 'string' ? resolvedItem.version.tagName.trim() : '';

        if (!mavenGroupId || !mavenArtifactId) {
            return {
                name: itemName,
                type: itemType,
                success: false,
                error: `${itemType === 'connector' ? 'Connector' : 'Inbound endpoint'} definition is missing Maven coordinates`
            };
        }

        if (!versionTag) {
            return {
                name: itemName,
                type: itemType,
                success: false,
                error: `${itemType === 'connector' ? 'Connector' : 'Inbound endpoint'} definition is missing a valid version tag`
            };
        }

        // For add operation, check if item is already in pom.xml
        if (isAdd) {
            const alreadyExists = existingDependencies.connectorDependencies?.some(
                (existingDep: ExistingDependency) =>
                    existingDep.groupId === mavenGroupId &&
                    existingDep.artifact === mavenArtifactId
            );

            if (alreadyExists) {
                logDebug(`[${toolName}] ${itemType} ${itemName} already exists in pom.xml`);
                return {
                    name: itemName,
                    type: itemType,
                    success: true,
                    alreadyAdded: true,
                    usedFallback
                };
            }
        }

        // Prepare dependency details
        const dependencies: DependencyDetails[] = [{
            groupId: mavenGroupId,
            artifact: mavenArtifactId,
            version: versionTag,
            type: "zip"
        }];

        logDebug(`[${toolName}] ${isAdd ? 'Adding' : 'Removing'} ${itemType}: ${itemName} (${mavenArtifactId}:${versionTag})`);

        // Update pom.xml
        const response = await miVisualizerRpcManager.updateAiDependencies({
            dependencies,
            operation: operation
        });

        if (response) {
            return { name: itemName, type: itemType, success: true, usedFallback };
        } else {
            return {
                name: itemName,
                type: itemType,
                success: false,
                error: 'Failed to update pom.xml'
            };
        }
    } catch (error) {
        return {
            name: itemName,
            type: itemType,
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}


// ============================================================================
// Tool Definitions (Vercel AI SDK format)
// ============================================================================

const manageConnectorInputSchema = z.object({
    operation: z.enum(['add', 'remove'])
        .describe('Operation to perform: "add" to add items, "remove" to remove them'),
    connector_names: z.array(z.string())
        .optional()
        .describe('Array of connector names (e.g., ["AI", "Salesforce", "Gmail"])'),
    inbound_endpoint_names: z.array(z.string())
        .optional()
        .describe('Array of inbound endpoint names (e.g., ["KAFKA", "RabbitMQ", "JMS"])'),
});

/**
 * Creates the manage_connector tool (unified add/remove for connectors and inbound endpoints)
 */
export function createManageConnectorTool(execute: ManageConnectorExecuteFn) {
    return tool({
        description: `Add or remove MI connector and inbound endpoint dependencies in pom.xml.
            Use 'add' when Synapse configs reference connector operations or inbound endpoints.
            Names must match <AVAILABLE_CONNECTORS> or <AVAILABLE_INBOUND_ENDPOINTS>.
            Can handle both connectors and inbound endpoints in a single call. Dependencies auto-reload after changes.`,
        inputSchema: manageConnectorInputSchema,
        execute
    });
}
