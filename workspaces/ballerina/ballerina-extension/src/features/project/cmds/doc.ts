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

import { ballerinaExtInstance, LANGUAGE } from "../../../core";
import { commands, window } from "vscode";
import { runCommand, BALLERINA_COMMANDS, MESSAGES, PROJECT_TYPE, PALETTE_COMMANDS } from "./cmd-runner";
import { getCurrentBallerinaProject } from "../../../utils/project-utils";

function activateDocCommand() {
    // register ballerina doc handler
    commands.registerCommand(PALETTE_COMMANDS.DOC, async () => {
        try {

            if (window.activeTextEditor && window.activeTextEditor.document.languageId != LANGUAGE.BALLERINA) {
                window.showErrorMessage(MESSAGES.NOT_IN_PROJECT);
                return;
            }

            const currentProject = await ballerinaExtInstance.getDocumentContext().isActiveDiagram() ? await
                getCurrentBallerinaProject(ballerinaExtInstance.getDocumentContext().getLatestDocument()?.toString())
                : await getCurrentBallerinaProject();
            if (currentProject.kind === PROJECT_TYPE.SINGLE_FILE) {
                window.showErrorMessage(MESSAGES.NOT_IN_PROJECT);
                return;
            }
            runCommand(currentProject, ballerinaExtInstance.getBallerinaCmd(), BALLERINA_COMMANDS.DOC,
                currentProject.path!);

        } catch (error) {
            if (error instanceof Error) {
                window.showErrorMessage(error.message);
            } else {
                window.showErrorMessage("Unkown error occurred.");
            }
        }
    });
}

export { activateDocCommand };
