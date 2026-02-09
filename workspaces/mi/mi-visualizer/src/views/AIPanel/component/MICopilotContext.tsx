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

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { FileObject, ImageObject, TodoItem, Question } from "@wso2/mi-core";
import { LoaderWrapper, ProgressRing } from "../styles";
import {
    ChatMessage,
    CopilotChatEntry,
    MessageType,
    Role,
} from "@wso2/mi-core";
import { GroupedSessions } from "./SessionSwitcher";

// Pending user question type (using structured Question format from mi-core)
export interface PendingUserQuestion {
    questionId: string;
    questions: Question[];
}

// Pending plan approval type (for UI)
export interface PendingPlanApproval {
    approvalId: string;
    approvalKind?: 'enter_plan_mode' | 'exit_plan_mode' | 'exit_plan_mode_without_plan' | 'web_search' | 'web_fetch';
    approvalTitle?: string;
    approveLabel?: string;
    rejectLabel?: string;
    allowFeedback?: boolean;
    planFilePath?: string;
    content?: string;  // Summary or plan content to display
}
import {
    RpcClientType,
} from "../types";
import {
    getProjectRuntimeVersion,
    getProjectUUID,
    compareVersions,
    updateTokenInfo,
    convertChat,
    generateId
} from "../utils";
import { convertEventsToMessages } from "../utils/eventToMessageConverter";
import { useFeedback } from "./useFeedback";

export type AgentMode = 'ask' | 'edit' | 'plan';

// MI Copilot context type
interface MICopilotContextType {
    rpcClient: RpcClientType;
    projectRuntimeVersion: string;
    projectUUID: string;

    // State for showing communication in UI
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;

    // State for communication with backend
    copilotChat: CopilotChatEntry[];
    setCopilotChat: React.Dispatch<React.SetStateAction<CopilotChatEntry[]>>;

    // State for file and image uploads to define context
    files: FileObject[];
    setFiles: React.Dispatch<React.SetStateAction<FileObject[]>>;
    images: ImageObject[];
    setImages: React.Dispatch<React.SetStateAction<ImageObject[]>>;

    // State to handle current user input
    currentUserPrompt: string;
    setCurrentUserprompt: React.Dispatch<React.SetStateAction<string>>;

    // State to handle chat events
    isInitialPromptLoaded: boolean;
    setIsInitialPromptLoaded: React.Dispatch<React.SetStateAction<boolean>>;
    backendRequestTriggered: boolean;
    setBackendRequestTriggered: React.Dispatch<React.SetStateAction<boolean>>;
    controller: AbortController;
    resetController: () => void;

    // State to handle tokens
    tokenInfo: {
        remainingPercentage: number;
        isLessThanOne: boolean;
        timeToReset: number;
    };
    setRemainingTokenPercentage: React.Dispatch<React.SetStateAction<number>>;

    // Feedback functionality
    feedbackGiven: 'positive' | 'negative' | null;
    setFeedbackGiven: React.Dispatch<React.SetStateAction<'positive' | 'negative' | null>>;
    handleFeedback: (index: number, isPositive: boolean, detailedFeedback?: string) => Promise<boolean>;

    // Plan mode state
    pendingQuestion: PendingUserQuestion | null;
    setPendingQuestion: React.Dispatch<React.SetStateAction<PendingUserQuestion | null>>;
    pendingPlanApproval: PendingPlanApproval | null;
    setPendingPlanApproval: React.Dispatch<React.SetStateAction<PendingPlanApproval | null>>;
    todos: TodoItem[];
    setTodos: React.Dispatch<React.SetStateAction<TodoItem[]>>;
    isPlanMode: boolean;
    setIsPlanMode: React.Dispatch<React.SetStateAction<boolean>>;

    // Context usage tracking (for compact button)
    lastTotalInputTokens: number;
    setLastTotalInputTokens: React.Dispatch<React.SetStateAction<number>>;

    // Session management state
    currentSessionId: string | null;
    currentSessionTitle: string;
    sessions: GroupedSessions | null;
    isSessionsLoading: boolean;
    refreshSessions: (overrideSessionId?: string) => Promise<void>;
    switchToSession: (sessionId: string) => Promise<void>;
    createNewSession: () => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;
    agentMode: AgentMode;
    setAgentMode: React.Dispatch<React.SetStateAction<AgentMode>>;
}

// Define the context for MI Copilot
const MICopilotContext = createContext<MICopilotContextType | undefined>(undefined);

// Define a provider component prop
interface MICopilotProviderProps {
  children: React.ReactNode;
}

export function MICopilotContextProvider({ children }: MICopilotProviderProps) {
    const { rpcClient } = useVisualizerContext();

    const [projectRuntimeVersion, setProjectRuntimeVersion] = useState("");
    const [projectUUID, setProjectUUID] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // UI related Data
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    // Backend related Data
    const [copilotChat, setCopilotChat] = useState<CopilotChatEntry[]>([]);
    const [files, setFiles] = useState<FileObject[]>([]);
    const [images, setImages] = useState<ImageObject[]>([]);
    const [currentUserPrompt, setCurrentUserprompt] = useState("");
    // Event related Data
    const [backendRequestTriggered, setBackendRequestTriggered] = useState(false);
    const [isInitialPromptLoaded, setIsInitialPromptLoaded] = useState(false);
    const [controller, setController] = useState(new AbortController());
    const resetController = () => {
            const newController = new AbortController();
            setController(newController);
        };
    // Token related Data
    const [remainingTokenPercentage, setRemainingTokenPercentage] = useState<number>(0);
    const [remaingTokenLessThanOne, setRemaingTokenLessThanOne] = useState<boolean>(false);
    const [timeToReset, setTimeToReset] = useState<number>(0);

    // Plan mode state
    const [pendingQuestion, setPendingQuestion] = useState<PendingUserQuestion | null>(null);
    const [pendingPlanApproval, setPendingPlanApproval] = useState<PendingPlanApproval | null>(null);
    const [todos, setTodos] = useState<TodoItem[]>([]);
    const [isPlanMode, setIsPlanMode] = useState<boolean>(false);
    const [agentMode, setAgentMode] = useState<AgentMode>('edit');

    // Session management state
    // Context usage tracking
    const [lastTotalInputTokens, setLastTotalInputTokens] = useState(0);

    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [currentSessionTitle, setCurrentSessionTitle] = useState<string>('New Chat');
    const [sessions, setSessions] = useState<GroupedSessions | null>(null);
    const [isSessionsLoading, setIsSessionsLoading] = useState<boolean>(false);

    // Feedback functionality
    const { feedbackGiven, setFeedbackGiven, handleFeedback } = useFeedback({
        messages,
        copilotChat,
        rpcClient,
    });

    // Session management functions
    const refreshSessions = useCallback(async (overrideSessionId?: string) => {
        if (!rpcClient) return;
        setIsSessionsLoading(true);
        try {
            const response = await rpcClient.getMiAgentPanelRpcClient().listSessions({});
            if (response.success) {
                setSessions(response.sessions);
                // Update current session title if we have sessions
                const activeSessionId = overrideSessionId || currentSessionId;
                if (activeSessionId && response.sessions) {
                    const allSessions = [
                        ...response.sessions.today,
                        ...response.sessions.yesterday,
                        ...response.sessions.pastWeek,
                        ...response.sessions.older
                    ];
                    const activeSession = allSessions.find(s => s.sessionId === activeSessionId);
                    if (activeSession) {
                        setCurrentSessionTitle(activeSession.title);
                    }
                }
            }
        } catch (error) {
            console.error('[AI Panel] Failed to refresh sessions', error);
        } finally {
            setIsSessionsLoading(false);
        }
    }, [rpcClient, currentSessionId]);

    const switchToSession = useCallback(async (sessionId: string) => {
        if (!rpcClient) return;
        setIsSessionsLoading(true);
        try {
            const response = await rpcClient.getMiAgentPanelRpcClient().switchSession({ sessionId });
            if (response.success) {
                const responseMode = (response as { mode?: AgentMode }).mode;
                setCurrentSessionId(response.sessionId);
                // Convert events to UI messages
                const uiMessages = convertEventsToMessages(response.events);
                setMessages(uiMessages);
                setCopilotChat([]);
                // Update context usage from switched session
                setLastTotalInputTokens(response.lastTotalInputTokens ?? 0);
                setAgentMode(responseMode ?? 'edit');
                // Clear plan mode state when switching sessions
                setPendingQuestion(null);
                setPendingPlanApproval(null);
                setTodos([]);
                setIsPlanMode(false);
                // Refresh sessions with the new session ID to avoid stale closure
                await refreshSessions(response.sessionId);
            }
        } catch (error) {
            console.error('[AI Panel] Failed to switch session', error);
        } finally {
            setIsSessionsLoading(false);
        }
    }, [rpcClient, refreshSessions]);

    const createNewSession = useCallback(async () => {
        if (!rpcClient) return;
        setIsSessionsLoading(true);
        try {
            const response = await rpcClient.getMiAgentPanelRpcClient().createNewSession({});
            if (response.success) {
                const responseMode = (response as { mode?: AgentMode }).mode;
                setCurrentSessionId(response.sessionId);
                setCurrentSessionTitle('New Chat');
                setMessages([]);
                setCopilotChat([]);
                setFiles([]);
                setImages([]);
                setCurrentUserprompt('');
                // Reset context usage for new session
                setLastTotalInputTokens(0);
                setAgentMode(responseMode ?? 'edit');
                // Clear plan mode state
                setPendingQuestion(null);
                setPendingPlanApproval(null);
                setTodos([]);
                setIsPlanMode(false);
                // Refresh sessions list with the new session ID
                await refreshSessions(response.sessionId);
            }
        } catch (error) {
            console.error('[AI Panel] Failed to create new session', error);
        } finally {
            setIsSessionsLoading(false);
        }
    }, [rpcClient, refreshSessions]);

    const deleteSession = useCallback(async (sessionId: string) => {
        if (!rpcClient) return;
        // Don't allow deleting current session
        if (sessionId === currentSessionId) {
            console.warn('[AI Panel] Cannot delete current session');
            return;
        }
        try {
            const response = await rpcClient.getMiAgentPanelRpcClient().deleteSession({ sessionId });
            if (response.success) {
                // Refresh sessions list
                await refreshSessions();
            }
        } catch (error) {
            console.error('[AI Panel] Failed to delete session', error);
        }
    }, [rpcClient, currentSessionId, refreshSessions]);

    useEffect(() => {
        const initializeContext = async () => {
            if (rpcClient) {

                const runtimeVersion = await getProjectRuntimeVersion(rpcClient);
                setProjectRuntimeVersion(runtimeVersion);

                const uuid = await getProjectUUID(rpcClient);
                setProjectUUID(uuid);

                const machineView = await rpcClient.getAIVisualizerState();

                // Fetch and update usage information
                rpcClient.getMiAiPanelRpcClient().fetchUsage().then((usage) => {
                    if (usage) {
                        // Update Token Information from fresh state
                        rpcClient.getAIVisualizerState().then((updatedMachineView) => {
                            const { timeToReset, remainingTokenPercentage } = updateTokenInfo(updatedMachineView);
                            setRemainingTokenPercentage(remainingTokenPercentage);
                            setTimeToReset(timeToReset);
                        }).catch((error) => {
                            console.error('Failed to update token information:', error);
                        });
                    }
                }).catch((error) => {
                    console.error('Failed to fetch usage information:', error);
                });

                // Initial token info from current state
                const { timeToReset, remainingTokenPercentage } = updateTokenInfo(machineView);
                setRemainingTokenPercentage(remainingTokenPercentage);
                setTimeToReset(timeToReset);

                // Handle Initial Prompt Loading
                if (machineView.initialPrompt?.aiPrompt) {
                    const initialPrompt = machineView.initialPrompt.aiPrompt;
                    const initialFiles = machineView.initialPrompt.files || [];
                    const initialImages = machineView.initialPrompt.images || [];

                    setFiles(initialFiles);
                    setImages(initialImages);
                    setCurrentUserprompt(initialPrompt);
                    setIsInitialPromptLoaded(true);
                } else {
                    // Load chat history from backend via RPC
                    try {
                        const response = await rpcClient.getMiAgentPanelRpcClient().loadChatHistory({});

                        if (response.success) {
                            const responseMode = (response as { mode?: AgentMode }).mode;
                            // Store session ID
                            if (response.sessionId) {
                                setCurrentSessionId(response.sessionId);
                            }
                            setAgentMode(responseMode ?? 'edit');

                            if (response.events.length > 0) {
                                console.log(`[AI Panel] Loaded ${response.events.length} events from backend`);

                                // Convert events to UI messages using shared utility
                                const uiMessages = convertEventsToMessages(response.events);

                                setMessages(uiMessages);
                            } else {
                                console.log('[AI Panel] No previous chat history found');
                            }

                            // Initialize context usage from last known tokens
                            if (response.lastTotalInputTokens) {
                                setLastTotalInputTokens(response.lastTotalInputTokens);
                            }

                            // Load sessions list to get current session title
                            const sessionsResponse = await rpcClient.getMiAgentPanelRpcClient().listSessions({});
                            if (sessionsResponse.success) {
                                setSessions(sessionsResponse.sessions);
                                // Find current session title
                                if (response.sessionId && sessionsResponse.sessions) {
                                    const allSessions = [
                                        ...sessionsResponse.sessions.today,
                                        ...sessionsResponse.sessions.yesterday,
                                        ...sessionsResponse.sessions.pastWeek,
                                        ...sessionsResponse.sessions.older
                                    ];
                                    const currentSession = allSessions.find(s => s.sessionId === response.sessionId);
                                    if (currentSession) {
                                        setCurrentSessionTitle(currentSession.title);
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error('[AI Panel] Failed to load chat history from backend', error);
                    }

                }
                setIsLoading(false);
            }
        }
        initializeContext();
    }, [rpcClient]);

    useEffect(() => {
        setRemaingTokenLessThanOne(remainingTokenPercentage < 1 && remainingTokenPercentage > 0);
    }, [remainingTokenPercentage]);

    const currentContext: MICopilotContextType = {
        rpcClient,
        projectRuntimeVersion,
        projectUUID,
        messages,
        setMessages,
        copilotChat,
        setCopilotChat,
        files,
        setFiles,
        images,
        setImages,
        currentUserPrompt,
        setCurrentUserprompt,
        isInitialPromptLoaded,
        setIsInitialPromptLoaded,
        backendRequestTriggered,
        setBackendRequestTriggered,
        controller,
        resetController,
        setRemainingTokenPercentage,
        tokenInfo: {
            remainingPercentage: remainingTokenPercentage,
            isLessThanOne: remaingTokenLessThanOne,
            timeToReset: timeToReset,
        },
        feedbackGiven,
        setFeedbackGiven,
        handleFeedback,
        // Plan mode state
        pendingQuestion,
        setPendingQuestion,
        pendingPlanApproval,
        setPendingPlanApproval,
        todos,
        setTodos,
        isPlanMode,
        setIsPlanMode,
        // Context usage tracking
        lastTotalInputTokens,
        setLastTotalInputTokens,
        // Session management
        currentSessionId,
        currentSessionTitle,
        sessions,
        isSessionsLoading,
        refreshSessions,
        switchToSession,
        createNewSession,
        deleteSession,
        agentMode,
        setAgentMode,
    };

    return (
        <div
            style={{
                height: "100%",
            }}
        >
            {isLoading ? (
                <LoaderWrapper>
                    <ProgressRing />
                </LoaderWrapper>
            ) : (
                <MICopilotContext.Provider value={currentContext}>
                   {children}
                </MICopilotContext.Provider>
            )}
        </div>
    );        
};

// Create a custom hook to use the MICopilotContext
export const useMICopilotContext = () => {
  const context = useContext(MICopilotContext);
  if (context === undefined) {
    throw new Error('useMICopilotContext must be used within a MICopilotProvider');
  }
  return context;
};
