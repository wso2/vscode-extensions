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
import { window, Uri, commands } from 'vscode';
import path = require('path');
import { DIRECTORY_MAP, ProjectStructureArtifactResponse, ProjectStructureResponse, SHARED_COMMANDS, BI_COMMANDS, PackageConfigSchema, BallerinaProject } from "@wso2/ballerina-core";
import { extension } from "../biExtentionContext";

interface Property {
    name?: string;
    type: string;
    additionalProperties?: { type: string };
    properties?: {};
    required?: string[];
    description?: string;
    items?: Property;
}
export class ProjectExplorerEntry extends vscode.TreeItem {
    children: ProjectExplorerEntry[] | undefined;
    info: string | undefined;

    constructor(
        public readonly label: string,
        public collapsibleState: vscode.TreeItemCollapsibleState,
        info: string | undefined = undefined,
        icon: string = 'folder',
        isCodicon: boolean = false
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}`;
        this.info = info;
        if (icon && isCodicon) {
            this.iconPath = new vscode.ThemeIcon(icon);
        } else if (icon) {
            this.iconPath = {
                light: vscode.Uri.file(path.join(extension.context.extensionPath, 'assets', `light-${icon}.svg`)),
                dark: vscode.Uri.file(path.join(extension.context.extensionPath, 'assets', `dark-${icon}.svg`))
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

    refresh(): void {
        window.withProgress({
            location: { viewId: BI_COMMANDS.PROJECT_EXPLORER },
            title: 'Loading project structure'
        }, async () => {
            try {
                const data = await getProjectStructureData();
                this._data = data;
                // Fire the event after data is fully populated
                this._onDidChangeTreeData.fire();
            } catch (err) {
                console.error(err);
                this._data = [];
                this._onDidChangeTreeData.fire();
            }
        });
    }

    constructor() {
        this._data = [];
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
        if (element.info === undefined) return undefined;

        const projects = (this._data);
        for (const project of projects) {
            if (project.children?.find(child => child.info === element.info)) {
                return project;
            }
            const fileElement = this.recursiveSearchParent(project, element.info);
            if (fileElement) {
                return fileElement;
            }
        }
        return element;
    }

    recursiveSearchParent(element: ProjectExplorerEntry, path: string): ProjectExplorerEntry | undefined {
        if (!element.children) {
            return undefined;
        }
        for (const child of element.children) {
            if (child.info === path) {
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
        if (extension.langClient && extension.projectPath) {
            const workspace = vscode
                .workspace
                .workspaceFolders
                .find(folder => folder.uri.fsPath === extension.projectPath);

            if (!workspace) {
                return [];
            }

            // Get the state context from ballerina extension as it maintain the event driven tree data
            let projectStructure;
            const stateContext = await commands.executeCommand(SHARED_COMMANDS.GET_STATE_CONTEXT);
            if (typeof stateContext === 'object' && stateContext !== null && 'projectStructure' in stateContext && stateContext.projectStructure !== null) {
                projectStructure = stateContext.projectStructure;
                const projectTree = generateTreeData(workspace, projectStructure);
                if (projectTree) {
                    data.push(projectTree);
                }
            }

            return data;
        }
    }
    return [];
}

function generateTreeData(project: vscode.WorkspaceFolder, components: ProjectStructureResponse): ProjectExplorerEntry | undefined {
    const projectRootPath = project.uri.fsPath;
    const projectRootEntry = new ProjectExplorerEntry(
        `${project.name}`,
        vscode.TreeItemCollapsibleState.Expanded,
        projectRootPath,
        'project',
        true
    );
    projectRootEntry.contextValue = 'bi-project';
    const children = getEntriesBI(components);
    projectRootEntry.children = children;

    return projectRootEntry;
}

function getEntriesBI(components: ProjectStructureResponse): ProjectExplorerEntry[] {
    const entries: ProjectExplorerEntry[] = [];

    // ---------- Entry Points ----------
    const entryPoints = new ProjectExplorerEntry(
        "Entry Points",
        vscode.TreeItemCollapsibleState.Expanded,
        null,
        'start',
        false
    );
    entryPoints.contextValue = "entryPoint";
    entryPoints.children = [];
    if (components.directoryMap[DIRECTORY_MAP.AUTOMATION].length > 0) {
        entryPoints.children.push(...getComponents(components.directoryMap[DIRECTORY_MAP.AUTOMATION], DIRECTORY_MAP.AUTOMATION));
    }
    entryPoints.children.push(...getComponents(components.directoryMap[DIRECTORY_MAP.SERVICE], DIRECTORY_MAP.SERVICE));
    if (entryPoints.children.length > 0) {
        entryPoints.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }
    entries.push(entryPoints);

    // ---------- Listeners ----------
    const listeners = new ProjectExplorerEntry(
        "Listeners",
        vscode.TreeItemCollapsibleState.Expanded,
        null,
        'radio',
        false
    );
    listeners.contextValue = "listeners";
    listeners.children = getComponents(components.directoryMap[DIRECTORY_MAP.LISTENER], DIRECTORY_MAP.LISTENER);
    if (listeners.children.length > 0) {
        listeners.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }
    entries.push(listeners);

    // ---------- Connections ----------
    const connections = new ProjectExplorerEntry(
        "Connections",
        vscode.TreeItemCollapsibleState.Expanded,
        null,
        'connection',
        false
    );
    connections.contextValue = "connections";
    connections.children = getComponents(components.directoryMap[DIRECTORY_MAP.CONNECTION], DIRECTORY_MAP.CONNECTION);
    if (connections.children.length > 0) {
        connections.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }
    entries.push(connections);

    // ---------- Types ----------
    const types = new ProjectExplorerEntry(
        "Types",
        vscode.TreeItemCollapsibleState.Expanded,
        null,
        'type',
        false
    );
    types.contextValue = "types";
    types.children = getComponents([
        ...components.directoryMap[DIRECTORY_MAP.TYPE]
    ], DIRECTORY_MAP.TYPE);
    if (types.children.length > 0) {
        types.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }
    entries.push(types);

    // ---------- Functions ----------
    const functions = new ProjectExplorerEntry(
        "Functions",
        vscode.TreeItemCollapsibleState.Expanded,
        null,
        'function',
        false
    );
    functions.contextValue = "functions";
    functions.children = getComponents(components.directoryMap[DIRECTORY_MAP.FUNCTION], DIRECTORY_MAP.FUNCTION);
    if (functions.children.length > 0) {
        functions.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }
    entries.push(functions);

    // ---------- Data Mappers ----------
    const dataMappers = new ProjectExplorerEntry(
        "Data Mappers",
        vscode.TreeItemCollapsibleState.Expanded,
        null,
        'dataMapper',
        false
    );
    dataMappers.contextValue = "dataMappers";
    dataMappers.children = getComponents(components.directoryMap[DIRECTORY_MAP.DATA_MAPPER], DIRECTORY_MAP.DATA_MAPPER);
    if (dataMappers.children.length > 0) {
        dataMappers.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }
    entries.push(dataMappers);

    // ---------- Natural Functions ----------
    if (extension.isNPSupported) {
        const naturalFunctions = new ProjectExplorerEntry(
            "Natural Functions",
            vscode.TreeItemCollapsibleState.Expanded,
            null,
            'function',
            false
        );
        naturalFunctions.contextValue = "naturalFunctions";
        naturalFunctions.children = getComponents(components.directoryMap[DIRECTORY_MAP.NP_FUNCTION], DIRECTORY_MAP.NP_FUNCTION);
        if (naturalFunctions.children.length > 0) {
            naturalFunctions.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        }
        entries.push(naturalFunctions);
    }

    // ---------- Local Connectors ----------
    const localConnectors = new ProjectExplorerEntry(
        "Local Connectors",
        vscode.TreeItemCollapsibleState.Expanded,
        null,
        'connection',
        false
    );
    localConnectors.contextValue = "localConnectors";
    localConnectors.children = getComponents(components.directoryMap[DIRECTORY_MAP.LOCAL_CONNECTORS], DIRECTORY_MAP.CONNECTOR);
    if (localConnectors.children.length > 0) {
        localConnectors.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }
    entries.push(localConnectors);

    return entries;
}

function getComponents(items: ProjectStructureArtifactResponse[], itemType: DIRECTORY_MAP): ProjectExplorerEntry[] {
    if (!items) {
        return [];
    }
    const entries: ProjectExplorerEntry[] = [];
    const resetHistory = true;
    for (const comp of items) {
        if (comp.type !== itemType) {
            continue;
        }
        const fileEntry = new ProjectExplorerEntry(
            comp.name,
            vscode.TreeItemCollapsibleState.None,
            comp.path,
            comp.icon
        );
        fileEntry.command = {
            "title": "Visualize",
            "command": SHARED_COMMANDS.SHOW_VISUALIZER,
            "arguments": [comp.path, comp.position, resetHistory]
        };
        fileEntry.contextValue = itemType;
        fileEntry.tooltip = comp.context;
        // Get the children for services only
        if (itemType === DIRECTORY_MAP.SERVICE) {
            const resourceFunctions = getComponents(comp.resources, DIRECTORY_MAP.RESOURCE);
            const remoteFunctions = getComponents(comp.resources, DIRECTORY_MAP.REMOTE);
            fileEntry.children = [...resourceFunctions, ...remoteFunctions];
            if (fileEntry.children.length > 0) {
                fileEntry.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
            }
        }
        entries.push(fileEntry);
    }
    return entries;
}

