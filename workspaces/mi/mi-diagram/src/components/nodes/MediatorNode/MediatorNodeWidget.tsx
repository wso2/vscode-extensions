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
import { MediatorNodeModel } from "./MediatorNodeModel";
import { Colors, NODE_DIMENSIONS } from "../../../resources/constants";
import { STNode, Tool } from "@wso2/mi-syntax-tree/src";
import { Menu, MenuItem, Popover, Tooltip } from "@wso2/ui-toolkit";
import { MoreVertIcon } from "../../../resources";
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import SidePanelContext from "../../sidePanel/SidePanelContexProvider";
import { getNodeDescription } from "../../../utils/node";
import { Header, Description, Name, Content, OptionsMenu, Body } from "../BaseNodeModel";
import { getMediatorIconsFromFont } from "../../../resources/icons/mediatorIcons/icons";
import { BreakpointMenu } from "../../BreakpointMenu/BreakpointMenu";

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
        width: ${NODE_DIMENSIONS.DEFAULT.WIDTH - (NODE_DIMENSIONS.BORDER * 2)}px;
        height: ${NODE_DIMENSIONS.DEFAULT.HEIGHT - (NODE_DIMENSIONS.BORDER * 2)}px;
        border: ${NODE_DIMENSIONS.BORDER}px solid
            ${(props: NodeStyleProp) =>
            props.hasError ? Colors.ERROR : props.selected ? Colors.SECONDARY : props.hovered ? Colors.SECONDARY : Colors.OUTLINE_VARIANT};
        border-radius: 10px;
        background-color: ${(props: NodeStyleProp) => props?.isActiveBreakpoint ? Colors.DEBUGGER_BREAKPOINT_BACKGROUND : Colors.SURFACE_BRIGHT};
        color: ${Colors.ON_SURFACE};
        cursor: pointer;
    `;

    export const IconContainer = styled.div`
        padding: 0 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        & img {
            height: 12px;
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

    export const TooltipContent = styled.div`
        max-width: 80vw;
        white-space: pre-wrap;
    `;
}
interface CallNodeWidgetProps {
    node: MediatorNodeModel;
    engine: DiagramEngine;
    onClick?: (node: STNode) => void;
}

export function MediatorNodeWidget(props: CallNodeWidgetProps) {
    const { node, engine } = props;
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [popoverAnchorEl, setPopoverAnchorEl] = useState(null);
    const sidePanelContext = React.useContext(SidePanelContext);
    const { rpcClient, setIsLoading: setDiagramLoading } = useVisualizerContext();
    const hasDiagnotics = node.hasDiagnotics();
    const tooltip = hasDiagnotics ? node.getDiagnostics().map(diagnostic => diagnostic.message).join("\n") : undefined;
    const hasBreakpoint = node.hasBreakpoint();
    const isActiveBreakpoint = node.isActiveBreakpoint();
    const mediatorNode = ((node.stNode as Tool).mediator ?? node.stNode) as STNode;
    const description = getNodeDescription(mediatorNode);

    const handleOnClickMenu = (event: any) => {
        setIsPopoverOpen(!isPopoverOpen);
        setPopoverAnchorEl(event.currentTarget);
        event.stopPropagation();
    };

    const handlePopoverClose = () => {
        setIsPopoverOpen(false);
    }

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
        <div data-testid={`mediatorNode-${node.getID()}`}>
            <Tooltip content={!isPopoverOpen && tooltip ? <TooltipEl /> : ""} position={'bottom'} containerPosition={'absolute'}>
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
                        <S.IconContainer>{getMediatorIconsFromFont(mediatorNode.tag)}</S.IconContainer>
                        <div>
                            {isHovered && (
                                <div>
                                    <OptionsMenu appearance="icon" onClick={handleOnClickMenu}>
                                        <MoreVertIcon />
                                    </OptionsMenu>
                                </div>
                            )}
                            <Content>
                                <Header showBorder={description !== undefined}>
                                    <Name data-testid="mediator-name">{mediatorNode.displayName || node.mediatorName}</Name>
                                </Header>
                                <Body>
                                    <Tooltip content={description} position={'bottom'} >
                                        <Description data-testid="mediator-description">{description}</Description>
                                    </Tooltip>
                                </Body>
                            </Content>
                        </div>
                    </div>
                    <S.BottomPortWidget port={node.getPort("out")!} engine={engine} />
                </S.Node>
            </Tooltip>
            <Popover
                anchorEl={popoverAnchorEl}
                open={isPopoverOpen}
                sx={{
                    backgroundColor: Colors.SURFACE,
                    marginLeft: "30px",
                    padding: 0
                }}
                handleClose={handlePopoverClose}
            >
                <Menu>
                    <MenuItem key={'delete-btn'} item={{ label: 'Delete', id: "delete", onClick: () => { node.delete(rpcClient, setDiagramLoading) } }} />
                    <BreakpointMenu hasBreakpoint={hasBreakpoint} node={node} rpcClient={rpcClient} />
                </Menu>
            </Popover>
        </div >
    );
}
