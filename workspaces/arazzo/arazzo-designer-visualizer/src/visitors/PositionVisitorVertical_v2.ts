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
import { DepthSearch } from './DepthSearch_v2';
import { first } from 'lodash';

export class PositionVisitorVertical_v2 {
    private mainPathNodes: Set<string>;
    private mainPathOrder: FlowNode[];
    private mainPathIndex: Map<string, number> = new Map();
    private spineX: number;
    private visited = new Set<string>();
    private mainSpineVisited = new Set<string>(); // Track visited nodes during main spine positioning
    private nodePositions: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];
    private levelTracker: Map<number, number> = new Map(); // Track max level for each column

    constructor(depthSearch: DepthSearch, spineX: number = 0) {
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

        // Prevent infinite loops from cycles (e.g. step A → goto step B → goto step A)
        if (this.mainSpineVisited.has(node.id)) {
            return;
        }

        this.mainSpineVisited.add(node.id);

        // Position this node at the spine (center-aligned)
        node.viewState.x = this.spineX - (node.viewState.w / 2);
        node.viewState.y = currentY;
        node.isPositioned = true;
        node.isMainSpine = true; // Mark as main spine node for rendering logic 
        node.columnNo = 0; // Main spine is column 0
        node.levelNo = 0; // Set level 0 for the main spine as there are no sub sections in the main spine

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
                if(firstChild.type === 'CONDITION'){        //to account for the condition node rotation
                    nextY = nextY+(Math.sqrt(2)-1)*(C.DIAMOND_SIZE/2)
                }
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
    private positionBranches(node: FlowNode, isImmediateCondition_and_Firsttime: boolean = false, isFailPathCondition: boolean = false, isInFailPath: boolean = false): void {
        if (this.visited.has(node.id)) {
            return;
        }
        node.isInFailurePath = isInFailPath; // Mark node as part of failure path if applicable
        console.log(`came to ${node.id}`);
        if (!isImmediateCondition_and_Firsttime) {      //if its an immediate condition node and we are visiting it for the first time, we skip marking it as visited as we want to come back to it again
            this.visited.add(node.id);
            console.log(`VISITED:${node.id}`);
        }

        // Node dimensions should already be set by SimpleNodeSizing visitor
        const nodeX = node.viewState.x;
        const nodeY = node.viewState.y;
        let nextY: number;
        let nextY_RETRY: number;
        if(node.type === 'CONDITION'){
            nextY = nodeY + node.viewState.h + C.NODE_GAP_Y_AFTERCONDITION;
            nextY_RETRY = nodeY + node.viewState.h + C.NODE_GAP_Y_AFTERCONDITION;
        } else {
            nextY = nodeY + node.viewState.h + C.NODE_GAP_Y_Vertical;
            nextY_RETRY = nextY;    //this case is not used
        }

        // Process children
        if (node.children && node.children.length > 0) {
            node.children.forEach((child, index) => {
                if (!child.isPositioned) {      //this means its not on the main spine. 
                    child.viewState.x = nodeX + (node.viewState.w/2) - (child.viewState.w/2); // Position to the right of parent
                    child.viewState.y = nextY;
                    child.isPositioned = true;
                    child.columnNo = node.columnNo; // Set column number based on parent
                    child.levelNo = node.levelNo;
                    child.isMainSpine = false; // Mark as non-spine node for rendering logic

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
                    const currentCenterX = node.viewState.x + node.viewState.w/2;
                    const colShift = (isFailPathCondition? (i) : (i + 1)) //branches can exist in both the success path condition blocks and the failure path condition blocks as well. in the success path case, the 1st positioning head must always shift. But in the failure condition case, the first positionin head must be directly under the condition block
                    const branchCenterX = currentCenterX + (C.NODE_WIDTH + C.NODE_GAP_X_Vertical) * colShift; // Position to the right of parent
                    head.viewState.x = branchCenterX - (head.viewState.w / 2);
                    //head.viewState.y = (!isFailPathCondition) ? nextY - C.CONDITION_NODE_SECOND_BRANCH_OFFSET : nextY
                    head.viewState.y = (head.type == 'RETRY') ? nextY_RETRY : nextY;
                    head.isPositioned = true;
                    head.columnNo = node.columnNo + colShift  // Set column number based on parent
                    
                    if (this.levelTracker.has(head.columnNo)) {
                        head.levelNo = this.levelTracker.get(head.columnNo) + 1;
                    } else {
                        head.levelNo = 0;
                    }
                    this.levelTracker.set(head.columnNo, head.levelNo);

                    head.isMainSpine = false; // Mark as non-spine node for rendering logic

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
                const currentCenterX = node.viewState.x + node.viewState.w/2;
                const failCenterX = currentCenterX + (C.NODE_WIDTH + C.NODE_GAP_X_Vertical);
                failNode.viewState.x = failCenterX - (failNode.viewState.w / 2);
                failNode.viewState.y = node.viewState.y + (node.viewState.h / 2) - (failNode.viewState.h / 2); // Center-aligned vertically with parent
                failNode.isPositioned = true;
                failNode.columnNo = node.columnNo + 1; // Set column number based on parent
                failNode.isMainSpine = false; // Mark as non-spine node for rendering logic
                failNode.isInFailurePath = true; // Mark as part of failure path for rendering logic
                if (this.levelTracker.has(failNode.columnNo)) {
                        failNode.levelNo = this.levelTracker.get(failNode.columnNo) + 1;
                } else {
                    failNode.levelNo = 0;
                }
                this.levelTracker.set(failNode.columnNo, failNode.levelNo);
                console.log(`[Phase 2] Positioned failure node ${failNode.id} at (${failNode.viewState.x}, ${failNode.viewState.y}) [center-aligned]`);
            }
            if(failNode.type === 'CONDITION'){
                isFailPathCondition = true;
            }
            this.positionBranches(failNode, false, isFailPathCondition,true);
            
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
