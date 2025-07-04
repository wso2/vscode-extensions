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

import React, { useEffect, useMemo } from "react";
import styled from "@emotion/styled";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import { CallNodeModel } from "./CallNodeModel";
import { Colors, NODE_DIMENSIONS } from "../../../resources/constants";
import { STNode } from "@wso2/mi-syntax-tree/src";
import { Menu, MenuItem, Popover, Tooltip } from "@wso2/ui-toolkit";
import { MoreVertIcon } from "../../../resources";
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import SidePanelContext from "../../sidePanel/SidePanelContexProvider";
import { Range } from "@wso2/mi-syntax-tree/lib/src";
import { getMediatorIconsFromFont } from "../../../resources/icons/mediatorIcons/icons";
import { getNodeDescription } from "../../../utils/node";
import { Header, Description, Name, Content, OptionsMenu, Body } from "../BaseNodeModel";
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
        width: ${NODE_DIMENSIONS.CALL.WIDTH - (NODE_DIMENSIONS.BORDER * 2)}px;
        height: ${NODE_DIMENSIONS.CALL.HEIGHT - (NODE_DIMENSIONS.BORDER * 2)}px;
        border: ${NODE_DIMENSIONS.BORDER}px solid
            ${(props: NodeStyleProp) =>
            props.hasError ? Colors.ERROR : props.selected ? Colors.SECONDARY : props.hovered ? Colors.SECONDARY : Colors.OUTLINE_VARIANT};
        border-radius: 10px;
        background-color: ${(props: NodeStyleProp) => props?.isActiveBreakpoint ? Colors.DEBUGGER_BREAKPOINT_BACKGROUND : Colors.SURFACE_BRIGHT};
        color: ${Colors.ON_SURFACE};
        cursor: pointer;
        font-family: var(--font-family);
        font-size: var(--type-ramp-base-font-size);
    `;

    export const CircleContainer = styled.div`
        position: absolute;
        top: 5px;
        left: ${NODE_DIMENSIONS.CALL.WIDTH}px;
        color: ${Colors.ON_SURFACE};
        cursor: pointer;
        font-family: var(--font-family);
        font-size: var(--type-ramp-base-font-size);
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

    export const EndpointContainer = styled.div`
        position: absolute;
        left: 252.5px;
        top: 18px;
    `;

    export const EndpointTextWrapper = styled(Description)`
        position: absolute;
        left: ${NODE_DIMENSIONS.CALL.WIDTH + 35}px;
        top: ${NODE_DIMENSIONS.CALL.HEIGHT / 2 + 35}px;
        width: 100px;
        max-width: 100px;
        text-align: center;
    `;

    export const TooltipContent = styled.div`
        max-width: 80vw;
        white-space: pre-wrap;
    `;
}

interface CallNodeWidgetProps {
    node: CallNodeModel;
    engine: DiagramEngine;
    onClick?: (node: STNode) => void;
}

export function CallNodeWidget(props: CallNodeWidgetProps) {
    const { node, engine, onClick } = props;
    const [isHovered, setIsHovered] = React.useState(false);
    const [isHoveredEndpoint, setIsHoveredEndpoint] = React.useState(false);
    const [isEndpointSelected, setIsEndpointSelected] = React.useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [popoverAnchorEl, setPopoverAnchorEl] = React.useState(null);
    const sidePanelContext = React.useContext(SidePanelContext);
    const { rpcClient, setIsLoading: setDiagramLoading } = useVisualizerContext();
    const hasDiagnotics = node.hasDiagnotics();
    const tooltip = hasDiagnotics ? node.getDiagnostics().map(diagnostic => diagnostic.message).join("\n") : undefined;
    const endpointHasDiagnotics = node.endpointHasDiagnostics();
    const endpointTooltip = endpointHasDiagnotics ? node.getEndpointDiagnostics().map(diagnostic => diagnostic.message).join("\n") : undefined;
    const nodeDescription = getNodeDescription(node.stNode);
    const hasBreakpoint = node.hasBreakpoint();
    const isActiveBreakpoint = node.isActiveBreakpoint();

    useEffect(() => {
        node.setSelected(sidePanelContext?.node === node);
    }, [sidePanelContext?.node]);

    const TooltipEl = useMemo(() => {
        return () => (
            <S.TooltipContent style={{ textWrap: "wrap" }}>
                {tooltip}
            </S.TooltipContent>
        );
    }, [tooltip]);

    useEffect(() => {
        if (!node.isSelected()) {
            setIsEndpointSelected(false);
        }
    }, [node.isSelected()]);

    const handleOnClickMenu = (event: any) => {
        if (onClick) {
            onClick(node.stNode);
        } else {
            setIsPopoverOpen(!isPopoverOpen);
            setPopoverAnchorEl(event.currentTarget);
            event.stopPropagation();
        }
    };

    const handlePlusNode = () => {
        const nodeRange: Range = {
            start: node.stNode.range.endTagRange.start,
            end: node.stNode.range.endTagRange.start,
        }

        sidePanelContext.setSidePanelState({
            ...sidePanelContext,
            isOpen: true,
            nodeRange: nodeRange,
            parentNode: node.getStNode()?.tag,
            previousNode: node.getPrevStNodes()[node.getPrevStNodes().length - 1]?.tag,
        });
    };

    const handleOnClickEndpoint = (e: any) => {
        if (node.endpoint) {
            if (node.endpoint.key) {
                setIsEndpointSelected(true);
                node.onClicked(e, node, rpcClient, sidePanelContext, node.endpoint.type, node.endpoint);
            } else {
                node.onClicked(e, node, rpcClient, sidePanelContext);
            }
        }
    }

    const handleOnDeleteEndpoint = () => {
        rpcClient.getMiDiagramRpcClient().applyEdit({
            documentUri: node.documentUri,
            range: { start: node.endpoint.range.startTagRange.start, end: node.endpoint.range?.endTagRange?.end ?? node.endpoint.range.startTagRange.end },
            text: "",
        });
    };

    const handleOnDeleteEndpointClick = () => {
        handleOnDeleteEndpoint();
        setIsPopoverOpen(false); // Close the popover after action
    }

    const handlePopoverClose = () => {
        setIsPopoverOpen(false);
    }

    return (
        <div data-testid={`callNode-${node.getID()}`}>
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
                        <S.IconContainer>{getMediatorIconsFromFont(node.stNode.tag)}</S.IconContainer>
                        <div>
                            {isHovered && (
                                <OptionsMenu appearance="icon" onClick={handleOnClickMenu}>
                                    <MoreVertIcon />
                                </OptionsMenu>
                            )}
                            <Content>
                                <Header showBorder={nodeDescription !== undefined}>
                                    <Name>{node.mediatorName}</Name>
                                </Header>
                                <Body>
                                    <Tooltip content={nodeDescription} position={'bottom'} >
                                        <Description>{nodeDescription}</Description>
                                    </Tooltip>
                                </Body>
                            </Content>
                        </div>
                    </div>
                    <S.BottomPortWidget port={node.getPort("out")!} engine={engine} />
                </S.Node>
            </Tooltip>

            <S.CircleContainer
                onMouseEnter={() => setIsHoveredEndpoint(true)}
                onMouseLeave={() => setIsHoveredEndpoint(false)}
                onClick={(e) => node.onClicked(e, node, rpcClient, sidePanelContext)}
            >
                <Tooltip content={endpointTooltip} position={'bottom'} >
                    <svg width="110" height="50" viewBox="0 0 103 40">
                        <circle
                            cx="80"
                            cy="20"
                            r="22"
                            fill={Colors.SURFACE_BRIGHT}
                            stroke={endpointHasDiagnotics ? Colors.ERROR : (isHoveredEndpoint || isEndpointSelected) ? Colors.SECONDARY : Colors.OUTLINE_VARIANT}
                            strokeWidth={2}
                        />
                        {node.endpoint && <g transform="translate(80,20)">
                            <foreignObject width="25" height="25" overflow="visible">
                                <div style={{
                                    transform: "translate(-50%, -50%)",
                                }}>
                                    {getMediatorIconsFromFont(node.endpoint.type)}
                                </div>
                            </foreignObject>
                        </g>}

                        <line
                            x1="0"
                            y1="20"
                            x2="57"
                            y2="20"
                            style={{
                                stroke: Colors.PRIMARY,
                                strokeWidth: 2,
                                markerEnd: `url(#${node.getID()}-arrow-head)`,
                            }}
                        />
                        <defs>
                            <marker
                                markerWidth="4"
                                markerHeight="4"
                                refX="3"
                                refY="2"
                                viewBox="0 0 4 4"
                                orient="auto"
                                id={`${node.getID()}-arrow-head`}
                            >
                                <polygon points="0,4 0,0 4,2" fill={Colors.PRIMARY}></polygon>
                            </marker>
                        </defs>
                    </svg>
                </Tooltip>
            </S.CircleContainer>

            {node.endpoint ? (
                <S.EndpointTextWrapper>{getNodeDescription(node.endpoint)}</S.EndpointTextWrapper>
            ) : (
                <S.EndpointContainer>
                    {/* <MediatorIcon appearance="icon" onClick={handlePlusNode}>
                        <PlusIcon />
                    </MediatorIcon> */}
                </S.EndpointContainer>
            )}
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
                    <MenuItem key={'delete-btn'} item={{ label: 'Delete', id: "delete", onClick: () => node.delete(rpcClient, setDiagramLoading) }} />
                    <MenuItem key={'delete-endpoint-btn'} item={{ label: 'Delete Endpoint', id: "delete-endpoint", onClick: handleOnDeleteEndpointClick }} />
                    <BreakpointMenu hasBreakpoint={hasBreakpoint} node={node} rpcClient={rpcClient} />
                </Menu>
            </Popover>
        </div>
    );
}
