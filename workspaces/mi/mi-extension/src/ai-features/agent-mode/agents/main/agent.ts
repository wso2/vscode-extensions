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

// ============================================================================
// Dev Feature Flags
// ============================================================================
export const ENABLE_LANGFUSE = false; // Set to false to disable Langfuse tracing
export const ENABLE_DEVTOOLS = false; // Set to true to enable AI SDK DevTools (local development only!)
export const ENABLE_NATIVE_COMPACTION = true; // Set to true to enable Anthropic native server-side compaction (auto-summarizes when context grows large)

// Native compaction trigger threshold in tokens.
// When input tokens exceed this value, the API auto-compacts the conversation.
// Must be at least 50,000. Default Anthropic value is 150,000.
const NATIVE_COMPACTION_TRIGGER_TOKENS = 200000;

import { ModelMessage, streamText, stepCountIs, UserModelMessage, SystemModelMessage, wrapLanguageModel } from 'ai';
import { AnthropicProviderOptions } from '@ai-sdk/anthropic';
import { getAnthropicClient, getAnthropicClientForCustomModel, getAnthropicProvider, AnthropicModel, resolveMainModelId } from '../../../connection';
import { getLoginMethod, getTavilyApiKey } from '../../../auth';
import { getSystemPrompt } from '../main/system';
import {
    BlockInjectionStatus,
    BlockInjectionStatuses,
    computeSessionContextBlockHashes,
    getUserPrompt,
    SessionContextBlockHashes,
    UserPromptContentBlock,
    UserPromptParams,
} from './prompt';
import { addCacheControlToMessages } from '../../../cache-utils';
import { buildMessageContent } from '../../attachment-utils';
import { COMPACT_SYSTEM_REMINDER_AUTO_TRIGGERED } from '../compact/prompt';

import {
    PendingQuestion,
    PendingPlanApproval,
} from '../../tools/plan_mode_tools';
import { getRuntimeVersionFromPom } from '../../tools/connector_store_cache';
import {
    createAgentTools,
    FILE_WRITE_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
    CONTEXT_TOOL_NAME,
    MANAGE_CONNECTOR_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    CREATE_DATA_MAPPER_TOOL_NAME,
    GENERATE_DATA_MAPPING_TOOL_NAME,
    BUILD_AND_DEPLOY_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    BASH_TOOL_NAME,
    KILL_TASK_TOOL_NAME,
    WEB_SEARCH_TOOL_NAME,
    WEB_FETCH_TOOL_NAME,
    DEEPWIKI_ASK_QUESTION_TOOL_NAME,
} from './tools';
import { logInfo, logError, logDebug } from '../../../copilot/logger';
import { ChatHistoryManager, SessionContextBlocksState, TOOL_USE_INTERRUPTION_CONTEXT } from '../../chat-history-manager';
import { getToolAction } from '../../tool-action-mapper';
import { AgentUndoCheckpointManager } from '../../undo/checkpoint-manager';
import { getCopilotSessionDir } from '../../storage-paths';
import { ShellApprovalRuleStore } from '../../tools/types';
import { WebToolsProvider } from '../../tools/web_tools';
import {
    awaitWithTimeout,
    createProxyTerminatedError,
    createStreamWatchdog,
    DEFAULT_FINAL_RESPONSE_WAIT_TIMEOUT_MS,
    DEFAULT_STREAM_IDLE_TIMEOUT_MS,
    DEFAULT_STREAM_TOTAL_TIMEOUT_MS,
    getErrorDiagnostics,
    getErrorMessage,
    isProxyTerminatedStreamError,
    isStreamTimeoutError,
    StreamWatchdog,
} from '../../stream_guard';

// Import types from mi-core (shared with visualizer)
import { AgentEvent, AgentEventType, FileObject, ImageObject, AgentMode, LoginMethod, ModelSettings } from '@wso2/mi-core';

// Re-export types for other modules that import from agent.ts
export type { AgentEvent, AgentEventType };

const AGENT_EXECUTION_CONFIG = {
    // Upper bound for tool/model iterations in a single streamText run.
    maxSteps: 50,
    // Prevents very large single responses while allowing continuation.
    maxOutputTokens: 15000,
    // Stream watchdog defaults are centralized here for easy tuning.
    streamIdleTimeoutMs: DEFAULT_STREAM_IDLE_TIMEOUT_MS,
    streamTotalTimeoutMs: DEFAULT_STREAM_TOTAL_TIMEOUT_MS,
    finalResponseWaitTimeoutMs: DEFAULT_FINAL_RESPONSE_WAIT_TIMEOUT_MS,
} as const;

/**
 * Event handler function type
 */
export type AgentEventHandler = (event: AgentEvent) => void;

/**
 * Request parameters for agent execution
 */
export interface AgentRequest {
    /** User's query/requirement */
    query: string;
    /** Stable UI chat id for this user turn */
    chatId?: number;
    /** Agent mode: ask (read-only), plan (planning read-only), or edit (full tool access) */
    mode?: AgentMode;
    /** Optional file attachments (text/PDF) */
    files?: FileObject[];
    /** Optional image attachments */
    images?: ImageObject[];
    /** Enable Claude thinking mode (reasoning blocks) */
    thinking?: boolean;
    /** Path to the MI project */
    projectPath: string;
    /** Map of file path to content for relevant existing code (optional, for future use) */
    existingCode?: Map<string, string>;
    /** Session ID for loading chat history */
    sessionId?: string;
    /** Abort signal for cancellation */
    abortSignal?: AbortSignal;
    /** Chat history manager for recording conversation (managed by RPC layer) */
    chatHistoryManager?: ChatHistoryManager;
    /** Pending questions map for ask_user tool (shared with RPC layer) */
    pendingQuestions?: Map<string, PendingQuestion>;
    /** Pending plan approvals map for exit_plan_mode tool (shared with RPC layer) */
    pendingApprovals?: Map<string, PendingPlanApproval>;
    /** Session-scoped shell approval rule store */
    shellApprovalRuleStore?: ShellApprovalRuleStore;
    /** Optional checkpoint manager for undo support */
    undoCheckpointManager?: AgentUndoCheckpointManager;
    /** Model settings for this session (main model + sub-agent model overrides) */
    modelSettings?: ModelSettings;
    /** Called after a stream step is persisted to JSONL history */
    onStepPersisted?: () => void;
}

/**
 * Result of agent execution
 */
export interface AgentResult {
    /** Whether execution completed successfully */
    success: boolean;
    /** List of files modified during execution */
    modifiedFiles: string[];
    /** Error message if failed */
    error?: string;
    /** Full AI SDK messages from this turn (includes tool calls/results) */
    modelMessages?: any[];
    /** True when the run ended due to model limits (step/token) and should be continued in a new run */
    continuationSuggested?: boolean;
    /** Normalized stop reason when continuation is suggested */
    continuationReason?: 'max_output_tokens' | 'max_tool_calls';
}

type ContinuationReason = 'max_output_tokens' | 'max_tool_calls';
type AgentExecutionErrorKind =
    | 'tool_interruption'
    | 'user_abort'
    | 'timeout'
    | 'proxy_terminated'
    | 'model_error'
    | 'unknown';

interface ClassifiedAgentExecutionError {
    kind: AgentExecutionErrorKind;
    rawMessage: string;
}

interface NormalizedToolResultForUi {
    success: boolean;
    message?: string;
    stdout?: string;
    stderr?: string;
    exitCode?: number | null;
    taskId?: string;
    [key: string]: unknown;
}

/**
 * Compare a per-block tracking value against its persisted predecessor and
 * decide what to render. `omit`: same as last turn — skip rendering.
 * `first-injection`: never injected before (or full re-prime needed) — render
 * without notice. `re-injection`: value drifted — render with a
 * "[context updated]" notice. `cleared`: was injected before but is now
 * absent (e.g. payloads removed by the user) — render an explicit removal
 * notice and clear the persisted hash so future injections start fresh.
 */
function decideBlockStatus(
    current: string | undefined,
    previous: string | undefined,
    forceFirstInjection: boolean,
): BlockInjectionStatus {
    if (current === undefined) {
        // Was injected on a prior turn but absent now — emit a removal notice
        // so the model doesn't keep referencing the stale prior-turn block.
        // First-message / post-compaction wipes prior context, so 'omit' there.
        if (previous !== undefined && !forceFirstInjection) {
            return 'cleared';
        }
        return 'omit';
    }
    if (forceFirstInjection || previous === undefined) {
        return 'first-injection';
    }
    return previous === current ? 'omit' : 're-injection';
}

/**
 * Merge the current per-block hashes into the persisted state, but only for
 * blocks we're about to inject this turn. Returns `undefined` when no block
 * needs persisting (avoids a no-op metadata write).
 */
function buildUpdatedBlocksState(
    previous: SessionContextBlocksState,
    current: SessionContextBlockHashes,
    statuses: BlockInjectionStatuses,
): SessionContextBlocksState | undefined {
    const updated: SessionContextBlocksState = { ...previous };
    let touched = false;
    // 'cleared' wipes the persisted hash so the next non-empty injection
    // counts as 'first-injection' rather than 're-injection'. In practice
    // only payloads can be cleared (other blocks always have a current hash),
    // but applying uniformly keeps the semantics consistent.
    const apply = <K extends keyof SessionContextBlocksState>(
        key: K,
        status: BlockInjectionStatus,
        nextHash: SessionContextBlocksState[K] | undefined,
    ): void => {
        if (status === 'cleared') {
            updated[key] = undefined as SessionContextBlocksState[K];
            touched = true;
        } else if (status !== 'omit') {
            updated[key] = nextHash as SessionContextBlocksState[K];
            touched = true;
        }
    };
    apply('env', statuses.env, current.env);
    apply('connectors', statuses.connectors, current.connectors);
    apply('webAvailability', statuses.webAvailability, current.webAvailability);
    apply('modePolicy', statuses.modePolicy, current.modePolicy);
    apply('payloads', statuses.payloads, current.payloads);
    return touched ? updated : undefined;
}

function logBlockInjectionDrift(
    statuses: BlockInjectionStatuses,
    previous: SessionContextBlocksState,
    current: SessionContextBlockHashes,
): void {
    const driftedBlocks: string[] = [];
    const note = (
        name: string,
        status: BlockInjectionStatus,
        prev: string | undefined,
        next: string | undefined,
    ): void => {
        if (status === 're-injection') {
            driftedBlocks.push(`${name}(${prev}→${next})`);
        } else if (status === 'cleared') {
            driftedBlocks.push(`${name}(${prev}→cleared)`);
        }
    };
    note('env', statuses.env, previous.env, current.env);
    note('connectors', statuses.connectors, previous.connectors, current.connectors);
    note('webAvailability', statuses.webAvailability, previous.webAvailability, current.webAvailability);
    note('mode', statuses.modePolicy, previous.modePolicy, current.modePolicy);
    note('payloads', statuses.payloads, previous.payloads, current.payloads);
    if (driftedBlocks.length > 0) {
        logInfo(`[Agent] Session-context drift — re-injecting: ${driftedBlocks.join(', ')}`);
    }
}

const TOOL_INTERRUPTION_ERROR_CODE = 'AGENT_TOOL_INTERRUPTION';
const MODEL_ERROR_PATTERN = /model.*not found|invalid.*model|unknown model|could not resolve model|model.*deprecated|model.*not available|model.*does not exist|model.*decommissioned/i;

function getStructuredErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
        return undefined;
    }

    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' || typeof code === 'number') {
        return String(code);
    }

    return undefined;
}

function getStructuredErrorName(error: unknown): string | undefined {
    if (error instanceof Error) {
        return error.name;
    }

    if (!error || typeof error !== 'object') {
        return undefined;
    }

    const name = (error as { name?: unknown }).name;
    return typeof name === 'string' ? name : undefined;
}

export function isToolInterruptionAbortError(error: unknown): boolean {
    if (!error) {
        return false;
    }

    const code = getStructuredErrorCode(error);
    if (code === TOOL_INTERRUPTION_ERROR_CODE) {
        return true;
    }

    const name = getStructuredErrorName(error);
    if (name === 'ToolInterruptionError') {
        return true;
    }

    return getErrorMessage(error).includes(TOOL_USE_INTERRUPTION_CONTEXT);
}

function isLikelyModelError(error: unknown, errorMsg: string): boolean {
    if (MODEL_ERROR_PATTERN.test(errorMsg)) {
        return true;
    }

    const status = (error as { status?: unknown } | undefined)?.status;
    return (
        status === 400 && /model/i.test(errorMsg)
    ) || (
        status === 404 && /model/i.test(errorMsg)
    );
}

function classifyAgentExecutionError(params: {
    error: unknown;
    abortReason: unknown;
    userAbortRequested: boolean;
    requestAbortSignalAborted: boolean;
}): ClassifiedAgentExecutionError {
    const rawMessage = getErrorMessage(params.error);
    const abortReasonMessage = getErrorMessage(params.abortReason);

    if (isStreamTimeoutError(params.error) || isStreamTimeoutError(params.abortReason)) {
        return { kind: 'timeout', rawMessage };
    }

    if (isProxyTerminatedStreamError(rawMessage) || isProxyTerminatedStreamError(abortReasonMessage)) {
        return { kind: 'proxy_terminated', rawMessage };
    }

    if (isToolInterruptionAbortError(params.error) || isToolInterruptionAbortError(params.abortReason)) {
        return { kind: 'tool_interruption', rawMessage };
    }

    if (params.userAbortRequested || params.requestAbortSignalAborted) {
        return { kind: 'user_abort', rawMessage };
    }

    if (isLikelyModelError(params.error, rawMessage)) {
        return { kind: 'model_error', rawMessage };
    }

    return { kind: 'unknown', rawMessage };
}

function tryParseJson(str: string): Record<string, unknown> {
    try {
        const parsed = JSON.parse(str);
        return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function normalizeToolResultForUi(toolName: string, result: unknown): NormalizedToolResultForUi {
    if (!result || typeof result !== 'object') {
        logError(`[Agent] Tool '${toolName}' returned non-object result`, result);
        return {
            success: false,
            message: `Tool '${toolName}' returned an invalid result shape.`,
        };
    }

    const record = result as Record<string, unknown>;

    // Provider-managed tools (tool_search, memory) return non-standard shapes
    // (e.g. { type: "json", value: [...] }) without a 'success' field.
    // Treat these as successful unless they contain an explicit error.
    if (typeof record.success !== 'boolean') {
        const hasError = typeof record.error === 'string' || record.type === 'error';
        return {
            ...record,
            success: !hasError,
        };
    }

    return {
        ...record,
        success: record.success,
    };
}

function normalizeFinishReason(finishPart: unknown): string | undefined {
    const part = finishPart as Record<string, unknown> | undefined;
    const candidates = [
        part?.finishReason,
        part?.finish_reason,
        part?.stopReason,
        part?.stop_reason,
        part?.reason,
    ];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.trim().toLowerCase();
        }
    }
    return undefined;
}

function getContinuationReasonFromFinish(finishReason?: string): ContinuationReason | undefined {
    if (!finishReason) {
        return undefined;
    }

    const reason = finishReason.toLowerCase();
    if (
        reason.includes('tool') ||
        reason.includes('step') ||
        reason.includes('max_steps') ||
        reason.includes('stepcount')
    ) {
        return 'max_tool_calls';
    }

    if (
        reason.includes('length') ||
        reason.includes('token') ||
        reason.includes('max_tokens') ||
        reason.includes('output')
    ) {
        return 'max_output_tokens';
    }

    return undefined;
}

/**
 * Strip <analysis> COT from compaction blocks in a messages array.
 * Replaces the raw compaction content (analysis + summary) with just the cleaned summary.
 * Mutates the messages in-place and returns the same array.
 */
function stripAnalysisFromCompactionBlocks(messages: any[], cleanedSummary: string): any[] {
    for (const msg of messages) {
        if (msg.role !== 'assistant' || !Array.isArray(msg.content)) {
            continue;
        }
        for (const block of msg.content) {
            if (block.type === 'compaction' && typeof block.content === 'string') {
                block.content = cleanedSummary;
            }
        }
    }
    return messages;
}

// ============================================================================
// Agent Core
// ============================================================================

/**
 * Creates and executes the MI design agent
 */
export async function executeAgent(
    request: AgentRequest,
    eventHandler: AgentEventHandler
): Promise<AgentResult> {
    const modifiedFiles: string[] = [];
    let finalModelMessages: any[] = [];
    let response: any = null; // Store response promise for later access
    let accumulatedContent: string = ''; // Accumulate assistant response content
    let isExecutingTool = false; // Track if we're currently executing a tool (for interruption message)
    let cleanupStreamLifecycle: (() => void) | undefined;
    let streamWatchdog: StreamWatchdog | undefined;
    let pauseIdleTimeout = false;
    let touchStreamActivity: () => void = () => undefined;
    let finalResponseWaitTimeoutMs = AGENT_EXECUTION_CONFIG.finalResponseWaitTimeoutMs;

    const emitEvent = (event: AgentEvent) => {
        const eventType = (event as { type?: string })?.type;
        if (eventType === 'ask_user' || eventType === 'plan_approval_requested') {
            pauseIdleTimeout = true;
        } else {
            pauseIdleTimeout = false;
        }

        touchStreamActivity();
        eventHandler(event);
    };

    // Use provided pendingQuestions map or create a new one
    const pendingQuestions = request.pendingQuestions || new Map<string, PendingQuestion>();

    // Use provided pendingApprovals map or create a new one (for exit_plan_mode approval)
    const pendingApprovals = request.pendingApprovals || new Map<string, PendingPlanApproval>();
    
    // Session ID for plan mode (defaults to 'default')
    const sessionId = request.sessionId || 'default';

    // Session directory for output files (build.txt, run.txt)
    const sessionDir = getCopilotSessionDir(request.projectPath, sessionId);

    // Declared outside the try so the catch path can also flush open thinking
    // blocks (errors / aborts mid-stream would otherwise leave the UI's
    // <thinking data-loading="true"> spinner stuck forever).
    const reasoningById = new Map<string, string>();
    const flushOpenThinkingBlocks = (): void => {
        if (reasoningById.size === 0) {
            return;
        }
        for (const id of reasoningById.keys()) {
            emitEvent({ type: 'thinking_end', thinkingId: id });
        }
        reasoningById.clear();
    };

    try {
        logInfo(`[Agent] Starting agent execution for project: ${request.projectPath}`);

        // Load chat history (reads from JSONL)
        let chatHistory: ModelMessage[] = [];
        if (request.chatHistoryManager) {
            chatHistory = await request.chatHistoryManager.getMessages();
            logInfo(`[Agent] Loaded ${chatHistory.length} messages from history`);
        }

        const runtimeVersion = await getRuntimeVersionFromPom(request.projectPath);
        logInfo(`[Agent] Runtime version detected: ${runtimeVersion ?? 'unknown'}`);
        const systemPromptSelection = getSystemPrompt(runtimeVersion);

        // System message (cache control will be added dynamically by prepareStep)
        // Adding a cache block here because tools + system would be same for all users who use our proxy.
        // 1h TTL: system prompt is stable per-session; via proxy it's cross-user-warm (shared org),
        // and for own-key users it survives idle/thinking gaps >5m. Cache write costs 2× base (vs 1.25× for 5m).
        const systemMessage: SystemModelMessage = {
            role: 'system',
            content: systemPromptSelection.prompt,
            providerOptions: {
                anthropic: {
                    cacheControl: { type: 'ephemeral', ttl: '1h' }
                }
            }
        } as SystemModelMessage;

        // Resolve the web-tool provider once for this turn.
        // - Anthropic/Proxy paths get Anthropic's first-party server tools registered
        //   directly on the main streamText call (no wrapper, no extra LLM round-trip).
        // - Bedrock + Tavily key gets the Tavily-backed local tool.
        // - Bedrock + no key omits the tools and relies on the `web_search_unavailable`
        //   system reminder to steer the model away.
        const loginMethod = await getLoginMethod();
        const isBedrock = loginMethod === LoginMethod.AWS_BEDROCK;
        const tavilyKey = isBedrock ? (await getTavilyApiKey()) : null;
        const webSearchUnavailable = isBedrock && !tavilyKey;
        const webToolsProvider: WebToolsProvider =
            isBedrock ? (tavilyKey ? 'tavily-local' : 'none') : 'anthropic-server';
        const anthropicProviderForWebTools =
            webToolsProvider === 'anthropic-server' ? await getAnthropicProvider() : undefined;

        // Per-block re-injection decision. For each tracked block (env, connectors,
        // web availability, mode policy, payloads) compute a current hash, compare
        // to the value persisted on session metadata, and decide:
        //   - 'omit'            : block is unchanged, skip rendering it
        //   - 'first-injection' : never injected before (or full re-prime needed),
        //                         render without a "[context updated]" notice
        //   - 're-injection'    : value drifted, render with a notice so the model
        //                         knows something changed
        // First message and post-compaction force first-injection on every block —
        // model has lost prior context so we re-prime everything without notices.
        const isFirstMessage = chatHistory.length === 0;
        const isPostCompaction = chatHistory.length > 0
            && (chatHistory[0] as any)?._compactSynthetic === true;
        const forceFirstInjection = isFirstMessage || isPostCompaction;

        const sessionContextResult = await computeSessionContextBlockHashes({
            projectPath: request.projectPath,
            runtimeVersion,
            webSearchUnavailable,
            loginMethod,
            mode: request.mode || 'edit',
        });
        const currentBlockHashes = sessionContextResult.hashes;
        const sessionMetadata = request.chatHistoryManager
            ? await request.chatHistoryManager.loadMetadata()
            : null;
        const previousBlocks = sessionMetadata?.sessionContextBlocks ?? {};

        const blockStatuses: BlockInjectionStatuses = {
            env: decideBlockStatus(currentBlockHashes.env, previousBlocks.env, forceFirstInjection),
            connectors: decideBlockStatus(currentBlockHashes.connectors, previousBlocks.connectors, forceFirstInjection),
            webAvailability: decideBlockStatus(currentBlockHashes.webAvailability, previousBlocks.webAvailability, forceFirstInjection),
            modePolicy: decideBlockStatus(currentBlockHashes.modePolicy, previousBlocks.modePolicy, forceFirstInjection),
            payloads: decideBlockStatus(currentBlockHashes.payloads, previousBlocks.payloads, forceFirstInjection),
        };
        const previousMode = previousBlocks.modePolicy as AgentMode | undefined;

        // Persist the new hashes for any block we're about to inject. Eagerly:
        // a crash between persist and the request reaching the model means the
        // next turn skips injection — same failure mode as the original
        // first-message-only behavior, so no regression vs prior behavior.
        const updatedBlocks = buildUpdatedBlocksState(previousBlocks, currentBlockHashes, blockStatuses);
        if (updatedBlocks && request.chatHistoryManager) {
            await request.chatHistoryManager.updateMetadata({ sessionContextBlocks: updatedBlocks });
            logBlockInjectionDrift(blockStatuses, previousBlocks, currentBlockHashes);
        }

        // Build user prompt — pass the pre-built sessionContextResult so
        // getUserPrompt skips the second pass of pom.xml read, .git/HEAD read,
        // and connector-store catalog lookup.
        const userPromptParams: UserPromptParams = {
            query: request.query,
            mode: request.mode || 'edit',
            projectPath: request.projectPath,
            sessionId,
            runtimeVersion,
            runtimeVersionDetected: systemPromptSelection.runtimeVersionDetected,
            webSearchUnavailable,
            loginMethod,
            blockStatuses,
            previousMode,
            precomputedContext: sessionContextResult,
        };
        const userPromptBlocks = await getUserPrompt(userPromptParams);

        const hasFiles = request.files && request.files.length > 0;
        const hasImages = request.images && request.images.length > 0;

        if (hasFiles || hasImages) {
            logInfo(`[Agent] Including ${request.files?.length || 0} files and ${request.images?.length || 0} images in user message`);
        }

        // Build user message content blocks.
        // Attachments (files/images) are prepended, then prompt blocks follow
        // (ordered stable → volatile, user query last).
        const userMessage: UserModelMessage = {
            role: 'user',
            content: (hasFiles || hasImages)
                ? buildMessageContent(userPromptBlocks, request.files, request.images)
                : userPromptBlocks
        } as UserModelMessage;

        // Build messages array
        const allMessages: ModelMessage[] = [
            systemMessage,
            ...chatHistory,
            userMessage
        ];

        // Save user message to history
        if (request.chatHistoryManager) {
            await request.chatHistoryManager.saveMessage(userMessage, {
                chatId: request.chatId,
                attachmentMetadata: (hasFiles || hasImages)
                    ? {
                        files: request.files?.map((file) => ({
                            name: file.name,
                            mimetype: file.mimetype,
                        })),
                        images: request.images?.map((image) => ({
                            imageName: image.imageName,
                        })),
                    }
                    : undefined,
            });
        }

        // Track how many messages have been saved from step.response.messages
        // This counter tracks messages from the current turn only (not history)
        let savedMessageCount = 0;

        // Setup stream watchdog and timeout controls (fixed constants)
        // Created before tools so that subagents and background tasks inherit
        // the effective abort signal (user abort + stream timeouts).
        const idleTimeoutMs = AGENT_EXECUTION_CONFIG.streamIdleTimeoutMs;
        const totalTimeoutMs = AGENT_EXECUTION_CONFIG.streamTotalTimeoutMs;
        finalResponseWaitTimeoutMs = AGENT_EXECUTION_CONFIG.finalResponseWaitTimeoutMs;
        streamWatchdog = createStreamWatchdog({
            requestAbortSignal: request.abortSignal,
            idleTimeoutMs,
            totalTimeoutMs,
            shouldPauseIdleTimeout: () => pauseIdleTimeout || isExecutingTool,
            onTimeout: (kind, timeoutError) => {
                const timeoutLabel = kind === 'idle' ? 'idle' : 'total';
                logError(`[Agent] Stream ${timeoutLabel} timeout reached`, timeoutError);
            },
        });

        touchStreamActivity = () => {
            streamWatchdog?.markActivity();
        };

        // Create tools with the watchdog's abort signal so subagents and
        // background tasks are cancelled on both user abort and stream timeout.
        const tools = createAgentTools({
            projectPath: request.projectPath,
            mode: request.mode || 'edit',
            modifiedFiles,
            sessionId,
            sessionDir,
            eventHandler: emitEvent,
            pendingQuestions,
            pendingApprovals,
            getAnthropicClient,
            webToolsProvider,
            anthropicProvider: anthropicProviderForWebTools,
            tavilyApiKey: tavilyKey || undefined,
            shellApprovalRuleStore: request.shellApprovalRuleStore,
            undoCheckpointManager: request.undoCheckpointManager,
            abortSignal: streamWatchdog.abortSignal,
            modelSettings: request.modelSettings,
        });

        const finalTools: any = tools;

        // Track step number for logging
        let currentStepNumber = 0;

        // Get the model for prepareStep — resolve from model settings or default to Sonnet
        const mainModelId = resolveMainModelId(request.modelSettings || { mainModelPreset: 'sonnet' });
        let model = request.modelSettings?.mainModelCustomId
            ? await getAnthropicClientForCustomModel(mainModelId)
            : await getAnthropicClient(mainModelId as AnthropicModel);

        // Wrap model with DevTools middleware if enabled (local development only!)
        // IMPORTANT: DevTools must be imported AFTER process.chdir() because it captures
        // process.cwd() at module load time. Dynamic import ensures it sees the correct path.
        if (ENABLE_DEVTOOLS) {
            const originalCwd = process.cwd();
            const nodeEnvKey = 'NODE_ENV';
            const envVars = process.env as Record<string, string | undefined>;
            const originalNodeEnv = envVars[nodeEnvKey];
            process.chdir(request.projectPath);
            envVars[nodeEnvKey] = 'development'; // DevTools throws in production
            const { devToolsMiddleware } = await import('@ai-sdk/devtools');
            model = wrapLanguageModel({
                model,
                middleware: devToolsMiddleware() as any,
            });
            envVars[nodeEnvKey] = originalNodeEnv;
            process.chdir(originalCwd);
        }

        // prepareStep runs before each API call.
        // 1. Fixes tool_use inputs cleared by context management (must be valid dicts)
        // 2. Strips <analysis> COT from native compaction blocks (saves tokens on subsequent steps)
        // 3. Marks the last message for prompt caching
        const prepareStep = ({ messages }: { messages: any[] }) => {
            // Fix tool_use/tool-call blocks whose input is not a valid dictionary.
            // The API requires tool_use.input to be an object, but inputs can be
            // strings/null after context management clearing, or for MCP/provider-executed
            // tools where the SDK stores input as JSON.stringify(part.input).
            // Handles AI SDK format (tool-call + args/input) and raw API format (tool_use + input).
            for (const msg of messages) {
                if (msg.role === 'assistant' && Array.isArray(msg.content)) {
                    for (const part of msg.content) {
                        if (part.type === 'tool_use' && (typeof part.input !== 'object' || part.input === null || Array.isArray(part.input))) {
                            part.input = typeof part.input === 'string' ? tryParseJson(part.input) : {};
                        }
                        if (part.type === 'tool-call') {
                            if (typeof part.args !== 'object' || part.args === null || Array.isArray(part.args)) {
                                part.args = typeof part.args === 'string' ? tryParseJson(part.args) : {};
                            }
                            // MCP/provider-executed tools store input as JSON string
                            if (typeof part.input === 'string') {
                                part.input = tryParseJson(part.input);
                            }
                        }
                    }
                }
            }

            // Strip analysis from compaction blocks before sending to API
            if (cleanedCompactionSummary) {
                stripAnalysisFromCompactionBlocks(messages, cleanedCompactionSummary);
            }
            return {
                messages: addCacheControlToMessages({ messages, model })
            };
        };

        // Configure Anthropic provider options.
        // - `adaptive` lets the model decide whether to think per step.
        // - `effort: 'low'` biases adaptive toward skipping for simple steps.
        // - `display: 'summarized'` is required on Opus 4.7 (default changed to
        //   'omitted' there) to actually surface reasoning text to the UI;
        //   harmless on Sonnet which already defaults to summarized.
        const anthropicOptions: AnthropicProviderOptions = request.thinking
            ? { thinking: { type: 'adaptive', display: 'summarized' } as any, effort: 'low' }
            : {};

        // Native server-side compaction: Anthropic auto-summarizes the conversation
        // when input tokens exceed the trigger threshold. The compaction block is
        // emitted inline in the stream and on subsequent requests the API drops all
        // messages before the compaction block automatically.
        if (ENABLE_NATIVE_COMPACTION) {
            (anthropicOptions as any).contextManagement = {
                edits: [{
                    type: 'compact_20260112',
                    trigger: {
                        type: 'input_tokens',
                        value: NATIVE_COMPACTION_TRIGGER_TOKENS,
                    },
                    // Reuse the same detailed compaction prompt as our custom Compact agent.
                    // The prompt instructs the model to output <analysis>...</analysis> then
                    // <summary>...</summary>. We extract only the <summary> content in
                    // flushNativeCompaction().
                    instructions: COMPACT_SYSTEM_REMINDER_AUTO_TRIGGERED,
                }],
            };
        }

        // Bedrock InvokeModel rejects `defer_loading` on `type: "custom"` tools unless the
        // tool-search beta is set (the SDK auto-adds it only when a server-side tool_search
        // tool is in the tools array, which we don't use). On direct Anthropic the header is
        // a no-op for custom-tool defer_loading, so we add it unconditionally on Bedrock.
        const betaHeaders = [
            ...(request.thinking ? ['interleaved-thinking-2025-05-14'] : []),
            ...(ENABLE_NATIVE_COMPACTION ? ['compact-2026-01-12'] : []),
            ...(isBedrock ? ['tool-search-tool-2025-10-19'] : []),
        ];
    const requestHeaders = betaHeaders.length > 0
        ? { 'anthropic-beta': betaHeaders.join(',') }
        : undefined;
        cleanupStreamLifecycle = () => {
            streamWatchdog?.cleanup();
        };

        const streamConfig: any = {
            model,
            maxOutputTokens: AGENT_EXECUTION_CONFIG.maxOutputTokens,
            temperature: request.thinking ? undefined : 0,
            messages: allMessages,
            stopWhen: stepCountIs(AGENT_EXECUTION_CONFIG.maxSteps),
            tools: finalTools,
            abortSignal: streamWatchdog.abortSignal,
            headers: requestHeaders,
            providerOptions: {
                anthropic: {
                    ...anthropicOptions,
                },
            },
            prepareStep,
            onAbort: () => {
                logInfo('[Agent] streamText aborted');
            },
            onError: (error: unknown) => {
                const errorMsg = getErrorMessage(error);
                logError(`[Agent] streamText error: ${errorMsg}`, error);
                logDebug(`[Agent] streamText error diagnostics: ${getErrorDiagnostics(error)}`);
                if (streamWatchdog && !streamWatchdog.abortSignal.aborted) {
                    const abortReason = error instanceof Error
                        ? error
                        : new Error(errorMsg);
                    streamWatchdog.abort(abortReason);
                }
            },
            onStepFinish: async (step) => {
                touchStreamActivity();
                currentStepNumber++;
                let stepPersisted = true;

                // Simple cache metrics logging
                if (step.usage) {
                    const inputTokens = step.usage.inputTokens || 0;
                    const cachedInputTokens = step.usage.cachedInputTokens || 0;
                    const outputTokens = step.usage.outputTokens || 0;

                    logDebug(`[Cache] Step ${currentStepNumber} | ` +
                        `Input: ${inputTokens} | Cache Read: ${cachedInputTokens} | ` +
                        `Output: ${outputTokens} | Cache ratio: ${inputTokens > 0 ? (cachedInputTokens / (inputTokens + cachedInputTokens) * 100).toFixed(1) : '0'}%`);

                    // Emit usage event to UI.
                    // AI SDK v6: step.usage.inputTokens is the total (noCache + cacheRead + cacheWrite).
                    // Do NOT add cachedInputTokens — it's a deprecated alias for cacheReadTokens and would double-count.
                    emitEvent({ type: 'usage', totalInputTokens: inputTokens });
                }

                // Save only unsaved messages from this step
                // Usage metadata is attached to the last message entry in the JSONL
                if (request.chatHistoryManager && step.response?.messages) {
                    try {
                        const unsavedMessages = step.response.messages.slice(savedMessageCount);

                        // Strip <analysis> COT from any compaction blocks before persisting to JSONL.
                        // This ensures reloaded sessions don't waste tokens on analysis text.
                        if (cleanedCompactionSummary) {
                            stripAnalysisFromCompactionBlocks(unsavedMessages, cleanedCompactionSummary);
                        }

                        if (unsavedMessages.length > 0) {
                            const totalInputTokens = step.usage?.inputTokens;
                            await request.chatHistoryManager.saveMessages(
                                unsavedMessages,
                                totalInputTokens !== undefined
                                    ? { totalInputTokens, chatId: request.chatId }
                                    : { chatId: request.chatId }
                            );
                            savedMessageCount += unsavedMessages.length;
                        }
                        stepPersisted = true;
                    } catch (error) {
                        logError('[Agent] Failed to save messages from step', error);
                        stepPersisted = false;
                    }
                }

                if (stepPersisted) {
                    request.onStepPersisted?.();
                }
            },
        };

        // Enable Langfuse telemetry if flag is on
        if (ENABLE_LANGFUSE) {
            streamConfig.experimental_telemetry = { isEnabled: true };
            logInfo('[Langfuse] Telemetry enabled - traces will be sent to Langfuse if OpenTelemetry is configured');
        }

        // Start streaming with aggressive caching enabled
        const streamResult = streamText(streamConfig);
        const fullStream = streamResult.fullStream;
        response = streamResult.response; // Assign to outer scope variable
        response?.catch((error: unknown) => {
            const errorMsg = getErrorMessage(error);
            logError(`[Agent] streamText response error: ${errorMsg}`, error);
            logDebug(`[Agent] streamText response error diagnostics: ${getErrorDiagnostics(error)}`);
            if (streamWatchdog && !streamWatchdog.abortSignal.aborted) {
                const abortReason = isProxyTerminatedStreamError(errorMsg)
                    ? createProxyTerminatedError(errorMsg)
                    : (error instanceof Error ? error : new Error(errorMsg));
                streamWatchdog.abort(abortReason);
            }
        });

        emitEvent({ type: 'start' });

        // Track tool inputs for use in tool results (by toolCallId)
        const toolInputMap = new Map<string, any>();
        // Track tool calls that already emitted a pre-input loading state.
        const preloadedToolCallIds = new Set<string>();
        // (reasoningById + flushOpenThinkingBlocks declared above the try so
        // catch / unexpected-end paths can flush too.)
        // Track whether the current text block is a native compaction summary.
        let isCompactionBlock = false;
        let compactionContent = '';
        // Stores the cleaned summary (analysis stripped) from the most recent native compaction.
        // Used by prepareStep and onStepFinish to patch compaction blocks before sending/saving.
        let cleanedCompactionSummary: string | null = null;

        /**
         * Flush accumulated native compaction content: save to JSONL and emit UI event.
         * Called when the compaction text block ends (next text-start or finish).
         */
        const flushNativeCompaction = async () => {
            if (!isCompactionBlock || !compactionContent) {
                isCompactionBlock = false;
                compactionContent = '';
                return;
            }

            logInfo(`[Agent] Native compaction complete (${compactionContent.length} chars raw)`);

            // Extract <summary> content from the compaction output.
            // The prompt instructs the model to output <analysis>...</analysis> (thinking)
            // followed by <summary>...</summary> (the actual summary). We only persist
            // the summary, matching the custom Compact agent's extraction logic.
            const extractedSummary = compactionContent.match(/<summary>(.*?)<\/summary>/s)?.[1]?.trim();
            const continuationPrefix = 'This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation. \n ';
            const summaryBody = extractedSummary || compactionContent.trim();
            const summary = continuationPrefix + summaryBody;

            // Store cleaned summary for prepareStep and onStepFinish to patch compaction blocks
            cleanedCompactionSummary = summary;

            if (extractedSummary) {
                logInfo(`[Agent] Extracted <summary> from native compaction (${extractedSummary.length} chars)`);
            } else {
                logInfo('[Agent] No <summary> tags found in native compaction — using raw content');
            }

            // Persist as compact_summary in JSONL (same format as custom compact agent).
            // This allows getMessages() / getLastUsage() to treat it as a checkpoint.
            if (request.chatHistoryManager) {
                try {
                    await request.chatHistoryManager.saveSummaryMessage(summary);
                    logInfo('[Agent] Native compaction summary saved to JSONL');
                } catch (error) {
                    logError('[Agent] Failed to save native compaction summary', error);
                }
            }

            // Complete the "Compacting conversation..." loading indicator
            emitEvent({
                type: 'tool_result',
                toolName: 'compact_conversation',
                toolOutput: { success: true },
                completedAction: 'compacted conversation',
            });

            // Emit compact event so the frontend shows the summary in UI
            emitEvent({
                type: 'compact',
                summary,
                content: summary,
            });

            // Reset usage to 0 in UI (compaction resets the context window)
            emitEvent({ type: 'usage', totalInputTokens: 0 });

            isCompactionBlock = false;
            compactionContent = '';
        };

        // Process stream
        for await (const part of fullStream) {
            touchStreamActivity();
            pauseIdleTimeout = false;
            // Check for abort signal at each iteration
            if (request.abortSignal?.aborted) {
                logInfo('[Agent] Abort signal detected during stream processing');
                throw new Error('AbortError: Operation aborted by user');
            }

            switch (part.type) {
                case 'text-delta': {
                    // If this is a native compaction block, accumulate the summary
                    // instead of emitting as regular content.
                    if (isCompactionBlock) {
                        compactionContent += part.text;
                        break;
                    }

                    // Accumulate content for later recording as complete message
                    accumulatedContent += part.text;

                    emitEvent({
                        type: 'content_block',
                        content: part.text,
                    });
                    break;
                }

                case 'reasoning-start': {
                    reasoningById.set(part.id, '');
                    emitEvent({
                        type: 'thinking_start',
                        thinkingId: part.id,
                    });
                    break;
                }

                case 'reasoning-delta': {
                    const delta = ('text' in part ? part.text : (part as any).delta) || '';
                    if (!delta) {
                        break;
                    }

                    const current = reasoningById.get(part.id) || '';
                    reasoningById.set(part.id, current + delta);

                    emitEvent({
                        type: 'thinking_delta',
                        thinkingId: part.id,
                        content: delta,
                    });
                    break;
                }

                case 'reasoning-end': {
                    reasoningById.delete(part.id);
                    emitEvent({
                        type: 'thinking_end',
                        thinkingId: part.id,
                    });
                    break;
                }

                case 'tool-input-start': {
                    isExecutingTool = true;
                    const toolCallId = (part as any).id ?? (part as any).toolCallId;
                    if (toolCallId && preloadedToolCallIds.has(toolCallId)) {
                        break;
                    }

                    if (toolCallId) {
                        preloadedToolCallIds.add(toolCallId);
                    }

                    const toolName = (part as any).toolName;
                    if (!toolName || toolName === TODO_WRITE_TOOL_NAME) {
                        break;
                    }

                    const toolActions = getToolAction(toolName, undefined, undefined);
                    const loadingAction = toolActions?.loading || toolName;

                    // Emit an early loading event so UI shows progress while tool input streams.
                    emitEvent({
                        type: 'tool_call',
                        toolName,
                        toolInput: {},
                        loadingAction,
                    });
                    break;
                }

                case 'tool-input-delta':
                case 'tool-input-end': {
                    // Tool input deltas are currently used for early loading visibility.
                    // Final tool details are emitted on `tool-call`.
                    break;
                }

                case 'tool-call': {
                    // Provider-managed tools (e.g. tool_search) may emit tool-call
                    // chunks without toolName. Skip UI handling for these.
                    if (!part.toolName) {
                        break;
                    }
                    const toolInput = part.input as any;
                    logDebug(`[Agent] Tool call: ${part.toolName}`);

                    // Mark that we're executing a tool (for interruption tracking)
                    isExecutingTool = true;

                    preloadedToolCallIds.delete(part.toolCallId);

                    // Store tool input for later use in tool result
                    toolInputMap.set(part.toolCallId, toolInput);

                    // Reset accumulated content (messages recorded via onStepFinish)
                    accumulatedContent = '';

                    // Get loading action from shared utility (single source of truth)
                    const toolActions = getToolAction(part.toolName, undefined, toolInput);
                    const loadingAction = toolActions?.loading;

                    // Extract relevant info for display
                    let displayInput: any = undefined;
                    if ([FILE_READ_TOOL_NAME, FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME].includes(part.toolName)) {
                        displayInput = { file_path: toolInput?.file_path };
                    } else if (part.toolName === CONNECTOR_TOOL_NAME) {
                        displayInput = {
                            mode: toolInput?.mode,
                            artifact_id: toolInput?.artifact_id,
                            operation_names: toolInput?.operation_names,
                            connection_names: toolInput?.connection_names,
                            parameter_names: toolInput?.parameter_names,
                            version: toolInput?.version,
                        };
                    } else if (part.toolName === CONTEXT_TOOL_NAME) {
                        displayInput = {
                            context_name: toolInput?.context_name,
                        };
                    } else if (part.toolName === MANAGE_CONNECTOR_TOOL_NAME) {
                        displayInput = {
                            operation: toolInput?.operation,
                            connector_artifact_ids: toolInput?.connector_artifact_ids,
                            inbound_artifact_ids: toolInput?.inbound_artifact_ids,
                            versions: toolInput?.versions,
                        };
                    } else if (part.toolName === VALIDATE_CODE_TOOL_NAME) {
                        displayInput = {
                            file_paths: toolInput?.file_paths,
                        };
                    } else if (part.toolName === CREATE_DATA_MAPPER_TOOL_NAME) {
                        displayInput = {
                            name: toolInput?.name,
                            input_type: toolInput?.input_type,
                            output_type: toolInput?.output_type,
                        };
                    } else if (part.toolName === GENERATE_DATA_MAPPING_TOOL_NAME) {
                        displayInput = {
                            dm_config_path: toolInput?.dm_config_path,
                        };
                    } else if (part.toolName === BUILD_AND_DEPLOY_TOOL_NAME) {
                        displayInput = {
                            mode: toolInput?.mode,
                        };
                    } else if (part.toolName === SERVER_MANAGEMENT_TOOL_NAME) {
                        displayInput = {
                            action: toolInput?.action,
                        };
                    } else if (part.toolName === BASH_TOOL_NAME) {
                        displayInput = {
                            command: toolInput?.command,
                            description: toolInput?.description,
                        };
                    } else if (part.toolName === KILL_TASK_TOOL_NAME) {
                        displayInput = {
                            task_id: toolInput?.task_id,
                        };
                    } else if (part.toolName === WEB_SEARCH_TOOL_NAME) {
                        displayInput = {
                            query: toolInput?.query,
                            allowed_domains: toolInput?.allowed_domains,
                            blocked_domains: toolInput?.blocked_domains,
                        };
                    } else if (part.toolName === WEB_FETCH_TOOL_NAME) {
                        displayInput = {
                            url: toolInput?.url,
                            prompt: toolInput?.prompt,
                            allowed_domains: toolInput?.allowed_domains,
                            blocked_domains: toolInput?.blocked_domains,
                        };
                    } else if (part.toolName === DEEPWIKI_ASK_QUESTION_TOOL_NAME) {
                        displayInput = {
                            repoName: toolInput?.repoName,
                            question: toolInput?.question,
                        };
                    }

                    // Skip tool call UI for todo_write (handled by inline todo list)
                    if (part.toolName !== TODO_WRITE_TOOL_NAME) {
                        emitEvent({
                            type: 'tool_call',
                            toolName: part.toolName,
                            toolInput: displayInput,
                            loadingAction,
                        });
                    }
                    break;
                }

                case 'tool-result': {
                    // Provider-managed tools (e.g. tool_search) may emit tool-result
                    // chunks without toolName. Skip UI handling for these.
                    if (!part.toolName) {
                        isExecutingTool = false;
                        break;
                    }
                    const result = normalizeToolResultForUi(part.toolName, part.output);
                    logDebug(`[Agent] Tool result: ${part.toolName}, success: ${result.success}`);

                    // Tool execution complete
                    isExecutingTool = false;

                    // Retrieve tool input from map (for dynamic action messages)
                    const toolInput = toolInputMap.get(part.toolCallId);

                    // Get action from shared utility (single source of truth)
                    const toolActions = getToolAction(part.toolName, result, toolInput);

                    // Use completed or failed action based on tool result
                    const resultAction = result.success === false
                        ? toolActions?.failed
                        : toolActions?.completed;

                    // Skip tool result UI for todo_write (handled by inline todo list)
                    if (part.toolName !== TODO_WRITE_TOOL_NAME) {
                        // Build event with shell-specific fields if applicable
                        const toolResultEvent: any = {
                            type: 'tool_result',
                            toolName: part.toolName,
                            toolOutput: { success: result.success },
                            completedAction: resultAction,
                        };

                        // Add shell output fields for shell tool
                        if (part.toolName === BASH_TOOL_NAME) {
                            toolResultEvent.bashCommand = toolInput?.command;
                            toolResultEvent.bashDescription = toolInput?.description;
                            toolResultEvent.bashStdout = result.stdout || result.message;
                            toolResultEvent.bashStderr = result.stderr;
                            toolResultEvent.bashExitCode = result.exitCode;
                            toolResultEvent.bashRunning = !!result.taskId;
                        }

                        // Send to visualizer with result action for display
                        emitEvent(toolResultEvent);
                    }

                    // Clean up stored tool input
                    toolInputMap.delete(part.toolCallId);
                    break;
                }

                case 'error': {
                    cleanupStreamLifecycle?.();
                    const errorMsg = getErrorMessage(part.error);
                    logError(`[Agent] Stream error: ${errorMsg}`);
                    // Structured diagnostics only — getErrorDiagnostics whitelists/truncates
                    // the safe provider fields. A raw JSON dump would re-introduce the leak
                    // surface (requestBodyValues, unsanitized headers, etc.) at any log level.
                    logError(`[Agent] Stream error diagnostics: ${getErrorDiagnostics(part.error)}`);
                    emitEvent({
                        type: 'error',
                        error: errorMsg,
                    });
                    return {
                        success: false,
                        modifiedFiles,
                        error: errorMsg,
                    };
                }

                case 'text-start': {
                    // Check if this is a native compaction block.
                    // The AI SDK surfaces compaction via providerMetadata on text-start events.
                    const isCompaction = (part as any).providerMetadata?.anthropic?.type === 'compaction';
                    if (isCompaction) {
                        isCompactionBlock = true;
                        compactionContent = '';
                        logInfo('[Agent] Native compaction block started — accumulating summary');

                        // Show "Compacting conversation..." loading indicator in UI
                        // (matches the custom auto-compact path in rpc-manager)
                        emitEvent({
                            type: 'tool_call',
                            toolName: 'compact_conversation',
                            loadingAction: 'compacting conversation',
                            toolInput: {},
                        });
                        break;
                    }

                    // If the previous block was a compaction, flush it now
                    // (the compaction block is complete, and this is the start of the real response).
                    if (isCompactionBlock) {
                        await flushNativeCompaction();
                    }

                    // Add newline for formatting
                    emitEvent({
                        type: 'content_block',
                        content: ' \n',
                    });
                    break;
                }

                case 'finish': {
                    // Flush any pending native compaction before finishing
                    if (isCompactionBlock) {
                        await flushNativeCompaction();
                    }

                    // Close any reasoning blocks Anthropic didn't end explicitly.
                    flushOpenThinkingBlocks();
                    cleanupStreamLifecycle?.();
                    logInfo(`[Agent] Execution finished. Modified files: ${modifiedFiles.length}`);
                    const finishReason = normalizeFinishReason(part);
                    const continuationReason = getContinuationReasonFromFinish(finishReason);

                    // Capture final messages and log cache usage
                    try {
                        const finalResponse: any = response
                            ? await awaitWithTimeout<any>(response, finalResponseWaitTimeoutMs)
                            : undefined;
                        finalModelMessages = finalResponse?.messages ?? [];
                    } catch (error) {
                        logError('[Agent] Failed to capture model messages on finish', error);
                    }

                    // Send stop event to UI
                    emitEvent({ type: 'stop', modelMessages: finalModelMessages });
                    return {
                        success: true,
                        modifiedFiles,
                        modelMessages: finalModelMessages,
                        continuationSuggested: continuationReason !== undefined,
                        continuationReason,
                    };
                }

                default:
                    break;
            }
        }

        // Stream completed without finish event (shouldn't happen normally)
        flushOpenThinkingBlocks();
        cleanupStreamLifecycle?.();
        // Capture partial messages if available, but do not block forever waiting for response.
        try {
            const finalResponse: any = response
                ? await awaitWithTimeout<any>(response, finalResponseWaitTimeoutMs)
                : undefined;
            finalModelMessages = finalResponse?.messages ?? [];
            logDebug(`[Agent] Captured ${finalModelMessages.length} model messages after unexpected stream end`);
        } catch (error) {
            logError('[Agent] Failed to capture model messages after unexpected stream end', error);
        }

        const unexpectedStreamEndMessage = 'Agent stream ended unexpectedly before completion. Please retry.';
        logError(`[Agent] ${unexpectedStreamEndMessage}`);
        emitEvent({ type: 'error', error: unexpectedStreamEndMessage });
        return {
            success: false,
            modifiedFiles,
            error: unexpectedStreamEndMessage,
            modelMessages: finalModelMessages,
        };

    } catch (error: any) {
        flushOpenThinkingBlocks();
        cleanupStreamLifecycle?.();
        const abortReason = streamWatchdog?.getAbortReason();
        const classifiedError = classifyAgentExecutionError({
            error,
            abortReason,
            userAbortRequested: streamWatchdog?.isUserAbortRequested() || false,
            requestAbortSignalAborted: request.abortSignal?.aborted || false,
        });
        const errorMsg = classifiedError.rawMessage;

        // Try to capture partial model messages even on error
        try {
            const finalResponse: any = response
                ? await awaitWithTimeout<any>(response, finalResponseWaitTimeoutMs)
                : undefined;
            finalModelMessages = finalResponse?.messages ?? [];
        } catch (captureError) {
            logDebug(`[Agent] Skipped capturing final model messages after error: ${getErrorMessage(captureError)}`);
        }

        switch (classifiedError.kind) {
            case 'tool_interruption':
            case 'user_abort': {
                logInfo(
                    `[Agent] Execution aborted by user (kind: ${classifiedError.kind}, isExecutingTool: ${isExecutingTool})`
                );

                // Save interruption message to chat history (Claude Code pattern)
                // This helps LLM understand in next session that previous request was interrupted
                if (request.chatHistoryManager) {
                    try {
                        await request.chatHistoryManager.saveInterruptionMessage(isExecutingTool);
                        logInfo('[Agent] Saved interruption message to chat history');
                    } catch (saveError) {
                        logError('[Agent] Failed to save interruption message', saveError);
                    }
                }

                emitEvent({ type: 'abort' });
                return {
                    success: false,
                    modifiedFiles,
                    error: 'Aborted by user',
                    modelMessages: finalModelMessages,
                };
            }

            case 'timeout': {
                const timeoutMessage = 'Agent request timed out while waiting for the model proxy response. Please retry.';
                logError(`[Agent] Execution timeout: ${errorMsg}`);
                emitEvent({
                    type: 'error',
                    error: timeoutMessage,
                });
                return {
                    success: false,
                    modifiedFiles,
                    error: timeoutMessage,
                    modelMessages: finalModelMessages,
                };
            }

            case 'proxy_terminated': {
                const proxyTerminatedMessage = 'Agent stream was terminated by the proxy/network before completion. Please retry. If this keeps happening, increase proxy stream timeout limits.';
                logError(`[Agent] Proxy/network terminated stream: ${errorMsg}`, error);
                logDebug(`[Agent] Proxy/network termination diagnostics: error=${getErrorDiagnostics(error)} abortReason=${getErrorDiagnostics(abortReason)}`);
                emitEvent({
                    type: 'error',
                    error: proxyTerminatedMessage,
                });
                return {
                    success: false,
                    modifiedFiles,
                    error: proxyTerminatedMessage,
                    modelMessages: finalModelMessages,
                };
            }

            case 'model_error': {
                const isCustomModel = !!request.modelSettings?.mainModelCustomId;
                const modelErrorMessage = isCustomModel
                    ? `Invalid model ID '${request.modelSettings!.mainModelCustomId}'. Check your model settings and try again.`
                    : `The model used by this extension may be outdated or unavailable. Please update the WSO2 MI Extension to the latest version to get updated model support. (Error: ${errorMsg})`;
                logError(`[Agent] Model error (custom=${isCustomModel}): ${errorMsg}`, error);
                emitEvent({ type: 'error', error: modelErrorMessage });
                return {
                    success: false,
                    modifiedFiles,
                    error: modelErrorMessage,
                    modelMessages: finalModelMessages,
                };
            }

            case 'unknown':
            default:
                logError(`[Agent] Execution error: ${errorMsg}`, error);
                logDebug(`[Agent] Execution error diagnostics: error=${getErrorDiagnostics(error)} abortReason=${getErrorDiagnostics(abortReason)}`);

                emitEvent({
                    type: 'error',
                    error: errorMsg,
                });
                return {
                    success: false,
                    modifiedFiles,
                    error: errorMsg,
                    modelMessages: finalModelMessages,
                };
        }
    }
}

/**
 * Creates an abort controller for agent execution
 */
export function createAgentAbortController(): AbortController {
    return new AbortController();
}
