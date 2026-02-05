import { FlowNode } from '../utils/types';
import * as C from '../constants/nodeConstants';

export class PositionVisitorVertical {
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

        // 1. Position Bottom Children (Main Flow - vertical instead of horizontal)
        if (node.children.length > 0) {
            let childY = nodeY + node.viewState.h + C.NODE_GAP_Y_Vertical;

            // Check for collision with failure node subtree
            if (node.failureNode) {
                const child = node.children[0];
                const failureExtendsDown = node.failureNode.viewState.subtreeH > (node.viewState.h + C.NODE_GAP_Y_Vertical);
                const childExtendsRight = child.viewState.subtreeW > (node.viewState.w + C.FAIL_GAP_X_Vertical);

                // If both extend into each other's space, push child further down
                if (failureExtendsDown && childExtendsRight) {
                    childY = nodeY + node.failureNode.viewState.subtreeH + C.NODE_GAP_Y_Vertical;
                }
            }

            if (node.children.length === 1) {       //single child case. this is the use case currently
                const child = node.children[0];
                // Keep single child aligned with parent center (horizontally now)
                const childX = nodeX + (node.viewState.w / 2) - (child.viewState.w / 2);
                if (!this.visited.has(child.id)) {
                    this.visit(child, childX, childY);
                }
            } else {
                // Calculate total stack width to center it relative to parent
                const totalW = node.children.reduce((acc, c) => acc + c.viewState.subtreeW, 0) + (node.children.length - 1) * C.NODE_GAP_X_Vertical;

                // Start X: Parent Center - Half Stack Width
                let currentX = nodeX + (node.viewState.w / 2) - (totalW / 2);

                node.children.forEach(child => {
                    if (!this.visited.has(child.id)) {
                        // Determine child's specific X (centered in its own subtree width slice)
                        const childX = currentX + (child.viewState.subtreeW / 2) - (child.viewState.w / 2);

                        this.visit(child, childX, childY);

                        // Move right for next child
                        currentX += child.viewState.subtreeW + C.NODE_GAP_X_Vertical;
                    }
                });
            }
        }

        // 2. Position Failure Node (Right side instead of bottom)
        if (node.failureNode && !this.visited.has(node.failureNode.id)) {
            // Center the failure node vertically relative to the parent
            const failY = nodeY + (node.viewState.h / 2) - (node.failureNode.viewState.h / 2);
            let failpathgap = C.FAIL_GAP_X_Vertical;
            if (node.failureNode.type === 'CONDITION') {
                failpathgap = C.NODE_GAP_X_Vertical;
            }
            const failX = nodeX + node.viewState.w + failpathgap;
            this.visit(node.failureNode, failX, failY, false, true);
        }

        // 3. Position Branches (Stacked Horizontal for Diamonds). this is only for the condition nodes
        if (node.branches && node.branches.length > 0) {
            const childY = nodeY + node.viewState.h + C.NODE_GAP_Y_Vertical;

            // Compute initial X using the first *unpositioned* branch head so
            // already-positioned heads don't bias the alignment. If none found,
            // fall back to nodeX.
            let currentX: number;
            const firstUnpositioned = node.branches.find(b => {
                const h = b[0];
                return h && !this.visited.has(h.id) && !this.positioned.has(h.id);
            });

            if (firstUnpositioned && firstUnpositioned[0]) {
                const firstHead = firstUnpositioned[0];
                currentX = nodeX + (node.viewState.w / 2) - (firstHead.viewState.w / 2);
            } else {
                currentX = nodeX;
            }

            // First pass: Calculate X positions for all branch heads to reserve horizontal space
            const branchPositions: { head: FlowNode, x: number }[] = [];
            node.branches.forEach((branch, index, allBranches) => {
                const head = branch[0];
                if(!isFailure){     //if the condition node is not a failure path condition node then there must always be a step on that level. if its a failure path condition node then the paths are one below the other
                    if (head && !this.visited.has(head.id) && !this.positioned.has(head.id)) {
                        
                        branchPositions.push({ head, x: currentX });
                        // Reserve horizontal space based on subtree width
                        //currentX += head.viewState.subtreeW + C.NODE_GAP_X;

                        // Look ahead to the next branch's head to decide the gap
                        const nextBranch = allBranches[index + 1];
                        const nextHead = nextBranch ? nextBranch[0] : null;

                        if (nextHead && nextHead.type === 'END') {
                            // Optimization: If the NEXT node is an END node, we assume we don't need 
                            // the full subtree clearance from the current node.
                            currentX += C.NODE_GAP_X_Vertical + head.viewState.w + C.FAIL_GAP_X_Vertical; 
                        } else {
                            // Default: Next is a Step (or doesn't exist), so reserve the full subtree height
                            currentX += head.viewState.subtreeW + C.NODE_GAP_X_Vertical;
                        }
                    }
                } else {
                    branchPositions.push({ head, x: currentX });
                    // Reserve horizontal space based on subtree width
                    //currentX += head.viewState.subtreeW + C.NODE_GAP_X;
                    // Look ahead to the next branch's head to decide the gap
                    const nextBranch = allBranches[index + 1];
                    const nextHead = nextBranch ? nextBranch[0] : null;
                    if (nextHead && (nextHead.type === 'END' || nextHead.type === 'RETRY')) {
                        // Optimization: If the NEXT node is an END node, we assume we don't need 
                        // the full subtree clearance from the current node.
                        currentX += C.NODE_GAP_X_Vertical + head.viewState.w; 
                    } else {
                        // Default: Next is a Step (or doesn't exist), so reserve the full subtree height
                        currentX += head.viewState.subtreeW + C.NODE_GAP_X_Vertical;
                    }
                }
            });

            // Second pass: Position each branch head only (mark as positioned)
            branchPositions.forEach(({ head, x }) => {
                this.visit(head, x, childY, true);
            });

            // Third pass: Process children of each branch head
            branchPositions.forEach(({ head, x }) => {
                this.visit(head, x, childY);
            });
        }
    }
}
