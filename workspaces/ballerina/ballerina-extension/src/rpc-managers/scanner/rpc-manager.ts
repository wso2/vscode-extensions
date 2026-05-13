/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { 
    ScannerAPI,
    RevealSecurityIssueRequest, 
    ExcludeIssueRequest, 
    DisableRuleRequest,
    IncludeIssueRequest,
    EnableRuleRequest,
    FixIssueRequest,
    ScanRequest,
    ScanResponse,
    ScannerExclusionContext,
    BaseResponse,
    AddExclusionResponse,
    AddGlobalExclusionResponse,
    includeIssueResponse,
    enableRuleResponse,
} from "@wso2/ballerina-core";
import {
    mapRawScanResponse,
    getScannerOutputChannel,
    withTimeout,
    isScannerActive,
    isScannerConfigEnabled,
    isScannerVersionSupported,
    pullOrUpdateScannerTool,
    DEFAULT_SCAN_TIMEOUT_MS,
} from '../../features/scanner/scan-utils';
import { openAIPanelWithPrompt } from "../../views/ai-panel/aiMachine";
import { StateMachine } from '../../stateMachine';

// LS endpoint method names
const SCANNER_LS_METHODS = {
    getVulnerabilities: "scanner/getVulnerabilities",
    addExclusion: "scanner/addExclusion",
    addGlobalExclusion: "scanner/addGlobalExclusion",
    includeIssue: "scanner/removeExclusion",
    enableRule: "scanner/removeGlobalExclusion",
} as const;

/**
 * Extracts a human-readable error message from a BaseResponse.
 * Checks `errorMsg` first (standard LS error field), then `error`.
 */
function getResponseError(response: BaseResponse | undefined | null): string | undefined {
    if (!response) { return 'No response received from Language Server.'; }

    // Per BaseResponse contract, `success` is authoritative when present.
    // If success === true, treat as no error. If success === false, show the LS-provided
    // message if available (errorMsg or error), otherwise fall back to a generic message.
    if (response.success === true) {
        return undefined;
    }

    if (response.success === false) {
        return response.errorMsg || response.error || 'Operation failed.';
    }

    // If `success` is not provided, fall back to explicit error fields.
    if (response.errorMsg) { return response.errorMsg; }
    if (response.error) { return response.error; }

    return undefined;
}

/**
 * Returns true if the BaseResponse indicates an error.
 */
function hasResponseError(response: BaseResponse | undefined | null): boolean {
    if (!response) { return true; }

    // If `success` is explicitly provided, obey it.
    if (response.success === true) { return false; }
    if (response.success === false) { return true; }

    // Otherwise, treat presence of error fields as an error.
    return !!response.errorMsg || !!response.error;
}

function showResponseError(response: BaseResponse | undefined | null, fallbackMessage: string): boolean {
    const errorMessage = getResponseError(response) || fallbackMessage;
    if (!errorMessage) {
        return false;
    }

    vscode.window.showErrorMessage(errorMessage);
    return true;
}

export class ScannerRpcManager implements ScannerAPI {

    /**
     * Resolves a standard file URI string for Language Server requests.
     * Takes an input object and attempts to derive the URI by checking `documentUri`,
     * then `filePath` and falls back to the active text editor's document or workspace folder root.
     * 
     * @param input An object containing either a `documentUri` or a `filePath`.
     * @returns A valid file URI string.
     */
    private resolveDocumentUri(input: { documentUri?: string; filePath?: string }): string {
        if (input.documentUri) {
            return input.documentUri;
        }

        if (input.filePath) {
            if (input.filePath.startsWith('file:')) {
                return input.filePath;
            }

            const absolutePath = path.isAbsolute(input.filePath)
                ? input.filePath
                : path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', input.filePath);
            return vscode.Uri.file(absolutePath).toString();
        }

        return vscode.window.activeTextEditor?.document.uri.toString()
            || vscode.workspace.workspaceFolders?.[0]?.uri.toString()
            || '';
    }

    /**
     * Opens the required file in the editor, focuses the cursor on the exact line and column
     * where the security issue resides, and triggers the entity diagram visualizer alongside it.
     * 
     * @param params An object containing the issue information and file path.
     */
    async revealSecurityIssue(params: RevealSecurityIssueRequest): Promise<void> {
        if (!isScannerActive()) {
            return;
        }

        try {
            let absolutePath = params.filePath;
            if (!path.isAbsolute(absolutePath)) {
                if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                    absolutePath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, absolutePath);
                } else {
                    console.error("[Scanner] Cannot resolve relative path: No workspace open.");
                    return;
                }
            }
            const fileUri = vscode.Uri.file(absolutePath);

            const doc = await vscode.workspace.openTextDocument(fileUri);
            const editor = await vscode.window.showTextDocument(doc, {
                preserveFocus: false, 
                preview: false,
                viewColumn: vscode.ViewColumn.One
            });

            const startLine = params.issue.startLine || 0;
            const startCol = params.issue.startColumn || 0;
            const endLine = params.issue.endLine || startLine;
            const endCol = params.issue.endColumn || startCol;
            const range = new vscode.Range(startLine, startCol, endLine, endCol);

            editor.selection = new vscode.Selection(range.start, range.end);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

            const enclosingPosition = this.findEnclosingArtifactPosition(absolutePath, startLine, endLine);
            const visualizerPosition = enclosingPosition || {
                startLine,
                startColumn: startCol,
                endLine,
                endColumn: endCol
            };

            await vscode.commands.executeCommand('ballerina.showVisualizer', fileUri, visualizerPosition);
            await vscode.commands.executeCommand('ballerina.view.entityDiagram', fileUri);

        } catch (error) {
            console.error("[Scanner] Failed to reveal issue:", error);
            vscode.window.showErrorMessage(`Could not open file: ${params.filePath}`);
        }
    }

    /**
     * Determines the smallest enclosing entity around a specific
     * block of code, primarily used to show focused architectural diagrams.
     * 
     * @param filePath The absolute path of the specific source file.
     * @param issueStartLine The starting line number of the security issue.
     * @param issueEndLine The ending line number of the security issue.
     * @returns The position range object for the matched entity, if one is found.
     */
    private findEnclosingArtifactPosition(filePath: string, issueStartLine: number, issueEndLine: number)
    : { startLine: number; startColumn: number; endLine: number; endColumn: number } | undefined {
        const projectStructure = StateMachine.context().projectStructure;
        if (!projectStructure?.projects) {
            return undefined;
        }

        let bestMatch: { position: any; rangeSize: number } | undefined;

        for (const project of projectStructure.projects) {
            if (!project.directoryMap) { continue; }

            for (const artifacts of Object.values(project.directoryMap)) {
                for (const artifact of artifacts) {
                    if (artifact.resources?.length) {
                        for (const resource of artifact.resources) {
                            const pos = resource.position;
                            if (resource.path === filePath && pos &&
                                issueStartLine >= pos.startLine && issueEndLine <= pos.endLine) {
                                const size = pos.endLine - pos.startLine;
                                if (!bestMatch || size < bestMatch.rangeSize) {
                                    bestMatch = { position: pos, rangeSize: size };
                                }
                            }
                        }
                    }
                    const pos = artifact.position;
                    if (artifact.path === filePath && pos &&
                        issueStartLine >= pos.startLine && issueEndLine <= pos.endLine) {
                        const size = pos.endLine - pos.startLine;
                        if (!bestMatch || size < bestMatch.rangeSize) {
                            bestMatch = { position: pos, rangeSize: size };
                        }
                    }
                }
            }
        }

        return bestMatch?.position;
    }

    /**
     * Executes the `scanner/addExclusion` RPC call with the Ballerina Language Server to skip
     * checking a specific rule on a exact specific line. 
     * 
     * @param params A structured object dictating which rule to ignore, what line it is on, and its location.
     */
    async excludeIssue(params: ExcludeIssueRequest): Promise<boolean> {
        if (!isScannerActive()) { return false; }

        const client = StateMachine.langClient();
        if (!client) {
            vscode.window.showErrorMessage("Ballerina Language Server is not ready. Unable to add exclusion.");
            return false;
        }

        try {
            let absolutePath = params.filePath;
            if (!path.isAbsolute(absolutePath) && vscode.workspace.workspaceFolders?.length) {
                absolutePath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, params.filePath);
            }

            const documentUri = params.filePath.startsWith('file:')
                ? params.filePath
                : vscode.Uri.file(absolutePath).toString();

            const response = await withTimeout(
                client.sendRequest<AddExclusionResponse>(SCANNER_LS_METHODS.addExclusion, {
                    ruleId: params.ruleId,
                    documentUri,
                    lineNumber: params.issue.startLine ?? 0,
                    offline: false,
                    sticky: false,
                    skipTests: false
                }),
                DEFAULT_SCAN_TIMEOUT_MS,
                `LS 'addExclusion' timed out after ${DEFAULT_SCAN_TIMEOUT_MS}ms.`
            );

            if (hasResponseError(response)) {
                showResponseError(response, "Failed to add exclusion.");
                return false;
            }

            return true;
        } catch (error) {
            console.error("[Scanner] Failed to add exclusion:", error);
            vscode.window.showErrorMessage(`Failed to add exclusion: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    /**
     * Appends a given rule ID to the scanner configuration as a global exclusion across the whole project.
     * Executes the `scanner/addGlobalExclusion` operation on the Language Server.
     * 
     * @param params Defines the target rule ID and document URI for global deactivation.
     */
    async disableRule(params: DisableRuleRequest): Promise<boolean> {
        if (!isScannerActive()) { return false; }

        const client = StateMachine.langClient();
        if (!client) {
            vscode.window.showErrorMessage("Ballerina Language Server is not ready. Unable to add global exclusion.");
            return false;
        }

        try {
            const documentUri = this.resolveDocumentUri(params as DisableRuleRequest & { filePath?: string });
            if (!documentUri) {
                vscode.window.showErrorMessage("No document found to resolve project root for global exclusion.");
                return false;
            }

            const response = await withTimeout(
                client.sendRequest<AddGlobalExclusionResponse>(SCANNER_LS_METHODS.addGlobalExclusion, {
                    ruleId: params.ruleId,
                    documentUri
                }),
                DEFAULT_SCAN_TIMEOUT_MS,
                `LS 'addGlobalExclusion' timed out after ${DEFAULT_SCAN_TIMEOUT_MS}ms.`
            );

            if (hasResponseError(response)) {
                showResponseError(response, "Failed to add global exclusion.");
                return false;
            }

            return true;
        } catch (error) {
            console.error("[Scanner] Failed to add global exclusion:", error);
            vscode.window.showErrorMessage(`Failed to add global exclusion: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    /**
     * Attempts to eliminate a defined rule exception via the `scanner/removeExclusion`
     * RPC endpoint using line properties and symbols to cleanly remove specific ignored issues.
     * 
     * @param params Expected to contain structural details like ruleId, lineHash, and symbol.
     */
    async includeIssue(params: IncludeIssueRequest): Promise<boolean> {
        if (!isScannerActive()) { return false; }

        const client = StateMachine.langClient();
        if (!client) {
            vscode.window.showErrorMessage("Ballerina Language Server is not ready. Unable to remove exclusion.");
            return false;
        }

        try {
            const legacyParams = params as IncludeIssueRequest & { filePath?: string };
            const documentUri = this.resolveDocumentUri(legacyParams);
            if (!documentUri) {
                vscode.window.showErrorMessage("No document found to resolve project root for exclusion removal.");
                return false;
            }

            if (!params.symbol || !params.lineHash) {
                vscode.window.showErrorMessage("Missing symbol or line hash. Unable to remove exclusion.");
                return false;
            }

            const response = await withTimeout(
                client.sendRequest<includeIssueResponse>(SCANNER_LS_METHODS.includeIssue, {
                    ruleId: params.ruleId,
                    documentUri,
                    symbol: params.symbol,
                    lineHash: params.lineHash,
                }),
                DEFAULT_SCAN_TIMEOUT_MS,
                `LS 'includeIssue' timed out after ${DEFAULT_SCAN_TIMEOUT_MS}ms.`
            );

            if (hasResponseError(response)) {
                showResponseError(response, "Failed to remove exclusion.");
                return false;
            }

            return true;
        } catch (error) {
            console.error("[Scanner] Failed to remove exclusion:", error);
            vscode.window.showErrorMessage(`Failed to remove exclusion: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    /**
     * Resolves the Language Server action `scanner/removeGlobalExclusion`.
     * Strips away global exclusion statuses and fully applies the given
     * rule identification over the codebase structure.
     * 
     * @param params Defines the target rule ID that must be enabled across the project.
     */
    async enableRule(params: EnableRuleRequest): Promise<boolean> {
        if (!isScannerActive()) { return false; }

        const client = StateMachine.langClient();
        if (!client) {
            vscode.window.showErrorMessage("Ballerina Language Server is not ready. Unable to remove global exclusion.");
            return false;
        }

        try {
            const legacyParams = params as EnableRuleRequest & { filePath?: string };
            const documentUri = this.resolveDocumentUri(legacyParams);
            if (!documentUri) {
                vscode.window.showErrorMessage("No document found to resolve project root for global exclusion removal.");
                return false;
            }

            const response = await withTimeout(
                client.sendRequest<enableRuleResponse>(SCANNER_LS_METHODS.enableRule, {
                    ruleId: params.ruleId,
                    documentUri,
                }),
                DEFAULT_SCAN_TIMEOUT_MS,
                `LS 'enableRule' timed out after ${DEFAULT_SCAN_TIMEOUT_MS}ms.`
            );

            if (hasResponseError(response)) {
                showResponseError(response, "Failed to remove global exclusion.");
                return false;
            }

            return true;
        } catch (error) {
            console.error("[Scanner] Failed to remove global exclusion:", error);
            vscode.window.showErrorMessage(`Failed to remove global exclusion: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    /**
     * Crafts a prompt mapping the multiple reported issues directly to Copilot's prompt
     * and forces an immediate submission to auto-start the resolution and analysis stage.
     * 
     * @param params Expected to contain an array of complex file/rule-related findings.
     */
    async fixIssueWithCopilot(params: FixIssueRequest): Promise<void> {
        if (!params.issues || params.issues.length === 0 || !isScannerActive()) {
            return;
        }

        try {
            const formattedIssues = params.issues.map((issue, index) => {
                const packageInfo = issue.packageName ? `[Package: ${issue.packageName}] ` : "";
                let issueStr = `### Issue ${index + 1}: ${issue.ruleId}\n` +
                       `- **Location:** ${packageInfo}\`${issue.filePath}\` (Lines ${issue.startLine}-${issue.endLine})\n` +
                       `- **Description:** ${issue.message}`;
                
                if (issue.hint) {
                    issueStr += `\n- **Hint:** ${issue.hint}`;
                }
                
                return issueStr;
            }).join('\n\n');

            const count = params.issues.length;
            const prompt = `I ran a security scan and detected ${count} ${count === 1 ? "vulnerability" : "vulnerabilities"} in my Ballerina code.\n\n` +
                `Here are the details:\n\n` +
                `${formattedIssues}\n\n` +
                `For each issue, please explain the vulnerability and provide the corrected, secure Ballerina code.`;

            openAIPanelWithPrompt({
                type: 'text',
                text: prompt,
                planMode: false,
                autoSubmit: true,
            });
        } catch (error) {
            console.error("[Scanner] Failed to open AI panel:", error);
            vscode.window.showErrorMessage(`Failed to open AI fix panel: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Reaches out to the Ballerina Language Server via `scanner/getVulnerabilities`
     * and performs a static codebase security scan.
     * 
     * @param params Indicates target limits like document root URLs or project paths required to do the scan.
     * @returns A mapped object including both identified vulnerabilities and correctly labeled excluded issues.
     */
    async pullScannerTool(): Promise<boolean> {
        return await pullOrUpdateScannerTool();
    }

    async scanProject(params: ScanRequest): Promise<ScanResponse> {
        if (!isScannerConfigEnabled()) {
            return { success: false, activeIssues: [], excludedIssues: [], errorMsg: "Scanner is disabled via settings." };
        }
        if (!isScannerVersionSupported()) {
            const errorMsg = "Ballerina Security Scanner requires the 'scan' tool version > 0.11.0. Please update your tool by running 'bal tool pull scan'.";
            vscode.window.showErrorMessage(errorMsg);
            return { success: false, activeIssues: [], excludedIssues: [], errorMsg };
        }
        
        const client = StateMachine.langClient();
        if (!client) {
            return { success: false, activeIssues: [], excludedIssues: [], errorMsg: "Language Client not ready." };
        }

        let uri: vscode.Uri | undefined;
        if (params.projectPath) {
            uri = vscode.Uri.file(params.projectPath);
        } else {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'ballerina') {
                const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
                if (workspaceFolder) { uri = workspaceFolder.uri; }
            }
            if (!uri && vscode.workspace.workspaceFolders?.[0]) {
                uri = vscode.workspace.workspaceFolders[0].uri;
            }
        }

        if (!uri) {
            getScannerOutputChannel().appendLine(`[ERROR] [SCAN] Could not determine project root.`);
            return { success: false, activeIssues: [], excludedIssues: [], errorMsg: "Could not determine project root." };
        }

        getScannerOutputChannel().appendLine(`[INFO] [SCAN] Start: ${uri.fsPath}`);

        try {
            const rawResponse = await withTimeout(
                client.sendRequest<ScanResponse>(SCANNER_LS_METHODS.getVulnerabilities, {
                    documentUri: uri.toString(),
                    publishDiagnostics: false
                }),
                DEFAULT_SCAN_TIMEOUT_MS,
                `LS 'getVulnerabilities' timed out after ${DEFAULT_SCAN_TIMEOUT_MS}ms.`
            );

            // Check for LS-level errors from BaseResponse
            const lsError = getResponseError(rawResponse);
            if (lsError) {
                getScannerOutputChannel().appendLine(`[ERROR] [SCAN] Failed: ${lsError}`);
                // Show a visible VS Code notification for scan failures reported by the Language Server.
                try {
                    vscode.window.showErrorMessage(lsError);
                } catch (e) {
                    // swallow UI errors and continue returning the ScanResponse
                    console.error("[Scanner] Failed to show error message:", e);
                }

                return {
                    success: false,
                    activeIssues: [],
                    excludedIssues: [],
                    errorMsg: lsError,
                    stackTrace: rawResponse?.stackTrace,
                };
            }

            const result = mapRawScanResponse(rawResponse);

            // Enrich exclusions with isGlobalExclusion flag
            const enrichedExclusions: ScannerExclusionContext[] = result.excludedIssues.map(exclusion => {
                const isGlobalExclusion = exclusion.isGlobalExclusion
                    ?? (!exclusion.symbol || !exclusion.lineHash);
                return { ...exclusion, isGlobalExclusion };
            });

            getScannerOutputChannel().appendLine(`[INFO] [SCAN] Completed: active=${result.activeIssues?.length ?? 0}, excluded=${enrichedExclusions.length}`);

            return {
                success: true,
                activeIssues: result.activeIssues,
                excludedIssues: enrichedExclusions,
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const timedOut = /timed out/i.test(errorMessage);
            getScannerOutputChannel().appendLine(`[ERROR] [SCAN] Exception: ${errorMessage}`);
            return {
                success: false,
                activeIssues: [],
                excludedIssues: [],
                errorMsg: errorMessage,
                timedOut,
            } as ScanResponse;
        }
    }
}
