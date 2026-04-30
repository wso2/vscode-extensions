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

import React, { useCallback, useRef, useMemo } from 'react';
import styled from '@emotion/styled';
import { TextField, CheckBox, Typography } from '@wso2/ui-toolkit';
import { EntityModal } from '../../../../components/common/EntityModal';
import { Section, SectionHeader, SectionTitle } from '../shared/EditorCommonStyles';
import { useBidirectionalSync } from '../../../../hooks/useBidirectionalSync';
import { MediaTypeExamplesEditor } from '../media-type/MediaTypeExamplesEditor';

const FormStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const FieldSelect = styled.select`
    width: 100%;
    padding: 6px 10px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    font-size: 12px;
    font-family: inherit;
`;

const FieldLabel = styled(Typography)`
    font-size: 12px !important;
    font-weight: 600 !important;
    margin-bottom: 6px !important;
`;

// ---------------------------------------------------------------------------
// Draft types
// ---------------------------------------------------------------------------

interface HeaderDraft {
    headerName: string;
    description: string;
    required: boolean;
    deprecated: boolean;
    schemaType: string;
    format: string;
    pattern: string;
    enumValues: string;
    defaultValue: string;
    exampleMode: 'single' | 'multiple';
    exampleText: string;
    examples: Record<string, any>;
}

function buildExternalDraft(data: any, initialName: string | undefined): HeaderDraft {
    const hasMultiple = data?.examples && Object.keys(data.examples).length > 0;
    return {
        headerName: initialName || '',
        description: data?.description || '',
        required: data?.required || false,
        deprecated: data?.deprecated || false,
        schemaType: data?.schema?.type || 'string',
        format: data?.schema?.format || '',
        pattern: data?.schema?.pattern || '',
        enumValues: (data?.schema?.enum || []).join(', '),
        defaultValue: data?.schema?.default !== undefined ? String(data.schema.default) : '',
        exampleMode: hasMultiple ? 'multiple' : 'single',
        exampleText: data?.example !== undefined
            ? (typeof data.example === 'string' ? data.example : JSON.stringify(data.example, null, 2))
            : '',
        examples: data?.examples || {}
    };
}

function buildHeaderFromDraft(draft: HeaderDraft): any {
    const headerData: any = { schema: { type: draft.schemaType } };

    if (draft.description.trim()) headerData.description = draft.description.trim();
    if (draft.required) headerData.required = true;
    if (draft.deprecated) headerData.deprecated = true;
    if (draft.format.trim()) headerData.schema.format = draft.format.trim();
    if (draft.schemaType === 'string') {
        if (draft.pattern.trim()) headerData.schema.pattern = draft.pattern.trim();
        if (draft.enumValues.trim()) {
            headerData.schema.enum = draft.enumValues.split(',').map((v) => v.trim()).filter(Boolean);
        }
    }
    if (draft.defaultValue.trim()) headerData.schema.default = draft.defaultValue.trim();

    if (draft.exampleMode === 'multiple' && Object.keys(draft.examples).length > 0) {
        headerData.examples = draft.examples;
    } else if (draft.exampleMode === 'single' && draft.exampleText.trim()) {
        try { headerData.example = JSON.parse(draft.exampleText.trim()); }
        catch { headerData.example = draft.exampleText.trim(); }
    }

    return headerData;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface HeaderEditorProps {
    isOpen: boolean;
    mode: 'add' | 'edit';
    data?: any;
    name?: string;
    onClose: () => void;
    onSave: (header: any, name?: string, previousName?: string) => void;
    onAutoSave?: (header: any, name?: string, previousName?: string) => void;
    onRemove?: () => void;
    onCopilot?: () => void;
}

export const HeaderEditor: React.FC<HeaderEditorProps> = ({
    isOpen,
    mode,
    data,
    name: initialName,
    onClose,
    onSave,
    onAutoSave
}) => {
    const lastSyncedNameRef = useRef(initialName || '');

    const dataSnapshot = JSON.stringify(data ?? null);
    const externalDraft = useMemo(() => {
        const parsed: unknown = JSON.parse(dataSnapshot);
        return buildExternalDraft(parsed, initialName);
    }, [dataSnapshot, initialName]);

    const {
        localValue: draft,
        setLocalValue: setDraft,
        handleSave: handleSaveInternal
    } = useBidirectionalSync<HeaderDraft>({
        externalValue: externalDraft,
        onAutoSave: onAutoSave
            ? (d) => {
                const header = buildHeaderFromDraft(d);
                if (d.headerName.trim()) {
                    onAutoSave(header, d.headerName.trim(), lastSyncedNameRef.current);
                    lastSyncedNameRef.current = d.headerName.trim();
                }
            }
            : undefined,
        onSave: (d) => {
            const header = buildHeaderFromDraft(d);
            if (d.headerName.trim()) {
                onSave(header, d.headerName.trim(), lastSyncedNameRef.current);
                onClose();
            }
        },
        isOpen,
        syncKey: `header-${mode}-${initialName || 'new'}`,
        buildValue: (d) => d
    });

    const handleSave = useCallback(() => {
        handleSaveInternal();
    }, [handleSaveInternal]);

    const set = useCallback(<K extends keyof HeaderDraft>(key: K, value: HeaderDraft[K]) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    }, [setDraft]);

    const isString = draft.schemaType === 'string';

    return (
        <EntityModal
            isOpen={isOpen}
            title={`${mode === 'add' ? 'Add' : 'Edit'} Header`}
            onClose={onClose}
            onSave={handleSave}
            width={900}
            mode={mode}
            saveButtonDisabled={!draft.headerName.trim()}
        >
            <FormStack>
                <Section>
                    <SectionHeader>
                        <SectionTitle>Header Information</SectionTitle>
                    </SectionHeader>
                    <TextField
                        label="Name"
                        required
                        placeholder="e.g., X-Request-ID"
                        value={draft.headerName}
                        onTextChange={(v) => set('headerName', v)}
                    />
                    <TextField
                        label="Description"
                        placeholder="Header description"
                        value={draft.description}
                        onTextChange={(v) => set('description', v)}
                    />
                    <CheckBox
                        checked={draft.required}
                        label="Required"
                        onChange={(v) => set('required', v)}
                    />
                    <CheckBox
                        checked={draft.deprecated}
                        label="Deprecated"
                        onChange={(v) => set('deprecated', v)}
                    />
                </Section>

                <Section>
                    <SectionHeader>
                        <SectionTitle>Schema</SectionTitle>
                    </SectionHeader>
                    <div>
                        <FieldLabel variant="subtitle2">Type</FieldLabel>
                        <FieldSelect
                            value={draft.schemaType}
                            onChange={(e) => set('schemaType', e.target.value)}
                        >
                            {['string', 'number', 'integer', 'boolean', 'array'].map((t) => (
                                <option key={t} value={t}>
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </option>
                            ))}
                        </FieldSelect>
                    </div>
                    <TextField
                        label="Format"
                        placeholder="e.g., date, date-time, email, uuid"
                        value={draft.format}
                        onTextChange={(v) => set('format', v)}
                    />
                    {isString && (
                        <>
                            <TextField
                                label="Pattern (regex)"
                                placeholder="e.g., ^[A-Z][a-z]+$"
                                value={draft.pattern}
                                onTextChange={(v) => set('pattern', v)}
                            />
                            <TextField
                                label="Enum Values (comma-separated)"
                                placeholder="e.g., active, inactive, pending"
                                value={draft.enumValues}
                                onTextChange={(v) => set('enumValues', v)}
                            />
                        </>
                    )}
                    <TextField
                        label="Default Value"
                        placeholder="Default value"
                        value={draft.defaultValue}
                        onTextChange={(v) => set('defaultValue', v)}
                    />
                </Section>

                <Section>
                    <MediaTypeExamplesEditor
                        mediaType="application/json"
                        label="Example"
                        exampleText={draft.exampleText}
                        onExampleChange={(v) => set('exampleText', v)}
                        placeholder='e.g., "my-header-value"'
                        exampleMode={draft.exampleMode}
                        examples={draft.examples}
                        onToggleExampleMode={() => set('exampleMode', draft.exampleMode === 'single' ? 'multiple' : 'single')}
                        onAddExample={(name, value) => setDraft((prev) => ({
                            ...prev,
                            examples: { ...prev.examples, [name]: { value } }
                        }))}
                        onUpdateExample={(name, field, value) => setDraft((prev) => ({
                            ...prev,
                            examples: { ...prev.examples, [name]: { ...prev.examples[name], [field]: value } }
                        }))}
                        onRenameExample={(oldName, newName) => {
                            if (!newName.trim() || newName === oldName) return;
                            setDraft((prev) => {
                                if (prev.examples[newName]) return prev;
                                const updated = { ...prev.examples };
                                updated[newName] = updated[oldName];
                                delete updated[oldName];
                                return { ...prev, examples: updated };
                            });
                        }}
                        onDeleteExample={(name) => setDraft((prev) => {
                            const updated = { ...prev.examples };
                            delete updated[name];
                            return { ...prev, examples: updated };
                        })}
                    />
                </Section>
            </FormStack>
        </EntityModal>
    );
};
