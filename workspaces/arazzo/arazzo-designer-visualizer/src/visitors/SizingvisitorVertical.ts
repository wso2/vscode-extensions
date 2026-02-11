import { FlowNode } from '../utils/types';
import * as C from '../constants/nodeConstants';

export class SizingVisitorVertical {
    private visited: Set<string> = new Set();

    public visit(node: FlowNode): void {
        // Prevent cycles
        if (this.visited.has(node.id)) { return; }
        this.visited.add(node.id);

        // 1. Visit Children First (Bottom-Up recursion)
        node.children.forEach(child => this.visit(child));
        if (node.failureNode) { this.visit(node.failureNode); }
        node.branches?.forEach(branch => branch.forEach(n => this.visit(n)));

        // 2. Calculate My Base Size
        switch (node.type) {
            case 'START':
                node.viewState.w = C.START_NODE_WIDTH;
                node.viewState.h = C.START_NODE_HEIGHT;
                break;
            case 'END':
                node.viewState.w = C.END_NODE_DIAMETER;
                node.viewState.h = C.END_NODE_DIAMETER;
                break;
            case 'RETRY':
                node.viewState.w = C.RETRY_NODE_DIAMETER;
                node.viewState.h = C.RETRY_NODE_DIAMETER;
                break;
            case 'PORTAL':
                node.viewState.w = C.NODE_WIDTH;
                node.viewState.h = C.NODE_HEIGHT;
                break;
            case 'CONDITION':
                node.viewState.w = C.DIAMOND_SIZE;
                node.viewState.h = C.DIAMOND_SIZE;
                break;
            case 'STEP':
            default:
                // Auto-width based on text length (approximate)
                const textWidth = node.label.length * C.PX_PER_CHAR;
                node.viewState.w = Math.max(C.NODE_WIDTH, textWidth + C.PADDING);
                node.viewState.h = C.NODE_HEIGHT;
                break;
        }

        // 3. Calculate Subtree Dimensions (For Container sizing)
        // In vertical layout: main flow goes DOWN, failure goes RIGHT, branches stack HORIZONTALLY

        let childrenHeight = 0;
        let childrenWidth = 0;

        // Logic for Stacked Branches (Condition Node) - stack horizontally in vertical mode
        if (node.branches && node.branches.length > 0) {
            node.branches.forEach(branch => {
                // Height of a branch is the vertical sequence length
                const branchH = branch.reduce((acc, n) => acc + n.viewState.h + C.NODE_GAP_Y_Vertical, 0);
                const branchW = Math.max(...branch.map(n => n.viewState.w)); // simplistic

                childrenHeight = Math.max(childrenHeight, branchH);           //find the tallest branch path
                childrenWidth += branchW + C.NODE_GAP_X_Vertical;                      //get the full width of all the branches
            });
        }
        // Logic for Linear Children (Bottom flow in vertical layout)
        else if (node.children.length > 0) {
            // Stack children horizontally to support multiple branches if needed
            const totalW = node.children.reduce((acc, c) => acc + c.viewState.subtreeW, 0);
            const gaps = (node.children.length - 1) * C.NODE_GAP_X_Vertical;
            childrenWidth = totalW + gaps;

            // Height is max of children subtree heights (plus gap to get to them)
            const maxChildSubtreeH = Math.max(...node.children.map(c => c.viewState.subtreeH));
            childrenHeight = C.NODE_GAP_Y_Vertical + maxChildSubtreeH;
        }

        let bottomFlowWidth = childrenWidth;
        let myColumnWidth = node.viewState.w;

        // If failure node exists (Right side), it adds to width
        if (node.failureNode) {
            myColumnWidth += C.NODE_GAP_X_Vertical + node.failureNode.viewState.subtreeW;
        }

        node.viewState.subtreeW = Math.max(myColumnWidth, bottomFlowWidth);
        node.viewState.subtreeH = node.viewState.h + childrenHeight;
    }
}