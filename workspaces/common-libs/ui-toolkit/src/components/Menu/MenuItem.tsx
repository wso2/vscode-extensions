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
import React from "react";
import styled from "@emotion/styled";
import { Item } from "./Menu";

export interface MenuItemProps {
    item: Item;
    sx?: any;
    onClick?: (event?: React.MouseEvent<HTMLElement, MouseEvent>) => void;
}

interface ContainerProps {
    sx: any;
}

const Container = styled.div<ContainerProps>`
    text-align: left;
    display: flex;
    align-items: center;
    padding: 6px 10px;
    cursor: pointer;
    &:hover, &.active {
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
    };
    ${(props: ContainerProps) => props.sx};
`;

export const MenuItem: React.FC<MenuItemProps> = (props: MenuItemProps) => {
    const { sx, item, onClick } = props;

    const handleItemClick = (event?: React.MouseEvent<HTMLElement, MouseEvent>) => {
        if (item?.onClick) {
            event.stopPropagation();
            item.onClick();
        }
        if (onClick) {
            onClick(event);
        }
    }

    return (
        <Container
            key={item.id}
            onClick={handleItemClick}
            sx={sx}
            id={`menu-item-${item.id}`}
        >
            {item.label}
        </Container>
    );
};
