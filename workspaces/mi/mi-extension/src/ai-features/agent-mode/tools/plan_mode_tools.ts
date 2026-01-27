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
import { v4 as uuidv4 } from 'uuid';
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
} from './types';
import { PlanManager } from '../plan-manager';
import { logInfo, logDebug, logError } from '../../copilot/logger';
import { AgentEvent } from '@wso2/mi-core';

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
            if (!q.question || !q.header || !q.options || q.options.length < 2) {
                logError(`[AskUserTool] Invalid question at index ${i}: missing required fields or insufficient options`);
                logError(`[AskUserTool] Question data: ${JSON.stringify(q)}`);
                return {
                    success: false,
                    message: `Question ${i + 1} is invalid. Each question must have: question text, header, and at least 2 options with labels and descriptions.`,
                    error: 'INVALID_QUESTION_FORMAT'
                };
            }
        }

        logInfo(`[AskUserTool] Asking user ${questions.length} question(s)`);
        // Log full question structure for debugging
        questions.forEach((q, idx) => {
            logDebug(`[AskUserTool] Question ${idx + 1}:`);
            logDebug(`  - Question: ${q.question}`);
            logDebug(`  - Header: ${q.header}`);
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
    header: z.string().max(12).describe('Very short label displayed as a chip/tag (max 12 chars). Examples: "Auth method", "Library", "Approach"'),
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
        description: `
            Ask the user questions and wait for their responses. This allows you to:
            1. Gather user preferences or requirements
            2. Clarify ambiguous instructions
            3. Get decisions on implementation choices as you work
            4. Offer choices to the user about what direction to take

            ## When to Use

            Use this tool when you need to:
            - Clarify ambiguous requirements
            - Get user preference on implementation choices
            - Confirm assumptions before proceeding
            - Ask about technology choices (REST vs SOAP, JSON vs XML)
            - Get naming conventions or security configurations

            ## Guidelines

            - You can ask 1-4 questions at once
            - Each question should have 2-4 options with labels and descriptions
            - Use multiSelect: true when choices are not mutually exclusive
            - If you recommend a specific option, make it the first option and add "(Recommended)" to the label
            - Users will always be able to select "Other" to provide custom text input

            ## Example

            questions: [{
                question: "Which format should the API response use?",
                header: "API Format",
                options: [
                    { label: "JSON (Recommended)", description: "Modern standard, best for web APIs" },
                    { label: "XML", description: "Traditional format, better for SOAP services" }
                ],
                multiSelect: false
            }]

            ## Important

            - This tool BLOCKS execution until user responds
            - The user's responses will be returned formatted as: "question"="answer"
            - If the user cancels/refuses to answer, you'll receive an error message and should proceed without the information
            - In plan mode, use this to clarify requirements BEFORE finalizing your plan
        `,
        inputSchema: askUserInputSchema,
        execute
    });
}

// ============================================================================
// Enter Plan Mode Tool
// ============================================================================

/**
 * Creates the execute function for enter_plan_mode tool
 * @param planManager - The plan manager instance
 * @param eventHandler - Function to send events to the UI
 */
export function createEnterPlanModeExecute(
    planManager: PlanManager,
    eventHandler: AgentEventHandler
): EnterPlanModeExecuteFn {
    return async (): Promise<ToolResult> => {
        logInfo(`[EnterPlanMode] Entering plan mode`);

        try {
            await planManager.enterPlanMode();

            // Get or create the plan file path
            const planPath = await planManager.getOrCreatePlanPath();
            const planSlug = planManager.getPlanSlug();
            const sessionId = planManager.getSessionId();
            const relativePath = `.mi-copilot/${sessionId}/plans/${planSlug}.md`;

            // Check if plan file already exists
            let planExists = false;
            try {
                const fs = await import('fs/promises');
                await fs.access(planPath);
                planExists = true;
            } catch {
                planExists = false;
            }

            // Send event to UI
            eventHandler({
                type: 'plan_mode_entered',
            } as any);

            // Build the response with <system-reminder> containing plan file info
            const baseMessage = `Entered plan mode. You should now focus on exploring the codebase and designing an implementation approach.

            In plan mode, you should:
            1. Thoroughly explore the codebase to understand existing patterns
            2. Identify similar features and architectural approaches
            3. Consider multiple approaches and their trade-offs
            4. Use ask_user if you need to clarify the approach
            5. Design a concrete implementation strategy
            6. When ready, use exit_plan_mode to present your plan for approval

            Remember: DO NOT write or edit any files yet. This is a read-only exploration and planning phase.`;

            // Inject <system-reminder> with plan file path (like Claude Code does)
            const systemReminder = `
            <system-reminder>
            Plan mode is active. You MUST NOT make any edits except to the plan file mentioned below.

            ## Plan File Info:
            ${planExists
                ? `A plan file already exists at ${relativePath}. You can read it and make incremental edits using the file_edit tool. If that is an old plan write a new plan to the file.`
                : `Your plan file is: ${relativePath}. Create this file using file_write to write your plan.`
            }

            You should build your plan incrementally by writing to or editing this file.
            This is the ONLY file you are allowed to edit during plan mode.

            When your plan is ready for user approval, call exit_plan_mode.
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
        description: `
            Enter plan mode to design an implementation before executing.

            ## When to Use

            Enter plan mode when:
            1. Task requires 3+ distinct file operations
            2. Multiple artifacts need to be created (APIs + sequences + endpoints)
            3. Connectors need to be added and configured
            4. The user's request is complex and would benefit from review
            5. You're unsure about the implementation approach

            ## What Happens After Entering Plan Mode

            1. **Explore**: Use file_read, grep, glob to understand the codebase
            2. **Create plan file**: Use file_write to create .mi-copilot/plans/<descriptive-name>.md
            3. **Write plan content**: Include Overview, Files to Create/Modify, Steps, Verification
            4. **Exit for approval**: Call exit_plan_mode to request user approval
            5. **Execute**: After approval, use todo_write to track progress

            ## Plan File Format

            Write a markdown file at .mi-copilot/plans/<plan-name>.md with:
            - Overview section
            - Files to Create/Modify list
            - Implementation Steps
            - Verification section

            ## Important

            - Use file_write to create the visible plan file (user can open/edit it)
            - Use ask_user if you need clarification during planning
            - Exit plan mode with exit_plan_mode when plan is ready for approval
        `,
        inputSchema: enterPlanModeInputSchema,
        execute
    });
}

// ============================================================================
// Exit Plan Mode Tool
// ============================================================================

/**
 * Creates the execute function for exit_plan_mode tool
 * @param planManager - The plan manager instance
 * @param eventHandler - Function to send events to the UI
 * @param pendingApprovals - Map to track pending approvals awaiting user response
 */
export function createExitPlanModeExecute(
    planManager: PlanManager,
    eventHandler: AgentEventHandler,
    pendingApprovals: Map<string, PendingPlanApproval>
): ExitPlanModeExecuteFn {
    return async (args): Promise<ToolResult> => {
        const { summary } = args;
        const approvalId = uuidv4();

        logInfo(`[ExitPlanMode] Requesting plan approval: ${approvalId}`);

        // Get the plan file path (agent should have set it when creating the plan)
        const planFilePath = planManager.getCurrentPlanPath();

        // Send plan_approval_requested event to UI
        eventHandler({
            type: 'plan_approval_requested',
            approvalId,
            planFilePath: planFilePath || undefined,
            content: summary || 'Plan ready for approval',
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
                        try {
                            await planManager.exitPlanMode(summary);

                            // Send plan_mode_exited event
                            eventHandler({
                                type: 'plan_mode_exited',
                                content: 'Plan approved',
                            } as any);

                            resolve({
                                success: true,
                                message: 'Plan approved by user. Proceeding with implementation.'
                            });
                        } catch (error: any) {
                            resolve({
                                success: false,
                                message: `Failed to exit plan mode: ${error.message}`,
                                error: error.message
                            });
                        }
                    } else {
                        logInfo(`[ExitPlanMode] Plan not approved. Feedback: ${result.feedback || 'none'}`);
                        resolve({
                            success: false,
                            message: result.feedback
                                ? `Plan not approved. User feedback: ${result.feedback}. Please revise the plan and try again.`
                                : 'Plan not approved by user. Please revise the plan based on user requirements and try again.'
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
    plan: z.string().optional().describe(
        'The plan to be implemented which is written to the plan file'
    )
});

export function createExitPlanModeTool(execute: ExitPlanModeExecuteFn) {
    return (tool as any)({
        description: `
            Exit plan mode and request user approval for the plan.

            ## When to Use

            - After creating a plan file with file_write
            - When you're ready for the user to review and approve the plan
            - Before starting implementation

            ## What Happens

            1. UI shows the plan content with Approve/Reject buttons
            2. Agent WAITS for user approval (blocks execution)
            3. If approved: Plan mode exits, proceed with implementation
            4. If rejected: Agent receives user feedback to revise the plan

            ## Important

            - This tool BLOCKS until user approves or rejects
            - Make sure you've created a plan file before calling this
            - User can see the plan file and provide feedback
        `,
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

        let summary = `Updated ${todos.length} task(s): `;
        const parts: string[] = [];
        if (completed > 0) parts.push(`${completed} completed`);
        if (inProgress > 0) parts.push(`${inProgress} in progress`);
        if (pending > 0) parts.push(`${pending} pending`);
        summary += parts.join(', ');

        return {
            success: true,
            message: summary
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
        description: `
            Create and manage a structured task list for the current session.
            This is an IN-MEMORY tool - todos are tracked through chat context.

            ## When to Use

            Use this tool to:
            - Plan multi-step implementations (3+ steps)
            - Track progress through complex tasks
            - Show the user what will be done
            - Update task status as you work

            ## Important

            - This is a STATEFUL tool - each call replaces the entire todo list
            - Always include ALL tasks (completed and pending) in each call
            - Only ONE task should be in_progress at a time
            - Mark tasks completed IMMEDIATELY after finishing

            ## Task Descriptions

            Each task needs two forms:
            - content: Imperative form (e.g., "Create CustomerAPI", "Run tests")
            - activeForm: Present continuous form (e.g., "Creating CustomerAPI", "Running tests")

            ## Example

            todos: [
                { content: "Create CustomerAPI", status: "completed", activeForm: "Creating CustomerAPI" },
                { content: "Add Salesforce connector", status: "in_progress", activeForm: "Adding Salesforce connector" },
                { content: "Create data mapper", status: "pending", activeForm: "Creating data mapper" }
            ]
        `,
        inputSchema: todoWriteInputSchema,
        execute
    });
}
