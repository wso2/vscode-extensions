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

import React, { useEffect, useState } from 'react';
import { Button } from '../Button/Button';
import { Typography } from '../Typography/Typography';
import { Codicon } from '../Codicon/Codicon';
import styled from '@emotion/styled';

interface FormViewProps {
    title: string;
    children: React.ReactNode;
    onClose: () => void; // Added onClose prop
    hideClose?: boolean;
    maxWidth?: string;
    sx?: any;
}

interface FormViewContainerProps {
    sx?: any;
}

const FormViewContainer = styled.div<FormViewContainerProps & { className?: string }>`
    overflow-y: auto;
    overflow-x: hidden;
    height: -webkit-fill-available;
    max-height: ${(props: FormViewProps) => !props.hideClose ? 'calc(100vh - 22px)' : 'fit-content'};
    ${(props: FormViewContainerProps) => props.sx};
`;

export const FormView: React.FC<FormViewProps> = ({ title, children, onClose, hideClose, sx, maxWidth }) => {
    const [isScrolling, setIsScrolling] = useState(false);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (e.currentTarget.scrollTop > 0) {
            setIsScrolling(true);
        } else {
            setIsScrolling(false);
        }
    };

    return (
        <FormViewContainer onScroll={handleScroll} className="form-view" sx={sx}>
            <div style={{ maxWidth: maxWidth ?? '52em', margin: '0 auto' }}>
                <div style={{ margin: '0 15px' }}>
                    <div style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        backgroundColor: 'var(--background)',
                        boxShadow: isScrolling ? '0 4px 2px -2px rgba(0,0,0,0.2)' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <Typography variant="h2" sx={{ flexGrow: 1 }}>{title}</Typography>
                        {!hideClose &&
                            <Button appearance="icon" onClick={onClose} tooltip="Close">
                                <Codicon name='close' />
                            </Button>
                        }
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {children}
                    </div>
                </div>
            </div>
        </FormViewContainer>
    );
};

interface FormActionsProps {
    children?: React.ReactNode;
    sx?: any;
}

export const FormActions: React.FC<FormActionsProps> = ({ children, sx }) => {
    return (
        <div className="form-actions" style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            position: 'sticky',
            bottom: 0,
            zIndex: 1,
            backgroundColor: 'var(--background)',
            padding: '10px 0px',
            ...sx,
        }}>
            {children}
        </div>
    );
};
interface FormGroupProps {
    title: string;
    children?: React.ReactNode;
    isCollapsed?: boolean;
    disableCollapse?: boolean;
    onToggle?: (collapsed: boolean) => void;
    sx?: any;
}

export const FormGroup: React.FC<FormGroupProps> = ({ title, children, isCollapsed = true, disableCollapse = false, sx, onToggle }) => {
    const [collapsed, setCollapsed] = useState(isCollapsed && !disableCollapse);
    
    useEffect(() => {
        setCollapsed(isCollapsed && !disableCollapse);
    }, [isCollapsed, disableCollapse]);

    const toggleCollapse = () => {
        if (onToggle) {
            onToggle(!collapsed);
        }
        setCollapsed(!collapsed);
    }

    return (
        <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={toggleCollapse}>
                <Typography variant="h3" sx={{ margin: '0px' }}>{title}</Typography>
                <hr style={{ flexGrow: 1, margin: '0 10px', borderColor: 'var(--vscode-editorIndentGuide-background)' }} />
                {!disableCollapse &&
                    <Button appearance="icon" tooltip={collapsed ? 'Expand' : 'Collapse'}>
                        <Codicon name={collapsed ? 'chevron-down' : 'chevron-up'} />
                    </Button>
                }
            </div>
            {!collapsed &&
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '15px 15px 25px 15px', ...sx }}>
                    {children}
                </div>
            }
        </div>
    );
};