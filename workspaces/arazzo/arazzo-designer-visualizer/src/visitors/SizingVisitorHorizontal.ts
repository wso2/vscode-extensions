import { FlowNode } from '../utils/types';
import * as C from '../constants/nodeConstants';

export class SizingVisitorHorizontal {
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
        // If I have a Diamond on my right, my total height depends on its branches

        let childrenHeight = 0;
        let childrenWidth = 0;

        // Logic for Stacked Branches (Condition Node)
        if (node.branches && node.branches.length > 0) {
            node.branches.forEach(branch => {
                // Width of a branch is the sequence length
                const branchW = branch.reduce((acc, n) => acc + n.viewState.w + C.NODE_GAP_X_Horizontal, 0);
                const branchH = Math.max(...branch.map(n => n.viewState.h)); // simplistic

                childrenWidth = Math.max(childrenWidth, branchW);           //find the widest branch path
                childrenHeight += branchH + C.NODE_GAP_Y_Horizontal;                   //get the full height of all the branches
            });
        }
        // Logic for Linear Children (Right side flow)
        else if (node.children.length > 0) {
            // Stack children vertically to support multiple branches if needed
            const totalH = node.children.reduce((acc, c) => acc + c.viewState.subtreeH, 0);
            const gaps = (node.children.length - 1) * C.NODE_GAP_Y_Horizontal;     //not needed right now as there is only 1 child per node
            childrenHeight = totalH + gaps;

            // Width is max of children subtree widths (plus gap to get to them)
            const maxChildSubtreeW = Math.max(...node.children.map(c => c.viewState.subtreeW));
            childrenWidth = C.NODE_GAP_X_Horizontal + maxChildSubtreeW;
        }

        let rightSideFlowHeight = childrenHeight;
        let myColumnHeight = node.viewState.h;

        // If failure node exists (Bottom), it adds to height
        if (node.failureNode) {
            myColumnHeight += C.NODE_GAP_Y_Horizontal + node.failureNode.viewState.subtreeH;
        }

        node.viewState.subtreeH = Math.max(myColumnHeight, rightSideFlowHeight);
        node.viewState.subtreeW = node.viewState.w + childrenWidth;
    }
}