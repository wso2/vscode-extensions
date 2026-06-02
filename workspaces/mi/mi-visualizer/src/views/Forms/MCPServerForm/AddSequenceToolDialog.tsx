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
import { Dialog, Button, Icon, Typography, TextField, TextArea } from '@wso2/ui-toolkit';
import { useForm } from 'react-hook-form';
import { Sequence } from '@wso2/mi-core';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { DialogField, DialogButtonGroup, DialogTitle } from '../Commons';
import { SelectAllRow, CustomInputsContainer, ItemsList, ListItem, ListItemHeader, ItemCheckbox } from './styles';
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

interface SequenceFormItem {
    customName: string;
    description: string;
    inputSchema: string;
}

interface FormValues {
    items: Record<string, SequenceFormItem>;
}

export function AddSequenceToolDialog({ isOpen, sequences, onConfirm, onCancel }: AddSequenceToolDialogProps) {
    const { rpcClient } = useVisualizerContext();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [aiLoadingIds, setAiLoadingIds] = useState<Set<string>>(new Set());

    const { register, handleSubmit, watch, getValues, setValue, setError, clearErrors, reset, formState: { errors } } = useForm<FormValues>({
        defaultValues: { items: {} },
        mode: 'onTouched',
    });

    const items = watch('items') || {};

    useEffect(() => {
        if (!isOpen) {
            reset({ items: {} });
            setSelectedIds(new Set());
        }
    }, [isOpen, reset]);

    const toggleSequence = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
            clearErrors(`items.${id}` as const);
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
            clearErrors(`items.${id}.inputSchema` as const);
            return true;
        }
        const { schema } = await rpcClient.getMiDiagramRpcClient().convertMcpJsonSchema({ input: value });
        if (schema === null) {
            setError(`items.${id}.inputSchema` as const, { message: INVALID_MCP_SCHEMA_MESSAGE });
            return false;
        }
        clearErrors(`items.${id}.inputSchema` as const);
        return true;
    };

    const handleFillWithAI = async (seq: Sequence) => {
        setAiLoadingIds(prev => new Set(prev).add(seq.id));
        try {
            const customName = getValues(`items.${seq.id}.customName` as const);
            const result = await rpcClient.getMiVisualizerRpcClient().getMcpToolSuggestion({
                toolName: customName?.trim() || seq.name,
                sequenceXmlPath: seq.xmlPath,
            });
            if (result.name && !getValues(`items.${seq.id}.customName` as const)?.trim()) {
                setValue(`items.${seq.id}.customName` as const, result.name);
            }
            if (result.description) {
                setValue(`items.${seq.id}.description` as const, result.description);
                clearErrors(`items.${seq.id}.description` as const);
            }
            if (result.inputSchema) {
                setValue(`items.${seq.id}.inputSchema` as const, result.inputSchema);
                validateSchema(seq.id, result.inputSchema);
            }
        } finally {
            setAiLoadingIds(prev => { const n = new Set(prev); n.delete(seq.id); return n; });
        }
    };

    const handleImportFile = async (id: string) => {
        const { content } = await rpcClient.getMiDiagramRpcClient().pickMcpJsonFile();
        if (content === null) return;
        setValue(`items.${id}.inputSchema` as const, content);
        validateSchema(id, content);
    };

    const onSubmit = async (data: FormValues) => {
        if (selectedIds.size === 0) return;

        const ids = Array.from(selectedIds);

        let hasMissingDesc = false;
        ids.forEach(id => {
            if (!data.items?.[id]?.description?.trim()) {
                setError(`items.${id}.description` as const, { message: 'Description is required.' });
                hasMissingDesc = true;
            }
        });
        if (hasMissingDesc) return;

        const hasSchemaErrors = ids.some(id => errors.items?.[id]?.inputSchema);
        if (hasSchemaErrors) return;

        const selected = await Promise.all(ids.map(async id => {
            const item = data.items?.[id];
            const raw = item?.inputSchema?.trim() || '';
            let converted: string | null = null;
            if (raw) {
                const { schema } = await rpcClient.getMiDiagramRpcClient().convertMcpJsonSchema({ input: raw });
                converted = schema;
            }
            return {
                sequenceId: id,
                customName: item?.customName?.trim() || id,
                description: item!.description.trim(),
                inputSchema: converted || EMPTY_MCP_SCHEMA,
            };
        }));
        onConfirm(selected);
        reset({ items: {} });
        setSelectedIds(new Set());
    };

    const allSelected = sequences.length > 0 && selectedIds.size === sequences.length;
    const selectedIdList = Array.from(selectedIds);
    const hasSchemaErrors = selectedIdList.some(id => !!errors.items?.[id]?.inputSchema);
    const hasMissingDescriptions = selectedIdList.some(id => !items[id]?.description?.trim());

    return (
        <Dialog isOpen={isOpen} onClose={onCancel} sx={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', borderRadius: '8px', textAlign: 'left' }}>
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
                        {sequences.map(seq => {
                            const itemErrors = errors.items?.[seq.id];
                            return (
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
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button
                                                appearance="icon"
                                                disabled={aiLoadingIds.has(seq.id)}
                                                onClick={(e: any) => { e.stopPropagation(); handleFillWithAI(seq); }}
                                                tooltip="Fill with AI"
                                            >
                                                <Icon name="bi-ai-chat" />
                                            </Button>
                                        </div>
                                        <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', marginTop: '2px', fontSize: '10px' }}>Tool name</Typography>
                                        <TextField
                                            id={`name-${seq.id}`}
                                            placeholder={seq.name}
                                            {...register(`items.${seq.id}.customName` as const)}
                                            onClick={e => e.stopPropagation()}
                                        />
                                        <Typography variant="caption" sx={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '2px' }}>Description *</Typography>
                                        <TextField
                                            id={`desc-${seq.id}`}
                                            placeholder="Describe what this tool does"
                                            {...register(`items.${seq.id}.description` as const, {
                                                onChange: e => { if (e.target.value.trim()) clearErrors(`items.${seq.id}.description` as const); },
                                                onBlur: e => { if (!e.target.value.trim()) setError(`items.${seq.id}.description` as const, { message: 'Description is required.' }); },
                                            })}
                                            onClick={e => e.stopPropagation()}
                                        />
                                        {itemErrors?.description && <Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)', fontSize: '11px' }}>{String(itemErrors.description.message)}</Typography>}
                                        <Typography variant="caption" sx={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '2px' }}>Input Schema (JSON)</Typography>
                                        <SchemaRow>
                                            <TextArea
                                                placeholder='e.g. {"type":"object","properties":{"city":{"type":"string"}}}'
                                                rows={4}
                                                resize="vertical"
                                                sx={{ flex: 1, fontFamily: 'var(--vscode-editor-font-family, monospace)' }}
                                                {...register(`items.${seq.id}.inputSchema` as const, {
                                                    onChange: e => validateSchema(seq.id, e.target.value),
                                                })}
                                                onClick={e => e.stopPropagation()}
                                            />
                                            <Button
                                                appearance="secondary"
                                                onClick={(e: any) => { e.stopPropagation(); handleImportFile(seq.id); }}
                                                sx={{ padding: '4px 10px', fontSize: '12px', minWidth: 'auto' }}
                                            >
                                                Import JSON
                                            </Button>
                                        </SchemaRow>
                                        {itemErrors?.inputSchema && <Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)', fontSize: '11px' }}>{String(itemErrors.inputSchema.message)}</Typography>}
                                    </CustomInputsContainer>
                                )}
                            </ListItem>
                            );
                        })}
                    </ItemsList>
                )}
            </DialogField>
            <DialogButtonGroup>
                <Button appearance="secondary" onClick={onCancel}>Cancel</Button>
                {selectedIds.size > 0 && (
                    <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', alignSelf: 'center' }}>{selectedIds.size} sequence{selectedIds.size !== 1 ? 's' : ''} selected</Typography>
                )}
                <Button appearance="primary" onClick={handleSubmit(onSubmit)} disabled={selectedIds.size === 0 || hasSchemaErrors || hasMissingDescriptions}>
                    Add Selected ({selectedIds.size})
                </Button>
            </DialogButtonGroup>
        </Dialog>
    );
}

export default AddSequenceToolDialog;
