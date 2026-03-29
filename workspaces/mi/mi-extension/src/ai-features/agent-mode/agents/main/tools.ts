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
    createContextTool,
    createContextExecute,
} from '../../tools/context_tools';
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
    createBuildAndDeployTool,
    createBuildAndDeployExecute,
    createServerManagementTool,
    createServerManagementExecute,
    type ServerManagementExecuteFn,
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
    drainBackgroundTaskNotifications,
} from '../../tools/bash_tools';
import {
    createWebSearchTool,
    createWebSearchExecute,
    createWebFetchTool,
    createWebFetchExecute,
} from '../../tools/web_tools';
import {
    createReadServerLogsTool,
    createReadServerLogsExecute,
} from '../../tools/log_tools';
import { createToolSearchTool } from '../../tools/tool_load';
import { AnthropicModel, resolveMainModelId } from '../../../connection';
import { AgentMode, ModelSettings } from '@wso2/mi-core';
import { persistOversizedToolResult } from '../../tools/tool-result-persistence';
import { analyzeShellCommand } from '../../tools/shell_sandbox';
import {
    BashExecuteFn,
    FILE_WRITE_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_GREP_TOOL_NAME,
    FILE_GLOB_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
    CONTEXT_TOOL_NAME,
    MANAGE_CONNECTOR_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    CREATE_DATA_MAPPER_TOOL_NAME,
    GENERATE_DATA_MAPPING_TOOL_NAME,
    BUILD_AND_DEPLOY_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
    SUBAGENT_TOOL_NAME,
    ASK_USER_TOOL_NAME,
    ENTER_PLAN_MODE_TOOL_NAME,
    EXIT_PLAN_MODE_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    BASH_TOOL_NAME,
    KILL_TASK_TOOL_NAME,
    TASK_OUTPUT_TOOL_NAME,
    ToolResult,
    WEB_SEARCH_TOOL_NAME,
    WEB_FETCH_TOOL_NAME,
    READ_SERVER_LOGS_TOOL_NAME,
    TOOL_LOAD_TOOL_NAME,
    ShellApprovalRuleStore,
    DEFERRED_TOOLS,
} from '../../tools/types';
import { AgentUndoCheckpointManager } from '../../undo/checkpoint-manager';
import { logError } from '../../../copilot/logger';
import { z } from 'zod';
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
    CONTEXT_TOOL_NAME,
    MANAGE_CONNECTOR_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    CREATE_DATA_MAPPER_TOOL_NAME,
    GENERATE_DATA_MAPPING_TOOL_NAME,
    BUILD_AND_DEPLOY_TOOL_NAME,
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
    READ_SERVER_LOGS_TOOL_NAME,
    TOOL_LOAD_TOOL_NAME,
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
    /** Session-scoped shell approval rule store */
    shellApprovalRuleStore?: ShellApprovalRuleStore;
    /** Optional undo checkpoint manager for capturing pre-change states */
    undoCheckpointManager?: AgentUndoCheckpointManager;
    /** Abort signal from the main agent — propagated to subagents and background tasks */
    abortSignal?: AbortSignal;
    /** Model settings for this session (main model + sub-agent model overrides) */
    modelSettings?: ModelSettings;
}

const READ_ONLY_MODE_ALLOWED_TOOLS = new Set<string>([
    FILE_READ_TOOL_NAME,
    FILE_GREP_TOOL_NAME,
    FILE_GLOB_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
    CONTEXT_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    WEB_SEARCH_TOOL_NAME,
    WEB_FETCH_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
    READ_SERVER_LOGS_TOOL_NAME,
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

const PLAN_MODE_READ_ONLY_SHELL_COMMANDS = new Set([
    'basename',
    'cat',
    'cut',
    'date',
    'diff',
    'dirname',
    'echo',
    'env',
    'file',
    'find',
    'git',
    'grep',
    'head',
    'id',
    'ls',
    'pwd',
    'readlink',
    'realpath',
    'rg',
    'sort',
    'stat',
    'tail',
    'tree',
    'uniq',
    'wc',
    'which',
    'whoami',
]);

const PLAN_MODE_ALLOWED_GIT_ACTIONS = new Set([
    'branch',
    'describe',
    'diff',
    'log',
    'remote',
    'rev-parse',
    'show',
    'status',
]);

const ToolResultSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    error: z.string().optional(),
}).passthrough();

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

function validatePlanModePlanFileOnlyToolArgs(
    toolName: string,
    projectPath: string,
    sessionId: string,
    toolArgs: unknown
): ToolResult | null {
    const planDir = path.join(getCopilotSessionDir(projectPath, sessionId), 'plan');
    const planDirDisplayPath = planDir.replace(/\\/g, '/');
    const parsedArgs = toolArgs as { file_path?: unknown } | undefined;
    const filePathArg = typeof parsedArgs?.file_path === 'string' ? parsedArgs.file_path.trim() : '';
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

    return null;
}

function normalizePlanShellCommandName(commandToken: string): string {
    const normalized = commandToken.trim().toLowerCase().replace(/\\/g, '/');
    const basename = path.posix.basename(normalized);
    return basename.endsWith('.exe') ? basename.slice(0, -4) : basename;
}

function getPlanModeShellRestrictionReason(command: string, projectPath: string): string | null {
    const normalized = command.trim();
    if (!normalized) {
        return 'Plan mode shell command cannot be empty.';
    }

    const analysis = analyzeShellCommand(normalized, process.platform, projectPath, false);
    if (analysis.blocked) {
        return `Plan mode shell command is blocked by sandbox policy: ${analysis.reasons.join(' ')}`;
    }

    if (analysis.isComplexSyntax) {
        return 'Plan mode shell only allows simple read-only commands without complex shell syntax.';
    }

    for (const segment of analysis.segments) {
        const commandName = normalizePlanShellCommandName(segment.command);
        if (!commandName || !PLAN_MODE_READ_ONLY_SHELL_COMMANDS.has(commandName)) {
            return `Plan mode shell only allows read-only exploration commands. '${commandName || segment.raw}' is not allowed.`;
        }

        if (segment.requiresApproval || segment.isDestructive || segment.blocked) {
            return 'Plan mode shell only allows read-only exploration commands.';
        }

        if (commandName === 'git') {
            const gitAction = (segment.tokens[1] || '').trim().toLowerCase();
            if (!gitAction || !PLAN_MODE_ALLOWED_GIT_ACTIONS.has(gitAction)) {
                return `Plan mode shell only allows read-only git commands (${Array.from(PLAN_MODE_ALLOWED_GIT_ACTIONS).join(', ')}).`;
            }
        }
    }

    return null;
}

const SERVER_MANAGEMENT_READ_ONLY_ACTIONS = new Set(['status', 'query']);

function validateReadOnlyServerManagementArgs(
    toolArgs: unknown,
    mode: AgentMode
): ToolResult | null {
    const args = toolArgs as Parameters<ServerManagementExecuteFn>[0];
    if (!SERVER_MANAGEMENT_READ_ONLY_ACTIONS.has(args.action)) {
        return {
            success: false,
            message: `Action '${args.action}' is not allowed in Ask/Plan mode. Only 'status' and 'query' actions are available. Switch to Edit mode to use '${args.action}'.`,
            error: mode === 'plan' ? 'PLAN_MODE_RESTRICTED' : 'ASK_MODE_RESTRICTED',
        };
    }

    return null;
}

function validatePlanModeReadOnlyBashArgs(
    toolArgs: unknown,
    projectPath: string
): ToolResult | null {
    const args = toolArgs as Parameters<BashExecuteFn>[0];
    const restrictionReason = getPlanModeShellRestrictionReason(args.command, projectPath);
    if (!restrictionReason) {
        return null;
    }

    return {
        success: false,
        message: `${restrictionReason} Use read-only commands like ls, cat, grep, rg, find, git status, or git diff.`,
        error: 'PLAN_MODE_RESTRICTED',
    };
}

interface ToolExecutionPipelineOptions {
    mode: AgentMode;
    toolName: string;
    projectPath: string;
    sessionId: string;
    sessionDir: string;
    persistResult: boolean;
}

async function evaluateModeRestriction(
    options: Pick<ToolExecutionPipelineOptions, 'mode' | 'toolName' | 'projectPath' | 'sessionId'>,
    toolArgs: unknown
): Promise<ToolResult | null> {
    const { mode, toolName, projectPath, sessionId } = options;
    if (mode === 'edit') {
        return null;
    }

    const blockedExecute = createModeBlockedExecute(toolName, mode);
    if (mode === 'plan') {
        // Fail closed: once a run starts in plan mode, do not auto-escalate tool permissions
        // within the same run based on mutable session state.
        if (!isPlanModeSessionActive(sessionId)) {
            return {
                success: false,
                message: 'Plan mode state changed during this run. Send a new Edit mode message after exiting plan mode to run unrestricted tools.',
                error: 'PLAN_MODE_TRANSITION_PENDING',
            };
        }

        if (toolName === FILE_WRITE_TOOL_NAME || toolName === FILE_EDIT_TOOL_NAME) {
            return validatePlanModePlanFileOnlyToolArgs(toolName, projectPath, sessionId, toolArgs);
        }

        if (toolName === BASH_TOOL_NAME) {
            return validatePlanModeReadOnlyBashArgs(toolArgs, projectPath);
        }

        if (toolName === SERVER_MANAGEMENT_TOOL_NAME) {
            return validateReadOnlyServerManagementArgs(toolArgs, mode);
        }

        if (PLAN_MODE_ALLOWED_TOOLS.has(toolName)) {
            return null;
        }

        return blockedExecute(toolArgs);
    }

    if (toolName === SERVER_MANAGEMENT_TOOL_NAME) {
        return validateReadOnlyServerManagementArgs(toolArgs, mode);
    }

    if (READ_ONLY_MODE_ALLOWED_TOOLS.has(toolName)) {
        return null;
    }

    return blockedExecute(toolArgs);
}

function createToolExecutionPipeline<T extends (...args: any[]) => Promise<ToolResult>>(
    execute: T,
    options: ToolExecutionPipelineOptions
): T {
    const { toolName, sessionDir, sessionId, persistResult } = options;
    const normalizeToolResult = (
        result: unknown,
        stage: 'execute' | 'persist'
    ): ToolResult & Record<string, unknown> => {
        const parsed = ToolResultSchema.safeParse(result);
        if (!parsed.success) {
            logError(`[AgentTools] Invalid tool result shape for '${toolName}' during ${stage}: ${parsed.error.message}`, result);
            return {
                success: false,
                message: `Tool '${toolName}' returned an invalid result shape.`,
                error: 'INVALID_TOOL_RESULT_SHAPE',
            };
        }

        const normalized = parsed.data as ToolResult & Record<string, unknown>;
        if (typeof normalized.message !== 'string') {
            normalized.message = normalized.success
                ? ''
                : `Tool '${toolName}' failed without a message.`;
        }
        return normalized;
    };

    return (async (...args: Parameters<T>): Promise<ToolResult> => {
        const modeRestriction = await evaluateModeRestriction(
            {
                mode: options.mode,
                toolName,
                projectPath: options.projectPath,
                sessionId: options.sessionId,
            },
            args[0]
        );
        if (modeRestriction) {
            return modeRestriction;
        }

        const result = normalizeToolResult(await execute(...args), 'execute');
        if (!persistResult) {
            return result;
        }

        const processed = await persistOversizedToolResult({
            sessionDir,
            toolName,
            toolArgs: args[0],
            result,
        });

        // Append completion notifications for any background tasks that finished
        const notifications = drainBackgroundTaskNotifications(sessionId);
        const toolResult = normalizeToolResult(processed, 'persist');
        if (notifications && typeof toolResult.message === 'string') {
            toolResult.message = toolResult.message.length > 0
                ? toolResult.message + '\n' + notifications
                : notifications;
        }

        return toolResult;
    }) as T;
}

/**
 * Creates the complete tools object for the agent.
 * This ensures consistent tool definitions across main agent and compact agent.
 *
 * @param params - Tool creation parameters
 * @returns Tools object with all 23 tools
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
        shellApprovalRuleStore,
        undoCheckpointManager,
        abortSignal,
        modelSettings,
    } = params;

    // Resolve the main model ID for tools that need it (web search/fetch)
    const mainModelId = modelSettings ? resolveMainModelId(modelSettings) : undefined;
    const mainModelIsCustom = !!modelSettings?.mainModelCustomId;

    const getWrappedExecute = <T extends (...args: any[]) => Promise<ToolResult>>(
        toolName: string,
        execute: T,
        persistResult = true
    ): T => createToolExecutionPipeline(
        execute,
        {
            mode,
            toolName,
            projectPath,
            sessionId,
            sessionDir,
            persistResult,
        }
    );

    // Shared set tracking files read in this session (for write tool's read-before-write guard)
    const readFiles = new Set<string>();

    const allTools = {
        // File Operations (6 tools)
        [FILE_WRITE_TOOL_NAME]: createWriteTool(
            getWrappedExecute(FILE_WRITE_TOOL_NAME, createWriteExecute(projectPath, modifiedFiles, undoCheckpointManager, readFiles))
        ),
        [FILE_READ_TOOL_NAME]: createReadTool(
            getWrappedExecute(FILE_READ_TOOL_NAME, createReadExecute(projectPath, readFiles)),
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
        [CONTEXT_TOOL_NAME]: createContextTool(
            getWrappedExecute(CONTEXT_TOOL_NAME, createContextExecute(projectPath), false)
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
        [BUILD_AND_DEPLOY_TOOL_NAME]: createBuildAndDeployTool(
            getWrappedExecute(
                BUILD_AND_DEPLOY_TOOL_NAME,
                createBuildAndDeployExecute(projectPath, sessionDir, abortSignal)
            )
        ),
        [SERVER_MANAGEMENT_TOOL_NAME]: createServerManagementTool(
            getWrappedExecute(
                SERVER_MANAGEMENT_TOOL_NAME,
                createServerManagementExecute(projectPath, sessionDir, abortSignal)
            )
        ),

        // Plan Mode Tools (5 tools)
        [SUBAGENT_TOOL_NAME]: createSubagentTool(
            getWrappedExecute(SUBAGENT_TOOL_NAME, createSubagentExecute(projectPath, sessionId, getAnthropicClient, abortSignal, modelSettings))
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
            getWrappedExecute(WEB_SEARCH_TOOL_NAME, createWebSearchExecute(
                getAnthropicClient,
                eventHandler,
                pendingApprovals,
                webAccessPreapproved,
                sessionId,
                mainModelId,
                mainModelIsCustom
            ))
        ),
        [WEB_FETCH_TOOL_NAME]: createWebFetchTool(
            getWrappedExecute(WEB_FETCH_TOOL_NAME, createWebFetchExecute(
                getAnthropicClient,
                eventHandler,
                pendingApprovals,
                webAccessPreapproved,
                sessionId,
                mainModelId,
                mainModelIsCustom
            ))
        ),

        // Log Tools (1 tool)
        [READ_SERVER_LOGS_TOOL_NAME]: createReadServerLogsTool(
            getWrappedExecute(READ_SERVER_LOGS_TOOL_NAME, createReadServerLogsExecute(projectPath))
        ),

        // Shell Tools (3 tools)
        [BASH_TOOL_NAME]: createBashTool(
            getWrappedExecute(BASH_TOOL_NAME, createBashExecute(
                projectPath,
                eventHandler,
                pendingApprovals,
                shellApprovalRuleStore,
                sessionId,
                abortSignal,
                undoCheckpointManager
            ))
        ),
        [KILL_TASK_TOOL_NAME]: createKillTaskTool(
            getWrappedExecute(KILL_TASK_TOOL_NAME, createKillTaskExecute())
        ),
        [TASK_OUTPUT_TOOL_NAME]: createTaskOutputTool(
            getWrappedExecute(TASK_OUTPUT_TOOL_NAME, createTaskOutputExecute())
        ),

        // Tool Search (local — returns tool-reference blocks for deferred tool discovery)
        [TOOL_LOAD_TOOL_NAME]: createToolSearchTool(),
    };

    // Mark deferred tools — schemas hidden from initial prompt, loaded on-demand
    // via tool_search returning tool-reference content blocks.
    for (const [toolName, toolDef] of Object.entries(allTools)) {
        if (DEFERRED_TOOLS.has(toolName)) {
            (toolDef as any).providerOptions = {
                anthropic: { deferLoading: true },
            };
        }
    }

    // All modes return the same tools. Mode restrictions (Ask = read-only,
    // Plan = plan-file-only mutations) are enforced at execution level by
    // the execution pipeline, not by filtering the tool set.
    return allTools;
}
