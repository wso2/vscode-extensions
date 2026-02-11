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

/**
 * Merge point information for a node
 */
export interface MergePointInfo {
    nodeId: string;
    incomingPaths: PathInfo[];
    requiredY: number; // Minimum Y position to accommodate all incoming paths
}

/**
 * Information about a path leading to a merge point
 */
export interface PathInfo {
    sourceNodeId: string;
    pathLength: number; // Number of nodes in the path
    pathHeight: number; // Total vertical height of the path
    endY: number; // Y position where this path ends (before merge)
}

/**
 * MergePointAnalyzer: Detects merge points and calculates optimal Y positions.
 * 
 * A merge point is a node that has multiple incoming paths (multiple nodes point to it).
 * For proper horizontal merging, the merge target must be positioned at the Y level
 * of the longest incoming path.
 */
export class MergePointAnalyzer {
    private mergePoints: Map<string, MergePointInfo> = new Map();
    private incomingEdges: Map<string, string[]> = new Map(); // nodeId -> [sourceNodeIds]
    private visited: Set<string> = new Set();

    /**
     * Analyze the tree to find all merge points and calculate required Y positions.
     */
    public analyze(root: FlowNode): Map<string, MergePointInfo> {
        this.mergePoints.clear();
        this.incomingEdges.clear();
        this.visited.clear();

        // Pass 1: Build incoming edges map
        this.buildIncomingEdgesMap(root);

        // Pass 2: Identify merge points (nodes with >1 incoming edge)
        this.identifyMergePoints();

        // Pass 3: Calculate path heights for each incoming path to merge points
        this.visited.clear();
        this.calculatePathInfo(root, 0);

        console.log('[MergePointAnalyzer] Merge points detected:', 
            Array.from(this.mergePoints.values()).map(mp => ({
                nodeId: mp.nodeId,
                incomingCount: mp.incomingPaths.length,
                requiredY: mp.requiredY
            }))
        );

        return this.mergePoints;
    }

    /**
     * Build a map of incoming edges for each node.
     */
    private buildIncomingEdgesMap(node: FlowNode, visited: Set<string> = new Set()): void {
        if (visited.has(node.id)) return;
        visited.add(node.id);

        // Track children
        node.children.forEach(child => {
            this.addIncomingEdge(child.id, node.id);
            this.buildIncomingEdgesMap(child, visited);
        });

        // Track failure paths
        if (node.failureNode) {
            this.addIncomingEdge(node.failureNode.id, node.id);
            this.buildIncomingEdgesMap(node.failureNode, visited);
        }

        // Track branches
        node.branches?.forEach(branch => {
            if (branch.length > 0) {
                const head = branch[0];
                this.addIncomingEdge(head.id, node.id);
                this.buildIncomingEdgesMap(head, visited);
            }
        });
    }

    private addIncomingEdge(targetId: string, sourceId: string): void {
        if (!this.incomingEdges.has(targetId)) {
            this.incomingEdges.set(targetId, []);
        }
        this.incomingEdges.get(targetId)!.push(sourceId);
    }

    /**
     * Identify nodes that are merge points (>1 incoming edge).
     */
    private identifyMergePoints(): void {
        this.incomingEdges.forEach((sources, targetId) => {
            if (sources.length > 1) {
                this.mergePoints.set(targetId, {
                    nodeId: targetId,
                    incomingPaths: [],
                    requiredY: 0
                });
            }
        });
    }

    /**
     * Calculate path information for each path leading to merge points.
     * This estimates the vertical height needed for each path.
     */
    private calculatePathInfo(node: FlowNode, currentY: number = 0, sourceNode?: FlowNode): void {
        if (this.visited.has(node.id)) {
            // Reached a visited node - check if it's a merge point
            if (this.mergePoints.has(node.id) && sourceNode) {
                const mergePoint = this.mergePoints.get(node.id)!;
                
                // Calculate where this path would end (Y position just before merging)
                // currentY represents the Y position after the source node
                const pathEndY = currentY;
                
                mergePoint.incomingPaths.push({
                    sourceNodeId: sourceNode.id,
                    pathLength: 1, // Simplified - count from source to merge
                    pathHeight: pathEndY,
                    endY: pathEndY
                });

                // Update required Y: max of all incoming path end Y positions
                mergePoint.requiredY = Math.max(mergePoint.requiredY, pathEndY);
            }
            return;
        }
        this.visited.add(node.id);

        const nodeHeight = node.viewState.h + C.NODE_GAP_Y_Vertical;
        const nextY = currentY + nodeHeight;

        // Process children
        node.children.forEach(child => {
            this.calculatePathInfo(child, nextY, node);
        });

        // Process failure node
        if (node.failureNode) {
            this.calculatePathInfo(node.failureNode, nextY, node);
        }

        // Process branches
        node.branches?.forEach(branch => {
            if (branch.length > 0) {
                const head = branch[0];
                this.calculatePathInfo(head, nextY, node);
            }
        });
    }

    /**
     * Get the required minimum Y position for a node (if it's a merge point).
     */
    public getRequiredY(nodeId: string): number | undefined {
        return this.mergePoints.get(nodeId)?.requiredY;
    }

    /**
     * Check if a node is a merge point.
     */
    public isMergePoint(nodeId: string): boolean {
        return this.mergePoints.has(nodeId);
    }

    /**
     * Get all merge points.
     */
    public getMergePoints(): Map<string, MergePointInfo> {
        return this.mergePoints;
    }
}
