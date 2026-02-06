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

import {
    createWriteTool,
    createReadTool,
    createEditTool,
    createGrepTool,
    createGlobTool,
    createWriteExecute,
    createReadExecute,
    createEditExecute,
    createGrepExecute,
    createGlobExecute,
} from '../../tools/file_tools';
import {
    createConnectorTool,
    createConnectorExecute,
    createGetConnectorDocumentationTool,
    createGetConnectorDocumentationExecute,
    createGetAIConnectorDocumentationTool,
    createGetAIConnectorDocumentationExecute,
} from '../../tools/connector_tools';
import {
    createManageConnectorTool,
    createManageConnectorExecute,
} from '../../tools/project_tools';
import {
    createValidateCodeTool,
    createValidateCodeExecute,
} from '../../tools/lsp_tools';
import {
    createCreateDataMapperTool,
    createCreateDataMapperExecute,
    createGenerateDataMappingTool,
    createGenerateDataMappingExecute,
} from '../../tools/data_mapper_tools';
import {
    createBuildProjectTool,
    createBuildProjectExecute,
    createServerManagementTool,
    createServerManagementExecute,
} from '../../tools/runtime_tools';
import {
    createTaskTool,
    createTaskExecute,
} from '../../tools/task_tool';
import {
    createAskUserTool,
    createAskUserExecute,
    createEnterPlanModeTool,
    createEnterPlanModeExecute,
    createExitPlanModeTool,
    createExitPlanModeExecute,
    createTodoWriteTool,
    createTodoWriteExecute,
    PendingQuestion,
    PendingPlanApproval,
} from '../../tools/plan_mode_tools';
import {
    createBashTool,
    createBashExecute,
    createKillShellTool,
    createKillShellExecute,
    createTaskOutputTool,
    createTaskOutputExecute,
} from '../../tools/bash_tools';
import { AnthropicModel } from '../../../connection';
import {
    FILE_WRITE_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_GREP_TOOL_NAME,
    FILE_GLOB_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
    MANAGE_CONNECTOR_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    GET_CONNECTOR_DOCUMENTATION_TOOL_NAME,
    GET_AI_CONNECTOR_DOCUMENTATION_TOOL_NAME,
    CREATE_DATA_MAPPER_TOOL_NAME,
    GENERATE_DATA_MAPPING_TOOL_NAME,
    BUILD_PROJECT_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
    TASK_TOOL_NAME,
    ASK_USER_TOOL_NAME,
    ENTER_PLAN_MODE_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    BASH_TOOL_NAME,
    KILL_SHELL_TOOL_NAME,
    TASK_OUTPUT_TOOL_NAME,
} from '../../tools/types';

// Re-export tool name constants for use in agent.ts
export {
    FILE_WRITE_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_GREP_TOOL_NAME,
    FILE_GLOB_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
    MANAGE_CONNECTOR_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    GET_CONNECTOR_DOCUMENTATION_TOOL_NAME,
    GET_AI_CONNECTOR_DOCUMENTATION_TOOL_NAME,
    CREATE_DATA_MAPPER_TOOL_NAME,
    GENERATE_DATA_MAPPING_TOOL_NAME,
    BUILD_PROJECT_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
    TASK_TOOL_NAME,
    ASK_USER_TOOL_NAME,
    ENTER_PLAN_MODE_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    BASH_TOOL_NAME,
    KILL_SHELL_TOOL_NAME,
    TASK_OUTPUT_TOOL_NAME,
};
import { AgentEventHandler } from './agent';

/**
 * Parameters for creating the tools object
 */
export interface CreateToolsParams {
    /** Path to the MI project */
    projectPath: string;
    /** List to track modified files */
    modifiedFiles: string[];
    /** Session ID for plan mode */
    sessionId: string;
    /** Session directory for output files */
    sessionDir: string;
    /** Event handler for plan mode events */
    eventHandler: AgentEventHandler;
    /** Pending questions map for ask_user tool */
    pendingQuestions: Map<string, PendingQuestion>;
    /** Pending plan approvals map for exit_plan_mode tool */
    pendingApprovals: Map<string, PendingPlanApproval>;
    /** Function to get Anthropic client for task tool */
    getAnthropicClient: (model: AnthropicModel) => Promise<any>;
}

/**
 * Creates the complete tools object for the agent.
 * This ensures consistent tool definitions across main agent and compact agent.
 *
 * @param params - Tool creation parameters
 * @returns Tools object with all 20+ tools
 */
export function createAgentTools(params: CreateToolsParams) {
    const {
        projectPath,
        modifiedFiles,
        sessionId,
        sessionDir,
        eventHandler,
        pendingQuestions,
        pendingApprovals,
        getAnthropicClient,
    } = params;

    return {
        // File Operations (6 tools)
        [FILE_WRITE_TOOL_NAME]: createWriteTool(
            createWriteExecute(projectPath, modifiedFiles)
        ),
        [FILE_READ_TOOL_NAME]: createReadTool(
            createReadExecute(projectPath)
        ),
        [FILE_EDIT_TOOL_NAME]: createEditTool(
            createEditExecute(projectPath, modifiedFiles)
        ),
        [FILE_GREP_TOOL_NAME]: createGrepTool(
            createGrepExecute(projectPath)
        ),
        [FILE_GLOB_TOOL_NAME]: createGlobTool(
            createGlobExecute(projectPath)
        ),

        // Connector Tools (3 tools)
        [CONNECTOR_TOOL_NAME]: createConnectorTool(
            createConnectorExecute()
        ),
        [GET_CONNECTOR_DOCUMENTATION_TOOL_NAME]: createGetConnectorDocumentationTool(
            createGetConnectorDocumentationExecute()
        ),
        [GET_AI_CONNECTOR_DOCUMENTATION_TOOL_NAME]: createGetAIConnectorDocumentationTool(
            createGetAIConnectorDocumentationExecute()
        ),

        // Project Tools (1 tool)
        [MANAGE_CONNECTOR_TOOL_NAME]: createManageConnectorTool(
            createManageConnectorExecute(projectPath)
        ),

        // LSP Tools (1 tool)
        [VALIDATE_CODE_TOOL_NAME]: createValidateCodeTool(
            createValidateCodeExecute(projectPath)
        ),

        // Data Mapper Tools (2 tools)
        [CREATE_DATA_MAPPER_TOOL_NAME]: createCreateDataMapperTool(
            createCreateDataMapperExecute(projectPath, modifiedFiles)
        ),
        [GENERATE_DATA_MAPPING_TOOL_NAME]: createGenerateDataMappingTool(
            createGenerateDataMappingExecute(projectPath, modifiedFiles)
        ),

        // Runtime Tools (2 tools)
        [BUILD_PROJECT_TOOL_NAME]: createBuildProjectTool(
            createBuildProjectExecute(projectPath, sessionDir)
        ),
        [SERVER_MANAGEMENT_TOOL_NAME]: createServerManagementTool(
            createServerManagementExecute(projectPath, sessionDir)
        ),

        // Plan Mode Tools (5 tools)
        [TASK_TOOL_NAME]: createTaskTool(
            createTaskExecute(projectPath, sessionId, getAnthropicClient)
        ),
        [ASK_USER_TOOL_NAME]: createAskUserTool(
            createAskUserExecute(eventHandler, pendingQuestions)
        ),
        [ENTER_PLAN_MODE_TOOL_NAME]: createEnterPlanModeTool(
            createEnterPlanModeExecute(projectPath, sessionId, eventHandler)
        ),
        [EXIT_PLAN_MODE_TOOL_NAME]: createExitPlanModeTool(
            createExitPlanModeExecute(projectPath, sessionId, eventHandler, pendingApprovals)
        ),
        [TODO_WRITE_TOOL_NAME]: createTodoWriteTool(
            createTodoWriteExecute(eventHandler)
        ),

        // Bash Tools (3 tools)
        [BASH_TOOL_NAME]: createBashTool(
            createBashExecute(projectPath)
        ),
        [KILL_SHELL_TOOL_NAME]: createKillShellTool(
            createKillShellExecute()
        ),
        [TASK_OUTPUT_TOOL_NAME]: createTaskOutputTool(
            createTaskOutputExecute()
        ),
    };
}
