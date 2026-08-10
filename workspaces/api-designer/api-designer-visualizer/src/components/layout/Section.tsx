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

export interface SectionProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'card' | 'bordered';
}

interface StyledSectionProps {
    variant: 'default' | 'card' | 'bordered';
}

const StyledSection = styled.div<StyledSectionProps>`
    display: flex;
    flex-direction: column;
    gap: ${(props: StyledSectionProps) => (props.variant === 'card' ? '20px' : '12px')};
    padding: ${(props: StyledSectionProps) => (props.variant === 'card' ? '20px' : '12px')};
    background: ${(props: StyledSectionProps) => 
        props.variant === 'card' 
            ? 'var(--vscode-editor-background)' 
            : props.variant === 'bordered'
            ? 'var(--vscode-editorWidget-background)'
            : 'transparent'};
    border: ${(props: StyledSectionProps) => 
        props.variant === 'card' || props.variant === 'bordered'
            ? '1px solid var(--vscode-panel-border)'
            : 'none'};
    border-radius: ${(props: StyledSectionProps) => (props.variant === 'card' || props.variant === 'bordered' ? '8px' : '0')};
    ${(props: StyledSectionProps) => props.variant === 'bordered' ? 'box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);' : ''}
    margin-bottom: ${(props: StyledSectionProps) => (props.variant === 'bordered' ? '20px' : '0')};
`;

export const Section: React.FC<SectionProps> = ({ children, className, variant = 'default' }) => {
    return (
        <StyledSection className={className} variant={variant}>
            {children}
        </StyledSection>
    );
};

