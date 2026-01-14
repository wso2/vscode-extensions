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
import { ToolResult } from './types';
import { MiVisualizerRpcManager } from '../../../rpc-managers/mi-visualizer/rpc-manager';
import { MILanguageClient } from '../../../lang-client/activator';
import { getMIVersionFromPom } from '../../../util/onboardingUtils';
import { APIS } from '../../../constants';
import { DependencyDetails } from '@wso2/mi-core';
import { logDebug, logError } from '../../copilot/logger';
import { getProviderCacheControl } from '../../connection';

// ============================================================================
// Execute Function Types
// ============================================================================

export type AddConnectorExecuteFn = (args: {
    connector_names: string[];
}) => Promise<ToolResult>;

export type RemoveConnectorExecuteFn = (args: {
    connector_names: string[];
}) => Promise<ToolResult>;

// ============================================================================
// Execute Functions
// ============================================================================

/**
 * Creates the execute function for add_connector tool
 */
export function createAddConnectorExecute(projectPath: string): AddConnectorExecuteFn {
    return async (args: { connector_names: string[] }): Promise<ToolResult> => {
        const { connector_names } = args;

        logDebug(`[AddConnectorTool] Adding ${connector_names.length} connector(s): ${connector_names.join(', ')}`);

        if (connector_names.length === 0) {
            return {
                success: false,
                message: 'At least one connector name must be provided.',
                error: 'Error: No connector names provided'
            };
        }

        try {
            const miVisualizerRpcManager = new MiVisualizerRpcManager(projectPath);

            // Get MI runtime version from pom.xml
            const runtimeVersion = await getMIVersionFromPom(projectPath);
            logDebug(`[AddConnectorTool] Runtime version: ${runtimeVersion}`);

            // Fetch connector store data
            const connectorStoreResponse = await fetch(
                APIS.MI_CONNECTOR_STORE_BACKEND.replace('${version}', runtimeVersion ?? '')
            );

            logDebug(`[AddConnectorTool] Fetching connectors from: ${APIS.MI_CONNECTOR_STORE_BACKEND.replace('${version}', runtimeVersion ?? '')}`);
            logDebug(`[AddConnectorTool] Fetching connectors from: ${APIS.MI_CONNECTOR_STORE_BACKEND}`);

            if (!connectorStoreResponse.ok) {
                const errorMsg = `Failed to fetch connector store: ${connectorStoreResponse.status} ${connectorStoreResponse.statusText}`;
                logError(`[AddConnectorTool] ${errorMsg}`);
                return {
                    success: false,
                    message: errorMsg
                };
            }

            const connectorStoreData = await connectorStoreResponse.json();

            // Validate that response is an array
            if (!Array.isArray(connectorStoreData)) {
                logError('[AddConnectorTool] Connector store API did not return an array', connectorStoreData);
                return {
                    success: false,
                    message: 'Invalid response from connector store API'
                };
            }

            logDebug(`[AddConnectorTool] Fetched ${connectorStoreData.length} connectors from store`);

            // Get existing dependencies from pom.xml
            const langClient = await MILanguageClient.getInstance(projectPath);
            const projectDetails = await langClient.getProjectDetails();
            const existingDependencies = projectDetails.dependencies || { connectorDependencies: [], otherDependencies: [] };

            logDebug(`[AddConnectorTool] Existing connector dependencies: ${existingDependencies.connectorDependencies?.length || 0}`);

            const results: Array<{ name: string; success: boolean; alreadyAdded?: boolean; error?: string }> = [];

            // Add each connector
            for (const connectorName of connector_names) {
                try {
                    // Match by connectorName field (case-insensitive)
                    const connector = connectorStoreData.find(
                        (c: any) => c.connectorName?.toLowerCase() === connectorName.toLowerCase()
                    );

                    if (!connector) {
                        results.push({
                            name: connectorName,
                            success: false,
                            error: 'Connector not found in connector store'
                        });
                        continue;
                    }

                    // Check if connector is already in pom.xml
                    const alreadyExists = existingDependencies.connectorDependencies?.some(
                        (existingDep: any) =>
                            existingDep.groupId === connector.mavenGroupId &&
                            existingDep.artifact === connector.mavenArtifactId
                    );

                    if (alreadyExists) {
                        logDebug(`[AddConnectorTool] Connector ${connectorName} already exists in pom.xml`);
                        results.push({
                            name: connectorName,
                            success: true,
                            alreadyAdded: true
                        });
                        continue;
                    }

                    // Prepare dependency details
                    const dependencies: DependencyDetails[] = [{
                        groupId: connector.mavenGroupId,
                        artifact: connector.mavenArtifactId,
                        version: connector.version?.tagName,
                        type: "zip"
                    }];

                    logDebug(`[AddConnectorTool] Adding connector: ${connectorName} (${connector.mavenArtifactId}:${connector.version?.tagName})`);

                    // Add dependency to pom.xml
                    const response = await miVisualizerRpcManager.updateAiDependencies({
                        dependencies,
                        operation: 'add'
                    });

                    if (response) {
                        results.push({ name: connectorName, success: true });
                    } else {
                        results.push({
                            name: connectorName,
                            success: false,
                            error: 'Failed to update pom.xml'
                        });
                    }
                } catch (error) {
                    results.push({
                        name: connectorName,
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }

            logDebug(`[AddConnectorTool] Results: ${JSON.stringify(results)}`);

            // Update connector dependencies (refresh connector list)
            try {
                await miVisualizerRpcManager.updateConnectorDependencies();
                logDebug('[AddConnectorTool] Connector dependencies updated');
            } catch (updateError) {
                logError('[AddConnectorTool] Failed to update connector dependencies', updateError);
            }

            // Reload dependencies after adding connectors
            try {
                await miVisualizerRpcManager.reloadDependencies();
                logDebug('[AddConnectorTool] Dependencies reloaded successfully');
            } catch (error) {
                logDebug(`[AddConnectorTool] Warning: Failed to reload dependencies: ${error instanceof Error ? error.message : String(error)}`);
            }

            // Build response message
            const successful = results.filter(r => r.success);
            const alreadyAdded = results.filter(r => r.success && r.alreadyAdded);
            const newlyAdded = results.filter(r => r.success && !r.alreadyAdded);
            const failed = results.filter(r => !r.success);

            let message = '';
            if (newlyAdded.length > 0) {
                message += `Successfully added ${newlyAdded.length} connector(s):\n`;
                newlyAdded.forEach(r => {
                    message += `  ✓ ${r.name}\n`;
                });
            }

            if (alreadyAdded.length > 0) {
                if (message) message += '\n';
                message += `${alreadyAdded.length} connector(s) already present in project:\n`;
                alreadyAdded.forEach(r => {
                    message += `  ✓ ${r.name} (already added)\n`;
                });
            }

            if (failed.length > 0) {
                if (message) message += '\n';
                message += `Failed to add ${failed.length} connector(s):\n`;
                failed.forEach(r => {
                    message += `  ✗ ${r.name}: ${r.error}\n`;
                });
            }

            logDebug(`[AddConnectorTool] Completed: ${newlyAdded.length} added, ${alreadyAdded.length} already present, ${failed.length} failed`);

            return {
                success: successful.length > 0,
                message: message.trim()
            };
        } catch (error) {
            logError(`[AddConnectorTool] Error adding connectors: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                message: 'Failed to add connectors',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    };
}

/**
 * Creates the execute function for remove_connector tool
 */
export function createRemoveConnectorExecute(projectPath: string): RemoveConnectorExecuteFn {
    return async (args: { connector_names: string[] }): Promise<ToolResult> => {
        const { connector_names } = args;

        logDebug(`[RemoveConnectorTool] Removing ${connector_names.length} connector(s): ${connector_names.join(', ')}`);

        if (connector_names.length === 0) {
            return {
                success: false,
                message: 'At least one connector name must be provided.',
                error: 'Error: No connector names provided'
            };
        }

        try {
            const miVisualizerRpcManager = new MiVisualizerRpcManager(projectPath);

            // Get MI runtime version from pom.xml
            const runtimeVersion = await getMIVersionFromPom(projectPath);
            logDebug(`[RemoveConnectorTool] Runtime version: ${runtimeVersion}`);

            // Fetch connector store data
            const connectorStoreResponse = await fetch(
                APIS.MI_CONNECTOR_STORE_BACKEND.replace('${version}', runtimeVersion ?? '')
            );

            if (!connectorStoreResponse.ok) {
                const errorMsg = `Failed to fetch connector store: ${connectorStoreResponse.status} ${connectorStoreResponse.statusText}`;
                logError(`[RemoveConnectorTool] ${errorMsg}`);
                return {
                    success: false,
                    message: errorMsg
                };
            }

            const connectorStoreData = await connectorStoreResponse.json();

            // Validate that response is an array
            if (!Array.isArray(connectorStoreData)) {
                logError('[RemoveConnectorTool] Connector store API did not return an array', connectorStoreData);
                return {
                    success: false,
                    message: 'Invalid response from connector store API'
                };
            }

            logDebug(`[RemoveConnectorTool] Fetched ${connectorStoreData.length} connectors from store`);

            const results: Array<{ name: string; success: boolean; error?: string }> = [];

            // Remove each connector
            for (const connectorName of connector_names) {
                try {
                    // Match by connectorName field (case-insensitive)
                    const connector = connectorStoreData.find(
                        (c: any) => c.connectorName?.toLowerCase() === connectorName.toLowerCase()
                    );

                    if (!connector) {
                        results.push({
                            name: connectorName,
                            success: false,
                            error: 'Connector not found in connector store'
                        });
                        continue;
                    }

                    // Prepare dependency details
                    const dependencies: DependencyDetails[] = [{
                        groupId: connector.mavenGroupId,
                        artifact: connector.mavenArtifactId,
                        version: connector.version?.tagName,
                        type: "zip"
                    }];

                    logDebug(`[RemoveConnectorTool] Removing connector: ${connectorName} (${connector.mavenArtifactId}:${connector.version?.tagName})`);

                    // Remove dependency from pom.xml
                    const response = await miVisualizerRpcManager.updateAiDependencies({
                        dependencies,
                        operation: 'remove'
                    });

                    if (response) {
                        results.push({ name: connectorName, success: true });
                    } else {
                        results.push({
                            name: connectorName,
                            success: false,
                            error: 'Failed to update pom.xml'
                        });
                    }
                } catch (error) {
                    results.push({
                        name: connectorName,
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }

            logDebug(`[RemoveConnectorTool] Results: ${JSON.stringify(results)}`);

            // Update connector dependencies (refresh connector list)
            try {
                await miVisualizerRpcManager.updateConnectorDependencies();
                logDebug('[RemoveConnectorTool] Connector dependencies updated');
            } catch (updateError) {
                logError('[RemoveConnectorTool] Failed to update connector dependencies', updateError);
            }

            // Reload dependencies after removing connectors
            try {
                await miVisualizerRpcManager.reloadDependencies();
                logDebug('[RemoveConnectorTool] Dependencies reloaded successfully');
            } catch (error) {
                logDebug(`[RemoveConnectorTool] Warning: Failed to reload dependencies: ${error instanceof Error ? error.message : String(error)}`);
            }

            // Build response message
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            let message = '';
            if (successful.length > 0) {
                message += `Successfully removed ${successful.length} connector(s):\n`;
                successful.forEach(r => {
                    message += `  ✓ ${r.name}\n`;
                });
            }

            if (failed.length > 0) {
                message += `\nFailed to remove ${failed.length} connector(s):\n`;
                failed.forEach(r => {
                    message += `  ✗ ${r.name}: ${r.error}\n`;
                });
            }

            logDebug(`[RemoveConnectorTool] Removed ${successful.length}/${connector_names.length} connectors`);

            return {
                success: successful.length > 0,
                message: message.trim()
            };
        } catch (error) {
            logError(`[RemoveConnectorTool] Error removing connectors: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                message: 'Failed to remove connectors',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    };
}


// ============================================================================
// Tool Definitions (Vercel AI SDK format)
// ============================================================================

const addConnectorInputSchema = z.object({
    connector_names: z.array(z.string())
        .min(1)
        .describe('Array of connector names to add to the project (e.g., ["AI", "Salesforce", "Gmail"])'),
});

const removeConnectorInputSchema = z.object({
    connector_names: z.array(z.string())
        .min(1)
        .describe('Array of connector names to remove from the project (e.g., ["AI", "Salesforce"])'),
});

/**
 * Creates the add_connector tool
 */
export function createAddConnectorTool(execute: AddConnectorExecuteFn) {
    return (tool as any)({
        description: `
            Adds MI connectors or inbound endpoints to the project.

            This tool:
            - Fetches connector metadata from the MI Connector Store
            - Adds connector dependencies to pom.xml
            - Updates project configuration
            - Reloads dependencies to ensure connectors are available

            Usage:
            - Use this tool when you need to add connectors that are referenced in Synapse configurations
            - The connector must exist in the available connectors list
            - Common connectors: AI, Salesforce, Gmail, File, HTTP, SOAP, etc.

            When to use:
            - After writing Synapse XML that uses connector operations (e.g., <salesforce.query>)
            - Before validating code that references connectors
            - When the user explicitly requests to add a connector

            Important:
            - Connector names should match the available connectors list (see <AVAILABLE_CONNECTORS>)
            - The tool automatically handles Maven dependency resolution
            - Dependencies are reloaded after adding connectors

            Example:
            - To add AI and Salesforce connectors: connector_names: ["AI", "Salesforce"]`,
        inputSchema: addConnectorInputSchema,
        providerOptions: getProviderCacheControl(),
        execute
    });
}

/**
 * Creates the remove_connector tool
 */
export function createRemoveConnectorTool(execute: RemoveConnectorExecuteFn) {
    return (tool as any)({
        description: `
            Removes MI connectors or inbound endpoints from the project.

            This tool:
            - Removes connector dependencies from pom.xml
            - Updates project configuration
            - Reloads dependencies to reflect changes

            Usage:
            - Use this tool to clean up unused connectors
            - Helps reduce project size and dependency conflicts

            When to use:
            - When removing Synapse configurations that use specific connectors
            - When the user explicitly requests to remove a connector
            - During project cleanup

            Important:
            - Only removes connectors that are currently in the project
            - Dependencies are reloaded after removing connectors
            - Removing a connector will cause validation errors if it's still used in Synapse configs

            Example:
            - To remove AI connector: connector_names: ["AI"]`,
        inputSchema: removeConnectorInputSchema,
        providerOptions: getProviderCacheControl(),
        execute
    });
}

