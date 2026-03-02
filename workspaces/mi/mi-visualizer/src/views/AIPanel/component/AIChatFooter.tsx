/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import React, { useState, useRef, useEffect, useCallback } from "react";
import { FlexRow, Footer, StyledTransParentButton, FloatingInputContainer } from "../styles";
import { Codicon } from "@wso2/ui-toolkit";
import { useMICopilotContext, AgentMode } from "./MICopilotContext";
import { handleFileAttach, convertChatHistoryToModelMessages } from "../utils";
import { USER_INPUT_PLACEHOLDER_MESSAGE, VALID_FILE_TYPES } from "../constants";
import { generateId, updateTokenInfo } from "../utils";
import { BackendRequestType } from "../types";
import { Role, MessageType, CopilotChatEntry, AgentEvent, ChatMessage, TodoItem, Question, UndoCheckpointSummary } from "@wso2/mi-core";
import Attachments from "./Attachments";

// Tool name constant
const SHELL_TOOL_NAMES = new Set(['shell', 'bash']);
const EXIT_PLAN_MODE_TOOL_NAME = 'exit_plan_mode';
const THINKING_PREFERENCE_KEY_PREFIX = 'mi-agent-thinking-enabled';
const WEB_ACCESS_PREFERENCE_KEY = 'mi-agent-web-access-enabled';

function getThinkingPreferenceStorageKey(mode: AgentMode): string {
    return `${THINKING_PREFERENCE_KEY_PREFIX}-${mode}`;
}

function getDefaultThinkingEnabled(mode: AgentMode): boolean {
    return true;
}

function getThinkingPreferenceForMode(mode: AgentMode): boolean {
    try {
        const storedPreference = localStorage.getItem(getThinkingPreferenceStorageKey(mode));
        if (storedPreference === null) {
            return getDefaultThinkingEnabled(mode);
        }
        return storedPreference === 'true';
    } catch {
        return getDefaultThinkingEnabled(mode);
    }
}

function removeCompactingPlaceholder(content: string): string {
    return content
        .replace(/\n\n<toolcall(?:\s+[^>]*)?>Compacting conversation\.\.\.<\/toolcall>/g, '')
        .replace(/<toolcall(?:\s+[^>]*)?>Compacting conversation\.\.\.<\/toolcall>/g, '')
        .trimEnd();
}

function appendThinkingPlaceholder(content: string, thinkingId: string): string {
    return `${content}\n\n<thinking data-id="${thinkingId}" data-loading="true"></thinking>`;
}

function updateThinkingContent(
    content: string,
    thinkingId: string,
    updater: (current: string) => string
): string {
    const loadingTag = `<thinking data-id="${thinkingId}" data-loading="true">`;
    const doneTag = `<thinking data-id="${thinkingId}">`;

    const loadingIndex = content.lastIndexOf(loadingTag);
    const doneIndex = content.lastIndexOf(doneTag);
    const startTag = loadingIndex >= doneIndex ? loadingTag : doneTag;
    const startIndex = content.lastIndexOf(startTag);

    if (startIndex === -1) {
        return content;
    }

    const contentStart = startIndex + startTag.length;
    const endIndex = content.indexOf("</thinking>", contentStart);
    if (endIndex === -1) {
        return content;
    }

    const current = content.substring(contentStart, endIndex);
    const updated = updater(current);
    return content.substring(0, contentStart) + updated + content.substring(endIndex);
}

function appendThinkingDelta(content: string, thinkingId: string, delta: string): string {
    const hasExistingBlock =
        content.includes(`<thinking data-id="${thinkingId}" data-loading="true">`) ||
        content.includes(`<thinking data-id="${thinkingId}">`);

    if (!hasExistingBlock) {
        return appendThinkingPlaceholder(content, thinkingId).replace("</thinking>", `${delta}</thinking>`);
    }

    return updateThinkingContent(content, thinkingId, (current) => current + delta);
}

function finalizeThinkingBlock(content: string, thinkingId: string): string {
    const loadingTag = `<thinking data-id="${thinkingId}" data-loading="true">`;
    const doneTag = `<thinking data-id="${thinkingId}">`;
    return content.replace(loadingTag, doneTag);
}

function upsertLoadingToolCallTag(content: string, filePath: string, toolMessage: string): string {
    const loadingTag = `<toolcall data-loading="true" data-file="${filePath}">${toolMessage}</toolcall>`;
    const toolPattern = /<toolcall data-loading="true" data-file="([^"]*)">([^<]*?)<\/toolcall>/g;
    const matches = [...content.matchAll(toolPattern)];

    if (matches.length === 0) {
        return content + `\n\n${loadingTag}`;
    }

    const fullMatch = matches[matches.length - 1][0];
    const lastIndex = content.lastIndexOf(fullMatch);
    const beforeMatch = content.substring(0, lastIndex);
    const afterMatch = content.substring(lastIndex + fullMatch.length);
    return beforeMatch + loadingTag + afterMatch;
}

function upsertLoadingBashOutputTag(
    content: string,
    bashData: { command: string; description: string; output: string; exitCode: number; loading: boolean }
): string {
    const loadingTag = `<bashoutput data-loading="true">${JSON.stringify(bashData)}</bashoutput>`;
    const bashPattern = /<bashoutput data-loading="true">[\s\S]*?<\/bashoutput>/g;
    const matches = [...content.matchAll(bashPattern)];

    if (matches.length === 0) {
        return content + `\n\n${loadingTag}`;
    }

    const fullMatch = matches[matches.length - 1][0];
    const lastIndex = content.lastIndexOf(fullMatch);
    const beforeMatch = content.substring(0, lastIndex);
    const afterMatch = content.substring(lastIndex + fullMatch.length);
    return beforeMatch + loadingTag + afterMatch;
}

const WORKING_ON_IT_TOOL_MESSAGE = 'copilot is working on it...';
const WORKING_ON_IT_DELAY_MS = 2000;
const RUNNING_PLACEHOLDER_DOT_FRAMES = ['.  ', '.. ', '...', ' ..', '  .', ' ..'];

function removeWorkingOnItToolCallTag(content: string): string {
    const workingTag = `<toolcall data-loading="true" data-file="">${WORKING_ON_IT_TOOL_MESSAGE}</toolcall>`;
    return content
        .replace(`\n\n${workingTag}`, '')
        .replace(workingTag, '');
}

function extractPlanTitle(planContent: string): string | undefined {
    const lines = planContent.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
        const match = line.match(/^#{1,6}\s+(.+)$/);
        if (match?.[1]) {
            return match[1].trim();
        }
    }
    return undefined;
}

function getPlanApprovalPrompt(planContent?: string, planFilePath?: string): string {
    const title = planContent ? extractPlanTitle(planContent) : undefined;
    if (title) {
        return `Review "${title}" and choose Approve Plan or Request Changes.`;
    }

    if (planFilePath) {
        return `Review the plan in ${planFilePath} and choose Approve Plan or Request Changes.`;
    }

    return "Review the plan above and choose Approve Plan or Request Changes.";
}

function markFileChangesTagsAsNonUndoable(content: string): string {
    return content.replace(/<filechanges>([\s\S]*?)<\/filechanges>/g, (fullMatch, summaryText) => {
        try {
            const summary = JSON.parse(summaryText) as UndoCheckpointSummary;
            if (!summary || typeof summary !== "object") {
                return fullMatch;
            }
            return `<filechanges>${JSON.stringify({ ...summary, undoable: false })}</filechanges>`;
        } catch {
            return fullMatch;
        }
    });
}

function hasFileChangesCheckpoint(content: string, checkpointId?: string): boolean {
    if (!checkpointId) {
        return false;
    }

    const regex = /<filechanges>([\s\S]*?)<\/filechanges>/g;
    for (const match of content.matchAll(regex)) {
        try {
            const summary = JSON.parse(match[1]) as UndoCheckpointSummary;
            if (summary?.checkpointId === checkpointId) {
                return true;
            }
        } catch {
            // Ignore malformed checkpoint tags.
        }
    }
    return false;
}

function appendFileChangesTag(content: string, checkpoint?: UndoCheckpointSummary): string {
    if (!checkpoint) {
        return content;
    }

    const normalizedContent = markFileChangesTagsAsNonUndoable(content);
    if (hasFileChangesCheckpoint(normalizedContent, checkpoint.checkpointId)) {
        return normalizedContent;
    }

    const fileChangesTag = `<filechanges>${JSON.stringify(checkpoint)}</filechanges>`;
    if (normalizedContent.includes(fileChangesTag)) {
        return normalizedContent;
    }

    return normalizedContent ? `${normalizedContent}\n\n${fileChangesTag}` : fileChangesTag;
}

interface AIChatFooterProps {
    isUsageExceeded?: boolean;
}

interface MentionContext {
    start: number;
    end: number;
    query: string;
}

interface MentionablePathItem {
    path: string;
    type: 'file' | 'folder';
}

const FooterTooltip: React.FC<{
    content: React.ReactNode;
    children: React.ReactNode;
    align?: 'start' | 'center' | 'end';
    variant?: 'simple' | 'card';
}> = ({ content, children, align = 'center', variant = 'simple' }) => {
    const [visible, setVisible] = useState(false);
    const positionStyle = align === 'start'
        ? { left: 0, transform: 'none' as const }
        : align === 'end'
            ? { right: 0, transform: 'none' as const }
            : { left: '50%', transform: 'translateX(-50%)' };

    return (
        <span
            style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            onFocus={() => setVisible(true)}
            onBlur={() => setVisible(false)}
        >
            {children}
            {visible && (
                <span
                    style={{
                        position: "absolute",
                        bottom: "calc(100% + 6px)",
                        ...positionStyle,
                        padding: variant === 'card' ? "10px 12px" : "4px 7px",
                        borderRadius: variant === 'card' ? "14px" : "4px",
                        backgroundColor: variant === 'card'
                            ? "color-mix(in srgb, var(--vscode-editorWidget-background) 92%, black 8%)"
                            : "var(--vscode-editorHoverWidget-background)",
                        color: "var(--vscode-editorHoverWidget-foreground, var(--vscode-foreground))",
                        border: "1px solid var(--vscode-widget-border, var(--vscode-panel-border))",
                        fontSize: "10px",
                        whiteSpace: variant === 'card' ? "normal" : "nowrap",
                        wordBreak: variant === 'card' ? "break-word" : "normal",
                        lineHeight: variant === 'card' ? 1.35 : 1.2,
                        minWidth: variant === 'card' ? "220px" : undefined,
                        maxWidth: variant === 'card' ? "280px" : undefined,
                        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
                        pointerEvents: "none",
                        zIndex: 1200,
                    }}
                >
                    {content}
                </span>
            )}
        </span>
    );
};

const MENTION_SEARCH_LIMIT = 40;
const MENTION_SEARCH_DEBOUNCE_MS = 120;

function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedValue(value);
        }, delayMs);

        return () => window.clearTimeout(timer);
    }, [value, delayMs]);

    return debouncedValue;
}

function getMentionContext(input: string, cursor: number): MentionContext | null {
    const textBeforeCursor = input.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    if (atIndex < 0) {
        return null;
    }

    const prefixChar = atIndex > 0 ? textBeforeCursor[atIndex - 1] : " ";
    // Mention trigger must be at token boundary.
    if (atIndex > 0 && !/\s|[([{"'`]/.test(prefixChar)) {
        return null;
    }

    const query = textBeforeCursor.slice(atIndex + 1);
    if (/\s/.test(query)) {
        return null;
    }

    return {
        start: atIndex,
        end: cursor,
        query,
    };
}

/**
 * Calculate overall status from todo items
 */
function calculateTodoStatus(todos: TodoItem[]): 'active' | 'completed' | 'pending' {
    if (todos.some(t => t.status === 'in_progress')) {
        return 'active';
    }
    if (todos.every(t => t.status === 'completed')) {
        return 'completed';
    }
    return 'pending';
}

/**
 * Footer component containing chat input and controls
 */
const AIChatFooter: React.FC<AIChatFooterProps> = ({ isUsageExceeded = false }) => {
    const SHOW_THINKING_TOGGLE = false;
    const {
        rpcClient,
        messages,
        setMessages,
        copilotChat,
        setCopilotChat,
        currentUserPrompt,
        setCurrentUserprompt,
        backendRequestTriggered,
        setBackendRequestTriggered,
        isInitialPromptLoaded,
        setIsInitialPromptLoaded,
        files,
        setFiles,
        images,
        setImages,
        controller,
        resetController,
        setRemainingTokenPercentage,
        // Plan mode state
        pendingQuestion,
        setPendingQuestion,
        pendingPlanApproval,
        setPendingPlanApproval,
        todos,
        setTodos,
        isPlanMode,
        setIsPlanMode,
        lastTotalInputTokens,
        setLastTotalInputTokens,
        agentMode,
        setAgentMode,
    } = useMICopilotContext();

    const [, setFileUploadStatus] = useState({ type: "", text: "" });
    const isResponseReceived = useRef(false);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const abortedRef = useRef(false);
    const lastUserPromptRef = useRef<string>("");
    const [isFocused, setIsFocused] = useState(false);
    const isDarkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    // Mode switcher state
    const [showModeMenu, setShowModeMenu] = useState(false);
    const modeMenuRef = useRef<HTMLDivElement>(null);
    const [isThinkingEnabled, setIsThinkingEnabled] = useState<boolean>(() => getThinkingPreferenceForMode(agentMode));
    const [isWebAccessEnabled, setIsWebAccessEnabled] = useState<boolean>(() => {
        try {
            return localStorage.getItem(WEB_ACCESS_PREFERENCE_KEY) === 'true';
        } catch {
            return false;
        }
    });

    // Manual compact state
    const [isCompacting, setIsCompacting] = useState(false);
    const [runningPlaceholderFrameIndex, setRunningPlaceholderFrameIndex] = useState(0);
    const [mentionContext, setMentionContext] = useState<MentionContext | null>(null);
    const [mentionSuggestions, setMentionSuggestions] = useState<MentionablePathItem[]>([]);
    const [activeMentionIndex, setActiveMentionIndex] = useState(0);
    const [isMentionLoading, setIsMentionLoading] = useState(false);
    const [pendingMentionCursorPosition, setPendingMentionCursorPosition] = useState<number | null>(null);
    const mentionSearchRequestIdRef = useRef(0);
    const debouncedMentionContext = useDebouncedValue(mentionContext, MENTION_SEARCH_DEBOUNCE_MS);

    // Context usage tracking (for compact button display)
    const CONTEXT_TOKEN_THRESHOLD = 200000;
    const MANUAL_COMPACT_VISIBLE_USAGE_PERCENT = 50;
    // Keep this aligned with backend auto-compact threshold in rpc-manager.ts.
    // We trigger auto-compact before reaching the full context limit to avoid losing context.
    const PRE_SEND_AUTO_COMPACT_THRESHOLD = 180000;
    const contextUsagePercent = Math.min(
        Math.round((lastTotalInputTokens / CONTEXT_TOKEN_THRESHOLD) * 100),
        100
    );
    const remainingContextPercent = Math.max(0, 100 - contextUsagePercent);

    const placeholderString = USER_INPUT_PLACEHOLDER_MESSAGE;
    const runningPlaceholder = `Please wait${RUNNING_PLACEHOLDER_DOT_FRAMES[runningPlaceholderFrameIndex]}`;
    const inputPlaceholder = isUsageExceeded
        ? "Usage quota exceeded..."
        : backendRequestTriggered
            ? runningPlaceholder
            : placeholderString;

    // State for streaming agent response
    const [currentChatId, setCurrentChatId] = useState<number | null>(null);
    const [assistantResponse, setAssistantResponse] = useState<string>("");
    // Tool status for agent tool calls
    const [toolStatus, setToolStatus] = useState<string>("");

    const getModeLabel = (mode: AgentMode): string => {
        if (mode === 'ask') return 'Ask';
        if (mode === 'plan') return 'Plan';
        return 'Edit';
    };

    const getModeIcon = (mode: AgentMode): string => {
        if (mode === 'ask') return 'comment-discussion';
        if (mode === 'plan') return 'checklist';
        return 'edit';
    };

    // Refs to hold latest values for the event handler (avoids stale closure)
    const assistantResponseRef = useRef<string>("");
    const currentChatIdRef = useRef<number | null>(null);
    const backendRequestTriggeredRef = useRef(false);
    const sendInProgressRef = useRef(false);
    const workingOnItTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const firstProgressEventReceivedRef = useRef(false);

    // Keep refs in sync with state (for use in stale closure of event handler)
    assistantResponseRef.current = assistantResponse;
    currentChatIdRef.current = currentChatId;
    backendRequestTriggeredRef.current = backendRequestTriggered;

    // Helper: immutably update the last message's content
    const updateLastMessage = (
        prevMessages: ChatMessage[],
        updater: (content: string) => string
    ): ChatMessage[] => {
        if (prevMessages.length === 0) return prevMessages;
        const newMessages = [...prevMessages];
        const lastIdx = newMessages.length - 1;
        newMessages[lastIdx] = {
            ...newMessages[lastIdx],
            content: updater(newMessages[lastIdx].content),
        };
        return newMessages;
    };

    const clearWorkingOnItTimer = useCallback(() => {
        if (workingOnItTimerRef.current) {
            clearTimeout(workingOnItTimerRef.current);
            workingOnItTimerRef.current = null;
        }
    }, []);

    const clearWorkingOnItPlaceholder = useCallback(() => {
        setMessages((prev) => updateLastMessage(prev, (c) => removeWorkingOnItToolCallTag(c)));
    }, [setMessages]);

    const markAgentProgressStarted = useCallback(() => {
        if (firstProgressEventReceivedRef.current) {
            return;
        }

        firstProgressEventReceivedRef.current = true;
        clearWorkingOnItTimer();
        clearWorkingOnItPlaceholder();
    }, [clearWorkingOnItPlaceholder, clearWorkingOnItTimer]);

    // Handle agent streaming events from extension
    // Uses refs for values that change between renders (assistantResponseRef, currentChatIdRef)
    // to avoid stale closure issues since this callback is registered once via onAgentEvent.
    const handleAgentEvent = useCallback((event: AgentEvent) => {
        // Ignore all events if generation was aborted
        if (abortedRef.current) {
            return;
        }

        switch (event.type) {
            case "start":
                // Start of agent response
                setAssistantResponse("");
                setToolStatus("");
                break;

            case "content_block":
                // Handle streaming content blocks
                if (event.content) {
                    markAgentProgressStarted();
                    const content = event.content;

                    // Update assistant response state
                    setAssistantResponse(prev => prev + content);

                    // Update the last copilot message in real-time (immutable update)
                    setMessages((prev) => updateLastMessage(prev, (c) => c + content));
                }
                break;

            case "thinking_start":
                if (event.thinkingId) {
                    markAgentProgressStarted();
                    setAssistantResponse((prev) => appendThinkingPlaceholder(prev, event.thinkingId!));
                    setMessages((prev) => updateLastMessage(prev, (c) =>
                        appendThinkingPlaceholder(c, event.thinkingId!)
                    ));
                }
                break;

            case "thinking_delta":
                if (event.thinkingId && event.content) {
                    setAssistantResponse((prev) => appendThinkingDelta(prev, event.thinkingId!, event.content!));
                    setMessages((prev) => updateLastMessage(prev, (c) =>
                        appendThinkingDelta(c, event.thinkingId!, event.content!)
                    ));
                }
                break;

            case "thinking_end":
                if (event.thinkingId) {
                    setAssistantResponse((prev) => finalizeThinkingBlock(prev, event.thinkingId!));
                    setMessages((prev) => updateLastMessage(prev, (c) =>
                        finalizeThinkingBlock(c, event.thinkingId!)
                    ));
                }
                break;

            case "tool_call":
                // Show tool status and insert toolcall tag into message content
                // Action text is provided by backend from shared utility
                if (event.toolName) {
                    markAgentProgressStarted();
                    // Do not show intermediate loading UI for exit_plan_mode.
                    // Plan approval dialog is the UI for this stage.
                    if (event.toolName === EXIT_PLAN_MODE_TOOL_NAME) {
                        break;
                    }

                    const toolInfo = event.toolInput as { file_path?: string, file_paths?: string[], command?: string, description?: string };
                    const filePath = toolInfo?.file_path || toolInfo?.file_paths?.[0] || "";

                    // Handle bash tool specially - show loading bash component
                    if (event.toolName && SHELL_TOOL_NAMES.has(event.toolName)) {
                        const bashData = {
                            command: toolInfo?.command || '',
                            description: toolInfo?.description || '',
                            output: '',
                            exitCode: 0,
                            loading: true
                        };

                        setToolStatus(toolInfo?.description || "Running command...");
                        setMessages((prev) => updateLastMessage(prev, (c) =>
                            upsertLoadingBashOutputTag(c, bashData)
                        ));
                        break;
                    }

                    // Use loading action provided by backend (already in user-friendly format)
                    const loadingAction = event.loadingAction || "executing";
                    const capitalizedAction = loadingAction.charAt(0).toUpperCase() + loadingAction.slice(1);

                    const toolMessage = filePath
                        ? `${capitalizedAction} ${filePath}...`
                        : `${capitalizedAction}...`;

                    setToolStatus(toolMessage);

                    // Insert toolcall tag with loading state
                    setMessages((prev) => updateLastMessage(prev, (c) =>
                        upsertLoadingToolCallTag(c, filePath, toolMessage)
                    ));
                }
                break;

            case "tool_result":
                // Clear tool status and mark toolcall as complete in message
                // Completed action is provided by backend from shared utility
                markAgentProgressStarted();
                setToolStatus("");

                // For exit_plan_mode, show completion only after successful exit.
                if (event.toolName === EXIT_PLAN_MODE_TOOL_NAME) {
                    const wasSuccessful = (event.toolOutput as { success?: boolean } | undefined)?.success === true;
                    if (wasSuccessful) {
                        const completedAction = event.completedAction || "exited plan mode";
                        const capitalizedAction = completedAction.charAt(0).toUpperCase() + completedAction.slice(1);
                        setMessages((prev) => updateLastMessage(prev, (c) =>
                            `${c}\n\n<toolcall>${capitalizedAction}</toolcall>`
                        ));
                    }
                    break;
                }

                // Update the last toolcall tag to show completion (immutable update)
                setMessages((prevMessages) => {
                    if (prevMessages.length === 0) return prevMessages;
                    const newMessages = [...prevMessages];
                    const lastIdx = newMessages.length - 1;
                    const lastMessageContent = newMessages[lastIdx].content;

                    // Check if this is a bash tool result - look for loading bashoutput tag
                    const bashPattern = /<bashoutput data-loading="true">[\s\S]*?<\/bashoutput>/g;
                    const bashMatches = [...lastMessageContent.matchAll(bashPattern)];

                    if (bashMatches.length > 0) {
                        // Handle bash tool result - replace loading bashoutput with completed one
                        const lastMatch = bashMatches[bashMatches.length - 1];
                        const fullMatch = lastMatch[0];

                        const bashData = {
                            command: event.bashCommand || '',
                            description: event.bashDescription || '',
                            output: event.bashStdout || '',
                            exitCode: event.bashExitCode ?? 0,
                            running: event.bashRunning || false,
                            loading: false
                        };

                        const completedBashTag = `<bashoutput>${JSON.stringify(bashData)}</bashoutput>`;
                        const lastIndex = lastMessageContent.lastIndexOf(fullMatch);
                        const beforeMatch = lastMessageContent.substring(0, lastIndex);
                        const afterMatch = lastMessageContent.substring(lastIndex + fullMatch.length);

                        newMessages[lastIdx] = {
                            ...newMessages[lastIdx],
                            content: beforeMatch + completedBashTag + afterMatch,
                        };
                        return newMessages;
                    }

                    // Find the last <toolcall> tag with loading state (non-bash tools)
                    const toolPattern = /<toolcall data-loading="true" data-file="([^"]*)">([^<]*?)<\/toolcall>/g;
                    const matches = [...lastMessageContent.matchAll(toolPattern)];

                    if (matches.length > 0) {
                        const lastMatch = matches[matches.length - 1];
                        const fileName = lastMatch[1];
                        const fullMatch = lastMatch[0];

                        const completedAction = event.completedAction || "executed";
                        const capitalizedAction = completedAction.charAt(0).toUpperCase() + completedAction.slice(1);

                        const completedMessage = fileName
                            ? `<toolcall>${capitalizedAction} ${fileName}</toolcall>`
                            : `<toolcall>${capitalizedAction}</toolcall>`;

                        const lastIndex = lastMessageContent.lastIndexOf(fullMatch);
                        const beforeMatch = lastMessageContent.substring(0, lastIndex);
                        const afterMatch = lastMessageContent.substring(lastIndex + fullMatch.length);

                        newMessages[lastIdx] = {
                            ...newMessages[lastIdx],
                            content: beforeMatch + completedMessage + afterMatch,
                        };
                    }
                    return newMessages;
                });
                break;

            case "error":
                clearWorkingOnItTimer();
                clearWorkingOnItPlaceholder();
                setMessages((prevMessages) => [...prevMessages, {
                    id: generateId(),
                    role: Role.MICopilot,
                    content: `Error: ${event.error || "An error occurred"}`,
                    type: MessageType.Error
                }]);
                setBackendRequestTriggered(false);
                setToolStatus("");
                break;

            case "abort":
                // Abort acknowledged - finalize with partial content and "[Interrupted]" marker
                clearWorkingOnItTimer();
                clearWorkingOnItPlaceholder();
                setBackendRequestTriggered(false);
                setPendingQuestion(null);
                setPendingPlanApproval(null);
                setShowRejectionInput(false);
                setPlanRejectionFeedback("");
                setAnswers(new Map());
                setOtherAnswers(new Map());
                setMessages((prevMessages) => {
                    if (prevMessages.length === 0) return prevMessages;
                    const newMessages = [...prevMessages];
                    const lastIdx = newMessages.length - 1;
                    const lastMessage = newMessages[lastIdx];
                    if (lastMessage.role === Role.MICopilot) {
                        let content = lastMessage.content.replace(/<toolcall data-loading="true"[^>]*>[^<]*<\/toolcall>/g, '');
                        content = content.trim();
                        content = content
                            ? content + "\n\n*[Interrupted by user]*"
                            : "*[Interrupted by user]*";
                        newMessages[lastIdx] = { ...lastMessage, content };
                    }
                    return newMessages;
                });
                setAssistantResponse("");
                setToolStatus("");
                break;

            case "stop":
                // Agent response completed - use ref to read latest assistantResponse (avoids stale closure)
                clearWorkingOnItTimer();
                clearWorkingOnItPlaceholder();
                if (assistantResponseRef.current) {
                    handleAgentComplete(assistantResponseRef.current, event.modelMessages || []);
                } else {
                    // Even if no accumulated text, still mark as completed
                    setBackendRequestTriggered(false);
                }
                // Fetch and update usage after agent response
                rpcClient?.getMiAiPanelRpcClient().fetchUsage().then((usage) => {
                    if (usage) {
                        rpcClient?.getAIVisualizerState().then((machineView) => {
                            const { remainingTokenPercentage } = updateTokenInfo(machineView);
                            setRemainingTokenPercentage(remainingTokenPercentage);
                        });
                    }
                }).catch((error) => {
                    console.error("Error fetching usage after agent response:", error);
                });
                setToolStatus("");
                break;

            case "compact":
                // Conversation was compacted (auto or manual). Insert a compact summary tag.
                if (event.summary) {
                    setToolStatus("");
                    setMessages((prev) => {
                        // If the last message is an in-progress assistant message during agent run, append to it
                        // Use ref to avoid stale closure (this callback is registered once via onAgentEvent)
                        if (prev.length > 0 && prev[prev.length - 1].role === Role.MICopilot && backendRequestTriggeredRef.current) {
                            return updateLastMessage(prev, (c) => {
                                const cleaned = removeCompactingPlaceholder(c);
                                return cleaned
                                    ? `${cleaned}\n\n<compact>${event.summary}</compact>`
                                    : `<compact>${event.summary}</compact>`;
                            });
                        }
                        // Otherwise (manual compact): replace the loading message with the summary
                        const loadingIdx = prev.findIndex((m) =>
                            m.content.includes('Compacting conversation...')
                        );
                        if (loadingIdx >= 0) {
                            const updated = [...prev];
                            updated[loadingIdx] = {
                                ...updated[loadingIdx],
                                content: `<compact>${event.summary}</compact>`,
                            };
                            return updated;
                        }
                        // Fallback: add a new standalone assistant message
                        return [...prev, {
                            id: generateId(),
                            role: Role.MICopilot,
                            content: `<compact>${event.summary}</compact>`,
                            type: MessageType.AssistantMessage,
                        }];
                    });
                }
                break;

            case "usage":
                // Update context usage via shared context state
                if (event.totalInputTokens !== undefined) {
                    setLastTotalInputTokens(event.totalInputTokens);
                }
                break;

            default:
                // Handle plan mode events (new types need mi-core rebuild)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const planEvent = event as any;
                switch (planEvent.type) {
                    case "ask_user":
                        if (planEvent.questionId && planEvent.questions) {
                            setPendingQuestion({
                                questionId: planEvent.questionId,
                                questions: planEvent.questions
                            });
                        }
                        break;

                    case "plan_mode_entered":
                        setIsPlanMode(true);
                        setAgentMode('plan');
                        break;

                    case "plan_mode_exited":
                        setIsPlanMode(false);
                        setAgentMode('edit');
                        break;

                    case "todo_updated":
                        if (planEvent.todos) {
                            setTodos(planEvent.todos);

                            const status = calculateTodoStatus(planEvent.todos);
                            const todoData = { status, items: planEvent.todos };
                            const todoTag = `<todolist>${JSON.stringify(todoData)}</todolist>`;

                            // Update or insert todolist in the last assistant message (immutable)
                            setMessages(prevMessages => {
                                const newMessages = [...prevMessages];
                                for (let i = newMessages.length - 1; i >= 0; i--) {
                                    if (newMessages[i].role === Role.MICopilot) {
                                        const msg = newMessages[i];
                                        const todolistRegex = /<todolist>[\s\S]*?<\/todolist>/;

                                        const newContent = todolistRegex.test(msg.content)
                                            ? msg.content.replace(todolistRegex, todoTag)
                                            : msg.content + '\n\n' + todoTag;

                                        newMessages[i] = { ...msg, content: newContent };
                                        break;
                                    }
                                }
                                return newMessages;
                            });
                        }
                        break;

                    case "plan_approval_requested":
                        if (planEvent.approvalId) {
                            const approvalKind = (planEvent.approvalKind || 'exit_plan_mode') as
                                | 'enter_plan_mode'
                                | 'exit_plan_mode'
                                | 'exit_plan_mode_without_plan'
                                | 'web_search'
                                | 'web_fetch';
                            const planContent = typeof planEvent.content === "string" ? planEvent.content.trim() : "";
                            if (approvalKind === 'exit_plan_mode' && planContent) {
                                setMessages((prev) => {
                                    const planTag = `<plan>${planContent}</plan>`;
                                    if (prev.length > 0 && prev[prev.length - 1].role === Role.MICopilot) {
                                        return updateLastMessage(prev, (c) => `${c}\n\n${planTag}`);
                                    }
                                    return [...prev, {
                                        id: generateId(),
                                        role: Role.MICopilot,
                                        content: planTag,
                                        type: MessageType.AssistantMessage,
                                    }];
                                });
                            }

                            const fallbackContent = approvalKind === 'enter_plan_mode'
                                ? 'Agent recommends entering Plan mode. Do you want to switch now?'
                                : approvalKind === 'exit_plan_mode_without_plan'
                                    ? 'Agent wants to exit Plan mode without a full plan. Do you want to continue?'
                                    : approvalKind === 'web_search'
                                        ? 'Agent wants permission to run a web search.'
                                        : approvalKind === 'web_fetch'
                                            ? 'Agent wants permission to fetch a web page.'
                                            : getPlanApprovalPrompt(planContent, planEvent.planFilePath);

                            const dialogContent = approvalKind === 'exit_plan_mode'
                                ? getPlanApprovalPrompt(planContent, planEvent.planFilePath)
                                : (planContent || fallbackContent);

                            setPendingPlanApproval({
                                approvalId: planEvent.approvalId,
                                approvalKind,
                                approvalTitle: planEvent.approvalTitle,
                                approveLabel: planEvent.approveLabel,
                                rejectLabel: planEvent.rejectLabel,
                                allowFeedback: planEvent.allowFeedback,
                                planFilePath: planEvent.planFilePath,
                                content: dialogContent,
                            });
                        }
                        break;
                }
                break;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rpcClient]);

    // Handle user cancelling the question dialog
    const handleQuestionCancel = async () => {
        if (pendingQuestion || pendingPlanApproval) {
            try {
                // Hard interrupt current run without sending a response to the model.
                await rpcClient.getMiAgentPanelRpcClient().abortAgentGeneration();
            } catch (error) {
                console.error("Error aborting generation:", error);
            }
        }

        // Clear local dialog state immediately.
        setPendingQuestion(null);
        setPendingPlanApproval(null);
        setAnswers(new Map());
        setOtherAnswers(new Map());
        setShowRejectionInput(false);
        setPlanRejectionFeedback("");
    };

    // Handle user response to ask_user questions
    const handleQuestionResponse = async () => {
        if (pendingQuestion) {
            try {
                // Build answers JSON object: { "question": "answer", ... }
                const answersObj: Record<string, string> = {};

                pendingQuestion.questions.forEach((question, index) => {
                    const answer = answers.get(index);
                    const otherAnswer = otherAnswers.get(index);

                    if (otherAnswer) {
                        // User typed a custom answer
                        answersObj[question.question] = otherAnswer;
                    } else if (answer) {
                        if (question.multiSelect && answer instanceof Set) {
                            // Multi-select: join selected labels with comma
                            answersObj[question.question] = Array.from(answer).join(", ");
                        } else if (typeof answer === 'string') {
                            // Single-select: use the label
                            answersObj[question.question] = answer;
                        }
                    }
                });

                await rpcClient.getMiAgentPanelRpcClient().respondToQuestion({
                    questionId: pendingQuestion.questionId,
                    answer: JSON.stringify(answersObj)
                });

                // Clear state
                setPendingQuestion(null);
                setAnswers(new Map());
                setOtherAnswers(new Map());
            } catch (error) {
                console.error("Error responding to question:", error);
            }
        }
    };

    // Handle user response to plan approval
    const handlePlanApproval = async (approved: boolean, feedback?: string) => {
        if (pendingPlanApproval) {
            try {
                await rpcClient.getMiAgentPanelRpcClient().respondToPlanApproval({
                    approvalId: pendingPlanApproval.approvalId,
                    approved,
                    feedback
                });
                setPendingPlanApproval(null);
                setShowRejectionInput(false);
                setPlanRejectionFeedback("");
            } catch (error) {
                console.error("Error responding to plan approval:", error);
            }
        }
    };

    const handleInterrupt = async () => {
        if (!backendRequestTriggered) {
            return;
        }
        // Close any pending approval/question dialogs immediately in UI.
        setPendingQuestion(null);
        setPendingPlanApproval(null);
        setShowRejectionInput(false);
        setPlanRejectionFeedback("");
        setAnswers(new Map());
        setOtherAnswers(new Map());
        try {
            await rpcClient.getMiAgentPanelRpcClient().abortAgentGeneration();
        } catch (error) {
            console.error("Error interrupting generation:", error);
        }
    };

    // Handle manual compact button click
    const handleManualCompact = async () => {
        if (isCompacting || backendRequestTriggered) return;
        setIsCompacting(true);

        // Show a loading indicator in the chat panel
        setMessages((prev) => [...prev, {
            id: generateId(),
            role: Role.MICopilot,
            content: `<toolcall data-loading="true" data-file="">Compacting conversation...</toolcall>`,
            type: MessageType.AssistantMessage,
        }]);

        try {
            const result = await rpcClient.getMiAgentPanelRpcClient().compactConversation({});
            if (!result.success) {
                console.error("Manual compact failed:", result.error);
                // Remove the loading message and show error
                setMessages((prev) => {
                    const filtered = prev.filter((m) =>
                        !m.content.includes('Compacting conversation...')
                    );
                    return [...filtered, {
                        id: generateId(),
                        role: Role.MICopilot,
                        content: `Failed to compact conversation: ${result.error || 'Unknown error'}`,
                        type: MessageType.Error,
                    }];
                });
            }
            // The compact event handler in handleAgentEvent will replace the loading message
            // with the actual compact summary
        } catch (error) {
            console.error("Error during manual compact:", error);
            // Remove the loading message on error
            setMessages((prev) =>
                prev.filter((m) => !m.content.includes('Compacting conversation...'))
            );
        } finally {
            setIsCompacting(false);
        }
    };

    // Handle completion of agent response
    // Uses currentChatIdRef to avoid stale closure (called from event handler)
    const handleAgentComplete = useCallback((finalContent: string, modelMessages?: any[]) => {
        const newEntry: CopilotChatEntry = {
            id: currentChatIdRef.current || generateId(),
            role: Role.CopilotAssistant,
            content: finalContent,
            modelMessages: modelMessages || []
        };

        setCopilotChat((prevCopilotChat) => [...prevCopilotChat, newEntry]);
        setBackendRequestTriggered(false);
    }, []);

    const updateMentionStateFromInput = (inputValue: string, cursorPosition: number) => {
        const context = getMentionContext(inputValue, cursorPosition);
        setMentionContext(context);
        if (!context) {
            setMentionSuggestions([]);
            setActiveMentionIndex(0);
        }
    };

    const closeMentionSuggestions = () => {
        setMentionContext(null);
        setMentionSuggestions([]);
        setActiveMentionIndex(0);
        setIsMentionLoading(false);
    };

    const handleMentionSelect = (item: MentionablePathItem) => {
        if (!mentionContext) {
            return;
        }

        const mentionToken = `@${item.path}`;
        const before = currentUserPrompt.slice(0, mentionContext.start);
        const after = currentUserPrompt.slice(mentionContext.end);
        const spacer = after.startsWith(' ') || after.length === 0 ? '' : ' ';
        const updatedPrompt = `${before}${mentionToken}${spacer}${after}`;
        const cursorPosition = (before + mentionToken + spacer).length;

        setCurrentUserprompt(updatedPrompt);
        closeMentionSuggestions();
        setPendingMentionCursorPosition(cursorPosition);
    };

    // Handle text input keydown events
    const handleTextKeydown = (event: React.KeyboardEvent) => {
        if (mentionContext) {
            const hasMentionQuery = mentionContext.query.trim().length > 0;

            if (event.key === "ArrowDown" && hasMentionQuery) {
                event.preventDefault();
                if (mentionSuggestions.length > 0) {
                    setActiveMentionIndex((prev) => Math.min(prev + 1, mentionSuggestions.length - 1));
                }
                return;
            }

            if (event.key === "ArrowUp" && hasMentionQuery) {
                event.preventDefault();
                if (mentionSuggestions.length > 0) {
                    setActiveMentionIndex((prev) => Math.max(prev - 1, 0));
                }
                return;
            }

            if (
                (event.key === "Enter" || event.key === "Tab")
                && hasMentionQuery
                && mentionSuggestions.length > 0
            ) {
                event.preventDefault();
                handleMentionSelect(mentionSuggestions[activeMentionIndex]);
                return;
            }

            if (event.key === "Escape") {
                event.preventDefault();
                closeMentionSuggestions();
                return;
            }
        }

        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (isCompacting || backendRequestTriggered) {
                return;
            }
            if (currentUserPrompt.trim() !== "") {
                handleSend();
            }
        }
    };

    // File handling
    const removeAllFiles = () => {
        setFiles([]);
        setFileUploadStatus({ type: "", text: "" });
    };

    const removeAllImages = () => {
        setImages([]);
        setFileUploadStatus({ type: "", text: "" });
    };

    async function handleSend(requestType: BackendRequestType = BackendRequestType.UserPrompt, prompt?: string | "") {
        if (sendInProgressRef.current || isCompacting || backendRequestTriggered) {
            return;
        }

        const outgoingPrompt = (prompt ?? currentUserPrompt ?? "").toString();

        // Block empty user inputs and avoid state conflicts
        if (outgoingPrompt.trim() === "") {
            return;
        }

        sendInProgressRef.current = true;
        closeMentionSuggestions();
        // Clear input immediately so user can't send the same message again while compacting.
        setCurrentUserprompt("");

        // Auto-compact first (when threshold is reached) so the compact UI appears
        // before rendering the next user message.
        if (
            lastTotalInputTokens >= PRE_SEND_AUTO_COMPACT_THRESHOLD &&
            !isCompacting &&
            !backendRequestTriggered
        ) {
            await handleManualCompact();
        }

        // Remove all messages marked as label or questions from history before a backend call
        setMessages((prevMessages) =>
            prevMessages.filter(
                (message) => message.type !== MessageType.Label && message.type !== MessageType.Question
            )
        );
        setBackendRequestTriggered(true);
        isResponseReceived.current = false;

        // Add the current user prompt to the chats based on the request type
        let currentCopilotChat: CopilotChatEntry[] = [...copilotChat];
        const chatId = generateId();
        setCurrentChatId(chatId);

        const updateChats = (userPrompt: string, userMessageType?: MessageType) => {
            // Store the user prompt for potential abort restoration
            lastUserPromptRef.current = userPrompt;

            // Append labels to the user prompt
            setMessages((prevMessages) => [
                ...prevMessages,
                { id: chatId, role: Role.MIUser, content: userPrompt, type: userMessageType, files, images },
                {
                    id: chatId,
                    role: Role.MICopilot,
                    content: "", // Will be updated via streaming events
                    type: MessageType.AssistantMessage,
                },
            ]);

            let currentUserChat: CopilotChatEntry = {
                id: chatId,
                role: Role.CopilotUser,
                content: userPrompt,
            };
            setCopilotChat((prevMessages) => [...prevMessages, currentUserChat]);
            currentCopilotChat.push(currentUserChat);
        };

        // Determine the message to send
        let messageToSend = outgoingPrompt;
        switch (requestType) {
            case BackendRequestType.InitialPrompt:
                updateChats(outgoingPrompt, MessageType.InitialPrompt);
                break;
            default:
                updateChats(outgoingPrompt, MessageType.UserMessage);
                break;
        }

        firstProgressEventReceivedRef.current = false;
        clearWorkingOnItTimer();
        workingOnItTimerRef.current = setTimeout(() => {
            if (
                firstProgressEventReceivedRef.current
                || abortedRef.current
                || !backendRequestTriggeredRef.current
            ) {
                return;
            }

            setMessages((prev) => updateLastMessage(prev, (c) =>
                upsertLoadingToolCallTag(c, "", WORKING_ON_IT_TOOL_MESSAGE)
            ));
        }, WORKING_ON_IT_DELAY_MS);

        try {
            // Convert chat history to model messages format (with tool calls preserved)
            const chatHistory = convertChatHistoryToModelMessages(currentCopilotChat);

            // Call the agent RPC method for streaming response
            // The streaming will be handled via events in handleAgentEvent
            // modelMessages will be sent with the "stop" event
            const response = await rpcClient.getMiAgentPanelRpcClient().sendAgentMessage({
                message: messageToSend,
                chatId,
                mode: agentMode,
                files,
                images,
                thinking: true,
                webAccessPreapproved: isWebAccessEnabled,
                chatHistory: chatHistory
            });

            if (!response.success) {
                throw new Error(response.error || "Failed to send agent request");
            }

            if (response.undoCheckpoint) {
                setMessages((prev) => {
                    if (prev.length === 0) {
                        return prev;
                    }
                    const normalized = prev.map((message) => ({
                        ...message,
                        content: markFileChangesTagsAsNonUndoable(message.content || ""),
                    }));
                    return updateLastMessage(normalized, (c) => appendFileChangesTag(c, response.undoCheckpoint));
                });
            }

            // Remove the user uploaded files and images after sending them to the backend
            removeAllFiles();
            removeAllImages();

            // The streaming response will be handled by events
            // modelMessages will arrive with the "stop" event

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Request failed";
            if (errorMessage.toLowerCase().includes('aborted by user')) {
                // Abort event already updates UI with interruption state.
                return;
            }
            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                const lastIdx = newMessages.length - 1;
                const cleanedContent = removeWorkingOnItToolCallTag(newMessages[lastIdx].content);
                newMessages[lastIdx].content = cleanedContent + errorMessage;
                newMessages[newMessages.length - 1].type = MessageType.Error;
                return newMessages;
            });
            console.error("Error sending agent message:", error);
        } finally {
            clearWorkingOnItTimer();
            setCurrentUserprompt("");
            setBackendRequestTriggered(false);
            sendInProgressRef.current = false;
        }
    }

    useEffect(() => {
        if (isInitialPromptLoaded) {
            handleSend(BackendRequestType.InitialPrompt);
            setIsInitialPromptLoaded(false);
            rpcClient.getMiDiagramRpcClient().executeCommand({ commands: ["MI.clearAIPrompt"] });
        }
    }, [isInitialPromptLoaded]);

    // Auto-resize the textarea based on content
    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = "auto";
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
        }
    }, [currentUserPrompt]);

    useEffect(() => {
        if (pendingMentionCursorPosition === null || !textAreaRef.current) {
            return;
        }

        textAreaRef.current.focus();
        textAreaRef.current.setSelectionRange(pendingMentionCursorPosition, pendingMentionCursorPosition);
        setPendingMentionCursorPosition(null);
    }, [pendingMentionCursorPosition, currentUserPrompt]);

    useEffect(() => {
        setIsThinkingEnabled(getThinkingPreferenceForMode(agentMode));
    }, [agentMode]);

    // Persist thinking preference across panel reloads (per mode)
    useEffect(() => {
        try {
            localStorage.setItem(getThinkingPreferenceStorageKey(agentMode), String(isThinkingEnabled));
        } catch {
            // Ignore localStorage errors in restricted environments
        }
    }, [agentMode, isThinkingEnabled]);

    useEffect(() => {
        try {
            localStorage.setItem(WEB_ACCESS_PREFERENCE_KEY, String(isWebAccessEnabled));
        } catch {
            // Ignore localStorage errors in restricted environments
        }
    }, [isWebAccessEnabled]);

    // Set up agent event listener
    useEffect(() => {
        if (rpcClient) {
            rpcClient.onAgentEvent(handleAgentEvent);
        }
    }, [rpcClient, handleAgentEvent]);

    useEffect(() => {
        return () => {
            clearWorkingOnItTimer();
        };
    }, [clearWorkingOnItTimer]);

    // Local state for answers to questions
    // For single-select: questionIndex -> selected label
    // For multi-select: questionIndex -> Set of selected labels
    // For "Other": questionIndex -> free text
    const [answers, setAnswers] = useState<Map<number, string | Set<string>>>(new Map());
    const [otherAnswers, setOtherAnswers] = useState<Map<number, string>>(new Map());
    // State for plan rejection feedback
    const [planRejectionFeedback, setPlanRejectionFeedback] = useState("");
    const [showRejectionInput, setShowRejectionInput] = useState(false);
    const [activeQuestionTab, setActiveQuestionTab] = useState(0);

    const handlePlanApprovalCancel = async () => {
        await handleQuestionCancel();
    };

    // Handle escape key to cancel question dialog or plan approval dialog
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (pendingQuestion) {
                    handleQuestionCancel();
                }
                if (pendingPlanApproval) {
                    void handlePlanApprovalCancel();
                }
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [pendingQuestion, setPendingQuestion, pendingPlanApproval, setPendingPlanApproval]);

    // Reset answers when question changes
    useEffect(() => {
        setAnswers(new Map());
        setOtherAnswers(new Map());
        setActiveQuestionTab(0);
    }, [pendingQuestion?.questionId]);

    // Reset rejection feedback when plan approval changes
    useEffect(() => {
        setShowRejectionInput(false);
        setPlanRejectionFeedback("");
    }, [pendingPlanApproval?.approvalId]);

    // Close mode menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
                setShowModeMenu(false);
            }
        };
        if (showModeMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showModeMenu]);

    useEffect(() => {
        if (backendRequestTriggered) {
            setShowModeMenu(false);
            setMentionContext(null);
            setMentionSuggestions([]);
            setActiveMentionIndex(0);
            setIsMentionLoading(false);
        }
    }, [backendRequestTriggered]);

    useEffect(() => {
        if (!backendRequestTriggered) {
            setRunningPlaceholderFrameIndex(0);
            return;
        }

        const interval = setInterval(() => {
            setRunningPlaceholderFrameIndex((prev) => (prev + 1) % RUNNING_PLACEHOLDER_DOT_FRAMES.length);
        }, 240);

        return () => clearInterval(interval);
    }, [backendRequestTriggered]);

    useEffect(() => {
        if (!mentionContext || backendRequestTriggered || isUsageExceeded) {
            setMentionSuggestions([]);
            setIsMentionLoading(false);
            return;
        }

        if (
            !debouncedMentionContext
            || debouncedMentionContext.start !== mentionContext.start
            || debouncedMentionContext.end !== mentionContext.end
            || debouncedMentionContext.query !== mentionContext.query
        ) {
            setIsMentionLoading(true);
            return;
        }

        const requestId = ++mentionSearchRequestIdRef.current;
        setIsMentionLoading(true);

        const searchMentionablePaths = async () => {
            try {
                const response = await rpcClient.getMiAgentPanelRpcClient().searchMentionablePaths({
                    query: debouncedMentionContext.query,
                    limit: MENTION_SEARCH_LIMIT,
                });

                if (mentionSearchRequestIdRef.current !== requestId) {
                    return;
                }

                if (response.success) {
                    setMentionSuggestions(response.items || []);
                } else {
                    setMentionSuggestions([]);
                }
            } catch (error) {
                console.error("Error searching mentionable paths:", error);
                if (mentionSearchRequestIdRef.current === requestId) {
                    setMentionSuggestions([]);
                }
            } finally {
                if (mentionSearchRequestIdRef.current === requestId) {
                    setIsMentionLoading(false);
                }
            }
        };

        void searchMentionablePaths();
    }, [mentionContext, debouncedMentionContext, rpcClient, backendRequestTriggered, isUsageExceeded]);

    useEffect(() => {
        setActiveMentionIndex(0);
    }, [mentionContext?.query]);

    const isOtherLabel = (value: string): boolean => value.trim().toLowerCase() === "other";

    const isQuestionAnswered = (q: Question, idx: number): boolean => {
        const answer = answers.get(idx);
        const otherAnswer = otherAnswers.get(idx);

        if (otherAnswer && otherAnswer.trim()) return true;
        if (q.multiSelect && answer instanceof Set) {
            if (answer.size === 0) return false;
            if (Array.from(answer).some((selected) => isOtherLabel(selected))) return false;
            return true;
        }
        if (!q.multiSelect && typeof answer === 'string') {
            if (!answer.trim()) return false;
            if (isOtherLabel(answer)) return false;
            return true;
        }

        return false;
    };

    // Check if all questions are answered
    const allQuestionsAnswered = pendingQuestion?.questions.every((q, idx) => isQuestionAnswered(q, idx)) ?? false;

    const totalQuestions = pendingQuestion?.questions.length ?? 0;
    const activeQuestion = pendingQuestion?.questions[activeQuestionTab];
    const isLastQuestion = totalQuestions > 0 && activeQuestionTab === totalQuestions - 1;
    const activeQuestionAnswered = activeQuestion ? isQuestionAnswered(activeQuestion, activeQuestionTab) : false;
    const canNavigatePrev = activeQuestionTab > 0;
    const canNavigateNext = activeQuestionTab < totalQuestions - 1;
    const questionProgressText = totalQuestions > 0 ? `${activeQuestionTab + 1} of ${totalQuestions}` : '';

    const handleQuestionNavigate = (direction: -1 | 1) => {
        setActiveQuestionTab((prev) => {
            const next = prev + direction;
            return Math.max(0, Math.min(next, totalQuestions - 1));
        });
    };

    const handleContinueQuestionFlow = async () => {
        if (!activeQuestionAnswered) {
            return;
        }

        if (isLastQuestion) {
            if (allQuestionsAnswered) {
                await handleQuestionResponse();
            }
            return;
        }

        setActiveQuestionTab((prev) => Math.min(prev + 1, totalQuestions - 1));
    };
    const planApprovalAllowsFeedback =
        (pendingPlanApproval?.allowFeedback ?? (pendingPlanApproval?.approvalKind === 'exit_plan_mode')) === true;
    const planApprovalTitle = pendingPlanApproval?.approvalTitle
        || (pendingPlanApproval?.approvalKind === 'exit_plan_mode'
            ? 'Plan Approval'
            : pendingPlanApproval?.approvalKind === 'web_search' || pendingPlanApproval?.approvalKind === 'web_fetch'
                ? 'Web Access Approval'
                : 'Approval Required');
    const planApproveLabel = pendingPlanApproval?.approveLabel || 'Approve';
    const planRejectLabel = pendingPlanApproval?.rejectLabel || 'Reject';

    return (
        <Footer>
            {/* User Question Dialog */}
            {pendingQuestion && activeQuestion && (
                <div style={{
                    margin: "0 12px 8px 12px",
                    backgroundColor: "var(--vscode-editor-background)",
                    border: "1px solid var(--vscode-widget-border, var(--vscode-panel-border))",
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.18)"
                }}>
                    <div style={{
                        display: "flex",
                        justifyContent: "flex-start",
                        alignItems: "center",
                        padding: "7px 10px",
                        borderBottom: "1px solid var(--vscode-widget-border, var(--vscode-panel-border))"
                    }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--vscode-descriptionForeground)",
                            textTransform: "uppercase",
                            letterSpacing: "0.4px"
                        }}>
                            <span className="codicon codicon-comment-discussion" />
                            Asking Questions
                        </div>
                        <div style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            color: "var(--vscode-descriptionForeground)",
                            fontSize: "11px"
                        }}>
                            <button
                                onClick={() => handleQuestionNavigate(-1)}
                                disabled={!canNavigatePrev}
                                style={{
                                    width: "22px",
                                    height: "22px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: "5px",
                                    border: "none",
                                    background: "transparent",
                                    color: "var(--vscode-foreground)",
                                    cursor: canNavigatePrev ? "pointer" : "default",
                                    opacity: canNavigatePrev ? 0.75 : 0.35
                                }}
                                title="Previous question"
                            >
                                <span className="codicon codicon-chevron-left" />
                            </button>
                            <span style={{ minWidth: "48px", textAlign: "center", fontWeight: 500 }}>
                                {questionProgressText}
                            </span>
                            <button
                                onClick={() => handleQuestionNavigate(1)}
                                disabled={!canNavigateNext}
                                style={{
                                    width: "22px",
                                    height: "22px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: "5px",
                                    border: "none",
                                    background: "transparent",
                                    color: "var(--vscode-foreground)",
                                    cursor: canNavigateNext ? "pointer" : "default",
                                    opacity: canNavigateNext ? 0.75 : 0.35
                                }}
                                title="Next question"
                            >
                                <span className="codicon codicon-chevron-right" />
                            </button>
                        </div>
                    </div>

                    <div style={{ padding: "10px 10px 8px 10px", maxHeight: "280px", overflowY: "auto" }}>
                        <div style={{
                            fontSize: "12.5px",
                            marginBottom: "8px",
                            color: "var(--vscode-foreground)",
                            lineHeight: "1.4",
                            fontWeight: 600
                        }}>
                            {activeQuestion.question}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {activeQuestion.options.map((option, optionIndex) => {
                                const currentAnswer = answers.get(activeQuestionTab);
                                const isSelected = activeQuestion.multiSelect
                                    ? (currentAnswer instanceof Set && currentAnswer.has(option.label))
                                    : currentAnswer === option.label;

                                return (
                                    <button
                                        key={`question-option-${optionIndex}`}
                                        onClick={() => {
                                            if (activeQuestion.multiSelect) {
                                                const newAnswers = new Map(answers);
                                                let currentSet = newAnswers.get(activeQuestionTab) as Set<string> | undefined;

                                                if (!currentSet || !(currentSet instanceof Set)) {
                                                    currentSet = new Set();
                                                }

                                                if (currentSet.has(option.label)) {
                                                    currentSet.delete(option.label);
                                                } else {
                                                    currentSet.add(option.label);
                                                }

                                                newAnswers.set(activeQuestionTab, currentSet);
                                                setAnswers(newAnswers);

                                                if (currentSet.size > 0 && !Array.from(currentSet).some((selected) => isOtherLabel(selected))) {
                                                    const newOtherAnswers = new Map(otherAnswers);
                                                    newOtherAnswers.delete(activeQuestionTab);
                                                    setOtherAnswers(newOtherAnswers);
                                                }
                                                return;
                                            }

                                            const newAnswers = new Map(answers);
                                            newAnswers.set(activeQuestionTab, option.label);
                                            setAnswers(newAnswers);

                                            if (!isOtherLabel(option.label)) {
                                                const newOtherAnswers = new Map(otherAnswers);
                                                newOtherAnswers.delete(activeQuestionTab);
                                                setOtherAnswers(newOtherAnswers);
                                            }
                                        }}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            textAlign: "left",
                                            width: "100%",
                                            padding: "7px 10px",
                                            borderRadius: "5px",
                                            cursor: "pointer",
                                            border: "1px solid transparent",
                                            backgroundColor: isSelected
                                                ? "var(--vscode-list-hoverBackground)"
                                                : "transparent",
                                            color: isSelected
                                                ? "var(--vscode-foreground)"
                                                : "var(--vscode-foreground)"
                                        }}
                                    >
                                        <span style={{
                                            width: "18px",
                                            textAlign: "right",
                                            color: "var(--vscode-descriptionForeground)",
                                            fontSize: "10px",
                                            fontWeight: 600,
                                            flexShrink: 0
                                        }}>
                                            {`${optionIndex + 1}.`}
                                        </span>
                                        <span style={{ fontSize: "12px", fontWeight: isSelected ? 600 : 500, lineHeight: "1.25", flex: 1 }}>
                                            {option.label}
                                        </span>
                                        {isSelected && (
                                            <span className="codicon codicon-check" style={{ opacity: 0.9 }} />
                                        )}
                                    </button>
                                );
                            })}

                            {!activeQuestion.options.some((option) => isOtherLabel(option.label)) && (
                                <button
                                    onClick={() => {
                                        const newAnswers = new Map(answers);
                                        newAnswers.delete(activeQuestionTab);
                                        setAnswers(newAnswers);

                                        if (!otherAnswers.has(activeQuestionTab)) {
                                            const newOtherAnswers = new Map(otherAnswers);
                                            newOtherAnswers.set(activeQuestionTab, "");
                                            setOtherAnswers(newOtherAnswers);
                                        }
                                    }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        textAlign: "left",
                                        width: "100%",
                                        padding: "7px 10px",
                                        borderRadius: "5px",
                                        cursor: "pointer",
                                        border: "1px solid transparent",
                                        backgroundColor: otherAnswers.has(activeQuestionTab)
                                            ? "var(--vscode-list-hoverBackground)"
                                            : "transparent",
                                        color: "var(--vscode-foreground)"
                                    }}
                                >
                                    <span style={{
                                        width: "18px",
                                        textAlign: "right",
                                        color: "var(--vscode-descriptionForeground)",
                                        fontSize: "10px",
                                        fontWeight: 600,
                                        flexShrink: 0
                                    }}>
                                        {`${activeQuestion.options.length + 1}.`}
                                    </span>
                                    <span style={{ fontSize: "12px", fontWeight: otherAnswers.has(activeQuestionTab) ? 600 : 500, flex: 1 }}>
                                        Other
                                    </span>
                                    {otherAnswers.has(activeQuestionTab) && (
                                        <span className="codicon codicon-check" style={{ opacity: 0.9 }} />
                                    )}
                                </button>
                            )}

                            {(otherAnswers.has(activeQuestionTab)
                                || (typeof answers.get(activeQuestionTab) === "string"
                                    && isOtherLabel(answers.get(activeQuestionTab) as string))
                                || (answers.get(activeQuestionTab) instanceof Set
                                    && Array.from(answers.get(activeQuestionTab) as Set<string>).some((selected) => isOtherLabel(selected)))) && (
                                <input
                                    type="text"
                                    value={otherAnswers.get(activeQuestionTab) || ""}
                                    onChange={(e) => {
                                        const newOtherAnswers = new Map(otherAnswers);
                                        newOtherAnswers.set(activeQuestionTab, e.target.value);
                                        setOtherAnswers(newOtherAnswers);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && activeQuestionAnswered) {
                                            void handleContinueQuestionFlow();
                                        }
                                    }}
                                    placeholder="Type your answer..."
                                    style={{
                                        width: "100%",
                                        marginTop: "1px",
                                        padding: "7px 9px",
                                        backgroundColor: "var(--vscode-input-background)",
                                        color: "var(--vscode-input-foreground)",
                                        border: "1px solid var(--vscode-input-border)",
                                        borderRadius: "5px",
                                        fontSize: "11.5px",
                                        boxSizing: "border-box"
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    <div style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 10px",
                        borderTop: "1px solid var(--vscode-widget-border, var(--vscode-panel-border))",
                        backgroundColor: "var(--vscode-editor-background)"
                    }}>
                        <button
                            onClick={handleQuestionCancel}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "6px 9px",
                                backgroundColor: "transparent",
                                color: "var(--vscode-foreground)",
                                border: "none",
                                borderRadius: "5px",
                                cursor: "pointer",
                                fontSize: "11.5px",
                                fontWeight: 500,
                                opacity: 0.85
                            }}
                            title="Dismiss"
                        >
                            <span>Dismiss</span>
                            <span style={{
                                fontSize: "9px",
                                opacity: 0.8,
                                border: "1px solid var(--vscode-widget-border, var(--vscode-panel-border))",
                                borderRadius: "8px",
                                padding: "1px 4px"
                            }}>
                                ESC
                            </span>
                        </button>
                        <button
                            onClick={() => { void handleContinueQuestionFlow(); }}
                            disabled={isLastQuestion ? !allQuestionsAnswered : !activeQuestionAnswered}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "6px 10px",
                                backgroundColor: ((isLastQuestion ? allQuestionsAnswered : activeQuestionAnswered))
                                    ? "var(--vscode-button-background)"
                                    : "var(--vscode-button-secondaryBackground)",
                                color: ((isLastQuestion ? allQuestionsAnswered : activeQuestionAnswered))
                                    ? "var(--vscode-button-foreground)"
                                    : "var(--vscode-button-secondaryForeground)",
                                border: "none",
                                borderRadius: "5px",
                                cursor: ((isLastQuestion ? allQuestionsAnswered : activeQuestionAnswered)) ? "pointer" : "not-allowed",
                                fontSize: "11.5px",
                                fontWeight: 500,
                                opacity: ((isLastQuestion ? allQuestionsAnswered : activeQuestionAnswered)) ? 1 : 0.65
                            }}
                        >
                            <span className={`codicon ${isLastQuestion ? "codicon-check" : "codicon-arrow-right"}`} />
                            {isLastQuestion ? `Submit ${totalQuestions === 1 ? "answer" : "answers"}` : "Continue"}
                        </button>
                    </div>
                </div>
            )}

            {/* Plan Approval Dialog */}
            {pendingPlanApproval && (
                <div style={{
                    margin: "0 12px 8px 12px",
                    backgroundColor: "var(--vscode-editor-background)",
                    border: "1px solid var(--vscode-widget-border, var(--vscode-panel-border))",
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.18)"
                }}>
                    <div style={{
                        display: "flex",
                        justifyContent: "flex-start",
                        alignItems: "center",
                        padding: "7px 10px",
                        borderBottom: "1px solid var(--vscode-widget-border, var(--vscode-panel-border))"
                    }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--vscode-descriptionForeground)",
                            textTransform: "uppercase",
                            letterSpacing: "0.4px"
                        }}>
                            <span className="codicon codicon-checklist" />
                            {planApprovalTitle}
                        </div>
                    </div>

                    <div style={{ padding: "10px" }}>
                        <div style={{
                            fontSize: "12.5px",
                            marginBottom: "8px",
                            color: "var(--vscode-foreground)",
                            lineHeight: "1.4"
                        }}>
                            {pendingPlanApproval.content || "The plan is ready for your review."}
                        </div>
                        {pendingPlanApproval.approvalKind === 'exit_plan_mode' && (
                            <div style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                fontSize: "10.5px",
                                color: "var(--vscode-descriptionForeground)",
                                backgroundColor: "var(--vscode-list-hoverBackground)",
                                borderRadius: "999px",
                                padding: "2px 7px"
                            }}>
                                <span className="codicon codicon-file-code" />
                                Full plan details are shown above in chat.
                            </div>
                        )}

                        {planApprovalAllowsFeedback && showRejectionInput && (
                            <div style={{ marginTop: "8px" }}>
                                <label style={{
                                    fontSize: "11.5px",
                                    color: "var(--vscode-descriptionForeground)",
                                    marginBottom: "3px",
                                    display: "block"
                                }}>
                                    What changes would you like? (optional)
                                </label>
                                <textarea
                                    value={planRejectionFeedback}
                                    onChange={(e) => setPlanRejectionFeedback(e.target.value)}
                                    placeholder="Describe the changes you'd like to see..."
                                    style={{
                                        width: "100%",
                                        minHeight: "64px",
                                        padding: "8px",
                                        backgroundColor: "var(--vscode-input-background)",
                                        color: "var(--vscode-input-foreground)",
                                        border: "1px solid var(--vscode-input-border)",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        boxSizing: "border-box",
                                        resize: "vertical"
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 10px",
                        borderTop: "1px solid var(--vscode-widget-border, var(--vscode-panel-border))",
                        backgroundColor: "var(--vscode-editor-background)"
                    }}>
                        <button
                            onClick={() => { void handlePlanApprovalCancel(); }}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                padding: "6px 9px",
                                backgroundColor: "transparent",
                                color: "var(--vscode-foreground)",
                                border: "none",
                                borderRadius: "5px",
                                cursor: "pointer",
                                fontSize: "11.5px",
                                fontWeight: 500,
                                opacity: 0.85
                            }}
                            title="Dismiss"
                        >
                            <span>Dismiss</span>
                            <span style={{
                                fontSize: "9px",
                                opacity: 0.8,
                                border: "1px solid var(--vscode-widget-border, var(--vscode-panel-border))",
                                borderRadius: "8px",
                                padding: "1px 4px"
                            }}>
                                ESC
                            </span>
                        </button>
                        {planApprovalAllowsFeedback && !showRejectionInput ? (
                            <>
                                <button
                                    onClick={() => setShowRejectionInput(true)}
                                    style={{
                                        padding: "6px 10px",
                                        backgroundColor: "var(--vscode-button-secondaryBackground)",
                                        color: "var(--vscode-button-secondaryForeground)",
                                        border: "none",
                                        borderRadius: "5px",
                                        cursor: "pointer",
                                        fontSize: "11.5px",
                                        fontWeight: 500
                                    }}
                                >
                                    {planRejectLabel}
                                </button>
                                <button
                                    onClick={() => handlePlanApproval(true)}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        padding: "6px 10px",
                                        backgroundColor: "var(--vscode-button-background)",
                                        color: "var(--vscode-button-foreground)",
                                        border: "none",
                                        borderRadius: "5px",
                                        cursor: "pointer",
                                        fontSize: "11.5px",
                                        fontWeight: 500
                                    }}
                                >
                                    <span className="codicon codicon-check" />
                                    {planApproveLabel}
                                </button>
                            </>
                        ) : planApprovalAllowsFeedback ? (
                            <>
                                <button
                                    onClick={() => {
                                        setShowRejectionInput(false);
                                        setPlanRejectionFeedback("");
                                    }}
                                    style={{
                                        padding: "6px 10px",
                                        backgroundColor: "transparent",
                                        color: "var(--vscode-foreground)",
                                        border: "1px solid var(--vscode-input-border)",
                                        borderRadius: "5px",
                                        cursor: "pointer",
                                        fontSize: "11.5px",
                                        fontWeight: 500
                                    }}
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => handlePlanApproval(false, planRejectionFeedback || undefined)}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        padding: "6px 10px",
                                        backgroundColor: "var(--vscode-button-background)",
                                        color: "var(--vscode-button-foreground)",
                                        border: "none",
                                        borderRadius: "5px",
                                        cursor: "pointer",
                                        fontSize: "11.5px",
                                        fontWeight: 500
                                    }}
                                >
                                    <span className="codicon codicon-send" />
                                    Submit Feedback
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => handlePlanApproval(false)}
                                    style={{
                                        padding: "6px 10px",
                                        backgroundColor: "var(--vscode-button-secondaryBackground)",
                                        color: "var(--vscode-button-secondaryForeground)",
                                        border: "none",
                                        borderRadius: "5px",
                                        cursor: "pointer",
                                        fontSize: "11.5px",
                                        fontWeight: 500
                                    }}
                                >
                                    {planRejectLabel}
                                </button>
                                <button
                                    onClick={() => handlePlanApproval(true)}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        padding: "6px 10px",
                                        backgroundColor: "var(--vscode-button-background)",
                                        color: "var(--vscode-button-foreground)",
                                        border: "none",
                                        borderRadius: "5px",
                                        cursor: "pointer",
                                        fontSize: "11.5px",
                                        fontWeight: 500
                                    }}
                                >
                                    <span className="codicon codicon-check" />
                                    {planApproveLabel}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}


            {mentionContext && !backendRequestTriggered && !isUsageExceeded && (
                <div
                    style={{
                        margin: "0 16px 8px 16px",
                        border: "1px solid var(--vscode-widget-border, var(--vscode-panel-border))",
                        borderRadius: "10px",
                        backgroundColor: "var(--vscode-editorWidget-background)",
                        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.22)",
                        maxHeight: "220px",
                        overflowY: "auto",
                        position: "relative",
                        zIndex: 12,
                    }}
                >
                    {mentionContext.query.trim().length === 0 ? (
                        <div style={{ padding: "12px" }}>
                            <div
                                style={{
                                    padding: "10px 12px",
                                    border: "1px solid var(--vscode-input-border)",
                                    borderRadius: "8px",
                                    backgroundColor: "var(--vscode-input-background)",
                                    color: "var(--vscode-descriptionForeground)",
                                    fontSize: "12px",
                                    marginBottom: "10px",
                                }}
                            >
                                Type after @ to search for files in...
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "6px",
                                }}
                            >
                                {(mentionSuggestions.length > 0 ? mentionSuggestions : [
                                    { path: "src/", type: "folder" as const },
                                    { path: "deployment/", type: "folder" as const },
                                    { path: "pom.xml", type: "file" as const },
                                ]).map((item) => (
                                    <span
                                        key={`scope-${item.path}`}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "5px",
                                            padding: "4px 8px",
                                            borderRadius: "999px",
                                            backgroundColor: "var(--vscode-badge-background)",
                                            color: "var(--vscode-badge-foreground)",
                                            fontSize: "11px",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        <span className={`codicon codicon-${item.type === "folder" ? "folder" : "file"}`} />
                                        {item.path}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : isMentionLoading && mentionSuggestions.length === 0 ? (
                        <div
                            style={{
                                padding: "10px 12px",
                                fontSize: "12px",
                                color: "var(--vscode-descriptionForeground)",
                            }}
                        >
                            Searching files and folders...
                        </div>
                    ) : mentionSuggestions.length === 0 ? (
                        <div
                            style={{
                                padding: "10px 12px",
                                fontSize: "12px",
                                color: "var(--vscode-descriptionForeground)",
                            }}
                        >
                            No matching files or folders
                        </div>
                    ) : (
                        mentionSuggestions.map((item, index) => {
                            const isActive = index === activeMentionIndex;
                            const normalizedPath = item.path.endsWith("/") ? item.path.slice(0, -1) : item.path;
                            const pathParts = normalizedPath.split("/");
                            const itemName = pathParts[pathParts.length - 1] + (item.type === "folder" ? "/" : "");
                            const parentPath = pathParts.slice(0, -1).join("/");

                            return (
                                <button
                                    key={`${item.type}:${item.path}`}
                                    onClick={() => handleMentionSelect(item)}
                                    onMouseEnter={() => setActiveMentionIndex(index)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    style={{
                                        width: "100%",
                                        border: "none",
                                        backgroundColor: isActive
                                            ? "var(--vscode-list-activeSelectionBackground)"
                                            : "transparent",
                                        color: isActive
                                            ? "var(--vscode-list-activeSelectionForeground)"
                                            : "var(--vscode-foreground)",
                                        padding: "8px 10px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        textAlign: "left",
                                        cursor: "pointer",
                                    }}
                                >
                                    <span
                                        className={`codicon codicon-${item.type === "folder" ? "folder" : "file"}`}
                                        style={{ fontSize: "13px", opacity: 0.9 }}
                                    />
                                    <span style={{ fontSize: "12px", fontWeight: 500 }}>
                                        {itemName}
                                    </span>
                                    {parentPath && (
                                        <span
                                            style={{
                                                fontSize: "12px",
                                                color: isActive
                                                    ? "var(--vscode-list-activeSelectionForeground)"
                                                    : "var(--vscode-descriptionForeground)",
                                                opacity: 0.85,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {parentPath}
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            )}

            <FloatingInputContainer
                style={{
                    border: isFocused ? "1px solid var(--vscode-focusBorder)" : "1px solid var(--vscode-widget-border)",
                    boxShadow: isFocused ? "0 0 0 1px var(--vscode-focusBorder), 0 4px 12px rgba(0,0,0,0.1)" : "0 4px 12px rgba(0,0,0,0.1)"
                }}
            >
                <div 
                    style={{ 
                        position: "relative", 
                        padding: "8px 8px 0 8px" 
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                >
                    <textarea
                        ref={textAreaRef}
                        value={currentUserPrompt}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                            const value = e.target.value;
                            setCurrentUserprompt(value);
                            updateMentionStateFromInput(value, e.target.selectionStart ?? value.length);
                        }}
                        onClick={(e: React.MouseEvent<HTMLTextAreaElement>) => {
                            const target = e.currentTarget;
                            updateMentionStateFromInput(target.value, target.selectionStart ?? target.value.length);
                        }}
                        onKeyUp={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                            const target = e.currentTarget;
                            updateMentionStateFromInput(target.value, target.selectionStart ?? target.value.length);
                        }}
                        onFocus={() => {
                            setIsFocused(true);
                        }}
                        onBlur={() => {
                            setIsFocused(false);
                        }}
                        onKeyDown={handleTextKeydown}
                        placeholder={inputPlaceholder}
                        disabled={isUsageExceeded || backendRequestTriggered}
                        style={{
                            width: "100%",
                            overflowY: "auto",
                            padding: "0",
                            border: "none",
                            resize: "none",
                            outline: "none",
                            fontSize: "13px",
                            lineHeight: "1.5",
                            maxHeight: "120px",
                            minHeight: "24px",
                            backgroundColor: "transparent",
                            color: "var(--vscode-input-foreground)",
                            fontFamily: "var(--vscode-font-family)"
                        }}
                        rows={1}
                    />
                </div>

                {(files.length > 0 || images.length > 0) && !isInitialPromptLoaded && (
                    <FlexRow style={{ flexWrap: "wrap", gap: "4px", padding: "0 8px 4px 8px" }}>
                        {files.length > 0 && (
                            <Attachments
                                attachments={files}
                                nameAttribute="name"
                                addControls={!backendRequestTriggered}
                                setAttachments={setFiles}
                            />
                        )}
                        {images.length > 0 && (
                            <Attachments
                                attachments={images}
                                nameAttribute="imageName"
                                addControls={!backendRequestTriggered}
                                setAttachments={setImages}
                            />
                        )}
                    </FlexRow>
                )}

                <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    padding: "4px 8px",
                    marginTop: "4px"
                }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div ref={modeMenuRef} style={{ position: "relative" }}>
                            <FooterTooltip
                                content="Switch Ask, Plan, and Edit modes"
                                align="start"
                            >
                                <button
                                    onClick={() => setShowModeMenu(!showModeMenu)}
                                    disabled={isUsageExceeded || backendRequestTriggered}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "2px 6px",
                                        fontSize: "11px",
                                        backgroundColor: "var(--vscode-badge-background)",
                                        color: "var(--vscode-badge-foreground)",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: (isUsageExceeded || backendRequestTriggered) ? "not-allowed" : "pointer",
                                        opacity: (isUsageExceeded || backendRequestTriggered) ? 0.5 : 0.8
                                    }}
                                >
                                    <Codicon name={getModeIcon(agentMode)} />
                                    {getModeLabel(agentMode)}
                                </button>
                            </FooterTooltip>
                                {showModeMenu && (
                                <div style={{
                                    position: "absolute",
                                    bottom: "100%",
                                    left: 0,
                                    marginBottom: "4px",
                                    backgroundColor: "var(--vscode-dropdown-background)",
                                    border: "1px solid var(--vscode-dropdown-border)",
                                    borderRadius: "4px",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                                    zIndex: 1000,
                                    minWidth: "100px",
                                    overflow: "hidden",
                                }}>
                                    {(['ask', 'plan', 'edit'] as AgentMode[]).map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => { setAgentMode(m); setShowModeMenu(false); }}
                                            disabled={backendRequestTriggered}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                width: "100%",
                                                padding: "6px 10px",
                                                fontSize: "12px",
                                                border: "none",
                                                cursor: backendRequestTriggered ? "not-allowed" : "pointer",
                                                backgroundColor: agentMode === m
                                                    ? "var(--vscode-list-activeSelectionBackground)"
                                                    : "transparent",
                                                color: agentMode === m
                                                    ? "var(--vscode-list-activeSelectionForeground)"
                                                    : "var(--vscode-dropdown-foreground)",
                                                opacity: backendRequestTriggered ? 0.5 : 1,
                                            }}
                                        >
                                            <Codicon name={getModeIcon(m)} />
                                            {getModeLabel(m)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {SHOW_THINKING_TOGGLE && (
                            <FooterTooltip content="Enable Claude thinking mode">
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        marginLeft: "4px"
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: "10px",
                                            color: "var(--vscode-descriptionForeground)",
                                            userSelect: "none"
                                        }}
                                    >
                                        Thinking
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsThinkingEnabled((prev) => !prev)}
                                        disabled={isUsageExceeded || backendRequestTriggered}
                                        aria-pressed={isThinkingEnabled}
                                        style={{
                                            position: "relative",
                                            width: "34px",
                                            height: "18px",
                                            borderRadius: "999px",
                                            border: "none",
                                            padding: 0,
                                            cursor: (isUsageExceeded || backendRequestTriggered) ? "not-allowed" : "pointer",
                                            backgroundColor: isThinkingEnabled
                                                ? "var(--vscode-button-background)"
                                                : "var(--vscode-input-border)",
                                            opacity: (isUsageExceeded || backendRequestTriggered) ? 0.5 : 1
                                        }}
                                    >
                                        <span
                                            style={{
                                                position: "absolute",
                                                top: "2px",
                                                left: isThinkingEnabled ? "18px" : "2px",
                                                width: "14px",
                                                height: "14px",
                                                borderRadius: "50%",
                                                backgroundColor: "var(--vscode-button-foreground)"
                                            }}
                                        />
                                    </button>
                                </div>
                            </FooterTooltip>
                        )}
                        <FooterTooltip content="Enable web search and fetch without approval prompts">
                            <button
                                type="button"
                                onClick={() => setIsWebAccessEnabled((prev) => !prev)}
                                disabled={isUsageExceeded || backendRequestTriggered}
                                aria-pressed={isWebAccessEnabled}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "6px",
                                    border: "none",
                                    cursor: (isUsageExceeded || backendRequestTriggered) ? "not-allowed" : "pointer",
                                    backgroundColor: isWebAccessEnabled
                                        ? "var(--vscode-button-background)"
                                        : "transparent",
                                    color: isWebAccessEnabled
                                        ? "var(--vscode-button-foreground)"
                                        : "var(--vscode-descriptionForeground)",
                                    opacity: (isUsageExceeded || backendRequestTriggered) ? 0.5 : 1
                                }}
                            >
                                <Codicon name="globe" />
                            </button>
                        </FooterTooltip>
                        {contextUsagePercent >= MANUAL_COMPACT_VISIBLE_USAGE_PERCENT && (
                            <FooterTooltip
                                variant="card"
                                align="start"
                                content={
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                        <div style={{ fontWeight: 600 }}>Summarize context</div>
                                        <div style={{ color: "var(--vscode-descriptionForeground)" }}>
                                            Click to summarize earlier messages and free up context.
                                        </div>
                                        <div style={{ color: "var(--vscode-descriptionForeground)" }}>
                                            {`${remainingContextPercent}% context remaining.`}
                                        </div>
                                        <div style={{ color: "var(--vscode-descriptionForeground)" }}>
                                            Copilot also summarizes automatically near the limit.
                                        </div>
                                    </div>
                                }
                            >
                                <button
                                    onClick={handleManualCompact}
                                    disabled={isUsageExceeded || isCompacting || backendRequestTriggered || messages.length === 0}
                                    style={{
                                        fontSize: "10px",
                                        color: contextUsagePercent >= 80 ? "var(--vscode-errorForeground)" : "var(--vscode-descriptionForeground)",
                                        background: "transparent",
                                        border: "none",
                                        cursor: (isUsageExceeded || isCompacting || backendRequestTriggered || messages.length === 0) ? "not-allowed" : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        opacity: (isUsageExceeded || isCompacting || backendRequestTriggered || messages.length === 0) ? 0.5 : 1
                                    }}
                                >
                                    <Codicon name="history" />
                                    {contextUsagePercent}%
                                </button>
                            </FooterTooltip>
                        )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <FooterTooltip content="Attach files or images">
                            <StyledTransParentButton
                                onClick={() => document.getElementById("fileInput")?.click()}
                                style={{
                                    width: "24px",
                                    padding: "4px",
                                    opacity: (isUsageExceeded || backendRequestTriggered) ? 0.5 : 1,
                                    cursor: (isUsageExceeded || backendRequestTriggered) ? "not-allowed" : "pointer",
                                    color: "var(--vscode-descriptionForeground)"
                                }}
                                disabled={isUsageExceeded || backendRequestTriggered}
                            >
                                <Codicon name="attach" />
                            </StyledTransParentButton>
                        </FooterTooltip>

                        {backendRequestTriggered ? (
                            <FooterTooltip content="Interrupt">
                                <button
                                    onClick={handleInterrupt}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: "24px",
                                        height: "24px",
                                        borderRadius: "50%",
                                        backgroundColor: "var(--vscode-button-background)",
                                        color: "var(--vscode-button-foreground)",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: 0,
                                        lineHeight: 0
                                    }}
                                >
                                    <span
                                        className="codicon codicon-primitive-square"
                                        style={{
                                            fontSize: "15px",
                                            lineHeight: 1,
                                            display: "block",
                                            transform: "translateY(-0.5px)"
                                        }}
                                    />
                                </button>
                            </FooterTooltip>
                        ) : (
                            <FooterTooltip content="Send message">
                                <button
                                    onClick={() => currentUserPrompt.trim() !== "" && handleSend()}
                                    disabled={isUsageExceeded || isCompacting || currentUserPrompt.trim() === ""}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: "24px",
                                        height: "24px",
                                        borderRadius: "50%",
                                        backgroundColor: currentUserPrompt.trim() !== "" 
                                            ? "var(--vscode-button-background)" 
                                            : "var(--vscode-button-secondaryBackground)",
                                        color: currentUserPrompt.trim() !== "" 
                                            ? "var(--vscode-button-foreground)" 
                                            : "var(--vscode-button-secondaryForeground)",
                                        border: "none",
                                        cursor: (currentUserPrompt.trim() !== "" && !isCompacting) ? "pointer" : "default"
                                    }}
                                >
                                    <Codicon name="arrow-up" />
                                </button>
                            </FooterTooltip>
                        )}
                    </div>
                </div>
                
                <input
                    id="fileInput"
                    type="file"
                    style={{ display: "none" }}
                    multiple
                    accept={[...VALID_FILE_TYPES.files, ...VALID_FILE_TYPES.images].join(",")}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleFileAttach(e, files, setFiles, images, setImages, setFileUploadStatus)
                    }
                    disabled={isUsageExceeded || backendRequestTriggered}
                />
            </FloatingInputContainer>
        </Footer>
    );
};

export default AIChatFooter;
