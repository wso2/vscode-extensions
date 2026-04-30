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

import React from 'react';
import styled from '@emotion/styled';
import { Codicon } from '@wso2/ui-toolkit';
import { useAIAvailability } from '../../hooks/useAIAvailability';

const AIActionButton = styled.div<{ isAvailable: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-button-border);
    cursor: ${({ isAvailable }: { isAvailable: boolean }) => (isAvailable ? 'pointer' : 'not-allowed')};
    opacity: ${({ isAvailable }: { isAvailable: boolean }) => (isAvailable ? '1' : '0.5')};
    transition: opacity 0.2s ease;

    &:hover {
        opacity: ${({ isAvailable }: { isAvailable: boolean }) => (isAvailable ? '0.8' : '0.5')};
    }
`;

export interface AIButtonProps {
    /**
     * Click handler - only called if AI is available
     */
    onClick: (e: React.MouseEvent) => void;
    /**
     * Optional: Override AI availability check
     * If not provided, will automatically check using useAIAvailability hook
     * Useful when you need additional conditions (e.g., fileUri must exist)
     */
    isAvailable?: boolean;
    /**
     * Optional title/tooltip text when available
     * Defaults to "Edit with AI"
     */
    title?: string;
    /**
     * Optional label text
     * Defaults to "Edit with AI"
     */
    label?: string;
    /**
     * Optional custom styles
     */
    style?: React.CSSProperties;
    /**
     * Optional className
     */
    className?: string;
}

/**
 * Reusable AI button component that handles disabled state when AI is not available.
 * Uses generic terminology to support multiple AI providers in the future.
 * Automatically checks AI availability internally if isAvailable prop is not provided.
 */
export const AIButton: React.FC<AIButtonProps> = ({
    onClick,
    isAvailable: propIsAvailable,
    title,
    label = 'Edit with AI',
    style,
    className
}) => {
    const hookIsAvailable = useAIAvailability();
    const isAvailable = propIsAvailable !== undefined ? propIsAvailable : hookIsAvailable;

    const handleClick = (e: React.MouseEvent) => {
        if (!isAvailable) return;
        onClick(e);
    };

    const defaultTitle = title || label;
    const tooltip = isAvailable 
        ? defaultTitle 
        : 'Enable AI Chat to use this feature';

    return (
        <AIActionButton
            isAvailable={isAvailable}
            onClick={handleClick}
            className={className}
            style={style}
            title={tooltip}
        >
            <Codicon name="sparkle" sx={{ fontSize: '12px' }} />
            <span>{label}</span>
        </AIActionButton>
    );
};

