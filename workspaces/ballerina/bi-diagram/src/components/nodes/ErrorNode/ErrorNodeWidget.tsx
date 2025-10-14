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

import React, { useEffect, useState } from "react";
import styled from "@emotion/styled";
import { DiagramEngine, PortWidget } from "@projectstorm/react-diagrams-core";
import { ErrorNodeModel } from "./ErrorNodeModel";
import {
    WHILE_NODE_WIDTH,
    NODE_BORDER_WIDTH,
    NODE_WIDTH,
    NODE_GAP_X,
    CONTAINER_PADDING,
    DRAFT_NODE_BORDER_WIDTH,
    NODE_GAP_Y,
} from "../../../resources/constants";
import { Button, Item, Menu, MenuItem, Popover, ThemeColors } from "@wso2/ui-toolkit";
import { FlowNode } from "../../../utils/types";
import { useDiagramContext } from "../../DiagramContext";
import { MoreVertIcon } from "../../../resources";
import { DiagnosticsPopUp } from "../../DiagnosticsPopUp";
import { nodeHasError } from "../../../utils/node";
import { BreakpointMenu } from "../../BreakNodeMenu/BreakNodeMenu";
import { NodeIcon } from "../../NodeIcon";

export namespace NodeStyles {
    export const Node = styled.div`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        color: ${ThemeColors.ON_SURFACE};
        color: ${ThemeColors.ON_SURFACE};
        cursor: pointer;
    `;

    export const Header = styled.div<{}>`
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        position: absolute;
        padding: 8px;
        left: ${WHILE_NODE_WIDTH}px;
        width: max-content;
    `;

    export const StyledButton = styled(Button)`
        border-radius: 5px;
    `;

    export const ErrorIcon = styled.div`
        position: absolute;
        bottom: -8px;
        left: 48px;
    `;

    export const TopPortWidget = styled(PortWidget)`
        margin-top: -3px;
    `;

    export const BottomPortWidget = styled(PortWidget)`
        margin-bottom: -2px;
    `;

    export const StyledText = styled.div`
        font-size: 14px;
    `;

    export const Icon = styled.div`
        padding: 4px;
        svg {
            fill: ${ThemeColors.ON_SURFACE};
        }
    `;

    export const Title = styled(StyledText)`
        max-width: ${NODE_WIDTH - 50}px;
        font-family: "GilmerMedium";
    `;

    export const Row = styled.div`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
    `;

    export const Column = styled.div`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
    `;

    export type NodeStyleProp = {
        selected: boolean;
        hovered: boolean;
        hasError: boolean;
        isActiveBreakpoint?: boolean;
        disabled: boolean;
        isSelected?: boolean;
    };
    export const Box = styled.div<NodeStyleProp>`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        border: ${(props: NodeStyleProp) => (props.disabled ? DRAFT_NODE_BORDER_WIDTH : NODE_BORDER_WIDTH)}px;
        border-style: ${(props: NodeStyleProp) => (props.disabled ? "dashed" : "solid")};
        border-color: ${(props: NodeStyleProp) =>
            props.hasError
                ? ThemeColors.ERROR
                : (props.isSelected || props.selected) && !props.disabled
                ? ThemeColors.SECONDARY
                : props.hovered && !props.disabled
                ? ThemeColors.SECONDARY
                : ThemeColors.OUTLINE_VARIANT};
        border-radius: 8px;
        background-color: ${(props: NodeStyleProp) =>
            props?.isActiveBreakpoint ? ThemeColors.DEBUGGER_BREAKPOINT_BACKGROUND : ThemeColors.SURFACE_DIM};
        width: ${WHILE_NODE_WIDTH}px;
        height: ${WHILE_NODE_WIDTH}px;
    `;

    export const Hr = styled.hr`
        width: 100%;
    `;

    export type ContainerStyleProp = {
        width: number;
        height: number;
        top: number;
        left: number;
    };
    export const Container = styled.div<ContainerStyleProp>`
        position: fixed;
        width: ${(props) => props.width}px;
        height: ${(props) => props.height}px;
        top: ${(props) => props.top}px;
        left: ${(props) => props.left}px;

        border: 2px dashed ${ThemeColors.OUTLINE_VARIANT};
        border-radius: 10px;
        background-color: transparent;
        z-index: -1;
        display: flex;
        align-items: flex-end;
        pointer-events: none;
    `;
}

interface ErrorNodeWidgetProps {
    model: ErrorNodeModel;
    engine: DiagramEngine;
    onClick?: (node: FlowNode) => void;
}

export interface NodeWidgetProps extends Omit<ErrorNodeWidgetProps, "children"> {}

export function ErrorNodeWidget(props: ErrorNodeWidgetProps) {
    const { model, engine, onClick } = props;
    const {
        onNodeSelect,
        goToSource,
        onDeleteNode,
        addBreakpoint,
        removeBreakpoint,
        readOnly,
        expandedErrorHandler,
        toggleErrorHandlerExpansion,
        selectedNodeId,
    } = useDiagramContext();

    const isSelected = selectedNodeId === model.node.id;

    const [isHovered, setIsHovered] = React.useState(false);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | SVGSVGElement>(null);
    const [menuButtonElement, setMenuButtonElement] = useState<HTMLElement | null>(null);
    const isMenuOpen = Boolean(anchorEl);
    const hasBreakpoint = model.hasBreakpoint();
    const isActiveBreakpoint = model.isActiveBreakpoint();
    const hideContainer = model.node.viewState?.isTopLevel ?? false;
    const isExpanded = expandedErrorHandler === model.node.id;

    useEffect(() => {
        if (model.node.suggested) {
            model.setAroundLinksDisabled(model.node.suggested === true);
        }
    }, [model.node.suggested]);

    const handleOnClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.metaKey) {
            onGoToSource();
        } else {
            toggleErrorHandlerExpansion(model.node.id);
            // onNodeClick(); // INFO: Commented external trigger not needed
        }
    };

    const onNodeClick = () => {
        onClick && onClick(model.node);
        onNodeSelect && onNodeSelect(model.node);
        setAnchorEl(null);
    };

    const onGoToSource = () => {
        goToSource && goToSource(model.node);
        setAnchorEl(null);
    };

    const deleteNode = () => {
        onDeleteNode && onDeleteNode(model.node);
        setAnchorEl(null);
    };

    const onAddBreakpoint = () => {
        addBreakpoint && addBreakpoint(model.node);
        setAnchorEl(null);
    };

    const onRemoveBreakpoint = () => {
        removeBreakpoint && removeBreakpoint(model.node);
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

    const handleOnMenuClose = () => {
        setAnchorEl(null);
        setIsHovered(false);
    };

    const menuItems: Item[] = [
        {
            id: "expand",
            label: isExpanded ? "Hide Error Flow" : "Show Error Flow",
            onClick: () => toggleErrorHandlerExpansion(model.node.id),
        },
        { id: "goToSource", label: "Source", onClick: () => onGoToSource() },
        { id: "delete", label: "Delete", onClick: () => deleteNode() },
    ];

    const disabled = model.node.suggested;
    const hasError = nodeHasError(model.node);
    const nodeViewState = model.node.viewState;

    const bodyBranchViewState = model.node.branches.find((branch) => branch.codedata.node === "BODY")?.viewState;
    const onFailureBranchViewState = model.node.branches.find(
        (branch) => branch.codedata.node === "ON_FAILURE"
    )?.viewState;

    return (
        <NodeStyles.Node>
            <NodeStyles.Row>
                <NodeStyles.Column>
                    <NodeStyles.Box
                        onClick={handleOnClick}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        onContextMenu={!readOnly ? handleOnContextMenu : undefined}
                        selected={model.isSelected() || isExpanded}
                        hovered={isHovered || isExpanded}
                        hasError={hasError}
                        isActiveBreakpoint={isActiveBreakpoint}
                        disabled={disabled}
                        isSelected={isSelected}
                    >
                        {hasBreakpoint && (
                            <div
                                style={{
                                    position: "absolute",
                                    left: 1,
                                    width: 15,
                                    height: 15,
                                    borderRadius: "50%",
                                    backgroundColor: "red",
                                }}
                            />
                        )}
                        <NodeStyles.TopPortWidget port={model.getPort("in")!} engine={engine} />
                        <NodeIcon type={model.node.codedata.node} size={24} />
                        <NodeStyles.BottomPortWidget port={model.getPort("out")!} engine={engine} />
                    </NodeStyles.Box>
                </NodeStyles.Column>
                <NodeStyles.Header>
                    <NodeStyles.Title>Error Handler</NodeStyles.Title>
                    <NodeStyles.StyledButton
                        ref={setMenuButtonElement}
                        buttonSx={readOnly ? { cursor: "not-allowed" } : {}}
                        appearance="icon"
                        onClick={handleOnMenuClick}
                    >
                        <MoreVertIcon />
                    </NodeStyles.StyledButton>
                </NodeStyles.Header>
                {hasError && (
                    <NodeStyles.ErrorIcon>
                        <DiagnosticsPopUp node={model.node} />
                    </NodeStyles.ErrorIcon>
                )}
                <Popover
                    open={isMenuOpen}
                    anchorEl={anchorEl}
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
            <>
                {bodyBranchViewState && !hideContainer && (
                    <NodeStyles.Container
                        width={nodeViewState.clw + nodeViewState.crw + NODE_GAP_X / 2}
                        height={bodyBranchViewState.ch + NODE_GAP_Y + CONTAINER_PADDING}
                        top={nodeViewState.y}
                        left={nodeViewState.x + nodeViewState.lw - nodeViewState.clw - NODE_GAP_X / 4}
                    ></NodeStyles.Container>
                )}
                {onFailureBranchViewState && (
                    <NodeStyles.Container
                        width={nodeViewState.clw + nodeViewState.crw + NODE_GAP_X / 2}
                        height={onFailureBranchViewState.ch + NODE_GAP_Y + CONTAINER_PADDING}
                        top={onFailureBranchViewState.y - CONTAINER_PADDING}
                        left={nodeViewState.x + nodeViewState.lw - nodeViewState.clw - NODE_GAP_X / 4}
                    ></NodeStyles.Container>
                )}
            </>
        </NodeStyles.Node>
    );
}
