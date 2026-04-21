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
import * as fs from 'fs';
import * as os from 'os';
import { logInfo, logError, logDebug } from '../util/logger';

/**
 * Installs API Designer custom agents to the user's VS Code prompts directory
 * so they're available across all workspaces.
 */
export async function installCustomAgents(context: vscode.ExtensionContext): Promise<void> {
    try {
        logInfo('Installing API Designer custom agents...');

        // Get the VS Code User prompts directory path
        const homeDir = os.homedir();
        let promptsPath: string;
        
        if (process.platform === 'darwin') {
            // macOS
            promptsPath = path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'prompts');
        } else if (process.platform === 'win32') {
            // Windows
            promptsPath = path.join(process.env.APPDATA || '', 'Code', 'User', 'prompts');
        } else {
            // Linux
            promptsPath = path.join(homeDir, '.config', 'Code', 'User', 'prompts');
        }

        const agentsDir = vscode.Uri.file(promptsPath);

        // Create the prompts directory if it doesn't exist
        await vscode.workspace.fs.createDirectory(agentsDir);
        logDebug(`Using prompts directory at: ${agentsDir.fsPath}`);

        // Get the extension's agents directory
        const extensionAgentsPath = path.join(context.extensionPath, '/src/ai/agents');
        
        // Check if the agents directory exists in the extension
        if (!fs.existsSync(extensionAgentsPath)) {
            logError(`Extension agents directory not found at: ${extensionAgentsPath}`);
            return;
        }

        // List of agent files to copy
        const agentFiles = [
            'designer.agent.md'
        ];

        let installedCount = 0;
        let skippedCount = 0;

        for (const filename of agentFiles) {
            const sourcePath = path.join(extensionAgentsPath, filename);
            const destUri = vscode.Uri.joinPath(agentsDir, filename);

            // Check if source file exists
            if (!fs.existsSync(sourcePath)) {
                logError(`Agent file not found: ${sourcePath}`);
                continue;
            }

            try {
                // Check if the file already exists
                let shouldCopy = false;
                try {
                    await vscode.workspace.fs.stat(destUri);
                    // File exists, check if we should update it
                    const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
                    const destContent = await vscode.workspace.fs.readFile(destUri);
                    const destContentStr = Buffer.from(destContent).toString('utf-8');
                    
                    // Only copy if content differs
                    if (sourceContent !== destContentStr) {
                        shouldCopy = true;
                    } else {
                        skippedCount++;
                    }
                } catch {
                    // File doesn't exist, need to copy
                    shouldCopy = true;
                }

                if (shouldCopy) {
                    const content = fs.readFileSync(sourcePath);
                    await vscode.workspace.fs.writeFile(destUri, content);
                    installedCount++;
                }
            } catch (error) {
                logError(`Failed to install agent ${filename}: ${error}`);
            }
        }

        if (installedCount > 0) {
            logInfo(`Successfully installed ${installedCount} API Designer custom agent(s)`);
            
            // Show informational message to user
            const message = `API Designer custom agents have been installed! ${installedCount} agent(s) added to your VS Code profile. Restart VS Code to activate them.`;
            const action = await vscode.window.showInformationMessage(
                message,
                'Learn More',
                'Restart Now'
            );

            if (action === 'Learn More') {
                // Open the agents README
                const readmePath = path.join(extensionAgentsPath, 'README.md');
                if (fs.existsSync(readmePath)) {
                    const readmeUri = vscode.Uri.file(readmePath);
                    await vscode.commands.executeCommand('markdown.showPreview', readmeUri);
                }
            } else if (action === 'Restart Now') {
                // Restart VS Code
                await vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        } else if (skippedCount > 0) {
            logInfo(`All ${skippedCount} API Designer custom agents are already up to date`);
        }

    } catch (error) {
        logError(`Failed to install custom agents: ${error}`);
        vscode.window.showErrorMessage(`Failed to install API Designer custom agents: ${error}`);
    }
}

/**
 * Manually reinstall/update custom agents via command
 */
export async function reinstallCustomAgents(context: vscode.ExtensionContext): Promise<void> {
    const choice = await vscode.window.showInformationMessage(
        'This will reinstall API Designer custom agents to your VS Code profile. Continue?',
        'Yes',
        'No'
    );

    if (choice === 'Yes') {
        await installCustomAgents(context);
    }
}

/**
 * Check if custom agents should be installed (first-time activation or update)
 */
export async function checkAndInstallCustomAgents(context: vscode.ExtensionContext): Promise<void> {
    const AGENTS_VERSION_KEY = 'apiDesigner.customAgents.version';
    const CURRENT_VERSION = '1.0.0'; // Increment this when agents are updated

    const installedVersion = context.globalState.get<string>(AGENTS_VERSION_KEY);

    // if (installedVersion !== CURRENT_VERSION) {
    await installCustomAgents(context);
    await context.globalState.update(AGENTS_VERSION_KEY, CURRENT_VERSION);
    // }
}
