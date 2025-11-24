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

import React, { useEffect, useMemo, useState } from "react";
import styled from "@emotion/styled";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import { GroupNodeModel } from "./GroupNodeModel";
import { Colors, NODE_DIMENSIONS } from "../../../resources/constants";
import { STNode } from "@wso2/mi-syntax-tree/src";
import { Menu, MenuItem, Popover, Tooltip } from "@wso2/ui-toolkit";
import { MoreVertIcon } from "../../../resources";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import SidePanelContext from "../../sidePanel/SidePanelContexProvider";
import { getMediatorIconsFromFont } from "../../../resources/icons/mediatorIcons/icons";
import { BreakpointMenu } from "../../BreakpointMenu/BreakpointMenu";
import { Body, Content, Description, Header, Name, OptionsMenu } from "../BaseNodeModel";
import { getNodeDescription } from "../../../utils/node";

namespace S {
    export type NodeStyleProp = {
        selected: boolean;
        hovered: boolean;
        hasError: boolean;
        isActiveBreakpoint?: boolean;
    };
    export const Node = styled.div<NodeStyleProp>`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: ${NODE_DIMENSIONS.GROUP.WIDTH - (NODE_DIMENSIONS.BORDER * 2)}px;
        height: ${NODE_DIMENSIONS.GROUP.HEIGHT - (NODE_DIMENSIONS.BORDER * 2)}px;
        border: ${NODE_DIMENSIONS.BORDER}px solid
            ${(props: NodeStyleProp) =>
            props.hasError
                ? Colors.ERROR
                : props.selected
                    ? Colors.SECONDARY
                    : props.hovered
                        ? Colors.SECONDARY
                        : Colors.OUTLINE_VARIANT};
        border-radius: 10px;
        background-color: ${(props: NodeStyleProp) => props?.isActiveBreakpoint ? Colors.DEBUGGER_BREAKPOINT_BACKGROUND : Colors.SURFACE_BRIGHT};
        color: ${Colors.ON_SURFACE};
        cursor: pointer;
    `;

    export const Header = styled.div<{}>`
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
        width: 100%;
    `;

    export const IconContainer = styled.div`
        padding: 0 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        & img {
            height: 25px;
            width: 25px;
            fill: ${Colors.ON_SURFACE};
            stroke: ${Colors.ON_SURFACE};
        }
    `;

    export const TopPortWidget = styled(PortWidget)`
        margin-top: -3px;
    `;

    export const BottomPortWidget = styled(PortWidget)`
        margin-bottom: -3px;
    `;

    export const NodeText = styled.div`
        max-width: 100px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `;

    export type ContainerStyleProp = {
        height: number;
        width: number;
        left: number;
        right: number;
    };
    export const ChildNodeContainer = styled.div<ContainerStyleProp>`
        position: absolute;
        top: ${NODE_DIMENSIONS.GROUP.HEIGHT / 2}px;
        left: ${(props: ContainerStyleProp) => (NODE_DIMENSIONS.GROUP.WIDTH / 2) - props.left}px;
        width: ${(props: ContainerStyleProp) => props.left + props.right}px;
        height: ${(props: ContainerStyleProp) => props.height - (NODE_DIMENSIONS.GROUP.HEIGHT / 2) - (NODE_DIMENSIONS.BORDER * 2)}px;
        border: ${NODE_DIMENSIONS.BORDER}px dashed ${Colors.OUTLINE_VARIANT};
        border-radius: 10px;
        background-color: transparent;
        z-index: -1;
        display: flex;
        align-items: flex-end;
        pointer-events: none;
    `;

    export const EmptyEl = styled.div`
        width: 0;
        height: 0;
    `;

    export const TooltipContent = styled.div`
        max-width: 80vw;
        white-space: pre-wrap;
    `;
}

interface CallNodeWidgetProps {
    node: GroupNodeModel;
    engine: DiagramEngine;
    onClick?: (node: STNode) => void;
}

export function GroupNodeWidget(props: CallNodeWidgetProps) {
    const { node, engine } = props;
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [popoverAnchorEl, setPopoverAnchorEl] = useState(null);
    const sidePanelContext = React.useContext(SidePanelContext);
    const { rpcClient, setIsLoading: setDiagramLoading } = useVisualizerContext();
    const hasDiagnotics = node.hasDiagnotics();
    const hasBreakpoint = node.hasBreakpoint();
    const isActiveBreakpoint = node.isActiveBreakpoint();
    const description = getNodeDescription(node.stNode);

    const tooltip = hasDiagnotics
        ? node
            .getDiagnostics()
            .map((diagnostic) => diagnostic.message)
            .join("\n")
        : undefined;

    const handleOnClickMenu = (event: any) => {
        setIsPopoverOpen(!isPopoverOpen);
        setPopoverAnchorEl(event.currentTarget);
        event.stopPropagation();
    };

    const handlePopoverClose = () => {
        setIsPopoverOpen(false);
    };

    useEffect(() => {
        node.setSelected(sidePanelContext?.node === node);
    }, [sidePanelContext?.node]);

    const TooltipEl = useMemo(() => {
        return () => (
            <S.TooltipContent style={{ textWrap: "wrap" }}>
                {tooltip}
            </S.TooltipContent>
        );
    }, [tooltip])

    return (
        <div data-testid={`groupNode-${node.getID()}`}>
            <Tooltip content={!isPopoverOpen && tooltip ? <TooltipEl /> : ""} position={"bottom"} containerPosition={"absolute"}>
                <S.Node
                    selected={node.isSelected()}
                    hasError={hasDiagnotics}
                    hovered={isHovered || isActiveBreakpoint}
                    isActiveBreakpoint={isActiveBreakpoint}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={(e) => node.onClicked(e, node, rpcClient, sidePanelContext)}
                >
                    {hasBreakpoint && (
                        <div style={{ position: "absolute", left: -5, width: 15, height: 15, borderRadius: "50%", backgroundColor: "red" }}></div>
                    )}
                    <S.TopPortWidget port={node.getPort("in")!} engine={engine} />
                    <div style={{ display: "flex", flexDirection: "row", width: NODE_DIMENSIONS.DEFAULT.WIDTH }}>
                        <S.IconContainer>{getMediatorIconsFromFont(node.stNode.tag)}</S.IconContainer>
                        <div>
                            {isHovered && (
                                <OptionsMenu appearance="icon" onClick={handleOnClickMenu}>
                                    <MoreVertIcon />
                                </OptionsMenu>
                            )}
                            <Content>
                                <Header showBorder={description !== undefined}>
                                    <Name>{node.stNode.displayName || node.mediatorName}</Name>
                                </Header>
                                <Body>
                                    <Tooltip content={description} position={'bottom'} >
                                        <Description>{description}</Description>
                                    </Tooltip>
                                </Body>
                            </Content>
                        </div>
                    </div>
                    <S.EmptyEl />
                </S.Node>
            </Tooltip>
            <S.ChildNodeContainer width={node.stNode.viewState.fw} height={node.stNode.viewState.fh} left={node.stNode.viewState.l} right={node.stNode.viewState.r}>
                <S.BottomPortWidget port={node.getPort("out")!} engine={engine} style={{
                    marginLeft: node.stNode.viewState.l
                }} />
            </S.ChildNodeContainer>
            <Popover
                anchorEl={popoverAnchorEl}
                open={isPopoverOpen}
                sx={{
                    backgroundColor: Colors.SURFACE,
                    marginLeft: "30px",
                    padding: 0,
                }}
                handleClose={handlePopoverClose}
            >
                <Menu>
                    <MenuItem
                        key={"delete-btn"}
                        item={{ label: "Delete", id: "delete", onClick: () => node.delete(rpcClient, setDiagramLoading) }}
                    />
                    <BreakpointMenu hasBreakpoint={hasBreakpoint} node={node} rpcClient={rpcClient} />
                </Menu>
            </Popover>
        </div>
    );
}
