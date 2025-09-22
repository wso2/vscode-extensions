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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import {
    getMigrationTools,
    importIntegration,
    ImportIntegrationRPCRequest,
    migrateProject,
    MigrateRequest,
    MigrationToolPullRequest,
    openMigrationReport,
    OpenMigrationReportRequest,
    pullMigrationTool,
    saveMigrationReport,
    SaveMigrationReportRequest
} from "@wso2/ballerina-core";
import { Messenger } from "vscode-messenger";
import { MigrateIntegrationRpcManager } from "./rpc-manager";

export function registerMigrateIntegrationRpcHandlers(messenger: Messenger) {
    const rpcManger = new MigrateIntegrationRpcManager();
    messenger.onRequest(getMigrationTools, () => rpcManger.getMigrationTools());
    messenger.onNotification(pullMigrationTool, (args: MigrationToolPullRequest) => rpcManger.pullMigrationTool(args));
    messenger.onRequest(importIntegration, (args: ImportIntegrationRPCRequest) => rpcManger.importIntegration(args));
    messenger.onNotification(openMigrationReport, (args: OpenMigrationReportRequest) => rpcManger.openMigrationReport(args));
    messenger.onNotification(saveMigrationReport, (args: SaveMigrationReportRequest) => rpcManger.saveMigrationReport(args));
    messenger.onNotification(migrateProject, (args: MigrateRequest) => rpcManger.migrateProject(args));
}
