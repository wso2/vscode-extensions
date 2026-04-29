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
    DEFAULT_SPECTRAL_RULESET_CATALOG_FOLDER_URL,
    GetAllSpectralRulesetsRequest,
    GetAllSpectralRulesetsResponse,
    GetApplicableRulesetsRequest,
    GetApplicableRulesetsResponse,
    GetGovernanceRequest,
    GetGovernanceResponse,
    UnifiedAnalyzeReport,
    SpectralRuleset,
    ValidateAPISpecRequest,
    ValidateAPISpecResponse,
    getDefaultGovernanceSpectralRulesets,
    loadYaml
} from '@wso2/api-designer-core';
import { 
    validateApiSpec,
    validateWithSpectralRuleset
} from '../../../utils/validation-utils';
import { getAllSpectralRulesets as getAllSpectralRulesetsFromConfig } from '../../../spectral/rulesetAutomation';
import { BaseRpcManager } from './base-rpc-manager';
import { buildUnifiedReport as buildUnifiedReportFromAdapters } from './governance/report-unifier';
import { AssessmentCacheStore } from './governance/assessment-cache-store';
import { LlmValidationService } from './governance/llm-validation-service';
import {
    AI_READINESS_GUIDELINE_RULE_TO_INTERNAL_RULE,
    OWASP_DIMENSIONS,
} from './governance/rule-constants';

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
    passedRules?: Array<{ rule?: string }>;
    breakdown?: {
        score?: number;
        dimensions?: Array<{
            key: string;
            label: string;
            description?: string;
            score: number;
            subBuckets: Array<{
                key: string;
                label: string;
                description?: string;
                percentage: number;
                rules?: Array<{ key: string }>;
            }>;
        }>;
    };
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
    infos: number;
    percentage: number;
    affectedEndpoints: number;
    docsUrl?: string;
    viewIssuesFilter: {
        key: string;
        label: string;
    };
    subBuckets: Array<{
        id: string;
        label: string;
        description?: string;
        percentage: number;
        viewIssuesFilter: {
            key: string;
            label: string;
        };
    }>;
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

type ResolveAIFindingRequest = {
    rule: string;
    pathSegments?: string[];
    message?: string;
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
        subtitle?: string;
        categories: UnifiedBreakdownCategory[];
    };
    issueExplorer: {
        title?: string;
        subtitle?: string;
        breakdownFilterOptions: Array<{ key: string; label: string }>;
    };
    llmReview?: {
        title?: string;
        subtitle?: string;
        viewFindingsLabel?: string;
        reevaluateLabel?: string;
    };
};

/**
 * Manager for governance and validation operations
 * Handles API spec validation, governance checks, and Spectral ruleset management
 */
export class GovernanceManager extends BaseRpcManager {
    private static llmStateByApiHash = new Map<string, LlmValidationState>();
    private static llmJobsByApiHash = new Map<string, Promise<void>>();
    private static readonly llmInternalRuleAllowlist = new Set([
        ...Object.values(AI_READINESS_GUIDELINE_RULE_TO_INTERNAL_RULE).map((rule) => rule.toLowerCase()),
        'ai-readiness-llm-general'
    ]);
    private readonly cacheStore: AssessmentCacheStore;
    private readonly llmService: LlmValidationService;

    private normalizeGuidelineRuleRef(rule: string): string | null {
        const raw = String(rule || '').trim();
        if (!raw) return null;
        const match = raw.match(/rule\s*([0-9]+(?:\.[0-9]+))/i);
        if (!match) return null;
        return `Rule ${match[1]}`;
    }

    private extractGuidelineRuleRefs(guidelines: string): string[] {
        const refs = new Set<string>();
        const regex = /^###\s+Rule\s+([0-9]+(?:\.[0-9]+))\s*-/gim;
        let match = regex.exec(guidelines);
        while (match) {
            refs.add(`Rule ${match[1]}`);
            match = regex.exec(guidelines);
        }
        return Array.from(refs);
    }

    private toInternalLlmRuleId(rule: string): string {
        const normalizedInternal = String(rule || '').trim().toLowerCase();
        if (GovernanceManager.llmInternalRuleAllowlist.has(normalizedInternal)) {
            return normalizedInternal;
        }
        const guidelineRef = this.normalizeGuidelineRuleRef(rule);
        if (!guidelineRef) return 'ai-readiness-llm-general';
        return AI_READINESS_GUIDELINE_RULE_TO_INTERNAL_RULE[guidelineRef.toLowerCase()] || 'ai-readiness-llm-general';
    }

    constructor() {
        super('GovernanceManager');
        this.cacheStore = new AssessmentCacheStore({
            mapValidationSeverityToReportSeverity: this.mapValidationSeverityToReportSeverity.bind(this),
            mapReportSeverityToValidationSeverity: this.mapReportSeverityToValidationSeverity.bind(this),
            computeSectionRating: this.computeSectionRating.bind(this),
            computeCountsFromReportIssues: this.computeCountsFromReportIssues.bind(this),
            deriveScoreFromCounts: this.deriveScoreFromCounts.bind(this),
        });
        this.llmService = new LlmValidationService({
            normalizeGuidelineRuleRef: this.normalizeGuidelineRuleRef.bind(this),
            extractGuidelineRuleRefs: this.extractGuidelineRuleRefs.bind(this),
            toInternalLlmRuleId: this.toInternalLlmRuleId.bind(this),
        });
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

    private async workspaceCacheFileExists(filePath: string): Promise<boolean> {
        return this.cacheStore.workspaceCacheFileExists(this.normalizeFilePath(filePath));
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

    private async persistSpectralSection(
        filePath: string,
        reportId: 'ai-readiness' | 'owasp' | 'rest-api-readiness',
        violationsById: Record<string, UnifiedViolation>,
        specContentHash?: string
    ): Promise<void> {
        await this.cacheStore.persistSpectralSection(this.normalizeFilePath(filePath), reportId, violationsById, {
            specContentHash,
        });
    }

    private async persistLlmState(filePath: string, state: LlmValidationState, options?: { modelId?: string }): Promise<void> {
        GovernanceManager.llmStateByApiHash.clear();
        GovernanceManager.llmStateByApiHash.set(state.apiHash, state);
        await this.cacheStore.persistLlmState(this.normalizeFilePath(filePath), state, options);
    }

    private async readWorkspaceCache(filePath: string): Promise<LlmValidationState | null> {
        return this.cacheStore.readWorkspaceCache(this.normalizeFilePath(filePath));
    }

    private async resolveCachedLlmState(filePath: string, apiHash: string): Promise<LlmValidationState | undefined> {
        return this.cacheStore.resolveCachedLlmState(this.normalizeFilePath(filePath), apiHash, GovernanceManager.llmStateByApiHash);
    }

    private async executeLlmValidation(specContent: string): Promise<LlmExecutionResult> {
        return this.llmService.executeLlmValidation(specContent);
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

    public async resolveAIFindingForFile(filePath: string, request: ResolveAIFindingRequest): Promise<void> {
        try {
            const normalizedPath = this.normalizeFilePath(filePath);
            const specContent = await readFile(normalizedPath, 'utf8');
            const apiHash = this.computeApiHash(specContent);
            const cached = await this.readWorkspaceCache(normalizedPath);
            if (!cached?.result?.findings || !Array.isArray(cached.result.findings)) {
                return;
            }
            const targetRuleRaw = String(request.rule || '').trim();
            const targetRule = targetRuleRaw.toLowerCase();
            const targetRuleCanonical = targetRuleRaw ? this.toInternalLlmRuleId(targetRuleRaw) : '';
            const targetPath = (request.pathSegments || []).map((segment) => String(segment).trim()).filter(Boolean);
            const targetMessage = String(request.message || '').trim();
            const matchesFinding = (finding: LlmValidationFinding): boolean => {
                const findingRuleRaw = String(finding.rule || '').trim();
                const findingRule = findingRuleRaw.toLowerCase();
                const findingRuleCanonical = findingRuleRaw ? this.toInternalLlmRuleId(findingRuleRaw) : '';
                if (targetRule) {
                    const directMatch = findingRule === targetRule;
                    const canonicalMatch = !!targetRuleCanonical && findingRuleCanonical === targetRuleCanonical;
                    if (!directMatch && !canonicalMatch) return false;
                }
                if (targetPath.length > 0) {
                    const findingPath = (finding.pathSegments || []).map((segment) => String(segment).trim()).filter(Boolean);
                    if (findingPath.length !== targetPath.length) return false;
                    for (let i = 0; i < targetPath.length; i++) {
                        if (findingPath[i] !== targetPath[i]) return false;
                    }
                }
                if (targetMessage && String(finding.message || '').trim() !== targetMessage) return false;
                return true;
            };
            const remainingFindings = cached.result.findings.filter((finding) => !matchesFinding(finding));
            if (remainingFindings.length === cached.result.findings.length) {
                return;
            }
            const updatedState: LlmValidationState = {
                ...cached,
                status: 'ready',
                apiHash,
                updatedAt: Date.now(),
                result: {
                    ...cached.result,
                    findings: remainingFindings,
                },
                error: undefined,
            };
            await this.persistLlmState(normalizedPath, updatedState);
            GovernanceManager.llmStateByApiHash.clear();
            GovernanceManager.llmStateByApiHash.set(apiHash, updatedState);
        } catch (error) {
            this.logWarning('Failed to resolve LLM finding from cache', error);
        }
    }

    private inferReportKey(name: string): 'ai-readiness' | 'owasp' | 'rest-api-readiness' {
        const lower = name.toLowerCase();
        if (lower.includes('ai') && lower.includes('readiness')) return 'ai-readiness';
        if (lower.includes('owasp') || lower.includes('security')) return 'owasp';
        return 'rest-api-readiness';
    }

    private async readRulesetInsights(
        rulesetPath: string,
        rulesetName: string
    ): Promise<{ metadata: GovernanceRulesetMetadata; owaspCategoryKeys?: string[] }> {
        const baseMetadata: GovernanceRulesetMetadata = { name: rulesetName };
        const parseMetadata = (parsed: Record<string, unknown> | undefined): GovernanceRulesetMetadata => {
            if (!parsed || typeof parsed !== 'object') return baseMetadata;
            return {
                name: typeof parsed.name === 'string' ? parsed.name : rulesetName,
                description: typeof parsed.description === 'string' ? parsed.description : undefined,
                ruleCategory: typeof parsed.ruleCategory === 'string' ? parsed.ruleCategory : undefined,
                ruleType: typeof parsed.ruleType === 'string' ? parsed.ruleType : undefined,
                artifactType: typeof parsed.artifactType === 'string' ? parsed.artifactType : undefined,
                documentationLink: typeof parsed.documentationLink === 'string' ? parsed.documentationLink : undefined,
                provider: typeof parsed.provider === 'string' ? parsed.provider : undefined,
            };
        };
        const extractOwaspCategoryKeys = (parsed: {
            rulesetContent?: { rules?: Record<string, unknown> };
            rules?: Record<string, unknown>;
        } | undefined): string[] | undefined => {
            const ruleEntries = Object.keys(parsed?.rulesetContent?.rules || parsed?.rules || {});
            const keySet = new Set<string>();
            ruleEntries.forEach((ruleName) => {
                const match = ruleName.match(/owasp:api(\d+)(?::(\d{4}))?/i);
                if (!match) return;
                const apiNumber = match[1];
                const year = match[2] || '2023';
                keySet.add(`API${apiNumber}:${year}`);
            });
            const orderedKeys = OWASP_DIMENSIONS
                .map((dimension) => dimension.key.toUpperCase())
                .filter((categoryKey) => keySet.has(categoryKey));
            return orderedKeys.length > 0 ? orderedKeys : undefined;
        };

        try {
            let content: string;
            if (rulesetPath.startsWith('http://') || rulesetPath.startsWith('https://')) {
                const response = await fetch(rulesetPath);
                if (!response.ok) {
                    if (rulesetName.toLowerCase().includes('wso2')) {
                        return { metadata: { ...baseMetadata, provider: 'WSO2' } };
                    }
                    return { metadata: baseMetadata };
                }
                content = await response.text();
            } else {
                content = await readFile(rulesetPath, 'utf8');
            }
            const parsed = loadYaml(content) as ({
                rulesetContent?: { rules?: Record<string, unknown> };
                rules?: Record<string, unknown>;
            } & Record<string, unknown>) | undefined;
            return {
                metadata: parseMetadata(parsed),
                owaspCategoryKeys: extractOwaspCategoryKeys(parsed),
            };
        } catch {
            if (rulesetName.toLowerCase().includes('wso2')) {
                return { metadata: { ...baseMetadata, provider: 'WSO2' } };
            }
            return { metadata: baseMetadata };
        }
    }

    private buildUnifiedReport(
        name: string,
        response: SpectralGovernancePayload
    ): BuiltUnifiedReport {
        return buildUnifiedReportFromAdapters(
            name,
            response
        );
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
                            error: 'OpenAPI spec changed since last evaluation. Click Analyse to refresh.',
                        }
                        : (workspaceCache || undefined);
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
            };
            const rulesetInsights = await this.readRulesetInsights(rulesetConfig.filePath, params.name);
            response.metadata = rulesetInsights.metadata;
            const reportTitle = response.metadata?.name || params.name;
            const inferredReportId = this.inferReportKey(reportTitle);
            if (inferredReportId === 'ai-readiness' && llmValidation?.status === 'ready' && llmValidation.result) {
                const llmViolations = this.llmService.mapLlmFindingsToGovernanceViolations(llmValidation);
                response.violations = [...(response.violations || []), ...llmViolations];
                const llmScore = llmValidation.result.score;
                if (typeof llmScore === 'number' && Number.isFinite(llmScore)) {
                    const rounded = Math.max(0, Math.min(100, Math.round(llmScore)));
                    response.score = rounded;
                    if (response.breakdown && typeof response.breakdown === 'object') {
                        response.breakdown = { ...response.breakdown, score: rounded };
                    }
                }
            }
            const unifiedReport = this.buildUnifiedReport(reportTitle, response);
            response.score = unifiedReport.overview.score;
            await this.persistSpectralSection(normalizedPath, unifiedReport.reportId, unifiedReport.violationsById, apiHash);
            (response as GetGovernanceResponse & { schemaVersion?: '2' }).schemaVersion = '2';
            (response as GetGovernanceResponse).reportId = unifiedReport.reportId;
            (response as GetGovernanceResponse).report = unifiedReport as UnifiedAnalyzeReport;
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
        const configuredFolders = vscode.workspace
            .getConfiguration('apiDesigner')
            .get<string[]>('spectral.rulesetFolders', [])
            .map((folder) => (folder || '').trim())
            .filter((folder) => folder.length > 0);
        const primaryFolder = (configuredFolders[0] || DEFAULT_SPECTRAL_RULESET_CATALOG_FOLDER_URL).replace(/[\\/]+$/, '');

        const buildResponse = (): GetApplicableRulesetsResponse => ({
            governanceRulesets: DEFAULT_GOVERNANCE_RULESETS.map(ruleset => ({
                ...ruleset,
                sourceFolder: ruleset.fileName === 'ai-readiness.yaml' ? `${primaryFolder}/ai` : primaryFolder
            })),
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
}
