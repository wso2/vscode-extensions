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
        const { question, options, allow_free_text = true } = args;
        const questionId = uuidv4();

        logInfo(`[AskUserTool] Asking user: ${question}`);
        logDebug(`[AskUserTool] Options: ${options?.join(', ') || 'none'}, Free text: ${allow_free_text}`);

        // Send ask_user event to UI
        eventHandler({
            type: 'ask_user',
            questionId,
            question,
            options,
            allowFreeText: allow_free_text,
        } as any);

        // Wait for user response (Promise resolves when respondToQuestion is called)
        return new Promise((resolve, reject) => {
            const timeoutMs = 5 * 60 * 1000; // 5 minutes timeout

            pendingQuestions.set(questionId, {
                questionId,
                question,
                resolve: (answer: string) => {
                    pendingQuestions.delete(questionId);
                    logInfo(`[AskUserTool] Received user response: ${answer.substring(0, 100)}...`);
                    resolve({
                        success: true,
                        message: `User responded: ${answer}`
                    });
                },
                reject: (error: Error) => {
                    pendingQuestions.delete(questionId);
                    reject(error);
                }
            });

            // Timeout after 5 minutes
            setTimeout(() => {
                if (pendingQuestions.has(questionId)) {
                    pendingQuestions.delete(questionId);
                    logInfo(`[AskUserTool] Question timed out: ${questionId}`);
                    resolve({
                        success: false,
                        message: 'User did not respond within the timeout period (5 minutes)',
                        error: 'TIMEOUT'
                    });
                }
            }, timeoutMs);
        });
    };
}

const askUserInputSchema = z.object({
    question: z.string().describe('The question to ask the user'),
    options: z.array(z.string()).min(2).max(4).optional().describe(
        'Optional predefined answer choices (2-4 options). User can always provide custom input.'
    ),
    allow_free_text: z.boolean().optional().default(true).describe(
        'Whether to allow free-form text input in addition to options. Defaults to true.'
    )
});

export function createAskUserTool(execute: AskUserExecuteFn) {
    return (tool as any)({
        description: `
            Ask the user a question and wait for their response.

            ## When to Use

            Use this tool when you need to:
            - Clarify ambiguous requirements
            - Get user preference on implementation choices
            - Confirm assumptions before proceeding
            - Ask about technology choices (REST vs SOAP, JSON vs XML)
            - Get naming conventions or security configurations

            ## Guidelines

            - Provide 2-4 predefined options when possible for common choices
            - Always allow free text unless choices are strictly limited
            - Keep questions clear and concise
            - Don't use this for yes/no confirmations during execution - proceed with best judgment

            ## Example

            Question: "Which format should the API response use?"
            Options: ["JSON", "XML", "Both JSON and XML"]

            ## Important

            - This tool BLOCKS execution until user responds or times out (5 minutes)
            - The user's response will be returned as the tool result
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

            // Send event to UI
            eventHandler({
                type: 'plan_mode_entered',
            } as any);

            return {
                success: true,
                message: `Entered plan mode. Create a plan file using file_write at .mi-copilot/plans/<plan-name>.md, then call exit_plan_mode when ready for user approval.`
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
        return new Promise((resolve, reject) => {
            const timeoutMs = 5 * 60 * 1000; // 5 minutes timeout

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

            // Timeout after 5 minutes
            setTimeout(() => {
                if (pendingApprovals.has(approvalId)) {
                    pendingApprovals.delete(approvalId);
                    logInfo(`[ExitPlanMode] Approval timed out: ${approvalId}`);
                    resolve({
                        success: false,
                        message: 'User did not respond to plan approval within the timeout period (5 minutes). Please try again.',
                        error: 'TIMEOUT'
                    });
                }
            }, timeoutMs);
        });
    };
}

const exitPlanModeInputSchema = z.object({
    summary: z.string().optional().describe(
        'Optional summary of the plan or what will be implemented'
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

            - This tool BLOCKS until user approves or rejects (5 min timeout)
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
