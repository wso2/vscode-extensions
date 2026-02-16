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

import {
    createWriteTool,
    createReadTool,
    createEditTool,
    createGrepTool,
    createGlobTool,
    createWriteExecute,
    createReadExecute,
    createEditExecute,
    createGrepExecute,
    createGlobExecute,
} from '../../tools/file_tools';
import {
    createConnectorTool,
    createConnectorExecute,
} from '../../tools/connector_tools';
import {
    createSkillTool,
    createSkillExecute,
} from '../../tools/skill_tools';
import {
    createManageConnectorTool,
    createManageConnectorExecute,
} from '../../tools/project_tools';
import {
    createValidateCodeTool,
    createValidateCodeExecute,
} from '../../tools/lsp_tools';
import {
    createCreateDataMapperTool,
    createCreateDataMapperExecute,
    createGenerateDataMappingTool,
    createGenerateDataMappingExecute,
} from '../../tools/data_mapper_tools';
import {
    createBuildProjectTool,
    createBuildProjectExecute,
    createServerManagementTool,
    createServerManagementExecute,
} from '../../tools/runtime_tools';
import {
    createSubagentTool,
    createSubagentExecute,
} from '../../tools/subagent_tool';
import {
    createAskUserTool,
    createAskUserExecute,
    createEnterPlanModeTool,
    createEnterPlanModeExecute,
    createExitPlanModeTool,
    createExitPlanModeExecute,
    createTodoWriteTool,
    createTodoWriteExecute,
    isPlanModeSessionActive,
    PendingQuestion,
    PendingPlanApproval,
} from '../../tools/plan_mode_tools';
import {
    createBashTool,
    createBashExecute,
    createKillTaskTool,
    createKillTaskExecute,
    createTaskOutputTool,
    createTaskOutputExecute,
} from '../../tools/bash_tools';
import {
    createWebSearchTool,
    createWebSearchExecute,
    createWebFetchTool,
    createWebFetchExecute,
} from '../../tools/web_tools';
import { AnthropicModel } from '../../../connection';
import { AgentMode } from '@wso2/mi-core';
import { persistOversizedToolResult } from '../../tools/tool-result-persistence';
import {
    FILE_WRITE_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_GREP_TOOL_NAME,
    FILE_GLOB_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
    SKILL_TOOL_NAME,
    MANAGE_CONNECTOR_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    CREATE_DATA_MAPPER_TOOL_NAME,
    GENERATE_DATA_MAPPING_TOOL_NAME,
    BUILD_PROJECT_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
    SUBAGENT_TOOL_NAME,
    ASK_USER_TOOL_NAME,
    ENTER_PLAN_MODE_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    BASH_TOOL_NAME,
    KILL_TASK_TOOL_NAME,
    TASK_OUTPUT_TOOL_NAME,
    WEB_SEARCH_TOOL_NAME,
    WEB_FETCH_TOOL_NAME,
} from '../../tools/types';
import { BashExecuteFn, ToolResult } from '../../tools/types';
import { AgentUndoCheckpointManager } from '../../undo/checkpoint-manager';
import * as path from 'path';
import { getCopilotSessionDir } from '../../storage-paths';

// Re-export tool name constants for use in agent.ts
export {
    FILE_WRITE_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_GREP_TOOL_NAME,
    FILE_GLOB_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
    SKILL_TOOL_NAME,
    MANAGE_CONNECTOR_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    CREATE_DATA_MAPPER_TOOL_NAME,
    GENERATE_DATA_MAPPING_TOOL_NAME,
    BUILD_PROJECT_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
    SUBAGENT_TOOL_NAME,
    ASK_USER_TOOL_NAME,
    ENTER_PLAN_MODE_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    BASH_TOOL_NAME,
    KILL_TASK_TOOL_NAME,
    TASK_OUTPUT_TOOL_NAME,
    WEB_SEARCH_TOOL_NAME,
    WEB_FETCH_TOOL_NAME,
};
import { AgentEventHandler } from './agent';

/**
 * Parameters for creating the tools object
 */
export interface CreateToolsParams {
    /** Path to the MI project */
    projectPath: string;
    /** Agent mode: ask (read-only), plan (planning read-only), or edit (full tool access) */
    mode: AgentMode;
    /** List to track modified files */
    modifiedFiles: string[];
    /** Session ID for plan mode */
    sessionId: string;
    /** Session directory for output files */
    sessionDir: string;
    /** Event handler for plan mode events */
    eventHandler: AgentEventHandler;
    /** Pending questions map for ask_user tool */
    pendingQuestions: Map<string, PendingQuestion>;
    /** Pending plan approvals map for exit_plan_mode tool */
    pendingApprovals: Map<string, PendingPlanApproval>;
    /** Function to get Anthropic client for task tool */
    getAnthropicClient: (model: AnthropicModel) => Promise<any>;
    /** Skip per-call web approval prompts for this run */
    webAccessPreapproved: boolean;
    /** Optional undo checkpoint manager for capturing pre-change states */
    undoCheckpointManager?: AgentUndoCheckpointManager;
}

const READ_ONLY_MODE_ALLOWED_TOOLS = new Set<string>([
    FILE_READ_TOOL_NAME,
    FILE_GREP_TOOL_NAME,
    FILE_GLOB_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
    SKILL_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    WEB_SEARCH_TOOL_NAME,
    WEB_FETCH_TOOL_NAME,
]);

const PLAN_MODE_ALLOWED_TOOLS = new Set<string>([
    ...READ_ONLY_MODE_ALLOWED_TOOLS,
    FILE_WRITE_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    BASH_TOOL_NAME,
    KILL_TASK_TOOL_NAME,
    TASK_OUTPUT_TOOL_NAME,
    SUBAGENT_TOOL_NAME,
    ASK_USER_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
]);

function createModeBlockedExecute(toolName: string, mode: AgentMode) {
    const modeLabel = mode === 'plan' ? 'Plan' : 'Ask';
    const errorCode = mode === 'plan' ? 'PLAN_MODE_RESTRICTED' : 'ASK_MODE_RESTRICTED';
    const guidance = mode === 'plan'
        ? 'Plan mode only supports read-only exploration and planning tools. Switch to Edit mode to make project changes.'
        : 'Switch to Edit mode to use modification tools.';

    return async (_args: unknown): Promise<ToolResult> => ({
        success: false,
        message: `Tool '${toolName}' is disabled in ${modeLabel} mode. ${guidance}`,
        error: errorCode,
    });
}

function normalizePathForComparison(targetPath: string): string {
    const normalized = path.resolve(targetPath).replace(/\\/g, '/').replace(/\/+$/, '');
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isPathWithin(basePath: string, targetPath: string): boolean {
    const normalizedBase = normalizePathForComparison(basePath);
    const normalizedTarget = normalizePathForComparison(targetPath);
    return normalizedTarget === normalizedBase || normalizedTarget.startsWith(`${normalizedBase}/`);
}

function createPlanModePlanFileOnlyExecute<T extends (...args: any[]) => Promise<ToolResult>>(
    execute: T,
    toolName: string,
    projectPath: string,
    sessionId: string
): T {
    const planDir = path.join(getCopilotSessionDir(projectPath, sessionId), 'plan');
    const planDirDisplayPath = planDir.replace(/\\/g, '/');

    return (async (...args: Parameters<T>): Promise<ToolResult> => {
        const toolArgs = args[0] as { file_path?: unknown } | undefined;
        const filePathArg = typeof toolArgs?.file_path === 'string' ? toolArgs.file_path.trim() : '';
        if (!filePathArg) {
            return {
                success: false,
                message: `Tool '${toolName}' in Plan mode requires a valid file_path for the assigned plan file.`,
                error: 'PLAN_MODE_RESTRICTED',
            };
        }

        const fullPath = path.isAbsolute(filePathArg)
            ? path.resolve(filePathArg)
            : path.resolve(projectPath, filePathArg);
        const isMarkdown = path.extname(fullPath).toLowerCase() === '.md';
        const isInPlanDir = isPathWithin(planDir, fullPath);

        if (!isMarkdown || !isInPlanDir) {
            return {
                success: false,
                message: `Tool '${toolName}' is restricted in Plan mode. You may only modify the plan file under ${planDirDisplayPath}.`,
                error: 'PLAN_MODE_RESTRICTED',
            };
        }

        return execute(...args);
    }) as T;
}

function getPlanModeShellRestrictionReason(command: string): string | null {
    const normalized = command.trim();
    if (!normalized) {
        return 'Plan mode shell command cannot be empty.';
    }

    // Block output redirection and stream writes.
    if (/>>\s*\S/.test(normalized) || /(^|[^<])>\s*\S/.test(normalized) || /\|\s*tee\b/i.test(normalized)) {
        return 'Plan mode shell is read-only and does not allow file/output redirection.';
    }

    // Block common write/mutation commands across bash and PowerShell.
    const blockedPatterns: RegExp[] = [
        /\b(rm|rmdir|mv|cp|mkdir|touch|chmod|chown|chgrp|ln|truncate|dd|install)\b/i,
        /\b(git)\s+(add|commit|reset|checkout|switch|restore|clean|stash|rebase|merge|cherry-pick|revert|am|apply|pull|push|fetch)\b/i,
        /\b(npm|pnpm|yarn|bun|pip|pip3|poetry|cargo|go|dotnet|mvn|gradle)\s+(install|add|remove|update|upgrade|uninstall|init|build|run|test|publish)\b/i,
        /\b(make|cmake|meson|ninja)\b/i,
        /\b(sed|perl)\s+-i\b/i,
        /\b(New-Item|Set-Content|Add-Content|Out-File|Remove-Item|Move-Item|Copy-Item|Rename-Item|Clear-Content)\b/i,
    ];

    for (const pattern of blockedPatterns) {
        if (pattern.test(normalized)) {
            return 'Plan mode shell only allows read-only exploration commands.';
        }
    }

    return null;
}

function createPlanModeReadOnlyBashExecute(execute: BashExecuteFn): BashExecuteFn {
    return async (args) => {
        const restrictionReason = getPlanModeShellRestrictionReason(args.command);
        if (restrictionReason) {
            return {
                success: false,
                message: `${restrictionReason} Use read-only commands like ls, cat, grep, rg, find, git status, or git diff.`,
                error: 'PLAN_MODE_RESTRICTED',
            };
        }

        return execute(args);
    };
}

function getModeAwareExecute<T extends (...args: any[]) => Promise<ToolResult>>(
    mode: AgentMode,
    toolName: string,
    execute: T,
    options?: { projectPath: string; sessionId: string }
): T {
    if (mode === 'edit') {
        return execute;
    }

    const blockedExecute = createModeBlockedExecute(toolName, mode);
    const planFileOnlyExecute = mode === 'plan'
        && options
        && (toolName === FILE_WRITE_TOOL_NAME || toolName === FILE_EDIT_TOOL_NAME)
        ? createPlanModePlanFileOnlyExecute(
            execute,
            toolName,
            options.projectPath,
            options.sessionId
        )
        : undefined;
    const planReadOnlyBashExecute = mode === 'plan' && toolName === BASH_TOOL_NAME
        ? createPlanModeReadOnlyBashExecute(execute as unknown as BashExecuteFn)
        : undefined;

    return (async (...args: Parameters<T>): Promise<ToolResult> => {
        if (mode === 'plan') {
            const planRestrictionsActive = options
                ? isPlanModeSessionActive(options.sessionId)
                : true;

            // Plan mode can transition to Edit mode mid-run after exit_plan_mode approval.
            // Once plan session state is cleared, stop applying Plan-mode restrictions.
            if (!planRestrictionsActive) {
                return execute(...args);
            }

            if (planFileOnlyExecute) {
                return planFileOnlyExecute(...args);
            }

            if (planReadOnlyBashExecute) {
                return planReadOnlyBashExecute(args[0] as Parameters<BashExecuteFn>[0]);
            }

            if (PLAN_MODE_ALLOWED_TOOLS.has(toolName)) {
                return execute(...args);
            }

            return blockedExecute(args[0]);
        }

        if (READ_ONLY_MODE_ALLOWED_TOOLS.has(toolName)) {
            return execute(...args);
        }

        return blockedExecute(args[0]);
    }) as T;
}

function withPersistedToolResult<T extends (...args: any[]) => Promise<ToolResult>>(
    toolName: string,
    sessionDir: string,
    execute: T
): T {
    return (async (...args: Parameters<T>): Promise<ToolResult> => {
        const result = await execute(...args);
        const processed = await persistOversizedToolResult({
            sessionDir,
            toolName,
            toolArgs: args[0],
            result,
        });
        return processed as ToolResult;
    }) as T;
}

/**
 * Creates the complete tools object for the agent.
 * This ensures consistent tool definitions across main agent and compact agent.
 *
 * @param params - Tool creation parameters
 * @returns Tools object with all 20+ tools
 */
export function createAgentTools(params: CreateToolsParams) {
    const {
        projectPath,
        mode,
        modifiedFiles,
        sessionId,
        sessionDir,
        eventHandler,
        pendingQuestions,
        pendingApprovals,
        getAnthropicClient,
        webAccessPreapproved,
        undoCheckpointManager,
    } = params;

    const getWrappedExecute = <T extends (...args: any[]) => Promise<ToolResult>>(
        toolName: string,
        execute: T
    ): T => withPersistedToolResult(
        toolName,
        sessionDir,
        getModeAwareExecute(mode, toolName, execute, { projectPath, sessionId })
    );

    const allTools = {
        // File Operations (6 tools)
        [FILE_WRITE_TOOL_NAME]: createWriteTool(
            getWrappedExecute(FILE_WRITE_TOOL_NAME, createWriteExecute(projectPath, modifiedFiles, undoCheckpointManager))
        ),
        [FILE_READ_TOOL_NAME]: createReadTool(
            getWrappedExecute(FILE_READ_TOOL_NAME, createReadExecute(projectPath)),
            projectPath
        ),
        [FILE_EDIT_TOOL_NAME]: createEditTool(
            getWrappedExecute(FILE_EDIT_TOOL_NAME, createEditExecute(projectPath, modifiedFiles, undoCheckpointManager))
        ),
        [FILE_GREP_TOOL_NAME]: createGrepTool(
            getWrappedExecute(FILE_GREP_TOOL_NAME, createGrepExecute(projectPath))
        ),
        [FILE_GLOB_TOOL_NAME]: createGlobTool(
            getWrappedExecute(FILE_GLOB_TOOL_NAME, createGlobExecute(projectPath))
        ),

        // Connector Tools (2 tools)
        [CONNECTOR_TOOL_NAME]: createConnectorTool(
            getWrappedExecute(CONNECTOR_TOOL_NAME, createConnectorExecute(projectPath))
        ),
        [SKILL_TOOL_NAME]: createSkillTool(
            getWrappedExecute(SKILL_TOOL_NAME, createSkillExecute(projectPath))
        ),

        // Project Tools (1 tool)
        [MANAGE_CONNECTOR_TOOL_NAME]: createManageConnectorTool(
            getWrappedExecute(MANAGE_CONNECTOR_TOOL_NAME, createManageConnectorExecute(projectPath, undoCheckpointManager))
        ),

        // LSP Tools (1 tool)
        [VALIDATE_CODE_TOOL_NAME]: createValidateCodeTool(
            getWrappedExecute(VALIDATE_CODE_TOOL_NAME, createValidateCodeExecute(projectPath))
        ),

        // Data Mapper Tools (2 tools)
        [CREATE_DATA_MAPPER_TOOL_NAME]: createCreateDataMapperTool(
            getWrappedExecute(CREATE_DATA_MAPPER_TOOL_NAME, createCreateDataMapperExecute(projectPath, modifiedFiles, undoCheckpointManager))
        ),
        [GENERATE_DATA_MAPPING_TOOL_NAME]: createGenerateDataMappingTool(
            getWrappedExecute(GENERATE_DATA_MAPPING_TOOL_NAME, createGenerateDataMappingExecute(projectPath, modifiedFiles, undoCheckpointManager))
        ),

        // Runtime Tools (2 tools)
        [BUILD_PROJECT_TOOL_NAME]: createBuildProjectTool(
            getWrappedExecute(BUILD_PROJECT_TOOL_NAME, createBuildProjectExecute(projectPath, sessionDir))
        ),
        [SERVER_MANAGEMENT_TOOL_NAME]: createServerManagementTool(
            getWrappedExecute(SERVER_MANAGEMENT_TOOL_NAME, createServerManagementExecute(projectPath, sessionDir))
        ),

        // Plan Mode Tools (5 tools)
        [SUBAGENT_TOOL_NAME]: createSubagentTool(
            getWrappedExecute(SUBAGENT_TOOL_NAME, createSubagentExecute(projectPath, sessionId, getAnthropicClient))
        ),
        [ASK_USER_TOOL_NAME]: createAskUserTool(
            getWrappedExecute(ASK_USER_TOOL_NAME, createAskUserExecute(eventHandler, pendingQuestions, sessionId))
        ),
        [ENTER_PLAN_MODE_TOOL_NAME]: createEnterPlanModeTool(
            getWrappedExecute(ENTER_PLAN_MODE_TOOL_NAME, createEnterPlanModeExecute(projectPath, sessionId, eventHandler, pendingApprovals))
        ),
        [EXIT_PLAN_MODE_TOOL_NAME]: createExitPlanModeTool(
            getWrappedExecute(EXIT_PLAN_MODE_TOOL_NAME, createExitPlanModeExecute(projectPath, sessionId, eventHandler, pendingApprovals))
        ),
        [TODO_WRITE_TOOL_NAME]: createTodoWriteTool(
            getWrappedExecute(TODO_WRITE_TOOL_NAME, createTodoWriteExecute(eventHandler))
        ),

        // Web Tools (2 tools)
        [WEB_SEARCH_TOOL_NAME]: createWebSearchTool(
            getWrappedExecute(WEB_SEARCH_TOOL_NAME, createWebSearchExecute(getAnthropicClient, eventHandler, pendingApprovals, webAccessPreapproved))
        ),
        [WEB_FETCH_TOOL_NAME]: createWebFetchTool(
            getWrappedExecute(WEB_FETCH_TOOL_NAME, createWebFetchExecute(getAnthropicClient, eventHandler, pendingApprovals, webAccessPreapproved))
        ),

        // Shell Tools (3 tools)
        [BASH_TOOL_NAME]: createBashTool(
            getWrappedExecute(BASH_TOOL_NAME, createBashExecute(projectPath))
        ),
        [KILL_TASK_TOOL_NAME]: createKillTaskTool(
            getWrappedExecute(KILL_TASK_TOOL_NAME, createKillTaskExecute())
        ),
        [TASK_OUTPUT_TOOL_NAME]: createTaskOutputTool(
            getWrappedExecute(TASK_OUTPUT_TOOL_NAME, createTaskOutputExecute())
        ),
    };

    if (mode === 'edit') {
        return allTools;
    }

    // Keep all tools visible in Plan mode so approved exit_plan_mode can continue
    // implementation in the same run. Execution restrictions are enforced dynamically.
    if (mode === 'plan') {
        return allTools;
    }

    const visibleToolNames = READ_ONLY_MODE_ALLOWED_TOOLS;
    return Object.fromEntries(
        Object.entries(allTools).filter(([toolName]) => visibleToolNames.has(toolName))
    );
}
