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

const CompactContainer = styled.div`
    margin: 8px 0;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    overflow: hidden;
`;

const CompactHeader = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 8px 12px;
    background-color: var(--vscode-sideBarSectionHeader-background);
    color: var(--vscode-foreground);
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    font-family: var(--vscode-editor-font-family);

    &:hover {
        opacity: 0.9;
    }
`;

const CompactBody = styled.div`
    padding: 8px 12px;
    font-size: 12px;
    opacity: 0.85;
    line-height: 1.5;
    color: var(--vscode-editor-foreground);
    background-color: var(--vscode-textCodeBlock-background);
`;

interface CompactSummarySegmentProps {
    text: string;
}

const CompactSummarySegment: React.FC<CompactSummarySegmentProps> = ({ text }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <CompactContainer>
            <CompactHeader onClick={() => setIsExpanded(!isExpanded)}>
                <span className={`codicon codicon-chevron-${isExpanded ? 'down' : 'right'}`} />
                Conversation compacted
            </CompactHeader>
            {isExpanded && (
                <CompactBody>
                    <ReactMarkdown>{text}</ReactMarkdown>
                </CompactBody>
            )}
        </CompactContainer>
    );
};

export default CompactSummarySegment;
