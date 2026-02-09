import { ArazzoWorkflow } from '@wso2/arazzo-designer-core';
import { InitVisitor } from '../../visitors/InitVisitor';
import { SizingVisitorHorizontal } from '../../visitors/SizingVisitorHorizontal';
import { SizingVisitorVertical } from '../../visitors/SizingvisitorVertical';
import { PositionVisitorHorizontal } from '../../visitors/PositionVisitorHorizontal';
import { PositionVisitorVertical } from '../../visitors/PositionVisitorVertical';
import { NodeFactoryVisitorHorizontal } from '../../visitors/NodeFactoryVisitorHorizontal';
import { NodeFactoryVisitorVertical } from '../../visitors/NodeFactoryVisitorVertical';
import PortalCreator from '../../visitors/PortalCreator';

import { InitVisitor_v2 } from '../../visitors/InitVisitor_v2';
import { SizingVisitorVertical_v2 } from '../../visitors/SizingVisitorVertical_v2';
import { PositionVisitorVertical_v2 } from '../../visitors/PositionVisitorVertical_v2';
import { NodeFactoryVisitorVertical_v2 } from '../../visitors/NodeFactoryVisitorVertical_v2';
import { DepthSearch } from '../../visitors/DepthSearch';
import { PortalCreator_v2 } from '../../visitors/PortalCreator_v2';

/**
 * Builds the graph visualization from the workflow using the Visitor pattern.
 * Layout strategy: Left-to-Right Flow with Vertical Stacking for Branches (or Top-to-Bottom when vertical).
 */
export const buildGraphFromWorkflow = async (workflow: ArazzoWorkflow, isVertical: boolean = false) => {
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
    // V2 IMPLEMENTATION: Vertical "Happy Path" Layout
    // ============================================================

    // 1. Init V2: Build optimized tree (no implicit ends, single-path optimization)
    const initV2 = new InitVisitor_v2();
    const rootV2 = initV2.buildTree(workflow);

    // 2. Happy Path Detection: Find the longest path (main spine)
    const depthSearch = new DepthSearch();
    depthSearch.findHappyPath(rootV2);

    // 3. Sizing V2: Calculate dimensions for vertical layout
    const sizingV2 = new SizingVisitorVertical_v2();
    sizingV2.visit(rootV2);

    // 4. Positioning V2: Assign coordinates with happy path spine at X=300
    const spineX = 300;
    const startY = 50;
    const positioningV2 = new PositionVisitorVertical_v2(depthSearch, spineX);
    
    // 4a. Analyze merge points BEFORE positioning (must be called first!)
    positioningV2.analyzeMergePointsForPositioning(rootV2);
    
    // 4b. Now position nodes with merge point awareness
    positioningV2.visit(rootV2, spineX, startY);

    // 5. Portal Creation V2: Create portals BEFORE NodeFactory
    const portalCreator = new PortalCreator_v2(depthSearch);
    const portals = portalCreator.createPortals(rootV2);
    const portalEdgePairs = portalCreator.getPortalEdgePairs();

    // 6. Factory V2: Generate React Flow elements (skips edges handled by portals)
    const factoryV2 = new NodeFactoryVisitorVertical_v2();
    factoryV2.setPortalEdgePairs(portalEdgePairs);
    factoryV2.visit(rootV2);
    const elements = factoryV2.getElements();

    return {
        nodes: [...elements.nodes, ...portals.nodes],
        edges: [...elements.edges, ...portals.edges]
    };
};

