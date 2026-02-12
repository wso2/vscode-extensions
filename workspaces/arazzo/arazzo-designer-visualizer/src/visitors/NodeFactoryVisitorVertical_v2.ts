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
import WaypointCreator from '../components/edges/WaypointCreator';
import { pointInRect, segIntersectsSeg, segmentIntersectsRect } from '../components/edges/edgeUtils';

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
    private allNodePositions: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];

    /**
     * Set the node positions array from PositionVisitor (for collision detection).
     */
    public setNodePositions(positions: Array<{ id: string; x: number; y: number; w: number; h: number }>): void {
        this.allNodePositions = positions;
    }

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
            composedData.iconClass = 'fw fw-bi-arrow-outward'; // Default icon for steps
        }
        // Ensure step nodes use the shared FONT_SIZE constant for title text
        if (node.type === 'STEP') {
            composedData.fontSize = C.FONT_SIZE;
            // Increase icon size for step nodes by default
            if (!('iconSize' in composedData)) composedData.iconSize = C.ICON_SIZE_STEP;
        }

        const reactNode = {
            id: node.id,
            type: this.mapType(node.type),
            position: { x: node.viewState.x, y: node.viewState.y },
            data: composedData,                 //when rerndering a node component in reactflow each node has its label, data section unharmed
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
        node.branches?.forEach((branch, branchIndex) => {
            console.log(`[NodeFactory V2] Processing branch ${branchIndex + 1} of node ${node.id}`);
            if (branch.length > 0) {
                const head = branch[0];
                if (!this.shouldSkipEdge(node, head)) {
                    // For condition nodes, add branch label (condition name)
                    let conditionLabel: string | undefined = undefined;
                    if (node.type === 'CONDITION' && node.data?.onSuccess) {
                        // Extract the actual name from the onSuccess array
                        const successAction = node.data.onSuccess[branchIndex];
                        if (successAction && typeof successAction === 'object' && 'name' in successAction) {
                            conditionLabel = successAction.name;
                        } else {
                            conditionLabel = `Branch ${branchIndex + 1}`; // Fallback
                        }
                    }
                    this.createEdge(node, head, 'success', conditionLabel, 'branch');
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

    private createEdge(source: FlowNode, target: FlowNode, edgeType: 'success' | 'failure', conditionLabel?: string, scenario?:string): void {
        // Determine handle positions based on relative positions
        const isTargetBelow = target.viewState.y > source.viewState.y + source.viewState.h;
        const isTargetRight = target.viewState.x + target.viewState.w/2 > source.viewState.x + source.viewState.w/2;
        const isTargetAbove = target.viewState.y < source.viewState.y;
        const isTargetLeft = target.viewState.x + target.viewState.w/2 < source.viewState.x + source.viewState.w/2;     //add margeins

        let sourceHandleId: string;
        let targetHandleId: string;

        // Vertical flow logic (target below)
        if (isTargetBelow && !isTargetLeft) {
            sourceHandleId = 'h-bottom'; // Exit from bottom
            targetHandleId = 'h-top';    // Enter from top
        } 
        else if (isTargetBelow && isTargetLeft) {
            sourceHandleId = 'h-bottom';   // Exit from bottom
            targetHandleId = 'h-right-target'; // Enter from right (loop)
        }
        // Horizontal flow logic (target to the right - branches/failures)
        else if (isTargetRight) {
            sourceHandleId = 'h-right-source';  // Exit from right
            targetHandleId = 'h-left';   // Enter from left
        }
        // Loop back / goto (target above or to the left)
        else if (isTargetAbove) {
            sourceHandleId = 'h-top';    // Exit from top
            targetHandleId = 'h-top';    // Enter from top (loop)
        }
        // Fallback (same level or other)
        else {
            sourceHandleId = 'h-right-source';
            targetHandleId = 'h-left';
        }
        console.log(`[NodeFactory V2 - Handles] Determined handles for edge ${source.id} → ${target.id}: sourceHandle=${sourceHandleId}, targetHandle=${targetHandleId}`);

        // Compute handle coordinates for both nodes
        const computeHandlePoint = (n: FlowNode, handleId: string) => {
            const xLeft = n.viewState.x;
            const xRight = n.viewState.x + n.viewState.w;
            const yTop = n.viewState.y;
            const yBottom = n.viewState.y + n.viewState.h;
            switch (handleId) {
                case 'h-bottom': return { x: (xLeft + xRight) / 2, y: yBottom };
                case 'h-top': return { x: (xLeft + xRight) / 2, y: yTop };
                case 'h-left': return { x: xLeft, y: (yTop + yBottom) / 2 };
                case 'h-right-source': return { x: xRight, y: (yTop + yBottom) / 2 };
                case 'h-right-target': return { x: xRight, y: (yTop + yBottom) / 2 };
                default: return { x: (xLeft + xRight) / 2, y: (yTop + yBottom) / 2 };
            }
        };

        let sourcePt = computeHandlePoint(source, sourceHandleId);
        let targetPt = computeHandlePoint(target, targetHandleId);
        let labelPos = 0.8;

        // Geometry helpers (moved to shared utility to avoid duplication)
        // NOTE: exact logic preserved — see `src/components/edges/edgeUtils.ts` for implementation
        // geometry helpers (imported at top-level from `edgeUtils`)


        // (local wrappers removed; functions above are used unchanged)


        const findshifts = (sourcePt: {x:number,y:number}, targetPt: {x:number,y:number}): number => {
            let shifts = 0;
            while (true) {
                let collisionFound = false;
                for (const nodePos of this.allNodePositions) {
                    if (nodePos.id === source.id || nodePos.id === target.id) continue;
                    const rect = { x: nodePos.x, y: nodePos.y, w: nodePos.w, h: nodePos.h };
                    if (segmentIntersectsRect(sourcePt, targetPt, rect)) {
                        shifts++;
                        sourcePt.x += C.NODE_WIDTH;
                        targetPt.x += C.NODE_WIDTH;
                        collisionFound = true;
                        break;
                    }
                }
                if(!collisionFound) return shifts;
                if(shifts > 20) { // safety break to prevent infinite loops in extreme cases
                    console.warn(`[NodeFactory V2] Excessive shifts detected for edge ${source.id} → ${target.id}. Possible layout issue.`);
                    return shifts;
                }
            }
            
        }

        // Check all positioned step nodes for blocking rectangles (exclude source/target)
        let foundBlockingRect: {x:number,y:number,w:number,h:number} | null = null;
        let shiftamount: number = 0;
        for (const nodePos of this.allNodePositions) {
            if (nodePos.id === source.id || nodePos.id === target.id) continue;
            const rect = { x: nodePos.x, y: nodePos.y, w: nodePos.w, h: nodePos.h };
            if (segmentIntersectsRect(sourcePt, targetPt, rect)) {
                foundBlockingRect = rect;
                console.log(`[NodeFactory V2] Edge ${source.id} → ${target.id} blocked by ${nodePos.id}`);
                shiftamount = findshifts({x: sourcePt.x + C.NODE_WIDTH/2 + C.WAYPOINT_SKIP_HORIZONTAL_OFFSET, y: sourcePt.y}, {x: targetPt.x + C.NODE_WIDTH/2 + C.WAYPOINT_SKIP_HORIZONTAL_OFFSET, y: targetPt.y});
            }
        }

        let computedWaypoints: { x:number; y:number }[] = [];
        if (foundBlockingRect) {
            try {
                targetHandleId = 'h-right-target';
                targetPt = computeHandlePoint(target, targetHandleId);
                labelPos = 0.35;
                computedWaypoints = WaypointCreator(sourcePt, targetPt, foundBlockingRect, 'skip', shiftamount);
            } catch (e) {
                computedWaypoints = [];
            }
        }else if(scenario === 'branch') {
            // For branches, add a slight horizontal offset to the label position to avoid overlap with the node
            computedWaypoints = WaypointCreator(sourcePt, targetPt, foundBlockingRect, 'branch',);
        }

        const edge = {
            id: `e_${source.id}-${target.id}`,
            source: source.id,
            target: target.id,
            sourceHandle: sourceHandleId,
            targetHandle: targetHandleId,
            type: 'plannedPath',
            data: { 
                waypoints: computedWaypoints as { x: number; y: number }[],
                ...(conditionLabel ? { 
                    label: conditionLabel, 
                    labelPos: labelPos,
                    labelOffset: { x: 0, y: -10 }
                } : {})
            },
            markerEnd: { 
                type: MarkerType.ArrowClosed,
                color: edgeType === 'failure' ? 'red' : '#0099ff'
            },
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
