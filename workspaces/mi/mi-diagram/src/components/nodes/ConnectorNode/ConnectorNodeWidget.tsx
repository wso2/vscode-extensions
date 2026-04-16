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

import React, { useEffect, useState, useMemo } from "react";
import styled from "@emotion/styled";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import { ConnectorNodeModel } from "./ConnectorNodeModel";
import { Colors, NODE_DIMENSIONS } from "../../../resources/constants";
import { STNode, Tool } from "@wso2/mi-syntax-tree/src";
import { Menu, MenuItem, Popover, Tooltip } from "@wso2/ui-toolkit";
import { MoreVertIcon } from "../../../resources";
import { useVisualizerContext } from '@wso2/mi-rpc-client';
import SidePanelContext from "../../sidePanel/SidePanelContexProvider";
import { Connector } from "@wso2/mi-syntax-tree/lib/src";
import { BreakpointMenu } from "../../BreakpointMenu/BreakpointMenu";
import { Body, Content, Description, Header, Name, OptionsMenu } from "../BaseNodeModel";
import { FirstCharToUpperCase } from "../../../utils/commons";
import path from "path";
import { MACHINE_VIEW, POPUP_EVENT_TYPE } from "@wso2/mi-core";
import { getMediatorIconsFromFont } from "../../../resources/icons/mediatorIcons/icons";

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
        width: ${NODE_DIMENSIONS.CONNECTOR.WIDTH - (NODE_DIMENSIONS.BORDER * 2)}px;
        height: ${NODE_DIMENSIONS.CONNECTOR.HEIGHT - (NODE_DIMENSIONS.BORDER * 2)}px;
        border: ${NODE_DIMENSIONS.BORDER}px solid
            ${(props: NodeStyleProp) =>
            props.hasError ? Colors.ERROR : props.selected ? Colors.SECONDARY : props.hovered ? Colors.SECONDARY : Colors.OUTLINE_VARIANT};
        border-radius: 10px;
        background-color: ${(props: NodeStyleProp) => props?.isActiveBreakpoint ? Colors.DEBUGGER_BREAKPOINT_BACKGROUND : Colors.SURFACE_BRIGHT};
        color: ${Colors.ON_SURFACE};
        cursor: pointer;
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

    export const ConnectionContainer = styled.div`
        position: absolute;
        top: 60px;
        left: 235px;
        transform: translateX(-50%);
        color: ${Colors.ON_SURFACE};
        cursor: pointer;
        font-family: var(--font-family);
        font-size: var(--type-ramp-base-font-size);
    `;

    export const ConnectionText = styled.div`
        max-width: 130px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `;

    export const IconContainer = styled.div`
        padding: 0 6px;
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

    export const TooltipContent = styled.div`
        max-width: 80vw;
        white-space: pre-wrap;
    `;
}
interface ConnectorNodeWidgetProps {
    node: ConnectorNodeModel;
    engine: DiagramEngine;
    onClick?: (node: STNode) => void;
}

export function ConnectorNodeWidget(props: ConnectorNodeWidgetProps) {
    const { node, engine } = props;
    const [isHovered, setIsHovered] = React.useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [popoverAnchorEl, setPopoverAnchorEl] = useState(null);
    const [iconPath, setIconPath] = useState(null);
    const [connectionIconPath, setConnectionIconPath] = useState(null);
    const [isHoveredConnector, setIsHoveredConnector] = React.useState(false);
    const [isConnectorSelected, setIsConnectorSelected] = React.useState(false);
    const sidePanelContext = React.useContext(SidePanelContext);
    const { rpcClient, setIsLoading: setDiagramLoading } = useVisualizerContext();
    const hasDiagnotics = node.hasDiagnotics();
    const hasBreakpoint = node.hasBreakpoint();
    const isActiveBreakpoint = node.isActiveBreakpoint();
    const connectorNode = ((node.stNode as Tool).mediator ?? node.stNode) as Connector;
    const tooltip = hasDiagnotics ? node.getDiagnostics().map(diagnostic => diagnostic.message).join("\n") : undefined;
    const isMCPTool = (node.stNode as Tool).isMcpTool;

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
        const fetchData = async () => {
            if (isMCPTool) {
                const connectorIcon = await rpcClient.getMiDiagramRpcClient().getConnectorIcon({
                    connectorName: 'ai',
                    documentUri: node.documentUri
                });

                setIconPath(connectorIcon.iconPath);
                return;
            }

            const connectorIcon = await rpcClient.getMiDiagramRpcClient().getConnectorIcon({
                connectorName: node.stNode?.connectorName ?? (node.stNode as any).mediator.connectorName,
                documentUri: node.documentUri
            });

            setIconPath(connectorIcon.iconPath);

            const connectorData = await rpcClient.getMiDiagramRpcClient().getAvailableConnectors({
                documentUri: node.documentUri,
                connectorName: connectorNode.tag.split(".")[0]
            });

            const connectionData: any = await rpcClient.getMiDiagramRpcClient().getConnectorConnections({
                documentUri: node.documentUri,
                connectorName: (node.stNode.tag === 'tool') ?
                    (node.stNode as Tool).mediator.connectorName : node.stNode.tag.split(".")[0]
            });

            const connectionName = connectorNode.configKey;
            const connection = connectionData.connections.find((connection: any) => connection.name === connectionName);
            const connectionType = connection ? connection.connectionType : null;

            const connectionIconPath = await rpcClient.getMiDiagramRpcClient().getIconPathUri({
                path: path.join(connectorData.iconPath, 'connections'),
                name: connectionType
            });

            setConnectionIconPath(connectionIconPath.uri ?? connectorIcon.iconPath);
        }

        fetchData();
    }, [node]);

    const handleOnClickMenu = (event: any) => {
        setIsPopoverOpen(!isPopoverOpen);
        setPopoverAnchorEl(event.currentTarget);
        event.stopPropagation();
    };

    const handlePopoverClose = () => {
        setIsPopoverOpen(false);
    }

    const getConnectionNodeRange = async () => {
        const text = await rpcClient?.getMiDiagramRpcClient().getTextAtRange({
            documentUri: node.documentUri,
            range: node.stNode.range.startTagRange
        });

        const lastQuoteIndex = text.text.lastIndexOf('"') !== -1 ? text.text.lastIndexOf('"') : text.text.lastIndexOf("'");
        const textBeforeLastQuote = text.text.substring(0, lastQuoteIndex + 1);

        const configKeyLines = textBeforeLastQuote.split('\n');
        const connectionNameLine = configKeyLines?.[configKeyLines.length - 1];

        const firstQuoteIndex = connectionNameLine?.indexOf('"') !== -1 ? connectionNameLine?.indexOf('"') : connectionNameLine?.indexOf("'");

        const newlineCount = configKeyLines.length - 1;

        const connectionNameStartPosition = {
            line: node.stNode.range.startTagRange.start.line + newlineCount,
            character: newlineCount === 0 ? node.stNode.range.startTagRange.start.character + firstQuoteIndex + 1
                : firstQuoteIndex + 1
        }

        const connectionNameEndPosition = {
            line: node.stNode.range.startTagRange.start.line + newlineCount,
            character: newlineCount === 0 ? node.stNode.range.startTagRange.start.character + firstQuoteIndex + connectorNode.configKey.length + 1
                : firstQuoteIndex + connectorNode.configKey.length + 1
        }

        const nodeRange = { start: connectionNameStartPosition, end: connectionNameEndPosition };

        return nodeRange;
    }

    const handleOnConnectionClick = async (e: any) => {
        e.stopPropagation();

        if (node.stNode.tag === 'tool') {
            const connectionData: any = await rpcClient.getMiDiagramRpcClient().getConnectorConnections({
                documentUri: node.documentUri,
                connectorName: isMCPTool ? 'ai' : (node.stNode as Tool).mediator.connectorName
            });

            const connectionName = isMCPTool ? (node.stNode as Tool).mcpConnection : (node.stNode as Tool).mediator.configKey;
            const connection = connectionData.connections.find((item: any) => item.name === connectionName);

            if (!connection) {
                console.error(`Connection "${connectionName}" not found`);
                return;
            }

            const connector = await rpcClient.getMiDiagramRpcClient().getAvailableConnectors({
                documentUri: node.documentUri,
                connectorName: isMCPTool ? 'ai' : (node.stNode as Tool).mediator.connectorName
            });

            rpcClient.getMiVisualizerRpcClient().openView({
                type: POPUP_EVENT_TYPE.OPEN_VIEW,
                location: {
                    documentUri: connection.path,
                    view: MACHINE_VIEW.ConnectionForm,
                    customProps: {
                        connectionName: connection.name,
                        connector
                    }
                },
                isPopup: true
            });
            return;
        }

        const nodeRange = await getConnectionNodeRange();

        const connectorData = await rpcClient.getMiDiagramRpcClient().getAvailableConnectors({
            documentUri: node.documentUri,
            connectorName: node.stNode.tag.split(".")[0]
        });

        const definition = await rpcClient?.getMiDiagramRpcClient().getDefinition({
            document: {
                uri: node.documentUri,
            },
            position: nodeRange.start
        });

        if (e.ctrlKey || e.metaKey) {
            // open file of selected connection
            rpcClient.getMiDiagramRpcClient().openFile({ path: definition.uri, beside: true });

        } else if (node.isSelected()) {
            rpcClient.getMiVisualizerRpcClient().openView({
                type: POPUP_EVENT_TYPE.OPEN_VIEW,
                location: {
                    documentUri: definition.uri,
                    view: MACHINE_VIEW.ConnectionForm,
                    customProps: {
                        connectionName: connectorNode.configKey,
                        connector: connectorData
                    }
                },
                isPopup: true
            });
        }
    }

    return (
        <div data-testid={`connectorNode-${node.getID()}`}>
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
                        {iconPath &&
                            <S.IconContainer><img src={iconPath} alt="Icon" /></S.IconContainer>
                        }
                        <div>
                            {isHovered && (
                                <OptionsMenu appearance="icon" onClick={handleOnClickMenu}>
                                    <MoreVertIcon />
                                </OptionsMenu>
                            )}
                            <Content>
                                <Header showBorder={true}>
                                    <Name>{FirstCharToUpperCase((isMCPTool ? "MCP Tools" : connectorNode.method))}</Name>
                                </Header>
                                <Body>
                                    <Description>
                                        {isMCPTool 
                                            ? (node.stNode as Tool).mcpToolNames?.join(', ') || ''
                                            : FirstCharToUpperCase(connectorNode.connectorName ?? (connectorNode as any).name)}
                                    </Description>
                                </Body>
                            </Content>
                        </div>
                    </div>
                    <S.BottomPortWidget port={node.getPort("out")!} engine={engine} />
                </S.Node>
            </Tooltip>
            {(connectorNode.configKey || isMCPTool )  &&
                <S.CircleContainer
                    onMouseEnter={() => setIsHoveredConnector(true)}
                    onMouseLeave={() => setIsHoveredConnector(false)}
                    onClick={(e) => handleOnConnectionClick(e)}
                >
                    <Tooltip content={!isPopoverOpen && tooltip ? <TooltipEl /> : ""} position={'bottom'} >
                        <svg width={NODE_DIMENSIONS.CONNECTOR.CONNECTION_PART_WIDTH} height="50" viewBox="0 0 103 40">
                            <circle
                                cx="80"
                                cy="20"
                                r="22"
                                fill={Colors.SURFACE_BRIGHT}
                                stroke={(isHoveredConnector || isConnectorSelected) ? Colors.SECONDARY : Colors.OUTLINE_VARIANT}
                                strokeWidth={2}
                            />

                            {connectionIconPath && <g transform="translate(68,7)">
                                <foreignObject width="25" height="25">
                                    <img src={connectionIconPath} alt="Icon" />
                                </foreignObject>
                            </g>}

                            {connectorNode.mcpConnection && <g transform="translate(68,7)">
                                <foreignObject width="25" height="25">
                                    <S.IconContainer>{getMediatorIconsFromFont('mcp')}</S.IconContainer>
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
            }
            {(connectorNode.configKey || isMCPTool) &&
                <S.ConnectionContainer>
                    <S.ConnectionText>
                        {connectorNode.configKey || connectorNode.mcpConnection}
                    </S.ConnectionText>
                </S.ConnectionContainer>}
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

        </div >
    );
}
