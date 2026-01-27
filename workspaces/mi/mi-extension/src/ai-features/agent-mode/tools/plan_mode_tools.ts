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
import { logInfo, logDebug, logError } from '../../copilot/logger';
import { AgentEvent } from '@wso2/mi-core';

// ============================================================================
// Plan File Utilities (Simple - no PlanManager class needed)
// ============================================================================

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
            // Ensure .gitignore exists
            await ensureGitignore(projectPath);
            
            // Get or create plan info (checks if file exists, generates slug if not)
            const planInfo = await getOrCreatePlanInfo(projectPath, sessionId);

            // Send event to UI
            eventHandler({
                type: 'plan_mode_entered',
            } as any);

            // Build the response with <system-reminder> containing plan file info
            const baseMessage = `Entered plan mode. You should now focus on exploring the codebase and designing an implementation approach.

            In plan mode, you should:
            1. Thoroughly explore the codebase to understand existing patterns using glob, grep, and file_read or explore subagent using task tool if the codebase is large.
            2. You can also use plan subagent using task tool to scaffold a plan then improve it if the codebase is large.
            3. Identify similar features and architectural approaches
            4. Consider multiple approaches and their trade-offs
            5. Use ask_user_question tool if you need to clarify the approach
            6. Design a concrete implementation strategy
            6. Present your plan in simple summary format in chat window to the user with no code details because we are in a low code environment.
            7. Only then use exit_plan_mode tool to present your plan for approval

            Remember: DO NOT write or edit any files yet. This is a read-only exploration and planning phase.`;

            // Inject <system-reminder> with plan file path (like Claude Code does)
            const systemReminder = `
            <system-reminder>
            Plan mode is active. You MUST NOT make any edits except to the plan file mentioned below.

            ## Plan File Info:
            ${planInfo.exists
                ? `A plan file already exists at ${planInfo.relativePath}. You can read it and make incremental edits using the file_edit tool. If that is an old plan write a new plan to the file.`
                : `Your plan file is: ${planInfo.relativePath}. Create this file using file_write to write your plan.`
            }

            You should build your plan incrementally by writing to or editing this file.
            This is the ONLY file you are allowed to edit during plan mode.

            IMPORTANT: Always present your plan in simple summary format in chat window to the user with no code details because we are in a low code environment before using ${EXIT_PLAN_MODE_TOOL_NAME} tool.
            Then when your plan is ready for user approval, call ${EXIT_PLAN_MODE_TOOL_NAME} tool.
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
            Use this tool proactively when you're about to start a non-trivial integration task. Getting user sign-off on your approach before writing code prevents wasted effort and ensures alignment. This tool transitions you into plan mode where you can explore the codebase and design an implementation approach for user approval.

            ## When to Use This Tool

            **Prefer using enter_plan_mode** for implementation tasks unless they're simple. Use it when ANY of these conditions apply:

            1. **New Integration Implementation**: Adding meaningful new functionality
               - Example: "Add a REST API to sync customer data" - which endpoint? What transformations?
               - Example: "Create an order processing flow" - what mediators? What error handling?

            2. **Multiple Valid Approaches**: The task can be solved in several different ways
               - Example: "Add data transformation" - Data Mapper vs XSLT vs scripting
               - Example: "Integrate with payment gateway" - sync vs async, which operations

            3. **Integration Modifications**: Changes that affect existing APIs, sequences, or endpoints
               - Example: "Update the customer sync flow" - what exactly should change?
               - Example: "Refactor this sequence" - what's the target structure?

            4. **Architectural Decisions**: The task requires choosing between patterns or connectors
               - Example: "Add real-time sync" - polling vs webhooks vs messaging
               - Example: "Connect to database" - which connector? Pooling strategy?

            5. **Multi-Artifact Changes**: The task will create/modify multiple Synapse files
               - Example: "Build order processing" - API + sequences + endpoints + connectors
               - Example: "Add authentication" - affects multiple APIs and sequences

            6. **Unclear Requirements**: You need to explore before understanding the full scope
               - Example: "Fix the payment API error" - need to investigate root cause
               - Example: "Optimize the integration" - need to identify bottlenecks

            7. **User Preferences Matter**: The implementation could reasonably go multiple ways
               - If you would use ask_user_question to clarify approach, use enter_plan_mode instead
               - Plan mode lets you explore first, then present options with context

            ## When NOT to Use This Tool

            Only skip enter_plan_mode for simple tasks:
            - Single-line or few-line fixes (typos, obvious bugs, small tweaks)
            - Adding a single log mediator or property
            - Tasks where the user gave very specific, detailed instructions
            - Pure research/exploration tasks (use task tool with Explore subagent instead)

            ## What Happens in Plan Mode

            In plan mode, you'll:
            1. Explore the codebase using glob, grep, and file_read or explore subagent using task tool.
            2. Use plan subagent using task tool to scaffold a plan then improve it if the codebase is large.
            3. Understand existing patterns and Synapse configurations
            4. Design an implementation approach
            5. Create a plan file at .mi-copilot/<session-id>/plan/<slug>.md using ${FILE_WRITE_TOOL_NAME} tool
            6. Use ask_user_question if you need to clarify approaches
            7. Present your plan in simple summary format to the user with no code details because we are in a low code environment.
            7. Only then exit plan mode with ${EXIT_PLAN_MODE_TOOL_NAME} tool to present your plan for approval

            ## Examples

            ### GOOD - Use enter_plan_mode:
            User: "Add user authentication to the app"
            - Requires architectural decisions (session vs JWT, where to store tokens, middleware structure)

            User: "Optimize the database queries"
            - Multiple approaches possible, need to profile first, significant impact

            User: "Implement dark mode"
            - Architectural decision on theme system, affects many components

            User: "Add a delete button to the user profile"
            - Seems simple but involves: where to place it, confirmation dialog, API call, error handling, state updates

            User: "Update the error handling in the API"
            - Affects multiple files, user should approve the approach

            ### BAD - Don't use enter_plan_mode:
            User: "Fix the typo in the README"
            - Straightforward, no planning needed

            User: "Add a console.log to debug this function"
            - Simple, obvious implementation

            User: "What files handle routing?"
            - Research task, not implementation planning

            ## Important Notes

            - This tool REQUIRES user approval - they must consent to entering plan mode
            - If unsure whether to use it, err on the side of planning - it's better to get alignment upfront than to redo work
            - Users appreciate being consulted before significant changes are made to their codebase
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

        // Try to find the plan file path
        let planFilePath: string | undefined;
        try {
            const planInfo = await getOrCreatePlanInfo(projectPath, sessionId);
            if (planInfo.exists) {
                planFilePath = planInfo.planPath;
            }
        } catch {
            // Ignore errors, planFilePath will be undefined
        }

        // Send plan_approval_requested event to UI
        eventHandler({
            type: 'plan_approval_requested',
            approvalId,
            planFilePath,
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
            Use this tool when you are in plan mode and have finished writing your plan to the plan file and are ready for user approval.

            ## How This Tool Works
            - You should have already written your plan to the plan file specified in the plan mode system message
            - This tool does NOT take the plan content as a parameter - it will read the plan from the file you wrote
            - This tool simply signals that you're done planning and ready for the user to review and approve
            - The user will see the contents of your plan file when they review it

            ## When to Use This Tool
            IMPORTANT: Only use this tool when the task requires planning the implementation steps of a task that requires writing code. For research tasks where you're gathering information, searching files, reading files or in general trying to understand the codebase - do NOT use this tool.

            ## Before Using This Tool
            Ensure your plan is complete and unambiguous:
            - If you have unresolved questions about requirements or approach, use ask_user_question first (in earlier phases)
            - Once your plan is finalized, use THIS tool to request approval

            **Important:** Do NOT use ask_user_question to ask "Is this plan okay?" or "Should I proceed?" - that's exactly what THIS tool does. exit_plan_mode inherently requests user approval of your plan.

            ## Examples

            1. Initial task: "Search for and understand the implementation of vim mode in the codebase" - Do not use the exit plan mode tool because you are not planning the implementation steps of a task.
            2. Initial task: "Help me implement yank mode for vim" - Use the exit plan mode tool after you have finished planning the implementation steps of the task.
            3. Initial task: "Add a new feature to handle user authentication" - If unsure about auth method (OAuth, JWT, etc.), use ask_user_question first, then use exit plan mode tool after clarifying the approach.
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
