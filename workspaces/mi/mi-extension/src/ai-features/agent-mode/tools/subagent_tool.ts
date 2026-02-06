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

import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SubagentToolResult, SubagentToolExecuteFn, BackgroundSubagent, SubagentResult, SUBAGENT_TOOL_NAME, TASK_OUTPUT_TOOL_NAME } from './types';
import { logInfo, logError, logDebug } from '../../copilot/logger';
import { AnthropicModel } from '../../connection';

// Import subagent executors
import { executeExploreSubagent } from '../agents/subagents';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a short subagent ID in format: subagent-{short-uuid}
 */
function generateSubagentId(): string {
    const uuid = uuidv4();
    const shortUuid = uuid.split('-')[0]; // First 8 characters
    return `subagent-${shortUuid}`;
}

/**
 * Load subagent history from JSONL file
 * Returns the messages array that was saved during previous execution
 * Same format as ChatHistoryManager - each line is a message
 */
async function loadSubagentHistory(projectPath: string, sessionId: string, subagentId: string): Promise<any[]> {
    const subagentDir = getSubagentsDir(projectPath, sessionId, subagentId);
    const historyPath = path.join(subagentDir, 'history.jsonl');

    try {
        const content = await fs.readFile(historyPath, 'utf8');
        const lines = content.trim().split('\n');
        const messages: any[] = [];

        for (const line of lines) {
            if (line.trim()) {
                messages.push(JSON.parse(line));
            }
        }

        logInfo(`[SubagentTool] Loaded ${messages.length} messages from history: ${subagentId}`);
        return messages;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            throw new Error(`Subagent with ID ${subagentId} not found. Cannot resume.`);
        }
        throw error;
    }
}

// ============================================================================
// Module State - Background Subagent Tracking
// ============================================================================

const backgroundSubagents: Map<string, BackgroundSubagent> = new Map();

/**
 * Get all background subagents (used by task_output tool in bash_tools.ts)
 */
export function getBackgroundSubagents(): Map<string, BackgroundSubagent> {
    return backgroundSubagents;
}

/**
 * Clean up completed background subagents older than 1 hour
 */
function cleanupOldSubagents(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [id, subagent] of backgroundSubagents.entries()) {
        if (subagent.completed && subagent.startTime < oneHourAgo) {
            backgroundSubagents.delete(id);
        }
    }
}

// ============================================================================
// JSONL & Output File Utilities
// ============================================================================

/**
 * Get the subagents directory for a session
 */
function getSubagentsDir(projectPath: string, sessionId: string, subagentId: string): string {
    return path.join(projectPath, '.mi-copilot', sessionId, 'subagents', subagentId);
}

/**
 * Save subagent conversation messages to JSONL
 * Same format as ChatHistoryManager - each line is a message
 */
async function saveSubagentHistory(historyDir: string, messages: any[]): Promise<void> {
    const historyPath = path.join(historyDir, 'history.jsonl');
    const lines = messages.map(message => JSON.stringify(message)).join('\n') + '\n';
    await fs.writeFile(historyPath, lines, 'utf8');
    logDebug(`[SubagentTool] Saved ${messages.length} messages to ${historyPath}`);
}

/**
 * Write subagent output to a markdown file
 */
async function writeOutputFile(outputPath: string, text: string): Promise<void> {
    await fs.writeFile(outputPath, text, 'utf8');
    logDebug(`[SubagentTool] Wrote output to ${outputPath}`);
}

// ============================================================================
// Subagent Execution Helper
// ============================================================================

/**
 * Execute a subagent and return the result
 *
 * Note: DataMapper subagent is not accessible via this tool as it requires specific
 * file parameters. Use the generate_data_mapping tool instead.
 *
 * @param previousMessages - Optional previous conversation history for resuming
 */
async function runSubagent(
    subagentType: string,
    prompt: string,
    projectPath: string,
    model: 'haiku' | 'sonnet',
    getAnthropicClient: (model: AnthropicModel) => Promise<any>,
    previousMessages?: any[]
): Promise<SubagentResult> {
    switch (subagentType) {
        case 'Explore':
            return await executeExploreSubagent(prompt, projectPath, model, getAnthropicClient, previousMessages);
        default:
            throw new Error(`Unknown subagent type: ${subagentType}. Available types: Explore. (Note: DataMapper is accessible via generate_data_mapping tool)`);
    }
}

// ============================================================================
// Subagent Tool - Spawns specialized subagents (foreground or background)
// ============================================================================

/**
 * Creates the execute function for the subagent tool
 * @param projectPath - The project root path
 * @param sessionId - Current session ID (for JSONL storage path)
 * @param getAnthropicClient - Function to get the Anthropic client (takes AnthropicModel)
 */
export function createSubagentExecute(
    projectPath: string,
    sessionId: string,
    getAnthropicClient: (model: AnthropicModel) => Promise<any>
): SubagentToolExecuteFn {
    return async (args): Promise<SubagentToolResult> => {
        const { description, prompt, subagent_type, model = 'haiku', run_in_background = false, resume } = args;

        const isResume = !!resume;
        logInfo(`[SubagentTool] ${isResume ? 'Resuming' : 'Spawning'} ${subagent_type} subagent: ${description} (background: ${run_in_background})`);
        logDebug(`[SubagentTool] Prompt: ${prompt.substring(0, 200)}...`);
        if (isResume) {
            logDebug(`[SubagentTool] Resume from task ID: ${resume}`);
        }

        // Clean up old subagents periodically
        cleanupOldSubagents();

        // Load previous history if resuming
        let previousMessages: any[] | undefined;
        if (isResume) {
            try {
                previousMessages = await loadSubagentHistory(projectPath, sessionId, resume);
                logInfo(`[SubagentTool] Loaded ${previousMessages.length} previous messages`);
            } catch (error: any) {
                return {
                    success: false,
                    message: `Failed to resume subagent: ${error.message}`,
                    error: error.message,
                };
            }
        }

        if (run_in_background) {
            // ================================================================
            // Background Execution
            // ================================================================
            // Use existing subagent ID when resuming, otherwise generate new one
            const subagentId = isResume ? resume! : generateSubagentId();
            const subagentDir = getSubagentsDir(projectPath, sessionId, subagentId);
            const outputFilePath = path.join(subagentDir, 'output.md');
            const relativeOutputPath = `.mi-copilot/${sessionId}/subagents/${subagentId}/output.md`;

            // Create directory
            await fs.mkdir(subagentDir, { recursive: true });

            // Register in background map
            const entry: BackgroundSubagent = {
                id: subagentId,
                subagentType: subagent_type,
                description,
                startTime: new Date(),
                output: '',
                completed: false,
                success: null,
                outputFilePath,
                historyDirPath: subagentDir,
            };
            backgroundSubagents.set(subagentId, entry);

            logInfo(`[SubagentTool] Started background ${subagent_type} subagent: ${subagentId}${isResume ? ' (resumed)' : ''}`);

            // Fire-and-forget execution
            runSubagent(subagent_type, prompt, projectPath, model, getAnthropicClient, previousMessages)
                .then(async (result: SubagentResult) => {
                    entry.output = result.text;
                    entry.completed = true;
                    entry.success = true;

                    logInfo(`[SubagentTool] Background ${subagent_type} subagent completed: ${subagentId}`);
                    logDebug(`[SubagentTool] Response length: ${result.text.length} chars`);

                    // Write output file and save history (non-blocking)
                    try {
                        await writeOutputFile(outputFilePath, result.text);
                        await saveSubagentHistory(subagentDir, result.messages);
                    } catch (writeError: any) {
                        logError(`[SubagentTool] Failed to write output/history for ${subagentId}`, writeError);
                    }
                })
                .catch(async (error: any) => {
                    entry.output = `Subagent execution failed: ${error.message}`;
                    entry.completed = true;
                    entry.success = false;

                    logError(`[SubagentTool] Background ${subagent_type} subagent failed: ${subagentId}`, error);

                    // Write error to output file
                    try {
                        await writeOutputFile(outputFilePath, `# Error\n\n${error.message}`);
                    } catch (writeError: any) {
                        logError(`[SubagentTool] Failed to write error output for ${subagentId}`, writeError);
                    }
                });

            // Return immediately with subagent ID and output file path
            return {
                success: true,
                message: `${subagent_type} subagent ${isResume ? 'resumed' : 'started'} in background with ID: ${subagentId}. Use ${TASK_OUTPUT_TOOL_NAME} tool to check results.`,
                subagentId,
                outputFile: relativeOutputPath,
            };
        } else {
            // ================================================================
            // Foreground Execution (existing synchronous behavior)
            // ================================================================
            try {
                const result = await runSubagent(subagent_type, prompt, projectPath, model, getAnthropicClient, previousMessages);

                logInfo(`[SubagentTool] ${subagent_type} subagent completed successfully${isResume ? ' (resumed)' : ''}`);
                logDebug(`[SubagentTool] Response length: ${result.text.length} chars`);

                // Use existing subagent ID when resuming, otherwise generate new one
                const subagentId = isResume ? resume! : generateSubagentId();

                // Save history (non-blocking, fire-and-forget)
                const subagentDir = getSubagentsDir(projectPath, sessionId, subagentId);
                fs.mkdir(subagentDir, { recursive: true })
                    .then(() => saveSubagentHistory(subagentDir, result.messages))
                    .catch((err: any) => logError('[SubagentTool] Failed to save foreground subagent history', err));

                return {
                    success: true,
                    message: result.text,
                    subagentId, // Always return subagent ID for tracking
                };
            } catch (error: any) {
                logError(`[SubagentTool] ${subagent_type} subagent failed`, error);
                return {
                    success: false,
                    message: `Subagent execution failed: ${error.message}`,
                    error: error.message,
                };
            }
        }
    };
}

// ============================================================================
// Subagent Tool Schema
// ============================================================================

const subagentInputSchema = z.object({
    description: z.string().describe(
        'A short (3-5 word) description of what the subagent will do'
    ),
    prompt: z.string().describe(
        'The detailed task for the subagent to perform. Include all necessary context.'
    ),
    subagent_type: z.enum(['Explore']).describe(
        `The type of subagent to spawn:
        - Explore: Fast codebase explorer. Use when you need to find and understand existing code.`
    ),
    model: z.enum(['sonnet', 'haiku']).optional().describe(
        'Optional model selection. Defaults to haiku for cost efficiency. Use sonnet for complex design tasks.'
    ),
    run_in_background: z.boolean().optional().describe(
        'Set to true to run the subagent in the background. Returns a task_id and output_file path. Use task_output tool to check results later using the subagentId.'
    ),
    resume: z.string().optional().describe(
        'Optional subagent ID to resume from (format: subagent-xxxxxxxx). If provided, the subagent will continue from its previous execution. Use this to continue a previously started exploration.'
    ),
});

/**
 * Creates the subagent tool
 */
export function createSubagentTool(execute: SubagentToolExecuteFn) {
    return (tool as any)({
        description: `
            Spawns a specialized subagent to handle complex tasks autonomously.

            ## Available Subagents

            **Explore** - Fast codebase explorer
            - Use when: Need to explore the codebase to understand existing code, find patterns, or locate specific files without filling up your context window with large codebases and complex exploration tasks.
            - Capabilities: Uses grep/glob to search, reads files to understand structure
            - Returns: Summary of findings

            ## Background Execution
            You can optionally run subagents in the background using the run_in_background parameter:
            - When run_in_background=true, the tool returns immediately with a subagentId and output_file path
            - Use the ${TASK_OUTPUT_TOOL_NAME} tool to check on progress or retrieve results using the subagentId
            - You can continue working while background subagents run

            ## Resuming Subagents
            You can resume a previously executed subagent using the resume parameter:
            - Pass the subagentId (format: subagent-xxxxxxxx) to continue from where it left off
            - The subagent will load its previous conversation history and continue exploring
            - Useful when you need to go deeper into a previously explored area
            - Works with both foreground and background execution

            ## Important
            - Subagent IDs are in format: subagent-xxxxxxxx (8-character short UUID)
        `,
        inputSchema: subagentInputSchema,
        execute
    });
}
