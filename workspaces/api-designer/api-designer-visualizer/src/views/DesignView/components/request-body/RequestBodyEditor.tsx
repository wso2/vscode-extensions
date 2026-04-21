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

import React, { useState, useContext, useCallback, useRef, useMemo } from 'react';
import styled from '@emotion/styled';
import { TextField, CheckBox, Button, Codicon, Typography, Dropdown } from '@wso2/ui-toolkit';
import { EntityModal } from '../../../../components/common/EntityModal';
import { Section, SectionHeader, SectionTitle } from '../shared/EditorCommonStyles';
import { SchemaEditor } from '../schema/SchemaEditor';
import { APIDesignerContext } from '../../../../contexts/APIDesignerContext';
import { useBidirectionalSync } from '../../../../hooks/useBidirectionalSync';
import { MediaTypeExamplesEditor } from '../media-type/MediaTypeExamplesEditor';
import { generateExampleFromSchema } from '../../../../utils/schemaExampleGenerator';

export interface RequestBodyEditorProps {
    isOpen: boolean;
    mode: 'add' | 'edit';
    data?: any;
    name?: string;
    onClose: () => void;
    onSave: (requestBody: any, name?: string, previousName?: string) => void;
    onAutoSave?: (requestBody: any, name?: string, previousName?: string) => void;
    onRemove?: () => void;
    onCopilot?: () => void;
}

const commonMediaTypes = [
    'application/json',
    'application/xml',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
    'text/html'
];

// ---------------------------------------------------------------------------
// Draft types
// ---------------------------------------------------------------------------

interface ContentTypeDraft {
    schema: any;
    exampleMode: 'single' | 'multiple';
    exampleText: string;
    namedExamples: Record<string, any>;
}

interface RequestBodyDraft {
    rbName: string;
    description: string;
    required: boolean;
    contentTypes: Record<string, ContentTypeDraft>;
}

function buildExternalDraft(data: any, initialName: string | undefined): RequestBodyDraft {
    const contentTypes: Record<string, ContentTypeDraft> = {};

    if (data?.content && Object.keys(data.content).length > 0) {
        Object.entries(data.content).forEach(([type, content]: [string, any]) => {
            const hasMultiple = content.examples && Object.keys(content.examples).length > 0;
            contentTypes[type] = {
                schema: content.schema || { type: 'object' },
                exampleMode: hasMultiple ? 'multiple' : 'single',
                exampleText: content.example !== undefined
                    ? (typeof content.example === 'string' ? content.example : JSON.stringify(content.example, null, 2))
                    : '',
                namedExamples: content.examples || {}
            };
        });
    } else {
        contentTypes['application/json'] = {
            schema: { type: 'object' },
            exampleMode: 'single',
            exampleText: '',
            namedExamples: {}
        };
    }

    return {
        rbName: initialName || '',
        description: data?.description || '',
        required: data?.required || false,
        contentTypes
    };
}

function buildRequestBodyFromDraft(draft: RequestBodyDraft, originalData: any): any {
    const requestBodyData: any = { required: draft.required };
    if (draft.description.trim()) requestBodyData.description = draft.description.trim();

    const contentTypeKeys = Object.keys(draft.contentTypes);
    if (contentTypeKeys.length > 0) {
        requestBodyData.content = {};
        contentTypeKeys.forEach((type) => {
            const ct = draft.contentTypes[type];
            const existingContent = originalData?.content?.[type] || {};
            requestBodyData.content[type] = { ...existingContent, schema: ct.schema };

            if (ct.exampleMode === 'multiple' && Object.keys(ct.namedExamples).length > 0) {
                requestBodyData.content[type].examples = ct.namedExamples;
                delete requestBodyData.content[type].example;
            } else if (ct.exampleMode === 'single' && ct.exampleText.trim()) {
                try {
                    requestBodyData.content[type].example = type.includes('json')
                        ? JSON.parse(ct.exampleText)
                        : ct.exampleText;
                } catch {
                    requestBodyData.content[type].example = ct.exampleText;
                }
                delete requestBodyData.content[type].examples;
            } else {
                delete requestBodyData.content[type].example;
                delete requestBodyData.content[type].examples;
            }
        });
    }

    return requestBodyData;
}

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const FormStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const ContentTypeCard = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-editor-background);
    overflow: hidden;
`;

const ContentTypeCardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--vscode-editorWidget-background);
    border-bottom: 1px solid var(--vscode-panel-border);
    gap: 8px;
`;

const ContentTypeCardBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 14px;
`;

const ContentTypeCardSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const CardSectionTitle = styled(Typography)`
    font-size: 11px !important;
    font-weight: 600 !important;
    color: var(--vscode-descriptionForeground) !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    margin: 0 0 6px 0 !important;
`;

const AddContentTypeRow = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 4px;
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RequestBodyEditor: React.FC<RequestBodyEditorProps> = ({
    isOpen,
    mode,
    data,
    name: initialName,
    onClose,
    onSave,
    onAutoSave
}) => {
    const lastSyncedNameRef = useRef(initialName || '');

    // Pure UI state
    const [newContentType, setNewContentType] = useState('');
    const [pendingContentType, setPendingContentType] = useState('');

    const { props: { openAPI } } = useContext(APIDesignerContext);

    const dataSnapshot = JSON.stringify(data ?? null);
    const externalDraft = useMemo(() => {
        const parsed: unknown = JSON.parse(dataSnapshot);
        return buildExternalDraft(parsed, initialName);
    }, [dataSnapshot, initialName]);

    const {
        localValue: draft,
        setLocalValue: setDraft,
        handleSave: handleSaveInternal
    } = useBidirectionalSync<RequestBodyDraft>({
        externalValue: externalDraft,
        onAutoSave: onAutoSave
            ? (d) => {
                const rb = buildRequestBodyFromDraft(d, data);
                if (d.rbName.trim()) {
                    onAutoSave(rb, d.rbName.trim(), lastSyncedNameRef.current);
                    lastSyncedNameRef.current = d.rbName.trim();
                }
            }
            : undefined,
        onSave: (d) => {
            const rb = buildRequestBodyFromDraft(d, data);
            if (d.rbName.trim()) {
                onSave(rb, d.rbName.trim(), lastSyncedNameRef.current);
                onClose();
            }
        },
        isOpen,
        syncKey: `requestBody-${mode}-${initialName || 'new'}`,
        buildValue: (d) => d
    });

    const handleSave = useCallback(() => {
        handleSaveInternal();
    }, [handleSaveInternal]);

    // ---------------------------------------------------------------------------
    // Content-type handlers
    // ---------------------------------------------------------------------------

    const handleContentTypeChange = useCallback((index: number, newType: string) => {
        setDraft((prev) => {
            const keys = Object.keys(prev.contentTypes);
            const oldType = keys[index];
            if (!oldType || oldType === newType) return prev;
            const updated: Record<string, ContentTypeDraft> = {};
            keys.forEach((k) => { updated[k === oldType ? newType : k] = prev.contentTypes[k]; });
            return { ...prev, contentTypes: updated };
        });
    }, [setDraft]);

    const addContentType = useCallback(() => {
        const trimmed = newContentType.trim();
        if (!trimmed) return;
        setDraft((prev) => {
            if (prev.contentTypes[trimmed]) return prev;
            return {
                ...prev,
                contentTypes: {
                    ...prev.contentTypes,
                    [trimmed]: { schema: { type: 'object' }, exampleMode: 'single', exampleText: '', namedExamples: {} }
                }
            };
        });
        setNewContentType('');
    }, [newContentType, setDraft]);

    const handleAddPendingContentType = useCallback(() => {
        if (!pendingContentType) return;
        setDraft((prev) => {
            if (prev.contentTypes[pendingContentType]) return prev;
            return {
                ...prev,
                contentTypes: {
                    ...prev.contentTypes,
                    [pendingContentType]: { schema: { type: 'object' }, exampleMode: 'single', exampleText: '', namedExamples: {} }
                }
            };
        });
        setPendingContentType('');
    }, [pendingContentType, setDraft]);

    const removeContentType = useCallback((type: string) => {
        setDraft((prev) => {
            const updated = { ...prev.contentTypes };
            delete updated[type];
            return { ...prev, contentTypes: updated };
        });
    }, [setDraft]);

    const handleSchemaChange = useCallback((contentType: string, schema: any) => {
        setDraft((prev) => ({
            ...prev,
            contentTypes: { ...prev.contentTypes, [contentType]: { ...prev.contentTypes[contentType], schema } }
        }));
    }, [setDraft]);

    const handleToggleExampleMode = useCallback((contentType: string) => {
        setDraft((prev) => {
            const current = prev.contentTypes[contentType];
            return {
                ...prev,
                contentTypes: {
                    ...prev.contentTypes,
                    [contentType]: { ...current, exampleMode: current.exampleMode === 'single' ? 'multiple' : 'single' }
                }
            };
        });
    }, [setDraft]);

    const handleAddNamedExample = useCallback((contentType: string, exName: string, value: any) => {
        setDraft((prev) => {
            const current = prev.contentTypes[contentType];
            return {
                ...prev,
                contentTypes: {
                    ...prev.contentTypes,
                    [contentType]: { ...current, namedExamples: { ...current.namedExamples, [exName]: { value } } }
                }
            };
        });
    }, [setDraft]);

    const handleUpdateNamedExample = useCallback((contentType: string, exName: string, field: string, value: any) => {
        setDraft((prev) => {
            const current = prev.contentTypes[contentType];
            return {
                ...prev,
                contentTypes: {
                    ...prev.contentTypes,
                    [contentType]: {
                        ...current,
                        namedExamples: { ...current.namedExamples, [exName]: { ...current.namedExamples[exName], [field]: value } }
                    }
                }
            };
        });
    }, [setDraft]);

    const handleRenameNamedExample = useCallback((contentType: string, oldName: string, newName: string) => {
        if (!newName.trim() || newName === oldName) return;
        setDraft((prev) => {
            const current = prev.contentTypes[contentType];
            if (current.namedExamples[newName]) return prev;
            const updated = { ...current.namedExamples };
            updated[newName] = updated[oldName];
            delete updated[oldName];
            return {
                ...prev,
                contentTypes: { ...prev.contentTypes, [contentType]: { ...current, namedExamples: updated } }
            };
        });
    }, [setDraft]);

    const handleDeleteNamedExample = useCallback((contentType: string, exName: string) => {
        setDraft((prev) => {
            const current = prev.contentTypes[contentType];
            const updated = { ...current.namedExamples };
            delete updated[exName];
            return {
                ...prev,
                contentTypes: { ...prev.contentTypes, [contentType]: { ...current, namedExamples: updated } }
            };
        });
    }, [setDraft]);

    const contentTypesList = Object.keys(draft.contentTypes);

    return (
        <EntityModal
            isOpen={isOpen}
            title={`${mode === 'add' ? 'Add' : 'Edit'} Request Body`}
            onClose={onClose}
            onSave={handleSave}
            width={1000}
            mode={mode}
            saveButtonDisabled={!draft.rbName.trim()}
        >
            <FormStack>
                <Section>
                    <SectionHeader>
                        <SectionTitle>Request Body Details</SectionTitle>
                    </SectionHeader>
                    <TextField
                        label="Name"
                        required
                        placeholder="e.g., UserRequest"
                        value={draft.rbName}
                        onTextChange={(v) => setDraft((prev) => ({ ...prev, rbName: v }))}
                    />
                    <TextField
                        label="Description"
                        placeholder="Request body description"
                        value={draft.description}
                        onTextChange={(v) => setDraft((prev) => ({ ...prev, description: v }))}
                    />
                    <CheckBox
                        checked={draft.required}
                        label="Required"
                        onChange={(v) => setDraft((prev) => ({ ...prev, required: v }))}
                    />
                </Section>

                <Section>
                    <SectionHeader>
                        <SectionTitle>Content Types</SectionTitle>
                    </SectionHeader>
                    {contentTypesList.map((type, index) => {
                        const allOptions = [
                            ...commonMediaTypes,
                            ...contentTypesList.filter(t => !commonMediaTypes.includes(t))
                        ].filter((t, i, arr) => arr.indexOf(t) === i);

                        const ct = draft.contentTypes[type];

                        return (
                            <ContentTypeCard key={`${type}-${index}`}>
                                <ContentTypeCardHeader>
                                    <Dropdown
                                        id={`content-type-${index}`}
                                        value={type}
                                        items={allOptions.map(opt => ({ id: opt, value: opt, content: opt }))}
                                        onValueChange={(value) => handleContentTypeChange(index, value)}
                                        containerSx={{ flex: 1 }}
                                    />
                                    <Button
                                        appearance="icon"
                                        onClick={() => removeContentType(type)}
                                        tooltip="Remove content type"
                                    >
                                        <Codicon name="trash" />
                                    </Button>
                                </ContentTypeCardHeader>
                                <ContentTypeCardBody>
                                    <ContentTypeCardSection>
                                        <CardSectionTitle variant="subtitle2">Schema</CardSectionTitle>
                                        {openAPI && (
                                            <SchemaEditor
                                                schema={ct.schema}
                                                schemaName={type}
                                                variant="h4"
                                                openAPI={openAPI}
                                                onSchemaChange={(schema) => handleSchemaChange(type, schema)}
                                                sx={{ margin: 0, padding: 0 }}
                                            />
                                        )}
                                    </ContentTypeCardSection>
                                    <ContentTypeCardSection>
                                        <MediaTypeExamplesEditor
                                            mediaType={type}
                                            exampleText={ct.exampleText}
                                            onExampleChange={(value) => setDraft((prev) => ({
                                                ...prev,
                                                contentTypes: {
                                                    ...prev.contentTypes,
                                                    [type]: { ...prev.contentTypes[type], exampleText: value }
                                                }
                                            }))}
                                            placeholder={
                                                type.includes('json') ? '{\n  "name": "John",\n  "email": "john@example.com"\n}' :
                                                type.includes('xml') ? '<?xml version="1.0"?>\n<request/>' :
                                                'Provide an example request body'
                                            }
                                            hasSchema={!!ct.schema}
                                            onGenerateFromSchema={() => {
                                                const generated = generateExampleFromSchema(ct.schema, openAPI as any);
                                                setDraft((prev) => ({
                                                    ...prev,
                                                    contentTypes: {
                                                        ...prev.contentTypes,
                                                        [type]: { ...prev.contentTypes[type], exampleText: JSON.stringify(generated, null, 2) }
                                                    }
                                                }));
                                            }}
                                            exampleMode={ct.exampleMode}
                                            examples={ct.namedExamples}
                                            onToggleExampleMode={() => handleToggleExampleMode(type)}
                                            onAddExample={(name, value) => handleAddNamedExample(type, name, value)}
                                            onUpdateExample={(name, field, value) => handleUpdateNamedExample(type, name, field, value)}
                                            onRenameExample={(old, newName) => handleRenameNamedExample(type, old, newName)}
                                            onDeleteExample={(name) => handleDeleteNamedExample(type, name)}
                                        />
                                    </ContentTypeCardSection>
                                </ContentTypeCardBody>
                            </ContentTypeCard>
                        );
                    })}
                    <AddContentTypeRow>
                        {newContentType ? (
                            <>
                                <TextField
                                    placeholder="e.g., application/custom+json"
                                    value={newContentType.trim()}
                                    onTextChange={setNewContentType}
                                    sx={{ flex: 1 }}
                                />
                                <Button
                                    appearance="icon"
                                    onClick={() => setNewContentType('')}
                                    tooltip="Cancel"
                                >
                                    <Codicon name="close" />
                                </Button>
                                <Button
                                    appearance="secondary"
                                    onClick={addContentType}
                                    disabled={!newContentType.trim() || !!draft.contentTypes[newContentType.trim()]}
                                    sx={{ fontSize: 11, whiteSpace: 'nowrap' }}
                                >
                                    <Codicon name="add" sx={{ marginRight: 4 }} />
                                    Add
                                </Button>
                            </>
                        ) : (
                            <>
                                <Dropdown
                                    id="new-content-type"
                                    value={pendingContentType}
                                    items={[
                                        { id: '', value: '', content: 'Select media type...' },
                                        ...commonMediaTypes
                                            .filter(type => !contentTypesList.includes(type))
                                            .map(type => ({ id: type, value: type, content: type })),
                                        { id: '__custom__', value: '__custom__', content: 'Custom...' }
                                    ]}
                                    onValueChange={(value) => {
                                        if (value === '__custom__') {
                                            setNewContentType(' ');
                                            setPendingContentType('');
                                        } else {
                                            setPendingContentType(value);
                                        }
                                    }}
                                    containerSx={{ flex: 1 }}
                                />
                                <Button
                                    appearance="secondary"
                                    onClick={handleAddPendingContentType}
                                    disabled={!pendingContentType || !!draft.contentTypes[pendingContentType]}
                                    sx={{ fontSize: 11, whiteSpace: 'nowrap' }}
                                >
                                    <Codicon name="add" sx={{ marginRight: 4 }} />
                                    Add Content Type
                                </Button>
                            </>
                        )}
                    </AddContentTypeRow>
                </Section>
            </FormStack>
        </EntityModal>
    );
};
