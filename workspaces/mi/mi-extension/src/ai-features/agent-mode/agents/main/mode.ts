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

import { AgentMode } from '@wso2/mi-core';
import {
    EXIT_PLAN_MODE_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    ENTER_PLAN_MODE_TOOL_NAME,
    ASK_USER_TOOL_NAME,
} from '../../tools/types';


const ASK_MODE_POLICY = `
- ASK mode is STRICTLY READ-ONLY. Only read-only tools are allowed; mutation tools are blocked at runtime.
- Provide fully updated code in code blocks (not just edits). The system provides "Add to project" which replaces entire files.
- For complex changes, suggest the user switch to EDIT mode.`;

const EDIT_MODE_POLICY = `
- Use ${TODO_WRITE_TOOL_NAME} to track progress when you have multiple sub-tasks.
- For complex tasks, enter PLAN mode with ${ENTER_PLAN_MODE_TOOL_NAME} to plan before implementing.
`;

export interface ModeReminderParams {
    mode?: AgentMode;
}

export const PLAN_MODE_SHARED_GUIDELINES = `
PLAN mode is for planning, not implementation. Mutation tools are blocked at runtime except writing/editing the assigned plan file.

# Plan Mode Workflow

## Phase 1: Understand
- Read the plan file first — it may contain a previous or unfinished plan.
- Investigate the codebase using read-only tools and Explore subagents. Launch up to 3 Explore agents in parallel when multiple areas need investigation; use 1 for focused tasks.
- Actively search for existing functions, utilities, and patterns that can be reused — avoid proposing new code when suitable implementations exist.
- Use ${ASK_USER_TOOL_NAME} to clarify unclear requirements. Don't make large assumptions about user intent.

## Phase 2: Write the Plan
Write/edit the plan file with these sections (adapt structure as needed):
- **Context**: Why the change is needed — the problem, what prompted it, intended outcome.
- **Recommended approach**: Only the chosen approach (not alternatives). Concise enough to scan, detailed enough to execute.
- **Critical files**: Paths of files to be modified.
- **Reusable code**: Existing functions/utilities found during exploration, with file paths.
- **Implementation steps**: Ordered steps to execute the plan.
- **Verification**: How to test the changes end-to-end.

## Phase 3: Present and Get Approval
- Present a brief summary in chat — the system attaches the full plan as a collapsible block.
- Call \`${EXIT_PLAN_MODE_TOOL_NAME}\` to request approval — blocks until user approves or rejects.
- If rejected, revise the plan and request approval again.

## Critical Rules
- Your turn MUST end with either ${ASK_USER_TOOL_NAME} or ${EXIT_PLAN_MODE_TOOL_NAME}. Do not stop for any other reason.
- Use ${ASK_USER_TOOL_NAME} ONLY for genuine clarification — NEVER to ask "should I proceed?", "is this plan okay?", or similar. Use ${EXIT_PLAN_MODE_TOOL_NAME} for plan approval.
`;

/**
 * Returns mode-specific policy text injected via <system-reminder>.
 */
export async function getModeReminder(params: ModeReminderParams): Promise<string> {
    const mode = params.mode || 'edit';

    if (mode === 'ask') {
        return ASK_MODE_POLICY;
    }

    if (mode === 'plan') {
        return PLAN_MODE_SHARED_GUIDELINES;
    }

    return EDIT_MODE_POLICY;
}
