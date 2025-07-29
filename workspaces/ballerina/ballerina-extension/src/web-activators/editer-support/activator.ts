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

import { languages } from "vscode";
import { ExecutorCodeLensProvider } from "./code-lens-provider";
import { BallerinaExtension } from "../../core/extension";
import { LANGUAGE } from "../../core/extension";
import { WEB_IDE_SCHEME } from "../fs/activateFs";

export function activateEditorSupport(ballerinaExtInstance: BallerinaExtension) {
    if (!ballerinaExtInstance.context || !ballerinaExtInstance.langClient) {
        return;
    }

    // Register code lens provider
    languages.registerCodeLensProvider(
        [{ language: LANGUAGE.BALLERINA, scheme: WEB_IDE_SCHEME }],
        new ExecutorCodeLensProvider(ballerinaExtInstance)
    );
}
