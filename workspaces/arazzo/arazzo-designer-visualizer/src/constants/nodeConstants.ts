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

//node related constants
export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 50;
export const LABEL_CHARS_BEFORE_WRAP = 24;
export const START_NODE_DIAMETER = 50;
export const END_NODE_DIAMETER = 30;
export const RETRY_NODE_DIAMETER = 35;
export const DIAMOND_SIZE = 65; // Width/Height of condition node
export const PX_PER_CHAR = 10;  // Approximate width per character for auto-sizing

export const LABEL_HEIGHT = 20;
export const LABEL_WIDTH = 180;
export const NODE_BORDER_WIDTH = 1.8;
export const NODE_PADDING = 8;
export const DIAGRAM_CENTER_X = 0;
export const END_NODE_INNER_DIAMETER = 15;
export const PADDING = 20;


// Horizontal layout constants (main flow goes right, branches go down)
export const NODE_GAP_X_Horizontal = 70;  // Horizontal gap between steps
export const NODE_GAP_Y_Horizontal = 80;  // Vertical gap between branches/failure paths
export const FAIL_GAP_Y_Horizontal = 50;  // Vertical gap for failure paths
//export const FAIL_GAP_X_Horizontal = 50;  // Horizontal gap for failure paths

// Vertical layout constants (main flow goes down, branches go right)
export const NODE_GAP_X_Vertical = 60;  // Horizontal gap between steps
export const NODE_GAP_Y_Vertical = 70;  // Vertical gap between branches/failure paths
//export const FAIL_GAP_Y_Vertical = 50;  // Vertical gap for failure paths
export const FAIL_GAP_X_Vertical = 50;  // Horizontal gap for failure paths
export const NODE_GAP_Y_AFTERCONDITION = 100; // Vertical gap between node and edge label


//portal node constants
export const PORTALNODE_GAP_X = 35;
export const PORTALNODE_GAP_Y = 40;

//Waypoint realted constants
export const WAYPOINT_SKIP_VERTICAL_OFFSET = 30; // Distance to offset waypoints from node edges
export const WAYPOINT_SKIP_HORIZONTAL_OFFSET_MULTIPLIER = 1.5;