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
 * SimpleNodeSizing: Sets width and height for all nodes.
 * 
 * This visitor performs a simple pass to assign fixed dimensions
 * to all nodes in the tree. No subtree calculations needed.
 */
export class SimpleNodeSizing {
    private visited = new Set<string>();

    /**
     * Visit all nodes and set their width and height.
     */
    public visit(node: FlowNode): void {
        if (this.visited.has(node.id)) {
            return;
        }
        this.visited.add(node.id);
        // Set dimensions based on node type (match SizingVisitorVertical_v2.calculateNodeSize)
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
                node.viewState.w = C.NODE_WIDTH;
                node.viewState.h = C.NODE_HEIGHT;
                break;
        }

        console.log(`[SimpleNodeSizing] Set dimensions for ${node.id} (type=${node.type}): w=${node.viewState.w}, h=${node.viewState.h}`);

        // Traverse children
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => this.visit(child));
        }

        // Traverse branches
        if (node.branches && node.branches.length > 0) {
            node.branches.forEach(branch => {
                branch.forEach(branchNode => this.visit(branchNode));
            });
        }

        // Traverse failure node
        if (node.failureNode) {
            this.visit(node.failureNode);
        }
    }

    public reset(): void {
        this.visited.clear();
    }
}
