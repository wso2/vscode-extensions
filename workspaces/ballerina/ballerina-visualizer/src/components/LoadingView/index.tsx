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
import { ProgressRing, ThemeColors } from '@wso2/ui-toolkit';

interface LoadingContainerProps {
    fullHeight?: boolean;
}

const LoadingContainer = styled.div<LoadingContainerProps>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: ${(props: LoadingContainerProps) => props.fullHeight ? '100vh' : '100%'};
    min-height: 200px;
`;

const LoadingText = styled.div`
    margin-top: 16px;
    color: var(--vscode-descriptionForeground);
    font-size: 14px;
`;

interface LoadingViewProps {
    message?: string;
    fullHeight?: boolean;
}

export function LoadingView({ message = 'Loading...', fullHeight = false }: LoadingViewProps) {
    return (
        <LoadingContainer fullHeight={fullHeight}>
             <ProgressRing color={ThemeColors.PRIMARY} />
            <LoadingText>{message}</LoadingText>
        </LoadingContainer>
    );
} 
