import { FlowNode } from '../utils/types';
import { Node, Edge, MarkerType } from '@xyflow/react';
import * as C from '../constants/nodeConstants';

export class NodeFactoryVisitorVertical {
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
        const reactNode = {
            id: node.id,
            type: this.mapType(node.type), // Maps 'STEP' to 'default' or custom type
            position: { x: node.viewState.x, y: node.viewState.y },
            data: {
                label: node.label,
                ...node.data
            },
            style: { width: node.viewState.w, height: node.viewState.h }, // Force the calculated size
            connectable: false
        };
        console.log(`[NodeFactory] Creating node:`, { 
            id: reactNode.id, 
            type: reactNode.type, 
            internalType: node.type,
            label: reactNode.data.label,
            position: reactNode.position 
        });
        this.reactNodes.push(reactNode);

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
            // Portals are created by PortalCreator (run after positioning and before node factory)
            // Skip creating portals/portal-edges here to avoid duplication.
            return;
        }

        // Normal edge
        this.createEdge(source, target, sourceHandle);
    }

    private createEdge(source: FlowNode, target: FlowNode, sourceHandle: 'right' | 'bottom') {
        // Vertical behavior
        // Step nodes: target top, source bottom; failure (logical bottom) uses right
        let sourceHandleId = sourceHandle === 'right' ? 'h-bottom' : 'h-right';
        let targetHandleId = 'h-top';
        // If failure connecting to END/RETRY or CONDITION, target should be left
        if (sourceHandle === 'bottom' && (target.type === 'END' || target.type === 'RETRY' || target.type === 'CONDITION')) {
            targetHandleId = 'h-left';
        }

        const edge = {
            id: `e_${source.id}-${target.id}`,
            source: source.id,
            target: target.id,
            sourceHandle: sourceHandleId,
            targetHandle: targetHandleId,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: sourceHandle === 'bottom' ? { stroke: 'red' } : { stroke: '#0099ff' }
        };
        console.log(`[NodeFactory] Creating edge:`, {
            from: source.id,
            to: target.id,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            targetType: target.type,
            orientation: 'vertical'
        });
        this.reactEdges.push(edge);
    }

    private mapType(type: string): string {
        // Map your internal types to React Flow types registered in nodeTypes
        if (type === 'CONDITION') { return 'conditionNode'; }
        if (type === 'START') { return 'startNode'; }
        if (type === 'END') { return 'endNode'; }
        if (type === 'RETRY') { return 'retryNode'; }
        return 'stepNode'; // Your custom white rectangle
    }
}
