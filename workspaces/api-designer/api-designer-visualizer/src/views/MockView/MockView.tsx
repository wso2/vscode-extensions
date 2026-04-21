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

import React, { useCallback, useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, TextArea, ProgressRing } from '@wso2/ui-toolkit';
import { APIHeader } from '../DesignView/components/api-header/APIHeader';
import { MockServerTool } from '@wso2/api-designer-core';
import { postMessage as postVSCodeMessage } from '../../utils/vscode-api';
import { useFileUri, useLoadingState } from '../../hooks';
import { ViewContainer, ContentContainer } from '../../components/common/ViewContainer';
import { WaitingForFileMessage, InitializingMessage } from '../../components/common/LoadingStates';
import { MockToolSegmentedControl } from './components/MockToolSegmentedControl';
import { MockConfigForm } from './components/MockConfigForm';
import { MockStatusBar } from './components/MockStatusBar';
import { EndpointList } from './components/EndpointList';
import { AIGenerationPreview } from './components/AIGenerationPreview';
import { useMockServer } from './hooks/useMockServer';
import { useMockConfig } from './hooks/useMockConfig';
import { useMockTools } from './hooks/useMockTools';
import { useMockSpecInfo } from './hooks/useMockSpecInfo';

const MockContainer = styled(ViewContainer)``;

const MockContentContainer = styled(ContentContainer)`
    padding: 20px;
`;

const ConfigSection = styled.div`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 16px 18px;
    margin-bottom: 20px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
`;

const ConfigHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
`;

const ConfigTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const ConfigContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const Fieldset = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const FieldLabel = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const AIPromptSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ActionButtons = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
`;

const RightAlignedActionButtons = styled(ActionButtons)`
    margin-top: 16px;
`;

const Divider = styled.hr`
    border: none;
    border-top: 1px solid var(--vscode-panel-border);
    margin: 20px 0;
`;

const EndpointsSection = styled.div`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 16px 18px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
`;

interface MockViewProps {
    fileUri?: string;
}

export const MockView: React.FC<MockViewProps> = ({ fileUri: propFileUri }) => {
    // Use shared hook for fileUri management
    const fileUri = useFileUri(propFileUri);
    const { shouldShowWaiting, shouldShowInitializing } = useLoadingState(fileUri);
    
    // Use hooks for state management
    const { specInfo, endpoints } = useMockSpecInfo(fileUri);
    const mockServer = useMockServer(fileUri);
    const mockConfig = useMockConfig(fileUri);
    const mockTools = useMockTools(
        fileUri,
        specInfo?.specType,
        mockConfig.mockServerPath,
        mockConfig.setMockServerPath,
        mockConfig.setHasConfig
    );

    // AI generation state
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | undefined>();

    // Update config when tool changes
    const handleToolSelect = useCallback((tool: MockServerTool) => {
        mockTools.selectTool(tool);
        mockConfig.setConfig(prev => ({ ...prev, tool }));
    }, [mockTools, mockConfig]);

    // Update config when spec type is detected
    const specType = React.useMemo(() => specInfo?.specType, [specInfo?.specType]);
    
    React.useEffect(() => {
        if (specType) {
            const defaultTool = specType === 'asyncapi' ? MockServerTool.MOKAPI : MockServerTool.PRISM;
            mockConfig.setConfig(prev => ({
                ...prev,
                specType: specType,
                tool: defaultTool
            }));
            mockTools.selectTool(defaultTool);
        }
    }, [specType]);

    const handleOpenTestView = useCallback(() => {
        postVSCodeMessage({
            command: 'switchView',
            viewType: 'test',
            fileUri: fileUri
        });
    }, [fileUri]);

    // Update config port and tool when server status changes
    const isRunning = mockServer.serverStatus.isRunning;
    const serverPort = mockServer.serverStatus.port;
    const serverTool = mockServer.serverStatus.tool;
    
    React.useEffect(() => {
        if (isRunning) {
            if (serverPort) {
                mockConfig.setConfig(prev => ({
                    ...prev,
                    port: serverPort
                }));
            }
            if (serverTool) {
                const toolEnum = Object.values(MockServerTool).find(
                    tool => tool.toLowerCase() === serverTool.toLowerCase()
                ) as MockServerTool | undefined;
                if (toolEnum && toolEnum !== mockTools.selectedTool) {
                    mockTools.selectTool(toolEnum);
                    mockConfig.setConfig(prev => ({
                        ...prev,
                        tool: toolEnum
                    }));
                }
            }
        }
    }, [isRunning, serverPort, serverTool, mockTools, mockConfig]);

    // Handle AI generation
    const handleGenerateWithAI = useCallback(async () => {
        if (!fileUri) return;
        
        setIsGenerating(true);
        try {
            await mockTools.generateWithAI(aiPrompt);
            // After generation, try to read the generated file to show preview
            // This would require an RPC call to read the file
            // For now, we'll just show that generation completed
        } catch (error) {
            console.error('Failed to generate with AI:', error);
        } finally {
            setIsGenerating(false);
        }
    }, [fileUri, mockTools, aiPrompt]);

    // Handle copy URL
    const handleCopyUrl = useCallback((url: string) => {
        navigator.clipboard.writeText(url);
        // Could show a toast notification here
    }, []);



    // Show loading states
    if (shouldShowWaiting) {
        return <WaitingForFileMessage />;
    }
    
    if (shouldShowInitializing) {
        return <InitializingMessage />;
    }

    const isAI = mockTools.selectedTool === MockServerTool.AI_GENERATED_JS;
    const showAIPreview = isAI && (mockConfig.mockServerPath || generatedCode);

    return (
        <MockContainer>
            <APIHeader
                title={specInfo?.title}
                version={specInfo?.version}
                openApiVersion={specInfo?.openApiVersion}
                specType={specInfo?.specType}
                readOnly={true}
                showDescription={false}
            />
            <MockContentContainer>
                {/* Status Bar */}
                <MockStatusBar
                    status={mockServer.serverStatus}
                    onStop={mockServer.stopServer}
                    onRefresh={mockServer.refreshStatus}
                />

                {/* Configuration Section - Only show when server is not running */}
                {!mockServer.serverStatus.isRunning && (
                    <ConfigSection>
                        <ConfigHeader>
                            <ConfigTitle>Configuration</ConfigTitle>
                        </ConfigHeader>
                        <ConfigContent>
                            <Fieldset>
                                <FieldLabel>Engine</FieldLabel>
                                <MockToolSegmentedControl
                                    selectedTool={mockTools.selectedTool}
                                    specType={specInfo?.specType}
                                    onSelectTool={handleToolSelect}
                                />
                            </Fieldset>

                            <Fieldset>
                                <MockConfigForm
                                    config={mockConfig.config}
                                    onConfigChange={mockConfig.setConfig}
                                    selectedTool={mockTools.selectedTool}
                                />
                            </Fieldset>

                            {/* AI Prompt Section - Only for AI-Generated JS */}
                            {isAI && (
                                <AIPromptSection>
                                    <FieldLabel>Custom Instructions (Optional)</FieldLabel>
                                    <TextArea
                                        id="ai-prompt"
                                        value={aiPrompt}
                                        onTextChange={(value) => setAiPrompt(value)}
                                        placeholder="e.g., Make the /items endpoint return 5 items by default"
                                        rows={3}
                                    />
                                </AIPromptSection>
                            )}

                            {/* Action Buttons */}
                            <ActionButtons>
                                {isAI && (
                                        <>
                                            <Button
                                                appearance="secondary"
                                                onClick={handleGenerateWithAI}
                                            disabled={!fileUri || isGenerating}
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <ProgressRing sx={{ marginRight: 6, width: 14, height: 14 }} />
                                                    Generating...
                                        </>
                                    ) : (
                                        <>
                                                    <Codicon name="sparkle" sx={{ marginRight: 6 }} />
                                                    {mockConfig.mockServerPath ? 'Regenerate Server' : 'Generate Server'}
                                                </>
                                            )}
                                                </Button>
                                    </>
                                            )}
                                            <Button
                                                appearance="primary"
                                    onClick={() => mockServer.startServer(mockConfig.config, mockConfig.mockServerPath)}
                                    disabled={mockServer.isStarting || !fileUri || (isAI && !mockConfig.mockServerPath)}
                                    sx={{ marginLeft: 'auto' }}
                                            >
                                                <Codicon name="play" sx={{ marginRight: 6 }} />
                                    {mockServer.isStarting ? 'Starting...' : 'Start Mock Server'}
                                            </Button>
                            </ActionButtons>

                            {/* AI Generation Preview */}
                            {showAIPreview && (
                                <AIGenerationPreview
                                    code={generatedCode}
                                    isLoading={isGenerating}
                                    onRegenerate={handleGenerateWithAI}
                                />
                            )}
                        </ConfigContent>
                    </ConfigSection>
                )}

                {/* Endpoints Section - Only show when server is running */}
                {mockServer.serverStatus.isRunning && endpoints && endpoints.length > 0 && (
                    <>
                        <Divider />
                        <EndpointsSection>
                            <EndpointList
                                endpoints={endpoints}
                                baseUrl={mockServer.serverStatus.url}
                                onCopyUrl={handleCopyUrl}
                            />
                            <RightAlignedActionButtons>
                                <Button
                                    appearance="primary"
                                    onClick={handleOpenTestView}
                                    sx={{ marginLeft: 'auto' }}
                                >
                                    <Codicon name="beaker" sx={{ marginRight: 6 }} />
                                    Test with Mock
                                </Button>
                            </RightAlignedActionButtons>
                        </EndpointsSection>
                    </>
                )}
            </MockContentContainer>
        </MockContainer>
    );
};
