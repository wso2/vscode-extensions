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

import { generateText, stepCountIs } from 'ai';
import { EXPLORE_SUBAGENT_SYSTEM } from './system';
import { logInfo, logDebug, logError } from '../../../../copilot/logger';
import { ANTHROPIC_HAIKU_4_5, ANTHROPIC_SONNET_4_5, AnthropicModel } from '../../../../connection';

// Import tools for subagent (read-only tools only)
import {
    createReadTool,
    createReadExecute,
    createGrepTool,
    createGrepExecute,
    createGlobTool,
    createGlobExecute,
} from '../../../tools/file_tools';
import {
    FILE_READ_TOOL_NAME,
    FILE_GREP_TOOL_NAME,
    FILE_GLOB_TOOL_NAME,
} from '../../../tools/types';

/**
 * Execute the Explore subagent
 *
 * @param prompt - The search query or exploration task
 * @param projectPath - The project root path
 * @param model - The model to use ('haiku' or 'sonnet')
 * @param getAnthropicClient - Function to get the Anthropic client
 * @returns The exploration findings as a string
 */
export async function executeExploreSubagent(
    prompt: string,
    projectPath: string,
    model: 'haiku' | 'sonnet',
    getAnthropicClient: (modelId: AnthropicModel) => Promise<any>
): Promise<string> {
    logInfo(`[ExploreSubagent] Starting with model: ${model}`);
    logDebug(`[ExploreSubagent] Project path: ${projectPath}`);
    logDebug(`[ExploreSubagent] Query: ${prompt.substring(0, 200)}...`);

    try {
        // Select model - prefer haiku for speed
        const modelId = model === 'sonnet' ? ANTHROPIC_SONNET_4_5 : ANTHROPIC_HAIKU_4_5;
        const anthropicModel = await getAnthropicClient(modelId);

        // Create read-only tools for the subagent
        const tools = {
            [FILE_READ_TOOL_NAME]: createReadTool(createReadExecute(projectPath)),
            [FILE_GREP_TOOL_NAME]: createGrepTool(createGrepExecute(projectPath)),
            [FILE_GLOB_TOOL_NAME]: createGlobTool(createGlobExecute(projectPath)),
        };

        logDebug(`[ExploreSubagent] Tools available: ${Object.keys(tools).join(', ')}`);

        // Execute the subagent with tool access
        // stopWhen: stepCountIs(10) allows up to 10 tool calling steps
        const result = await generateText({
            model: anthropicModel,
            system: EXPLORE_SUBAGENT_SYSTEM,
            prompt: `
## Exploration Query

${prompt}

## Instructions

1. Use glob and grep to efficiently find relevant files
2. Read files that are likely to contain the answer
3. Summarize your findings concisely

Return your findings in the specified markdown format.
`,
            tools,
            stopWhen: stepCountIs(10), // Allow up to 10 tool calls for thorough exploration
            temperature: 0.2, // Lower temperature for more focused exploration
            maxOutputTokens: 4000, // Allow more output for comprehensive findings
        });

        logInfo(`[ExploreSubagent] Completed successfully`);
        logDebug(`[ExploreSubagent] Response length: ${result.text.length} chars`);
        logDebug(`[ExploreSubagent] Steps used: ${result.steps?.length || 0}`);

        return result.text;
    } catch (error: any) {
        logError(`[ExploreSubagent] Failed`, error);
        throw error;
    }
}
