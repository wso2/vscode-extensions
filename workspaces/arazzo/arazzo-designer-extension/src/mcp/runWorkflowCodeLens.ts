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
import { isMCPServerRunning, getMCPActiveFilePath } from './mcpServerRunner';

/**
 * CodeLens provider that shows a "▶ Run" lens above each workflow
 * definition in an Arazzo YAML file, but ONLY when the MCP server
 * is currently running.
 */
export class RunWorkflowCodeLensProvider implements vscode.CodeLensProvider {

    private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    /**
     * Call this to force a refresh of the Code Lenses (e.g. when the
     * MCP server starts or stops).
     */
    public refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }

    provideCodeLenses(
        document: vscode.TextDocument,
        _token: vscode.CancellationToken
    ): vscode.CodeLens[] {
        // Only show Run lenses when the MCP server is active AND it is
        // serving this exact file (workflows from other files are not exposed).
        if (!isMCPServerRunning()) {
            return [];
        }
        const activeFile = getMCPActiveFilePath();
        if (!activeFile || document.uri.fsPath !== activeFile) {
            return [];
        }

        const lenses: vscode.CodeLens[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        // We need to find each "- workflowId:" entry under the top-level
        // "workflows:" key.  A simple line-by-line scan is sufficient for
        // YAML files that follow the Arazzo spec structure.
        let inWorkflows = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Detect the top-level "workflows:" key (no leading whitespace,
            // or only minimal whitespace that is still a top-level key).
            if (/^workflows\s*:/.test(line)) {
                inWorkflows = true;
                continue;
            }

            // If we hit another top-level key, stop scanning workflows
            if (inWorkflows && /^\S/.test(line) && !/^\s*-/.test(line) && !/^\s*#/.test(line) && line.trim() !== '') {
                inWorkflows = false;
            }

            if (!inWorkflows) {
                continue;
            }

            // Match "- workflowId: <id>" (list item) or "workflowId: <id>"
            const match = line.match(/^\s*-?\s*workflowId\s*:\s*(.+)/);
            if (match) {
                const workflowId = match[1].trim().replace(/^['"]|['"]$/g, '');
                const range = new vscode.Range(i, 0, i, line.length);

                lenses.push(new vscode.CodeLens(range, {
                    title: '▶ Run',
                    command: 'arazzo.runWorkflow',
                    arguments: [{
                        workflowId,
                        uri: document.uri.toString()
                    }]
                }));
            }
        }

        return lenses;
    }
}
