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
 * SizingVisitorVertical V2: Calculate dimensions for vertical "Happy Path" layout.
 * 
 * Logic:
 * - Width: Sum of parallel branches (main path stays narrow, branches add width to the right)
 * - Height: Sum of vertical sequence (nodes stack downward)
 */
export class SizingVisitorVertical_v2 {
    private visited: Set<string> = new Set();

    public visit(node: FlowNode): void {
        if (this.visited.has(node.id)) return;
        this.visited.add(node.id);

        // 1. Recursively visit children first (bottom-up calculation)
        node.children.forEach(child => this.visit(child));
        if (node.failureNode) this.visit(node.failureNode);
        node.branches?.forEach(branch => branch.forEach(n => this.visit(n)));

        // 2. Calculate base node dimensions
        this.calculateNodeSize(node);

        // 3. Calculate subtree dimensions
        this.calculateSubtreeDimensions(node);
    }

    private calculateNodeSize(node: FlowNode): void {       //calculate base width and height based on node type
        switch (node.type) {
            case 'START':
                node.viewState.w = C.START_NODE_DIAMETER;
                node.viewState.h = C.START_NODE_DIAMETER;
                break;
            case 'END':
                node.viewState.w = C.END_NODE_DIAMETER;
                node.viewState.h = C.END_NODE_DIAMETER;
                break;
            case 'RETRY':
                node.viewState.w = C.RETRY_NODE_DIAMETER;
                node.viewState.h = C.RETRY_NODE_DIAMETER;
                break;
            case 'PORTAL':
                node.viewState.w = C.NODE_WIDTH;
                node.viewState.h = C.NODE_HEIGHT;
                break;
            case 'CONDITION':
                node.viewState.w = C.DIAMOND_SIZE;
                node.viewState.h = C.DIAMOND_SIZE;
                break;
            case 'STEP':
            default:
                // Fixed size for STEP nodes
                node.viewState.w = C.NODE_WIDTH;
                node.viewState.h = C.NODE_HEIGHT;
                break;
        }
    }

    private calculateSubtreeDimensions(node: FlowNode): void {
        // Vertical layout: Main flow goes DOWN, branches go RIGHT, failure goes RIGHT

        // Start with this node's dimensions
        let totalWidth = node.viewState.w;
        let totalHeight = node.viewState.h;

        // Calculate children dimensions (vertical sequence)
        let childrenMaxWidth = 0;
        let childrenTotalHeight = 0;

        if (node.branches && node.branches.length > 0) {
            // Condition node with branches - branches stack horizontally
            let branchesTotalWidth = 0;
            let branchesMaxHeight = 0;

            node.branches.forEach((branch, index) => {
                if (branch.length > 0) {
                    const head = branch[0];
                    branchesTotalWidth += head.viewState.subtreeW;
                    if (index < node.branches!.length - 1) {
                        branchesTotalWidth += C.NODE_GAP_X_Vertical;
                    }
                    branchesMaxHeight = Math.max(branchesMaxHeight, head.viewState.subtreeH);
                }
            });

            childrenMaxWidth = branchesTotalWidth;
            childrenTotalHeight = C.NODE_GAP_Y_Vertical + branchesMaxHeight;
        } else if (node.children.length > 0) {
            // Linear children (standard flow)
            if (node.children.length === 1) {
                // Single child - straightforward vertical stacking
                const child = node.children[0];
                childrenMaxWidth = child.viewState.subtreeW;
                childrenTotalHeight = C.NODE_GAP_Y_Vertical + child.viewState.subtreeH;
            } else {
                // Multiple children - stack horizontally (rare but handle it)
                let multiWidth = 0;
                let multiMaxHeight = 0;
                node.children.forEach((child, index) => {
                    multiWidth += child.viewState.subtreeW;
                    if (index < node.children.length - 1) {
                        multiWidth += C.NODE_GAP_X_Vertical;
                    }
                    multiMaxHeight = Math.max(multiMaxHeight, child.viewState.subtreeH);
                });
                childrenMaxWidth = multiWidth;
                childrenTotalHeight = C.NODE_GAP_Y_Vertical + multiMaxHeight;
            }
        }

        // Calculate failure path dimensions (goes to the right)
        let failureWidth = 0;
        if (node.failureNode) {
            failureWidth = C.NODE_GAP_X_Vertical + node.failureNode.viewState.subtreeW;
        }

        // Total width: max of (node + failure) or children width
        totalWidth = Math.max(
            node.viewState.w + failureWidth,
            childrenMaxWidth
        );

        // Total height: node height + children height
        totalHeight = node.viewState.h + childrenTotalHeight;

        node.viewState.subtreeW = totalWidth;
        node.viewState.subtreeH = totalHeight;
    }
}
