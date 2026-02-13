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
import { ApiRequest, ApiResponse } from '@wso2/api-tryit-core';
import { evaluateAssertion, getAssertionDetails, getAssertionKey, getOperator } from '../assertionUtils';
import { AssertionRow } from './AssertionRow';

const AddButtonWrapper = styled.div`
    margin-top: 8px;
    margin-left: 4px;
`;

const StickyHeader = styled.div`
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--vscode-editor-background);
    padding-top: 4px;
    padding-bottom: 8px;
`;

const AssertionFailureDetails = styled.div`
    margin-bottom: 8px;
    padding: 2px 10px;
    font-size: 13px;
    color: var(--vscode-errorForeground);
    display: block;
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    border-radius: 2px;
`;

const AssertionDetailLine = styled.div`
    word-break: break-word;
    white-space: pre-wrap;
    display: block;
    min-width: max-content;
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
            <StickyHeader>
                <Typography variant="h3" sx={{ margin: 0 }}>
                    Assertions
                </Typography>
            </StickyHeader>
            {(request.assertions || []).map((assertion, index) => (
                <React.Fragment key={index}>
                    <AssertionRow
                        assertion={assertion}
                        response={response}
                        status={assertionResults[index] === true ? 'pass' : assertionResults[index] === false ? 'fail' : undefined}
                        onChange={(value) => updateAssertion(index, value)}
                        onDelete={() => deleteAssertion(index)}
                    />
                    {response && assertionResults[index] === false && (
                        <>
                            {getAssertionDetails(assertion, response) ? (
                                <AssertionFailureDetails>
                                    <AssertionDetailLine>
                                        {getAssertionKey(assertion)} is expected to be {getOperator(assertion)} {getAssertionDetails(assertion, response)?.expected ?? ''}. Actual {getAssertionKey(assertion)} {getAssertionDetails(assertion, response)?.actual ?? ''} is not {getOperator(assertion)} {getAssertionDetails(assertion, response)?.expected ?? ''}.
                                    </AssertionDetailLine>
                                </AssertionFailureDetails>
                            ) : (
                                <AssertionFailureDetails>
                                    <AssertionDetailLine>
                                        Assertion format is invalid. Please use the format: [target] [operator] [value]. E.g., status == 200, headers.Content-Type == application/json, body != ''
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