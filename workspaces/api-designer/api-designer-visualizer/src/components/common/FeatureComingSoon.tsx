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

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    box-sizing: border-box;
    overflow: hidden;
    color: var(--vscode-descriptionForeground);
    padding: 24px;
    text-align: center;
    background: var(--vscode-editor-background);
`;

const Title = styled.h3`
    color: var(--vscode-foreground);
    margin: 16px 0 8px;
    font-weight: 500;
    font-size: 18px;
`;

const Message = styled.p`
    opacity: 0.8;
    max-width: 400px;
    line-height: 1.5;
    font-size: 13px;
`;

const IconWrap = styled.div`
    padding: 20px;
    border-radius: 50%;
    background: var(--vscode-textBlockQuote-background);
    margin-bottom: 8px;
`;

interface FeatureComingSoonProps {
    featureName?: string;
    description?: string;
}

export const FeatureComingSoon: React.FC<FeatureComingSoonProps> = ({ 
    featureName = "Feature", 
    description = "Support for AsyncAPI specifications in this view is currently under development." 
}) => {
    return (
        <Container>
            <IconWrap>
                <Codicon name="beaker" sx={{ fontSize: 32, color: 'var(--vscode-textLink-foreground)' }} />
            </IconWrap>
            <Title>{featureName}</Title>
            <Message>{description}</Message>
        </Container>
    );
};
