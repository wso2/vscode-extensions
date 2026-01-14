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
 * @returns ToolActions object with loading and completed states, or undefined if tool not recognized
 */
export function getToolAction(toolName: string, toolResult?: any): ToolActions | undefined {
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
            return { loading: 'searching', completed: 'searched', failed: 'search failed' };

        case 'glob':
            return { loading: 'finding', completed: 'found', failed: 'failed to find' };

        case 'get_connector_definitions':
            return { loading: 'fetching connectors', completed: 'fetched', failed: 'failed to fetch' };

        case 'get_connector_documentation':
        case 'get_ai_connector_documentation':
            return { loading: 'retrieving documentation', completed: 'retrieved', failed: 'failed to retrieve' };

        case 'add_connector_to_project_pom':
            return { loading: 'adding connector', completed: 'added', failed: 'failed to add' };

        case 'remove_connector_from_project_pom':
            return { loading: 'removing connector', completed: 'removed', failed: 'failed to remove' };

        case 'validate_code':
            return { loading: 'validating', completed: 'validated', failed: 'validation failed' };

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
