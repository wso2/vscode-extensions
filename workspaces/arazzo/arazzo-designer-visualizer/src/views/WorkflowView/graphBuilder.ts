import { ArazzoWorkflow } from '@wso2/arazzo-designer-core';
import { InitVisitor } from '../../visitors/InitVisitor';
import { SizingVisitorHorizontal } from '../../visitors/SizingVisitorHorizontal';
import { SizingVisitorVertical } from '../../visitors/SizingvisitorVertical';
import { PositionVisitorHorizontal } from '../../visitors/PositionVisitorHorizontal';
import { PositionVisitorVertical } from '../../visitors/PositionVisitorVertical';
import { NodeFactoryVisitorHorizontal } from '../../visitors/NodeFactoryVisitorHorizontal';
import { NodeFactoryVisitorVertical } from '../../visitors/NodeFactoryVisitorVertical';
import PortalCreator from '../../visitors/PortalCreator';

/**
 * Builds the graph visualization from the workflow using the Visitor pattern.
 * Layout strategy: Left-to-Right Flow with Vertical Stacking for Branches (or Top-to-Bottom when vertical).
 */
export const buildGraphFromWorkflow = async (workflow: ArazzoWorkflow, isVertical: boolean = false) => {
    // 1. Init: Build Logical Tree from Arazzo Steps
    const init = new InitVisitor();
    const root = init.buildTree(workflow);

    // 2. Sizing: Calculate dimensions (Bottom-Up)
    if (isVertical) {
        const sizing = new SizingVisitorVertical();
        sizing.visit(root);
    } else {
        const sizing = new SizingVisitorHorizontal();
        sizing.visit(root);
    }

    // 3. Positioning: Assign X,Y coordinates (Top-Down)
    // Start at (50, 300) to give some padding
    if (isVertical) {
        const positioning = new PositionVisitorVertical();
        positioning.visit(root, 300, 50);
    } else {
        const positioning = new PositionVisitorHorizontal();
        positioning.visit(root, 50, 300);
    }

    // Create portals for backward jumps (after positioning)
    const portals = PortalCreator.createPortals(root);

    // 4. Factory: Generate React Flow Nodes & Edges
    let factory;
    if (isVertical) {
        factory = new NodeFactoryVisitorVertical();    
    } else {
        factory = new NodeFactoryVisitorHorizontal();
    }
    factory.visit(root);
        const elems = factory.getElements();
        // Merge portal nodes/edges produced by PortalCreator
        return {
            nodes: [...elems.nodes, ...portals.nodes],
            edges: [...elems.edges, ...portals.edges]
        };
    


    
};

