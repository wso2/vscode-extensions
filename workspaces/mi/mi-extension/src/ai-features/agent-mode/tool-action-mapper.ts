/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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

import { MANAGE_CONNECTOR_TOOL_NAME, ASK_USER_TOOL_NAME, BUILD_PROJECT_TOOL_NAME, CONNECTOR_TOOL_NAME, SKILL_TOOL_NAME, CREATE_DATA_MAPPER_TOOL_NAME, ENTER_PLAN_MODE_TOOL_NAME, EXIT_PLAN_MODE_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_GLOB_TOOL_NAME, FILE_GREP_TOOL_NAME, FILE_READ_TOOL_NAME, FILE_WRITE_TOOL_NAME, GENERATE_DATA_MAPPING_TOOL_NAME, SERVER_MANAGEMENT_TOOL_NAME, SUBAGENT_TOOL_NAME, TODO_WRITE_TOOL_NAME, VALIDATE_CODE_TOOL_NAME, BASH_TOOL_NAME, KILL_TASK_TOOL_NAME, TASK_OUTPUT_TOOL_NAME, WEB_SEARCH_TOOL_NAME, WEB_FETCH_TOOL_NAME } from './tools/types';
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
        case FILE_WRITE_TOOL_NAME: {
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
        }

        case FILE_EDIT_TOOL_NAME:
            return { loading: 'updating', completed: 'updated', failed: 'failed to update' };

        case FILE_READ_TOOL_NAME:
            return { loading: 'reading', completed: 'read', failed: 'failed to read' };

        case FILE_GREP_TOOL_NAME:
            return { loading: 'searching file contents', completed: 'searched file contents', failed: 'search failed' };

        case FILE_GLOB_TOOL_NAME:
            return { loading: 'finding files', completed: 'found files', failed: 'failed to find files' };

        case CONNECTOR_TOOL_NAME:
            return { loading: 'fetching connectors', completed: 'fetched connectors', failed: 'failed to fetch connectors' };

        case SKILL_TOOL_NAME:
            return { loading: 'loading skill context', completed: 'loaded skill context', failed: 'failed to load skill context' };

        case MANAGE_CONNECTOR_TOOL_NAME: {
            // Extract operation, connector names, and inbound endpoint names from tool input
            const operation = toolInput?.operation || 'managing';
            const isAdding = operation === 'add';
            const connectorNames = toolInput?.connector_names || [];
            const inboundNames = toolInput?.inbound_endpoint_names || [];
            const allNames = [...connectorNames, ...inboundNames];
            
            if (allNames.length > 0) {
                const itemList = allNames.length === 1
                    ? allNames[0]
                    : allNames.length === 2
                        ? `${allNames[0]} and ${allNames[1]}`
                        : `${allNames.slice(0, -1).join(', ')}, and ${allNames[allNames.length - 1]}`;
                return isAdding
                    ? { loading: `adding ${itemList}`, completed: `added ${itemList}`, failed: `failed to add ${itemList}` }
                    : { loading: `removing ${itemList}`, completed: `removed ${itemList}`, failed: `failed to remove ${itemList}` };
            }
            return isAdding
                ? { loading: 'adding dependency', completed: 'added dependency', failed: 'failed to add dependency' }
                : { loading: 'removing dependency', completed: 'removed dependency', failed: 'failed to remove dependency' };
        }

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
        case SUBAGENT_TOOL_NAME: {
            // Extract subagent type and background mode for dynamic messages
            const subagentType = toolInput?.subagent_type || 'subagent';
            const isBackgroundTask = toolInput?.run_in_background;
            return {
                loading: isBackgroundTask ? `launching ${subagentType} agent` : `running ${subagentType} agent`,
                completed: isBackgroundTask ? `launched ${subagentType} agent` : `${subagentType} agent completed`,
                failed: `${subagentType} agent failed`
            };
        }

        case ASK_USER_TOOL_NAME:
            return { loading: 'asking user', completed: 'received response', failed: 'question timed out' };

        case ENTER_PLAN_MODE_TOOL_NAME:
            return { loading: 'entering plan mode', completed: 'entered plan mode', failed: 'failed to enter plan mode' };

        case EXIT_PLAN_MODE_TOOL_NAME:
            return { loading: 'exiting plan mode', completed: 'exited plan mode', failed: 'failed to exit plan mode' };

        case TODO_WRITE_TOOL_NAME: {
            // Extract task count for dynamic messages
            const taskCount = toolInput?.todos?.length || 0;
            return {
                loading: `updating ${taskCount} task(s)`,
                completed: `updated ${taskCount} task(s)`,
                failed: 'failed to update tasks'
            };
        }

        // Shell Tools
        case BASH_TOOL_NAME: {
            // Use description if provided, otherwise show command preview
            const bashDesc = toolInput?.description;
            const command = toolInput?.command;
            const cmdPreview = command
                ? command.substring(0, 50) + (command.length > 50 ? '...' : '')
                : undefined;
            const displayText = bashDesc || cmdPreview || 'command';
            return {
                loading: `running: ${displayText}`,
                completed: `ran: ${displayText}`,
                failed: `failed: ${displayText}`
            };
        }

        case KILL_TASK_TOOL_NAME: {
            const taskToKillId = toolInput?.task_id?.substring(0, 8) || 'task';
            return {
                loading: `killing task ${taskToKillId}`,
                completed: `killed task ${taskToKillId}`,
                failed: `failed to kill task ${taskToKillId}`
            };
        }

        case TASK_OUTPUT_TOOL_NAME: {
            const taskId = toolInput?.task_id?.substring(0, 8) || 'task';
            const isBlocking = toolInput?.block !== false;
            return {
                loading: isBlocking ? `waiting for task ${taskId}` : `checking task ${taskId}`,
                completed: `got output from task ${taskId}`,
                failed: `failed to get task ${taskId} output`
            };
        }

        case WEB_SEARCH_TOOL_NAME:
            return {
                loading: 'searching web',
                completed: 'searched web',
                failed: 'web search failed'
            };

        case WEB_FETCH_TOOL_NAME:
            return {
                loading: 'fetching web page',
                completed: 'fetched web page',
                failed: 'web fetch failed'
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
