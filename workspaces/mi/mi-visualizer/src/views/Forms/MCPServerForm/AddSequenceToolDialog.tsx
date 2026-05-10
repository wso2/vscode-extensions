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
import { Button, Typography } from '@wso2/ui-toolkit';
import { Sequence } from '@wso2/mi-core';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { DialogOverlay, DialogContent, DialogField, DialogButtonGroup, CustomInput, SelectAllRow, FlexRow, FlexRowStart, CustomInputsContainer, ItemsList, ListItem, ListItemHeader, ItemCheckbox, SchemaTextarea, DialogTitle } from './dialogStyles';
import { EMPTY_MCP_SCHEMA, INVALID_MCP_SCHEMA_MESSAGE } from '../../../constants';

// Styled Components

const SchemaRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

// Component

export interface AddSequenceToolDialogProps {
    isOpen: boolean;
    sequences: Sequence[];
    onConfirm: (selected: Array<{ sequenceId: string; customName: string; description: string; inputSchema: string }>) => void;
    onCancel: () => void;
}

export function AddSequenceToolDialog({ isOpen, sequences, onConfirm, onCancel }: AddSequenceToolDialogProps) {
    const { rpcClient } = useVisualizerContext();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [customNames, setCustomNames] = useState<Record<string, string>>({});
    const [customDescriptions, setCustomDescriptions] = useState<Record<string, string>>({});
    const [descriptionErrors, setDescriptionErrors] = useState<Record<string, string>>({});
    const [inputSchemas, setInputSchemas] = useState<Record<string, string>>({});
    const [schemaErrors, setSchemaErrors] = useState<Record<string, string>>({});
    const [aiDescLoadingIds, setAiDescLoadingIds] = useState<Set<string>>(new Set());
    const [aiSchemaLoadingIds, setAiSchemaLoadingIds] = useState<Set<string>>(new Set());

    const handleFillDescription = async (seq: Sequence) => {
        setAiDescLoadingIds(prev => new Set(prev).add(seq.id));
        try {
            const result = await rpcClient.getMiVisualizerRpcClient().getMcpToolSuggestion({
                toolName: customNames[seq.id]?.trim() || seq.name,
            });
            if (result.description) {
                setCustomDescriptions(prev => ({ ...prev, [seq.id]: result.description }));
                setDescriptionErrors(prev => { const n = { ...prev }; delete n[seq.id]; return n; });
            }
        } finally {
            setAiDescLoadingIds(prev => { const n = new Set(prev); n.delete(seq.id); return n; });
        }
    };

    const handleFillSchema = async (seq: Sequence) => {
        setAiSchemaLoadingIds(prev => new Set(prev).add(seq.id));
        try {
            const result = await rpcClient.getMiVisualizerRpcClient().getMcpToolSuggestion({
                toolName: customNames[seq.id]?.trim() || seq.name,
            });
            if (result.inputSchema) {
                setInputSchemas(prev => ({ ...prev, [seq.id]: result.inputSchema }));
                validateSchema(seq.id, result.inputSchema);
            }
        } finally {
            setAiSchemaLoadingIds(prev => { const n = new Set(prev); n.delete(seq.id); return n; });
        }
    };

    if (!isOpen) return null;

    const toggleSequence = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
            setDescriptionErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleSelectAll = () => {
        setSelectedIds(selectedIds.size === sequences.length ? new Set() : new Set(sequences.map(s => s.id)));
    };

    const validateSchema = async (id: string, value: string): Promise<boolean> => {
        if (!value.trim()) {
            setSchemaErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
            return true;
        }
        const { schema } = await rpcClient.getMiDiagramRpcClient().convertMcpJsonSchema({ input: value });
        if (schema === null) {
            setSchemaErrors(prev => ({ ...prev, [id]: INVALID_MCP_SCHEMA_MESSAGE }));
            return false;
        }
        setSchemaErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
        return true;
    };

    const handleSchemaChange = (id: string, value: string) => {
        setInputSchemas(prev => ({ ...prev, [id]: value }));
        validateSchema(id, value);
    };

    const handleImportFile = async (id: string) => {
        const { content } = await rpcClient.getMiDiagramRpcClient().pickMcpJsonFile();
        if (content === null) return;
        setInputSchemas(prev => ({ ...prev, [id]: content }));
        validateSchema(id, content);
    };

    const handleConfirm = async () => {
        if (selectedIds.size === 0) return;
        const hasSchemaErrors = Array.from(selectedIds).some(id => schemaErrors[id]);
        if (hasSchemaErrors) return;
        const missingDesc: Record<string, string> = {};
        Array.from(selectedIds).forEach(id => {
            if (!customDescriptions[id]?.trim()) missingDesc[id] = 'Description is required.';
        });
        if (Object.keys(missingDesc).length > 0) {
            setDescriptionErrors(missingDesc);
            return;
        }
        const ids = Array.from(selectedIds);
        const selected = await Promise.all(ids.map(async id => {
            const raw = inputSchemas[id]?.trim() || '';
            let converted: string | null = null;
            if (raw) {
                const { schema } = await rpcClient.getMiDiagramRpcClient().convertMcpJsonSchema({ input: raw });
                converted = schema;
            }
            return {
                sequenceId: id,
                customName: customNames[id]?.trim() || id,
                description: customDescriptions[id]!.trim(),
                inputSchema: converted || EMPTY_MCP_SCHEMA,
            };
        }));
        onConfirm(selected);
        setSelectedIds(new Set());
        setCustomNames({});
        setCustomDescriptions({});
        setDescriptionErrors({});
        setInputSchemas({});
        setSchemaErrors({});
    };

    const allSelected = sequences.length > 0 && selectedIds.size === sequences.length;
    const hasSchemaErrors = Array.from(selectedIds).some(id => schemaErrors[id]);
    const hasMissingDescriptions = Array.from(selectedIds).some(id => !customDescriptions[id]?.trim());

    return (
        <DialogOverlay onClick={onCancel}>
            <DialogContent onClick={e => e.stopPropagation()}>
                <DialogTitle>Add Tools from Sequences</DialogTitle>
                <DialogField>
                    <Typography variant="subtitle2">Select Sequences ({selectedIds.size} of {sequences.length})</Typography>
                    {sequences.length === 0 ? (
                        <Typography variant="body2" sx={{ color: 'var(--vscode-descriptionForeground)', textAlign: 'center', padding: '15px' }}>No sequences found in the project</Typography>
                    ) : (
                        <ItemsList>
                            <SelectAllRow onClick={handleSelectAll}>
                                <ItemCheckbox
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={handleSelectAll}
                                    onClick={e => e.stopPropagation()}
                                    id="select-all-sequences"
                                />
                                <label onClick={(e: any) => e.stopPropagation()} style={{ cursor: 'pointer', margin: 0, fontSize: '12px', fontWeight: 500, color: 'var(--vscode-editor-foreground)' }}>
                                    <strong>Select All Sequences</strong>
                                </label>
                            </SelectAllRow>
                            {sequences.map(seq => (
                                <ListItem key={seq.id}>
                                    <ListItemHeader onClick={() => toggleSequence(seq.id)}>
                                        <ItemCheckbox
                                            type="checkbox"
                                            checked={selectedIds.has(seq.id)}
                                            onChange={() => toggleSequence(seq.id)}
                                            onClick={e => e.stopPropagation()}
                                            id={`seq-${seq.id}`}
                                        />
                                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '12px' }}>{seq.name}</Typography>
                                    </ListItemHeader>
                                    {selectedIds.has(seq.id) && (
                                        <CustomInputsContainer>
                                            <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', marginTop: '2px', fontSize: '10px' }}>Tool name</Typography>
                                            <CustomInput
                                                id={`name-${seq.id}`}
                                                type="text"
                                                placeholder={seq.name}
                                                value={customNames[seq.id] || ''}
                                                onChange={e => setCustomNames(prev => ({ ...prev, [seq.id]: e.target.value }))}
                                                onClick={e => e.stopPropagation()}
                                            />
                                            <Typography variant="caption" sx={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '2px' }}>Description *</Typography>
                                            <FlexRow>
                                                <CustomInput
                                                    id={`desc-${seq.id}`}
                                                    type="text"
                                                    placeholder="Describe what this tool does"
                                                    value={customDescriptions[seq.id] || ''}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setCustomDescriptions(prev => ({ ...prev, [seq.id]: val }));
                                                        if (val.trim()) setDescriptionErrors(prev => { const n = { ...prev }; delete n[seq.id]; return n; });
                                                    }}
                                                    onBlur={() => { if (!customDescriptions[seq.id]?.trim()) setDescriptionErrors(prev => ({ ...prev, [seq.id]: 'Description is required.' })); }}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                                <Button
                                                    appearance="secondary"
                                                    disabled={aiDescLoadingIds.has(seq.id)}
                                                    onClick={(e: any) => { e.stopPropagation(); handleFillDescription(seq); }}
                                                    sx={{ padding: '4px 10px', fontSize: '12px', minWidth: 'auto' }}
                                                >
                                                    {aiDescLoadingIds.has(seq.id) ? 'Filling...' : 'Fill With AI'}
                                                </Button>
                                            </FlexRow>
                                            {descriptionErrors[seq.id] && <Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)', fontSize: '11px' }}>{descriptionErrors[seq.id]}</Typography>}
                                            <Typography variant="caption" sx={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '2px' }}>Input Schema (JSON)</Typography>
                                            <SchemaRow>
                                                <SchemaTextarea
                                                    placeholder='e.g. {"amount": number, "name": string}'
                                                    value={inputSchemas[seq.id] || ''}
                                                    onChange={e => handleSchemaChange(seq.id, e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                                <Button
                                                    appearance="secondary"
                                                    disabled={aiSchemaLoadingIds.has(seq.id)}
                                                    onClick={(e: any) => { e.stopPropagation(); handleFillSchema(seq); }}
                                                    sx={{ padding: '4px 10px', fontSize: '12px', minWidth: 'auto' }}
                                                >
                                                    {aiSchemaLoadingIds.has(seq.id) ? 'Filling...' : 'Fill With AI'}
                                                </Button>
                                                <Button
                                                    appearance="secondary"
                                                    onClick={(e: any) => { e.stopPropagation(); handleImportFile(seq.id); }}
                                                    sx={{ padding: '4px 10px', fontSize: '12px', minWidth: 'auto' }}
                                                >
                                                    Import JSON
                                                </Button>
                                            </SchemaRow>
                                            {schemaErrors[seq.id] && <Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)', fontSize: '11px' }}>{schemaErrors[seq.id]}</Typography>}
                                        </CustomInputsContainer>
                                    )}
                                </ListItem>
                            ))}
                        </ItemsList>
                    )}
                </DialogField>
                <DialogButtonGroup>
                    <Button appearance="secondary" onClick={onCancel}>Cancel</Button>
                    {selectedIds.size > 0 && (
                        <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', alignSelf: 'center' }}>{selectedIds.size} sequence{selectedIds.size !== 1 ? 's' : ''} selected</Typography>
                    )}
                    <Button appearance="primary" onClick={handleConfirm} disabled={selectedIds.size === 0 || hasSchemaErrors || hasMissingDescriptions}>
                        Add Selected ({selectedIds.size})
                    </Button>
                </DialogButtonGroup>
            </DialogContent>
        </DialogOverlay>
    );
}

export default AddSequenceToolDialog;
