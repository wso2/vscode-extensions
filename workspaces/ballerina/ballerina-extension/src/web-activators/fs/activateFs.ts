import * as vscode from "vscode";
import { LANGUAGE, ballerinaExtInstance } from "../../core/extension";
import { BalFileSystemProvider } from "./BalFileSystemProvider";

export const WEB_IDE_SCHEME = "web-bala";
export const STD_LIB_SCHEME = "bala";
const fsProvider = new BalFileSystemProvider();

export function activateFileSystemProvider() {
    // Register fs provider
    ballerinaExtInstance.fsProvider = fsProvider;
    ballerinaExtInstance.context.subscriptions.push(
        vscode.workspace.registerFileSystemProvider(WEB_IDE_SCHEME, fsProvider, { isReadonly: false }),
        vscode.workspace.registerFileSystemProvider(STD_LIB_SCHEME, fsProvider, { isReadonly: true })
    );

    // Register the command to open a github repository
    ballerinaExtInstance.context.subscriptions.push(
        vscode.commands.registerCommand("ballerina.openGithubRepository", async () => {
            // const repoUrl = await vscode.window.showInputBox({ placeHolder: 'Enter repository URL' });
            const repoUrl = "https://github.com/ChathuraIshara/post-intergration";
            if (!repoUrl) {
                return;
            }
            const repoInfo = extractGitHubRepoInfo(repoUrl);
            if (!repoInfo) {
                vscode.window.showErrorMessage("Invalid repository URL");
                return;
            }
            vscode.workspace.updateWorkspaceFolders(
                vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0,
                0,
                {
                    uri: vscode.Uri.parse(`${WEB_IDE_SCHEME}:/${repoInfo.username}/${repoInfo.repo}`),
                    name: `${repoInfo.username}/${repoInfo.repo}`,
                }
            );
            vscode.window.showInformationMessage("Cloning the repository...");
        })
    );

    // Delete folder in the fs while removing folder from the workspace
    vscode.workspace.onDidChangeWorkspaceFolders((event) => {
        if (event.removed.length > 0) {
            for (const folder of event.removed) {
                if (folder.uri.scheme === WEB_IDE_SCHEME) {
                    fsProvider.delete(folder.uri);
                }
            }
        }
    });

    // Track active ballerina text file
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor && vscode.window.visibleTextEditors.length === 0) {
            ballerinaExtInstance.activeBalFileUri = undefined;
        }
        if (editor && editor.document.languageId === LANGUAGE.BALLERINA) {
            ballerinaExtInstance.activeBalFileUri = editor.document.uri.toString();
        }
        if (editor && editor.document.languageId !== LANGUAGE.BALLERINA) {
            ballerinaExtInstance.activeBalFileUri = undefined;
        }
    });
}

function extractGitHubRepoInfo(url: string): { username: string; repo: string } | null {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?$/);
    return match ? { username: match[1], repo: match[2].replace(".git", "") } : null;
}
