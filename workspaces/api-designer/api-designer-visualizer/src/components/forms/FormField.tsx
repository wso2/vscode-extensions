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

import styled from '@emotion/styled';
import React from 'react';

export interface FormFieldProps {
    label?: string;
    required?: boolean;
    error?: string;
    helpText?: string;
    children: React.ReactNode;
    fullWidth?: boolean;
    className?: string;
}

interface FieldContainerProps {
    fullWidth: boolean;
}

const FieldContainer = styled.div<FieldContainerProps>`
    display: flex;
    flex-direction: column;
    gap: 8px;
    ${(props: FieldContainerProps) => props.fullWidth ? 'grid-column: 1 / -1;' : ''}
`;

const Label = styled.label`
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const RequiredIndicator = styled.span`
    color: var(--vscode-errorForeground);
    margin-left: 4px;
`;

const HelpText = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.4;
`;

const ErrorMessage = styled.div`
    font-size: 12px;
    color: var(--vscode-errorForeground);
    background: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 4px;
    padding: 8px 12px;
    margin-top: 4px;
    line-height: 1.4;
`;

export const FormField: React.FC<FormFieldProps> = ({
    label,
    required = false,
    error,
    helpText,
    children,
    fullWidth = false,
    className
}) => {
    return (
        <FieldContainer className={className} fullWidth={fullWidth}>
            {label && (
                <Label>
                    {label}
                    {required && <RequiredIndicator>*</RequiredIndicator>}
                </Label>
            )}
            {children}
            {helpText && !error && <HelpText>{helpText}</HelpText>}
            {error && <ErrorMessage>{error}</ErrorMessage>}
        </FieldContainer>
    );
};

