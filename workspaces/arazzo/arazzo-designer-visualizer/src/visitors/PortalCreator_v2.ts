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
import { DepthSearch } from './DepthSearch';

/**
 * PortalCreator V2: Smart portal creation for vertical "Happy Path" layout.
 * 
 * Portal Rules:
 * 1. Failure path → Main path: CREATE PORTAL (no direct edge back to spine)
 * 2. Main path branch → Main path merge: NO PORTAL (direct edge, simple merge)
 * 3. Failure path → Failure-only node: NO PORTAL (direct edge within failure context)
 */
export class PortalCreator_v2 {
    private reactNodes: Node[] = [];
    private reactEdges: Edge[] = [];
    private visited: Set<string> = new Set();
    private portalCounter: number = 0;
    private mainPathNodes: Set<string>;
    private failurePathNodes: Set<string> = new Set();

    constructor(private depthSearch: DepthSearch) {
        this.mainPathNodes = depthSearch.getHappyPathNodes();
    }

    /**
     * Create portals for the workflow tree.
     * First pass: identify failure path nodes.
     * Second pass: create portals where needed.
     */
    public createPortals(root: FlowNode) {
        // Reset state
        this.reactNodes = [];
        this.reactEdges = [];
        this.visited = new Set();
        this.portalCounter = 0;
        this.failurePathNodes.clear();

        // Pass 1: Mark all nodes reachable via failure paths
        this.markFailurePaths(root);

        console.log('[PortalCreator V2] Main path nodes:', Array.from(this.mainPathNodes));
        console.log('[PortalCreator V2] Failure path nodes:', Array.from(this.failurePathNodes));

        // Pass 2: Traverse and create portals where needed
        this.visited.clear();
        this.traverse(root, false);

        return { nodes: this.reactNodes, edges: this.reactEdges };
    }

    /**
     * Mark all nodes that are reachable via failure paths.
     */
    private markFailurePaths(node: FlowNode, isInFailurePath: boolean = false, visited: Set<string> = new Set()): void {
        if (visited.has(node.id)) return;
        visited.add(node.id);

        // Mark this node if we're in a failure path
        if (isInFailurePath) {
            this.failurePathNodes.add(node.id);
        }

        // Continue marking children (maintain current context)
        node.children.forEach(child => this.markFailurePaths(child, isInFailurePath, visited));

        // Failure node: switch to failure path context
        if (node.failureNode) {
            this.markFailurePaths(node.failureNode, true, visited);
        }

        // Branches: maintain current context (branches inherit parent's context)
        node.branches?.forEach(branch => {
            if (branch.length > 0) {
                this.markFailurePaths(branch[0], isInFailurePath, visited);
            }
        });
    }

    /**
     * Traverse tree and create portals according to the rules.
     */
    private traverse(node: FlowNode, isInFailurePath: boolean): void {
        if (this.visited.has(node.id)) return;
        this.visited.add(node.id);

        // Update failure path context
        const currentlyInFailurePath = isInFailurePath || this.failurePathNodes.has(node.id);

        // Process success children
        node.children.forEach(child => {
            this.createPortalIfNeeded(node, child, 'success', currentlyInFailurePath);
            this.traverse(child, currentlyInFailurePath);
        });

        // Process failure node (enter failure path context)
        if (node.failureNode) {
            this.createPortalIfNeeded(node, node.failureNode, 'failure', true);
            this.traverse(node.failureNode, true);
        }

        // Process branches
        node.branches?.forEach(branch => {
            if (branch.length > 0) {
                const head = branch[0];
                this.createPortalIfNeeded(node, head, 'success', currentlyInFailurePath);
                this.traverse(head, currentlyInFailurePath);
            }
        });
    }

    /**
     * Determine if a portal is needed based on the rules.
     */
    private createPortalIfNeeded(
        source: FlowNode, 
        target: FlowNode, 
        edgeType: 'success' | 'failure',
        sourceIsInFailurePath: boolean
    ): void {
        const targetIsOnMainPath = this.mainPathNodes.has(target.id);
        const targetIsInFailurePath = this.failurePathNodes.has(target.id);
        
        // Check if this is a goto to an already-positioned node (not a direct child in tree)
        // Portal should only be created if target is to the LEFT (backward horizontally)
        const isBackwardJump = target.viewState.y < source.viewState.y;
        // Compare centers: the edge connects to node centers, so check center X positions
        const sourceCenterX = source.viewState.x + source.viewState.w / 2;
        const targetCenterX = target.viewState.x + target.viewState.w / 2;
        const isLeftwardJump = targetCenterX < sourceCenterX; // Target center is to the left of source center
        const isForwardGoto = target.viewState.y > source.viewState.y + source.viewState.h + 100; // Significant gap

        // Rule 1: Failure path → existing positioned step via leftward goto = CREATE PORTAL
        // Only create a portal when the target is to the LEFT of source AND the target
        // is already an existing positioned node (on main path or failure path).
        // If the goto targets a *new* node (not on main/failure paths), create a direct edge instead.
        if (sourceIsInFailurePath && isLeftwardJump && (targetIsOnMainPath || targetIsInFailurePath)) {
            const reason = 'failure path goto (leftward to positioned node)';
            console.log(`[PortalCreator V2] Creating portal: ${source.id} → ${target.id} (${reason})`);
            this.createPortal(source, target, edgeType, reason);
            return;
        }

        // Rule 2: Main path/alternative branch backward jump to main path = CREATE PORTAL
        // In vertical layout, any backward jump (target.y < source.y) to an already-positioned
        // node (main or failure path) should create a portal, regardless of X position.
        if (!sourceIsInFailurePath && isBackwardJump && (targetIsOnMainPath || targetIsInFailurePath)) {
            const reason = 'backward jump to positioned node';
            console.log(`[PortalCreator V2] Creating portal: ${source.id} → ${target.id} (${reason})`);
            this.createPortal(source, target, edgeType, reason);
            return;
        }

        // Rule 3: Main path branch → Main path merge (forward, close proximity) = NO PORTAL
        // Direct edge handled by NodeFactory
        console.log(`[PortalCreator V2] No portal: ${source.id} → ${target.id} (direct flow)`);
    }

    /**
     * Create a portal node and edges.
     */
    private createPortal(source: FlowNode, target: FlowNode, edgeType: 'success' | 'failure', reason?: string): void {
        const portalId = `portal_out_${source.id}_to_${target.id}_${this.portalCounter}`;
        this.portalCounter++;

        // Position portal near the source
        const portalX = source.viewState.x + source.viewState.w + 20;
        const portalY = source.viewState.y;

        // Target center coordinates for navigation
        const targetCenterX = target.viewState.x + (target.viewState.w / 2);
        const targetCenterY = target.viewState.y + (target.viewState.h / 2);

        // Create portal node
        this.reactNodes.push({
            id: portalId,
            type: 'portalNode',
            position: { x: portalX, y: portalY },
            data: {
                label: `→ ${target.label}`,
                gotoLabel: target.label,
                gotoNodeId: target.id,
                sourceNodeId: source.id,
                gotoX: targetCenterX,
                gotoY: targetCenterY
            },
            connectable: false
        });

        // Log portal created with reason
        console.log(`[PortalCreator V2] Portal created: ${portalId} from ${source.id} → ${target.id}` + (reason ? ` (reason=${reason})` : ''));

        // Determine source handle based on edge type
        const sourceHandleId = edgeType === 'failure' ? 'h-right-source' : 'h-bottom';
        const edgeStyle = edgeType === 'failure' 
            ? { stroke: 'red', strokeDasharray: '4 4' } 
            : { stroke: '#00f3ff', strokeDasharray: '4 4' };

        // Edge: source → portal
        this.reactEdges.push({
            id: `e_${source.id}-${portalId}`,
            source: source.id,
            target: portalId,
            sourceHandle: sourceHandleId,
            targetHandle: 'h-bottom',
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: edgeStyle
        });

        // Note: We don't create the portal → target edge here
        // The portal node itself handles navigation via click interaction
    }

    /**
     * Get the set of source→target pairs that are handled by portals.
     * NodeFactory can use this to skip creating duplicate direct edges.
     */
    public getPortalEdgePairs(): Set<string> {
        const pairs = new Set<string>();
        this.reactNodes.forEach(portal => {
            if (portal.data.sourceNodeId && portal.data.gotoNodeId) {
                pairs.add(`${portal.data.sourceNodeId}::${portal.data.gotoNodeId}`);
            }
        });
        return pairs;
    }
}

export default PortalCreator_v2;
