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
import { TaskResult, TaskExecuteFn, BackgroundSubagent, SubagentResult, TASK_TOOL_NAME, TASK_OUTPUT_TOOL_NAME } from './types';
import { logInfo, logError, logDebug } from '../../copilot/logger';
import { AnthropicModel } from '../../connection';

// Import subagent executors
import { executePlanSubagent } from '../agents/subagents/plan/agent';
import { executeExploreSubagent } from '../agents/subagents/explore/agent';

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
function getSubagentsDir(projectPath: string, sessionId: string, taskId: string): string {
    return path.join(projectPath, '.mi-copilot', sessionId, 'subagents', taskId);
}

/**
 * Save subagent conversation steps to JSONL
 */
async function saveSubagentHistory(historyDir: string, steps: any[]): Promise<void> {
    const historyPath = path.join(historyDir, 'history.jsonl');
    const lines = steps.map(step => JSON.stringify(step)).join('\n') + '\n';
    await fs.writeFile(historyPath, lines, 'utf8');
    logDebug(`[TaskTool] Saved ${steps.length} steps to ${historyPath}`);
}

/**
 * Write subagent output to a markdown file
 */
async function writeOutputFile(outputPath: string, text: string): Promise<void> {
    await fs.writeFile(outputPath, text, 'utf8');
    logDebug(`[TaskTool] Wrote output to ${outputPath}`);
}

// ============================================================================
// Subagent Execution Helper
// ============================================================================

/**
 * Execute a subagent (Plan or Explore) and return the result
 */
async function runSubagent(
    subagentType: string,
    prompt: string,
    projectPath: string,
    model: 'haiku' | 'sonnet',
    getAnthropicClient: (model: AnthropicModel) => Promise<any>
): Promise<SubagentResult> {
    switch (subagentType) {
        case 'Plan':
            return await executePlanSubagent(prompt, projectPath, model, getAnthropicClient);
        case 'Explore':
            return await executeExploreSubagent(prompt, projectPath, model, getAnthropicClient);
        default:
            throw new Error(`Unknown subagent type: ${subagentType}. Available types: Plan, Explore`);
    }
}

// ============================================================================
// Task Tool - Spawns specialized subagents (foreground or background)
// ============================================================================

/**
 * Creates the execute function for the task tool
 * @param projectPath - The project root path
 * @param sessionId - Current session ID (for JSONL storage path)
 * @param getAnthropicClient - Function to get the Anthropic client (takes AnthropicModel)
 */
export function createTaskExecute(
    projectPath: string,
    sessionId: string,
    getAnthropicClient: (model: AnthropicModel) => Promise<any>
): TaskExecuteFn {
    return async (args): Promise<TaskResult> => {
        const { description, prompt, subagent_type, model = 'haiku', run_in_background = false } = args;

        logInfo(`[TaskTool] Spawning ${subagent_type} subagent: ${description} (background: ${run_in_background})`);
        logDebug(`[TaskTool] Prompt: ${prompt.substring(0, 200)}...`);

        // Clean up old subagents periodically
        cleanupOldSubagents();

        if (run_in_background) {
            // ================================================================
            // Background Execution
            // ================================================================
            const taskId = uuidv4();
            const subagentDir = getSubagentsDir(projectPath, sessionId, taskId);
            const outputFilePath = path.join(subagentDir, 'output.md');
            const relativeOutputPath = `.mi-copilot/${sessionId}/subagents/${taskId}/output.md`;

            // Create directory
            await fs.mkdir(subagentDir, { recursive: true });

            // Register in background map
            const entry: BackgroundSubagent = {
                id: taskId,
                subagentType: subagent_type,
                description,
                startTime: new Date(),
                output: '',
                completed: false,
                success: null,
                outputFilePath,
                historyDirPath: subagentDir,
            };
            backgroundSubagents.set(taskId, entry);

            logInfo(`[TaskTool] Started background ${subagent_type} subagent: ${taskId}`);

            // Fire-and-forget execution
            runSubagent(subagent_type, prompt, projectPath, model, getAnthropicClient)
                .then(async (result: SubagentResult) => {
                    entry.output = result.text;
                    entry.completed = true;
                    entry.success = true;

                    logInfo(`[TaskTool] Background ${subagent_type} subagent completed: ${taskId}`);
                    logDebug(`[TaskTool] Response length: ${result.text.length} chars`);

                    // Write output file and save history (non-blocking)
                    try {
                        await writeOutputFile(outputFilePath, result.text);
                        await saveSubagentHistory(subagentDir, result.steps);
                    } catch (writeError: any) {
                        logError(`[TaskTool] Failed to write output/history for ${taskId}`, writeError);
                    }
                })
                .catch(async (error: any) => {
                    entry.output = `Subagent execution failed: ${error.message}`;
                    entry.completed = true;
                    entry.success = false;

                    logError(`[TaskTool] Background ${subagent_type} subagent failed: ${taskId}`, error);

                    // Write error to output file
                    try {
                        await writeOutputFile(outputFilePath, `# Error\n\n${error.message}`);
                    } catch (writeError: any) {
                        logError(`[TaskTool] Failed to write error output for ${taskId}`, writeError);
                    }
                });

            // Return immediately with task ID and output file path
            return {
                success: true,
                message: `${subagent_type} subagent started in background with task ID: ${taskId}. Use ${TASK_OUTPUT_TOOL_NAME} tool to check results.`,
                taskId,
                outputFile: relativeOutputPath,
            };
        } else {
            // ================================================================
            // Foreground Execution (existing synchronous behavior)
            // ================================================================
            try {
                const result = await runSubagent(subagent_type, prompt, projectPath, model, getAnthropicClient);

                logInfo(`[TaskTool] ${subagent_type} subagent completed successfully`);
                logDebug(`[TaskTool] Response length: ${result.text.length} chars`);

                // Save history in background (non-blocking, fire-and-forget)
                const subagentDir = getSubagentsDir(projectPath, sessionId, uuidv4());
                fs.mkdir(subagentDir, { recursive: true })
                    .then(() => saveSubagentHistory(subagentDir, result.steps))
                    .catch((err: any) => logError('[TaskTool] Failed to save foreground subagent history', err));

                return {
                    success: true,
                    message: result.text,
                };
            } catch (error: any) {
                logError(`[TaskTool] ${subagent_type} subagent failed`, error);
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
// Task Tool Schema
// ============================================================================

const taskInputSchema = z.object({
    description: z.string().describe(
        'A short (3-5 word) description of what the subagent will do'
    ),
    prompt: z.string().describe(
        'The detailed task for the subagent to perform. Include all necessary context.'
    ),
    subagent_type: z.enum(['Plan', 'Explore']).describe(
        `The type of subagent to spawn:
        - Plan: Software architect for MI/Synapse integration design. Use when you need to design an implementation approach.
        - Explore: Fast codebase explorer. Use when you need to find and understand existing code.`
    ),
    model: z.enum(['sonnet', 'haiku']).optional().describe(
        'Optional model selection. Defaults to haiku for cost efficiency. Use sonnet for complex design tasks.'
    ),
    run_in_background: z.boolean().optional().describe(
        'Set to true to run the subagent in the background. Returns a task_id and output_file path. Use task_output tool to check results later.'
    ),
});

/**
 * Creates the task tool
 */
export function createTaskTool(execute: TaskExecuteFn) {
    return (tool as any)({
        description: `
            Spawns a specialized subagent to handle complex tasks autonomously.

            ## Available Subagents

            **Plan** - Software architect for MI/Synapse integration design
            - Use when: Complex integration requirements, need to design architecture before implementation
            - Capabilities: Explores project structure, analyzes existing artifacts, designs implementation plans
            - Returns: Detailed implementation plan with artifacts, connectors, and steps

            **Explore** - Fast codebase explorer
            - Use when: Need to understand existing code, find patterns, or locate specific files
            - Capabilities: Uses grep/glob to search, reads files to understand structure
            - Returns: Summary of findings

            ## When to Use This Tool

            1. User requests a complex integration (3+ artifacts to create)
            2. You need to design an architecture before implementation
            3. You need to explore unfamiliar parts of the codebase
            4. The implementation approach is unclear

            ## Background Execution

            You can optionally run subagents in the background using the run_in_background parameter:
            - When run_in_background=true, the tool returns immediately with a task_id and output_file path
            - Use the ${TASK_OUTPUT_TOOL_NAME} tool to check on progress or retrieve results
            - You can continue working while background subagents run
            - Output is saved to a file and subagent conversation is persisted to JSONL

            ## Example

            User: "Create a REST API that syncs customers with Salesforce"

            You should:
            1. Use this tool with Plan subagent to design the integration
            2. Receive plan with APIs, connectors, data mappers needed
            3. Present plan to user with todo_write tool
            4. Execute after user approval

            ## Important

            - In foreground mode (default): subagent response is returned as the tool result
            - In background mode: returns task_id immediately; use ${TASK_OUTPUT_TOOL_NAME} to get results
            - Default model is 'haiku' for cost efficiency; use 'sonnet' for complex designs
        `,
        inputSchema: taskInputSchema,
        execute
    });
}
