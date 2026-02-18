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

import { useEffect, useState, useCallback, useRef } from "react";
import { useVisualizerContext } from "@wso2/arazzo-designer-rpc-client";
import { ArazzoDefinition, ArazzoWorkflow, EVENT_TYPE, MACHINE_VIEW, MachineStateValue } from "@wso2/arazzo-designer-core";
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    addEdge,
    Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { buildGraphFromWorkflow } from './graphBuilder';
import { nodeTypes } from '../../components/nodes';
import { PlannedPathEdge } from '../../components/edges';
import { SidePanel, SidePanelTitleContainer, SidePanelBody, Button, Codicon, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import * as C from '../../constants/nodeConstants';
import { NodePropertiesPanel } from './NodePropertiesPanel';

interface WorkflowViewProps {
    fileUri: string;
    workflowId?: string;
}

const NodeDataContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const DataSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const DataLabel = styled.div`
    font-weight: 600;
    font-size: 13px;
    color: var(--vscode-foreground);
    margin-bottom: 4px;
`;

const DataValue = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    padding: 8px;
    background-color: var(--vscode-textBlockQuote-background);
    border-radius: 4px;
    font-family: var(--vscode-editor-font-family);
    white-space: pre-wrap;
    word-break: break-word;
`;

const JsonValue = styled.pre`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    padding: 8px;
    background-color: var(--vscode-textBlockQuote-background);
    border-radius: 4px;
    font-family: var(--vscode-editor-font-family);
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    overflow-x: auto;
`;

const StyledButton = styled(Button)`
    border-radius: 5px;
`;

const ThemedControls = styled(Controls)`
    --xy-controls-button-background-color: var(--vscode-editorWidget-background);
    --xy-controls-button-background-color-hover: var(--vscode-list-hoverBackground);
    --xy-controls-button-color: var(--vscode-editorWidget-foreground);
    --xy-controls-button-color-hover: var(--vscode-editorWidget-foreground);
    --xy-controls-button-border-color: var(--vscode-editorWidget-border);
    --xy-controls-box-shadow: 0 0 2px 1px var(--vscode-widget-shadow);
`;

const LoaderContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100%;
    background-color: var(--vscode-editor-background);
`;

const Spinner = styled.div`
    width: 50px;
    height: 50px;
    border: 4px solid var(--vscode-editor-foreground);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const LoaderText = styled.div`
    margin-top: 20px;
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-font-family);
    font-size: 14px;
`;

export function WorkflowView(props: WorkflowViewProps) {
    const { fileUri, workflowId } = props;
    console.log('WorkflowView rendered with props:', { fileUri, workflowId });
    const { rpcClient } = useVisualizerContext();
    const [arazzoDefinition, setArazzoDefinition] = useState<ArazzoDefinition | undefined>(undefined);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const reactFlowInstanceRef = useRef<any>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [graphKey, setGraphKey] = useState(0);
    const [isVertical, setIsVertical] = useState(false);
    const [workflow, setWorkflow] = useState<ArazzoWorkflow | undefined>(undefined);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingError, setLoadingError] = useState<string | null>(null);

    // Edge types configuration
    const edgeTypes = {
        plannedPath: PlannedPathEdge
    };

    rpcClient?.onStateChanged((newState: MachineStateValue) => {
        if (typeof newState === 'object' && 'ready' in newState && newState.ready === 'viewReady') {
            fetchData();
        }
    });

    const fetchData = async () => {
        try {
            setIsLoading(true);
            setLoadingError(null);
            const resp = await rpcClient.getVisualizerRpcClient().getArazzoModel({
                uri: fileUri,
            });
            console.log('getArazzoModel response:', resp);
            setArazzoDefinition(resp.model);
        } catch (error) {
            console.error('Error fetching Arazzo model:', error);
            setLoadingError(error instanceof Error ? error.message : 'Failed to load Arazzo model');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fileUri, workflowId]);

    // Build graph when workflow data is available
    useEffect(() => {
        console.log('WorkflowView useEffect triggered', { arazzoDefinition, workflowId });
        if (arazzoDefinition) {
            const targetWorkflowId = workflowId || arazzoDefinition.workflows?.[0]?.workflowId;
            console.log('Target workflow ID:', targetWorkflowId);
            if (targetWorkflowId) {
                const workflow = arazzoDefinition.workflows?.find(wf => wf.workflowId === targetWorkflowId);
                console.log('Found workflow:', workflow);
                if (workflow) {
                    // Keep workflow in state for Start node rendering
                    setWorkflow(workflow);

                    // Clear existing graph
                    setNodes([]);
                    setEdges([]);

                    // Build new graph
                    console.log('Building graph...');
                    buildGraphFromWorkflow(workflow, isVertical, arazzoDefinition).then(({ nodes: builtNodes, edges: builtEdges }) => {
                        console.log('Graph built successfully:', { nodes: builtNodes, edges: builtEdges });
                        setNodes(builtNodes);
                        setEdges(builtEdges);
                        setGraphKey(prev => prev + 1); // Force complete re-mount to clear artifacts

                        // Center view after render
                        setTimeout(() => reactFlowWrapper.current?.focus(), 50);
                    }).catch(err => {
                        console.error("Error building graph layout:", err);
                    });
                }
            }
        }
    }, [arazzoDefinition, workflowId, isVertical]);

    // Wheel handler: ctrl+wheel => zoom, wheel alone => pan (React Flow handles panOnScroll)
    const onWrapperWheel = useCallback((e: React.WheelEvent) => {
        const instance = reactFlowInstanceRef.current;
        if (!instance) return;

        if (e.ctrlKey) {
            // Zoom instead of scrolling/panning
            e.preventDefault();
            try {
                const vp = (typeof instance.getViewport === 'function') ? instance.getViewport() : { x: 0, y: 0, zoom: 1 };
                // Adjust zoom by small factor (deltaY positive -> zoom out)
                const delta = -e.deltaY; // invert so wheel up -> positive
                const factor = 1 + (delta * 0.0015); // tweak sensitivity
                let newZoom = (vp.zoom || 1) * factor;
                // Clamp zoom
                newZoom = Math.max(0.2, Math.min(3, newZoom));
                if (typeof instance.setViewport === 'function') {
                    instance.setViewport({ x: vp.x, y: vp.y, zoom: newZoom });
                } else if (typeof instance.setZoom === 'function') {
                    instance.setZoom(newZoom);
                }
            } catch (err) {
                // ignore
            }
        }
        // else: let React Flow handle panOnScroll
    }, []);

    const onConnect = useCallback((params: Connection) => {
        setEdges((eds) => addEdge(params, eds));
    }, [setEdges]);

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        console.log('Node clicked:', node);
        event.stopPropagation();

        // Only open properties panel for workflow STEP, CONDITION and START nodes
        const allowedTypes = ['stepNode', 'conditionNode', 'startNode'];
        if (!allowedTypes.includes(node.type)) {
            // If panel is open for a non-allowed node, close it
            setIsPanelOpen(false);
            setSelectedNode(null);
            return;
        }

        // Set the node first
        setSelectedNode(node);
        // Use requestAnimationFrame to ensure panel renders in closed state first,
        // then triggers the open animation
        requestAnimationFrame(() => {
            setIsPanelOpen(true);
        });
    }, []);

    const handleClosePanel = useCallback(() => {
        setIsPanelOpen(false);
        setSelectedNode(null);
    }, []);

    const onPaneClick = useCallback(() => {
        // Close panel when canvas is clicked; otherwise focus canvas
        if (isPanelOpen) {
            handleClosePanel();
        } else {
            reactFlowWrapper.current?.focus();
        }
    }, [isPanelOpen, handleClosePanel]);

    const proOptions = { hideAttribution: true };

    const toggleOrientation = useCallback(() => {
        setIsVertical(prev => !prev);
    }, []);

    if (isLoading) {
        return (
            <LoaderContainer>
                <Spinner />
                <LoaderText>Loading workflow data...</LoaderText>
            </LoaderContainer>
        );
    }

    if (loadingError) {
        return (
            <LoaderContainer>
                <DataValue style={{ color: 'var(--vscode-errorForeground)' }}>
                    Error: {loadingError}
                </DataValue>
            </LoaderContainer>
        );
    }

    if (!arazzoDefinition) {
        return (
            <LoaderContainer>
                <DataValue>No Arazzo definition available</DataValue>
            </LoaderContainer>
        );
    }

    return (
        <div
            ref={reactFlowWrapper}
            style={{
                width: '100%',
                height: '100vh',
                outline: 'none',
                position: 'relative',
                backgroundColor: ThemeColors.SURFACE_BRIGHT,
                backgroundImage: `radial-gradient(${ThemeColors.SURFACE_CONTAINER} ${C.DOT_SIZE}px, transparent 0px)`,
                backgroundSize: `${C.DOT_GAP}px ${C.DOT_GAP}px`,
            }}
            tabIndex={0}
            onClick={onPaneClick}
            onWheel={onWrapperWheel}
        >
            {/* <button
                onClick={toggleOrientation}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                    padding: '8px 16px',
                    backgroundColor: 'var(--vscode-button-background)',
                    color: 'var(--vscode-button-foreground)',
                    border: '1px solid var(--vscode-button-border)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'var(--vscode-font-family)'
                }}
                title={isVertical ? 'Switch to Horizontal Layout' : 'Switch to Vertical Layout'}
            >
                {isVertical ? '↔ Horizontal' : '↕ Vertical'}
            </button> */}
            <ReactFlow
                key={graphKey}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={C.isEditable ? onConnect : undefined}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesDraggable={C.isEditable}
                nodesConnectable={C.isEditable}
                elementsSelectable={true}
                nodesFocusable={C.isEditable}
                edgesFocusable={C.isEditable}
                deleteKeyCode={C.isEditable ? 'Backspace' : null}
                selectionKeyCode={C.isEditable ? 'Shift' : null}
                multiSelectionKeyCode={C.isEditable ? 'Control' : null}
                fitView
                panOnScroll
                zoomOnScroll={false}
                onInit={(reactFlowInstance) => {
                    // Store instance for programmatic zoom and ctrl+wheel handling
                    reactFlowInstanceRef.current = reactFlowInstance;

                    // After React Flow initializes and fitView runs, set zoom to 150%.
                    // Small timeout ensures fitView has applied its transform first.
                    try {
                        setTimeout(() => {
                            if (reactFlowInstance && typeof (reactFlowInstance as any).setViewport === 'function') {
                                const vp: any = reactFlowInstance.getViewport ? reactFlowInstance.getViewport() : { x: 0, y: 0, zoom: 1 };
                                (reactFlowInstance as any).setViewport({ x: vp.x, y: vp.y, zoom: C.CANVAS_ZOOM });
                            } else if (reactFlowInstance && typeof (reactFlowInstance as any).setZoom === 'function') {
                                (reactFlowInstance as any).setZoom(C.CANVAS_ZOOM);
                            }
                        }, 10);
                    } catch (e) {
                        console.warn('[WorkflowView] Could not set initial zoom to 150%', e);
                    }
                }}
                proOptions={proOptions}
            >
                {/* Background dots provided by container CSS to match bi-diagram */}
                <ThemedControls showInteractive={false} />
            </ReactFlow>
            <SidePanel
                isOpen={isPanelOpen}
                alignment="right"
                overlay={false}
                width={400}
                sx={{
                    fontFamily: "var(--vscode-font-family)",
                    backgroundColor: ThemeColors.SURFACE_DIM,
                    boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.1)",
                }}
                onClose={handleClosePanel}
            >
                <SidePanelTitleContainer>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* {selectedNode ? (selectedNode.data?.label || selectedNode.id) : 'Node Properties'} */}
                        Properties
                    </div>
                    <StyledButton data-testid="close-panel-btn" appearance="icon" onClick={handleClosePanel}>
                        <Codicon name="close" />
                    </StyledButton>
                </SidePanelTitleContainer>
                <SidePanelBody onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <NodePropertiesPanel node={selectedNode} workflow={workflow} definition={arazzoDefinition} />
                </SidePanelBody>
            </SidePanel>
        </div>
    );
}
