/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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

/**
 * Tool action states for UI display
 */
export interface ToolActions {
    /** Action text shown during tool execution (e.g., "creating", "reading") */
    loading: string;
    /** Action text shown after successful tool completion (e.g., "created", "read") */
    completed: string;
    /** Action text shown after tool failure (e.g., "failed to create", "failed to read") */
    failed: string;
}

/**
 * Get user-friendly action text for tool execution
 * This is the single source of truth for action mapping across the application
 *
 * @param toolName - Name of the tool
 * @param toolResult - Tool execution result (may contain messages that affect completed action)
 * @param toolInput - Tool input arguments (used to extract dynamic info like connector names)
 * @returns ToolActions object with loading and completed states, or undefined if tool not recognized
 */
export function getToolAction(toolName: string, toolResult?: any, toolInput?: any): ToolActions | undefined {
    switch (toolName) {
        case 'file_write':
            // Completed action depends on result (created vs updated)
            let completedAction = 'created';
            let failedAction = 'failed to create';
            if (toolResult?.message) {
                if (toolResult.message.includes('created')) {
                    completedAction = 'created';
                    failedAction = 'failed to create';
                } else if (toolResult.message.includes('updated')) {
                    completedAction = 'updated';
                    failedAction = 'failed to update';
                }
            }
            return { loading: 'creating', completed: completedAction, failed: failedAction };

        case 'file_edit':
        case 'file_multi_edit':
            return { loading: 'updating', completed: 'updated', failed: 'failed to update' };

        case 'file_read':
            return { loading: 'reading', completed: 'read', failed: 'failed to read' };

        case 'grep':
            return { loading: 'searching file contents', completed: 'searched file contents', failed: 'search failed' };

        case 'glob':
            return { loading: 'finding files', completed: 'found files', failed: 'failed to find files' };

        case 'get_connector_definitions':
            return { loading: 'fetching connectors', completed: 'fetched connectors', failed: 'failed to fetch connectors' };

        case 'get_connector_documentation':
        case 'get_ai_connector_documentation':
            return { loading: 'retrieving documentation', completed: 'retrieved', failed: 'failed to retrieve' };

        case 'add_connector_to_project_pom':
            // Extract connector names from tool input
            if (toolInput?.connector_names && Array.isArray(toolInput.connector_names)) {
                const names = toolInput.connector_names;
                const connectorList = names.length === 1
                    ? names[0]
                    : names.length === 2
                        ? `${names[0]} and ${names[1]}`
                        : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
                return {
                    loading: `adding ${connectorList}`,
                    completed: `added ${connectorList}`,
                    failed: `failed to add ${connectorList}`
                };
            }
            return { loading: 'adding connector', completed: 'added connector', failed: 'failed to add connector' };

        case 'remove_connector_from_project_pom':
            // Extract connector names from tool input
            if (toolInput?.connector_names && Array.isArray(toolInput.connector_names)) {
                const names = toolInput.connector_names;
                const connectorList = names.length === 1
                    ? names[0]
                    : names.length === 2
                        ? `${names[0]} and ${names[1]}`
                        : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
                return {
                    loading: `removing ${connectorList}`,
                    completed: `removed ${connectorList}`,
                    failed: `failed to remove ${connectorList}`
                };
            }
            return { loading: 'removing connector', completed: 'removed connector', failed: 'failed to remove connector' };

        case 'validate_code':
            return { loading: 'validating', completed: 'validated', failed: 'validation failed' };

        case 'create_data_mapper':
            return { loading: 'creating data mapper', completed: 'created data mapper', failed: 'failed to create data mapper' };

        case 'generate_data_mapping':
            return { loading: 'generating mappings', completed: 'generated mappings', failed: 'failed to generate mappings' };

        case 'build_project':
            return { loading: 'building project', completed: 'built project', failed: 'build failed' };

        case 'server_management':
            // Extract action from tool input for dynamic messages
            if (toolInput?.action) {
                switch (toolInput.action) {
                    case 'run':
                        return { loading: 'starting server', completed: 'started server', failed: 'failed to start server' };
                    case 'stop':
                        return { loading: 'stopping server', completed: 'stopped server', failed: 'failed to stop server' };
                    case 'status':
                        return { loading: 'checking server status', completed: 'checked server status', failed: 'failed to check status' };
                }
            }
            return { loading: 'managing server', completed: 'managed server', failed: 'server management failed' };

        default:
            return undefined;
    }
}

/**
 * Get capitalized action text for display
 * @param action - The action string to capitalize
 * @returns Capitalized action string
 */
export function capitalizeAction(action: string): string {
    return action.charAt(0).toUpperCase() + action.slice(1);
}
