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

export interface BinaryFormItemProps {
    id: string;
    keyValue: string;
    contentType: string;
    contentTypeItems: string[];
    // `value` holds either the field value or a selected file path
    value?: string;
    onKeyChange: (key: string) => void;
    onValueChange?: (value: string) => void;
    onContentTypeChange: (contentType: string) => void;
    onSelectFile: () => void;
    onClearFile: () => void;
    onDelete: () => void;
}

interface FileSelectProps {
    isFileSelected: boolean;
}

const RowContainer = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 8px;
    align-items: center;
    padding: 4px;
    background-color: var(--vscode-editor-background);
`;

const FilePathDisplay = styled.div<FileSelectProps>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    ${(props: FileSelectProps) => props.isFileSelected ? 'padding: 6px 8px;' : 'padding: 6px 0px;'};
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

const FieldWrapper = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
`;

export const BinaryFormItem: React.FC<BinaryFormItemProps> = ({
    id,
    contentType,
    value,
    onValueChange,
    onContentTypeChange,
    onSelectFile,
    contentTypeItems,
    onDelete
}) => {
    const buttonLabel = value ? value : 'Select File';

    return (
        <RowContainer>
            <FieldWrapper>
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
