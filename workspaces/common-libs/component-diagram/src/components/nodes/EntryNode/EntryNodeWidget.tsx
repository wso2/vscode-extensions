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
import { EntryNodeModel } from "./EntryNodeModel";
import { Colors, NODE_BORDER_WIDTH, ENTRY_NODE_WIDTH, ENTRY_NODE_HEIGHT } from "../../../resources/constants";
import { Button, Item, Menu, MenuItem, Popover, ImageWithFallback } from "@wso2/ui-toolkit";
import { useDiagramContext } from "../../DiagramContext";
import { HttpIcon, TaskIcon } from "../../../resources";
import { MoreVertIcon } from "../../../resources/icons/nodes/MoreVertIcon";
import { CDAutomation, CDFunction, CDService, CDResourceFunction } from "@wso2/ballerina-core";
import { getEntryNodeFunctionPortName } from "../../../utils/diagram";
export namespace NodeStyles {
    export type NodeStyleProp = {
        hovered: boolean;
        inactive?: boolean;
    };
    export const Node = styled.div`
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        color: ${Colors.ON_SURFACE};
    `;

    export const Header = styled.div<NodeStyleProp>`
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        gap: 6px;
        width: 100%;
        cursor: pointer;
    `;

    export const StyledButton = styled(Button)`
        border-radius: 5px;
        position: absolute;
        right: 6px;
    `;

    export const TopPortWidget = styled(PortWidget)`
        margin-top: -3px;
    `;

    export const BottomPortWidget = styled(PortWidget)`
        margin-bottom: -2px;
    `;

    export const FunctionPortWidget = styled(PortWidget)`
        /* width: 8px;
        height: 8px;
        background-color: ${Colors.PRIMARY};
        border-radius: 50%;
        margin-left: -5px; */
    `;

    export const StyledText = styled.div`
        font-size: 14px;
    `;

    export const Icon = styled.div`
        padding: 4px;
        max-width: 32px;
        svg {
            fill: ${Colors.ON_SURFACE};
        }
        > div:first-child {
            width: 32px;
            height: 32px;
            font-size: 28px;
        }
    `;

    export const Title = styled(StyledText)<NodeStyleProp>`
        max-width: ${ENTRY_NODE_WIDTH - 80}px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: "GilmerMedium";
        color: ${(props: NodeStyleProp) => (props.hovered ? Colors.PRIMARY : Colors.ON_SURFACE)};
        opacity: ${(props: NodeStyleProp) => (props.inactive && !props.hovered ? 0.7 : 1)};
    `;

    export const Accessor = styled(StyledText)`
        text-transform: uppercase;
        font-family: "GilmerBold";
    `;

    export const Description = styled(StyledText)`
        font-size: 12px;
        max-width: ${ENTRY_NODE_WIDTH - 80}px;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: monospace;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        color: ${Colors.ON_SURFACE};
        opacity: 0.7;
    `;

    export const Box = styled.div<NodeStyleProp>`
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        gap: 8px;
        width: 100%;

        border: ${NODE_BORDER_WIDTH}px solid
            ${(props: NodeStyleProp) => (props.hovered ? Colors.PRIMARY : Colors.OUTLINE_VARIANT)};
        border-radius: 8px;
        background-color: ${Colors.SURFACE_DIM};

        padding: 0 8px 8px 8px;
    `;

    export const ServiceBox = styled.div`
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
        gap: 10px;
        width: ${ENTRY_NODE_WIDTH}px;
        height: ${ENTRY_NODE_HEIGHT}px;
        cursor: pointer;
    `;

    export const FunctionBoxWrapper = styled.div`
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        color: ${Colors.ON_SURFACE};
        /* margin-right: -20px; */
    `;

    export const FunctionBox = styled(NodeStyles.ServiceBox)<NodeStyleProp>`
        height: 40px;
        padding: 0 12px;

        border: ${NODE_BORDER_WIDTH}px solid
            ${(props: NodeStyleProp) => (props.hovered ? Colors.PRIMARY : Colors.OUTLINE_VARIANT)};
        border-radius: 8px;
        background-color: ${Colors.SURFACE_DIM};
    `;

    export const Hr = styled.hr`
        width: 100%;
    `;

    export const MenuButton = styled(Button)`
        border-radius: 5px;
    `;
}

interface EntryNodeWidgetProps {
    model: EntryNodeModel;
    engine: DiagramEngine;
}

export interface NodeWidgetProps extends Omit<EntryNodeWidgetProps, "children"> {}

export function EntryNodeWidget(props: EntryNodeWidgetProps) {
    const { model, engine } = props;
    const [isHovered, setIsHovered] = React.useState(false);
    const { onServiceSelect, onAutomationSelect, onDeleteComponent } = useDiagramContext();
    const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const isMenuOpen = Boolean(menuAnchorEl);

    const handleOnClick = () => {
        if (model.type === "service") {
            onServiceSelect(model.node as CDService);
        } else {
            onAutomationSelect(model.node as CDAutomation);
        }
    };

    const getNodeIcon = () => {
        switch (model.type) {
            case "automation":
                return <TaskIcon />;
            case "service":
                return <ImageWithFallback imageUrl={(model.node as CDService).icon} fallbackEl={<HttpIcon />} />;
            default:
                return <HttpIcon />;
        }
    };

    const getNodeTitle = () => {
        if (model.node.displayName) {
            return model.node.displayName;
        }
        if ((model.node as CDService).absolutePath) {
            return (model.node as CDService).absolutePath;
        }
        return "";
    };

    const getNodeDescription = () => {
        if (model.type === "automation") {
            return "Automation";
        }
        // Service
        if ((model.node as CDService).type) {
            return (model.node as CDService).type.replace(":Listener", ":Service");
        }
        return "Service";
    };

    const handleOnMenuClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        event.stopPropagation();
        setMenuAnchorEl(event.currentTarget);
    };

    const handleOnMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const menuItems: Item[] = [
        { id: "edit", label: "Edit", onClick: () => handleOnClick() },
        { id: "delete", label: "Delete", onClick: () => onDeleteComponent(model.node) },
    ];

    const serviceFunctions = [];
    if ((model.node as CDService).remoteFunctions?.length > 0) {
        serviceFunctions.push(...(model.node as CDService).remoteFunctions);
    }
    if ((model.node as CDService).resourceFunctions?.length > 0) {
        serviceFunctions.push(...(model.node as CDService).resourceFunctions);
    }

    return (
        <NodeStyles.Node>
            <NodeStyles.TopPortWidget port={model.getPort("in")!} engine={engine} />
            <NodeStyles.Box hovered={isHovered}>
                <NodeStyles.ServiceBox onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                    <NodeStyles.Icon>{getNodeIcon()}</NodeStyles.Icon>
                    <NodeStyles.Header hovered={isHovered} onClick={handleOnClick}>
                        <NodeStyles.Title hovered={isHovered}>{getNodeTitle()}</NodeStyles.Title>
                        <NodeStyles.Description>{getNodeDescription()}</NodeStyles.Description>
                    </NodeStyles.Header>
                    <NodeStyles.MenuButton appearance="icon" onClick={handleOnMenuClick}>
                        <MoreVertIcon />
                    </NodeStyles.MenuButton>
                </NodeStyles.ServiceBox>
                {serviceFunctions?.map((serviceFunction) => (
                    <FunctionBox
                        key={getEntryNodeFunctionPortName(serviceFunction)}
                        func={serviceFunction}
                        model={model}
                        engine={engine}
                    />
                ))}
            </NodeStyles.Box>
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

function FunctionBox(props: { func: CDFunction | CDResourceFunction; model: EntryNodeModel; engine: DiagramEngine }) {
    const { func, model, engine } = props;
    const [isHovered, setIsHovered] = useState(false);
    const { onFunctionSelect } = useDiagramContext();

    const handleOnClick = () => {
        onFunctionSelect(func);
    };

    return (
        <NodeStyles.FunctionBoxWrapper>
            <NodeStyles.FunctionBox
                hovered={isHovered}
                onClick={() => handleOnClick()}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {(func as CDResourceFunction).accessor && (
                    <NodeStyles.Accessor>{(func as CDResourceFunction).accessor}</NodeStyles.Accessor>
                )}
                {(func as CDResourceFunction).path && (
                    <NodeStyles.Title hovered={isHovered}>/{(func as CDResourceFunction).path}</NodeStyles.Title>
                )}
                {(func as CDFunction).name && (
                    <NodeStyles.Title hovered={isHovered}>{(func as CDFunction).name}</NodeStyles.Title>
                )}
            </NodeStyles.FunctionBox>
            <NodeStyles.FunctionPortWidget port={model.getPort(getEntryNodeFunctionPortName(func))!} engine={engine} />
        </NodeStyles.FunctionBoxWrapper>
    );
}
