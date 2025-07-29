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

import vscode from 'vscode';
import { BallerinaExtension, ExtendedLangClient } from '../../core';
import { activateCopilotLoginCommand, resetBIAuth } from './completions';
import { addConfigFile, getConfigFilePath } from './utils';
import { StateMachine } from "../../stateMachine";
import { CONFIGURE_DEFAULT_MODEL_COMMAND, DEFAULT_PROVIDER_ADDED, LOGIN_REQUIRED_WARNING_FOR_DEFAULT_MODEL, OPEN_AI_PANEL_COMMAND, SIGN_IN_BI_COPILOT } from './constants';
import { REFRESH_TOKEN_NOT_AVAILABLE_ERROR_MESSAGE, TOKEN_REFRESH_ONLY_SUPPORTED_FOR_BI_INTEL } from '../..//utils/ai/auth';
import { AIStateMachine } from '../../views/ai-panel/aiMachine';
import { AIMachineEventType } from '@wso2/ballerina-core';

export let langClient: ExtendedLangClient;

export function activateAIFeatures(ballerinaExternalInstance: BallerinaExtension) {
    langClient = <ExtendedLangClient>ballerinaExternalInstance.langClient;
    activateCopilotLoginCommand();
    resetBIAuth();

    const projectPath = StateMachine.context().projectUri;

    vscode.commands.registerCommand(CONFIGURE_DEFAULT_MODEL_COMMAND, async (...args: any[]) => {
        const configPath = await getConfigFilePath(ballerinaExternalInstance, projectPath);
        if (configPath !== null) {
            try {
                const result = await addConfigFile(configPath);
                if (result) {
                    vscode.window.showInformationMessage(DEFAULT_PROVIDER_ADDED);
                }
            } catch (error) {
                if ((error as Error).message === REFRESH_TOKEN_NOT_AVAILABLE_ERROR_MESSAGE || (error as Error).message === TOKEN_REFRESH_ONLY_SUPPORTED_FOR_BI_INTEL) {
                    vscode.window.showWarningMessage(LOGIN_REQUIRED_WARNING_FOR_DEFAULT_MODEL, SIGN_IN_BI_COPILOT).then(selection => {
                        if (selection === SIGN_IN_BI_COPILOT) {
                            AIStateMachine.service().send(AIMachineEventType.LOGIN);
                        }
                    });
                } else {
                    vscode.window.showErrorMessage((error as Error).message);
                }
            }
        }
    });
}


