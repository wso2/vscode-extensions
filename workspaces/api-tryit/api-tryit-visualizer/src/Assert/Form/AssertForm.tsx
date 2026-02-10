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
import { evaluateAssertion, getAssertionDetails, getAssertionKey, getOperator } from '../assertionUtils';

const AddButtonWrapper = styled.div`
    margin-top: 8px;
    margin-left: 4px;
`;

const AssertionItem = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    margin-left: 4px;
    gap: 8px;
    width: 100%;
`;

const AssertionInput = styled(TextField) <{ status?: 'pass' | 'fail' }>`
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

const AssertionFailureDetails = styled.div<{ isForm: boolean }>`
    margin-left: ${({ isForm }) => isForm ? '14px' : '0'};
    margin-top: 4px;
    margin-bottom: 4px;
    font-size: 12px;
    color: var(--vscode-errorForeground);
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const AssertionDetailLine = styled.div`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

interface AssertFormProps {
    request: ApiRequest;
    response?: ApiResponse;
    onRequestChange?: (request: ApiRequest) => void;
}

export const AssertForm: React.FC<AssertFormProps> = ({
    request,
    response,
    onRequestChange
}) => {
    const assertionResults = React.useMemo(() => {
        return (request.assertions || []).map((assertion) => evaluateAssertion(assertion, response));
    }, [request.assertions, response]);

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
        <>
            <Typography variant="h3" sx={{ margin: 0, marginBottom: '8px' }}>
                Assertions
            </Typography>
            {(request.assertions || []).map((assertion, index) => (
                <React.Fragment key={index}>
                    <AssertionItem>
                        <AssertionInput
                            id={`assertion-${index}`}
                            value={assertion}
                            onTextChange={(value) => updateAssertion(index, value)}
                            placeholder="e.g., res.status = 200"
                            status={response ? (assertionResults[index] ? 'pass' : 'fail') : undefined}
                            sx={{ flex: 1 }}
                        />
                        <Button appearance='icon' onClick={() => deleteAssertion(index)}>
                            <Codicon sx={{ color: 'var(--vscode-editorGutter-deletedBackground)' }} name="trash" />
                        </Button>
                    </AssertionItem>
                    {response && assertionResults[index] === false && (
                        <>
                            {getAssertionDetails(assertion, response) ? (
                                <>
                                    <AssertionFailureDetails isForm={true}>
                                        <AssertionDetailLine>
                                            res.{getAssertionKey(assertion)} is expected to be {getOperator(assertion)} {getAssertionDetails(assertion, response)?.expected ?? ''}. Actual res.{getAssertionKey(assertion)} {getAssertionDetails(assertion, response)?.actual ?? ''} is not {getOperator(assertion)} {getAssertionDetails(assertion, response)?.expected ?? ''}.
                                        </AssertionDetailLine>
                                    </AssertionFailureDetails>
                                </>
                            ) : (
                                <AssertionFailureDetails isForm={true}>
                                    <AssertionDetailLine>
                                        Assertion format is invalid. Please use the format: res.[target] [operator] [value]. E.g., res.status = 200, res.headers.Content-Type = application/json, res.body != ''
                                    </AssertionDetailLine>
                                </AssertionFailureDetails>
                            )}
                        </>
                    )}
                </React.Fragment>
            ))}
            <AddButtonWrapper>
                <LinkButton onClick={addAssertion}>
                    <Codicon name="add" />
                    Add Assertion
                </LinkButton>
            </AddButtonWrapper>
        </>
    );
};