import { FlowNode } from '../utils/types';
import { Node, Edge, MarkerType } from '@xyflow/react';
import * as C from '../constants/nodeConstants';

export class NodeFactoryVisitor {
    private reactNodes: Node[] = [];
    private reactEdges: Edge[] = [];
    private visited: Set<string> = new Set();
    private portalCounter: number = 0;
    private orientation: 'horizontal' | 'vertical' = 'horizontal';

    constructor(orientation: 'horizontal' | 'vertical' = 'horizontal') {
        this.orientation = orientation;
    }

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
            // Create two portal nodes
            const sourcePortalId = `portal_out_${source.id}_to_${target.id}_${this.portalCounter}`;
            const targetPortalId = `portal_in_${source.id}_to_${target.id}_${this.portalCounter}`;
            this.portalCounter++;

            // Portal positions differ by orientation
            let sourcePortalX: number, sourcePortalY: number, targetPortalX: number, targetPortalY: number;
            if (this.orientation === 'horizontal') {
                // Portal above source (exit portal)
                sourcePortalX = source.viewState.x;
                sourcePortalY = source.viewState.y - C.NODE_GAP_Y / 2;

                // Portal above target (entry portal)
                targetPortalX = target.viewState.x + (target.viewState.w / 2);
                targetPortalY = target.viewState.y - C.NODE_GAP_Y / 2;
            } else {
                // Vertical layout: place portals to the right of nodes
                sourcePortalX = source.viewState.x + source.viewState.w + C.NODE_GAP_X / 2;
                sourcePortalY = source.viewState.y + (source.viewState.h / 2);

                targetPortalX = target.viewState.x + target.viewState.w + C.NODE_GAP_X / 2;
                targetPortalY = target.viewState.y + (target.viewState.h / 2);
            }

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

            // Map logical sourceHandle ('right' success, 'bottom' failure) to actual handle IDs per orientation
            const sourceHandleId = this.orientation === 'horizontal'
                ? (sourceHandle === 'bottom' ? 'h-bottom' : 'h-right')
                : (sourceHandle === 'right' ? 'h-bottom' : 'h-right');

            // Portal handle for the portal node depends on orientation
            const portalNodeHandle = this.orientation === 'horizontal' ? 'h-bottom' : 'h-right';

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
            // Map portal->target source handle as portalNodeHandle, and target handle depends on orientation
            const targetNodeHandle = this.orientation === 'horizontal' ? 'h-top' : 'h-left';

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
        } else {
            // Normal edge
            this.createEdge(source, target, sourceHandle);
        }
    }

    private createEdge(source: FlowNode, target: FlowNode, sourceHandle: 'right' | 'bottom') {
        // Determine handle mapping based on orientation
        let sourceHandleId: string;
        let targetHandleId: string;

        if (this.orientation === 'horizontal') {
            // Existing (preserved) horizontal behavior
            sourceHandleId = sourceHandle === 'bottom' ? 'h-bottom' : 'h-right';
            targetHandleId = 'h-left';
            // If connecting from Failure (bottom) to a Terminate Node (END) or Retry Node, use top handle
            if (sourceHandle === 'bottom' && (target.type === 'END' || target.type === 'RETRY')) {
                targetHandleId = 'h-top';
            }
        } else {
            // Vertical behavior
            // Step nodes: target top, source bottom; failure (logical bottom) uses right
            sourceHandleId = sourceHandle === 'right' ? 'h-bottom' : 'h-right';
            targetHandleId = 'h-top';
            // If failure connecting to END/RETRY, target should be left
            if (sourceHandle === 'bottom' && (target.type === 'END' || target.type === 'RETRY')) {
                targetHandleId = 'h-left';
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
            orientation: this.orientation
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