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

import React from "react";
import { Button, Codicon } from "@wso2/ui-toolkit";
import ReactMarkdown from "react-markdown";
import {
    ChatMessage as StyledChatMessage,
    RoleContainer,
    EditDeleteButtons,
    PreviewContainerRole,
    FlexRow,
} from "../styles";
import { CodeSegment } from "./CodeSegment";
import { splitContent } from "../utils";
import { useMICopilotContext } from "./MICopilotContext";
import { MarkdownRendererProps, ChatMessage, CopilotChatEntry } from "../types";
import { Role, MessageType } from "../types";
import Attachments from "./Attachments";

// Markdown renderer component
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdownContent }) => {
    return (
        <ReactMarkdown
            components={{
                h1: ({ node, ...props }: { node?: any; [key: string]: any }) => (
                    <h1 style={{ fontSize: "1.3em", fontWeight: "bold", marginTop: "20px" }} {...props} />
                ),
                h2: ({ node, ...props }: { node?: unknown; [key: string]: any }) => (
                    <h2 style={{ fontSize: "1.0em", fontWeight: "bold" }} {...props} />
                ),
                h3: ({ node, ...props }: { node?: unknown; [key: string]: any }) => (
                    <h3 style={{ fontSize: "1em", fontWeight: "bold" }} {...props} />
                ),
                p: ({ node, ...props }: { node?: unknown; [key: string]: any }) => (
                    <p style={{ fontSize: "1em", lineHeight: "1.5" }} {...props} />
                ),
            }}
        >
            {markdownContent}
        </ReactMarkdown>
    );
};

interface ChatMessageProps {
    message: ChatMessage;
    index: number;
}

/**
 * ChatMessage component that displays a single message in the chat
 */
const AIChatMessage: React.FC<ChatMessageProps> = ({ message, index }) => {
    const {
        isRuntimeVersionThresholdReached,
        messages,
        setMessages,
        setCurrentUserprompt,
        copilotChat,
        setCopilotChat,
        backendRequestTriggered
    } = useMICopilotContext();

    // Chat Message Controls : Edit and Delete
    const handleEditMessage = (index: number) => {
        const messageToEdit = messages[index];
        setCurrentUserprompt(messageToEdit.content);

        const deleteMessagesFromId = (messages: ChatMessage[], id: number): ChatMessage[] => {
            const messageIndex = messages.findIndex((message) => message.id === id);
            if (messageIndex !== -1) {
                return messages.filter(
                    (message, index) => index < messageIndex || message.type === MessageType.Question
                );
            }
            return messages;
        };

        const deleteCopilotMessagesFromId = (messages: CopilotChatEntry[], id: number): CopilotChatEntry[] => {
            const messageIndex = messages.findIndex((message) => message.id === id);
            return messageIndex !== -1 ? messages.slice(0, messageIndex) : messages;
        };

        setMessages((prevMessages) => deleteMessagesFromId(prevMessages, messageToEdit.id));
        setCopilotChat((prevMessages) => deleteCopilotMessagesFromId(prevMessages, messageToEdit.id));
    };

    const handleDeleteMessage = (id: number) => {
        const deleteMessageById = (messages: ChatMessage[], id: number): ChatMessage[] => {
            const messageIndex = messages.findIndex((message) => message.id === id);
            if (messageIndex !== -1) {
                // Remove the user message and its corresponding response
                return messages.filter(
                    (_, index) =>
                        index !== messageIndex && index !== messageIndex + 1 && message.type !== MessageType.Question
                );
            }
            return messages;
        };

        const deleteCopilotMessageById = (messages: CopilotChatEntry[], id: number): CopilotChatEntry[] => {
            const messageIndex = copilotChat.findIndex((message) => message.id === id);
            if (messageIndex !== -1) {
                // Remove the user message and its corresponding response
                return messages.filter((_, index) => index !== messageIndex && index !== messageIndex + 1);
            }
            return messages;
        };

        setMessages((prevMessages) => deleteMessageById(prevMessages, id));
        setCopilotChat((prevMessages) => deleteCopilotMessageById(prevMessages, id));
    };

    // Skip rendering question or label messages
    if (message.type === MessageType.Question || message.type === MessageType.Label) {
        return null;
    }

    return (
        <StyledChatMessage>
            <RoleContainer>
                {message.role === Role.MIUser ? <Codicon name="account" /> : <Codicon name="hubot" />}
                <h3 style={{ margin: 0 }}>{message.role}</h3>
                {message.role === Role.MICopilot && isRuntimeVersionThresholdReached ? (
                    <PreviewContainerRole>V3-Preview</PreviewContainerRole>
                ) : null}
            </RoleContainer>

            {splitContent(message.content).map((segment, i) =>
                segment.isCode ? (
                    <CodeSegment key={i} segmentText={segment.text} loading={segment.loading} index={index} />
                ) : message.type === "Error" ? (
                    <div style={{ color: "red", marginTop: "10px" }} key={i}>
                        {segment.text}
                    </div>
                ) : (
                    <MarkdownRenderer key={i} markdownContent={segment.text} />
                )
            )}

            {message.role === Role.MIUser && (
                <>
                    <FlexRow>
                        {message.files && message.files.length > 0 && (
                            <Attachments attachments={message.files} nameAttribute="name" addControls={false} />
                        )}
                        {message.images && message.images.length > 0 && (
                            <Attachments attachments={message.images} nameAttribute="imageName" addControls={false} />
                        )}
                    </FlexRow>
                    {!backendRequestTriggered && (
                        <EditDeleteButtons className="edit-delete-buttons">
                        <Button appearance="icon" onClick={() => handleEditMessage(index)} tooltip="Edit">
                            <Codicon name="edit" />
                        </Button>
                        <Button appearance="icon" onClick={() => handleDeleteMessage(message.id)} tooltip="Delete">
                            <Codicon name="trash" />
                        </Button>
                    </EditDeleteButtons>
                    )}
                </>
            )}
        </StyledChatMessage>
    );
};

export default AIChatMessage;
