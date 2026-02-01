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
import { Codicon, TextField, Button } from '@wso2/ui-toolkit';

export interface MultipartFormItemProps {
    keyValue: string;
    contentType: string;
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
    display: grid;
    grid-template-columns: 1fr 1fr 1fr auto;
    gap: 8px;
    align-items: center;
    padding: 4px;
    background-color: var(--vscode-editor-background);
`;

const FilePathDisplay = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    color: var(--vscode-foreground);
    font-size: 12px;
    overflow-y: auto;
    height: 15px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
`;

const CloseIconWrapper = styled.div`
    cursor: pointer;
    color: var(--vscode-foreground);
    opacity: 0.7;
    display: flex;
    align-items: center;
    margin-left: 8px;
    
    &:hover {
        opacity: 1;
        color: var(--vscode-errorForeground);
    }
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

export const MultipartFormItem: React.FC<MultipartFormItemProps> = ({
    keyValue,
    contentType,
    value,
    onKeyChange,
    onValueChange,
    onContentTypeChange,
    onSelectFile,
    onClearFile,
    onDelete
}) => {
    return (
        <RowContainer>
            <TextField
                id={`multipart-key-${keyValue}`}
                value={keyValue}
                onTextChange={onKeyChange}
                placeholder="Key"
                sx={{ width: '100%' }}
            />
            {/* If this parameter represents a file (explicit content type for binary OR a selected filePath), show file UI. Otherwise show a value text field. */}
            {(contentType === 'application/octet-stream' || value) ? (
                <FilePathDisplay>
                    {value ? (
                        <>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {value}
                            </span>
                            <CloseIconWrapper onClick={onClearFile}>
                                <Codicon name="close" />
                            </CloseIconWrapper>
                        </>
                    ) : (
                        <Button appearance="secondary" onClick={onSelectFile}>
                            Select File
                        </Button>
                    )}
                </FilePathDisplay>
            ) : (
                <TextField
                    id={`multipart-value-${keyValue}`}
                    value={value || ''}
                    onTextChange={onValueChange}
                    placeholder="Value"
                    sx={{ width: '100%' }}
                />
            )}
            <TextField
                id={`multipart-content-type-${contentType}`}
                value={contentType}
                onTextChange={onContentTypeChange}
                placeholder="Content Type"
                sx={{ width: '100%' }}
            />
            <DeleteIconWrapper onClick={onDelete}>
                <Codicon name="trash" />
            </DeleteIconWrapper>
        </RowContainer>
    );
};
