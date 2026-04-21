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

const Badge = styled.div<{ specType: 'openapi' | 'asyncapi' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    background: ${(props: { specType: 'openapi' | 'asyncapi' }) => props.specType === 'openapi' 
        ? 'rgba(59, 130, 246, 0.15)' 
        : 'rgba(168, 85, 247, 0.15)'};
    color: ${(props: { specType: 'openapi' | 'asyncapi' }) => props.specType === 'openapi'
        ? 'rgb(96, 165, 250)'
        : 'rgb(192, 132, 252)'};
    border: 1px solid ${(props: { specType: 'openapi' | 'asyncapi' }) => props.specType === 'openapi'
        ? 'rgba(59, 130, 246, 0.3)'
        : 'rgba(168, 85, 247, 0.3)'};
`;

const IconWrapper = styled.span`
    display: flex;
    align-items: center;
    font-size: 14px;
`;

interface SpecTypeBadgeProps {
    specType: 'openapi' | 'asyncapi';
    showIcon?: boolean;
    version?: string;
}

export const SpecTypeBadge: React.FC<SpecTypeBadgeProps> = ({ specType, showIcon = true, version }) => {
    const displayText = specType === 'openapi' ? 'OpenAPI' : 'AsyncAPI';
    const fullText = version ? `${displayText} ${version}` : displayText;
    
    return (
        <Badge specType={specType}>
            {showIcon && (
                <IconWrapper>
                    <Codicon name={specType === 'openapi' ? 'symbol-interface' : 'symbol-event'} />
                </IconWrapper>
            )}
            <span>{fullText}</span>
        </Badge>
    );
};

