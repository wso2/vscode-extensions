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
import { Codicon } from '@wso2/ui-toolkit';

const Container = styled.div`
    background: var(--vscode-textBlockQuote-background);
    border: 1px solid var(--vscode-textBlockQuote-border);
    border-radius: 4px;
    padding: 12px;
    margin-top: 12px;
`;

const Title = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-foreground);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const VariableList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const VariableItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-family: var(--vscode-editor-font-family);
`;

const VariableName = styled.span`
    color: var(--vscode-symbolIcon-variableForeground);
    font-weight: 500;
`;

const VariableValue = styled.span`
    color: var(--vscode-descriptionForeground);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const EmptyMessage = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
`;

const UsageHint = styled(EmptyMessage)`
    margin-top: 8px;
`;

interface ExtractedVariablesDisplayProps {
    variables: Record<string, string>;
}

export const ExtractedVariablesDisplay: React.FC<ExtractedVariablesDisplayProps> = ({
    variables
}) => {
    // Safety check: ensure variables is an object
    if (!variables || typeof variables !== 'object') {
        return null;
    }
    
    const entries = Object.entries(variables);

    if (entries.length === 0) {
        return null;
    }

    return (
        <Container>
            <Title>
                <Codicon name="symbol-variable" />
                Extracted Variables ({entries.length})
            </Title>
            <VariableList>
                {entries.map(([name, value]) => (
                    <VariableItem key={name}>
                        <VariableName>${name}</VariableName>
                        <span>=</span>
                        <VariableValue title={value}>{value}</VariableValue>
                    </VariableItem>
                ))}
            </VariableList>
            <UsageHint>
                Use ${'{' + entries[0][0] + '}'} or {'{{' + entries[0][0] + '}}'} in subsequent requests
            </UsageHint>
        </Container>
    );
};

