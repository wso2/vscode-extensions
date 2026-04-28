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
import { validateApiSpec, validateWithSpectralRuleset } from '../utils/validation-utils';
import { logError, logDebug } from '../util/logger';
import { loadYaml } from '@wso2/api-designer-core';
import { GovernanceManager } from '../rpc-managers/api-designer-visualizer/managers/governance-manager';

type LanguageModelToolResultLike = { [key: string]: unknown };
type VSCodeLMCompat = typeof vscode & {
    lm?: { registerTool: (id: string, tool: unknown) => vscode.Disposable };
    LanguageModelToolResult?: new (parts: unknown[]) => LanguageModelToolResultLike;
    LanguageModelTextPart?: new (text: string) => unknown;
};
const vscodeLM = vscode as VSCodeLMCompat;

const makeToolResult = (text: string): LanguageModelToolResultLike => {
    if (vscodeLM.LanguageModelToolResult && vscodeLM.LanguageModelTextPart) {
        return new vscodeLM.LanguageModelToolResult([
            new vscodeLM.LanguageModelTextPart(text)
        ]);
    }

    return { content: [{ type: 'text', value: text }] };
};

/**
 * Tool for validating OpenAPI specifications
 */
export class ValidateAPISpecTool {
    async invoke(
        options: any,
        _token: vscode.CancellationToken
    ): Promise<LanguageModelToolResultLike> {
        try {
            let spec: string | object | undefined = options.input.apiSpec;

            // If fileUri provided, read file content
            if (options.input.fileUri) {
                const uri = vscode.Uri.parse(options.input.fileUri);
                const content = await vscode.workspace.fs.readFile(uri);
                const contentString = Buffer.from(content).toString('utf-8');
                
                // Try to parse as YAML/JSON, otherwise use as string
                try {
                    spec = loadYaml(contentString) as string | object;
                } catch {
                    spec = contentString;
                }
            }

            if (!spec) {
                return makeToolResult('Error: No API specification provided. Please provide either apiSpec or fileUri.');
            }

            // Directly import and use existing function
            const result = await validateApiSpec(spec);

            // Format result as readable text
            const resultText = `Validation Results:
- Valid: ${result.isValid}
- Errors: ${result.errorCount}
- Warnings: ${result.warningCount}

${result.errorCount > 0 ? `\nErrors:\n${result.errors.map((e: any) => `  - ${e.message} (at /${e.path.join('/')})`).join('\n')}` : ''}
${result.warningCount > 0 ? `\nWarnings:\n${result.warnings.map((w: any) => `  - ${w.message} (at /${w.path.join('/')})`).join('\n')}` : ''}

Full details:
\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\``;

            return makeToolResult(resultText);
        } catch (error) {
            logError('Error in ValidateAPISpecTool:', error);
            return makeToolResult(`Error validating API specification: ${(error as Error).message}`);
        }
    }

    async prepareInvocation(
        options: any,
        _token: vscode.CancellationToken
    ) {
        const source = options.input.fileUri 
            ? `file: ${options.input.fileUri}`
            : options.input.apiSpec 
                ? 'provided specification'
                : 'unknown source';

        return {
            invocationMessage: `Validating API specification from ${source}`,
        };
    }
}

/**
 * Parameters for validateWithSpectralRuleset tool
 */
interface IvalidateWithSpectralRulesetParameters {
    apiSpec?: string;
    fileUri?: string; // Optional: if provided, read from file
    rulesetName: string;
    fileUrl: string;
    rulesetContentPath: string;
    gitRootPath?: string;
    authToken?: string;
}

/**
 * Tool for validating OpenAPI specifications against custom dynamic rulesets
 */
export class validateWithSpectralRulesetTool {
    async invoke(
        options: any,
        _token: vscode.CancellationToken
    ): Promise<LanguageModelToolResultLike> {
        try {
            let spec: string | undefined = options.input.apiSpec;

            // If fileUri provided, read file content
            if (options.input.fileUri) {
                const uri = vscode.Uri.parse(options.input.fileUri);
                const content = await vscode.workspace.fs.readFile(uri);
                spec = Buffer.from(content).toString('utf-8');
            }

            if (!spec) {
                return makeToolResult('Error: No API specification provided. Please provide either apiSpec or fileUri.');
            }

            // Directly import and use existing function
            const result = await validateWithSpectralRuleset(
                spec,
                options.input.rulesetName,
                options.input.fileUrl,
                options.input.rulesetContentPath,
                options.input.gitRootPath,
                options.input.authToken
            );

            // Format result as readable text
            const resultText = `Validation Results (Ruleset: ${options.input.rulesetName}):
- Valid: ${result.isValid}
- Total Violations: ${result.violationCount || 0}
- Errors: ${result.errorCount || 0}
- Warnings: ${result.warningCount || 0}
- Info: ${result.infoCount || 0}
- Passed Rules: ${result.passed?.length || 0}

${result.violationCount > 0 ? `\nViolations:\n${JSON.stringify(result.violations || [], null, 2)}` : ''}
${result.passed && result.passed.length > 0 ? `\nPassed Rules:\n${result.passed.map((r: any) => `  - ${r.name || r.code || 'Unknown'}`).join('\n')}` : ''}

Full details:
\`\`\`json
${JSON.stringify(result, null, 2)}
\`\`\``;

            return makeToolResult(resultText);
        } catch (error) {
            logError('Error in validateWithSpectralRulesetTool:', error);
            return makeToolResult(`Error validating with dynamic ruleset: ${(error as Error).message}`);
        }
    }

    async prepareInvocation(
        options: any,
        _token: vscode.CancellationToken
    ) {
        const source = options.input.fileUri 
            ? `file: ${options.input.fileUri}`
            : options.input.apiSpec 
                ? 'provided specification'
                : 'unknown source';

        return {
            invocationMessage: `Validating API specification from ${source} against ruleset: ${options.input.rulesetName}`,
        };
    }
}

/**
 * Tool for opening API Designer from chat
 */
export class OpenInApiDesignerTool {
    async invoke(
        options: any,
        _token: vscode.CancellationToken
    ): Promise<LanguageModelToolResultLike> {
        try {
            const fileUri = typeof options?.input?.fileUri === 'string'
                ? options.input.fileUri
                : undefined;
            const viewType = typeof options?.input?.viewType === 'string'
                ? options.input.viewType
                : undefined;
            const uri = fileUri ? vscode.Uri.parse(fileUri) : undefined;

            await vscode.commands.executeCommand('APIDesigner.openApiDesigner', uri, viewType);

            const target = fileUri || 'active editor';
            const view = viewType || 'default';
            return makeToolResult(`Opened API Designer (${view}) for ${target}.`);
        } catch (error) {
            logError('Error in OpenInApiDesignerTool:', error);
            return makeToolResult(`Error opening API Designer: ${(error as Error).message}`);
        }
    }

    async prepareInvocation(
        options: any,
        _token: vscode.CancellationToken
    ) {
        const source = options?.input?.fileUri
            ? `file: ${options.input.fileUri}`
            : 'active editor';
        const viewType = options?.input?.viewType ? ` (${options.input.viewType})` : '';
        return {
            invocationMessage: `Opening API Designer for ${source}${viewType}`,
        };
    }
}

/**
 * Tool for resolving/removing a specific AI finding from cached report
 */
export class ResolveAIFindingTool {
    async invoke(
        options: any,
        _token: vscode.CancellationToken
    ): Promise<LanguageModelToolResultLike> {
        try {
            const input = options?.input || {};
            const rule = typeof input.rule === 'string' ? input.rule : '';
            if (!rule) {
                return makeToolResult('Error: resolveAIFinding requires "rule".');
            }
            const pathSegments = Array.isArray(input.pathSegments)
                ? input.pathSegments.map((segment: unknown) => String(segment))
                : [];
            const message = typeof input.message === 'string' ? input.message : undefined;
            const payload = { rule, pathSegments, message };
            const filePath = typeof input.filePath === 'string' && input.filePath.trim().length > 0
                ? input.filePath
                : (typeof input.fileUri === 'string' && input.fileUri.trim().length > 0
                    ? vscode.Uri.parse(input.fileUri).fsPath
                    : undefined);
            if (filePath) {
                const governanceManager = new GovernanceManager();
                await governanceManager.resolveAIFindingForFile(filePath, payload);
            } else {
                const panelModule = await import('../visualizer/api-designer-panel');
                const panel = panelModule.ApiDesignerPanel.currentPanel;
                if (!panel || panel.isDisposed()) {
                    return makeToolResult('Error: API Designer panel is not open and no filePath/fileUri was provided.');
                }
                await panel.resolveAIFinding(payload);
            }

            return makeToolResult(`Resolved AI finding in cached report for rule "${rule}".`);
        } catch (error) {
            logError('Error in ResolveAIFindingTool:', error);
            return makeToolResult(`Error resolving AI finding: ${(error as Error).message}`);
        }
    }

    async prepareInvocation(
        options: any,
        _token: vscode.CancellationToken
    ) {
        const rule = options?.input?.rule ? String(options.input.rule) : 'unknown rule';
        return {
            invocationMessage: `Resolving cached AI finding for ${rule}`,
        };
    }
}

/**
 * Register all MCP tools with VS Code Language Model API
 */
export function registerMCPTools(context: vscode.ExtensionContext): void {
    logDebug('Registering MCP tools...');

    if (!vscodeLM.lm) {
        logDebug('Language Model API not available; skipping MCP tool registration');
        return;
    }

    context.subscriptions.push(
        vscodeLM.lm.registerTool('api-designer_validateAPISpec', new ValidateAPISpecTool())
    );

    context.subscriptions.push(
        vscodeLM.lm.registerTool('api-designer_validateWithSpectralRuleset', new validateWithSpectralRulesetTool())
    );

    context.subscriptions.push(
        vscodeLM.lm.registerTool('api-designer_openInApiDesigner', new OpenInApiDesignerTool())
    );

    context.subscriptions.push(
        vscodeLM.lm.registerTool('api-designer_resolveAIFinding', new ResolveAIFindingTool())
    );

    logDebug('MCP tools registered successfully');
}

