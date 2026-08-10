/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

export interface FormSectionProps {
    children: React.ReactNode;
    title?: string;
    className?: string;
}

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-editor-background);
`;

const Title = styled.h3`
    margin: 0 0 8px 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
    padding-bottom: 8px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

export const FormSection: React.FC<FormSectionProps> = ({ children, title, className }) => {
    return (
        <Section className={className}>
            {title && <Title>{title}</Title>}
            {children}
        </Section>
    );
};

