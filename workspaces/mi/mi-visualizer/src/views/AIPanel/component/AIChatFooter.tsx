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

import React, { useState, useRef, useEffect } from "react";
import { FlexRow, Footer, StyledTransParentButton, RippleLoader, FlexColumn } from "../styles";
import { Codicon } from "@wso2/ui-toolkit";
import { useMICopilotContext } from "./MICopilotContext";
import { handleFileAttach, convertChatHistoryToModelMessages } from "../utils";
import { USER_INPUT_PLACEHOLDER_MESSAGE, VALID_FILE_TYPES } from "../constants";
import { generateId, updateTokenInfo } from "../utils";
import { BackendRequestType } from "../types";
import { Role, MessageType, CopilotChatEntry, AgentEvent } from "@wso2/mi-core";
import Attachments from "./Attachments";

interface AIChatFooterProps {
    isUsageExceeded?: boolean;
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
    } = useMICopilotContext();

    const [fileUploadStatus, setFileUploadStatus] = useState({ type: "", text: "" });
    const isStopButtonClicked = useRef(false);
    const isResponseReceived = useRef(false);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const abortedRef = useRef(false);
    const lastUserPromptRef = useRef<string>("");
    const [isFocused, setIsFocused] = useState(false);
    const isDarkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    const placeholderString = USER_INPUT_PLACEHOLDER_MESSAGE;
    const [placeholder, setPlaceholder] = useState(placeholderString);
    const [charIndex, setCharIndex] = useState(0);
    const [showDots, setShowDots] = useState(false);

    // State for streaming agent response
    const [currentChatId, setCurrentChatId] = useState<number | null>(null);
    const [assistantResponse, setAssistantResponse] = useState<string>("");
    // Tool status for agent tool calls
    const [toolStatus, setToolStatus] = useState<string>("");

    // Handle agent streaming events from extension
    const handleAgentEvent = (event: AgentEvent) => {
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

                    // Update the last copilot message in real-time
                    setMessages((prevMessages) => {
                        const newMessages = [...prevMessages];
                        if (newMessages.length > 0) {
                            newMessages[newMessages.length - 1].content += content;
                        }
                        return newMessages;
                    });
                }
                break;

            case "tool_call":
                // Show tool status and insert toolcall tag into message content
                // Action text is provided by backend from shared utility
                if (event.toolName) {
                    const toolInfo = event.toolInput as { file_path?: string, file_paths?: string[] };
                    const filePath = toolInfo?.file_path || toolInfo?.file_paths?.[0] || "";

                    // Use loading action provided by backend (already in user-friendly format)
                    const loadingAction = event.loadingAction || "executing";
                    const capitalizedAction = loadingAction.charAt(0).toUpperCase() + loadingAction.slice(1);

                    const toolMessage = filePath
                        ? `${capitalizedAction} ${filePath}...`
                        : `${capitalizedAction}...`;

                    setToolStatus(toolMessage);

                    // Insert toolcall tag with loading state
                    // Store loading action for potential fallback (backend provides completed action in tool_result)
                    setMessages((prevMessages) => {
                        const newMessages = [...prevMessages];
                        if (newMessages.length > 0) {
                            newMessages[newMessages.length - 1].content += `\n\n<toolcall data-loading="true" data-file="${filePath}">${toolMessage}</toolcall>`;
                        }
                        return newMessages;
                    });
                }
                break;

            case "tool_result":
                // Clear tool status and mark toolcall as complete in message
                // Completed action is provided by backend from shared utility
                setToolStatus("");

                // Update the last toolcall tag to show completion
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    if (newMessages.length > 0) {
                        const lastMessageContent = newMessages[newMessages.length - 1].content;

                        // Find the last <toolcall> tag with loading state
                        const toolPattern = /<toolcall data-loading="true" data-file="([^"]*)">([^<]*?)<\/toolcall>/g;
                        const matches = [...lastMessageContent.matchAll(toolPattern)];

                        if (matches.length > 0) {
                            // Get the last match (most recent tool call)
                            const lastMatch = matches[matches.length - 1];
                            const fileName = lastMatch[1];
                            const fullMatch = lastMatch[0];

                            // Use completed action from backend (already in user-friendly format)
                            const completedAction = event.completedAction || "executed";
                            const capitalizedAction = completedAction.charAt(0).toUpperCase() + completedAction.slice(1);

                            // Create completion message
                            const completedMessage = fileName
                                ? `<toolcall>${capitalizedAction} ${fileName}</toolcall>`
                                : `<toolcall>${capitalizedAction}</toolcall>`;

                            // Replace the loading version with completed version
                            const lastIndex = lastMessageContent.lastIndexOf(fullMatch);
                            const beforeMatch = lastMessageContent.substring(0, lastIndex);
                            const afterMatch = lastMessageContent.substring(lastIndex + fullMatch.length);

                            newMessages[newMessages.length - 1].content = beforeMatch + completedMessage + afterMatch;
                        }
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
                // Abort acknowledged - finalize with partial content
                setBackendRequestTriggered(false);
                if (assistantResponse) {
                    setMessages((prevMessages) => {
                        const newMessages = [...prevMessages];
                        if (newMessages.length > 0) {
                            newMessages[newMessages.length - 1].content = assistantResponse + "\n\n*[Aborted]*";
                        }
                        return newMessages;
                    });
                }
                setAssistantResponse("");
                setToolStatus("");
                break;

            case "stop":
                // Agent response completed - extract modelMessages from the event
                if (assistantResponse) {
                    handleAgentComplete(assistantResponse, event.modelMessages || []);
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

            default:
                break;
        }
    };

    // Handle completion of agent response
    const handleAgentComplete = async (finalContent: string, modelMessages?: any[]) => {
        // Add backend response to copilot chat with modelMessages
        const newEntry: CopilotChatEntry = {
            id: currentChatId || generateId(),
            role: Role.CopilotAssistant,
            content: finalContent,
            modelMessages: modelMessages || []
        };

        setCopilotChat((prevCopilotChat) => [...prevCopilotChat, newEntry]);
        setBackendRequestTriggered(false);
    };

    // Handle text input keydown events
    const handleTextKeydown = (event: React.KeyboardEvent) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
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
            await rpcClient.getMiAgentPanelRpcClient().abortAgentGeneration();

            // Abort the local controller (for any local operations)
            controller.abort();

            // Create a new AbortController for future fetches
            resetController();

            // Clear assistant response state
            setAssistantResponse("");
            setToolStatus("");

            // Remove the last user and copilot messages from UI state
            setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                newMessages.pop(); // Remove the last copilot message
                newMessages.pop(); // Remove the last user message
                return newMessages;
            });

            // IMPORTANT: Also remove the last user message from copilotChat
            // to prevent partial conversations from persisting in localStorage
            setCopilotChat((prevChat) => {
                const newChat = [...prevChat];
                if (newChat.length > 0) {
                    newChat.pop(); // Remove the last user message
                }
                return newChat;
            });

            // Restore the original user prompt to the input box
            setCurrentUserprompt(lastUserPromptRef.current);

            // Explicitly adjust the textarea height
            if (textAreaRef.current) {
                setTimeout(() => {
                    textAreaRef.current.style.height = "auto";
                    textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
                }, 0);
            }

            // Reset abort flag after a delay to ensure all buffered events are ignored
            setTimeout(() => {
                abortedRef.current = false;
            }, 200);
        } catch (error) {
            console.error("Error stopping agent generation:", error);
            // Reset abort flag on error as well
            abortedRef.current = false;
        } finally {
            // Don't reset isStopButtonClicked here - keep it true so handleSend's finally
            // block won't clear the restored prompt. It will be reset on next send.

            // Reset backend request triggered state
            setBackendRequestTriggered(false);
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
        // Reset stop button flag at the start of a new send
        isStopButtonClicked.current = false;

        // Block empty user inputs and avoid state conflicts
        if (currentUserPrompt === "" && !Object.values(BackendRequestType).includes(requestType)) {
            return;
        } else {
            // Remove all messages marked as label or questions from history before a backend call
            setMessages((prevMessages) =>
                prevMessages.filter(
                    (message) => message.type !== MessageType.Label && message.type !== MessageType.Question
                )
            );
            setBackendRequestTriggered(true);
            isResponseReceived.current = false;
        }

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
        let messageToSend = currentUserPrompt;
        switch (requestType) {
            case BackendRequestType.InitialPrompt:
                updateChats(currentUserPrompt, MessageType.InitialPrompt);
                break;
            default:
                updateChats(currentUserPrompt, MessageType.UserMessage);
                break;
        }

        try {
            // Convert chat history to model messages format (with tool calls preserved)
            const chatHistory = convertChatHistoryToModelMessages(currentCopilotChat);

            // Call the agent RPC method for streaming response
            // The streaming will be handled via events in handleAgentEvent
            // modelMessages will be sent with the "stop" event
            await rpcClient.getMiAgentPanelRpcClient().sendAgentMessage({
                message: messageToSend,
                chatHistory: chatHistory
            });

            // Remove the user uploaded files and images after sending them to the backend
            // (File upload functionality preserved for future use)
            removeAllFiles();
            removeAllImages();

            // The streaming response will be handled by events
            // modelMessages will arrive with the "stop" event

        } catch (error) {
            if (!isStopButtonClicked.current) {
                setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    newMessages[newMessages.length - 1].content += "Network error. Please check your connectivity.";
                    newMessages[newMessages.length - 1].type = MessageType.Error;
                    return newMessages;
                });
                console.error("Network error:", error);
            }
        } finally {
            if (!isStopButtonClicked.current) {
                setCurrentUserprompt("");
            }
            setBackendRequestTriggered(false);
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

    // Set up agent event listener
    useEffect(() => {
        if (rpcClient) {
            rpcClient.onAgentEvent(handleAgentEvent);
        }
    }, [rpcClient]);

    return (
        <Footer>
            <FlexColumn
                style={{
                    border: isFocused ? "1px solid var(--vscode-focusBorder)" : "none",
                    backgroundColor: isDarkMode
                        ? "var(--vscode-list-hoverBackground)"
                        : "var(--vscode-editorHoverWidget-background)",
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                tabIndex={0}
            >
                {backendRequestTriggered ? (
                    <FlexRow style={{ alignItems: "center", justifyContent: "center", width: "100%", padding: "10px" }}>
                        <span style={{ marginLeft: "10px" }}>
                            {toolStatus || (isResponseReceived.current ? "Generating " : "Thinking ")}
                        </span>
                        <RippleLoader>
                            <div className="ldio">
                                <div></div>
                                <div></div>
                            </div>
                        </RippleLoader>
                    </FlexRow>
                ) : (
                    <>
                        <FlexRow style={{ alignItems: "center", width: "100%", position: "relative" }}>
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
                                placeholder={isUsageExceeded ? "Usage quota exceeded. Please logout and log in with your own API key to continue." : placeholder}
                                disabled={isUsageExceeded}
                                style={{
                                    flex: 1,
                                    overflowY: "auto",
                                    padding: "5px 15px 5px 10px",
                                    borderRadius: "4px",
                                    border: "none",
                                    resize: "none",
                                    outline: "none",
                                    maxHeight: "100px", // Limit height to approximately 5 lines
                                    backgroundColor: isDarkMode
                                        ? "var(--vscode-list-hoverBackground)"
                                        : "var(--vscode-editorHoverWidget-background)",
                                    color: "var(--vscode-input-foreground)",
                                    position: "relative",
                                    opacity: isUsageExceeded ? 0.5 : 1,
                                    cursor: isUsageExceeded ? "not-allowed" : "text"
                                }}
                                rows={2}
                            />
                            {currentUserPrompt.trim() !== "" && (<StyledTransParentButton
                                    onClick={() => setCurrentUserprompt("")}
                                    style={{
                                        width: "20px",
                                        position: "absolute",
                                        right: "2px",
                                        top: "2px",
                                        color: isDarkMode
                                            ? "var(--vscode-input-foreground)"
                                            : "var(--vscode-editor-foreground)",
                                    }}
                                >
                                    <Codicon name="clear-all" />
                                </StyledTransParentButton>
                        )}
                        </FlexRow>
                        <FlexRow style={{ flexWrap: "wrap", gap: "2px", alignItems: "center", marginTop: "10px" }}>
                            {files.length > 0 && !isInitialPromptLoaded ? (
                                <Attachments
                                    attachments={files}
                                    nameAttribute="name"
                                    addControls={true}
                                    setAttachments={setFiles}
                                />
                            ) : null}
                            {images.length > 0 && !isInitialPromptLoaded ? (
                                <Attachments
                                    attachments={images}
                                    nameAttribute="imageName"
                                    addControls={true}
                                    setAttachments={setImages}
                                />
                            ) : null}
                        </FlexRow>
                    </>
                )}
                <FlexRow style={{ justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <StyledTransParentButton
                            onClick={() => document.getElementById("fileInput")?.click()}
                            style={{
                                width: "30px",
                                color: isDarkMode
                                    ? "var(--vscode-input-foreground)"
                                    : "var(--vscode-editor-foreground)",
                                opacity: (backendRequestTriggered || isUsageExceeded) ? 0.5 : 1,
                                cursor: (backendRequestTriggered || isUsageExceeded) ? "not-allowed" : "pointer"
                            }}
                        >
                            <Codicon name="new-file" />
                        </StyledTransParentButton>

                        {fileUploadStatus.text && fileUploadStatus.type === "error" && (
                            <span
                                style={{
                                    marginLeft: "5px",
                                    color: "var(--vscode-errorForeground)",
                                }}
                            >
                                {fileUploadStatus.text}
                            </span>
                        )}
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
                        disabled={backendRequestTriggered || isUsageExceeded}
                    />

                    <StyledTransParentButton
                        onClick={() => (backendRequestTriggered ? handleStop() : handleSend())}
                        style={{
                            width: "30px",
                            color: isDarkMode ? "var(--vscode-input-foreground)" : "var(--vscode-editor-foreground)",
                            opacity: isUsageExceeded ? 0.5 : 1,
                            cursor: isUsageExceeded ? "not-allowed" : "pointer"
                        }}
                        disabled={(currentUserPrompt.trim() === "" && !backendRequestTriggered) || isUsageExceeded}
                    >
                        <span
                            className={`codicon ${backendRequestTriggered ? "codicon-stop-circle" : "codicon-send"}`}
                        />
                    </StyledTransParentButton>
                </FlexRow>
            </FlexColumn>
        </Footer>
    );
};

export default AIChatFooter;
