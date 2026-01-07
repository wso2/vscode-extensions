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

// Export types
export * from './types';

// Export file tools
export {
    // Execute function creators
    createWriteExecute,
    createReadExecute,
    createEditExecute,
    createMultiEditExecute,
    // Tool creators
    createWriteTool,
    createReadTool,
    createEditTool,
    createMultiEditTool,
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
    // Documentation tools
    createGetConnectorGuideExecute,
    createGetConnectorGuideTool,
    createGetAIConnectorGuideExecute,
    createGetAIConnectorGuideTool,
} from './connector_tools';

// Export project tools
export {
    // Execute function creators
    createAddConnectorExecute,
    createRemoveConnectorExecute,
    createValidateCodeExecute,
    // Tool creators
    createAddConnectorTool,
    createRemoveConnectorTool,
    createValidateCodeTool,
} from './project_tools';

// Re-export tool names for convenience
export {
    FILE_WRITE_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_MULTI_EDIT_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
    ADD_CONNECTOR_TOOL_NAME,
    REMOVE_CONNECTOR_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    GET_CONNECTOR_GUIDE_TOOL_NAME,
    GET_AI_CONNECTOR_GUIDE_TOOL_NAME,
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
        createMultiEditExecute,
        createWriteTool,
        createReadTool,
        createEditTool,
        createMultiEditTool,
    } = require('./file_tools');

    const {
        FILE_WRITE_TOOL_NAME,
        FILE_READ_TOOL_NAME,
        FILE_EDIT_TOOL_NAME,
        FILE_MULTI_EDIT_TOOL_NAME,
    } = require('./types');

    return {
        [FILE_WRITE_TOOL_NAME]: createWriteTool(createWriteExecute(projectPath, modifiedFiles)),
        [FILE_READ_TOOL_NAME]: createReadTool(createReadExecute(projectPath)),
        [FILE_EDIT_TOOL_NAME]: createEditTool(createEditExecute(projectPath, modifiedFiles)),
        [FILE_MULTI_EDIT_TOOL_NAME]: createMultiEditTool(createMultiEditExecute(projectPath, modifiedFiles)),
    };
}
