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

import { FlowNode } from '../utils/types';
import { Node, Edge, MarkerType } from '@xyflow/react';
import * as C from '../constants/nodeConstants';

/**
 * NodeFactoryVisitorVertical V2: Generate React Flow nodes and edges for vertical layout.
 * 
 * Handles:
 * - Vertical flow: Top/Bottom handles for main flow
 * - Horizontal branching: Left/Right handles for side branches
 * - Proper edge styling (blue for success, red for failure)
 */
export class NodeFactoryVisitorVertical_v2 {
    private reactNodes: Node[] = [];
    private reactEdges: Edge[] = [];
    private visited: Set<string> = new Set();
    private portalEdgePairs: Set<string> = new Set();

    /**
     * Set the portal edge pairs to skip when creating edges.
     */
    public setPortalEdgePairs(pairs: Set<string>): void {
        this.portalEdgePairs = pairs;
    }

    public getElements() { 
        return { nodes: this.reactNodes, edges: this.reactEdges }; 
    }

    public visit(node: FlowNode): void {
        if (this.visited.has(node.id)) return;
        this.visited.add(node.id);

        // 1. Create React Flow Node
        const composedData = { label: node.label, ...node.data } as any;
        if (node.type === 'STEP' && !composedData.iconClass) {
            composedData.iconClass = 'fw fw-bi-arrow-outward';
        }

        const reactNode = {
            id: node.id,
            type: this.mapType(node.type),
            position: { x: node.viewState.x, y: node.viewState.y },
            data: composedData,
            style: { width: node.viewState.w, height: node.viewState.h },
            connectable: false
        };

        console.log(`[NodeFactory V2] Creating node:`, { 
            id: reactNode.id, 
            type: reactNode.type,
            position: reactNode.position 
        });

        this.reactNodes.push(reactNode);

        // 2. Create Edges (skip if portal will handle it)

        // Success children
        node.children.forEach(child => {
            if (!this.shouldSkipEdge(node, child)) {
                this.createEdge(node, child, 'success');
            }
            this.visit(child);
        });

        // Failure path
        if (node.failureNode) {
            if (!this.shouldSkipEdge(node, node.failureNode)) {
                this.createEdge(node, node.failureNode, 'failure');
            }
            this.visit(node.failureNode);
        }

        // Branches (condition node)
        node.branches?.forEach(branch => {
            if (branch.length > 0) {
                const head = branch[0];
                if (!this.shouldSkipEdge(node, head)) {
                    this.createEdge(node, head, 'success');
                }
                this.visit(head);
            }
        });
    }

    /**
     * Determine if edge should be skipped (portal will handle it).
     */
    private shouldSkipEdge(source: FlowNode, target: FlowNode): boolean {
        // Skip if a portal was created for this edge
        const edgeKey = `${source.id}::${target.id}`;
        if (this.portalEdgePairs.has(edgeKey)) {
            console.log(`[NodeFactory V2] Skipping edge ${source.id} → ${target.id} (portal exists)`);
            return true;
        }

        // Also skip backward jumps (legacy safety check)
        const isBackwardJump = target.viewState.y < source.viewState.y;
        if (isBackwardJump) {
            console.log(`[NodeFactory V2] Skipping edge ${source.id} → ${target.id} (backward jump)`);
            return true;
        }

        return false;
    }

    private createEdge(source: FlowNode, target: FlowNode, edgeType: 'success' | 'failure'): void {
        // Determine handle positions based on relative positions
        const isTargetBelow = target.viewState.y > source.viewState.y + source.viewState.h;
        const isTargetRight = target.viewState.x > source.viewState.x + source.viewState.w;
        const isTargetAbove = target.viewState.y < source.viewState.y;

        let sourceHandleId: string;
        let targetHandleId: string;

        // Vertical flow logic (target below)
        if (isTargetBelow) {
            sourceHandleId = 'h-bottom'; // Exit from bottom
            targetHandleId = 'h-top';    // Enter from top
        } 
        // Horizontal flow logic (target to the right - branches/failures)
        else if (isTargetRight) {
            sourceHandleId = 'h-right';  // Exit from right
            targetHandleId = 'h-left';   // Enter from left
        }
        // Loop back / goto (target above or to the left)
        else if (isTargetAbove) {
            sourceHandleId = 'h-top';    // Exit from top
            targetHandleId = 'h-top';    // Enter from top (loop)
        }
        // Fallback (same level or other)
        else {
            sourceHandleId = 'h-right';
            targetHandleId = 'h-left';
        }

        const edge = {
            id: `e_${source.id}-${target.id}`,
            source: source.id,
            target: target.id,
            sourceHandle: sourceHandleId,
            targetHandle: targetHandleId,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: edgeType === 'failure' 
                ? { stroke: 'red', strokeWidth: 2 } 
                : { stroke: '#0099ff', strokeWidth: 2 }
        };

        console.log(`[NodeFactory V2] Creating edge:`, {
            from: source.id,
            to: target.id,
            type: edgeType,
            handles: `${edge.sourceHandle} → ${edge.targetHandle}`
        });

        this.reactEdges.push(edge);
    }

    private mapType(type: string): string {
        switch (type) {
            case 'CONDITION': return 'conditionNode';
            case 'START': return 'startNode';
            case 'END': return 'endNode';
            case 'RETRY': return 'retryNode';
            case 'PORTAL': return 'portalNode';
            case 'STEP':
            default: return 'stepNode';
        }
    }
}
