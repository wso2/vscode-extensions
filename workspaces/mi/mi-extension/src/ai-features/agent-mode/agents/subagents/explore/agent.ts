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

import { generateText, stepCountIs } from 'ai';
import { EXPLORE_SUBAGENT_SYSTEM } from './system';
import { logInfo, logDebug, logError } from '../../../../copilot/logger';
import { ANTHROPIC_HAIKU_4_5, ANTHROPIC_SONNET_4_6, AnthropicModel } from '../../../../connection';
import { SubagentResult } from '../../../tools/types';

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
 * @param previousMessages - Optional previous conversation history for resuming
 * @returns SubagentResult with text response and steps for JSONL persistence
 */
export async function executeExploreSubagent(
    prompt: string,
    projectPath: string,
    model: 'haiku' | 'sonnet',
    getAnthropicClient: (modelId: AnthropicModel) => Promise<any>,
    previousMessages?: any[],
    abortSignal?: AbortSignal
): Promise<SubagentResult> {
    const isResume = previousMessages && previousMessages.length > 0;
    logInfo(`[ExploreSubagent] Starting with model: ${model}${isResume ? ' (resuming from previous)' : ''}`);
    logDebug(`[ExploreSubagent] Project path: ${projectPath}`);
    logDebug(`[ExploreSubagent] Query: ${prompt.substring(0, 200)}...`);
    if (isResume) {
        logDebug(`[ExploreSubagent] Resuming with ${previousMessages!.length} previous messages`);
    }

    try {
        // Select model - prefer haiku for speed
        const modelId = model === 'sonnet' ? ANTHROPIC_SONNET_4_6 : ANTHROPIC_HAIKU_4_5;
        const anthropicModel = await getAnthropicClient(modelId);

        // Create read-only tools for the subagent
        const tools = {
            [FILE_READ_TOOL_NAME]: createReadTool(createReadExecute(projectPath), projectPath),
            [FILE_GREP_TOOL_NAME]: createGrepTool(createGrepExecute(projectPath)),
            [FILE_GLOB_TOOL_NAME]: createGlobTool(createGlobExecute(projectPath)),
        };

        logDebug(`[ExploreSubagent] Tools available: ${Object.keys(tools).join(', ')}`);

        // Build messages array for continuation
        // If resuming, include previous messages and add new prompt as continuation
        // If starting fresh, just use the prompt
        const messages: any[] = [];

        if (isResume && previousMessages) {
            // Add all previous messages
            messages.push(...previousMessages);
            // Add new continuation prompt
            messages.push({
                role: 'user',
                content: `
                ## Continue Exploration

                ${prompt}

                Continue from where you left off. Use the tools to explore further.
                `
            });
        } else {
            // Fresh start
            messages.push({
                role: 'user',
                content: `
                ## Exploration Query

                ${prompt}

                ## Instructions

                1. Use glob and grep to efficiently find relevant files
                2. Read files that are likely to contain the answer
                3. Summarize your findings concisely

                Return your findings in the specified markdown format.
                `
            });
        }

        // Execute the subagent with tool access
        // stopWhen: stepCountIs(30) allows up to 30 tool calling steps
        const result = await generateText({
            model: anthropicModel,
            system: EXPLORE_SUBAGENT_SYSTEM,
            messages,
            tools,
            stopWhen: stepCountIs(30), // Allow up to 30 tool calls for thorough exploration
            temperature: 0.2, // Lower temperature for more focused exploration
            maxOutputTokens: 8000, // Allow more output for comprehensive findings
            abortSignal,
        });

        logInfo(`[ExploreSubagent] Completed successfully`);
        logDebug(`[ExploreSubagent] Response length: ${result.text.length} chars`);

        // Build the full conversation history for saving
        // Same pattern as main agent: extract messages from steps
        const fullMessages = [...messages];

        // Extract messages from each step (following main agent pattern)
        if (result.steps && result.steps.length > 0) {
            for (const step of result.steps) {
                if ((step as any).response?.messages) {
                    fullMessages.push(...(step as any).response.messages);
                }
            }
            logDebug(`[ExploreSubagent] Extracted messages from ${result.steps.length} steps`);
        } else {
            // Fallback: add final response as assistant message
            logDebug(`[ExploreSubagent] No steps found, using final text as response`);
            fullMessages.push({
                role: 'assistant',
                content: result.text
            });
        }

        logDebug(`[ExploreSubagent] Total messages in history: ${fullMessages.length}`);

        return {
            text: result.text,
            messages: fullMessages,
        };
    } catch (error: any) {
        logError(`[ExploreSubagent] Failed`, error);
        throw error;
    }
}
