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
    PROJECT_EXPLORER: "ArazzoDesigner.project-explorer",
    PROJECT_EXPLORER_REFRESH: "ArazzoDesigner.project-explorer.refresh",
    OPEN_WELCOME: "ArazzoDesigner.openAPIDesigner",
    CREATE_OPENAPI_FILE: "ArazzoDesigner.createOpenAPIFile",
    CREATE_ARAZZO_FILE: "ArazzoDesigner.createArazzoFile",
    SHOW_CODE: "ArazzoDesigner.showCode",
    // LSP Code Lens commands
    ARAZZO_VISUALIZE: "arazzo.visualize",
    ARAZZO_OPEN_DESIGNER: "arazzo.openDesigner"
};

export const CONTEXT_KEYS = {
    IS_FILE_OPENAPI: "isFileOpenAPI",
    IS_FILE_ARAZZO: "isFileArazzo",
    IS_VIEW_OPENAPI: "isViewOpenAPI",
    IS_VIEW_ARAZZO: "isViewArazzo"
};
