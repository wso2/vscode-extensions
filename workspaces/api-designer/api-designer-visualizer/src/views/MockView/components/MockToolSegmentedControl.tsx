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
import { MockServerTool } from '@wso2/api-designer-core';

const SegmentedControlContainer = styled.div`
    display: flex;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-dropdown-border);
    border-radius: 4px;
    padding: 2px;
    gap: 2px;
`;

interface SegmentProps {
    selected: boolean;
}

const Segment = styled.button<SegmentProps>`
    flex: 1;
    padding: 6px 12px;
    border: none;
    background: ${(props: SegmentProps) => 
        props.selected 
            ? 'var(--vscode-button-background)' 
            : 'transparent'
    };
    color: ${(props: SegmentProps) => 
        props.selected 
            ? 'var(--vscode-button-foreground)' 
            : 'var(--vscode-foreground)'
    };
    border-radius: 2px;
    font-size: 13px;
    font-weight: ${(props: SegmentProps) => props.selected ? '600' : '400'};
    cursor: pointer;
    transition: all 0.15s ease;
    
    &:hover {
        background: ${(props: SegmentProps) => 
            props.selected 
                ? 'var(--vscode-button-hoverBackground)' 
                : 'var(--vscode-list-hoverBackground)'
        };
    }
    
    &:focus {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: -1px;
    }
`;

interface MockToolSegmentedControlProps {
    selectedTool: MockServerTool;
    specType?: 'openapi' | 'asyncapi';
    onSelectTool: (tool: MockServerTool) => void;
}

export const MockToolSegmentedControl: React.FC<MockToolSegmentedControlProps> = ({
    selectedTool,
    specType = 'openapi',
    onSelectTool
}) => {
    // Get available tools based on spec type
    const availableTools = React.useMemo(() => {
        if (specType === 'asyncapi') {
            return [
                { tool: MockServerTool.MOKAPI, label: 'Mokapi' },
                { tool: MockServerTool.AI_GENERATED_JS, label: 'AI-Generated JS' }
            ];
        } else {
            return [
                { tool: MockServerTool.PRISM, label: 'Prism' },
                { tool: MockServerTool.AI_GENERATED_JS, label: 'AI-Generated JS' }
            ];
        }
    }, [specType]);

    return (
        <SegmentedControlContainer>
            {availableTools.map(({ tool, label }) => (
                <Segment
                    key={tool}
                    selected={selectedTool === tool}
                    onClick={() => onSelectTool(tool)}
                >
                    {label}
                </Segment>
            ))}
        </SegmentedControlContainer>
    );
};

