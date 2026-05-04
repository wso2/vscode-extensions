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
    max-width: 520px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const DialogTitle = styled.h3`
    color: var(--vscode-editor-foreground);
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
`;

const DialogSubtitle = styled.p`
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    margin: -8px 0 16px 0;
    line-height: 1.5;
`;

const DialogField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 14px;
`;

const DialogLabel = styled.label`
    color: var(--vscode-editor-foreground);
    font-size: 12px;
    font-weight: 500;
`;

const Input = styled.input`
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
    padding: 6px 8px;
    border-radius: 3px;
    font-size: 13px;
    font-family: inherit;
    width: 100%;
    box-sizing: border-box;
    &:focus { outline: none; border-color: var(--vscode-focusBorder); }
`;

const SchemaRow = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
`;

const SchemaTextarea = styled.textarea`
    flex: 1;
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

const SchemaError = styled.span`
    color: var(--vscode-inputValidation-errorForeground, var(--vscode-errorForeground));
    font-size: 11px;
`;

const SequenceHint = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    margin-top: 2px;
`;

const DialogButtonGroup = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid var(--vscode-panel-border);
`;

const Btn = styled.button`
    padding: 6px 14px;
    font-size: 12px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-weight: 500;
`;

const CancelBtn = styled(Btn)`
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    &:hover { background: var(--vscode-button-secondaryHoverBackground); }
`;

const ConfirmBtn = styled(Btn)`
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    &:hover { background: var(--vscode-button-hoverBackground); }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
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
}

export function CreateScratchToolDialog({ isOpen, onConfirm, onCancel }: CreateScratchToolDialogProps) {
    const { rpcClient } = useVisualizerContext();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [descriptionError, setDescriptionError] = useState('');
    const [inputSchema, setInputSchema] = useState('');
    const [schemaError, setSchemaError] = useState('');
    const [aiDescLoading, setAiDescLoading] = useState(false);
    const [aiSchemaLoading, setAiSchemaLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

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

    const validateSchema = (value: string): boolean => {
        if (!value.trim()) { setSchemaError(''); return true; }
        if (convertToJsonSchema(value) === null) {
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

    const handleConfirm = () => {
        if (!name.trim() || schemaError) return;
        if (!description.trim()) {
            setDescriptionError('Description is required.');
            return;
        }
        const emptySchema = JSON.stringify({ type: 'object', properties: {}, additionalProperties: false });
        onConfirm({
            name: name.trim(),
            description: description.trim(),
            inputSchema: (inputSchema.trim() ? convertToJsonSchema(inputSchema) : null) || emptySchema,
        });
        setName('');
        setDescription('');
        setDescriptionError('');
        setInputSchema('');
        setSchemaError('');
    };

    return (
        <DialogOverlay onClick={onCancel}>
            <DialogContent onClick={e => e.stopPropagation()}>
                <DialogTitle>Create New Tool</DialogTitle>
                <DialogSubtitle>
                    A new sequence will be created automatically. You can implement the logic inside it after.
                </DialogSubtitle>

                <DialogField>
                    <DialogLabel>Tool Name *</DialogLabel>
                    <Input
                        type="text"
                        placeholder="e.g., get_weather"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    {derivedSequenceName && (
                        <SequenceHint>A sequence named "{derivedSequenceName}" will be created.</SequenceHint>
                    )}
                </DialogField>

                <DialogField>
                    <DialogLabel>Description *</DialogLabel>
                    <SchemaRow>
                        <Input
                            type="text"
                            placeholder="Describe what this tool does"
                            value={description}
                            onChange={e => { setDescription(e.target.value); if (e.target.value.trim()) setDescriptionError(''); }}
                            onBlur={() => { if (!description.trim()) setDescriptionError('Description is required.'); }}
                        />
                        <FillAIBtn type="button" onClick={handleFillDescription} disabled={!name.trim() || aiDescLoading}>
                            {aiDescLoading ? 'Filling...' : 'Fill With AI'}
                        </FillAIBtn>
                    </SchemaRow>
                    {descriptionError && <SchemaError>{descriptionError}</SchemaError>}
                </DialogField>

                <DialogField>
                    <DialogLabel>Input Schema (JSON)</DialogLabel>
                    <SchemaRow>
                        <SchemaTextarea
                            placeholder='e.g. {"city": "string", "units": "string"}'
                            value={inputSchema}
                            onChange={e => handleSchemaChange(e.target.value)}
                        />
                        <FillAIBtn type="button" onClick={handleFillSchema} disabled={!name.trim() || aiSchemaLoading}>
                            {aiSchemaLoading ? 'Filling...' : 'Fill With AI'}
                        </FillAIBtn>
                        <SchemaImportBtn type="button" onClick={() => fileInputRef.current?.click()}>
                            Import JSON
                        </SchemaImportBtn>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                    </SchemaRow>
                    {schemaError && <SchemaError>{schemaError}</SchemaError>}
                </DialogField>

                <DialogButtonGroup>
                    <CancelBtn onClick={onCancel}>Cancel</CancelBtn>
                    <ConfirmBtn onClick={handleConfirm} disabled={!name.trim() || !description.trim() || !!schemaError}>
                        Create Tool
                    </ConfirmBtn>
                </DialogButtonGroup>
            </DialogContent>
        </DialogOverlay>
    );
}

export default CreateScratchToolDialog;
