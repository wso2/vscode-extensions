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

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { TextField, Dropdown, OptionProps } from '@wso2/ui-toolkit';
import { HttpMethod, TestRequest } from '@wso2/api-designer-core';
import { EntityModal } from '../../../components/common/EntityModal';

const Row = styled.div`
    display: flex;
    gap: 12px;
    align-items: flex-end;
`;

const MethodField = styled.div`
    min-width: 120px;
`;

const PathField = styled(TextField)`
    flex: 1;
`;

const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

interface CreateTestDialogProps {
    isOpen: boolean;
    collectionId: string;
    onClose: () => void;
    onCreate: (test: TestRequest) => Promise<void>;
}

export const CreateTestDialog: React.FC<CreateTestDialogProps> = ({
    isOpen,
    onClose,
    onCreate,
}) => {
    const [name, setName] = useState('');
    const [method, setMethod] = useState<HttpMethod>('GET');
    const [path, setPath] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const methodOptions: OptionProps[] = httpMethods.map(m => ({
        value: m,
        label: m,
    }));

    const handleCreate = async () => {
        if (!name.trim() || !path.trim()) return;

        setIsCreating(true);
        try {
            const test: TestRequest = {
                id: `test-${Date.now()}`,
                name: name.trim(),
                method,
                path: path.trim(),
                parameters: [],
                headers: {},
            };
            await onCreate(test);
            onClose();
        } catch (error) {
            console.error('Failed to create test:', error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <EntityModal
            isOpen={isOpen}
            title="Create Test"
            onClose={onClose}
            onSave={handleCreate}
            mode="add"
            saveButtonText="Create"
            saveButtonDisabled={!name.trim() || !path.trim() || isCreating}
            width={900}
        >
            <TextField
                label="Name"
                required
                placeholder="Test Name"
                value={name}
                onTextChange={setName}
                autoFocus
            />
            <Row>
                <MethodField>
                    <Dropdown
                        id="method-select"
                        label="Method"
                        isRequired
                        items={methodOptions}
                        value={method}
                        onValueChange={(value) => setMethod(value as HttpMethod)}
                    />
                </MethodField>
                <PathField
                    label="Path"
                    required
                    placeholder="/api/users"
                    value={path}
                    onTextChange={setPath}
                />
            </Row>
        </EntityModal>
    );
};

