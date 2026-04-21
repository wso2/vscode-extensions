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

export interface ValidationData {
    errorCount?: number;
    warningCount?: number;
    errors?: Array<{ path: string[]; message: string }>;
    warnings?: Array<{ path: string[]; message: string }>;
}

export interface ValidationStatusBarProps {
    validationData?: ValidationData | null;
    onViewAll?: (type: 'error' | 'warning') => void;
}

const StatusBarContainer = styled.div`
    padding: 12px 0 0 0;
    margin: 0 0 16px 0;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
`;

const ValidationBadge = styled.div<{ type: 'error' | 'warning' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    
    background: ${(props: { type: 'error' | 'warning' }) => props.type === 'error' 
        ? 'rgba(239, 68, 68, 0.12)' 
        : 'rgba(245, 158, 11, 0.12)'};
    color: ${(props: { type: 'error' | 'warning' }) => props.type === 'error' ? '#ef4444' : '#f59e0b'};
    border: 1px solid ${(props: { type: 'error' | 'warning' }) => props.type === 'error' 
        ? 'rgba(239, 68, 68, 0.4)' 
        : 'rgba(245, 158, 11, 0.4)'};
    
    &:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }
    
    &:active {
        transform: translateY(0);
    }
`;

export const ValidationStatusBar: React.FC<ValidationStatusBarProps> = ({
    validationData,
    onViewAll
}) => {
    const errors = validationData?.errorCount ?? 0;
    const warnings = validationData?.warningCount ?? 0;
    const hasIssues = errors > 0 || warnings > 0;

    if (!hasIssues) {
        return null;
    }

    const handleBadgeClick = (type: 'error' | 'warning') => {
        if (onViewAll) {
            onViewAll(type);
        }
    };

    return (
        <StatusBarContainer>
            {errors > 0 && (
                <ValidationBadge
                    type="error"
                    onClick={() => handleBadgeClick('error')}
                    title={`${errors} validation error${errors !== 1 ? 's' : ''}. Click to view details.`}
                >
                    <Codicon name="error" sx={{ fontSize: '13px' }} />
                    <span>{errors} {errors === 1 ? 'error' : 'errors'}</span>
                </ValidationBadge>
            )}
            {warnings > 0 && (
                <ValidationBadge
                    type="warning"
                    onClick={() => handleBadgeClick('warning')}
                    title={`${warnings} validation warning${warnings !== 1 ? 's' : ''}. Click to view details.`}
                >
                    <Codicon name="warning" sx={{ fontSize: '13px' }} />
                    <span>{warnings} {warnings === 1 ? 'warning' : 'warnings'}</span>
                </ValidationBadge>
            )}
        </StatusBarContainer>
    );
};

