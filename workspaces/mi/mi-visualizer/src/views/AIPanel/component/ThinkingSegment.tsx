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

const dotWave = keyframes`
    0%, 60%, 100% {
        opacity: 0.25;
        transform: translateY(0);
    }
    30% {
        opacity: 1;
        transform: translateY(-1px);
    }
`;

const ThinkingContainer = styled.div`
    margin: 6px 0;
`;

const ThinkingHeader = styled.button`
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

const ThinkingBody = styled.div`
    margin-top: 4px;
    padding-left: 16px;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    line-height: 1.45;
`;

const Spinner = styled.span`
    width: 10px;
    height: 10px;
    border: 1.4px solid var(--vscode-descriptionForeground);
    border-top-color: var(--vscode-focusBorder);
    border-radius: 50%;
    display: inline-block;
    animation: ${spin} 0.8s linear infinite;
`;

const LoadingDots = styled.span`
    display: inline-flex;
    gap: 1px;
    margin-left: 2px;
    color: var(--vscode-descriptionForeground);

    span {
        display: inline-block;
        animation: ${dotWave} 1.1s ease-in-out infinite;
    }

    span:nth-of-type(1) {
        animation-delay: 0s;
    }

    span:nth-of-type(2) {
        animation-delay: 0.15s;
    }

    span:nth-of-type(3) {
        animation-delay: 0.3s;
    }
`;

interface ThinkingSegmentProps {
    text: string;
    loading?: boolean;
}

const ThinkingSegment: React.FC<ThinkingSegmentProps> = ({ text, loading = false }) => {
    const [expanded, setExpanded] = useState(false);
    const hasText = text.trim().length > 0;

    return (
        <ThinkingContainer>
            <ThinkingHeader onClick={() => setExpanded(!expanded)}>
                <span className={`codicon codicon-chevron-${expanded ? "down" : "right"}`} />
                {loading && <Spinner />}
                {loading ? (
                    <>
                        <span>Thinking</span>
                        <LoadingDots aria-hidden="true">
                            <span>.</span>
                            <span>.</span>
                            <span>.</span>
                        </LoadingDots>
                    </>
                ) : "Thinking"}
            </ThinkingHeader>
            {expanded && (
                <ThinkingBody>
                    {hasText ? text.trim() : (loading ? (
                        <>
                            <span>Thinking</span>
                            <LoadingDots aria-hidden="true">
                                <span>.</span>
                                <span>.</span>
                                <span>.</span>
                            </LoadingDots>
                        </>
                    ) : "No reasoning details.")}
                </ThinkingBody>
            )}
        </ThinkingContainer>
    );
};

export default ThinkingSegment;
