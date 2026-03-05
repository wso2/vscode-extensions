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

import React from 'react';
import styled from '@emotion/styled';
import { Button, Codicon } from '@wso2/ui-toolkit';
import { CaptureVariable, CaptureExtractorType, ApiResponse } from '@wso2/api-tryit-core';
import { SuggestionDropdown } from '../../Components/Dropdown/SuggestionDropdown';
import { captureNeedsExpression, evaluateCapture } from '../captureUtils';

const EXTRACTOR_TYPES: CaptureExtractorType[] = [
    'jsonpath', 'xpath', 'header', 'cookie', 'regex',
    'body', 'status', 'bytes', 'url', 'duration'
];

const EXPRESSION_PLACEHOLDERS: Partial<Record<CaptureExtractorType, string>> = {
    jsonpath: '$.field or $.arr[0].id',
    xpath: 'string(//title)',
    header: 'Content-Type',
    cookie: 'session',
    regex: 'regex pattern'
};

interface CaptureRowProps {
    capture: CaptureVariable;
    response?: ApiResponse;
    onChange: (updated: CaptureVariable) => void;
    onDelete: () => void;
}

const RowContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    margin-bottom: 10px;
    margin-top: 2px;
    margin-left: 4px;
`;

const NameFieldWrapper = styled.div`
    flex: 1;
    min-width: 0;
`;

const TypeFieldWrapper = styled.div`
    flex: 0 0 140px;
    min-width: 100px;
`;

const ExpressionFieldWrapper = styled.div`
    flex: 1.5;
    min-width: 0;
`;

const PreviewText = styled.span`
    flex: 0 0 auto;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 4px;
`;

const DeleteButton = styled(Button)`
    flex: 0 0 auto;
    padding: 4px;
`;

export const CaptureRow: React.FC<CaptureRowProps> = ({
    capture,
    response,
    onChange,
    onDelete
}) => {
    const showExpression = captureNeedsExpression(capture.extractorType);
    const preview = evaluateCapture(capture, response);

    const handleTypeChange = (newType: string) => {
        const type = newType as CaptureExtractorType;
        // Clear expression when switching to a no-expression extractor
        onChange({ ...capture, extractorType: type, expression: captureNeedsExpression(type) ? capture.expression : '' });
    };

    return (
        <RowContainer>
            <NameFieldWrapper>
                <SuggestionDropdown
                    value={capture.name}
                    suggestions={[]}
                    onChange={(name) => onChange({ ...capture, name })}
                    placeholder="variable name"
                />
            </NameFieldWrapper>

            <TypeFieldWrapper>
                <SuggestionDropdown
                    value={capture.extractorType}
                    suggestions={EXTRACTOR_TYPES}
                    onChange={handleTypeChange}
                    placeholder="extractor"
                />
            </TypeFieldWrapper>

            {showExpression && (
                <ExpressionFieldWrapper>
                    <SuggestionDropdown
                        value={capture.expression}
                        suggestions={[]}
                        onChange={(expression) => onChange({ ...capture, expression })}
                        placeholder={EXPRESSION_PLACEHOLDERS[capture.extractorType] ?? 'expression'}
                    />
                </ExpressionFieldWrapper>
            )}

            {preview !== undefined && (
                <PreviewText title={preview}>→ {preview}</PreviewText>
            )}

            <DeleteButton appearance="icon" onClick={onDelete}>
                <Codicon sx={{ color: 'var(--vscode-editorGutter-deletedBackground)' }} name="trash" />
            </DeleteButton>
        </RowContainer>
    );
};
