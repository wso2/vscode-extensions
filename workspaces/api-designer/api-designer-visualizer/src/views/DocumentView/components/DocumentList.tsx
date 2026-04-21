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

import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, Typography } from '@wso2/ui-toolkit';
import { ApiDocument } from '@wso2/api-designer-core';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';

const DocumentGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
    margin-top: 20px;
`;

const DocumentCard = styled.div`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: all 0.2s ease;
    cursor: pointer;

    &:hover {
        border-color: var(--vscode-focusBorder);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
    }
`;

const PreviewContainer = styled.div`
    height: 140px;
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--vscode-panel-border);
    overflow: hidden;
    position: relative;
`;

const PreviewContent = styled.div`
    padding: 12px;
    font-size: 9px;
    line-height: 1.4;
    color: var(--vscode-editor-foreground);
    opacity: 0.8;
    overflow: hidden;
    height: 100%;
    
    h1, h2, h3 {
        font-size: 11px;
        margin: 0 0 4px 0;
        font-weight: 600;
    }
    
    p {
        margin: 0 0 4px 0;
    }
    
    code {
        background: var(--vscode-textCodeBlock-background);
        padding: 1px 3px;
        border-radius: 2px;
        font-size: 8px;
    }
    
    ul, ol {
        margin: 0;
        padding-left: 12px;
    }
    
    li {
        margin: 2px 0;
    }
`;

const HtmlPreviewFrame = styled.div`
    width: 100%;
    height: 100%;
    background: white;
    transform: scale(0.25);
    transform-origin: top left;
    width: 400%;
    height: 400%;
    pointer-events: none;
`;

const PreviewOverlay = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: linear-gradient(transparent, var(--vscode-editor-background));
    pointer-events: none;
`;

interface TemplateIndicatorProps {
    templateType: string;
}

const TemplateIndicator = styled.div<TemplateIndicatorProps>`
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: ${(props: TemplateIndicatorProps) => 
        props.templateType === 'stoplight' ? 'rgba(99, 102, 241, 0.9)' :
        props.templateType === 'redoc' ? 'rgba(229, 57, 53, 0.9)' :
        props.templateType === 'swagger' ? 'rgba(133, 234, 45, 0.9)' :
        props.templateType === 'rapidoc' ? 'rgba(255, 107, 107, 0.9)' :
        props.templateType === 'scalar' ? 'rgba(139, 92, 246, 0.9)' :
        'rgba(59, 130, 246, 0.9)'
    };
    color: ${(props: TemplateIndicatorProps) =>
        props.templateType === 'swagger' ? '#1a1a1a' : 'white'
    };
`;

const DocumentBody = styled.div`
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const DocumentHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
`;

const DocumentInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const DocumentActions = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
`;

const DocumentTitle = styled(Typography)`
    font-weight: 600;
    margin: 0 !important;
    color: var(--vscode-foreground);
    word-break: break-word;
    font-size: 14px;
`;

const DocumentMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 8px;
`;

interface FormatBadgeProps {
    format: 'markdown' | 'text';
}

const FormatBadge = styled.span<FormatBadgeProps>`
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    background: ${(props: FormatBadgeProps) => 
        props.format === 'markdown' ? 'rgba(66, 153, 225, 0.15)' :
        'rgba(156, 163, 175, 0.15)'
    };
    color: ${(props: FormatBadgeProps) =>
        props.format === 'markdown' ? '#4299e1' :
        '#9ca3af'
    };
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 24px;
    text-align: center;
    gap: 16px;
`;

const LoadingPreview = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--vscode-descriptionForeground);
`;

const EmptyIcon = styled.div`
    font-size: 48px;
    opacity: 0.5;
`;

interface DocumentListProps {
    documents: ApiDocument[];
    onOpen: (doc: ApiDocument) => void;
    onDelete: (doc: ApiDocument) => void;
}

// HTML support removed - detectTemplateType removed

// Helper to convert markdown to simple HTML preview
const markdownToPreview = (markdown: string): string => {
    let html = markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Lists
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/^\* (.*$)/gim, '<li>$1</li>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>');
    
    return `<p>${html}</p>`;
};

// Document card with preview
const DocumentCardWithPreview: React.FC<{
    doc: ApiDocument;
    onOpen: (doc: ApiDocument) => void;
    onDelete: (doc: ApiDocument) => void;
}> = ({ doc, onOpen, onDelete }) => {
    const { rpcClient } = useVisualizerContext();
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadContent = async () => {
            if (!rpcClient || !doc.path) {
                setLoading(false);
                return;
            }
            try {
                const response = await rpcClient.getApiDesignerVisualizerRpcClient().readFile({
                    filePath: doc.path
                });
                setContent(response.content || '');
            } catch (error) {
                console.warn('Failed to load document preview:', error);
            } finally {
                setLoading(false);
            }
        };
        loadContent();
    }, [rpcClient, doc.path]);

    const formatIcon = (format: string) => {
        switch (format) {
            case 'markdown': return 'markdown';
            default: return 'file-text';
        }
    };

    const renderPreview = () => {
        if (loading) {
            return (
                <LoadingPreview>
                    <Codicon name="loading" sx={{ fontSize: '20px', animation: 'spin 1s linear infinite' }} />
                </LoadingPreview>
            );
        }

        // HTML support removed - only markdown preview supported

        // For markdown, show rendered preview
        const previewHtml = markdownToPreview(content.substring(0, 1000));
        return (
            <>
                <PreviewContent dangerouslySetInnerHTML={{ __html: previewHtml }} />
                <PreviewOverlay />
            </>
        );
    };

    return (
        <DocumentCard onClick={() => onOpen(doc)}>
            <PreviewContainer>
                {renderPreview()}
            </PreviewContainer>
            <DocumentBody>
                <DocumentHeader>
                    <DocumentInfo>
                        <DocumentTitle variant="body1">
                            {doc.name}
                        </DocumentTitle>
                    </DocumentInfo>
                    <DocumentActions onClick={(e) => e.stopPropagation()}>
                        <Button
                            appearance="icon"
                            tooltip="Delete Document"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(doc);
                            }}
                            sx={{
                                '--button-icon-color': 'var(--vscode-errorForeground)',
                                '--button-icon-hover-color': 'var(--vscode-errorForeground)'
                            }}
                        >
                            <Codicon name="trash" sx={{ fontSize: '14px' }} />
                        </Button>
                    </DocumentActions>
                </DocumentHeader>
                <DocumentMeta>
                    <FormatBadge format={doc.format}>
                        <Codicon name={formatIcon(doc.format)} sx={{ fontSize: '10px', marginRight: 4 }} />
                        {doc.format}
                    </FormatBadge>
                    {doc.updatedAt && (
                        <span>
                            Updated {new Date(doc.updatedAt).toLocaleDateString()}
                        </span>
                    )}
                </DocumentMeta>
            </DocumentBody>
        </DocumentCard>
    );
};

export const DocumentList: React.FC<DocumentListProps> = ({
    documents,
    onOpen,
    onDelete
}) => {
    if (documents.length === 0) {
        return (
            <EmptyState>
                <EmptyIcon>📚</EmptyIcon>
                <Typography variant="h3" sx={{ margin: 0 }}>
                    No Documents
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--vscode-descriptionForeground)', maxWidth: 400 }}>
                    Get started by creating your first API documentation. You can create multiple documents for different purposes like getting started guides, API reference, examples, and more.
                </Typography>
            </EmptyState>
        );
    }

    return (
        <DocumentGrid>
            {documents.map((doc) => (
                <DocumentCardWithPreview
                    key={doc.id}
                    doc={doc}
                    onOpen={onOpen}
                    onDelete={onDelete}
                />
            ))}
        </DocumentGrid>
    );
};

