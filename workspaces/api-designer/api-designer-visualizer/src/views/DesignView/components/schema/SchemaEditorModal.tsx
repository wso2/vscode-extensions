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

import React, { useMemo, useCallback, useContext, useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { TextField, AutoResizeTextArea, Typography, Button } from '@wso2/ui-toolkit';
import { EntityModal } from '../../../../components/common/EntityModal';
import { Section, SectionHeader, SectionTitle } from '../shared/EditorCommonStyles';
import { SchemaEditor as SharedSchemaEditor, Schema } from './SchemaEditor';
import { useAIPrompt } from '../../../../hooks/useAIPrompt';
import { AIButton } from '../../../../components/ai/AIButton';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';
import { APIDesignerContext } from '../../../../contexts/APIDesignerContext';
import { OpenAPI } from '../../../../Definitions/ServiceDefinitions';
import { useBidirectionalSync } from '../../../../hooks/useBidirectionalSync';
import { generateExampleFromSchema } from '../../../../utils/schemaExampleGenerator';
import {
    buildImproveSchemaTypePrompt,
    buildImproveStringConstraintsPrompt,
    buildImproveNumberRangePrompt,
    buildImproveArrayItemsPrompt,
    buildImproveSchemaPropertiesPrompt
} from '../../../../utils/aiPrompts';

/**
 * Schema component modal — delegates structure editing to the shared SchemaEditor
 * (same implementation as response / request body editors) to avoid duplicate UI logic.
 */
export interface SchemaEditorProps {
    isOpen: boolean;
    mode: 'add' | 'edit';
    data?: any;
    name?: string;
    /** The full API spec — used to resolve $ref entries in the schema type dropdown. */
    spec?: OpenAPI;
    onClose: () => void;
    onSave: (schema: any, name?: string, previousName?: string) => void;
    onAutoSave?: (schema: any, name?: string, previousName?: string) => void;
    onRemove?: () => void;
    onCopilot?: () => void;
}

const FormStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const EditorSurface = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 12px;
    background: var(--vscode-editor-background);
    min-height: 200px;
`;

const ExamplesCard = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-editor-background);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const ExamplesCardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const ExamplesTitle = styled.span`
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vscode-editor-foreground);
`;

const AIHeaderActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    justify-content: flex-end;
    flex-shrink: 0;
`;

/** Returns true when the spec is OpenAPI 3.1.x */
function isOpenAPI31(openAPI: OpenAPI | undefined): boolean {
    const version = (openAPI as any)?.openapi ?? '';
    return typeof version === 'string' && version.startsWith('3.1');
}

function normalizeSchemaForEditor(raw: unknown): Schema {
    if (!raw || typeof raw !== 'object') {
        return { type: 'object', properties: {} };
    }
    const o = raw as Record<string, unknown>;
    if (typeof o.$ref === 'string') {
        return { $ref: o.$ref };
    }
    if (!o.type && !o.properties && !o.items) {
        return { type: 'object', properties: {} };
    }
    return JSON.parse(JSON.stringify(raw)) as Schema;
}

/** Single local value for useBidirectionalSync — matches other component editor modals. */
interface SchemaModalDraft {
    componentName: string;
    schema: Schema;
}

function buildExternalDraft(data: unknown, componentKey: string | undefined): SchemaModalDraft {
    return {
        componentName: componentKey || '',
        schema: normalizeSchemaForEditor(data)
    };
}

/** Serialize schema example field(s) to a display string. */
function serializeExample(value: unknown): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
}

export const SchemaEditor: React.FC<SchemaEditorProps> = ({
    isOpen,
    mode,
    data,
    name,
    spec: specProp,
    onClose,
    onSave,
    onAutoSave
}) => {
    const context = useContext(APIDesignerContext);
    const openAPI = specProp || context?.props?.openAPI;

    // Version-aware: 3.0 uses `example` (any value), 3.1 uses `examples` (array)
    const is31 = isOpenAPI31(openAPI);

    // Local display text for the example textarea (not yet committed to schema)
    const [exampleText, setExampleText] = useState<string>('');
    const [exampleError, setExampleError] = useState<string>('');

    const { showPrompt, InlineChat } = useAIPrompt((context, prompt) => {
        postVSCodeMessage({
            command: 'openCopilotChat',
            data: { context, prompt }
        });
    });

    const dataSnapshot = JSON.stringify(data ?? null);
    const externalDraft = useMemo(() => {
        const parsed: unknown = JSON.parse(dataSnapshot);
        return buildExternalDraft(parsed, name);
    }, [dataSnapshot, name]);

    const {
        localValue: draft,
        setLocalValue: setDraft,
        handleSave: handleSaveInternal
    } = useBidirectionalSync<SchemaModalDraft>({
        externalValue: externalDraft,
        onAutoSave: onAutoSave
            ? (d) => onAutoSave(d.schema, d.componentName, name)
            : undefined,
        onSave: (d) => {
            onSave(d.schema, d.componentName, name);
            onClose();
        },
        isOpen,
        syncKey: `schema-${mode}-${name || 'new'}`,
        buildValue: (d) => d
    });

    const draftSchema = draft.schema;
    const componentName = draft.componentName;

    // Preserve title, description, and the version-appropriate example field(s)
    // when the inner SchemaEditor makes structural changes.
    const handleSchemaChange = useCallback(
        (updated: Schema) => {
            setDraft((prev) => {
                const next = { ...updated } as any;
                if (prev.schema.title) { next.title = prev.schema.title; } else { delete next.title; }
                if (prev.schema.description) { next.description = prev.schema.description; } else { delete next.description; }
                const prevAny = prev.schema as any;
                // Preserve whichever example field is valid for the current version
                if (!is31) {
                    if (prevAny.example !== undefined) { next.example = prevAny.example; } else { delete next.example; }
                } else {
                    if (prevAny.examples !== undefined) { next.examples = prevAny.examples; } else { delete next.examples; }
                }
                return { ...prev, schema: next };
            });
        },
        [setDraft, is31]
    );

    const handleSave = useCallback(() => {
        handleSaveInternal();
    }, [handleSaveInternal]);

    // Sync the textarea text when the draft schema changes externally
    useEffect(() => {
        const s = draft.schema as any;
        if (!is31) {
            setExampleText(serializeExample(s.example));
        } else {
            // 3.1: examples is a JSON array
            setExampleText(Array.isArray(s.examples) ? JSON.stringify(s.examples, null, 2) : '');
        }
        setExampleError('');
    }, [draft.schema, is31]);

    const handleGenerateExample = () => {
        const generated = generateExampleFromSchema(draft.schema as any, openAPI as any);
        const generatedText = JSON.stringify(generated, null, 2);
        if (is31) {
            const asArray = JSON.stringify([generated], null, 2);
            handleExampleTextChange(asArray);
        } else {
            handleExampleTextChange(generatedText);
        }
    };

    const handleExampleTextChange = (value: string) => {
        setExampleText(value);
        const trimmed = value.trim();

        if (!trimmed) {
            setExampleError('');
            setDraft((prev) => {
                const schema = { ...prev.schema } as any;
                if (!is31) { delete schema.example; } else { delete schema.examples; }
                return { ...prev, schema };
            });
            return;
        }

        if (!is31) {
            // 3.0: any valid JSON (or plain string)
            try {
                const parsed = JSON.parse(trimmed);
                setExampleError('');
                setDraft((prev) => ({ ...prev, schema: { ...prev.schema, example: parsed } as any }));
            } catch {
                // Allow bare strings without quotes
                setExampleError('');
                setDraft((prev) => ({ ...prev, schema: { ...prev.schema, example: trimmed } as any }));
            }
        } else {
            // 3.1: must be a JSON array
            try {
                const parsed = JSON.parse(trimmed);
                if (!Array.isArray(parsed)) {
                    setExampleError('Must be a JSON array, e.g. [{"id":1}, {"id":2}]');
                    return;
                }
                setExampleError('');
                setDraft((prev) => ({ ...prev, schema: { ...prev.schema, examples: parsed } as any }));
            } catch {
                setExampleError('Invalid JSON — must be a JSON array, e.g. [{"id":1}]');
            }
        }
    };

    const schemaPath = `/components/schemas/${componentName || 'new'}`;

    /** One header action: pick the most specific AI prompt for the current root schema shape. */
    const handleComponentAiClick = useCallback(
        (e: React.MouseEvent) => {
            const s = draftSchema;
            const t = s.type;

            if (
                t === 'object' &&
                s.properties !== undefined &&
                Object.keys(s.properties || {}).length > 0
            ) {
                showPrompt(
                    buildImproveSchemaPropertiesPrompt(s.properties || {}, s.required || []),
                    `${schemaPath}/properties`,
                    'Improve schema properties',
                    'Improve properties',
                    'Describe how you want to change properties...',
                    e
                );
                return;
            }

            if (t === 'string') {
                const str = s as Schema & { enum?: unknown[] };
                showPrompt(
                    buildImproveStringConstraintsPrompt({
                        format: String(str.format || ''),
                        pattern: String(str.pattern || ''),
                        enum: Array.isArray(str.enum) ? str.enum.map(String) : [],
                        default: str.default != null ? String(str.default) : '',
                        minLength: str.minLength != null ? String(str.minLength) : '',
                        maxLength: str.maxLength != null ? String(str.maxLength) : ''
                    }),
                    `${schemaPath}/string-constraints`,
                    'Improve string constraints',
                    'Improve string constraints',
                    'Describe string validation changes...',
                    e
                );
                return;
            }

            if (t === 'number' || t === 'integer') {
                showPrompt(
                    buildImproveNumberRangePrompt({
                        minimum: s.minimum != null ? String(s.minimum) : '',
                        maximum: s.maximum != null ? String(s.maximum) : ''
                    }),
                    `${schemaPath}/number-range`,
                    'Improve number range',
                    'Improve number range',
                    'Describe numeric constraints...',
                    e
                );
                return;
            }

            if (t === 'array') {
                const items = s.items;
                const itemType =
                    items && !Array.isArray(items)
                        ? String((items as Schema).type || 'string')
                        : 'string';
                showPrompt(
                    buildImproveArrayItemsPrompt({ type: itemType }),
                    `${schemaPath}/items`,
                    'Improve array items',
                    'Improve array items',
                    'Describe array item schema changes...',
                    e
                );
                return;
            }

            showPrompt(
                buildImproveSchemaTypePrompt(
                    String((s as { $ref?: string }).$ref || t || ''),
                    String(s.title || ''),
                    String(s.description || '')
                ),
                schemaPath,
                'Improve schema type and basic information',
                'Improve schema',
                'Describe how you want to improve this schema...',
                e
            );
        },
        [draftSchema, schemaPath, showPrompt]
    );

    return (
        <>
            <EntityModal
                isOpen={isOpen}
                title={`${mode === 'add' ? 'Add' : 'Edit'} Schema`}
                onClose={onClose}
                onSave={handleSave}
                width={960}
                mode={mode}
                saveButtonDisabled={!componentName.trim()}
            >
                <FormStack>
                    <Section>
                        <SectionHeader>
                            <SectionTitle>Component</SectionTitle>
                            <AIHeaderActions>
                                <AIButton
                                    label="Edit with AI"
                                    onClick={handleComponentAiClick}
                                    title="Improve this schema with AI — uses properties, constraints, or overview based on the current type"
                                />
                            </AIHeaderActions>
                        </SectionHeader>
                        <TextField
                            label="Component name"
                            placeholder="e.g., User"
                            value={componentName}
                            onTextChange={(v) =>
                                setDraft((prev) => ({ ...prev, componentName: v }))
                            }
                            required
                        />
                        <TextField
                            label="Title"
                            placeholder="JSON Schema title (e.g., User)"
                            value={draftSchema.title ?? ''}
                            onTextChange={(v) =>
                                setDraft((prev) => {
                                    const schema = { ...prev.schema };
                                    if (v) { schema.title = v; } else { delete schema.title; }
                                    return { ...prev, schema };
                                })
                            }
                        />
                        <TextField
                            label="Description"
                            placeholder="Describe this schema for docs and tooling"
                            value={draftSchema.description ?? ''}
                            onTextChange={(v) =>
                                setDraft((prev) => {
                                    const schema = { ...prev.schema };
                                    if (v) { schema.description = v; } else { delete schema.description; }
                                    return { ...prev, schema };
                                })
                            }
                        />
                    </Section>

                    <EditorSurface>
                        <SharedSchemaEditor
                            schema={draftSchema}
                            schemaName={componentName || 'Schema'}
                            variant="h4"
                            isRoot
                            openAPI={openAPI}
                            excludeSchemaName={mode === 'edit' ? name : undefined}
                            onSchemaChange={handleSchemaChange}
                            sx={{ background: 'transparent', padding: '0', margin: '0' }}
                        />
                    </EditorSurface>

                    <ExamplesCard>
                        <ExamplesCardHeader>
                            <ExamplesTitle>{is31 ? 'Examples' : 'Example'}</ExamplesTitle>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Typography
                                    variant="body2"
                                    sx={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)', margin: 0 }}
                                >
                                    {is31
                                        ? 'OpenAPI 3.1 — JSON array of example values'
                                        : 'OpenAPI 3.0 — single example value'}
                                </Typography>
                                <Button
                                    appearance="secondary"
                                    onClick={handleGenerateExample}
                                    sx={{ fontSize: '11px', padding: '4px 8px' }}
                                >
                                    Generate from Schema
                                </Button>
                            </div>
                        </ExamplesCardHeader>
                        <AutoResizeTextArea
                            label={is31 ? 'Examples (JSON array)' : 'Example value'}
                            value={exampleText}
                            onTextChange={handleExampleTextChange}
                            placeholder={
                                is31
                                    ? '[{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]'
                                    : '{"id": 1, "name": "Alice"}'
                            }
                            growRange={{ start: 4, offset: 30 }}
                            sx={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: '12px' }}
                            errorMsg={exampleError}
                        />
                    </ExamplesCard>
                </FormStack>
            </EntityModal>
            <InlineChat />
        </>
    );
};
