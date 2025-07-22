/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

export const VS_CODE_COMMANDS = {
    BUILD_AND_RUN: "SI.build-and-run",
    SHOW_SOURCE: "SI.show.source",
    SHOW_GRAPHICAL_VIEW: "SI.show.graphical-view",
    CHANGE_SERVER_PATH: "SI.change.server",
    CHANGE_JAVA_HOME: 'SI.change.java',
    OPEN_WELCOME: "SI.openWelcome",
    EVENT_SIMULATE: "SI.event.simulate",
    EXPORT_APP: "SI.export.app",
    EXPORT_TO_DOCKER: "SI.export.to.docker",
    EXTENSION_INSTALLER: "SI.extension.installer"
};

export const UI_COMMANDS = {
    NEED_DESIGN: "needDesign",
    SEND_DESIGN: "sendDesign",
    SUBMIT_DESIGN: "submitDesign",
    UPDATE_SIDDHI_APP_NAMES: "updateSiddhiAppNames",
    SINGLE_EVENT: "singleEvent",
    SIMULATION_ACTION: "simulationAction",
    RETRIEVE_SIDDHI_APP_NAMES: "retrieveSiddhiAppNames",
    RETRIEVE_STREAM_NAMES: "retrieveStreamNames",
    RETRIEVE_STEAM_ATTRIBUTES: "retrieveStreamAttributes",
    UPLOAD_SIMULATION:  "uploadSimulation",
    GET_FEED_SIMULATIONS: "getFeedSimulations",
    DELETE_SIMULATION: "deleteSimulation",
    UPDATE_SIMULATION: "updateSimulation",
    TEST_DATABASE_CONNECTIVITY: "testDatabaseConnectivity",
    RETRIEVE_TABLE_NAMES: "retrieveTableNames",
    RETRIEVE_COLUMN_NAMES: "retrieveColumnNames",
    UPLOAD_CSV_FILE: "uploadCSVFile",
    UPDATE_FILE: "updateFile",
    DELETE_FILE: "deleteFile",
    RETRIEVE_CSV_FILE_NAMES: "retrieveCSVFileNames",
    SEND_EXTENSION_STATUSES: "sendExtensionStatuses",
    DEPENDENCY_SHARING_EXTENSIONS: "getDependencySharingExtensions",
    INSTALL_DEPENDENCIES: "installDependencies",
    UNINSTALL_DEPENDENCIES: "uninstallDependencies"
}

export const UI_COMMAND_RESPONSES = {
    SINGLE_EVENT: "singleEventResponse",
    SIMULATION_ACTION: "simulationActionResponse",
    RETRIEVE_SIDDHI_APP_NAMES: "retrieveSiddhiAppNamesResponse",
    RETRIEVE_STREAM_NAMES: "retrieveStreamNamesResponse",
    RETRIEVE_STEAM_ATTRIBUTES: "retrieveStreamAttributesResponse",
    UPLOAD_SIMULATION:  "uploadSimulationResponse",
    GET_FEED_SIMULATIONS: "getFeedSimulationsResponse",
    DELETE_SIMULATION: "deleteSimulationResponse",
    UPDATE_SIMULATION: "updateSimulationResponse",
    TEST_DATABASE_CONNECTIVITY: "testDatabaseConnectivityResponse",
    RETRIEVE_TABLE_NAMES: "retrieveTableNamesResponse",
    RETRIEVE_COLUMN_NAMES: "retrieveColumnNamesResponse",
    UPLOAD_CSV_FILE: "uploadCSVFileResponse",
    UPDATE_FILE: "updateFileResponse",
    DELETE_FILE: "deleteFileResponse",
    RETRIEVE_CSV_FILE_NAMES: "retrieveCSVFileNamesResponse",
    DEPENDENCY_SHARING_EXTENSIONS: "getDependencySharingExtensionsResponse",
    INSTALL_DEPENDENCIES: "installDependenciesResponse",
    UNINSTALL_DEPENDENCIES: "uninstallDependenciesResponse"
}

export const DEFAULT_PROJECT_VERSION = "1.0.0";
export const WEBVIEW_ID = "siEditor";
export const WEBVIEW_TITLE = "WSO2 Integrator: SI Editor";

export const SIMULATOR_WEBVIEW_ID = "siSimulator";
export const SIMULATOR_WEBVIEW_TITLE = "WSO2 Integrator: SI Event Simulator";

export const EXTENSION_INSTALLER_WEBVIEW_ID = "siExtensionInstaller";
export const EXTENSION_INSTALLER_WEBVIEW_TITLE = "WSO2 Integrator: SI Extension Installer";

export const DEPLOY_WEBVIEW_ID = "siDeploy";
export const DEPLOY_WEBVIEW_TITLE = "Deploy";

export const SIDDHI_HOME_CONFIG = "siddhi.home";
export const JAVA_HOME_CONFIG = "siddhi.javaHome";

export const INVALID_SERVER_PATH_MSG = "Invalid WSO2 Integrator: SI path or Unsupported version. Please set a valid WSO2 Integrator: SI path";

export const LANGUAGE_CLIENT_ID = "streaming-integrator-vscode";
export const LANGUAGE_CLIENT_NAME = "SI_Language_Server_Client";

export const SERVER_CONFIG_KEY = "siServerConnections";
