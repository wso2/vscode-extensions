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

export enum DefaultColors {
    PRIMARY = "#5567D5",
    ON_PRIMARY = "#FFF",
    PRIMARY_CONTAINER = "#F0F1FB",

    SECONDARY = "#ffaf4d",
    ON_SECONDARY = "#FFF",
    SECONDARY_CONTAINER = "#fffaf2",

    SURFACE_BRIGHT = "#FFF",
    SURFACE = "#F7F8FB",
    SURFACE_DIM = "#CBCEDB",
    ON_SURFACE = "#000",
    ON_SURFACE_VARIANT = "#40404B",
    SURFACE_CONTAINER = "#cfd1f3",

    OUTLINE = "#393939",
    OUTLINE_VARIANT = "#a8a8a8",

    ERROR = "#ED2633",
    DEBUGGER_BREAKPOINT_BACKGROUND = "#ffcc004d",
}

export enum VSCodeColors {
    PRIMARY = "var(--vscode-progressBar-background)",
    ON_PRIMARY = "var(--vscode-button-foreground)",
    PRIMARY_CONTAINER = "var(--vscode-sideBar-background)",

    SECONDARY = "var(--vscode-editorLightBulb-foreground)",
    ON_SECONDARY = "var(--vscode-button-foreground)",
    SECONDARY_CONTAINER = "var(--vscode-sideBar-background)",
    SECONDARY_BUTTON = "var(--button-secondary-background)",
    SECONDARY_TEXT = "var(--vscode-list-deemphasizedForeground)",

    SURFACE_BRIGHT = "var(--vscode-editor-background)",
    SURFACE = "var(--vscode-sideBar-background)",
    SURFACE_DIM = "var(--vscode-activityBar-background)",
    ON_SURFACE = "var(--vscode-foreground)",
    ON_SURFACE_VARIANT = "var(--vscode-icon-foreground)",
    SURFACE_CONTAINER = "var(--vscode-editor-inactiveSelectionBackground)",

    CARD_BUTTON_BACKGROUND = "var(--vscode-editorWidget-background)",

    OUTLINE = "var(--vscode-sideBar-border)",
    OUTLINE_VARIANT = "var(--vscode-dropdown-border)",

    ERROR = "var(--vscode-errorForeground)",

    DELETE_ICON = "var(--vscode-minimap-errorHighlight)",

    INPUT_OPTION_ACTIVE = "var(--vscode-inputOption-activeBackground)",
    INPUT_OPTION_INACTIVE = "var(--vscode-inputOption-inactiveBackground)",
    INPUT_OPTION_HOVER = "var(--vscode-inputOption-hoverBackground)",
    INPUT_OPTION_ACTIVE_BORDER = "var(--vscode-inputOption-activeBorder)",

    WARNING = "var(--vscode-editorWarning-foreground)",

    BUTTON_HOVER = "var(--vscode-pickerGroup-border)",

    TILE_BACKGROUND = "var(--vscode-welcomePage-tileBackground)",
    TILE_HOVER_BACKGROUND = "var(--vscode-welcomePage-tileHoverBackground)",

    PRIMARY_BUTTON = "var(--vscode-button-background)",
    PRIMARY_ICON = "var(--vscode-button-foreground)",
    SECONDARY_BG_BUTTON = "var(--vscode-button-secondaryBackground)",
    SECONDARY_ICON = "var(--vscode-button-secondaryForeground)"
}

export const Colors = {
    PRIMARY: VSCodeColors.PRIMARY || DefaultColors.PRIMARY,
    ON_PRIMARY: VSCodeColors.ON_PRIMARY || DefaultColors.ON_PRIMARY,
    PRIMARY_CONTAINER:
        VSCodeColors.PRIMARY_CONTAINER || DefaultColors.PRIMARY_CONTAINER,

    SECONDARY: VSCodeColors.SECONDARY || DefaultColors.SECONDARY,
    ON_SECONDARY: VSCodeColors.ON_SECONDARY || DefaultColors.ON_SECONDARY,
    SECONDARY_CONTAINER:
        VSCodeColors.SECONDARY_CONTAINER || DefaultColors.SECONDARY_CONTAINER,
    SECONDARY_BUTTON: VSCodeColors.SECONDARY_BUTTON || DefaultColors.SECONDARY,

    SURFACE_BRIGHT: VSCodeColors.SURFACE_BRIGHT || DefaultColors.SURFACE_BRIGHT,
    SURFACE: VSCodeColors.SURFACE || DefaultColors.SURFACE,
    SURFACE_DIM: VSCodeColors.SURFACE_DIM || DefaultColors.SURFACE_DIM,
    ON_SURFACE: VSCodeColors.ON_SURFACE || DefaultColors.ON_SURFACE,
    ON_SURFACE_VARIANT:
        VSCodeColors.ON_SURFACE_VARIANT || DefaultColors.ON_SURFACE_VARIANT,
    SURFACE_CONTAINER:
        VSCodeColors.SURFACE_CONTAINER || DefaultColors.SURFACE_CONTAINER,

    CARD_BUTTON_BACKGROUND: VSCodeColors.CARD_BUTTON_BACKGROUND,

    OUTLINE: VSCodeColors.OUTLINE || DefaultColors.OUTLINE,
    OUTLINE_VARIANT:
        DefaultColors.OUTLINE_VARIANT,

    ERROR: VSCodeColors.ERROR || DefaultColors.ERROR,

    DELETE_ICON: VSCodeColors.DELETE_ICON,

    INPUT_OPTION_ACTIVE: VSCodeColors.INPUT_OPTION_ACTIVE,
    INPUT_OPTION_INACTIVE: VSCodeColors.INPUT_OPTION_INACTIVE,
    INPUT_OPTION_HOVER: VSCodeColors.INPUT_OPTION_HOVER,
    INPUT_OPTION_ACTIVE_BORDER: VSCodeColors.INPUT_OPTION_ACTIVE_BORDER,

    DEBUGGER_BREAKPOINT_BACKGROUND: DefaultColors.DEBUGGER_BREAKPOINT_BACKGROUND,
    WARNING: VSCodeColors.WARNING,

    SECONDARY_TEXT: VSCodeColors.SECONDARY_TEXT,

    BUTTON_HOVER: VSCodeColors.BUTTON_HOVER,

    TILE_BACKGROUND: VSCodeColors.TILE_BACKGROUND,
    TILE_HOVER_BACKGROUND: VSCodeColors.TILE_HOVER_BACKGROUND,
};

export const SIDE_PANEL_WIDTH = 450;
export const CANVAS_PADDING = 20;
export const MCP_TOOLS_LIST_MAX_HEIGHT_OFFSET = 480;

export const NODE_DIMENSIONS = {
    DEFAULT: {
        WIDTH: 150,
        HEIGHT: 60,
    },
    START: {
        EDITABLE: {
            WIDTH: 100,
            HEIGHT: 40,
        },
        DISABLED: {
            WIDTH: 24,
            HEIGHT: 24,
        },
        ACTIONED: {
            WIDTH: 65,
            HEIGHT: 30,
        }
    },
    CONDITION: {
        WIDTH: 65,
        HEIGHT: 65,
    },
    REFERENCE: {
        WIDTH: 150,
        HEIGHT: 60,
    },
    GROUP: {
        WIDTH: 150,
        HEIGHT: 60,
    },
    CALL: {
        WIDTH: 150,
        FULL_WIDTH: 150 + 110,
        HEIGHT: 60,
    },
    EMPTY: {
        WIDTH: 0,
        HEIGHT: 0,
        BRANCH: {
            WIDTH: 150,
            HEIGHT: 100,
        },
    },
    END: {
        WIDTH: 24,
        HEIGHT: 24,
    },
    PLUS: {
        WIDTH: 24,
        HEIGHT: 24,
    },
    CONNECTOR: {
        WIDTH: 150,
        HEIGHT: 60,
        CONNECTION_PART_WIDTH: 110,
        FULL_WIDTH: 150 + 110,
    },
    AI_AGENT: {
        WIDTH: 200,
        CONNECTION_PART_WIDTH: 135,
        FULL_WIDTH: 200 + 135,
    },
    DATA_SERVICE: {
        WIDTH: 150,
        HEIGHT: 60,
        GAP: 100
    },
    BORDER: 1,
};

export const NODE_GAP = {
    START_X: 0,
    START_Y: 40,
    END_Y: 40,
    X: 0,
    Y: 50,
    BRANCH_X: 50,
    BRANCH_TOP: 60,
    BRANCH_BOTTOM: 0,
    SEQUENCE_Y: 100,
    GROUP_NODE_START_Y: 50,
    GROUP_NODE_END_Y: 50,
    GROUP_NODE_HORIZONTAL_PADDING: 22,
    AI_AGENT_TOP: 65,
    AI_AGENT_BOTTOM: 10,
    AI_AGENT_TOOLS_Y: 20,
    CONNECTION_CIRCLE_Y: 20,
};

// MEDIATOR NAMES
export const MEDIATORS = {
    AGGREGATE: "Aggregate",
    CACHE: "Cache",
    CALL: "Call",
    CALLOUT: "Callout",
    CALLTEMPLATE: "Call-Template",
    CLONE: "Clone",
    DATAMAPPER: "DataMapper",
    DATASERVICECALL: "dataServiceCall",
    SCATTERGATHER: "Scatter-Gather",
    DROP: "Drop",
    ENRICH: "Enrich",
    ENTITLEMENT: "EntitlementService",
    FASTXSLT: "FastXSLT",
    FAULT: "MakeFault",
    FILTER: "Filter",
    FOREACHMEDIATOR: "Foreach",
    HEADER: "Header",
    ITERATE: "Iterate",
    JSONTRANSFORM: "JsonTransform",
    LOG: "Log",
    LOOPBACK: "Loopback",
    PAYLOAD: "Payloadfactory",
    PROPERTY: "Property",
    PROPERTYGROUP: "PropertyGroup",
    VARIABLE: "Variable",
    RESPOND: "Respond",
    REWRITE: "Rewrite",
    RULE: "brs:rule",
    SEND: "Send",
    SEQUENCE: "Sequence",
    RESOURCE: "Resource",
    SMOOKS: "Smooks",
    STORE: "Store",
    SWITCH: "Switch",
    THROTTLE: "Throttle",
    VALIDATE: "Validate",
    XQUERY: "XQuery",
    XSLT: "XSLT",
    BEAN: "Bean",
    CLASS: "Class",
    COMMAND: "Command",
    EJB: "EJB",
    SCRIPT: "Script",
    SPRING: "Spring",
    DBLOOKUP: "DBLookup",
    DBREPORT: "DBReport",
    ENQUEUE: "Enqueue",
    EVENT: "Event",
    TRANSACTION: "Transaction",
    CONDITIONALROUTER: "ConditionalRouter",
    BAM: "Bam",
    OAUTH: "oauthService",
    BUILDER: "syn:builder",
    PUBLISHEVENT: "PublishEvent",
    NTLM: "NTLM",
    THROWERROR: "ThrowError",
}

export const ENDPOINTS = {
    ADDRESS: "Address",
    DEFAULT: "Default",
    FAILOVER: "Failover",
    HTTP: "HTTP_ENDPOINT",
    LOADBALANCE: "Loadbalance",
    NAMED: "NAMED_ENDPOINT",
    RECIPIENTLIST: "Recipientlist",
    TEMPLATE: "Template",
    WSDL: "wsdl",
}

export const TOOLS = {
    MCP: "mcp",
}

export const DATA_SERVICE_NODES = {
    INPUT: "Input Mapping",
    QUERY: "Query",
    TRANSFORMATION: "Transformation",
    OUTPUT: "Output Mapping",
}

export enum NodeTypes {
    START_NODE = "start-node",
    END_NODE = "end-node",
    MEDIATOR_NODE = "mediator-node",
    REFERENCE_NODE = "reference-node",
    CONDITION_NODE = "condition-node",
    CONDITION_NODE_END = "condition-node-end",
    GROUP_NODE = "group-node",
    CALL_NODE = "call-node",
    PLUS_NODE = "plus-node",
    EMPTY_NODE = "empty-node",
    CONNECTOR_NODE = "connector-node",
    DATA_SERVICE_NODE = "data-service-node",
    AI_AGENT_NODE = "ai-agent-node",
}

export const NODE_LINK = "node-link";
export const NODE_PORT = "node-port";

export enum SequenceType {
    IN_SEQUENCE = "inSequence",
    OUT_SEQUENCE = "outSequence",
    FAULT_SEQUENCE = "faultSequence",
};

// Actions for service designer
export const SERVICE = {
    EDIT_RESOURCE: "edit-resource",
    EDIT_SEQUENCE: "edit-sequence",
    EDIT_PROXY: "edit-proxy",
}

export const ADD_NEW_SEQUENCE_TAG = "addNewSequence";
export const OPEN_SEQUENCE_VIEW = "Open Sequence View";
export const OPEN_DATA_MAPPER_VIEW = "Open Data Mapping";
export const OPEN_DSS_SERVICE_DESIGNER = "Open Service Designer";

export const DATA_SERVICE = {
    EDIT_QUERY: "edit-query",
    EDIT_RESOURCE_PARAMS: "edit-resource-params",
    EDIT_RESOURCE: "edit-resource",
    EDIT_SELF_CLOSE_RESOURCE: "edit-self-close-resource",
}

export const ERROR_MESSAGES = {
    ERROR_LOADING_MEDIATORS: "Error loading mediator data. Please try again.",
    ERROR_LOADING_TRYOUT: "Error loading tryout data. Please try again.",
    ERROR_TRYING_OUT_MEDIATOR: "Error trying out mediator. Please try again.",
    ERROR_LOADING_PROJECT_OVERVIEW: "Error loading project overview. Please try again.",
    ERROR_LOADING_PROJECT_STRUCTURE: "Error loading project structure. Please try again.",
    ERROR_LOADING_MODULES: "Error loading module data. Please try again."
}

export const REACT_JSON_THEME = {
    base00: "var(--webview-background)",
    base01: "var(--webview-background-secondary)",
    base02: "var(--webview-background-tertiary)",
    base03: "var(--webview-text-color)",
    base04: "var(--webview-accent-color)",
    base05: "var(--webview-text-color)",
    base06: "var(--webview-text-color)",
    base07: "var(--webview-text-color)",
    base08: "var(--webview-text-color)",
    base09: "var(--webview-highlight-color)",
    base0A: "var(--webview-highlight-color)",
    base0B: "var(--webview-highlight-color)",
    base0C: "var(--webview-highlight-color)",
    base0D: "var(--webview-highlight-color)",
    base0E: "var(--webview-highlight-color)",
    base0F: "var(--webview-highlight-color)"
};
export const DEFAULT_ICON = "https://mi-connectors.wso2.com/icons/wordpress.gif";
export const RUNTIME_VERSION_440 = "4.4.0";
