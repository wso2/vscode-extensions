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

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Button, Badge, Codicon } from '@wso2/ui-toolkit';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';
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
    specType?: 'openapi' | 'asyncapi'; // NEW: Spec type for badge display
    onEditClick?: () => void;
    readOnly?: boolean;
    showDescription?: boolean;
    aiReadinessScore?: AIReadinessData | null;
    fileUri?: string;
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
    max-width: 1200px;
    margin: 0 auto;
    gap: 16px;
`;

const HeaderLeft = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    width: 25%;
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

const AIReadinessBadge = styled.div<{ bgColor: string; borderColor: string }>`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 8px 14px;
    border-radius: 8px;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-sizing: border-box;
    position: relative;
    background: ${(props: { bgColor: string }) => props.bgColor};
    border: 1.5px solid ${(props: { borderColor: string }) => props.borderColor};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    width: 100%;
    height: 56px;
    overflow: hidden;
    
    &:hover {
        border-color: ${(props: { borderColor: string }) => props.borderColor};
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
    }
    
    &:active {
        transform: translateY(0);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
`;

const AIReadinessIcon = styled.div<{ bgColor: string; iconColor: string }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: ${(props: { bgColor: string }) => props.bgColor};
    flex-shrink: 0;
    position: relative;
    
    &::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 8px;
        padding: 2px;
        background: linear-gradient(135deg, ${(props: { iconColor: string }) => props.iconColor}, transparent);
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        opacity: 0.3;
    }
`;

const CircularProgressWrapper = styled.div`
    width: 40px;
    height: 40px;
    position: relative;
    flex-shrink: 0;
`;

const CircularProgressSVG = styled.svg`
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
`;

const CircularProgressTrack = styled.circle`
    fill: none;
    stroke: var(--vscode-panel-border);
    stroke-width: 2.5;
    opacity: 0.2;
`;

const CircularProgressBar = styled.circle<{ color: string; dashOffset: number }>`
    fill: none;
    stroke: ${(props: { color: string }) => props.color};
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-dasharray: 106.81;
    stroke-dashoffset: ${(props: { dashOffset: number }) => props.dashOffset};
    transition: stroke-dashoffset 0.5s ease;
`;

const ProgressValue = styled.div<{ color: string }>`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 10px;
    font-weight: 700;
    color: ${(props: { color: string }) => props.color};
    line-height: 1;
    text-align: center;
`;

const AIReadinessContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    flex: 1;
    overflow: hidden;
`;

const AIReadinessValue = styled.div<{ color: string }>`
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.3;
    color: ${(props: { color: string }) => props.color};
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
`;

const AIReadinessDescription = styled.div`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.3;
    opacity: 0.85;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
`;

const ArrowIcon = styled.div<{ isHovered: boolean; color: string }>`
    display: flex;
    align-items: center;
    opacity: ${(props: { isHovered: boolean }) => props.isHovered ? '1' : '0.5'};
    flex-shrink: 0;
    color: ${(props: { color: string }) => props.color};
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    transform: ${(props: { isHovered: boolean }) => props.isHovered ? 'translateX(3px)' : 'translateX(0)'};
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

/** Same thresholds and hex values as Analyze `AIReadinessDashboard` `getScoreColor`. */
const scoreToAccentHex = (score: number): string => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
};

const hexToRgba = (hex: string, alpha: number): string => {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getAiReadinessCardPresentation = (
    readiness: number | null | undefined
): { color: string; bg: string; border: string; label: string; description: string } => {
    if (readiness === null || readiness === undefined) {
        const color = '#60a5fa';
        return {
            color,
            bg: hexToRgba(color, 0.12),
            border: hexToRgba(color, 0.4),
            label: 'Not analyzed',
            description: 'Click to analyze AI readiness'
        };
    }
    const color = scoreToAccentHex(readiness);
    let description: string;
    if (readiness >= 90) {
        description = 'Excellent — ready for AI integration';
    } else if (readiness >= 75) {
        description = 'Good — solid foundation for AI usage';
    } else if (readiness >= 50) {
        description = 'Fair — improvements recommended';
    } else {
        description = 'Poor — major improvements required';
    }
    return {
        color,
        bg: hexToRgba(color, 0.12),
        border: hexToRgba(color, 0.4),
        label: `${readiness}% AI Ready`,
        description
    };
};

export const APIHeader: React.FC<APIHeaderProps> = ({
    title,
    description,
    version,
    openApiVersion,
    specType,
    onEditClick,
    readOnly = false,
    showDescription = true,
    aiReadinessScore,
    fileUri
}) => {
    const readiness = aiReadinessScore?.score ?? null;
    const readinessPresentation = getAiReadinessCardPresentation(readiness);
    const [isHovered, setIsHovered] = useState(false);

    const handleNavigateToAnalyze = () => {
        postVSCodeMessage({
            command: 'switchView',
            viewType: 'analyze',
            fileUri: fileUri
        });
    };

    return (
        <HeaderContainer>
            <HeaderContent>
                <HeaderLeft>
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
                {aiReadinessScore !== null && aiReadinessScore !== undefined && (
                    <HeaderRight>
                        <AIReadinessBadge
                            onClick={handleNavigateToAnalyze}
                            title="Click to view detailed AI readiness analysis"
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            bgColor={readinessPresentation.bg}
                            borderColor={readinessPresentation.border}
                        >
                            {readiness !== null && readiness !== undefined ? (
                                <CircularProgressWrapper>
                                    <CircularProgressSVG viewBox="0 0 38 38">
                                        <CircularProgressTrack cx="19" cy="19" r="17" />
                                        <CircularProgressBar 
                                            cx="19" 
                                            cy="19" 
                                            r="17" 
                                            color={readinessPresentation.color}
                                            dashOffset={2 * Math.PI * 17 * (1 - readiness / 100)}
                                        />
                                    </CircularProgressSVG>
                                    <ProgressValue color={readinessPresentation.color}>
                                        {readiness}%
                                    </ProgressValue>
                                </CircularProgressWrapper>
                            ) : (
                                <AIReadinessIcon bgColor={readinessPresentation.bg} iconColor={readinessPresentation.color}>
                                    <Codicon name="circuit-board" sx={{ fontSize: '16px', color: readinessPresentation.color }} />
                                </AIReadinessIcon>
                            )}
                            <AIReadinessContent>
                                <AIReadinessValue color={readinessPresentation.color}>
                                    {readinessPresentation.label}
                                </AIReadinessValue>
                                <AIReadinessDescription>
                                    {readinessPresentation.description}
                                </AIReadinessDescription>
                            </AIReadinessContent>
                            <ArrowIcon isHovered={isHovered} color={readinessPresentation.color}>
                                <Codicon name="chevron-right" sx={{ fontSize: '16px' }} />
                            </ArrowIcon>
                        </AIReadinessBadge>
                    </HeaderRight>
                )}
            </HeaderContent>
        </HeaderContainer>
    );
};
