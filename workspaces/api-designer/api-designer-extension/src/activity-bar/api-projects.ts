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
import * as path from 'path';
import { isSupportedOpenApiDocument } from '@wso2/api-designer-core';

class OpenAPIFileNode extends vscode.TreeItem {
    constructor(public readonly uri: vscode.Uri) {
        super(path.basename(uri.fsPath), vscode.TreeItemCollapsibleState.Collapsed);
        this.resourceUri = uri;
        this.iconPath = new vscode.ThemeIcon('file-code');
        this.tooltip = uri.fsPath;
        this.contextValue = 'apiDesigner.openApiProject';
        this.description = path.dirname(path.relative(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '', uri.fsPath));
        this.command = {
            command: "APIDesigner.openApiDesigner",
            title: 'Open API',
            arguments: [uri]
        };
    }
}

class CategoryNode extends vscode.TreeItem {
    public readonly parentFileUri?: vscode.Uri;
    
    constructor(
        public readonly label: string,
        public readonly category: 'create' | 'design' | 'analyze' | 'mock' | 'test' | 'document' | 'manage',
        public readonly fileUri: vscode.Uri
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        // Only store parent reference if it's not the create view
        if (category !== 'create') {
            this.parentFileUri = fileUri;
        }
        this.contextValue = `apiDesigner.category.${category}`;
        this.iconPath = this.getCategoryIcon(category);
        this.tooltip = `Open ${label} view`;
        
        // All categories open the unified API preview panel with appropriate viewType
        const viewTypeMap: Record<string, string> = {
            'create': 'create',
            'design': 'design',
            'analyze': 'analyze',
            'mock': 'mock',
            'test': 'test',
            'document': 'document',
            'manage': 'manage'
        };
        
        const viewType = viewTypeMap[category] || 'design';
        
        // For 'create' view, don't pass fileUri (it's undefined)
        if (category === 'create') {
            this.command = {
                command: "APIDesigner.openApiDesigner",
                title: `Open ${label}`,
                arguments: [undefined, viewType]
            };
        } else {
            this.command = {
                command: "APIDesigner.openApiDesigner",
                title: `Open ${label}`,
                arguments: [fileUri, viewType]
            };
        }
    }

    private getCategoryIcon(category: string): vscode.ThemeIcon {
        const iconMap: Record<string, string> = {
            'design': 'wand',
            'analyze': 'graph',
            'mock': 'beaker',
            'test': 'pass',
            'document': 'book',
            'manage': 'gear'
        };
        return new vscode.ThemeIcon(iconMap[category] || 'folder');
    }

    private getCategoryIntent(category: string): string {
        const intentMap: Record<string, string> = {
            'analyze': 'governance',
            'mock': 'mocking',
            'test': 'testing',
            'document': 'documentation',
            'manage': 'manage'
        };
        return intentMap[category] || 'overview';
    }
}

type ApiProjectNode = OpenAPIFileNode | CategoryNode;

class ApiProjectsTreeProvider implements vscode.TreeDataProvider<ApiProjectNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<ApiProjectNode | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    private watchers: vscode.FileSystemWatcher[] = [];
    private workspaceDisposables: vscode.Disposable[] = [];
    private refreshDebounceTimer: ReturnType<typeof setTimeout> | undefined;
    private fileNodeMap = new Map<string, OpenAPIFileNode>(); // Cache file nodes by URI
    /** Stable CategoryNode instances per file so TreeView.reveal() can match the live tree */
    private categoryNodesByFile = new Map<string, CategoryNode[]>();

    constructor() {
        // Watch for file changes (native watcher; may miss some tool-created files)
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.{yaml,yml,json}', false, false, false);
        watcher.onDidCreate(() => this.scheduleRefresh());
        watcher.onDidChange(() => this.scheduleRefresh());
        watcher.onDidDelete(() => this.scheduleRefresh());
        this.watchers.push(watcher);

        // Backup: new files from Copilot / extensions often surface here reliably
        this.workspaceDisposables.push(
            vscode.workspace.onDidCreateFiles(() => this.scheduleRefresh())
        );
        // Saving YAML/JSON after generation should refresh the tree even if create events were missed
        this.workspaceDisposables.push(
            vscode.workspace.onDidSaveTextDocument((doc) => {
                if (/\.(yaml|yml|json)$/i.test(doc.uri.fsPath)) {
                    this.scheduleRefresh();
                }
            })
        );
    }

    private scheduleRefresh(): void {
        if (this.refreshDebounceTimer !== undefined) {
            clearTimeout(this.refreshDebounceTimer);
        }
        this.refreshDebounceTimer = setTimeout(() => {
            this.refreshDebounceTimer = undefined;
            this.refresh();
        }, 400);
    }

    dispose(): void {
        if (this.refreshDebounceTimer !== undefined) {
            clearTimeout(this.refreshDebounceTimer);
            this.refreshDebounceTimer = undefined;
        }
        this.watchers.forEach(w => w.dispose());
        this.workspaceDisposables.forEach(d => d.dispose());
        this.workspaceDisposables = [];
    }

    refresh(): void {
        // Clear the cache when refreshing
        this.fileNodeMap.clear();
        this.categoryNodesByFile.clear();
        this._onDidChangeTreeData.fire(undefined);
    }

    /** After getChildren(undefined), returns the cached file node for reveal/sync */
    getCachedFileNode(fsPath: string): OpenAPIFileNode | undefined {
        return this.fileNodeMap.get(fsPath);
    }

    getTreeItem(element: ApiProjectNode): vscode.TreeItem {
        return element;
    }

    getParent(element: ApiProjectNode): vscode.ProviderResult<ApiProjectNode> {
        // CategoryNode's parent is the OpenAPIFileNode (except for 'create' which has no parent)
        if (element instanceof CategoryNode) {
            // 'create' category has no parent (it's at root level)
            if (element.category === 'create') {
                return undefined;
            }
            // Return the cached parent OpenAPIFileNode if available, otherwise create a new one
            if (element.parentFileUri) {
                const parentNode = this.fileNodeMap.get(element.parentFileUri.fsPath);
                return parentNode || new OpenAPIFileNode(element.parentFileUri);
            }
        }
        // OpenAPIFileNode is at root level, so it has no parent
        return undefined;
    }

    async getChildren(element?: ApiProjectNode): Promise<ApiProjectNode[]> {
        if (!element) {
            // Root level - show OpenAPI files
            const files = await this.findOpenAPIFiles();
            
            if (files.length === 0) {
                // Return empty array to show viewsWelcome
                return [];
            }

            // Create and cache file nodes
            return files.map(uri => {
                const node = new OpenAPIFileNode(uri);
                this.fileNodeMap.set(uri.fsPath, node);
                return node;
            });
        }

        if (element instanceof OpenAPIFileNode) {
            const key = element.uri.fsPath;
            let categories = this.categoryNodesByFile.get(key);
            if (!categories) {
                categories = [
                    new CategoryNode('Design', 'design', element.uri),
                    new CategoryNode('Analyze', 'analyze', element.uri),
                    new CategoryNode('Mock', 'mock', element.uri),
                    new CategoryNode('Test', 'test', element.uri),
                    new CategoryNode('Document', 'document', element.uri),
                    new CategoryNode('Manage', 'manage', element.uri)
                ];
                this.categoryNodesByFile.set(key, categories);
            }
            return categories;
        }

        return [];
    }

    private async findOpenAPIFiles(): Promise<vscode.Uri[]> {
        if (!vscode.workspace.workspaceFolders) {
            return [];
        }

        const files: vscode.Uri[] = [];

        for (const folder of vscode.workspace.workspaceFolders) {
            const pattern = new vscode.RelativePattern(folder, '**/*.{yaml,yml,json}');
            const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');

            for (const uri of uris) {
                if (await this.isOpenAPIFile(uri)) {
                    files.push(uri);
                }
            }
        }

        return files.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
    }

    private async isOpenAPIFile(uri: vscode.Uri): Promise<boolean> {
        try {
            const bytes = await vscode.workspace.fs.readFile(uri);
            const text = Buffer.from(bytes).toString('utf8');
            return isSupportedOpenApiDocument(text);
        } catch (error) {
            return false;
        }
    }
}

let apiProjectsTreeView: vscode.TreeView<ApiProjectNode> | undefined;
let apiProjectsProvider: ApiProjectsTreeProvider | undefined;

type TreeCategory = CategoryNode['category'];

function panelViewTypeToTreeCategory(viewType: string): TreeCategory | null {
    const v = (viewType || '').toLowerCase();
    if (v === 'preview' || v === 'design') {
        return 'design';
    }
    if (v === 'analyze' || v === 'mock' || v === 'test' || v === 'document' || v === 'manage') {
        return v;
    }
    return null;
}

/**
 * Highlights the activity bar tree item (Design / Analyze / …) that matches the open API Designer panel.
 */
export async function syncApiDesignerTreeSelection(
    fileUri: vscode.Uri | undefined,
    viewType: string,
    options?: { focusSelection?: boolean }
): Promise<void> {
    if (!apiProjectsTreeView || !apiProjectsProvider || !fileUri) {
        return;
    }
    const category = panelViewTypeToTreeCategory(viewType);
    if (!category) {
        return;
    }

    try {
        await apiProjectsProvider.getChildren();
        const fileNode = apiProjectsProvider.getCachedFileNode(fileUri.fsPath);
        if (!fileNode) {
            return;
        }

        await apiProjectsTreeView.reveal(fileNode, { expand: true, focus: false, select: false });

        const categoryNodes = await apiProjectsProvider.getChildren(fileNode);
        const target = categoryNodes.find(
            (n): n is CategoryNode => n instanceof CategoryNode && n.category === category
        );
        if (target) {
            await apiProjectsTreeView.reveal(target, {
                expand: false,
                focus: options?.focusSelection ?? false,
                select: true
            });
        }
    } catch (err) {
        console.error('syncApiDesignerTreeSelection:', err);
    }
}

export function registerApiProjects(context: vscode.ExtensionContext): void {
    const provider = new ApiProjectsTreeProvider();
    apiProjectsProvider = provider;
    
    const treeView = vscode.window.createTreeView('apiDesignerProjects', {
        treeDataProvider: provider
    });
    apiProjectsTreeView = treeView;
    
    context.subscriptions.push(
        provider,
        treeView,
        vscode.commands.registerCommand('api-designer.refreshApiProjects', () => provider.refresh())
    );
}
