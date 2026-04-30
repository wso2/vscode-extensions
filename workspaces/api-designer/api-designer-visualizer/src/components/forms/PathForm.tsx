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

import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { TextField, CheckBox, Typography } from '@wso2/ui-toolkit';

const FormStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const FormPanel = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-editor-background);
`;

const PanelHeader = styled.div`
    padding-bottom: 8px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const MethodChips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;
import { EntityModal } from '../common/EntityModal';
import { useBidirectionalSync } from '../../hooks/useBidirectionalSync';

/**
 * Path Form Component - Edit endpoint paths and methods
 */
export interface PathFormProps {
    isOpen: boolean;
    mode: 'add' | 'edit';
    data: {
        path?: string;
        methods?: {
            get?: boolean;
            post?: boolean;
            put?: boolean;
            delete?: boolean;
            patch?: boolean;
        };
    };
    /** All existing paths in the spec — used in add mode to pre-populate methods */
    existingPaths?: Record<string, any>;
    onClose: () => void;
    onSave: (data: any) => void;
    onAutoSave?: (data: any) => void;
    onRemove?: () => void;
    onCopilot?: () => void;
}

export const PathForm: React.FC<PathFormProps> = ({
    isOpen,
    mode,
    data,
    existingPaths,
    onClose,
    onSave,
    onAutoSave,
    onRemove,
    onCopilot
}) => {
    const [path, setPath] = useState(data.path || '');
    const [methods, setMethods] = useState(
        data.methods || {
            get: false,
            post: false,
            put: false,
            delete: false,
            patch: false
        }
    );

    // In add mode: when the typed path already exists, pre-check its existing methods
    const handlePathChange = (newPath: string) => {
        setPath(newPath);
        if (mode === 'add' && existingPaths) {
            const existing = existingPaths[newPath.trim()];
            if (existing) {
                setMethods((prev) => {
                    const merged = { ...prev };
                    (['get', 'post', 'put', 'delete', 'patch'] as const).forEach((m) => {
                        if (existing[m]) merged[m] = true;
                    });
                    return merged;
                });
            }
        }
    };

    // Build complete data
    const buildCompleteData = useCallback((): typeof data => ({
        path: path.trim(),
        methods
    }), [path, methods]);

    // Use bidirectional sync hook
    const {
        localValue: localData,
        setLocalValue: setLocalData,
        handleSave: handleSaveInternal
    } = useBidirectionalSync<typeof data>({
        externalValue: data,
        onAutoSave,
        onSave: (updatedData) => {
            if (updatedData.path?.trim() && updatedData.methods && Object.values(updatedData.methods).some(Boolean)) {
                onSave(updatedData);
                onClose();
            }
        },
        isOpen,
        syncKey: `path-${mode}-${data.path || 'new'}`,
        buildValue: () => buildCompleteData()
    });

    // Update form state when data syncs from external
    useEffect(() => {
        if (!isOpen) return;
        setPath(data.path || '');
        setMethods(data.methods || {
            get: false,
            post: false,
            put: false,
            delete: false,
            patch: false
        });
    }, [data, isOpen]);

    // Trigger auto-save when form fields change
    useEffect(() => {
        if (!isOpen || !onAutoSave) return;
        const completeData = buildCompleteData();
        setLocalData(completeData);
    }, [path, methods, isOpen, onAutoSave, buildCompleteData, setLocalData]);

    const handleMethodToggle = (method: string) => {
        setMethods((prev) => ({
            ...prev,
            [method]: !prev[method as keyof typeof prev]
        }));
    };

    const handleSave = () => {
        handleSaveInternal();
    };

    return (
        <EntityModal
            isOpen={isOpen}
            title={mode === 'add' ? 'Add Endpoint' : 'Edit Endpoint'}
            onClose={onClose}
            onSave={handleSave}
            width={900}
            mode={mode}
            saveButtonDisabled={!path.trim() || !Object.values(methods).some(Boolean)}
        >
            <FormStack>
                <FormPanel>
                    <PanelHeader>
                        <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)' }}>
                            Path Information
                        </Typography>
                    </PanelHeader>
                    <TextField
                        label="Path"
                        required
                        placeholder="e.g., /users/{id}"
                        value={path}
                        onTextChange={handlePathChange}
                    />
                    {mode === 'add' && existingPaths && existingPaths[path.trim()] && (
                        <Typography variant="body2" sx={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)', marginTop: -4 }}>
                            This path already exists. Existing methods are pre-checked — any additionally selected methods will be added.
                        </Typography>
                    )}
                </FormPanel>

                <FormPanel>
                    <PanelHeader>
                        <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--vscode-editor-foreground)' }}>
                            HTTP Methods
                        </Typography>
                    </PanelHeader>
                    <MethodChips>
                        {(['get', 'post', 'put', 'delete', 'patch'] as const).map((method) => (
                            <CheckBox
                                key={method}
                                checked={!!methods[method]}
                                label={method.toUpperCase()}
                                onChange={() => handleMethodToggle(method)}
                            />
                        ))}
                    </MethodChips>
                </FormPanel>
            </FormStack>
        </EntityModal>
    );
};
