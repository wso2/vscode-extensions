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
import { MergePointAnalyzer, MergePointInfo } from './MergePointAnalyzer';

/**
 * PositionVisitorVertical V2: Enforces strict "Main Path Spine" layout.
 * 
 * Rules:
 * 1. Main Path nodes: X = spineX (constant, forms vertical line)
 * 2. Alternative branches: X shifts RIGHT from parent
 * 3. Merge points: Y waits for all incoming paths to complete (uses MergePointAnalyzer)
 * 4. Failure paths: Always to the RIGHT of their step
 */
export class PositionVisitorVertical_v2 {
    private visited = new Set<string>();
    private positioned = new Set<string>();
    private mainPathNodes: Set<string>;
    private spineX: number;
    private mergePointAnalyzer: MergePointAnalyzer;
    private mergePoints: Map<string, MergePointInfo> = new Map();
    private incomingEdges: Map<string, number> = new Map(); // Track number of paths leading to each node
    private maxYBeforeNode: Map<string, number> = new Map(); // Max Y from all incoming paths

    constructor(private depthSearch: DepthSearch, spineX: number = 300) {
        this.mainPathNodes = depthSearch.getHappyPathNodes();
        this.spineX = spineX;
        this.mergePointAnalyzer = new MergePointAnalyzer();
        console.log('[PositionVisitor V2] Main path nodes:', Array.from(this.mainPathNodes));
    }

    /**
     * Analyze merge points before positioning. Must be called before visit().
     */
    public analyzeMergePointsForPositioning(root: FlowNode): void {
        this.mergePoints = this.mergePointAnalyzer.analyze(root);
        console.log('[PositionVisitor V2] Detected merge points:', 
            Array.from(this.mergePoints.keys()));
    }

    public visit(node: FlowNode, x: number, y: number): void {
        if (this.visited.has(node.id)) return;

        // Determine final position
        if (!this.positioned.has(node.id)) {
            // Check if this is a merge point - use analyzer's calculated Y
            const mergeInfo = this.mergePoints.get(node.id);
            let finalY = y;
            
            if (mergeInfo && mergeInfo.requiredY > 0) {
                // This is a merge point - position at the max Y of all incoming paths
                finalY = Math.max(y, mergeInfo.requiredY);
                console.log(`[Position V2] Merge point ${node.id}: base Y=${y}, required Y=${mergeInfo.requiredY}, final Y=${finalY}`);
            } else {
                // Use the old merge handling as fallback
                const requiredY = this.maxYBeforeNode.get(node.id) || y;
                finalY = Math.max(y, requiredY);
            }

            // Spine enforcement: Main path nodes MUST be centered on spineX
            const isOnMainPath = this.mainPathNodes.has(node.id);
            const finalX = isOnMainPath ? (this.spineX - (node.viewState.w / 2)) : x;

            node.viewState.x = finalX;
            node.viewState.y = finalY;
            this.positioned.add(node.id);

            console.log(`[Position V2] Node ${node.id}: x=${finalX}, y=${finalY}, onMainPath=${isOnMainPath}`);
        }

        this.visited.add(node.id);

        const nodeX = node.viewState.x;
        const nodeY = node.viewState.y;
        const nextY = nodeY + node.viewState.h + C.NODE_GAP_Y_Vertical;

        // Process success children
        if (node.children.length > 0) {
            node.children.forEach((child, index) => {
                const isChildOnMainPath = this.mainPathNodes.has(child.id);
                
                let childX: number;
                if (isChildOnMainPath) {
                    // Child is on main path - center it on the spine
                    childX = this.spineX - (child.viewState.w / 2);
                } else {
                    // Child is an alternative branch - shift RIGHT and center
                    const baseRight = this.spineX + 200 + (index * 150);
                    childX = baseRight - (child.viewState.w / 2);
                }

                this.registerMergePoint(child.id, nextY);
                
                if (!this.visited.has(child.id)) {
                    this.visit(child, childX, nextY);
                }
            });
        }

        // Process failure node (always to the RIGHT)
        if (node.failureNode && !this.visited.has(node.failureNode.id)) {
            // Position failure node to the right of the parent, centered vertically
            // Compute top-left X so that the failure node's center is offset from the spine
            const failX = this.spineX + (node.viewState.w / 2) + C.FAIL_GAP_X_Vertical;
            const failY = nodeY; // Same level or slightly offset
            
            this.registerMergePoint(node.failureNode.id, failY);
            this.visit(node.failureNode, failX, failY);
        }

        // Process branches (condition nodes)
        if (node.branches && node.branches.length > 0) {
            node.branches.forEach((branch, index) => {
                if (branch.length > 0) {
                    const head = branch[0];
                    const isHeadOnMainPath = this.mainPathNodes.has(head.id);
                    
                    let branchX: number;
                    if (isHeadOnMainPath) {
                        // Branch head is part of the main path - center it on the spine
                        branchX = this.spineX - (head.viewState.w / 2);
                    } else {
                        // Alternative branches go RIGHT and are centered
                        const baseRight = this.spineX + 200 + (index * 150);
                        branchX = baseRight - (head.viewState.w / 2);
                    }

                    this.registerMergePoint(head.id, nextY);
                    
                    if (!this.visited.has(head.id)) {
                        this.visit(head, branchX, nextY);
                    }
                }
            });
        }
    }

    /**
     * Register that a path reaches a node at a certain Y position.
     * The node must wait for all paths before positioning.
     */
    private registerMergePoint(nodeId: string, yPos: number): void {
        const currentMaxY = this.maxYBeforeNode.get(nodeId) || 0;
        this.maxYBeforeNode.set(nodeId, Math.max(currentMaxY, yPos));
    }

    public reset(): void {
        this.visited.clear();
        this.positioned.clear();
        this.maxYBeforeNode.clear();
        this.incomingEdges.clear();
    }
}
