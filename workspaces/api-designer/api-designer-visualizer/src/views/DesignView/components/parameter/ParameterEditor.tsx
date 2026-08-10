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

interface ParameterDraft {
    name: string;
    description: string;
    location: string;
    required: boolean;
    deprecated: boolean;
    allowReserved: boolean;
    allowEmptyValue: boolean;
    schemaType: string;
    format: string;
    pattern: string;
    enumValues: string;
    defaultValue: string;
    minimum: string;
    maximum: string;
    style: string;
    explode: boolean;
    exampleMode: 'single' | 'multiple';
    exampleText: string;
    examples: Record<string, any>;
}

function defaultStyle(loc: string): string {
    return loc === 'query' || loc === 'cookie' ? 'form' : 'simple';
}

function buildExternalDraft(data: any, initialName: string | undefined): ParameterDraft {
    const loc = data?.in || 'query';
    const st = data?.style || defaultStyle(loc);
    const hasMultiple = data?.examples && Object.keys(data.examples).length > 0;
    return {
        name: data?.name || initialName || '',
        description: data?.description || '',
        location: loc,
        required: data?.required || loc === 'path' || false,
        deprecated: data?.deprecated || false,
        allowReserved: data?.allowReserved || false,
        allowEmptyValue: data?.allowEmptyValue || false,
        schemaType: data?.schema?.type || 'string',
        format: data?.schema?.format || '',
        pattern: data?.schema?.pattern || '',
        enumValues: (data?.schema?.enum || []).join(', '),
        defaultValue: data?.schema?.default !== undefined ? String(data.schema.default) : '',
        minimum: data?.schema?.minimum?.toString() || '',
        maximum: data?.schema?.maximum?.toString() || '',
        style: st,
        explode: data?.explode !== undefined ? data.explode : st === 'form',
        exampleMode: hasMultiple ? 'multiple' : 'single',
        exampleText: data?.example !== undefined
            ? (typeof data.example === 'string' ? data.example : JSON.stringify(data.example, null, 2))
            : '',
        examples: data?.examples || {}
    };
}

function buildParameterFromDraft(draft: ParameterDraft): any {
    if (!draft.name.trim()) return null;

    const param: any = {
        name: draft.name.trim(),
        in: draft.location,
        required: draft.location === 'path' ? true : draft.required
    };

    if (draft.description.trim()) param.description = draft.description.trim();
    if (draft.deprecated) param.deprecated = true;

    param.schema = { type: draft.schemaType };
    if (draft.format.trim()) param.schema.format = draft.format.trim();
    if (draft.schemaType === 'string') {
        if (draft.pattern.trim()) param.schema.pattern = draft.pattern.trim();
        if (draft.enumValues.trim()) {
            param.schema.enum = draft.enumValues.split(',').map((v) => v.trim()).filter(Boolean);
        }
    }
    if (draft.defaultValue.trim()) {
        try { param.schema.default = JSON.parse(draft.defaultValue); }
        catch { param.schema.default = draft.defaultValue; }
    }
    if ((draft.schemaType === 'integer' || draft.schemaType === 'number') && draft.minimum !== '') {
        param.schema.minimum = parseFloat(draft.minimum);
    }
    if ((draft.schemaType === 'integer' || draft.schemaType === 'number') && draft.maximum !== '') {
        param.schema.maximum = parseFloat(draft.maximum);
    }

    const defStyle = defaultStyle(draft.location);
    if (draft.style !== defStyle) param.style = draft.style;
    if (draft.explode !== (draft.style === 'form')) param.explode = draft.explode;

    if (draft.location === 'query') {
        if (draft.allowReserved) param.allowReserved = true;
        if (draft.allowEmptyValue) param.allowEmptyValue = true;
    }

    if (draft.exampleMode === 'multiple' && Object.keys(draft.examples).length > 0) {
        param.examples = draft.examples;
    } else if (draft.exampleMode === 'single' && draft.exampleText.trim()) {
        try { param.example = JSON.parse(draft.exampleText.trim()); }
        catch { param.example = draft.exampleText.trim(); }
    }

    return param;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ParameterEditorProps {
    isOpen: boolean;
    mode: 'add' | 'edit';
    data?: any;
    name?: string;
    onClose: () => void;
    onSave: (parameter: any, name?: string, previousName?: string) => void;
    onAutoSave?: (parameter: any, name?: string, previousName?: string) => void;
    onRemove?: () => void;
    onCopilot?: () => void;
}

export const ParameterEditor: React.FC<ParameterEditorProps> = ({
    isOpen,
    mode,
    data,
    name: initialName,
    onClose,
    onSave,
    onAutoSave
}) => {
    const lastSyncedNameRef = useRef(data?.name || initialName || '');

    const dataSnapshot = JSON.stringify(data ?? null);
    const externalDraft = useMemo(() => {
        const parsed: unknown = JSON.parse(dataSnapshot);
        return buildExternalDraft(parsed, initialName);
    }, [dataSnapshot, initialName]);

    const {
        localValue: draft,
        setLocalValue: setDraft,
        handleSave: handleSaveInternal
    } = useBidirectionalSync<ParameterDraft>({
        externalValue: externalDraft,
        onAutoSave: onAutoSave
            ? (d) => {
                const param = buildParameterFromDraft(d);
                if (param) {
                    onAutoSave(param, d.name.trim(), lastSyncedNameRef.current);
                    lastSyncedNameRef.current = d.name.trim();
                }
            }
            : undefined,
        onSave: (d) => {
            const param = buildParameterFromDraft(d);
            if (param) {
                onSave(param, d.name.trim(), lastSyncedNameRef.current);
                onClose();
            }
        },
        isOpen,
        syncKey: `parameter-${mode}-${initialName || 'new'}`,
        buildValue: (d) => d
    });

    const handleSave = useCallback(() => {
        handleSaveInternal();
    }, [handleSaveInternal]);

    const set = useCallback(<K extends keyof ParameterDraft>(key: K, value: ParameterDraft[K]) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    }, [setDraft]);

    const handleLocationChange = useCallback((newLoc: string) => {
        const newStyle = defaultStyle(newLoc);
        setDraft((prev) => ({
            ...prev,
            location: newLoc,
            style: newStyle,
            explode: newStyle === 'form',
            required: newLoc === 'path' ? true : prev.required
        }));
    }, [setDraft]);

    const isNumeric = draft.schemaType === 'integer' || draft.schemaType === 'number';
    const isPath = draft.location === 'path';
    const isQuery = draft.location === 'query';

    const styleOptions: Record<string, { value: string; label: string }[]> = {
        query: [
            { value: 'form', label: 'Form (default)' },
            { value: 'spaceDelimited', label: 'Space Delimited' },
            { value: 'pipeDelimited', label: 'Pipe Delimited' },
            { value: 'deepObject', label: 'Deep Object' }
        ],
        path: [
            { value: 'simple', label: 'Simple (default)' },
            { value: 'label', label: 'Label' },
            { value: 'matrix', label: 'Matrix' }
        ],
        header: [{ value: 'simple', label: 'Simple (default)' }],
        cookie: [{ value: 'form', label: 'Form (default)' }]
    };

    return (
        <EntityModal
            isOpen={isOpen}
            title={`${mode === 'add' ? 'Add' : 'Edit'} Parameter`}
            onClose={onClose}
            onSave={handleSave}
            width={900}
            mode={mode}
            saveButtonDisabled={!draft.name.trim()}
        >
            <FormStack>
                <Section>
                    <SectionHeader>
                        <SectionTitle>Parameter Information</SectionTitle>
                    </SectionHeader>
                    <TextField
                        label="Name"
                        required
                        placeholder="e.g., userId, page"
                        value={draft.name}
                        onTextChange={(v) => set('name', v)}
                    />
                    <TextField
                        label="Description"
                        placeholder="Describe what this parameter does"
                        value={draft.description}
                        onTextChange={(v) => set('description', v)}
                    />
                    <div>
                        <FieldLabel variant="subtitle2">Location</FieldLabel>
                        <FieldSelect value={draft.location} onChange={(e) => handleLocationChange(e.target.value)}>
                            <option value="query">Query</option>
                            <option value="path">Path</option>
                            <option value="header">Header</option>
                            <option value="cookie">Cookie</option>
                        </FieldSelect>
                    </div>
                    <CheckBox
                        checked={isPath ? true : draft.required}
                        label={isPath ? 'Required (path parameters are always required)' : 'Required'}
                        onChange={isPath ? () => undefined : (v) => set('required', v)}
                        disabled={isPath}
                    />
                    <CheckBox checked={draft.deprecated} label="Deprecated" onChange={(v) => set('deprecated', v)} />
                    {isQuery && (
                        <>
                            <CheckBox checked={draft.allowReserved} label="Allow Reserved" onChange={(v) => set('allowReserved', v)} />
                            <CheckBox checked={draft.allowEmptyValue} label="Allow Empty Value" onChange={(v) => set('allowEmptyValue', v)} />
                        </>
                    )}
                </Section>

                <Section>
                    <SectionHeader>
                        <SectionTitle>Schema</SectionTitle>
                    </SectionHeader>
                    <div>
                        <FieldLabel variant="subtitle2">Type</FieldLabel>
                        <FieldSelect value={draft.schemaType} onChange={(e) => set('schemaType', e.target.value)}>
                            <option value="string">String</option>
                            <option value="integer">Integer</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="array">Array</option>
                            <option value="object">Object</option>
                        </FieldSelect>
                    </div>
                    <TextField
                        label="Format"
                        placeholder={isNumeric ? 'e.g., int32, int64, float' : 'e.g., date, date-time, email, uuid'}
                        value={draft.format}
                        onTextChange={(v) => set('format', v)}
                    />
                    {draft.schemaType === 'string' && (
                        <>
                            <TextField
                                label="Pattern (regex)"
                                placeholder="e.g., ^[a-zA-Z0-9]+$"
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
                    {isNumeric && (
                        <>
                            <TextField
                                label="Minimum"
                                type="number"
                                value={draft.minimum}
                                onTextChange={(v) => set('minimum', v)}
                            />
                            <TextField
                                label="Maximum"
                                type="number"
                                value={draft.maximum}
                                onTextChange={(v) => set('maximum', v)}
                            />
                        </>
                    )}
                    <TextField
                        label="Default Value"
                        placeholder="Default when parameter is omitted"
                        value={draft.defaultValue}
                        onTextChange={(v) => set('defaultValue', v)}
                    />
                </Section>

                <Section>
                    <SectionHeader>
                        <SectionTitle>Serialization</SectionTitle>
                    </SectionHeader>
                    <div>
                        <FieldLabel variant="subtitle2">Style</FieldLabel>
                        <FieldSelect value={draft.style} onChange={(e) => {
                            const s = e.target.value;
                            setDraft((prev) => ({ ...prev, style: s, explode: s === 'form' }));
                        }}>
                            {(styleOptions[draft.location] || styleOptions.query).map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </FieldSelect>
                    </div>
                    <CheckBox checked={draft.explode} label="Explode" onChange={(v) => set('explode', v)} />
                </Section>

                <Section>
                    <MediaTypeExamplesEditor
                        mediaType="application/json"
                        label="Example"
                        exampleText={draft.exampleText}
                        onExampleChange={(v) => set('exampleText', v)}
                        placeholder={
                            isNumeric ? 'e.g., 42' :
                            draft.schemaType === 'boolean' ? 'e.g., true' :
                            draft.schemaType === 'array' ? 'e.g., ["a","b"]' : 'e.g., "my-value"'
                        }
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
