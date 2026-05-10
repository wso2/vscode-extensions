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

import { ChangeEvent, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { Button, Typography } from '@wso2/ui-toolkit';
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { DialogOverlay, DialogContent, DialogField, DialogButtonGroup, StdInput, SchemaTextarea, FlexRowStart, DialogTitle } from './dialogStyles';

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

export function CreateScratchToolDialog({
    isOpen,
    onConfirm,
    onCancel,
    existingSequenceIds = [],
    existingToolSequenceNames = []
}: CreateScratchToolDialogProps) {
    const { rpcClient } = useVisualizerContext();
    const [name, setName] = useState('');
    const [nameError, setNameError] = useState('');
    const [description, setDescription] = useState('');
    const [descriptionError, setDescriptionError] = useState('');
    const [inputSchema, setInputSchema] = useState('');
    const [schemaError, setSchemaError] = useState('');
    const [aiDescLoading, setAiDescLoading] = useState(false);
    const [aiSchemaLoading, setAiSchemaLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const validateName = (value: string): boolean => {
        if (!value.trim()) {
            setNameError('');
            return true;
        }

        const sanitized = value.trim().toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_{2,}/g, '_')
            .replace(/^_+|_+$/, '');

        if (!sanitized) {
            setNameError('Tool name must contain alphanumeric characters.');
            return false;
        }

        const sequenceName = sanitized + '_tool';
        if (existingSequenceIds.includes(sequenceName) || existingToolSequenceNames.includes(sequenceName)) {
            setNameError(`A sequence named "${sequenceName}" already exists.`);
            return false;
        }

        setNameError('');
        return true;
    };

    const handleNameChange = (value: string) => {
        setName(value);
        validateName(value);
    };

    const handleFillDescription = async () => {
        if (!name.trim()) return;
        setAiDescLoading(true);
        try {
            const result = await rpcClient.getMiVisualizerRpcClient().getMcpToolSuggestion({ toolName: name.trim() });
            if (result.description) { setDescription(result.description); setDescriptionError(''); }
        } finally {
            setAiDescLoading(false);
        }
    };

    const handleFillSchema = async () => {
        if (!name.trim()) return;
        setAiSchemaLoading(true);
        try {
            const result = await rpcClient.getMiVisualizerRpcClient().getMcpToolSuggestion({ toolName: name.trim() });
            if (result.inputSchema) {
                setInputSchema(result.inputSchema);
                validateSchema(result.inputSchema);
            }
        } finally {
            setAiSchemaLoading(false);
        }
    };

    if (!isOpen) return null;

    const derivedSequenceName = name.trim()
        ? name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_{2,}/g, '_').replace(/^_+|_+$/, '') + '_tool'
        : '';

    const validateSchema = async (value: string): Promise<boolean> => {
        if (!value.trim()) { setSchemaError(''); return true; }
        const { schema } = await rpcClient.getMiDiagramRpcClient().convertMcpJsonSchema({ input: value });
        if (schema === null) {
            setSchemaError('Invalid JSON. Use shorthand like {"city": "string"} or full JSON Schema.');
            return false;
        }
        setSchemaError('');
        return true;
    };

    const handleSchemaChange = (value: string) => {
        setInputSchema(value);
        validateSchema(value);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setInputSchema(content);
            validateSchema(content);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleConfirm = async () => {
        if (!name.trim() || nameError || schemaError) return;
        if (!description.trim()) {
            setDescriptionError('Description is required.');
            return;
        }
        const emptySchema = JSON.stringify({ type: 'object', properties: {}, additionalProperties: false });
        const converted = inputSchema.trim()
            ? (await rpcClient.getMiDiagramRpcClient().convertMcpJsonSchema({ input: inputSchema })).schema
            : null;
        onConfirm({
            name: name.trim(),
            description: description.trim(),
            inputSchema: converted || emptySchema,
        });
        setName('');
        setNameError('');
        setDescription('');
        setDescriptionError('');
        setInputSchema('');
        setSchemaError('');
    };

    return (
        <DialogOverlay onClick={onCancel}>
            <DialogContent onClick={e => e.stopPropagation()}>
                <DialogTitle>Create New Tool</DialogTitle>
                <Typography variant="body2" sx={{ color: 'var(--vscode-descriptionForeground)', marginBottom: '16px' }}>
                    A new sequence will be created automatically. You can implement the logic inside it after.
                </Typography>

                <DialogField>
                    <Typography variant="subtitle2">Tool Name *</Typography>
                    <StdInput
                        type="text"
                        placeholder="e.g., get_weather"
                        value={name}
                        onChange={e => handleNameChange(e.target.value)}
                    />
                    {nameError && <Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)' }}>{nameError}</Typography>}
                    {derivedSequenceName && !nameError && (
                        <Typography variant="caption" sx={{ color: 'var(--vscode-descriptionForeground)', fontStyle: 'italic' }}>A sequence named "{derivedSequenceName}" will be created.</Typography>
                    )}
                </DialogField>

                <DialogField>
                    <Typography variant="subtitle2">Description *</Typography>
                    <SchemaRow>
                        <StdInput
                            type="text"
                            placeholder="Describe what this tool does"
                            value={description}
                            onChange={e => { setDescription(e.target.value); if (e.target.value.trim()) setDescriptionError(''); }}
                            onBlur={() => { if (!description.trim()) setDescriptionError('Description is required.'); }}
                        />
                        <Button appearance="secondary" onClick={handleFillDescription} disabled={!name.trim() || aiDescLoading} sx={{ padding: '4px 10px', fontSize: '12px', minWidth: 'auto' }}>
                            {aiDescLoading ? 'Filling...' : 'Fill With AI'}
                        </Button>
                    </SchemaRow>
                    {descriptionError && <Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)' }}>{descriptionError}</Typography>}
                </DialogField>

                <DialogField>
                    <Typography variant="subtitle2">Input Schema (JSON)</Typography>
                    <SchemaRow>
                        <SchemaTextarea
                            placeholder='e.g. {"city": "string", "units": "string"}'
                            value={inputSchema}
                            onChange={e => handleSchemaChange(e.target.value)}
                        />
                        <Button appearance="secondary" onClick={handleFillSchema} disabled={!name.trim() || aiSchemaLoading} sx={{ padding: '4px 10px', fontSize: '12px', minWidth: 'auto' }}>
                            {aiSchemaLoading ? 'Filling...' : 'Fill With AI'}
                        </Button>
                        <Button appearance="secondary" onClick={() => fileInputRef.current?.click()} sx={{ padding: '4px 10px', fontSize: '12px', minWidth: 'auto' }}>
                            Import JSON
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                    </SchemaRow>
                    {schemaError && <Typography variant="caption" sx={{ color: 'var(--vscode-errorForeground)' }}>{schemaError}</Typography>}
                </DialogField>

                <DialogButtonGroup>
                    <Button appearance="secondary" onClick={onCancel}>Cancel</Button>
                    <Button appearance="primary" onClick={handleConfirm} disabled={!name.trim() || !description.trim() || !!schemaError || !!nameError}>
                        Create Tool
                    </Button>
                </DialogButtonGroup>
            </DialogContent>
        </DialogOverlay>
    );
}

export default CreateScratchToolDialog;
