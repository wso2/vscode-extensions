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

import { useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import { Dialog, Button, Icon, Typography, TextField, TextArea } from '@wso2/ui-toolkit';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { DialogField, DialogButtonGroup, DialogTitle } from '../Commons';
import { EMPTY_MCP_SCHEMA, INVALID_MCP_SCHEMA_MESSAGE } from '../../../constants';

// Styled Components

const SchemaRow = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
`;

// Component

export interface ScratchToolData {
    name: string;
    description: string;
    inputSchema: string;
}

interface CreateScratchToolDialogProps {
    isOpen: boolean;
    onConfirm: (tool: ScratchToolData) => void;
    onCancel: () => void;
    existingSequenceIds?: string[];
    existingToolSequenceNames?: string[];
}

interface FormValues {
    name: string;
    description: string;
    inputSchema: string;
}

const sanitizeToolName = (raw: string): string =>
    raw.trim().toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/, '');

export function CreateScratchToolDialog({
    isOpen,
    onConfirm,
    onCancel,
    existingSequenceIds = [],
    existingToolSequenceNames = []
}: CreateScratchToolDialogProps) {
    const { rpcClient } = useVisualizerContext();
    const [aiLoading, setAiLoading] = useState(false);

    const schema = useMemo(() => yup.object({
        name: yup.string()
            .required('Tool name is required')
            .test('valid-sanitized', 'Tool name must contain alphanumeric characters.',
                v => !!sanitizeToolName(v || ''))
            .test('no-collision', function (v) {
                const sequenceName = sanitizeToolName(v || '') + '_tool';
                if (existingSequenceIds.includes(sequenceName) || existingToolSequenceNames.includes(sequenceName)) {
                    return this.createError({ message: `A sequence named "${sequenceName}" already exists.` });
                }
                return true;
            }),
        description: yup.string().required('Description is required.'),
        inputSchema: yup.string().default(''),
    }), [existingSequenceIds, existingToolSequenceNames]);

    const { register, handleSubmit, watch, setValue, setError, clearErrors, reset, formState: { errors } } = useForm<FormValues>({
        resolver: yupResolver(schema) as any,
        defaultValues: { name: '', description: '', inputSchema: '' },
        mode: 'onTouched',
    });

    const name = watch('name');
    const description = watch('description');

    useEffect(() => {
        if (!isOpen) reset();
    }, [isOpen, reset]);

    const derivedSequenceName = name?.trim() ? sanitizeToolName(name) + '_tool' : '';

    const validateSchema = async (value: string): Promise<boolean> => {
        if (!value.trim()) {
            clearErrors('inputSchema');
            return true;
        }
        const { schema: converted } = await rpcClient.getMiDiagramRpcClient().convertMcpJsonSchema({ input: value });
        if (converted === null) {
            setError('inputSchema', { message: INVALID_MCP_SCHEMA_MESSAGE });
            return false;
        }
        clearErrors('inputSchema');
        return true;
    };

    const handleFillWithAI = async () => {
        if (!name?.trim()) return;
        setAiLoading(true);
        try {
            const result = await rpcClient.getMiVisualizerRpcClient().getMcpToolSuggestion({ toolName: name.trim() });
            if (result.description) {
                setValue('description', result.description, { shouldValidate: true });
            }
            if (result.inputSchema) {
                setValue('inputSchema', result.inputSchema);
                validateSchema(result.inputSchema);
            }
        } finally {
            setAiLoading(false);
        }
    };

    const handleImportFile = async () => {
        const { content } = await rpcClient.getMiDiagramRpcClient().pickMcpJsonFile();
        if (content === null) return;
        setValue('inputSchema', content);
        validateSchema(content);
    };

    const onSubmit = async (data: FormValues) => {
        let converted: string | null = null;
        if (data.inputSchema.trim()) {
            const result = await rpcClient.getMiDiagramRpcClient().convertMcpJsonSchema({ input: data.inputSchema });
            if (result.schema === null) {
                setError('inputSchema', { message: INVALID_MCP_SCHEMA_MESSAGE });
                return;
            }
            converted = result.schema;
        }
        onConfirm({
            name: data.name.trim(),
            description: data.description.trim(),
            inputSchema: converted || EMPTY_MCP_SCHEMA,
        });
        reset();
    };

    const submitDisabled = !name?.trim() || !description?.trim() || !!errors.name || !!errors.description || !!errors.inputSchema;

    return (
        <Dialog isOpen={isOpen} onClose={onCancel} sx={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', borderRadius: '8px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <DialogTitle>Create New Tool</DialogTitle>
                <Button
                    appearance="icon"
                    disabled={!name?.trim() || aiLoading}
                    onClick={handleFillWithAI}
                    tooltip="Fill with AI"
                >
                    <Icon name="bi-ai-chat" />
                </Button>
            </div>
            <Typography variant="body2" sx={{ color: 'var(--vscode-descriptionForeground)', marginBottom: '16px' }}>
                A new sequence will be created automatically. You can implement the logic inside it after.
            </Typography>

            <DialogField>
                <Typography variant="subtitle2">Tool Name *</Typography>
                <TextField
                    id="scratch-tool-name"
                    aria-label="Tool Name"
                    placeholder="e.g., get_weather"
                    {...register('name')}
                />
                {errors.name && <Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)' }}>{String(errors.name.message)}</Typography>}
                {derivedSequenceName && !errors.name && (
                    <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic' }}>A sequence named "{derivedSequenceName}" will be created.</Typography>
                )}
            </DialogField>

            <DialogField>
                <Typography variant="subtitle2">Description *</Typography>
                <TextField
                    id="scratch-tool-description"
                    aria-label="Description"
                    placeholder="Describe what this tool does"
                    {...register('description')}
                />
                {errors.description && <Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)' }}>{String(errors.description.message)}</Typography>}
            </DialogField>

            <DialogField>
                <Typography variant="subtitle2">Input Schema (JSON)</Typography>
                <SchemaRow>
                    <TextArea
                        id="scratch-tool-schema"
                        aria-label="Input Schema (JSON)"
                        placeholder='e.g. {"type":"object","properties":{"city":{"type":"string"}}}'
                        rows={4}
                        resize="vertical"
                        sx={{ flex: 1, fontFamily: 'var(--vscode-editor-font-family, monospace)' }}
                        {...register('inputSchema', {
                            onChange: e => validateSchema(e.target.value),
                        })}
                    />
                    <Button appearance="secondary" onClick={handleImportFile} sx={{ padding: '4px 10px', fontSize: '12px', minWidth: 'auto' }}>
                        Import JSON
                    </Button>
                </SchemaRow>
                {errors.inputSchema && <Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)' }}>{String(errors.inputSchema.message)}</Typography>}
            </DialogField>

            <DialogButtonGroup>
                <Button appearance="secondary" onClick={onCancel}>Cancel</Button>
                <Button appearance="primary" onClick={handleSubmit(onSubmit)} disabled={submitDisabled}>
                    Create Tool
                </Button>
            </DialogButtonGroup>
        </Dialog>
    );
}

export default CreateScratchToolDialog;
