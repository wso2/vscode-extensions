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

import React, { useState, useEffect, memo } from "react";
import { DiagramEngine, DiagramModel } from "@projectstorm/react-diagrams";
import { cloneDeep } from "lodash";
import { NavigationWrapperCanvasWidget } from "@wso2/ui-toolkit";

import {
    clearDiagramZoomAndPosition,
    generateEngine,
    hasDiagramZoomAndPosition,
    loadDiagramZoomAndPosition,
    registerListeners,
    resetDiagramZoomAndPosition,
} from "../utils/diagram";
import { DiagramCanvas } from "./DiagramCanvas";
import { Flow, NodeModel, FlowNode, Branch, LineRange, NodePosition, ToolData, DraftNodeConfig } from "../utils/types";
import { NodeFactoryVisitor } from "../visitors/NodeFactoryVisitor";
import { NodeLinkModel } from "./NodeLink";
import { OverlayLayerModel } from "./OverlayLayer";
import { DiagramContextProvider, DiagramContextState, ExpressionContextProps } from "./DiagramContext";
import { SizingVisitor } from "../visitors/SizingVisitor";
import { PositionVisitor } from "../visitors/PositionVisitor";
import { InitVisitor } from "../visitors/InitVisitor";
import { LinkTargetVisitor } from "../visitors/LinkTargetVisitor";
import { NodeTypes } from "../resources/constants";
import Controls from "./Controls";
import { CurrentBreakpointsResponse as BreakpointInfo, traverseFlow } from "@wso2/ballerina-core";
import { BreakpointVisitor } from "../visitors/BreakpointVisitor";
import { BaseNodeModel } from "./nodes/BaseNode";
import { PopupOverlay } from "./PopupOverlay";

export interface DiagramProps {
    model: Flow;
    onAddNode?: (parent: FlowNode | Branch, target: LineRange) => void;
    onAddNodePrompt?: (parent: FlowNode | Branch, target: LineRange, prompt: string) => void;
    onDeleteNode?: (node: FlowNode) => void;
    onAddComment?: (comment: string, target: LineRange) => void;
    onNodeSelect?: (node: FlowNode) => void;
    onNodeSave?: (node: FlowNode) => void;
    addBreakpoint?: (node: FlowNode) => void;
    removeBreakpoint?: (node: FlowNode) => void;
    onConnectionSelect?: (connectionName: string) => void;
    goToSource?: (node: FlowNode) => void;
    openView?: (filePath: string, position: NodePosition) => void;
    draftNode?: DraftNodeConfig;
    selectedNodeId?: string;
    // agent node callbacks
    agentNode?: {
        onModelSelect: (node: FlowNode) => void;
        onAddTool: (node: FlowNode) => void;
        onAddMcpServer: (node: FlowNode) => void;
        onSelectTool: (tool: ToolData, node: FlowNode) => void;
        onSelectMcpToolkit: (tool: ToolData, node: FlowNode) => void;
        onDeleteTool: (tool: ToolData, node: FlowNode) => void;
        goToTool: (tool: ToolData, node: FlowNode) => void;
        onSelectMemoryManager: (node: FlowNode) => void;
        onDeleteMemoryManager: (node: FlowNode) => void;
    };
    // ai nodes callbacks
    aiNodes?: {
        onModelSelect: (node: FlowNode) => void;
    };
    // ai suggestions callbacks
    suggestions?: {
        fetching: boolean;
        onAccept(): void;
        onDiscard(): void;
    };
    project?: {
        org: string;
        path: string;
        getProjectPath?:(segments: string | string[]) => Promise<string>;
    };
    breakpointInfo?: BreakpointInfo;
    readOnly?: boolean;
    overlay?: {
        visible: boolean;
        onClickOverlay: () => void;
    }
    expressionContext?: ExpressionContextProps;
}

export function Diagram(props: DiagramProps) {
    const {
        model,
        onAddNode,
        onAddNodePrompt,
        onDeleteNode,
        onAddComment,
        onNodeSelect,
        onNodeSave,
        onConnectionSelect,
        goToSource,
        openView,
        draftNode,
        selectedNodeId,
        agentNode,
        aiNodes,
        suggestions,
        project,
        addBreakpoint,
        removeBreakpoint,
        breakpointInfo,
        readOnly,
        overlay,
        expressionContext,
    } = props;

    const [showErrorFlow, setShowErrorFlow] = useState(false);
    const [diagramEngine] = useState<DiagramEngine>(generateEngine());
    const [diagramModel, setDiagramModel] = useState<DiagramModel | null>(null);
    const [showComponentPanel, setShowComponentPanel] = useState(false);
    const [expandedErrorHandler, setExpandedErrorHandler] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (diagramEngine) {
            const { nodes, links } = getDiagramData();
            drawDiagram(nodes, links);
        }
    }, [model, showErrorFlow, expandedErrorHandler]);

    useEffect(() => {
        console.log(">>> Init diagram model", model);
        return () => {
            clearDiagramZoomAndPosition();
        };
    }, []);

    const getDiagramData = () => {
        let flowModel = cloneDeep(model);

        // Check if active breakpoint is within onFailure nodes and update expandedErrorHandler before running visitors
        let currentExpandedErrorHandler = expandedErrorHandler;
        if (breakpointInfo?.activeBreakpoint) {
            const errorHandlerToExpand = getErrorHandlerIdForActiveBreakpoint(flowModel, breakpointInfo);
            if (errorHandlerToExpand && expandedErrorHandler !== errorHandlerToExpand) {
                currentExpandedErrorHandler = errorHandlerToExpand;
                setExpandedErrorHandler(errorHandlerToExpand);
            }
        }

        const initVisitor = new InitVisitor(flowModel, currentExpandedErrorHandler);
        traverseFlow(flowModel, initVisitor);
        const sizingVisitor = new SizingVisitor();
        traverseFlow(flowModel, sizingVisitor);
        const positionVisitor = new PositionVisitor();
        traverseFlow(flowModel, positionVisitor);
        if (breakpointInfo) {
            const breakpointVisitor = new BreakpointVisitor(breakpointInfo);
            traverseFlow(flowModel, breakpointVisitor);
        }
        // create diagram nodes and links
        const nodeVisitor = new NodeFactoryVisitor();
        traverseFlow(flowModel, nodeVisitor);

        const nodes = nodeVisitor.getNodes();
        const links = nodeVisitor.getLinks();

        const addTargetVisitor = new LinkTargetVisitor(model, nodes);
        traverseFlow(flowModel, addTargetVisitor);
        return { nodes, links };
    };

    // Helper function to find error handlers with active breakpoints in onFailure branches
    const getErrorHandlerIdForActiveBreakpoint = (flow: Flow, breakpointInfo: BreakpointInfo): string | undefined => {
        if (!breakpointInfo.activeBreakpoint) {
            return undefined;
        }

        let errorHandlerIdToExpand: string | undefined;
        const activeBreakpoint = breakpointInfo.activeBreakpoint;

        const checkNode = (node: FlowNode): void => {
            if (node.codedata?.node === "ERROR_HANDLER") {
                // Find the onFailure branch
                const onFailureBranch = node.branches?.find((branch) => branch.codedata?.node === "ON_FAILURE");
                if (onFailureBranch) {
                    // Check if any child nodes in the onFailure branch match the active breakpoint
                    const hasActiveBreakpointInOnFailure = checkForActiveBreakpointInBranch(
                        onFailureBranch,
                        activeBreakpoint
                    );
                    if (hasActiveBreakpointInOnFailure) {
                        errorHandlerIdToExpand = node.id;
                        return;
                    }
                }
            }

            // Recursively check child nodes
            if (node.branches) {
                for (const branch of node.branches) {
                    if (branch.children) {
                        for (const child of branch.children) {
                            checkNode(child);
                            if (errorHandlerIdToExpand) return;
                        }
                    }
                }
            }
        };

        const checkForActiveBreakpointInBranch = (branch: any, activeBreakpoint: any): boolean => {
            if (branch.children) {
                for (const child of branch.children) {
                    // Check if this node matches the active breakpoint
                    if (child.codedata?.lineRange?.startLine?.line === activeBreakpoint.line) {
                        return true;
                    }
                    // Recursively check nested branches
                    if (child.branches) {
                        for (const nestedBranch of child.branches) {
                            if (checkForActiveBreakpointInBranch(nestedBranch, activeBreakpoint)) {
                                return true;
                            }
                        }
                    }
                }
            }
            return false;
        };

        // Start checking from the root nodes
        if (flow.nodes) {
            for (const child of flow.nodes) {
                checkNode(child);
                if (errorHandlerIdToExpand) break;
            }
        }

        return errorHandlerIdToExpand;
    };

    const drawDiagram = (nodes: NodeModel[], links: NodeLinkModel[]) => {
        const newDiagramModel = new DiagramModel();
        newDiagramModel.addLayer(new OverlayLayerModel());
        // add nodes and links to the diagram

        // get code block nodes from nodes
        const codeBlockNodes = nodes.filter((node) => node.getType() === NodeTypes.CODE_BLOCK_NODE);
        // get all other nodes
        const otherNodes = nodes.filter((node) => node.getType() !== NodeTypes.CODE_BLOCK_NODE);

        newDiagramModel.addAll(...codeBlockNodes);
        newDiagramModel.addAll(...otherNodes, ...links);

        diagramEngine.setModel(newDiagramModel);
        setDiagramModel(newDiagramModel);
        registerListeners(diagramEngine);

        diagramEngine.setModel(newDiagramModel);
        // remove loader overlay layer
        const overlayLayer = diagramEngine
            .getModel()
            .getLayers()
            .find((layer) => layer instanceof OverlayLayerModel);
        if (overlayLayer) {
            diagramEngine.getModel().removeLayer(overlayLayer);
        }

        if (nodes.length < 3 || !hasDiagramZoomAndPosition(model.fileName)) {
            resetDiagramZoomAndPosition(model.fileName);
        }
        loadDiagramZoomAndPosition(diagramEngine);

        diagramEngine.repaintCanvas();
        // update the diagram model state
        setDiagramModel(newDiagramModel);
    };

    const handleCloseComponentPanel = () => {
        setShowComponentPanel(false);
    };

    const handleShowComponentPanel = () => {
        setShowComponentPanel(true);
    };

    const toggleErrorHandlerExpansion = (nodeId: string) => {
        setExpandedErrorHandler((prev) => (prev === nodeId ? undefined : nodeId));
    };

    const context: DiagramContextState = {
        flow: model,
        componentPanel: {
            visible: showComponentPanel,
            show: handleShowComponentPanel,
            hide: handleCloseComponentPanel,
        },
        showErrorFlow: showErrorFlow,
        expandedErrorHandler: expandedErrorHandler,
        toggleErrorHandlerExpansion: toggleErrorHandlerExpansion,
        onAddNode: onAddNode,
        onAddNodePrompt: onAddNodePrompt,
        onDeleteNode: onDeleteNode,
        onAddComment: onAddComment,
        onNodeSelect: onNodeSelect,
        onNodeSave: onNodeSave,
        addBreakpoint: addBreakpoint,
        removeBreakpoint: removeBreakpoint,
        onConnectionSelect: onConnectionSelect,
        goToSource: goToSource,
        openView: openView,
        draftNode: draftNode,
        selectedNodeId: selectedNodeId,
        agentNode: agentNode,
        aiNodes: aiNodes,
        suggestions: suggestions,
        project: project,
        readOnly: onAddNode === undefined || onDeleteNode === undefined || onNodeSelect === undefined || readOnly,
        expressionContext: expressionContext,
    };

    const getActiveBreakpointNode = (nodes: NodeModel[]): NodeModel => {
        const node = nodes.find((node) => {
            const isValidType =
                node.getType() === NodeTypes.BASE_NODE ||
                node.getType() === NodeTypes.WHILE_NODE ||
                node.getType() === NodeTypes.IF_NODE ||
                node.getType() === NodeTypes.API_CALL_NODE;
            return isValidType && (node as BaseNodeModel).isActiveBreakpoint();
        });

        return node;
    };

    return (
        <>
            <Controls engine={diagramEngine} />
            {diagramEngine && diagramModel && (
                <DiagramContextProvider value={context}>
                    {overlay?.visible && <PopupOverlay onClose={overlay.onClickOverlay} />}
                    <DiagramCanvas>
                        <NavigationWrapperCanvasWidget
                            diagramEngine={diagramEngine}
                            focusedNode={getActiveBreakpointNode(diagramModel.getNodes() as NodeModel[])}
                        />
                    </DiagramCanvas>
                </DiagramContextProvider>
            )}
        </>
    );
}

export const MemoizedDiagram = memo(Diagram);
