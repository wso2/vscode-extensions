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
import { DiagramEngine } from "@projectstorm/react-diagrams-core";
import { Icon, Item, Menu, MenuItem, Popover, Tooltip } from "@wso2/ui-toolkit";
import { MoreVertIcon } from "../../../resources";
import NodeIcon from "../../NodeIcon";
import { useDiagramContext } from "../../DiagramContext";
import { AgentRunNodeModel } from "./AgentRunNodeModel";
import { FlowNode } from "@wso2/ballerina-core";
import { DiagnosticsPopUp } from "../../DiagnosticsPopUp";
import { nodeHasError } from "../../../utils/node";
import { BreakpointMenu } from "../../BreakNodeMenu/BreakNodeMenu";
import { NodeStyles } from "../BaseNode/BaseNodeWidget";

export interface AgentRunNodeWidgetProps {
    model: AgentRunNodeModel;
    engine: DiagramEngine;
    onClick?: (node: FlowNode) => void;
}

// Compose the primary label as "{connection} → Run" using the receiver variable
// (Property.CONNECTION_KEY). When the connection is absent (e.g. a palette-added
// node before the user picks a variable), fall back to just "Run".
function getAgentRunTitle(node: FlowNode): string {
    const connection = node.properties?.connection?.value;
    const receiver = typeof connection === "string" ? connection.trim() : "";
    return receiver ? `${receiver} : Run` : "Run";
}

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
            onGoToSource();
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

    const handleOnViewAgentClick = () => {
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
        {
            id: "edit",
            label: "Edit",
            onClick: () => onNodeClick(),
        },
        { id: "goToSource", label: "Source", onClick: () => onGoToSource() },
        { id: "delete", label: "Delete", onClick: () => deleteNode() },
    ];

    const nodeTitle = getAgentRunTitle(model.node);

    const hasFullAssignment = model.node.properties?.variable?.value && model.node.properties?.expression?.value;

    const nodeDescription = hasFullAssignment
        ? `${model.node.properties.variable?.value} = ${model.node.properties?.expression?.value}`
        : model.node.properties?.variable?.value || model.node.properties?.expression?.value;

    const hasError = nodeHasError(model.node);

    return (
        <NodeStyles.Node
            hovered={isHovered}
            disabled={model.node.suggested}
            hasError={hasError}
            readOnly={readOnly}
            isActiveBreakpoint={isActiveBreakpoint}
            isSelected={isSelected}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
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
            <NodeStyles.Row>
                <NodeStyles.Icon onClick={handleOnClick}>
                    <NodeIcon type={model.node.codedata.node} size={24} />
                </NodeStyles.Icon>
                <NodeStyles.Row>
                    <NodeStyles.Header onClick={handleOnClick}>
                        <NodeStyles.Title>{nodeTitle}</NodeStyles.Title>
                        <NodeStyles.Description>{nodeDescription as ReactNode}</NodeStyles.Description>
                    </NodeStyles.Header>
                    <NodeStyles.ActionButtonGroup>
                        {hasError && <DiagnosticsPopUp node={model.node} />}
                        {canViewAgent && (
                            <Tooltip content="View agent flow">
                                <NodeStyles.MenuButton
                                    buttonSx={readOnly ? { cursor: "not-allowed" } : {}}
                                    appearance="icon"
                                    onClick={handleOnViewAgentClick}
                                >
                                    <Icon
                                        name="bi-function-flow"
                                        sx={{ width: 16, height: 16 }}
                                        iconSx={{ fontSize: 16 }}
                                    />
                                </NodeStyles.MenuButton>
                            </Tooltip>
                        )}
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
            </NodeStyles.Row>
            <NodeStyles.BottomPortWidget port={model.getPort("out")!} engine={engine} />
        </NodeStyles.Node>
    );
}
