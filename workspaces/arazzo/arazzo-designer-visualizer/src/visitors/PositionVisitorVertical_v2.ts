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
    private spineX: number;
    private visited = new Set<string>();

    constructor(private depthSearch: DepthSearch, spineX: number = 0) {
        this.mainPathNodes = depthSearch.getHappyPathNodes();
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

        // Position this node at the spine (center-aligned)
        node.viewState.x = this.spineX - (node.viewState.w / 2);
        node.viewState.y = currentY;
        node.viewState.isPositioned = true;

        console.log(`[Phase 1] Positioned ${node.id} at (${node.viewState.x}, ${node.viewState.y}) [center-aligned on spine]`);

        // Stop at END nodes
        if (node.type === 'END') {
            return;
        }

        // Calculate next Y position
        const nextY = currentY + node.viewState.h + C.NODE_GAP_Y_Vertical;

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
            for (const branch of node.branches) {
                if (branch.length > 0) {
                    const head = branch[0];
                    if (this.mainPathNodes.has(head.id)) {
                        this.positionMainSpine(head, nextY);
                        return;
                    }
                }
            }
        }
    }

    /**
     * Phase 2: Position all nodes, respecting already-positioned nodes.
     * Alternative branches are positioned to the RIGHT of the main spine (center-aligned).
     */
    private positionBranches(node: FlowNode): void {
        if (this.visited.has(node.id)) {
            return;
        }
        this.visited.add(node.id);

        // Node dimensions should already be set by SimpleNodeSizing visitor
        const nodeX = node.viewState.x;
        const nodeY = node.viewState.y;
        const nextY = nodeY + node.viewState.h + C.NODE_GAP_Y_Vertical;

        // Process children
        if (node.children && node.children.length > 0) {
            node.children.forEach((child, index) => {
                if (!child.viewState.isPositioned) {
                    // Position child below parent (inherit X if on main path, or use parent's X)
                    if (this.mainPathNodes.has(child.id)) {
                        // Child is on main path - already positioned in Phase 1
                        // Just recurse
                    } else {
                        // Alternative child - position to the right (center-aligned)
                        const branchCenterX = this.spineX + (C.NODE_WIDTH + C.NODE_GAP_X_Vertical) * (index + 1);
                        child.viewState.x = branchCenterX - (child.viewState.w / 2);
                        child.viewState.y = nextY;
                        child.viewState.isPositioned = true;
                        console.log(`[Phase 2] Positioned child ${child.id} at (${child.viewState.x}, ${child.viewState.y}) [center-aligned]`);
                    }
                }
                this.positionBranches(child);
            });
        }

        // Process branches (condition nodes)
        if (node.branches && node.branches.length > 0) {
            node.branches.forEach((branch, branchIndex) => {
                if (branch.length > 0) {
                    const head = branch[0];
                    if (!head.viewState.isPositioned) {
                        // Position branch head to the right (center-aligned)
                        // Main path branch is at index 0, alternatives start at index 1
                        if (this.mainPathNodes.has(head.id)) {
                            // This branch head is on the main path - already positioned
                        } else {
                            const branchCenterX = this.spineX + (C.NODE_WIDTH + C.NODE_GAP_X_Vertical) * (branchIndex + 1);
                            head.viewState.x = branchCenterX - (head.viewState.w / 2);
                            head.viewState.y = nextY;
                            head.viewState.isPositioned = true;
                            console.log(`[Phase 2] Positioned branch head ${head.id} at (${head.viewState.x}, ${head.viewState.y}) [center-aligned]`);
                        }
                    }
                    this.positionBranches(head);
                }
            });
        }

        // Process failure node
        if (node.failureNode && !this.visited.has(node.failureNode.id)) {
            const failNode = node.failureNode;
            if (!failNode.viewState.isPositioned) {
                // Position failure node to the right (center-aligned)
                const failCenterX = this.spineX + (C.NODE_WIDTH + C.FAIL_GAP_X_Vertical);
                const failY = nodeY; // Same level as parent
                failNode.viewState.x = failCenterX - (failNode.viewState.w / 2);
                failNode.viewState.y = failY;
                failNode.viewState.isPositioned = true;
                console.log(`[Phase 2] Positioned failure node ${failNode.id} at (${failNode.viewState.x}, ${failNode.viewState.y}) [center-aligned]`);
            }
            this.positionBranches(failNode);
        }
    }

    public reset(): void {
        this.visited.clear();
    }
}
