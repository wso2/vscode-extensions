import { FlowNode } from '../utils/types';
import { Node, Edge, MarkerType } from '@xyflow/react';
import * as C from '../constants/nodeConstants';

export class PortalCreator {
    private reactNodes: Node[] = [];
    private reactEdges: Edge[] = [];
    private visited: Set<string> = new Set();
    private portalCounter: number = 0;

    public createPortals(root: FlowNode) {
        // Reset state for each call (singleton instance reused across renders)
        this.reactNodes = [];
        this.reactEdges = [];
        this.visited = new Set();
        this.portalCounter = 0;
        
        this.traverse(root);
        return { nodes: this.reactNodes, edges: this.reactEdges };
    }

    private traverse(node: FlowNode) {
        if (this.visited.has(node.id)) { return; }
        this.visited.add(node.id);

        // Children (right)
        node.children.forEach(child => {
            this.createPortalIfJump(node, child, 'right');
            this.traverse(child);
        });

        // Failure (bottom)
        if (node.failureNode) {
            this.createPortalIfJump(node, node.failureNode, 'bottom');
            this.traverse(node.failureNode);
        }

        // Branches
        node.branches?.forEach(branch => {
            const head = branch[0];
            if (head) {
                this.createPortalIfJump(node, head, 'right');
                this.traverse(head);
            }
        });
    }

    private createPortalIfJump(source: FlowNode, target: FlowNode, sourceHandle: 'right' | 'bottom') {
        const isPreviousNode = target.viewState.y < source.viewState.y && target.viewState.x < source.viewState.x;
        if (!isPreviousNode) { return; }

        const sourcePortalId = `portal_out_${source.id}_to_${target.id}_${this.portalCounter}`;
        this.portalCounter++;

        // Portal positioned a bit to the right and above the source (exit portal)
        // Use layout constants so the offset scales with diagram spacing.
        const sourcePortalX = source.viewState.x + C.NODE_GAP_X_Horizontal / 2;
        const sourcePortalY = source.viewState.y - (C.NODE_GAP_Y_Horizontal * 0.75);

        // Target center coordinates for navigation
        const targetCenterX = target.viewState.x + (target.viewState.w / 2);
        const targetCenterY = target.viewState.y + (target.viewState.h / 2);

        this.reactNodes.push({
            id: sourcePortalId,
            type: 'portalNode',
            position: { x: sourcePortalX, y: sourcePortalY },
            data: {
                label: `→ ${target.label}`,
                gotoLabel: target.label,
                gotoNodeId: target.id,
                gotoX: targetCenterX,
                gotoY: targetCenterY
            },
            connectable: false
        });

        // Map logical sourceHandle ('right' success, 'bottom' failure) to actual handle IDs
        const sourceHandleId = sourceHandle === 'bottom' ? 'h-bottom' : 'h-right-source';

        // Portal handle for the portal node
        const portalNodeHandle = 'h-bottom';

        // Edge: source → source portal
        this.reactEdges.push({
            id: `e_${source.id}-${sourcePortalId}`,
            source: source.id,
            target: sourcePortalId,
            sourceHandle: sourceHandleId,
            targetHandle: portalNodeHandle,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#00f3ff' }
        });

        // Edge: source portal → target (directly navigate to target node)
        const targetNodeHandle = 'h-top';
        this.reactEdges.push({
            id: `e_${sourcePortalId}-${target.id}`,
            source: sourcePortalId,
            target: target.id,
            sourceHandle: portalNodeHandle,
            targetHandle: targetNodeHandle,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: '#00f3ff' }
        });
    }
}

export default new PortalCreator();
