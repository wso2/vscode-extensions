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

import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { Dialog, TextField, TextArea, Button, Typography } from '@wso2/ui-toolkit';
import { UnifiedTool } from '@wso2/mi-core';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { DialogField, DialogButtonGroup, DialogTitle } from '../Commons';
import { INVALID_MCP_SCHEMA_MESSAGE } from '../../../constants';

const ToolItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 3px;
    cursor: pointer;
`;

const ToolInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
`;

const ToolsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
`;

interface ToolsListProps {
    tools: UnifiedTool[];
    onRemove: (toolId: string) => void;
    onSave: (updatedTools: UnifiedTool[]) => void;
    onGoToSource: (tool: UnifiedTool) => void;
}

export function ToolsListComponent({
    tools,
    onRemove,
    onSave,
    onGoToSource,
}: ToolsListProps) {
    const { rpcClient } = useVisualizerContext();
    const [editingTool, setEditingTool] = useState<UnifiedTool | null>(null);
    const [editToolName, setEditToolName] = useState('');
    const [editToolDescription, setEditToolDescription] = useState('');
    const [editToolInputSchema, setEditToolInputSchema] = useState('');
    const [schemaError, setSchemaError] = useState<string | null>(null);
    const [toolToDelete, setToolToDelete] = useState<UnifiedTool | null>(null);

    useEffect(() => {
        if (!editingTool) return;
        setEditToolName(editingTool.name);
        setEditToolDescription(editingTool.description);
        setEditToolInputSchema(editingTool.kind === 'sequence' ? editingTool.inputSchema : '');
        setSchemaError(null);
    }, [editingTool]);

    const validateSchema = async (value: string): Promise<boolean> => {
        if (!value.trim()) {
            setSchemaError(null);
            return true;
        }
        const { schema } = await rpcClient.getMiDiagramRpcClient().convertMcpJsonSchema({ input: value });
        if (schema === null) {
            setSchemaError(INVALID_MCP_SCHEMA_MESSAGE);
            return false;
        }
        setSchemaError(null);
        return true;
    };

    const saveEdit = async () => {
        if (!editingTool) return;
        if (schemaError) return;

        const normalizedSchema = editToolInputSchema.trim()
            ? (await rpcClient.getMiDiagramRpcClient().convertMcpJsonSchema({ input: editToolInputSchema })).schema
            : null;

        const updatedTools = tools.map(t => {
            if (t.id !== editingTool.id) return t;
            const base = { ...t, name: editToolName.trim() || t.name, description: editToolDescription };
            if (t.kind === 'sequence') {
                return { ...base, inputSchema: normalizedSchema || t.inputSchema };
            }
            return base;
        });
        onSave(updatedTools);
        setEditingTool(null);
    };

    return (
        <>
            <ToolsList>
                {tools.map(tool => (
                    <ToolItem
                        key={tool.id}
                        onClick={() => onGoToSource(tool)}
                        title={tool.kind === 'api' ? `Open API: ${tool.apiName}` : `Open sequence: ${tool.sequenceName}`}
                    >
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
                            onClick={(e: any) => { e.stopPropagation(); setEditingTool(tool); }}
                            sx={{ padding: '4px 8px', fontSize: '11px', minWidth: 'auto', marginRight: '4px' }}
                        >
                            Edit
                        </Button>
                        <Button
                            appearance="secondary"
                            onClick={(e: any) => { e.stopPropagation(); setToolToDelete(tool); }}
                            sx={{ padding: '4px 8px', fontSize: '11px', minWidth: 'auto' }}
                        >
                            ✕
                        </Button>
                    </ToolItem>
                ))}
            </ToolsList>

            <Dialog
                isOpen={!!toolToDelete}
                onClose={() => setToolToDelete(null)}
                sx={{ maxWidth: '400px', width: '90%', borderRadius: '8px', textAlign: 'left' }}
            >
                <DialogTitle>Delete Tool</DialogTitle>
                <Typography variant="body2" sx={{ marginBottom: '16px' }}>
                    Are you sure you want to delete the tool <strong>{toolToDelete?.name}</strong>? This action cannot be undone.
                </Typography>
                <DialogButtonGroup>
                    <Button appearance="secondary" onClick={() => setToolToDelete(null)}>Cancel</Button>
                    <Button
                        appearance="primary"
                        onClick={() => { onRemove(toolToDelete!.id); setToolToDelete(null); }}
                    >
                        Delete
                    </Button>
                </DialogButtonGroup>
            </Dialog>

            <Dialog
                isOpen={!!editingTool}
                onClose={() => setEditingTool(null)}
                sx={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', borderRadius: '8px', textAlign: 'left' }}
            >
                <DialogTitle>Edit Tool</DialogTitle>

                <DialogField>
                    <Typography variant="subtitle2">Tool Name *</Typography>
                    <TextField
                        placeholder="e.g., get_weather"
                        value={editToolName}
                        onChange={(e: any) => setEditToolName(e.target.value)}
                    />
                </DialogField>

                <DialogField>
                    <Typography variant="subtitle2">Description *</Typography>
                    <TextField
                        placeholder="Describe what this tool does"
                        value={editToolDescription}
                        onChange={(e: any) => setEditToolDescription(e.target.value)}
                    />
                </DialogField>

                {editingTool?.kind === 'sequence' && (
                    <DialogField>
                        <Typography variant="subtitle2">Input Schema (JSON)</Typography>
                        <TextArea
                            placeholder='e.g. {"type":"object","properties":{"city":{"type":"string"}}}'
                            rows={4}
                            resize="vertical"
                            sx={{ fontFamily: 'var(--vscode-editor-font-family, monospace)' }}
                            value={editToolInputSchema}
                            onChange={(e: any) => {
                                setEditToolInputSchema(e.target.value);
                                validateSchema(e.target.value);
                            }}
                        />
                        {schemaError && <Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)' }}>{schemaError}</Typography>}
                    </DialogField>
                )}

                <DialogButtonGroup>
                    <Button appearance="secondary" onClick={() => setEditingTool(null)}>Cancel</Button>
                    <Button
                        appearance="primary"
                        onClick={saveEdit}
                        disabled={!editToolName.trim() || !editToolDescription.trim() || !!schemaError}
                    >
                        Save
                    </Button>
                </DialogButtonGroup>
            </Dialog>
        </>
    );
}

export default ToolsListComponent;
