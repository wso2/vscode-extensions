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

import * as vscode from 'vscode';
import { extension } from './biExtentionContext';
import { StateMachine } from './stateMachine';

export function activate(context: vscode.ExtensionContext) {
	const ballerinaExt = vscode.extensions.getExtension('wso2.ballerina');
	if (ballerinaExt) {
		extension.context = context;
		extension.langClient = ballerinaExt.exports.ballerinaExtInstance.langClient;
		extension.biSupported = ballerinaExt.exports.ballerinaExtInstance.biSupported;
		extension.isNPSupported = ballerinaExt.exports.ballerinaExtInstance.isNPSupported;
		extension.projectPath = ballerinaExt.exports.projectPath;
		StateMachine.initialize();
		return;
	}
	vscode.window.showErrorMessage('Ballerina extension is required to operate WSO2 Integrator: BI extension effectively. Please install it from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=wso2.ballerina).');
}

export function deactivate() { }
