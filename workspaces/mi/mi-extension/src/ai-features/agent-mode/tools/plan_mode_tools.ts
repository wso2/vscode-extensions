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

import * as fs from 'fs/promises';
import * as path from 'path';
import { tool } from 'ai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
import {
    ToolResult,
    TodoItem,
    AskUserExecuteFn,
    EnterPlanModeExecuteFn,
    ExitPlanModeExecuteFn,
    TodoWriteExecuteFn,
    ASK_USER_TOOL_NAME,
    ENTER_PLAN_MODE_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
} from './types';
import { PLAN_MODE_SHARED_GUIDELINES } from '../agents/main/mode';
import { logInfo, logDebug, logError } from '../../copilot/logger';
import { AgentEvent } from '@wso2/mi-core';

// ============================================================================
// Plan File Utilities (Simple - no PlanManager class needed)
// ============================================================================

interface PlanModeSessionState {
    planPath: string;
    relativePath: string;
    baselineMtimeMs: number;
}

// Tracks the last "accepted baseline" timestamp for each session's plan file.
// exit_plan_mode requires a newer mtime to ensure the plan was updated.
const planModeSessionStates = new Map<string, PlanModeSessionState>();

/**
 * Generate a memorable slug for the plan file
 * Format: adjective-color-animal (e.g., "harmonic-azure-falcon")
 */
function generatePlanSlug(): string {
    return uniqueNamesGenerator({
        dictionaries: [adjectives, colors, animals],
        separator: '-',
        length: 3,
        style: 'lowerCase'
    });
}

/**
 * Get the plan directory path for a session
 */
function getPlanDir(projectPath: string, sessionId: string): string {
    return path.join(projectPath, '.mi-copilot', sessionId, 'plan');
}

/**
 * Check if a plan file exists for this session and return its path/slug
 * Returns { exists: true, slug, path } if found, { exists: false, slug, path } with new slug if not
 */
async function getOrCreatePlanInfo(projectPath: string, sessionId: string): Promise<{
    exists: boolean;
    slug: string;
    planPath: string;
    relativePath: string;
}> {
    const planDir = getPlanDir(projectPath, sessionId);
    
    try {
        // Ensure directory exists
        await fs.mkdir(planDir, { recursive: true });
        
        // Check for existing plan files
        const files = await fs.readdir(planDir);
        const planFiles = files.filter(f => f.endsWith('.md'));
        
        if (planFiles.length > 0) {
            // Use existing plan file
            const slug = planFiles[0].replace('.md', '');
            const planPath = path.join(planDir, planFiles[0]);
            const relativePath = `.mi-copilot/${sessionId}/plan/${slug}.md`;
            logInfo(`[PlanMode] Found existing plan: ${slug}`);
            return { exists: true, slug, planPath, relativePath };
        }
    } catch {
        // Directory doesn't exist, will create below
        await fs.mkdir(planDir, { recursive: true });
    }
    
    // Generate new slug
    const slug = generatePlanSlug();
    const planPath = path.join(planDir, `${slug}.md`);
    const relativePath = `.mi-copilot/${sessionId}/plan/${slug}.md`;
    logInfo(`[PlanMode] Generated new plan slug: ${slug}`);
    return { exists: false, slug, planPath, relativePath };
}

/**
 * Ensure .gitignore exists in .mi-copilot folder
 */
async function ensureGitignore(projectPath: string): Promise<void> {
    const miCopilotDir = path.join(projectPath, '.mi-copilot');
    const gitignorePath = path.join(miCopilotDir, '.gitignore');
    
    try {
        await fs.access(gitignorePath);
    } catch {
        // Create .gitignore
        await fs.mkdir(miCopilotDir, { recursive: true });
        const content = `# MI Copilot session files - auto-generated\n# Each session folder contains chat history and plans\n*/\n`;
        await fs.writeFile(gitignorePath, content, 'utf8');
        logDebug('[PlanMode] Created .mi-copilot/.gitignore');
    }
}

async function getFileMtimeMs(filePath: string): Promise<number | undefined> {
    try {
        const stats = await fs.stat(filePath);
        return stats.mtimeMs;
    } catch {
        return undefined;
    }
}

function createPlanModeSystemReminder(planInfo: {
    exists: boolean;
    relativePath: string;
}): string {
    return [
        'Plan mode is active. You MUST NOT make any edits except to the plan file mentioned below.',
        '',
        '## Plan File Info:',
        planInfo.exists
            ? `A plan file already exists at ${planInfo.relativePath}. You can read it and make incremental edits using the file_edit tool. If that is an old plan write a new plan to the file.`
            : `Your plan file is: ${planInfo.relativePath}. Create this file using file_write to write your plan.`,
        '',
        'You should build your plan incrementally by writing to or editing this file.',
        'This is the ONLY file you are allowed to edit during plan mode.',
        '',
        `IMPORTANT: Always present your plan in simple summary format in chat window to the user with no code details because we are in a low code environment before using ${EXIT_PLAN_MODE_TOOL_NAME} tool.`,
        `Then when your plan is ready for user approval, call ${EXIT_PLAN_MODE_TOOL_NAME} tool.`,
    ].join('\n');
}

export async function initializePlanModeSession(
    projectPath: string,
    sessionId: string,
    options?: { forceBaselineReset?: boolean }
): Promise<{
    exists: boolean;
    slug: string;
    planPath: string;
    relativePath: string;
}> {
    await ensureGitignore(projectPath);
    const planInfo = await getOrCreatePlanInfo(projectPath, sessionId);
    const existingState = planModeSessionStates.get(sessionId);

    const forceBaselineReset = options?.forceBaselineReset === true;
    if (forceBaselineReset || !existingState || existingState.planPath !== planInfo.planPath) {
        const baselineMtimeMs = await getFileMtimeMs(planInfo.planPath) ?? Date.now();
        planModeSessionStates.set(sessionId, {
            planPath: planInfo.planPath,
            relativePath: planInfo.relativePath,
            baselineMtimeMs,
        });
    }

    return planInfo;
}

export async function getPlanModeReminder(projectPath: string, sessionId: string): Promise<string> {
    const planInfo = await initializePlanModeSession(projectPath, sessionId);
    return createPlanModeSystemReminder(planInfo);
}

function updatePlanModeBaseline(sessionId: string, planPath: string, relativePath: string, baselineMtimeMs: number): void {
    planModeSessionStates.set(sessionId, {
        planPath,
        relativePath,
        baselineMtimeMs,
    });
}

function clearPlanModeSession(sessionId: string): void {
    planModeSessionStates.delete(sessionId);
}

// ============================================================================
// Types for Event Handler
// ============================================================================

export interface PendingQuestion {
    questionId: string;
    question: string;
    resolve: (answer: string) => void;
    reject: (error: Error) => void;
}

export interface PendingPlanApproval {
    approvalId: string;
    resolve: (result: { approved: boolean; feedback?: string }) => void;
    reject: (error: Error) => void;
}

export type AgentEventHandler = (event: AgentEvent) => void;

// ============================================================================
// Ask User Tool
// ============================================================================

/**
 * Creates the execute function for ask_user tool
 * @param eventHandler - Function to send events to the UI
 * @param pendingQuestions - Map to track pending questions awaiting user response
 */
export function createAskUserExecute(
    eventHandler: AgentEventHandler,
    pendingQuestions: Map<string, PendingQuestion>
): AskUserExecuteFn {
    return async (args): Promise<ToolResult> => {
        const { questions } = args;
        const questionId = uuidv4();

        // Validate questions
        if (!questions || questions.length === 0) {
            logError('[AskUserTool] No questions provided');
            return {
                success: false,
                message: 'No questions provided. Please provide at least one question with options.',
                error: 'INVALID_INPUT'
            };
        }

        // Validate each question
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.question || !q.options || q.options.length < 2) {
                logError(`[AskUserTool] Invalid question at index ${i}: missing required fields or insufficient options`);
                logError(`[AskUserTool] Question data: ${JSON.stringify(q)}`);
                return {
                    success: false,
                    message: `Question ${i + 1} is invalid. Each question must have: question text and at least 2 options with labels and descriptions.`,
                    error: 'INVALID_QUESTION_FORMAT'
                };
            }
        }

        logInfo(`[AskUserTool] Asking user ${questions.length} question(s)`);
        // Log full question structure for debugging
        questions.forEach((q, idx) => {
            logDebug(`[AskUserTool] Question ${idx + 1}:`);
            logDebug(`  - Question: ${q.question}`);
            logDebug(`  - MultiSelect: ${q.multiSelect}`);
            logDebug(`  - Options (${q.options.length}):`);
            q.options.forEach((opt, optIdx) => {
                logDebug(`    ${optIdx + 1}. "${opt.label}" - ${opt.description}`);
            });
        });

        // Send ask_user event to UI with structured questions
        const event = {
            type: 'ask_user',
            questionId,
            questions,
        };
        logDebug(`[AskUserTool] Sending event to UI: ${JSON.stringify(event, null, 2)}`);
        eventHandler(event as any);

        // Wait for user response (Promise resolves when respondToQuestion is called)
        // No timeout - we wait indefinitely for user response
        return new Promise((resolve, reject) => {
            pendingQuestions.set(questionId, {
                questionId,
                question: questions.map(q => q.question).join('; '),
                resolve: (answersJson: string) => {
                    pendingQuestions.delete(questionId);

                    // Check if user cancelled (special string indicating cancellation)
                    if (answersJson === '__USER_CANCELLED__') {
                        logInfo(`[AskUserTool] User refused to answer questions`);
                        resolve({
                            success: false,
                            message: 'User refused to answer the questions. You should proceed without this information or adjust your approach.',
                            error: 'USER_CANCELLED'
                        });
                        return;
                    }

                    try {
                        // Parse answers object
                        const answers = JSON.parse(answersJson);

                        // Format result message like Claude Code: "question"="answer"
                        const formattedAnswers = Object.entries(answers)
                            .map(([question, answer]) => `"${question}"="${answer}"`)
                            .join(', ');

                        logInfo(`[AskUserTool] Received user responses: ${formattedAnswers}`);
                        resolve({
                            success: true,
                            message: `User has answered your questions: ${formattedAnswers}. You can now continue with the user's answers in mind.`
                        });
                    } catch (error) {
                        // Fallback for simple string response
                        logInfo(`[AskUserTool] Received user response: ${answersJson.substring(0, 100)}...`);
                        resolve({
                            success: true,
                            message: `User responded: ${answersJson}`
                        });
                    }
                },
                reject: (error: Error) => {
                    pendingQuestions.delete(questionId);
                    reject(error);
                }
            });
        });
    };
}

const questionOptionSchema = z.object({
    label: z.string().describe('The display text for this option (1-5 words)'),
    description: z.string().describe('Explanation of what this option means or what will happen if chosen')
});

const questionSchema = z.object({
    question: z.string().describe('The complete question to ask the user. Should be clear, specific, and end with a question mark.'),
    options: z.array(questionOptionSchema).min(2).max(4).describe(
        'The available choices for this question. Must have 2-4 options. Each option should be a distinct choice.'
    ),
    multiSelect: z.boolean().default(false).describe(
        'Set to true to allow the user to select multiple options instead of just one. Use when choices are not mutually exclusive.'
    )
});

const askUserInputSchema = z.object({
    questions: z.array(questionSchema).min(1).max(4).describe('Questions to ask the user (1-4 questions)')
});

export function createAskUserTool(execute: AskUserExecuteFn) {
    return (tool as any)({
        description: `Ask the user 1-4 questions with 2-4 options each. BLOCKS until user responds.
            Use to clarify requirements, get preferences, or confirm implementation choices.
            Put recommended option first with "(Recommended)" in label. Users can always select "Other" for free text.
            Use multiSelect=true when choices are not mutually exclusive.`,
        inputSchema: askUserInputSchema,
        execute
    });
}

// ============================================================================
// Enter Plan Mode Tool
// ============================================================================

/**
 * Creates the execute function for enter_plan_mode tool
 * Simplified: just checks if plan file exists and passes slug to agent
 * @param projectPath - Path to the MI project
 * @param sessionId - Current session ID
 * @param eventHandler - Function to send events to the UI
 */
export function createEnterPlanModeExecute(
    projectPath: string,
    sessionId: string,
    eventHandler: AgentEventHandler
): EnterPlanModeExecuteFn {
    return async (): Promise<ToolResult> => {
        logInfo(`[EnterPlanMode] Entering plan mode`);

        try {
            // Initialize plan mode state and plan file metadata for this session.
            await initializePlanModeSession(projectPath, sessionId, { forceBaselineReset: true });
            const planReminder = await getPlanModeReminder(projectPath, sessionId);

            // Send event to UI
            eventHandler({
                type: 'plan_mode_entered',
            } as any);

            // Build the response with <system-reminder> containing plan file info
            const baseMessage = `Entered plan mode. You should now focus on exploration and implementation planning before implementation.

            ${PLAN_MODE_SHARED_GUIDELINES}

            Remember: DO NOT write or edit project files yet. This is a planning phase.`;

            // Inject <system-reminder> with concrete plan-file instructions.
            const systemReminder = `
            <system-reminder>
            ${planReminder}
            </system-reminder>`;

            return {
                success: true,
                message: baseMessage + systemReminder
            };
        } catch (error: any) {
            logError('[EnterPlanMode] Failed to enter plan mode', error);
            return {
                success: false,
                message: `Failed to enter plan mode: ${error.message}`,
                error: error.message
            };
        }
    };
}

// No parameters - matches Claude Code's EnterPlanMode
const enterPlanModeInputSchema = z.object({});

export function createEnterPlanModeTool(execute: EnterPlanModeExecuteFn) {
    return (tool as any)({
        description: `Enter plan mode for non-trivial implementation tasks. Prefer this before new features, multi-file changes, architectural decisions, or unclear requirements.
            In plan mode: explore codebase (read-only), design approach, write/update the plan file, then use ${EXIT_PLAN_MODE_TOOL_NAME} for approval.
            Do NOT use this for simple fixes (single/few-line obvious changes) or pure research-only requests.
            When unsure, prefer planning to align with the user before implementation.`,
        inputSchema: enterPlanModeInputSchema,
        execute
    });
}

// ============================================================================
// Exit Plan Mode Tool
// ============================================================================

/**
 * Creates the execute function for exit_plan_mode tool
 * Simplified: no PlanManager, just handles approval workflow
 * @param projectPath - Path to the MI project
 * @param sessionId - Current session ID
 * @param eventHandler - Function to send events to the UI
 * @param pendingApprovals - Map to track pending approvals awaiting user response
 */
export function createExitPlanModeExecute(
    projectPath: string,
    sessionId: string,
    eventHandler: AgentEventHandler,
    pendingApprovals: Map<string, PendingPlanApproval>
): ExitPlanModeExecuteFn {
    return async (args): Promise<ToolResult> => {
        const { summary } = args;
        const approvalId = uuidv4();

        logInfo(`[ExitPlanMode] Requesting plan approval: ${approvalId}`);

        // Validate that the plan file exists, has content, and was updated after entering plan mode.
        const planInfo = await initializePlanModeSession(projectPath, sessionId);
        if (!planInfo.exists) {
            return {
                success: false,
                message: `Plan file does not exist yet at ${planInfo.relativePath}. Write your plan first, then call ${EXIT_PLAN_MODE_TOOL_NAME}.`,
                error: 'PLAN_FILE_MISSING',
            };
        }

        let planContent = '';
        let planMtimeMs = 0;
        try {
            const rawPlanContent = await fs.readFile(planInfo.planPath, 'utf8');
            planContent = rawPlanContent.trim();
            const mtime = await getFileMtimeMs(planInfo.planPath);
            planMtimeMs = mtime ?? 0;
        } catch (error: any) {
            return {
                success: false,
                message: `Failed to read plan file at ${planInfo.relativePath}: ${error.message}`,
                error: 'PLAN_FILE_READ_FAILED',
            };
        }

        if (!planContent) {
            return {
                success: false,
                message: `Plan file ${planInfo.relativePath} is empty. Write a concrete plan before requesting approval.`,
                error: 'PLAN_FILE_EMPTY',
            };
        }

        const planState = planModeSessionStates.get(sessionId);
        if (planState && planState.planPath === planInfo.planPath && planMtimeMs <= planState.baselineMtimeMs + 1) {
            return {
                success: false,
                message: `Plan file ${planInfo.relativePath} was not updated after entering/reviewing plan mode. Update the plan file, then call ${EXIT_PLAN_MODE_TOOL_NAME} again.`,
                error: 'PLAN_NOT_UPDATED',
            };
        }

        // Send plan_approval_requested event to UI
        eventHandler({
            type: 'plan_approval_requested',
            approvalId,
            planFilePath: planInfo.planPath,
            content: planContent || summary || 'Plan ready for approval',
        } as any);

        // Wait for user approval (Promise resolves when respondToPlanApproval is called)
        // No timeout - we wait indefinitely for user approval
        return new Promise((resolve, reject) => {
            pendingApprovals.set(approvalId, {
                approvalId,
                resolve: async (result: { approved: boolean; feedback?: string }) => {
                    pendingApprovals.delete(approvalId);

                    if (result.approved) {
                        logInfo(`[ExitPlanMode] Plan approved`);
                        clearPlanModeSession(sessionId);

                        // Send plan_mode_exited event
                        eventHandler({
                            type: 'plan_mode_exited',
                            content: 'Plan approved',
                        } as any);

                        resolve({
                            success: true,
                            message: `Plan approved by user. You can now proceed with implementation. Now create a Todo list to track the implementation steps using the ${TODO_WRITE_TOOL_NAME} tool.`
                        });
                    } else {
                        logInfo(`[ExitPlanMode] Plan not approved. Feedback: ${result.feedback || 'none'}`);
                        const latestMtime = (await getFileMtimeMs(planInfo.planPath)) ?? planMtimeMs ?? Date.now();
                        updatePlanModeBaseline(sessionId, planInfo.planPath, planInfo.relativePath, latestMtime);
                        const planReminder = await getPlanModeReminder(projectPath, sessionId);
                        resolve({
                            success: false,
                            message: [
                                result.feedback
                                    ? `Plan not approved. User feedback: ${result.feedback}. Please revise the plan and try again.`
                                    : 'Plan not approved by user. Please revise the plan based on user requirements and try again.',
                                '',
                                '<system-reminder>',
                                'Plan mode remains active. Update the plan file and request approval again.',
                                planReminder,
                                '</system-reminder>',
                            ].join('\n')
                        });
                    }
                },
                reject: (error: Error) => {
                    pendingApprovals.delete(approvalId);
                    reject(error);
                }
            });
        });
    };
}

const exitPlanModeInputSchema = z.object({
    summary: z.string().optional().describe(
        'Optional short summary shown while requesting approval. The actual plan is read from the plan file.'
    ),
    plan: z.string().optional().describe(
        'Deprecated alias for summary. The actual plan is always read from the plan file.'
    ),
});

export function createExitPlanModeTool(execute: ExitPlanModeExecuteFn) {
    return (tool as any)({
        description: `Signal that your implementation plan is ready for user approval. BLOCKS until user approves or rejects.
            Write/update your plan in the assigned plan file BEFORE calling this tool.
            Use only when planning implementation work; do NOT use for research/exploration-only tasks.
            Resolve open requirement questions with ask_user first. Do NOT ask "Is this plan okay?" via ask_user - this tool handles plan approval.`,
        inputSchema: exitPlanModeInputSchema,
        execute
    });
}

// ============================================================================
// Todo Write Tool
// ============================================================================

/**
 * Creates the execute function for todo_write tool
 * This is an IN-MEMORY tool that only updates the UI (like Claude Code)
 * No file persistence - todos reset when conversation ends
 * @param eventHandler - Function to send events to the UI
 */
export function createTodoWriteExecute(
    eventHandler: AgentEventHandler
): TodoWriteExecuteFn {
    return async (args): Promise<ToolResult> => {
        const { todos } = args;

        logInfo(`[TodoWriteTool] Updating ${todos.length} todos (in-memory)`);
        logDebug(`[TodoWriteTool] Todos: ${JSON.stringify(todos.map(t => ({ status: t.status, content: t.content.substring(0, 50) })))}`);

        // Send event to UI - this is the ONLY thing we do (in-memory, no file persistence)
        eventHandler({
            type: 'todo_updated',
            todos,
        } as any);

        // Generate summary
        const completed = todos.filter(t => t.status === 'completed').length;
        const inProgress = todos.filter(t => t.status === 'in_progress').length;
        const pending = todos.filter(t => t.status === 'pending').length;

        let summary = `Updated ${todos.length} todo(s): `;
        const parts: string[] = [];
        if (completed > 0) parts.push(`${completed} completed`);
        if (inProgress > 0) parts.push(`${inProgress} in progress`);
        if (pending > 0) parts.push(`${pending} pending`);
        summary += parts.join(', ');
        const message = "Todos have been modified successfully. Ensure that you continue to use the todo list to track your progress. Please proceed with the current tasks if applicable.\n" + summary;

        return {
            success: true,
            message: message
        };
    };
}

const todoItemSchema = z.object({
    content: z.string().min(1).describe('What needs to be done (imperative form, e.g., "Create CustomerAPI")'),
    status: z.enum(['pending', 'in_progress', 'completed']).describe('Current status of the task'),
    activeForm: z.string().min(1).describe('Present continuous form for display (e.g., "Creating CustomerAPI")')
});

const todoWriteInputSchema = z.object({
    todos: z.array(todoItemSchema).describe('The complete todo list (all tasks)')
});

export function createTodoWriteTool(execute: TodoWriteExecuteFn) {
    return (tool as any)({
        description: `Track task progress with a structured todo list (in-memory, not persisted).
            Each call REPLACES the entire list - always include ALL tasks (completed + pending).
            Only ONE task should be in_progress at a time. Mark tasks completed immediately after finishing.
            Use for multi-step tasks (3+ steps). Each task needs content (imperative) and activeForm (present continuous).`,
        inputSchema: todoWriteInputSchema,
        execute
    });
}
