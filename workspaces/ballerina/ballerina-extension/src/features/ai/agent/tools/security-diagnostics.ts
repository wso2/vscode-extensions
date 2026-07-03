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

import { tool } from 'ai';
import { z } from 'zod';
import * as path from 'path';
import { promises as fs } from 'fs';
import { DiagnosticEntry, ScanResponse } from '@wso2/ballerina-core';
import { CopilotEventHandler } from "../../utils/events";
import { ScannerRpcManager } from '../../../../rpc-managers/scanner/rpc-manager';
import { isScannerConfigEnabled, isScannerActive, DEFAULT_SCAN_TIMEOUT_MS } from '../../../../features/scanner/scan-utils';
import { SECURITY_RULES } from '../../../../features/scanner/security-rules';

// AGENT-SPECIFIC POLICY RULES
// [        Rule ID        | Auto Fix Enabled | Agent Hint ]
const AGENT_SECURITY_RULE_POLICIES: [string, boolean, string][] = [
    ['ballerina/http:2',        false,       'Apply the fix using configurables (DO NOT HARDCODE values). Create configurable placeholders for allowed CORS origins and tell the user to set values via the WSO2 Integrator Configurable menu. DO NOT ASK the user for raw domain values in chat.'],
    ['ballerina/jwt:1',         false,       'Apply the fix using configurables for JWT signing setup (algorithm, key source, and key material strategy). Create configurable placeholders and tell the user to set values via the WSO2 Integrator Configurable menu. Do not ask the user for key material or raw signing inputs in chat.'],
    ['ballerinax/mysql:1',      false,       'Apply the fix using configurables for database credentials and secret handling. Create configurable placeholders and tell the user to set values via the WSO2 Integrator Configurable menu. Do not ask the user for raw passwords or secrets in chat.'],
];

export const SECURITY_TOOL_NAME = "getSecurityVulnerabilities";
const MAX_ISSUES = 50;

/**
 * Type for the raw response from the ScannerRpcManager with timeout.
 */
type ScanProjectResponseWithMeta = ScanResponse & {
    timedOut?: boolean;
};

/**
 * Extends the core DiagnosticEntry with AI-specific metadata.
 * Allows the agent to provide hints, decide whether to auto-fix,
 * or ask for explicit user input for sensitive configurations.
 */
export interface EnrichedDiagnostic extends DiagnosticEntry {
    hint?: string;
    autoFixEnabled?: boolean;
    requiresExplicitUserInput?: boolean;
    userInputHint?: string;
    skipAutoFixReason?: string;
    filePath?: string;
    startLine?: number;
    startColumn?: number;
    endLine?: number;
    endColumn?: number;
}

/**
 * The final output contract of the tool returned to the UI/Agent.
 */
export interface DiagnosticsCheckResult {
    success: boolean;
    count: number;
    diagnostics: EnrichedDiagnostic[];
    excludedCount?: number;
    timeoutMs?: number;
    scanTargetPath?: string;
    message: string;
}

/**
 * Options to initialize the security tool with workspace or project context.
 */
export interface SecurityToolOptions {
    workspacePath?: string;
    projectPath?: string;
    modifiedFiles?: string[];
}

/**
 * Helper internal interface to map a relative package path to its absolute target path.
 */
interface ScanTargetInfo {
    packagePath: string;
    targetPath: string;
}

function normalizePath(value: string): string {
    return value.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

async function readWorkspacePackagesFromToml(tempProjectPath: string): Promise<string[]> {
    const tomlPath = path.join(tempProjectPath, 'Ballerina.toml');
    try {
        const tomlContent = await fs.readFile(tomlPath, 'utf-8');
        const workspaceBlock = tomlContent.match(/\[workspace\][\s\S]*?packages\s*=\s*\[([\s\S]*?)\]/m);
        if (!workspaceBlock?.[1]) {
            return [];
        }

        const packageMatches = workspaceBlock[1].match(/"([^"]+)"/g) || [];
        return packageMatches
            .map((pkg) => pkg.replace(/"/g, '').trim())
            .filter((pkg) => pkg.length > 0);
    } catch {
        return [];
    }
}

async function resolvePackageScanTargets(
    tempProjectPath: string,
    packagePath: string | undefined,
    options?: SecurityToolOptions
): Promise<ScanTargetInfo[]> {
    const workspacePath = options?.workspacePath;
    const projectPath = options?.projectPath;

    // Explicit package path => single package scan.
    if (packagePath) {
        return [{ packagePath, targetPath: path.join(tempProjectPath, packagePath) }];
    }

    // Workspace project => scan each package one by one.
    if (projectPath && workspacePath) {
        const normalizedProject = normalizePath(projectPath);
        const normalizedWorkspace = normalizePath(workspacePath);
        if (normalizedProject !== normalizedWorkspace) {
            const workspacePackages = await readWorkspacePackagesFromToml(tempProjectPath);
            if (workspacePackages.length > 0) {
                return workspacePackages.map((pkg) => ({
                    packagePath: pkg,
                    targetPath: path.join(tempProjectPath, pkg),
                }));
            }
        }
    }

    // Single-package project fallback.
    return [{ packagePath: '.', targetPath: tempProjectPath }];
}

function isIssueInModifiedFiles(issueFilePath: string, modifiedFiles: string[]): boolean {
    if (!issueFilePath || modifiedFiles.length === 0) {
        return false;
    }

    const normalizedIssuePath = normalizePath(issueFilePath);
    return modifiedFiles.some((file) => {
        const normalizedModifiedPath = normalizePath(file);
        return normalizedModifiedPath.endsWith(`/${normalizedIssuePath}`)
            || normalizedIssuePath.endsWith(`/${normalizedModifiedPath}`)
            || normalizedIssuePath === normalizedModifiedPath;
    });
}

const SecurityInputSchema = z.object({
    packagePath: z.string().optional().describe(
        "Relative path to the package within the workspace project. " +
        "If provided, only that package is scanned. " +
        "If omitted in workspace projects, the tool scans each workspace package one by one."
    )
});

function getIssueLocation(issue: any): {
    filePath: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
} {
    const location = issue.location || {};
    const filePath = issue.filePath || location.filePath || '';
    const startLine = Math.max(0, issue.startLine ?? location.startLine ?? 0);
    const startColumn = Math.max(0, issue.startColumn ?? location.startColumn ?? 0);
    const endLine = Math.max(0, issue.endLine ?? location.endLine ?? startLine);
    const endColumn = Math.max(0, issue.endColumn ?? location.endColumn ?? startColumn);
    return {
        filePath,
        startLine,
        startColumn,
        endLine,
        endColumn,
    };
}

let scanMutex = Promise.resolve();

async function runWithLock<T>(task: () => Promise<T>): Promise<T> {
    const currentMutex = scanMutex;
    let release: () => void;
    const nextMutex = new Promise<void>(resolve => { release = resolve; });
    scanMutex = currentMutex.then(() => nextMutex);

    await currentMutex;
    try {
        return await task();
    } finally {
        release!();
    }
}

/**
 * Creates the security scanning tool.
 */
export function createSecurityTool(
    tempProjectPath: string,
    eventHandler: CopilotEventHandler,
    options?: SecurityToolOptions
) {
    return tool({
        description: `Scans Ballerina code for security issues using static analysis.
        
Use this tool when:
- The user asks to check for security issues, vulnerabilities, code issues, or asks for a scan.

    Scan behavior:
    - Package-only scans are supported by the backend scanner.
    - Pass packagePath to scan a single package.
    - Scans each workspace package one by one. Do not trigger concurrent scans.
    - Scans run against the temporary project copy used by the agent, not the original workspace path.

Returns:
- A list of active issues from the scanner for the target package.
    - Some diagnostics include policy fields such as autoFixEnabled, requiresExplicitUserInput, userInputHint and skipAutoFixReason.
    - STRICT RULE: If autoFixEnabled is false or requiresExplicitUserInput is true, DO NOT attempt to fix the issue automatically under any circumstances. You must wait for the user to explicitly ask you to fix it and provide any required values.
`,
        inputSchema: SecurityInputSchema,

        execute: async ({ packagePath }): Promise<DiagnosticsCheckResult> => {
            eventHandler({
                type: 'tool_call',
                toolName: SECURITY_TOOL_NAME,
            });

            return runWithLock(async () => {
                try {
                    if (!isScannerConfigEnabled()) {
                    const disabledRes: DiagnosticsCheckResult = {
                        count: 0,
                        diagnostics: [],
                        timeoutMs: DEFAULT_SCAN_TIMEOUT_MS,
                        message: "Security scanner is disabled for this package/workspace. Enable `ballerina.scanner.enable` and rerun the scan to verify vulnerabilities.",
                        success: false,
                    };
                    eventHandler({ type: 'tool_result', toolName: SECURITY_TOOL_NAME, toolOutput: disabledRes, failed: true });
                    return disabledRes;
                }

                const scanTargets = await resolvePackageScanTargets(tempProjectPath, packagePath, options);
                const timeoutMs = DEFAULT_SCAN_TIMEOUT_MS;
                const rpcManager = new ScannerRpcManager();

                const allIssues: any[] = [];
                const excludedIssues: any[] = [];
                let dependentPackageIssuesFound = false;

                for (const target of scanTargets) {
                    console.log(
                        `[SecurityTool] Package scan target: ${target.targetPath} (package=${target.packagePath}, timeoutMs=${timeoutMs})`
                    );

                    const scanResponse = await rpcManager.scanProject({ projectPath: target.targetPath }) as ScanProjectResponseWithMeta;
                    const scanError = scanResponse.errorMsg || scanResponse.error;

                    if (scanError) {
                        const failureRes: DiagnosticsCheckResult = {
                            count: 0,
                            diagnostics: [],
                            timeoutMs,
                            scanTargetPath: target.targetPath,
                            message: scanResponse.timedOut
                                ? `Security package scan timed out after ${Math.floor(timeoutMs / 1000)}s for package '${target.packagePath}'.`
                                : `Security package scan failed for package '${target.packagePath}': ${scanError}`,
                            success: false,
                        };
                        eventHandler({ type: 'tool_result', toolName: SECURITY_TOOL_NAME, toolOutput: failureRes, failed: true });
                        return failureRes;
                    }

                    if (scanResponse.dependentPackageIssuesFound) {
                        dependentPackageIssuesFound = true;
                    }

                    allIssues.push(...(scanResponse.activeIssues || []));
                    excludedIssues.push(...(scanResponse.excludedIssues || []));
                }

                const filteredIssues: EnrichedDiagnostic[] = [];
                const modifiedFiles = options?.modifiedFiles ?? [];

                for (const issue of allIssues) {
                    const ruleDef = SECURITY_RULES.find(r => r[0] === issue.ruleId);
                    let hintMsg = 'Review the error message and apply best security practices.';
                    const ruleId = issue.ruleId || issue.rule?.id || 'SECURITY';
                    const policyRule = AGENT_SECURITY_RULE_POLICIES.find((rule) => rule[0] === ruleId);
                    const autoFixEnabled = policyRule ? policyRule[1] : true;
                    const policyHint = policyRule?.[2];

                    if (ruleDef) {
                        hintMsg = ruleDef[1];
                    }

                    if (policyHint) {
                        hintMsg = `${hintMsg} ${policyHint}`;
                    }

                    const location = getIssueLocation(issue);
                    const locPrefix = `[${location.filePath}:${location.startLine}:${location.startColumn}] `;

                    filteredIssues.push({
                        ...issue as any,
                        message: locPrefix + issue.message,
                        code: ruleId,
                        range: {
                            start: { line: location.startLine, character: location.startColumn },
                            end: { line: location.endLine, character: location.endColumn }
                        },
                        filePath: location.filePath,
                        startLine: location.startLine,
                        startColumn: location.startColumn,
                        endLine: location.endLine,
                        endColumn: location.endColumn,
                        hint: hintMsg,
                        autoFixEnabled,
                        requiresExplicitUserInput: !autoFixEnabled,
                        userInputHint: policyHint,
                        skipAutoFixReason: !autoFixEnabled
                            ? `STRICT RULE: Auto-fix is disabled for ${ruleId}. DO NOT fix this automatically. Only fix if the user explicitly asks you to. ${policyHint || 'Ask the user for required inputs as CONFIGURABLES (USING WSO2 Integrator UI ONLY, NOT THE CHAT) before fixing.'}`
                            : undefined,
                    });
                }

                if ((options?.modifiedFiles?.length ?? 0) > 0 && filteredIssues.length > 1) {
                    filteredIssues.sort((a, b) => {
                        const aInModified = isIssueInModifiedFiles(a.filePath || '', modifiedFiles);
                        const bInModified = isIssueInModifiedFiles(b.filePath || '', modifiedFiles);
                        if (aInModified === bInModified) {
                            return 0;
                        }
                        return aInModified ? -1 : 1;
                    });
                }

                if (filteredIssues.length === 0) {
                    let emptyMsg = excludedIssues.length > 0
                        ? `No active issues found. ${excludedIssues.length} issue(s) are currently excluded/suppressed.`
                        : 'No issues found. Code looks good!';
                    if (dependentPackageIssuesFound) {
                        emptyMsg += ` Dependent packages were found to have security vulnerabilities. The user should open the project in workspace mode to view and resolve these issues.`;
                    }
                    const emptyRes: DiagnosticsCheckResult = {
                        count: 0,
                        diagnostics: [],
                        excludedCount: excludedIssues.length,
                        timeoutMs,
                        scanTargetPath: scanTargets.length === 1 ? scanTargets[0].targetPath : tempProjectPath,
                        message: emptyMsg,
                        success: true,
                    };
                    eventHandler({ type: 'tool_result', toolName: SECURITY_TOOL_NAME, toolOutput: emptyRes });
                    return emptyRes;
                }

                const issuesToReturn = filteredIssues.slice(0, MAX_ISSUES);
                const userInputRequiredCount = filteredIssues.filter((issue) => issue.requiresExplicitUserInput).length;

                let outputMessage = `Found ${filteredIssues.length} issue(s).`;

                if (filteredIssues.length > MAX_ISSUES) {
                    outputMessage += ` Showing the first ${MAX_ISSUES}. Review and fix them. Then run the ${SECURITY_TOOL_NAME} to get the rest of the issues.`;
                } else {
                    outputMessage += ' Review and fix them.';
                }

                if (userInputRequiredCount > 0) {
                    outputMessage += ` STRICT RULE: ${userInputRequiredCount} issue(s) have autoFixEnabled=false. DO NOT attempt to fix them automatically. Only fix them if the user EXPLICITLY asks you to fix them AND provides any required values.`;
                }

                if (dependentPackageIssuesFound) {
                    outputMessage += ` Dependent packages were found to have security vulnerabilities. The user should open the project in workspace mode to view and resolve these issues.`;
                }

                const result: DiagnosticsCheckResult = {
                    count: filteredIssues.length,
                    diagnostics: issuesToReturn,
                    excludedCount: excludedIssues.length,
                    timeoutMs,
                    scanTargetPath: scanTargets.length === 1 ? scanTargets[0].targetPath : tempProjectPath,
                    message: excludedIssues.length > 0
                        ? `${outputMessage} ${excludedIssues.length} additional issue(s) are excluded/suppressed.`
                        : outputMessage,
                    success: true,
                };

                eventHandler({
                    type: 'tool_result',
                    toolName: SECURITY_TOOL_NAME,
                    toolOutput: result,
                });

                return result;
            } catch (error) {
                console.error('[SecurityTool] Scan failed:', error);
                const catchRes: DiagnosticsCheckResult = {
                    count: 0,
                    diagnostics: [],
                    timeoutMs: DEFAULT_SCAN_TIMEOUT_MS,
                    message: `Failed to run security scan: ${error instanceof Error ? error.message : String(error)}`,
                    success: false,
                };
                eventHandler({ type: 'tool_result', toolName: SECURITY_TOOL_NAME, toolOutput: catchRes, failed: true });
                return catchRes;
            }
            });
        }
    });
}

/**
 * Add given prompt if the scanner is enabled
 */
export function AddSecurityToolPrompt(prompt: string) {
    if (!isScannerActive()) {
        return "";
    } else {
        return prompt;
    }
}
