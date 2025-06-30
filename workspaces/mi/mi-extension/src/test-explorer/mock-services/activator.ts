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

export const mockSerivesFilesMatchPattern = '**/src/test/resources/mock-services/**/*.xml';

import { TreeDataProvider, Event, EventEmitter, ExtensionContext, TreeItem, TreeItemCollapsibleState, workspace, RelativePattern, window, ThemeIcon, commands } from 'vscode';
import { startWatchingWorkspace } from '../helper';
import path = require('path');
import { COMMANDS } from '../../constants';
import { EVENT_TYPE, MACHINE_VIEW } from '@wso2/mi-core';
import { openView } from '../../stateMachine';
import * as vscode from 'vscode';

export interface MockServiceItem {
    name: string;
    path: string;
    hasChildren?: boolean;
}
class MockServiceTreeProvider implements TreeDataProvider<MockServiceItem> {
    private _onDidChangeTreeData: EventEmitter<MockServiceItem | undefined | void> = new EventEmitter<MockServiceItem | undefined | void>();
    readonly onDidChangeTreeData: Event<MockServiceItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private context: ExtensionContext) {
        startWatchingWorkspace(mockSerivesFilesMatchPattern, this.refresh.bind(this));
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: MockServiceItem): TreeItem {
        if (element.hasChildren) {
            // This is a workspace folder
            return {
                label: element.name,
                collapsibleState: TreeItemCollapsibleState.Expanded,
                iconPath: {
                    light: vscode.Uri.file(path.join(this.context.extensionPath, 'assets', `light-project.svg`)),
                    dark: vscode.Uri.file(path.join(this.context.extensionPath, 'assets', `dark-project.svg`))
                },
                id: element.path,
                contextValue: 'workspace'
            };
        } else {
            // This is a mock service file
            return {
                label: element.name,
                collapsibleState: TreeItemCollapsibleState.None,
                iconPath: new ThemeIcon('notebook-open-as-text'),
                id: element.path,
                contextValue: 'mockService'
            };
        }
    }

    async getChildren(element?: MockServiceItem): Promise<MockServiceItem[]> {
        if (!element) {
            // Return workspace folders as top-level items
            const folders = workspace.workspaceFolders;
            if (!folders) {
                return [];
            }
            return folders.map(folder => ({
                name: folder.name,
                path: folder.uri.fsPath,
                hasChildren: true
            }));
        } else {
            // This is a workspace folder, return its mock service files
            const folder = workspace.workspaceFolders?.find(f => f.uri.fsPath === element.path);
            if (!folder) {
                return [];
            }

            const pattern = new RelativePattern(folder, mockSerivesFilesMatchPattern);
            const files = await workspace.findFiles(pattern);

            return files.map(file => ({
                name: path.basename(file.fsPath).split(".xml")[0],
                path: file.fsPath
            }));
        }
    }

    private async getWorkspaceFolders(): Promise<MockServiceItem[]> {
        const folders = workspace.workspaceFolders;
        if (!folders) {
            return [];
        }

        return folders.map(folder => ({
            name: folder.name,
            path: folder.name // Using name as path for workspace folders to identify them
        }));
    }
}

export function activateMockServiceTreeView(context: ExtensionContext): void {
    const mockServiceTreeProvider = new MockServiceTreeProvider(context);
    context.subscriptions.push(workspace.onDidChangeWorkspaceFolders(() => mockServiceTreeProvider.refresh()));
    context.subscriptions.push(workspace.onDidCreateFiles(() => mockServiceTreeProvider.refresh()));
    context.subscriptions.push(workspace.onDidDeleteFiles(() => mockServiceTreeProvider.refresh()));
    context.subscriptions.push(workspace.onDidRenameFiles(() => mockServiceTreeProvider.refresh()));
    // keep state
    let lastSelectedItem: string | undefined = undefined;
    let lastSelectedAt = Date.now()

    window.createTreeView('MI.mock-services', { treeDataProvider: mockServiceTreeProvider });

    commands.registerCommand(COMMANDS.ADD_MOCK_SERVICE, (args: any) => {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.MockService, projectUri: args.path });
        console.log('Add Mock Service');
    });

    commands.registerCommand(COMMANDS.REFRESH_MOCK_SERVICES, () => {
        mockServiceTreeProvider.refresh();
        console.log('Refresh Mock Services');
    });

    commands.registerCommand(COMMANDS.EDIT_MOCK_SERVICE, (data: any) => {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.MockService, documentUri: data?.path });

        console.log('Update Mock Service');
    });
}
