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

export function WorkflowView(props: WorkflowViewProps) {
    const { fileUri, workflowId } = props;
    console.log('WorkflowView rendered with props:', { fileUri, workflowId });
    const { rpcClient } = useVisualizerContext();
    const [arazzoDefinition, setArazzoDefinition] = useState<ArazzoDefinition | undefined>(undefined);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [graphKey, setGraphKey] = useState(0);
    const [isVertical, setIsVertical] = useState(false);
    const [workflow, setWorkflow] = useState<ArazzoWorkflow | undefined>(undefined);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Edge types configuration
    const edgeTypes = {
        plannedPath: PlannedPathEdge
    };

    // rpcClient?.onStateChanged((newState: MachineStateValue) => {
    //     if (typeof newState === 'object' && 'ready' in newState && newState.ready === 'viewReady') {
    //         fetchData();
    //     }
    // });

    const fetchData = async () => {
        const resp = await rpcClient.getVisualizerRpcClient().getArazzoModel({
            uri: fileUri,
        });
        console.log('getArazzoModel response:', resp);
        setArazzoDefinition(resp.model);
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
                    // Clear existing graph
                    setNodes([]);
                    setEdges([]);

                    // Build new graph
                    console.log('Building graph...');
                    buildGraphFromWorkflow(workflow, isVertical).then(({ nodes: builtNodes, edges: builtEdges }) => {
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

    const onConnect = useCallback((params: Connection) => {
        setEdges((eds) => addEdge(params, eds));
    }, [setEdges]);

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        console.log('Node clicked:', node);
        event.stopPropagation();

        // Only open properties panel for workflow STEP and CONDITION nodes
        const allowedTypes = ['stepNode', 'conditionNode'];
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
        reactFlowWrapper.current?.focus();
    }, [isPanelOpen, handleClosePanel]);

    const proOptions = { hideAttribution: true };

    const toggleOrientation = useCallback(() => {
        setIsVertical(prev => !prev);
    }, []);

    const renderNodeData = () => {
        if (!selectedNode) return null;

        const nodeData = selectedNode.data || {};

        // Filter out diagram-specific properties and keep only YAML step data
        // Diagram-specific: label (added for display), iconClass (added for display)
        // YAML step data: stepId, description, operationId, operationPath, workflowId, 
        //                 parameters, requestBody, successCriteria, onSuccess, onFailure, outputs
        const {
            label,
            iconClass,
            ...stepData
        } = nodeData;

        // If no step data exists, show a message
        if (Object.keys(stepData).length === 0) {
            return (
                <NodeDataContainer>
                    <DataSection>
                        <DataValue>No step data available</DataValue>
                    </DataSection>
                </NodeDataContainer>
            );
        }

        return (
            <NodeDataContainer>
                {stepData.stepId && (
                    <DataSection>
                        <DataLabel>Step ID</DataLabel>
                        <DataValue>{stepData.stepId}</DataValue>
                    </DataSection>
                )}
                {stepData.description && (
                    <DataSection>
                        <DataLabel>Description</DataLabel>
                        <DataValue>{stepData.description}</DataValue>
                    </DataSection>
                )}
                {stepData.operationId && (
                    <DataSection>
                        <DataLabel>Operation ID</DataLabel>
                        <DataValue>{stepData.operationId}</DataValue>
                    </DataSection>
                )}
                {stepData.operationPath && (
                    <DataSection>
                        <DataLabel>Operation Path</DataLabel>
                        <DataValue>{stepData.operationPath}</DataValue>
                    </DataSection>
                )}
                {stepData.workflowId && (
                    <DataSection>
                        <DataLabel>Workflow ID</DataLabel>
                        <DataValue>{stepData.workflowId}</DataValue>
                    </DataSection>
                )}
                {stepData.parameters && Array.isArray(stepData.parameters) && stepData.parameters.length > 0 && (
                    <DataSection>
                        <DataLabel>Parameters</DataLabel>
                        <JsonValue>{JSON.stringify(stepData.parameters, null, 2)}</JsonValue>
                    </DataSection>
                )}
                {stepData.requestBody && (
                    <DataSection>
                        <DataLabel>Request Body</DataLabel>
                        <JsonValue>{JSON.stringify(stepData.requestBody, null, 2)}</JsonValue>
                    </DataSection>
                )}
                {stepData.successCriteria && Array.isArray(stepData.successCriteria) && stepData.successCriteria.length > 0 && (
                    <DataSection>
                        <DataLabel>Success Criteria</DataLabel>
                        <JsonValue>{JSON.stringify(stepData.successCriteria, null, 2)}</JsonValue>
                    </DataSection>
                )}
                {stepData.onSuccess && Array.isArray(stepData.onSuccess) && stepData.onSuccess.length > 0 && (
                    <DataSection>
                        <DataLabel>On Success</DataLabel>
                        <JsonValue>{JSON.stringify(stepData.onSuccess, null, 2)}</JsonValue>
                    </DataSection>
                )}
                {stepData.onFailure && Array.isArray(stepData.onFailure) && stepData.onFailure.length > 0 && (
                    <DataSection>
                        <DataLabel>On Failure</DataLabel>
                        <JsonValue>{JSON.stringify(stepData.onFailure, null, 2)}</JsonValue>
                    </DataSection>
                )}
                {stepData.outputs && Object.keys(stepData.outputs).length > 0 && (
                    <DataSection>
                        <DataLabel>Outputs</DataLabel>
                        <JsonValue>{JSON.stringify(stepData.outputs, null, 2)}</JsonValue>
                    </DataSection>
                )}
                {/* Show any other properties that might exist */}
                {Object.keys(stepData).some(key =>
                    !['stepId', 'description', 'operationId', 'operationPath', 'workflowId',
                        'parameters', 'requestBody', 'successCriteria', 'onSuccess', 'onFailure', 'outputs'].includes(key)
                ) && (
                        <DataSection>
                            <DataLabel>Additional Properties</DataLabel>
                            <JsonValue>
                                {JSON.stringify(
                                    Object.fromEntries(
                                        Object.entries(stepData).filter(([key]) =>
                                            !['stepId', 'description', 'operationId', 'operationPath', 'workflowId',
                                                'parameters', 'requestBody', 'successCriteria', 'onSuccess', 'onFailure', 'outputs'].includes(key)
                                        )
                                    ),
                                    null,
                                    2
                                )}
                            </JsonValue>
                        </DataSection>
                    )}
            </NodeDataContainer>
        );
    };

    if (!arazzoDefinition) {
        return <div style={{ padding: '20px' }}>Loading...</div>;
    }

    return (
        <div
            ref={reactFlowWrapper}
            style={{ width: '100%', height: '100vh', outline: 'none', position: 'relative' }}
            tabIndex={0}
            onClick={onPaneClick}
        >
            <button
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
            </button>
            <ReactFlow
                key={graphKey}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                proOptions={proOptions}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="#b9b7b7"
                />
                <Controls />
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
                <SidePanelBody>
                    {selectedNode ? renderNodeData() : <div>No node selected</div>}
                </SidePanelBody>
            </SidePanel>
        </div>
    );
}
