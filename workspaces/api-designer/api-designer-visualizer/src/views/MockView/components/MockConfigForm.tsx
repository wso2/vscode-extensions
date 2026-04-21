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
import { TextField } from '@wso2/ui-toolkit';
import { MockServerConfig, MockServerTool } from '@wso2/api-designer-core';

const FormContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const FormField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const FieldLabel = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const FieldDescription = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-top: -4px;
`;

interface MockConfigFormProps {
    config: MockServerConfig;
    onConfigChange: (config: MockServerConfig) => void;
    selectedTool: MockServerTool;
}

export const MockConfigForm: React.FC<MockConfigFormProps> = ({
    config,
    onConfigChange,
    selectedTool
}) => {
    const handlePortChange = (value: string) => {
        const port = parseInt(value, 10);
        if (!isNaN(port) && port > 0 && port <= 65535) {
            onConfigChange({ ...config, port });
        }
    };

    const getToolDescription = () => {
        switch (selectedTool) {
            case MockServerTool.PRISM:
                return 'Automatically generates responses from your OpenAPI specification with validation and CORS support.';
            case MockServerTool.MOKAPI:
                return 'Simple standalone mock server with visual dashboard - no additional services required.';
            case MockServerTool.AI_GENERATED_JS:
                return 'AI-powered JavaScript mock server - generates custom Node.js/Express code based on your API spec.';
            default:
                return '';
        }
    };

    return (
        <FormContainer>
            <FormField>
                <FieldLabel>Port</FieldLabel>
                <TextField
                    id="mock-port"
                    type="number"
                    value={config.port.toString()}
                    onChange={(e) => handlePortChange(e.target.value)}
                    placeholder="4010"
                    min={1}
                    max={65535}
                />
            </FormField>
            
            <FieldDescription>
                {getToolDescription()}
            </FieldDescription>
        </FormContainer>
    );
};

