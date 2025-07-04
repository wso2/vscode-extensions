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
import styled from "@emotion/styled";
import React, { PropsWithChildren } from "react";

export interface Item {
    id: number | string;
    label: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
}
export interface MenuProps {
    menuItems?: Item[];
    id?: string;
    sx?: any;
}

interface ContainerProps {
    sx?: any;
}

const Container = styled.div<ContainerProps>`
    display: flex;
    flex-direction: column;
    background-color: var(--vscode-list-activeSelectionForeground);
    box-shadow: var(--vscode-widget-shadow) 0px 4px 10px;
    padding: 8px 0;
    border: 1px solid var(--vscode-editor-lineHighlightBorder);
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    ${(props: ContainerProps) => props.sx};
`;

export const Menu: React.FC<PropsWithChildren<MenuProps>> = (props: PropsWithChildren<MenuProps>) => {
    const { children, sx, id } = props;

    return (
        <Container id={id} sx={sx}>
            {children}
        </Container>
    );
};

