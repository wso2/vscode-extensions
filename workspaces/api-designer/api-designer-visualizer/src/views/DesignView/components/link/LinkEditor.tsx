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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from '@emotion/styled';
import { TextField, Typography } from '@wso2/ui-toolkit';

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
 * Link Editor - Full CRUD for link components
 */
export interface LinkEditorProps {
    isOpen: boolean;
    mode: 'add' | 'edit';
    data?: any;
    name?: string;
    onClose: () => void;
    onSave: (link: any, name?: string, previousName?: string) => void;
    onAutoSave?: (link: any, name?: string, previousName?: string) => void;
    onRemove?: () => void;
}

export const LinkEditor: React.FC<LinkEditorProps> = ({
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
    const [operationRef, setOperationRef] = useState(data?.operationRef || '');
    const [operationId, setOperationId] = useState(data?.operationId || '');
    const [description, setDescription] = useState(data?.description || '');
    const [serverUrl, setServerUrl] = useState(data?.server?.url || '');
    const [useOperationRef, setUseOperationRef] = useState(!!data?.operationRef);

    // Build complete link from form state
    const buildCompleteLink = useCallback((): any => {
        const linkData: any = {};

        if (description.trim()) linkData.description = description.trim();

        if (useOperationRef && operationRef.trim()) {
            linkData.operationRef = operationRef.trim();
        } else if (operationId.trim()) {
            linkData.operationId = operationId.trim();
        }

        if (serverUrl.trim()) {
            linkData.server = {
                url: serverUrl.trim()
            };
        }

        return linkData;
    }, [description, useOperationRef, operationRef, operationId, serverUrl]);

    // Use bidirectional sync hook
    const {
        localValue: localLink,
        setLocalValue: setLocalLink,
        handleSave: handleSaveInternal
    } = useBidirectionalSync<any>({
        externalValue: data || {},
        onAutoSave: onAutoSave ? (updatedLink) => {
            if (updatedLink) {
                onAutoSave(updatedLink, name.trim() || undefined, lastSyncedNameRef.current);
            }
        } : undefined,
        onSave: (updatedLink) => {
            if (updatedLink) {
                onSave(updatedLink, name.trim() || undefined, lastSyncedNameRef.current);
                onClose();
            }
        },
        isOpen,
        syncKey: `link-${mode}-${initialName || name || 'new'}`,
        buildValue: () => buildCompleteLink()
    });

    // Update form state when data syncs from external
    useEffect(() => {
        if (!isOpen) return;
        setName(initialName || '');
        lastSyncedNameRef.current = initialName || '';
        setOperationRef(data?.operationRef || '');
        setOperationId(data?.operationId || '');
        setDescription(data?.description || '');
        setServerUrl(data?.server?.url || '');
        setUseOperationRef(!!data?.operationRef);
    }, [data, isOpen, initialName]);

    // Trigger auto-save when form fields change
    useEffect(() => {
        if (!isOpen || !onAutoSave) return;
        const completeLink = buildCompleteLink();
        setLocalLink(completeLink);
    }, [description, useOperationRef, operationRef, operationId, serverUrl, isOpen, onAutoSave, buildCompleteLink, setLocalLink]);

    // Trigger auto-save when name changes (debounced)
    useEffect(() => {
        if (!isOpen || !onAutoSave) return;
        
        const timer = setTimeout(() => {
            const completeLink = buildCompleteLink();
            if (completeLink && name.trim()) {
                onAutoSave(completeLink, name.trim(), lastSyncedNameRef.current);
                lastSyncedNameRef.current = name.trim();
            }
        }, 500);
        
        return () => clearTimeout(timer);
    }, [name, isOpen, onAutoSave, buildCompleteLink]);

    const handleSave = () => {
        const completeLink = buildCompleteLink();
        if (completeLink && name.trim()) {
            onSave(completeLink, name.trim(), lastSyncedNameRef.current);
            onClose();
        }
    };

    return (
        <EntityModal
            isOpen={isOpen}
            title={`${mode === 'add' ? 'Add' : 'Edit'} Link`}
            onClose={onClose}
            onSave={handleSave}
            width={900}
            mode={mode}
            saveButtonDisabled={!name.trim()}
        >
            <FormStack>
                <Section>
                    <SectionHeader>
                        <SectionTitle>Link Name</SectionTitle>
                    </SectionHeader>
                    <TextField
                        label="Name"
                        required
                        placeholder="e.g., GetUserById"
                        value={name}
                        onTextChange={setName}
                    />
                </Section>

                <Section>
                    <SectionHeader>
                        <SectionTitle>Link Information</SectionTitle>
                    </SectionHeader>
                    <TextField
                        label="Description"
                        placeholder="Link description"
                        value={description}
                        onTextChange={setDescription}
                    />
                </Section>

                <Section>
                    <SectionHeader>
                        <SectionTitle>Operation Reference</SectionTitle>
                    </SectionHeader>
                    <div>
                        <RadioFieldLabel>
                            <RadioInput
                                type="radio"
                                checked={useOperationRef}
                                onChange={() => setUseOperationRef(true)}
                            />
                            <Typography variant="body2" sx={{ fontSize: 12 }}>Operation Reference (URL)</Typography>
                        </RadioFieldLabel>
                        {useOperationRef && (
                            <TextField
                                label="Operation Ref"
                                required
                                placeholder="#/paths/~1users/get"
                                value={operationRef}
                                onTextChange={setOperationRef}
                            />
                        )}
                    </div>
                    <div>
                        <RadioFieldLabel>
                            <RadioInput
                                type="radio"
                                checked={!useOperationRef}
                                onChange={() => setUseOperationRef(false)}
                            />
                            <Typography variant="body2" sx={{ fontSize: 12 }}>Operation ID</Typography>
                        </RadioFieldLabel>
                        {!useOperationRef && (
                            <TextField
                                label="Operation ID"
                                required
                                placeholder="getUserById"
                                value={operationId}
                                onTextChange={setOperationId}
                            />
                        )}
                    </div>
                </Section>

                <Section>
                    <SectionHeader>
                        <SectionTitle>Server (Optional)</SectionTitle>
                    </SectionHeader>
                    <TextField
                        label="Server URL"
                        placeholder="https://api.example.com"
                        value={serverUrl}
                        onTextChange={setServerUrl}
                    />
                </Section>
            </FormStack>
        </EntityModal>
    );
};
