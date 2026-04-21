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
import { Button, Typography, TextField, AutoResizeTextArea, Codicon } from '@wso2/ui-toolkit';
import { DocumentTemplate, DOCUMENT_TEMPLATES } from '../../../utils/documentTemplates';
import { buildGenerateDocumentationPrompt } from '../../../utils/aiPrompts';
import { postMessage as postVSCodeMessage } from '../../../utils/vscode-api';
import { OpenAPI } from '../../../definitions/ServiceDefinitions';
import { ApiDocument } from '@wso2/api-designer-core/src/rpc-types/api-designer-visualizer/types';
import { useAIAvailability } from '../../../hooks/useAIAvailability';
import { AIButton } from '../../../components/ai/AIButton';

const PanelContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
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

const ContentWrapper = styled.div`
    max-width: 1000px;
    margin: 0 auto;
    padding: 48px 32px;
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
`;

const HeaderSection = styled.div`
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

const ModeButton = styled.button<{ active: boolean }>`
    flex: 1;
    padding: 10px 16px;
    border: none;
    background: ${(props: { active: boolean }) => props.active 
        ? 'var(--vscode-button-background)' 
        : 'transparent'};
    color: ${(props: { active: boolean }) => props.active 
        ? 'var(--vscode-button-foreground)' 
        : 'var(--vscode-foreground)'};
    font-family: var(--vscode-font-family);
    font-size: 13px;
    font-weight: ${(props: { active: boolean }) => props.active ? 600 : 400};
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    
    &:hover {
        background: ${(props: { active: boolean }) => props.active 
            ? 'var(--vscode-button-hoverBackground)' 
            : 'var(--vscode-list-hoverBackground)'};
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
`;

const FormSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
`;

const TemplateGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
`;

interface TemplateCardProps {
    selected: boolean;
}

const TemplateCard = styled.div<TemplateCardProps>`
    display: flex;
    flex-direction: column;
    background: ${(props: TemplateCardProps) => props.selected 
        ? 'var(--vscode-button-background)' 
        : 'var(--vscode-editor-background)'};
    border: 2px solid ${(props: TemplateCardProps) => props.selected 
        ? 'var(--vscode-button-foreground)' 
        : 'var(--vscode-panel-border)'};
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    overflow: hidden;

    &:hover {
        border-color: var(--vscode-focusBorder);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
`;

const TemplatePreview = styled.div<{ templateId: string }>`
    height: 100px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: ${(props: { templateId: string }) => 
        // HTML templates removed - only markdown templates supported
        'linear-gradient(135deg, var(--vscode-editor-background) 0%, var(--vscode-editorWidget-background) 100%)'
    };
`;

const TemplateBody = styled.div`
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const FormActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 24px;
`;

const FormatToggle = styled.div`
    display: flex;
    gap: 8px;
`;

const CheckboxFieldRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const PromptCheckboxInput = styled.input`
    cursor: pointer;
    width: 16px;
    height: 16px;
`;

const PromptCheckboxLabel = styled.label`
    cursor: pointer;
    font-size: 13px;
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
`;

const TemplateFormatBadge = styled.span`
    font-size: 9px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 4px;
`;

interface FormatButtonProps {
    active: boolean;
}

const FormatButton = styled.button<FormatButtonProps>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border: 1px solid ${(props: FormatButtonProps) => props.active 
        ? 'var(--vscode-button-secondaryBackground)' 
        : 'var(--vscode-panel-border)'};
    background: ${(props: FormatButtonProps) => props.active 
        ? 'var(--vscode-button-secondaryBackground)' 
        : 'transparent'};
    color: ${(props: FormatButtonProps) => props.active 
        ? 'var(--vscode-button-secondaryForeground)' 
        : 'var(--vscode-foreground)'};
    font-family: var(--vscode-font-family);
    font-size: 13px;
    font-weight: ${(props: FormatButtonProps) => props.active ? 600 : 400};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    
    &:hover {
        border-color: var(--vscode-focusBorder);
        background: ${(props: FormatButtonProps) => props.active 
            ? 'var(--vscode-button-secondaryHoverBackground)' 
            : 'var(--vscode-list-hoverBackground)'};
    }
`;

interface CreateDocumentPanelProps {
    apiTitle?: string;
    apiVersion?: string;
    specType?: 'openapi' | 'asyncapi';
    openAPISpec?: OpenAPI | null;
    openAPIFilePath?: string;
    docsFolder?: string;
    workspaceUri: string;
    existingDocuments?: ApiDocument[];
    onCancel: () => void;
    onTemplateSelected: (template: DocumentTemplate, format: ApiDocument['format']) => void;
    onAIGenerated: (format: ApiDocument['format']) => void;
}

export const CreateDocumentPanel: React.FC<CreateDocumentPanelProps> = ({
    apiTitle,
    apiVersion,
    specType = 'openapi',
    openAPISpec,
    openAPIFilePath,
    docsFolder,
    workspaceUri,
    existingDocuments = [],
    onCancel,
    onTemplateSelected,
    onAIGenerated
}) => {
    const isAIAvailable = useAIAvailability();
    const [mode, setMode] = useState<'ai' | 'template'>('ai');
    
    // Format state (shared for both modes)
    const [format, setFormat] = useState<ApiDocument['format']>('markdown');
    
    // AI mode state
    const [aiDescription, setAiDescription] = useState('');
    const [useDefaultPrompt, setUseDefaultPrompt] = useState(true);
    
    // Template mode state
    const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);

    // Normalize document name for comparison (same logic as generateFilePath)
    const normalizeDocumentName = (name: string): string => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    // Filter templates based on selected format and exclude already created ones
    const filteredTemplates = DOCUMENT_TEMPLATES.filter(t => {
        // First filter by format
        if (t.format !== format) {
            return false;
        }
        
        // Check if this template has already been created
        const templateFileName = t.defaultFileName(apiTitle);
        const normalizedTemplateName = normalizeDocumentName(templateFileName);
        
        // Check if any existing document matches this template's file name
        const alreadyExists = existingDocuments.some(doc => {
            const normalizedDocName = normalizeDocumentName(doc.name);
            return normalizedDocName === normalizedTemplateName;
        });
        
        return !alreadyExists;
    });

    // Reset selected template when format changes
    const handleFormatChange = (newFormat: ApiDocument['format']) => {
        setFormat(newFormat);
        setSelectedTemplate(null);
    };

    const getFileExtension = (format: ApiDocument['format']): string => {
        switch (format) {
            case 'markdown':
                return 'md';
            case 'text':
                return 'txt';
            default:
                return 'md';
        }
    };

    const handleCreateWithAI = () => {
        if (!openAPISpec || !openAPIFilePath) {
            return;
        }

        const documentFolderPath = docsFolder || `${workspaceUri}/docs`;
        const extension = getFileExtension(format);
        const documentPath = `${documentFolderPath}/ai-generated-documentation.${extension}`;

        const context = {
            openAPISpec,
            openAPIFilePath,
            apiTitle: apiTitle || openAPISpec?.info?.title,
            apiVersion: apiVersion || openAPISpec?.info?.version,
            apiDescription: openAPISpec?.info?.description,
            documentName: 'AI Generated Documentation',
            documentFormat: format,
            documentFilePath: documentPath,
            documentFolderPath: documentFolderPath
        };

        const userQuery = useDefaultPrompt
            ? `Generate comprehensive API documentation for "${apiTitle || 'the API'}" including getting started guide, API reference, examples, and best practices.`
            : aiDescription || `Generate comprehensive API documentation for "${apiTitle || 'the API'}".`;

        const prompt = buildGenerateDocumentationPrompt(context, userQuery);

        postVSCodeMessage({
            command: 'openCopilotChat',
            data: {
                context: JSON.stringify(context),
                prompt: prompt
            }
        });

        onAIGenerated(format);
    };

    const handleTemplateSelect = (template: DocumentTemplate) => {
        setSelectedTemplate(template);
    };

    const handleCreateFromTemplate = () => {
        if (selectedTemplate) {
            onTemplateSelected(selectedTemplate, selectedTemplate.format);
        }
    };

    return (
        <PanelContainer>
            <ContentWrapper>
                <HeaderSection>
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
                        Create Documentation
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
                        Start documenting your API with AI or choose from a template
                    </Typography>
                </HeaderSection>

                <ModeToggle>
                    <ModeButton
                        active={mode === 'ai'}
                        onClick={() => setMode('ai')}
                    >
                        Create with AI
                    </ModeButton>
                    <ModeButton
                        active={mode === 'template'}
                        onClick={() => setMode('template')}
                    >
                        Create from Template
                    </ModeButton>
                </ModeToggle>

                <FormCard>
                    {mode === 'ai' ? (
                        <>
                            <FormSection>
                                <AutoResizeTextArea
                                    label="Describe your documentation"
                                    placeholder="e.g., Create comprehensive API documentation including getting started guide, authentication, all endpoints with examples, error handling, and best practices"
                                    value={aiDescription}
                                    onTextChange={setAiDescription}
                                    growRange={{ start: 5, offset: 20 }}
                                    resize="vertical"
                                    disabled={useDefaultPrompt}
                                />
                                <CheckboxFieldRow>
                                    <PromptCheckboxInput
                                        type="checkbox"
                                        id="use-default"
                                        checked={useDefaultPrompt}
                                        onChange={(e) => {
                                            setUseDefaultPrompt(e.target.checked);
                                            if (e.target.checked) {
                                                setAiDescription('');
                                            }
                                        }}
                                    />
                                    <PromptCheckboxLabel htmlFor="use-default">
                                        Use default comprehensive documentation prompt
                                    </PromptCheckboxLabel>
                                </CheckboxFieldRow>
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
                                    {useDefaultPrompt 
                                        ? 'AI will generate comprehensive documentation including getting started guide, API reference, examples, and best practices.'
                                        : 'Be as detailed as possible. Include information about what sections to include, examples, code snippets, and any specific requirements.'}
                                </Typography>
                            </FormSection>

                            <FormSection>
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
                                    Format
                                </Typography>
                                <FormatToggle>
                                    <FormatButton
                                        active={format === 'markdown'}
                                        onClick={() => setFormat('markdown')}
                                    >
                                        <Codicon name="markdown" sx={{ fontSize: '16px' }} />
                                        Markdown
                                    </FormatButton>
                                </FormatToggle>
                            </FormSection>

                            <FormActions>
                                <Button
                                    appearance="secondary"
                                    onClick={onCancel}
                                >
                                    Cancel
                                </Button>
                                <div title={!isAIAvailable ? "Enable AI Chat to use this feature" : undefined}>
                                    <Button
                                        appearance="primary"
                                        onClick={handleCreateWithAI}
                                        disabled={!isAIAvailable || !openAPISpec || !openAPIFilePath}
                                        sx={{ 
                                            minWidth: '180px',
                                            opacity: isAIAvailable ? '1' : '0.5'
                                        }}
                                    >
                                        <Codicon name="sparkle" sx={{ marginRight: 6 }} />
                                        Create with AI
                                    </Button>
                                </div>
                            </FormActions>
                        </>
                    ) : (
                        <>
                            <FormSection>
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
                                    Format
                                </Typography>
                                <FormatToggle>
                                    <FormatButton
                                        active={format === 'markdown'}
                                        onClick={() => handleFormatChange('markdown')}
                                    >
                                        <Codicon name="markdown" sx={{ fontSize: '16px' }} />
                                        Markdown
                                    </FormatButton>
                                </FormatToggle>
                            </FormSection>

                            <FormSection>
                                <Typography 
                                    variant="subtitle2" 
                                    sx={{ 
                                        marginBottom: '12px',
                                        display: 'block',
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        color: 'var(--vscode-foreground)',
                                        fontFamily: 'var(--vscode-font-family)'
                                    }}
                                >
                                    Select a Template
                                </Typography>
                                <TemplateGrid>
                                    {filteredTemplates.map((template) => {
                                        const iconName = template.icon;
                                        // Use VSCode theme colors for markdown
                                        const hasDarkBg = false;
                                        
                                        return (
                                            <TemplateCard
                                                key={template.id}
                                                selected={selectedTemplate?.id === template.id}
                                                onClick={() => handleTemplateSelect(template)}
                                            >
                                                <TemplatePreview templateId={template.id}>
                                                    <Codicon 
                                                        name={iconName as any} 
                                    sx={{ 
                                                            fontSize: '28px',
                                                            color: hasDarkBg ? 'rgba(255,255,255,0.9)' : 'var(--vscode-descriptionForeground)',
                                                            opacity: 0.8
                                                        }} 
                                                    />
                                                    <TemplateFormatBadge>
                                                        {template.format}
                                                    </TemplateFormatBadge>
                                                </TemplatePreview>
                                                <TemplateBody>
                                                    <Typography variant="body1" sx={{ fontWeight: 600, margin: 0, fontSize: '13px' }}>
                                                        {template.name}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', margin: 0, lineHeight: 1.4 }}>
                                                        {template.description}
                                </Typography>
                                                </TemplateBody>
                                            </TemplateCard>
                                        );
                                    })}
                                </TemplateGrid>
                            </FormSection>

                            <FormActions>
                                <Button
                                    appearance="secondary"
                                    onClick={onCancel}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    appearance="primary"
                                    onClick={handleCreateFromTemplate}
                                    disabled={!selectedTemplate}
                                    sx={{ minWidth: '140px' }}
                                >
                                    Create
                                </Button>
                            </FormActions>
                        </>
                    )}
                </FormCard>
            </ContentWrapper>
        </PanelContainer>
    );
};

