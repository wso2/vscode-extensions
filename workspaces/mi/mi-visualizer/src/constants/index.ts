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

//add the rpc client to the context

export const MI_COPILOT_BACKEND_URL = `/chat/copilot`;
export const MI_ARTIFACT_GENERATION_BACKEND_URL = `/chat/artifact-generation`;
export const MI_ARTIFACT_EDIT_BACKEND_URL = `/chat/artifact-editing`;
export const MI_SUGGESTIVE_QUESTIONS_INITIAL_BACKEND_URL = `/suggestions/initial`;
export const MI_SUGGESTIVE_QUESTIONS_BACKEND_URL = `/suggestions`;
export const MI_UNIT_TEST_GENERATION_BACKEND_URL = `/unit-test/generate`;

// MI Copilot Error Messages
export const COPILOT_ERROR_MESSAGES = {
    BAD_REQUEST: 'Bad Request',
    UNAUTHORIZED: 'Unauthorized',
    FORBIDDEN: 'Forbidden',
    NOT_FOUND: 'Not Found',
    TOKEN_COUNT_EXCEEDED: 'Token Count Exceeded',
    ERROR_422: "Something went wrong. Please clear the chat and try again.",
};

// MI Copilot maximum allowed file size
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // Default to 5MB

// Default Editor Info
export const TAB_SIZE = 4; // 4 spaces

// Syntax Tree Kinds
export const SYNTAX_TREE_KIND = {
    SEQUENCE: "sequence",
    PROXY: "proxy",
} as const;

// Diagram view
export const SIDE_PANEL_WIDTH = 450;

export const gitIssueUrl = "https://github.com/wso2/mi-vscode/issues";

// Actions for service designer
export const ARTIFACT_TEMPLATES = {
    ADD_API: "add-api",
    EDIT_API: "edit-api",
    ADD_RESOURCE: "add-resource",
    EDIT_RESOURCE: "edit-resource",
    EDIT_SEQUENCE: "edit-sequence",
    EDIT_HANDLERS: "edit-handlers",
    EDIT_PROXY: "edit-proxy",
} as const;

export const DSS_TEMPLATES = {
    ADD_RESOURCE: "add-dss-resource",
    EDIT_RESOURCE: "edit-dss-resource",
    ADD_OPERATION: "add-dss-operation",
    EDIT_OPERATION: "edit-dss-operation",
    EDIT_DESCRIPTION: "edit-dss-description",
    ADD_QUERY: "add-dss-query",
} as const;

export enum EndpointTypes {
    DEFAULT_ENDPOINT = "DEFAULT_ENDPOINT",
    ADDRESS_ENDPOINT = "ADDRESS_ENDPOINT",
    HTTP_ENDPOINT = "HTTP_ENDPOINT",
    WSDL_ENDPOINT = "WSDL_ENDPOINT",
    LOAD_BALANCE_ENDPOINT = "LOAD_BALANCE_ENDPOINT",
    FAILOVER_ENDPOINT = "FAILOVER_ENDPOINT",
    TEMPLATE_ENDPOINT = "TEMPLATE_ENDPOINT",
    RECIPIENT_ENDPOINT = "RECIPIENT_ENDPOINT",
};

export enum TemplateTypes {
    DEFAULT_ENDPOINT = "DEFAULT_ENDPOINT",
    ADDRESS_ENDPOINT = "ADDRESS_ENDPOINT",
    HTTP_ENDPOINT = "HTTP_ENDPOINT",
    WSDL_ENDPOINT = "WSDL_ENDPOINT",
    SEQUENCE_ENDPOINT = "SEQUENCE"
};

export enum MessageProcessorTypes {
    MESSAGE_SAMPLING = "MESSAGE_SAMPLING",
    SCHEDULED_MESSAGE_FORWARDING = "SCHEDULED_MESSAGE_FORWARDING",
    SCHEDULED_FAILOVER_MESSAGE_FORWARDING = "SCHEDULED_FAILOVER_MESSAGE_FORWARDING",
    CUSTOM = "CUSTOM"
};

export enum MessageStoreTypes {
    IN_MEMORY = "IN_MEMORY",
    CUSTOM = "CUSTOM",
    JMS = "JMS",
    RABBITMQ = "RABBITMQ",
    WSO2_MB = "WSO2_MB",
    RESEQUENCE = "RESEQUENCE",
    JDBC = "JDBC"
};

export enum InboundEndpointTypes {
    CXF_WS_RM = "CXF_WS_RM",
    FILE = "FILE",
    HL7 = "HL7",
    JMS = "JMS",
    MQTT = "MQTT",
    WS = "WS",
    FEED = "Feed",
    HTTPS = "HTTPS",
    HTTP = "HTTP",
    KAFKA = "KAFKA",
    WSS = "WSS",
    CUSTOM = "CUSTOM",
    RABBITMQ = "rabbit-mq"
};

export const connectorFailoverIconUrl = "https://mi-connectors.wso2.com/icons/wordpress.gif";
export const RUNTIME_VERSION_440 = "4.4.0";

export const DATASOURCE = {
    TYPE: {
        RDBMS: "driverClassName",
        CARBON_DATASOURCE: "carbon_datasource_name"
    },
    PROPERTY: {
        CLASS_NAME: "driverClassName",
        DB_URL: "url",
        USERNAME: "username",
        PASSWORD: "password"
    }
}
