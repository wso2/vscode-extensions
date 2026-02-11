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
import { Typography, Codicon } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { ApiRequest, ApiResponse } from '@wso2/api-tryit-core';
import { InputEditor } from '../../Input/InputEditor/InputEditor';
import { COMMON_HEADERS } from '../../Input/InputEditor/SuggestionsConstants';
import { evaluateAssertion, getAssertionDetails, getAssertionKey, getOperator } from '../assertionUtils';

const AssertionResultsList = styled.div`
    margin-top: 8px;
    display: flex;
    flex-direction: column;
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
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
`;

const AssertionStatusIcon = styled(Codicon) <{ status: 'pass' | 'fail' }>`
    color: ${({ status }) => status === 'pass'
        ? 'var(--vscode-testing-iconPassed, #2ea043)'
        : 'var(--vscode-testing-iconFailed, #f85149)'};
`;

const AssertionFailureDetails = styled.div<{ isForm: boolean }>`
    margin-left: ${({ isForm }) => isForm ? '14px' : '0'};
    margin-top: 4px;
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--vscode-errorForeground);
    display: block;
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
`;

const AssertionDetailLine = styled.div`
    white-space: nowrap;
    display: inline-block;
    min-width: max-content;
`;

const StickyHeader = styled.div`
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--vscode-editor-background);
    padding-top: 4px;
    padding-bottom: 8px;
`;

interface AssertCodeProps {
    request: ApiRequest;
    response?: ApiResponse;
    onRequestChange?: (request: ApiRequest) => void;
}

export const AssertCode: React.FC<AssertCodeProps> = ({
    request,
    response,
    onRequestChange
}) => {
    const assertionResults = React.useMemo(() => {
        return (request.assertions || []).map((assertion) => evaluateAssertion(assertion, response));
    }, [request.assertions, response]);

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

    return (
        <>
            <StickyHeader>
                <Typography variant="h3" sx={{ margin: 0 }}>
                    Assertions
                </Typography>
            </StickyHeader>
            <InputEditor
                minHeight='calc(100vh - 380px)'
                onChange={handleAssertionsChange}
                value={(request.assertions || []).join('\n')}
                codeLenses={assertionsCodeLenses}
                assertionStatuses={assertionResults}
                suggestions={{
                    assertions: {
                        initial: ['status', 'headers', 'body'],
                        properties: {
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
                        <React.Fragment key={`assertion-result-${index}`}>
                            <AssertionResultRow>
                                {response && getAssertionKey(assertion) && getOperator(assertion) ? (
                                    <AssertionStatusIcon
                                        status={assertionResults[index] ? 'pass' : 'fail'}
                                        name={assertionResults[index] ? 'check' : 'close'}
                                    />
                                ) : (
                                    response && assertionResults[index] === false && getAssertionKey(assertion) && getOperator(assertion) && (
                                        <Codicon
                                            sx={{ color: 'var(--vscode-disabledForeground)' }}
                                            name="close"
                                        />
                                    )
                                )}
                                <AssertionResultText title={assertion}>
                                    {response && assertionResults[index] === false && (
                                        <AssertionFailureDetails isForm={false}>
                                            {getAssertionDetails(assertion, response) ? (
                                                <AssertionDetailLine>
                                                    {getAssertionKey(assertion)} is expected to be {getOperator(assertion)} {getAssertionDetails(assertion, response)?.expected ?? ''}. Actual {getAssertionKey(assertion)} {getAssertionDetails(assertion, response)?.actual ?? ''} is not {getOperator(assertion)} {getAssertionDetails(assertion, response)?.expected ?? ''}.
                                                </AssertionDetailLine>
                                            ) : (
                                                <AssertionDetailLine>
                                                    Assertion format is invalid. Please use the format: [target] [operator] [value]. E.g., status = 200, headers.Content-Type = application/json, body != ''
                                                </AssertionDetailLine>
                                            )}
                                        </AssertionFailureDetails>
                                    )}
                                    {response && assertionResults[index] === true && (
                                        <AssertionDetailLine>
                                            {getAssertionDetails(assertion, response) && (
                                                <>res.{getAssertionKey(assertion)} is {getOperator(assertion)} {getAssertionDetails(assertion, response)?.expected ?? ''} as expected.</>
                                            )}
                                        </AssertionDetailLine>
                                    )}
                                </AssertionResultText>
                            </AssertionResultRow>
                        </React.Fragment>
                    ))}
                </AssertionResultsList>
            )}
        </>
    );
};