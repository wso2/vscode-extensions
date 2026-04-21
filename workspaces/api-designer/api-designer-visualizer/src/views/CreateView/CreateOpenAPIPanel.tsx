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
import { Button, Typography, TextField, AutoResizeTextArea, FormActions, CheckBox } from '@wso2/ui-toolkit';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { ApiSpecType } from '@wso2/api-designer-core';

import { postMessage as postVSCodeMessage } from '../../utils/vscode-api';

interface CreateOpenAPIPanelProps {}

const PageRoot = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    background: var(--vscode-editor-background);
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    overflow: auto;
    position: relative;

    &::-webkit-scrollbar {
        width: 10px;
    }
    &::-webkit-scrollbar-track {
        background: transparent;
    }
    &::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-background);
    }
    &::-webkit-scrollbar-thumb:hover {
        background: var(--vscode-scrollbarSlider-hoverBackground);
    }
`;

const Content = styled.div`
    max-width: 1000px;
    margin: 0 auto;
    padding: 48px 32px;
    width: 100%;
    box-sizing: border-box;
    min-width: 0;

    @media (max-width: 600px) {
        padding: 24px 16px;
    }
`;

const Hero = styled.div`
    text-align: center;
    margin-bottom: 40px;
`;

const ModeToggle = styled.div`
    display: flex;
    gap: 12px;
    margin-bottom: 32px;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 4px;
    min-width: 0;
    overflow: hidden;
`;

const ModeButton = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 10px 16px;
    border: none;
    background: ${({ $active }: { $active: boolean }) =>
        $active ? 'var(--vscode-button-background)' : 'transparent'};
    color: ${({ $active }: { $active: boolean }) =>
        $active ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)'};
    font-family: var(--vscode-font-family);
    font-size: 13px;
    font-weight: ${({ $active }: { $active: boolean }) => ($active ? 600 : 400)};
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover {
        background: ${({ $active }: { $active: boolean }) =>
            $active ? 'var(--vscode-button-hoverBackground)' : 'var(--vscode-list-hoverBackground)'};
    }
`;

const FormCard = styled.div`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    min-width: 0;
    box-sizing: border-box;

    @media (max-width: 600px) {
        padding: 16px;
    }
`;

const FieldBlock = styled.div`
    display: flex;
    flex-direction: column;
    margin-bottom: 24px;
`;

const FieldBlockGap = styled(FieldBlock)`
    gap: 16px;
`;

const RequiredAsterisk = styled.span`
    color: var(--vscode-errorForeground);
`;

const SaveLocationRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: stretch;
    margin-bottom: 4px;
    min-width: 0;
`;

const FolderFieldGrow = styled.div`
    flex: 1;
    min-width: 0;
    overflow: hidden;
`;

const WorkspaceCheckboxStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    width: 100%;
`;

export const CreateOpenAPIPanel: React.FC<CreateOpenAPIPanelProps> = () => {
    const [mode, setMode] = useState<'template' | 'copilot'>('copilot');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    
    // Template mode state
    const [name, setName] = useState('');
    const [version, setVersion] = useState('1.0.0');
    const [context, setContext] = useState('');
    const [folderPath, setFolderPath] = useState('');
    
    // Copilot mode state
    const [description, setDescription] = useState('');
    const [includeWorkspaceSpecs, setIncludeWorkspaceSpecs] = useState(true);
    const [additionalReferences, setAdditionalReferences] = useState('');

    // Listen for messages from the extension
    React.useEffect(() => {
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'folderSelected':
                    setFolderPath(message.path);
                    break;
                case 'defaultFolder':
                    // Only set if empty to respect user selection
                    setFolderPath((prev: string) => prev || message.path);
                    break;
                case 'setLoading':
                    setIsLoading(message.loading);
                    setLoadingMessage(message.message || '');
                    break;
                case 'switchToEditor':
                    // Clear loading when switching to editor view
                    setIsLoading(false);
                    break;
            }
        };

        window.addEventListener('message', messageHandler);
        // Ask host for default folder (workspace root)
        try {
            postVSCodeMessage({ command: 'getDefaultFolder' });
        } catch {}

        return () => window.removeEventListener('message', messageHandler);
    }, []);

    const handleSelectFolder = () => {
        postVSCodeMessage({
            command: 'selectFolder'
        });
    };

    const handleCreateFromTemplate = () => {
        if (!name || !version || !folderPath) {
            return;
        }

        postVSCodeMessage({
            command: 'createFromTemplate',
            data: {
                name,
                version,
                context,
                folderPath,
                apiType: ApiSpecType.OPENAPI
            }
        });
    };

    const handleCreateFromCopilot = () => {
        if (!description || !folderPath) {
            return;
        }

        setIsLoading(true);
        setLoadingMessage('Generating OpenAPI specification with GitHub Copilot...');

        const externalReferenceUrls = additionalReferences
            .split(/[\r\n]+/)
            .map((s) => s.trim())
            .filter(Boolean);

        postVSCodeMessage({
            command: 'createFromCopilot',
            data: {
                description,
                folderPath,
                apiType: ApiSpecType.OPENAPI,
                includeWorkspaceSpecs,
                externalReferenceUrls
            }
        });
    };

    return (
        <PageRoot>
            {isLoading && (
                <LoadingOverlay message={loadingMessage || 'Processing...'} fullScreen />
            )}
            <Content>
                <Hero>
                    <Typography 
                        variant="h1" 
                        sx={{ 
                            margin: '0 0 8px 0',
                            fontSize: '24px',
                            fontWeight: 600,
                            color: 'var(--vscode-foreground)',
                            fontFamily: 'var(--vscode-font-family)',
                            letterSpacing: '-0.01em'
                        }}
                    >
                        Create API Specification
                    </Typography>
                    <Typography 
                        variant="body2"
                        sx={{
                            margin: 0,
                            fontSize: '13px',
                            color: 'var(--vscode-descriptionForeground)',
                            lineHeight: 1.5
                        }}
                    >
                        Start building your API with a template or let AI generate it for you
                    </Typography>
                </Hero>

                <ModeToggle>
                    <ModeButton type="button" $active={mode === 'copilot'} onClick={() => setMode('copilot')}>
                        Create with AI
                    </ModeButton>
                    <ModeButton type="button" $active={mode === 'template'} onClick={() => setMode('template')}>
                        Create from Template
                    </ModeButton>
                </ModeToggle>

                <FormCard>
                    {mode === 'template' ? (
                <>
                            <FieldBlock>
                    <TextField
                        label="API Name"
                        required
                        placeholder="e.g., Pet Store API"
                        value={name}
                        onTextChange={setName}
                    />
                            </FieldBlock>

                            <FieldBlockGap>
                    <TextField
                        label="Version"
                        required
                        placeholder="e.g., 1.0.0"
                        value={version}
                        onTextChange={setVersion}
                    />
                            </FieldBlockGap>

                            <FieldBlockGap>
                                        <AutoResizeTextArea
                                            label="Description"
                        placeholder="e.g., This API manages pet store operations"
                        value={context}
                        onTextChange={setContext}
                                            growRange={{ start: 1, offset: 20 }}
                                            resize="vertical"
                    />
                            </FieldBlockGap>

                            <FieldBlock>
                                        <Typography 
                                            variant="subtitle2" 
                                            sx={{ 
                                                marginBottom: '8px',
                                                display: 'block',
                                                fontSize: '13px',
                                                fontWeight: 500,
                                                color: 'var(--vscode-foreground)',
                                                fontFamily: 'var(--vscode-font-family)'
                                            }}
                                        >
                            Save Location <RequiredAsterisk>*</RequiredAsterisk>
                        </Typography>
                                        <SaveLocationRow>
                                            <FolderFieldGrow>
                            <TextField
                                placeholder="Select a folder..."
                                value={folderPath}
                                readonly
                            />
                                            </FolderFieldGrow>
                                            <Button 
                                                appearance="secondary" 
                                                onClick={handleSelectFolder}
                                                sx={{ flexShrink: 0, minWidth: 'fit-content' }}
                                            >
                                Browse
                            </Button>
                        </SaveLocationRow>
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: 'var(--vscode-descriptionForeground)', 
                                                display: 'block',
                                                fontSize: '12px',
                                                lineHeight: 1.4
                                            }}
                                        >
                            Choose where to save your API specification file
                        </Typography>
                    </FieldBlock>

                    <FormActions>
                        <Button
                            appearance="primary"
                            onClick={handleCreateFromTemplate}
                            disabled={!name || !version || !folderPath}
                                    sx={{ minWidth: '140px' }}
                        >
                            Create
                        </Button>
                    </FormActions>
                </>
                    ) : (
                        <>
                            <FieldBlockGap>
                                <AutoResizeTextArea
                                    label="Describe your API"
                        required
                        placeholder="e.g., Create an API for managing a pet store with endpoints for pets, owners, and appointments"
                        value={description}
                        onTextChange={setDescription}
                                    growRange={{ start: 5, offset: 20 }}
                                    resize="vertical"
                                />
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        color: 'var(--vscode-descriptionForeground)', 
                                        marginTop: '4px',
                                        display: 'block',
                                        fontSize: '12px',
                                        lineHeight: 1.4
                                    }}
                                >
                                    Be as detailed as possible. Include information about endpoints, data models, and features you need.
                                </Typography>
                            </FieldBlockGap>

                            <FieldBlock>
                                <WorkspaceCheckboxStack>
                                    <CheckBox
                                        checked={includeWorkspaceSpecs}
                                        label="Include workspace API specs as context"
                                        onChange={(checked) => setIncludeWorkspaceSpecs(checked)}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: 'block',
                                            marginLeft: '22px',
                                            color: 'var(--vscode-descriptionForeground)',
                                            fontSize: '12px',
                                            lineHeight: 1.45
                                        }}
                                    >
                                        The AI is instructed to search this workspace for existing API specs and
                                        schemas and reuse patterns where appropriate.
                                    </Typography>
                                </WorkspaceCheckboxStack>
                            </FieldBlock>

                            <FieldBlockGap>
                                <AutoResizeTextArea
                                    label="Additional references (optional)"
                                    placeholder={
                                        'https://raw.githubusercontent.com/OAI/OpenAPI-Specification/main/examples/v3.0/petstore.yaml\nhttps://github.com/OAI/OpenAPI-Specification\nhttps://example.com/docs/openapi.json'
                                    }
                                    value={additionalReferences}
                                    onTextChange={setAdditionalReferences}
                                    growRange={{ start: 2, offset: 12 }}
                                    resize="vertical"
                                />
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'var(--vscode-descriptionForeground)',
                                        marginTop: '4px',
                                        display: 'block',
                                        fontSize: '12px',
                                        lineHeight: 1.4
                                    }}
                                >
                                    One HTTPS URL per line (raw spec file, GitHub repo, or other public OpenAPI URL). The
                                    AI uses these along with your description.
                                </Typography>
                            </FieldBlockGap>

                            <FieldBlock>
                                <Typography 
                                    variant="subtitle2" 
                        sx={{ 
                                        marginBottom: '8px',
                                        display: 'block',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        color: 'var(--vscode-foreground)',
                                        fontFamily: 'var(--vscode-font-family)'
                                    }}
                                >
                            Save Location <RequiredAsterisk>*</RequiredAsterisk>
                        </Typography>
                                    <SaveLocationRow>
                                        <FolderFieldGrow>
                            <TextField
                                placeholder="Select a folder..."
                                value={folderPath}
                                readonly
                            />
                                        </FolderFieldGrow>
                                        <Button 
                                            appearance="secondary" 
                                            onClick={handleSelectFolder}
                                            sx={{ flexShrink: 0, minWidth: 'fit-content' }}
                                        >
                                Browse
                            </Button>
                        </SaveLocationRow>
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        color: 'var(--vscode-descriptionForeground)', 
                                        display: 'block',
                                        fontSize: '12px',
                                        lineHeight: 1.4
                                    }}
                                >
                                    Choose where to save your API specification file. The file will be created in the selected location.
                                </Typography>
                    </FieldBlock>

                    <FormActions>
                        <Button
                            appearance="primary"
                            onClick={handleCreateFromCopilot}
                            disabled={!description || !folderPath}
                                            sx={{ minWidth: '140px' }}
                        >
                                            Create with AI
                        </Button>
                    </FormActions>
                </>
            )}
                </FormCard>
            </Content>
        </PageRoot>
    );
};
