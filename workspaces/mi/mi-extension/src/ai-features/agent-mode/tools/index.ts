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

// Export types
export * from './types';

// Export file tools
export {
    // Execute function creators
    createWriteExecute,
    createReadExecute,
    createEditExecute,
    createGrepExecute,
    createGlobExecute,
    // Tool creators
    createWriteTool,
    createReadTool,
    createEditTool,
    createGrepTool,
    createGlobTool,
} from './file_tools';

// Export connector tools
export {
    // Execute function creator
    createConnectorExecute,
    // Tool creator
    createConnectorTool,
    // Utility functions
    getAvailableConnectors,
    getAvailableInboundEndpoints,
} from './connector_tools';

// Export skill tools
export {
    // Execute function creator
    createSkillExecute,
    // Tool creator
    createSkillTool,
    // Utility functions
    getAvailableSkills,
} from './skill_tools';

// Export project tools
export {
    // Execute function creators
    createManageConnectorExecute,
    // Tool creators
    createManageConnectorTool,
} from './project_tools';

// Export LSP tools
export {
    // Execute function creators
    createValidateCodeExecute,
    // Tool creators
    createValidateCodeTool,
} from './lsp_tools';

// Export data mapper tools
export {
    // Execute function creators
    createCreateDataMapperExecute,
    createGenerateDataMappingExecute,
    // Tool creators
    createCreateDataMapperTool,
    createGenerateDataMappingTool,
} from './data_mapper_tools';

// Export runtime tools
export {
    // Execute function creators
    createBuildProjectExecute,
    createServerManagementExecute,
    // Tool creators
    createBuildProjectTool,
    createServerManagementTool,
} from './runtime_tools';

// Export subagent tool (subagent spawning)
export {
    createSubagentExecute,
    createSubagentTool,
} from './subagent_tool';

// Export plan mode tools
export {
    // Execute function creators
    createAskUserExecute,
    createEnterPlanModeExecute,
    createExitPlanModeExecute,
    createTodoWriteExecute,
    // Tool creators
    createAskUserTool,
    createEnterPlanModeTool,
    createExitPlanModeTool,
    createTodoWriteTool,
    // Types
    type PendingQuestion,
    type AgentEventHandler,
} from './plan_mode_tools';

// Export shell tools
export {
    // Execute function creators
    createBashExecute,
    createKillTaskExecute,
    createTaskOutputExecute,
    // Tool creators
    createBashTool,
    createKillTaskTool,
    createTaskOutputTool,
    // Utility functions
    getBackgroundShells,
} from './bash_tools';

// Export web tools
export {
    // Execute function creators
    createWebSearchExecute,
    createWebFetchExecute,
    // Tool creators
    createWebSearchTool,
    createWebFetchTool,
} from './web_tools';

// Re-export tool names for convenience
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
    // Plan mode tool names
    SUBAGENT_TOOL_NAME,
    ASK_USER_TOOL_NAME,
    ENTER_PLAN_MODE_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    // Shell tool names
    BASH_TOOL_NAME,
    KILL_TASK_TOOL_NAME,
    TASK_OUTPUT_TOOL_NAME,
    WEB_SEARCH_TOOL_NAME,
    WEB_FETCH_TOOL_NAME,
} from './types';

/**
 * Creates all file tools for the agent
 *
 * @param projectPath - The root path of the MI project
 * @param modifiedFiles - Optional array to track modified files
 * @returns Object containing all file tools
 *
 * @example
 * ```typescript
 * const modifiedFiles: string[] = [];
 * const tools = createFileTools('/path/to/project', modifiedFiles);
 *
 * // Use with Vercel AI SDK streamText
 * const result = await streamText({
 *   model,
 *   tools,
 *   // ...
 * });
 * ```
 */
export function createFileTools(projectPath: string, modifiedFiles?: string[]) {
    // Import here to avoid circular dependencies
    const {
        createWriteExecute,
        createReadExecute,
        createEditExecute,
        createGrepExecute,
        createGlobExecute,
        createWriteTool,
        createReadTool,
        createEditTool,
        createGrepTool,
        createGlobTool,
    } = require('./file_tools');

    const {
        FILE_WRITE_TOOL_NAME,
        FILE_READ_TOOL_NAME,
        FILE_EDIT_TOOL_NAME,
        FILE_GREP_TOOL_NAME,
        FILE_GLOB_TOOL_NAME,
    } = require('./types');

    return {
        [FILE_WRITE_TOOL_NAME]: createWriteTool(createWriteExecute(projectPath, modifiedFiles)),
        [FILE_READ_TOOL_NAME]: createReadTool(createReadExecute(projectPath), projectPath),
        [FILE_EDIT_TOOL_NAME]: createEditTool(createEditExecute(projectPath, modifiedFiles)),
        [FILE_GREP_TOOL_NAME]: createGrepTool(createGrepExecute(projectPath)),
        [FILE_GLOB_TOOL_NAME]: createGlobTool(createGlobExecute(projectPath)),
    };
}
