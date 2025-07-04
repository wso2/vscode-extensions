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
import { History } from "@wso2/mi-core";
import { getStateMachine, refreshUI } from "../stateMachine";
import { Uri, workspace } from "vscode";

export let history: History;

export function activate() {
    history = new History();
}

export function removeFromHistory(fileUri: string, identifier?: string) {
    const projectUri = workspace.getWorkspaceFolder(Uri.file(fileUri))?.uri.fsPath;
    if (!projectUri) {
        return;
    }
    const historyStack = history.get();
    const newHistory = historyStack.filter((location) => {
        if (identifier !== undefined) {
            return !(location.location?.documentUri === fileUri && location.location?.identifier === identifier);
        }
        return location.location?.documentUri !== fileUri;
    });
    history.clear();
    newHistory.forEach((location) => {
        history.push(location);
    });

    const stateMachine = getStateMachine(projectUri);
    const context = stateMachine.context();
    if (context.documentUri === fileUri && (identifier !== undefined ? context.identifier?.toString() === identifier.toString() : true)) {
        refreshUI(projectUri);
    }
}
