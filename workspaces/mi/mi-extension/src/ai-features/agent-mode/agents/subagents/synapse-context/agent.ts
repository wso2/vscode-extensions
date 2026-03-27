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
import { SYNAPSE_CONTEXT_SUBAGENT_SYSTEM } from './system';
import { logInfo, logDebug, logError } from '../../../../copilot/logger';
import { ANTHROPIC_HAIKU_4_5, ANTHROPIC_SONNET_4_6, AnthropicModel } from '../../../../connection';
import { SubagentResult } from '../../../tools/types';
import { extractStepMessages } from '../utils';

// Import tools for subagent (read-only tools + context tool)
import {
    createReadTool,
    createReadExecute,
    createGrepTool,
    createGrepExecute,
    createGlobTool,
    createGlobExecute,
} from '../../../tools/file_tools';
import {
    createContextTool,
    createContextExecute,
} from '../../../tools/context_tools';
import {
    FILE_READ_TOOL_NAME,
    FILE_GREP_TOOL_NAME,
    FILE_GLOB_TOOL_NAME,
    CONTEXT_TOOL_NAME,
} from '../../../tools/types';

/**
 * Execute the SynapseContext subagent
 *
 * @param prompt - The Synapse-related question to answer
 * @param projectPath - The project root path
 * @param model - The model to use ('haiku' or 'sonnet')
 * @param getAnthropicClient - Function to get the Anthropic client
 * @param previousMessages - Optional previous conversation history for resuming
 * @param abortSignal - Optional abort signal for cancellation
 * @returns SubagentResult with text response and steps for JSONL persistence
 */
export async function executeSynapseContextSubagent(
    prompt: string,
    projectPath: string,
    model: 'haiku' | 'sonnet',
    getAnthropicClient: (modelId: AnthropicModel) => Promise<any>,
    previousMessages?: any[],
    abortSignal?: AbortSignal
): Promise<SubagentResult> {
    const isResume = previousMessages && previousMessages.length > 0;
    logInfo(`[SynapseContextSubagent] Starting with model: ${model}${isResume ? ' (resuming from previous)' : ''}`);
    logDebug(`[SynapseContextSubagent] Query length: ${prompt.length} chars`);
    if (isResume) {
        logDebug(`[SynapseContextSubagent] Resuming with ${previousMessages!.length} previous messages`);
    }

    try {
        // Select model - prefer haiku for speed
        const modelId = model === 'sonnet' ? ANTHROPIC_SONNET_4_6 : ANTHROPIC_HAIKU_4_5;
        const anthropicModel = await getAnthropicClient(modelId);

        // Create tools: read-only file tools + context reference tool
        const tools = {
            [FILE_READ_TOOL_NAME]: createReadTool(createReadExecute(projectPath), projectPath),
            [FILE_GREP_TOOL_NAME]: createGrepTool(createGrepExecute(projectPath)),
            [FILE_GLOB_TOOL_NAME]: createGlobTool(createGlobExecute(projectPath)),
            [CONTEXT_TOOL_NAME]: createContextTool(createContextExecute(projectPath)),
        };

        logDebug(`[SynapseContextSubagent] Tools available: ${Object.keys(tools).join(', ')}`);

        // Build messages array for continuation
        const messages: any[] = [];

        if (isResume && previousMessages) {
            messages.push(...previousMessages);
            messages.push({
                role: 'user',
                content: `
                ## Follow-up Question

                ${prompt}

                Continue from where you left off. Load additional reference contexts if needed.
                `
            });
        } else {
            messages.push({
                role: 'user',
                content: `${prompt}

                Load the relevant reference section(s) and return what you find. If the answer is not in the docs, say so clearly.`
            });
        }

        // Execute the subagent with tool access
        // stepCountIs(6): follow a reference-first workflow, loading relevant contexts early within these steps
        const result = await generateText({
            model: anthropicModel,
            system: SYNAPSE_CONTEXT_SUBAGENT_SYSTEM,
            messages,
            tools,
            stopWhen: stepCountIs(6),
            temperature: 0.2,
            maxOutputTokens: 4000,
            abortSignal,
        });

        logInfo(`[SynapseContextSubagent] Completed successfully`);
        logDebug(`[SynapseContextSubagent] Response length: ${result.text.length} chars`);

        // Build the full conversation history for saving
        const stepMessages = extractStepMessages(result.steps, result.text, 'SynapseContextSubagent');
        const fullMessages = [...messages, ...stepMessages];
        logDebug(`[SynapseContextSubagent] Total messages in history: ${fullMessages.length}`);

        return {
            text: result.text,
            messages: fullMessages,
        };
    } catch (error: any) {
        logError(`[SynapseContextSubagent] Failed`, error);
        throw error;
    }
}
