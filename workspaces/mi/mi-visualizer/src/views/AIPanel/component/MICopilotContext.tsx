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

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { FileObject, ImageObject } from "@wso2/mi-core";
import { PROJECT_RUNTIME_VERSION_THRESHOLD } from "../constants";
import { LoaderWrapper, ProgressRing } from "../styles";
import {
    ChatMessage,
    CopilotChatEntry,
    MessageType,
    Role,
} from "@wso2/mi-core";
import {
    RpcClientType,
    FileHistoryEntry,
} from "../types";
import {
    fetchBackendUrl,
    getProjectRuntimeVersion,
    getProjectUUID,
    compareVersions,
    generateSuggestions,
    updateTokenInfo,
    convertChat
} from "../utils";
import { useFeedback } from "./useFeedback";

// MI Copilot context type
interface MICopilotContextType {
    rpcClient: RpcClientType;
    projectRuntimeVersion: string;
    isRuntimeVersionThresholdReached: boolean;
    projectUUID: string;

    // State for showing communication in UI
    messages: ChatMessage[];
    questions: string[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setQuestions: React.Dispatch<React.SetStateAction<string[]>>;

    // State for communication with backend
    copilotChat: CopilotChatEntry[];
    setCopilotChat: React.Dispatch<React.SetStateAction<CopilotChatEntry[]>>;

    // State for file and image uploads to define context
    files: FileObject[];
    setFiles: React.Dispatch<React.SetStateAction<FileObject[]>>;
    images: ImageObject[];
    setImages: React.Dispatch<React.SetStateAction<ImageObject[]>>;

    // State to handle file history
    FileHistory: FileHistoryEntry[];
    setFileHistory: React.Dispatch<React.SetStateAction<FileHistoryEntry[]>>

    // State to handle current user input
    currentUserPrompt: string;
    setCurrentUserprompt: React.Dispatch<React.SetStateAction<string>>;

    // State to handle chat events
    isInitialPromptLoaded: boolean;
    setIsInitialPromptLoaded: React.Dispatch<React.SetStateAction<boolean>>;
    chatClearEventTriggered: boolean;
    setChatClearEventTriggered: React.Dispatch<React.SetStateAction<boolean>>;
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
}

// Define the context for MI Copilot
const MICopilotContext = createContext<MICopilotContextType | undefined>(undefined);

// Define a provider component prop
interface MICopilotProviderProps {
  children: React.ReactNode;
}

// Define Local Storage Keys
const localStorageKeys = {
    chatFile: "",
    questionFile: "",
    fileHistory: "",
};

export function MICopilotContextProvider({ children }: MICopilotProviderProps) {
    const { rpcClient } = useVisualizerContext();

    const [projectRuntimeVersion, setProjectRuntimeVersion] = useState("");
    const [isRuntimeVersionThresholdReached, setIsRuntimeVersionThresholdReached] = useState(false);
    const [projectUUID, setProjectUUID] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // UI related Data
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [questions, setQuestions] = useState<string[]>([]);
    // Backend related Data
    const [copilotChat, setCopilotChat] = useState<CopilotChatEntry[]>([]);
    const [files, setFiles] = useState<FileObject[]>([]);
    const [images, setImages] = useState<ImageObject[]>([]);
    const [currentUserPrompt, setCurrentUserprompt] = useState("");
    // Event related Data
    const [chatClearEventTriggered, setChatClearEventTriggered] = useState(false);
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

    // State to handle file history
    const [FileHistory, setFileHistory] = useState<FileHistoryEntry[]>([]);

    // Feedback functionality
    const { feedbackGiven, setFeedbackGiven, handleFeedback } = useFeedback({
        messages,
        copilotChat,
        rpcClient,
    });

    useEffect(() => {
        const initializeContext = async () => {
            if (rpcClient) {

                const runtimeVersion = await getProjectRuntimeVersion(rpcClient);
                setProjectRuntimeVersion(runtimeVersion);
                setIsRuntimeVersionThresholdReached(
                    compareVersions(runtimeVersion, PROJECT_RUNTIME_VERSION_THRESHOLD) >= 0
                );

                const uuid = await getProjectUUID(rpcClient);
                setProjectUUID(uuid);

                // Update localStorageKeys with the UUID
                localStorageKeys.chatFile = `chatArray-AIGenerationChat-${uuid}`;
                localStorageKeys.questionFile = `Question-AIGenerationChat-${uuid}`;
                localStorageKeys.fileHistory = `fileHistory-AIGenerationChat-${uuid}`;

                const machineView = await rpcClient.getAIVisualizerState();

                // Update Token Information
                const { timeToReset, remainingTokenPercentage } = updateTokenInfo(machineView);
                setRemainingTokenPercentage(remainingTokenPercentage);
                setTimeToReset(timeToReset);

                // Handle Initial Prompt Loading
                if (machineView.initialPrompt.aiPrompt) {
                    const initialPrompt = machineView.initialPrompt.aiPrompt;
                    const initialFiles = machineView.initialPrompt.files || [];
                    const initialImages = machineView.initialPrompt.images || [];

                    setFiles(initialFiles);
                    setImages(initialImages);
                    setCurrentUserprompt(initialPrompt);
                    setIsInitialPromptLoaded(true);
                } else {
                    // Load the stored data from local storage in session reload
                    const storedChatArray = localStorage.getItem(localStorageKeys.chatFile);
                    const storedQuestion = localStorage.getItem(localStorageKeys.questionFile);
                    const storedFileHistory = localStorage.getItem(localStorageKeys.fileHistory);

                    const getQuestions = async () => {
                        if (storedQuestion) {
                            setQuestions((prevMessages) => [...prevMessages, storedQuestion]);
                        } else {
                            generateSuggestions(copilotChat, rpcClient, controller).then((response) => {
                                response.length > 0
                                    ? setQuestions((prevMessages) => [...prevMessages, ...response])
                                    : "";
                                setBackendRequestTriggered(false);
                            });
                        }
                    }

                    if (storedChatArray) {
                        // 1. Load questions
                        getQuestions();

                        // 3. Load Chats
                        const chatArray = JSON.parse(storedChatArray);

                        // Add the messages from the chat array to the view
                        setMessages((prevMessages) => [
                            ...prevMessages,
                            ...chatArray.map((entry: CopilotChatEntry) => {
                                return convertChat(entry);
                            }),
                        ]);
                        setCopilotChat((prevMessages) => [...prevMessages, ...chatArray]);
                    } else {
                        if (copilotChat.length === 0) {
                            getQuestions();
                        }
                    }

                    if (storedFileHistory) {
                        const fileHistoryFromStorage = JSON.parse(storedFileHistory);
                        setFileHistory(fileHistoryFromStorage);
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

    // handle chat clear event
    useEffect(() => {
        if (chatClearEventTriggered) {
            setMessages([]);
            setCopilotChat([]);
            setQuestions([]);
            setFiles([]);
            setImages([]);
            setCurrentUserprompt("");
            // Clear the local storage
            localStorage.removeItem(localStorageKeys.chatFile);
            localStorage.removeItem(localStorageKeys.questionFile);
            localStorage.removeItem(localStorageKeys.fileHistory);
            generateSuggestions(copilotChat, rpcClient, controller).then((response) => {
                response.length > 0 ? setQuestions((prevMessages) => [...prevMessages, ...response]) : null;
                setChatClearEventTriggered(false);
            });
        }
    }, [chatClearEventTriggered]);

    // Update local storage whenever backend call finishes
    useMemo(() => {
        if (!isLoading && !backendRequestTriggered) {
            localStorage.setItem(localStorageKeys.chatFile, JSON.stringify(copilotChat));
            localStorage.setItem(localStorageKeys.questionFile, questions[questions.length - 1] || "");
        }
    }, [isLoading, backendRequestTriggered]);

    useMemo(() => {
        if (!isLoading) {
            localStorage.setItem(localStorageKeys.fileHistory, JSON.stringify(FileHistory));
        }
    }, [FileHistory]);

    const currentContext: MICopilotContextType = {
        rpcClient,
        projectRuntimeVersion,
        isRuntimeVersionThresholdReached,
        projectUUID,
        messages,
        questions,
        setMessages,
        setQuestions,
        copilotChat,
        setCopilotChat,
        files,
        setFiles,
        images,
        setImages,
        currentUserPrompt,
        setCurrentUserprompt,
        chatClearEventTriggered,
        isInitialPromptLoaded,
        setIsInitialPromptLoaded,
        setChatClearEventTriggered,
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
        FileHistory,
        setFileHistory,
        feedbackGiven,
        setFeedbackGiven,
        handleFeedback,
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
