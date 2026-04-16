/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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

import * as fs from 'fs';
import { Uri } from 'vscode';
import { MILanguageClient } from '../../../lang-client/activator';
import { logDebug, logError } from '../../copilot/logger';
import { ValidationDiagnostics, DiagnosticInfo } from './types';

// ============================================================================
// Shared Validation Utilities
// ============================================================================

/**
 * Validates a single XML file and returns structured diagnostic information
 *
 * @param absolutePath - Absolute path to the file
 * @param projectPath - Project root path
 * @param includeCodeActions - Whether to fetch LSP code actions for diagnostics
 * @returns ValidationDiagnostics object or null if validation not performed
 */
export async function validateXmlFile(
    absolutePath: string,
    projectPath: string,
    includeCodeActions: boolean = false
): Promise<ValidationDiagnostics | null> {
    // Only validate XML files
    if (!absolutePath.toLowerCase().endsWith('.xml')) {
        return null;
    }

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
        logError(`[ValidationUtils] File not found: ${absolutePath}`);
        return null;
    }

    try {
        const langClient = await MILanguageClient.getInstance(projectPath);
        if (!langClient) {
            logDebug('[ValidationUtils] Language client not available, skipping validation');
            return null;
        }

        // Get diagnostics from language server
        const diagnosticsResponse = await langClient.getCodeDiagnostics({
            fileName: absolutePath,
            code: fs.readFileSync(absolutePath, 'utf8')
        });

        const lspDiagnostics = diagnosticsResponse.diagnostics || [];

        // Convert LSP diagnostics to our format
        const diagnostics: DiagnosticInfo[] = await Promise.all(
            lspDiagnostics.map(async (d: any) => {
                const diagnostic: DiagnosticInfo = {
                    severity: d.severity === 1 ? 'error' as const : d.severity === 2 ? 'warning' as const : 'info' as const,
                    line: (d.range?.start?.line || 0) + 1, // Convert 0-indexed LSP line to 1-indexed
                    message: d.message
                };

                // Optionally fetch code actions (LSP quick fixes)
                if (includeCodeActions) {
                    try {
                        const codeActions = await langClient.getCodeActions({
                            textDocument: { uri: Uri.file(absolutePath).toString() },
                            range: d.range,
                            context: {
                                diagnostics: [d],
                                only: ['quickfix']
                            }
                        });

                        if (codeActions && codeActions.length > 0) {
                            diagnostic.codeActions = codeActions.map((action: any) => action.title);
                        }
                    } catch (error) {
                        logDebug(`[ValidationUtils] Failed to get code actions: ${error}`);
                    }
                }

                return diagnostic;
            })
        );

        const errors = diagnostics.filter(d => d.severity === 'error');
        const warnings = diagnostics.filter(d => d.severity === 'warning');

        return {
            validated: true,
            hasErrors: errors.length > 0,
            hasWarnings: warnings.length > 0,
            errorCount: errors.length,
            warningCount: warnings.length,
            diagnostics: diagnostics
        };
    } catch (error) {
        logError(`[ValidationUtils] Error validating file: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Formats validation diagnostics into a human-readable message
 *
 * @param validation - ValidationDiagnostics object
 * @param maxIssuesPerSeverity - Maximum number of issues to show per severity level
 * @returns Formatted message string
 */
export function formatValidationMessage(
    validation: ValidationDiagnostics,
    maxIssuesPerSeverity: number = 3
): string {
    if (!validation.validated) {
        return '';
    }

    if (validation.diagnostics.length === 0) {
        return '\n\n✓ Validation: No issues found.';
    }

    let message = '\n\nValidation results:';

    // Format errors
    if (validation.hasErrors) {
        const errors = validation.diagnostics.filter(d => d.severity === 'error');
        message += `\n✗ ${validation.errorCount} error(s):`;

        errors.slice(0, maxIssuesPerSeverity).forEach((d) => {
            message += `\n  • Line ${d.line}: ${d.message}`;

            // Show available code actions/fixes if present
            if (d.codeActions && d.codeActions.length > 0) {
                message += `\n    Available fixes:`;
                d.codeActions.forEach((action) => {
                    message += `\n      - ${action}`;
                });
            }
        });

        if (errors.length > maxIssuesPerSeverity) {
            message += `\n  ... and ${errors.length - maxIssuesPerSeverity} more error(s)`;
        }
    }

    // Format warnings
    if (validation.hasWarnings) {
        const warnings = validation.diagnostics.filter(d => d.severity === 'warning');
        message += `\n⚠ ${validation.warningCount} warning(s):`;

        warnings.slice(0, maxIssuesPerSeverity).forEach((d) => {
            message += `\n  • Line ${d.line}: ${d.message}`;

            // Show available code actions/fixes if present
            if (d.codeActions && d.codeActions.length > 0) {
                message += `\n    Available fixes:`;
                d.codeActions.forEach((action) => {
                    message += `\n      - ${action}`;
                });
            }
        });

        if (warnings.length > maxIssuesPerSeverity) {
            message += `\n  ... and ${warnings.length - maxIssuesPerSeverity} more warning(s)`;
        }
    }

    return message;
}
