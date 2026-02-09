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
import { Typography, LinkButton, Codicon, TextField, Button } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { ApiRequest, ApiResponse } from '@wso2/api-tryit-core';
import { InputEditor } from '../Input/InputEditor/InputEditor';
import { COMMON_HEADERS } from '../Input/InputEditor/SuggestionsConstants';

type AssertMode = 'code' | 'form';

interface AssertProps {
    request: ApiRequest;
    response?: ApiResponse;
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
    width: 100%;
    padding: 0 12px;
`;

const AddButtonWrapper = styled.div`
    margin-top: 4px;
    margin-left: 4px;
`;

const AssertionItem = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    margin-left: 4px;
    gap: 8px;
    width: 100%;
`;

const AssertionInputWrapper = styled.div`
    flex: 1;
    min-width: 0;
    height: 44px;
    border-radius: 4px;
    background-color: #262626ff;
    border: 1px solid #3a3a3a;
    display: flex;
    align-items: center;
    padding: 0 8px;
    
    /* Light theme */
    body.vscode-light & {
        background-color: #f5f5f5;
        border-color: #d0d0d0;
    }
    
    /* High contrast theme */
    body.vscode-high-contrast & {
        background-color: #000000;
        border-color: #ffffff;
    }
    
    &:focus-within {
        border-color: #528BFF;
        box-shadow: 0 0 0 2px rgba(82, 139, 255, 0.1);
    }
    
    .monaco-editor {
        flex: 1;
        height: 100% !important;
        min-width: 0;
    }
`;

const AssertionInput = styled(TextField)<{ status?: 'pass' | 'fail' }>`
    flex-grow: 1;

    ${({ status }) => status === 'pass' && `
        &&::part(root) {
            background-color: rgba(46, 160, 67, 0.12);
        }

        &&::part(input) {
            background-color: rgba(46, 160, 67, 0.12);
        }
    `}

    ${({ status }) => status === 'fail' && `
        &&::part(root) {
            background-color: rgba(248, 81, 73, 0.12);
        }

        &&::part(input) {
            background-color: rgba(248, 81, 73, 0.12);
        }
    `}
`;

const AssertionStatusIcon = styled(Codicon)<{ status: 'pass' | 'fail' }>`
    color: ${({ status }) => status === 'pass'
        ? 'var(--vscode-testing-iconPassed, #2ea043)'
        : 'var(--vscode-testing-iconFailed, #f85149)'};
`;

const AssertionResultsList = styled.div`
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const AssertionResultRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 4px;
    font-size: 12px;
    color: var(--vscode-foreground);
`;

const AssertionResultText = styled.div`
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.85;
`;

export const Assert: React.FC<AssertProps> = ({ 
    request,
    response,
    onRequestChange,
    mode = 'form'
}) => {

    const evaluateAssertion = React.useCallback((assertion: string, apiResponse?: ApiResponse) => {
        if (!apiResponse) {
            return undefined;
        }

        const trimmed = assertion.trim();
        if (!trimmed) {
            return undefined;
        }

        const match = trimmed.match(/^res\.(status|body|headers\.([A-Za-z0-9-]+))\s*={1,2}\s*(.+)$/i);
        if (!match) {
            return false;
        }

        const [, target, headerName, rawExpected] = match;
        const expected = rawExpected.trim().replace(/^['"]|['"]$/g, '');

        if (target.toLowerCase() === 'status') {
            const expectedStatus = Number(expected);
            return Number.isFinite(expectedStatus) && apiResponse.statusCode === expectedStatus;
        }

        if (target.toLowerCase() === 'body') {
            const responseBody = apiResponse.body ?? '';
            const isExpectedJson = expected.startsWith('{') || expected.startsWith('[');
            if (isExpectedJson) {
                try {
                    const expectedJson = JSON.parse(expected);
                    const responseJson = JSON.parse(responseBody);
                    return JSON.stringify(expectedJson) === JSON.stringify(responseJson);
                } catch {
                    return false;
                }
            }
            return responseBody === expected;
        }

        if (headerName) {
            const headerValue = (apiResponse.headers || []).find(
                (h) => h.key.toLowerCase() === headerName.toLowerCase()
            )?.value;
            if (headerValue === undefined) {
                return false;
            }
            return headerValue.trim() === expected;
        }

        return false;
    }, []);

    const assertionResults = React.useMemo(() => {
        return (request.assertions || []).map((assertion) => evaluateAssertion(assertion, response));
    }, [request.assertions, response, evaluateAssertion]);

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
            {mode === 'code' ? (
                <>
                    <Typography variant="h3" sx={{ marginBottom: '8px' }}>
                        Assertions
                    </Typography>
                    <InputEditor
                        minHeight='calc(100vh - 280px)'
                        onChange={handleAssertionsChange}
                        value={(request.assertions || []).join('\n')}
                        codeLenses={assertionsCodeLenses}
                        assertionStatuses={assertionResults}
                        suggestions={{
                            assertions: {
                                initial: ['res'],
                                properties: {
                                    'res': ['status', 'headers', 'body'],
                                    'headers': {
                                        names: COMMON_HEADERS.map(h => h.name),
                                        values: Object.fromEntries(COMMON_HEADERS.map(h => [h.name, h.values]))
                                    }
                                }
                            }
                        }}
                    />
                    {(request.assertions || []).length > 0 && (
                        <AssertionResultsList>
                            {(request.assertions || []).map((assertion, index) => (
                                <AssertionResultRow key={`assertion-result-${index}`}>
                                    {response ? (
                                        <AssertionStatusIcon
                                            status={assertionResults[index] ? 'pass' : 'fail'}
                                            name={assertionResults[index] ? 'check' : 'close'}
                                        />
                                    ) : (
                                        <Codicon
                                            sx={{ color: 'var(--vscode-disabledForeground)' }}
                                            name="close"
                                        />
                                    )}
                                    <AssertionResultText title={assertion}>
                                        {assertion}
                                    </AssertionResultText>
                                </AssertionResultRow>
                            ))}
                        </AssertionResultsList>
                    )}
                </>
            ) : (
                <>
                    <Typography variant="h3" sx={{ marginBottom: '8px' }}>
                        Assertions
                    </Typography>
                    {(request.assertions || []).map((assertion, index) => (
                        <AssertionItem key={index}>
                            <AssertionInput  
                                id={`assertion-${index}`}
                                value={assertion}
                                onTextChange={(value) => updateAssertion(index, value)}
                                placeholder="e.g., res.status = 200"
                                status={response ? (assertionResults[index] ? 'pass' : 'fail') : undefined}
                                sx={{flex: 1}}
                            />
                            <Button appearance='icon' onClick={() => deleteAssertion(index)}>
                                <Codicon sx={{color: 'var(--vscode-editorGutter-deletedBackground)'}} name="trash" />
                            </Button>
                            {/* {response ? (
                                <AssertionStatusIcon
                                    status={assertionResults[index] ? 'pass' : 'fail'}
                                    name={assertionResults[index] ? 'check' : 'close'}
                                />
                            ) : (
                                <Codicon
                                    sx={{ color: 'var(--vscode-disabledForeground)' }}
                                    name="close"
                                />
                            )} */}
                        </AssertionItem>
                    ))}
                    <AddButtonWrapper>
                        <LinkButton onClick={addAssertion}>
                            <Codicon name="add" />
                            Add Assertion
                        </LinkButton>
                    </AddButtonWrapper>
                </>
            )}
        </Container>
    );
};