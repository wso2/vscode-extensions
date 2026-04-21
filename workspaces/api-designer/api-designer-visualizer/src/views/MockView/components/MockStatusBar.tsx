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
import { Badge, Button, Codicon } from '@wso2/ui-toolkit';
import { MockServerStatus } from '@wso2/api-designer-core';

interface StatusBarContainerProps {
    isRunning: boolean;
}

const StatusBarContainer = styled.div<StatusBarContainerProps>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: ${(props: StatusBarContainerProps) =>
        props.isRunning
            ? 'rgba(16, 185, 129, 0.12)'
            : 'var(--vscode-editorWidget-background)'};
    border: ${(props: StatusBarContainerProps) =>
        props.isRunning
            ? '1.5px solid rgba(16, 185, 129, 0.4)'
            : '1px solid var(--vscode-panel-border)'};
    border-radius: 8px;
    margin-bottom: 16px;
    position: relative;
    overflow: hidden;
    box-shadow: ${(props: StatusBarContainerProps) =>
        props.isRunning
            ? '0 2px 12px rgba(16, 185, 129, 0.12)'
            : 'none'};

    ${(props: StatusBarContainerProps) =>
        props.isRunning &&
        `
        &::before {
            content: '';
            position: absolute;
            top: -40px;
            left: -40px;
            width: 180px;
            height: 180px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.06) 40%, transparent 70%);
            pointer-events: none;
        }

        &::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, rgba(16, 185, 129, 0.7) 0%, rgba(16, 185, 129, 0.2) 60%, transparent 100%);
            pointer-events: none;
        }
    `}
`;

const StatusLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

interface StatusTextProps {
    isRunning: boolean;
}

const StatusText = styled.div<StatusTextProps>`
    font-size: 13px;
    font-weight: 600;
    color: ${(props: StatusTextProps) =>
        props.isRunning
            ? '#10b981'
            : 'var(--vscode-foreground)'};
`;

const StatusBadge = styled(Badge)`
    font-size: 11px;
    padding: 2px 8px;
`;

const StatusRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const StatusUrl = styled.span<{ isRunning: boolean }>`
    font-size: 12px;
    color: ${({ isRunning }: { isRunning: boolean }) =>
        isRunning ? 'var(--vscode-foreground)' : 'var(--vscode-descriptionForeground)'};
    opacity: 0.9;
`;

interface MockStatusBarProps {
    status: MockServerStatus;
    onStop?: () => void;
    onRefresh?: () => void;
}

export const MockStatusBar: React.FC<MockStatusBarProps> = ({
    status,
    onStop,
    onRefresh
}) => {
    const getStatusMessage = () => {
        if (status.state === 'pulling-image') {
            return 'Pulling Docker image...';
        }
        if (status.state === 'container-starting' || status.state === 'app-starting') {
            return 'Starting...';
        }
        if (status.state === 'failed') {
            return 'Failed to start';
        }
        if (status.isRunning) {
            return status.message || 'Mock server running';
        }
        return 'Mock server is not running';
    };

    return (
        <StatusBarContainer isRunning={status.isRunning}>
            <StatusLeft>
                <StatusText isRunning={status.isRunning}>
                    {getStatusMessage()}
                </StatusText>
                {status.isRunning && (
                    <StatusBadge color="#10b981">
                        Live
                    </StatusBadge>
                )}
                {status.url && (
                    <StatusUrl isRunning={status.isRunning}>
                        {status.url}
                    </StatusUrl>
                )}
            </StatusLeft>
            <StatusRight>
                {status.isRunning && (
                    <>
                        {onRefresh && (
                            <Button
                                appearance="icon"
                                onClick={onRefresh}
                                tooltip="Refresh Status"
                            >
                                <Codicon name="refresh" />
                            </Button>
                        )}
                        {onStop && (
                            <Button
                                appearance="secondary"
                                onClick={onStop}
                            >
                                <Codicon name="debug-stop" sx={{ marginRight: 6 }} />
                                Stop
                            </Button>
                        )}
                    </>
                )}
            </StatusRight>
        </StatusBarContainer>
    );
};
