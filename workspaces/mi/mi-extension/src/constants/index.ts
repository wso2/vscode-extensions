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

export const COMMANDS = {
    OPEN_PROJECT: "MI.openProject",
    MIGRATE_PROJECT: "MI.migrateProject",
    SHOW_OVERVIEW: "MI.showOverview",
    DISABLE_OVERVIEW: "MI.disableOverview",
    OPEN_AI_PANEL: "MI.openAiPanel",
    CLEAR_AI_PROMPT: "MI.clearAIPrompt",
    OPEN_WELCOME: "MI.openWelcome",
    SHOW_GRAPHICAL_VIEW: "MI.show.graphical-view",
    SHOW_RESOURCE_VIEW: "MI.show.resource-view",
    SHOW_SEQUENCE_VIEW: "MI.show.sequence-view",
    SHOW_SEQUENCE_TEMPLATE_VIEW: "MI.show.sequence_template-view",
    SHOW_PROXY_VIEW: "MI.show.proxy-view",
    SHOW_TASK: "MI.show.task",
    SHOW_TASK_VIEW: "MI.show.task-view",
    SHOW_INBOUND_ENDPOINT: "MI.show.inbound-endpoint",
    SHOW_SOURCE: "MI.show.source",
    SHOW_XML: "MI.show.xml",
    SHOW_MESSAGE_PROCESSOR: "MI.show.message-processor",
    SHOW_MESSAGE_STORE: "MI.show.message-store",
    SHOW_LOCAL_ENTRY: "MI.show.local-entry",
    SHOW_CONNECTION: "MI.show.connection",
    SHOW_TEMPLATE: "MI.show.template",
    SHOW_ENDPOINT: "MI.show.endpoint",
    SHOW_DEFAULT_ENDPOINT: "MI.show.default-endpoint",
    SHOW_ADDRESS_ENDPOINT: "MI.show.address-endpoint",
    SHOW_HTTP_ENDPOINT: "MI.show.http-endpoint",
    SHOW_WSDL_ENDPOINT: "MI.show.wsdl-endpoint",
    SHOW_LOAD_BALANCE_ENDPOINT: "MI.show.load-balance-endpoint",
    SHOW_FAILOVER_ENDPOINT: "MI.show.failover-endpoint",
    SHOW_TEMPLATE_ENDPOINT: "MI.show.template-endpoint",
    SHOW_RECIPIENT_ENDPOINT: "MI.show.recipient-endpoint",
    SHOW_DATA_SERVICE: "MI.show.data-service",
    OPEN_DSS_SERVICE_DESIGNER: "MI.project-explorer.open-dss-service-designer",
    ADD_MEDIATOR: "MI.addMediator",
    REFRESH_COMMAND: 'MI.project-explorer.refresh',
    WI_PROJECT_EXPLORER_VIEW_REFRESH: 'wso2-integrator.explorer.refresh',
    ADD_COMMAND: 'MI.project-explorer.add',
    ADD_ARTIFACT_COMMAND: 'MI.project-explorer.add.artifact',
    ADD_API_COMMAND: 'MI.project-explorer.add-api',
    ADD_RESOURCE_COMMAND: 'MI.project-explorer.add-resource',
    ADD_ENDPOINT_COMMAND: 'MI.project-explorer.add-endpoint',
    ADD_SEQUENCE_COMMAND: 'MI.project-explorer.add-sequence',
    MARK_SEQUENCE_AS_DEFAULT: 'MI.project-explorer.markAsDefaultSequence',
    UNMARK_SEQUENCE_AS_DEFAULT: 'MI.project-explorer.unmarkAsDefaultSequence',
    ADD_DATAMAPPER_COMMAND: 'MI.project-explorer.add-datamapper',
    ADD_INBOUND_ENDPOINT_COMMAND: 'MI.project-explorer.add-inbound-endpoint',
    ADD_PROXY_SERVICE_COMMAND: 'MI.project-explorer.add-proxy-service',
    ADD_TASK_COMMAND: 'MI.project-explorer.add-task',
    ADD_LOCAL_ENTRY_COMMAND: 'MI.project-explorer.add-local-entry',
    ADD_CONNECTION_COMMAND: 'MI.project-explorer.add-connection',
    ADD_MESSAGE_PROCESSOR_COMMAND: 'MI.project-explorer.add-message-processor',
    ADD_MESSAGE_STORE_COMMAND: 'MI.project-explorer.add-message-store',
    ADD_TEMPLATE_COMMAND: 'MI.project-explorer.add-template',
    ADD_DATA_SERVICE_COMMAND: 'MI.project-explorer.add-data-service',
    CREATE_PROJECT_COMMAND: 'MI.project-explorer.create-project',
    REVEAL_ITEM_COMMAND: 'MI.project-explorer.revealItem',
    OPEN_SERVICE_DESIGNER: 'MI.project-explorer.open-service-designer',
    OPEN_PROJECT_OVERVIEW: 'MI.project-explorer.open-project-overview',
    ADD_REGISTERY_RESOURCE_COMMAND: 'MI.project-explorer.add-registry-resource',
    EDIT_REGISTERY_RESOURCE_COMMAND: 'MI.project-explorer.edit-reg-resource',
    EDIT_REGISTRY_RESOURCE_METADATA_COMMAND: 'MI.registry-explorer.edit-reg-metadata',
    ADD_CLASS_MEDIATOR_COMMAND: 'MI.project-explorer.add-class-mediator',
    EDIT_CLASS_MEDIATOR_COMMAND: 'MI.project-explorer.edit-class-mediator',
    ADD_BALLERINA_MODULE_COMMAND: 'MI.project-explorer.add-ballerina-module',
    EDIT_BALLERINA_MODULE_COMMAND: 'MI.project-explorer.edit-ballerina-module',
    DELETE_PROJECT_EXPLORER_ITEM: 'MI.project-explorer.delete',
    CHANGE_SERVER_PATH: 'MI.change.server',
    CHANGE_JAVA_HOME: 'MI.change.java',
    BUILD_PROJECT: 'MI.build-project',
    REMOTE_DEPLOY_PROJECT: 'MI.remote-deploy-project',
    CREATE_DOCKER_IMAGE: 'MI.create-docker-image',
    BUILD_AND_RUN_PROJECT: 'MI.build-and-run',
    TERMINATE_SERVER: 'MI.terminate-server',
    BUILD_BAL_MODULE: 'MI.build-bal-module',
    ADD_DATA_SOURCE_COMMAND: 'MI.project-explorer.add-data-source',
    SHOW_DATA_SOURCE: 'MI.show.data-source',
    SHOW_DATA_MAPPER: 'MI.show.data-mapper',
    SHOW_IDP_SCHEMA: 'MI.show.idp-schema',
    ADD_TEST_SUITE: 'MI.test.add.suite',
    GEN_AI_TESTS: 'MI.test.gen.ai-test',
    EDIT_TEST_SUITE: 'MI.test.edit.suite',
    ADD_TEST_CASE: 'MI.test.add.case',
    EDIT_TEST_CASE: 'MI.test.edit.case',
    DELETE_TEST_CASE: 'MI.test.delete.case',
    DELETE_TEST_SUITE: 'MI.test.delete.suite',
    ADD_MOCK_SERVICE: 'MI.test.add.mock-service',
    REFRESH_MOCK_SERVICES: 'MI.test.refresh.mock-services',
    EDIT_MOCK_SERVICE: 'MI.test.edit.mock-service',
    DELETE_MOCK_SERVICE: 'MI.test.delete.mock-service',
    OPEN_RUNTIME_VIEW: 'MI.Open-runtime-service-view',
    REVEAL_TEST_PANE: 'MI.mock-services.focus',
    EDIT_K8_CONFIGURATION_COMMAND: 'MI.edit-k8-configuration',
    MANAGE_REGISTRY_PROPERTIES_COMMAND: 'MI.manage-registry-property',

    BI_EXTENSION: 'WSO2.ballerina-integrator',
    BI_OPEN_COMMAND: 'ballerina.open.bi.welcome',
    INSTALL_EXTENSION_COMMAND: 'workbench.extensions.installExtension'
};

export const MVN_COMMANDS = {
    MVN_WRAPPER_COMMAND: "./mvnw",
    MVN_WRAPPER_WIN_COMMAND: ".\\mvnw.cmd",
    DEPLOY_COMMAND: " clean deploy -Dmaven.deploy.skip=true -Dmaven.car.deploy.skip=false -Dstyle.color=never",
    BUILD_COMMAND: " clean install -Dstyle.color=never",
    DOCKER_COMMAND: " clean install -P docker",
    COMPILE_COMMAND: " compile -Dstyle.color=never",
    TEST_COMMAND: " test -DtestServerType=remote",
    GEN_POM_COMMAND: "help:effective-pom",
}

export const DEFAULT_PROJECT_VERSION = "1.0.0";

export const READONLY_MAPPING_FUNCTION_NAME = "mapFunction";

export const REFRESH_ENABLED_DOCUMENTS = ["xml", "SynapseXml", "typescript", "markdown", "json"];

export enum EndpointTypes {
    DEFAULT_ENDPOINT = "DEFAULT_ENDPOINT",
    ADDRESS_ENDPOINT = "ADDRESS_ENDPOINT",
    HTTP_ENDPOINT = "HTTP_ENDPOINT",
    WSDL_ENDPOINT = "WSDL_ENDPOINT",
    LOAD_BALANCE_ENDPOINT = "LOAD_BALANCE_ENDPOINT",
    FAILOVER_ENDPOINT = "FAIL_OVER_ENDPOINT",
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

export * from "./swagger";

export const APIS = {
    MI_CONNECTOR_STORE: process.env.MI_CONNECTOR_STORE as string,
    MI_CONNECTOR_STORE_BACKEND: process.env.MI_CONNECTOR_STORE_BACKEND as string,
    MI_CONNECTOR_STORE_BACKEND_SEARCH: process.env.MI_CONNECTOR_STORE_BACKEND_SEARCH as string,
}

export const DM_OPERATORS_FILE_NAME = "dm-utils";
export const DM_OPERATORS_IMPORT_NAME = "dmUtils";
export const LAST_EXPORTED_CAR_PATH = "last-exported-car-path";
export const RUNTIME_VERSION_440 = "4.4.0";
export const RUNTIME_VERSION_450 = "4.5.0";
export const DEFAULT_ICON = "https://mi-connectors.wso2.com/icons/wordpress.gif";

export const ERROR_MESSAGES = {
    ERROR_DOWNLOADING_MODULES: "Unable to download the default modules. These modules can be added after project creation. Do you wish to skip them now and proceed with the project creation?",
};

export const WI_EXTENSION_ID = 'wso2.wso2-integrator';
export const WI_PROJECT_EXPLORER_VIEW_ID = 'wso2-integrator.explorer';
export const MI_PROJECT_EXPLORER_VIEW_ID = 'MI.project-explorer';
export const MI_RUNTIME_SERVICES_PANEL_ID = 'micro-integrator.runtime-services-panel';
