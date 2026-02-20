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
 * software distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Compact Agent Tools
 *
 * Provides the same tool definitions as the main agent, but with dummy execute functions
 * that prevent any actual execution. The compact agent should only use these tools for
 * understanding context during summarization, not for execution.
 */

import {
    createWriteTool,
    createReadTool,
    createEditTool,
    createGrepTool,
    createGlobTool,
} from '../../tools/file_tools';
import {
    createConnectorTool,
} from '../../tools/connector_tools';
import {
    createSkillTool,
} from '../../tools/skill_tools';
import {
    createManageConnectorTool,
} from '../../tools/project_tools';
import {
    createValidateCodeTool,
} from '../../tools/lsp_tools';
import {
    createCreateDataMapperTool,
    createGenerateDataMappingTool,
} from '../../tools/data_mapper_tools';
import {
    createBuildProjectTool,
    createServerManagementTool,
} from '../../tools/runtime_tools';
import {
    createSubagentTool,
} from '../../tools/subagent_tool';
import {
    createAskUserTool,
    createEnterPlanModeTool,
    createExitPlanModeTool,
    createTodoWriteTool,
} from '../../tools/plan_mode_tools';
import {
    createBashTool,
    createKillTaskTool,
    createTaskOutputTool,
} from '../../tools/bash_tools';
import {
    createWebSearchTool,
    createWebFetchTool,
} from '../../tools/web_tools';
import {
    FILE_WRITE_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_GREP_TOOL_NAME,
    FILE_GLOB_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
    SKILL_TOOL_NAME,
    MANAGE_CONNECTOR_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    CREATE_DATA_MAPPER_TOOL_NAME,
    GENERATE_DATA_MAPPING_TOOL_NAME,
    BUILD_PROJECT_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
    SUBAGENT_TOOL_NAME,
    ASK_USER_TOOL_NAME,
    ENTER_PLAN_MODE_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    BASH_TOOL_NAME,
    KILL_TASK_TOOL_NAME,
    TASK_OUTPUT_TOOL_NAME,
    WEB_SEARCH_TOOL_NAME,
    WEB_FETCH_TOOL_NAME,
} from '../../tools/types';

// Re-export tool name constants for use in compact agent
export {
    FILE_WRITE_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_GREP_TOOL_NAME,
    FILE_GLOB_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
    SKILL_TOOL_NAME,
    MANAGE_CONNECTOR_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    CREATE_DATA_MAPPER_TOOL_NAME,
    GENERATE_DATA_MAPPING_TOOL_NAME,
    BUILD_PROJECT_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
    SUBAGENT_TOOL_NAME,
    ASK_USER_TOOL_NAME,
    ENTER_PLAN_MODE_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    BASH_TOOL_NAME,
    KILL_TASK_TOOL_NAME,
    TASK_OUTPUT_TOOL_NAME,
    WEB_SEARCH_TOOL_NAME,
    WEB_FETCH_TOOL_NAME,
};

/**
 * System reminder message when compact agent tries to execute tools
 */
const EXECUTION_BLOCKED_MESSAGE = `
<system-reminder>
You are in COMPACT MODE. Your ONLY task is to summarize the conversation.
You MUST NOT execute any tools. Tool definitions are provided only for context understanding.
Please focus on producing a comprehensive summary instead.
</system-reminder>
`;

/**
 * Creates a dummy execute function that blocks execution and returns a reminder
 */
function createBlockedExecute(): (...args: any[]) => Promise<any> {
    return async () => {
        return {
            success: false,
            error: EXECUTION_BLOCKED_MESSAGE,
        };
    };
}

/**
 * Creates the complete tools object for the compact agent.
 * All tools have dummy execute functions that block execution.
 *
 * @returns Tools object with all 20+ tools (execution blocked)
 */
export function createCompactAgentTools() {
    return {
        // File Operations (5 tools) - execution blocked
        [FILE_WRITE_TOOL_NAME]: createWriteTool(createBlockedExecute()),
        [FILE_READ_TOOL_NAME]: createReadTool(createBlockedExecute(), ''),
        [FILE_EDIT_TOOL_NAME]: createEditTool(createBlockedExecute()),
        [FILE_GREP_TOOL_NAME]: createGrepTool(createBlockedExecute()),
        [FILE_GLOB_TOOL_NAME]: createGlobTool(createBlockedExecute()),

        // Connector Tools (2 tools) - execution blocked
        [CONNECTOR_TOOL_NAME]: createConnectorTool(createBlockedExecute()),
        [SKILL_TOOL_NAME]: createSkillTool(createBlockedExecute()),

        // Project Tools (1 tool) - execution blocked
        [MANAGE_CONNECTOR_TOOL_NAME]: createManageConnectorTool(createBlockedExecute()),

        // LSP Tools (1 tool) - execution blocked
        [VALIDATE_CODE_TOOL_NAME]: createValidateCodeTool(createBlockedExecute()),

        // Data Mapper Tools (2 tools) - execution blocked
        [CREATE_DATA_MAPPER_TOOL_NAME]: createCreateDataMapperTool(createBlockedExecute()),
        [GENERATE_DATA_MAPPING_TOOL_NAME]: createGenerateDataMappingTool(createBlockedExecute()),

        // Runtime Tools (2 tools) - execution blocked
        [BUILD_PROJECT_TOOL_NAME]: createBuildProjectTool(createBlockedExecute()),
        [SERVER_MANAGEMENT_TOOL_NAME]: createServerManagementTool(createBlockedExecute()),

        // Plan Mode Tools (4 tools) - execution blocked
        [SUBAGENT_TOOL_NAME]: createSubagentTool(createBlockedExecute()),
        [ASK_USER_TOOL_NAME]: createAskUserTool(createBlockedExecute()),
        [ENTER_PLAN_MODE_TOOL_NAME]: createEnterPlanModeTool(createBlockedExecute()),
        [EXIT_PLAN_MODE_TOOL_NAME]: createExitPlanModeTool(createBlockedExecute()),
        [TODO_WRITE_TOOL_NAME]: createTodoWriteTool(createBlockedExecute()),

        // Web Tools (2 tools) - execution blocked
        [WEB_SEARCH_TOOL_NAME]: createWebSearchTool(createBlockedExecute()),
        [WEB_FETCH_TOOL_NAME]: createWebFetchTool(createBlockedExecute()),

        // Shell Tools (3 tools) - execution blocked
        [BASH_TOOL_NAME]: createBashTool(createBlockedExecute()),
        [KILL_TASK_TOOL_NAME]: createKillTaskTool(createBlockedExecute()),
        [TASK_OUTPUT_TOOL_NAME]: createTaskOutputTool(createBlockedExecute()),
    };
}
