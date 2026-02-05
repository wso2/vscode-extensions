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

import { NodeTypes } from '@xyflow/react';

// Export all node types
export * from './BaseNode';
export * from './StepNode';
export * from './StartNode';
export * from './EndNode';
export * from './ConditionNode';
export * from './RetryNode';
export * from './PortalNode';

// Import widgets
import { StepNodeWidget } from './StepNode';
import { StartNodeWidget } from './StartNode';
import { EndNodeWidget } from './EndNode';
import { ConditionNodeWidget } from './ConditionNode';
import { RetryNodeWidget } from './RetryNode';
import { PortalNodeWidget } from './PortalNode';

/**
 * Node types registry for React Flow.
 * Maps node type strings to their respective Widget components.
 */
export const nodeTypes: NodeTypes = {
    stepNode: StepNodeWidget,
    startNode: StartNodeWidget,
    endNode: EndNodeWidget,
    conditionNode: ConditionNodeWidget,
    retryNode: RetryNodeWidget,
    portalNode: PortalNodeWidget,
};

// Debug: Verify node types are loaded
console.log('[nodeTypes] Registered node types:', Object.keys(nodeTypes));
