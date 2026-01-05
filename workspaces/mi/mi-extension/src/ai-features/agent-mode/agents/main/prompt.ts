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

import * as Handlebars from 'handlebars';

// ============================================================================
// User Prompt Template
// ============================================================================

export const PROMPT_TEMPLATE = `
{{#if fileList}}
<PROJECT_STRUCTURE>
{{#each fileList}}
{{this}}
{{/each}}
</PROJECT_STRUCTURE>
{{/if}}

{{#if currentlyOpenedFile}}
<CURRENTLY_OPENED_FILE>
{{currentlyOpenedFile}}
</CURRENTLY_OPENED_FILE>
This is the file that the user is currently opened in IDE. User may refer it as "this". Give priority to this file when generating the solution.
{{/if}}

{{#if userPreconfigured}}
<USER_PRECONFIGURED>
{{payloads}}
</USER_PRECONFIGURED>
These are preconfigured values that should be accessed using Synapse expressions in the integration flow. Always use Synapse expressions when referring to these values.
{{/if}}

<SYSTEM_REMAINDER>
{{system_remainder}}
</SYSTEM_REMAINDER>

<USER_QUERY>
{{question}}
</USER_QUERY>
`;

// ============================================================================
// Types
// ============================================================================

/**
 * Parameters for rendering the user prompt
 */
export interface UserPromptParams {
    /** User's query or requirement */
    query: string;
    /** Path to the MI project */
    projectPath: string;
    /** List of existing files in the project */
    existingFiles: string[];
    /** Currently editing file content (optional) */
    file?: string;
    /** Pre-configured payloads, query params, or path params (optional) */
    payloads?: string;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Render a Handlebars template with context
 */
function renderTemplate(templateContent: string, context: Record<string, any>): string {
    const template = Handlebars.compile(templateContent);
    return template(context);
}

/**
 * Formats the project structure as a file list
 */
function formatProjectStructure(projectPath: string, files: string[]): string {
    if (files.length === 0) {
        return `Empty project - no existing files\nProject Path: ${projectPath}`;
    }

    const fileList = files.map(f => `  ${f}`).join('\n');
    return `Project: ${projectPath}\n\nExisting Files:\n${fileList}`;
}

// ============================================================================
// User Prompt Generation
// ============================================================================

/**
 * Generates the user prompt content using Handlebars template
 * Only includes:
 * 1. Project structure (file list)
 * 2. Currently editing file (if available)
 * 3. User query
 *
 * The agent can read any file content on-demand using file_read tool.
 */
export function getUserPrompt(params: UserPromptParams): string {
    // Prepare context array with project structure
    const fileList = [formatProjectStructure(params.projectPath, params.existingFiles)];

    // Prepare template context
    const context: Record<string, any> = {
        question: params.query,
        fileList: fileList,
        currentlyOpenedFile: params.file, // Currently editing file (optional)
        userPreconfigured: params.payloads, // Pre-configured payloads (optional)
        system_remainder: 'You are operating in AGENT_MODE.'
    };

    // Render the template
    return renderTemplate(PROMPT_TEMPLATE, context);
}
