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
import { Codicon, ToggleSwitch } from "@wso2/ui-toolkit";
import SuggestionsList from "./SuggestionsList";
import { useMICopilotContext } from "./MICopilotContext";
import { handleFileAttach } from "../utils";
import { USER_INPUT_PLACEHOLDER_MESSAGE, VALID_FILE_TYPES } from "../constants";
import { generateSuggestions, generateId, getView, fetchCodeGenerationsWithRetry, replaceCodeBlock, setupCodeGenerationEventListener, updateTokenInfo } from "../utils";
import { BackendRequestType } from "../types";
import { Role, MessageType, CopilotChatEntry } from "@wso2/mi-core";
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
        setQuestions,
        copilotChat,
        setCopilotChat,
        currentUserPrompt,
        setCurrentUserprompt,
        backendRequestTriggered,
        setBackendRequestTriggered,
        isInitialPromptLoaded,
        setIsInitialPromptLoaded,
        questions,
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

    const [thinkingChecked, setChecked] = useState(false);
    // State to track when we're validating code (getting diagnostics and LLM corrections)
    const [isValidating, setIsValidating] = useState(false);
    // Reference to store code blocks for the current chat
    const currentChatCodeBlocksRef = useRef<string[]>([]);
    
    // State for streaming code generation
    const [currentChatId, setCurrentChatId] = useState<number | null>(null);
    const [assistantResponse, setAssistantResponse] = useState<string>("");

    const toggleThinkingSelection = () => {
        setChecked(!thinkingChecked);
    };

    // Handle code generation streaming events from extension
    const handleCodeGenerationEvent = (event: any) => {
        // Ignore all events if generation was aborted
        if (abortedRef.current) {
            return;
        }

        switch (event.type) {
            case "code_generation_start":
                // Start of code generation
                setAssistantResponse("");
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
            
            case "code_generation_end":
                // Final content replacement
                if (event.content) {
                    setAssistantResponse(event.content);
                    handleCodeGenerationComplete(event.content);
                }
                // Fetch and update usage after code generation
                rpcClient?.getMiAiPanelRpcClient().fetchUsage().then((usage) => {
                    if (usage) {
                        rpcClient?.getAIVisualizerState().then((machineView) => {
                            const { remainingTokenPercentage } = updateTokenInfo(machineView);
                            setRemainingTokenPercentage(remainingTokenPercentage);
                        });
                    }
                }).catch((error) => {
                    console.error("Error fetching usage after code generation:", error);
                });

                // If diagnostics won't run, generate suggestions immediately
                // Otherwise, wait for code_diagnostic_end event
                if (!event.willRunDiagnostics) {
                    // Clear old suggestions immediately before generating new ones
                    setQuestions([]);
                    const suggestionController = new AbortController();
                    generateSuggestions(copilotChat, rpcClient, suggestionController).then((response) => {
                        if (response && response.length > 0) {
                            setQuestions(response);
                        }
                    }).catch((error) => {
                        console.error("Error generating suggestions after code generation:", error);
                    });
                }
                break;

            case "code_diagnostic_start":
                setIsValidating(true);
                break;

            case "code_diagnostic_end":
                setIsValidating(false);

                // Handle corrected codes if available
                if (event.correctedCodes && event.correctedCodes.length > 0) {
                    const fileCorrections = new Map<string, string>();

                    event.correctedCodes.forEach((item: any) => {
                        if (item.name && (item.configuration || item.code)) {
                            const correctedCode = item.configuration || item.code;
                            const fileName = item.name;
                            fileCorrections.set(fileName, correctedCode);
                        }
                    });

                    // Update messages with corrected code
                    if (fileCorrections.size > 0) {
                        setMessages((prevMessages) => {
                            const newMessages = [...prevMessages];
                            const lastMessage = newMessages[newMessages.length - 1];

                            if (lastMessage && lastMessage.role === Role.MICopilot) {
                                let updatedContent = lastMessage.content;

                                fileCorrections.forEach((correctedCode, fileName) => {
                                    updatedContent = replaceCodeBlock(updatedContent, fileName, correctedCode);
                                });

                                newMessages[newMessages.length - 1] = {
                                    ...lastMessage,
                                    content: updatedContent
                                };
                            }

                            return newMessages;
                        });
                    }
                }

                // Clear old suggestions immediately before generating new ones
                setQuestions([]);
                // Generate fresh suggestions after code generation completes
                generateSuggestions(copilotChat, rpcClient, new AbortController()).then((response) => {
                    if (response && response.length > 0) {
                        setQuestions(response);
                    }
                }).catch((error) => {
                    console.error("Error generating suggestions after code generation:", error);
                });
                break;
            
            case "error":
                setMessages((prevMessages) => [...prevMessages, {
                    id: generateId(),
                    role: Role.MICopilot,
                    content: `Error: ${event.error}`,
                    type: MessageType.Error
                }]);
                setBackendRequestTriggered(false);
                setIsValidating(false);
                break;

            case "stop":
                // Code generation completed
                break;

            case "aborted":
                // Abort acknowledged by extension - all streaming has stopped
                setBackendRequestTriggered(false);
                break;

            default:
                break;
        }
    };

    // Handle completion of code generation
    const handleCodeGenerationComplete = async (finalContent: string) => {
        // Add backend response to copilot chat
        setCopilotChat((prevCopilotChat) => [
            ...prevCopilotChat,
            { id: currentChatId || generateId(), role: Role.CopilotAssistant, content: finalContent },
        ]);

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
            // Request the extension to abort code generation
            await rpcClient.getMiAiPanelRpcClient().abortCodeGeneration();

            // Abort the local controller (for any local operations)
            controller.abort();

            // Create a new AbortController for future fetches
            resetController();

            // If we're in the validation phase, reset the validation state
            if (isValidating) {
                setIsValidating(false);
            }

            // Clear assistant response state
            setAssistantResponse("");

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
            console.error("Error stopping code generation:", error);
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

        // Reset the current chat code blocks array for this new chat
        currentChatCodeBlocksRef.current = [];

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

        switch (requestType) {
            case BackendRequestType.InitialPrompt:
                updateChats(currentUserPrompt, MessageType.InitialPrompt);
                break;
            case BackendRequestType.QuestionClick:
                prompt = prompt.replace(/^\d+\.\s/, "");
                updateChats(prompt, MessageType.UserMessage);
                setCurrentUserprompt(prompt);
                break;
            default:
                updateChats(currentUserPrompt, MessageType.UserMessage);
                break;
        }

        const view = await getView(rpcClient);

        try {
            // Call the RPC method for streaming code generation
            // The streaming will be handled via events in handleCodeGenerationEvent
            await fetchCodeGenerationsWithRetry(
                currentCopilotChat,
                files,
                images,
                rpcClient,
                controller,
                view,
                thinkingChecked
            );

            // Remove the user uploaded files and images after sending them to the backend
            removeAllFiles();
            removeAllImages();
            
            // The streaming response will be handled by events
            // No need to process response.body here anymore

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

    // Set up code generation event listener
    useEffect(() => {
        if (rpcClient) {
            setupCodeGenerationEventListener(rpcClient, (event: any) => {
                handleCodeGenerationEvent(event);
            });
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
                {backendRequestTriggered || isValidating ? (
                    <FlexRow style={{ alignItems: "center", justifyContent: "center", width: "100%", padding: "10px" }}>
                        <span style={{ marginLeft: "10px" }}>
                            {isValidating ? "Validating " : isResponseReceived.current ? "Generating " : "Thinking "}
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
                        {currentUserPrompt.trim() === "" && (
                            <FlexRow style={{ flexWrap: "wrap", gap: "5px", marginBottom: "5px" }}>
                            <SuggestionsList
                                questionMessages={questions}
                                handleQuestionClick={(content: string) =>
                                    handleSend(BackendRequestType.QuestionClick, content)
                                }
                            />
                        </FlexRow>
                        ) }
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
                                opacity: (backendRequestTriggered || isValidating || isUsageExceeded) ? 0.5 : 1,
                                cursor: (backendRequestTriggered || isValidating || isUsageExceeded) ? "not-allowed" : "pointer"
                            }}
                        >
                            <Codicon name="new-file" />
                        </StyledTransParentButton>
                        
                        <div 
                            style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "5px", 
                                backgroundColor: isDarkMode 
                                    ? "var(--vscode-editor-background)" 
                                    : "var(--vscode-list-hoverBackground)",
                                padding: "4px 10px",
                                borderRadius: "12px",
                                border: "1px solid var(--vscode-editor-lineHighlightBorder)",
                                fontSize: "8px"
                            }}
                        >
                            <span>Thinking</span>
                            <ToggleSwitch checked={thinkingChecked} onChange={toggleThinkingSelection} sx={{ fontSize: 5 }} />
                        </div>
                        
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
                        disabled={backendRequestTriggered || isValidating || isUsageExceeded}
                    />
                    
                    <StyledTransParentButton
                        onClick={() => ((backendRequestTriggered || isValidating) ? handleStop() : handleSend())}
                        style={{
                            width: "30px",
                            color: isDarkMode ? "var(--vscode-input-foreground)" : "var(--vscode-editor-foreground)",
                            opacity: isUsageExceeded ? 0.5 : 1,
                            cursor: isUsageExceeded ? "not-allowed" : "pointer"
                        }}
                        disabled={(currentUserPrompt.trim() === "" && !backendRequestTriggered && !isValidating) || isUsageExceeded}
                    >
                        <span
                            className={`codicon ${(backendRequestTriggered || isValidating) ? "codicon-stop-circle" : "codicon-send"}`}
                        />
                    </StyledTransParentButton>
                </FlexRow>
            </FlexColumn>
        </Footer>
    );
};

export default AIChatFooter;
