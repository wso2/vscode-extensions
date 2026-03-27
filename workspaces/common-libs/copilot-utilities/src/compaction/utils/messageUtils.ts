/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ProjectStateContext } from '../types';

/**
 * Creates a valid user-assistant message pair that carries the compaction summary
 * as the new start of the conversation history (L04 fix).
 *
 * The pair is structured so that:
 * - The user message signals context restoration (prevents bare assistant message)
 * - The assistant message contains the full summary + optional project state
 *
 * @param summary - The extracted summary text from the LLM
 * @param projectState - Optional project state to append (C09 fix)
 * @returns A two-element array: [userMessage, assistantMessage]
 */
export function createContinuationMessages(
    summary: string,
    projectState?: ProjectStateContext
): any[] {
    // Build project state context section
    let projectStateSection = '';
    if (projectState) {
        projectStateSection = '\n\n## Current Project State\n\n';

        if (projectState.tempProjectPath) {
            projectStateSection += `**Working Directory:** \`${projectState.tempProjectPath}\`\n\n`;
        }

        if (projectState.modifiedFiles && projectState.modifiedFiles.length > 0) {
            projectStateSection += `**Modified Files:**\n${projectState.modifiedFiles.map(f => `- \`${f}\``).join('\n')}\n\n`;
        }

        if (projectState.pendingReviewFiles && projectState.pendingReviewFiles.length > 0) {
            projectStateSection += `**Pending Review:**\n${projectState.pendingReviewFiles.map(f => `- \`${f}\``).join('\n')}\n\n`;
        }
    }

    return [
        {
            role: 'user',
            content: '[Context restored from previous conversation - conversation history has been compacted to manage token limits. Continue from the summary below.]',
        },
        {
            role: 'assistant',
            content: `This session is being continued from a previous conversation. Below is a summary of what was discussed and accomplished:

---

${summary}

---
${projectStateSection}
I'm ready to continue our work. What would you like to do next?`,
        },
    ];
}
