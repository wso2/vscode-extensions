import { FlowNode } from '../utils/types';
import { Node, Edge, MarkerType } from '@xyflow/react';
import * as C from '../constants/nodeConstants';

export class NodeFactoryVisitorHorizontal {
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
        // Compose node data and ensure step nodes get a default iconClass
        const composedData = { label: node.label, ...node.data } as any;
        if (node.type === 'STEP' && !composedData.iconClass) {
            composedData.iconClass = 'fw fw-bi-arrow-outward';
        }

        const reactNode = {
            id: node.id,
            type: this.mapType(node.type), // Maps 'STEP' to 'default' or custom type
            position: { x: node.viewState.x, y: node.viewState.y },
            data: composedData,
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
        // Horizontal behavior
        let sourceHandleId = sourceHandle === 'bottom' ? 'h-bottom' : 'h-right-source';
        let targetHandleId = 'h-left';
        // Failure connections: map handles specially
        if (sourceHandle === 'bottom') {
            // Failure -> END or RETRY should target top
            if (target.type === 'END' || target.type === 'RETRY') {
                targetHandleId = 'h-top';
            }
            // Failure -> CONDITION: keep source bottom and target top
            if (target.type === 'CONDITION') {
                targetHandleId = 'h-top';
            }
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
            orientation: 'horizontal'
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