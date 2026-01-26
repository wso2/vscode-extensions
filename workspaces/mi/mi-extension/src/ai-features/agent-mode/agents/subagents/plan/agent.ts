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
import { PLAN_SUBAGENT_SYSTEM } from './system';
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
    createConnectorTool,
    createConnectorExecute,
} from '../../../tools/connector_tools';
import {
    FILE_READ_TOOL_NAME,
    FILE_GREP_TOOL_NAME,
    FILE_GLOB_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
} from '../../../tools/types';

// Note: generateText with tools requires stopWhen: stepCountIs() to enable multi-step tool calling
// Without it, tools may not be executed in a loop

/**
 * Execute the Plan subagent
 *
 * @param prompt - The user's integration requirement
 * @param projectPath - The project root path
 * @param model - The model to use ('haiku' or 'sonnet')
 * @param getAnthropicClient - Function to get the Anthropic client
 * @returns The plan as a string
 */
export async function executePlanSubagent(
    prompt: string,
    projectPath: string,
    model: 'haiku' | 'sonnet',
    getAnthropicClient: (modelId: AnthropicModel) => Promise<any>
): Promise<string> {
    logInfo(`[PlanSubagent] Starting with model: ${model}`);
    logDebug(`[PlanSubagent] Project path: ${projectPath}`);
    logDebug(`[PlanSubagent] Prompt: ${prompt.substring(0, 200)}...`);

    try {
        // Select model
        const modelId = model === 'sonnet' ? ANTHROPIC_SONNET_4_5 : ANTHROPIC_HAIKU_4_5;
        const anthropicModel = await getAnthropicClient(modelId);

        // Create read-only tools for the subagent
        const tools = {
            [FILE_READ_TOOL_NAME]: createReadTool(createReadExecute(projectPath)),
            [FILE_GREP_TOOL_NAME]: createGrepTool(createGrepExecute(projectPath)),
            [FILE_GLOB_TOOL_NAME]: createGlobTool(createGlobExecute(projectPath)),
            [CONNECTOR_TOOL_NAME]: createConnectorTool(createConnectorExecute()),
        };

        logDebug(`[PlanSubagent] Tools available: ${Object.keys(tools).join(', ')}`);

        // Execute the subagent with tool access
        // stopWhen: stepCountIs(15) allows up to 15 tool calling steps
        const result = await generateText({
            model: anthropicModel,
            system: PLAN_SUBAGENT_SYSTEM,
            prompt: `
## Integration Requirement

${prompt}

## Instructions

1. First, explore the project structure using glob and grep to understand:
   - Existing APIs, sequences, and endpoints
   - Current connector dependencies (check pom.xml)
   - Naming conventions used in the project

2. Then, design a detailed implementation plan following the output format specified in your system instructions.

3. Be specific about:
   - Exact file paths for new artifacts
   - Connector operations to use
   - Data transformation approach
   - Error handling strategy

Return ONLY the implementation plan in markdown format.
`,
            tools,
            stopWhen: stepCountIs(15), // Allow up to 15 tool calls for thorough exploration and planning
            temperature: 0.3,
            maxOutputTokens: 6000, // Allow more output for comprehensive plans
        });

        logInfo(`[PlanSubagent] Completed successfully`);
        logDebug(`[PlanSubagent] Response length: ${result.text.length} chars`);
        logDebug(`[PlanSubagent] Steps used: ${result.steps?.length || 0}`);

        return result.text;
    } catch (error: any) {
        logError(`[PlanSubagent] Failed`, error);
        throw error;
    }
}
