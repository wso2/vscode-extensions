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
import { ProjectStructureResponse, ProjectStructureEntry, RegistryResourcesFolder, ListRegistryArtifactsResponse, DataIntegrationResponse, CommonArtifactsResponse, AdvancedArtifactsResponse } from '@wso2/mi-core';
import { COMMANDS, EndpointTypes, InboundEndpointTypes, MessageProcessorTypes, MessageStoreTypes, TemplateTypes } from '../constants';
import { window } from 'vscode';
import path = require('path');
import { findJavaFiles, getAvailableRegistryResources } from '../util/fileOperations';
import { RUNTIME_VERSION_440 } from "../constants";
import { compareVersions } from '../util/onboardingUtils';
import { debounce } from 'lodash';
import { MILanguageClient } from '../lang-client/activator';

let extensionContext: vscode.ExtensionContext;
export class ProjectExplorerEntry extends vscode.TreeItem {
	children: ProjectExplorerEntry[] | undefined;
	info: ProjectStructureEntry | undefined;

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		info: ProjectStructureEntry | undefined = undefined,
		icon?: string,
		isCodicon: boolean = false
	) {
		super(label, collapsibleState);
		this.tooltip = `${this.label}`;
		this.info = info;
		if (icon && isCodicon) {
			this.iconPath = new vscode.ThemeIcon(icon);
		} else if (icon) {
			this.iconPath = {
				light: vscode.Uri.file(path.join(extensionContext.extensionPath, 'assets', `light-${icon}.svg`)),
				dark:  vscode.Uri.file(path.join(extensionContext.extensionPath, 'assets', `dark-${icon}.svg`))
			};
		}
	}
}

export class ProjectExplorerEntryProvider implements vscode.TreeDataProvider<ProjectExplorerEntry> {
	private _data: ProjectExplorerEntry[];
	private _onDidChangeTreeData: vscode.EventEmitter<ProjectExplorerEntry | undefined | null | void>
		= new vscode.EventEmitter<ProjectExplorerEntry | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ProjectExplorerEntry | undefined | null | void>
		= this._onDidChangeTreeData.event;

	refresh = debounce(async () => {
		return window.withProgress({
			location: { viewId: 'MI.project-explorer' },
			title: 'Loading project structure'
		}, async () => {
			try {
				this._data = await getProjectStructureData();
				this._onDidChangeTreeData.fire();
			} catch (err) {
				console.error(err);
			}
		});
	}, 300);

	constructor(private context: vscode.ExtensionContext) {
		this._data = [];
		extensionContext = context;
	}

	getTreeItem(element: ProjectExplorerEntry): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: ProjectExplorerEntry | undefined): vscode.ProviderResult<ProjectExplorerEntry[]> {
		if (element === undefined) {
			return this._data;
		}
		return element.children;
	}

	getParent(element: ProjectExplorerEntry): vscode.ProviderResult<ProjectExplorerEntry> {
		if (element.info?.path === undefined || element.contextValue === 'project') return undefined;

		const projects = (this._data);
		for (const project of projects) {
			if (project.children?.find(child => child.info?.path === element.info?.path)) {
				return project;
			}
			const fileElement = this.recursiveSearchParent(project, element.info?.path);
			if (fileElement) {
				return fileElement;
			}
		}
		return undefined;
	}

	recursiveSearchParent(element: ProjectExplorerEntry, path: string): ProjectExplorerEntry | undefined {
		if (!element.children) {
			return undefined;
		}
		for (const child of element.children) {
			if (child.info?.path === path) {
				return element;
			}
			const foundParent = this.recursiveSearchParent(child, path);
			if (foundParent) {
				return foundParent;
			}
		}
		return undefined;
	}
}

async function getProjectStructureData(): Promise<ProjectExplorerEntry[]> {
	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		const data: ProjectExplorerEntry[] = [];
		const workspaceFolders = vscode.workspace.workspaceFolders;
		for (const workspace of workspaceFolders) {
			const rootPath = workspace.uri.fsPath;

			try {
				const langClient = await MILanguageClient.getInstance(rootPath);
				const resp = await langClient?.languageClient?.getProjectExplorerModel(rootPath);
				const projectDetailsRes = await langClient?.languageClient?.getProjectDetails();
				const runtimeVersion = projectDetailsRes.primaryDetails.runtimeVersion.value;
				const projectTree = generateTreeData(workspace, resp, runtimeVersion);

				if (projectTree) {
					data.push(projectTree);
				}
			} catch {}
		};
		vscode.commands.executeCommand('setContext', 'projectOpened', true);
		if (data.length > 0) {
			vscode.commands.executeCommand('setContext', 'MI.showAddArtifact', false);
			return data;
		}
		vscode.commands.executeCommand('setContext', 'MI.showAddArtifact', true);
	} else {
		vscode.commands.executeCommand('setContext', 'projectOpened', false);
	}
	return [];

}

function generateTreeData(project: vscode.WorkspaceFolder, data: ProjectStructureResponse, runtimeVersion: string): ProjectExplorerEntry | undefined {
	const directoryMap = data.directoryMap;
	if (directoryMap) {
		const projectRoot = new ProjectExplorerEntry(
			`Project ${project.name}`,
			vscode.TreeItemCollapsibleState.Expanded,
			{ name: project.name, path: project.uri.fsPath, type: 'project' },
			'project'
		);

		projectRoot.contextValue = 'project';
		generateTreeDataOfArtifacts(project, data, projectRoot, runtimeVersion);
		return projectRoot;
	}
}

function generateTreeDataOfArtifacts(project: vscode.WorkspaceFolder, data: ProjectStructureResponse, projectRoot: ProjectExplorerEntry, runtimeVersion: string) {
	const artifacts = (data.directoryMap as any)?.src?.main?.wso2mi?.artifacts;
	if (!artifacts) {
		return;
	}

	projectRoot.children = projectRoot.children ?? [];

	for (const key in artifacts) {
		if (!artifacts[key] || artifacts[key].length === 0) continue;

		const artifactConfig = getArtifactConfig(key);
		const folderPath = artifactConfig.folderName ?
			path.join(project.uri.fsPath, 'src', 'main', 'wso2mi', ...artifactConfig.folderName.split("/")) :
			'';

		artifacts[key].path = folderPath;

		const parentEntry = new ProjectExplorerEntry(
			key,
			isCollapsibleState(artifacts[key].length > 0 || ['Other Artifacts', 'Resources'].includes(key)),
			artifacts[key]
		);

		let children;
		if (['APIs', 'Event Integrations', 'Automations', 'Data Services'].includes(key)) {
			children = genProjectStructureEntry(artifacts[key]);
		} else if (key === 'Resources') {
			const existingResources = getAvailableRegistryResources(project.uri.fsPath);
			children = generateResources(artifacts[key], existingResources);
		} else {
			children = generateArtifacts(artifacts[key], data, project);
		}

		parentEntry.children = children;
		parentEntry.contextValue = artifactConfig.contextValue;
		parentEntry.id = `${project.name}/${artifactConfig.contextValue}`;

		if (!children || children.length === 0) continue;
		projectRoot.children.push(parentEntry);
	}
}

function getArtifactConfig(key: string) {
	const configs: { [key: string]: { folderName: string, contextValue: string } } = {
		'APIs': {
			folderName: 'artifacts/apis',
			contextValue: 'apis'
		},
		'Event Integrations': {
			folderName: 'artifacts/inbound-endpoints',
			contextValue: 'inboundEndpoints'
		},
		'Automations': {
			folderName: 'artifacts/tasks',
			contextValue: 'tasks'
		},
		'Data Services': {
			folderName: 'artifacts/data-services',
			contextValue: 'dataServices'
		},
		'Other Artifacts': {
			folderName: '',
			contextValue: 'Other Artifacts'
		},
		'Resources': {
			folderName: 'resources',
			contextValue: 'resources'
		}
	};

	return configs[key] || {
		icon: 'folder',
		label: key,
		folderName: '',
		contextValue: key
	};
}

function generateResources(data: RegistryResourcesFolder, resourceDetails: ListRegistryArtifactsResponse): ProjectExplorerEntry[] {
	const result: ProjectExplorerEntry[] = [];
	const resPathPrefix = path.join("wso2mi", "resources");
	if (data) {
		if (data.files) {
			for (const entry of data.files) {
				if (entry.path.includes(path.join("resources", "conf", "config.properties"))) {
					continue;
				}
				const explorerEntry = new ProjectExplorerEntry(entry.name, isCollapsibleState(false), {
					name: entry.name,
					type: 'resource',
					path: `${entry.path}`
				}, 'code', true);
				explorerEntry.id = entry.path;
				explorerEntry.command = {
					"title": "Edit Resource",
					"command": COMMANDS.EDIT_REGISTERY_RESOURCE_COMMAND,
					"arguments": [vscode.Uri.file(entry.path)]
				};
				result.push(explorerEntry);
				const lastIndex = entry.path.indexOf(resPathPrefix) !== -1 ? entry.path.indexOf(resPathPrefix) + resPathPrefix.length : 0;
				const resourcePath = entry.path.substring(lastIndex);
				if (checkExistenceOfResource(resourcePath, resourceDetails)) {
					explorerEntry.contextValue = "registry-with-metadata";
				} else {
					explorerEntry.contextValue = "registry-without-metadata";
				}
			}
		}
		if (data.folders) {
			for (const entry of data.folders) {
				if (![".meta", "datamapper", "datamappers"].includes(entry.name)) {
					const files = generateResources(entry, resourceDetails);
					if (!files || files?.length === 0) {
						continue;
					}
					const explorerEntry = new ProjectExplorerEntry(entry.name,
						isCollapsibleState(entry.files.length > 0 || entry.folders.length > 0),
						{
							name: entry.name,
							type: 'resource',
							path: `${entry.path}`
						}, 'folder', true);
					explorerEntry.children = generateResources(entry, resourceDetails);
					result.push(explorerEntry);
					const lastIndex = entry.path.indexOf(resPathPrefix) !== -1 ? entry.path.indexOf(resPathPrefix) + resPathPrefix.length : 0;
					const resourcePath = entry.path.substring(lastIndex);
					if (checkExistenceOfResource(resourcePath, resourceDetails)) {
						explorerEntry.contextValue = "registry-with-metadata";
					} else {
						explorerEntry.contextValue = "registry-without-metadata";
					}
				}
			}
		}
	}
	return result;
}

function checkExistenceOfResource(resourcePath: string, resourceDetails: ListRegistryArtifactsResponse): boolean {
	if (resourceDetails?.artifacts) {
		for (const artifact of resourceDetails.artifacts) {
			let transformedPath = artifact.path.replace("/_system/governance/mi-resources", '/resources');
			if (!artifact.isCollection) {
				transformedPath = transformedPath.endsWith('/') ? transformedPath + artifact.file : transformedPath + "/" + artifact.file;
			}
			if (transformedPath === resourcePath) {
				return true;
			}
		}
		return false;
	}
	return false;
}

function generateArtifactsPath(projectPath: string, key: string): string {
	switch (key) {
		case 'Local Entries':
			return path.join(projectPath, 'src', 'main', 'wso2mi', 'artifacts', 'local-entries');
		case 'Message Stores':
			return path.join(projectPath, 'src', 'main', 'wso2mi', 'artifacts', 'message-stores');
		case 'Message Processors':
			return path.join(projectPath, 'src', 'main', 'wso2mi', 'artifacts', 'message-processors');
		case 'Proxy Services':
			return path.join(projectPath, 'src', 'main', 'wso2mi', 'artifacts', 'proxy-services');
		case 'Data Services':
			return path.join(projectPath, 'src', 'main', 'wso2mi', 'artifacts', 'data-services');
		case 'Data Sources':
			return path.join(projectPath, 'src', 'main', 'wso2mi', 'artifacts', 'data-sources');
		case 'Class Mediators':
			return path.join(projectPath, 'src', 'main', 'java');
		case 'Ballerina Modules':
			return path.join(projectPath, 'src', 'main', 'ballerina');
		default:
			return path.join(projectPath, 'src', 'main', 'wso2mi', 'artifacts', key.toLowerCase());
	}
}
function generateArtifacts(
	data: DataIntegrationResponse | CommonArtifactsResponse | AdvancedArtifactsResponse,
	projectStructure: ProjectStructureResponse,
	project: vscode.WorkspaceFolder
): ProjectExplorerEntry[] {
	const result: ProjectExplorerEntry[] = [];

	for (const key in data) {
		if (key === 'path' || !data[key] || data[key].length === 0) continue;

		const artifactPath = generateArtifactsPath(project.uri.fsPath, key);
		data[key].path = artifactPath;

		const parentEntry = new ProjectExplorerEntry(
			key,
			isCollapsibleState(data[key].length > 0),
			data[key]
		);

		switch (key) {
			case 'Endpoints': {
				parentEntry.children = data[key].map((entry: any) => {
					const explorerEntry = new ProjectExplorerEntry(
						entry.name.replace(".xml", ""),
						isCollapsibleState(false),
						entry,
						getEndpointIcon(entry.subType as EndpointTypes)
					);
					explorerEntry.contextValue = 'endpoint';
					explorerEntry.command = {
						title: "Show Endpoint",
						command: getViewCommand(entry.subType),
						arguments: [vscode.Uri.file(entry.path), 'endpoint', undefined, false]
					};
					return explorerEntry;
				});
				parentEntry.contextValue = 'endpoints';
				break;
			}
			case 'Local Entries': {
				parentEntry.children = data[key].map((entry: any) => {
					const icon = entry.isRegistryResource ? 'file-code' : 'local-entry';
					const explorerEntry = new ProjectExplorerEntry(
						entry.name.replace(".xml", ""),
						isCollapsibleState(false),
						entry,
						icon,
						entry.isRegistryResource
					);
					explorerEntry.contextValue = 'localEntry';
					explorerEntry.command = {
						title: "Show Local Entry",
						command: COMMANDS.SHOW_LOCAL_ENTRY,
						arguments: [vscode.Uri.file(entry.path), undefined, false]
					};
					return explorerEntry;
				});
				parentEntry.contextValue = 'localEntries';
				break;
			}
			case 'Connections': {
				parentEntry.children = data[key].map((entry: any) => {
					const explorerEntry = new ProjectExplorerEntry(
						entry.name,
						isCollapsibleState(false),
						entry,
						'vm-connect',
						true
					);
					explorerEntry.contextValue = 'connection';
					explorerEntry.id = entry.name;
					explorerEntry.command = {
						title: "Show Connection",
						command: COMMANDS.SHOW_CONNECTION,
						arguments: [vscode.Uri.file(entry.path), entry.name, false]
					};
					return explorerEntry;
				});
				parentEntry.contextValue = 'connections';
				break;
			}
			case 'Message Stores': {
				parentEntry.children = data[key].map((entry: any) => {
					const explorerEntry = new ProjectExplorerEntry(
						entry.name.replace(".xml", ""),
						isCollapsibleState(false),
						entry,
						getMesaaageStoreIcon(entry.subType as MessageStoreTypes)
					);
					explorerEntry.contextValue = 'messageStore';
					explorerEntry.command = {
						title: "Show Message Store",
						command: COMMANDS.SHOW_MESSAGE_STORE,
						arguments: [vscode.Uri.file(entry.path), undefined, false]
					};
					return explorerEntry;
				});
				parentEntry.contextValue = 'messageStores';
				break;
			}
			case 'Message Processors': {
				parentEntry.children = data[key].map((entry: any) => {
					const explorerEntry = new ProjectExplorerEntry(
						entry.name.replace(".xml", ""),
						isCollapsibleState(false),
						entry,
						getMessageProcessorIcon(entry.subType as MessageProcessorTypes)
					);
					explorerEntry.contextValue = 'message-processor';
					explorerEntry.command = {
						title: "Show Message Processor",
						command: COMMANDS.SHOW_MESSAGE_PROCESSOR,
						arguments: [vscode.Uri.file(entry.path), undefined, false]
					};
					return explorerEntry;
				});
				parentEntry.contextValue = 'messageProcessors';
				break;
			}
			case 'Proxy Services': {
				parentEntry.children = data[key].map((entry: any) => {
					const explorerEntry = new ProjectExplorerEntry(
						entry.name.replace(".xml", ""),
						isCollapsibleState(false),
						entry,
						'arrow-swap',
						true
					);
					explorerEntry.contextValue = 'proxy-service';
					explorerEntry.command = {
						title: "Show Diagram",
						command: COMMANDS.SHOW_PROXY_VIEW,
						arguments: [vscode.Uri.file(entry.path), undefined, false]
					};
					return explorerEntry;
				});
				parentEntry.contextValue = 'proxyServices';
				break;
			}
			case 'Sequences': {
				parentEntry.children = data[key].map((entry: any) => {
					const icon = entry.isRegistryResource ? 'file-code' : 'Sequence';
					const explorerEntry = new ProjectExplorerEntry(
						entry.name.replace(".xml", "") + (entry.isMainSequence ? " (Main)" : ""),
						isCollapsibleState(false),
						entry,
						icon,
						entry.isRegistryResource
					);
					explorerEntry.contextValue = `sequence${entry.isMainSequence ? "-main" : ""}`;
					explorerEntry.command = {
						title: "Show Diagram",
						command: COMMANDS.SHOW_SEQUENCE_VIEW,
						arguments: [vscode.Uri.file(entry.path), undefined, false]
					};
					return explorerEntry;
				});
				parentEntry.contextValue = 'sequences';
				break;
			}
			case 'Templates': {
				parentEntry.children = data[key].map((entry: any) => {
					const icon = entry.isRegistryResource ? 'file-code' : getTemplateIcon(entry.subType as TemplateTypes);
					const explorerEntry = new ProjectExplorerEntry(
						entry.name.replace(".xml", ""),
						isCollapsibleState(false),
						entry,
						icon,
						entry.isRegistryResource
					);
					explorerEntry.contextValue = 'template';
					explorerEntry.command = {
						title: "Show Template",
						command: getViewCommand(entry.subType),
						arguments: [vscode.Uri.file(entry.path), 'template', undefined, false]
					};
					return explorerEntry;
				});
				parentEntry.contextValue = 'templates';
				break;
			}
			case 'Data Sources': {
				parentEntry.children = data[key].map((entry: any) => {
					const explorerEntry = new ProjectExplorerEntry(
						entry.name.replace(".xml", ""),
						isCollapsibleState(false),
						entry,
						"data-source"
					);
					explorerEntry.contextValue = 'dataSource';
					explorerEntry.command = {
						title: "Show Data Source",
						command: COMMANDS.SHOW_DATA_SOURCE,
						arguments: [vscode.Uri.file(entry.path), undefined, false]
					};
					return explorerEntry;
				});
				parentEntry.contextValue = 'dataSources';
				break;
			}
			case 'Class Mediators': {
				const javaPath = path.join(project.uri.fsPath, 'src', 'main', 'java');
				const mediators = findJavaFiles(javaPath);
				parentEntry.id = 'class-mediator';
				parentEntry.children = generateTreeDataOfClassMediator(project, projectStructure);
				parentEntry.contextValue = 'class-mediators';
				break;
			}
			case 'Ballerina Modules': {
				parentEntry.id = 'ballerina-module';
				parentEntry.children = generateTreeDataOfBallerinaModule(project, projectStructure,
					data[key].filter(file => file.name !== "Ballerina.toml"));
				parentEntry.contextValue = 'ballerina-modules';
				break;
			}
			case 'Data Mappers': {
				parentEntry.contextValue = 'data-mappers';
				parentEntry.id = 'data-mapper';
				parentEntry.children = data[key].map((folder: any) => {
					const explorerEntry = new ProjectExplorerEntry(
						folder.name,
						isCollapsibleState(false),
						folder,
						'dataMapper'
					);
					explorerEntry.contextValue = 'data-mapper';
					explorerEntry.command = {
						title: "Open Data Mapper",
						command: COMMANDS.SHOW_DATA_MAPPER,
						arguments: [folder.files.find((file: any) => !file.name.endsWith("utils.ts"))?.path]
					};
					return explorerEntry;
				});
				break;
			}
		}

		if (parentEntry) {
			result.push(parentEntry);
		}
	}

	return result;
}

function generateTreeDataOfClassMediator(project: vscode.WorkspaceFolder, data: ProjectStructureResponse): ProjectExplorerEntry[] {
	const directoryMap = data.directoryMap;
	const main = (directoryMap as any)?.src?.main;
	const result: ProjectExplorerEntry[] = [];
	if (main && main['java']) {
		const javaPath = path.join(project.uri.fsPath, 'src', 'main', 'java');
		const mediators = findJavaFiles(javaPath);
		for (var entry of mediators.entries()) {
			const filePath = entry[0];
			const packageName = entry[1];
			const fileName = path.basename(filePath);
			const resourceEntry = new ProjectExplorerEntry(fileName + " (" + packageName + ")", isCollapsibleState(false), {
				name: fileName,
				type: 'resource',
				path: filePath
			}, 'class-icon');
			resourceEntry.command = {
				"title": "Edit Class Mediator",
				"command": COMMANDS.EDIT_CLASS_MEDIATOR_COMMAND,
				"arguments": [vscode.Uri.file(filePath)]
			};
			resourceEntry.contextValue = 'class-mediator';
			result.push(resourceEntry);
		}
	}
	return result;
}

function generateTreeDataOfBallerinaModule(project: vscode.WorkspaceFolder, data: ProjectStructureResponse, ballerinaFiles: any): ProjectExplorerEntry[] {
	const directoryMap = data.directoryMap;
	const main = (directoryMap as any)?.src?.main;
	const result: ProjectExplorerEntry[] = [];
	if (main && main['ballerina']) {
		let modules = new Map();
		ballerinaFiles.forEach(file => {
			const nameWithoutExtension = file.name.replace('.bal', '');
			modules.set(file.path, nameWithoutExtension.endsWith("-module") ?
				nameWithoutExtension.replace('-module', '') : nameWithoutExtension);
		});;
		for (var entry of modules.entries()) {
			const filePath = entry[0];
			const packageName = entry[1];
			const fileName = path.basename(filePath);
			const resourceEntry = new ProjectExplorerEntry(fileName + " (" + packageName + ")", isCollapsibleState(false), {
				name: fileName,
				type: 'resource',
				path: filePath
			}, 'file');
			resourceEntry.command = {
				"title": "Edit Ballerina Module",
				"command": COMMANDS.EDIT_BALLERINA_MODULE_COMMAND,
				"arguments": [vscode.Uri.file(filePath)]
			};
			resourceEntry.contextValue = 'ballerina-module';
			result.push(resourceEntry);
		}
	}
	return result;
}

function isCollapsibleState(state: boolean): vscode.TreeItemCollapsibleState {
	return state ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
}

function getEndpointIcon(endpointType: EndpointTypes): string {
	let icon = 'endpoint';
	// Replace above with switch case when more endpoint types are added
	switch (endpointType) {
		case EndpointTypes.HTTP_ENDPOINT:
			icon = 'http-endpoint';
			break;
		case EndpointTypes.ADDRESS_ENDPOINT:
			icon = 'address-endpoint';
			break;
		case EndpointTypes.WSDL_ENDPOINT:
			icon = 'wsdl-endpoint';
			break;
		case EndpointTypes.DEFAULT_ENDPOINT:
			icon = 'default-endpoint';
			break;
		case EndpointTypes.LOAD_BALANCE_ENDPOINT:
			icon = 'load-balance-endpoint';
			break;
		case EndpointTypes.FAILOVER_ENDPOINT:
			icon = 'failover-endpoint';
			break;
		case EndpointTypes.RECIPIENT_ENDPOINT:
			icon = 'recipient-endpoint';
			break;
	}
	return icon;
}

function getTemplateIcon(templateType: string): string {
	let icon = 'template-endpoint';
	switch (templateType) {
		case TemplateTypes.ADDRESS_ENDPOINT:
			icon = 'address-endpoint-template';
			break;
		case TemplateTypes.DEFAULT_ENDPOINT:
			icon = 'default-endpoint-template';
			break;
		case TemplateTypes.HTTP_ENDPOINT:
			icon = 'http-endpoint-template';
			break;
		case TemplateTypes.WSDL_ENDPOINT:
			icon = 'wsdl-endpoint-template';
			break;
		case TemplateTypes.SEQUENCE_ENDPOINT:
			icon = 'sequence-template';
			break;
	}
	return icon;
}

function getInboundEndpointIcon(endpointType: InboundEndpointTypes): string {
	let icon = 'inbound-endpoint';
	// Replace above with switch case when more endpoint types are added
	switch (endpointType) {
		case InboundEndpointTypes.CXF_WS_RM:
			icon = 'cxf-ws-rm-endpoint';
			break;
		case InboundEndpointTypes.FILE:
			icon = 'file-endpoint';
			break;
		case InboundEndpointTypes.HL7:
			icon = 'hl7-endpoint';
			break;
		case InboundEndpointTypes.JMS:
			icon = 'jms-endpoint';
			break;
		case InboundEndpointTypes.MQTT:
			icon = 'mqtt-endpoint';
			break;
		case InboundEndpointTypes.WS:
			icon = 'ws-endpoint';
			break;
		case InboundEndpointTypes.FEED:
			icon = 'feed-endpoint';
			break;
		case InboundEndpointTypes.HTTPS:
			icon = 'https-endpoint';
			break;
		case InboundEndpointTypes.HTTP:
			icon = 'http-inbound-endpoint';
			break;
		case InboundEndpointTypes.KAFKA:
			icon = 'kafka-endpoint';
			break;
		case InboundEndpointTypes.WSS:
			icon = 'wss-endpoint';
			break;
		case InboundEndpointTypes.CUSTOM:
			icon = 'user-defined-endpoint';
			break;
		case InboundEndpointTypes.RABBITMQ:
			icon = 'rabbitmq-endpoint';
			break;
	}
	return icon;
}

function getMessageProcessorIcon(messageProcessorType: MessageProcessorTypes): string {
	let icon = 'message-processor';
	// Replace above with switch case when more endpoint types are added
	switch (messageProcessorType) {
		case MessageProcessorTypes.MESSAGE_SAMPLING:
			icon = 'message-sampling-processor';
			break;
		case MessageProcessorTypes.SCHEDULED_MESSAGE_FORWARDING:
			icon = 'scheduled-message-forwarding-processor';
			break;
		case MessageProcessorTypes.SCHEDULED_FAILOVER_MESSAGE_FORWARDING:
			icon = 'scheduled-failover-message-forwarding-processor';
			break;
		case MessageProcessorTypes.CUSTOM:
			icon = 'custom-message-processor';
			break;
	}
	return icon;
}

function getMesaaageStoreIcon(messageStoreType: MessageStoreTypes): string {
	let icon = 'message-store';
	// Replace above with switch case when more endpoint types are added
	switch (messageStoreType) {
		case MessageStoreTypes.IN_MEMORY:
			icon = 'in-memory-message-store';
			break;
		case MessageStoreTypes.CUSTOM:
			icon = 'custom-message-store';
			break;
		case MessageStoreTypes.JMS:
			icon = 'jms-message-store';
			break;
		case MessageStoreTypes.RABBITMQ:
			icon = 'rabbit-mq';
			break;
		case MessageStoreTypes.WSO2_MB:
			icon = 'wso2-mb-message-store';
			break;
		case MessageStoreTypes.RESEQUENCE:
			icon = 'resequence-message-store';
			break;
		case MessageStoreTypes.JDBC:
			icon = 'jdbc-message-store';
			break;
	}
	return icon;
}


function genProjectStructureEntry(data: ProjectStructureEntry[]): ProjectExplorerEntry[] {
	const result: ProjectExplorerEntry[] = [];

	for (const entry of data) {
		let explorerEntry;

		if (entry.type === 'API' && entry.resources) {
			const apiEntry = new ProjectExplorerEntry(entry.name.replace(".xml", ""), isCollapsibleState(true), entry, 'APIResource');
			apiEntry.contextValue = 'api';
			apiEntry.iconPath = {
				light: vscode.Uri.file(path.join(extensionContext.extensionPath, 'assets', `light-APIResource.svg`)),
				dark: vscode.Uri.file(path.join(extensionContext.extensionPath, 'assets', `dark-APIResource.svg`))
			};
			apiEntry.children = [];

			// Generate resource structure
			for (let i = 0; i < entry.resources.length; i++) {
				const resource: any = entry.resources[i];
				const iconName = resource?.methods?.includes(" ") ? "APIResource" : `${resource?.methods?.toLowerCase()}-api`;
				const resourceEntry = new ProjectExplorerEntry((resource.uriTemplate || resource.urlMapping) ?? "/", isCollapsibleState(false), {
					name: (resource.uriTemplate || resource.urlMapping),
					type: 'resource',
					path: `${entry.path}/${i}`
				}, iconName);
				resourceEntry.command = {
					"title": "Show Diagram",
					"command": COMMANDS.SHOW_RESOURCE_VIEW,
					"arguments": [vscode.Uri.file(entry.path), i, false]
				};
				resourceEntry.contextValue = 'resource';
				apiEntry.children.push(resourceEntry);
			}
			explorerEntry = apiEntry;

		} else if (entry.type === "TASK") {
			explorerEntry = new ProjectExplorerEntry(entry.name.replace(".xml", ""), isCollapsibleState(false), entry, entry.type);
			explorerEntry.contextValue = 'task';
			explorerEntry.command = {
				"title": "Show Task",
				"command": COMMANDS.SHOW_TASK_VIEW,
				"arguments": [vscode.Uri.file(entry.path), undefined, false]
			};
		} else if (entry.type === "INBOUND_ENDPOINT") {
			explorerEntry = new ProjectExplorerEntry(entry.name.replace(".xml", ""), isCollapsibleState(false), entry, getInboundEndpointIcon(entry.subType as InboundEndpointTypes));
			explorerEntry.contextValue = 'inboundEndpoint';
			explorerEntry.command = {
				"title": "Show Inbound Endpoint",
				"command": COMMANDS.SHOW_INBOUND_ENDPOINT,
				"arguments": [vscode.Uri.file(entry.path), undefined, false]
			};
		} else if (entry.type === 'DATA_SERVICE') {
			explorerEntry = new ProjectExplorerEntry(
				entry.name.replace(".xml", ""),
				isCollapsibleState(false),
				entry,
				"data-service"
			);
			explorerEntry.contextValue = 'data-service';
			explorerEntry.command = {
				title: "Show Data Service",
				command: COMMANDS.OPEN_DSS_SERVICE_DESIGNER,
				arguments: [vscode.Uri.file(entry.path)]
			};
		}
		else {
			if (entry.name) {
				explorerEntry = new ProjectExplorerEntry(entry.name.replace(".xml", ""), isCollapsibleState(false), entry, 'code', true);
			}
		}

		result.push(explorerEntry);
	}

	return result;
}

export function getViewCommand(endpointType?: string) {
	let viewCommand = COMMANDS.SHOW_TEMPLATE;
	if (endpointType === 'HTTP_ENDPOINT') {
		viewCommand = COMMANDS.SHOW_HTTP_ENDPOINT;
	} else if (endpointType === 'ADDRESS_ENDPOINT') {
		viewCommand = COMMANDS.SHOW_ADDRESS_ENDPOINT;
	} else if (endpointType === 'WSDL_ENDPOINT') {
		viewCommand = COMMANDS.SHOW_WSDL_ENDPOINT;
	} else if (endpointType === 'DEFAULT_ENDPOINT') {
		viewCommand = COMMANDS.SHOW_DEFAULT_ENDPOINT;
	} else if (endpointType === 'LOAD_BALANCE_ENDPOINT') {
		viewCommand = COMMANDS.SHOW_LOAD_BALANCE_ENDPOINT;
	} else if (endpointType === 'FAIL_OVER_ENDPOINT') {
		viewCommand = COMMANDS.SHOW_FAILOVER_ENDPOINT;
	} else if (endpointType === 'RECIPIENT_LIST_ENDPOINT') {
		viewCommand = COMMANDS.SHOW_RECIPIENT_ENDPOINT;
	} else if (endpointType === 'TEMPLATE_ENDPOINT') {
		viewCommand = COMMANDS.SHOW_TEMPLATE_ENDPOINT;
	} else if (endpointType === 'SEQUENCE') {
		viewCommand = COMMANDS.SHOW_SEQUENCE_TEMPLATE_VIEW;
	}
	return viewCommand;
}
