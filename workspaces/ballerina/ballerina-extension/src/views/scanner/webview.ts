import * as vscode from 'vscode';
import * as path from 'path';
import { extension } from '../../BalExtensionContext';
import { getComposerWebViewOptions, getLibraryWebViewContent, WebViewOptions } from '../../utils/webview-utils';
import { RPCLayer } from '../../RPCLayer';
import { isScannerConfigEnabled, isScannerVersionSupported, scannerState } from '../../features/scanner/scan-utils';


export class ScannerWebview {
    public static currentPanel: ScannerWebview | undefined;
    public static readonly viewType = 'ballerina.scanner-panel';
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];

    private _mode?: string;

    private constructor(mode?: string) {
        this._mode = mode;
        this._panel = ScannerWebview.createWebview();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this.getWebviewContent(this._panel.webview);
        
        // Attach RPC Layer so the React app can communicate with the extension
        RPCLayer.create(this._panel);
    }

    public static show(mode?: string): ScannerWebview {
        const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;

        if (ScannerWebview.currentPanel) {
            ScannerWebview.currentPanel._mode = mode;
            ScannerWebview.currentPanel.update();
            ScannerWebview.currentPanel._panel?.reveal(column);
            return ScannerWebview.currentPanel;
        }

        ScannerWebview.currentPanel = new ScannerWebview(mode);
        return ScannerWebview.currentPanel;
    }

    public update(): void {
        if (this._panel) {
            this._panel.webview.html = this.getWebviewContent(this._panel.webview);
        }
    }

    private static createWebview(): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            ScannerWebview.viewType,
            "Scanner",
            vscode.ViewColumn.Beside, // Ensures it opens on the right side
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(extension.context.extensionPath, 'resources'))],
                retainContextWhenHidden: true,
            }
        );
        
        panel.iconPath = {
            light: vscode.Uri.file(path.join(extension.context.extensionPath, 'resources', 'icons', 'shield-light.svg')),
            dark: vscode.Uri.file(path.join(extension.context.extensionPath, 'resources', 'icons', 'shield-dark.svg'))
        };

        return panel;
    }

    public getWebview(): vscode.WebviewPanel | undefined {
        return this._panel;
    }

    private getWebviewContent(webView: vscode.Webview): string {
        const scannerEnabled = isScannerConfigEnabled();
        const scannerVersionSupported = isScannerVersionSupported();
        const currentScannerState = scannerState();
        const activeEditorUri = vscode.window.activeTextEditor?.document.uri;
        const activeWorkspaceFolder = activeEditorUri ? vscode.workspace.getWorkspaceFolder(activeEditorUri) : undefined;
        const fallbackWorkspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const projectPath = activeWorkspaceFolder?.uri.fsPath || fallbackWorkspaceFolder?.uri.fsPath || "";
        const body = `<div class="container" id="webview-container">
                <div class="loader-wrapper">
                    <div class="loader" /></div>
                </div>
            </div>`;
        const bodyCss = ``;
        const styles = `
            .container {
                background-color: var(--vscode-editor-background);
                height: 100vh;
                width: 100%;
            }
            .loader-wrapper {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
                width: 100%;
            }
            .loader {
                width: 32px;
                aspect-ratio: 1;
                border-radius: 50%;
                border: 4px solid var(--vscode-button-background);
                animation:
                    l20-1 0.8s infinite linear alternate,
                    l20-2 1.6s infinite linear;
            }
            @keyframes l20-1{
                0%    {clip-path: polygon(50% 50%,0       0,  50%   0%,  50%    0%, 50%    0%, 50%    0%, 50%    0% )}
                12.5% {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100%   0%, 100%   0%, 100%   0% )}
                25%   {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100% 100%, 100% 100%, 100% 100% )}
                50%   {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100% 100%, 50%  100%, 0%   100% )}
                62.5% {clip-path: polygon(50% 50%,100%    0, 100%   0%,  100%   0%, 100% 100%, 50%  100%, 0%   100% )}
                75%   {clip-path: polygon(50% 50%,100% 100%, 100% 100%,  100% 100%, 100% 100%, 50%  100%, 0%   100% )}
                100%  {clip-path: polygon(50% 50%,50%  100%,  50% 100%,   50% 100%,  50% 100%, 50%  100%, 0%   100% )}
            }
            @keyframes l20-2{ 
                0%    {transform:scaleY(1)  rotate(0deg)}
                49.99%{transform:scaleY(1)  rotate(135deg)}
                50%   {transform:scaleY(-1) rotate(0deg)}
                100%  {transform:scaleY(-1) rotate(-135deg)}
            }
        `;
        const safeCurrentScannerState = JSON.stringify(currentScannerState)
            .replace(/</g, '\\u003c')
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');
        const safeProjectPath = JSON.stringify(projectPath)
            .replace(/</g, '\\u003c')
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');

        const scripts = `
            function loadedScript() {
                function renderDiagrams() {
                    window.__SCANNER_ENABLED__ = ${scannerEnabled};
                    window.__SCANNER_VERSION_SUPPORTED__ = ${scannerVersionSupported};
                    window.__SCANNER_STATE__ = ${safeCurrentScannerState};
                    window.__SCANNER_PROJECT_PATH__ = ${safeProjectPath};
                    window.__SCANNER_DEPLOY_MODE__ = ${this._mode === 'deploy'};
                    visualizerWebview.renderWebview("scanner", document.getElementById("webview-container"));
                }
                renderDiagrams();
            }
        `;

        const webViewOptions: WebViewOptions = {
            ...getComposerWebViewOptions("Visualizer", webView),
            body,
            scripts,
            styles,
            bodyCss,
        };

        return getLibraryWebViewContent(webViewOptions, webView);
    }

    public dispose() {
        ScannerWebview.currentPanel = undefined;
        this._panel?.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }

        this._panel = undefined;
    }
}
