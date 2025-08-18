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
import { generateSuggestions, generateId, getBackendUrlAndView, fetchCodeGenerationsWithRetry, getDiagnosticsReponseFromLlm, replaceCodeBlock } from "../utils";
import { Role, MessageType, CopilotChatEntry, BackendRequestType, FixedConfigItem, CorrectedCodeItem, ChatMessage } from "../types";
import Attachments from "./Attachments";

/**
 * Footer component containing chat input and controls
 */
const AIChatFooter: React.FC = () => {
    const {
        backendUri,
        rpcClient,
        setMessages,
        copilotChat,
        setCopilotChat,
        codeBlocks,
        setCodeBlocks,
        currentUserPrompt,
        setCurrentUserprompt,
        backendRequestTriggered,
        setBackendRequestTriggered,
        isInitialPromptLoaded,
        setIsInitialPromptLoaded,
        isRuntimeVersionThresholdReached,
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

    // List of programming languages to filter for actual code files (Kept it as a list for extensibility)
    const codeLanguages = [
        'xml'
    ];

    // Function to extract code content from a code block
    const extractCodeContent = (codeBlock: string): { language: string, code: string } | null => {
        // Match the language identifier and code content
        const match = codeBlock.match(/```([\w#+]*)\s*\n([\s\S]*?)```/);
        if (!match) return null;

        const language = match[1].trim().toLowerCase();
        const code = match[2];

        // Check if this is an actual code file (not JSON examples or other non-code content)
        if (codeLanguages.includes(language)) {
            return { language, code };
        }
        return null;
    };

    const toggleThinkingSelection = () => {
        setChecked(!thinkingChecked);
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

        // Abort the fetch
        controller.abort();

        // Create a new AbortController for future fetches
        resetController();

        // If we're in the validation phase, reset the validation state
        if (isValidating) {
            setIsValidating(false);
        }

        // Remove the last user and copilot messages
        setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            newMessages.pop(); // Remove the last user message
            newMessages.pop(); // Remove the last copilot message
            return newMessages;
        });

        // Generate suggestions based on chat history
        await generateSuggestions(backendUri, copilotChat, rpcClient, new AbortController()).then((response) => {
            setMessages((prevMessages) => [...prevMessages, ...response]);
        });

        // Explicitly adjust the textarea height after suggestion generation
        if (textAreaRef.current) {
            setTimeout(() => {
                textAreaRef.current.style.height = "auto";
                textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
            }, 0);
        }
        isStopButtonClicked.current = false;
        
        // Reset backend request triggered state
        setBackendRequestTriggered(false);
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

        // Variable to hold Assistant response
        let assistant_response = "";

        // Reset the current chat code blocks array for this new chat
        currentChatCodeBlocksRef.current = [];

        // Add the current user prompt to the chats based on the request type
        let currentCopilotChat: CopilotChatEntry[] = [...copilotChat];
        const chatId = generateId();
        const updateChats = (userPrompt: string, userMessageType?: MessageType) => {
            // Append labels to the user prompt
            setMessages((prevMessages) => [
                ...prevMessages,
                { id: chatId, role: Role.MIUser, content: userPrompt, type: userMessageType, files, images },
                {
                    id: chatId,
                    role: Role.MICopilot,
                    content: assistant_response,
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

        const { backendUrl, view } = await getBackendUrlAndView(rpcClient);
        const url = backendUri + backendUrl;

        try {
            const response = await fetchCodeGenerationsWithRetry(
                url,
                isRuntimeVersionThresholdReached,
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

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let result = "";

            // process the response stream from backend
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                result += chunk;

                const lines = result.split("\n");
                for (let i = 0; i < lines.length - 1; i++) {
                    try {
                        const json = JSON.parse(lines[i]);

                        // Update token usage information
                        const tokenUsage = json.usage;
                        const maxTokens = tokenUsage.max_usage;

                        if (maxTokens == -1) {
                            setRemainingTokenPercentage(-1);
                        } else {
                            const remainingTokens = tokenUsage.remaining_tokens;
                            let percentage = Math.round((remainingTokens / maxTokens) * 100);

                            if (percentage < 0) percentage = 0;

                            setRemainingTokenPercentage(percentage);
                        }

                        if (json.content == null) {
                            // End of the MI copilot response reached
                            // Add backend response to copilot chat
                            setCopilotChat((prevCopilotChat) => [
                                ...prevCopilotChat,
                                { id: chatId, role: Role.CopilotAssistant, content: assistant_response },
                            ]);

                            // Filter XML code blocks and pass them to getCodeDiagnostics
                            const xmlCodes = currentChatCodeBlocksRef.current
                                .filter(codeBlock => {
                                    // Extract language from the comment line
                                    const languageMatch = codeBlock.match(/\/\/ Language: (\w+)/);
                                    return languageMatch && languageMatch[1].toLowerCase() === 'xml';
                                })
                                .map((xmlCodeBlock, index) => {
                                    // Remove the language comment line and get the actual code
                                    const code = xmlCodeBlock.replace(/\/\/ Language: \w+\n/, '');
                                    
                                    // Extract the name attribute from the XML content
                                    const nameMatch = code.match(/name=["']([^"']+)["']/);
                                    const fileName = nameMatch ? `${nameMatch[1]}.xml` : `code_${index}.xml`;
                                    
                                    return {
                                        fileName,
                                        code
                                    };
                                });
                            
                            
                            // Only call getCodeDiagnostics if there are XML code blocks
                            if (xmlCodes.length > 0) {
                                try {
                                    // Set validating state to true when we start getting diagnostics
                                    setIsValidating(true);
                                    
                                    // Get diagnostics from the RPC client
                                    const diagnosticResponse = await rpcClient.getMiDiagramRpcClient().getCodeDiagnostics({
                                        xmlCodes
                                    });
                                    
                                    const hasAnyDiagnostics = diagnosticResponse.diagnostics.some(file => file.diagnostics.length > 0);

                                    // If there are diagnostics, send them to the LLM for analysis
                                    if (hasAnyDiagnostics) {
                                        // Import the getDiagnosticsReponseFromLlm function
                                        const llmResponse = await getDiagnosticsReponseFromLlm(
                                            diagnosticResponse,
                                            xmlCodes,
                                            rpcClient,
                                            new AbortController() // Create a new controller for this request
                                        );
                                        
                                        // Process the LLM response
                                        const llmResponseData = await llmResponse.json();
                                        
                                        // Process the fixed_config from the LLM response - this is the only format we need to handle
                                        if (llmResponseData.fixed_config && Array.isArray(llmResponseData.fixed_config)) {
                                            // Create a map to store the latest corrected code for each file
                                            const fileCorrections = new Map<string, string>();
                                            
                                            // Process all items in the fixed_config array and store the latest correction for each file
                                            llmResponseData.fixed_config.forEach((item: FixedConfigItem) => {
                                                if (item.name && (item.configuration || item.code)) {
                                                    const correctedCode = item.configuration || item.code;
                                                    const fileName = item.name;
                                                    
                                                    // Store the corrected code for this file
                                                    fileCorrections.set(fileName, correctedCode);
                                                    
                                                    // Find the corresponding XML code block in the current chat
                                                    const xmlCodeIndex = xmlCodes.findIndex(xml => 
                                                        xml.fileName === fileName || 
                                                        (!fileName.endsWith('.xml') && xml.fileName === fileName + '.xml') ||
                                                        (fileName.endsWith('.xml') && xml.fileName === fileName.slice(0, -4))
                                                    );
                                                    
                                                    if (xmlCodeIndex !== -1) {
                                                        // Replace the code in the XML codes array
                                                        xmlCodes[xmlCodeIndex].code = correctedCode;
                                                    }
                                                }
                                            });
                                            
                                            // Helper function to update message content with corrections
                                            const updateMessageContent = <T extends { role: Role; id?: number; content: string; type?: MessageType }>(
                                                prevState: T[],
                                                assistantRole: Role,
                                                messageId: number,
                                                corrections: Map<string, string>
                                            ): T[] => {
                                                const newState = [...prevState];
                                                
                                                // Try to find the message with this chat ID
                                                const lastAssistantMessageIndex = newState.findIndex(
                                                    msg => msg.role === assistantRole && msg.id === messageId
                                                );
                                                
                                                if (lastAssistantMessageIndex !== -1) {
                                                    let content = newState[lastAssistantMessageIndex].content;
                                                    
                                                    // Apply all corrections to this message
                                                    corrections.forEach((correctedCode, fileName) => {
                                                        content = replaceCodeBlock(content, fileName, correctedCode);
                                                    });
                                                    
                                                    // Update the message with all corrections
                                                    newState[lastAssistantMessageIndex] = {
                                                        ...newState[lastAssistantMessageIndex],
                                                        content: content
                                                    };
                                                } else {
                                                    // If we can't find the message with the specific chatId,
                                                    // try to update the most recent assistant message
                                                    const lastIndex = newState.length - 1;
                                                    for (let i = lastIndex; i >= 0; i--) {
                                                        if (newState[i].role === assistantRole) {
                                                            let content = newState[i].content;
                                                            let appendContent = "";
                                                            
                                                            // Try to replace existing code blocks first
                                                            corrections.forEach((correctedCode, fileName) => {
                                                                const newContent = replaceCodeBlock(content, fileName, correctedCode);
                                                                if (newContent === content) {
                                                                    // If no replacement was made, prepare to append
                                                                    appendContent += `\n\n**Updated ${fileName}**\n\`\`\`xml\n${correctedCode}\n\`\`\``;
                                                                } else {
                                                                    content = newContent;
                                                                }
                                                            });
                                                            
                                                            // Update the message with all corrections
                                                            newState[i] = {
                                                                ...newState[i],
                                                                content: content + appendContent
                                                            };
                                                            break;
                                                        }
                                                    }
                                                }
                                                
                                                return newState;
                                            };

                                            // Now apply all corrections to the messages
                                            if (fileCorrections.size > 0) {
                                                // Update the messages state
                                                setMessages(prevMessages => 
                                                    updateMessageContent<ChatMessage>(prevMessages, Role.MICopilot, chatId, fileCorrections)
                                                );
                                                
                                                // Also update the copilotChat state
                                                setCopilotChat(prevCopilotChat => 
                                                    updateMessageContent<CopilotChatEntry>(prevCopilotChat, Role.CopilotAssistant, chatId, fileCorrections)
                                                );
                                            }
                                        }
                                    }
                                    // Reset validating state when LLM correction is complete
                                    setIsValidating(false);
                                } catch (error) {
                                    console.error("Error processing diagnostics:", error);
                                    // Reset validating state on error
                                    setIsValidating(false);
                                }
                            }

                            const questions = json.questions.map((question: string) => {
                                return {
                                    id: chatId,
                                    role: Role.default,
                                    content: question,
                                    type: MessageType.Question,
                                };
                            });
                            setMessages((prevMessages) => [...prevMessages, ...questions]);
                        } else {
                            assistant_response += json.content;

                            // Update the last assistance message with the new content
                            setMessages((prevMessages) => {
                                const newMessages = [...prevMessages];
                                newMessages[newMessages.length - 1].content += json.content;
                                return newMessages;
                            });

                            // Extract code blocks
                            const regex = /```[\s\S]*?```/g;
                            let match;
                            const newCodeBlocks = [...codeBlocks];

                            while ((match = regex.exec(assistant_response)) !== null) {
                                if (!newCodeBlocks.includes(match[0])) {
                                    newCodeBlocks.push(match[0]);
                                    
                                    // Process the code block to extract actual code files
                                    const codeContent = extractCodeContent(match[0]);
                                    if (codeContent) {
                                        // Only add actual code files to the current chat's code blocks array
                                        const codeFileEntry = `// Language: ${codeContent.language}\n${codeContent.code}`;
                                        if (!currentChatCodeBlocksRef.current.includes(codeFileEntry)) {
                                            currentChatCodeBlocksRef.current.push(codeFileEntry);
                                        }
                                    }
                                }
                            }

                            setCodeBlocks(newCodeBlocks);
                        }
                    } catch (error) {
                        console.error("Error parsing JSON:", error);
                    }
                }

                result = lines[lines.length - 1];
                isResponseReceived.current = true;
            }

            if (result) {
                try {
                    const json = JSON.parse(result);
                    // Handle final result if needed
                    return json;
                } catch (error) {
                    console.error("Error parsing JSON:", error);
                }
            }
        } catch (error) {
            if (!isStopButtonClicked) {
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
                                placeholder={placeholder}
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
                                opacity: backendRequestTriggered || isValidating ? 0.5 : 1,
                                cursor: backendRequestTriggered || isValidating ? "not-allowed" : "pointer"
                            }}
                            disabled={backendRequestTriggered || isValidating}
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
                        disabled={backendRequestTriggered || isValidating}
                    />
                    
                    <StyledTransParentButton
                        onClick={() => ((backendRequestTriggered || isValidating) ? handleStop() : handleSend())}
                        style={{
                            width: "30px",
                            color: isDarkMode ? "var(--vscode-input-foreground)" : "var(--vscode-editor-foreground)",
                        }}
                        disabled={(currentUserPrompt.trim() === "" && !backendRequestTriggered && !isValidating)}
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
