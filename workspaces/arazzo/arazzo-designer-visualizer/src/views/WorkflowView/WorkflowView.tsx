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
import { Global, css } from "@emotion/react";
import { useVisualizerContext } from "@wso2/arazzo-designer-rpc-client";
import { ArazzoDefinition, ArazzoWorkflow, EVENT_TYPE, MACHINE_VIEW, MachineStateValue, WebviewTraceEvent, StepTraceStatus } from "@wso2/arazzo-designer-core";
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
    MarkerType,
} from '@xyflow/react';
// @ts-ignore
import '@xyflow/react/dist/style.css';
import { buildGraphFromWorkflow } from './graphBuilder';
import { nodeTypes } from '../../components/nodes';
import { PlannedPathEdge } from '../../components/edges';
import { SidePanel, SidePanelTitleContainer, SidePanelBody, Button, Codicon, ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import * as C from '../../constants/nodeConstants';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { WorkflowSelectionScreen } from './WorkflowSelectionScreen';
import { WorkflowTitleBar } from './WorkflowTitleBar';
import { MODERN } from '../../constants';

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

// ---------------------------------------------------------------------------
// Path-finding utility (pure, no React dependency)
// ---------------------------------------------------------------------------

interface TracePathResult {
    /** Edge IDs that form the path and should be highlighted. */
    edgeIds: string[];
    /** Intermediate conditionNode IDs whose borders should be highlighted. */
    intermediateNodeIds: string[];
    /** Portal nodes on the path: a visible edge portalId→targetId must be injected. */
    portalLinks: Array<{ portalId: string; targetId: string }>;
}

/**
 * BFS from `fromId` to `toId` routing through conditionNode and portalNode intermediaries.
 * Step nodes are never traversed through — if a path requires crossing a step node it means
 * that step executed separately and should not be part of this path.
 *
 * Portal nodes have no real edge to their target; their `data.gotoNodeId` is the logical
 * destination. When a portal is on the path it is returned in `portalLinks` so the caller
 * can inject a temporary visible edge.
 */
function findTracePath(
    fromId: string,
    toId: string,
    edges: Edge[],
    nodes: Node[],
): TracePathResult | null {
    const condNodeIds = new Set(nodes.filter(n => n.type === 'conditionNode').map(n => n.id));
    const portalMap = new Map<string, string>(
        nodes
            .filter(n => n.type === 'portalNode' && (n.data as any).gotoNodeId)
            .map(n => [n.id, (n.data as any).gotoNodeId as string]),
    );
    const retryMap = new Map<string, string>(
        nodes
            .filter(n => n.type === 'retryNode' && (n.data as any).gotoNodeId)
            .map(n => [n.id, (n.data as any).gotoNodeId as string]),
    );

    // Special case: fromId itself is a portal/retry node that jumps directly to toId
    const fromLogicalTarget = portalMap.get(fromId) ?? retryMap.get(fromId);
    if (fromLogicalTarget === toId) {
        return { edgeIds: [], intermediateNodeIds: [], portalLinks: [{ portalId: fromId, targetId: toId }] };
    }

    type QueueItem = {
        nodeId: string;
        edgeIds: string[];
        intermediateNodeIds: string[];
        portalLinks: Array<{ portalId: string; targetId: string }>;
    };

    const visited = new Set<string>([fromId]);
    const queue: QueueItem[] = [{ nodeId: fromId, edgeIds: [], intermediateNodeIds: [], portalLinks: [] }];

    while (queue.length > 0) {
        const cur = queue.shift()!;
        for (const edge of edges.filter(e => e.source === cur.nodeId)) {
            const { target } = edge;

            // Direct edge to destination
            if (target === toId) {
                return {
                    edgeIds: [...cur.edgeIds, edge.id],
                    intermediateNodeIds: cur.intermediateNodeIds,
                    portalLinks: cur.portalLinks,
                };
            }

            if (visited.has(target)) continue;
            visited.add(target);

            // Route through a condition node
            if (condNodeIds.has(target)) {
                queue.push({
                    nodeId: target,
                    edgeIds: [...cur.edgeIds, edge.id],
                    intermediateNodeIds: [...cur.intermediateNodeIds, target],
                    portalLinks: cur.portalLinks,
                });
                continue;
            }

            // Route through a portal or retry node (logical link via gotoNodeId)
            const logicalTarget = portalMap.get(target) ?? retryMap.get(target);
            if (logicalTarget !== undefined) {
                if (logicalTarget === toId) {
                    return {
                        edgeIds: [...cur.edgeIds, edge.id],
                        intermediateNodeIds: cur.intermediateNodeIds,
                        portalLinks: [...cur.portalLinks, { portalId: target, targetId: logicalTarget }],
                    };
                }
                // Portal/retry leads somewhere else — skip, not on this path
            }
        }
    }

    return null;
}

// ---------------------------------------------------------------------------

export function WorkflowView(props: WorkflowViewProps) {
    const { fileUri, workflowId } = props;
    console.log('WorkflowView rendered with props:', { fileUri, workflowId });
    const { rpcClient } = useVisualizerContext();
    const [arazzoDefinition, setArazzoDefinition] = useState<ArazzoDefinition | undefined>(undefined);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const reactFlowInstanceRef = useRef<any>(null);
    // Tracks the step that completed just before the current one, used to identify
    // which edge to highlight when a step ends. Initialized to 'virtual_start' so
    // the first step highlights the Start → Step edge.
    const prevStepRef = useRef<string>('virtual_start');
    // Tracks the workflow ID of the currently running trace.
    const activeTraceWorkflowIdRef = useRef<string | undefined>(undefined);
    // Defer resolution of nested workflow steps (Go emits early ERROR spans for them).
    const pendingNestedStepRef = useRef<{ stepId: string; nestedWorkflowId: string; prevStepId: string } | undefined>(undefined);
    // Tracks the effective ID of the workflow currently displayed. Kept as a ref so
    // trace handler closures (which accumulate across renders) always read the latest value.
    const effectiveWorkflowIdRef = useRef<string | undefined>(workflowId);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [graphKey, setGraphKey] = useState(0);
    const [isVertical, setIsVertical] = useState(false);
    const [workflow, setWorkflow] = useState<ArazzoWorkflow | undefined>(undefined);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingError, setLoadingError] = useState<string | null>(null);
    const [traceSpans, setTraceSpans] = useState<WebviewTraceEvent[]>([]);
    // When the workflow ID in the file has been renamed/removed, this holds the
    // list of available workflows so the user can pick the correct one.
    const [workflowNotFoundOptions, setWorkflowNotFoundOptions] = useState<ArazzoWorkflow[] | null>(null);

    // Edge types configuration
    const edgeTypes = {
        plannedPath: PlannedPathEdge
    };

    rpcClient?.onStateChanged((newState: MachineStateValue) => {
        if (typeof newState === 'object' && 'ready' in newState && newState.ready === 'viewReady') {
            fetchData();
        }
    });

    // Listen for trace events and update step node overlays
    rpcClient?.onTraceEvent((event: WebviewTraceEvent) => {
        // Accumulate every event so the properties panel can display spans
        setTraceSpans(prev => [...prev, event]);

        if (event.arazzo_span_kind === 'workflow' && event.lifecycle === 'start') {
            // Record which workflow this trace run is for so we can ignore events
            // from a different workflow when this view is showing a different one.
            activeTraceWorkflowIdRef.current = event.attributes?.['workflow.id'];
            // Only reset and highlight if the running workflow matches the one shown.
            if (activeTraceWorkflowIdRef.current !== effectiveWorkflowIdRef.current) { return; }
            // New workflow run started — reset step tracking and clear all highlights
            prevStepRef.current = 'virtual_start';
            setNodes(prev => prev.map(node => {
                if (node.type === 'stepNode' || node.type === 'conditionNode' || node.type === 'endNode') {
                    return { ...node, data: { ...node.data, traceStatus: undefined } };
                }
                if (node.type === 'retryNode') {
                    return { ...node, data: { ...node.data, retryAttempt: undefined } };
                }
                if (node.type === 'startNode') {
                    return { ...node, data: { ...node.data, traceStatus: { state: 'passed' } } };
                }
                return node;
            }));
            setEdges(prev => prev
                .filter(e => !e.id.startsWith('trace_portal_'))
                .map(e => ({ ...e, zIndex: 0, data: { ...e.data, traceHighlight: undefined } }))
            );

        } else if (event.arazzo_span_kind === 'step') {
            // Ignore events from a different workflow than the one being visualized
            if (activeTraceWorkflowIdRef.current !== effectiveWorkflowIdRef.current) { return; }
            const stepId = event.attributes?.['step.id'] || event.name;

            if (event.lifecycle === 'start') {
                setNodes(prev => prev.map(node => {
                    if (node.id === stepId && node.type === 'stepNode') {
                        return { ...node, data: { ...node.data, traceStatus: { state: 'running' } } };
                    }
                    return node;
                }));

            } else if (event.lifecycle === 'end') {
                const state = event.status_code === 'STATUS_CODE_OK' ? 'passed' : 'failed';
                const highlight = state;
                // Capture source before any async state update
                const prevId = prevStepRef.current;

                setNodes(prev => {
                    // Defer nested workflow step resolution (Go emits early ERROR spans).
                    const stepNode = prev.find(n => n.id === stepId && n.type === 'stepNode');
                    if (state === 'failed' && stepNode && (stepNode.data as any).workflowId) {
                        pendingNestedStepRef.current = {
                            stepId,
                            nestedWorkflowId: (stepNode.data as any).workflowId,
                            prevStepId: prevId,
                        };
                        return prev;
                    }

                    // Update node status
                    const updated = prev.map(node => {
                        if (node.id === stepId && node.type === 'stepNode') {
                            const traceStatus: StepTraceStatus = { state, durationMs: event.duration_ms };
                            return { ...node, data: { ...node.data, traceStatus } };
                        }
                        return node;
                    });

                    setEdges(prevEdges => {
                        const newEdges = [...prevEdges];

                        // Find the path prevId → stepId through conditions and/or portals
                        const path = findTracePath(prevId, stepId, newEdges, updated);

                        if (path) {
                            // Highlight each edge on the path
                            const highlightSet = new Set(path.edgeIds);
                            for (let i = 0; i < newEdges.length; i++) {
                                if (highlightSet.has(newEdges[i].id)) {
                                    newEdges[i] = {
                                        ...newEdges[i],
                                        zIndex: 10,
                                        data: { ...newEdges[i].data, traceHighlight: highlight },
                                    };
                                }
                            }

                            // Highlight borders of any intermediate condition nodes
                            for (const condId of path.intermediateNodeIds) {
                                const idx = updated.findIndex(n => n.id === condId);
                                if (idx >= 0) {
                                    updated[idx] = {
                                        ...updated[idx],
                                        data: { ...updated[idx].data, traceStatus: { state } },
                                    };
                                }
                            }

                            // Inject a visible portal/retry → target edge for each logical link on the path.
                            // Styled as a dashed line (same as the on-hover preview edge) so it is
                            // visually distinct from regular flow edges. Re-inject if already present
                            // so the color is updated to the current pass/fail state.
                            for (const { portalId, targetId } of path.portalLinks) {
                                const injectedId = `trace_portal_${portalId}_${targetId}`;
                                const color = highlight === 'passed'
                                    ? (ThemeColors as any).TESTING_PASSED
                                    : 'var(--vscode-testing-iconFailed, red)';
                                // Retry nodes use the left handle; portal nodes use the top handle
                                const sourceNode = updated.find(n => n.id === portalId);
                                const sourceHandle = sourceNode?.type === 'retryNode' ? 'h-left-source' : 'h-top';
                                const injectedEdge = {
                                    id: injectedId,
                                    source: portalId,
                                    target: targetId,
                                    sourceHandle,
                                    targetHandle: 'goto-top-target',
                                    type: 'smoothstep',
                                    style: { stroke: color, strokeDasharray: '4 4', strokeWidth: C.STROKE_WIDTH, strokeLinecap: 'round' as const },
                                    markerEnd: { type: MarkerType.ArrowClosed, color },
                                    zIndex: 10,
                                    data: { traceHighlight: highlight },
                                    animated: false,
                                };
                                const existingIdx = newEdges.findIndex(e => e.id === injectedId);
                                if (existingIdx >= 0) {
                                    newEdges[existingIdx] = injectedEdge;
                                } else {
                                    newEdges.push(injectedEdge);
                                }
                            }
                        }

                        return newEdges;
                    });

                    return updated;
                });

                // Advance the step pointer AFTER state is scheduled
                prevStepRef.current = stepId;
            }
        } else if (event.arazzo_span_kind === 'workflow' && event.lifecycle === 'end') {
            const pending = pendingNestedStepRef.current;
            if (pending && event.attributes?.['workflow.id'] === pending.nestedWorkflowId) {
                pendingNestedStepRef.current = undefined;
                activeTraceWorkflowIdRef.current = effectiveWorkflowIdRef.current; // Resume parent tracking

                const nestedState = event.status_code === 'STATUS_CODE_OK' ? 'passed' : 'failed';
                const { stepId, prevStepId } = pending;

                setNodes(prev => {
                    const updated = prev.map(node => {
                        if (node.id === stepId && node.type === 'stepNode') {
                            const traceStatus: StepTraceStatus = { state: nestedState, durationMs: event.duration_ms };
                            return { ...node, data: { ...node.data, traceStatus } };
                        }
                        return node;
                    });

                    setEdges(prevEdges => {
                        const newEdges = [...prevEdges];
                        const path = findTracePath(prevStepId, stepId, newEdges, updated);
                        if (path) {
                            const highlightSet = new Set(path.edgeIds);
                            for (let i = 0; i < newEdges.length; i++) {
                                if (highlightSet.has(newEdges[i].id)) {
                                    newEdges[i] = { ...newEdges[i], zIndex: 10, data: { ...newEdges[i].data, traceHighlight: nestedState } };
                                }
                            }
                            for (const condId of path.intermediateNodeIds) {
                                const idx = updated.findIndex(n => n.id === condId);
                                if (idx >= 0) {
                                    updated[idx] = { ...updated[idx], data: { ...updated[idx].data, traceStatus: { state: nestedState } } };
                                }
                            }
                        }
                        return newEdges;
                    });
                    return updated;
                });

                prevStepRef.current = stepId;
                return;
            }

            if (activeTraceWorkflowIdRef.current !== effectiveWorkflowIdRef.current) { return; }
            const lastStepId = prevStepRef.current;
            // Colour only the end node reachable from the last executed step.
            // The outer setNodes gives us `prev` (current nodes) for findTracePath;
            // returning `prev` unchanged is a no-op — the actual node update is done
            // via the inner setNodes call inside the setEdges updater.
            setNodes(prev => {
                const endNodes = prev.filter(n => n.type === 'endNode');
                setEdges(prevEdges => {
                    for (const endNode of endNodes) {
                        const path = findTracePath(lastStepId, endNode.id, prevEdges, prev);
                        if (path) {
                            const highlightEdgeIds = new Set(path.edgeIds);
                            const targetEndId = endNode.id;
                            // Highlight only this specific end node
                            setNodes(prevNodes => prevNodes.map(n =>
                                n.id === targetEndId
                                    ? { ...n, data: { ...n.data, traceStatus: { state: 'passed' } } }
                                    : n
                            ));
                            return prevEdges.map(e =>
                                highlightEdgeIds.has(e.id) || e.target === targetEndId
                                    ? { ...e, zIndex: 10, data: { ...e.data, traceHighlight: 'passed' } }
                                    : e
                            );
                        }
                    }
                    // No matching end node found — leave all end nodes unhighlighted.
                    return prevEdges;
                });
                return prev; // no-op; end node highlight applied via inner setNodes above
            });

        } else if (event.arazzo_span_kind === 'retry') {
            if (activeTraceWorkflowIdRef.current !== effectiveWorkflowIdRef.current) { return; }
            const stepId = event.attributes?.['step.id'] || event.name;
            const attempt = parseInt(event.attributes?.['retry.attempt'] || '1', 10);

            setNodes(prev => {
                let retryNodeId: string | undefined;
                const updated = prev.map(node => {
                    if (node.type === 'retryNode' && (node.data as any).gotoNodeId === stepId) {
                        retryNodeId = node.id;
                        return { ...node, data: { ...node.data, retryAttempt: attempt } };
                    }
                    return node;
                });

                if (retryNodeId) {
                    // Advance prevStepRef to the retry node so the next step:end can find the path
                    prevStepRef.current = retryNodeId;
                    const capturedRetryNodeId = retryNodeId;

                    setEdges(prevEdges => {
                        const newEdges = [...prevEdges];

                        // Highlight the path from the failed step to this retry node
                        // (goes through onFailure condition nodes)
                        const pathToRetry = findTracePath(stepId, capturedRetryNodeId, newEdges, updated);
                        if (pathToRetry) {
                            const highlightSet = new Set(pathToRetry.edgeIds);
                            for (let i = 0; i < newEdges.length; i++) {
                                if (highlightSet.has(newEdges[i].id)) {
                                    newEdges[i] = {
                                        ...newEdges[i],
                                        zIndex: 10,
                                        data: { ...newEdges[i].data, traceHighlight: 'failed' },
                                    };
                                }
                            }
                            for (const condId of pathToRetry.intermediateNodeIds) {
                                const idx = updated.findIndex(n => n.id === condId);
                                if (idx >= 0) {
                                    updated[idx] = {
                                        ...updated[idx],
                                        data: { ...updated[idx].data, traceStatus: { state: 'failed' } },
                                    };
                                }
                            }
                        }

                        const injectedId = `trace_portal_${capturedRetryNodeId}_${stepId}`;
                        const color = (ThemeColors as any).SECONDARY;
                        const retryEdge = {
                            id: injectedId,
                            source: capturedRetryNodeId,
                            target: stepId,
                            sourceHandle: 'h-left-source',
                            targetHandle: 'goto-top-target',
                            type: 'smoothstep',
                            style: { stroke: color, strokeDasharray: '4 4', strokeWidth: C.STROKE_WIDTH, strokeLinecap: 'round' as const },
                            markerEnd: { type: MarkerType.ArrowClosed, color },
                            zIndex: 10,
                            data: { traceHighlight: 'retry' as any },
                            animated: false,
                        };
                        const existingIdx = newEdges.findIndex(e => e.id === injectedId);
                        if (existingIdx >= 0) {
                            newEdges[existingIdx] = retryEdge;
                        } else {
                            newEdges.push(retryEdge);
                        }
                        return newEdges;
                    });
                }

                return updated;
            });
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

    /** Builds and mounts the graph for the given workflow. */
    const applyWorkflow = useCallback((wf: ArazzoWorkflow, definition: ArazzoDefinition) => {
        effectiveWorkflowIdRef.current = wf.workflowId;
        setWorkflow(wf);
        setWorkflowNotFoundOptions(null);
        setNodes([]);
        setEdges([]);
        buildGraphFromWorkflow(wf, isVertical, definition).then(({ nodes: builtNodes, edges: builtEdges }) => {
            console.log('Graph built successfully:', { nodes: builtNodes, edges: builtEdges });
            setNodes(builtNodes);
            setEdges(builtEdges);
            setGraphKey(prev => prev + 1);
            setTimeout(() => reactFlowWrapper.current?.focus(), 50);
        }).catch(err => {
            console.error("Error building graph layout:", err);
        });
    }, [isVertical]);

    // Build graph when workflow data is available
    useEffect(() => {
        console.log('WorkflowView useEffect triggered', { arazzoDefinition, workflowId });
        if (arazzoDefinition) {
            const targetWorkflowId = effectiveWorkflowIdRef.current || workflowId || arazzoDefinition.workflows?.[0]?.workflowId;
            console.log('Target workflow ID:', targetWorkflowId);
            if (targetWorkflowId) {
                const found = arazzoDefinition.workflows?.find(wf => wf.workflowId === targetWorkflowId);
                console.log('Found workflow:', found);
                if (found) {
                    applyWorkflow(found, arazzoDefinition);
                } else {
                    // The workflow we were showing is no longer in the file (renamed/deleted).
                    // Show the selection screen so the user can pick the correct one.
                    const available = arazzoDefinition.workflows ?? [];
                    if (available.length > 0) {
                        setWorkflowNotFoundOptions(available);
                    }
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

    const handleTryWorkflow = useCallback(() => {
        const params = { workflowId: effectiveWorkflowIdRef.current, uri: fileUri };
        rpcClient?.getVisualizerRpcClient().runWorkflow(params);
    }, [rpcClient, fileUri]);

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

    if (workflowNotFoundOptions) {
        return (
            <WorkflowSelectionScreen
                options={workflowNotFoundOptions}
                onSelect={(wf) => applyWorkflow(wf, arazzoDefinition)}
            />
        );
    }

    return (
        <>
        {/* Ensure edge labels always render above highlighted (z-index≥1) SVG edges */}
        <Global styles={css`
            .react-flow__edgelabel-renderer { z-index: 1000 !important; }
        `} />
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* Title bar: workflow name on left, Try/Retry button on right */}
            <WorkflowTitleBar
                workflowId={workflow?.workflowId ?? ''}
                onTry={handleTryWorkflow}
            />
        <div
            ref={reactFlowWrapper}
            style={{
                width: '100%',
                flex: 1,
                outline: 'none',
                position: 'relative',
                backgroundColor: MODERN ? ThemeColors.SURFACE_BRIGHT : 'var(--vscode-editor-background)',
                backgroundImage: MODERN ? `radial-gradient(${ThemeColors.SURFACE_CONTAINER} ${C.DOT_SIZE}px, transparent 0px)` : 'none',
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
                    backgroundColor: MODERN ? ThemeColors.SURFACE_DIM : 'var(--vscode-sideBar-background)',
                    boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.1)",
                }}
                onClose={handleClosePanel}
            >
                <SidePanelTitleContainer>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {selectedNode ? (selectedNode.data?.stepId ?? selectedNode.data?.step?.stepId ?? 'Properties') : 'Properties'}
                    </div>
                    <StyledButton data-testid="close-panel-btn" appearance="icon" onClick={handleClosePanel}>
                        <Codicon name="close" />
                    </StyledButton>
                </SidePanelTitleContainer>
                <SidePanelBody onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                    <NodePropertiesPanel node={selectedNode} workflow={workflow} definition={arazzoDefinition} traceSpans={traceSpans} />
                </SidePanelBody>
            </SidePanel>
        </div>
        </div>
        </>
    );
}
