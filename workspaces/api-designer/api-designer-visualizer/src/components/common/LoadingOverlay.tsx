/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { Typography } from '@wso2/ui-toolkit';

interface LoadingOverlayProps {
    message?: string;
    fullScreen?: boolean;
}

const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

const OverlayContainer = styled.div<{ fullScreen: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    ${({ fullScreen }: { fullScreen: boolean }) =>
        fullScreen
            ? `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: var(--vscode-editor-background);
                z-index: 1000;
            `
            : `
                padding: 48px;
                color: var(--vscode-descriptionForeground);
            `}
`;

const SpinnerWrap = styled.div`
    width: 32px;
    height: 32px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const SpinnerSvg = styled.svg`
    width: 32px;
    height: 32px;
    animation: ${spin} 1s linear infinite;
`;

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
    message = 'Processing...',
    fullScreen = false
}) => {
    return (
        <OverlayContainer fullScreen={fullScreen}>
                <SpinnerWrap>
                    <SpinnerSvg
                        width="32"
                        height="32"
                        viewBox="0 0 32 32"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <circle
                            cx="16"
                            cy="16"
                            r="14"
                            fill="none"
                            stroke="var(--vscode-icon-foreground)"
                            strokeWidth="2"
                            strokeOpacity="0.2"
                        />
                        <circle
                            cx="16"
                            cy="16"
                            r="14"
                            fill="none"
                            stroke="var(--vscode-icon-foreground)"
                            strokeWidth="2"
                            strokeDasharray="22 66"
                            strokeDashoffset="0"
                            strokeLinecap="round"
                            strokeOpacity="0.8"
                        />
                    </SpinnerSvg>
                </SpinnerWrap>
                <Typography 
                    variant="body1"
                    sx={{
                        fontSize: '13px',
                        color: 'var(--vscode-descriptionForeground)',
                        textAlign: 'center'
                    }}
                >
                    {message}
                </Typography>
            </OverlayContainer>
    );
};
