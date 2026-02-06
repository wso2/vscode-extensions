/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ArazzoWorkflow, StepObject, SuccessActionObject, FailureActionObject, ReusableObject } from '@wso2/arazzo-designer-core';
import { FlowNode, ViewState } from '../utils/types';

/**
 * InitVisitor V2: Optimized workflow tree builder for vertical layout.
 * 
 * Key Changes from V1:
 * 1. NO Implicit End Nodes: If onFailure is undefined, leave failureNode as undefined
 * 2. Condition Node Optimization: Only create condition nodes when >1 paths exist
 * 3. Single-path optimization: Directly attach the single target as child
 */
export class InitVisitor_v2 {
    private stepNodeMap: Map<string, FlowNode> = new Map();

    public buildTree(workflow: ArazzoWorkflow): FlowNode {
        // Pass 1: Initialize all STEP nodes
        workflow.steps.forEach((step: StepObject) => {
            const node = this.createNode(step.stepId, 'STEP', step.stepId, step);
            this.stepNodeMap.set(step.stepId, node);
        });

        // Create Virtual Start Node
        const startNode = this.createNode('virtual_start', 'START', 'Start');
        if (workflow.steps.length > 0) {
            const firstStep = this.stepNodeMap.get(workflow.steps[0].stepId);
            if (firstStep) {
                startNode.children.push(firstStep);
            }
        } else {
            // Empty workflow
            startNode.children.push(this.createNode('virtual_end_empty', 'END', 'End'));
        }

        // Pass 2: Link Nodes with optimized logic
        workflow.steps.forEach((step: StepObject, index: number) => {
            const currentNode = this.stepNodeMap.get(step.stepId)!;

            // --- SUCCESS PATH HANDLING ---
            if (step.onSuccess && step.onSuccess.length > 0) {
                const successTargets = this.resolveTargets(step.onSuccess, step.stepId, 'success');

                if (successTargets.length === 1) {
                    // OPTIMIZATION: Single target - attach directly (no condition node)
                    currentNode.children.push(successTargets[0]);
                } else if (successTargets.length > 1) {
                    // Multiple targets - create condition node
                    const conditionNode = this.createNode(
                        `cond_success_${step.stepId}`, 
                        'CONDITION', 
                        'Success', 
                        { count: successTargets.length }
                    );
                    currentNode.children.push(conditionNode);
                    conditionNode.branches = successTargets.map(target => [target]);
                }
                // If no valid targets (shouldn't happen), fall through to default
            } else {
                // NO onSuccess defined - Default Fallthrough
                const nextStep = workflow.steps[index + 1];
                if (nextStep) {
                    const nextNode = this.stepNodeMap.get(nextStep.stepId);
                    if (nextNode) {
                        currentNode.children.push(nextNode);
                    }
                } else {
                    // Last step with no onSuccess - add implicit end
                    currentNode.children.push(this.createNode(`end_default_${step.stepId}`, 'END', 'End'));
                }
            }

            // --- FAILURE PATH HANDLING ---
            if (step.onFailure && step.onFailure.length > 0) {
                const failureTargets = this.resolveTargets(step.onFailure, step.stepId, 'failure');

                if (failureTargets.length === 1) {
                    // OPTIMIZATION: Single target - attach directly (no condition node)
                    currentNode.failureNode = failureTargets[0];
                } else if (failureTargets.length > 1) {
                    // Multiple targets - create condition node
                    const failCond = this.createNode(
                        `cond_fail_${step.stepId}`, 
                        'CONDITION', 
                        'On Failure', 
                        { count: failureTargets.length }
                    );
                    currentNode.failureNode = failCond;
                    failCond.branches = failureTargets.map(target => [target]);
                }
            }
            // V2 CHANGE: NO implicit End node when onFailure is undefined/empty
            // Leave failureNode as undefined to represent "no explicit failure handling"
        });

        return startNode;
    }

    /**
     * Resolve a list of action objects into FlowNode targets.
     * Handles: goto, end, retry, and reference actions.
     */
    private resolveTargets(
        actions: (SuccessActionObject | FailureActionObject | ReusableObject)[], 
        currentStepId: string,
        pathType: 'success' | 'failure'
    ): FlowNode[] {
        const targets: FlowNode[] = [];

        // Separate and order: goto/retry first, then end
        const gotoActions = actions.filter((a: any) => a.type === 'goto');
        const retryActions = actions.filter((a: any) => a.type === 'retry');
        const endActions = actions.filter((a: any) => a.type === 'end');
        const refActions = actions.filter((a: any) => a.reference);

        const orderedActions = [...gotoActions, ...retryActions, ...endActions, ...refActions];

        orderedActions.forEach((action: any, index: number) => {
            // Handle reference (placeholder for future implementation)
            if (action.reference) {
                targets.push(this.createNode(
                    `${pathType}_ref_${currentStepId}_${index}`, 
                    'END', 
                    'Ref?'
                ));
                return;
            }

            // Handle 'end' action
            if (action.type === 'end') {
                targets.push(this.createNode(
                    `end_${pathType}_${currentStepId}_${index}`, 
                    'END', 
                    pathType === 'failure' ? 'Fail End' : 'End'
                ));
                return;
            }

            // Handle 'retry' action
            if (action.type === 'retry') {
                const targetId = action.stepId || currentStepId; // Default to self-retry
                targets.push(this.createNode(
                    `retry_${pathType}_${currentStepId}_${index}`, 
                    'RETRY', 
                    'Retry', 
                    { gotoNodeId: targetId, gotoLabel: targetId }
                ));
                return;
            }

            // Handle 'goto' action
            if (action.type === 'goto') {
                const targetId = action.stepId || action.name;
                if (targetId && this.stepNodeMap.has(targetId)) {
                    targets.push(this.stepNodeMap.get(targetId)!);
                } else {
                    targets.push(this.createNode(
                        `missing_${targetId}`, 
                        'END', 
                        `Missing: ${targetId}`
                    ));
                }
                return;
            }
        });

        return targets;
    }

    private createNode(id: string, type: any, label: string, data?: any): FlowNode {
        return {
            id, 
            type, 
            label, 
            data,
            children: [],
            viewState: {
                x: 0, y: 0, w: 0, h: 0,
                subtreeW: 0, subtreeH: 0,
                containerW: 0, containerH: 0,
                topH: 0, bottomH: 0
            }
        };
    }
}
