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
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { StateMachine, openView } from './stateMachine';
import { extension } from './Context';
import { activate as activateHistory } from './history';
import { activateVisualizer } from './visualizer/activate';
import { RPCLayer } from './RPCLayer';
import { EVENT_TYPE, MACHINE_VIEW } from '@wso2/arazzo-designer-core';

let languageClient: LanguageClient | undefined;

export function getLanguageClient(): LanguageClient | undefined {
	return languageClient;
}

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

	// Register the createArazzoFile command
	let createArazzoDisposable = vscode.commands.registerCommand('APIDesigner.createArazzoFile', createArazzoFile);
	context.subscriptions.push(createArazzoDisposable);

	// Register the showCode command
	let showCodeDisposable = vscode.commands.registerCommand('APIDesigner.showCode', showCode);
	context.subscriptions.push(showCodeDisposable);

	// Initialize Arazzo Language Server for procode features
	initializeLanguageServer(context);
}

function initializeLanguageServer(context: vscode.ExtensionContext) {
	console.log('Initializing Arazzo Language Server...');
	console.log('To view LSP logs: View > Output > Select "Arazzo Language Server" from dropdown');

	// Path to the language server binary (add .exe on Windows)
	const serverExecutable = process.platform === 'win32' ? 'arazzo-language-server.exe' : 'arazzo-language-server';
	const serverPath = path.join(context.extensionPath, 'ls', serverExecutable);

	// Check if the server binary exists
	if (!fs.existsSync(serverPath)) {
		console.error(`Language server binary not found at: ${serverPath}`);
		vscode.window.showWarningMessage('Arazzo Language Server binary not found. Procode features will be limited.');
		return;
	}

	// Server options - use the Go language server
	const serverOptions: ServerOptions = {
		command: serverPath,
		args: ['--debug'],
		transport: TransportKind.stdio
	};

	// Client options
	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			{ scheme: 'file', language: 'arazzo-yaml' },
			{ scheme: 'file', language: 'arazzo-json' },
			{ scheme: 'file', pattern: '**/*.arazzo.{yaml,yml,json}' },
			{ scheme: 'file', pattern: '**/*-arazzo.{yaml,yml,json}' }
		],
		synchronize: {
			fileEvents: [
				vscode.workspace.createFileSystemWatcher('**/*.arazzo.{yaml,yml,json}'),
				vscode.workspace.createFileSystemWatcher('**/*-arazzo.{yaml,yml,json}')
			]
		},
		outputChannelName: 'Arazzo Language Server'
	};

	// Create and start the language client
	languageClient = new LanguageClient(
		'arazzoLanguageServer',
		'Arazzo Language Server',
		serverOptions,
		clientOptions
	);

	// Start the client (this will also launch the server)
	languageClient.start();
	console.log('Arazzo Language Server started successfully');

	// Register Code Lens command handlers
	// These are triggered when user clicks Code Lens actions in the editor
	const visualizeCommand = vscode.commands.registerCommand('arazzo.visualize', async (args?: any) => {
		let uri: vscode.Uri;
		let workflowId: string | undefined;

		if (args && args.uri) {
			// Called from Code Lens - args contain uri and possibly workflowId
			uri = vscode.Uri.parse(args.uri);
			workflowId = args.workflowId;
		} else {
			// Called from command palette or toolbar
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showWarningMessage('No active editor');
				return;
			}
			uri = editor.document.uri;
		}

		// Use the existing visualizer system
		// Trigger the state machine to open the visualizer
		StateMachine.sendEvent(EVENT_TYPE.OPEN_VIEW);
	});

	context.subscriptions.push(visualizeCommand);

	const designerCommand = vscode.commands.registerCommand('arazzo.openDesigner', async (args?: any) => {
		let uri: vscode.Uri;
		let workflowId: string | undefined;

		if (args && args.uri) {
			// Called from Code Lens - args contain uri and workflowId
			uri = vscode.Uri.parse(args.uri);
			workflowId = args.workflowId;
		} else {
			// Called from command palette or toolbar
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showWarningMessage('No active editor');
				return;
			}
			uri = editor.document.uri;
		}
		
		// Open the WorkflowView with the specific workflowId
		openView(EVENT_TYPE.OPEN_VIEW, {
			view: MACHINE_VIEW.Workflow,
			documentUri: uri.toString(),
			identifier: workflowId,
		});
	});

	context.subscriptions.push(designerCommand);
}


function checkDocumentForOpenAPI(document?: vscode.TextDocument) {
	if (!document) {
		vscode.commands.executeCommand('setContext', 'isFileOpenAPI', undefined);
		vscode.commands.executeCommand('setContext', 'isFileArazzo', undefined);
		return;
	}

	// Check if the document is a webview
	if (document.uri.scheme === 'webview') {
		vscode.commands.executeCommand('setContext', 'isFileOpenAPI', undefined);
		vscode.commands.executeCommand('setContext', 'isFileArazzo', undefined);
		return;
	}

	// Check if the file is a YAML/YML or JSON file
	const isYaml = document.languageId === 'yaml' || document.fileName.endsWith('.yaml') || document.fileName.endsWith('.yml');
	const isJson = document.languageId === 'json' || document.fileName.endsWith('.json');

	if (!isYaml && !isJson) {
		vscode.commands.executeCommand('setContext', 'isFileOpenAPI', undefined);
		vscode.commands.executeCommand('setContext', 'isFileArazzo', undefined);
		return;
	}

	// Check for Arazzo file by extension first
	const isArazzoFile = document.fileName.endsWith('.arazzo.yaml') ||
		document.fileName.endsWith('.arazzo.yml') ||
		document.fileName.endsWith('.arazzo.json') ||
		document.fileName.endsWith('-arazzo.yaml') ||
		document.fileName.endsWith('-arazzo.yml') ||
		document.fileName.endsWith('-arazzo.json');

	// Read the first few lines to check content
	const firstFewLines = document.getText(new vscode.Range(0, 0, 10, 0));
	const hasOpenAPI = /\bopenapi\s*:/i.test(firstFewLines);
	const hasArazzo = /\barazzo\s*:/i.test(firstFewLines);

	// Set context variables
	const isOpenAPI = hasOpenAPI && !isArazzoFile;
	const isArazzo = hasArazzo || isArazzoFile;

	vscode.commands.executeCommand('setContext', 'isFileOpenAPI', isOpenAPI);
	vscode.commands.executeCommand('setContext', 'isFileArazzo', isArazzo);
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

async function createArazzoFile() {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		vscode.window.showErrorMessage('No workspace folder open');
		return;
	}

	// Ask for the file name
	const fileName = await vscode.window.showInputBox({
		prompt: 'Enter the name for your Arazzo workflow file',
		placeHolder: 'workflow.arazzo.yaml'
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

	const initialContent = `arazzo: 1.0.1
info:
  title: Sample Arazzo Workflow
  version: 1.0.0
  description: A sample Arazzo workflow demonstrating API orchestration

sourceDescriptions:
  - name: petStore
    url: https://api.example.com/openapi.yaml
    type: openapi

workflows:
  - workflowId: sampleWorkflow
    summary: A sample workflow
    description: Demonstrates basic Arazzo workflow structure
    steps:
      - stepId: step1
        operationId: sampleOperation
        successCriteria:
          - condition: $statusCode == 200
        outputs:
          result: $response.body
`;

	try {
		fs.writeFileSync(filePath, initialContent, 'utf8');
		const openedDocument = await vscode.workspace.openTextDocument(filePath);
		await vscode.window.showTextDocument(openedDocument);
	} catch (error) {
		vscode.window.showErrorMessage(`Error creating Arazzo file: ${error}`);
	}
}

async function showCode() {
	const documentUri = StateMachine.context().documentUri;
	if (documentUri) {
		try {
			// documentUri should be a URI string, parse it to vscode.Uri
			const uri = documentUri.startsWith('file://') 
				? vscode.Uri.parse(documentUri) 
				: vscode.Uri.file(documentUri);
			await vscode.workspace.openTextDocument(uri).then(doc => vscode.window.showTextDocument(doc));
		} catch (err) {
			console.error('Error opening document:', err);
			vscode.window.showErrorMessage(`Failed to open document: ${documentUri}`);
		}
	}
}

export function deactivate(): Thenable<void> | undefined {
	if (!languageClient) {
		return undefined;
	}
	return languageClient.stop();
}
