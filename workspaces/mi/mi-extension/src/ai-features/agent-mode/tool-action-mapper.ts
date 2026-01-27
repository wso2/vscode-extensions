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

import { MANAGE_CONNECTOR_TOOL_NAME, ASK_USER_TOOL_NAME, BUILD_PROJECT_TOOL_NAME, CONNECTOR_TOOL_NAME, CREATE_DATA_MAPPER_TOOL_NAME, ENTER_PLAN_MODE_TOOL_NAME, EXIT_PLAN_MODE_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_GLOB_TOOL_NAME, FILE_GREP_TOOL_NAME, FILE_MULTI_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME, FILE_WRITE_TOOL_NAME, GENERATE_DATA_MAPPING_TOOL_NAME, GET_AI_CONNECTOR_DOCUMENTATION_TOOL_NAME, GET_CONNECTOR_DOCUMENTATION_TOOL_NAME, SERVER_MANAGEMENT_TOOL_NAME, TASK_TOOL_NAME, TODO_WRITE_TOOL_NAME, VALIDATE_CODE_TOOL_NAME } from './tools/types';
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
        case FILE_WRITE_TOOL_NAME:
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

        case FILE_EDIT_TOOL_NAME:
        case FILE_MULTI_EDIT_TOOL_NAME:
            return { loading: 'updating', completed: 'updated', failed: 'failed to update' };

        case FILE_READ_TOOL_NAME:
            return { loading: 'reading', completed: 'read', failed: 'failed to read' };

        case FILE_GREP_TOOL_NAME:
            return { loading: 'searching file contents', completed: 'searched file contents', failed: 'search failed' };

        case FILE_GLOB_TOOL_NAME:
            return { loading: 'finding files', completed: 'found files', failed: 'failed to find files' };

        case CONNECTOR_TOOL_NAME:
            return { loading: 'fetching connectors', completed: 'fetched connectors', failed: 'failed to fetch connectors' };

        case GET_CONNECTOR_DOCUMENTATION_TOOL_NAME:
        case GET_AI_CONNECTOR_DOCUMENTATION_TOOL_NAME:
            return { loading: 'retrieving documentation', completed: 'retrieved', failed: 'failed to retrieve' };

        case MANAGE_CONNECTOR_TOOL_NAME:
            // Extract operation and connector names from tool input
            const operation = toolInput?.operation || 'managing';
            const isAdding = operation === 'add';
            if (toolInput?.connector_names && Array.isArray(toolInput.connector_names)) {
                const names = toolInput.connector_names;
                const connectorList = names.length === 1
                    ? names[0]
                    : names.length === 2
                        ? `${names[0]} and ${names[1]}`
                        : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
                return isAdding
                    ? { loading: `adding ${connectorList}`, completed: `added ${connectorList}`, failed: `failed to add ${connectorList}` }
                    : { loading: `removing ${connectorList}`, completed: `removed ${connectorList}`, failed: `failed to remove ${connectorList}` };
            }
            return isAdding
                ? { loading: 'adding connector', completed: 'added connector', failed: 'failed to add connector' }
                : { loading: 'removing connector', completed: 'removed connector', failed: 'failed to remove connector' };

        case VALIDATE_CODE_TOOL_NAME:
            return { loading: 'validating', completed: 'validated', failed: 'validation failed' };

        case CREATE_DATA_MAPPER_TOOL_NAME:
            return { loading: 'creating data mapper', completed: 'created data mapper', failed: 'failed to create data mapper' };

        case GENERATE_DATA_MAPPING_TOOL_NAME:
            return { loading: 'generating mappings', completed: 'generated mappings', failed: 'failed to generate mappings' };

        case BUILD_PROJECT_TOOL_NAME:
            return { loading: 'building project', completed: 'built project', failed: 'build failed' };

        case SERVER_MANAGEMENT_TOOL_NAME:
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

        // Plan Mode Tools
        case TASK_TOOL_NAME:
            // Extract subagent type for dynamic messages
            const subagentType = toolInput?.subagent_type || 'subagent';
            return {
                loading: `running ${subagentType} agent`,
                completed: `${subagentType} agent completed`,
                failed: `${subagentType} agent failed`
            };

        case ASK_USER_TOOL_NAME:
            return { loading: 'asking user', completed: 'received response', failed: 'question timed out' };

        case ENTER_PLAN_MODE_TOOL_NAME:
            return { loading: 'entering plan mode', completed: 'entered plan mode', failed: 'failed to enter plan mode' };

        case EXIT_PLAN_MODE_TOOL_NAME:
            return { loading: 'exiting plan mode', completed: 'exited plan mode', failed: 'failed to exit plan mode' };

        case TODO_WRITE_TOOL_NAME:
            // Extract task count for dynamic messages
            const taskCount = toolInput?.todos?.length || 0;
            return {
                loading: `updating ${taskCount} task(s)`,
                completed: `updated ${taskCount} task(s)`,
                failed: 'failed to update tasks'
            };

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
