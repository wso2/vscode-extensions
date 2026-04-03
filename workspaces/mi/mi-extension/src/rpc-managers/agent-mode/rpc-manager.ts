/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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

import {
    MIAgentPanelAPI,
    AgentMode,
    SendAgentMessageRequest,
    SendAgentMessageResponse,
    LoadChatHistoryRequest,
    LoadChatHistoryResponse,
    UserQuestionResponse,
    PlanApprovalResponse,
    ChatHistoryEvent,
    CompactConversationRequest,
    CompactConversationResponse,
    UndoLastCheckpointRequest,
    UndoLastCheckpointResponse,
    ApplyCodeSegmentWithCheckpointRequest,
    ApplyCodeSegmentWithCheckpointResponse,
    ListSessionsRequest,
    ListSessionsResponse,
    SwitchSessionRequest,
    SwitchSessionResponse,
    CreateNewSessionRequest,
    CreateNewSessionResponse,
    DeleteSessionRequest,
    DeleteSessionResponse,
    MentionablePathType,
    MentionablePathItem,
    SearchMentionablePathsRequest,
    SearchMentionablePathsResponse,
    GetAgentRunStatusRequest,
    GetAgentRunStatusResponse,
    ModelSettings,
} from '@wso2/mi-core';
import type { Dirent } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { AgentEventHandler } from './event-handler';
import { executeAgent, createAgentAbortController, AgentEvent } from '../../ai-features/agent-mode';
import { executeCompactAgent } from '../../ai-features/agent-mode/agents/compact/agent';
import { logInfo, logError, logDebug } from '../../ai-features/copilot/logger';
import {
    ChatHistoryManager,
    TOOL_USE_INTERRUPTION_CONTEXT,
} from '../../ai-features/agent-mode/chat-history-manager';
import {
    PendingQuestion,
    PendingPlanApproval,
    cleanupPendingQuestionsForSession,
    cleanupPendingApprovalsForSession,
    initializePlanModeSession
} from '../../ai-features/agent-mode/tools/plan_mode_tools';
import { cleanupPersistedToolResultsForProject } from '../../ai-features/agent-mode/tools/tool-result-persistence';
import { validateAttachments } from '../../ai-features/agent-mode/attachment-utils';
import { VALID_FILE_EXTENSIONS, VALID_SPECIAL_FILE_NAMES } from '../../ai-features/agent-mode/tools/types';
import { cleanupRunningBackgroundShells } from '../../ai-features/agent-mode/tools/bash_tools';
import { cleanupRunningBackgroundSubagents } from '../../ai-features/agent-mode/tools/subagent_tool';
import { beginServerManagementRunTracking, cleanupServerManagementOnAgentEnd } from '../../ai-features/agent-mode/tools/runtime_tools';
import { AgentUndoCheckpointManager, StoredUndoCheckpoint } from '../../ai-features/agent-mode/undo/checkpoint-manager';
import { MiDiagramRpcManager } from '../mi-diagram/rpc-manager';
import { getCopilotSessionDir } from '../../ai-features/agent-mode/storage-paths';
import { resolveSubModelId } from '../../ai-features/connection';

const DEFAULT_MODEL_SETTINGS: ModelSettings = { mainModelPreset: 'sonnet', subModelPreset: 'haiku' };

const AUTO_COMPACT_TOKEN_THRESHOLD = 180000;
const AUTO_COMPACT_TOOL_NAME = 'compact_conversation';
const DEFAULT_AGENT_MODE: AgentMode = 'edit';
const USER_CANCELLED_RESPONSE = '__USER_CANCELLED__';
const MENTION_CACHE_TTL_MS = 15000;
const MAX_MENTION_SEARCH_LIMIT = 100;
const DEFAULT_MENTION_SEARCH_LIMIT = 30;
const MENTION_MAX_CACHE_DEPTH = 8;
const MENTION_MAX_CACHE_ITEMS = 5000;
const SHELL_APPROVAL_RULES_FILE_NAME = 'shell-approval-rules.json';
const CONTINUATION_COMMAND_MAX_LENGTH = 120;
const MENTION_ROOT_DIRS = ['deployment', 'src'];
const MENTION_POM_FILE = 'pom.xml';
const MENTION_SKIP_DIRS = new Set([
    '.git',
    'node_modules',
    '.mi-copilot',
    '.vscode',
    '.idea',
    '.settings',
    'dist',
    'build',
    'out',
    'target',
]);

// Per extension-host lifetime, create one fresh startup session per project.
// This gives a new session after VSCode restart, but not when reopening only the AI panel.
const startupSessionInitializedProjects: Set<string> = new Set();

type LimitContinuationReason = 'max_output_tokens' | 'max_tool_calls';

export class MIAgentPanelRpcManager implements MIAgentPanelAPI {
    private eventHandler: AgentEventHandler;
    private currentAbortController: AbortController | null = null;
    private activeAbortControllers: Set<AbortController> = new Set();
    private chatHistoryManager: ChatHistoryManager | null = null;
    private currentSessionId: string | null = null;
    private currentMode: AgentMode = DEFAULT_AGENT_MODE;

    // Map to track pending questions from ask_user tool
    private pendingQuestions: Map<string, PendingQuestion> = new Map();

    // Map to track pending plan approvals from exit_plan_mode tool
    private pendingApprovals: Map<string, PendingPlanApproval> = new Map();
    private mentionablePathCache: MentionablePathItem[] = [];
    private mentionableRootPathSet: Set<string> = new Set();
    private mentionablePathCacheBuiltAt = 0;
    private undoCheckpointManager: AgentUndoCheckpointManager | null = null;
    private undoCheckpointManagerSessionId: string | null = null;
    private shellApprovalRules: string[][] = [];
    private pendingLimitContinuation: { reason: LimitContinuationReason } | null = null;
    private currentModelSettings: ModelSettings = { ...DEFAULT_MODEL_SETTINGS };

    constructor(private projectUri: string) {
        this.eventHandler = new AgentEventHandler(projectUri);
    }

    /**
     * Reject all pending interactive tool waits (ask_user / exit_plan_mode approval)
     * so an abort can terminate execution immediately even when waiting for user input.
     */
    private rejectPendingInteractions(reason: Error): void {
        for (const pending of this.pendingQuestions.values()) {
            try {
                pending.reject(reason);
            } catch (error) {
                logDebug(`[AgentPanel] Failed to reject pending question: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        for (const pending of this.pendingApprovals.values()) {
            try {
                pending.reject(reason);
            } catch (error) {
                logDebug(`[AgentPanel] Failed to reject pending plan approval: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        this.pendingQuestions.clear();
        this.pendingApprovals.clear();
    }

    private async cleanupOnAgentEnd(runSucceeded: boolean): Promise<void> {
        try {
            await cleanupRunningBackgroundShells();
        } catch (error) {
            logError('[AgentPanel] Failed to cleanup background shells at agent run end', error);
        }

        try {
            cleanupRunningBackgroundSubagents();
        } catch (error) {
            logError('[AgentPanel] Failed to cleanup background subagents at agent run end', error);
        }

        try {
            await cleanupServerManagementOnAgentEnd({
                stopServerStartedByCurrentRun: !runSucceeded,
            });
        } catch (error) {
            logError('[AgentPanel] Failed to cleanup runtime server state at agent run end', error);
        }
    }

    /**
     * Get the project URI
     */
    getProjectUri(): string {
        return this.projectUri;
    }

    /**
     * Get the pending questions map (for use by agent tools)
     */
    getPendingQuestions(): Map<string, PendingQuestion> {
        return this.pendingQuestions;
    }

    private normalizeShellApprovalRule(rule: string[]): string[] {
        return rule
            .map((token) => token.trim().toLowerCase())
            .filter((token) => token.length > 0);
    }

    private getShellApprovalRulesFilePath(sessionId: string): string {
        return path.join(getCopilotSessionDir(this.projectUri, sessionId), SHELL_APPROVAL_RULES_FILE_NAME);
    }

    private clearShellApprovalRules(): void {
        this.shellApprovalRules = [];
    }

    private getShellApprovalRulesSnapshot(): string[][] {
        return this.shellApprovalRules.map((rule) => [...rule]);
    }

    private async loadShellApprovalRulesForSession(sessionId: string): Promise<void> {
        this.clearShellApprovalRules();
        const rulesPath = this.getShellApprovalRulesFilePath(sessionId);

        try {
            const content = await fs.readFile(rulesPath, 'utf8');
            const parsed = JSON.parse(content);
            const rawRules = Array.isArray(parsed)
                ? parsed
                : (Array.isArray(parsed?.rules) ? parsed.rules : []);

            const dedupedRules = new Map<string, string[]>();
            for (const rawRule of rawRules) {
                if (!Array.isArray(rawRule)) {
                    continue;
                }
                const normalizedRule = this.normalizeShellApprovalRule(rawRule);
                if (normalizedRule.length === 0) {
                    continue;
                }
                dedupedRules.set(normalizedRule.join('\u0000'), normalizedRule);
            }

            this.shellApprovalRules = Array.from(dedupedRules.values());
            logInfo(`[AgentPanel] Loaded ${this.shellApprovalRules.length} shell approval rule(s) for session ${sessionId}`);
        } catch (error) {
            const nodeError = error as NodeJS.ErrnoException;
            if (nodeError.code !== 'ENOENT') {
                logError(`[AgentPanel] Failed to load shell approval rules for session ${sessionId}`, error);
            }
            this.clearShellApprovalRules();
        }
    }

    private async persistShellApprovalRulesForSession(sessionId: string): Promise<void> {
        const rulesPath = this.getShellApprovalRulesFilePath(sessionId);
        const payload = {
            updatedAt: new Date().toISOString(),
            rules: this.shellApprovalRules,
        };

        await fs.mkdir(path.dirname(rulesPath), { recursive: true });
        await fs.writeFile(rulesPath, JSON.stringify(payload, null, 2), 'utf8');
    }

    private async addShellApprovalRule(rule: string[]): Promise<void> {
        if (!this.currentSessionId) {
            return;
        }

        const normalizedRule = this.normalizeShellApprovalRule(rule);
        if (normalizedRule.length === 0) {
            return;
        }

        const existingKeys = new Set(this.shellApprovalRules.map((currentRule) => currentRule.join('\u0000')));
        const ruleKey = normalizedRule.join('\u0000');
        if (existingKeys.has(ruleKey)) {
            return;
        }

        this.shellApprovalRules.push(normalizedRule);
        try {
            await this.persistShellApprovalRulesForSession(this.currentSessionId);
            logInfo(`[AgentPanel] Added shell approval rule for session ${this.currentSessionId}: ${normalizedRule.join(' ')}`);
        } catch (error) {
            logError(
                `[AgentPanel] Failed to persist shell approval rule for session ${this.currentSessionId}. ` +
                `Keeping in-memory rule: ${normalizedRule.join(' ')}`,
                error
            );
        }
    }

    private async deleteShellApprovalRulesForSession(sessionId: string): Promise<void> {
        const rulesPath = this.getShellApprovalRulesFilePath(sessionId);
        try {
            await fs.unlink(rulesPath);
        } catch (error) {
            const nodeError = error as NodeJS.ErrnoException;
            if (nodeError.code !== 'ENOENT') {
                logError(`[AgentPanel] Failed to delete shell approval rules for session ${sessionId}`, error);
            }
        }
    }

    private clearPendingLimitContinuation(): void {
        this.pendingLimitContinuation = null;
    }

    private setPendingLimitContinuation(reason: LimitContinuationReason): void {
        this.pendingLimitContinuation = { reason };
    }

    private isContinuationIntent(message: string): boolean {
        const normalized = message.trim().toLowerCase();
        if (!normalized || normalized.length > CONTINUATION_COMMAND_MAX_LENGTH) {
            return false;
        }

        if (normalized.includes('\n')) {
            return false;
        }

        const compact = normalized
            .replace(/[`"']/g, '')
            .replace(/[.!?]+$/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const continuationPatterns = [
            /^continue$/,
            /^continue please$/,
            /^continue the task$/,
            /^continue from (here|there|where you (left off|stopped))$/,
            /^resume$/,
            /^resume please$/,
            /^resume the task$/,
            /^go on$/,
            /^go ahead$/,
            /^proceed$/,
            /^carry on$/,
            /^keep going$/,
            /^keep working$/,
        ];

        return continuationPatterns.some((pattern) => pattern.test(compact));
    }

    private buildContinuationReminder(reason: LimitContinuationReason): string {
        const reasonText = reason === 'max_tool_calls'
            ? 'the previous run reached the maximum step limit'
            : 'the previous run reached the maximum token/output limit';

        return [
            '<system_reminder>',
            `Continuation request detected: ${reasonText}.`,
            'Resume from the existing conversation state in this session.',
            'Do not repeat already completed tool calls, file edits, or long explanations.',
            'Start with a brief 1-2 sentence status update (done vs remaining), then continue with the remaining work.',
            '</system_reminder>',
        ].join('\n');
    }

    private buildQueryWithContinuationReminder(message: string): string {
        if (!this.pendingLimitContinuation) {
            return message;
        }

        const reminder = this.buildContinuationReminder(this.pendingLimitContinuation.reason);
        return `${reminder}\n\n${message}`;
    }

    private buildContinuationApprovalContent(reason: LimitContinuationReason): string {
        const reasonText = reason === 'max_tool_calls'
            ? 'maximum step limit'
            : 'maximum token/output limit';

        return [
            'We noticed Copilot has been running for a while.',
            'Do you want to continue?',
            '',
            `It paused after reaching the ${reasonText}.`,
        ].join('\n');
    }

    private async requestContinuationApproval(
        reason: LimitContinuationReason
    ): Promise<{ approved: boolean; feedback?: string; rememberForSession?: boolean; suggestedPrefixRule?: string[] }> {
        const approvalId = `continuation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        this.eventHandler.handleEvent({
            type: 'plan_approval_requested',
            approvalId,
            approvalKind: 'continue_after_limit',
            approvalTitle: 'Continue Agent Run?',
            approveLabel: 'Continue',
            rejectLabel: 'Stop',
            allowFeedback: false,
            content: this.buildContinuationApprovalContent(reason),
        });

        return new Promise((resolve, reject) => {
            this.pendingApprovals.set(approvalId, {
                approvalId,
                approvalKind: 'continue_after_limit',
                sessionId: this.currentSessionId ?? '',
                resolve: (result) => {
                    this.pendingApprovals.delete(approvalId);
                    resolve(result);
                },
                reject: (error: Error) => {
                    this.pendingApprovals.delete(approvalId);
                    reject(error);
                },
            });
        });
    }

    /**
     * Detect context-window related model errors from AI SDK / provider messages.
     */
    private isContextLimitError(errorMessage?: string): boolean {
        if (!errorMessage) {
            return false;
        }

        const normalized = errorMessage.toLowerCase();
        return (
            normalized.includes('context window') ||
            normalized.includes('context length') ||
            normalized.includes('maximum context length') ||
            normalized.includes('prompt is too long') ||
            normalized.includes('input is too long') ||
            normalized.includes('too many tokens') ||
            normalized.includes('max input tokens')
        );
    }

    /**
     * Run compact agent, save checkpoint, and emit compact/usage events.
     */
    private async runAutoCompact(
        historyManager: ChatHistoryManager,
        reason: 'threshold' | 'context_error'
    ): Promise<boolean> {
        this.eventHandler.handleEvent({
            type: 'tool_call',
            toolName: AUTO_COMPACT_TOOL_NAME,
            loadingAction: 'compacting conversation',
            toolInput: {},
        });

        const messagesForCompact = await historyManager.getMessages({ includeCompactSummaryEntry: true });
        if (messagesForCompact.length === 0) {
            logDebug(`[AgentPanel] Skipping auto compact (${reason}): no messages`);
            this.eventHandler.handleEvent({
                type: 'tool_result',
                toolName: AUTO_COMPACT_TOOL_NAME,
                toolOutput: { success: false },
                completedAction: 'failed to compact conversation',
            });
            return false;
        }

        const resolvedSubModel = resolveSubModelId(this.currentModelSettings);
        const compactResult = await executeCompactAgent({
            messages: messagesForCompact,
            trigger: 'auto',
            projectPath: this.projectUri,
            subModelId: resolvedSubModel,
            subModelIsCustom: !!this.currentModelSettings.subModelCustomId,
        });

        if (!compactResult.success || !compactResult.summary) {
            logError(`[AgentPanel] Auto compact failed (${reason}): ${compactResult.error || 'unknown error'}`);
            this.eventHandler.handleEvent({
                type: 'tool_result',
                toolName: AUTO_COMPACT_TOOL_NAME,
                toolOutput: { success: false },
                completedAction: 'failed to compact conversation',
            });
            return false;
        }

        await historyManager.saveSummaryMessage(compactResult.summary);
        this.eventHandler.handleEvent({
            type: 'compact',
            summary: compactResult.summary,
            content: compactResult.summary,
        });
        // Reset usage indicator after checkpoint.
        this.eventHandler.handleEvent({
            type: 'usage',
            totalInputTokens: 0,
        });

        logInfo(`[AgentPanel] Auto compact complete (${reason}): ${compactResult.summary.length} chars`);
        return true;
    }

    /**
     * Initialize or get existing chat history manager
     */
    private async getChatHistoryManager(): Promise<ChatHistoryManager> {
        if (!this.chatHistoryManager) {
            // Find existing sessions for this project
            const existingSessions = await ChatHistoryManager.listSessions(this.projectUri);

            // Use latest session if exists, otherwise create new
            const sessionId = existingSessions.length > 0 ? existingSessions[0] : undefined;

            this.chatHistoryManager = new ChatHistoryManager(this.projectUri, sessionId);
            await this.chatHistoryManager.initialize();
            this.currentSessionId = this.chatHistoryManager.getSessionId();
            this.currentMode = await this.chatHistoryManager.getLatestMode(DEFAULT_AGENT_MODE);
            // Run independent post-init tasks in parallel
            await Promise.all([
                this.loadShellApprovalRulesForSession(this.currentSessionId),
                cleanupPersistedToolResultsForProject(this.projectUri),
            ]);

            if (sessionId) {
                logInfo(`[AgentPanel] Continuing existing session: ${this.currentSessionId}`);
            } else {
                logInfo(`[AgentPanel] Created new chat session: ${this.currentSessionId}`);
            }
        }
        return this.chatHistoryManager;
    }

    /**
     * Close current chat history session
     */
    private async closeChatHistory(): Promise<void> {
        if (this.chatHistoryManager) {
            const sessionIdToClose = this.currentSessionId;
            if (sessionIdToClose) {
                cleanupPendingQuestionsForSession(this.pendingQuestions, sessionIdToClose);
                cleanupPendingApprovalsForSession(this.pendingApprovals, sessionIdToClose);
            }
            await this.chatHistoryManager.close();
            logInfo(`[AgentPanel] Closed chat session: ${this.currentSessionId}`);
            this.chatHistoryManager = null;
            this.currentSessionId = null;
            this.currentMode = DEFAULT_AGENT_MODE;
            this.clearShellApprovalRules();
            this.clearPendingLimitContinuation();
            this.undoCheckpointManager = null;
            this.undoCheckpointManagerSessionId = null;
        }
    }

    private async getUndoCheckpointManager(): Promise<AgentUndoCheckpointManager> {
        const historyManager = await this.getChatHistoryManager();
        const sessionId = historyManager.getSessionId();

        if (!this.undoCheckpointManager || this.undoCheckpointManagerSessionId !== sessionId) {
            this.undoCheckpointManager = new AgentUndoCheckpointManager(this.projectUri, sessionId);
            this.undoCheckpointManagerSessionId = sessionId;
        }

        return this.undoCheckpointManager;
    }

    private applyLatestUndoAvailabilityToEvents(
        events: ChatHistoryEvent[],
        latestCheckpointId?: string
    ): ChatHistoryEvent[] {
        return events.map((event) => {
            if (event.type !== 'undo_checkpoint' || !event.undoCheckpoint) {
                return event;
            }

            const isLatest = latestCheckpointId !== undefined &&
                event.undoCheckpoint.checkpointId === latestCheckpointId;

            return {
                ...event,
                undoCheckpoint: {
                    ...event.undoCheckpoint,
                    undoable: isLatest,
                },
            };
        });
    }

    private isSafeArtifactPathSegment(segment: string): boolean {
        const value = segment.trim();
        if (!value) {
            return false;
        }

        if (value.includes('..') || value.includes('/') || value.includes('\\') || path.isAbsolute(value)) {
            return false;
        }

        return /^[A-Za-z0-9._-]+$/.test(value);
    }

    private async loadAndNormalizeSessionEvents(historyManager: ChatHistoryManager): Promise<{
        events: ChatHistoryEvent[];
        lastTotalInputTokens?: number;
        mode: AgentMode;
    }> {
        const messages = await historyManager.getMessages({
            includeCompactSummaryEntry: true,
            includeUndoCheckpointEntry: true,
        });
        const events = ChatHistoryManager.convertToEventFormat(messages);
        const undoCheckpointManager = await this.getUndoCheckpointManager();
        const latestCheckpoint = await undoCheckpointManager.getLatestCheckpoint();
        const normalizedEvents = this.applyLatestUndoAvailabilityToEvents(
            events,
            latestCheckpoint?.summary?.checkpointId
        );
        const lastTotalInputTokens = await historyManager.getLastUsage();
        const mode = await historyManager.getLatestMode(DEFAULT_AGENT_MODE);

        return {
            events: normalizedEvents,
            lastTotalInputTokens,
            mode,
        };
    }

    private resolveLegacyCodeSegmentPath(segmentText: string): string | null {
        const cleaned = segmentText
            .replace(/```xml/g, '')
            .replace(/```/g, '')
            .trimStart();

        const nameMatch = cleaned.match(/(name|key)="([^"]+)"/);
        if (!nameMatch?.[2]) {
            return null;
        }
        const artifactName = nameMatch[2].trim();
        if (!this.isSafeArtifactPathSegment(artifactName)) {
            return null;
        }

        const tagMatch = cleaned.match(/<(\w+)/);
        if (!tagMatch?.[1]) {
            return null;
        }

        let fileType = '';
        switch (tagMatch[1]) {
            case 'api':
                fileType = 'apis';
                break;
            case 'endpoint':
                fileType = 'endpoints';
                break;
            case 'sequence':
                fileType = 'sequences';
                break;
            case 'proxy':
                fileType = 'proxy-services';
                break;
            case 'inboundEndpoint':
                fileType = 'inbound-endpoints';
                break;
            case 'messageStore':
                fileType = 'message-stores';
                break;
            case 'messageProcessor':
                fileType = 'message-processors';
                break;
            case 'task':
                fileType = 'tasks';
                break;
            case 'localEntry':
                fileType = 'local-entries';
                break;
            case 'template':
                fileType = 'templates';
                break;
            case 'registry':
                fileType = 'registry';
                break;
            case 'unit':
                fileType = 'unit-test';
                break;
            default:
                fileType = '';
        }

        if (!fileType) {
            return null;
        }

        if (fileType === 'apis') {
            const versionMatch = cleaned.match(/<api [^>]*version="([^"]+)"/);
            if (versionMatch?.[1]) {
                const version = versionMatch[1].trim();
                if (!this.isSafeArtifactPathSegment(version)) {
                    return null;
                }
                return path.join('src', 'main', 'wso2mi', 'artifacts', fileType, `${artifactName}_v${version}.xml`);
            }
            return path.join('src', 'main', 'wso2mi', 'artifacts', fileType, `${artifactName}.xml`);
        }

        if (fileType === 'unit-test') {
            return path.join('src', 'main', 'test', `${artifactName}.xml`);
        }

        return path.join('src', 'main', 'wso2mi', 'artifacts', fileType, `${artifactName}.xml`);
    }

    private async resolveLatestAssistantChatId(): Promise<number | undefined> {
        try {
            const historyManager = await this.getChatHistoryManager();
            const messages = await historyManager.getMessages();

            for (let i = messages.length - 1; i >= 0; i--) {
                const message = messages[i] as { role?: string; _chatId?: number };
                if (message?.role === 'assistant' && typeof message._chatId === 'number') {
                    return message._chatId;
                }
            }
        } catch (error) {
            logDebug(`[AgentPanel] Failed to resolve latest assistant chat id: ${error instanceof Error ? error.message : String(error)}`);
        }
        return undefined;
    }

    private async applyUndoCheckpointRestore(checkpoint: StoredUndoCheckpoint): Promise<string[]> {
        const restoredFiles: string[] = [];
        const workspaceEdit = new vscode.WorkspaceEdit();

        for (const file of checkpoint.files) {
            const fullPath = path.resolve(this.projectUri, file.path);
            const relative = path.relative(this.projectUri, fullPath).replace(/\\/g, '/');
            if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
                logError(`[AgentPanel] Skipping unsafe undo path: ${file.path}`);
                continue;
            }

            const fileUri = vscode.Uri.file(fullPath);
            restoredFiles.push(file.path);
            if (file.before.exists) {
                workspaceEdit.createFile(fileUri, { ignoreIfExists: true, overwrite: true });
                workspaceEdit.replace(
                    fileUri,
                    new vscode.Range(
                        new vscode.Position(0, 0),
                        new vscode.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
                    ),
                    file.before.content || ''
                );
            } else {
                workspaceEdit.deleteFile(fileUri, { ignoreIfNotExists: true });
            }
        }

        const success = await vscode.workspace.applyEdit(workspaceEdit);
        if (!success) {
            throw new Error('Failed to apply undo workspace edit');
        }

        await vscode.workspace.saveAll();
        await vscode.commands.executeCommand('MI.project-explorer.refresh');
        return restoredFiles;
    }

    /**
     * Send a message to the agent for processing
     */
    async sendAgentMessage(request: SendAgentMessageRequest): Promise<SendAgentMessageResponse> {
        let runSucceeded = false;
        let shouldRunCleanup = false;
        beginServerManagementRunTracking();
        this.eventHandler.beginRun();
        try {
            const messageLength = typeof request.message === 'string' ? request.message.length : 0;
            logInfo(
                `[AgentPanel] Received message request (chatId=${request.chatId}, mode=${request.mode || this.currentMode || DEFAULT_AGENT_MODE}, messageLength=${messageLength})`
            );

            // Fail fast if attachments are invalid (same behavior as legacy copilot flow)
            const validationWarnings = validateAttachments(request.files, request.images);
            if (validationWarnings.length > 0) {
                const errorMessage = `Cannot proceed with agent request. Invalid attachments: ${validationWarnings.join('; ')}`;
                logError(`[AgentPanel] ${errorMessage}`);
                return {
                    success: false,
                    error: errorMessage
                };
            }

            // Persist latest model settings so auto-compaction and other server-side
            // behaviors use the same settings the UI selected.
            if (request.modelSettings) {
                this.currentModelSettings = { ...request.modelSettings };
            }

            // Get or create chat history manager
            const historyManager = await this.getChatHistoryManager();
            const undoCheckpointManager = await this.getUndoCheckpointManager();
            const effectiveMode = request.mode || this.currentMode || DEFAULT_AGENT_MODE;
            if (effectiveMode !== this.currentMode) {
                if (effectiveMode === 'plan' && this.currentSessionId) {
                    await initializePlanModeSession(this.projectUri, this.currentSessionId, { forceBaselineReset: true });
                }
                await historyManager.saveModeChange(effectiveMode);
                this.currentMode = effectiveMode;
            }

            // Auto-compact before the new run when context usage exceeds threshold.
            // We compact between runs (not mid-stream) to keep AI SDK orchestration stable.
            const lastUsage = await historyManager.getLastUsage();
            const shouldAutoCompact = lastUsage !== undefined && lastUsage >= AUTO_COMPACT_TOKEN_THRESHOLD;
            if (shouldAutoCompact) {
                logInfo(`[AgentPanel] Auto compact triggered at ${lastUsage} tokens (threshold: ${AUTO_COMPACT_TOKEN_THRESHOLD})`);
                await this.runAutoCompact(historyManager, 'threshold');
            }

            const hasPendingContinuation = this.pendingLimitContinuation !== null;
            const shouldApplyContinuationReminder = hasPendingContinuation &&
                this.isContinuationIntent(request.message);

            if (hasPendingContinuation && !shouldApplyContinuationReminder) {
                this.clearPendingLimitContinuation();
            }

            const effectiveQuery = shouldApplyContinuationReminder
                ? this.buildQueryWithContinuationReminder(request.message)
                : request.message;

            if (shouldApplyContinuationReminder) {
                logInfo('[AgentPanel] Applying continuation reminder for resumed run');
                this.clearPendingLimitContinuation();
            }

            shouldRunCleanup = true;
            await undoCheckpointManager.beginRun('agent');

            const persistModeChange = (mode: AgentMode) => {
                if (this.currentMode === mode) {
                    return;
                }
                this.currentMode = mode;
                historyManager.saveModeChange(mode).catch((error) => {
                    logError(`[AgentPanel] Failed to persist mode change to '${mode}'`, error);
                });
            };

            const executeRunWithContextRetry = async (query: string) => {
                let suppressedContextErrorFromStream = false;
                let retriedAfterContextCompact = false;

                const runAgentOnce = async () => {
                    const abortController = createAgentAbortController();
                    this.activeAbortControllers.add(abortController);
                    this.currentAbortController = abortController;

                    try {
                        return await executeAgent(
                            {
                                query,
                                chatId: request.chatId,
                                mode: effectiveMode,
                                files: request.files,
                                images: request.images,
                                thinking: request.thinking ?? true,
                                webAccessPreapproved: request.webAccessPreapproved,
                                projectPath: this.projectUri,
                                sessionId: this.currentSessionId || undefined,
                                abortSignal: abortController.signal,
                                chatHistoryManager: historyManager,
                                pendingQuestions: this.pendingQuestions,
                                pendingApprovals: this.pendingApprovals,
                                shellApprovalRuleStore: {
                                    getRules: () => this.getShellApprovalRulesSnapshot(),
                                    addRule: async (rule: string[]) => this.addShellApprovalRule(rule),
                                },
                                undoCheckpointManager,
                                modelSettings: this.currentModelSettings,
                                onStepPersisted: () => this.eventHandler.stepCompleted(),
                            },
                            (event: AgentEvent) => {
                                if (event.type === 'plan_mode_entered') {
                                    persistModeChange('plan');
                                } else if (event.type === 'plan_mode_exited') {
                                    persistModeChange('edit');
                                }

                                // When context is exceeded, suppress the immediate error event,
                                // compact, and retry once for seamless UX.
                                if (event.type === 'error' && this.isContextLimitError(event.error)) {
                                    suppressedContextErrorFromStream = true;
                                    logInfo('[AgentPanel] Suppressed context-limit error event; attempting compact-and-retry');
                                    return;
                                }
                                this.eventHandler.handleEvent(event);
                            }
                        );
                    } finally {
                        this.activeAbortControllers.delete(abortController);
                        if (this.currentAbortController === abortController) {
                            this.currentAbortController = null;
                        }
                    }
                };

                let runResult = await runAgentOnce();

                const hitContextLimit = () =>
                    suppressedContextErrorFromStream || this.isContextLimitError(runResult.error);

                if (!runResult.success && hitContextLimit() && !retriedAfterContextCompact) {
                    retriedAfterContextCompact = true;
                    logInfo('[AgentPanel] Context limit reached mid-run. Triggering auto compact and retrying once');

                    const compacted = await this.runAutoCompact(historyManager, 'context_error');
                    if (compacted) {
                        await undoCheckpointManager.discardPendingRun();
                        await undoCheckpointManager.beginRun('agent');
                        suppressedContextErrorFromStream = false;
                        runResult = await runAgentOnce();
                    }
                }

                // If context-limit error was suppressed but we still failed, surface it now.
                if (!runResult.success && (suppressedContextErrorFromStream || this.isContextLimitError(runResult.error))) {
                    this.eventHandler.handleEvent({
                        type: 'error',
                        error: runResult.error || 'Context window exceeded',
                    });
                }

                return runResult;
            };

            let result = await executeRunWithContextRetry(effectiveQuery);

            while (result.success && result.continuationSuggested && result.continuationReason) {
                this.setPendingLimitContinuation(result.continuationReason);
                const approval = await this.requestContinuationApproval(result.continuationReason);
                if (!approval.approved) {
                    logInfo('[AgentPanel] User denied automatic continuation after run limit');
                    this.clearPendingLimitContinuation();
                    break;
                }

                const continuationQuery = this.buildQueryWithContinuationReminder('continue');
                logInfo('[AgentPanel] User approved automatic continuation after run limit');
                this.clearPendingLimitContinuation();
                result = await executeRunWithContextRetry(continuationQuery);
            }

            if (result.success) {
                this.clearPendingLimitContinuation();
                runSucceeded = true;

                const undoCheckpoint = await undoCheckpointManager.commitRun();
                if (undoCheckpoint) {
                    await historyManager.saveUndoCheckpoint(undoCheckpoint, request.chatId);
                }
                logInfo(`[AgentPanel] Agent completed successfully. Modified ${result.modifiedFiles.length} files.`);
                return {
                    success: true,
                    message: 'Agent completed successfully',
                    modifiedFiles: result.modifiedFiles,
                    undoCheckpoint,
                    modelMessages: result.modelMessages
                };
            } else {
                this.clearPendingLimitContinuation();
                await undoCheckpointManager.discardPendingRun();
                logError(`[AgentPanel] Agent failed: ${result.error}`);
                return {
                    success: false,
                    error: result.error,
                    modelMessages: result.modelMessages // Return partial messages even on error
                };
            }
        } catch (error) {
            logError('[AgentPanel] Error executing agent', error);
            this.currentAbortController = null;
            this.activeAbortControllers.clear();
            this.clearPendingLimitContinuation();
            if (this.undoCheckpointManager) {
                try {
                    await this.undoCheckpointManager.discardPendingRun();
                } catch (discardError) {
                    logError('[AgentPanel] Failed to discard pending undo checkpoint run', discardError);
                }
            }
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        } finally {
            if (shouldRunCleanup) {
                await this.cleanupOnAgentEnd(runSucceeded);
            } else {
                await cleanupServerManagementOnAgentEnd();
            }
            this.eventHandler.endRun();
        }
    }

    async undoLastCheckpoint(request: UndoLastCheckpointRequest): Promise<UndoLastCheckpointResponse> {
        try {
            const undoCheckpointManager = await this.getUndoCheckpointManager();
            const checkpoint = await undoCheckpointManager.getLatestCheckpoint();
            if (!checkpoint || !checkpoint.summary?.undoable) {
                return {
                    success: false,
                    error: 'No undo checkpoint available',
                };
            }

            const requestedCheckpointId = request.checkpointId;
            if (requestedCheckpointId && requestedCheckpointId !== checkpoint.summary.checkpointId) {
                return {
                    success: false,
                    undoCheckpoint: checkpoint.summary,
                    error: 'A newer checkpoint exists. Undo the latest checkpoint first.',
                };
            }

            const conflicts = await undoCheckpointManager.getConflictedFiles(checkpoint);
            if (conflicts.length > 0 && !request.force) {
                return {
                    success: false,
                    requiresConfirmation: true,
                    conflicts,
                    undoCheckpoint: checkpoint.summary,
                    error: 'Files were modified after checkpoint creation',
                };
            }

            const restoredFiles = await this.applyUndoCheckpointRestore(checkpoint);
            await undoCheckpointManager.clearLatestCheckpoint();
            const latestCheckpoint = await undoCheckpointManager.getLatestCheckpoint();
            const historyManager = await this.getChatHistoryManager();
            await historyManager.saveUndoReminderMessage(checkpoint.summary, restoredFiles);

            return {
                success: true,
                restoredFiles,
                undoCheckpoint: {
                    ...checkpoint.summary,
                    undoable: false,
                },
                latestUndoCheckpoint: latestCheckpoint?.summary
                    ? {
                        ...latestCheckpoint.summary,
                        undoable: true,
                    }
                    : undefined,
            } as UndoLastCheckpointResponse;
        } catch (error) {
            logError('[AgentPanel] Failed to undo checkpoint', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to undo checkpoint',
            };
        }
    }

    async applyCodeSegmentWithCheckpoint(
        request: ApplyCodeSegmentWithCheckpointRequest
    ): Promise<ApplyCodeSegmentWithCheckpointResponse> {
        const segmentText = request.segmentText || '';
        if (!segmentText.trim()) {
            return {
                success: false,
                error: 'Code segment content is required',
            };
        }

        const targetRelativePath = this.resolveLegacyCodeSegmentPath(segmentText);
        if (!targetRelativePath) {
            return {
                success: false,
                error: 'Unable to resolve artifact path from code segment',
            };
        }

        const undoCheckpointManager = await this.getUndoCheckpointManager();
        const targetChatId = request.targetChatId ?? await this.resolveLatestAssistantChatId();
        try {
            await undoCheckpointManager.beginRun('code_segment');
            await undoCheckpointManager.captureBeforeChange(targetRelativePath);

            const diagramRpcManager = new MiDiagramRpcManager(this.projectUri);
            const writeResult = await diagramRpcManager.writeContentToFile({ content: [segmentText] });
            if (!writeResult.status) {
                await undoCheckpointManager.discardPendingRun();
                return {
                    success: false,
                    error: 'Failed to apply code segment',
                };
            }

            await vscode.commands.executeCommand('MI.project-explorer.refresh');
            const undoCheckpoint = await undoCheckpointManager.commitRun();

            if (undoCheckpoint) {
                const historyManager = await this.getChatHistoryManager();
                await historyManager.saveUndoCheckpoint(undoCheckpoint, targetChatId);
            }

            return {
                success: true,
                undoCheckpoint,
            };
        } catch (error) {
            await undoCheckpointManager.discardPendingRun();
            logError('[AgentPanel] Failed to apply code segment with checkpoint', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to apply code segment',
            };
        }
    }

    /**
     * Abort the current agent generation
     */
    async abortAgentGeneration(): Promise<void> {
        // Ensure tool-wait states are also interrupted (ask_user / plan approval waits).
        this.rejectPendingInteractions(new Error(`AbortError: ${TOOL_USE_INTERRUPTION_CONTEXT}`));

        if (this.activeAbortControllers.size > 0) {
            logInfo(`[AgentPanel] Aborting ${this.activeAbortControllers.size} active agent run(s)...`);
            for (const controller of this.activeAbortControllers) {
                controller.abort();
            }
            this.activeAbortControllers.clear();
            this.currentAbortController = null;
        } else {
            logDebug('[AgentPanel] No active agent generation to abort');
        }
    }

    /**
     * Respond to an ask_user question
     * This resolves the pending promise in the ask_user tool
     */
    async respondToQuestion(response: UserQuestionResponse): Promise<void> {
        const { questionId, answer } = response;
        logInfo(`[AgentPanel] Received response for question: ${questionId}`);

        const pending = this.pendingQuestions.get(questionId);
        if (pending) {
            if (answer === USER_CANCELLED_RESPONSE) {
                logDebug(`[AgentPanel] User cancelled question flow: ${questionId}`);
                pending.reject(new Error(`AbortError: ${TOOL_USE_INTERRUPTION_CONTEXT}`));
                return;
            }

            logDebug(`[AgentPanel] Resolving pending question: ${questionId}`);
            pending.resolve(answer);
            // Note: The pendingQuestions.delete is handled in the resolve callback
        } else {
            logError(`[AgentPanel] No pending question found for ID: ${questionId}`);
        }
    }

    /**
     * Respond to a plan approval request (approve or reject the plan)
     * This resolves the pending promise in the exit_plan_mode tool
     */
    async respondToPlanApproval(response: PlanApprovalResponse): Promise<void> {
        const { approvalId, approved, feedback, rememberForSession, suggestedPrefixRule } = response;
        logInfo(`[AgentPanel] Received plan approval response: ${approvalId}, approved: ${approved}`);

        const pending = this.pendingApprovals.get(approvalId);
        if (pending) {
            if (!approved && feedback === USER_CANCELLED_RESPONSE) {
                logDebug(`[AgentPanel] User cancelled plan approval flow: ${approvalId}`);
                pending.reject(new Error(`AbortError: ${TOOL_USE_INTERRUPTION_CONTEXT}`));
                return;
            }

            logDebug(`[AgentPanel] Resolving pending plan approval: ${approvalId}`);
            pending.resolve({ approved, feedback, rememberForSession, suggestedPrefixRule });
            // Note: The pendingApprovals.delete is handled in the resolve callback
        } else {
            logError(`[AgentPanel] No pending plan approval found for ID: ${approvalId}`);
        }
    }

    /**
     * Load chat history from the current session
     */
    async loadChatHistory(_request: LoadChatHistoryRequest): Promise<LoadChatHistoryResponse> {
        try {
            if (!startupSessionInitializedProjects.has(this.projectUri)) {
                logInfo('[AgentPanel] Creating startup fresh session for project');
                const freshSessionResult = await this.createNewSession({});
                if (freshSessionResult.success) {
                    startupSessionInitializedProjects.add(this.projectUri);
                } else {
                    logError('[AgentPanel] Failed to create startup fresh session', freshSessionResult.error);
                }
            }

            // Initialize chat history manager (finds latest session or creates new)
            const historyManager = await this.getChatHistoryManager();

            // If still no session, return empty
            if (!this.currentSessionId) {
                logDebug('[AgentPanel] No active session, returning empty chat history');
                return {
                    success: true,
                    events: []
                };
            }

            logInfo(`[AgentPanel] Loading chat history from session: ${this.currentSessionId}`);
            const { events, lastTotalInputTokens, mode } = await this.loadAndNormalizeSessionEvents(historyManager);
            this.currentMode = mode;
            logInfo(`[AgentPanel] Loaded ${events.length} events`);

            return {
                success: true,
                sessionId: this.currentSessionId,
                events,
                mode,
                lastTotalInputTokens,
            };
        } catch (error) {
            logError('[AgentPanel] Failed to load chat history', error);
            return {
                success: false,
                events: [],
                error: error instanceof Error ? error.message : 'Failed to load chat history'
            };
        }
    }

    async getAgentRunStatus(request: GetAgentRunStatusRequest = {}): Promise<GetAgentRunStatusResponse> {
        const status = this.eventHandler.getRunStatus(request.sinceSeq);
        return {
            ...status,
            mode: this.currentMode,
        };
    }

    // ============================================================================
    // Session Management
    // ============================================================================

    /**
     * List all sessions with metadata, grouped by time
     */
    async listSessions(_request: ListSessionsRequest): Promise<ListSessionsResponse> {
        try {
            logInfo('[AgentPanel] Listing sessions...');

            const sessions = await ChatHistoryManager.listSessionsWithMetadata(
                this.projectUri,
                this.currentSessionId || undefined
            );

            const totalCount = sessions.today.length + sessions.yesterday.length +
                sessions.pastWeek.length + sessions.older.length;
            logInfo(`[AgentPanel] Found ${totalCount} sessions`);

            return {
                success: true,
                sessions,
                currentSessionId: this.currentSessionId || undefined
            };
        } catch (error) {
            logError('[AgentPanel] Failed to list sessions', error);
            return {
                success: false,
                sessions: { today: [], yesterday: [], pastWeek: [], older: [] },
                error: error instanceof Error ? error.message : 'Failed to list sessions'
            };
        }
    }

    /**
     * Switch to a different session
     */
    async switchSession(request: SwitchSessionRequest): Promise<SwitchSessionResponse> {
        try {
            const { sessionId } = request;
            logInfo(`[AgentPanel] Switching to session: ${sessionId}`);

            const isCompatible = await ChatHistoryManager.isSessionCompatible(this.projectUri, sessionId);
            if (!isCompatible) {
                return {
                    success: false,
                    sessionId,
                    events: [],
                    error: 'This session uses an incompatible session version and cannot be loaded. Create a new session instead.',
                };
            }

            // Don't switch if already on this session
            if (this.currentSessionId === sessionId) {
                logDebug('[AgentPanel] Already on requested session');
                const historyManager = await this.getChatHistoryManager();
                const { events, lastTotalInputTokens, mode } = await this.loadAndNormalizeSessionEvents(historyManager);
                this.currentMode = mode;
                return {
                    success: true,
                    sessionId,
                    events,
                    mode,
                    lastTotalInputTokens,
                };
            }

            // Close current session
            await this.closeChatHistory();

            // Open the requested session
            this.chatHistoryManager = new ChatHistoryManager(this.projectUri, sessionId);
            await this.chatHistoryManager.initialize();
            this.currentSessionId = sessionId;
            await this.loadShellApprovalRulesForSession(sessionId);
            const { events, lastTotalInputTokens, mode } = await this.loadAndNormalizeSessionEvents(this.chatHistoryManager);
            this.currentMode = mode;
            logInfo(`[AgentPanel] Switched to session: ${sessionId}, loaded ${events.length} events`);

            return {
                success: true,
                sessionId,
                events,
                mode,
                lastTotalInputTokens,
            };
        } catch (error) {
            logError('[AgentPanel] Failed to switch session', error);
            return {
                success: false,
                sessionId: request.sessionId,
                events: [],
                error: error instanceof Error ? error.message : 'Failed to switch session'
            };
        }
    }

    /**
     * Create a new empty session
     */
    async createNewSession(_request: CreateNewSessionRequest): Promise<CreateNewSessionResponse> {
        try {
            logInfo('[AgentPanel] Creating new session...');

            // Close current session if exists
            await this.closeChatHistory();

            // Create new session (no sessionId = new UUID)
            this.chatHistoryManager = new ChatHistoryManager(this.projectUri);
            await this.chatHistoryManager.initialize();
            this.currentSessionId = this.chatHistoryManager.getSessionId();
            this.currentMode = DEFAULT_AGENT_MODE;
            this.currentModelSettings = { ...DEFAULT_MODEL_SETTINGS };
            await this.loadShellApprovalRulesForSession(this.currentSessionId);

            logInfo(`[AgentPanel] Created new session: ${this.currentSessionId}`);

            return {
                success: true,
                sessionId: this.currentSessionId,
                mode: this.currentMode,
            };
        } catch (error) {
            logError('[AgentPanel] Failed to create new session', error);
            return {
                success: false,
                sessionId: '',
                error: error instanceof Error ? error.message : 'Failed to create new session'
            };
        }
    }

    /**
     * Delete a session
     */
    async deleteSession(request: DeleteSessionRequest): Promise<DeleteSessionResponse> {
        try {
            const { sessionId } = request;
            logInfo(`[AgentPanel] Deleting session: ${sessionId}`);

            // Prevent deleting current session
            if (this.currentSessionId === sessionId) {
                return {
                    success: false,
                    error: 'Cannot delete the current active session. Switch to another session first.'
                };
            }

            // Delete the session
            await ChatHistoryManager.deleteSession(this.projectUri, sessionId);
            await this.deleteShellApprovalRulesForSession(sessionId);

            logInfo(`[AgentPanel] Deleted session: ${sessionId}`);

            return {
                success: true
            };
        } catch (error) {
            logError('[AgentPanel] Failed to delete session', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete session'
            };
        }
    }

    // ============================================================================
    // Manual Compact
    // ============================================================================

    /**
     * Manually compact/summarize the current conversation.
     * Reads all messages from the current session, runs the summarization sub-agent,
     * saves the summary as a JSONL checkpoint, and returns it.
     */
    async compactConversation(request: CompactConversationRequest): Promise<CompactConversationResponse> {
        try {
            logInfo('[AgentPanel] Manual compact requested');

            // Get chat history manager (must have an active session)
            const historyManager = await this.getChatHistoryManager();
            const messages = await historyManager.getMessages({ includeCompactSummaryEntry: true });

            if (messages.length === 0) {
                return {
                    success: false,
                    error: 'No conversation to compact'
                };
            }

            logInfo(`[AgentPanel] Compacting ${messages.length} messages...`);

            // Run compact agent (sends full conversation + system-reminder to Haiku)
            const effectiveSettings = request.modelSettings || this.currentModelSettings;
            const resolvedSubModel = resolveSubModelId(effectiveSettings);
            const result = await executeCompactAgent({
                messages,
                trigger: 'user',
                projectPath: this.projectUri,
                subModelId: resolvedSubModel,
                subModelIsCustom: !!effectiveSettings.subModelCustomId,
            });

            if (!result.success || !result.summary) {
                logError(`[AgentPanel] Manual compact failed: ${result.error || 'unknown error'}`);
                return {
                    success: false,
                    error: result.error || 'Summarization failed'
                };
            }

            // Save compact summary to JSONL (checkpoint)
            await historyManager.saveSummaryMessage(result.summary);

            // Emit compact event to UI via event handler
            this.eventHandler.handleEvent({
                type: 'compact',
                summary: result.summary,
                content: result.summary,
            });
            this.eventHandler.handleEvent({
                type: 'usage',
                totalInputTokens: 0,
            });

            logInfo(`[AgentPanel] Manual compact complete: ${result.summary.length} chars`);

            return {
                success: true,
                summary: result.summary,
            };
        } catch (error) {
            logError('[AgentPanel] Failed to compact conversation', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to compact conversation'
            };
        }
    }

    // ============================================================================
    // Mention Search
    // ============================================================================

    private normalizeRelativePath(relativePath: string): string {
        return relativePath.split(path.sep).join('/');
    }

    private getFileName(relativePath: string): string {
        const normalized = relativePath.endsWith('/') ? relativePath.slice(0, -1) : relativePath;
        const parts = normalized.split('/');
        return parts[parts.length - 1] || normalized;
    }

    private isMentionableFile(fileName: string): boolean {
        const lowerFileName = fileName.toLowerCase();
        const ext = path.extname(fileName).toLowerCase();
        if (VALID_FILE_EXTENSIONS.includes(ext)) {
            return true;
        }
        return VALID_SPECIAL_FILE_NAMES.some(
            (specialName) => specialName.toLowerCase() === lowerFileName
        );
    }

    private async pathExists(targetPath: string): Promise<boolean> {
        try {
            await fs.access(targetPath);
            return true;
        } catch {
            return false;
        }
    }

    private async isDirectory(targetPath: string): Promise<boolean> {
        try {
            const stats = await fs.stat(targetPath);
            return stats.isDirectory();
        } catch {
            return false;
        }
    }

    private async getPomModulePaths(rootPath: string): Promise<string[]> {
        const pomPath = path.join(rootPath, MENTION_POM_FILE);
        try {
            const pomContent = await fs.readFile(pomPath, 'utf8');
            const moduleRegex = /<module>\s*([^<]+?)\s*<\/module>/g;
            const modulePaths = new Set<string>();
            let match: RegExpExecArray | null = null;

            while ((match = moduleRegex.exec(pomContent)) !== null) {
                const rawModulePath = (match[1] || '').trim();
                if (!rawModulePath || rawModulePath.includes('${')) {
                    continue;
                }

                const normalized = this
                    .normalizeRelativePath(rawModulePath)
                    .replace(/^\.?\//, '')
                    .replace(/\/+$/, '');
                if (!normalized) {
                    continue;
                }

                const absoluteModulePath = path.join(rootPath, normalized);
                if (await this.isDirectory(absoluteModulePath)) {
                    modulePaths.add(normalized);
                }
            }

            return Array.from(modulePaths);
        } catch {
            return [];
        }
    }

    private async buildMentionablePathCache(): Promise<MentionablePathItem[]> {
        const mentionables = new Map<string, MentionablePathItem>();
        const rootPathSet = new Set<string>();
        const rootPath = this.projectUri;

        const addMentionable = (item: MentionablePathItem): boolean => {
            if (mentionables.has(item.path)) {
                return true;
            }

            if (mentionables.size >= MENTION_MAX_CACHE_ITEMS) {
                return false;
            }

            mentionables.set(item.path, item);
            return true;
        };

        const walk = async (absoluteDir: string, relativeDir: string, currentDepth: number): Promise<void> => {
            if (currentDepth >= MENTION_MAX_CACHE_DEPTH || mentionables.size >= MENTION_MAX_CACHE_ITEMS) {
                return;
            }

            let entries: Dirent[] = [];
            try {
                entries = await fs.readdir(absoluteDir, { withFileTypes: true });
            } catch {
                return;
            }

            entries.sort((a, b) => a.name.localeCompare(b.name));

            for (const entry of entries) {
                if (mentionables.size >= MENTION_MAX_CACHE_ITEMS) {
                    break;
                }

                if (entry.isSymbolicLink()) {
                    continue;
                }

                const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
                const absolutePath = path.join(absoluteDir, entry.name);

                if (entry.isDirectory()) {
                    if (MENTION_SKIP_DIRS.has(entry.name)) {
                        continue;
                    }
                    const added = addMentionable({
                        path: `${this.normalizeRelativePath(relativePath)}/`,
                        type: 'folder',
                    });
                    if (!added) {
                        break;
                    }
                    await walk(absolutePath, relativePath, currentDepth + 1);
                    continue;
                }

                if (entry.isFile() && this.isMentionableFile(entry.name)) {
                    const added = addMentionable({
                        path: this.normalizeRelativePath(relativePath),
                        type: 'file',
                    });
                    if (!added) {
                        break;
                    }
                }
            }
        };

        const rootTopLevelFiles = [MENTION_POM_FILE, ...VALID_SPECIAL_FILE_NAMES];
        for (const topLevelFile of rootTopLevelFiles) {
            if (mentionables.size >= MENTION_MAX_CACHE_ITEMS) {
                break;
            }
            const fullPath = path.join(rootPath, topLevelFile);
            if (await this.pathExists(fullPath)) {
                if (addMentionable({ path: topLevelFile, type: 'file' })) {
                    rootPathSet.add(topLevelFile);
                } else {
                    break;
                }
            }
        }

        const configuredRoots = new Set<string>(MENTION_ROOT_DIRS);
        const pomModulePaths = await this.getPomModulePaths(rootPath);
        for (const modulePath of pomModulePaths) {
            configuredRoots.add(modulePath);
        }

        for (const configuredRoot of configuredRoots) {
            if (mentionables.size >= MENTION_MAX_CACHE_ITEMS) {
                break;
            }
            const normalizedRoot = this.normalizeRelativePath(configuredRoot).replace(/\/+$/, '');
            if (!normalizedRoot) {
                continue;
            }

            const absoluteRoot = path.join(rootPath, normalizedRoot);
            if (!(await this.isDirectory(absoluteRoot))) {
                continue;
            }

            const added = addMentionable({
                path: `${normalizedRoot}/`,
                type: 'folder',
            });
            if (!added) {
                break;
            }
            rootPathSet.add(`${normalizedRoot}/`);
            await walk(absoluteRoot, normalizedRoot, 0);
        }

        this.mentionablePathCache = Array.from(mentionables.values());
        this.mentionableRootPathSet = rootPathSet;
        this.mentionablePathCacheBuiltAt = Date.now();
        return this.mentionablePathCache;
    }

    private async getMentionablePathCache(): Promise<MentionablePathItem[]> {
        const cacheAge = Date.now() - this.mentionablePathCacheBuiltAt;
        if (this.mentionablePathCache.length === 0 || cacheAge > MENTION_CACHE_TTL_MS) {
            return this.buildMentionablePathCache();
        }
        return this.mentionablePathCache;
    }

    async searchMentionablePaths(request: SearchMentionablePathsRequest): Promise<SearchMentionablePathsResponse> {
        try {
            const query = (request.query || '').trim().toLowerCase();
            const requestedLimit = request.limit ?? DEFAULT_MENTION_SEARCH_LIMIT;
            const limit = Math.max(1, Math.min(requestedLimit, MAX_MENTION_SEARCH_LIMIT));
            const cache = await this.getMentionablePathCache();

            let matches = cache;
            if (!query) {
                matches = cache.filter((item) => this.mentionableRootPathSet.has(item.path));
            } else {
                matches = cache.filter((item) => {
                    const pathLower = item.path.toLowerCase();
                    const nameLower = this.getFileName(item.path).toLowerCase();
                    return pathLower.includes(query) || nameLower.includes(query);
                });
            }

            const score = (item: MentionablePathItem): number => {
                if (!query) {
                    if (item.path === 'src/') return 120;
                    if (item.path === 'deployment/') return 110;
                    if (item.path === MENTION_POM_FILE) return 100;
                    return 90;
                }
                const pathLower = item.path.toLowerCase();
                const nameLower = this.getFileName(item.path).toLowerCase();
                if (nameLower === query) return 100;
                if (nameLower.startsWith(query)) return 90;
                if (pathLower.startsWith(query)) return 80;
                if (nameLower.includes(query)) return 60;
                return 40;
            };

            const sorted = matches
                .slice()
                .sort((a, b) => {
                    const scoreDiff = score(b) - score(a);
                    if (scoreDiff !== 0) {
                        return scoreDiff;
                    }
                    return a.path.localeCompare(b.path);
                })
                .slice(0, limit);

            return {
                success: true,
                items: sorted,
            };
        } catch (error) {
            logError('[AgentPanel] Failed to search mentionable paths', error);
            return {
                success: false,
                items: [],
                error: error instanceof Error ? error.message : 'Failed to search mentionable paths',
            };
        }
    }

}
