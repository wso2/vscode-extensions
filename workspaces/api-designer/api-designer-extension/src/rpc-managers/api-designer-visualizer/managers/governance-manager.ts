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

import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    FetchRulesetsFromFolderRequest,
    FetchRulesetsFromFolderResponse,
    GetAllSpectralRulesetsRequest,
    GetAllSpectralRulesetsResponse,
    GetApplicableRulesetsRequest,
    GetApplicableRulesetsResponse,
    GetGovernanceRequest,
    GetGovernanceResponse,
    type UnifiedAnalyzeReport as CoreUnifiedAnalyzeReport,
    SpectralRuleset,
    ValidateAPISpecRequest,
    ValidateAPISpecResponse,
    getDefaultAiReadinessSpectralRuleset,
    getDefaultGovernanceSpectralRulesets,
    loadYaml
} from '@wso2/api-designer-core';
import { 
    validateApiSpec,
    validateWithSpectralRuleset
} from '../../../utils/validation-utils';
import { getAllSpectralRulesets as getAllSpectralRulesetsFromConfig } from '../../../spectral/rulesetAutomation';
import { BaseRpcManager } from './base-rpc-manager';
import { extension } from '../../../APIDesignerExtensionContext';

/** Payload returned by `validateWithSpectralRuleset` before `report` / `reportId` are applied. */
type SpectralGovernancePayload = {
    violations?: Array<{
        rule: string;
        code?: string;
        message: string;
        description?: string;
        fixSuggestion?: string;
        severity: string;
        path?: string[] | string;
        range?: {
            start: { line: number; character: number };
            end: { line: number; character: number };
        };
    }>;
    score?: number;
    passedChecks?: number;
    totalChecks?: number;
};

type GovernanceRulesetMetadata = {
    name: string;
    description?: string;
    ruleCategory?: string;
    ruleType?: string;
    artifactType?: string;
    documentationLink?: string;
    provider?: string;
};

type UnifiedViolation = {
    id: string;
    rule: string;
    message: string;
    description?: string;
    fixSuggestion?: string;
    severity: 'error' | 'warn' | 'info' | 'hint';
    code?: string;
    pathSegments: string[];
    displayPath: string;
    endpoint: string;
    method: string;
    line: number;
    range?: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
    breakdownKeys: string[];
};

type UnifiedBreakdownCategory = {
    id: string;
    label: string;
    description?: string;
    status: 'passed' | 'failed';
    total: number;
    errors: number;
    warnings: number;
    percentage: number;
    affectedEndpoints: number;
    docsUrl?: string;
    viewIssuesFilter: {
        key: string;
        label: string;
    };
    topRules?: string[];
};

type LlmValidationFinding = {
    id: string;
    rule: string;
    message: string;
    severity: 'error' | 'warn' | 'info' | 'hint';
    pathSegments: string[];
    displayPath: string;
    suggestion?: string;
};

type LlmValidationResult = {
    score: number;
    summary: string;
    findings: LlmValidationFinding[];
};

type LlmExecutionResult = {
    result: LlmValidationResult;
    modelId: string;
};

type ReportIssue = {
    id: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    rule: string;
    path: string;
    issue: string;
    description: string;
    fixSuggestion: string;
    autoFixable: boolean;
};

type LlmValidationState = {
    status: 'pending' | 'ready' | 'failed' | 'stale';
    apiHash: string;
    updatedAt: number;
    result?: LlmValidationResult;
    error?: string;
};

/** Result shape from {@link GovernanceManager.buildUnifiedReport} before RPC typing. */
type BuiltUnifiedReport = {
    schemaVersion: '1';
    reportId: 'ai-readiness' | 'owasp' | 'rest-api-readiness';
    title: string;
    violationsById: Record<string, UnifiedViolation>;
    overview: {
        score: number;
        passedChecks: number;
        totalChecks: number;
        metrics: Array<{ id: string; label: string; value: number | string; hint?: string; accent?: 'success' | 'error' | 'warning' | 'info' | 'neutral' }>;
    };
    breakdown: {
        title: string;
        categories: UnifiedBreakdownCategory[];
    };
    issueExplorer: {
        breakdownFilterOptions: Array<{ key: string; label: string }>;
    };
    aiReadinessSummary?: unknown;
};

/**
 * Manager for governance and validation operations
 * Handles API spec validation, governance checks, and Spectral ruleset management
 */
export class GovernanceManager extends BaseRpcManager {
    private static llmStateByApiHash = new Map<string, LlmValidationState>();
    private static llmJobsByApiHash = new Map<string, Promise<void>>();
    private static agentReadinessGuidelinesContent: string | null = null;

    constructor() {
        super('GovernanceManager');
    }

    private computeApiHash(content: string): string {
        return createHash('sha256').update(content, 'utf8').digest('hex');
    }

    private normalizeFilePath(filePath: string): string {
        if (!filePath) return filePath;
        if (filePath.startsWith('file://')) {
            try {
                return vscode.Uri.parse(filePath).fsPath;
            } catch {
                return filePath;
            }
        }
        return filePath;
    }

    private getWorkspaceCachePath(filePath: string): string {
        const normalizedPath = this.normalizeFilePath(filePath);
        const parsed = path.parse(normalizedPath);
        const reportFileName = `${parsed.name}-api-readiness-report.json`;
        return path.join(parsed.dir, 'api-reports', reportFileName);
    }

    private async workspaceCacheFileExists(filePath: string): Promise<boolean> {
        try {
            const cachePath = this.getWorkspaceCachePath(filePath);
            await stat(cachePath);
            return true;
        } catch {
            return false;
        }
    }

    private mapValidationSeverityToReportSeverity(severity: 'error' | 'warn' | 'info' | 'hint'): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
        if (severity === 'error') return 'HIGH';
        if (severity === 'warn') return 'MEDIUM';
        return 'LOW';
    }

    private mapReportSeverityToValidationSeverity(severity: string): LlmValidationFinding['severity'] {
        if (severity === 'CRITICAL' || severity === 'HIGH') return 'error';
        if (severity === 'MEDIUM') return 'warn';
        return 'info';
    }

    private computeSectionRating(counts: { critical: number; high: number; medium: number; low: number }): 'Poor' | 'Fair' | 'Good' | 'Excellent' {
        if (counts.critical >= 3) return 'Poor';
        if ((counts.critical >= 1 && counts.critical <= 2) || (counts.critical === 0 && counts.high >= 5)) return 'Fair';
        if (counts.critical === 0 && counts.high >= 1 && counts.high <= 4) return 'Good';
        return 'Excellent';
    }

    private computeCountsFromReportIssues(issues: ReportIssue[]): { critical: number; high: number; medium: number; low: number } {
        return issues.reduce(
            (acc, issue) => {
                if (issue.severity === 'CRITICAL') acc.critical += 1;
                else if (issue.severity === 'HIGH') acc.high += 1;
                else if (issue.severity === 'MEDIUM') acc.medium += 1;
                else acc.low += 1;
                return acc;
            },
            { critical: 0, high: 0, medium: 0, low: 0 }
        );
    }

    private deriveScoreFromCounts(counts: { critical: number; high: number; medium: number; low: number }): number {
        const penalty = counts.critical * 30 + counts.high * 15 + counts.medium * 7 + counts.low * 3;
        return Math.max(0, Math.min(100, 100 - penalty));
    }

    private async readAssessmentDocument(cachePath: string): Promise<Record<string, unknown>> {
        try {
            const content = await readFile(cachePath, 'utf8');
            const parsed = JSON.parse(content) as unknown;
            if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
        } catch {
            // no existing document
        }
        return {};
    }

    private buildLlmReportIssues(findings: LlmValidationFinding[]): ReportIssue[] {
        return findings.map((finding, index) => ({
            id: `ai-${String(index + 1).padStart(3, '0')}`,
            severity: this.mapValidationSeverityToReportSeverity(finding.severity),
            rule: finding.rule || 'llm.validation',
            path: finding.pathSegments.length > 0 ? finding.pathSegments.join('.') : 'general',
            issue: finding.message,
            description: finding.message,
            fixSuggestion: finding.suggestion || 'Update the OpenAPI definition to address this issue.',
            autoFixable: false,
        }));
    }

    private buildSpectralReportIssues(
        violationsById: Record<string, UnifiedViolation>,
        prefix: 'spec' | 'sec'
    ): ReportIssue[] {
        const violations = Object.values(violationsById);
        return violations.map((violation, index) => ({
            id: `${prefix}-${String(index + 1).padStart(3, '0')}`,
            severity: this.mapValidationSeverityToReportSeverity(violation.severity),
            rule: violation.rule || violation.code || 'unknown-rule',
            path: violation.pathSegments.length > 0 ? violation.pathSegments.join('.') : 'general',
            issue: violation.message || 'Validation issue',
            description: violation.description || violation.message || 'Validation issue detected.',
            fixSuggestion: violation.fixSuggestion || 'Update the OpenAPI definition to address this issue.',
            autoFixable: false,
        }));
    }

    private async persistSpectralSection(
        filePath: string,
        reportId: 'ai-readiness' | 'owasp' | 'rest-api-readiness',
        violationsById: Record<string, UnifiedViolation>
    ): Promise<void> {
        if (reportId !== 'ai-readiness' && reportId !== 'owasp') return;
        const cachePath = this.getWorkspaceCachePath(filePath);
        await mkdir(path.dirname(cachePath), { recursive: true });
        const existing = await this.readAssessmentDocument(cachePath);
        const currentMeta = existing.meta && typeof existing.meta === 'object'
            ? existing.meta as Record<string, unknown>
            : {};
        const currentAgentReadiness = existing.agentReadiness && typeof existing.agentReadiness === 'object'
            ? existing.agentReadiness as Record<string, unknown>
            : {};
        const currentSecurityReadiness = existing.securityReadiness && typeof existing.securityReadiness === 'object'
            ? existing.securityReadiness as Record<string, unknown>
            : {};
        const currentAiAnalysis = currentAgentReadiness.aiAnalysis && typeof currentAgentReadiness.aiAnalysis === 'object'
            ? currentAgentReadiness.aiAnalysis as Record<string, unknown>
            : undefined;

        // Re-read once more to avoid losing aiAnalysis due overlapping writes.
        const latest = await this.readAssessmentDocument(cachePath);
        const latestAgentReadiness = latest.agentReadiness && typeof latest.agentReadiness === 'object'
            ? latest.agentReadiness as Record<string, unknown>
            : {};
        const latestAiAnalysis = latestAgentReadiness.aiAnalysis && typeof latestAgentReadiness.aiAnalysis === 'object'
            ? latestAgentReadiness.aiAnalysis as Record<string, unknown>
            : undefined;
        const preservedAiAnalysis = latestAiAnalysis || currentAiAnalysis;

        const prefix: 'spec' | 'sec' = reportId === 'ai-readiness' ? 'spec' : 'sec';
        const issues = this.buildSpectralReportIssues(violationsById, prefix);
        const counts = this.computeCountsFromReportIssues(issues);
        const rating = this.computeSectionRating(counts);
        const section = {
            status: 'completed',
            ruleset: reportId === 'ai-readiness'
                ? 'references/agent-readiness-spectral/ai-readiness.yaml'
                : 'references/owasp-top-10-raw.yaml',
            score: {
                critical: counts.critical,
                high: counts.high,
                medium: counts.medium,
                low: counts.low,
                rating,
            },
            issues,
        };

        const merged = {
            ...existing,
            meta: {
                ...currentMeta,
                specFile: filePath,
                specHash: typeof currentMeta.specHash === 'string' ? currentMeta.specHash : '',
                assessedAt: new Date().toISOString(),
                spectralVersion: 'not-run',
                guidelinesVersion: 'agent-readiness-guidelines.md',
                model: String(currentMeta.model || ''),
            },
            agentReadiness: reportId === 'ai-readiness'
                ? {
                    ...currentAgentReadiness,
                    ...(preservedAiAnalysis ? { aiAnalysis: preservedAiAnalysis } : {}),
                    spectral: section
                }
                : currentAgentReadiness,
            securityReadiness: reportId === 'owasp'
                ? { ...currentSecurityReadiness, spectral: section }
                : currentSecurityReadiness,
        };
        await writeFile(cachePath, JSON.stringify(merged, null, 2), 'utf8');
    }

    private async persistLlmState(filePath: string, state: LlmValidationState, options?: { modelId?: string }): Promise<void> {
        // Keep only the latest cache entry in memory.
        GovernanceManager.llmStateByApiHash.clear();
        GovernanceManager.llmStateByApiHash.set(state.apiHash, state);
        try {
            const cachePath = this.getWorkspaceCachePath(filePath);
            await mkdir(path.dirname(cachePath), { recursive: true });
            const existing = await this.readAssessmentDocument(cachePath);

            const currentMeta = existing.meta && typeof existing.meta === 'object'
                ? existing.meta as Record<string, unknown>
                : {};
            const currentAgentReadiness = existing.agentReadiness && typeof existing.agentReadiness === 'object'
                ? existing.agentReadiness as Record<string, unknown>
                : {};
            const existingAiAnalysis = currentAgentReadiness.aiAnalysis && typeof currentAgentReadiness.aiAnalysis === 'object'
                ? currentAgentReadiness.aiAnalysis as Record<string, unknown>
                : {};

            const reportIssues = this.buildLlmReportIssues(state.result?.findings || []);
            const counts = this.computeCountsFromReportIssues(reportIssues);
            const rating = this.computeSectionRating(counts);
            const modelId = options?.modelId || String(currentMeta.model || 'copilot');
            const aiStatus = state.status === 'ready'
                ? 'completed'
                : state.status === 'failed'
                    ? 'failed'
                    : state.status;

            const merged = {
                ...existing,
                meta: {
                    ...currentMeta,
                    specFile: filePath,
                    specHash: state.apiHash,
                    assessedAt: new Date(state.updatedAt || Date.now()).toISOString(),
                    spectralVersion: String(currentMeta.spectralVersion || 'not-run'),
                    guidelinesVersion: 'agent-readiness-guidelines.md',
                    model: modelId,
                },
                agentReadiness: {
                    ...currentAgentReadiness,
                    aiAnalysis: {
                        ...existingAiAnalysis,
                        status: aiStatus,
                        score: {
                            critical: counts.critical,
                            high: counts.high,
                            medium: counts.medium,
                            low: counts.low,
                            rating,
                        },
                        issues: reportIssues,
                    },
                },
            };

            await writeFile(cachePath, JSON.stringify(merged, null, 2), 'utf8');
        } catch {
            // best-effort workspace cache persistence
        }
    }

    private async readWorkspaceCache(filePath: string): Promise<LlmValidationState | null> {
        try {
            const cachePath = this.getWorkspaceCachePath(filePath);
            const content = await readFile(cachePath, 'utf8');
            const parsed = JSON.parse(content) as unknown;
            if (!parsed || typeof parsed !== 'object') {
                return null;
            }
            const object = parsed as Record<string, unknown>;

            // Legacy direct state format.
            if ('status' in object && 'apiHash' in object) {
                return object as LlmValidationState;
            }

            // New schema format: meta + agentReadiness.aiAnalysis
            const aiAnalysis = object.agentReadiness
                && typeof object.agentReadiness === 'object'
                && (object.agentReadiness as Record<string, unknown>).aiAnalysis
                && typeof (object.agentReadiness as Record<string, unknown>).aiAnalysis === 'object'
                ? (object.agentReadiness as Record<string, unknown>).aiAnalysis as Record<string, unknown>
                : null;
            if (!aiAnalysis) {
                return null;
            }

            const statusRaw = String(aiAnalysis.status || 'failed');
            const status: LlmValidationState['status'] =
                statusRaw === 'completed'
                    ? 'ready'
                    : (statusRaw === 'pending' || statusRaw === 'failed' || statusRaw === 'stale' || statusRaw === 'ready')
                        ? statusRaw
                        : 'failed';
            const scoreObj = aiAnalysis.score && typeof aiAnalysis.score === 'object'
                ? aiAnalysis.score as Record<string, unknown>
                : {};
            const counts = {
                critical: Number(scoreObj.critical || 0),
                high: Number(scoreObj.high || 0),
                medium: Number(scoreObj.medium || 0),
                low: Number(scoreObj.low || 0),
            };
            const issues = Array.isArray(aiAnalysis.issues) ? aiAnalysis.issues as Array<Record<string, unknown>> : [];
            const findings: LlmValidationFinding[] = issues.map((issue, index) => ({
                id: String(issue.id || `llm:${index}`),
                rule: String(issue.rule || 'llm.validation'),
                message: String(issue.issue || issue.description || 'Potential AI readiness issue detected'),
                severity: this.mapReportSeverityToValidationSeverity(String(issue.severity || '').toUpperCase()),
                pathSegments: String(issue.path || '').split('.').map((segment) => segment.trim()).filter(Boolean),
                displayPath: String(issue.path || 'General').split('.').join(' > '),
                suggestion: typeof issue.fixSuggestion === 'string' ? issue.fixSuggestion : undefined,
            }));

            const meta = object.meta && typeof object.meta === 'object'
                ? object.meta as Record<string, unknown>
                : {};
            const updatedAt = Date.parse(String(meta.assessedAt || '')) || Date.now();
            const specHash = typeof meta.specHash === 'string' ? meta.specHash : '';
            const result = {
                score: this.deriveScoreFromCounts(counts),
                summary: 'LLM AI readiness validation completed.',
                findings,
            };

            return {
                status,
                apiHash: specHash,
                updatedAt,
                result,
                error: typeof aiAnalysis.error === 'string' ? aiAnalysis.error : undefined,
            };
        } catch {
            return null;
        }
    }

    private async resolveCachedLlmState(filePath: string, apiHash: string): Promise<LlmValidationState | undefined> {
        const cacheFileExists = await this.workspaceCacheFileExists(filePath);
        if (!cacheFileExists) {
            return undefined;
        }
        const workspaceCache = await this.readWorkspaceCache(filePath);
        if (workspaceCache && workspaceCache.apiHash === apiHash) {
            GovernanceManager.llmStateByApiHash.clear();
            GovernanceManager.llmStateByApiHash.set(apiHash, workspaceCache);
            return workspaceCache;
        }
        const inMemory = GovernanceManager.llmStateByApiHash.get(apiHash);
        if (inMemory) return inMemory;
        return undefined;
    }

    private getAgentReadinessGuidelinesPath(): string {
        const extensionPath = extension.context?.extensionPath;
        if (!extensionPath) {
            throw new Error('Extension path is not initialized');
        }
        return path.join(
            extensionPath,
            'skills',
            'api-readiness-assessment',
            'references',
            'agent-readiness-guidelines.md'
        );
    }

    private async getAgentReadinessGuidelines(): Promise<string> {
        if (GovernanceManager.agentReadinessGuidelinesContent) {
            return GovernanceManager.agentReadinessGuidelinesContent;
        }
        const guidelinesPath = this.getAgentReadinessGuidelinesPath();
        const content = await readFile(guidelinesPath, 'utf8');
        GovernanceManager.agentReadinessGuidelinesContent = content;
        return content;
    }

    private async buildLlmPrompt(specContent: string): Promise<string> {
        let guidelines = '';
        try {
            guidelines = await this.getAgentReadinessGuidelines();
        } catch (error) {
            this.logWarning('Failed to load agent-readiness-guidelines.md; using fallback prompt instructions.', error);
        }
        return [
            'You are validating API AI readiness.',
            'Use the following guidelines as the primary rubric for scoring and findings.',
            guidelines,
            'Analyze the OpenAPI content and return strict JSON only with this shape:',
            '{"score":number,"summary":string,"findings":[{"rule":string,"message":string,"severity":"error|warn|info|hint","path":"dot.path.or.empty","suggestion":"optional"}]}',
            'Rules:',
            '- Score must be 0-100',
            '- Keep summary under 220 chars',
            '- Use concise actionable messages',
            '- Findings should be specific and non-duplicative',
            '- Prefer real API design risks over stylistic nits',
            '- suggestion should be an implementable next step',
            '- Return ONLY raw JSON (no markdown, no prose outside JSON)',
            '',
            'OpenAPI document:',
            specContent
        ].join('\n');
    }

    private normalizeLlmResult(rawText: string): LlmValidationResult {
        const text = rawText.trim();
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        const jsonText = firstBrace >= 0 && lastBrace > firstBrace ? text.slice(firstBrace, lastBrace + 1) : text;
        const parsed = JSON.parse(jsonText) as {
            score?: number;
            summary?: string;
            findings?: Array<{ rule?: string; message?: string; severity?: string; path?: string; suggestion?: string }>;
        };
        const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 0))));
        const findings = (parsed.findings || []).slice(0, 20).map((finding, index) => {
            const pathSegments = String(finding.path || '').split('.').map((segment) => segment.trim()).filter(Boolean);
            const severity: LlmValidationFinding['severity'] =
                (finding.severity === 'error' || finding.severity === 'warn' || finding.severity === 'hint' || finding.severity === 'info')
                    ? finding.severity
                    : 'info';
            return {
                id: `llm:${index}`,
                rule: String(finding.rule || 'llm.validation'),
                message: String(finding.message || 'Potential AI readiness issue detected'),
                severity,
                pathSegments,
                displayPath: pathSegments.length > 0 ? pathSegments.join(' > ') : 'General',
                suggestion: finding.suggestion ? String(finding.suggestion) : undefined,
            };
        });
        return {
            score,
            summary: String(parsed.summary || 'LLM AI readiness validation completed.'),
            findings,
        };
    }

    private async executeLlmValidation(specContent: string): Promise<LlmExecutionResult> {
        const vscodeAny = vscode as any;
        if (!vscodeAny.lm?.selectChatModels) {
            throw new Error('Language model API is not available');
        }
        const models = await vscodeAny.lm.selectChatModels({ vendor: 'copilot' });
        if (!Array.isArray(models) || models.length === 0) {
            throw new Error('No Copilot chat model available');
        }
        const model = models[0];
        const prompt = await this.buildLlmPrompt(specContent);
        this.logDebug('LLM prompt:', prompt);
        const userMessage = vscodeAny.LanguageModelChatMessage?.User
            ? vscodeAny.LanguageModelChatMessage.User(prompt)
            : { role: 'user', content: prompt };
        const response = await model.sendRequest([userMessage], {}, new vscode.CancellationTokenSource().token);
        let output = '';
        for await (const chunk of response.text) {
            output += String(chunk);
        }
        const modelId = String((model as { id?: string; name?: string })?.id || (model as { id?: string; name?: string })?.name || 'copilot');
        return {
            result: this.normalizeLlmResult(output),
            modelId,
        };
    }

    private async startLlmJob(filePath: string, apiHash: string, specContent: string): Promise<void> {
        const existing = GovernanceManager.llmJobsByApiHash.get(apiHash);
        if (existing) return existing;
        const job = (async () => {
            try {
                const execution = await this.executeLlmValidation(specContent);
                await this.persistLlmState(filePath, {
                    status: 'ready',
                    apiHash,
                    updatedAt: Date.now(),
                    result: execution.result,
                }, { modelId: execution.modelId });
            } catch (error) {
                await this.persistLlmState(filePath, {
                    status: 'failed',
                    apiHash,
                    updatedAt: Date.now(),
                    error: (error as { message?: string })?.message || 'LLM validation failed',
                });
            } finally {
                GovernanceManager.llmJobsByApiHash.delete(apiHash);
            }
        })();
        GovernanceManager.llmJobsByApiHash.set(apiHash, job);
        return job;
    }

    public async ensureLlmValidationForFile(filePath: string, options?: { force?: boolean }): Promise<void> {
        try {
            const normalizedPath = this.normalizeFilePath(filePath);
            const specContent = await readFile(normalizedPath, 'utf8');
            const apiHash = this.computeApiHash(specContent);
            const force = options?.force === true;
            const cacheFileExists = await this.workspaceCacheFileExists(normalizedPath);
            const workspaceCache = await this.readWorkspaceCache(normalizedPath);
            const cached = await this.resolveCachedLlmState(normalizedPath, apiHash);
            if (cacheFileExists && !force) {
                if (cached?.status === 'ready') {
                    GovernanceManager.llmStateByApiHash.clear();
                    GovernanceManager.llmStateByApiHash.set(apiHash, cached);
                }
                return;
            }
            if (cached?.status === 'ready' && !force) {
                GovernanceManager.llmStateByApiHash.clear();
                GovernanceManager.llmStateByApiHash.set(apiHash, cached);
                return;
            }
            if (!force) {
                if (cached?.status === 'failed') {
                    return;
                }
                if (cached?.status === 'pending' && !GovernanceManager.llmJobsByApiHash.has(apiHash)) {
                    // Avoid re-triggering on extension/VS Code reload when no in-process job exists.
                    return;
                }
                if (!cached && workspaceCache) {
                    // Auto run only on first-ever spec hash for this API. Later hash changes require manual re-evaluation.
                    return;
                }
            }
            if (cached?.status === 'pending' && GovernanceManager.llmJobsByApiHash.has(apiHash)) {
                return;
            }
            await this.persistLlmState(normalizedPath, {
                status: 'pending',
                apiHash,
                updatedAt: Date.now(),
            });
            void this.startLlmJob(normalizedPath, apiHash, specContent);
        } catch (error) {
            this.logWarning('Failed to schedule LLM validation', error);
        }
    }

    private readonly OWASP_CATEGORIES = [
        { key: 'API1:2023', label: 'Broken Object Level Authorization', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/' },
        { key: 'API2:2023', label: 'Broken Authentication', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/' },
        { key: 'API3:2023', label: 'Broken Object Property Level Authorization', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/' },
        { key: 'API4:2023', label: 'Unrestricted Resource Consumption', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/' },
        { key: 'API5:2023', label: 'Broken Function Level Authorization', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/' },
        { key: 'API6:2023', label: 'Unrestricted Access to Sensitive Business Flows', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/' },
        { key: 'API7:2023', label: 'Server Side Request Forgery', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa7-server-side-request-forgery/' },
        { key: 'API8:2023', label: 'Security Misconfiguration', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/' },
        { key: 'API9:2023', label: 'Improper Inventory Management', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa9-improper-inventory-management/' },
        { key: 'API10:2023', label: 'Unsafe Consumption of APIs', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xaa-unsafe-consumption-of-apis/' },
    ] as const;

    private readonly WSO2_THEMES = [
        { id: 'resource-design', title: 'Resource Design', description: 'How clear and predictable resource paths and REST nouns are.', keywords: ['resource', 'path', 'uri', 'url', 'noun', 'plural', 'hierarchy'] },
        { id: 'operations-methods', title: 'Operations & Methods', description: 'Whether HTTP methods and operation shapes follow REST semantics.', keywords: ['method', 'http', 'operation', 'get', 'post', 'put', 'patch', 'delete', 'idempotent'] },
        { id: 'contracts-responses', title: 'Contracts & Responses', description: 'Consistency of status codes, response models, and payload contracts.', keywords: ['response', 'status', 'schema', 'contract', 'payload', 'content-type', 'example'] },
        { id: 'documentation', title: 'Documentation Quality', description: 'How usable the API is from summaries, descriptions, and examples.', keywords: ['summary', 'description', 'document', 'docs', 'example', 'title', 'operationid'] },
        { id: 'security-governance', title: 'Security & Governance', description: 'Authentication, authorization, and governance controls for safe APIs.', keywords: ['security', 'auth', 'oauth', 'scope', 'token', 'header', 'https', 'tls'] },
        { id: 'versioning-lifecycle', title: 'Versioning & Lifecycle', description: 'Version strategy and lifecycle clarity for consumers.', keywords: ['version', 'deprecated', 'sunset', 'lifecycle', 'compatibility'] },
    ] as const;

    private inferReportKey(name: string): 'ai-readiness' | 'owasp' | 'rest-api-readiness' {
        const lower = name.toLowerCase();
        if (lower.includes('ai') && lower.includes('readiness')) return 'ai-readiness';
        if (lower.includes('owasp') || lower.includes('security')) return 'owasp';
        return 'rest-api-readiness';
    }

    private async readRulesetMetadata(
        rulesetPath: string,
        rulesetName: string
    ): Promise<GovernanceRulesetMetadata> {
        const base: GovernanceRulesetMetadata = {
            name: rulesetName,
        };

        // Best-effort inference for remote rulesets where content is not read here.
        if (rulesetPath.startsWith('http://') || rulesetPath.startsWith('https://')) {
            if (rulesetName.toLowerCase().includes('wso2')) {
                base.provider = 'WSO2';
            }
            return base;
        }

        try {
            const content = await readFile(rulesetPath, 'utf8');
            const parsed = loadYaml(content) as Record<string, unknown> | undefined;
            if (!parsed || typeof parsed !== 'object') return base;

            return {
                name: typeof parsed.name === 'string' ? parsed.name : rulesetName,
                description: typeof parsed.description === 'string' ? parsed.description : undefined,
                ruleCategory: typeof parsed.ruleCategory === 'string' ? parsed.ruleCategory : undefined,
                ruleType: typeof parsed.ruleType === 'string' ? parsed.ruleType : undefined,
                artifactType: typeof parsed.artifactType === 'string' ? parsed.artifactType : undefined,
                documentationLink: typeof parsed.documentationLink === 'string' ? parsed.documentationLink : undefined,
                provider: typeof parsed.provider === 'string' ? parsed.provider : undefined,
            };
        } catch {
            return base;
        }
    }

    private normalizePath(path?: string[] | string): string[] {
        if (Array.isArray(path)) return path.map((segment) => String(segment));
        if (typeof path === 'string') return path.split('>').map((segment) => segment.trim()).filter(Boolean);
        return [];
    }

    private extractEndpoint(pathSegments: string[]): { endpoint: string; method: string } {
        const pathsIndex = pathSegments.indexOf('paths');
        if (pathsIndex >= 0) {
            const endpoint = pathSegments[pathsIndex + 1] || 'global';
            const methodRaw = pathSegments[pathsIndex + 2] || '';
            const method = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(methodRaw)
                ? methodRaw.toUpperCase()
                : 'GLOBAL';
            return { endpoint, method };
        }
        return { endpoint: 'global', method: 'GLOBAL' };
    }

    private pickWso2Theme(rule: string, message: string): (typeof this.WSO2_THEMES)[number] {
        const haystack = `${rule} ${message}`.toLowerCase();
        let bestTheme: (typeof this.WSO2_THEMES)[number] = this.WSO2_THEMES[0] as (typeof this.WSO2_THEMES)[number];
        let bestScore = 0;
        this.WSO2_THEMES.forEach((theme) => {
            const score = theme.keywords.reduce((sum, keyword) => sum + (haystack.includes(keyword) ? 1 : 0), 0);
            if (score > bestScore) {
                bestScore = score;
                bestTheme = theme;
            }
        });
        return bestScore > 0 ? bestTheme : this.WSO2_THEMES[0];
    }

    private buildUnifiedReport(name: string, response: SpectralGovernancePayload): BuiltUnifiedReport {
        const reportId = this.inferReportKey(name);
        const rawViolations = response.violations || [];
        const violationsById: Record<string, UnifiedViolation> = {};
        const categoryBuckets = new Map<string, { label: string; description?: string; docsUrl?: string; violationIds: string[] }>();

        rawViolations.forEach((violation, index) => {
            const pathSegments = this.normalizePath(violation.path);
            const displayPath = pathSegments.length > 0 ? pathSegments.join(' > ') : 'Unknown path';
            const { endpoint, method } = this.extractEndpoint(pathSegments);
            const id = `${violation.rule || violation.code || 'unknown'}:${index}`;
            const normalizedSeverity = (violation.severity === 'error' || violation.severity === 'warn' || violation.severity === 'hint' || violation.severity === 'info')
                ? violation.severity
                : 'info';

            let breakdownKeys: string[] = [];
            if (reportId === 'owasp') {
                const raw = (violation.rule || '').toUpperCase().match(/API\d+(?::\d{4})?/)?.[0] || 'GENERAL';
                const key = raw.includes(':') ? raw : `${raw}:2023`;
                breakdownKeys = [key];
                if (!categoryBuckets.has(key)) {
                    const category = this.OWASP_CATEGORIES.find((item) => item.key === key);
                    categoryBuckets.set(key, { label: category?.label || key, docsUrl: category?.docsUrl, violationIds: [] });
                }
                categoryBuckets.get(key)?.violationIds.push(id);
            } else if (reportId === 'rest-api-readiness') {
                const theme = this.pickWso2Theme(violation.rule || '', violation.message || '');
                breakdownKeys = [theme.id];
                if (!categoryBuckets.has(theme.id)) {
                    categoryBuckets.set(theme.id, { label: theme.title, description: theme.description, violationIds: [] });
                }
                categoryBuckets.get(theme.id)?.violationIds.push(id);
            }

            violationsById[id] = {
                id,
                rule: violation.rule || violation.code || 'unknown-rule',
                message: violation.message || 'No message provided',
                description: violation.description,
                fixSuggestion: violation.fixSuggestion,
                severity: normalizedSeverity,
                code: violation.code,
                pathSegments,
                displayPath,
                endpoint,
                method,
                line: ((violation.range?.start.line ?? -1) + 1),
                range: violation.range,
                breakdownKeys,
            };
        });

        const endpointCount = new Set(
            Object.values(violationsById)
                .filter((v) => v.endpoint !== 'global' && v.method !== 'GLOBAL')
                .map((v) => `${v.method}:${v.endpoint}`)
        ).size;
        const errors = Object.values(violationsById).filter((v) => v.severity === 'error').length;
        const warnings = Object.values(violationsById).filter((v) => v.severity === 'warn').length;

        let categories: UnifiedBreakdownCategory[] = [];
        if (reportId === 'owasp') {
            categories = this.OWASP_CATEGORIES.map((item) => {
                const bucket = categoryBuckets.get(item.key);
                const ids = bucket?.violationIds || [];
                const total = ids.length;
                const categoryErrors = ids.filter((id) => violationsById[id]?.severity === 'error').length;
                const categoryWarnings = ids.filter((id) => violationsById[id]?.severity === 'warn').length;
                return {
                    id: item.key,
                    label: item.label,
                    status: total > 0 ? 'failed' : 'passed',
                    total,
                    errors: categoryErrors,
                    warnings: categoryWarnings,
                    percentage: rawViolations.length > 0 ? Math.round((total / rawViolations.length) * 100) : 0,
                    affectedEndpoints: new Set(ids.map((id) => `${violationsById[id]?.method} ${violationsById[id]?.endpoint}`)).size,
                    docsUrl: item.docsUrl,
                    viewIssuesFilter: { key: item.key, label: item.label },
                };
            });
        } else if (reportId === 'rest-api-readiness') {
            categories = this.WSO2_THEMES.map((theme) => {
                const bucket = categoryBuckets.get(theme.id);
                const ids = bucket?.violationIds || [];
                const total = ids.length;
                const categoryErrors = ids.filter((id) => violationsById[id]?.severity === 'error').length;
                const categoryWarnings = ids.filter((id) => violationsById[id]?.severity === 'warn').length;
                const ruleCounts = new Map<string, number>();
                ids.forEach((id) => {
                    const rule = violationsById[id]?.rule || '';
                    ruleCounts.set(rule, (ruleCounts.get(rule) || 0) + 1);
                });
                return {
                    id: theme.id,
                    label: theme.title,
                    description: theme.description,
                    status: total > 0 ? 'failed' : 'passed',
                    total,
                    errors: categoryErrors,
                    warnings: categoryWarnings,
                    percentage: rawViolations.length > 0 ? Math.round((total / rawViolations.length) * 100) : 0,
                    affectedEndpoints: new Set(ids.map((id) => `${violationsById[id]?.method} ${violationsById[id]?.endpoint}`)).size,
                    viewIssuesFilter: { key: theme.id, label: theme.title },
                    topRules: Array.from(ruleCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([rule]) => rule),
                };
            });
        }

        return {
            schemaVersion: '1',
            reportId,
            title: name,
            violationsById,
            overview: {
                score: response.score ?? 0,
                passedChecks: response.passedChecks ?? 0,
                totalChecks: response.totalChecks ?? 0,
                metrics: [
                    { id: 'errors', label: 'Errors', value: errors, accent: 'error' },
                    { id: 'warnings', label: 'Warnings', value: warnings, accent: 'warning' },
                    { id: 'operations', label: 'Operations affected', value: endpointCount, accent: 'info' },
                ],
            },
            breakdown: {
                title: reportId === 'owasp' ? 'OWASP Breakdown' : reportId === 'rest-api-readiness' ? 'WSO2 REST Guidelines Breakdown' : 'AI Readiness Breakdown',
                categories,
            },
            issueExplorer: {
                breakdownFilterOptions: categories.map((category) => ({
                    key: category.viewIssuesFilter.key,
                    label: category.viewIssuesFilter.label,
                })),
            },
        };
    }

    /**
     * Helper function to construct full ruleset path from sourceFolder and fileName
     */
    private constructRulesetPath(sourceFolder: string, fileName: string): string {
        if (!sourceFolder || !fileName) {
            throw new Error(`Invalid ruleset configuration: sourceFolder="${sourceFolder}", fileName="${fileName}"`);
        }
        
        // If it's a GitHub folder URL, convert to raw URL
        if (sourceFolder.includes('github.com')) {
            // Convert blob/tree URL to raw URL format
            let rawFolder = sourceFolder;
            
            if (rawFolder.includes('/blob/') || rawFolder.includes('/tree/')) {
                // Extract parts: https://github.com/owner/repo/blob/branch/path/to/folder
                const parsed = sourceFolder.match(/github\.com\/([^\/]+)\/([^\/]+)\/(blob|tree)\/([^\/]+)(?:\/(.+))?/);
                if (parsed) {
                    const [, owner, repo, , branch, path] = parsed;
                    const folderPath = path || '';
                    // Ensure we have proper URL structure
                    rawFolder = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}${folderPath ? '/' + folderPath : ''}`;
                } else {
                    // If parsing failed, check if it's already a raw URL
                    if (!rawFolder.includes('raw.githubusercontent.com')) {
                        this.logWarning(`Could not parse GitHub URL: ${sourceFolder}, using as-is`);
                    }
                }
            } else if (rawFolder.includes('raw.githubusercontent.com')) {
                // Already a raw URL, use as-is
                rawFolder = sourceFolder;
            }
            
            // Ensure we don't have double slashes (except after https://)
            const cleanFileName = fileName.startsWith('/') ? fileName.substring(1) : fileName;
            const separator = rawFolder.endsWith('/') ? '' : '/';
            const fullUrl = `${rawFolder}${separator}${cleanFileName}`;
            
            return fullUrl;
        }
        
        // For local paths, use path.join
        return path.join(sourceFolder, fileName);
    }

    /**
     * Helper to find git root (used for resolving local ruleset paths)
     */
    private async findGitRoot(startPath: vscode.Uri): Promise<vscode.Uri | null> {
        const fileExists = async (uri: vscode.Uri): Promise<boolean> => {
            try {
                await vscode.workspace.fs.stat(uri);
                return true;
            } catch {
                return false;
            }
        };
        
        let currentPath = startPath;
        let depth = 0;
        const maxDepth = 20;
        
        while (depth < maxDepth) {
            const gitDir = vscode.Uri.joinPath(currentPath, '.git');
            if (await fileExists(gitDir)) {
                return currentPath;
            }
            
            const parentPath = vscode.Uri.joinPath(currentPath, '..');
            const resolvedParentPath = parentPath.fsPath;
            const resolvedCurrentPath = currentPath.fsPath;
            
            if (resolvedParentPath === resolvedCurrentPath) {
                break;
            }
            
            currentPath = parentPath;
            depth++;
        }
        
        return null;
    }

    async getGovernance(params: GetGovernanceRequest): Promise<GetGovernanceResponse> {
        try {
            const normalizedPath = this.normalizeFilePath(params.filePath);
            const content = await readFile(normalizedPath, 'utf8');
            const apiHash = this.computeApiHash(content);
            const cacheFileExists = await this.workspaceCacheFileExists(normalizedPath);
            const workspaceCache = await this.readWorkspaceCache(normalizedPath);
            let llmValidation = await this.resolveCachedLlmState(normalizedPath, apiHash);
            if (!llmValidation) {
                if (cacheFileExists) {
                    llmValidation = workspaceCache && workspaceCache.apiHash !== apiHash
                        ? {
                            ...workspaceCache,
                            status: 'stale',
                            apiHash,
                            error: 'OpenAPI spec changed since last evaluation. Click Re-evaluate to refresh.',
                        }
                        : workspaceCache
                            ? workspaceCache
                            : {
                                status: 'stale',
                                apiHash,
                                updatedAt: Date.now(),
                                error: 'LLM analysis is missing in the report file. Click Re-evaluate to refresh.',
                            };
                } else {
                    void this.ensureLlmValidationForFile(normalizedPath);
                    llmValidation = {
                        status: 'pending',
                        apiHash,
                        updatedAt: Date.now(),
                    };
                }
            } else if (llmValidation.status === 'pending') {
                if (GovernanceManager.llmJobsByApiHash.has(apiHash)) {
                    void this.ensureLlmValidationForFile(normalizedPath);
                }
            }
            
            // Require ruleset parameter
            if (!params.ruleset || !params.ruleset.sourceFolder || !params.ruleset.fileName) {
                throw new Error(`Ruleset parameter is required with sourceFolder and fileName`);
            }
            
            // Use the provided ruleset
            const resolvedPath = this.constructRulesetPath(params.ruleset.sourceFolder, params.ruleset.fileName);
            const rulesetConfig = {
                filePath: resolvedPath,
                rulesetContentPath: params.ruleset.rulesetContentPath || ''
            };
            
            // Get git root for resolving local ruleset file paths (if ruleset source is local)
            const fileUri = vscode.Uri.file(normalizedPath);
            const gitRoot = await this.findGitRoot(fileUri);
            const gitRootPath = gitRoot?.fsPath;
            
            // GitHub authentication will be handled by fetchRulesetsFromFolders if needed
            // Try without auth first (works for public repos), only prompt if 401/403 error occurs
            let authToken: string | undefined = undefined;
            
            const result = await validateWithSpectralRuleset(
                content,
                params.name,
                rulesetConfig.filePath,
                rulesetConfig.rulesetContentPath,
                gitRootPath,
                authToken
            );
            const response = result as SpectralGovernancePayload & {
                metadata?: GovernanceRulesetMetadata;
                schemaVersion?: '2';
                reportId?: 'ai-readiness' | 'owasp' | 'rest-api-readiness';
                report?: BuiltUnifiedReport;
                aiReadinessSummary?: unknown;
            };
            response.metadata = await this.readRulesetMetadata(rulesetConfig.filePath, params.name);
            const unifiedReport = this.buildUnifiedReport(params.name, response);
            await this.persistSpectralSection(normalizedPath, unifiedReport.reportId, unifiedReport.violationsById);
            const aiReadinessSummary = (response as { aiReadinessSummary?: unknown }).aiReadinessSummary;
            if (aiReadinessSummary) {
                unifiedReport.aiReadinessSummary = aiReadinessSummary;
            }
            if (unifiedReport.reportId === 'ai-readiness' && typeof unifiedReport.overview?.score === 'number') {
                const llmScore = llmValidation?.status === 'ready' && typeof llmValidation.result?.score === 'number'
                    ? llmValidation.result.score
                    : null;
                if (llmScore !== null) {
                    unifiedReport.overview.score = Math.round((unifiedReport.overview.score * 0.7) + (llmScore * 0.3));
                }
            }
            (response as GetGovernanceResponse & { schemaVersion?: '2' }).schemaVersion = '2';
            (response as GetGovernanceResponse).reportId = unifiedReport.reportId;
            (response as GetGovernanceResponse).report = unifiedReport as CoreUnifiedAnalyzeReport;
            (response as any).llmValidation = llmValidation;
            return response as GetGovernanceResponse;
        } catch (error: unknown) {
            this.logError(`Error checking ${params.name}:`, error);
            throw new Error(`Failed to check ${params.name}: ${(error as { message?: string }).message || 'Unknown error'}`);
        }
    }

    async validateApiSpec(params: ValidateAPISpecRequest): Promise<ValidateAPISpecResponse> {
        try {
            // Read the API spec file content
            const content = await readFile(params.filePath, 'utf8');
            
            // Validate the spec
            const result = await validateApiSpec(content);
            return result;
        } catch (error: unknown) {
            this.logError('Error validating API spec:', error);
            throw new Error(`Failed to validate API spec: ${(error as { message?: string }).message || 'Unknown error'}`);
        }
    }

    async fetchRulesetsFromFolder(params: FetchRulesetsFromFolderRequest): Promise<FetchRulesetsFromFolderResponse> {
        try {
            const { fetchRulesetsFromFolders } = await import('../../../util/github-utils.js');
            const pathModule = await import('path');
            
            const trimmedFolderUrl = params.folderUrl.trim();
            let fetchFolderUrl = trimmedFolderUrl;
            const displayFolder = trimmedFolderUrl;
            
            if (!trimmedFolderUrl) {
                return {
                    success: false,
                    rulesets: [],
                    message: 'Folder path is required'
                };
            }
            
            if (
                !trimmedFolderUrl.includes('github.com') && 
                !trimmedFolderUrl.includes('raw.githubusercontent.com')
            ) {
                const isAbsolute = pathModule.isAbsolute(trimmedFolderUrl);
                if (!isAbsolute) {
                    let basePath: string | undefined;
                    
                    if (params.workspaceUri) {
                        try {
                            const workspaceUri = vscode.Uri.file(params.workspaceUri);
                            const gitRoot = await this.findGitRoot(workspaceUri);
                            basePath = gitRoot?.fsPath ?? workspaceUri.fsPath;
                        } catch (resolveError) {
                            this.logWarning('Failed to resolve workspace path for ruleset folder', resolveError);
                        }
                    }
                    
                    if (!basePath) {
                        basePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    }
                    
                    fetchFolderUrl = basePath 
                        ? pathModule.resolve(basePath, trimmedFolderUrl) 
                        : pathModule.resolve(trimmedFolderUrl);
                    
                    this.logDebug(`Resolved relative folder path "${trimmedFolderUrl}" to "${fetchFolderUrl}" using base "${basePath || '<process cwd>'}"`);
                }
            }
            
            // Fetch rulesets from the folder - will use existing auth session if available
            // Will prompt for auth if request fails with 401/403
            let rulesets: unknown[] = [];
            let authError = false;
            
            try {
                rulesets = await fetchRulesetsFromFolders([fetchFolderUrl], displayFolder, true);
            } catch (error: unknown) {
                // Check if it's an auth-related error
                const errorObj = error as { status?: number; message?: string };
                if (errorObj?.status === 401 || errorObj?.status === 403 || errorObj?.message?.includes('401') || errorObj?.message?.includes('403')) {
                    authError = true;
                    this.logError('Authentication error when fetching rulesets:', error);
                } else {
                    // Re-throw non-auth errors
                    throw error;
                }
            }
            
            if (rulesets.length === 0) {
                // Check if it might be a private repo that needs auth
                if (params.folderUrl.includes('github.com')) {
                    // Check if user has GitHub session
                    const { getGitHubAuth } = await import('../../../util/github-utils.js');
                    const hasAuth = await getGitHubAuth(false);
                    
                    if (authError || !hasAuth) {
                        return {
                            success: false,
                            rulesets: [],
                            message: 'No rulesets found. If this is a private repository, please ensure you are signed in to GitHub in VS Code and try again.',
                            requiresAuth: true
                        };
                    } else {
                        // User is signed in but still no rulesets - might be empty folder or wrong path
                        return {
                            success: false,
                            rulesets: [],
                            message: 'No ruleset YAML files found in this folder. Please check that the folder contains .yaml or .yml files.',
                            requiresAuth: false
                        };
                    }
                }
                
                // Return empty success if no rulesets found (local folder)
                return {
                    success: true,
                    rulesets: [],
                    message: 'No ruleset YAML files found in this folder.',
                    requiresAuth: false
                };
            }
            
            return {
                success: true,
                rulesets: rulesets
                    .map((r: unknown) => {
                        const ruleset = r as {
                            name?: string;
                            sourceFolder?: string;
                            fileName?: string;
                            rulesetContentPath?: string;
                            description?: string;
                            ruleCategory?: string;
                            ruleType?: string;
                            artifactType?: string;
                            documentationLink?: string;
                            provider?: string;
                        };
                        // Filter out rulesets without required fields
                        if (!ruleset.name || !ruleset.sourceFolder || !ruleset.fileName) {
                            return null;
                        }
                        return {
                            name: ruleset.name,
                            sourceFolder: ruleset.sourceFolder,
                            fileName: ruleset.fileName,
                            rulesetContentPath: ruleset.rulesetContentPath || '',
                            // Include additional metadata for display purposes only.
                            description: ruleset.description,
                            enabled: true,
                            ruleCategory: ruleset.ruleCategory,
                            ruleType: ruleset.ruleType,
                            artifactType: ruleset.artifactType,
                            documentationLink: ruleset.documentationLink,
                            provider: ruleset.provider
                        };
                    })
                    .filter((r): r is NonNullable<typeof r> => r !== null),
                requiresAuth: false
            };
        } catch (error: unknown) {
            this.logError('Error fetching rulesets from folder:', error);
            
            // Check if error is related to authentication
            const errorMessage = (error as { message?: string }).message || '';
            if (errorMessage.includes('403') || errorMessage.includes('401') || errorMessage.includes('authentication')) {
                return {
                    success: false,
                    rulesets: [],
                    message: 'Authentication required. Unable to access this repository.',
                    requiresAuth: true
                };
            }
            
            return {
                success: false,
                rulesets: [],
                message: `Failed to fetch rulesets: ${errorMessage}`
            };
        }
    }

    async getApplicableRulesets(params: GetApplicableRulesetsRequest): Promise<GetApplicableRulesetsResponse> {
        const DEFAULT_GOVERNANCE_RULESETS = getDefaultGovernanceSpectralRulesets();
        const DEFAULT_AI_READINESS_RULESET = getDefaultAiReadinessSpectralRuleset();

        const buildResponse = (): GetApplicableRulesetsResponse => ({
            governanceRulesets: DEFAULT_GOVERNANCE_RULESETS.map(ruleset => ({ ...ruleset })),
            aiReadinessRuleset: { ...DEFAULT_AI_READINESS_RULESET }
        });

        return buildResponse();
    }

    async getAllSpectralRulesets(params: GetAllSpectralRulesetsRequest): Promise<GetAllSpectralRulesetsResponse> {
        try {
            const allRulesets = getAllSpectralRulesetsFromConfig();
            
            // Convert StoredRuleset[] to SpectralRuleset[]
            const spectralRulesets: SpectralRuleset[] = allRulesets.map(ruleset => ({
                name: ruleset.name,
                sourceFolder: ruleset.sourceFolder,
                fileName: ruleset.fileName,
                rulesetContentPath: ruleset.rulesetContentPath || ''
            }));

            this.logDebug(`Returning ${spectralRulesets.length} rulesets from configuration`);
            return { rulesets: spectralRulesets };
        } catch (error: unknown) {
            this.logError('Error getting all Spectral rulesets', error);
            return { rulesets: [] };
        }
    }

    async calculateAIReadinessScore(filePath: string): Promise<number | null> {
        try {
            const rulesetResponse = await this.getApplicableRulesets({ filePath });
            const aiReadinessRuleset = rulesetResponse.aiReadinessRuleset;

            if (!aiReadinessRuleset) {
                this.logInfo('AI readiness ruleset not available');
                return null;
            }

            const governanceResult = await this.getGovernance({
                filePath,
                name: aiReadinessRuleset.name,
                ruleset: aiReadinessRuleset
            });

            const { report } = governanceResult;
            if (!report) {
                return null;
            }
            if (typeof report.overview?.score === 'number') {
                // Single source of truth: getGovernance() already applies the blended
                // AI readiness score when agent results are available.
                return report.overview.score;
            }
            return null;
        } catch (error: unknown) {
            this.logError('Failed to calculate AI readiness score', error);
            return null;
        }
    }
}
