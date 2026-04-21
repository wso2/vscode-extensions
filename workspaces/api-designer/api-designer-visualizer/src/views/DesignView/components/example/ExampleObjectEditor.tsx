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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from '@emotion/styled';
import { TextField, TextArea, Typography } from '@wso2/ui-toolkit';

const FormStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const RadioFieldLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    cursor: pointer;
`;

const RadioInput = styled.input`
    cursor: pointer;
`;
import { EntityModal } from '../../../../components/common/EntityModal';
import { Section, SectionHeader, SectionTitle } from '../shared/EditorCommonStyles';
import { useBidirectionalSync } from '../../../../hooks/useBidirectionalSync';

/**
 * Example Editor - Full CRUD for example components
 */
export interface ExampleEditorProps {
    isOpen: boolean;
    mode: 'add' | 'edit';
    data?: any;
    name?: string;
    onClose: () => void;
    onSave: (example: any, name?: string, previousName?: string) => void;
    onAutoSave?: (example: any, name?: string, previousName?: string) => void;
    onRemove?: () => void;
    onCopilot?: () => void;
}

export const ExampleObjectEditor: React.FC<ExampleEditorProps> = ({
    isOpen,
    mode,
    data,
    name: initialName,
    onClose,
    onSave,
    onAutoSave,
    onRemove,
    onCopilot
}) => {
    const [name, setName] = useState(initialName || '');
    const lastSyncedNameRef = useRef(initialName || '');
    const [summary, setSummary] = useState(data?.summary || '');
    const [description, setDescription] = useState(data?.description || '');
    const [value, setValue] = useState(() => {
        if (data?.value) {
            return typeof data.value === 'string' ? data.value : JSON.stringify(data.value, null, 2);
        }
        return '';
    });
    const [externalValue, setExternalValue] = useState(data?.externalValue || '');
    const [useExternal, setUseExternal] = useState(!!data?.externalValue);

    // Build complete example from form state
    const buildCompleteExample = useCallback((): any => {
        const exampleData: any = {};

        if (summary.trim()) exampleData.summary = summary.trim();
        if (description.trim()) exampleData.description = description.trim();

        if (useExternal && externalValue.trim()) {
            exampleData.externalValue = externalValue.trim();
        } else if (value.trim()) {
            try {
                exampleData.value = JSON.parse(value);
            } catch {
                exampleData.value = value;
            }
        }

        return exampleData;
    }, [summary, description, useExternal, externalValue, value]);

    // Use bidirectional sync hook
    const {
        localValue: localExample,
        setLocalValue: setLocalExample,
        handleSave: handleSaveInternal
    } = useBidirectionalSync<any>({
        externalValue: data || {},
        onAutoSave: onAutoSave ? (updatedExample) => {
            if (updatedExample) {
                onAutoSave(updatedExample, name.trim() || undefined, lastSyncedNameRef.current);
            }
        } : undefined,
        onSave: (updatedExample) => {
            if (updatedExample) {
                onSave(updatedExample, name.trim() || undefined, lastSyncedNameRef.current);
                onClose();
            }
        },
        isOpen,
        syncKey: `example-${mode}-${initialName || name || 'new'}`,
        buildValue: () => buildCompleteExample()
    });

    // Update form state when data syncs from external
    useEffect(() => {
        if (!isOpen) return;
        setName(initialName || '');
        lastSyncedNameRef.current = initialName || '';
        setSummary(data?.summary || '');
        setDescription(data?.description || '');
        setValue(data?.value ? (typeof data.value === 'string' ? data.value : JSON.stringify(data.value, null, 2)) : '');
        setExternalValue(data?.externalValue || '');
        setUseExternal(!!data?.externalValue);
    }, [data, isOpen, initialName]);

    // Trigger auto-save when form fields change
    useEffect(() => {
        if (!isOpen || !onAutoSave) return;
        const completeExample = buildCompleteExample();
        setLocalExample(completeExample);
    }, [summary, description, useExternal, externalValue, value, isOpen, onAutoSave, buildCompleteExample, setLocalExample]);

    // Trigger auto-save when name changes (debounced)
    useEffect(() => {
        if (!isOpen || !onAutoSave) return;
        
        const timer = setTimeout(() => {
            const completeExample = buildCompleteExample();
            if (completeExample && name.trim()) {
                onAutoSave(completeExample, name.trim(), lastSyncedNameRef.current);
                lastSyncedNameRef.current = name.trim();
            }
        }, 500);
        
        return () => clearTimeout(timer);
    }, [name, isOpen, onAutoSave, buildCompleteExample]);

    const handleSave = () => {
        const completeExample = buildCompleteExample();
        if (completeExample && name.trim()) {
            onSave(completeExample, name.trim(), lastSyncedNameRef.current);
            onClose();
        }
    };

    return (
        <EntityModal
            isOpen={isOpen}
            title={`${mode === 'add' ? 'Add' : 'Edit'} Example`}
            onClose={onClose}
            onSave={handleSave}
            width={900}
            mode={mode}
            saveButtonDisabled={!name.trim()}
        >
            <FormStack>
                <Section>
                    <SectionHeader>
                        <SectionTitle>Example Name</SectionTitle>
                    </SectionHeader>
                    <TextField
                        label="Name"
                        required
                        placeholder="e.g., user-example"
                        value={name}
                        onTextChange={setName}
                    />
                </Section>
                <Section>
                    <SectionHeader>
                        <SectionTitle>Example Information</SectionTitle>
                    </SectionHeader>
                    <TextField
                        label="Summary"
                        placeholder="Brief summary of the example"
                        value={summary}
                        onTextChange={setSummary}
                    />
                    <TextField
                        label="Description"
                        placeholder="Detailed description"
                        value={description}
                        onTextChange={setDescription}
                    />
                </Section>

                <Section>
                    <SectionHeader>
                        <SectionTitle>Example Value</SectionTitle>
                    </SectionHeader>
                    <div>
                        <RadioFieldLabel>
                            <RadioInput
                                type="radio"
                                checked={!useExternal}
                                onChange={() => setUseExternal(false)}
                            />
                            <Typography variant="body2" sx={{ fontSize: 12 }}>Inline Value</Typography>
                        </RadioFieldLabel>
                        {!useExternal && (
                            <TextArea
                                id="example-value"
                                label="Value (JSON or text)"
                                placeholder='e.g., {"name": "John", "age": 30}'
                                value={value}
                                onTextChange={setValue}
                                rows={8}
                            />
                        )}
                    </div>
                    <div>
                        <RadioFieldLabel>
                            <RadioInput
                                type="radio"
                                checked={useExternal}
                                onChange={() => setUseExternal(true)}
                            />
                            <Typography variant="body2" sx={{ fontSize: 12 }}>External Value (URL)</Typography>
                        </RadioFieldLabel>
                        {useExternal && (
                            <TextField
                                label="External Value URL"
                                placeholder="https://example.com/sample.json"
                                value={externalValue}
                                onTextChange={setExternalValue}
                            />
                        )}
                    </div>
                </Section>
            </FormStack>
        </EntityModal>
    );
};
