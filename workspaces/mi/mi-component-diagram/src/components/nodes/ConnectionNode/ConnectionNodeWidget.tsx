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

import React, { useState } from "react";
import styled from "@emotion/styled";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import { ConnectionNodeModel } from "./ConnectionNodeModel";
import {
    Colors,
    NODE_BORDER_WIDTH,
    CON_NODE_WIDTH,
    NEW_CONNECTION,
    CON_NODE_HEIGHT,
} from "../../../resources/constants";
import { Button, Item, Menu, MenuItem, Popover } from "@wso2/ui-toolkit";
import { useDiagramContext } from "../../DiagramContext";
import { DatabaseIcon, LinkIcon, PlusIcon } from "../../../resources";
import { MoreVertIcon } from "../../../resources/icons/nodes/MoreVertIcon";

export namespace NodeStyles {
    export type NodeStyleProp = {
        hovered: boolean;
        inactive?: boolean;
    };
    export const Node = styled.div<NodeStyleProp>`
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        /* width: ${CON_NODE_WIDTH}px; */
        height: ${CON_NODE_HEIGHT}px;
        color: ${Colors.ON_SURFACE};
        cursor: pointer;
    `;

    export const Header = styled.div`
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        gap: 6px;
        padding: 8px;
    `;

    export const Circle = styled.div<NodeStyleProp>`
        display: flex;
        justify-content: center;
        align-items: center;
        width: ${CON_NODE_HEIGHT}px;
        height: ${CON_NODE_HEIGHT}px;
        border: ${NODE_BORDER_WIDTH}px solid
            ${(props: NodeStyleProp) => (props.hovered ? Colors.PRIMARY : Colors.OUTLINE_VARIANT)};
        border-radius: 50%;
        background-color: ${Colors.SURFACE_DIM};
        color: ${Colors.ON_SURFACE};
    `;

    export const StyledButton = styled(Button)`
        border-radius: 5px;
        position: absolute;
        right: 6px;
    `;

    export const MenuButton = styled(Button)`
        border-radius: 5px;
    `;

    export const TopPortWidget = styled(PortWidget)`
        margin-top: -3px;
    `;

    export const BottomPortWidget = styled(PortWidget)`
        margin-bottom: -2px;
    `;

    export const StyledText = styled.div`
        font-size: 14px;
    `;

    export const Icon = styled.div`
        padding: 4px;
        svg {
            fill: ${Colors.ON_SURFACE};
        }
    `;

    export const Title = styled(StyledText) <NodeStyleProp>`
        max-width: ${CON_NODE_WIDTH - 50}px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: "GilmerMedium";
        color: ${(props: NodeStyleProp) => (props.hovered ? Colors.PRIMARY : Colors.ON_SURFACE)};
        opacity: ${(props: NodeStyleProp) => (props.inactive && !props.hovered ? 0.7 : 1)};
    `;

    export const Description = styled(StyledText)`
        font-size: 12px;
        max-width: ${CON_NODE_WIDTH - 80}px;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: monospace;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        color: ${Colors.ON_SURFACE};
        opacity: 0.7;
    `;

    export const Row = styled.div<NodeStyleProp>`
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
        gap: 6px;
        width: 100%;
        padding: 0 8px;
    `;

    export const Hr = styled.hr`
        width: 100%;
    `;
}

interface ConnectionNodeWidgetProps {
    model: ConnectionNodeModel;
    engine: DiagramEngine;
}

export interface NodeWidgetProps extends Omit<ConnectionNodeWidgetProps, "children"> { }

export function ConnectionNodeWidget(props: ConnectionNodeWidgetProps) {
    const { model, engine } = props;
    const [isHovered, setIsHovered] = React.useState(false);
    const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const isMenuOpen = Boolean(menuAnchorEl);

    const { onConnectionSelect, onDeleteComponent } = useDiagramContext();
    // TODO: fix this database icon hack with icon prop from node model
    const databaseNames = [
        "MySQL",
        "PostgreSQL",
        "Oracle",
        "SQL Server",
        "Redis",
        "Derby",
        "SQLite",
        "MongoDB",
        "MariaDB",
    ];
    const hasDatabaseName = databaseNames.some((name) => model.node.name.toLowerCase().includes(name.toLowerCase()));

    const handleOnMenuClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        event.stopPropagation();
        setMenuAnchorEl(event.currentTarget);
    };

    const handleOnMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const menuItems: Item[] = [
        { id: "view", label: "View", onClick: () => onConnectionSelect(model.node) },
        { id: "delete", label: "Delete", onClick: () => onDeleteComponent(model.node) }
    ];

    return (
        <NodeStyles.Node
            hovered={isHovered}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onConnectionSelect(model.node)}
        >
            <NodeStyles.TopPortWidget port={model.getPort("in")!} engine={engine} />
            <NodeStyles.Row hovered={isHovered}>
                <NodeStyles.Circle hovered={isHovered}>
                    <NodeStyles.Icon>{hasDatabaseName ? <DatabaseIcon /> : <LinkIcon />}</NodeStyles.Icon>
                </NodeStyles.Circle>
                <NodeStyles.Header>
                    <NodeStyles.Title hovered={isHovered}>{model.node.name}</NodeStyles.Title>
                    {<NodeStyles.Description>Connection</NodeStyles.Description>}
                </NodeStyles.Header>
                <NodeStyles.MenuButton appearance="icon" onClick={handleOnMenuClick}>
                    <MoreVertIcon />
                </NodeStyles.MenuButton>
            </NodeStyles.Row>
            <Popover
                open={isMenuOpen}
                anchorEl={menuAnchorEl}
                handleClose={handleOnMenuClose}
                sx={{
                    padding: 0,
                    borderRadius: 0,
                }}
            >
                <Menu>
                    {menuItems.map((item) => (
                        <MenuItem key={item.id} item={item} />
                    ))}
                </Menu>
            </Popover>
            <NodeStyles.BottomPortWidget port={model.getPort("out")!} engine={engine} />
        </NodeStyles.Node>
    );
}
