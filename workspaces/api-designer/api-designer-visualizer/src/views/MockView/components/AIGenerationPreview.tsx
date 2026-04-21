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

import React from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, ProgressRing } from '@wso2/ui-toolkit';

const PreviewContainer = styled.div`
    background: var(--vscode-textCodeBlock-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 16px;
    margin-top: 16px;
`;

const PreviewHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
`;

const PreviewTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CodePreview = styled.pre`
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 12px;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    color: var(--vscode-editor-foreground);
    overflow-x: auto;
    max-height: 300px;
    overflow-y: auto;
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
`;

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    gap: 12px;
    color: var(--vscode-descriptionForeground);
`;

const PreviewActions = styled.div`
    display: flex;
    gap: 8px;
`;

interface AIGenerationPreviewProps {
    code?: string;
    isLoading?: boolean;
    onRegenerate?: () => void;
}

export const AIGenerationPreview: React.FC<AIGenerationPreviewProps> = ({
    code,
    isLoading,
    onRegenerate
}) => {
    if (isLoading) {
        return (
            <PreviewContainer>
                <LoadingContainer>
                    <ProgressRing />
                    <span>Generating mock server code...</span>
                </LoadingContainer>
            </PreviewContainer>
        );
    }

    if (!code) {
        return null;
    }

    // Show first 50 lines of code
    const previewLines = code.split('\n').slice(0, 50).join('\n');
    const hasMore = code.split('\n').length > 50;

    return (
        <PreviewContainer>
            <PreviewHeader>
                <PreviewTitle>
                    <Codicon name="file-code" />
                    Generated Server Code Preview
                </PreviewTitle>
                <PreviewActions>
                    {onRegenerate && (
                        <Button
                            appearance="secondary"
                            onClick={onRegenerate}
                        >
                            <Codicon name="refresh" sx={{ marginRight: 6 }} />
                            Regenerate
                        </Button>
                    )}
                </PreviewActions>
            </PreviewHeader>
            <CodePreview>
                {previewLines}
                {hasMore && '\n... (truncated)'}
            </CodePreview>
        </PreviewContainer>
    );
};

