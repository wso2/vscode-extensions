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
import { FlexRow, Footer, StyledTransParentButton, RippleLoader, FlexColumn, FloatingInputContainer } from "../styles";
import { Codicon } from "@wso2/ui-toolkit";
import { useMICopilotContext, AgentMode } from "./MICopilotContext";
import { handleFileAttach, convertChatHistoryToModelMessages } from "../utils";
import { USER_INPUT_PLACEHOLDER_MESSAGE, VALID_FILE_TYPES } from "../constants";
import { generateId, updateTokenInfo } from "../utils";
import { BackendRequestType } from "../types";
import { Role, MessageType, CopilotChatEntry, AgentEvent, ChatMessage, TodoItem } from "@wso2/mi-core";
import Attachments from "./Attachments";

// Tool name constant
const BASH_TOOL_NAME = 'bash';
const THINKING_PREFERENCE_KEY = 'mi-agent-thinking-enabled';

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

interface AIChatFooterProps {
    isUsageExceeded?: boolean;
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

    const [fileUploadStatus, setFileUploadStatus] = useState({ type: "", text: "" });
    const isStopButtonClicked = useRef(false);
    const isResponseReceived = useRef(false);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const abortedRef = useRef(false);
    const lastUserPromptRef = useRef<string>("");
    const [isFocused, setIsFocused] = useState(false);
    const isDarkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    // Mode switcher state
    const [showModeMenu, setShowModeMenu] = useState(false);
    const modeMenuRef = useRef<HTMLDivElement>(null);
    const [isThinkingEnabled, setIsThinkingEnabled] = useState<boolean>(() => {
        try {
            return localStorage.getItem(THINKING_PREFERENCE_KEY) === 'true';
        } catch {
            return false;
        }
    });

    // Manual compact state
    const [isCompacting, setIsCompacting] = useState(false);

    // Context usage tracking (for compact button display)
    const CONTEXT_TOKEN_THRESHOLD = 180000;
    // Keep this aligned with backend auto-compact threshold in rpc-manager.ts.
    const PRE_SEND_AUTO_COMPACT_THRESHOLD = 6000;
    const contextUsagePercent = Math.min(
        Math.round((lastTotalInputTokens / CONTEXT_TOKEN_THRESHOLD) * 100),
        100
    );

    const placeholderString = USER_INPUT_PLACEHOLDER_MESSAGE;
    const [placeholder, setPlaceholder] = useState(placeholderString);
    const [charIndex, setCharIndex] = useState(0);
    const [showDots, setShowDots] = useState(false);

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
                    const content = event.content;

                    // Update assistant response state
                    setAssistantResponse(prev => prev + content);

                    // Update the last copilot message in real-time (immutable update)
                    setMessages((prev) => updateLastMessage(prev, (c) => c + content));
                }
                break;

            case "thinking_start":
                if (event.thinkingId) {
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
                    const toolInfo = event.toolInput as { file_path?: string, file_paths?: string[], command?: string, description?: string };
                    const filePath = toolInfo?.file_path || toolInfo?.file_paths?.[0] || "";

                    // Handle bash tool specially - show loading bash component
                    if (event.toolName === BASH_TOOL_NAME) {
                        const bashData = {
                            command: toolInfo?.command || '',
                            description: toolInfo?.description || '',
                            output: '',
                            exitCode: 0,
                            loading: true
                        };

                        setToolStatus(toolInfo?.description || "Running command...");
                        setMessages((prev) => updateLastMessage(prev, (c) =>
                            c + `\n\n<bashoutput data-loading="true">${JSON.stringify(bashData)}</bashoutput>`
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
                        c + `\n\n<toolcall data-loading="true" data-file="${filePath}">${toolMessage}</toolcall>`
                    ));
                }
                break;

            case "tool_result":
                // Clear tool status and mark toolcall as complete in message
                // Completed action is provided by backend from shared utility
                setToolStatus("");

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
                setBackendRequestTriggered(false);
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
                            const planContent = typeof planEvent.content === "string" ? planEvent.content.trim() : "";
                            if (planContent) {
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
                            setPendingPlanApproval({
                                approvalId: planEvent.approvalId,
                                planFilePath: planEvent.planFilePath,
                                content: planEvent.content
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
        if (pendingQuestion) {
            try {
                // Send cancellation signal to backend
                await rpcClient.getMiAgentPanelRpcClient().respondToQuestion({
                    questionId: pendingQuestion.questionId,
                    answer: '__USER_CANCELLED__'
                });
            } catch (error) {
                console.error("Error sending cancellation:", error);
            }
            // Clear state
            setPendingQuestion(null);
            setAnswers(new Map());
            setOtherAnswers(new Map());
        }
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
                setPlanRejectionFeedback("");
            } catch (error) {
                console.error("Error responding to plan approval:", error);
            }
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

    // Handle text input keydown events
    const handleTextKeydown = (event: React.KeyboardEvent) => {
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

    // Handle stopping the response generation
    const handleStop = async () => {
        isStopButtonClicked.current = true;
        // Set abort flag BEFORE making any async calls to prevent race conditions
        abortedRef.current = true;

        try {
            // Request the extension to abort agent generation
            // This will save an interruption message to chat history (Claude Code pattern)
            await rpcClient.getMiAgentPanelRpcClient().abortAgentGeneration();

            // Abort the local controller (for any local operations)
            controller.abort();

            // Create a new AbortController for future fetches
            resetController();

            // Clear tool status but keep assistant response for display
            setToolStatus("");

            // Keep the UI as-is with partial response, just mark as interrupted
            // The abort event handler will add "[Aborted]" marker to the message
            // Don't remove messages or restore prompt - user explicitly stopped the generation

            // Reset abort flag after a delay to ensure all buffered events are ignored
            setTimeout(() => {
                abortedRef.current = false;
            }, 200);
        } catch (error) {
            console.error("Error stopping agent generation:", error);
            // Reset abort flag on error as well
            abortedRef.current = false;
        } finally {
            // Reset backend request triggered state
            setBackendRequestTriggered(false);
            // Clear the input prompt since the message was already sent
            setCurrentUserprompt("");
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

        // Reset stop button flag at the start of a new send
        isStopButtonClicked.current = false;

        // Block empty user inputs and avoid state conflicts
        if (outgoingPrompt.trim() === "") {
            return;
        }

        sendInProgressRef.current = true;
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

        try {
            // Convert chat history to model messages format (with tool calls preserved)
            const chatHistory = convertChatHistoryToModelMessages(currentCopilotChat);

            // Call the agent RPC method for streaming response
            // The streaming will be handled via events in handleAgentEvent
            // modelMessages will be sent with the "stop" event
            const response = await rpcClient.getMiAgentPanelRpcClient().sendAgentMessage({
                message: messageToSend,
                mode: agentMode,
                files,
                images,
                thinking: isThinkingEnabled,
                chatHistory: chatHistory
            });

            if (!response.success) {
                throw new Error(response.error || "Failed to send agent request");
            }

            // Remove the user uploaded files and images after sending them to the backend
            removeAllFiles();
            removeAllImages();

            // The streaming response will be handled by events
            // modelMessages will arrive with the "stop" event

        } catch (error) {
            if (!isStopButtonClicked.current) {
                const errorMessage = error instanceof Error ? error.message : "Request failed";
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    newMessages[newMessages.length - 1].content += errorMessage;
                    newMessages[newMessages.length - 1].type = MessageType.Error;
                    return newMessages;
                });
                console.error("Error sending agent message:", error);
            }
        } finally {
            if (!isStopButtonClicked.current) {
                setCurrentUserprompt("");
            }
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

    // Handle placeholder animation
    useEffect(() => {
        const timer = setTimeout(() => {
            if (charIndex < placeholderString.length) {
                setPlaceholder(placeholderString.substring(0, charIndex + 1));
                setCharIndex(charIndex + 1);
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [charIndex]);

    // Handle dots animation for placeholder
    useEffect(() => {
        if (showDots) {
            const dotsTimer = setInterval(() => {
                setPlaceholder((prev) => (prev.endsWith("...") ? placeholderString : prev + "."));
            }, 500);
            return () => clearInterval(dotsTimer);
        }
    }, [showDots]);

    // Reset placeholder when focus is lost
    useEffect(() => {
        if (!isFocused) {
            setPlaceholder(placeholderString);
            setCharIndex(placeholderString.length);
        }
    }, [isFocused]);

    // Clear file upload status after 5 seconds
    useEffect(() => {
        if (fileUploadStatus.text) {
            const timer = setTimeout(() => {
                setFileUploadStatus({ type: "", text: "" });
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [fileUploadStatus]);

    // Persist thinking preference across panel reloads
    useEffect(() => {
        try {
            localStorage.setItem(THINKING_PREFERENCE_KEY, String(isThinkingEnabled));
        } catch {
            // Ignore localStorage errors in restricted environments
        }
    }, [isThinkingEnabled]);

    // Set up agent event listener
    useEffect(() => {
        if (rpcClient) {
            rpcClient.onAgentEvent(handleAgentEvent);
        }
    }, [rpcClient, handleAgentEvent]);

    // Local state for answers to questions
    // For single-select: questionIndex -> selected label
    // For multi-select: questionIndex -> Set of selected labels
    // For "Other": questionIndex -> free text
    const [answers, setAnswers] = useState<Map<number, string | Set<string>>>(new Map());
    const [otherAnswers, setOtherAnswers] = useState<Map<number, string>>(new Map());
    // State for plan rejection feedback
    const [planRejectionFeedback, setPlanRejectionFeedback] = useState("");
    const [showRejectionInput, setShowRejectionInput] = useState(false);

    // Handle escape key to cancel question dialog or plan approval dialog
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (pendingQuestion) {
                    handleQuestionCancel();
                }
                if (pendingPlanApproval) {
                    setPendingPlanApproval(null);
                    setShowRejectionInput(false);
                    setPlanRejectionFeedback("");
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

    // Check if all questions are answered
    const allQuestionsAnswered = pendingQuestion?.questions.every((q, idx) => {
        const answer = answers.get(idx);
        const otherAnswer = otherAnswers.get(idx);

        if (otherAnswer && otherAnswer.trim()) return true;
        if (q.multiSelect && answer instanceof Set && answer.size > 0) return true;
        if (!q.multiSelect && typeof answer === 'string' && answer.trim()) return true;

        return false;
    }) ?? false;

    return (
        <Footer>
            {/* User Question Dialog - Claude Code style with structured questions */}
            {pendingQuestion && (
                <div style={{
                    marginBottom: "6px",
                    backgroundColor: "var(--vscode-editor-background)",
                    border: "1px solid var(--vscode-panel-border)",
                    borderRadius: "4px",
                    overflow: "hidden"
                }}>
                    {/* Header */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 10px",
                        borderBottom: "1px solid var(--vscode-panel-border)",
                        backgroundColor: "var(--vscode-sideBarSectionHeader-background)"
                    }}>
                        <span style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--vscode-foreground)",
                            borderBottom: "2px solid var(--vscode-focusBorder)",
                            paddingBottom: "2px"
                        }}>
                            {pendingQuestion.questions.length === 1 ? "Question" : `Questions (${pendingQuestion.questions.length})`}
                        </span>
                        <button
                            onClick={handleQuestionCancel}
                            style={{
                                background: "none",
                                border: "none",
                                color: "var(--vscode-foreground)",
                                cursor: "pointer",
                                padding: "2px",
                                fontSize: "14px",
                                lineHeight: 1,
                                opacity: 0.7
                            }}
                            title="Cancel (Esc)"
                        >
                            ×
                        </button>
                    </div>

                    {/* Content - Multiple Questions */}
                    <div style={{ padding: "8px 10px", maxHeight: "350px", overflowY: "auto" }}>
                        {pendingQuestion.questions.map((question, questionIndex) => (
                            <div key={questionIndex} style={{
                                marginBottom: questionIndex < pendingQuestion.questions.length - 1 ? "12px" : "0",
                                paddingBottom: questionIndex < pendingQuestion.questions.length - 1 ? "10px" : "0",
                                borderBottom: questionIndex < pendingQuestion.questions.length - 1 ? "1px solid var(--vscode-panel-border)" : "none"
                            }}>
                                {/* Question header chip */}
                                <div style={{
                                    display: "inline-block",
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    padding: "1px 6px",
                                    marginBottom: "6px",
                                    backgroundColor: "var(--vscode-badge-background)",
                                    color: "var(--vscode-badge-foreground)",
                                    borderRadius: "8px"
                                }}>
                                    {question.header}
                                </div>

                                {/* Question text */}
                                <div style={{
                                    fontSize: "12px",
                                    marginBottom: "8px",
                                    color: "var(--vscode-foreground)",
                                    lineHeight: "1.4"
                                }}>
                                    {question.question}
                                </div>

                                {/* Options */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                    {question.options.map((option, optionIndex) => {
                                        const currentAnswer = answers.get(questionIndex);
                                        const isSelected = question.multiSelect
                                            ? (currentAnswer instanceof Set && currentAnswer.has(option.label))
                                            : currentAnswer === option.label;

                                        return (
                                            <label
                                                key={optionIndex}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "flex-start",
                                                    gap: "8px",
                                                    padding: "6px 8px",
                                                    borderRadius: "3px",
                                                    cursor: "pointer",
                                                    backgroundColor: isSelected
                                                        ? "var(--vscode-list-activeSelectionBackground)"
                                                        : "var(--vscode-list-hoverBackground)",
                                                    border: "1px solid " + (isSelected ? "var(--vscode-focusBorder)" : "transparent")
                                                }}
                                                onClick={() => {
                                                    if (question.multiSelect) {
                                                        // Multi-select: toggle in set
                                                        const newAnswers = new Map(answers);
                                                        let currentSet = newAnswers.get(questionIndex) as Set<string> | undefined;

                                                        if (!currentSet || !(currentSet instanceof Set)) {
                                                            currentSet = new Set();
                                                        }

                                                        if (currentSet.has(option.label)) {
                                                            currentSet.delete(option.label);
                                                        } else {
                                                            currentSet.add(option.label);
                                                        }

                                                        newAnswers.set(questionIndex, currentSet);
                                                        setAnswers(newAnswers);

                                                        // Clear "Other" if selecting an option
                                                        if (currentSet.size > 0) {
                                                            const newOtherAnswers = new Map(otherAnswers);
                                                            newOtherAnswers.delete(questionIndex);
                                                            setOtherAnswers(newOtherAnswers);
                                                        }
                                                    } else {
                                                        // Single-select: replace
                                                        const newAnswers = new Map(answers);
                                                        newAnswers.set(questionIndex, option.label);
                                                        setAnswers(newAnswers);

                                                        // Clear "Other" if selecting an option
                                                        const newOtherAnswers = new Map(otherAnswers);
                                                        newOtherAnswers.delete(questionIndex);
                                                        setOtherAnswers(newOtherAnswers);
                                                    }
                                                }}
                                            >
                                                {/* Checkbox or Radio */}
                                                <span style={{
                                                    width: "14px",
                                                    height: "14px",
                                                    borderRadius: question.multiSelect ? "2px" : "50%",
                                                    border: isSelected
                                                        ? `2px solid var(--vscode-focusBorder)`
                                                        : "1px solid var(--vscode-input-border)",
                                                    backgroundColor: isSelected
                                                        ? "var(--vscode-focusBorder)"
                                                        : "transparent",
                                                    flexShrink: 0,
                                                    marginTop: "1px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "9px",
                                                    color: "var(--vscode-editor-background)"
                                                }}>
                                                    {isSelected && "✓"}
                                                </span>

                                                {/* Label and description */}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: "12px", fontWeight: 500, marginBottom: "1px", lineHeight: "1.3" }}>
                                                        {option.label}
                                                    </div>
                                                    <div style={{ fontSize: "11px", opacity: 0.75, lineHeight: "1.3" }}>
                                                        {option.description}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}

                                    {/* Other option */}
                                    <div style={{ marginTop: "3px" }}>
                                        <label
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                padding: "6px 8px",
                                                borderRadius: "3px",
                                                cursor: "pointer",
                                                backgroundColor: otherAnswers.has(questionIndex)
                                                    ? "var(--vscode-list-activeSelectionBackground)"
                                                    : "transparent"
                                            }}
                                            onClick={() => {
                                                // Clear regular answers when selecting "Other"
                                                const newAnswers = new Map(answers);
                                                newAnswers.delete(questionIndex);
                                                setAnswers(newAnswers);
                                            }}
                                        >
                                            <span style={{
                                                width: "14px",
                                                height: "14px",
                                                borderRadius: question.multiSelect ? "2px" : "50%",
                                                border: otherAnswers.has(questionIndex)
                                                    ? "2px solid var(--vscode-focusBorder)"
                                                    : "1px solid var(--vscode-input-border)",
                                                backgroundColor: otherAnswers.has(questionIndex)
                                                    ? "var(--vscode-focusBorder)"
                                                    : "transparent",
                                                flexShrink: 0,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: "9px",
                                                color: "var(--vscode-editor-background)"
                                            }}>
                                                {otherAnswers.has(questionIndex) && "✓"}
                                            </span>
                                            <span style={{ fontSize: "12px" }}>Other</span>
                                        </label>

                                        {/* Free text input for "Other" */}
                                        {(otherAnswers.has(questionIndex) || (!answers.has(questionIndex) && pendingQuestion.questions.length === 1)) && (
                                            <input
                                                type="text"
                                                value={otherAnswers.get(questionIndex) || ""}
                                                onChange={(e) => {
                                                    const newOtherAnswers = new Map(otherAnswers);
                                                    newOtherAnswers.set(questionIndex, e.target.value);
                                                    setOtherAnswers(newOtherAnswers);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" && allQuestionsAnswered) {
                                                        handleQuestionResponse();
                                                    }
                                                }}
                                                placeholder="Type your answer..."
                                                style={{
                                                    width: "100%",
                                                    marginTop: "4px",
                                                    marginLeft: "22px",
                                                    padding: "6px 8px",
                                                    backgroundColor: "var(--vscode-input-background)",
                                                    color: "var(--vscode-input-foreground)",
                                                    border: "1px solid var(--vscode-input-border)",
                                                    borderRadius: "3px",
                                                    fontSize: "12px",
                                                    boxSizing: "border-box",
                                                    maxWidth: "calc(100% - 22px)"
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 10px",
                        borderTop: "1px solid var(--vscode-panel-border)",
                        backgroundColor: "var(--vscode-sideBarSectionHeader-background)"
                    }}>
                        <span style={{
                            fontSize: "10px",
                            color: "var(--vscode-descriptionForeground)"
                        }}>
                            Esc to cancel
                        </span>
                        <button
                            onClick={handleQuestionResponse}
                            disabled={!allQuestionsAnswered}
                            style={{
                                padding: "4px 12px",
                                backgroundColor: allQuestionsAnswered
                                    ? "var(--vscode-button-background)"
                                    : "var(--vscode-button-secondaryBackground)",
                                color: allQuestionsAnswered
                                    ? "var(--vscode-button-foreground)"
                                    : "var(--vscode-button-secondaryForeground)",
                                border: "none",
                                borderRadius: "3px",
                                cursor: allQuestionsAnswered ? "pointer" : "not-allowed",
                                fontSize: "11px",
                                opacity: allQuestionsAnswered ? 1 : 0.6
                            }}
                        >
                            Submit {pendingQuestion.questions.length === 1 ? "answer" : "answers"}
                        </button>
                    </div>
                </div>
            )}

            {/* Plan Approval Dialog - Claude Code style */}
            {pendingPlanApproval && (
                <div style={{
                    marginBottom: "8px",
                    backgroundColor: "var(--vscode-editor-background)",
                    border: "1px solid var(--vscode-panel-border)",
                    borderRadius: "6px",
                    overflow: "hidden"
                }}>
                    {/* Header */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderBottom: "1px solid var(--vscode-panel-border)",
                        backgroundColor: "var(--vscode-sideBarSectionHeader-background)"
                    }}>
                        <span style={{
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "var(--vscode-foreground)",
                            borderBottom: "2px solid var(--vscode-focusBorder)",
                            paddingBottom: "4px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                        }}>
                            <span>📋</span>
                            MI Copilot's Plan
                        </span>
                        <button
                            onClick={() => {
                                setPendingPlanApproval(null);
                                setShowRejectionInput(false);
                                setPlanRejectionFeedback("");
                            }}
                            style={{
                                background: "none",
                                border: "none",
                                color: "var(--vscode-foreground)",
                                cursor: "pointer",
                                padding: "4px",
                                fontSize: "16px",
                                lineHeight: 1,
                                opacity: 0.7
                            }}
                            title="Cancel (Esc)"
                        >
                            ×
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: "12px" }}>
                        {/* Plan summary/content */}
                        <div style={{
                            fontSize: "13px",
                            marginBottom: "12px",
                            color: "var(--vscode-foreground)"
                        }}>
                            {pendingPlanApproval.content || "The plan is ready for your review."}
                        </div>

                        {/* Rejection feedback input (shown when rejecting) */}
                        {showRejectionInput && (
                            <div style={{ marginTop: "12px" }}>
                                <label style={{
                                    fontSize: "12px",
                                    color: "var(--vscode-descriptionForeground)",
                                    marginBottom: "4px",
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
                                        minHeight: "60px",
                                        padding: "8px 10px",
                                        backgroundColor: "var(--vscode-input-background)",
                                        color: "var(--vscode-input-foreground)",
                                        border: "1px solid var(--vscode-input-border)",
                                        borderRadius: "4px",
                                        fontSize: "13px",
                                        boxSizing: "border-box",
                                        resize: "vertical"
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderTop: "1px solid var(--vscode-panel-border)",
                        backgroundColor: "var(--vscode-sideBarSectionHeader-background)"
                    }}>
                        <span style={{
                            fontSize: "11px",
                            color: "var(--vscode-descriptionForeground)"
                        }}>
                            Esc to cancel
                        </span>
                        <div style={{ display: "flex", gap: "8px" }}>
                            {!showRejectionInput ? (
                                <>
                                    <button
                                        onClick={() => setShowRejectionInput(true)}
                                        style={{
                                            padding: "6px 16px",
                                            backgroundColor: "var(--vscode-button-secondaryBackground)",
                                            color: "var(--vscode-button-secondaryForeground)",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            fontSize: "12px"
                                        }}
                                    >
                                        Request Changes
                                    </button>
                                    <button
                                        onClick={() => handlePlanApproval(true)}
                                        style={{
                                            padding: "6px 16px",
                                            backgroundColor: "var(--vscode-button-background)",
                                            color: "var(--vscode-button-foreground)",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            fontSize: "12px"
                                        }}
                                    >
                                        Approve Plan
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setShowRejectionInput(false);
                                            setPlanRejectionFeedback("");
                                        }}
                                        style={{
                                            padding: "6px 16px",
                                            backgroundColor: "transparent",
                                            color: "var(--vscode-foreground)",
                                            border: "1px solid var(--vscode-input-border)",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            fontSize: "12px"
                                        }}
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={() => handlePlanApproval(false, planRejectionFeedback || undefined)}
                                        style={{
                                            padding: "6px 16px",
                                            backgroundColor: "var(--vscode-button-background)",
                                            color: "var(--vscode-button-foreground)",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            fontSize: "12px"
                                        }}
                                    >
                                        Submit Feedback
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}


            <FloatingInputContainer
                style={{
                    border: isFocused ? "1px solid var(--vscode-focusBorder)" : "1px solid var(--vscode-widget-border)",
                    boxShadow: isFocused ? "0 0 0 1px var(--vscode-focusBorder), 0 4px 12px rgba(0,0,0,0.1)" : "0 4px 12px rgba(0,0,0,0.1)",
                    transition: "all 0.2s ease"
                }}
            >
                {backendRequestTriggered ? (
                    <FlexRow style={{ alignItems: "center", justifyContent: "center", width: "100%", padding: "12px" }}>
                        <span style={{ marginLeft: "10px", fontSize: "13px", color: "var(--vscode-descriptionForeground)" }}>
                            {toolStatus || (isResponseReceived.current ? "Generating response..." : "Thinking...")}
                        </span>
                        <RippleLoader>
                            <div className="ldio">
                                <div></div>
                                <div></div>
                            </div>
                        </RippleLoader>
                        <StyledTransParentButton
                            onClick={handleStop}
                            style={{ marginLeft: "auto", color: "var(--vscode-errorForeground)" }}
                            title="Stop Generation"
                        >
                            <Codicon name="stop-circle" />
                        </StyledTransParentButton>
                    </FlexRow>
                ) : (
                    <>
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
                                    setCurrentUserprompt(e.target.value);
                                    setShowDots(false);
                                }}
                                onFocus={() => {
                                    setShowDots(true);
                                    setIsFocused(true);
                                }}
                                onBlur={() => {
                                    setShowDots(false);
                                    setIsFocused(false);
                                }}
                                onKeyDown={handleTextKeydown}
                                placeholder={isUsageExceeded ? "Usage quota exceeded..." : placeholder}
                                disabled={isUsageExceeded}
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
                                        addControls={true}
                                        setAttachments={setFiles}
                                    />
                                )}
                                {images.length > 0 && (
                                    <Attachments
                                        attachments={images}
                                        nameAttribute="imageName"
                                        addControls={true}
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
                                    <button
                                        onClick={() => setShowModeMenu(!showModeMenu)}
                                        disabled={isUsageExceeded}
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
                                            cursor: isUsageExceeded ? "not-allowed" : "pointer",
                                            opacity: isUsageExceeded ? 0.5 : 0.8
                                        }}
                                        title="Switch between Ask, Plan, and Edit modes"
                                    >
                                        <Codicon name={getModeIcon(agentMode)} />
                                        {getModeLabel(agentMode)}
                                    </button>
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
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "6px",
                                                        width: "100%",
                                                        padding: "6px 10px",
                                                        fontSize: "12px",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        backgroundColor: agentMode === m
                                                            ? "var(--vscode-list-activeSelectionBackground)"
                                                            : "transparent",
                                                        color: agentMode === m
                                                            ? "var(--vscode-list-activeSelectionForeground)"
                                                            : "var(--vscode-dropdown-foreground)",
                                                    }}
                                                >
                                                    <Codicon name={getModeIcon(m)} />
                                                    {getModeLabel(m)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        marginLeft: "4px"
                                    }}
                                    title="Enable Claude thinking mode"
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
                                            opacity: (isUsageExceeded || backendRequestTriggered) ? 0.5 : 1,
                                            transition: "background-color 0.2s ease"
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
                                                backgroundColor: "var(--vscode-button-foreground)",
                                                transition: "left 0.2s ease"
                                            }}
                                        />
                                    </button>
                                </div>
                                {contextUsagePercent >= 1 && (
                                    <button
                                        onClick={handleManualCompact}
                                        disabled={isUsageExceeded || isCompacting || messages.length === 0}
                                        title="Click to compact conversation and free up context space"
                                        style={{
                                            fontSize: "10px",
                                            color: contextUsagePercent >= 80 ? "var(--vscode-errorForeground)" : "var(--vscode-descriptionForeground)",
                                            background: "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px"
                                        }}
                                    >
                                        <Codicon name="history" />
                                        {contextUsagePercent}%
                                    </button>
                                )}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <StyledTransParentButton
                                    onClick={() => document.getElementById("fileInput")?.click()}
                                    style={{
                                        width: "24px",
                                        padding: "4px",
                                        opacity: isUsageExceeded ? 0.5 : 1,
                                        cursor: isUsageExceeded ? "not-allowed" : "pointer",
                                        color: "var(--vscode-descriptionForeground)"
                                    }}
                                    disabled={isUsageExceeded}
                                    title="Attach files or images"
                                >
                                    <Codicon name="attach" />
                                </StyledTransParentButton>

                                <button
                                    onClick={() => currentUserPrompt.trim() !== "" && handleSend()}
                                    disabled={isUsageExceeded || isCompacting || backendRequestTriggered || currentUserPrompt.trim() === ""}
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
                                        cursor: (currentUserPrompt.trim() !== "" && !isCompacting && !backendRequestTriggered) ? "pointer" : "default",
                                        transition: "all 0.2s ease"
                                    }}
                                    title="Send Message"
                                >
                                    <Codicon name="arrow-up" />
                                </button>
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
                            disabled={isUsageExceeded}
                        />
                    </>
                )}
            </FloatingInputContainer>
        </Footer>
    );
};

export default AIChatFooter;
