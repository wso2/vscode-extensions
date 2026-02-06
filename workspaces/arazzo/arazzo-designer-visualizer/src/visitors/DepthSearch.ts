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

/**
 * DepthSearch: Identifies the "Main Happy Path" (spine) in the workflow.
 * 
 * Strategy:
 * 1. Always prioritize the FIRST success child/branch (primary path)
 * 2. Avoid failure paths unless no other option
 * 3. The longest continuous sequence of STEP nodes wins
 */
export class DepthSearch {
    private mainPathNodes: Set<string> = new Set();
    private mainPath: FlowNode[] = [];

    /**
     * Find the main happy path - the primary vertical spine.
     * Returns a Set of node IDs that should stay on the spine (constant X).
     */
    public findHappyPath(rootNode: FlowNode): Set<string> {
        this.mainPathNodes.clear();
        this.mainPath = [];

        // Build the main path by following primary branches
        this.buildMainPath(rootNode);

        // Mark all nodes in the main path
        this.mainPath.forEach(node => {
            this.mainPathNodes.add(node.id);
        });

        console.log('[DepthSearch] Main Path:', this.mainPath.map(n => n.id));
        return this.mainPathNodes;
    }

    /**
     * Build main path by following the primary success path at each decision point.
     * Rules:
     * - Always take the FIRST child (primary success path)
     * - If branches exist, take the FIRST branch that leads to a STEP node
     * - Avoid END nodes unless no other choice
     */
    private buildMainPath(node: FlowNode): void {
        // Add current node to path
        this.mainPath.push(node);

        // Stop at END nodes
        if (node.type === 'END') {
            return;
        }

        // Priority 1: First success child (most common continuation)
        if (node.children.length > 0) {
            const primaryChild = node.children[0];
            this.buildMainPath(primaryChild);
            return;
        }

        // Priority 2: Branches (condition node) - take first STEP branch
        if (node.branches && node.branches.length > 0) {
            // Find first branch that leads to a STEP (not END)
            for (const branch of node.branches) {
                if (branch.length > 0) {
                    const head = branch[0];
                    if (head.type === 'STEP') {
                        this.buildMainPath(head);
                        return;
                    }
                }
            }
            
            // Fallback: take first branch even if it's an END
            const firstBranch = node.branches[0];
            if (firstBranch.length > 0) {
                this.buildMainPath(firstBranch[0]);
                return;
            }
        }

        // Priority 3: Failure path (only if no success path exists)
        if (node.failureNode) {
            // Don't include failure path in main spine unless it's the only option
            // and leads to more steps (not just an END)
            if (node.failureNode.type !== 'END') {
                this.buildMainPath(node.failureNode);
            }
        }
    }

    /**
     * Check if a node is on the main happy path.
     */
    public isOnHappyPath(nodeId: string): boolean {
        return this.mainPathNodes.has(nodeId);
    }

    /**
     * Get all nodes on the main path.
     */
    public getHappyPathNodes(): Set<string> {
        return this.mainPathNodes;
    }

    /**
     * Get the ordered sequence of nodes on the main path.
     */
    public getLongestPath(): FlowNode[] {
        return this.mainPath;
    }
}
