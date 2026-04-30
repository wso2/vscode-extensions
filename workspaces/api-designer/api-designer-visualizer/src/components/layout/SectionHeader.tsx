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
import { Typography } from '@wso2/ui-toolkit';

export interface SectionHeaderProps {
    title: string;
    count?: number;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    onToggle?: () => void;
    isCollapsed?: boolean;
    showToggle?: boolean;
    className?: string;
}

interface HeaderContainerProps {
    hasBorder?: boolean;
}

const HeaderContainer = styled.div<HeaderContainerProps>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: ${(props: HeaderContainerProps) => (props.hasBorder ? '12px' : '0')};
    margin-bottom: ${(props: HeaderContainerProps) => (props.hasBorder ? '12px' : '0')};
    border-bottom: ${(props: HeaderContainerProps) => 
        props.hasBorder ? '1px solid var(--vscode-panel-border)' : 'none'};
`;

interface HeaderLeftProps {
    clickable?: boolean;
}

const HeaderLeft = styled.div<HeaderLeftProps>`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    ${(props: HeaderLeftProps) => props.clickable ? `
        cursor: pointer;
        user-select: none;
        &:hover {
            opacity: 0.9;
        }
    ` : ''}
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

interface ToggleIconProps {
    isCollapsed: boolean;
}

const ToggleIcon = styled.span<ToggleIconProps>`
    display: inline-block;
    transition: transform 0.2s ease;
    transform: ${(props: ToggleIconProps) => (props.isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)')};
    font-size: 12px;
    color: var(--vscode-icon-foreground);
    opacity: 0.7;
`;

const Title = styled(Typography)`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    letter-spacing: 0.5px;
`;

const Count = styled.span`
    font-size: 11px;
    font-weight: 400;
    font-family: var(--vscode-font-family);
    color: var(--vscode-descriptionForeground);
    margin-left: 8px;
`;

const IconWrapper = styled.div`
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(59, 130, 246, 0.12);
    color: var(--vscode-textLink-foreground);
    display: flex;
    align-items: center;
    justify-content: center;
`;

export const SectionHeader: React.FC<SectionHeaderProps> = ({
    title,
    count,
    icon,
    actions,
    onToggle,
    isCollapsed = false,
    showToggle = false,
    className
}) => {
    const handleClick = () => {
        if (onToggle && showToggle) {
            onToggle();
        }
    };

    return (
        <HeaderContainer className={className} hasBorder={!!(title || actions)}>
            <HeaderLeft clickable={!!onToggle && showToggle} onClick={handleClick}>
                {showToggle && (
                    <ToggleIcon isCollapsed={isCollapsed}>
                        <span>▼</span>
                    </ToggleIcon>
                )}
                {icon && <IconWrapper>{icon}</IconWrapper>}
                <Title variant="body1">{title}</Title>
                {count !== undefined && <Count>({count})</Count>}
            </HeaderLeft>
            {actions && <HeaderRight>{actions}</HeaderRight>}
        </HeaderContainer>
    );
};

