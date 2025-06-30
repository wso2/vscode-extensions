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

import React, { forwardRef } from 'react';
import styled from '@emotion/styled';
import { ActionButtonsProps } from './types/actionButton';
import { Button } from '../../../Button/Button';
import { Codicon } from '../../../Codicon/Codicon';
import { Icon } from '../../../Icon/Icon';

const ActionButtonsContainer = styled.div`
    position: absolute;
    top: -14px;
    right: 0;
    display: flex;
    gap: 4px;
`;

export const ActionButtons = forwardRef<HTMLDivElement, ActionButtonsProps>(
    ({ isHelperPaneOpen, actionButtons }, ref) => {
        return (
            <ActionButtonsContainer ref={ref}>
                {actionButtons.map((actBtn, index) => {
                    let icon: React.ReactNode;
                    if (actBtn.iconType === 'codicon') {
                        icon = (
                            <Codicon
                                key={index}
                                name={actBtn.name}
                                iconSx={{
                                    fontSize: '12px',
                                    color: 'var(--vscode-button-foreground)'
                                }}
                                sx={{ height: '14px', width: '16px' }}
                            />
                        );
                    } else {
                        icon = (
                            <Icon
                                key={index}
                                name={actBtn.name}
                                iconSx={{
                                    fontSize: '12px',
                                    color: 'var(--vscode-button-foreground)'
                                }}
                                sx={{ height: '14px', width: '16px' }}
                            />
                        );
                    }

                    return (
                        <Button
                            key={index}
                            tooltip={actBtn.tooltip}
                            onClick={actBtn.onClick}
                            appearance="icon"
                            sx={{
                                'vscode-button:hover': {
                                    backgroundColor: 'var(--button-primary-hover-background) !important'
                                }
                            }}
                            buttonSx={{
                                height: '16px',
                                width: '22px',
                                borderRadius: '2px',
                                backgroundColor: 'var(--vscode-button-background)',
                                ...(isHelperPaneOpen && {
                                    backgroundColor: 'var(--button-primary-hover-background)'
                                })
                            }}
                        >
                            {icon}
                        </Button>
                    );
                })}
            </ActionButtonsContainer>
        );
    }
);
ActionButtons.displayName = 'ActionButtons';
