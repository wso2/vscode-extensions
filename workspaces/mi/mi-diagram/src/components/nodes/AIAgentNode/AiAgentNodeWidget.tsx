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
import { AiAgentNodeModel } from "./AiAgentNodeModel";
import { Colors, NODE_DIMENSIONS, NODE_GAP } from "../../../resources/constants";
import { STNode } from "@wso2/mi-syntax-tree/src";
import { Menu, MenuItem, Popover, Tooltip, Typography } from "@wso2/ui-toolkit";
import { MoreVertIcon } from "../../../resources";
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import SidePanelContext from "../../sidePanel/SidePanelContexProvider";
import { BreakpointMenu } from "../../BreakpointMenu/BreakpointMenu";
import { Body, Description, Header, Name, OptionsMenu } from "../BaseNodeModel";
import path from "path";
import { FirstCharToUpperCase } from "../../../utils/commons";
import { getTextSizes } from "../../../utils/node";
import { AIConnector, AIConnectorConnection } from "@wso2/mi-syntax-tree/lib/src";
import { MACHINE_VIEW, POPUP_EVENT_TYPE } from "@wso2/mi-core";

namespace S {
    export type NodeStyleProp = {
        height: number;
        width: number;
        left: number;
        right: number;
        selected: boolean;
        hovered: boolean;
        hasError: boolean;
        isActiveBreakpoint?: boolean;
    };
    export const Node = styled.div<NodeStyleProp>`
        height: ${(props: ContainerStyleProp) => props.height - (NODE_DIMENSIONS.BORDER * 2)}px;
        width: ${(props: ContainerStyleProp) => props.width}px;
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

    export const DefaultContent = styled.div`
        display: flex;
        justify-content: center;
        flex-direction: row;
        margin-top: 20px;
    `;

    export const PromptBox = styled.div`
        margin: 0 10px;
        padding: 10px;
        border-radius: 4px;
        background-color: ${Colors.SURFACE_CONTAINER};
    `;

    export const Header = styled.div<{}>`
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
        width: 100%;
    `;

    export const IconContainer = styled.div`
        padding: 8px;
        & img {
            height: 25px;
            width: 25px;
            fill: ${Colors.ON_SURFACE};
            stroke: ${Colors.ON_SURFACE};
        }
    `;

    export const EOptionsMenu = styled(OptionsMenu)`
        top: 40px;   
    `;

    export const TopPortWidget = styled(PortWidget)`
        margin-top: -3px;
        margin-left: -2px;
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

    export const TooltipContent = styled.div`
        max-width: 80vw;
        white-space: pre-wrap;
    `;

    export const CircleContainer = styled.div`
        position: absolute;
        top: 5px;
        left: ${NODE_DIMENSIONS.AI_AGENT.WIDTH}px;
        color: ${Colors.ON_SURFACE};
        cursor: pointer;
        font-family: var(--font-family);
        font-size: var(--type-ramp-base-font-size);
    `;
}

interface CallNodeWidgetProps {
    node: AiAgentNodeModel;
    engine: DiagramEngine;
    onClick?: (node: STNode) => void;
}

export function AiAgentNodeWidget(props: CallNodeWidgetProps) {
    const { node, engine } = props;
    const [isSelected, setIsSelected] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const [isHovered, setIsHovered] = React.useState({
        node: false,
    });


    const [iconPath, setIconPath] = useState(null);

    const [popoverAnchorEl, setPopoverAnchorEl] = useState(null);
    const sidePanelContext = React.useContext(SidePanelContext);
    const { rpcClient, setIsLoading: setDiagramLoading } = useVisualizerContext();
    const hasDiagnotics = node.hasDiagnotics();
    const hasBreakpoint = node.hasBreakpoint();
    const isActiveBreakpoint = node.isActiveBreakpoint();
    const stNode = node.getStNode() as AIConnector;
    const connectorName = stNode.connectorName;
    const methodName = stNode.method;

    const connections: any = {};
    if (stNode.connections?.["LLM Connection"]) connections["LLM"] = stNode.connections["LLM Connection"];
    if (stNode.connections?.["Memory Connection"]) connections["Memory"] = stNode.connections["Memory Connection"];
    if (stNode.connections?.["Embedding Connection"]) connections["Embedding"] = stNode.connections["Embedding Connection"];
    if (stNode.connections?.["Vector Store Connection"]) connections["Vector Store"] = stNode.connections["Vector Store Connection"];

    const systemPrompt = stNode.parameters?.find((p: any) => p.name === "system")?.value;
    const instructions = stNode.parameters?.find((p: any) => p.name === "instructions")?.value;
    const prompt = stNode.parameters?.filter((property: any) => property.name === "prompt")[0]?.value;
    const systemPromptSize = getTextSizes(systemPrompt ?? instructions, "13px", undefined, undefined, 160, 8);
    const promptSize = getTextSizes(prompt, "13px", undefined, undefined, 160, 8);
    const systemPromptHeight = (systemPrompt ?? instructions) ? 36 + systemPromptSize.height : 0;
    const promptHeight = prompt ? 36 + promptSize.height : 0;

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
        setIsSelected(sidePanelContext?.node === node);
    }, [sidePanelContext?.node]);

    useEffect(() => {
        node.setSelected(sidePanelContext?.node === node);

        const fetchData = async () => {
            const connectorData = await rpcClient.getMiDiagramRpcClient().getAvailableConnectors({
                documentUri: node.documentUri,
                connectorName: stNode.tag.split(".")[0]
            });
            const connectionData: any = await rpcClient.getMiDiagramRpcClient().getConnectorConnections({
                documentUri: node.documentUri,
                connectorName: stNode.tag.split(".")[0]
            });
            const connection = connectionData.connections.find((connection: any) => connection.name === "llmConnection");
            const connectionType = connection ? connection.connectionType : null;

            const connectionIconPath = await rpcClient.getMiDiagramRpcClient().getIconPathUri({
                path: path.join(connectorData.iconPath, 'connections'),
                name: connectionType
            });
            const iconPath = await rpcClient.getMiDiagramRpcClient().getIconPathUri({ path: connectorData.iconPath, name: "icon-small" });
            setIconPath(iconPath?.uri);
        }
        fetchData();
    }, [sidePanelContext?.node]);

    const handleOnClick = async (e: any) => {
        e.stopPropagation();
        const nodeRange = { start: stNode.range.startTagRange.start, end: stNode?.range?.endTagRange?.end || stNode.range.startTagRange.end };
        if (e.ctrlKey || e.metaKey) {
            // open code and highlight the selected node
            rpcClient.getMiDiagramRpcClient().highlightCode({
                range: nodeRange,
                force: true,
            });
        } else if (node.isSelected()) {
            const connectorData = await rpcClient.getMiDiagramRpcClient().getAvailableConnectors({
                documentUri: node.documentUri,
                connectorName: stNode.tag.split(".")[0]
            });

            const operationName = stNode.tag.split(/\.(.+)/)[1];
            const connectorDetails = await rpcClient.getMiDiagramRpcClient().getMediator({
                range: nodeRange,
                documentUri: node.documentUri,
                isEdit: true
            });

            const formJSON = connectorDetails;

            sidePanelContext.setSidePanelState({
                isOpen: true,
                operationName: "connector",
                nodeRange: nodeRange,
                isEditing: true,
                formValues: {
                    form: formJSON,
                    title: `${FirstCharToUpperCase(operationName)} Operation`,
                    uiSchemaPath: connectorData.uiSchemaPath,
                    parameters: stNode.parameters ?? [],
                    connectorName: connectorData.name,
                    operationName: operationName,
                    connectionName: "llmConnection",
                    icon: iconPath,
                },
                parentNode: node.mediatorName,
                node: node,
                tag: stNode.tag
            });
        }
    }

    const TooltipEl = useMemo(() => {
        return () => (
            <S.TooltipContent style={{ textWrap: "wrap" }}>
                {tooltip}
            </S.TooltipContent>
        );
    }, [tooltip])

    const ConnectionCircle = (connection: AIConnectorConnection, marginTop: string, type: string) => {
        const [connectionIconPath, setConnectionIconPath] = useState(null);
        const [isLoading, setIsLoading] = useState(true);

        useEffect(() => {
            node.setSelected(sidePanelContext?.node === node);

            const fetchData = async (connectionName: string) => {
                const connectorData = await rpcClient.getMiDiagramRpcClient().getAvailableConnectors({
                    documentUri: node.documentUri,
                    connectorName: stNode.tag.split(".")[0]
                });
                const connectionData: any = await rpcClient.getMiDiagramRpcClient().getConnectorConnections({
                    documentUri: node.documentUri,
                    connectorName: stNode.tag.split(".")[0]
                });
                const connection = connectionData.connections.find((connection: any) => connection.name === connectionName);
                const connectionType = connection ? connection.connectionType : null;

                const connectionIconPath = await rpcClient.getMiDiagramRpcClient().getIconPathUri({
                    path: path.join(connectorData.iconPath, 'connections'),
                    name: connectionType
                });
                setConnectionIconPath(connectionIconPath?.uri);
                setIsLoading(false);
            }
            fetchData(connection.name);
        }, [connection.name]);

        const handleOnConnectionClick = async (e: any) => {
            e.stopPropagation();

            if (e.ctrlKey || e.metaKey) {
                // open file of selected connection
                rpcClient.getMiDiagramRpcClient().openFile({ path: connection.path, beside: true });

            } else if (node.isSelected()) {
                const connector = await rpcClient.getMiDiagramRpcClient().getAvailableConnectors({
                    documentUri: node.documentUri,
                    connectorName: connection.connectorName
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
            }
        }

        return <S.CircleContainer style={{ marginTop }}>
            <svg width={NODE_DIMENSIONS.AI_AGENT.CONNECTION_PART_WIDTH} height="70" viewBox="0 0 128 60">
                <g
                    onMouseEnter={() => setIsHovered({ ...isHovered, [type]: true })}
                    onMouseLeave={() => setIsHovered({ ...isHovered, [type]: false })}
                    onClick={(e) => handleOnConnectionClick(e)}
                >
                    <circle
                        cx="100"
                        cy="20"
                        r="22"
                        fill={Colors.SURFACE_BRIGHT}
                        strokeWidth={2}
                        style={{ stroke: isHovered[type as keyof typeof isHovered] ? Colors.SECONDARY : Colors.OUTLINE_VARIANT }}
                    />

                    {!isLoading && <g transform="translate(88,7)">
                        <foreignObject width="25" height="25">
                            <img src={connectionIconPath ?? iconPath} alt="Icon" />
                        </foreignObject>
                    </g>}

                    <text
                        x="100"
                        y="55"
                        textAnchor="middle"
                        fill={Colors.ON_SURFACE}
                        fontSize="12"
                        fontFamily="Arial, sans-serif"
                    >
                        {connection.name}
                    </text>
                </g>

                <text
                    x="37"
                    y="15"
                    textAnchor="middle"
                    fill={Colors.OUTLINE_VARIANT}
                    fontSize="12"
                    fontFamily="Arial, sans-serif"
                >
                    {type}
                </text>
                <line
                    x1="0"
                    y1="20"
                    x2="76"
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
        </S.CircleContainer>
    }

    return (
        <div data-testid={`aiAgentNode-${node.getID()}`}>
            <Tooltip content={!isPopoverOpen && tooltip ? <TooltipEl /> : ""} position={"bottom"} containerPosition={"absolute"}>
                <S.Node
                    width={stNode.viewState.fw} height={stNode.viewState.fh} left={stNode.viewState.l} right={stNode.viewState.r}
                    selected={isSelected}
                    hasError={hasDiagnotics}
                    hovered={isHovered.node || isActiveBreakpoint}
                    isActiveBreakpoint={isActiveBreakpoint}
                    onMouseEnter={() => setIsHovered({ ...isHovered, node: true })}
                    onMouseLeave={() => setIsHovered({ ...isHovered, node: false })}
                    onClick={(e) => handleOnClick(e)}
                >
                    {hasBreakpoint && (
                        <div style={{ position: "absolute", left: -5, width: 15, height: 15, borderRadius: "50%", backgroundColor: "red" }}></div>
                    )}
                    <S.TopPortWidget port={node.getPort("in")!} engine={engine} />
                    <S.DefaultContent>
                        <S.IconContainer>
                            {iconPath && <img src={iconPath} alt="Icon" />}
                        </S.IconContainer>
                        <div>

                            <Header showBorder={true}>
                                <Name>{FirstCharToUpperCase(methodName)}</Name>
                            </Header>
                            <Body>
                                <Description>{FirstCharToUpperCase(connectorName)}</Description>
                            </Body>
                        </div>
                        {isHovered.node && (
                            <S.EOptionsMenu appearance="icon" onClick={handleOnClickMenu}>
                                <MoreVertIcon />
                            </S.EOptionsMenu>
                        )}
                    </S.DefaultContent>

                    {(systemPrompt || instructions) && <S.PromptBox>
                        <Header showBorder={true}>
                            <Typography variant="h5" sx={{ margin: 0 }}>{systemPrompt ? "System Prompt" : "Instructions"}</Typography>
                        </Header>

                        <Tooltip
                            content={systemPromptSize.lineCount > 8 ? systemPrompt : undefined}
                            sx={{
                                maxWidth: "50%",
                                textWrap: "wrap"
                            }}
                            position={'bottom'} >
                            <Typography variant="body3" sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: '8',
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>{systemPrompt ?? instructions}</Typography>
                        </Tooltip>
                    </S.PromptBox>}

                    {prompt && <S.PromptBox style={{ marginTop: "5px" }}>
                        <Header showBorder={true}>
                            <Typography variant="h5" sx={{ margin: 0 }}>User Prompt</Typography>
                        </Header>
                        <Tooltip
                            content={promptSize.lineCount > 8 ? prompt : undefined}
                            sx={{
                                maxWidth: "50%",
                                textWrap: "wrap"
                            }}
                            position={'bottom'} >
                            <Typography variant="body3" sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: '8',
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>{prompt}</Typography>
                        </Tooltip>
                    </S.PromptBox>}

                    {stNode.tools && <div style={{ width: "90%", height: "0.2px", margin: "10px auto", backgroundColor: Colors.OUTLINE_VARIANT }} />}

                    <S.BottomPortWidget style={{ position: "absolute", bottom: "3px", left: "calc(50% - 1px)" }} port={node.getPort("out")!} engine={engine} />
                </S.Node>
            </Tooltip>

            <>
                {stNode.tools && <Typography variant="h4" sx={{
                    marginTop: NODE_GAP.AI_AGENT_TOP + systemPromptHeight + 5 + promptHeight + 12,
                    width: NODE_DIMENSIONS.AI_AGENT.WIDTH,
                    textAlign: "center",
                    position: 'absolute'
                }}>
                    Tools
                </Typography>}
                {Object.entries(connections).map(([key, value], index) => {
                    return ConnectionCircle(value as AIConnectorConnection, `${index * (NODE_DIMENSIONS.CONNECTOR.HEIGHT + NODE_GAP.CONNECTION_CIRCLE_Y)}px`, key);
                })}
            </>

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
