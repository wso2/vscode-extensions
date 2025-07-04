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
import { ConditionNodeModel } from "./ConditionNodeModel";
import { Colors, NODE_DIMENSIONS } from "../../../resources/constants";
import { STNode } from "@wso2/mi-syntax-tree/src";
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import { Button, Menu, MenuItem, Popover, Tooltip } from "@wso2/ui-toolkit";
import SidePanelContext from "../../sidePanel/SidePanelContexProvider";
import { MoreVertIcon } from "../../../resources";
import { Description, Name } from "../BaseNodeModel";
import { getNodeDescription } from "../../../utils/node";
import { BreakpointMenu } from "../../BreakpointMenu/BreakpointMenu";

namespace S {
    export const Node = styled.div<{}>`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        background-color: ${Colors.SURFACE_BRIGHT};
        color: ${Colors.ON_SURFACE};
        & svg {
            fill: ${Colors.ON_SURFACE};
        }
    `;

    export const StyledButton = styled(Button)`
        position: absolute;
        top: 21px;
        left: 37px;
        border-radius: 5px;
    `;

    export const Header = styled.div<{ showBorder: boolean }>`
        position: absolute;
        top: ${(props: { showBorder: any; }) => props.showBorder ? "8" : (NODE_DIMENSIONS.CONDITION.HEIGHT / 2) - 10}px;
        left: ${NODE_DIMENSIONS.CONDITION.WIDTH + 10}px;
        width: 100%;
        border-bottom: ${(props: { showBorder: any; }) => props.showBorder ? `0.2px solid ${Colors.OUTLINE_VARIANT};` : "none"};
        text-align: center;
    `;

    export const Body = styled.div<{}>`
        position: absolute;
        display: flex;
        max-width: 100%;
        top: 28px;
        left: ${NODE_DIMENSIONS.CONDITION.WIDTH + 10}px;
       
    `;

    export const TooltipContent = styled.div`
        max-width: 80vw;
        white-space: pre-wrap;
    `;
}

interface CallNodeWidgetProps {
    node: ConditionNodeModel;
    engine: DiagramEngine;
    onClick?: (node: STNode) => void;
}

export function ConditionNodeWidget(props: CallNodeWidgetProps) {
    const { node, engine, onClick } = props;
    const [isHovered, setIsHovered] = React.useState(false);
    const hasDiagnotics = node.hasDiagnotics();
    const tooltip = hasDiagnotics ? node.getDiagnostics().map(diagnostic => diagnostic.message).join("\n") : (node.getStNode() as any).description;
    const { rpcClient, setIsLoading: setDiagramLoading } = useVisualizerContext();
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [popoverAnchorEl, setPopoverAnchorEl] = React.useState(null);
    const sidePanelContext = React.useContext(SidePanelContext);
    const description = getNodeDescription(node.stNode);
    const hasBreakpoint = node.hasBreakpoint();
    const isActiveBreakpoint = node.isActiveBreakpoint();

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
    }, [tooltip]);

    return (
        <div data-testid={`conditionNode-${node.getID()}`}>
            <Tooltip content={!isPopoverOpen && tooltip ? <TooltipEl /> : ""} position={'bottom'} containerPosition={'absolute'}>
                <S.Node
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={(e) => node.onClicked(e, node, rpcClient, sidePanelContext)}
                >
                    {hasBreakpoint && (
                        <div style={{ position: "absolute", left: -5, width: 15, height: 15, top:22, borderRadius: "50%", backgroundColor: "red" }}></div>
                    )}
                    <PortWidget port={node.getPort("in")!} engine={engine} />
                    <svg width="65" height="65" viewBox="0 0 70 70">
                        <rect
                            x="12"
                            y="2"
                            width="50"
                            height="50"
                            rx="5"
                            ry="5"
                            fill={isActiveBreakpoint ? Colors.DEBUGGER_BREAKPOINT_BACKGROUND : Colors.SURFACE_BRIGHT}
                            stroke={
                                node.hasDiagnotics() ? Colors.ERROR : node.isSelected() ? Colors.SECONDARY : (isHovered || isActiveBreakpoint) ? Colors.SECONDARY : Colors.OUTLINE_VARIANT
                            }
                            strokeWidth={2}
                            transform="rotate(45 28 28)"
                        />
                        <svg x="20" y="15" width="30" height="30" viewBox="0 0 24 24">
                            <path
                                fill={Colors.ON_SURFACE}
                                transform="rotate(180)"
                                transform-origin="50% 50%"
                                d="m14.85 4.85l1.44 1.44l-2.88 2.88l1.42 1.42l2.88-2.88l1.44 1.44a.5.5 0 0 0 .85-.36V4.5c0-.28-.22-.5-.5-.5h-4.29a.5.5 0 0 0-.36.85M8.79 4H4.5c-.28 0-.5.22-.5.5v4.29c0 .45.54.67.85.35L6.29 7.7L11 12.4V19c0 .55.45 1 1 1s1-.45 1-1v-7c0-.26-.11-.52-.29-.71l-5-5.01l1.44-1.44c.31-.3.09-.84-.36-.84"
                            />
                        </svg>
                    </svg>
                    {isHovered && (
                        <S.StyledButton appearance="icon" onClick={handleOnClickMenu}>
                            <MoreVertIcon />
                        </S.StyledButton>
                    )}

                    <S.Header showBorder={description !== undefined}>
                        <Name>{node.stNode.displayName || node.mediatorName}</Name>
                    </S.Header>
                    <S.Body>
                        <Tooltip content={description} position={'bottom'} >
                            <Description>{description}</Description>
                        </Tooltip>
                    </S.Body>
                    <PortWidget port={node.getPort("out")!} engine={engine} />
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
                    <MenuItem key={'delete-btn'} item={{ label: 'Delete', id: "delete", onClick: () => node.delete(rpcClient, setDiagramLoading) }} />
                    <BreakpointMenu hasBreakpoint={hasBreakpoint} node={node} rpcClient={rpcClient} />
                </Menu>
            </Popover>
        </div>
    );
}
