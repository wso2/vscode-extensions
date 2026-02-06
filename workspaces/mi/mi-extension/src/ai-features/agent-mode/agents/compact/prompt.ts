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

/**
 * System-reminder prompt for conversation compaction.
 *
 * This gets appended as a user message with <system-reminder> tags
 * to the exact conversation history sent to Haiku.
 *
 * Two variants:
 * - USER_TRIGGERED: User explicitly ran /compact command
 * - AUTO_TRIGGERED: Context window is running out mid-agent-run
 */

const PROMPT = `
Produce a comprehensive summary of the conversation so far so that a new session of this agent can continue the work seamlessly from the summary alone. The summary will replace the entire conversation history.

Your summary should follow the structure below: 

---
This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

# Analysis:
A short chronological narrative of what the user and agent did. Be specific: include file paths, function names, line numbers, and error messages where available.

# Summary:

## 1. Primary Request and Intent ( Ignore this section if it is not relevant to the conversation )
What the user wanted to achieve. If multiple distinct requests, list each separately.

## 2. Key Technical Concepts ( Ignore this section if it is not relevant to the conversation )
Bullet list of key technologies, patterns, and concepts discussed. Use **bold** for concept names.

## 3. Files and Code Sections ( Ignore this section if it is not relevant to the conversation ) 
For each file read, modified, or created:
- File path in inline code
- Whether read-only, modified, or created
- Key code changes in fenced code blocks
- Brief explanation of what changed and why

## 4. Errors and Fixes ( Ignore this section if it is not relevant to the conversation )
For each error: the message, root cause, and fix. If none, state "No errors encountered."

## 5. Problem Solving ( Ignore this section if it is not relevant to the conversation ) 
Problems solved, approach used, key design decisions and tradeoffs.

## 6. All User Messages ( Ignore this section if it is not relevant to the conversation )
Every user message, verbatim, in chronological order using quoted format.

## 7. Pending Tasks ( Ignore this section if it is not relevant to the conversation )
Incomplete work or known issues. If all done, state "None - all tasks completed."

## 8. Current Work ( Ignore this section if it is not relevant to the conversation )
What was last being worked on? State of builds/tests? Uncommitted changes?

## 9. Optional Next Step ( Ignore this section if it is not relevant to the conversation )
1-3 specific logical next steps.

---

**CRITICAL RULES:**
- The summary must be self-contained: a new agent session must be able to resume work from the summary alone.
- Be comprehensive but concise. Prioritize information density.
- Include specific technical details: file paths, line numbers, function names, error messages, tool names.
- Preserve key code snippets in fenced code blocks.
- Do NOT fabricate information. Only include what actually happened.
- Keep the total summary under 12,000 tokens.
</system-reminder>`;

export const COMPACT_SYSTEM_REMINDER_USER_TRIGGERED = `
<system-reminder>
The user has triggered a /compact command to summarize this conversation.
${PROMPT}
<system-reminder>
`;

export const COMPACT_SYSTEM_REMINDER_AUTO_TRIGGERED = `
<system-reminder>
The conversation context window is running out. You must summarize the conversation immediately so that work can continue in a fresh context.
${PROMPT}
<system-reminder>
`;
