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
import * as vscode from 'vscode';
import { Uri } from 'vscode';
import { MILanguageClient } from '../../../lang-client/activator';
import { logDebug, logError } from '../../copilot/logger';
import { ValidationDiagnostics, DiagnosticInfo } from './types';

// ============================================================================
// Shared Validation Utilities
// ============================================================================

/**
 * Post-processes LSP diagnostic messages for AI agent consumption.
 * The LS output is shared with other services (design view, UI) so we keep it unchanged there
 * and condense it here for the agent — groups connector operations by prefix, truncates long
 * lists, and strips trailing namespace noise.
 */
function postProcessDiagnosticMessage(message: string): string {
    let result = message;

    // Strip Synapse namespace URIs from error messages (e.g., {"http://ws.apache.org/ns/synapse":log} → 'log')
    result = result.replace(/\{"http:\/\/ws\.apache\.org\/ns\/synapse":([^}]+)\}/g, "'$1'");

    // Strip trailing "Error indicated by:\n {namespace}\nwith code:" noise
    result = result.replace(
        /\n*Error indicated by:\s*\n\s*\{[^}]*\}\s*\nwith code:\s*$/s,
        ''
    );

    // Process "One of the following is expected:" lists (the main source of oversized messages)
    const expectedMatch = result.match(
        /([\s\S]*?One of the following is expected:\n)([\s\S]*)/
    );
    if (!expectedMatch) {
        return result.trim();
    }

    const preamble = expectedMatch[1];
    const listSection = expectedMatch[2];

    const bulletRegex = /^\s*-\s+(.+)$/gm;
    const items: string[] = [];
    let m;
    while ((m = bulletRegex.exec(listSection)) !== null) {
        items.push(m[1].trim());
    }

    if (items.length === 0) {
        return result.trim();
    }

    // Separate connector operations (contain ".") from core mediators
    const coreItems: string[] = [];
    const connectorOps: Map<string, string[]> = new Map();

    for (const item of items) {
        const dotIdx = item.indexOf('.');
        if (dotIdx > 0) {
            const prefix = item.substring(0, dotIdx);
            if (!connectorOps.has(prefix)) {
                connectorOps.set(prefix, []);
            }
            connectorOps.get(prefix)!.push(item);
        } else {
            coreItems.push(item);
        }
    }

    const MAX_CORE_ITEMS = 15;
    const condensed: string[] = [];

    const shownCore = coreItems.slice(0, MAX_CORE_ITEMS);
    for (const item of shownCore) {
        condensed.push(` - ${item}`);
    }
    if (coreItems.length > MAX_CORE_ITEMS) {
        condensed.push(`   ... and ${coreItems.length - MAX_CORE_ITEMS} more core mediators`);
    }

    for (const [prefix, ops] of connectorOps) {
        condensed.push(` - ${prefix}.* (${ops.length} operations)`);
    }

    return (preamble + condensed.join('\n')).trim();
}

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

        // Read file content once (reused for expression validation below)
        const fileContent = fs.readFileSync(absolutePath, 'utf8');

        // Get diagnostics from language server
        const diagnosticsResponse = await langClient.getCodeDiagnostics({
            fileName: absolutePath,
            code: fileContent
        });

        const lspDiagnostics = diagnosticsResponse.diagnostics || [];

        // Convert LSP diagnostics to our format
        const diagnostics: DiagnosticInfo[] = await Promise.all(
            lspDiagnostics.map(async (d: any) => {
                const diagnostic: DiagnosticInfo = {
                    severity: d.severity === 1 ? 'error' as const : d.severity === 2 ? 'warning' as const : 'info' as const,
                    line: (d.range?.start?.line || 0) + 1, // Convert 0-indexed LSP line to 1-indexed
                    message: postProcessDiagnosticMessage(d.message),
                    code: d.code ? String(d.code) : undefined,
                };

                // Optionally fetch code actions (LSP quick fixes)
                // Use VSCode's published diagnostics (from LS's publishDiagnostics) for the context,
                // since code actions require diagnostics that match the LS's internal state.
                // The codeDiagnostic RPC diagnostics don't match — they come from a different code path.
                if (includeCodeActions) {
                    try {
                        const docUri = Uri.file(absolutePath);
                        const vsDiagnostics = vscode.languages.getDiagnostics(docUri);
                        // Find the matching VS Code diagnostic by line and code
                        const matchingVsDiag = vsDiagnostics.find(vd =>
                            vd.range.start.line === (d.range?.start?.line ?? -1) &&
                            String(vd.code) === String(d.code)
                        );

                        if (matchingVsDiag) {
                            const codeActions = await langClient.getCodeActions({
                                textDocument: { uri: docUri.toString() },
                                range: {
                                    start: { line: matchingVsDiag.range.start.line, character: matchingVsDiag.range.start.character },
                                    end: { line: matchingVsDiag.range.end.line, character: matchingVsDiag.range.end.character }
                                },
                                context: {
                                    diagnostics: [{
                                        range: {
                                            start: { line: matchingVsDiag.range.start.line, character: matchingVsDiag.range.start.character },
                                            end: { line: matchingVsDiag.range.end.line, character: matchingVsDiag.range.end.character }
                                        },
                                        message: matchingVsDiag.message,
                                        severity: matchingVsDiag.severity === vscode.DiagnosticSeverity.Error ? 1
                                            : matchingVsDiag.severity === vscode.DiagnosticSeverity.Warning ? 2 : 3,
                                        code: typeof matchingVsDiag.code === 'object' ? String(matchingVsDiag.code.value) : String(matchingVsDiag.code),
                                        source: matchingVsDiag.source,
                                    }],
                                    only: ['quickfix']
                                }
                            });

                            if (codeActions && codeActions.length > 0) {
                                diagnostic.codeActions = codeActions.map((action: any) => action.title);
                            }
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
            message += `\n  • Line ${d.line}:${d.code ? ` [${d.code}]` : ''} ${d.message}`;

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
            message += `\n  • Line ${d.line}:${d.code ? ` [${d.code}]` : ''} ${d.message}`;

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
