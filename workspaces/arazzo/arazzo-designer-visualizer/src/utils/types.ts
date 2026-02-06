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

import { StepObject } from '@wso2/arazzo-designer-core';

// The source of truth for layout calculations
export interface ViewState {
    x: number;
    y: number;
    w: number; // Actual width of the node
    h: number; // Actual height of the node

    // For recursive layout strategy (Container Model)
    //containerW: number; // Full width of node + children
    //containerH: number; // Full height of node + children

    // Distances from the connection point (vertical center of the node entry)
    // to the top and bottom boundaries of the container
    topH: number;
    bottomH: number;

    // Legacy fields (can be removed later if unused, keeping for safety)
    subtreeW: number;
    subtreeH: number;
}

// Wrapper types to build our Tree
export type FlowNodeType = 'START' | 'END' | 'STEP' | 'CONDITION' | 'PORTAL' | 'FAILURE_HANDLER' | 'RETRY';

export interface FlowNode {     //this is the actual node that we see on the canvas. it is implemented as an interface
    id: string;
    type: FlowNodeType;
    label: string;

    // Link back to original data (for Properties Panel)
    data?: StepObject;

    // Layout Data
    viewState: ViewState;

    // Children logic
    children: FlowNode[]; // For sequential flow (Right side)
    branches?: FlowNode[][]; // For parallel/conditional flow (Stacked vertically)
    failureNode?: FlowNode; // Specific child for "OnFailure" (Bottom side)
}

export interface BaseVisitor {
    visit(node: FlowNode): void;
}
