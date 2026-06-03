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
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { DialogField, DialogButtonGroup, DialogTitle } from '../Commons';
import { SelectAllRow, CustomInputsContainer, ItemsList, ListItem, ListItemHeader, ItemCheckbox } from './styles';
import { EMPTY_MCP_SCHEMA, INVALID_MCP_SCHEMA_MESSAGE } from '../../../constants';

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
    rawVersion: string;
    xmlPath: string;
    operations: APIOperation[];
}

interface AddAPIToolDialogProps {
    isOpen: boolean;
    apis: API[];
    selectedAPIForTool: string;
    projectRoot: string;
    onAPIChange: (apiId: string) => void;
    onConfirmBulk: (apiId: string, selectedOperations: Array<{ id: string; customName: string; description: string; inputSchema: string }>) => void;
    onCancel: () => void;
}

interface OperationFormItem {
    customName: string;
    description: string;
    inputSchema: string;
}

interface FormValues {
    items: Record<string, OperationFormItem>;
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

const SchemaRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export function AddAPIToolDialog({
    isOpen,
    apis,
    selectedAPIForTool,
    projectRoot,
    onAPIChange,
    onConfirmBulk,
    onCancel,
}: AddAPIToolDialogProps) {
    const { rpcClient } = useVisualizerContext();
    const [selectedOperationIds, setSelectedOperationIds] = useState<Set<string>>(new Set());
    const [aiLoadingIds, setAiLoadingIds] = useState<Set<string>>(new Set());
    const [apiSchemas, setApiSchemas] = useState<Record<string, string>>({});
    const [apiDescriptions, setApiDescriptions] = useState<Record<string, string>>({});

    const { register, handleSubmit, watch, getValues, setValue, setError, clearErrors, reset, formState: { errors } } = useForm<FormValues>({
        defaultValues: { items: {} },
        mode: 'onTouched',
    });

    const items = watch('items') || {};

    useEffect(() => {
        if (!isOpen) {
            reset({ items: {} });
            setSelectedOperationIds(new Set());
            setApiSchemas({});
            setApiDescriptions({});
        }
    }, [isOpen, reset]);

    const selectedAPI = apis.find(a => a.id === selectedAPIForTool);

    // Load input schemas from API definition when the selected API changes
    useEffect(() => {
        if (!selectedAPI || !projectRoot) {
            setApiSchemas({});
            return;
        }
        rpcClient.getMiDiagramRpcClient().getAPIOperationInputSchemas({
            projectRoot,
            operations: selectedAPI.operations.map(op => ({
                id: op.id,
                apiName: selectedAPI.name,
                apiXmlPath: selectedAPI.xmlPath,
                apiRawVersion: selectedAPI.rawVersion,
                operationMethod: op.method,
                operationPath: op.path,
            })),
        }).then(({ schemas, descriptions }) => {
            setApiSchemas(schemas);
            setApiDescriptions(descriptions ?? {});
        }).catch(() => { setApiSchemas({}); setApiDescriptions({}); });
    }, [selectedAPIForTool, projectRoot]);

    const handleOperationToggle = (operationId: string) => {
        const newSet = new Set(selectedOperationIds);
        if (newSet.has(operationId)) {
            newSet.delete(operationId);
            clearErrors(`items.${operationId}` as const);
        } else {
            newSet.add(operationId);
            const op = selectedAPI?.operations.find((o: APIOperation) => o.id === operationId);
            if (op && !getValues(`items.${operationId}.customName` as const)) {
                setValue(`items.${operationId}.customName` as const, getDefaultName(op));
            }
            const description = apiDescriptions[operationId] || op?.summary || "";
            if (description && !getValues(`items.${operationId}.description` as const)) {
                setValue(`items.${operationId}.description` as const, description);
            }
            const existing = getValues(`items.${operationId}.inputSchema` as const);
            if (!existing && apiSchemas[operationId]) {
                setValue(`items.${operationId}.inputSchema` as const, apiSchemas[operationId]);
            }
        }
        setSelectedOperationIds(newSet);
    };

    const handleSelectAll = () => {
        if (!selectedAPI) return;
        if (selectedOperationIds.size === selectedAPI.operations.length) {
            setSelectedOperationIds(new Set());
        } else {
            const allIds = new Set(selectedAPI.operations.map((op: APIOperation) => op.id));
            for (const op of selectedAPI.operations) {
                if (!getValues(`items.${op.id}.customName` as const)) {
                    setValue(`items.${op.id}.customName` as const, getDefaultName(op));
                }
                const description = apiDescriptions[op.id] || op.summary || "";
                if (description && !getValues(`items.${op.id}.description` as const)) {
                    setValue(`items.${op.id}.description` as const, description);
                }
                const existing = getValues(`items.${op.id}.inputSchema` as const);
                if (!existing && apiSchemas[op.id]) {
                    setValue(`items.${op.id}.inputSchema` as const, apiSchemas[op.id]);
                }
            }
            setSelectedOperationIds(allIds);
        }
    };

    const handleAPIChange = (apiId: string) => {
        onAPIChange(apiId);
        setSelectedOperationIds(new Set());
        reset({ items: {} });
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

    const handleFillWithAI = async (op: APIOperation) => {
        setAiLoadingIds(prev => new Set(prev).add(op.id));
        try {
            const customName = getValues(`items.${op.id}.customName` as const);
            const result = await rpcClient.getMiVisualizerRpcClient().getMcpToolSuggestion({
                toolName: customName || getDefaultName(op),
                operationMethod: op.method,
                operationPath: op.path,
                operationSummary: op.summary,
                apiXmlPath: selectedAPI?.xmlPath,
                inputSchemaJson: apiSchemas[op.id] || undefined,
            });
            if (result.name && !getValues(`items.${op.id}.customName` as const)?.trim()) {
                setValue(`items.${op.id}.customName` as const, result.name);
            }
            if (result.description) {
                setValue(`items.${op.id}.description` as const, result.description);
                clearErrors(`items.${op.id}.description` as const);
            }
            if (result.inputSchema) {
                setValue(`items.${op.id}.inputSchema` as const, result.inputSchema);
                validateSchema(op.id, result.inputSchema);
            }
        } finally {
            setAiLoadingIds(prev => { const n = new Set(prev); n.delete(op.id); return n; });
        }
    };

    const handleImportFile = async (id: string) => {
        const { content } = await rpcClient.getMiDiagramRpcClient().pickMcpJsonFile();
        if (content === null) return;
        setValue(`items.${id}.inputSchema` as const, content);
        validateSchema(id, content);
    };

    const onSubmit = async (data: FormValues) => {
        if (!selectedAPIForTool || selectedOperationIds.size === 0) return;

        const opIds = Array.from(selectedOperationIds);

        let hasErrors = false;
        opIds.forEach(opId => {
            if (!data.items?.[opId]?.customName?.trim()) {
                setError(`items.${opId}.customName` as const, { message: 'Tool name is required.' });
                hasErrors = true;
            }
            if (!data.items?.[opId]?.description?.trim()) {
                setError(`items.${opId}.description` as const, { message: 'Description is required.' });
                hasErrors = true;
            }
        });
        if (hasErrors) return;

        const hasSchemaErrors = opIds.some(id => errors.items?.[id]?.inputSchema);
        if (hasSchemaErrors) return;

        const selectedOperations = await Promise.all(opIds.flatMap(opId => {
            const operation = selectedAPI?.operations.find((op: APIOperation) => op.id === opId);
            if (!operation) return [];
            return [async () => {
                const item = data.items?.[opId];
                const raw = item?.inputSchema?.trim() || '';
                let converted: string | null = null;
                if (raw) {
                    const { schema } = await rpcClient.getMiDiagramRpcClient().convertMcpJsonSchema({ input: raw });
                    converted = schema;
                }
                return {
                    id: opId,
                    customName: item?.customName || getDefaultName(operation),
                    description: item!.description.trim(),
                    inputSchema: converted || EMPTY_MCP_SCHEMA,
                };
            }];
        }).map(fn => fn()));

        onConfirmBulk(selectedAPIForTool, selectedOperations);
        reset({ items: {} });
        setSelectedOperationIds(new Set());
    };

    const allSelected = !!selectedAPI
        && selectedAPI.operations.length > 0
        && selectedOperationIds.size === selectedAPI.operations.length;
    const someSelected = selectedOperationIds.size > 0;
    const selectedIdList = Array.from(selectedOperationIds);
    const hasSchemaErrors = selectedIdList.some(id => !!errors.items?.[id]?.inputSchema);
    const hasMissingDescriptions = selectedIdList.some(id => !items[id]?.description?.trim());
    const hasMissingNames = selectedIdList.some(id => !items[id]?.customName?.trim());

    return (
        <Dialog isOpen={isOpen} onClose={onCancel} sx={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', borderRadius: '8px', textAlign: 'left' }}>
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
                            {selectedAPI.operations.map((op: APIOperation) => {
                                const itemErrors = errors.items?.[op.id];
                                return (
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
                                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                <Button
                                                    appearance="icon"
                                                    disabled={aiLoadingIds.has(op.id)}
                                                    onClick={(e: any) => { e.stopPropagation(); handleFillWithAI(op); }}
                                                    tooltip="Fill with AI"
                                                >
                                                    <Icon name="bi-ai-chat" />
                                                </Button>
                                            </div>
                                            <Typography variant="caption" sx={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '2px' }}>Tool name *</Typography>
                                            <TextField
                                                id={`name-${op.id}`}
                                                {...register(`items.${op.id}.customName` as const, {
                                                    onChange: e => { if (e.target.value.trim()) clearErrors(`items.${op.id}.customName` as const); },
                                                    onBlur: e => { if (!e.target.value.trim()) setError(`items.${op.id}.customName` as const, { message: 'Tool name is required.' }); },
                                                })}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            {itemErrors?.customName && <Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)', fontSize: '11px' }}>{String(itemErrors.customName.message)}</Typography>}
                                            <Typography variant="caption" sx={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '2px' }}>Description *</Typography>
                                            <TextField
                                                id={`desc-${op.id}`}
                                                placeholder={op.summary || 'Describe what this tool does'}
                                                {...register(`items.${op.id}.description` as const, {
                                                    onChange: e => { if (e.target.value.trim()) clearErrors(`items.${op.id}.description` as const); },
                                                    onBlur: e => { if (!e.target.value.trim()) setError(`items.${op.id}.description` as const, { message: 'Description is required.' }); },
                                                })}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            {itemErrors?.description && <Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)', fontSize: '11px' }}>{String(itemErrors.description.message)}</Typography>}
                                            <Typography variant="caption" sx={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '2px' }}>Input Schema (JSON)</Typography>
                                            <SchemaRow>
                                                <TextArea
                                                    placeholder='e.g. {"type":"object","properties":{"city":{"type":"string"}}}'
                                                    rows={4}
                                                    resize="vertical"
                                                    sx={{ flex: 1, fontFamily: 'var(--vscode-editor-font-family, monospace)' }}
                                                    {...register(`items.${op.id}.inputSchema` as const, {
                                                        onChange: e => validateSchema(op.id, e.target.value),
                                                    })}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <Button
                                                    appearance="secondary"
                                                    onClick={(e: any) => { e.stopPropagation(); handleImportFile(op.id); }}
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
                    onClick={handleSubmit(onSubmit)}
                    disabled={!selectedAPIForTool || !someSelected || hasMissingNames || hasMissingDescriptions || hasSchemaErrors}
                >
                    Add Selected Tools ({selectedOperationIds.size})
                </Button>
            </DialogButtonGroup>
        </Dialog>
    );
}

export default AddAPIToolDialog;
