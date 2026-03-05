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
    FILE_READ_TOOL_NAME,
    FILE_GREP_TOOL_NAME,
    FILE_GLOB_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
    SKILL_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    ENTER_PLAN_MODE_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    ASK_USER_TOOL_NAME,
    WEB_SEARCH_TOOL_NAME,
    WEB_FETCH_TOOL_NAME,
} from '../../tools/types';


const ASK_MODE_POLICY = `
User selected ASK mode.

###ASK MODE_POLICY:
- ASK mode is STRICTLY READ-ONLY.
- Use ONLY read-only tools:
  - ${FILE_READ_TOOL_NAME}
  - ${FILE_GREP_TOOL_NAME}
  - ${FILE_GLOB_TOOL_NAME}
  - ${CONNECTOR_TOOL_NAME}
  - ${SKILL_TOOL_NAME}
  - ${VALIDATE_CODE_TOOL_NAME}
  - ${WEB_SEARCH_TOOL_NAME}
  - ${WEB_FETCH_TOOL_NAME}
- Do NOT attempt mutation/tooling actions (write/edit/build/run/shell/connector changes/subagents/plan-mode/todo updates).
- If you need to provide codes/synapse configurations provide the fully updated code in a code block. Not just the edits. System provides an option called "Add to project" in ASK mode which replaces entire files with the code you provide.
- ASK mode "Add to project" creates Undo cards only when the applied code actually changes project files (no-op applies do not create undo checkpoints).
- If user asks for complex changes, explain they are in ASK mode and ask them to switch to EDIT mode.`;

const EDIT_MODE_POLICY = `
User selected EDIT mode.

### EDIT MODE_POLICY:
- EDIT mode allows full tool usage.
- You may read, modify files, manage connectors, run validations, use runtime tools, and execute implementation tasks.
- Applied project-file changes in EDIT mode create undo checkpoints and corresponding Undo cards in chat.

## Edit Mode Workflow
- If you have a simple task carry out the task using the tools provided.
- When you have multiple sub tasks in mind always use the ${TODO_WRITE_TOOL_NAME} tool to track the tasks.
- If the task is too complex to handle just with ${TODO_WRITE_TOOL_NAME} tool, enter the PLAN mode with the ${ENTER_PLAN_MODE_TOOL_NAME} tool.
`;

export interface ModeReminderParams {
    mode?: AgentMode;
}

export const PLAN_MODE_SHARED_GUIDELINES = `
- PLAN mode is for implementation planning, not implementation.
- Allowed actions: read-only investigation, subagent-based exploration, todo tracking, asking clarification questions, and read-only shell exploration.
- Do NOT mutate project artifacts (no connector changes, no build/run, no mutating shell commands, no implementation file edits).
- Write operations are disabled in PLAN mode, except creating/editing the assigned plan file via file_write/file_edit.
- If requirements are unclear, use ${ASK_USER_TOOL_NAME} to clarify before finalizing the plan.
- Do NOT use ${ASK_USER_TOOL_NAME} to ask "should I proceed?" or "is this plan okay?".
- Produce a decision-complete implementation plan, then use ${EXIT_PLAN_MODE_TOOL_NAME} for approval.

# Plan Mode Workflow

1. **Read the plan file first**: It may contain a previous or unfinished plan.
2. **Write structured plan or Edit previous plan**: A reference plan file structure is provided below. You are free to modify the structure as you see fit.
   \`\`\`markdown
   # <Plan Title>

   ## Overview
   <Brief description of what will be implemented>

   ## Context section
   <Why the change is being made: the problem/need, what prompted it, and the intended outcome.>

   ## Recommended approach
   <Only the chosen approach (not all alternatives considered). Should be concise enough to scan quickly but detailed enough to execute effectively.>

   ## Critical files 
   <Paths of files to be modified.>

   ## Reusable code
   <References to existing functions/utilities found during exploration, with their file paths.>

   ## Implementation Steps
   1. Step one
   2. Step two
   3. ...

   ## Verification
   <How to test the changes end-to-end (run code, tests, etc.).>
   \`\`\`
3. **Then present extremely brief summary of the plan to the user in the chat** - System will attach full plan as a collapsable markdown block in the chat window for the user to review if needed.
4. **Request approval**: Call \`${EXIT_PLAN_MODE_TOOL_NAME}\` - this BLOCKS until user approves or rejects.
5. **If rejected**: Stay in PLAN mode, revise the plan file, and request approval again.
`;

const PLAN_MODE_POLICY = `
User selected PLAN mode.

###PLAN MODE_POLICY:
${PLAN_MODE_SHARED_GUIDELINES}
`;

/**
 * Returns mode-specific policy text injected via <system_reminder>.
 */
export async function getModeReminder(params: ModeReminderParams): Promise<string> {
    const mode = params.mode || 'edit';

    if (mode === 'ask') {
        return ASK_MODE_POLICY;
    }

    if (mode === 'plan') {
        return PLAN_MODE_POLICY;
    }

    return EDIT_MODE_POLICY;
}
