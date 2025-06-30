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
import styled from '@emotion/styled';

interface DrawerContainerProps {
    isOpen: boolean;
    isSelected: boolean;
    sx?: any;
    width?: number;
    delayOpacityChange: boolean;
}

export interface DrawerItemProps {
    id?: string;
    isOpen: boolean;
    isSelected: boolean;
    width?: number;
    children?: React.ReactNode;
    sx?: any;
}

const DrawerContainer = styled.div<DrawerContainerProps>`
    position: absolute;
    width: fit-content;
    height: 100vh;
    top: 0;
    right: 0;
    transform: translateX(${(props: DrawerContainerProps) => (props.isOpen ? '0' : '100%')});
    z-index: ${(props: DrawerContainerProps) => (props.isSelected ? 1 : 0)};
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    box-shadow: 0 5px 10px 0 var(--vscode-badge-background);
    z-index: 2001;
    transition: transform 0.4s ease;
    opacity: ${(props: DrawerContainerProps) => props.delayOpacityChange ? (props.isOpen ? 1 : 0) : 1};
    ${(props: DrawerContainerProps) => props.sx};
`;

export const Drawer: React.FC<DrawerItemProps> = (props: DrawerItemProps) => {
    const { isSelected, id, isOpen, sx, children } = props;
    const [open, setOpen] = useState(false);
    const [delayOpacityChange, setDelayOpacityChange] = useState(true);
    useEffect(() => {
        setOpen(isOpen);
    }, [isOpen]);
    useEffect(() => {
        if (isOpen) {
            setOpen(true);
            setDelayOpacityChange(false);
        } else {
            setTimeout(() => {
                setOpen(false);
                setDelayOpacityChange(true);
            }, 400); // Delay matches transition duration
        }
    }, [isOpen]);
    return (
        <DrawerContainer id={id} isOpen={open} isSelected={isSelected} sx={sx} delayOpacityChange={delayOpacityChange}>
            {children}
        </DrawerContainer>
    );
};
