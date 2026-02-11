import { FlowNode } from '../utils/types';
import * as C from '../constants/nodeConstants';

export class PositionVisitorHorizontal {
    private visited = new Set<string>();        //to denote the nodes that are already fully visited(the node and all its children are taken care of)
    private positioned = new Set<string>();     //the node is positioned but not its children

    public visit(node: FlowNode, x: number, y: number, isImmediateCondition: boolean = false, isFailure: boolean = false): void {
        // Skip already fully-visited nodes (gotos/loops)
        if (this.visited.has(node.id)) { return; }

        // Position the node if not already positioned
        if (!this.positioned.has(node.id)) {
            node.viewState.x = x;
            node.viewState.y = y;
            this.positioned.add(node.id);
            
            // If this is immediate condition positioning pass, stop here
            if (isImmediateCondition) {
                return;
            }
        }

        // Mark as fully visited (position + children processed)
        this.visited.add(node.id);

        // Use the node's stored position for calculating children positions
        const nodeX = node.viewState.x;
        const nodeY = node.viewState.y;

        // 1. Position Right-Side Children (Main Flow)
        if (node.children.length > 0) {
            let childX = nodeX + node.viewState.w + C.NODE_GAP_X_Horizontal;

            // Check for collision with failure node subtree
            if (node.failureNode) {
                const child = node.children[0];
                const failureExtendsRight = node.failureNode.viewState.subtreeW > (node.viewState.w + C.NODE_GAP_X_Horizontal);
                const childExtendsDown = child.viewState.subtreeH > (node.viewState.h + C.FAIL_GAP_Y_Horizontal);

                // If both extend into each other's space, push child further right
                if (failureExtendsRight && childExtendsDown) {
                    childX = nodeX + node.failureNode.viewState.subtreeW + C.NODE_GAP_X_Horizontal;
                }
            }

            if (node.children.length === 1) {       //single child case. this is the use case currently
                const child = node.children[0];
                // Keep single child aligned with parent center
                const childY = nodeY + (node.viewState.h / 2) - (child.viewState.h / 2);
                if (!this.visited.has(child.id)) {
                    this.visit(child, childX, childY);
                }
            } else { //this case is not triggered as alwats there is only one child in the main flow. but keeping the logic for future use
                // Calculate total stack height to center it relative to parent
                const totalH = node.children.reduce((acc, c) => acc + c.viewState.subtreeH, 0) + (node.children.length - 1) * C.NODE_GAP_Y_Horizontal;
                // Start Y: Parent Center - Half Stack Height
                let currentY = nodeY + (node.viewState.h / 2) - (totalH / 2);

                node.children.forEach(child => {
                    if (!this.visited.has(child.id)) {
                        // Determine child's specific Y (centered in its own subtree height slice)
                        const childY = currentY + (child.viewState.subtreeH / 2) - (child.viewState.h / 2);

                        this.visit(child, childX, childY);

                        // Move down for next child
                        currentY += child.viewState.subtreeH + C.NODE_GAP_Y_Horizontal;
                    }
                });
            }
        }

        // 2. Position Failure Node (Bottom)
        if (node.failureNode && !this.visited.has(node.failureNode.id)) {
            // Center the failure node horizontally relative to the parent
            const failX = nodeX + (node.viewState.w / 2) - (node.failureNode.viewState.w / 2);
            let failpathgap = C.FAIL_GAP_Y_Horizontal;
            if (node.failureNode.type === 'CONDITION') {
                failpathgap = C.NODE_GAP_Y_Horizontal;
            }
            const failY = nodeY + node.viewState.h + failpathgap;
            this.visit(node.failureNode, failX, failY, false, true);
        }

        // 3. Position Branches (Stacked Vertical for Diamonds). this is only for the condition nodes
        if (node.branches && node.branches.length > 0) {
            const childX = nodeX + node.viewState.w + C.NODE_GAP_X_Horizontal;

            // Compute initial Y using the first *unpositioned* branch head so
            // already-positioned heads don't bias the alignment. If none found,
            // fall back to nodeY.
            let currentY: number;
            
            const firstUnpositionedBranch = node.branches.find(b => {
                const h = b[0];
                return h && !this.visited.has(h.id) && !this.positioned.has(h.id);
            });

            if (firstUnpositionedBranch && firstUnpositionedBranch[0]) {
                const firstHead = firstUnpositionedBranch[0];
                currentY = nodeY + (node.viewState.h / 2) - (firstHead.viewState.h / 2);
            } else {
                currentY = nodeY;
            }

            // First pass: Calculate Y positions for all branch heads to reserve vertical space
            const branchPositions: { head: FlowNode, y: number }[] = [];
            node.branches.forEach((branch, index, allBranches) => {
                const head = branch[0];

                if(!isFailure){     //if the condition node is not a failure path condition node then there must always be a step on that level. if its a failure path condition node then the paths are one below the other
                    if (head && !this.visited.has(head.id) && !this.positioned.has(head.id)) {

                        branchPositions.push({ head, y: currentY });

                        // Look ahead to the next branch's head to decide the gap
                        const nextBranch = allBranches[index + 1];
                        const nextHead = nextBranch ? nextBranch[0] : null;

                        if (nextHead && nextHead.type === 'END') {
                            // Optimization: If the NEXT node is an END node, we assume we don't need 
                            // the full subtree clearance from the current node.
                            currentY += C.NODE_GAP_Y_Horizontal; 
                        } else {
                            // Default: Next is a Step (or doesn't exist), so reserve the full subtree height
                            currentY += head.viewState.subtreeH + C.NODE_GAP_Y_Horizontal;
                        }
                    }
                } else {
                    branchPositions.push({ head, y: currentY });

                    // Look ahead to the next branch's head to decide the gap
                    const nextBranch = allBranches[index + 1];
                    const nextHead = nextBranch ? nextBranch[0] : null;
                    if (nextHead && (nextHead.type === 'END' || nextHead.type === 'RETRY')) {
                        // Optimization: If the NEXT node is an END node, we assume we don't need 
                        // the full subtree clearance from the current node.
                        currentY += C.NODE_GAP_Y_Horizontal; 
                    } else {
                        // Default: Next is a Step (or doesn't exist), so reserve the full subtree height
                        currentY += head.viewState.subtreeH + C.NODE_GAP_Y_Horizontal;
                    }
                }
            });

            // Second pass: Position each branch head only (mark as positioned)
            branchPositions.forEach(({ head, y }) => {
                this.visit(head, childX, y, true);
            });

            // Third pass: Process children of each branch head
            branchPositions.forEach(({ head, y }) => {
                this.visit(head, childX, y);
            });
        }
    }
}