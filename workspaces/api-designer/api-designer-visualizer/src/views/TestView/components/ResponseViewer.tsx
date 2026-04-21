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

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon } from '@wso2/ui-toolkit';
import { TestResult } from '@wso2/api-designer-core';
import { ExtractedVariablesDisplay } from './ExtractedVariablesDisplay';

const ViewerContainer = styled.div`
    background: var(--vscode-editor-background);
    padding: 16px 20px;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const StatusBar = styled.div<{ status: number }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    margin-bottom: 16px;
    color: var(--vscode-foreground);
    font-weight: 600;
    border-bottom: 1px solid var(--vscode-panel-border);
    padding-bottom: 12px;
`;

const StatusInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const MetricsBar = styled.div`
    display: flex;
    gap: 24px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const MetricCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const MetricLabel = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
`;

const MetricValue = styled.div`
    font-size: 16px;
    color: var(--vscode-foreground);
    font-weight: 600;
`;

const TabList = styled.div`
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

interface TabButtonProps {
    active: boolean;
}

const TabButton = styled.button<TabButtonProps>`
    padding: 8px 16px;
    background: ${(props: TabButtonProps) => props.active ? 'var(--vscode-tab-activeBackground)' : 'transparent'};
    border: none;
    border-bottom: 2px solid ${(props: TabButtonProps) => props.active ? 'var(--vscode-focusBorder)' : 'transparent'};
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 13px;
    
    &:hover {
        background: var(--vscode-tab-hoverBackground);
    }
`;

const ContentArea = styled.pre`
    background: var(--vscode-textCodeBlock-background);
    color: var(--vscode-textCodeBlock-foreground);
    padding: 16px;
    border-radius: 4px;
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    line-height: 1.5;
    margin: 0;
    flex: 1;
    overflow-y: auto;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: break-word;
`;

const AssertionsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const AssertionItem = styled.div<{ passed: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--vscode-editor-background);
    border-left: 3px solid ${(props: { passed: boolean }) => 
        props.passed ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)'
    };
    border-radius: 4px;
    font-size: 13px;
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    text-align: center;
    gap: 12px;
    color: var(--vscode-descriptionForeground);
`;

const TabPanel = styled.div`
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
`;

const AssertionsScroll = styled.div`
    flex: 1;
    overflow: auto;
`;

const ExtractedVariablesSection = styled.div`
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--vscode-panel-border);
`;

interface ResponseViewerProps {
    result: TestResult | null;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ result }) => {
    const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'assertions'>('body');

    if (!result) {
        return (
            <ViewerContainer>
                <EmptyState>
                    <Codicon name="arrow-up" sx={{ fontSize: 32, opacity: 0.5 }} />
                    <div>Click "Send" to execute the request</div>
                </EmptyState>
            </ViewerContainer>
        );
    }

    if (result.error) {
        return (
            <ViewerContainer>
                <StatusBar status={0}>
                    <StatusInfo>
                        <Codicon 
                            name="error" 
                            sx={{ 
                                fontSize: '16px',
                                color: 'var(--vscode-testing-iconFailed)'
                            }} 
                        />
                        <span>Request Failed</span>
                    </StatusInfo>
                </StatusBar>
                <ContentArea>{result.error}</ContentArea>
            </ViewerContainer>
        );
    }

    const response = result.response!;

    const handleCopyBody = () => {
        navigator.clipboard.writeText(response.body);
    };

    return (
        <ViewerContainer>
            <StatusBar status={response.status}>
                <StatusInfo>
                    <Codicon 
                        name={result.success ? 'pass-filled' : 'error'} 
                        sx={{ 
                            fontSize: '16px',
                            color: result.success 
                                ? 'var(--vscode-testing-iconPassed)' 
                                : 'var(--vscode-testing-iconFailed)'
                        }} 
                    />
                    <span>{response.status} {response.statusText}</span>
                </StatusInfo>
                <Button
                    appearance="icon"
                    onClick={handleCopyBody}
                >
                    <Codicon name="copy" />
                </Button>
            </StatusBar>

            <MetricsBar>
                <MetricCard>
                    <MetricLabel>Time</MetricLabel>
                    <MetricValue>{response.responseTime}ms</MetricValue>
                </MetricCard>
                <MetricCard>
                    <MetricLabel>Size</MetricLabel>
                    <MetricValue>{(response.size / 1024).toFixed(2)} KB</MetricValue>
                </MetricCard>
                <MetricCard>
                    <MetricLabel>Status</MetricLabel>
                    <MetricValue>{response.status}</MetricValue>
                </MetricCard>
            </MetricsBar>

            <TabList>
                <TabButton active={activeTab === 'body'} onClick={() => setActiveTab('body')}>
                    Body
                </TabButton>
                <TabButton active={activeTab === 'headers'} onClick={() => setActiveTab('headers')}>
                    Headers ({Object.keys(response.headers).length})
                </TabButton>
                {result.assertions && result.assertions.length > 0 && (
                    <TabButton active={activeTab === 'assertions'} onClick={() => setActiveTab('assertions')}>
                        Assertions ({result.assertions.filter(a => a.passed).length}/{result.assertions.length})
                    </TabButton>
                )}
            </TabList>

            <TabPanel>
                {activeTab === 'body' && (
                    <ContentArea>{response.body}</ContentArea>
                )}

                {activeTab === 'headers' && (
                    <ContentArea>
                        {Object.entries(response.headers).map(([key, value]) => 
                            `${key}: ${value}`
                        ).join('\n')}
                    </ContentArea>
                )}

                {activeTab === 'assertions' && result.assertions && (
                    <AssertionsScroll>
                        <AssertionsList>
                            {result.assertions.map((assertion, index) => (
                                <AssertionItem key={index} passed={assertion.passed}>
                                    <Codicon name={assertion.passed ? 'pass-filled' : 'error'} />
                                    <span>{assertion.message || assertion.assertion.description}</span>
                                </AssertionItem>
                            ))}
                        </AssertionsList>
                    </AssertionsScroll>
                )}
            </TabPanel>

            {result.extractedVariables && Object.keys(result.extractedVariables).length > 0 && (
                <ExtractedVariablesSection>
                    <ExtractedVariablesDisplay variables={result.extractedVariables} />
                </ExtractedVariablesSection>
            )}
        </ViewerContainer>
    );
};

