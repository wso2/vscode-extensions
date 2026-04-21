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
import { TextField, TextArea, Typography, Button, Codicon } from '@wso2/ui-toolkit';
import { EntityModal } from '../../../../components/common/EntityModal';
import { Section, SectionHeader, SectionTitle } from '../shared/EditorCommonStyles';
import { useBidirectionalSync } from '../../../../hooks/useBidirectionalSync';

const ExpressionList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ExpressionItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: var(--vscode-input-background);
    border-radius: 4px;
    border: 1px solid var(--vscode-panel-border);
`;

const FormStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const AddExpressionRow = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 8px;
`;

/**
 * Callback Editor - Full CRUD for callback components
 * Callbacks are maps of expressions to PathItems
 */
export interface CallbackEditorProps {
    isOpen: boolean;
    mode: 'add' | 'edit';
    data?: any;
    name?: string;
    onClose: () => void;
    onSave: (callback: any, name?: string, previousName?: string) => void;
    onAutoSave?: (callback: any, name?: string, previousName?: string) => void;
    onRemove?: () => void;
}

export const CallbackEditor: React.FC<CallbackEditorProps> = ({
    isOpen,
    mode,
    data,
    name: initialName,
    onClose,
    onSave,
    onAutoSave,
    onRemove
}) => {
    const [name, setName] = useState(initialName || '');
    const lastSyncedNameRef = useRef(initialName || '');
    const [expressions, setExpressions] = useState<Array<{ expression: string; pathItem: string }>>(() => {
        if (data && typeof data === 'object') {
            return Object.entries(data).map(([expression, pathItem]) => ({
                expression,
                pathItem: typeof pathItem === 'string' ? pathItem : JSON.stringify(pathItem, null, 2)
            }));
        }
        return [{ expression: '', pathItem: '' }];
    });
    const [newExpression, setNewExpression] = useState('');
    const [newPathItem, setNewPathItem] = useState('');

    // Build complete callback from form state
    const buildCompleteCallback = useCallback((): any => {
        const callbackData: any = {};
        
        expressions.forEach(({ expression, pathItem }) => {
            if (expression.trim() && pathItem.trim()) {
                try {
                    callbackData[expression.trim()] = JSON.parse(pathItem);
                } catch {
                    // If not valid JSON, treat as string or create a simple path item
                    callbackData[expression.trim()] = {
                        get: {
                            description: pathItem
                        }
                    };
                }
            }
        });

        if (newExpression.trim() && newPathItem.trim()) {
            try {
                callbackData[newExpression.trim()] = JSON.parse(newPathItem);
            } catch {
                callbackData[newExpression.trim()] = {
                    get: {
                        description: newPathItem
                    }
                };
            }
        }

        return callbackData;
    }, [expressions, newExpression, newPathItem]);

    // Use bidirectional sync hook
    const {
        localValue: localCallback,
        setLocalValue: setLocalCallback,
        handleSave: handleSaveInternal
    } = useBidirectionalSync<any>({
        externalValue: data || {},
        onAutoSave: onAutoSave ? (updatedCallback) => {
            if (updatedCallback) {
                onAutoSave(updatedCallback, name.trim() || undefined, lastSyncedNameRef.current);
            }
        } : undefined,
        onSave: (updatedCallback) => {
            if (updatedCallback) {
                onSave(updatedCallback, name.trim() || undefined, lastSyncedNameRef.current);
                onClose();
            }
        },
        isOpen,
        syncKey: `callback-${mode}-${initialName || name || 'new'}`,
        buildValue: () => buildCompleteCallback()
    });

    // Update form state when data syncs from external
    useEffect(() => {
        if (!isOpen) return;
        setName(initialName || '');
        lastSyncedNameRef.current = initialName || '';
        if (data && typeof data === 'object') {
            setExpressions(Object.entries(data).map(([expression, pathItem]) => ({
                expression,
                pathItem: typeof pathItem === 'string' ? pathItem : JSON.stringify(pathItem, null, 2)
            })));
        } else {
            setExpressions([{ expression: '', pathItem: '' }]);
        }
    }, [data, isOpen, initialName]);

    // Trigger auto-save when form fields change
    useEffect(() => {
        if (!isOpen || !onAutoSave) return;
        const completeCallback = buildCompleteCallback();
        setLocalCallback(completeCallback);
    }, [expressions, newExpression, newPathItem, isOpen, onAutoSave, buildCompleteCallback, setLocalCallback]);

    // Trigger auto-save when name changes (debounced)
    useEffect(() => {
        if (!isOpen || !onAutoSave) return;
        
        const timer = setTimeout(() => {
            const completeCallback = buildCompleteCallback();
            if (completeCallback && name.trim()) {
                onAutoSave(completeCallback, name.trim(), lastSyncedNameRef.current);
                lastSyncedNameRef.current = name.trim();
            }
        }, 500);
        
        return () => clearTimeout(timer);
    }, [name, isOpen, onAutoSave, buildCompleteCallback]);

    const handleSave = () => {
        const completeCallback = buildCompleteCallback();
        if (completeCallback && name.trim()) {
            onSave(completeCallback, name.trim(), lastSyncedNameRef.current);
            onClose();
        }
    };

    const addExpression = () => {
        if (newExpression.trim() && newPathItem.trim()) {
            setExpressions(prev => [...prev, { expression: newExpression.trim(), pathItem: newPathItem.trim() }]);
            setNewExpression('');
            setNewPathItem('');
        }
    };

    const removeExpression = (index: number) => {
        setExpressions(prev => prev.filter((_, i) => i !== index));
    };

    const updateExpression = (index: number, field: 'expression' | 'pathItem', value: string) => {
        setExpressions(prev => prev.map((item, i) => 
            i === index ? { ...item, [field]: value } : item
        ));
    };

    return (
        <EntityModal
            isOpen={isOpen}
            title={`${mode === 'add' ? 'Add' : 'Edit'} Callback`}
            onClose={onClose}
            onSave={handleSave}
            width={900}
            mode={mode}
            saveButtonDisabled={!name.trim()}
        >
            <FormStack>
                <Section>
                    <SectionHeader>
                        <SectionTitle>Callback Name</SectionTitle>
                    </SectionHeader>
                    <TextField
                        label="Name"
                        required
                        placeholder="e.g., onDataAvailable"
                        value={name}
                        onTextChange={setName}
                    />
                </Section>

                <Section>
                    <SectionHeader>
                        <SectionTitle>Callback Expressions</SectionTitle>
                    </SectionHeader>
                    <Typography variant="body2" sx={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)', marginBottom: 8 }}>
                        Callbacks map expressions (like $request.body#/url) to PathItem objects
                    </Typography>
                    <ExpressionList>
                        {expressions.map((item, index) => (
                            <ExpressionItem key={index}>
                                <TextField
                                    label="Expression"
                                    placeholder="e.g., $request.body#/url"
                                    value={item.expression}
                                    onTextChange={(value) => updateExpression(index, 'expression', value)}
                                    sx={{ flex: 1 }}
                                />
                                <TextArea
                                    id={`path-item-${index}`}
                                    label="Path Item (JSON)"
                                    placeholder='{"get": {"summary": "Callback"}}'
                                    value={item.pathItem}
                                    onTextChange={(value) => updateExpression(index, 'pathItem', value)}
                                    rows={3}
                                    sx={{ flex: 2 }}
                                />
                                <Button
                                    appearance="icon"
                                    onClick={() => removeExpression(index)}
                                    tooltip="Remove"
                                    sx={{ marginTop: 20 }}
                                >
                                    <Codicon name="trash" />
                                </Button>
                            </ExpressionItem>
                        ))}
                    </ExpressionList>
                    <AddExpressionRow>
                        <TextField
                            label="New Expression"
                            placeholder="e.g., $request.body#/url"
                            value={newExpression}
                            onTextChange={setNewExpression}
                            sx={{ flex: 1 }}
                        />
                        <TextArea
                            id="new-path-item"
                            label="Path Item (JSON)"
                            placeholder='{"get": {"summary": "Callback"}}'
                            value={newPathItem}
                            onTextChange={setNewPathItem}
                            rows={3}
                            sx={{ flex: 2 }}
                        />
                        <Button
                            appearance="primary"
                            onClick={addExpression}
                            disabled={!newExpression.trim() || !newPathItem.trim()}
                            sx={{ marginTop: 20 }}
                        >
                            <Codicon name="add" sx={{ marginRight: 4 }} />
                            Add
                        </Button>
                    </AddExpressionRow>
                </Section>
            </FormStack>
        </EntityModal>
    );
};
