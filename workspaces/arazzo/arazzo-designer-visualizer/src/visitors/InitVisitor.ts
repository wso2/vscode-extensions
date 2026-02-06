import { ArazzoWorkflow, StepObject, SuccessActionObject, FailureActionObject, ReusableObject } from '@wso2/arazzo-designer-core';
import { FlowNode, ViewState } from '../utils/types';

export class InitVisitor {
    // Map to hold singleton instances of all steps to allow referencing
    private stepNodeMap: Map<string, FlowNode> = new Map();

    public buildTree(workflow: ArazzoWorkflow): FlowNode {          //returns the root node
        // 1. Initialize all STEP nodes first (Pass 1). each iteration creates and empty shell FlowNode with the basic info for each step
        workflow.steps.forEach((step: StepObject) => {
            const node = this.createNode(step.stepId, 'STEP', step.stepId, step);
            this.stepNodeMap.set(step.stepId, node);
        });

        // 2. Create Virtual Start Node and connect to first step
        const startNode = this.createNode('virtual_start', 'START', 'Start');
        if (workflow.steps.length > 0) {
            const firstStep = this.stepNodeMap.get(workflow.steps[0].stepId);
            if (firstStep) {
                startNode.children.push(firstStep);         //append the first step to the start node children
            }
        } else {
            // Empty workflow
            startNode.children.push(this.createNode('virtual_end_empty', 'END', 'End'));
        }

        // 3. Link Nodes (Pass 2) - Iterate to define connections
        workflow.steps.forEach((step: StepObject, index: number) => {
            const currentNode = this.stepNodeMap.get(step.stepId)!;     //retieve the FlowNode object we created for that node from the map

            // --- Success Path (Right Handle) ---
            if (step.onSuccess && step.onSuccess.length > 0) {
                // Scenario A: Success actions defined
                // We ALWAYS create a condition node if onSuccess exists
                const conditionNode = this.createNode(`cond_success_${step.stepId}`, 'CONDITION', 'Success', { count: step.onSuccess.length });
                currentNode.children.push(conditionNode);

                // 1. Separate the items based on their type
                const gotoItems = step.onSuccess.filter((item: any) => item.type === 'goto');
                const endItems = step.onSuccess.filter((item: any) => item.type === 'end');

                // 2. Combine them: Goto/Ref items first, End items last
                const orderedSuccessItems = [...gotoItems, ...endItems];
                // Map branches. branches is of type Flownode[][] with the outer array for different paths. right now only the next step is contained in each branch so can use FLowNode[] also. but later we may need to store multiple steps in a branch here
                conditionNode.branches = orderedSuccessItems.map((actionItem: SuccessActionObject | ReusableObject, i: number) => {
                    // Check for reference
                    const refItem = actionItem as any;
                    if (refItem.reference) {
                        return [this.createNode(`ref_${step.stepId}_${i}`, 'END', 'Ref?')];         //need to implement this part later
                    }

                    const action = actionItem as SuccessActionObject;
                    if (action.type === 'end') {
                        return [this.createNode(`end_success_${step.stepId}_${i}`, 'END', 'End')];
                    }

                    // goto
                    const targetId = action.stepId; //|| action.name;
                    if (targetId && this.stepNodeMap.has(targetId)) {
                        return [this.stepNodeMap.get(targetId)!];
                    }
                    return [this.createNode(`missing_${targetId}`, 'END', `Missing: ${targetId}`)];     //need to handlel what happens when a stepID is not in the steps list
                });

            }
            // Scenario C: No onSuccess defined (Fallthrough)
            else {
                const nextStep = workflow.steps[index + 1];
                if (nextStep) {
                    const nextNode = this.stepNodeMap.get(nextStep.stepId);
                    if (nextNode) {
                        currentNode.children.push(nextNode); // Connect directly to next step
                    }
                } else {
                    currentNode.children.push(this.createNode(`end_default_${step.stepId}`, 'END', 'End'));
                }
            }

            // --- Failure Path (Bottom Handle) ---
            if (step.onFailure && step.onFailure.length > 0) {
                // Explicit Failure Handling -> Create Condition Node
                const failCond = this.createNode(`cond_fail_${step.stepId}`, 'CONDITION', 'On Failure', { count: step.onFailure.length });
                currentNode.failureNode = failCond;     //if onFailure exists, create a condition node and assign it to failureNode

                // 1. Separate the items based on their type
                const gotoItems = step.onFailure.filter((item: any) => item.type === 'goto');
                const retryItems = step.onFailure.filter((item: any) => item.type === 'retry');
                const endItems = step.onFailure.filter((item: any) => item.type === 'end');

                // 2. Combine them: Goto/Ref items first, End items last
                const orderedFailureItems = [...gotoItems, ...retryItems, ...endItems];
                failCond.branches = orderedFailureItems.map((actionItem: FailureActionObject | ReusableObject, i: number) => {
                    const refItem = actionItem as any;
                    if (refItem.reference) {
                        return [this.createNode(`fail_ref_${i}`, 'END', 'Ref')];        //need to implement this part later
                    }

                    const action = actionItem as FailureActionObject;
                    if (action.type === 'end') {
                        return [this.createNode(`end_fail_${step.stepId}_${i}`, 'END', 'Fail End')];
                    }
                    if (action.type === 'retry') {
                        // Determine retry target: explicit stepId or fallback to the current step (self-retry)
                        const targetId = (action as any).stepId || step.stepId;
                        return [this.createNode(`retry_fail_${step.stepId}_${i}`, 'RETRY', 'Retry', { gotoNodeId: targetId, gotoLabel: targetId })];
                    }
                    const targetId = action.stepId || action.name;
                    if (targetId && this.stepNodeMap.has(targetId)) {
                        return [this.stepNodeMap.get(targetId)!];
                    }
                    return [this.createNode(`fail_missing_${i}`, 'END', `Unknown: ${action.name}`)];        //need to handle what happens when a stepID is not in the steps list
                });
            } else {
                // Default Failure Handling -> Red Dashed Edge to Default End
                const defaultFailEnd = this.createNode(`end_fail_default_${step.stepId}`, 'END', 'Fail');
                currentNode.failureNode = defaultFailEnd;       //children is the success path and failureNode is the failure path
            }
        });

        return startNode;
    }

    private createNode(id: string, type: any, label: string, data?: any): FlowNode {
        return {
            id, type, label, data,
            children: [],
            viewState: {
                x: 0, y: 0, w: 0, h: 0,
                subtreeW: 0, subtreeH: 0,
                // Initialize recursive container props
                //containerW: 0, containerH: 0,
                topH: 0, bottomH: 0
            }
        };
    }
}