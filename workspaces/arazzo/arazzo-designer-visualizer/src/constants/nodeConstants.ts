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
export const RETRY_NODE_DIAMETER = 25;
export const DIAMOND_SIZE = 50; // Width/Height of condition node
export const PX_PER_CHAR = 10;  // Approximate width per character for auto-sizing
export const START_NODE_WIDTH = 80;
export const START_NODE_HEIGHT = 40;
export const CONDITION_NODE_BORDER_RADIUS = 8; // Border radius for condition nodes

export const LABEL_HEIGHT = 20;
export const LABEL_WIDTH = 180;
export const NODE_BORDER_WIDTH = 3;
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
export const NODE_GAP_X_Vertical = 80;  // Horizontal gap between steps
export const NODE_GAP_Y_Vertical = 55;  // Vertical gap between branches/failure paths
//export const FAIL_GAP_Y_Vertical = 50;  // Vertical gap for failure paths
export const FAIL_GAP_X_Vertical = 50;  // Horizontal gap for failure paths
export const RETRY_GAP_Y_ConditionBranch = 70; // Horizontal gap between condition node and its branches
export const NODE_GAP_Y_AFTERCONDITION = 150; // Vertical gap between node and edge label
export const CONDITION_NODE_SECOND_BRANCH_OFFSET = 0; // Vertical offset for 2nd branch of condition nodes


//portal node constants
export const PORTALNODE_GAP_X = 35;
export const PORTALNODE_GAP_Y = 40;

//Waypoint realted constants
export const WAYPOINT_SKIP_VERTICAL_OFFSET = 40; // Distance to offset waypoints from node edges
export const WAYPOINT_BRANCH_VERTICAL_OFFSET = 40; // Vertical offset for branch waypoints to avoid label overlap
export const WAYPOINT_SKIP_HORIZONTAL_OFFSET = NODE_GAP_X_Vertical/2;

//canvas constants
export const CANVAS_PADDING = 100;
export const DOT_SIZE = 1.5;
export const CANVAS_ZOOM = 1.25;
export const DOT_GAP = 18;

//label related constants
export const LABEL_OFFSET = 50; // fixed distance in pixels from the bend
export const CONDITION_CHARS_BEFORE_WRAP = 25; // Maximum characters before wrapping for condition labels

//export const LABEL_OFFSET_RANDOMNESS_MULTIPLIER = 0.2; // randomness in label positioning
export const FONT_SIZE = 15;
export const ICON_SIZE_STEP = 24;

// Edit mode control
export const isEditable = false; // Set to false to disable editing (dragging nodes, creating edges, etc.)