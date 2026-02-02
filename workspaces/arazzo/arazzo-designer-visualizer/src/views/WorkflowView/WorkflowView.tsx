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
import { ArazzoDefinition, MachineStateValue } from "@wso2/arazzo-designer-core";
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
import { nodeTypes } from '../../components/NodeStyles';

interface WorkflowViewProps {
    fileUri: string;
    workflowId?: string;
}

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
    }, [fileUri]);

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
        // TODO: Show properties panel or handle node interaction
    }, []);

    const onPaneClick = useCallback(() => {
        reactFlowWrapper.current?.focus();
    }, []);

    const proOptions = { hideAttribution: true };

    const toggleOrientation = useCallback(() => {
        setIsVertical(prev => !prev);
    }, []);

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
        </div>
    );
}
