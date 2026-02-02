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

import React from 'react';
import styled from '@emotion/styled';
import { Codicon, Button, AutoComplete } from '@wso2/ui-toolkit';
import { TextField } from '../../../Components/TextField/TextField';

export interface MultipartFormItemProps {
    id: string;
    keyValue: string;
    contentType: string;
    contentTypeItems?: string[];
    // `value` holds either the field value or a selected file path
    value?: string;
    onKeyChange: (key: string) => void;
    onValueChange?: (value: string) => void;
    onContentTypeChange: (contentType: string) => void;
    onSelectFile: () => void;
    onClearFile: () => void;
    onDelete: () => void;
}

const RowContainer = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 4px;
    background-color: var(--vscode-editor-background);
    width: auto !important;
    width: 100%;
`;

const DeleteIconWrapper = styled.div`
    cursor: pointer;
    color: var(--vscode-foreground);
    opacity: 0.7;
    display: flex;
    align-items: center;
    
    &:hover {
        opacity: 1;
        color: var(--vscode-errorForeground);
    }
`;

const FieldWrapper = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
`;

export const MultipartFormItem: React.FC<MultipartFormItemProps> = ({
    id,
    keyValue,
    contentType,
    contentTypeItems,
    value,
    onKeyChange,
    onValueChange,
    onContentTypeChange,
    onSelectFile,
    onDelete
}) => {
    const isFileInput = contentType === 'application/octet-stream';
    const buttonLabel = value ? value : 'Select File';

    return (
        <RowContainer>
            <FieldWrapper>
                <TextField
                    id={`multipart-key-${id}`}
                    value={keyValue}
                    onTextChange={onKeyChange}
                    placeholder="Key"
                    sx={{ width: '100%' }}
                />
            </FieldWrapper>
            <FieldWrapper>
                {isFileInput ? (
                    <Button
                        appearance="secondary"
                        onClick={onSelectFile}
                        sx={{ width: '100%' }}
                        buttonSx={{ width: '100%', height: 30, display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', overflow: 'hidden' }}
                        tooltip={buttonLabel}
                    >
                        <span style={{ display: 'block', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                            {buttonLabel}
                        </span>
                    </Button>
                ) : (
                    <TextField
                        id={`multipart-value-${id}`}
                        value={value || ''}
                        onTextChange={onValueChange}
                        placeholder="Value"
                        sx={{ width: '100%' }}
                    />
                )}
            </FieldWrapper>
            <FieldWrapper>
                <AutoComplete
                    identifier={`content-type-${id}`}
                    value={contentType}
                    onValueChange={onContentTypeChange}
                    items={contentTypeItems || []}
                    borderBox={true}
                    sx={{ width: '100%' }}
                />
            </FieldWrapper>
            <DeleteIconWrapper onClick={onDelete}>
                <Codicon name="trash" />
            </DeleteIconWrapper>
        </RowContainer>
    );
};
