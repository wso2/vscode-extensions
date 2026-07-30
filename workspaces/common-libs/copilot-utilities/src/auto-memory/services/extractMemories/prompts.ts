// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { TYPES_SECTION, WHAT_NOT_TO_SAVE_SECTION, MEMORY_FRONTMATTER_EXAMPLE } from '../../memdir/memoryTypes';
import { ENTRYPOINT_NAME, MAX_ENTRYPOINT_LINES } from '../../memdir/memdir';

export interface ExtractPromptParams {
    globalMemoryDir: string;
    workspaceMemoryDir: string;
    newMessageCount: number;
    /** Pre-formatted manifest from formatMemoryManifest() */
    existingMemoriesManifest: string;
}

/**
 * Builds the extraction prompt appended to conversation history as the final
 * user message. Instructs the agent to analyse recent messages, route writes
 * to the correct directory by type, and avoid duplicates.
 */
export function buildExtractPrompt(params: ExtractPromptParams): string {
    const { globalMemoryDir, workspaceMemoryDir, newMessageCount, existingMemoriesManifest } = params;

    const opener = [
        `You are now acting as the memory extraction subagent. ` +
        `Analyse the most recent ~${newMessageCount} messages above and use them to update your persistent memory systems.`,
        '',
        'Available tools:',
        `- \`global_file_read\`, \`global_file_write\`, \`global_file_edit\` — operate in: \`${globalMemoryDir}\``,
        `- \`workspace_file_read\`, \`workspace_file_write\`, \`workspace_file_edit\` — operate in: \`${workspaceMemoryDir}\``,
        '',
        'ROUTING RULE — you must write each memory to the correct directory based on its type:',
        '  user, history  →  use global_file_write / global_file_edit',
        '  codingstyle, integration, about, reference  →  use workspace_file_write / workspace_file_edit',
        '',
        `You have a limited step budget. The efficient strategy is:`,
        `  Step 1 — read all files you might update in parallel (global_file_read and workspace_file_read)`,
        `  Step 2 — write all updates in parallel (global_file_write/edit and workspace_file_write/edit)`,
        `Do not interleave reads and writes across multiple steps.`,
        '',
        `You MUST only use content from the last ~${newMessageCount} messages to update memories. ` +
        `Do not investigate further or read project source files.`,
        '',
        existingMemoriesManifest,
        '',
        'Check both lists before writing — update an existing file rather than creating a duplicate.',
    ].join('\n');

    const howToSave: string[] = [
        '## How to save memories',
        '',
        'Saving a memory is a two-step process:',
        '',
        `**Step 1** — write the memory to its own file ` +
        `(e.g., \`user_expertise.md\`, \`integration_shopify.md\`, \`codingstyle_error_handling.md\`) ` +
        `using this frontmatter format:`,
        '',
        ...MEMORY_FRONTMATTER_EXAMPLE,
        '',
        `**Step 2** — add a pointer to that file in the correct \`${ENTRYPOINT_NAME}\` ` +
        `(global or workspace depending on type). ` +
        `Each entry should be one line under ~150 characters: \`- [Title](file.md) — one-line hook\`.`,
        '',
        `- \`${ENTRYPOINT_NAME}\` is always loaded into the system prompt — ` +
        `lines after ${MAX_ENTRYPOINT_LINES} will be truncated, so keep the index concise`,
        '- Keep the name, description, and type fields up-to-date with the content',
        '- Organize memory semantically by topic, not chronologically',
        '- Update or remove memories that turn out to be wrong or outdated',
        '- Do not write duplicate memories',
    ];

    return [
        opener,
        '',
        'If the user explicitly asks you to remember something, save it immediately as whichever type fits best. ' +
        'If they ask you to forget something, find and remove the relevant entry.',
        '',
        ...TYPES_SECTION,
        ...WHAT_NOT_TO_SAVE_SECTION,
        '',
        ...howToSave,
    ].join('\n');
}
