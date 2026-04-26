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
import { SpecTypeBadge } from '../../../../components/common/SpecTypeBadge';

export interface AIReadinessData {
    score?: number;
    maxScore?: number;
}


export interface APIHeaderProps {
    title?: string;
    description?: string;
    version?: string;
    openApiVersion?: string;
    specType?: 'openapi';
    onEditClick?: () => void;
    readOnly?: boolean;
    showDescription?: boolean;
    aiReadinessScore?: AIReadinessData | null;
    fileUri?: string;
    onBackClick?: () => void;
    backButtonLabel?: string;
}

const HeaderContainer = styled.div`
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--vscode-panel-border);
    padding: 20px 32px 16px 32px;
`;

const HeaderContent = styled.div`
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    width: 100%;
    gap: 16px;
`;

const HeaderLeft = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
`;

const BackButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 26px;
    width: fit-content;
    margin-bottom: 8px;
    padding: 0 10px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-editorWidget-background);
    color: var(--vscode-foreground);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 120ms ease, background 120ms ease;

    &:hover {
        border-color: var(--vscode-focusBorder);
        background: var(--vscode-list-hoverBackground);
    }

    &:focus-visible {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: 1px;
    }
`;

const TitleRow = styled.div`
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 6px;
    flex-wrap: wrap;
    row-gap: 6px;
    min-width: 0;
    width: 100%;
`;

const Title = styled.h1`
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
    line-height: 24px;
    letter-spacing: -0.01em;
    flex: 0 1 auto;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const BadgeContainer = styled.div`
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
    row-gap: 4px;
    flex: 0 1 auto;
    min-width: 0;
`;

const PrimaryBadges = styled.div`
    display: flex;
    gap: 6px;
    align-items: center;
    flex-shrink: 0;
`;

const VersionBadge = styled.span`
    display: inline-block;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 500;
    font-family: var(--vscode-font-family);
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 3px;
    white-space: nowrap;
    line-height: 16px;
    vertical-align: super;
    transform: translateY(-2px);
    flex-shrink: 0;
`;

const OpenAPIBadge = styled.span`
    display: inline-block;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 500;
    font-family: var(--vscode-font-family);
    background: var(--vscode-inputOption-activeBackground);
    color: var(--vscode-inputOption-activeForeground);
    border: 1px solid var(--vscode-inputOption-activeBorder);
    border-radius: 3px;
    white-space: nowrap;
    line-height: 16px;
    vertical-align: super;
    transform: translateY(-2px);
    flex-shrink: 0;
`;

const EditButtonWrapper = styled.div`
    opacity: 0.7;
    transition: opacity 0.2s ease;
    display: inline-flex;
    margin-right: 8px;
    flex-shrink: 0;
    
    &:hover {
        opacity: 1;
    }
`;

const Description = styled.p`
    margin: 0;
    font-size: 13px;
    font-family: var(--vscode-font-family);
    color: var(--vscode-descriptionForeground);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    max-height: calc(1.5em * 2);
`;

export const APIHeader: React.FC<APIHeaderProps> = ({
    title,
    description,
    version,
    openApiVersion,
    specType,
    onEditClick,
    readOnly = false,
    showDescription = true,
    onBackClick,
    backButtonLabel = 'Back to Design'
}) => {
    return (
        <HeaderContainer>
            <HeaderContent>
                <HeaderLeft>
                    {onBackClick && (
                        <BackButton onClick={onBackClick}>
                            <Codicon name="arrow-left" sx={{ fontSize: '13px' }} />
                            {backButtonLabel}
                        </BackButton>
                    )}
                    <TitleRow>
                        <Title>{title || 'Untitled API'}</Title>
                        <BadgeContainer>
                            <PrimaryBadges>
                                {specType && openApiVersion && (
                                    <SpecTypeBadge specType={specType} version={openApiVersion} />
                                )}
                                <VersionBadge>v{version || '1.0.0'}</VersionBadge>
                                {!readOnly && onEditClick && (
                                    <EditButtonWrapper>
                                        <Button
                                            appearance="icon"
                                            onClick={onEditClick}
                                            tooltip="Edit API Info"
                                        >
                                            <Codicon name="edit" sx={{ fontSize: '14px' }} />
                                        </Button>
                                    </EditButtonWrapper>
                                )}
                            </PrimaryBadges>
                        </BadgeContainer>
                    </TitleRow>
                    {showDescription && description && (
                        <Description title={description}>{description}</Description>
                    )}
                </HeaderLeft>
            </HeaderContent>
        </HeaderContainer>
    );
};
