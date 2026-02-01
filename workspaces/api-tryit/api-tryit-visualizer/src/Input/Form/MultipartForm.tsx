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
import { LinkButton, Codicon } from '@wso2/ui-toolkit';
import { MultipartFormItem } from './MultipartFormItem';
import { FormDataParameter } from '@wso2/api-tryit-core';

const AddButtonWrapper = styled.div`
    margin-top: 4px;
    margin-left: 4px;
`;

interface MultipartFormProps {
    items?: FormDataParameter[];
    onAddParam: () => void;
    onAddFile: () => void;
    // onUpdate now also accepts the text value for non-file params
    onUpdate: (id: string, key: string, filePath: string, contentType: string, value?: string) => void;
    onDelete: (id: string) => void;
    onSelectFile: (id: string) => void;
    onClearFile: (id: string) => void;
    onContentTypeChange: (id: string, contentType: string) => void;
} 

export const MultipartForm: React.FC<MultipartFormProps> = ({
    items = [],
    onAddParam,
    onAddFile,
    onUpdate,
    onDelete,
    onSelectFile,
    onClearFile,
    onContentTypeChange
}) => {
    return (
        <>
            {items.map(param => {
                const val = (param as any).value;
                return (
                    <MultipartFormItem
                        key={param.id}
                        keyValue={param.key}
                        value={val || param.filePath || ''}
                        contentType={param.contentType}
                        onKeyChange={(key) => onUpdate(param.id, key, '', param.contentType, val || param.filePath || '')}
                        onValueChange={(value) => onUpdate(param.id, param.key, '', param.contentType, value)}
                        onContentTypeChange={(contentType) => onContentTypeChange(param.id, contentType)}
                        onSelectFile={() => onSelectFile(param.id)}
                        onClearFile={() => onClearFile(param.id)}
                        onDelete={() => onDelete(param.id)}
                    />
                );
            })}
            <AddButtonWrapper>
                <LinkButton onClick={onAddParam}>
                    <Codicon name="add" />
                    Add Param
                </LinkButton>
            </AddButtonWrapper>
            <AddButtonWrapper>
                <LinkButton onClick={onAddFile}>
                    <Codicon name="add" />
                    Add File
                </LinkButton>
            </AddButtonWrapper>
        </>
    );
};

export default MultipartForm;
