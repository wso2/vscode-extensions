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
import { logDebug } from '../../../copilot/logger';
import { getStateMachine } from '../../../../stateMachine';

const MAX_PROJECT_STRUCTURE_FILES = 50;
const MAX_PROJECT_STRUCTURE_CHARS = 10000;

// ============================================================================
// User Prompt Template
// ============================================================================

// ============================================================================
// Content Block Type
// ============================================================================

/**
 * A single text content block for the user message.
 * Splitting the user prompt into multiple blocks enables better prompt caching:
 * - Stable blocks (env, connectors) get cache hits even when volatile blocks change
 * - Blocks are ordered from most stable to most volatile for maximum prefix reuse
 */
export interface UserPromptContentBlock {
    type: 'text';
    text: string;
}

// ============================================================================
// User Prompt Template
// ============================================================================

/**
 * Handlebars template for the user prompt.
 *
 * After rendering, the output is split into separate content blocks at
 * <system-reminder>...</system-reminder> and <user_query>...</user_query> boundaries.
 * Each <system-reminder> block becomes a separate API content block (for prompt caching).
 * The <user_query> content becomes a plain text block (tags stripped).
 *
 * Block order: stable → volatile (for optimal prefix-based caching)
 */

// {{#if fileList}}
// <system-reminder>
// # Project Structure
// {{#each fileList}}
// {{this}}
// {{/each}}
// </system-reminder>
// {{/if}}

export const PROMPT_TEMPLATE = `
<system-reminder>
# Environment
Working directory: {{env_working_directory}}
Is directory a git repo: {{env_is_git_repo}}
{{#if env_git_branch}}Current git branch: {{env_git_branch}}{{/if}}
Platform: {{env_platform}}
OS Version: {{env_os_version}}
Today's date: {{env_today}}
MI Runtime version: {{env_mi_runtime_version}}
MI Runtime home path: {{env_mi_runtime_home_path}}
MI Runtime log directory: {{env_mi_log_dir_path}}
MI Runtime logs:
  - wso2carbon.log (main): {{env_mi_runtime_carbon_log_path}}
  - wso2error.log (errors + stack traces): {{env_mi_error_log_path}}
  - http_access.log (HTTP requests): {{env_mi_http_access_log_path}}
  - wso2-mi-service.log (service lifecycle): {{env_mi_service_log_path}}
  - correlation.log (request tracing): {{env_mi_correlation_log_path}}
</system-reminder>

<system-reminder>
# Available Connectors & Inbound Endpoints
Available WSO2 connectors from the WSO2 connector store:
{{available_connectors}}

Available WSO2 inbound endpoints from the WSO2 connector store:
{{available_inbound_endpoints}}
</system-reminder>

{{#if currentlyOpenedFile}}
<system-reminder>
# IDE Context
The user has opened the file {{currentlyOpenedFile}} in the IDE. This may or may not be related to the current task. User may refer to it as "this".
</system-reminder>
{{/if}}

{{#if userPreconfigured}}
<system-reminder>
# Preconfigured Values
{{payloads}}
These are preconfigured values in the Low-Code IDE that should be accessed using Synapse expressions in the integration flow. Always use Synapse expressions when referring to these values.
</system-reminder>
{{/if}}

{{#if runtime_version_detection_warning}}
<system-reminder>
# Runtime Version Warning
{{runtime_version_detection_warning}}
</system-reminder>
{{/if}}

<system-reminder>
You are in {{mode_upper}} mode.
{{mode_policy}}
</system-reminder>

{{#if plan_file_reminder}}
<system-reminder>
{{plan_file_reminder}}
</system-reminder>
{{/if}}

{{#if connector_store_reminder}}
<system-reminder>
# Connector Store Status
{{connector_store_reminder}}
</system-reminder>
{{/if}}

<system-reminder>
YOU ARE IN DEVELOPMENT PHASE. NOT IN PRODUCTION YET. HELP THE DEVELOPER IF DEVELOPER ASKS META QUESTIONS ABOUT YOUR INTERNALS/TOOL CALLS etc
**DO NOT CREATE ANY README FILES or ANY DOCUMENTATION FILES after end of the task unless explicitly requested by the user.**
</system-reminder>

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
 * Split a rendered prompt string into separate content blocks.
 *
 * Extracts:
 * - Each `<system-reminder>...</system-reminder>` block → content block (tags kept)
 * - `<user_query>...</user_query>` → plain text content block (tags stripped)
 * - Whitespace between blocks is ignored
 *
 * This enables Anthropic's prefix-based prompt caching: stable blocks at the start
 * get cache hits even when later volatile blocks change.
 */
export function splitPromptIntoBlocks(rendered: string): UserPromptContentBlock[] {
    const blocks: UserPromptContentBlock[] = [];

    // Match all <system-reminder> blocks and the <user_query> block
    const blockPattern = /(<system-reminder>[\s\S]*?<\/system-reminder>)|(<user_query>\s*([\s\S]*?)\s*<\/user_query>)/g;
    let match: RegExpExecArray | null;

    while ((match = blockPattern.exec(rendered)) !== null) {
        if (match[1]) {
            // <system-reminder> block — keep tags intact
            blocks.push({ type: 'text', text: match[1].trim() });
        } else if (match[3] !== undefined) {
            // <user_query> block — strip tags, extract inner content
            blocks.push({ type: 'text', text: match[3].trim() });
        }
    }

    return blocks;
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
    logDirPath: string;
    carbonLogPath: string;
    errorLogPath: string;
    httpAccessLogPath: string;
    serviceLogPath: string;
    correlationLogPath: string;
} {
    const NOT_CONFIGURED = 'not_configured';
    const runtimeHome = getServerPathFromConfig(projectPath);
    if (!runtimeHome || runtimeHome.trim().length === 0) {
        return {
            runtimeHomePath: NOT_CONFIGURED,
            logDirPath: NOT_CONFIGURED,
            carbonLogPath: NOT_CONFIGURED,
            errorLogPath: NOT_CONFIGURED,
            httpAccessLogPath: NOT_CONFIGURED,
            serviceLogPath: NOT_CONFIGURED,
            correlationLogPath: NOT_CONFIGURED,
        };
    }

    const resolvedRuntimeHome = path.resolve(runtimeHome.trim());
    const runtimeExists = fs.existsSync(resolvedRuntimeHome);
    const logDir = path.join(resolvedRuntimeHome, 'repository', 'logs');
    const logDirExists = fs.existsSync(logDir);

    const resolveLogPath = (filename: string) => {
        const p = path.join(logDir, filename);
        return fs.existsSync(p) ? p : `${p} (missing)`;
    };

    return {
        runtimeHomePath: runtimeExists ? resolvedRuntimeHome : `${resolvedRuntimeHome} (path_not_found)`,
        logDirPath: logDirExists ? logDir : `${logDir} (missing)`,
        carbonLogPath: resolveLogPath('wso2carbon.log'),
        errorLogPath: resolveLogPath('wso2error.log'),
        httpAccessLogPath: resolveLogPath('http_access.log'),
        serviceLogPath: resolveLogPath('wso2-mi-service.log'),
        correlationLogPath: resolveLogPath('correlation.log'),
    };
}

// ============================================================================
// User Prompt Generation
// ============================================================================

/**
 * Generates the user prompt as an array of content blocks.
 *
 * Renders the Handlebars template, then splits the result into separate
 * content blocks at <system-reminder> and <user_query> boundaries.
 * Each <system-reminder> block becomes a separate API content block.
 * The <user_query> content becomes a plain text block (tags stripped).
 *
 * The agent can read any file content on-demand using file_read tool.
 */
export async function getUserPrompt(params: UserPromptParams): Promise<UserPromptContentBlock[]> {
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
        env_mi_log_dir_path: runtimePaths.logDirPath,
        env_mi_runtime_carbon_log_path: runtimePaths.carbonLogPath,
        env_mi_error_log_path: runtimePaths.errorLogPath,
        env_mi_http_access_log_path: runtimePaths.httpAccessLogPath,
        env_mi_service_log_path: runtimePaths.serviceLogPath,
        env_mi_correlation_log_path: runtimePaths.correlationLogPath,
        runtime_version_detection_warning: runtimeVersionDetectionWarning,
        mode_upper: mode.toUpperCase(),
        mode_policy: modePolicyReminder,
        plan_file_reminder: planFileReminder,
        connector_store_reminder: connectorStoreReminder,
    };

    // Render the template and split into content blocks
    const rendered = renderTemplate(PROMPT_TEMPLATE, context);
    return splitPromptIntoBlocks(rendered);
}
