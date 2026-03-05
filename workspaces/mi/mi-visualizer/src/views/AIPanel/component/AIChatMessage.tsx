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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styled from "@emotion/styled";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import {
    ChatMessage as StyledChatMessage,
    UserMessageBox,
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
import ThinkingSegment from "./ThinkingSegment";
import FileChangesSegment from "./FileChangesSegment";

// Styled markdown container
const StyledMarkdown = styled.div`
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    font-weight: 450;
    line-height: 1.45;
    color: var(--vscode-editor-foreground);
    -webkit-font-smoothing: antialiased;

    h1, h2, h3, h4, h5, h6 {
        font-weight: 600;
        margin-top: 0.8em;
        margin-bottom: 0.2em;
        color: var(--vscode-editor-foreground);
    }

    h1 { font-size: 1.1em; }
    h2 { font-size: 1.05em; }
    h3 { font-size: 1em; }

    p {
        margin-bottom: 0.4em;
        &:last-child { margin-bottom: 0; }
    }

    strong {
        font-weight: 600;
    }

    em {
        font-style: italic;
        opacity: 0.92;
    }

    ul, ol {
        margin-left: 1.2em;
        margin-bottom: 0.4em;
        padding-left: 0;
    }

    li {
        margin-bottom: 0.15em;

        &::marker {
            color: var(--vscode-descriptionForeground);
        }
    }

    a {
        color: var(--vscode-textLink-foreground);
        text-decoration: none;
        &:hover { text-decoration: underline; }
    }

    code {
        font-family: var(--vscode-editor-font-family);
        background-color: rgba(128, 128, 128, 0.12);
        padding: 1.5px 5px;
        border-radius: 4px;
        font-size: 0.88em;
        border: 1px solid rgba(128, 128, 128, 0.1);
    }

    pre {
        background-color: rgba(128, 128, 128, 0.06);
        border: 1px solid rgba(128, 128, 128, 0.12);
        padding: 10px 12px;
        border-radius: 6px;
        overflow-x: auto;
        margin: 0.5em 0;

        code {
            background-color: transparent;
            padding: 0;
            border-radius: 0;
            border: none;
            font-size: 0.92em;
            line-height: 1.5;
        }
    }

    blockquote {
        margin: 0.5em 0;
        padding: 4px 12px;
        border-left: 3px solid var(--vscode-textLink-foreground);
        background-color: rgba(128, 128, 128, 0.05);
        border-radius: 0 4px 4px 0;
        color: var(--vscode-descriptionForeground);

        p { margin-bottom: 0.2em; }
    }

    hr {
        border: none;
        border-top: 1px solid rgba(128, 128, 128, 0.15);
        margin: 0.8em 0;
    }

    table {
        border-collapse: collapse;
        width: 100%;
        margin: 0.5em 0;
        font-size: 0.92em;
    }

    th, td {
        padding: 4px 10px;
        border: 1px solid rgba(128, 128, 128, 0.15);
        text-align: left;
    }

    th {
        font-weight: 600;
        background-color: rgba(128, 128, 128, 0.08);
    }

    tr:nth-of-type(even) {
        background-color: rgba(128, 128, 128, 0.03);
    }
`;

const GFM_TABLE_SEPARATOR_REGEX = /\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?/;

function normalizeInlineMarkdownTables(markdown: string): string {
    if (!markdown.includes("|") || !GFM_TABLE_SEPARATOR_REGEX.test(markdown)) {
        return markdown;
    }

    return markdown
        .split("\n")
        .map((line) => {
            const trimmed = line.trim();
            if (!trimmed || !GFM_TABLE_SEPARATOR_REGEX.test(trimmed) || !/\|\s+\|/.test(trimmed)) {
                return line;
            }
            return line.replace(/\|\s+\|/g, "|\n|");
        })
        .join("\n");
}

// Markdown renderer component
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdownContent }) => {
    const { rpcClient } = useMICopilotContext();
    const normalizedMarkdown = normalizeInlineMarkdownTables(markdownContent);

    const markdownComponents = {
        code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
                <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                >
                    {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
            ) : (
                <code className={className} {...props}>
                    {children}
                </code>
            );
        },
        a: ({ node, href, children, ...props }: { node?: unknown; href?: string; children?: React.ReactNode; [key: string]: any }) => (
                <a
                    href={href}
                    onClick={(e) => {
                        e.preventDefault();
                        if (!href) return;

                        let filePath = href;
                        if (href.startsWith("file://")) {
                            filePath = href.replace("file://", "");
                        }

                        let line: number | undefined;
                        const hashIndex = filePath.indexOf("#");
                        if (hashIndex !== -1) {
                            const fragment = filePath.substring(hashIndex + 1);
                            filePath = filePath.substring(0, hashIndex);
                            const lineMatch = fragment.match(/^L(\d+)/);
                            if (lineMatch) {
                                line = parseInt(lineMatch[1], 10);
                            }
                        }

                        if (rpcClient) {
                            rpcClient.getMiDiagramRpcClient().openFile({
                                path: filePath,
                                line
                            });
                        }
                    }}
                    {...props}
                >
                    {children}
                </a>
        )
    };

    return (
        <StyledMarkdown>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
            >
                {normalizedMarkdown}
            </ReactMarkdown>
        </StyledMarkdown>
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

    const parsedSegments = splitContent(message.content);

    const hasAnswerContent = parsedSegments.some((segment) => {
        const isSystemSegment = Boolean(
            segment.isToolCall ||
            segment.isTodoList ||
            segment.isBashOutput ||
            segment.isCompactSummary ||
            segment.isFileChanges ||
            segment.isPlan ||
            segment.isThinking
        );

        if (isSystemSegment) {
            return false;
        }

        if (segment.isCode) {
            return true;
        }

        return segment.text.trim().length > 0;
    });

    const renderSegments = () =>
        parsedSegments.map((segment, i) => {
            if (segment.isCode) {
                return (
                    <CodeSegment
                        key={i}
                        segmentText={segment.text}
                        loading={segment.loading}
                        language={segment.language}
                        index={index}
                        chatId={message.id}
                    />
                );
            } else if (segment.isToolCall) {
                return (
                    <ToolCallSegment
                        key={i}
                        text={segment.text}
                        loading={segment.loading}
                        failed={segment.failed || false}
                        filePath={segment.filePath}
                    />
                );
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
            } else if (segment.isFileChanges) {
                return <FileChangesSegment key={i} summaryText={segment.text} />;
            } else if (segment.isPlan) {
                return <CompactSummarySegment key={i} text={segment.text} title="Full Plan" />;
            } else if (segment.isThinking) {
                return <ThinkingSegment key={i} text={segment.text} loading={segment.loading} />;
            } else if (message.type === "Error") {
                return (
                    <div style={{ color: "red", marginTop: "10px" }} key={i}>
                        {segment.text}
                    </div>
                );
            } else {
                return <MarkdownRenderer key={i} markdownContent={segment.text} />;
            }
        });

    if (message.role === Role.MIUser) {
        return (
            <StyledChatMessage>
                <UserMessageBox>
                    {renderSegments()}
                    <FlexRow>
                        {message.files && message.files.length > 0 && (
                            <Attachments attachments={message.files} nameAttribute="name" addControls={false} />
                        )}
                        {message.images && message.images.length > 0 && (
                            <Attachments attachments={message.images} nameAttribute="imageName" addControls={false} />
                        )}
                    </FlexRow>
                </UserMessageBox>
            </StyledChatMessage>
        );
    }

    return (
        <StyledChatMessage>
            {renderSegments()}

            {message.type === MessageType.AssistantMessage &&
             !backendRequestTriggered &&
             index === messages.length - 1 &&
             hasAnswerContent && (
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
