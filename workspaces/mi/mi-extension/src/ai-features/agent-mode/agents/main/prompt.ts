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

import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { formatFileTree, getExistingFiles } from '../../../utils/file-utils';
import { getAvailableConnectorCatalog } from '../../tools/connector_tools';
import { getPlanModeReminder as getPlanModeSessionReminder } from '../../tools/plan_mode_tools';
import { getRuntimeVersionFromPom } from '../../tools/connector_store_cache';
import { getServerPathFromConfig } from '../../../../util/onboardingUtils';
import { AgentMode } from '@wso2/mi-core';
import { getModeReminder } from './mode';
import { buildSystemReminder } from './prompt_system_reminder';
import { DEFERRED_TOOL_CATALOG } from './tools';
import { logDebug } from '../../../copilot/logger';

const MAX_PROJECT_STRUCTURE_FILES = 50;
const MAX_PROJECT_STRUCTURE_CHARS = 10000;

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

<env>
Working directory: {{env_working_directory}}
Is directory a git repo: {{env_is_git_repo}}
{{#if env_git_branch}}Current git branch: {{env_git_branch}}{{/if}}
Platform: {{env_platform}}
OS Version: {{env_os_version}}
Today's date: {{env_today}}
MI Runtime version: {{env_mi_runtime_version}}
MI Runtime home path: {{env_mi_runtime_home_path}}
MI Runtime carbon log path: {{env_mi_runtime_carbon_log_path}}
</env>

{{#if runtime_version_detection_warning}}
<system_reminder>
{{runtime_version_detection_warning}}
</system_reminder>
{{/if}}

<system_reminder>
{{system_reminder}}
**DO NOT CREATE ANY README FILES or ANY DOCUMENTATION FILES after end of the task unless explicitly requested by the user.**
</system_reminder>

<user_query>
{{question}}
</user_query>
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
    /** Agent mode: ask (read-only), edit (full tool access), or plan (planning read-only) */
    mode?: AgentMode;
    /** Path to the MI project */
    projectPath: string;
    /** Session ID for plan file path generation */
    sessionId?: string;
    /** Pre-configured payloads, query params, or path params (optional) */
    payloads?: string;
    /** MI runtime version from pom.xml (optional; avoids re-reading pom when already known) */
    runtimeVersion?: string | null;
    /** True when runtime version was detected from project metadata */
    runtimeVersionDetected?: boolean;
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
        [
            '.devtools/**',
            '.mvn/**',
            '.git/**',
            '.vscode/**',
            '.idea/**',
            '.mi-copilot/**',
            '.env',
            '.env.local',
            '.env.development.local',
            '.env.test.local',
            '.env.production.local',
            '**.jsonl'
        ]
    );
}

function capProjectStructureLength(projectStructure: string): string {
    if (projectStructure.length <= MAX_PROJECT_STRUCTURE_CHARS) {
        return projectStructure;
    }

    const truncated = projectStructure.slice(0, MAX_PROJECT_STRUCTURE_CHARS).trimEnd();
    return `${truncated}\n... (project structure truncated due to size limit).`;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the currently opened file path from the state machine
 * @param projectPath - Absolute path to the project root
 * @returns Project-relative file path if available, null otherwise
 */
async function getCurrentlyOpenedFile(projectPath: string): Promise<string | null> {
    try {
        const { getStateMachine } = await import('../../../../stateMachine');

        const currentFile = getStateMachine(projectPath).context().documentUri;
        if (currentFile && fs.existsSync(currentFile)) {
            // Make the path relative to project root
            const relativePath = path.relative(projectPath, currentFile);

            return relativePath;
        }
    } catch (error) {
        logDebug(
            `[Prompt] Unable to resolve currently opened file for project ${projectPath}: ` +
            `${error instanceof Error ? error.message : String(error)}`
        );
    }
    return null;
}

function getRuntimePaths(projectPath: string): {
    runtimeHomePath: string;
    carbonLogPath: string;
} {
    const runtimeHome = getServerPathFromConfig(projectPath);
    if (!runtimeHome || runtimeHome.trim().length === 0) {
        return {
            runtimeHomePath: 'not_configured',
            carbonLogPath: 'not_configured',
        };
    }

    const resolvedRuntimeHome = path.resolve(runtimeHome.trim());
    const runtimeExists = fs.existsSync(resolvedRuntimeHome);
    const resolvedCarbonLogPath = path.join(resolvedRuntimeHome, 'repository', 'logs', 'wso2carbon.log');
    const carbonLogExists = fs.existsSync(resolvedCarbonLogPath);

    return {
        runtimeHomePath: runtimeExists
            ? resolvedRuntimeHome
            : `${resolvedRuntimeHome} (path_not_found)`,
        carbonLogPath: carbonLogExists
            ? resolvedCarbonLogPath
            : `${resolvedCarbonLogPath} (missing)`,
    };
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
    const existingFiles = getExistingFiles(params.projectPath, MAX_PROJECT_STRUCTURE_FILES);
    let projectStructure = formatProjectStructure(existingFiles);
    if (existingFiles.length >= MAX_PROJECT_STRUCTURE_FILES) {
        projectStructure += `\n... (project structure truncated to first ${MAX_PROJECT_STRUCTURE_FILES} files)`;
    }
    const fileList = [capProjectStructureLength(projectStructure)];

    // Get currently opened file content
    const currentlyOpenedFile = await getCurrentlyOpenedFile(params.projectPath);

    // Get available connectors and inbound endpoints
    const connectorCatalog = await getAvailableConnectorCatalog(params.projectPath);
    const { connectors: availableConnectors, inboundEndpoints: availableInboundEndpoints } = connectorCatalog;

    const mode = params.mode || 'edit';
    const modePolicyReminder = await getModeReminder({
        mode,
    });
    const planFileReminder = mode === 'plan'
        ? await getPlanModeSessionReminder(params.projectPath, params.sessionId || 'default')
        : '';
    const connectorStoreReminder = connectorCatalog.warnings.length > 0
        ? `Connector store status: ${connectorCatalog.storeStatus}. ${connectorCatalog.warnings.join(' ')}`
        : '';
    const modeReminderSections = [modePolicyReminder, planFileReminder, connectorStoreReminder]
        .filter((section) => section.trim().length > 0);
    const modeReminder = modeReminderSections.join('\n\n');

    // Prepare template context
    const isGitRepo = fs.existsSync(path.join(params.projectPath, '.git'));
    let gitBranch: string | null = null;
    if (isGitRepo) {
        try {
            const headPath = path.join(params.projectPath, '.git', 'HEAD');
            const headContent = fs.readFileSync(headPath, 'utf8').trim();
            if (headContent.startsWith('ref: refs/heads/')) {
                gitBranch = headContent.replace('ref: refs/heads/', '');
            } else if (/^[0-9a-f]{40}$/i.test(headContent)) {
                gitBranch = `DETACHED@${headContent.substring(0, 7)}`;
            }
        } catch (error) {
            logDebug(
                `[Prompt] Failed to resolve git branch from HEAD for project ${params.projectPath}: ` +
                `${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
    const today = new Date().toISOString().split('T')[0];
    const runtimeVersion = params.runtimeVersion ?? await getRuntimeVersionFromPom(params.projectPath);
    const runtimeVersionDetected = params.runtimeVersionDetected ?? !!runtimeVersion;
    const runtimeVersionDetectionWarning = runtimeVersionDetected
        ? ''
        : 'MI runtime version could not be detected. Code examples use modern syntax (MI >= 4.4.0). If your project uses an older MI runtime, specify it explicitly.';
    const runtimePaths = getRuntimePaths(params.projectPath);
    const context: Record<string, any> = {
        question: params.query,
        fileList: fileList,
        currentlyOpenedFile: currentlyOpenedFile, // Currently editing file (optional)
        userPreconfigured: params.payloads, // Pre-configured payloads (optional)
        payloads: params.payloads, // Backward-compatible template key
        available_connectors: availableConnectors.join(', '), // Available connectors list
        available_inbound_endpoints: availableInboundEndpoints.join(', '), // Available inbound endpoints list
        env_working_directory: params.projectPath,
        env_is_git_repo: isGitRepo ? 'true' : 'false',
        env_git_branch: gitBranch,
        env_platform: process.platform,
        env_os_version: `${os.type()} ${os.release()}`,
        env_today: today,
        env_mi_runtime_version: runtimeVersion || 'unknown',
        env_mi_runtime_home_path: runtimePaths.runtimeHomePath,
        env_mi_runtime_carbon_log_path: runtimePaths.carbonLogPath,
        runtime_version_detection_warning: runtimeVersionDetectionWarning,
        system_reminder: buildSystemReminder(mode, modeReminder, DEFERRED_TOOL_CATALOG),
    };

    // Render the template
    return renderTemplate(PROMPT_TEMPLATE, context);
}
