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
import { DataServiceNodeModel } from "./DataServiceNodeModel";
import { Colors, NODE_DIMENSIONS } from "../../../resources/constants";
import { Query, STNode } from "@wso2/mi-syntax-tree/src";
import { Button, Tooltip } from "@wso2/ui-toolkit";
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import SidePanelContext from "../../sidePanel/SidePanelContexProvider";
import { getNodeDescription } from "../../../utils/node";
import { Header, Description, Name, Content, Body } from "../BaseNodeModel";
import { MACHINE_VIEW, POPUP_EVENT_TYPE } from "@wso2/mi-core";

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
        width: ${NODE_DIMENSIONS.DATA_SERVICE.WIDTH - (NODE_DIMENSIONS.BORDER * 2)}px;
        height: ${NODE_DIMENSIONS.DATA_SERVICE.HEIGHT - (NODE_DIMENSIONS.BORDER * 2)}px;
        border: ${NODE_DIMENSIONS.BORDER}px solid
            ${(props: NodeStyleProp) =>
            props.hasError ? Colors.ERROR : props.selected ? Colors.SECONDARY : props.hovered ? Colors.SECONDARY : Colors.OUTLINE_VARIANT};
        border-radius: 10px;
        background-color: ${(props: NodeStyleProp) => props?.isActiveBreakpoint ? Colors.DEBUGGER_BREAKPOINT_BACKGROUND : Colors.SURFACE_BRIGHT};
        color: ${Colors.ON_SURFACE};
        cursor: pointer;
    `;

    export const DataSourceNode = styled(S.Node)`
        position: absolute;
        left: ${NODE_DIMENSIONS.DATA_SERVICE.WIDTH + NODE_DIMENSIONS.DATA_SERVICE.GAP}px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: ${NODE_DIMENSIONS.DATA_SERVICE.WIDTH - (NODE_DIMENSIONS.BORDER * 2)}px;
        height: ${NODE_DIMENSIONS.DATA_SERVICE.HEIGHT - (NODE_DIMENSIONS.BORDER * 2)}px;
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

    export const StyledButton = styled(Button)`
        background-color: ${Colors.SURFACE};
        border-radius: 5px;
        position: absolute;
        right: 6px;
        top: ${((NODE_DIMENSIONS.DEFAULT.HEIGHT) / 2) - 12}px;
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
interface DataServiceNodeWidgetProps {
    node: DataServiceNodeModel;
    engine: DiagramEngine;
    onClick?: (node: STNode) => void;
}

export function DataServiceNodeWidget(props: DataServiceNodeWidgetProps) {
    const { node, engine } = props;
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const sidePanelContext = React.useContext(SidePanelContext);
    const { rpcClient } = useVisualizerContext();
    const hasDiagnotics = node.hasDiagnotics();
    const tooltip = hasDiagnotics ? node.getDiagnostics().map(diagnostic => diagnostic.message).join("\n") : undefined;
    const hasBreakpoint = node.hasBreakpoint();
    const isActiveBreakpoint = node.isActiveBreakpoint();
    const description = getNodeDescription(node.stNode);

    // datasource node
    const [isHoveredDataSource, setIsHoveredDataSource] = React.useState(false);

    const onClickDataSource = (e: any) => {
        e.stopPropagation();
        e.preventDefault();
        node.setSelected(false);

        const config = (node.stNode as Query).useConfig;
        if (!config || config === "") {
            rpcClient.getMiVisualizerRpcClient().showNotification({
                type: "error",
                message: "Datasource configuration not found",
            });
            return;
        }

        rpcClient.getMiVisualizerRpcClient().openView({
            isPopup: true,
            type: POPUP_EVENT_TYPE.OPEN_VIEW,
            location: {
                view: MACHINE_VIEW.DssDataSourceForm,
                documentUri: node.documentUri,
                customProps: {
                    datasource: config
                }
            }
        });
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
        <div data-testid={`dataServiceNode-${node.getID()}`}>
            <Tooltip content={!isPopoverOpen && tooltip ? <TooltipEl /> : ""} position={'bottom'} containerPosition={'absolute'}>
                <S.Node
                    selected={node.isSelected() && !isHoveredDataSource}
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
                    <div style={{ display: "flex", flexDirection: "row" }}>
                        {/* <S.IconContainer>{getMediatorIconsFromFont(node.stNode.tag)}</S.IconContainer> */}
                        <Content style={{
                            width: "100%",
                            left: "0",
                        }}>
                            <Header showBorder={description !== undefined}>
                                <Name style={{
                                    textAlign: "center",
                                    maxWidth: "100%",
                                    width: "100%",
                                }}>{node.mediatorName}</Name>
                            </Header>
                            <Body>
                                <Tooltip content={description} position={'bottom'} >
                                    <Description>{description}</Description>
                                </Tooltip>
                            </Body>
                        </Content>
                    </div>
                    <S.BottomPortWidget port={node.getPort("out")!} engine={engine} />
                </S.Node>
            </Tooltip>

            {node.mediatorName === 'Query' &&
                <S.DataSourceNode
                    selected={false}
                    hasError={hasDiagnotics}
                    hovered={isHoveredDataSource}
                    onMouseEnter={() => setIsHoveredDataSource(true)}
                    onMouseLeave={() => setIsHoveredDataSource(false)}
                    onClick={onClickDataSource}
                >
                    <svg height="100" width="100" style={{ position: "absolute", left: -NODE_DIMENSIONS.DATA_SERVICE.GAP, top: NODE_DIMENSIONS.DATA_SERVICE.HEIGHT / 2 }}>
                        <line x1="0" y1="0" x2={NODE_DIMENSIONS.DATA_SERVICE.GAP} y2="0" style={{
                            stroke: Colors.PRIMARY,
                            strokeWidth: 4,
                        }} />
                    </svg>
                    <div style={{ display: "flex", flexDirection: "row" }}>
                        {/* <S.IconContainer>{getMediatorIconsFromFont(node.stNode.tag)}</S.IconContainer> */}
                        <Content style={{
                            width: "100%",
                            left: "0",
                        }}>
                            <Header showBorder={description !== undefined}>
                                <Name style={{
                                    textAlign: "center",
                                    maxWidth: "100%",
                                    width: "100%",
                                }}>Datasource</Name>
                            </Header>
                            <Body>
                                <Tooltip content={description} position={'bottom'} >
                                    <Description>{description}</Description>
                                </Tooltip>
                            </Body>
                        </Content>
                    </div>
                </S.DataSourceNode>}
        </div >
    );
}
