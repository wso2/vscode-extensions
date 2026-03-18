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

import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
    SubagentToolResult,
    SubagentToolExecuteFn,
    BackgroundSubagent,
    SubagentResult,
    SUBAGENT_TOOL_NAME,
    KILL_TASK_TOOL_NAME,
    TASK_OUTPUT_TOOL_NAME,
} from './types';
import { logInfo, logError, logDebug } from '../../copilot/logger';
import { AnthropicModel } from '../../connection';
import { getCopilotSessionDir } from '../storage-paths';

// Import subagent executors
import { executeExploreSubagent, executeSynapseContextSubagent } from '../agents/subagents';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a short subagent ID in format: subagent-{short-uuid}
 */
function generateSubagentId(): string {
    const uuid = uuidv4();
    const shortUuid = uuid.split('-')[0]; // First 8 characters
    return `task-subagent-${shortUuid}`;
}

/**
 * Subagent metadata persisted alongside history for resume validation
 */
interface SubagentMetadata {
    subagentType: string;
    createdAt: string;
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

/**
 * Load subagent metadata for resume validation
 */
async function loadSubagentMetadata(projectPath: string, sessionId: string, subagentId: string): Promise<SubagentMetadata | null> {
    const subagentDir = getSubagentsDir(projectPath, sessionId, subagentId);
    const metadataPath = path.join(subagentDir, 'metadata.json');

    try {
        const content = await fs.readFile(metadataPath, 'utf8');
        return JSON.parse(content) as SubagentMetadata;
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

/**
 * Save subagent metadata alongside history
 */
async function saveSubagentMetadata(historyDir: string, subagentType: string): Promise<void> {
    const metadataPath = path.join(historyDir, 'metadata.json');
    const metadata: SubagentMetadata = {
        subagentType,
        createdAt: new Date().toISOString(),
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadata), 'utf8');
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
// JSONL Utilities
// ============================================================================

/**
 * Get the subagents directory for a session
 */
function getSubagentsDir(projectPath: string, sessionId: string, subagentId: string): string {
    return path.join(getCopilotSessionDir(projectPath, sessionId), 'subagents', subagentId);
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
    previousMessages?: any[],
    abortSignal?: AbortSignal
): Promise<SubagentResult> {
    switch (subagentType) {
        case 'Explore':
            return await executeExploreSubagent(prompt, projectPath, model, getAnthropicClient, previousMessages, abortSignal);
        case 'SynapseContext':
            return await executeSynapseContextSubagent(prompt, projectPath, model, getAnthropicClient, previousMessages, abortSignal);
        default:
            throw new Error(`Unknown subagent type: ${subagentType}. Available types: Explore, SynapseContext. (Note: DataMapper is accessible via generate_data_mapping tool)`);
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
 * @param mainAbortSignal - Abort signal from the main agent, propagated to foreground subagents
 *                          and linked to background subagent AbortControllers
 */
export function createSubagentExecute(
    projectPath: string,
    sessionId: string,
    getAnthropicClient: (model: AnthropicModel) => Promise<any>,
    mainAbortSignal?: AbortSignal
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
            // Block resume of still-running background subagent
            const running = backgroundSubagents.get(resume);
            if (running && !running.completed) {
                return {
                    success: false,
                    message: `Subagent ${resume} is still running. Wait for it to complete (use ${TASK_OUTPUT_TOOL_NAME}) or terminate it (use ${KILL_TASK_TOOL_NAME}) before resuming.`,
                    error: 'SUBAGENT_STILL_RUNNING',
                };
            }

            // Validate subagent type matches the original
            const metadata = await loadSubagentMetadata(projectPath, sessionId, resume);
            if (metadata && metadata.subagentType !== subagent_type) {
                return {
                    success: false,
                    message: `Cannot resume: subagent ${resume} is a ${metadata.subagentType} subagent, but subagent_type=${subagent_type} was requested. Use subagent_type=${metadata.subagentType} to resume it.`,
                    error: 'SUBAGENT_TYPE_MISMATCH',
                };
            }

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
            const abortController = new AbortController();

            // Link main agent's abort signal to background subagent's controller
            // so user abort terminates background subagents too
            let removeAbortListener: (() => void) | undefined;
            if (mainAbortSignal) {
                if (mainAbortSignal.aborted) {
                    abortController.abort(mainAbortSignal.reason);
                } else {
                    const onMainAbort = () => abortController.abort(mainAbortSignal.reason);
                    mainAbortSignal.addEventListener('abort', onMainAbort, { once: true });
                    removeAbortListener = () => mainAbortSignal.removeEventListener('abort', onMainAbort);
                    // Also clean up if aborted (e.g. by kill_task)
                    abortController.signal.addEventListener('abort', removeAbortListener, { once: true });
                }
            }

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
                historyDirPath: subagentDir,
                aborted: false,
                abortController,
            };
            backgroundSubagents.set(subagentId, entry);

            logInfo(`[SubagentTool] Started background ${subagent_type} subagent: ${subagentId}${isResume ? ' (resumed)' : ''}`);

            // Fire-and-forget execution
            runSubagent(
                subagent_type,
                prompt,
                projectPath,
                model,
                getAnthropicClient,
                previousMessages,
                abortController.signal
            )
                .then(async (result: SubagentResult) => {
                    removeAbortListener?.();
                    entry.output = result.text;
                    entry.completed = true;
                    entry.success = true;

                    logInfo(`[SubagentTool] Background ${subagent_type} subagent completed: ${subagentId}`);
                    logDebug(`[SubagentTool] Response length: ${result.text.length} chars`);

                    // Save history and metadata (non-blocking)
                    try {
                        await saveSubagentHistory(subagentDir, result.messages);
                        await saveSubagentMetadata(subagentDir, subagent_type);
                    } catch (writeError: any) {
                        logError(`[SubagentTool] Failed to write history for ${subagentId}`, writeError);
                    }
                })
                .catch((error: any) => {
                    removeAbortListener?.();
                    if (entry.aborted) {
                        entry.output = `Subagent ${subagentId} was terminated by user request.`;
                        entry.completed = true;
                        entry.success = false;
                        logInfo(`[SubagentTool] Background ${subagent_type} subagent aborted: ${subagentId}`);
                        return;
                    }

                    entry.output = `Subagent execution failed: ${error.message}`;
                    entry.completed = true;
                    entry.success = false;

                    logError(`[SubagentTool] Background ${subagent_type} subagent failed: ${subagentId}`, error);
                });

            // Return immediately with subagent ID
            return {
                success: true,
                message: `${subagent_type} subagent ${isResume ? 'resumed' : 'started'} in background with ID: ${subagentId}. Use ${TASK_OUTPUT_TOOL_NAME} tool to check results, or ${KILL_TASK_TOOL_NAME} to terminate it.`,
                subagentId,
            };
        } else {
            // ================================================================
            // Foreground Execution (existing synchronous behavior)
            // ================================================================
            try {
                const result = await runSubagent(subagent_type, prompt, projectPath, model, getAnthropicClient, previousMessages, mainAbortSignal);

                logInfo(`[SubagentTool] ${subagent_type} subagent completed successfully${isResume ? ' (resumed)' : ''}`);
                logDebug(`[SubagentTool] Response length: ${result.text.length} chars`);

                // Use existing subagent ID when resuming, otherwise generate new one
                const subagentId = isResume ? resume! : generateSubagentId();

                // Save history and metadata (non-blocking, fire-and-forget)
                const subagentDir = getSubagentsDir(projectPath, sessionId, subagentId);
                fs.mkdir(subagentDir, { recursive: true })
                    .then(async () => {
                        await saveSubagentHistory(subagentDir, result.messages);
                        await saveSubagentMetadata(subagentDir, subagent_type);
                    })
                    .catch((err: any) => logError('[SubagentTool] Failed to save foreground subagent history', err));

                return {
                    success: true,
                    message: result.text,
                    // Note: subagentId is intentionally NOT returned for foreground subagents.
                    // The result is already inline above. Returning the ID would mislead the
                    // agent into calling task_output on it, which only works for background tasks.
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
    subagent_type: z.enum(['Explore', 'SynapseContext']).describe(
        `The type of subagent to spawn:
        - Explore: Fast codebase explorer. Use when you need to find and understand existing code.
        - SynapseContext: Synapse XML expert. Use when you need deep answers about Synapse expressions, mediators, endpoints, properties, SOAP, payload patterns, or edge cases. It loads and cross-references deep reference documentation to provide accurate, actionable answers with XML examples.`
    ),
    model: z.enum(['sonnet', 'haiku']).optional().describe(
        'Optional model selection. Defaults to haiku for cost efficiency. Use sonnet for complex design tasks.'
    ),
    run_in_background: z.boolean().optional().describe(
        `Set to true to run the subagent in the background.
        Returns a task_id (subagentId). Use ${TASK_OUTPUT_TOOL_NAME} to check results or ${KILL_TASK_TOOL_NAME} to terminate it (same task workflow used by background shell commands).`
    ),
    resume: z.string().optional().describe(
        'Optional subagent ID to resume from (format: task-subagent-xxxxxxxx). If provided, the subagent will continue from its previous execution. Use this to continue a previously started exploration.'
    ),
});

/**
 * Creates the subagent tool
 */
export function createSubagentTool(execute: SubagentToolExecuteFn) {
    return (tool as any)({
        description: `Spawn a specialized subagent without filling your context window.
            Available types:
            - Explore: Uses grep/glob/file_read to search and understand code, then returns a summary.
            - SynapseContext: Loads deep Synapse reference documentation (expressions, mediators, endpoints, properties, SOAP, payload patterns, edge cases) via load_context_reference and cross-references them to answer technical questions with XML examples.
            Supports background execution (run_in_background=true) and resuming previous subagents (resume=subagentId).
            Foreground (default): blocks until done and returns the result directly — do NOT call ${TASK_OUTPUT_TOOL_NAME} on it.
            Background (run_in_background=true): returns a task ID immediately. Use ${TASK_OUTPUT_TOOL_NAME} to poll results or ${KILL_TASK_TOOL_NAME} to terminate.`,
        inputSchema: subagentInputSchema,
        execute
    });
}
