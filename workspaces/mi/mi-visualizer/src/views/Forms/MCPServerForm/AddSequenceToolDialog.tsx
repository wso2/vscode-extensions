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

import { ChangeEvent, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { convertToJsonSchema } from './utils';
import { Sequence } from '@wso2/mi-core';
import { useVisualizerContext } from '@wso2/mi-rpc-client';

// Styled Components

const DialogOverlay = styled.div`
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const DialogContent = styled.div`
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 20px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const DialogTitle = styled.h3`
    color: var(--vscode-editor-foreground);
    margin: 0 0 15px 0;
    font-size: 16px;
    font-weight: 600;
`;

const DialogField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 15px;
`;

const DialogLabel = styled.label`
    color: var(--vscode-editor-foreground);
    font-size: 12px;
    font-weight: 500;
`;

const SequencesList = styled.div`
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    max-height: 400px;
    overflow-y: auto;
    padding: 8px 0;
`;

const SequenceItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    &:last-child { border-bottom: none; }
    &:hover { background: var(--vscode-list-hoverBackground); }
`;

const SequenceItemHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;
`;

const SequenceCheckbox = styled.input`
    cursor: pointer;
    accent-color: var(--vscode-focusBorder);
    margin-top: 2px;
`;

const SequenceName = styled.span`
    color: var(--vscode-editor-foreground);
    font-family: monospace;
    font-size: 12px;
`;

const SelectAllRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-list-activeSelectionBackground);
    cursor: pointer;
    user-select: none;
`;

const SelectAllLabel = styled.label`
    cursor: pointer;
    margin-bottom: 0;
    font-size: 12px;
    color: var(--vscode-editor-foreground);
`;

const CustomInputsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-left: 26px;
`;

const InputFieldLabel = styled.label`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    margin-top: 2px;
`;

const CustomInput = styled.input`
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    border: 1px solid var(--vscode-input-border);
    padding: 4px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-family: inherit;
    &:focus { outline: none; border-color: var(--vscode-focusBorder); }
`;

const SchemaRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const SchemaTextarea = styled.textarea`
    width: 100%;
    min-height: 80px;
    padding: 6px 8px;
    font-size: 12px;
    font-family: var(--vscode-editor-font-family, monospace);
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
    border-radius: 3px;
    resize: vertical;
    box-sizing: border-box;
    &:focus { outline: none; border-color: var(--vscode-focusBorder); }
`;

const SchemaImportBtn = styled.button`
    padding: 4px 10px;
    font-size: 12px;
    white-space: nowrap;
    border: 1px solid var(--vscode-button-secondaryBackground);
    border-radius: 3px;
    cursor: pointer;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    &:hover { background: var(--vscode-button-secondaryHoverBackground); }
`;

const SchemaError = styled.span`
    color: var(--vscode-inputValidation-errorForeground, var(--vscode-errorForeground));
    font-size: 11px;
`;

const FillAIBtn = styled.button`
    padding: 4px 10px;
    font-size: 12px;
    white-space: nowrap;
    border: 1px solid var(--vscode-button-background);
    border-radius: 3px;
    cursor: pointer;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    &:hover { background: var(--vscode-button-hoverBackground); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const DescriptionRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const EmptyMessage = styled.div`
    color: var(--vscode-descriptionForeground);
    text-align: center;
    padding: 15px;
    font-size: 12px;
`;

const DialogButtonGroup = styled.div`
    display: flex;
    gap: 10px;
    justify-content: space-between;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid var(--vscode-panel-border);
`;

const SelectionInfo = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    align-self: center;
`;

const DialogBtn = styled.button`
    padding: 6px 12px;
    font-size: 12px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-weight: 500;
`;

const DialogCancelBtn = styled(DialogBtn)`
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    &:hover { background: var(--vscode-button-secondaryHoverBackground); }
`;

const DialogAddBtn = styled(DialogBtn)`
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    &:hover { background: var(--vscode-button-hoverBackground); }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
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
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

    const validateSchema = (id: string, value: string): boolean => {
        if (!value.trim()) {
            setSchemaErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
            return true;
        }
        if (convertToJsonSchema(value) === null) {
            setSchemaErrors(prev => ({ ...prev, [id]: 'Invalid JSON. Use shorthand like {"amount": number, "name": string} or full JSON Schema.' }));
            return false;
        }
        setSchemaErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
        return true;
    };

    const handleSchemaChange = (id: string, value: string) => {
        setInputSchemas(prev => ({ ...prev, [id]: value }));
        validateSchema(id, value);
    };

    const handleImportFile = (id: string) => { fileInputRefs.current[id]?.click(); };

    const handleFileChange = (id: string, e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setInputSchemas(prev => ({ ...prev, [id]: content }));
            validateSchema(id, content);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleConfirm = () => {
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
        const emptySchema = JSON.stringify({ type: 'object', properties: {}, additionalProperties: false });
        const selected = Array.from(selectedIds).map(id => {
            const raw = inputSchemas[id]?.trim() || '';
            return {
                sequenceId: id,
                customName: customNames[id]?.trim() || id,
                description: customDescriptions[id]!.trim(),
                inputSchema: (raw ? convertToJsonSchema(raw) : null) || emptySchema,
            };
        });
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
                    <DialogLabel>Select Sequences ({selectedIds.size} of {sequences.length})</DialogLabel>
                    {sequences.length === 0 ? (
                        <EmptyMessage>No sequences found in the project</EmptyMessage>
                    ) : (
                        <SequencesList>
                            <SelectAllRow onClick={handleSelectAll}>
                                <SequenceCheckbox
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={handleSelectAll}
                                    onClick={e => e.stopPropagation()}
                                    id="select-all-sequences"
                                />
                                <SelectAllLabel onClick={e => e.stopPropagation()} htmlFor="select-all-sequences">
                                    <strong>Select All Sequences</strong>
                                </SelectAllLabel>
                            </SelectAllRow>
                            {sequences.map(seq => (
                                <SequenceItem key={seq.id}>
                                    <SequenceItemHeader onClick={() => toggleSequence(seq.id)}>
                                        <SequenceCheckbox
                                            type="checkbox"
                                            checked={selectedIds.has(seq.id)}
                                            onChange={() => toggleSequence(seq.id)}
                                            onClick={e => e.stopPropagation()}
                                            id={`seq-${seq.id}`}
                                        />
                                        <SequenceName>{seq.name}</SequenceName>
                                    </SequenceItemHeader>
                                    {selectedIds.has(seq.id) && (
                                        <CustomInputsContainer>
                                            <InputFieldLabel htmlFor={`name-${seq.id}`}>Tool name</InputFieldLabel>
                                            <CustomInput
                                                id={`name-${seq.id}`}
                                                type="text"
                                                placeholder={seq.name}
                                                value={customNames[seq.id] || ''}
                                                onChange={e => setCustomNames(prev => ({ ...prev, [seq.id]: e.target.value }))}
                                                onClick={e => e.stopPropagation()}
                                            />
                                            <InputFieldLabel htmlFor={`desc-${seq.id}`}>Description *</InputFieldLabel>
                                            <DescriptionRow>
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
                                                <FillAIBtn
                                                    type="button"
                                                    disabled={aiDescLoadingIds.has(seq.id)}
                                                    onClick={e => { e.stopPropagation(); handleFillDescription(seq); }}
                                                >
                                                    {aiDescLoadingIds.has(seq.id) ? 'Filling...' : 'Fill With AI'}
                                                </FillAIBtn>
                                            </DescriptionRow>
                                            {descriptionErrors[seq.id] && <SchemaError>{descriptionErrors[seq.id]}</SchemaError>}
                                            <InputFieldLabel>Input Schema (JSON)</InputFieldLabel>
                                            <SchemaRow>
                                                <SchemaTextarea
                                                    placeholder='e.g. {"amount": number, "name": string}'
                                                    value={inputSchemas[seq.id] || ''}
                                                    onChange={e => handleSchemaChange(seq.id, e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                                <FillAIBtn
                                                    type="button"
                                                    disabled={aiSchemaLoadingIds.has(seq.id)}
                                                    onClick={e => { e.stopPropagation(); handleFillSchema(seq); }}
                                                >
                                                    {aiSchemaLoadingIds.has(seq.id) ? 'Filling...' : 'Fill With AI'}
                                                </FillAIBtn>
                                                <SchemaImportBtn
                                                    type="button"
                                                    onClick={e => { e.stopPropagation(); handleImportFile(seq.id); }}
                                                >
                                                    Import JSON
                                                </SchemaImportBtn>
                                                <input
                                                    ref={el => { fileInputRefs.current[seq.id] = el; }}
                                                    type="file"
                                                    accept=".json"
                                                    style={{ display: 'none' }}
                                                    onChange={e => handleFileChange(seq.id, e)}
                                                />
                                            </SchemaRow>
                                            {schemaErrors[seq.id] && <SchemaError>{schemaErrors[seq.id]}</SchemaError>}
                                        </CustomInputsContainer>
                                    )}
                                </SequenceItem>
                            ))}
                        </SequencesList>
                    )}
                </DialogField>
                <DialogButtonGroup>
                    <DialogCancelBtn onClick={onCancel}>Cancel</DialogCancelBtn>
                    {selectedIds.size > 0 && (
                        <SelectionInfo>{selectedIds.size} sequence{selectedIds.size !== 1 ? 's' : ''} selected</SelectionInfo>
                    )}
                    <DialogAddBtn onClick={handleConfirm} disabled={selectedIds.size === 0 || hasSchemaErrors || hasMissingDescriptions}>
                        Add Selected ({selectedIds.size})
                    </DialogAddBtn>
                </DialogButtonGroup>
            </DialogContent>
        </DialogOverlay>
    );
}

export default AddSequenceToolDialog;
