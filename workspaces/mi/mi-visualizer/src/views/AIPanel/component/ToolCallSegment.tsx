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

const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
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
}

const ToolCallSegment: React.FC<ToolCallSegmentProps> = ({ text, loading, failed }) => {
    
    // Parse text: "Reading file /path/to/file.ts" -> Action: "Reading file", Target: "/path..."
    // Simple heuristic: assume target is the last word or path-like
    const words = text.split(' ');
    let action = text;
    let target = '';

    if (words.length > 1) {
        // Check if last word is a file path or distinct entity
        const lastWord = words[words.length - 1];
        if (lastWord.includes('/') || lastWord.includes('.') || lastWord.length > 15) {
             target = lastWord;
             action = words.slice(0, words.length - 1).join(' ');
        }
    }

    const status = loading ? 'loading' : (failed ? 'error' : 'success');
    const iconClass = loading ? 'codicon-loading spin' : (failed ? 'codicon-error' : 'codicon-check');

    return (
        <ToolRow>
            <StatusIcon status={status} className={`codicon ${iconClass}`} />
            <ToolText>{action}</ToolText>
            {target && <ToolTarget title={target}>{target.split('/').pop()}</ToolTarget>}
        </ToolRow>
    );
};

export default ToolCallSegment;
