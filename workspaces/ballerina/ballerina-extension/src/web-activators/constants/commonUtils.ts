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

import { MACHINE_VIEW } from "@wso2/ballerina-core";
import { commands, Uri, workspace } from "vscode";

export function setGoToSourceContext(view: MACHINE_VIEW) {
    switch (view) {
        case MACHINE_VIEW.Overview:
        // case MACHINE_VIEW.FunctionForm:
        case MACHINE_VIEW.AddConnectionWizard:
        case MACHINE_VIEW.ViewConfigVariables:
        // case MACHINE_VIEW.ServiceWizard:
        case MACHINE_VIEW.ERDiagram:
            commands.executeCommand("setContext", "showGoToSource", false);
            break;
        default:
            commands.executeCommand("setContext", "showGoToSource", true);
    }
}

// basepath/project/persist/model.bal
export function checkIsPersistModelFile(fileUri: Uri): boolean {
    const fileUriString = fileUri.toString();
    const uriParts = fileUriString.split("/");
    const parentProjectDir = fileUriString.substring(0, fileUriString.indexOf("/persist"));
    const workspaceFolder = workspace.workspaceFolders.find((f) => f.uri.toString() === parentProjectDir);
    console.log("checking persist: ", {
        "1": fileUriString,
        "2": uriParts,
        "3": uriParts[uriParts.length - 2],
        "4": workspaceFolder,
    });
    return uriParts[uriParts.length - 2] === "persist" && !!workspaceFolder;
}
