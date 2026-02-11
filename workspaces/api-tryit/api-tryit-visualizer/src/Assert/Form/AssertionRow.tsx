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
import { Button, Codicon } from '@wso2/ui-toolkit';
import { ApiResponse } from '@wso2/api-tryit-core';
import { SuggestionDropdown } from '../../Components/Dropdown/SuggestionDropdown';
import {
    parseAssertion,
    buildAssertion,
    getTargetSuggestions,
    completeTarget,
    getOperatorSuggestions,
    getValueSuggestions
} from '../assertionSuggestions';

interface AssertionRowProps {
    assertion: string;
    response?: ApiResponse;
    onChange: (assertion: string) => void;
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

const FieldWrapper = styled.div`
    flex: 1;
    min-width: 0;
`;

const OperatorFieldWrapper = styled.div`
    flex: 0 0 190px;
    min-width: 100px;
`;

const ValueFieldWrapper = styled.div`
    flex: 1;
    min-width: 0;
`;

const DeleteButton = styled(Button)`
    flex: 0 0 auto;
    padding: 4px;
`;

const FieldLabel = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 2px;
    margin-left: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const FieldLabelContainer = styled.div`
    display: contents;
`;

export const AssertionRow: React.FC<AssertionRowProps> = ({
    assertion,
    response,
    onChange,
    onDelete
}) => {
    const { target, operator, value } = parseAssertion(assertion);

    const [targetInput, setTargetInput] = React.useState(target);
    const [operatorInput, setOperatorInput] = React.useState(operator);
    const [valueInput, setValueInput] = React.useState(value);

    React.useEffect(() => {
        const newAssertion = buildAssertion(targetInput, operatorInput, valueInput);
        if (newAssertion !== assertion) {
            onChange(newAssertion);
        }
    }, [targetInput, operatorInput, valueInput, onChange, assertion]);

    const handleTargetChange = (newTarget: string) => {
        // If selecting "headers" or "body" from base list, auto-complete with dot
        // Otherwise, just use the value as-is (could be partial like "headers.A")
        if (newTarget === 'headers' || newTarget === 'body') {
            setTargetInput(completeTarget(newTarget));
        } else {
            setTargetInput(newTarget);
        }
    };

    const targetSuggestions = getTargetSuggestions(targetInput);
    const operatorSuggestions = getOperatorSuggestions();
    const valueSuggestions = getValueSuggestions(targetInput, response);

    return (
        <>
            <RowContainer>
                <FieldWrapper>
                    <SuggestionDropdown
                        value={targetInput}
                        suggestions={targetSuggestions}
                        onChange={handleTargetChange}
                        placeholder="target. eg: status, headers.Content-Type, body.id"
                    />
                </FieldWrapper>

                <OperatorFieldWrapper>
                    <SuggestionDropdown
                        value={operatorInput}
                        suggestions={operatorSuggestions}
                        onChange={setOperatorInput}
                        placeholder="operator. eg: ==, !=, >, <"
                    />
                </OperatorFieldWrapper>

                <ValueFieldWrapper>
                    <SuggestionDropdown
                        value={valueInput}
                        suggestions={valueSuggestions}
                        onChange={setValueInput}
                        placeholder="value. eg: 200, application/json, some text"
                    />
                </ValueFieldWrapper>

                <DeleteButton appearance="icon" onClick={onDelete}>
                    <Codicon sx={{ color: 'var(--vscode-editorGutter-deletedBackground)' }} name="trash" />
                </DeleteButton>
            </RowContainer>
        </>
    );
};
