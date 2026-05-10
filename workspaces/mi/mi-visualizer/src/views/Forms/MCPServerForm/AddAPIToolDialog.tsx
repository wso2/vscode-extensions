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

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Button, Typography } from '@wso2/ui-toolkit';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { DialogOverlay, DialogContent, DialogField, DialogButtonGroup, CustomInput, SelectAllRow, FlexRow, CustomInputsContainer, ItemsList, ListItem, ListItemHeader, ItemCheckbox, DialogTitle } from './dialogStyles';

interface APIOperation {
    id: string;
    method: string;
    path: string;
    summary: string;
}

interface API {
    id: string;
    name: string;
    context: string;
    version: string;
    operations: APIOperation[];
}

interface AddAPIToolDialogProps {
    isOpen: boolean;
    apis: API[];
    selectedAPIForTool: string;
    onAPIChange: (apiId: string) => void;
    onConfirmBulk: (apiId: string, selectedOperations: Array<{ id: string; customName: string; description: string }>) => void;
    onCancel: () => void;
}

function getDefaultName(operation: APIOperation): string {
    const cleanPath = operation.path
        .replace(/[{}]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '');
    return `${operation.method}_${cleanPath}`;
}

// Styled components

const DialogSelect = styled.select`
    background: var(--vscode-input-background);
    color: var(--vscode-editor-foreground);
    border: 1px solid var(--vscode-input-border);
    padding: 6px 8px;
    border-radius: 3px;
    font-size: 12px;
    font-family: inherit;

    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
    }
`;

const OperationDetails = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const OperationMethodRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

export function AddAPIToolDialog({
    isOpen,
    apis,
    selectedAPIForTool,
    onAPIChange,
    onConfirmBulk,
    onCancel,
}: AddAPIToolDialogProps) {
    const { rpcClient } = useVisualizerContext();
    const [selectedOperationIds, setSelectedOperationIds] = useState<Set<string>>(new Set());
    const [customNames, setCustomNames] = useState<Record<string, string>>({});
    const [customDescriptions, setCustomDescriptions] = useState<Record<string, string>>({});
    const [descriptionErrors, setDescriptionErrors] = useState<Record<string, string>>({});
    const [aiLoadingIds, setAiLoadingIds] = useState<Set<string>>(new Set());

    const handleFillWithAI = async (op: APIOperation) => {
        setAiLoadingIds(prev => new Set(prev).add(op.id));
        try {
            const result = await rpcClient.getMiVisualizerRpcClient().getMcpToolSuggestion({
                toolName: customNames[op.id] || getDefaultName(op),
                operationMethod: op.method,
                operationPath: op.path,
                operationSummary: op.summary,
            });
            if (result.description) {
                setCustomDescriptions(prev => ({ ...prev, [op.id]: result.description }));
                setDescriptionErrors(prev => { const n = { ...prev }; delete n[op.id]; return n; });
            }
        } finally {
            setAiLoadingIds(prev => { const n = new Set(prev); n.delete(op.id); return n; });
        }
    };

    if (!isOpen) return null;

    const selectedAPI = apis.find(a => a.id === selectedAPIForTool);

    const handleOperationToggle = (operationId: string) => {
        const newSet = new Set(selectedOperationIds);
        if (newSet.has(operationId)) {
            newSet.delete(operationId);
            setDescriptionErrors(prev => { const n = { ...prev }; delete n[operationId]; return n; });
        } else {
            newSet.add(operationId);
        }
        setSelectedOperationIds(newSet);
    };

    const handleCustomNameChange = (operationId: string, name: string) => {
        setCustomNames(prev => ({ ...prev, [operationId]: name }));
    };

    const handleCustomDescriptionChange = (operationId: string, description: string) => {
        setCustomDescriptions(prev => ({ ...prev, [operationId]: description }));
        if (description.trim()) setDescriptionErrors(prev => { const n = { ...prev }; delete n[operationId]; return n; });
    };

    const handleDescriptionBlur = (operationId: string) => {
        if (!customDescriptions[operationId]?.trim()) {
            setDescriptionErrors(prev => ({ ...prev, [operationId]: 'Description is required.' }));
        }
    };

    const handleSelectAll = () => {
        if (!selectedAPI) return;
        if (selectedOperationIds.size === selectedAPI.operations.length) {
            setSelectedOperationIds(new Set());
        } else {
            setSelectedOperationIds(new Set(selectedAPI.operations.map((op: APIOperation) => op.id)));
        }
    };

    const handleAPIChange = (apiId: string) => {
        onAPIChange(apiId);
        setSelectedOperationIds(new Set());
        setCustomNames({});
        setCustomDescriptions({});
        setDescriptionErrors({});
    };

    const handleConfirm = () => {
        if (!selectedAPIForTool || selectedOperationIds.size === 0) return;
        const missingDesc: Record<string, string> = {};
        Array.from(selectedOperationIds).forEach(opId => {
            if (!customDescriptions[opId]?.trim()) missingDesc[opId] = 'Description is required.';
        });
        if (Object.keys(missingDesc).length > 0) {
            setDescriptionErrors(missingDesc);
            return;
        }

        const selectedOperations = Array.from(selectedOperationIds).flatMap(opId => {
            const operation = selectedAPI?.operations.find((op: APIOperation) => op.id === opId);
            if (!operation) return [];
            return [{
                id: opId,
                customName: customNames[opId] || getDefaultName(operation),
                description: customDescriptions[opId]!.trim(),
            }];
        });

        onConfirmBulk(selectedAPIForTool, selectedOperations);
        setSelectedOperationIds(new Set());
        setCustomNames({});
        setCustomDescriptions({});
        setDescriptionErrors({});
    };

    const allSelected = !!selectedAPI
        && selectedAPI.operations.length > 0
        && selectedOperationIds.size === selectedAPI.operations.length;
    const someSelected = selectedOperationIds.size > 0;
    const hasMissingDescriptions = Array.from(selectedOperationIds).some(id => !customDescriptions[id]?.trim());

    return (
        <DialogOverlay onClick={onCancel}>
            <DialogContent onClick={(e) => e.stopPropagation()}>
                <DialogTitle>Add Tools from API Operations</DialogTitle>

                <DialogField>
                    <Typography variant="subtitle2">Select API</Typography>
                    <DialogSelect
                        id="api-select"
                        value={selectedAPIForTool}
                        onChange={(e) => handleAPIChange(e.target.value)}
                    >
                        <option value="">-- Choose an API --</option>
                        {apis.map(api => (
                            <option key={api.id} value={api.id}>
                                {api.name} ({api.context})
                            </option>
                        ))}
                    </DialogSelect>
                </DialogField>

                {selectedAPIForTool && selectedAPI && (
                    <DialogField>
                        <Typography variant="subtitle2">
                            Select Operations & Custom Names ({selectedOperationIds.size} of {selectedAPI.operations.length})
                        </Typography>
                        {selectedAPI.operations.length > 0 ? (
                            <ItemsList>
                                <SelectAllRow onClick={handleSelectAll}>
                                    <ItemCheckbox
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={handleSelectAll}
                                        onClick={(e) => e.stopPropagation()}
                                        id="select-all"
                                    />
                                    <label onClick={(e: any) => e.stopPropagation()} style={{ cursor: 'pointer', margin: 0, fontSize: '12px', fontWeight: 500, color: 'var(--vscode-editor-foreground)' }}>
                                        <strong>Select All Operations</strong>
                                    </label>
                                </SelectAllRow>
                                {selectedAPI.operations.map((op: APIOperation) => (
                                    <ListItem key={op.id}>
                                        <ListItemHeader onClick={() => handleOperationToggle(op.id)}>
                                            <ItemCheckbox
                                                type="checkbox"
                                                checked={selectedOperationIds.has(op.id)}
                                                onChange={() => handleOperationToggle(op.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                id={`op-${op.id}`}
                                            />
                                            <OperationDetails>
                                                <OperationMethodRow>
                                                    <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
                                                        {op.method}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--vscode-editor-foreground)' }}>{op.path}</Typography>
                                                </OperationMethodRow>
                                                {op.summary && <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', fontSize: '10px' }}>{op.summary}</Typography>}
                                            </OperationDetails>
                                        </ListItemHeader>
                                        {selectedOperationIds.has(op.id) && (
                                            <CustomInputsContainer>
                                                <Typography variant="caption" sx={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '2px' }}>Tool name</Typography>
                                                <CustomInput
                                                    id={`name-${op.id}`}
                                                    type="text"
                                                    placeholder={getDefaultName(op)}
                                                    value={customNames[op.id] || ''}
                                                    onChange={(e) => handleCustomNameChange(op.id, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <Typography variant="caption" sx={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '2px' }}>Description *</Typography>
                                                <FlexRow>
                                                    <CustomInput
                                                        id={`desc-${op.id}`}
                                                        type="text"
                                                        placeholder={op.summary || 'Describe what this tool does'}
                                                        value={customDescriptions[op.id] || ''}
                                                        onChange={(e) => handleCustomDescriptionChange(op.id, e.target.value)}
                                                        onBlur={() => handleDescriptionBlur(op.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <Button
                                                        appearance="secondary"
                                                        disabled={aiLoadingIds.has(op.id)}
                                                        onClick={(e: any) => { e.stopPropagation(); handleFillWithAI(op); }}
                                                        sx={{ padding: '4px 10px', fontSize: '12px', minWidth: 'auto' }}
                                                    >
                                                        {aiLoadingIds.has(op.id) ? 'Filling...' : 'Fill With AI'}
                                                    </Button>
                                                </FlexRow>
                                                {descriptionErrors[op.id] && <Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)', fontSize: '11px' }}>{descriptionErrors[op.id]}</Typography>}
                                            </CustomInputsContainer>
                                        )}
                                    </ListItem>
                                ))}
                            </ItemsList>
                        ) : (
                            <Typography variant="body2" sx={{ color: 'var(--vscode-descriptionForeground)', textAlign: 'center', padding: '20px' }}>No operations available in this API</Typography>
                        )}
                    </DialogField>
                )}

                <DialogButtonGroup>
                    <Button appearance="secondary" onClick={onCancel}>Cancel</Button>
                    {someSelected && (
                        <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', alignSelf: 'center' }}>
                            {selectedOperationIds.size} operation{selectedOperationIds.size !== 1 ? 's' : ''} selected
                        </Typography>
                    )}
                    <Button
                        appearance="primary"
                        onClick={handleConfirm}
                        disabled={!selectedAPIForTool || !someSelected || hasMissingDescriptions}
                    >
                        Add Selected Tools ({selectedOperationIds.size})
                    </Button>
                </DialogButtonGroup>
            </DialogContent>
        </DialogOverlay>
    );
}

export default AddAPIToolDialog;
