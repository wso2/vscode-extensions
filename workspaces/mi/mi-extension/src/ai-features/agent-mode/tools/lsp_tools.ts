/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { ADD_CONNECTOR_TOOL_NAME, ToolResult } from './types';
import { MILanguageClient } from '../../../lang-client/activator';
import * as path from 'path';
import * as fs from 'fs';
import { Uri } from 'vscode';
import { logDebug, logError } from '../../copilot/logger';
import { getProviderCacheControl } from '../../connection';

// ============================================================================
// Execute Function Types
// ============================================================================

export type ValidateCodeExecuteFn = (args: {
    file_paths: string[];
}) => Promise<ToolResult>;

// ============================================================================
// Execute Functions
// ============================================================================

/**
 * Creates the execute function for validate_code tool
 */
export function createValidateCodeExecute(projectPath: string): ValidateCodeExecuteFn {
    return async (args: { file_paths: string[] }): Promise<ToolResult> => {
        const { file_paths } = args;

        logDebug(`[ValidateCodeTool] Validating ${file_paths.length} file(s)`);

        if (file_paths.length === 0) {
            return {
                success: false,
                message: 'At least one file path must be provided.',
                error: 'Error: No file paths provided'
            };
        }

        try {
            const langClient = await MILanguageClient.getInstance(projectPath);
            if (!langClient) {
                return {
                    success: false,
                    message: 'Language client not available',
                    error: 'Error: Language client not initialized'
                };
            }

            const results: Array<{
                file: string;
                diagnostics: any[];
                hasErrors: boolean;
                hasWarnings: boolean;
            }> = [];

            // Validate each file
            for (const filePath of file_paths) {
                try {
                    // Resolve relative paths against project path
                    const absolutePath = path.isAbsolute(filePath)
                        ? filePath
                        : path.join(projectPath, filePath);

                    // Check if file exists
                    if (!fs.existsSync(absolutePath)) {
                        results.push({
                            file: filePath,
                            diagnostics: [{
                                severity: 1, // Error
                                message: 'File not found',
                                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
                            }],
                            hasErrors: true,
                            hasWarnings: false
                        });
                        continue;
                    }

                    logDebug(`[ValidateCodeTool] Validating file: ${absolutePath}`);

                    // Get diagnostics from language server
                    const diagnosticsResponse = await langClient.getCodeDiagnostics({
                        fileName: absolutePath,
                        code: fs.readFileSync(absolutePath, 'utf8')
                    });

                    logDebug(`[ValidateCodeTool] Diagnostics response: ${JSON.stringify(diagnosticsResponse)}`);

                    const diagnostics = diagnosticsResponse.diagnostics || [];
                    const hasErrors = diagnostics.some((d: any) => d.severity === 1);
                    const hasWarnings = diagnostics.some((d: any) => d.severity === 2);

                    // Fetch code actions for each diagnostic
                    const diagnosticsWithActions = await Promise.all(
                        diagnostics.map(async (diagnostic: any) => {
                            try {
                                const codeActions = await langClient.getCodeActions({
                                    textDocument: { uri: Uri.file(absolutePath).toString() },
                                    range: diagnostic.range,
                                    context: {
                                        diagnostics: [diagnostic],
                                        only: ['quickfix']
                                    }
                                });

                                return {
                                    ...diagnostic,
                                    codeActions: codeActions || []
                                };
                            } catch (error) {
                                logDebug(`[ValidateCodeTool] Failed to get code actions for diagnostic: ${error}`);
                                return {
                                    ...diagnostic,
                                    codeActions: []
                                };
                            }
                        })
                    );

                    results.push({
                        file: filePath,
                        diagnostics: diagnosticsWithActions,
                        hasErrors,
                        hasWarnings
                    });

                    logDebug(`[ValidateCodeTool] Diagnostics with actions: ${JSON.stringify(diagnosticsWithActions)}`);
                } catch (error) {
                    results.push({
                        file: filePath,
                        diagnostics: [{
                            severity: 1,
                            message: error instanceof Error ? error.message : String(error),
                            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
                        }],
                        hasErrors: true,
                        hasWarnings: false
                    });
                }
            }

            // Build response message
            const filesWithErrors = results.filter(r => r.hasErrors);
            const filesWithWarnings = results.filter(r => r.hasWarnings && !r.hasErrors);
            const filesClean = results.filter(r => !r.hasErrors && !r.hasWarnings);

            let message = '';

            if (filesClean.length > 0) {
                message += `✓ ${filesClean.length} file(s) validated successfully with no issues:\n`;
                filesClean.forEach(r => {
                    message += `  - ${r.file}\n`;
                });
            }

            if (filesWithWarnings.length > 0) {
                message += `\n⚠ ${filesWithWarnings.length} file(s) have warnings:\n`;
                filesWithWarnings.forEach(r => {
                    message += `  - ${r.file}: ${r.diagnostics.length} warning(s)\n`;
                    r.diagnostics.forEach((d: any, idx: number) => {
                        if (idx < 3) { // Show first 3 warnings
                            message += `    • Line ${d.range?.start?.line || 0}: ${d.message}\n`;
                            // Show available code actions/fixes
                            if (d.codeActions && d.codeActions.length > 0) {
                                message += `      Available fixes:\n`;
                                d.codeActions.forEach((action: any) => {
                                    message += `        - ${action.title}\n`;
                                });
                            }
                        }
                    });
                    if (r.diagnostics.length > 3) {
                        message += `    ... and ${r.diagnostics.length - 3} more\n`;
                    }
                });
            }

            if (filesWithErrors.length > 0) {
                message += `\n✗ ${filesWithErrors.length} file(s) have errors:\n`;
                filesWithErrors.forEach(r => {
                    const errorDiagnostics = r.diagnostics.filter((d: any) => d.severity === 1);
                    message += `  - ${r.file}: ${errorDiagnostics.length} error(s)\n`;
                    errorDiagnostics.forEach((d: any, idx: number) => {
                        if (idx < 3) { // Show first 3 errors
                            message += `    • Line ${d.range?.start?.line || 0}: ${d.message}\n`;
                            // Show available code actions/fixes
                            if (d.codeActions && d.codeActions.length > 0) {
                                message += `      Available fixes:\n`;
                                d.codeActions.forEach((action: any) => {
                                    message += `        - ${action.title}\n`;
                                });
                            }
                        }
                    });
                    if (errorDiagnostics.length > 3) {
                        message += `    ... and ${errorDiagnostics.length - 3} more\n`;
                    }
                });
            }

            logDebug(`[ValidateCodeTool] Validation complete: ${filesClean.length} clean, ${filesWithWarnings.length} warnings, ${filesWithErrors.length} errors`);
            logDebug(`[ValidateCodeTool] Message: ${message}`);

            return {
                success: true,
                message: message.trim()
            };
        } catch (error) {
            logError(`[ValidateCodeTool] Error validating files: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                message: 'Failed to validate files',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    };
}

// ============================================================================
// Tool Definitions (Vercel AI SDK format)
// ============================================================================

const validateCodeInputSchema = z.object({
    file_paths: z.array(z.string())
        .min(1)
        .describe('Array of file paths to validate (relative to project root or absolute paths). Example: ["src/main/wso2mi/artifacts/apis/MyAPI.xml"]'),
});

/**
 * Creates the validate_code tool
 */
export function createValidateCodeTool(execute: ValidateCodeExecuteFn) {
    return (tool as any)({
        description: `
            Validates Synapse XML configuration files using the Extended LemMinx XML Language Server for Synapse.

            This tool:
            - Checks XML syntax and structure
            - Validates against Synapse schema and Synapse Expressions.
            - Reports errors and warnings with line numbers
            - Provides available LSP quick fixes for each diagnostic
            - Works with any Synapse artifact type (API, Sequence, Endpoint, etc.)

            Usage:
            - Use this tool after creating or editing Synapse XML files
            - Validates multiple files in a single call
            - Returns detailed diagnostics with available fixes for each file

            When to use:
            - After using file_write or file_edit tools
            - Before completing a task to ensure code quality
            - When the user requests validation
            - To check for errors in existing files
            - To see what automatic fixes are available for errors

            Important:
            - Ensure required connectors are added before validating files that use them using ${ADD_CONNECTOR_TOOL_NAME}
            - Available fixes are provided by the LemMinx LSP and show what can be auto-corrected`,
        inputSchema: validateCodeInputSchema,
        providerOptions: getProviderCacheControl(),
        execute
    });
}
