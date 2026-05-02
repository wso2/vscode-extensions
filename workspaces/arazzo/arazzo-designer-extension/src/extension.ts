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
import * as yaml from 'js-yaml';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { StateMachine, openView } from './stateMachine';
import { extension } from './Context';
import { activate as activateHistory } from './history';
import { activateVisualizer } from './visualizer/activate';
import { activateMCPServer } from './mcp';
import { RPCLayer } from './RPCLayer';
import { VisualizerWebview } from './visualizer/webview';
import { EVENT_TYPE, MACHINE_VIEW } from '@wso2/arazzo-designer-core';
import { startMCPServer, disposeMCPServer, isMCPServerRunning, onMCPServerStateChange, getMCPActiveFilePath, initializeMCPServerRunner, getMCPServerPort } from './mcp/mcpServerRunner';
import { RunWorkflowCodeLensProvider } from './mcp/runWorkflowCodeLens';

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

	// Prompt user to enable Arazzo file icon theme (one-time)
	// await promptForFileIconTheme(context); // TODO: Fix this

	// Register the createOpenAPIFile command
	let disposable = vscode.commands.registerCommand('ArazzoDesigner.createOpenAPIFile', createOpenAPIFile);
	context.subscriptions.push(disposable);

	// Register the createArazzoFile command
	let createArazzoDisposable = vscode.commands.registerCommand('ArazzoDesigner.createArazzoFile', createArazzoFile);
	context.subscriptions.push(createArazzoDisposable);

	// Register the showCode command
	let showCodeDisposable = vscode.commands.registerCommand('ArazzoDesigner.showCode', showCode);
	context.subscriptions.push(showCodeDisposable);

	// Register the Start Arazzo Server command
	initializeMCPServerRunner(context);
	let mcpServerDisposable = vscode.commands.registerCommand('arazzo.startMCPServer', async (args?: any) => {
		let filePath: string | undefined;
		if (args && args.uri) {
			filePath = vscode.Uri.parse(args.uri).fsPath;
		}
		await startMCPServer(context, filePath);
	});
	context.subscriptions.push(mcpServerDisposable);

	// Register the Run-workflow CodeLens provider (shows "▶ Try" when arazzo server is active)
	const runCodeLensProvider = new RunWorkflowCodeLensProvider();
	context.subscriptions.push(
		vscode.languages.registerCodeLensProvider(
			{ language: 'arazzo-yaml' },
			runCodeLensProvider
		)
	);

	// Refresh CodeLenses whenever the arazzo server starts or stops.
	// Also reset the dirty flag so the lens reverts from "Rerun" to "Run".
	onMCPServerStateChange(() => {
		runCodeLensProvider.setFileDirty(false);
		runCodeLensProvider.refresh();
		// Notify webview that arazzo server state changed
		RPCLayer.sendMCPStateChange({ isMCPRunning: isMCPServerRunning(), isFileDirty: false });
	});

	// When the active file is saved and the arazzo server is serving it, switch
	// the CodeLens from "Try" to "Retry" to signal the server needs restarting.
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(document => {
			const activeFile = getMCPActiveFilePath();
			if (activeFile && document.uri.fsPath === activeFile) {
				runCodeLensProvider.setFileDirty(true);
				runCodeLensProvider.refresh();
				// Notify webview that the file is now dirty
				RPCLayer.sendMCPStateChange({ isMCPRunning: true, isFileDirty: true });
			}
		})
	);

	// Register the Rerun-workflow command — triggered when the CodeLens shows
	// "↺ Rerun" (i.e. the file was saved since the last server start).
	// Restart the server (like the play button) then run the workflow (like the Run lens).
	context.subscriptions.push(
		vscode.commands.registerCommand('arazzo.retryAIWorkflow', async (args?: any) => {
			const answer = await vscode.window.showWarningMessage(
				'This file has changed since the Arazzo server was last started. Restart the server to run the workflow?',
				{ modal: true },
				'Yes'
			);
			if (answer !== 'Yes') {
				vscode.window.showInformationMessage('Workflow execution cancelled.');
				return;
			}
			await vscode.commands.executeCommand('arazzo.startMCPServer', args);
			await new Promise(resolve => setTimeout(resolve, 2000));
			await vscode.commands.executeCommand('arazzo.tryAIWorkflow', args);
		})
	);

	// Register the Retry-workflow (curl) command — triggered when the "↺ Retry" CodeLens
	// is clicked after the file has been saved.  Mirrors arazzo.retryAIWorkflow but targets
	// the terminal curl flow instead of Copilot.
	context.subscriptions.push(
		vscode.commands.registerCommand('arazzo.retryWorkflow', async (args?: any) => {
			const answer = await vscode.window.showWarningMessage(
				'This file has changed since the Arazzo server was last started. Restart the server to run the workflow?',
				{ modal: true },
				'Yes'
			);
			if (answer !== 'Yes') {
				vscode.window.showInformationMessage('Workflow execution cancelled.');
				return;
			}
			await vscode.commands.executeCommand('arazzo.startMCPServer', args);
			await new Promise(resolve => setTimeout(resolve, 2000));
			await vscode.commands.executeCommand('arazzo.tryWorkflow', args);
		})
	);

	// Initialize Arazzo Language Server for procode features
	initializeLanguageServer(context, runCodeLensProvider);
}

function getLanguageServerBinaryName(): string {
	const platform = process.platform; // 'win32', 'darwin', 'linux'
	const arch = process.arch; // 'x64', 'arm64', etc.

	// Windows: use a single .exe binary regardless of architecture
	if (platform === 'win32') {
		return 'arazzo-language-server.exe';
	}

	// Map Node.js platform/arch to our binary naming convention
	const platformMap: Record<string, string> = {
		'darwin': 'darwin',
		'linux': 'linux'
	};
	const archMap: Record<string, string> = {
		'x64': 'amd64',
		'arm64': 'arm64'
	};

	const osPart = platformMap[platform];
	const archPart = archMap[arch];

	if (!osPart || !archPart) {
		throw new Error(`Unsupported platform: ${platform}/${arch}`);
	}

	return `arazzo-language-server-${osPart}-${archPart}`;
}

function initializeLanguageServer(context: vscode.ExtensionContext, runCodeLensProvider: RunWorkflowCodeLensProvider) {
	console.log('Initializing Arazzo Language Server...');
	console.log('To view LSP logs: View > Output > Select "Arazzo Language Server" from dropdown');

	// Determine the correct binary for this platform + architecture
	let serverExecutable: string;
	try {
		serverExecutable = getLanguageServerBinaryName();
	} catch (e: any) {
		console.error(`Language server not available: ${e.message}`);
		vscode.window.showWarningMessage(`Arazzo Language Server is not available for your platform (${process.platform}/${process.arch}). Procode features will be limited.`);
		return;
	}

	const serverPath = path.join(context.extensionPath, 'ls', serverExecutable);

	// Check if the server binary exists
	if (!fs.existsSync(serverPath)) {
		console.error(`Language server binary not found at: ${serverPath}`);
		vscode.window.showWarningMessage(`Arazzo Language Server binary not found for ${process.platform}/${process.arch}. Procode features will be limited.`);
		return;
	}

	// Git/VSIX packaging can lose executable bits on Unix binaries; repair before launching.
	if (process.platform !== 'win32') {
		try {
			fs.chmodSync(serverPath, 0o755);
		} catch {
			// Non-fatal; LanguageClient will surface the launch error.
		}
	}

	// Server options - use the Go language server
	const serverOptions: ServerOptions = {
		command: serverPath,
		args: ['--debug'],
		transport: TransportKind.stdio
	};

	// Client options — only attach to documents identified as Arazzo files.
	// The checkDocumentForOpenAPI() function dynamically sets the language to
	// arazzo-yaml/arazzo-json when it detects the required `arazzo: X.X.X` field,
	// so the LSP will NOT run on plain OpenAPI or other YAML/JSON files.
	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			{ scheme: 'file', language: 'arazzo-yaml' },
			{ scheme: 'file', language: 'arazzo-json' }
		],
		synchronize: {
			fileEvents: [
				vscode.workspace.createFileSystemWatcher('**/*.{yaml,yml,json}')
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
		StateMachine.reset();
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
		StateMachine.reset();
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

	// Register "Try with AI" command — triggered by the "▶ Try with AI" Code Lens.
	// Ensures the arazzo server is running, then opens Copilot with a prompt
	// to execute the specific workflow.
	const tryAIWorkflowCommand = vscode.commands.registerCommand('arazzo.tryAIWorkflow', async (args?: any) => {
		let filePath: string | undefined;
		let workflowId: string | undefined;

		if (args && args.uri) {
			filePath = vscode.Uri.parse(args.uri).fsPath;
			workflowId = args.workflowId;
		} else {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				filePath = editor.document.uri.fsPath;
			}
		}

		if (!filePath) {
			vscode.window.showWarningMessage('No Arazzo file found. Open an Arazzo file and try again.');
			return;
		}

		// Open the visualizer for this specific workflow only if it is not
		// already showing that exact workflow.
		if (workflowId) {
			const ctx = StateMachine.context();
			const alreadyOpen =
				VisualizerWebview.workflowPanel !== undefined &&
				ctx.view === MACHINE_VIEW.Workflow &&
				ctx.identifier === workflowId &&
				ctx.documentUri === (args?.uri ?? vscode.Uri.file(filePath).toString());

			if (!alreadyOpen) {
				await vscode.commands.executeCommand('arazzo.openDesigner', args);
				// Small delay to let the panel render before the arazzo server starts
				await new Promise(resolve => setTimeout(resolve, 300));
			}
		}

		// Start the arazzo server if it isn't running, serving a different file,
		// or the file has been modified since the last server start (dirty).
		const activeMCPFilePath = getMCPActiveFilePath();
		if (!isMCPServerRunning() || activeMCPFilePath !== filePath || runCodeLensProvider.isFileDirty()) {
			const serverMessage = runCodeLensProvider.isFileDirty()
				? 'This file has changed since the Arazzo server was last started. Restart the server to run the workflow?'
				: 'The Arazzo server is not currently running for this file. Start it to run the workflow?';
			const answer = await vscode.window.showWarningMessage(
				serverMessage,
				{ modal: true },
				'Yes'
			);
			if (answer !== 'Yes') {
				vscode.window.showInformationMessage('Workflow execution cancelled.');
				return;
			}
			// Pass suppressPrompt=true so startMCPServer does not show its own
			// "Try Now" notification — this command will open Copilot itself
			// with the correct workflow ID below.
			await startMCPServer(context, filePath, true);
			// Give the server a moment to become ready
			await new Promise(resolve => setTimeout(resolve, 2000));
		}

		// Build the Copilot prompt
		const prompt = workflowId
			? `execute the workflow ${workflowId}`
			: `list all workflows`;

		try {
			await vscode.commands.executeCommand('workbench.action.chat.open', {
				query: prompt,
				isPartialQuery: false
			});
		} catch {
			vscode.window.showWarningMessage(
				'Could not open GitHub Copilot. Make sure the Copilot extension is installed.'
			);
		}
	});

	context.subscriptions.push(tryAIWorkflowCommand);

	// Register "Try Workflow" command — triggered by the "▶ Try" / "↺ Retry" Code Lens.
	// The server is already running when this is called (the lens only appears when running).
	// For the dirty-file case, arazzo.retryWorkflow restarts the server first, then calls this.
	const tryWorkflowCommand = vscode.commands.registerCommand('arazzo.tryWorkflow', async (args?: any) => {
		const filePath = args?.uri ? vscode.Uri.parse(args.uri).fsPath : vscode.window.activeTextEditor?.document.uri.fsPath;
		const workflowId: string | undefined = args?.workflowId;

		if (!filePath || !workflowId) {
			vscode.window.showWarningMessage('No Arazzo workflow found. Click the lens directly above a workflow definition.');
			return;
		}

		// Open the visualizer for this workflow if it is not already showing it.
		const ctx = StateMachine.context();
		const alreadyOpen =
			VisualizerWebview.workflowPanel !== undefined &&
			ctx.view === MACHINE_VIEW.Workflow &&
			ctx.identifier === workflowId &&
			ctx.documentUri === (args?.uri ?? vscode.Uri.file(filePath).toString());
		if (!alreadyOpen) {
			await vscode.commands.executeCommand('arazzo.openDesigner', args);
			await new Promise(resolve => setTimeout(resolve, 300));
		}

		const port = getMCPServerPort();
		if (!port) {
			vscode.window.showWarningMessage('Arazzo server is not running. Start it using the play button.');
			return;
		}

		const runCommand = buildRunCommand(workflowId, port, filePath);
		const terminal = vscode.window.terminals.find(t => t.name === 'Arazzo') ?? vscode.window.createTerminal('Arazzo');
		terminal.show(true); // preserve focus on the editor
		
		// If on Windows, pipe to Out-String to avoid truncation and then 
		// convert from JSON for a clear property-list view.
		let commandToExecute = runCommand;
		if (process.platform === 'win32') {
			commandToExecute = `${runCommand} | Format-List`;
		}
		
		terminal.sendText(commandToExecute, false /* do not press Enter */);
	});

	context.subscriptions.push(tryWorkflowCommand);
}

/**
 * Build a platform-appropriate HTTP request command for POST /run/{workflowId}.
 * Uses Invoke-RestMethod on Windows and curl on Linux/macOS.
 * Input values are filled from the workflow's declared defaults;
 * any input without a default gets the placeholder "ENTER".
 */
function buildRunCommand(workflowId: string, port: number, filePath: string): string {
	const inputsBody: Record<string, any> = {};
	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		const doc = yaml.load(content) as any;
		const workflows: any[] = doc?.workflows ?? [];
		const wf = workflows.find((w: any) => w?.workflowId === workflowId);
		if (wf) {
			// inputs JSON-Schema style (Arazzo 1.0.0)
			const properties: Record<string, any> = wf?.inputs?.properties ?? {};
			for (const [key, schemaDef] of Object.entries<any>(properties)) {
				inputsBody[key] = schemaDef?.default !== undefined ? schemaDef.default : 'ENTER';
			}
			// parameters array style
			const params: any[] = wf?.parameters ?? [];
			for (const p of params) {
				const name: string = p?.name;
				if (!name) { continue; }
				const inVal: string = p?.in ?? '';
				if (inVal !== '' && inVal !== 'inputs') { continue; }
				if (!(name in inputsBody)) {
					inputsBody[name] = p?.value !== undefined ? p.value : 'ENTER';
				}
			}
		}
	} catch {
		// Non-fatal — use empty inputs
	}

	const bodyJson = JSON.stringify({ inputs: inputsBody });
	const url = `http://localhost:${port}/run/${workflowId}`;

	if (process.platform === 'win32') {
		// PowerShell: single-quote the body so double-quotes inside are literal.
		return `Invoke-RestMethod -Method Post -Uri "${url}" -ContentType "application/json" -Body '${bodyJson}'`;
	} else {
		// bash/zsh: escape double-quotes inside the double-quoted -d argument.
		const escapedBody = bodyJson.replace(/"/g, '\\"');
		return `curl -X POST "${url}" -H "Content-Type: application/json" -d "${escapedBody}"`;
	}
}

async function promptForFileIconTheme(context: vscode.ExtensionContext) {
	const iconThemePromptKey = 'arazzoIconThemePromptDismissed';
	const hasUserDismissed = context.globalState.get(iconThemePromptKey, false);

	// Check if user has dismissed the prompt
	if (hasUserDismissed) {
		return;
	}

	// Check if the Arazzo icon theme is already set
	const currentIconTheme = vscode.workspace.getConfiguration('workbench').get<string>('iconTheme');
	if (currentIconTheme === 'arazzo-icon-theme') {
		return; // Already using our icon theme, no need to prompt
	}

	// Show the prompt since user hasn't dismissed it and isn't using our icon theme
	const selection = await vscode.window.showInformationMessage(
		'Enable Arazzo File Icons to see custom icons for .arazzo files?',
		'Enable',
		"Don't Show Again"
	);

	if (selection === 'Enable') {
		await vscode.workspace.getConfiguration('workbench')
			.update('iconTheme', 'arazzo-icon-theme', vscode.ConfigurationTarget.Global);
	} else if (selection === "Don't Show Again") {
		// Only mark as dismissed if user explicitly clicks "Don't Show Again"
		await context.globalState.update(iconThemePromptKey, true);
	}
	// If user clicks the X or outside the dialog, do nothing (prompt will show again next time)
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
	const isYaml = document.languageId === 'yaml' || document.languageId === 'arazzo-yaml' ||
		document.fileName.endsWith('.yaml') || document.fileName.endsWith('.yml');
	const isJson = document.languageId === 'json' || document.languageId === 'arazzo-json' ||
		document.fileName.endsWith('.json');

	if (!isYaml && !isJson) {
		vscode.commands.executeCommand('setContext', 'isFileOpenAPI', undefined);
		vscode.commands.executeCommand('setContext', 'isFileArazzo', undefined);
		return;
	}

	// Content-based detection per Arazzo Spec §4.6.1:
	// The `arazzo` field is REQUIRED and MUST be used by tooling to interpret the Arazzo Description.
	// Check the first few lines for the `arazzo: X.X.X` version pattern.
	const firstFewLines = document.getText(new vscode.Range(0, 0, 10, 0));
	const hasOpenAPI = /\bopenapi\s*:/i.test(firstFewLines);
	const hasArazzo = /\barazzo\s*:\s*\d+\.\d+\.\d+/i.test(firstFewLines);

	// Set context variables — detect Arazzo purely by content, not file name
	const isOpenAPI = hasOpenAPI && !hasArazzo;
	const isArazzo = hasArazzo;

	vscode.commands.executeCommand('setContext', 'isFileOpenAPI', isOpenAPI);
	vscode.commands.executeCommand('setContext', 'isFileArazzo', isArazzo);

	// Dynamically set the document language to arazzo-yaml/arazzo-json
	// so the language server and syntax highlighting activate automatically
	if (isArazzo) {
		const targetLanguage = isJson ? 'arazzo-json' : 'arazzo-yaml';
		if (document.languageId !== targetLanguage) {
			vscode.languages.setTextDocumentLanguage(document, targetLanguage);
		}
	}
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
	disposeMCPServer();
	if (!languageClient) {
		return undefined;
	}
	return languageClient.stop();
}
