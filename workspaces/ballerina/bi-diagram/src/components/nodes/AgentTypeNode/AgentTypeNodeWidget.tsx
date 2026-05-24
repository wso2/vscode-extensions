/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
/** @jsxImportSource @emotion/react */
import React, { ReactNode, useState } from "react";
import styled from "@emotion/styled";
import { css } from "@emotion/react";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import { Button, Item, Menu, MenuItem, Popover, ThemeColors, getAIModuleIcon, DefaultLlmIcon } from "@wso2/ui-toolkit";
import { NodeMetadata } from "@wso2/ballerina-core";
import { FlowNode } from "../../../utils/types";
import { AgentTypeNodeModel } from "./AgentTypeNodeModel";
import {
    LABEL_HEIGHT,
    LABEL_WIDTH,
    NODE_BORDER_WIDTH,
    NODE_GAP_X,
    NODE_HEIGHT,
    NODE_PADDING,
    NODE_WIDTH,
} from "../../../resources/constants";
import { MoreVertIcon } from "../../../resources/icons";
import NodeIcon from "../../NodeIcon";
import { useDiagramContext } from "../../DiagramContext";
import { DiagnosticsPopUp } from "../../DiagnosticsPopUp";
import { nodeHasError } from "../../../utils/node";
import ReactMarkdown from "react-markdown";

namespace Styles {
    export const Node = styled.div<{ readOnly: boolean }>`
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        cursor: ${(props: { readOnly: boolean }) => (props.readOnly ? "default" : "pointer")};
    `;

    export type BoxProp = { hovered: boolean; hasError: boolean; readOnly: boolean; isSelected?: boolean };
    export const Box = styled.div<BoxProp>`
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        width: ${NODE_WIDTH}px;
        min-height: ${NODE_HEIGHT}px;
        padding: 0 ${NODE_PADDING}px;
        border: ${NODE_BORDER_WIDTH}px solid
            ${(props: BoxProp) =>
                props.hasError
                    ? ThemeColors.ERROR
                    : (props.isSelected || (props.hovered && !props.readOnly))
                        ? ThemeColors.SECONDARY
                        : ThemeColors.OUTLINE_VARIANT};
        border-radius: 10px;
        background-color: ${ThemeColors.SURFACE_DIM};
        color: ${ThemeColors.ON_SURFACE};
        transition: border-color 0.4s ease-out;
    `;

    export const Row = styled.div`
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        z-index: 2;
    `;

    export const Icon = styled.div`
        padding: 4px;
        svg {
            fill: ${ThemeColors.ON_SURFACE};
        }
    `;

    export const Header = styled.div`
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        gap: 2px;
        flex: 1;
        padding: 8px;
    `;

    export const Title = styled.div`
        font-size: 14px;
        height: 18px;
        max-width: ${NODE_WIDTH - 80}px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: "GilmerMedium";
    `;

    export const Description = styled.div`
        font-size: 12px;
        max-width: ${NODE_WIDTH - 80}px;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: monospace;
        color: ${ThemeColors.ON_SURFACE};
        opacity: 0.7;
    `;

    export const ActionButtonGroup = styled.div`
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 2px;
    `;

    export const Divider = styled.div`
        width: calc(100% - 16px);
        margin: 2px 8px 6px;
        border-top: 1px dashed ${ThemeColors.OUTLINE_VARIANT};
    `;

    export const DescriptionBlock = styled.div<{ readOnly: boolean }>`
        width: 100%;
        padding: 0 8px 8px;
        cursor: ${(props: { readOnly: boolean }) => (props.readOnly ? "default" : "pointer")};
        z-index: 2;
    `;

    export const AgentDescription = styled.div`
        font-size: 12px;
        line-height: 1.4;
        color: ${ThemeColors.ON_SURFACE};
        opacity: 0.7;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 4;
        -webkit-box-orient: vertical;

        p {
            margin: 0 0 0.3em 0;
        }
        p:last-child {
            margin-bottom: 0;
        }
    `;

    export const MenuButton = styled(Button)`
        border-radius: 5px;
    `;

    export const TopPortWidget = styled(PortWidget)`
        margin-top: -3px;
        z-index: 2;
    `;

    export const BottomPortWidget = styled(PortWidget)`
        margin-bottom: -2px;
        z-index: 2;
    `;
}

export interface AgentTypeNodeWidgetProps {
    model: AgentTypeNodeModel;
    engine: DiagramEngine;
    onClick?: (node: FlowNode) => void;
}

export function AgentTypeNodeWidget(props: AgentTypeNodeWidgetProps) {
    const { model, engine, onClick } = props;
    const { onNodeSelect, goToSource, agentNode, readOnly, selectedNodeId } = useDiagramContext();

    const [isHovered, setIsHovered] = useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const [menuButtonElement, setMenuButtonElement] = useState<HTMLElement | null>(null);
    const isMenuOpen = Boolean(anchorEl);

    const isSelected = selectedNodeId === model.node.id;
    const hasError = nodeHasError(model.node);
    const nodeMetadata = model.node.metadata?.data as NodeMetadata;
    // The model-provider circle is rendered only when the LS confirmed an ai:ModelProvider param is wired into
    // the inner agent (see CodeAnalyzer.applyCustomAgentMetadata).
    const showModelCircle = Boolean(nodeMetadata?.modelProviderParam);
    const nodeModelIconUrl = nodeMetadata?.model?.path;
    // The custom agent class's doc-comment description, shown like the system prompt on the AGENT_CALL node.
    const description = nodeMetadata?.agentDescription;

    const title = (model.node.codedata?.object as string) || model.node.metadata?.label || "Agent";
    const variableName = model.node.properties?.variable?.value as ReactNode;

    const onNodeClick = () => {
        if (readOnly) {
            return;
        }
        onClick?.(model.node);
        onNodeSelect?.(model.node);
        setAnchorEl(null);
    };

    const onModelEditClick = () => {
        if (readOnly) {
            return;
        }
        agentNode?.onModelSelect?.(model.node);
    };

    const onGoToSource = () => {
        goToSource?.(model.node);
        setAnchorEl(null);
    };

    const handleOnMenuClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        if (readOnly) {
            return;
        }
        setAnchorEl(event.currentTarget);
    };

    const handleOnContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        setAnchorEl(menuButtonElement || event.currentTarget);
    };

    const menuItems: Item[] = [
        { id: "edit", label: "Edit", onClick: () => onNodeClick() },
        { id: "goToSource", label: "Source", onClick: () => onGoToSource() },
    ];

    const svgHeight = model.node.viewState?.ch || NODE_HEIGHT;

    return (
        <Styles.Node data-testid="agent-type-node" readOnly={readOnly}>
            <Styles.Box
                hovered={isHovered}
                hasError={hasError}
                readOnly={readOnly}
                isSelected={isSelected}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onContextMenu={!readOnly ? handleOnContextMenu : undefined}
                title="Configure Agent"
            >
                <Styles.TopPortWidget port={model.getPort("in")!} engine={engine} />
                <Styles.Row>
                    <Styles.Icon onClick={onNodeClick}>
                        <NodeIcon type={model.node.codedata.node} size={24} />
                    </Styles.Icon>
                    <Styles.Header onClick={onNodeClick}>
                        <Styles.Title>{title}</Styles.Title>
                        <Styles.Description>{variableName}</Styles.Description>
                    </Styles.Header>
                    <Styles.ActionButtonGroup>
                        {hasError && <DiagnosticsPopUp node={model.node} />}
                        <Styles.MenuButton
                            ref={setMenuButtonElement}
                            buttonSx={readOnly ? { cursor: "not-allowed" } : {}}
                            appearance="icon"
                            onClick={handleOnMenuClick}
                        >
                            <MoreVertIcon />
                        </Styles.MenuButton>
                    </Styles.ActionButtonGroup>
                </Styles.Row>
                <Popover
                    open={isMenuOpen}
                    anchorEl={anchorEl}
                    handleClose={() => setAnchorEl(null)}
                    sx={{ padding: 0, borderRadius: 0 }}
                >
                    <Menu>
                        <>
                            {menuItems.map((item) => (
                                <MenuItem key={item.id} item={item} />
                            ))}
                        </>
                    </Menu>
                </Popover>
                {description && (
                    <>
                        <Styles.Divider />
                        <Styles.DescriptionBlock readOnly={readOnly} onClick={onNodeClick}>
                            <Styles.AgentDescription>
                                <ReactMarkdown
                                    disallowedElements={["script", "iframe", "object", "embed", "link", "style"]}
                                    unwrapDisallowed={true}
                                >
                                    {description}
                                </ReactMarkdown>
                            </Styles.AgentDescription>
                        </Styles.DescriptionBlock>
                    </>
                )}
                <Styles.BottomPortWidget port={model.getPort("out")!} engine={engine} />
            </Styles.Box>

            {showModelCircle && (
                <svg
                    width={NODE_GAP_X + NODE_HEIGHT + LABEL_HEIGHT + LABEL_WIDTH + 10}
                    height={svgHeight}
                    viewBox={`0 0 300 ${svgHeight}`}
                    style={{ marginLeft: "-10px", position: "relative", zIndex: 1 }}
                >
                    <defs>
                        <marker
                            id={`${model.node.id}-arrow-head`}
                            markerWidth="4"
                            markerHeight="4"
                            refX="3"
                            refY="2"
                            viewBox="0 0 4 4"
                            orient="auto"
                        >
                            <polygon points="0,4 0,0 4,2" fill={ThemeColors.ON_SURFACE} />
                        </marker>
                        <marker
                            id={`${model.node.id}-diamond-start`}
                            markerWidth="8"
                            markerHeight="8"
                            refX="4.5"
                            refY="4"
                            viewBox="0 0 8 8"
                            orient="auto"
                        >
                            <circle cx="4" cy="4" r="3" fill={ThemeColors.SURFACE_DIM} stroke={ThemeColors.ON_SURFACE} strokeWidth="1" />
                        </marker>
                    </defs>
                    <line
                        x1="0"
                        y1="25"
                        x2="57"
                        y2="25"
                        style={{
                            stroke: ThemeColors.ON_SURFACE,
                            strokeWidth: 1.5,
                            markerEnd: `url(#${model.node.id}-arrow-head)`,
                            markerStart: `url(#${model.node.id}-diamond-start)`,
                        }}
                    />
                    <circle
                        cx="80"
                        cy="24"
                        r="22"
                        fill={ThemeColors.SURFACE_DIM}
                        stroke={ThemeColors.OUTLINE_VARIANT}
                        strokeWidth={1.5}
                        onClick={onModelEditClick}
                        css={css`
                            cursor: ${readOnly ? "default" : "pointer"};
                            transition: stroke 0.4s ease-out;
                            &:hover {
                                stroke: ${readOnly ? ThemeColors.OUTLINE_VARIANT : ThemeColors.SECONDARY};
                            }
                        `}
                    >
                        <title>Configure Model Provider</title>
                    </circle>
                    <foreignObject x="68" y="12" width="44" height="44" style={{ pointerEvents: "none" }}>
                        {getAIModuleIcon(nodeMetadata?.model?.type) ??
                            (nodeModelIconUrl ? <img src={nodeModelIconUrl} style={{ width: 24, height: 24 }} /> : <DefaultLlmIcon />)}
                    </foreignObject>
                </svg>
            )}
        </Styles.Node>
    );
}
