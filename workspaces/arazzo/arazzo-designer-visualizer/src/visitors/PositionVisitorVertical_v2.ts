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
import * as C from '../constants/nodeConstants';
import { DepthSearch } from './DepthSearch';

/**
 * PositionVisitorVertical V2: Simplified Two-Phase Positioning
 * 
 * New Strategy (Main Spine First, Branches Right):
 * 
 * Phase 1: Position the Main Happy Path
 *   - Traverse ONLY the main path nodes (from DepthSearch)
 *   - Position them vertically at x = spineX (default 0)
 *   - Mark each as isPositioned = true
 * 
 * Phase 2: Position the Branches
 *   - Run a full graph traversal (DFS/BFS)
 *   - Rule: If a node is already isPositioned, skip moving it (use its coords as reference)
 *   - Alternative branches are positioned to the RIGHT of the main path
 *   - Branch spacing: x = spineX + (nodeWidth + gap) * branchIndex
 */
export class PositionVisitorVertical_v2 {
    private mainPathNodes: Set<string>;
    private mainPathOrder: FlowNode[];
    private mainPathIndex: Map<string, number> = new Map();
    private spineX: number;
    private visited = new Set<string>();
    private mainSpineVisited = new Set<string>(); // Track visited nodes during main spine positioning
    private nodePositions: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];

    constructor(private depthSearch: DepthSearch, spineX: number = 0) {
        this.mainPathNodes = depthSearch.getHappyPathNodes();
        this.mainPathOrder = depthSearch.getLongestPath();
        this.mainPathOrder.forEach((n, i) => this.mainPathIndex.set(n.id, i));
        this.spineX = spineX;
        console.log('[PositionVisitor V2] Main path nodes:', Array.from(this.mainPathNodes));
        console.log('[PositionVisitor V2] Spine X:', spineX);
    }

    /**
     * Entry point: Execute two-phase positioning.
     */
    public positionGraph(root: FlowNode, x: number, y: number): void {
        console.log('[PositionVisitor V2] Starting two-phase positioning...');
        
        // Phase 1: Position main spine nodes vertically at x = spineX
        this.positionMainSpine(root, y);

        // Phase 2: Position all branches (using already-positioned main spine as reference)
        this.visited.clear();
        this.positionBranches(root);

        console.log('[PositionVisitor V2] Positioning complete.');
    }

    /**
     * Phase 1: Position main spine nodes only.
     * Traverse the happy path and position nodes vertically at x = spineX (center-aligned).
     */
    private positionMainSpine(node: FlowNode, currentY: number): void {
        // Only process main path nodes
        if (!this.mainPathNodes.has(node.id)) {
            return;
        }

        this.mainSpineVisited.add(node.id);

        // Position this node at the spine (center-aligned)
        node.viewState.x = this.spineX - (node.viewState.w / 2);
        node.viewState.y = currentY;
        node.isPositioned = true;

        // Track positioned node for collision detection
        if (node.type === 'STEP') {
            this.nodePositions.push({
                id: node.id,
                x: node.viewState.x,
                y: node.viewState.y,
                w: node.viewState.w,
                h: node.viewState.h
            });
        }

        console.log(`[Phase 1] Positioned ${node.id} at (${node.viewState.x}, ${node.viewState.y}) [center-aligned on spine]`);

        // Stop at END nodes
        if (node.type === 'END') {
            return;
        }

        // Calculate next Y position
        let nextY: number;
        if(node.type === 'CONDITION'){
            nextY = currentY + node.viewState.h + C.NODE_GAP_Y_AFTERCONDITION;
        } else {
            nextY = currentY + node.viewState.h + C.NODE_GAP_Y_Vertical;
        }

        // Continue down the main path (first child or first branch head)
        if (node.children && node.children.length > 0) {
            const firstChild = node.children[0];
            if (this.mainPathNodes.has(firstChild.id)) {
                this.positionMainSpine(firstChild, nextY);
                return;
            }
        }

        // Check branches for main path continuation
        if (node.branches && node.branches.length > 0) {
            // Find the earliest (lowest index) branch head that appears on the main path
            let bestHead: FlowNode | undefined;
            let bestIdx = Number.POSITIVE_INFINITY;

            for (const branch of node.branches) {
                if (branch.length > 0) {
                    const head = branch[0];
                    if (this.mainPathNodes.has(head.id) && !this.mainSpineVisited.has(head.id)) {
                        const idx = this.mainPathIndex.get(head.id) ?? Number.POSITIVE_INFINITY;
                        if (idx < bestIdx) {
                            bestIdx = idx;
                            bestHead = head;
                        }
                    }
                }
            }

            if (bestHead) {
                this.positionMainSpine(bestHead, nextY);
                return;
            }
        }
    }

    /**
     * Phase 2: Position all nodes, respecting already-positioned nodes.
     * Alternative branches are positioned to the RIGHT of the main spine (center-aligned).
     */
    private positionBranches(node: FlowNode, isImmediateCondition_and_Firsttime: boolean = false, isFailPathCondition: boolean = false): void {
        if (this.visited.has(node.id)) {
            return;
        }
        console.log(`came to ${node.id}`);
        if (!isImmediateCondition_and_Firsttime) {
            this.visited.add(node.id);
            console.log(`VISITED:${node.id}`);
        }

        // Node dimensions should already be set by SimpleNodeSizing visitor
        const nodeX = node.viewState.x;
        const nodeY = node.viewState.y;
        let nextY: number;
        if(node.type === 'CONDITION'){
            nextY = nodeY + node.viewState.h + C.NODE_GAP_Y_AFTERCONDITION;
        } else {
            nextY = nodeY + node.viewState.h + C.NODE_GAP_Y_Vertical;
        }

        // Process children
        if (node.children && node.children.length > 0) {
            node.children.forEach((child, index) => {
                if (!child.isPositioned) {
                    // Alternative child - position to the right (center-aligned)
                    //const branchCenterX = this.spineX + (C.NODE_WIDTH + C.NODE_GAP_X_Vertical) * (index + 1);
                    //child.viewState.x = branchCenterX - (child.viewState.w / 2);
                    child.viewState.x = nodeX + (node.viewState.w/2) - (child.viewState.w/2); // Position to the right of parent
                    child.viewState.y = nextY;
                    child.isPositioned = true;

                    // Track positioned node for collision detection
                    if (child.type === 'STEP') {
                        this.nodePositions.push({
                            id: child.id,
                            x: child.viewState.x,
                            y: child.viewState.y,
                            w: child.viewState.w,
                            h: child.viewState.h
                        });
                    }

                    console.log(`[Phase 2] Positioned child ${child.id} at (${child.viewState.x}, ${child.viewState.y}) [center-aligned]`);
                }
                this.positionBranches(child);
            });
        }

        // Process branches (condition nodes)
        if (node.branches && node.branches.length > 0) {
            // First pass: position immediate branch heads left-to-right (do not recurse yet)
            const positioningHeads: FlowNode[] = [];
            const visitingHeads: FlowNode[] = [];
            node.branches.forEach((branch) => {
                if (branch.length > 0 && !this.mainPathNodes.has(branch[0].id)) positioningHeads.push(branch[0]);
            });
            node.branches.forEach((branch) => {
                if (branch.length > 0) visitingHeads.push(branch[0]);
            });

            // Position each head one to the right of the other (center-aligned)
            for (let i = 0; i < positioningHeads.length; i++) {
                const head = positioningHeads[i];
                if (!head) continue;

                if (!head.isPositioned) {
                    //const branchCenterX = node.viewState.x + node.viewState.w/2 + (C.NODE_WIDTH + C.NODE_GAP_X_Vertical) * (i + 1);
                    const branchCenterX = node.viewState.x + node.viewState.w/2 + (C.NODE_WIDTH + C.NODE_GAP_X_Vertical) * (isFailPathCondition? (i) : (i + 1)); // Position to the right of parent
                    head.viewState.x = branchCenterX - (head.viewState.w / 2);
                    head.viewState.y = (!isFailPathCondition) ? nextY - 40 : nextY;
                    head.isPositioned = true;

                    // Track positioned node for collision detection
                    if (head.type === 'STEP') {
                        this.nodePositions.push({
                            id: head.id,
                            x: head.viewState.x,
                            y: head.viewState.y,
                            w: head.viewState.w,
                            h: head.viewState.h
                        });
                    }

                    console.log(`[Phase 2] Positioned branch head ${head.id} at (${head.viewState.x}, ${head.viewState.y}) [center-aligned immediate heads]`);
                }
            }

            // Second pass: recurse into each head and render their children beneath them
            for (const head of visitingHeads) {
                if (head) this.positionBranches(head);
            }
        }

        // Process failure node
        if (node.failureNode && !this.visited.has(node.failureNode.id)) {
            const failNode = node.failureNode;
            if (!failNode.isPositioned) {
                // Position failure node to the right (center-aligned)
                const failCenterX = node.viewState.x + node.viewState.w/2 + (C.NODE_WIDTH + C.NODE_GAP_X_Vertical);
                failNode.viewState.x = failCenterX - (failNode.viewState.w / 2);
                failNode.viewState.y = node.viewState.y + (node.viewState.h / 2) - (failNode.viewState.h / 2); // Center-aligned vertically with parent
                failNode.isPositioned = true;
                console.log(`[Phase 2] Positioned failure node ${failNode.id} at (${failNode.viewState.x}, ${failNode.viewState.y}) [center-aligned]`);
            }
            if(failNode.type === 'CONDITION'){
                isFailPathCondition = true;
            }
            this.positionBranches(failNode, false, isFailPathCondition);
            
        }
    }

    public reset(): void {
        this.visited.clear();
    }

    /**
     * Get all positioned node rectangles (for edge routing collision detection).
     */
    public getNodePositions(): Array<{ id: string; x: number; y: number; w: number; h: number }> {
        return this.nodePositions;
    }
}
