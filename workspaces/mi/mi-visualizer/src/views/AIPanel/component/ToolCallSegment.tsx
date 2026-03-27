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
import styled from "@emotion/styled";
import { keyframes } from "@emotion/css";
import { useMICopilotContext } from "./MICopilotContext";

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

const ToolRow = styled.div`
    display: flex;
    align-items: center;
    padding: 4px 0;
    margin: 2px 0;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const StatusIcon = styled.span<{ status: 'success' | 'error' | 'loading' }>`
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 8px;
    width: 14px;
    height: 14px;
    color: ${(props: { status: 'success' | 'error' | 'loading' }) => {
        switch (props.status) {
            case 'success': return 'var(--vscode-testing-iconPassed, #4caf50)';
            case 'error': return 'var(--vscode-testing-iconFailed, #f44336)';
            case 'loading': return 'var(--vscode-progressBar-background, #007acc)';
            default: return 'currentColor';
        }
    }};
    
    &.spin {
        animation: ${spin} 1s linear infinite;
    }
`;

const ToolText = styled.span`
    margin-right: 4px;
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

const ToolTarget = styled.span`
    color: var(--vscode-textLink-foreground);
    font-weight: 500;
    cursor: pointer;
    
    &:hover {
        text-decoration: underline;
    }
`;

interface ToolCallSegmentProps {
    text: string;
    loading: boolean;
    failed?: boolean;
    filePath?: string;
}

const PATH_CANDIDATE_REGEX = /([A-Za-z]:\\[^\s]+|(?:\.{1,2}\/|\/)?[^\s]*[\\/][^\s]+|[^\s]+\.[A-Za-z0-9]+(?:[^\s]*)?)/g;

function cleanPathCandidate(raw: string): string {
    return raw.replace(/[),.;:!?]+$/, "").replace(/^["'`]/, "").replace(/["'`]$/, "");
}

function extractPathFromText(text: string): string | undefined {
    const matches = Array.from(text.matchAll(PATH_CANDIDATE_REGEX));
    if (matches.length === 0) {
        return undefined;
    }
    const last = matches[matches.length - 1];
    if (!last[1]) {
        return undefined;
    }
    return cleanPathCandidate(last[1]);
}

function basename(path: string): string {
    const parts = path.split(/[\\/]/);
    return parts[parts.length - 1] || path;
}

function removeTrailingEllipsis(text: string): string {
    return text.replace(/\.\.\.$/, "").trimEnd();
}

const ToolCallSegment: React.FC<ToolCallSegmentProps> = ({ text, loading, failed, filePath }) => {
    const { rpcClient } = useMICopilotContext();

    const resolvedPath = filePath || extractPathFromText(text);
    let action = text;
    let target = "";
    if (resolvedPath) {
        target = resolvedPath;
        const index = text.lastIndexOf(resolvedPath);
        if (index >= 0) {
            action = text.slice(0, index).trim();
        } else {
            action = text.replace(/\s+$/, "");
        }
    }

    const status = loading ? 'loading' : (failed ? 'error' : 'success');
    const iconClass = loading ? 'codicon-loading spin' : (failed ? 'codicon-error' : 'codicon-check');
    const actionText = loading ? removeTrailingEllipsis(action) : action;

    const handleTargetClick = () => {
        if (!target || !rpcClient) {
            return;
        }
        rpcClient.getMiDiagramRpcClient().openFile({
            path: target,
        });
    };

    return (
        <ToolRow>
            <StatusIcon status={status} className={`codicon ${iconClass}`} />
            {actionText && <ToolText>{actionText}</ToolText>}
            {target && (
                <ToolTarget title={target} onClick={handleTargetClick}>
                    {basename(target)}
                </ToolTarget>
            )}
            {loading && (
                <LoadingDots aria-hidden="true">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                </LoadingDots>
            )}
        </ToolRow>
    );
};

export default ToolCallSegment;
