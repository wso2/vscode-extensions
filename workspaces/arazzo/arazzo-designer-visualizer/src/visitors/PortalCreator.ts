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
        const targetPortalId = `portal_in_${source.id}_to_${target.id}_${this.portalCounter}`;
        this.portalCounter++;

        // Portal above source (exit portal)
        const sourcePortalX = source.viewState.x;
        const sourcePortalY = source.viewState.y - C.NODE_GAP_Y_Horizontal / 2;

        // Portal above target (entry portal)
        const targetPortalX = target.viewState.x + (target.viewState.w / 2);
        const targetPortalY = target.viewState.y - C.NODE_GAP_Y_Horizontal / 2;

        this.reactNodes.push({
            id: sourcePortalId,
            type: 'portalNode',
            position: { x: sourcePortalX, y: sourcePortalY },
            data: {
                label: `→ ${target.label}`,
                pairedPortalId: targetPortalId,
                pairedPortalX: targetPortalX,
                pairedPortalY: targetPortalY
            },
            connectable: false
        });

        this.reactNodes.push({
            id: targetPortalId,
            type: 'portalNode',
            position: { x: targetPortalX, y: targetPortalY },
            data: {
                label: ``,
                pairedPortalId: sourcePortalId,
                pairedPortalX: sourcePortalX,
                pairedPortalY: sourcePortalY
            },
            connectable: false
        });

        // Map logical sourceHandle ('right' success, 'bottom' failure) to actual handle IDs
        const sourceHandleId = sourceHandle === 'bottom' ? 'h-bottom' : 'h-right';

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

        // Edge: target portal → target (entry to target)
        const targetNodeHandle = 'h-top';

        this.reactEdges.push({
            id: `e_${targetPortalId}-${target.id}`,
            source: targetPortalId,
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
