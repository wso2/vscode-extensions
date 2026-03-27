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
import { keyframes } from "@emotion/css";

const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

const BashContainer = styled.div`
    background-color: rgba(128, 128, 128, 0.06);
    border: 1px solid rgba(128, 128, 128, 0.15);
    border-radius: 4px;
    margin: 8px 0;
    overflow: hidden;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
`;

const BashHeader = styled.div`
    display: flex;
    align-items: center;
    padding: 6px 10px;
    background-color: rgba(128, 128, 128, 0.05);
    border-bottom: 1px solid rgba(128, 128, 128, 0.12);
    cursor: pointer;
    user-select: none;

    &:hover {
        background-color: rgba(128, 128, 128, 0.1);
    }
`;

const StatusDot = styled.span`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 8px;
    background-color: var(--vscode-terminal-ansiGreen, #4caf50);
`;

const Spinner = styled.span`
    display: inline-block;
    margin-right: 8px;
    font-size: 14px;
    animation: ${spin} 1s linear infinite;
    color: var(--vscode-descriptionForeground);
`;

const HeaderTitle = styled.span`
    font-weight: 500;
    color: var(--vscode-editor-foreground);
`;

const HeaderDescription = styled.span`
    color: var(--vscode-descriptionForeground);
    margin-left: 8px;
    font-size: 11px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ExpandIcon = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    margin-left: 8px;
`;

const BashContent = styled.div`
    padding: 0;
`;

const Section = styled.div`
    padding: 6px 10px;
    border-bottom: 1px solid rgba(128, 128, 128, 0.12);

    &:last-child {
        border-bottom: none;
    }
`;

const SectionLabel = styled.span`
    display: inline-block;
    width: 28px;
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    vertical-align: top;
`;

const SectionContent = styled.pre`
    display: inline-block;
    margin: 0;
    padding: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    max-width: calc(100% - 35px);
    vertical-align: top;
`;

const CommandText = styled(SectionContent)`
    color: var(--vscode-terminal-ansiCyan, #0097a7);
`;

const LoadingText = styled.span`
    color: var(--vscode-descriptionForeground);
    font-style: italic;
`;

const ExpandText = styled.span`
    color: var(--vscode-textLink-foreground, #007acc);
    font-size: 11px;
    cursor: pointer;
    margin-left: 28px;
    display: block;
    padding: 4px 0;

    &:hover {
        text-decoration: underline;
    }
`;

interface BashOutputData {
    command: string;
    description?: string;
    output: string;
    exitCode: number;
    running?: boolean;
    loading?: boolean;
}

interface BashOutputSegmentProps {
    data: BashOutputData;
}

const PREVIEW_LINES = 3;
const MAX_COMMAND_LENGTH = 80;

const BashOutputSegment: React.FC<BashOutputSegmentProps> = ({ data }) => {
    const [expanded, setExpanded] = useState(false);

    const { command, description, output, loading } = data;

    // Truncate command for display
    const displayCommand = command.length > MAX_COMMAND_LENGTH
        ? command.substring(0, MAX_COMMAND_LENGTH) + '...'
        : command;

    // Split output into lines
    const outputLines = output?.split('\n') || [];
    const hasMoreLines = outputLines.length > PREVIEW_LINES;

    // Get preview lines
    const previewOutput = hasMoreLines
        ? outputLines.slice(0, PREVIEW_LINES).join('\n')
        : output;

    return (
        <BashContainer>
            <BashHeader onClick={() => !loading && setExpanded(!expanded)}>
                {loading ? (
                    <Spinner className="codicon codicon-loading" />
                ) : (
                    <StatusDot />
                )}
                <HeaderTitle>Shell</HeaderTitle>
                {description && <HeaderDescription>{description}</HeaderDescription>}
                {!loading && (
                    <ExpandIcon>
                        <span className={`codicon ${expanded ? 'codicon-chevron-up' : 'codicon-chevron-down'}`} />
                    </ExpandIcon>
                )}
            </BashHeader>
            <BashContent>
                <Section>
                    <SectionLabel>IN</SectionLabel>
                    <CommandText>{expanded ? command : displayCommand}</CommandText>
                </Section>
                {loading ? (
                    <Section>
                        <SectionLabel>OUT</SectionLabel>
                        <LoadingText>Running...</LoadingText>
                    </Section>
                ) : output && (
                    <Section>
                        <SectionLabel>OUT</SectionLabel>
                        <SectionContent>{expanded ? output : previewOutput}</SectionContent>
                        {hasMoreLines && !expanded && (
                            <ExpandText onClick={(e) => { e.stopPropagation(); setExpanded(true); }}>
                                ... {outputLines.length - PREVIEW_LINES} more lines
                            </ExpandText>
                        )}
                    </Section>
                )}
            </BashContent>
        </BashContainer>
    );
};

export default BashOutputSegment;
