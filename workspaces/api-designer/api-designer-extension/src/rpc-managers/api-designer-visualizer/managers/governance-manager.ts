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
    UnifiedAnalyzeReport,
    SpectralRuleset,
    ValidateAPISpecRequest,
    ValidateAPISpecResponse,
    getDefaultGovernanceSpectralRulesets,
    loadYaml
} from '@wso2/api-designer-core';
import { extension } from '../../../APIDesignerExtensionContext';
import { 
    validateApiSpec,
    validateWithSpectralRuleset
} from '../../../utils/validation-utils';
import {
    getAllSpectralRulesets as getAllSpectralRulesetsFromConfig
} from '../../../spectral/rulesetAutomation';
import { resolveGitHubRawUrl } from '../../../utils/github-utils';
import { BaseRpcManager } from './base-rpc-manager';
import { buildUnifiedReport as buildUnifiedReportFromAdapters } from './governance/report-unifier';
import { AssessmentCacheStore } from './governance/assessment-cache-store';
import { LlmValidationService } from './governance/llm-validation-service';
import { LlmJobOrchestrator } from './governance/llm-job-orchestrator';
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
    private static readonly defaultRulesetFileByReportId: Record<'ai-readiness' | 'owasp' | 'rest-api-readiness', string> = {
        'ai-readiness': 'ai-readiness.yaml',
        'owasp': 'owasp_top_10.yaml',
        'rest-api-readiness': 'wso2_rest_api_design_guidelines.yaml',
    };

    private static readonly llmInternalRuleAllowlist = new Set([
        ...Object.values(AI_READINESS_GUIDELINE_RULE_TO_INTERNAL_RULE).map((rule) => rule.toLowerCase()),
        'ai-readiness-llm-general'
    ]);
    private readonly cacheStore: AssessmentCacheStore;
    private readonly llmService: LlmValidationService;
    private readonly llmJobOrchestrator: LlmJobOrchestrator;

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
        this.llmJobOrchestrator = new LlmJobOrchestrator({
            cacheStore: this.cacheStore,
            llmService: this.llmService,
            normalizeFilePath: this.normalizeFilePath.bind(this),
            toInternalLlmRuleId: this.toInternalLlmRuleId.bind(this),
            logWarning: this.logWarning.bind(this),
        });
    }

    private computeApiHash(content: string): string {
        return this.llmJobOrchestrator.computeApiHash(content);
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
        if (severity === 'error') return 'CRITICAL';
        if (severity === 'warn') return 'HIGH';
        if (severity === 'info') return 'MEDIUM';
        return 'LOW';
    }

    private mapReportSeverityToValidationSeverity(severity: string): LlmValidationFinding['severity'] {
        if (severity === 'CRITICAL') return 'error';
        if (severity === 'HIGH') return 'warn';
        if (severity === 'MEDIUM') return 'info';
        return 'hint';
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
        await this.cacheStore.persistLlmState(this.normalizeFilePath(filePath), state, options);
    }

    private async readWorkspaceCache(filePath: string): Promise<LlmValidationState | null> {
        return this.llmJobOrchestrator.readWorkspaceCache(filePath);
    }

    private async resolveCachedLlmState(filePath: string, apiHash: string): Promise<LlmValidationState | undefined> {
        return this.llmJobOrchestrator.resolveCachedLlmState(filePath, apiHash);
    }

    public async ensureLlmValidationForFile(filePath: string, options?: { force?: boolean }): Promise<void> {
        await this.llmJobOrchestrator.ensureLlmValidationForFile(filePath, options);
    }

    public async resolveAIFindingForFile(filePath: string, request: ResolveAIFindingRequest): Promise<void> {
        await this.llmJobOrchestrator.resolveAIFindingForFile(filePath, request);
    }

    private inferReportKey(name: string): 'ai-readiness' | 'owasp' | 'rest-api-readiness' {
        const lower = name.toLowerCase();
        if (lower.includes('ai') && lower.includes('readiness')) return 'ai-readiness';
        if (lower.includes('owasp') || lower.includes('security')) return 'owasp';
        return 'rest-api-readiness';
    }

    private inferReportKeyFromRuleset(ruleset: Pick<SpectralRuleset, 'name' | 'fileName'>): 'ai-readiness' | 'owasp' | 'rest-api-readiness' {
        const fileName = String(ruleset.fileName || '').toLowerCase();
        if (fileName.includes('ai-readiness')) return 'ai-readiness';
        if (fileName.includes('owasp')) return 'owasp';
        if (fileName.includes('design_guidelines') || fileName.includes('rest_api_design')) return 'rest-api-readiness';
        return this.inferReportKey(ruleset.name);
    }

    private buildBundledDefaultRulesetMap(bundledRulesetsFolder: string): Record<'ai-readiness' | 'owasp' | 'rest-api-readiness', SpectralRuleset> {
        const defaults = getDefaultGovernanceSpectralRulesets(bundledRulesetsFolder);
        const map: Partial<Record<'ai-readiness' | 'owasp' | 'rest-api-readiness', SpectralRuleset>> = {};
        for (const ruleset of defaults) {
            map[this.inferReportKeyFromRuleset(ruleset)] = ruleset;
        }

        // Safety net if default naming changes unexpectedly.
        const normalizedFolder = bundledRulesetsFolder.replace(/[\\/]+$/, '');
        return {
            'ai-readiness': map['ai-readiness'] || {
                name: 'WSO2 REST API AI Readiness Guidelines',
                sourceFolder: normalizedFolder,
                fileName: GovernanceManager.defaultRulesetFileByReportId['ai-readiness'],
                rulesetContentPath: 'rulesetContent',
            },
            'owasp': map['owasp'] || {
                name: 'OWASP Top 10 Security',
                sourceFolder: normalizedFolder,
                fileName: GovernanceManager.defaultRulesetFileByReportId['owasp'],
                rulesetContentPath: 'rulesetContent',
            },
            'rest-api-readiness': map['rest-api-readiness'] || {
                name: 'WSO2 REST API Design Guidelines',
                sourceFolder: normalizedFolder,
                fileName: GovernanceManager.defaultRulesetFileByReportId['rest-api-readiness'],
                rulesetContentPath: 'rulesetContent',
            },
        };
    }

    private selectGovernanceRulesets(
        configuredRulesets: SpectralRuleset[],
        bundledDefaults: Record<'ai-readiness' | 'owasp' | 'rest-api-readiness', SpectralRuleset>
    ): SpectralRuleset[] {
        const configuredByReport = new Map<'ai-readiness' | 'owasp' | 'rest-api-readiness', SpectralRuleset>();
        for (const ruleset of configuredRulesets) {
            const key = this.inferReportKeyFromRuleset(ruleset);
            if (!configuredByReport.has(key)) {
                configuredByReport.set(key, ruleset);
            }
        }

        return (['ai-readiness', 'owasp', 'rest-api-readiness'] as const).map((reportId) =>
            configuredByReport.get(reportId) || bundledDefaults[reportId]
        );
    }

    private async runSpectralValidationWithPerReportFallback(
        content: string,
        reportDisplayName: string,
        requestedRuleset: SpectralRuleset,
        reportId: 'ai-readiness' | 'owasp' | 'rest-api-readiness',
        bundledDefaultRuleset: SpectralRuleset,
        gitRootPath?: string
    ): Promise<{ result: SpectralGovernancePayload; usedRuleset: SpectralRuleset }> {
        const runValidation = async (ruleset: SpectralRuleset): Promise<SpectralGovernancePayload> => {
            const resolvedPath = this.constructRulesetPath(ruleset.sourceFolder, ruleset.fileName);
            const result = await validateWithSpectralRuleset(
                content,
                reportDisplayName,
                resolvedPath,
                ruleset.rulesetContentPath || '',
                gitRootPath,
                undefined
            );
            return result as SpectralGovernancePayload;
        };

        try {
            return { result: await runValidation(requestedRuleset), usedRuleset: requestedRuleset };
        } catch (primaryError: unknown) {
            const isSameAsDefault =
                requestedRuleset.sourceFolder === bundledDefaultRuleset.sourceFolder &&
                requestedRuleset.fileName === bundledDefaultRuleset.fileName &&
                (requestedRuleset.rulesetContentPath || '') === (bundledDefaultRuleset.rulesetContentPath || '');

            if (isSameAsDefault) {
                throw primaryError;
            }

            this.logWarning(
                `[Governance] Failed to validate with configured ruleset for ${reportId}. Falling back to bundled default.`,
                primaryError
            );

            try {
                return { result: await runValidation(bundledDefaultRuleset), usedRuleset: bundledDefaultRuleset };
            } catch {
                throw primaryError;
            }
        }
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
        if (sourceFolder.includes('github.com') || sourceFolder.includes('raw.githubusercontent.com')) {
            const resolved = resolveGitHubRawUrl(sourceFolder, fileName);
            if (resolved) {
                return resolved;
            }
            this.logWarning(`Could not parse GitHub URL: ${sourceFolder}, using fallback join strategy`);
            const cleanFileName = fileName.startsWith('/') ? fileName.substring(1) : fileName;
            const separator = sourceFolder.endsWith('/') ? '' : '/';
            return `${sourceFolder}${separator}${cleanFileName}`;
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
                if (this.llmJobOrchestrator.hasInFlightJob(apiHash)) {
                    void this.ensureLlmValidationForFile(normalizedPath);
                }
            }
            
            // Require ruleset parameter
            if (!params.ruleset || !params.ruleset.sourceFolder || !params.ruleset.fileName) {
                throw new Error(`Ruleset parameter is required with sourceFolder and fileName`);
            }
            
            const reportId = this.inferReportKey(params.name);
            const bundledRulesetsFolder = extension.context?.extensionPath
                ? path.join(extension.context.extensionPath, 'spectral-rulesets')
                : 'spectral-rulesets';
            const bundledDefaults = this.buildBundledDefaultRulesetMap(bundledRulesetsFolder);
            const bundledDefaultRuleset = bundledDefaults[reportId];
            
            // Get git root for resolving local ruleset file paths (if ruleset source is local)
            const fileUri = vscode.Uri.file(normalizedPath);
            const gitRoot = await this.findGitRoot(fileUri);
            const gitRootPath = gitRoot?.fsPath;
            
            const { result: response, usedRuleset } = await this.runSpectralValidationWithPerReportFallback(
                content,
                params.name,
                params.ruleset,
                reportId,
                bundledDefaultRuleset,
                gitRootPath,
            );
            const enrichedResponse = response as SpectralGovernancePayload & {
                metadata?: GovernanceRulesetMetadata;
                schemaVersion?: '2';
                reportId?: 'ai-readiness' | 'owasp' | 'rest-api-readiness';
                report?: BuiltUnifiedReport;
            };
            const resolvedPathForMetadata = this.constructRulesetPath(usedRuleset.sourceFolder, usedRuleset.fileName);
            const rulesetInsights = await this.readRulesetInsights(resolvedPathForMetadata, params.name);
            enrichedResponse.metadata = rulesetInsights.metadata;
            const reportTitle = enrichedResponse.metadata?.name || params.name;
            const inferredReportId = this.inferReportKey(reportTitle);
            if (inferredReportId === 'ai-readiness' && llmValidation?.status === 'ready' && llmValidation.result) {
                const llmViolations = this.llmService.mapLlmFindingsToGovernanceViolations(llmValidation);
                enrichedResponse.violations = [...(enrichedResponse.violations || []), ...llmViolations];
            }
            const unifiedReport = this.buildUnifiedReport(reportTitle, enrichedResponse);
            enrichedResponse.score = unifiedReport.overview.score;
            await this.persistSpectralSection(normalizedPath, unifiedReport.reportId, unifiedReport.violationsById, apiHash);
            (enrichedResponse as GetGovernanceResponse & { schemaVersion?: '2' }).schemaVersion = '2';
            (enrichedResponse as GetGovernanceResponse).reportId = unifiedReport.reportId;
            (enrichedResponse as GetGovernanceResponse).report = unifiedReport as UnifiedAnalyzeReport;
            (enrichedResponse as any).llmValidation = llmValidation;
            return enrichedResponse as GetGovernanceResponse;
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
            const { fetchRulesetsFromFolders } = await import('../../../utils/github-utils');
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
                    const { getGitHubAuth } = await import('../../../utils/github-utils');
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
        const bundledRulesetsFolder = extension.context?.extensionPath
            ? path.join(extension.context.extensionPath, 'spectral-rulesets')
            : 'spectral-rulesets';
        const bundledDefaults = this.buildBundledDefaultRulesetMap(bundledRulesetsFolder);
        const configuredRulesets = getAllSpectralRulesetsFromConfig().map((ruleset) => ({
            name: ruleset.name,
            sourceFolder: ruleset.sourceFolder,
            fileName: ruleset.fileName,
            rulesetContentPath: ruleset.rulesetContentPath || '',
        }));
        const governanceRulesets = this.selectGovernanceRulesets(configuredRulesets, bundledDefaults);

        const buildResponse = (): GetApplicableRulesetsResponse => ({
            governanceRulesets: governanceRulesets.map(ruleset => ({
                ...ruleset
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
