import { ArazzoWorkflow } from '@wso2/arazzo-designer-core';
import { InitVisitor } from '../../visitors/InitVisitor';
import { SizingVisitor } from '../../visitors/SizingVisitor';
import { PositionVisitor } from '../../visitors/PositionVisitor';
import { NodeFactoryVisitor } from '../../visitors/NodeFactoryVisitor';

/**
 * Builds the graph visualization from the workflow using the Visitor pattern.
 * Layout strategy: Left-to-Right Flow with Vertical Stacking for Branches.
 */
export const buildGraphFromWorkflow = async (workflow: ArazzoWorkflow) => {
    // 1. Init: Build Logical Tree from Arazzo Steps
    const init = new InitVisitor();
    const root = init.buildTree(workflow);

    // 2. Sizing: Calculate dimensions (Bottom-Up)
    const sizing = new SizingVisitor();
    sizing.visit(root);

    // 3. Positioning: Assign X,Y coordinates (Top-Down)
    // Start at (50, 300) to give some padding
    const positioning = new PositionVisitor();
    positioning.visit(root, 50, 300);

    // 4. Factory: Generate React Flow Nodes & Edges
    const factory = new NodeFactoryVisitor();
    factory.visit(root);

    return factory.getElements();
};

