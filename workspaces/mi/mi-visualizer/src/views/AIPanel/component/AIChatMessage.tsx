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
import { Codicon } from "@wso2/ui-toolkit";
import ReactMarkdown from "react-markdown";
import {
    ChatMessage as StyledChatMessage,
    RoleContainer,
    FlexRow,
} from "../styles";
import { CodeSegment } from "./CodeSegment";
import { splitContent } from "../utils";
import { useMICopilotContext } from "./MICopilotContext";
import { MarkdownRendererProps } from "../types";
import { Role, MessageType, ChatMessage } from "@wso2/mi-core";
import Attachments from "./Attachments";
import FeedbackBar from "./FeedbackBar";
import ToolCallSegment from "./ToolCallSegment";
import TodoListSegment from "./TodoListSegment";
import BashOutputSegment from "./BashOutputSegment";
import CompactSummarySegment from "./CompactSummarySegment";

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
        messages,
        backendRequestTriggered,
        feedbackGiven,
        handleFeedback
    } = useMICopilotContext();

    // Skip rendering question or label messages
    if (message.type === MessageType.Question || message.type === MessageType.Label) {
        return null;
    }

    return (
        <StyledChatMessage>
            <RoleContainer>
                {message.role === Role.MIUser ? <Codicon name="account" /> : <Codicon name="hubot" />}
                <h3 style={{ margin: 0 }}>{message.role}</h3>
            </RoleContainer>

            {splitContent(message.content).map((segment, i) => {
                if (segment.isCode) {
                    return <CodeSegment key={i} segmentText={segment.text} loading={segment.loading} language={segment.language} index={index} />;
                } else if (segment.isToolCall) {
                    return <ToolCallSegment key={i} text={segment.text} loading={segment.loading} failed={segment.failed || false} />;
                } else if (segment.isTodoList) {
                    try {
                        const todoData = JSON.parse(segment.text);
                        return <TodoListSegment key={i} items={todoData.items} status={todoData.status} />;
                    } catch (e) {
                        console.error("Failed to parse todolist JSON:", e);
                        return null;
                    }
                } else if (segment.isBashOutput) {
                    try {
                        const bashData = JSON.parse(segment.text);
                        return <BashOutputSegment key={i} data={bashData} />;
                    } catch (e) {
                        console.error("Failed to parse bashoutput JSON:", e);
                        return null;
                    }
                } else if (segment.isCompactSummary) {
                    return <CompactSummarySegment key={i} text={segment.text} />;
                } else if (message.type === "Error") {
                    return (
                        <div style={{ color: "red", marginTop: "10px" }} key={i}>
                            {segment.text}
                        </div>
                    );
                } else {
                    return <MarkdownRenderer key={i} markdownContent={segment.text} />;
                }
            })}

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
                </>
            )}

            {message.role === Role.MICopilot && 
             message.type === MessageType.AssistantMessage && 
             !backendRequestTriggered &&
             index === messages.length - 1 && (
                <FeedbackBar
                    messageIndex={index}
                    onFeedback={handleFeedback}
                    currentFeedback={feedbackGiven}
                />
            )}
        </StyledChatMessage>
    );
};

export default AIChatMessage;
