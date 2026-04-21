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
import { TextField, Typography, TextArea, Codicon, AutoResizeTextArea } from '@wso2/ui-toolkit';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { postMessage as postVSCodeMessage } from '../../../utils/vscode-api';
import { buildTestGenerationPrompt, buildIntegrationTestPrompt, ApiSpecType, TestRequest } from '@wso2/api-designer-core';
import { EntityModal } from '../../../components/common/EntityModal';
const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-editorWidget-background);
`;

const ErrorBanner = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 4px;
    background: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    color: var(--vscode-inputValidation-errorForeground, var(--vscode-errorForeground));
    font-size: 12px;
    line-height: 1.5;
`;

const SectionTitle = styled(Typography)`
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-foreground);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
`;

const RadioGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const RadioOption = styled.label`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: background 0.15s ease;
    
    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const RadioInput = styled.input`
    margin-top: 2px;
    cursor: pointer;
`;

const RadioContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
`;

const RadioTitle = styled.div`
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-foreground);
    display: flex;
    align-items: center;
    gap: 6px;
`;

const RadioDescription = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

type GenerationType = 'none' | 'unit' | 'ai-unit' | 'ai-integration';

interface CreateCollectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, description?: string, generationType?: GenerationType, customInstructions?: string, generatedTests?: TestRequest[]) => Promise<void>;
    fileUri: string;
    specType?: 'openapi' | 'asyncapi';
    apiTitle?: string;
    initialGenerationType?: GenerationType;
}

export const CreateCollectionDialog: React.FC<CreateCollectionDialogProps> = ({
    isOpen,
    onClose,
    onCreate,
    fileUri,
    specType = 'openapi',
    apiTitle,
    initialGenerationType = 'none'
}) => {
    const { rpcClient } = useVisualizerContext();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [generationType, setGenerationType] = useState<GenerationType>(initialGenerationType);
    const [customInstructions, setCustomInstructions] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string>('');

    const resetForm = () => {
        setName('');
        setDescription('');
        setGenerationType(initialGenerationType);
        setCustomInstructions('');
        setCreateError('');
    };

    // Update generation type when initialGenerationType changes or dialog opens
    React.useEffect(() => {
        if (isOpen) {
            setGenerationType(initialGenerationType);
            // Set default name based on type
            switch (initialGenerationType) {
                case 'unit': setName('Unit Tests'); break;
                case 'ai-unit': setName('Generate Unit Tests with AI'); break;
                case 'ai-integration': setName('Generate Integration Tests with AI'); break;
                default: setName('');
            }
        } else {
            resetForm();
        }
    }, [isOpen, initialGenerationType]);

    const handleCreate = async () => {
        if (!name.trim()) return;

        setIsCreating(true);
        setCreateError('');
        try {
            if (generationType === 'unit') {
                await handleGenerateUnitTests();
            } else if (generationType === 'ai-unit' || generationType === 'ai-integration') {
                await handleAIGenerate();
            } else {
                await onCreate(name.trim(), description.trim() || undefined, 'none');
            }
            onClose();
        } catch (error) {
            console.error('Failed to create collection:', error);
            const message = error instanceof Error ? error.message : 'An unexpected error occurred while generating tests.';
            setCreateError(message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleGenerateUnitTests = async () => {
        if (!rpcClient) return;

        const genResponse = await rpcClient.getApiDesignerVisualizerRpcClient().generateTestsFromOpenAPI({
            filePath: fileUri,
            options: { includeExamples: true }
        });

        if (!genResponse.success || !genResponse.requests?.length) {
            throw new Error(genResponse.message || 'Failed to generate unit tests from specification');
        }

        await onCreate(name.trim(), description.trim() || undefined, 'unit', undefined, genResponse.requests as TestRequest[]);
    };

    const handleAIGenerate = async () => {
        if (!rpcClient) return;

        try {
            const detectedSpecType = specType === 'asyncapi' ? ApiSpecType.ASYNCAPI : ApiSpecType.OPENAPI;
            const testType = generationType === 'ai-integration' ? 'integration' : 'unit';
            
            let prompt = testType === 'integration' 
                ? buildIntegrationTestPrompt({
                    specType: detectedSpecType,
                    specFilePath: fileUri,
                    apiTitle: apiTitle,
                    testType: 'integration'
                })
                : buildTestGenerationPrompt({
                    specType: detectedSpecType,
                    specFilePath: fileUri,
                    apiTitle: apiTitle,
                    testType: 'unit'
                });
            
            // Append custom instructions if provided
            if (customInstructions.trim()) {
                prompt += `\n\n## Custom Instructions\n${customInstructions.trim()}\n`;
            }

            // Open AI chat with the prompt
            postVSCodeMessage({
                command: 'openAIChat',
                data: {
                    context: `Generate ${testType} tests for ${apiTitle || 'API'}`,
                    prompt: prompt
                }
            });

            // Create empty collection - user will add tests from AI chat
            await onCreate(name.trim(), description.trim() || undefined, generationType, customInstructions.trim() || undefined);
        } catch (error) {
            console.error('Failed to generate AI tests:', error);
            throw error;
        }
    };

    return (
        <EntityModal
            isOpen={isOpen}
            title="Create Collection"
            onClose={onClose}
            onSave={handleCreate}
            mode="add"
            saveButtonText={isCreating ? 'Creating...' : 'Create'}
            saveButtonDisabled={!name.trim() || isCreating}
            width={900}
        >
            <TextField
                label="Name"
                required
                placeholder="My Collection"
                value={name}
                onTextChange={setName}
                autoFocus
            />
            <AutoResizeTextArea
                label="Description"
                placeholder="Optional description"
                value={description}
                onTextChange={setDescription}
                growRange={{ start: 3, offset: 7 }}
            />
            <Section>
                <SectionTitle>Generate Tests</SectionTitle>
                <RadioGroup>
                    <RadioOption>
                        <RadioInput
                            type="radio"
                            checked={generationType === 'none'}
                            onChange={() => setGenerationType('none')}
                        />
                        <RadioContent>
                            <RadioTitle>Empty Collection</RadioTitle>
                            <RadioDescription>Create an empty collection and add tests manually</RadioDescription>
                        </RadioContent>
                    </RadioOption>
                    <RadioOption>
                        <RadioInput
                            type="radio"
                            checked={generationType === 'unit'}
                            onChange={() => setGenerationType('unit')}
                        />
                        <RadioContent>
                            <RadioTitle>
                                <Codicon name="file-code" sx={{ fontSize: '14px' }} />
                                Generate Unit Tests
                            </RadioTitle>
                            <RadioDescription>Auto-generate tests from OpenAPI spec</RadioDescription>
                        </RadioContent>
                    </RadioOption>
                    <RadioOption>
                        <RadioInput
                            type="radio"
                            checked={generationType === 'ai-unit'}
                            onChange={() => setGenerationType('ai-unit')}
                        />
                        <RadioContent>
                            <RadioTitle>
                                <Codicon name="sparkle" sx={{ fontSize: '14px' }} />
                                Generate Unit Tests with AI
                            </RadioTitle>
                            <RadioDescription>Comprehensive tests with AI assistance</RadioDescription>
                        </RadioContent>
                    </RadioOption>
                    <RadioOption>
                        <RadioInput
                            type="radio"
                            checked={generationType === 'ai-integration'}
                            onChange={() => setGenerationType('ai-integration')}
                        />
                        <RadioContent>
                            <RadioTitle>
                                <Codicon name="sparkle" sx={{ fontSize: '14px' }} />
                                Generate Integration Tests with AI
                            </RadioTitle>
                            <RadioDescription>AI-powered workflow tests</RadioDescription>
                        </RadioContent>
                    </RadioOption>
                </RadioGroup>
            </Section>
                    {(generationType === 'ai-unit' || generationType === 'ai-integration') && (
                        <TextArea
                            label="Custom Instructions (Optional)"
                            placeholder="Provide specific instructions for test generation..."
                            value={customInstructions}
                            onTextChange={setCustomInstructions}
                            rows={4}
                        />
                    )}
            {createError && (
                <ErrorBanner>
                    <Codicon name="error" sx={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }} />
                    {createError}
                </ErrorBanner>
            )}
        </EntityModal>
    );
};
