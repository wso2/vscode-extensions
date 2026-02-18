/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
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
 * * Strategy:
 * 1. Always prioritize the FIRST success child/branch (primary path)
 * 2. Avoid failure paths unless no other option
 * 3. The longest continuous sequence of STEP nodes wins
 * * Optimization:
 * Uses a single-pass Depth First Search (DFS) to gather the full path
 * bubble-up style, rather than re-calculating depth iteratively.
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

        if (!rootNode) return this.mainPathNodes;

        // Optimization: Single pass traversal to find the longest path info
        // This returns { depth: N, path: [...] } immediately.
        const result = this.getLongestPathInfo(rootNode, new Set<string>());
        
        this.mainPath = result.path;

        // Mark all nodes in the main path
        this.mainPath.forEach(node => {
            this.mainPathNodes.add(node.id);
            node.isMainSpine = true; // Mark as main spine node for rendering logic
        });

        console.log('[DepthSearch] Main Path:', this.mainPath.map(n => n.id));
        return this.mainPathNodes;
    }

    /**
     * Recursive function to find the longest path from the current node.
     * Returns both the depth and the actual array of nodes in that path.
     * * @param node The current node to evaluate
     * @param visited Set of visited IDs in the current recursion stack (to prevent cycles)
     */
    private getLongestPathInfo(node: FlowNode, visited: Set<string>): { depth: number, path: FlowNode[] } {
        // Base case: Avoid cycles or invalid nodes
        if (!node || visited.has(node.id)) {
            return { depth: 0, path: [] };
        }

        // Create a new visited set for this specific branch traversal 
        // to prevent infinite loops within this path context
        const currentVisited = new Set(visited);
        currentVisited.add(node.id);

        // Base case: END node is the end of a path
        if (node.type === 'END') {
            return { depth: 1, path: [node] };
        }

        let maxDepth = 0;
        let bestPath: FlowNode[] = [];

        // 1. Evaluate direct children (Primary Success Paths)
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                const result = this.getLongestPathInfo(child, currentVisited);
                
                // We strictly want the longest path. 
                // Note: using '>' (strict inequality) ensures that if depths are equal,
                // the FIRST child (earlier in the array) keeps priority.
                if (result.depth > maxDepth) {
                    maxDepth = result.depth;
                    bestPath = result.path;
                }
            }
        }

        // 2. Evaluate Branch Heads (Decision Points / Condition Nodes)
        // Branches are alternative success paths. We treat them as candidates for the spine.
        if (node.branches && node.branches.length > 0) {
            for (const branch of node.branches) {
                if (branch.length > 0) {
                    const head = branch[0];
                    const result = this.getLongestPathInfo(head, currentVisited);

                    if (result.depth > maxDepth) {
                        maxDepth = result.depth;
                        bestPath = result.path;
                    }
                }
            }
        }

        // Return current node prepended to the best sub-path found
        return {
            depth: maxDepth + 1,
            path: [node, ...bestPath]
        };
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