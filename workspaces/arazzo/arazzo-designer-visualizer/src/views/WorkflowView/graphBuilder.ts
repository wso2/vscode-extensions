import { ArazzoDefinition, ArazzoWorkflow } from '@wso2/arazzo-designer-core';
// import { InitVisitor } from '../../visitors/InitVisitor';
// import { SizingVisitorHorizontal } from '../../visitors/SizingVisitorHorizontal';
// import { SizingVisitorVertical } from '../../visitors/SizingvisitorVertical';
// import { PositionVisitorHorizontal } from '../../visitors/PositionVisitorHorizontal';
// import { PositionVisitorVertical } from '../../visitors/PositionVisitorVertical';
// import { NodeFactoryVisitorHorizontal } from '../../visitors/NodeFactoryVisitorHorizontal';
// import { NodeFactoryVisitorVertical } from '../../visitors/NodeFactoryVisitorVertical';
// import PortalCreator from '../../visitors/PortalCreator';

import { InitVisitor_v2 } from '../../visitors/InitVisitor_v2';
// import { SizingVisitorVertical_v2 } from '../../visitors/SizingVisitorVertical_v2';
import { PositionVisitorVertical_v2 } from '../../visitors/PositionVisitorVertical_v2';
import { NodeFactoryVisitorVertical_v2 } from '../../visitors/NodeFactoryVisitorVertical_v2';
import { DepthSearch } from '../../visitors/DepthSearch_v2';
import { PortalCreator_v2 } from '../../visitors/PortalCreator_v2';
import { SimpleNodeSizing } from '../../visitors/SimpleNodeSizing';

/**
 * Builds the graph visualization from the workflow using the Visitor pattern.
 * Layout strategy: Left-to-Right Flow with Vertical Stacking for Branches (or Top-to-Bottom when vertical).
 */
export const buildGraphFromWorkflow = async (workflow: ArazzoWorkflow, isVertical: boolean = false, definition?: ArazzoDefinition) => {
    // // 1. Init: Build Logical Tree from Arazzo Steps
    // const init = new InitVisitor();
    // const root = init.buildTree(workflow);

    // // 2. Sizing: Calculate dimensions (Bottom-Up)
    // if (isVertical) {
    //     const sizing = new SizingVisitorVertical();
    //     sizing.visit(root);
    // } else {
    //     const sizing = new SizingVisitorHorizontal();
    //     sizing.visit(root);
    // }

    // // 3. Positioning: Assign X,Y coordinates (Top-Down)
    // // Start at (50, 300) to give some padding
    // if (isVertical) {
    //     const positioning = new PositionVisitorVertical();
    //     positioning.visit(root, 300, 50);
    // } else {
    //     const positioning = new PositionVisitorHorizontal();
    //     positioning.visit(root, 50, 300);
    // }

    // // Create portals for backward jumps (after positioning)
    // const portals = PortalCreator.createPortals(root);

    // // 4. Factory: Generate React Flow Nodes & Edges
    // let factory;
    // if (isVertical) {
    //     factory = new NodeFactoryVisitorVertical();    
    // } else {
    //     factory = new NodeFactoryVisitorHorizontal();
    // }
    // factory.visit(root);
    //     const elems = factory.getElements();
    //     // Merge portal nodes/edges produced by PortalCreator
    //     return {
    //         nodes: [...elems.nodes, ...portals.nodes],
    //         edges: [...elems.edges, ...portals.edges]
    //     };
    

    // ============================================================
    // NEW SIMPLIFIED PIPELINE: Main Spine First, Branches Right
    // ============================================================

    // 1. Init: Build optimized tree
    const initV2 = new InitVisitor_v2(definition);
    const rootV2 = initV2.buildTree(workflow);

    // 2. Calculate Depth: Find the longest success path (main spine)
    const depthSearch = new DepthSearch();
    depthSearch.findHappyPath(rootV2);

    // 3. Simple Sizing: Set width and height for all nodes
    const simpleSizing = new SimpleNodeSizing();
    simpleSizing.visit(rootV2);

    // 4. Two-Phase Positioning:
    //    Phase 1: Position main spine vertically at x=0
    //    Phase 2: Position branches to the right
    const spineX = 0; // Main spine at x=0
    const startY = 50;
    const positioningV2 = new PositionVisitorVertical_v2(depthSearch, spineX);
    positioningV2.positionGraph(rootV2, spineX, startY);

    // 5. Portal Creation: Create portals for backward jumps
    const portalCreator = new PortalCreator_v2(depthSearch, definition);
    const portals = portalCreator.createPortals(rootV2);
    const portalEdgePairs = portalCreator.getPortalEdgePairs();

    // 6. Factory: Generate React Flow elements
    const factoryV2 = new NodeFactoryVisitorVertical_v2(definition);
    factoryV2.setNodePositions(positioningV2.getNodePositions());
    factoryV2.setPortalEdgePairs(portalEdgePairs);
    factoryV2.visit(rootV2);
    const elements = factoryV2.getElements();

    return {
        nodes: [...elements.nodes, ...portals.nodes],
        edges: [...elements.edges, ...portals.edges]
    };
};

