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
import { useVisualizerContext } from '@wso2/mi-rpc-client';

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

const DialogOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
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

const OperationsList = styled.div`
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    max-height: 400px;
    overflow-y: auto;
    padding: 8px 0;
`;

const OperationItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--vscode-panel-border);

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const OperationItemHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;
`;

const OperationCheckbox = styled.input`
    cursor: pointer;
    accent-color: var(--vscode-focusBorder);
    margin-top: 2px;
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

const OperationMethod = styled.span`
    font-weight: 600;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const OperationPath = styled.span`
    color: var(--vscode-editor-foreground);
    font-family: monospace;
    font-size: 11px;
`;

const OperationSummary = styled.span`
    color: var(--vscode-descriptionForeground);
    font-size: 10px;
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

    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
    }
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

    &:hover {
        background: var(--vscode-button-secondaryHoverBackground);
    }
`;

const DialogAddBtn = styled(DialogBtn)`
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);

    &:hover {
        background: var(--vscode-button-hoverBackground);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

const EmptyMessage = styled.div`
    color: var(--vscode-descriptionForeground);
    text-align: center;
    padding: 20px;
    font-size: 12px;
`;

const InputError = styled.span`
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
                    <DialogLabel htmlFor="api-select">Select API</DialogLabel>
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
                        <DialogLabel>
                            Select Operations & Custom Names ({selectedOperationIds.size} of {selectedAPI.operations.length})
                        </DialogLabel>
                        {selectedAPI.operations.length > 0 ? (
                            <OperationsList>
                                <SelectAllRow onClick={handleSelectAll}>
                                    <OperationCheckbox
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={handleSelectAll}
                                        onClick={(e) => e.stopPropagation()}
                                        id="select-all"
                                    />
                                    <SelectAllLabel onClick={(e) => e.stopPropagation()} htmlFor="select-all">
                                        <strong>Select All Operations</strong>
                                    </SelectAllLabel>
                                </SelectAllRow>
                                {selectedAPI.operations.map((op: APIOperation) => (
                                    <OperationItem key={op.id}>
                                        <OperationItemHeader onClick={() => handleOperationToggle(op.id)}>
                                            <OperationCheckbox
                                                type="checkbox"
                                                checked={selectedOperationIds.has(op.id)}
                                                onChange={() => handleOperationToggle(op.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                id={`op-${op.id}`}
                                            />
                                            <OperationDetails>
                                                <OperationMethodRow>
                                                    <OperationMethod>
                                                        {op.method}
                                                    </OperationMethod>
                                                    <OperationPath>{op.path}</OperationPath>
                                                </OperationMethodRow>
                                                {op.summary && <OperationSummary>{op.summary}</OperationSummary>}
                                            </OperationDetails>
                                        </OperationItemHeader>
                                        {selectedOperationIds.has(op.id) && (
                                            <CustomInputsContainer>
                                                <InputFieldLabel htmlFor={`name-${op.id}`}>Tool name</InputFieldLabel>
                                                <CustomInput
                                                    id={`name-${op.id}`}
                                                    type="text"
                                                    placeholder={getDefaultName(op)}
                                                    value={customNames[op.id] || ''}
                                                    onChange={(e) => handleCustomNameChange(op.id, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <InputFieldLabel htmlFor={`desc-${op.id}`}>Description *</InputFieldLabel>
                                                <DescriptionRow>
                                                    <CustomInput
                                                        id={`desc-${op.id}`}
                                                        type="text"
                                                        placeholder={op.summary || 'Describe what this tool does'}
                                                        value={customDescriptions[op.id] || ''}
                                                        onChange={(e) => handleCustomDescriptionChange(op.id, e.target.value)}
                                                        onBlur={() => handleDescriptionBlur(op.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <FillAIBtn
                                                        type="button"
                                                        disabled={aiLoadingIds.has(op.id)}
                                                        onClick={(e) => { e.stopPropagation(); handleFillWithAI(op); }}
                                                    >
                                                        {aiLoadingIds.has(op.id) ? 'Filling...' : 'Fill With AI'}
                                                    </FillAIBtn>
                                                </DescriptionRow>
                                                {descriptionErrors[op.id] && <InputError>{descriptionErrors[op.id]}</InputError>}
                                            </CustomInputsContainer>
                                        )}
                                    </OperationItem>
                                ))}
                            </OperationsList>
                        ) : (
                            <EmptyMessage>No operations available in this API</EmptyMessage>
                        )}
                    </DialogField>
                )}

                <DialogButtonGroup>
                    <DialogCancelBtn onClick={onCancel}>Cancel</DialogCancelBtn>
                    {someSelected && (
                        <SelectionInfo>
                            {selectedOperationIds.size} operation{selectedOperationIds.size !== 1 ? 's' : ''} selected
                        </SelectionInfo>
                    )}
                    <DialogAddBtn
                        onClick={handleConfirm}
                        disabled={!selectedAPIForTool || !someSelected || hasMissingDescriptions}
                    >
                        Add Selected Tools ({selectedOperationIds.size})
                    </DialogAddBtn>
                </DialogButtonGroup>
            </DialogContent>
        </DialogOverlay>
    );
}

export default AddAPIToolDialog;
