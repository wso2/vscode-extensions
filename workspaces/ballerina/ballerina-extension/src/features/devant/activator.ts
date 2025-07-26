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

import { BI_COMMANDS, DIRECTORY_MAP, EVENT_TYPE, MACHINE_VIEW, SCOPE, findScopeByModule } from "@wso2/ballerina-core";
import {
    CommandIds as PlatformCommandIds,
    IWso2PlatformExtensionAPI,
    ICommitAndPuhCmdParams,
    ICreateComponentCmdParams,
} from "@wso2/wso2-platform-core";
import { BallerinaExtension } from "../../core";
import { openView, StateMachine } from "../../stateMachine";
import { commands, extensions, window } from "vscode";
import { debug } from "../../utils";

export function activateDevantFeatures(_ballerinaExtInstance: BallerinaExtension) {
    const cloudToken = process.env.CLOUD_STS_TOKEN;
    if (cloudToken) {
        // Set the connection token context
        commands.executeCommand("setContext", "devant.editor", true);
    }

    commands.registerCommand(BI_COMMANDS.DEVANT_PUSH_TO_CLOUD, handleComponentPushToDevant);
}

const handleComponentPushToDevant = async () => {
    const projectRoot = StateMachine.context().projectUri;
    if (!projectRoot) {
        return;
    }

    const platformExt = extensions.getExtension("wso2.wso2-platform");
    if (!platformExt) {
        return;
    }
    if (!platformExt.isActive) {
        await platformExt.activate();
    }
    const platformExtAPI: IWso2PlatformExtensionAPI = platformExt.exports;
    debug(`project url: ${projectRoot}`);
    if (platformExtAPI.getDirectoryComponents(projectRoot)?.length) {
        // push changes to repo if component for the directory already exists
        const hasChanges = await platformExtAPI.localRepoHasChanges(projectRoot);
        if (!hasChanges) {
            window.showInformationMessage("There are no new changes to push to cloud");
            return;
        }
        await commands.executeCommand(PlatformCommandIds.CommitAndPushToGit, {
            componentPath: projectRoot,
        } as ICommitAndPuhCmdParams);
    } else {
        // create a new component if it doesn't exist for the directory
        if (!StateMachine.context().projectStructure) {
            return;
        }

        const services = StateMachine.context().projectStructure.directoryMap[DIRECTORY_MAP.SERVICE];
        const automation = StateMachine.context().projectStructure.directoryMap[DIRECTORY_MAP.AUTOMATION];

        const scopeSet = new Set<SCOPE>();

        if (services) {
            services.find((svc) => {
                const scope = findScopeByModule(svc?.moduleName);
                if (scope) {
                    scopeSet.add(scope);
                }
            });
        }

        if (automation?.length > 0) {
            scopeSet.add(SCOPE.AUTOMATION);
        }

        let integrationType: SCOPE;

        if (scopeSet.size === 0) {
            window
                .showInformationMessage(
                    "Please add a construct and try again to deploy your integration",
                    "Add Construct"
                )
                .then((resp) => {
                    if (resp === "Add Construct") {
                        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.BIComponentView });
                    }
                });
            return;
        } else if (scopeSet.size === 1) {
            integrationType = [...scopeSet][0];
        } else {
            const selectedScope = await window.showQuickPick([...scopeSet], {
                placeHolder: "Multiple types of artifacts detected. Please select the artifact type to be deployed",
            });
            integrationType = selectedScope as SCOPE;
        }

        const deployementParams: ICreateComponentCmdParams = {
            integrationType: integrationType as any,
            buildPackLang: "ballerina",
            componentDir: StateMachine.context().projectUri,
            extName: "Devant",
        };
        commands.executeCommand(PlatformCommandIds.CreateNewComponent, deployementParams);
    }
};
