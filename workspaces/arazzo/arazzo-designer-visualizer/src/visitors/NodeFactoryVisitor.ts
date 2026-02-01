import { FlowNode } from '../utils/types';
import { Node, Edge, MarkerType } from '@xyflow/react';
import * as C from '../constants/nodeConstants';

export class NodeFactoryVisitor {
    private reactNodes: Node[] = [];
    private reactEdges: Edge[] = [];
    private visited: Set<string> = new Set();
    private portalCounter: number = 0;

    public getElements() { return { nodes: this.reactNodes, edges: this.reactEdges }; }

    public visit(node: FlowNode): void {
        // Prevent cycles - but still create edges to already-visited nodes
        if (this.visited.has(node.id)) { return; }
        this.visited.add(node.id);

        // 1. Create the React Node
        this.reactNodes.push({
            id: node.id,
            type: this.mapType(node.type), // Maps 'STEP' to 'default' or custom type
            position: { x: node.viewState.x, y: node.viewState.y },
            data: {
                label: node.label,
                ...node.data
            },
            style: { width: node.viewState.w, height: node.viewState.h }, // Force the calculated size
            connectable: false
        });

        // 2. Create Edges
        // Right Side Connection
        node.children.forEach(child => {
            this.createConnectionOrPortal(node, child, 'right');
            this.visit(child);
        });

        // Failure Connection (Bottom)
        if (node.failureNode) {
            this.createConnectionOrPortal(node, node.failureNode, 'bottom');
            this.visit(node.failureNode);
        }

        // Branches (Right)
        node.branches?.forEach(branch => {
            const head = branch[0];
            if (head) {
                this.createConnectionOrPortal(node, head, 'right');
                this.visit(head);
            }
        });
    }

    private createConnectionOrPortal(source: FlowNode, target: FlowNode, sourceHandle: 'right' | 'bottom') {
        // Check if target is a "previous node" (top-left of source)
        const isPreviousNode = target.viewState.y < source.viewState.y && target.viewState.x < source.viewState.x;

        if (isPreviousNode) {
            // Create two portal nodes
            const sourcePortalId = `portal_out_${source.id}_to_${target.id}_${this.portalCounter}`;
            const targetPortalId = `portal_in_${source.id}_to_${target.id}_${this.portalCounter}`;
            this.portalCounter++;

            // Portal above source (exit portal)
            const sourcePortalX = source.viewState.x;
            const sourcePortalY = source.viewState.y - C.NODE_GAP_Y / 2;

            // Portal above target (entry portal)
            const targetPortalX = target.viewState.x + (target.viewState.w / 2);
            const targetPortalY = target.viewState.y - C.NODE_GAP_Y / 2;

            this.reactNodes.push({
                id: sourcePortalId,
                type: 'portal',
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
                type: 'portal',
                position: { x: targetPortalX, y: targetPortalY },
                data: {
                    label: ``,
                    pairedPortalId: sourcePortalId,
                    pairedPortalX: sourcePortalX,
                    pairedPortalY: sourcePortalY
                },
                connectable: false
            });

            // Edge: source → source portal (above it)
            this.reactEdges.push({
                id: `e_${source.id}-${sourcePortalId}`,
                source: source.id,
                target: sourcePortalId,
                sourceHandle: sourceHandle === 'bottom' ? 'h-bottom' : 'h-right',
                targetHandle: 'h-bottom',
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed },
                style: { stroke: '#00f3ff' }
            });

            // Edge: target portal → target (down to it)
            this.reactEdges.push({
                id: `e_${targetPortalId}-${target.id}`,
                source: targetPortalId,
                target: target.id,
                sourceHandle: 'h-bottom',
                targetHandle: 'h-top',
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed },
                style: { stroke: '#00f3ff' }
            });
        } else {
            // Normal edge
            this.createEdge(source, target, sourceHandle);
        }
    }

    private createEdge(source: FlowNode, target: FlowNode, sourceHandle: 'right' | 'bottom') {
        let targetHandle = 'h-left';

        // If connecting from Failure (bottom) to a Terminate Node (END) or Retry Node, use top handle
        if (sourceHandle === 'bottom' && (target.type === 'END' || target.type === 'RETRY')) {
            targetHandle = 'h-top';
        }

        this.reactEdges.push({
            id: `e_${source.id}-${target.id}`,
            source: source.id,
            target: target.id,
            sourceHandle: sourceHandle === 'bottom' ? 'h-bottom' : 'h-right', // Custom handles in your node
            targetHandle: targetHandle,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: sourceHandle === 'bottom' ? { stroke: 'red' } : { stroke: '#0099ff' }
        });
    }

    private mapType(type: string): string {
        // Map your internal types to React Flow types registered in App.tsx
        if (type === 'CONDITION') { return 'condition'; }
        if (type === 'START') { return 'start'; }
        if (type === 'END') { return 'end'; }
        if (type === 'RETRY') { return 'retry'; }
        return 'stepNode'; // Your custom white rectangle
    }
}