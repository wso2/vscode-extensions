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
import * as fs from 'fs';
import * as path from 'path';
import { StateMachine } from './stateMachine';
import { extension } from './APIDesignerExtensionContext';
import { activate as activateHistory } from './history';
import { activateVisualizer } from './visualizer/activate';
import { RPCLayer } from './RPCLayer';

export async function activate(context: vscode.ExtensionContext) {
	extension.context = context;

	// Initial check for the active document
	checkDocumentForOpenAPI(vscode.window.activeTextEditor?.document);

	// Add event listeners for document changes and focus
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(event => checkDocumentForOpenAPI(event.document)),
		vscode.window.onDidChangeActiveTextEditor(editor => checkDocumentForOpenAPI(editor?.document))
	);

	RPCLayer.init();
	activateHistory();
	activateVisualizer(context);
	StateMachine.initialize();

	// Register the createOpenAPIFile command
	let disposable = vscode.commands.registerCommand('APIDesigner.createOpenAPIFile', createOpenAPIFile);
	context.subscriptions.push(disposable);

	// Register the showCode command
	let showCodeDisposable = vscode.commands.registerCommand('APIDesigner.showCode', showCode);
	context.subscriptions.push(showCodeDisposable);
}


function checkDocumentForOpenAPI(document?: vscode.TextDocument) {
	if (!document) {
		vscode.commands.executeCommand('setContext', 'isFileOpenAPI', undefined);
		return;
	}

	// Check if the document is a webview or not a YAML file
	if (document.uri.scheme === 'webview' ||
		!(document.languageId === 'yaml' || document.fileName.endsWith('.yaml') || document.fileName.endsWith('.yml'))) {
		vscode.commands.executeCommand('setContext', 'isFileOpenAPI', undefined);
		return;
	}

	// At this point, we know it's a YAML file
	const firstFewLines = document.getText(new vscode.Range(0, 0, 10, 0));
	const isOpenAPI = /\bopenapi\s*:/i.test(firstFewLines);
	vscode.commands.executeCommand('setContext', 'isFileOpenAPI', isOpenAPI);
}



async function createOpenAPIFile() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		vscode.window.showErrorMessage('No workspace folder open');
		return;
	}

	// Ask for the file name
	const fileName = await vscode.window.showInputBox({
		prompt: 'Enter the name for your OpenAPI file',
		placeHolder: 'api.yaml'
	});

	if (!fileName) {
		return; // User cancelled the input
	}

	// Ask for the file location
	const fileLocation = await vscode.window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		openLabel: 'Select folder',
		defaultUri: workspaceFolders[0].uri
	});

	if (!fileLocation || fileLocation.length === 0) {
		return; // User cancelled the folder selection
	}

	const filePath = path.join(fileLocation[0].fsPath, fileName);

	const initialContent = `openapi: 3.0.0
info:
  title: Sample API
  description: A sample API to demonstrate OpenAPI
  version: 1.0.0
paths:
  /hello:
    get:
      summary: Returns a greeting
      responses:
        '200':
          description: A JSON object containing a greeting
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
`;

	try {
		fs.writeFileSync(filePath, initialContent, 'utf8');
		const openedDocument = await vscode.workspace.openTextDocument(filePath);
		await vscode.window.showTextDocument(openedDocument);
	} catch (error) {
		vscode.window.showErrorMessage(`Error creating OpenAPI file: ${error}`);
	}
}

async function showCode() {
	const documentUri = StateMachine.context().documentUri;
	if (documentUri) {
		await vscode.workspace.openTextDocument(documentUri).then(doc => vscode.window.showTextDocument(doc));
	}
}
