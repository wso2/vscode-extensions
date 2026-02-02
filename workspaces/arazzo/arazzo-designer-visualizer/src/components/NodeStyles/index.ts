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

import { ConditionNode } from './ConditionNode';
import { StartNode } from './StartNode';
import { EndNode } from './EndNode';
import { RetryNode } from './RetryNode';
import { StepNode } from './StepNode';
import { PortalNode } from './PortalNode';

export { ConditionNode } from './ConditionNode';
export { StartNode } from './StartNode';
export { EndNode } from './EndNode';
export { RetryNode } from './RetryNode';
export { StepNode } from './StepNode';
export { PortalNode } from './PortalNode';

// Export node types registry for React Flow
export const nodeTypes = {
    condition: ConditionNode,
    start: StartNode,
    end: EndNode,
    retry: RetryNode,
    stepNode: StepNode,
    portal: PortalNode
};
