// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { tool } from 'ai';
import { z } from 'zod';
import { CopilotEventHandler } from '../event';
import { Task, TaskStatus, TaskTypes, Plan, AIChatMachineEventType, SourceFiles } from '@wso2/ballerina-core';
import { AIChatStateMachine } from '../../../../views/ai-panel/aiChatMachine';
import { integrateCodeToWorkspace } from '../design/utils';

export const TASK_WRITE_TOOL_NAME = "TaskWrite";

export interface TaskWriteResult {
    success: boolean;
    message: string;
    tasks: Task[];
}

export const TaskInputSchema = z.object({
    description: z.string().min(1).describe("Clear, actionable description of the task to be implemented"),
    status: z.enum([TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]).describe("Current status of the task. Use 'pending' for tasks not started, 'in_progress' when actively working on it, 'completed' when work is finished."),
    type: z.enum(["service_design", "connections_init", "implementation"]).describe("Type of the implementation task. service_design will only generate the http service contract. not the implementation. connections_init will only generate the connection initializations. All of the other tasks will be of type implementation.")
});

const TaskWriteInputSchema = z.object({
    tasks: z.array(TaskInputSchema).min(1).describe("ALL TASKS - EVERY SINGLE ONE. This tool is stateless. Always send the COMPLETE list of tasks with their current statuses.")
});

export type TaskWriteInput = z.infer<typeof TaskWriteInputSchema>;

export function createTaskWriteTool(eventHandler?: CopilotEventHandler, updatedSourceFiles?: SourceFiles[], updatedFileNames?: string[]) {
    return tool({
        description: `Create and update implementation tasks for the design plan.
## Task Ordering:
- Tasks should be ordered sequentially as they need to be executed.
- Prioritize service design, then connection initializations, then implementation tasks.

## CRITICAL RULE - ALWAYS SEND ALL TASKS:
This tool is STATELESS. Every call MUST include ALL tasks.

**Why This Matters:**
The tool replaces the entire task list on each call. If you omit tasks, they will be permanently lost from the plan.

**Rules:**
- Have 5 tasks? Send all 5 EVERY time
- Updating 1 task? Send ALL tasks with the update
- NEVER omit completed tasks when moving to next task
- Think: You're replacing the entire list, not editing one item
- Tasks are identified by their description - keep descriptions consistent

**Validation:**
- Tool will ERROR if you're missing tasks from the previous plan
- Error message will list exactly which task descriptions are missing

**Example - Correct Behavior:**
If you have 5 tasks and updating task 3:
- WRONG: Send only task 3
- WRONG: Send only tasks 3, 4, 5 (missing completed tasks 1-2)
- CORRECT: Send all 5 tasks (tasks 1-2 as completed, task 3 as in_progress, tasks 4-5 as pending)

## USER APPROVAL REQUIRED:
1. **Plan Approval**: User approves/rejects initial task list
2. **Task Completion Approval**: User approves/rejects each completed task before moving to the next

## CREATING TASKS (First Call):
Send ALL tasks with status "pending".
Example:
[
  {"description": "Create the HTTP service contract", "status": "pending", "type": "service_design"},
  {"description": "Create the MYSQL Connection", "status": "pending", "type": "connections_init"},
  {"description": "Implement the resource functions", "status": "pending", "type": "implementation"}
]

## UPDATING TASKS (Every Other Call):
Send ALL tasks with updated statuses. Tasks are identified by their description.

Workflow per task (after plan approval):
1. Mark in_progress → Send ALL tasks
2. Do the work immediately
3. Mark completed → Send ALL tasks
4. Tool will request user approval (or auto-approve if enabled)
5. If approved → Tool returns tasks with 'completed' status, start next task (repeat from step 1)
6. If rejected → Tool returns task with 'completed' status and rejection comment, redo the task based on feedback

Example (3 tasks total):
Start task 1 - Send ALL:
[
  {"description": "Create the HTTP service contract", "status": "in_progress", "type": "service_design"},
  {"description": "Create the MYSQL Connection", "status": "pending", "type": "connections_init"},
  {"description": "Implement the resource functions", "status": "pending", "type": "implementation"}
]

Complete task 1 - Send ALL:
[
  {"description": "Create the HTTP service contract", "status": "completed", "type": "service_design"},
  {"description": "Create the MYSQL Connection", "status": "pending", "type": "connections_init"},
  {"description": "Implement the resource functions", "status": "pending", "type": "implementation"}
]

After approval, start task 2 - Send ALL:
[
  {"description": "Create the HTTP service contract", "status": "completed", "type": "service_design"},
  {"description": "Create the MYSQL Connection", "status": "in_progress", "type": "connections_init"},
  {"description": "Implement the resource functions", "status": "pending", "type": "implementation"}
]

Rules:
- Send ALL tasks every single call (tool will reject partial lists)
- Only ONE task "in_progress" at a time
- After plan approval, start first task immediately
- Wait for approval after each task completion before starting next
- Continue autonomously through all tasks with approval checkpoints`,
        inputSchema: TaskWriteInputSchema,
        execute: async (input: TaskWriteInput): Promise<TaskWriteResult> => {
            try {
                const currentContext = AIChatStateMachine.context();
                const existingPlan = currentContext.currentPlan;
                const allTasks = mapInputToTasks(input);

                console.log(`[TaskWrite Tool] Received ${allTasks.length} task(s)`);

                const taskCategories = categorizeTasks(allTasks);

                const isNewPlan = !existingPlan || existingPlan.tasks.length === 0;
                const isPlanRemodification = existingPlan && (
                    allTasks.length !== existingPlan.tasks.length ||
                    allTasks.some(task => !existingPlan.tasks.find(t => t.description === task.description))
                );

                if (!isNewPlan && !isPlanRemodification) {
                    const missingTasksError = validateAllTasksIncluded(input, existingPlan);
                    if (missingTasksError) return missingTasksError;
                }

                let approvalResult: { approved: boolean; comment?: string; approvedTaskDescription?: string } | undefined;
                let approvalType: "plan" | "completion" | undefined;

                if (eventHandler) {
                    const needsPlanApproval = (isNewPlan || isPlanRemodification) && taskCategories.inProgress.length === 0;
                    if (needsPlanApproval) {
                        approvalType = "plan";
                        approvalResult = await handlePlanApproval(allTasks, isPlanRemodification, eventHandler);
                    } else if (taskCategories.completed.length > 0 && taskCategories.inProgress.length === 0) {
                        const newlyCompletedTasks = detectNewlyCompletedTasks(taskCategories.completed, existingPlan);

                        if (newlyCompletedTasks.length > 0) {
                            approvalType = "completion";
                            approvalResult = await handleTaskCompletion(
                                allTasks,
                                newlyCompletedTasks,
                                currentContext,
                                eventHandler,
                                updatedSourceFiles,
                                updatedFileNames
                            );
                        }
                    } else if (taskCategories.inProgress.length > 0) {
                        AIChatStateMachine.sendEvent({
                            type: AIChatMachineEventType.START_TASK_EXECUTION,
                        });
                        console.log(`[TaskWrite Tool] Task in progress: ${taskCategories.inProgress[0].description}`);
                    }
                }

                const message = generateResultMessage(
                    approvalResult,
                    approvalType,
                    approvalResult?.approvedTaskDescription,
                    allTasks,
                    taskCategories
                );

                console.log(`[TaskWrite Tool] Returning ${allTasks.length} tasks (${taskCategories.completed.length} completed, ${taskCategories.inProgress.length} in progress, ${taskCategories.pending.length} pending)`);

                return {
                    success: approvalResult ? approvalResult.approved : true,
                    message,
                    tasks: allTasks
                };
            } catch (error) {
                console.error("Error in TaskWrite tool:", error);
                return {
                    success: false,
                    message: `Failed to process tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    tasks: []
                };
            }
        }
    });
}

function mapInputToTasks(input: TaskWriteInput): Task[] {
    return input.tasks.map(task => ({
        description: task.description,
        status: task.status as TaskStatus,
        type: task.type as TaskTypes
    }));
}

function validateAllTasksIncluded(input: TaskWriteInput, existingPlan: Plan | undefined): TaskWriteResult | null {
    if (!existingPlan || existingPlan.tasks.length === 0) {
        return null;
    }

    const existingDescriptions = new Set(existingPlan.tasks.map(t => t.description));
    const receivedDescriptions = new Set(input.tasks.map(t => t.description));
    const missingDescriptions = [...existingDescriptions].filter(desc => !receivedDescriptions.has(desc));

    if (missingDescriptions.length > 0) {
        console.error(`[TaskWrite Tool] Missing ${missingDescriptions.length} task(s)`);
        return {
            success: false,
            message: `ERROR: Missing ${missingDescriptions.length} task(s). Missing: ${missingDescriptions.map(d => `"${d}"`).join(', ')}`,
            tasks: existingPlan.tasks
        };
    }
    return null;
}

function categorizeTasks(allTasks: Task[]) {
    return {
        completed: allTasks.filter(t => t.status === TaskStatus.COMPLETED),
        inProgress: allTasks.filter(t => t.status === TaskStatus.IN_PROGRESS),
        pending: allTasks.filter(t => t.status === TaskStatus.PENDING)
    };
}

function detectNewlyCompletedTasks(completedTasks: Task[], existingPlan: Plan | undefined): Task[] {
    if (!existingPlan) {
        return completedTasks;
    }
    
    return completedTasks.filter(task => {
        const existingTask = existingPlan.tasks.find(t => t.description === task.description);
        return existingTask && existingTask.status !== TaskStatus.COMPLETED;
    });
}

function createPlan(allTasks: Task[]): Plan {
    return {
        id: `plan-${Date.now()}`,
        tasks: allTasks,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}

async function handlePlanApproval(
    allTasks: Task[],
    isPlanRemodification: boolean,
    eventHandler: CopilotEventHandler
): Promise<{ approved: boolean; comment?: string }> {
    console.log(`[TaskWrite Tool] ${isPlanRemodification ? 'Plan remodified' : 'Plan created'}`);

    const plan = createPlan(allTasks);

    AIChatStateMachine.sendEvent({
        type: AIChatMachineEventType.PLAN_GENERATED,
        payload: { plan }
    });

    eventHandler({
        type: "task_approval_request",
        approvalType: "plan",
        tasks: allTasks,
        message: "Please review the implementation plan"
    });

    return new Promise((resolve) => {
        const subscription = AIChatStateMachine.service().subscribe((state) => {
            if (state.value === 'ApprovedPlan') {
                console.log("[TaskWrite Tool] Plan approved");
                subscription.unsubscribe();
                resolve({ approved: true });
            } else if (state.value === 'GeneratingPlan') {
                const comment = state.context.currentApproval?.comment;
                console.log("[TaskWrite Tool] Plan rejected");
                subscription.unsubscribe();
                resolve({ approved: false, comment });
            }
        });
    });
}

async function handleTaskCompletion(
    allTasks: Task[],
    newlyCompletedTasks: Task[],
    currentContext: any,
    eventHandler: CopilotEventHandler,
    updatedSourceFiles?: SourceFiles[],
    updatedFileNames?: string[]
): Promise<{ approved: boolean; comment?: string; approvedTaskDescription: string }> {
    const lastCompletedTask = newlyCompletedTasks[newlyCompletedTasks.length - 1];
    console.log(`[TaskWrite Tool] Detected ${newlyCompletedTasks.length} newly completed task(s)`);

    if (updatedSourceFiles && updatedFileNames) {
        await integrateCodeToWorkspace(updatedSourceFiles, updatedFileNames);
    }

    AIChatStateMachine.sendEvent({
        type: AIChatMachineEventType.TASK_COMPLETED,
    });

    const isAutoApproveEnabled = currentContext.autoApproveEnabled === true;

    if (isAutoApproveEnabled) {
        console.log(`[TaskWrite Tool] Auto-approval enabled`);
        AIChatStateMachine.sendEvent({
            type: AIChatMachineEventType.APPROVE_TASK,
        });
        return { approved: true, approvedTaskDescription: lastCompletedTask.description };
    }

    return handleManualTaskApproval(allTasks, newlyCompletedTasks, lastCompletedTask, eventHandler);
}

async function handleManualTaskApproval(
    allTasks: Task[],
    newlyCompletedTasks: Task[],
    lastCompletedTask: Task,
    eventHandler: CopilotEventHandler
): Promise<{ approved: boolean; comment?: string; approvedTaskDescription: string }> {
    console.log(`[TaskWrite Tool] Manual approval mode`);

    const tasksForUI = allTasks.map(task => {
        const isNewlyCompleted = newlyCompletedTasks.some(t => t.description === task.description);
        return isNewlyCompleted ? { ...task, status: TaskStatus.REVIEW } : { ...task };
    });

    eventHandler({
        type: "task_approval_request",
        approvalType: "completion",
        tasks: tasksForUI,
        taskDescription: lastCompletedTask.description,
        message: `Please verify the completed work for: ${lastCompletedTask.description}`,
    });

    return new Promise((resolve) => {
        const subscription = AIChatStateMachine.service().subscribe((state) => {
            if (state.value === "ApprovedTask") {
                console.log(`[TaskWrite Tool] Task approved`);
                subscription.unsubscribe();
                resolve({ approved: true, approvedTaskDescription: lastCompletedTask.description });
            } else if (state.value === "RejectedTask") {
                const comment = state.context.currentApproval?.comment;
                console.log("[TaskWrite Tool] Task rejected");
                subscription.unsubscribe();
                resolve({ approved: false, comment, approvedTaskDescription: lastCompletedTask.description });
            }
        });
    });
}

function generateResultMessage(
    approvalResult: { approved: boolean; comment?: string } | undefined,
    approvalType: "plan" | "completion" | undefined,
    approvedTaskDescription: string | undefined,
    allTasks: Task[],
    taskCategories: ReturnType<typeof categorizeTasks>
): string {
    if (approvalResult) {
        if (approvalResult.approved) {
            if (approvalType === "plan") {
                return `Plan approved! Ready to start execution. ${allTasks.length} tasks created.`;
            }
            return `Work approved! Task completed successfully. ${approvedTaskDescription ? `Task: ${approvedTaskDescription}` : ''}`;
        } else {
            const feedback = approvalResult.comment ? ` User comment: "${approvalResult.comment}"` : '';
            return approvalType === "plan"
                ? `Plan not approved. Please revise the plan based on feedback.${feedback}`
                : `Work not approved. Please redo the task based on feedback.${feedback}`;
        }
    }

    if (taskCategories.inProgress.length > 0) {
        return `Started working on: ${taskCategories.inProgress[0].description}`;
    }
    if (taskCategories.completed.length === allTasks.length) {
        return `All tasks completed!`;
    }
    if (taskCategories.completed.length > 0) {
        return `Completed: ${taskCategories.completed[taskCategories.completed.length - 1].description}`;
    }
    return `Successfully created ${allTasks.length} implementation tasks. Tasks are now ready for execution.`;
}
