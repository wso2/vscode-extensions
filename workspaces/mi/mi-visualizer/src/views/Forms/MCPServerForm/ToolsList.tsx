/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { useState } from 'react';
import styled from '@emotion/styled';
import { TextField, Button, Typography } from '@wso2/ui-toolkit';
import { UnifiedTool, SequenceTool } from '@wso2/mi-core';
import { convertToJsonSchema } from './utils';

const ToolItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 3px;
`;

const ToolInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
`;

const InlineEditContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
`;

const InlineInput = styled.input`
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    padding: 4px 6px;
    font-size: 12px;
    width: 100%;
    box-sizing: border-box;
    &:focus { outline: 1px solid var(--vscode-focusBorder); border-color: var(--vscode-focusBorder); }
`;

const InlineTextarea = styled.textarea`
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    padding: 4px 6px;
    font-size: 12px;
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    min-height: 48px;
    font-family: inherit;
    &:focus { outline: 1px solid var(--vscode-focusBorder); border-color: var(--vscode-focusBorder); }
`;

const InlineEditActions = styled.div`
    display: flex;
    gap: 6px;
    justify-content: flex-end;
`;

const ToolsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
`;

interface ToolsListProps {
    tools: UnifiedTool[];
    onEdit: (tool: UnifiedTool) => void;
    onRemove: (toolId: string) => void;
    onSave: (updatedTools: UnifiedTool[]) => void;
    onGoToSource: (tool: UnifiedTool) => void;
}

export function ToolsListComponent({
    tools,
    onEdit,
    onRemove,
    onSave,
    onGoToSource,
}: ToolsListProps) {
    const [editingToolId, setEditingToolId] = useState<string | null>(null);
    const [editToolName, setEditToolName] = useState('');
    const [editToolDescription, setEditToolDescription] = useState('');
    const [editToolInputSchema, setEditToolInputSchema] = useState('');

    const startEdit = (tool: UnifiedTool) => {
        setEditingToolId(tool.id);
        setEditToolName(tool.name);
        setEditToolDescription(tool.description);
        setEditToolInputSchema(tool.kind === 'sequence' ? tool.inputSchema : '');
    };

    const saveEdit = () => {
        const updatedTools = tools.map(t => {
            if (t.id !== editingToolId) return t;
            const base = { ...t, name: editToolName.trim() || t.name, description: editToolDescription };
            if (t.kind === 'sequence') {
                const normalizedSchema = editToolInputSchema.trim() ? convertToJsonSchema(editToolInputSchema) : null;
                return { ...base, inputSchema: normalizedSchema || t.inputSchema };
            }
            return base;
        });
        onSave(updatedTools);
        setEditingToolId(null);
    };

    const cancelEdit = () => {
        setEditingToolId(null);
    };

    return (
        <ToolsList>
            {tools.map(tool => (
                <ToolItem
                    key={tool.id}
                    style={editingToolId === tool.id ? { flexDirection: 'column', alignItems: 'stretch', gap: '8px' } : { cursor: 'pointer' }}
                    onClick={() => editingToolId !== tool.id && onGoToSource(tool)}
                    title={tool.kind === 'api' ? `Open API: ${tool.apiName}` : `Open sequence: ${tool.sequenceName}`}
                >
                    {editingToolId === tool.id ? (
                        <>
                            <InlineEditContainer>
                                <InlineInput
                                    value={editToolName}
                                    onChange={e => setEditToolName(e.target.value)}
                                    placeholder="Tool name"
                                    aria-label="Tool name"
                                />
                                <InlineTextarea
                                    value={editToolDescription}
                                    onChange={e => setEditToolDescription(e.target.value)}
                                    placeholder="Tool description"
                                    aria-label="Tool description"
                                />
                                {tool.kind === 'sequence' && (
                                    <InlineTextarea
                                        value={editToolInputSchema}
                                        onChange={e => setEditToolInputSchema(e.target.value)}
                                        placeholder='Input schema (JSON), e.g. {"type":"object","properties":{}}'
                                        aria-label="Input schema"
                                        style={{ minHeight: '72px', fontFamily: 'monospace' }}
                                    />
                                )}
                            </InlineEditContainer>
                            <InlineEditActions>
                                <Button appearance="secondary" onClick={cancelEdit} sx={{ padding: '4px 10px', fontSize: '11px', minWidth: 'auto' }}>Cancel</Button>
                                <Button appearance="primary" onClick={saveEdit} sx={{ padding: '4px 10px', fontSize: '11px', minWidth: 'auto' }}>Save</Button>
                            </InlineEditActions>
                        </>
                    ) : (
                        <>
                            <ToolInfo>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{tool.name}</Typography>
                                {tool.description && (
                                    <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)' }}>{tool.description}</Typography>
                                )}
                            </ToolInfo>
                            {tool.kind === 'api' ? (
                                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
                                    {tool.operationMethod} {tool.operationPath} ({tool.apiName})
                                </Typography>
                            ) : (
                                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
                                    SEQUENCE · {tool.sequenceName}
                                </Typography>
                            )}
                            <Button
                                appearance="secondary"
                                onClick={(e: any) => { e.stopPropagation(); startEdit(tool); }}
                                sx={{ padding: '4px 8px', fontSize: '11px', minWidth: 'auto', marginRight: '4px' }}
                            >
                                Edit
                            </Button>
                            <Button
                                appearance="secondary"
                                onClick={(e: any) => { e.stopPropagation(); onRemove(tool.id); }}
                                sx={{ padding: '4px 8px', fontSize: '11px', minWidth: 'auto' }}
                            >
                                ✕
                            </Button>
                        </>
                    )}
                </ToolItem>
            ))}
        </ToolsList>
    );
}
