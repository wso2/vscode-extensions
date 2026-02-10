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

import React, { useState } from "react";
import styled from "@emotion/styled";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CompactContainer = styled.div`
    margin: 6px 0;
`;

const CompactHeader = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: none;
    cursor: pointer;
    background: transparent;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    font-weight: 500;
    font-family: var(--vscode-editor-font-family);
`;

const CompactBody = styled.div`
    margin-top: 4px;
    padding-left: 16px;
    font-size: 12px;
    line-height: 1.45;
    color: var(--vscode-descriptionForeground);
    overflow-wrap: anywhere;

    p {
        margin: 0 0 6px;
    }

    p:last-child {
        margin-bottom: 0;
    }

    ul, ol {
        margin: 0 0 6px 18px;
        padding-left: 0;
    }

    li {
        margin: 2px 0;
    }
`;

interface CompactSummarySegmentProps {
    text: string;
    title?: string;
}

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

const CompactSummarySegment: React.FC<CompactSummarySegmentProps> = ({ text, title = "Summary" }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const normalizedText = normalizeInlineMarkdownTables(text);

    return (
        <CompactContainer>
            <CompactHeader onClick={() => setIsExpanded(!isExpanded)}>
                <span className={`codicon codicon-chevron-${isExpanded ? 'down' : 'right'}`} />
                {title}
            </CompactHeader>
            {isExpanded && (
                <CompactBody>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalizedText}</ReactMarkdown>
                </CompactBody>
            )}
        </CompactContainer>
    );
};

export default CompactSummarySegment;
