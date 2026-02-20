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
import { CONNECTOR_DB } from '../context/connector_db';
import { INBOUND_DB } from '../context/inbound_db';
import { getConnectorStoreCatalog, getRuntimeVersionFromPom } from './connector_store_cache';

// ============================================================================
// Execute Function Types
// ============================================================================

export type ManageConnectorExecuteFn = (args: {
    operation: 'add' | 'remove';
    connector_names?: string[];
    inbound_endpoint_names?: string[];
}) => Promise<ToolResult>;

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
            let existingDependencies: any = { connectorDependencies: [], otherDependencies: [] };
            if (isAdd) {
                const langClient = await MILanguageClient.getInstance(projectPath);
                const projectDetails = await langClient.getProjectDetails();
                existingDependencies = projectDetails.dependencies || { connectorDependencies: [], otherDependencies: [] };
                logDebug(`[${toolName}] Existing connector dependencies: ${existingDependencies.connectorDependencies?.length || 0}`);
            }

            const results: Array<{ name: string; type: 'connector' | 'inbound'; success: boolean; alreadyAdded?: boolean; error?: string }> = [];
            const { connectors, inbounds } = await getConnectorStoreCatalog(projectPath, CONNECTOR_DB, INBOUND_DB);
            logDebug(`[${toolName}] Loaded connector catalog with ${connectors.length} connectors and ${inbounds.length} inbound endpoints`);

            // Process connectors if any
            if (connector_names.length > 0) {
                for (const connectorName of connector_names) {
                    const result = await processItem(
                        connectorName,
                        'connector',
                        connectors,
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
                        inbounds,
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

            let message = '';

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
    storeData: any[],
    existingDependencies: any,
    miVisualizerRpcManager: MiVisualizerRpcManager,
    isAdd: boolean,
    operation: 'add' | 'remove',
    toolName: string
): Promise<{ name: string; type: 'connector' | 'inbound'; success: boolean; alreadyAdded?: boolean; error?: string }> {
    try {
        const normalizedInput = normalizeConnectorIdentifier(itemName);

        // Match by connectorName and artifact identifiers (case-insensitive)
        const item = storeData.find(
            (c: any) => {
                const connectorName = normalizeConnectorIdentifier(c?.connectorName);
                const artifactId = normalizeConnectorIdentifier(c?.mavenArtifactId);
                const artifactShortName = normalizeConnectorIdentifier(stripConnectorPrefix(c?.mavenArtifactId));

                return normalizedInput === connectorName ||
                    normalizedInput === artifactId ||
                    normalizedInput === artifactShortName;
            }
        );

        if (!item) {
            return {
                name: itemName,
                type: itemType,
                success: false,
                error: `${itemType === 'connector' ? 'Connector' : 'Inbound endpoint'} not found in store`
            };
        }

        // For add operation, check if item is already in pom.xml
        if (isAdd) {
            const alreadyExists = existingDependencies.connectorDependencies?.some(
                (existingDep: any) =>
                    existingDep.groupId === item.mavenGroupId &&
                    existingDep.artifact === item.mavenArtifactId
            );

            if (alreadyExists) {
                logDebug(`[${toolName}] ${itemType} ${itemName} already exists in pom.xml`);
                return {
                    name: itemName,
                    type: itemType,
                    success: true,
                    alreadyAdded: true
                };
            }
        }

        // Prepare dependency details
        const dependencies: DependencyDetails[] = [{
            groupId: item.mavenGroupId,
            artifact: item.mavenArtifactId,
            version: item.version?.tagName,
            type: "zip"
        }];

        logDebug(`[${toolName}] ${isAdd ? 'Adding' : 'Removing'} ${itemType}: ${itemName} (${item.mavenArtifactId}:${item.version?.tagName})`);

        // Update pom.xml
        const response = await miVisualizerRpcManager.updateAiDependencies({
            dependencies,
            operation: operation
        });

        if (response) {
            return { name: itemName, type: itemType, success: true };
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

function stripConnectorPrefix(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }

    return value.replace(/^mi-(connector|module)-/i, '');
}

function normalizeConnectorIdentifier(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().toLowerCase();
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
    return (tool as any)({
        description: `Add or remove MI connector and inbound endpoint dependencies in pom.xml.
            Use 'add' when Synapse configs reference connector operations or inbound endpoints.
            Names must match <AVAILABLE_CONNECTORS> or <AVAILABLE_INBOUND_ENDPOINTS>.
            Can handle both connectors and inbound endpoints in a single call. Dependencies auto-reload after changes.`,
        inputSchema: manageConnectorInputSchema,
        execute
    });
}
