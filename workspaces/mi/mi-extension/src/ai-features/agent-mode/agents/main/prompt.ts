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
import * as fs from 'fs';
import * as path from 'path';
import { formatFileTree, getExistingFiles } from '../../../utils/file-utils';
import { getAvailableConnectors, getAvailableInboundEndpoints } from '../../tools/connector_tools';

// ============================================================================
// User Prompt Template
// ============================================================================

export const PROMPT_TEMPLATE = `
{{#if fileList}}
<project_structure>
{{#each fileList}}
{{this}}
{{/each}}
</project_structure>
{{/if}}

{{#if currentlyOpenedFile}}
<ide_opened_file>
The user has opened the file {{currentlyOpenedFile}} in the IDE. This may or may not be related to the current task. User may refer it as "this".
</ide_opened_file>
{{/if}}

{{#if userPreconfigured}}
<user_preconfigured>
{{payloads}}
</user_preconfigured>
These are preconfigured values in the Low-Code IDE that should be accessed using Synapse expressions in the integration flow. Always use Synapse expressions when referring to these values.
{{/if}}

<available_connectors>
{{available_connectors}}
These are the available WSO2 connectors from WSO2 connector store.
</available_connectors>

<available_inbound_endpoints>
{{available_inbound_endpoints}}
These are the available WSO2 inbound endpoints from WSO2 inbound endpoint store.
</available_inbound_endpoints>

<system_reminder>
{{system_remainder}}
</system_reminder>

**DO NOT CREATE ANY README FILES or ANY DOCUMENTATION FILES after end of the task.**
<user_query>
{{question}}
</user_query>
**DO NOT CREATE ANY README FILES or ANY DOCUMENTATION FILES after end of the task.**
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
 * Formats the project structure as a tree (relative paths only)
 */
function formatProjectStructure(files: string[]): string {
    if (files.length === 0) {
        return `Empty project - no existing files`;
    }

    // Use the tree formatter to display files in a hierarchical structure
    return formatFileTree(
        files,
        ['.devtools/**', '.mvn/**', '.git/**', '.vscode/**', '.idea/**', '.env', '.env.local', '.env.development.local', '.env.test.local', '.env.production.local', '**.jsonl'],
        ['src', 'deployment', 'pom.xml', '.mi-copilot']
    );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the currently opened file content from the state machine
 * @param projectPath - Absolute path to the project root
 * @returns File content if available, null otherwise
 */
async function getCurrentlyOpenedFile(projectPath: string): Promise<string | null> {
    try {
        const { getStateMachine } = await import('../../../../stateMachine');

        const currentFile = getStateMachine(projectPath).context().documentUri;
        if (currentFile && fs.existsSync(currentFile)) {
            // Make the path relative to project root
            const relativePath = path.relative(projectPath, currentFile);

            // Return only the file path
            return `The user opened the file ${relativePath} in the IDE. This may or may not be related to the current task.`;
        }
    } catch (error) {
        // Silently fail if state machine is not available
    }
    return null;
}

// ============================================================================
// User Prompt Generation
// ============================================================================

/**
 * Generates the user prompt content using Handlebars template
 * Automatically fetches:
 * 1. Project structure (all files in tree format)
 * 2. Currently opened file (if available)
 * 3. User query
 *
 * The agent can read any file content on-demand using file_read tool.
 */
export async function getUserPrompt(params: UserPromptParams): Promise<string> {
    // Get all files in the project (relative paths from project root)
    const existingFiles = getExistingFiles(params.projectPath);
    const fileList = [formatProjectStructure(existingFiles)];

    // Get currently opened file content
    const currentlyOpenedFile = await getCurrentlyOpenedFile(params.projectPath);

    // Get available connectors and inbound endpoints
    const availableConnectors = getAvailableConnectors();
    const availableInboundEndpoints = getAvailableInboundEndpoints();

    // Prepare template context
    const context: Record<string, any> = {
        question: params.query,
        fileList: fileList,
        currentlyOpenedFile: currentlyOpenedFile, // Currently editing file (optional)
        userPreconfigured: params.payloads, // Pre-configured payloads (optional)
        available_connectors: availableConnectors.join(', '), // Available connectors list
        available_inbound_endpoints: availableInboundEndpoints.join(', '), // Available inbound endpoints list
        system_remainder: 'You are operating in AGENT_MODE.'
    };

    // Render the template
    return renderTemplate(PROMPT_TEMPLATE, context);
}
