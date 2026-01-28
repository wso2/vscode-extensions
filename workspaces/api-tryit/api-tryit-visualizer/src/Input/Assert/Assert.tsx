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
import { Typography, LinkButton, Codicon } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { ApiRequest } from '@wso2/api-tryit-core';
import { InputEditor } from '../InputEditor/InputEditor';

type AssertMode = 'code' | 'form';

interface AssertProps {
    request: ApiRequest;
    onRequestChange?: (request: ApiRequest) => void;
    mode?: AssertMode;
}

const Container = styled.div`
    width: 100%;
    height: calc(100vh - 215px);
    overflow: auto;
`;

const Section = styled.div`
    margin-bottom: 12px;
`;

const AddButtonWrapper = styled.div`
    margin-top: 4px;
    margin-left: 4px;
`;

export const Assert: React.FC<AssertProps> = ({ 
    request,
    onRequestChange,
    mode = 'form'
}) => {

    // Code lenses for Assertions editor
    const assertionsCodeLenses = React.useMemo(() => [
        {
            id: 'add-assertion',
            title: '$(add) Add Assertion',
            shouldShow: (model: any) => true,
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                const lineCount = model.getLineCount();
                const lastLineLength = model.getLineLength(lineCount);
                const textToInsert = model.getValue() ? '\nres.status = 200' : 'res.status = 200';
                
                editor.executeEdits('add-assertion', [{
                    range: {
                        startLineNumber: lineCount,
                        startColumn: lastLineLength + 1,
                        endLineNumber: lineCount,
                        endColumn: lastLineLength + 1
                    },
                    text: textToInsert
                }]);
                
                // Move cursor to the new line
                setTimeout(() => {
                    editor.setPosition({ lineNumber: model.getLineCount(), column: 1 });
                    editor.focus();
                }, 0);
            }
        },
        {
            id: 'generate-assertions',
            title: '$(wand) Generate',
            shouldShow: (model: any) => true,
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                console.log('Generate assertions');
                // Placeholder for AI generation
            }
        }
    ], []);

    const handleAssertionsChange = (value: string | undefined) => {
        const updatedRequest = {
            ...request,
            assertions: (value || '').split('\n').filter(line => line.trim())
        };
        onRequestChange?.(updatedRequest);
    };

    const addAssertion = () => {
        const updatedRequest = {
            ...request,
            assertions: [...(request.assertions || []), '']
        };
        onRequestChange?.(updatedRequest);
    };

    const updateAssertion = (index: number, assertion: string) => {
        const updatedRequest = {
            ...request,
            assertions: (request.assertions || []).map((a, i) => i === index ? assertion : a)
        };
        onRequestChange?.(updatedRequest);
    };

    const deleteAssertion = (index: number) => {
        const updatedRequest = {
            ...request,
            assertions: (request.assertions || []).filter((_, i) => i !== index)
        };
        onRequestChange?.(updatedRequest);
    };

    return (
        <Container>
            <>
                    <Typography variant="h3" sx={{ marginBottom: '8px' }}>
                        Assertions
                    </Typography>
                    <InputEditor
                        minHeight='calc(100vh - 280px)'
                        onChange={handleAssertionsChange}
                        value={(request.assertions || []).join('\n')}
                        codeLenses={assertionsCodeLenses}
                        suggestions={{}}
                    />
                </>
        </Container>
    );
};