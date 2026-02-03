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
    value?: string;
    filePath?: string;
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
    filePath,
    onKeyChange,
    onValueChange,
    onContentTypeChange,
    onSelectFile,
    onDelete
}) => {
    const isFileInput = filePath !== undefined;
    const buttonLabel = filePath ? filePath : 'Select File';
    const fileSelectRef = React.useRef<HTMLButtonElement>(null);

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
                        sx={{ width: '100%', overflow: 'hidden' }}
                        buttonSx={{ width: '100%', height: 30, display: 'flex', justifyContent: filePath ? 'flex-start' : 'center', alignItems: 'center', textAlign: filePath ? 'left' : 'center', overflow: 'hidden' }}
                        tooltip={buttonLabel}
                    >
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: filePath ? 'left' : 'center' }}>
                            {buttonLabel}
                        </div>
                    </Button>
                ) : (
                    <TextField
                        id={`multipart-value-${id}`}
                        value={value ?? ''}
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
