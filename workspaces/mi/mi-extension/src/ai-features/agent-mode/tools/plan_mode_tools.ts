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
import { AgentEvent, PlanApprovalKind, PlanApprovalRequestedEvent } from '@wso2/mi-core';
import { getCopilotSessionDir } from '../storage-paths';

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
const ASK_USER_TIMEOUT_MS = 5 * 60 * 1000;
const USER_CANCELLED_RESPONSE = '__USER_CANCELLED__';

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
    return path.join(getCopilotSessionDir(projectPath, sessionId), 'plan');
}

function toPlanDisplayPath(planPath: string): string {
    return planPath.replace(/\\/g, '/');
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
            const relativePath = toPlanDisplayPath(planPath);
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
    const relativePath = toPlanDisplayPath(planPath);
    logInfo(`[PlanMode] Generated new plan slug: ${slug}`);
    return { exists: false, slug, planPath, relativePath };
}

/**
 * Ensure plan storage directory exists
 */
async function ensurePlanStorageDir(projectPath: string, sessionId: string): Promise<void> {
    const sessionDir = getCopilotSessionDir(projectPath, sessionId);
    await fs.mkdir(sessionDir, { recursive: true });
    logDebug(`[PlanMode] Ensured plan session storage: ${toPlanDisplayPath(sessionDir)}`);
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
        'Write operations are disabled except for file_write/file_edit on the assigned plan file.',
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
    await ensurePlanStorageDir(projectPath, sessionId);
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

export function isPlanModeSessionActive(sessionId: string): boolean {
    return planModeSessionStates.has(sessionId);
}

// ============================================================================
// Types for Event Handler
// ============================================================================

export interface PendingQuestion {
    questionId: string;
    sessionId: string;
    question: string;
    createdAt: number;
    expiresAt: number;
    timeoutHandle?: ReturnType<typeof setTimeout>;
    resolve: (answer: string) => void;
    reject: (error: Error) => void;
}

export interface PendingPlanApproval {
    approvalId: string;
    approvalKind: PlanApprovalKind;
    resolve: (result: { approved: boolean; feedback?: string }) => void;
    reject: (error: Error) => void;
}

export type AgentEventHandler = (event: AgentEvent) => void;

async function requestPlanApproval(
    eventHandler: AgentEventHandler,
    pendingApprovals: Map<string, PendingPlanApproval>,
    request: {
        approvalKind: PlanApprovalKind;
        content: string;
        planFilePath?: string;
        approvalTitle: string;
        approveLabel: string;
        rejectLabel: string;
        allowFeedback: boolean;
    }
): Promise<{ approved: boolean; feedback?: string }> {
    const approvalId = uuidv4();

    const approvalEvent: PlanApprovalRequestedEvent = {
        type: 'plan_approval_requested',
        approvalId,
        planFilePath: request.planFilePath,
        content: request.content,
        approvalKind: request.approvalKind,
        approvalTitle: request.approvalTitle,
        approveLabel: request.approveLabel,
        rejectLabel: request.rejectLabel,
        allowFeedback: request.allowFeedback,
    };
    eventHandler(approvalEvent);

    return new Promise((resolve, reject) => {
        pendingApprovals.set(approvalId, {
            approvalId,
            approvalKind: request.approvalKind,
            resolve: (result) => {
                pendingApprovals.delete(approvalId);
                resolve(result);
            },
            reject: (error: Error) => {
                pendingApprovals.delete(approvalId);
                reject(error);
            }
        });
    });
}

export function cleanupPendingQuestionsForSession(
    pendingQuestions: Map<string, PendingQuestion>,
    sessionId: string
): void {
    if (!sessionId) {
        return;
    }

    const pendingEntries = Array.from(pendingQuestions.entries())
        .filter(([, pending]) => pending.sessionId === sessionId);

    for (const [questionId, pending] of pendingEntries) {

        if (pending.timeoutHandle) {
            clearTimeout(pending.timeoutHandle);
            pending.timeoutHandle = undefined;
        }

        pendingQuestions.delete(questionId);
        pending.resolve(USER_CANCELLED_RESPONSE);
    }
}

// ============================================================================
// Ask User Tool
// ============================================================================

/**
 * Creates the execute function for ask_user tool
 * @param eventHandler - Function to send events to the UI
 * @param pendingQuestions - Map to track pending questions awaiting user response
 * @param sessionId - Active session ID used for timeout cleanup scoping
 */
export function createAskUserExecute(
    eventHandler: AgentEventHandler,
    pendingQuestions: Map<string, PendingQuestion>,
    sessionId: string
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
                return {
                    success: false,
                    message: `Question ${i + 1} is invalid. Each question must have: question text and at least 2 options with labels and descriptions.`,
                    error: 'INVALID_QUESTION_FORMAT'
                };
            }
        }

        logInfo(`[AskUserTool] Asking user ${questions.length} question(s)`);
        const questionMetadata = questions.map((q, idx) =>
            `q${idx + 1}(options=${q.options.length}, multiSelect=${q.multiSelect ? 'yes' : 'no'})`
        );
        logDebug(`[AskUserTool] Question metadata: ${questionMetadata.join(', ')}`);

        // Send ask_user event to UI with structured questions
        const event: AgentEvent = {
            type: 'ask_user',
            questionId,
            questions,
        };
        eventHandler(event);

        // Wait for user response (Promise resolves when respondToQuestion is called).
        // Auto-timeout to avoid stale entries when sessions are abandoned.
        return new Promise((resolve, reject) => {
            const createdAt = Date.now();
            const expiresAt = createdAt + ASK_USER_TIMEOUT_MS;

            pendingQuestions.set(questionId, {
                questionId,
                sessionId,
                question: `${questions.length} question(s)`,
                createdAt,
                expiresAt,
                resolve: (answersJson: string) => {
                    const pending = pendingQuestions.get(questionId);
                    if (pending?.timeoutHandle) {
                        clearTimeout(pending.timeoutHandle);
                    }
                    pendingQuestions.delete(questionId);

                    // Check if user cancelled (special string indicating cancellation)
                    if (answersJson === USER_CANCELLED_RESPONSE) {
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

                        logInfo(`[AskUserTool] Received user responses for ${Object.keys(answers).length} question(s)`);
                        resolve({
                            success: true,
                            message: `User has answered your questions: ${formattedAnswers}. You can now continue with the user's answers in mind.`
                        });
                    } catch (error) {
                        // Fallback for simple string response
                        logInfo('[AskUserTool] Received user response payload');
                        resolve({
                            success: true,
                            message: `User responded: ${answersJson}`
                        });
                    }
                },
                reject: (error: Error) => {
                    const pending = pendingQuestions.get(questionId);
                    if (pending?.timeoutHandle) {
                        clearTimeout(pending.timeoutHandle);
                    }
                    pendingQuestions.delete(questionId);
                    reject(error);
                }
            });

            const timeoutHandle = setTimeout(() => {
                const pending = pendingQuestions.get(questionId);
                if (!pending) {
                    return;
                }
                logInfo(`[AskUserTool] Question timed out after ${ASK_USER_TIMEOUT_MS / 1000} seconds: ${questionId}`);
                pending.resolve(USER_CANCELLED_RESPONSE);
            }, ASK_USER_TIMEOUT_MS);

            const pending = pendingQuestions.get(questionId);
            if (pending) {
                pending.timeoutHandle = timeoutHandle;
            }
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
    eventHandler: AgentEventHandler,
    pendingApprovals: Map<string, PendingPlanApproval>
): EnterPlanModeExecuteFn {
    return async (): Promise<ToolResult> => {
        logInfo(`[EnterPlanMode] Requesting user consent to enter plan mode`);

        try {
            const approval = await requestPlanApproval(eventHandler, pendingApprovals, {
                approvalKind: 'enter_plan_mode',
                approvalTitle: 'Enter Plan Mode?',
                approveLabel: 'Enter Plan Mode',
                rejectLabel: 'Stay in Edit Mode',
                allowFeedback: false,
                content: 'Agent recommends entering Plan mode before implementation. Do you want to switch to Plan mode?',
            });

            if (!approval.approved) {
                logInfo('[EnterPlanMode] User declined plan mode entry');
                return {
                    success: false,
                    message: 'User declined entering plan mode. Continue in Edit mode and proceed without switching.',
                    error: 'PLAN_MODE_ENTRY_DECLINED'
                };
            }

            logInfo(`[EnterPlanMode] Entering plan mode`);

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
        description: `Request entering plan mode for non-trivial implementation tasks. BLOCKS until user approves or declines.
            Prefer this before new features, multi-file changes, architectural decisions, or unclear requirements.
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
        const { summary, force_exit_without_plan, reason } = args;
        const forceExitWithoutPlan = force_exit_without_plan === true;

        logInfo(`[ExitPlanMode] Request received (force_exit_without_plan=${forceExitWithoutPlan})`);

        if (forceExitWithoutPlan) {
            try {
                const approval = await requestPlanApproval(eventHandler, pendingApprovals, {
                    approvalKind: 'exit_plan_mode_without_plan',
                    approvalTitle: 'Exit Plan Mode?',
                    approveLabel: 'Exit Plan Mode',
                    rejectLabel: 'Stay in Plan Mode',
                    allowFeedback: false,
                    content: reason
                        ? `Agent wants to exit plan mode without requiring a full plan. Reason: ${reason}`
                        : 'Agent wants to exit plan mode without requiring a full plan. Do you want to continue?',
                });

                if (approval.approved) {
                    logInfo('[ExitPlanMode] User approved exiting plan mode without plan');
                    clearPlanModeSession(sessionId);
                    eventHandler({
                        type: 'plan_mode_exited',
                        content: 'Exited plan mode without plan',
                    } as any);
                    return {
                        success: true,
                        message: 'User approved exiting plan mode without a plan. Continue in Edit mode.'
                    };
                }

                logInfo('[ExitPlanMode] User declined exiting plan mode without plan');
                const planReminder = await getPlanModeReminder(projectPath, sessionId);
                return {
                    success: false,
                    message: [
                        'User declined exiting plan mode without a plan. Plan mode remains active.',
                        '',
                        '<system-reminder>',
                        'Continue planning and either prepare a plan for approval or ask the user for further clarification.',
                        planReminder,
                        '</system-reminder>',
                    ].join('\n'),
                    error: 'EXIT_WITHOUT_PLAN_DECLINED'
                };
            } catch (error: any) {
                logError('[ExitPlanMode] Failed while requesting exit-without-plan approval', error);
                return {
                    success: false,
                    message: `Failed to request approval to exit plan mode: ${error.message}`,
                    error: error.message
                };
            }
        }

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

        try {
            const approval = await requestPlanApproval(eventHandler, pendingApprovals, {
                approvalKind: 'exit_plan_mode',
                approvalTitle: 'Plan Approval',
                approveLabel: 'Approve Plan',
                rejectLabel: 'Request Changes',
                allowFeedback: true,
                planFilePath: planInfo.planPath,
                content: planContent || summary || 'Plan ready for approval',
            });

            if (approval.approved) {
                logInfo(`[ExitPlanMode] Plan approved`);
                clearPlanModeSession(sessionId);

                // Send plan_mode_exited event
                eventHandler({
                    type: 'plan_mode_exited',
                    content: 'Plan approved',
                } as any);

                return {
                    success: true,
                    message: [
                        `Plan approved by user. Continue implementation immediately in this same run.`,
                        '',
                        '<system-reminder>',
                        'Plan mode has ended. You are now in EDIT mode.',
                        `Start executing the approved implementation now. First create/update a todo list using ${TODO_WRITE_TOOL_NAME}, then apply the planned project changes.`,
                        '</system-reminder>',
                    ].join('\n'),
                };
            }

            logInfo(`[ExitPlanMode] Plan not approved. Feedback: ${approval.feedback || 'none'}`);
            const latestMtime = (await getFileMtimeMs(planInfo.planPath)) ?? planMtimeMs ?? Date.now();
            updatePlanModeBaseline(sessionId, planInfo.planPath, planInfo.relativePath, latestMtime);
            const planReminder = await getPlanModeReminder(projectPath, sessionId);
            return {
                success: false,
                message: [
                    approval.feedback
                        ? `Plan not approved. User feedback: ${approval.feedback}. Please revise the plan and try again.`
                        : 'Plan not approved by user. Please revise the plan based on user requirements and try again.',
                    '',
                    '<system-reminder>',
                    'Plan mode remains active. Update the plan file and request approval again.',
                    planReminder,
                    '</system-reminder>',
                ].join('\n')
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Failed to request plan approval: ${error.message}`,
                error: error.message
            };
        }
    };
}

const exitPlanModeInputSchema = z.object({
    summary: z.string().optional().describe(
        'Optional short summary shown while requesting approval. The actual plan is read from the plan file.'
    ),
    plan: z.string().optional().describe(
        'Deprecated alias for summary. The actual plan is always read from the plan file.'
    ),
    force_exit_without_plan: z.boolean().optional().describe(
        'Set true to request exiting plan mode without requiring a plan file update. Use only when planning is unnecessary.'
    ),
    reason: z.string().optional().describe(
        'Short reason for why exiting plan mode without a plan is acceptable.'
    ),
});

export function createExitPlanModeTool(execute: ExitPlanModeExecuteFn) {
    return (tool as any)({
        description: `Signal that your implementation plan is ready for user approval. BLOCKS until user approves or rejects.
            Write/update your plan in the assigned plan file BEFORE calling this tool.
            If planning is not required, set force_exit_without_plan=true (with optional reason) to request user consent to exit plan mode without a plan.
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
