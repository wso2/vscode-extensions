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
import { Button, Typography } from '@wso2/ui-toolkit';

const ToolTypePage = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    width: 100%;
    text-align: center;
`;

const ToolTypePageCards = styled.div`
    display: flex;
    gap: 20px;
`;

const ToolTypePageCard = styled.div`
    flex: 1;
    padding: 32px 24px;
    border: 2px solid var(--vscode-panel-border);
    border-radius: 10px;
    cursor: pointer;
    text-align: center;
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
    &:hover {
        border-color: var(--vscode-focusBorder);
        background: var(--vscode-list-hoverBackground);
        transform: translateY(-2px);
    }
`;

interface ToolTypeSelectorProps {
    onSelectFromAPIs: () => void;
    onSelectFromSequences: () => void;
    onSelectNewTool: () => void;
    onCancel: () => void;
}

export function ToolTypeSelector({
    onSelectFromAPIs,
    onSelectFromSequences,
    onSelectNewTool,
    onCancel,
}: ToolTypeSelectorProps) {
    return (
        <ToolTypePage>
            <div>
                <Typography variant="h2" sx={{ marginBottom: '8px' }}>Select Tool Type</Typography>
                <Typography variant="body2" sx={{ color: 'var(--vscode-descriptionForeground)' }}>
                    Choose how you want to expose functionality as an MCP tool.
                </Typography>
            </div>

            <ToolTypePageCards>
                <ToolTypePageCard onClick={onSelectFromAPIs}>
                    <Typography variant="h3" sx={{ fontWeight: 600, marginBottom: '8px' }}>From APIs</Typography>
                    <Typography variant="body2" sx={{ fontSize: '13px', color: 'var(--vscode-descriptionForeground)', lineHeight: 1.5 }}>
                        Expose an API operation as a tool. Select from existing REST API
                        resources defined in this project.
                    </Typography>
                </ToolTypePageCard>

                <ToolTypePageCard onClick={onSelectFromSequences}>
                    <Typography variant="h3" sx={{ fontWeight: 600, marginBottom: '8px' }}>From Sequences</Typography>
                    <Typography variant="body2" sx={{ fontSize: '13px', color: 'var(--vscode-descriptionForeground)', lineHeight: 1.5 }}>
                        Expose a mediation sequence as a tool. Select from existing
                        sequences defined in this project.
                    </Typography>
                </ToolTypePageCard>

                <ToolTypePageCard onClick={onSelectNewTool}>
                    <Typography variant="h3" sx={{ fontWeight: 600, marginBottom: '8px' }}>New Tool</Typography>
                    <Typography variant="body2" sx={{ fontSize: '13px', color: 'var(--vscode-descriptionForeground)', lineHeight: 1.5 }}>
                        Create a tool from scratch.
                    </Typography>
                </ToolTypePageCard>
            </ToolTypePageCards>

            <Button appearance="secondary" onClick={onCancel} sx={{ alignSelf: 'flex-start', padding: '6px 14px', fontSize: '13px' }}>
                ← Back
            </Button>
        </ToolTypePage>
    );
}
