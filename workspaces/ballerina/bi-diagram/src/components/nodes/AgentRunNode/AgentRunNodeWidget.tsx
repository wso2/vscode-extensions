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

import React, { ReactNode, useState } from "react";
import styled from "@emotion/styled";
import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { Icon, Item, Menu, MenuItem, Popover, ThemeColors } from "@wso2/ui-toolkit";
import { MoreVertIcon } from "../../../resources";
import NodeIcon from "../../NodeIcon";
import { useDiagramContext } from "../../DiagramContext";
import { AgentRunNodeModel } from "./AgentRunNodeModel";
import { FlowNode } from "@wso2/ballerina-core";
import { DiagnosticsPopUp } from "../../DiagnosticsPopUp";
import { nodeHasError } from "../../../utils/node";
import { BreakpointMenu } from "../../BreakNodeMenu/BreakNodeMenu";
import { NodeStyles } from "../BaseNode/BaseNodeWidget";
import { ViewAgentButton } from "../AgentCallNode/AgentCallNodeWidget";
import {
    DRAFT_NODE_BORDER_WIDTH,
    NODE_BORDER_WIDTH,
    NODE_HEIGHT,
    NODE_PADDING,
    NODE_WIDTH,
} from "../../../resources/constants";

// Mirrors AgentCallNodeWidget so AGENT_RUN reads as a smaller sibling of the AI Agent card.
type BoxProps = {
    disabled: boolean;
    hovered: boolean;
    hasError: boolean;
    readOnly: boolean;
    isActiveBreakpoint: boolean;
    isSelected?: boolean;
};

const Box = styled.div<BoxProps>`
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: ${NODE_WIDTH}px;
    min-height: ${NODE_HEIGHT}px;
    padding: 0 ${NODE_PADDING}px;
    opacity: ${(p: BoxProps) => (p.disabled ? 0.7 : 1)};
    border: ${(p: BoxProps) => (p.disabled ? DRAFT_NODE_BORDER_WIDTH : NODE_BORDER_WIDTH)}px;
    border-style: ${(p: BoxProps) => (p.disabled ? "dashed" : "solid")};
    border-color: ${(p: BoxProps) =>
        p.hasError
            ? ThemeColors.ERROR
            : p.isSelected && !p.disabled
                ? ThemeColors.SECONDARY
                : p.hovered && !p.disabled && !p.readOnly
                    ? ThemeColors.SECONDARY
                    : ThemeColors.OUTLINE_VARIANT};
    border-radius: 10px;
    background-color: ${(p: BoxProps) =>
        p.isActiveBreakpoint ? ThemeColors.DEBUGGER_BREAKPOINT_BACKGROUND : ThemeColors.SURFACE_DIM};
    color: ${ThemeColors.ON_SURFACE};
    cursor: ${(p: BoxProps) => (p.readOnly ? "default" : "pointer")};
`;

const Column = styled.div`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    gap: 8px;
`;

const HeaderSection = styled.div<{ withDivider: boolean }>`
    width: 100%;
    ${(props: { withDivider: boolean }) =>
        props.withDivider ? `border-bottom: 1px dashed ${ThemeColors.OUTLINE_VARIANT}; padding-bottom: 8px;` : ""}
`;

const TitleArrow = styled.span`
    font-size: 11px;
    opacity: 0.6;
    margin: 0 4px;
    vertical-align: 1px;
`;

const AgentRow = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 4px 8px 8px;
`;

const AgentName = styled.div`
    flex: 1;
    min-width: 0;
    color: ${ThemeColors.ON_SURFACE};
    opacity: 0.7;
    font-family: monospace;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;


const IconBox = styled.div`
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    margin-right: 4px;
`;

const RunBadge = styled.div`
    position: absolute;
    bottom: -5px;
    right: -5px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
`;

export interface AgentRunNodeWidgetProps {
    model: AgentRunNodeModel;
    engine: DiagramEngine;
    onClick?: (node: FlowNode) => void;
}

const NODE_TITLE = (
    <>
        AI Agent<TitleArrow>:</TitleArrow>Run
    </>
);

export function AgentRunNodeWidget(props: AgentRunNodeWidgetProps) {
    const { model, engine, onClick } = props;
    const {
        onNodeSelect,
        goToSource,
        goToAgent,
        onDeleteNode,
        removeBreakpoint,
        addBreakpoint,
        readOnly,
        selectedNodeId,
        agentNode,
    } = useDiagramContext();

    const isSelected = selectedNodeId === model.node.id;
    // Hide the redirect when navigation isn't wired or the receiver is unresolved.
    const canViewAgent = Boolean(goToAgent) && typeof model.node.properties?.connection?.value === "string";

    const [isHovered, setIsHovered] = useState(false);
    const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const [menuButtonElement, setMenuButtonElement] = useState<HTMLElement | null>(null);
    const isMenuOpen = Boolean(menuAnchorEl);
    const hasBreakpoint = model.hasBreakpoint();
    const isActiveBreakpoint = model.isActiveBreakpoint();

    const handleOnClick = async (event: React.MouseEvent<HTMLDivElement>) => {
        if (readOnly) {
            return;
        }
        if (event.metaKey) {
            // Match the function-call node: ⌘+click jumps to the target's flow (here, the agent's focus diagram).
            if (canViewAgent) {
                goToAgent?.(model.node);
            } else {
                onGoToSource();
            }
        } else {
            onNodeClick();
        }
    };

    const onNodeClick = () => {
        onClick && onClick(model.node);
        onNodeSelect && onNodeSelect(model.node);
        setMenuAnchorEl(null);
    };

    const onGoToSource = () => {
        goToSource && goToSource(model.node);
        setMenuAnchorEl(null);
    };

    const onChatWithAgent = () => {
        agentNode?.onChatWithAgent?.(model.node);
        setMenuAnchorEl(null);
    };

    const handleOnViewAgentClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        event.stopPropagation();
        if (readOnly || !goToAgent) {
            return;
        }
        goToAgent(model.node);
        setMenuAnchorEl(null);
    };

    const deleteNode = () => {
        onDeleteNode && onDeleteNode(model.node);
        setMenuAnchorEl(null);
    };

    const onAddBreakpoint = () => {
        addBreakpoint && addBreakpoint(model.node);
        setMenuAnchorEl(null);
    };

    const onRemoveBreakpoint = () => {
        removeBreakpoint && removeBreakpoint(model.node);
        setMenuAnchorEl(null);
    };

    const handleOnMenuClick = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
        if (readOnly) {
            return;
        }
        event.stopPropagation();
        setMenuAnchorEl(event.currentTarget);
    };

    const handleOnContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        setMenuAnchorEl(menuButtonElement || event.currentTarget);
    };

    const handleOnMenuClose = () => {
        setMenuAnchorEl(null);
        setIsHovered(false);
    };

    const menuItems: Item[] = [
        ...(agentNode?.onChatWithAgent ? [{
            id: "chat",
            label: "Chat",
            onClick: () => onChatWithAgent(),
        }] : []),
        {
            id: "edit",
            label: "Edit",
            onClick: () => onNodeClick(),
        },
        { id: "goToSource", label: "Source", onClick: () => onGoToSource() },
        { id: "delete", label: "Delete", onClick: () => deleteNode() },
    ];

    const connection = model.node.properties?.connection?.value;
    const agentVarName = typeof connection === "string" ? connection.trim() : "";
    const resultVar = model.node.properties?.variable?.value as ReactNode | undefined;

    const hasError = nodeHasError(model.node);

    return (
        <Box
            hovered={isHovered}
            disabled={model.node.suggested ?? false}
            hasError={hasError}
            readOnly={readOnly ?? false}
            isActiveBreakpoint={isActiveBreakpoint ?? false}
            isSelected={isSelected}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={!readOnly ? handleOnClick : undefined}
            onContextMenu={!readOnly ? handleOnContextMenu : undefined}
        >
            {hasBreakpoint && (
                <div
                    data-testid={isActiveBreakpoint ? "breakpoint-indicator-diagram-active" : "breakpoint-indicator-diagram"}
                    style={{
                        position: "absolute",
                        left: -5,
                        width: 15,
                        height: 15,
                        borderRadius: "50%",
                        backgroundColor: "red",
                    }}
                />
            )}
            <NodeStyles.TopPortWidget port={model.getPort("in")!} engine={engine} />
            <Column style={{ height: `${model.node.viewState?.ch}px` }}>
                <HeaderSection withDivider={Boolean(agentVarName)}>
                    <NodeStyles.Row>
                        <IconBox onClick={handleOnClick}>
                            <NodeIcon type={model.node.codedata.node} size={24} />
                            <RunBadge>
                                <Icon name="bi-play" iconSx={{ fontSize: "20px" }} sx={{ color: "var(--vscode-charts-green)", display: "flex", justifyContent: "center", alignItems: "center" }} />
                            </RunBadge>
                        </IconBox>
                        <NodeStyles.Header onClick={handleOnClick}>
                            <NodeStyles.Title>{NODE_TITLE}</NodeStyles.Title>
                            {resultVar && (
                                <NodeStyles.Description>{resultVar}</NodeStyles.Description>
                            )}
                        </NodeStyles.Header>
                        <NodeStyles.ActionButtonGroup>
                            {hasError && <DiagnosticsPopUp node={model.node} />}
                            <NodeStyles.MenuButton
                                ref={setMenuButtonElement}
                                buttonSx={readOnly ? { cursor: "not-allowed" } : {}}
                                appearance="icon"
                                onClick={handleOnMenuClick}
                            >
                                <MoreVertIcon />
                            </NodeStyles.MenuButton>
                        </NodeStyles.ActionButtonGroup>
                    </NodeStyles.Row>
                </HeaderSection>
                {agentVarName && (
                    <AgentRow>
                        <AgentName onClick={handleOnClick}>{agentVarName}</AgentName>
                        {canViewAgent && (
                            <ViewAgentButton onClick={handleOnViewAgentClick} title="View agent configuration">
                                <Icon name="bi-settings" sx={{ width: 12, height: 12 }} iconSx={{ fontSize: 12 }} />
                                Configure
                            </ViewAgentButton>
                        )}
                    </AgentRow>
                )}
            </Column>
            <Popover
                open={isMenuOpen}
                anchorEl={menuAnchorEl}
                handleClose={handleOnMenuClose}
                sx={{ padding: 0, borderRadius: 0 }}
            >
                <Menu>
                    <>
                        {menuItems.map((item) => (
                            <MenuItem key={item.id} item={item} />
                        ))}
                        <BreakpointMenu
                            hasBreakpoint={hasBreakpoint}
                            onAddBreakpoint={onAddBreakpoint}
                            onRemoveBreakpoint={onRemoveBreakpoint}
                        />
                    </>
                </Menu>
            </Popover>
            <NodeStyles.BottomPortWidget port={model.getPort("out")!} engine={engine} />
        </Box>
    );
}
