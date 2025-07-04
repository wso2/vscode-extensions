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
export const OBJECT_OUTPUT_TARGET_PORT_PREFIX = "objectOutput";
export const ARRAY_OUTPUT_TARGET_PORT_PREFIX = "arrayOutput";
export const UNION_OUTPUT_TARGET_PORT_PREFIX = "unionOutput";
export const PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX = "primitiveOutput";
export const FOCUSED_INPUT_SOURCE_PORT_PREFIX = "focusedInput";
export const SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX = "subMappingInput";
export const OBJECT_OUTPUT_FIELD_ADDER_TARGET_PORT_PREFIX = "objectOutputFieldAdder";
export const ARRAY_FILTER_NODE_PREFIX = "arrayFilter";

export const defaultModelOptions = { zoom: 90 };
export const VISUALIZER_PADDING = 0;
export const IO_NODE_DEFAULT_WIDTH = 350;
export const IO_NODE_HEADER_HEIGHT = 40;
export const IO_NODE_FIELD_HEIGHT = 35;
export const ARRAY_FILTER_NODE_HEADER_HEIGHT = 40;
export const ARRAY_FILTER_NODE_ELEMENT_HEIGHT = 35;
export const ADD_ARRAY_FILTER_BUTTON_HEIGHT = 30;
export const ARRAY_FILTER_SEPARATOR_HEIGHT = 2;
export const GAP_BETWEEN_INPUT_NODES = 10;
export const GAP_BETWEEN_FILTER_NODE_AND_INPUT_NODE = 50;
export const GAP_BETWEEN_NODE_HEADER_AND_BODY = 10;
export const GAP_BETWEEN_FIELDS = 1;

export const OFFSETS = {
    SOURCE_NODE: {
        X: 1,
        Y: 0,
    },
    TARGET_NODE: {
        X: (window.innerWidth -VISUALIZER_PADDING)*(100/defaultModelOptions.zoom)-IO_NODE_DEFAULT_WIDTH,
        Y: 0
    },
    TARGET_NODE_WITHOUT_MAPPING: {
        X: 650,
    },
    LINK_CONNECTOR_NODE: {
        X: 750
    },
    LINK_CONNECTOR_NODE_WITH_ERROR: {
        X: 718
    },
    ARRAY_FN_CONNECTOR_NODE: {
        X: 750
    },
    INTERMEDIATE_CLAUSE_HEIGHT: 80
}

export const DATA_MAPPER_DOC_VERSION = "latest";
export const DATA_MAPPER_DOC_URL = `https://mi.docs.wso2.com/en/${DATA_MAPPER_DOC_VERSION}/reference/mediators/data-mapper-mediator/`;
export const DATA_MAPPER_ARRAY_MAPPING_DOC_URL = `${DATA_MAPPER_DOC_URL}#array-mappings`;
