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
import { Codicon } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { ApiRequest, ApiResponse } from '@wso2/api-tryit-core';
import { AssertForm } from './Form/AssertForm';
import { AssertCode } from './Code/AssertCode';
import { evaluateAssertion } from './assertionUtils';

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

const SummarySection = styled.div`
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
    padding: 12px;
    background-color: #262626ff;
    border: 1px solid #3a3a3a;
    border-radius: 4px;
    margin-left: 4px;
    margin-right: 4px;
    margin-top: 12px;

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
`;

const SummaryItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
`;

const SummaryCount = styled.span<{ type: 'pass' | 'fail' | 'total' }>`
    color: ${({ type }) => {
        switch (type) {
            case 'pass':
                return 'var(--vscode-testing-iconPassed, #2ea043)';
            case 'fail':
                return 'var(--vscode-testing-iconFailed, #f85149)';
            default:
                return 'var(--vscode-foreground)';
        }
    }};
    font-weight: 600;
`;

export const Assert: React.FC<AssertProps> = ({
    request,
    response,
    onRequestChange,
    mode = 'form'
}) => {
    const assertionResults = React.useMemo(() => {
        return (request.assertions || []).map((assertion) => evaluateAssertion(assertion, response));
    }, [request.assertions, response]);

    const passCount = React.useMemo(() => {
        return assertionResults.filter(result => result === true).length;
    }, [assertionResults]);

    const failCount = React.useMemo(() => {
        return assertionResults.filter(result => result === false).length;
    }, [assertionResults]);

    return (
        <Container>
            {mode === 'code' ? (
                <AssertCode
                    request={request}
                    response={response}
                    onRequestChange={onRequestChange}
                />
            ) : (
                <AssertForm
                    request={request}
                    response={response}
                    onRequestChange={onRequestChange}
                />
            )}
            {response && (request.assertions || []).length > 0 && (
                <SummarySection>
                    <SummaryItem>
                        <Codicon name="check-all" sx={{ color: 'var(--vscode-testing-iconPassed, #2ea043)' }} />
                        <span>Passed:</span>
                        <SummaryCount type="pass">{passCount}</SummaryCount>
                    </SummaryItem>
                    <SummaryItem>
                        <Codicon name="close-all" sx={{ color: 'var(--vscode-testing-iconFailed, #f85149)' }} />
                        <span>Failed:</span>
                        <SummaryCount type="fail">{failCount}</SummaryCount>
                    </SummaryItem>
                    <SummaryItem style={{ marginLeft: 'auto' }}>
                        <span>Total:</span>
                        <SummaryCount type="total">{passCount + failCount}</SummaryCount>
                    </SummaryItem>
                </SummarySection>
            )}
        </Container>
    );
};