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

<AVAILABLE_CONNECTORS>
{{available_connectors}}
</AVAILABLE_CONNECTORS>

<AVAILABLE_INBOUND_ENDPOINTS>
{{available_inbound_endpoints}}
</AVAILABLE_INBOUND_ENDPOINTS>

<SYSTEM_REMAINDER>
{{system_remainder}}
</SYSTEM_REMAINDER>

**DO NOT CREATE ANY README FILES or ANY DOCUMENTATION FILES after end of the task.**
<USER_QUERY>
{{question}}
</USER_QUERY>
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
    return formatFileTree(files);
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
            const content = fs.readFileSync(currentFile, 'utf-8');

            // Make the path relative to project root
            const relativePath = path.relative(projectPath, currentFile);

            // Return with file path annotation
            return `File: ${relativePath}\n---\n${content}\n---`;
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
