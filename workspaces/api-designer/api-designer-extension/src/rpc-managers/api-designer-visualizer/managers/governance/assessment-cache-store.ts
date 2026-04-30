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

import { mkdir, readFile, stat, writeFile } from "fs/promises";
import * as path from "path";
import { logError } from "../../../../utils/logger";
import type { LlmValidationFinding, LlmValidationState, ReportIssue } from "./types";

type Helpers = {
    mapValidationSeverityToReportSeverity: (severity: "error" | "warn" | "info" | "hint") => "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    mapReportSeverityToValidationSeverity: (severity: string) => LlmValidationFinding["severity"];
    computeSectionRating: (counts: { critical: number; high: number; medium: number; low: number }) => "Poor" | "Fair" | "Good" | "Excellent";
    computeCountsFromReportIssues: (issues: ReportIssue[]) => { critical: number; high: number; medium: number; low: number };
    deriveScoreFromCounts: (counts: { critical: number; high: number; medium: number; low: number }) => number;
};

export class AssessmentCacheStore {
    /** One write queue per cache file so parallel governance persists (Design metrics) do not clobber each other. */
    private readonly cacheWriteChainByPath = new Map<string, Promise<void>>();

    constructor(private readonly helpers: Helpers) {}

    private runExclusiveCacheWrite(cachePath: string, work: () => Promise<void>): Promise<void> {
        const prev = this.cacheWriteChainByPath.get(cachePath) ?? Promise.resolve();
        const next = prev
            .catch((err: unknown) => {
                logError(`AssessmentCacheStore: previous write chain failed for ${cachePath}`, err);
            })
            .then(work)
            .catch((err: unknown) => {
                logError(`AssessmentCacheStore: cache write failed for ${cachePath}`, err);
            });
        this.cacheWriteChainByPath.set(cachePath, next);
        return next;
    }

    public getWorkspaceCachePath(filePath: string): string {
        const parsed = path.parse(filePath);
        const reportFileName = `${parsed.name}-api-readiness-report.json`;
        return path.join(parsed.dir, "api-reports", reportFileName);
    }

    public async workspaceCacheFileExists(filePath: string): Promise<boolean> {
        try {
            await stat(this.getWorkspaceCachePath(filePath));
            return true;
        } catch {
            return false;
        }
    }

    public async readAssessmentDocument(cachePath: string): Promise<Record<string, unknown>> {
        try {
            const content = await readFile(cachePath, "utf8");
            const parsed = JSON.parse(content) as unknown;
            return (parsed && typeof parsed === "object") ? parsed as Record<string, unknown> : {};
        } catch {
            return {};
        }
    }

    private buildLlmReportIssues(findings: LlmValidationFinding[]): ReportIssue[] {
        return (findings || []).map((finding, index) => ({
            id: `ai-${String(index + 1).padStart(3, "0")}`,
            severity: this.helpers.mapValidationSeverityToReportSeverity(finding.severity),
            rule: finding.rule || "llm.validation",
            path: finding.pathSegments.length > 0 ? finding.pathSegments.join(".") : "general",
            issue: finding.message || "Potential AI readiness issue detected",
            description: finding.message || "Potential AI readiness issue detected",
            fixSuggestion: finding.suggestion || "Review and update the API specification to address this issue.",
            autoFixable: false,
        }));
    }

    private buildSpectralReportIssues(
        violationsById: Record<string, {
            rule: string;
            pathSegments?: string[];
            message: string;
            description?: string;
            fixSuggestion?: string;
            severity: "error" | "warn" | "info" | "hint";
        }>
    ): ReportIssue[] {
        return Object.values(violationsById).map((violation, index) => ({
            id: `spec-${String(index + 1).padStart(3, "0")}`,
            severity: this.helpers.mapValidationSeverityToReportSeverity(violation.severity),
            rule: violation.rule,
            path: (violation.pathSegments || []).join("."),
            issue: violation.message,
            description: violation.description || violation.message,
            fixSuggestion: violation.fixSuggestion || "Review and update the API specification to address this issue.",
            autoFixable: true,
        }));
    }

    public async persistSpectralSection(
        filePath: string,
        reportId: "ai-readiness" | "owasp" | "rest-api-readiness",
        violationsById: Record<string, {
            rule: string;
            pathSegments?: string[];
            message: string;
            description?: string;
            fixSuggestion?: string;
            severity: "error" | "warn" | "info" | "hint";
        }>,
        cacheMeta?: { specContentHash?: string }
    ): Promise<void> {
        const cachePath = this.getWorkspaceCachePath(filePath);
        return this.runExclusiveCacheWrite(cachePath, async () => {
            try {
                await mkdir(path.dirname(cachePath), { recursive: true });
                const existing = await this.readAssessmentDocument(cachePath);
            const currentMeta = existing.meta && typeof existing.meta === "object"
                ? existing.meta as Record<string, unknown>
                : {};
            const spectralIssues = this.buildSpectralReportIssues(violationsById);
            const counts = this.helpers.computeCountsFromReportIssues(spectralIssues);
            const rating = this.helpers.computeSectionRating(counts);
            if (reportId === "ai-readiness") {
                const rawAgentReadiness = existing.agentReadiness;
                const agentReadinessBase =
                    rawAgentReadiness !== null &&
                    typeof rawAgentReadiness === "object" &&
                    !Array.isArray(rawAgentReadiness)
                        ? (rawAgentReadiness as Record<string, unknown>)
                        : {};
                const existingSpecHash =
                    typeof currentMeta.specHash === "string" && currentMeta.specHash.length > 0
                        ? String(currentMeta.specHash)
                        : "";
                const specHashForMeta =
                    existingSpecHash.length > 0
                        ? existingSpecHash
                        : (typeof cacheMeta?.specContentHash === "string" && cacheMeta.specContentHash.length > 0
                            ? cacheMeta.specContentHash
                            : "");
                const modelForMeta =
                    typeof currentMeta.model === "string" && currentMeta.model.length > 0
                        ? String(currentMeta.model)
                        : "copilot";
                const merged = {
                    ...existing,
                    meta: {
                        ...currentMeta,
                        specFile: filePath,
                        assessedAt: new Date().toISOString(),
                        guidelinesVersion: "agent-readiness-guidelines.md",
                        model: modelForMeta,
                        specHash: specHashForMeta,
                    },
                    agentReadiness: {
                        ...agentReadinessBase,
                        spectral: {
                            status: "completed",
                            ruleset: "references/agent-readiness-spectral/ai-readiness.yaml",
                            score: { ...counts, rating },
                            issues: spectralIssues,
                        },
                    },
                };
                await writeFile(cachePath, JSON.stringify(merged, null, 2), "utf8");
                return;
            }

            if (reportId === "owasp") {
                const currentSecurityReadiness = existing.securityReadiness && typeof existing.securityReadiness === "object"
                    ? existing.securityReadiness as Record<string, unknown>
                    : {};
                const merged = {
                    ...existing,
                    meta: {
                        ...currentMeta,
                        specFile: filePath,
                        assessedAt: new Date().toISOString(),
                    },
                    securityReadiness: {
                        ...currentSecurityReadiness,
                        spectral: {
                            status: "completed",
                            ruleset: "references/owasp-top-10-raw.yaml",
                            score: { ...counts, rating },
                            issues: spectralIssues,
                        },
                    },
                };
                await writeFile(cachePath, JSON.stringify(merged, null, 2), "utf8");
                return;
            }

            if (reportId === "rest-api-readiness") {
                const rawRestReadiness = existing.restApiReadiness;
                const restReadinessBase =
                    rawRestReadiness !== null &&
                    typeof rawRestReadiness === "object" &&
                    !Array.isArray(rawRestReadiness)
                        ? (rawRestReadiness as Record<string, unknown>)
                        : {};
                const existingSpecHashRest =
                    typeof currentMeta.specHash === "string" && currentMeta.specHash.length > 0
                        ? String(currentMeta.specHash)
                        : "";
                const specHashRest =
                    existingSpecHashRest.length > 0
                        ? existingSpecHashRest
                        : (typeof cacheMeta?.specContentHash === "string" && cacheMeta.specContentHash.length > 0
                            ? cacheMeta.specContentHash
                            : "");
                const modelRest =
                    typeof currentMeta.model === "string" && currentMeta.model.length > 0
                        ? String(currentMeta.model)
                        : "copilot";
                const merged = {
                    ...existing,
                    meta: {
                        ...currentMeta,
                        specFile: filePath,
                        assessedAt: new Date().toISOString(),
                        model: modelRest,
                        specHash: specHashRest,
                    },
                    restApiReadiness: {
                        ...restReadinessBase,
                        spectral: {
                            status: "completed",
                            ruleset: "references/wso2_rest_api_design_guidelines.yaml",
                            score: { ...counts, rating },
                            issues: spectralIssues,
                        },
                    },
                };
                await writeFile(cachePath, JSON.stringify(merged, null, 2), "utf8");
            }
            } catch (err: unknown) {
                logError(`AssessmentCacheStore: failed to persist spectral section for ${filePath}`, err);
            }
        });
    }

    public async persistLlmState(filePath: string, state: LlmValidationState, options?: { modelId?: string }): Promise<void> {
        const cachePath = this.getWorkspaceCachePath(filePath);
        return this.runExclusiveCacheWrite(cachePath, async () => {
            try {
                await mkdir(path.dirname(cachePath), { recursive: true });
                const existing = await this.readAssessmentDocument(cachePath);
            const currentMeta = existing.meta && typeof existing.meta === "object"
                ? existing.meta as Record<string, unknown>
                : {};
            const rawAgentReadiness = existing.agentReadiness;
            const currentAgentReadiness =
                rawAgentReadiness !== null &&
                typeof rawAgentReadiness === "object" &&
                !Array.isArray(rawAgentReadiness)
                    ? (rawAgentReadiness as Record<string, unknown>)
                    : {};
            const existingAiAnalysis = currentAgentReadiness.aiAnalysis && typeof currentAgentReadiness.aiAnalysis === "object"
                ? currentAgentReadiness.aiAnalysis as Record<string, unknown>
                : {};
            const existingIssues = Array.isArray(existingAiAnalysis.issues)
                ? existingAiAnalysis.issues as ReportIssue[]
                : [];
            const reportIssues = state.result ? this.buildLlmReportIssues(state.result.findings || []) : existingIssues;
            const counts = this.helpers.computeCountsFromReportIssues(reportIssues);
            const rating = this.helpers.computeSectionRating(counts);
            const modelId = options?.modelId || String(currentMeta.model || "copilot");
            const aiStatus = state.status === "ready" ? "completed" : state.status === "failed" ? "failed" : state.status;
            const nextAiAnalysis: Record<string, unknown> = {
                ...existingAiAnalysis,
                status: aiStatus,
                score: { ...counts, rating },
                issues: reportIssues,
            };
            if (state.status === "failed" && typeof state.error === "string" && state.error.trim().length > 0) {
                nextAiAnalysis.error = state.error.trim();
            } else {
                delete nextAiAnalysis.error;
            }
            const merged = {
                ...existing,
                meta: {
                    ...currentMeta,
                    specFile: filePath,
                    specHash: state.apiHash,
                    assessedAt: new Date(state.updatedAt || Date.now()).toISOString(),
                    guidelinesVersion: "agent-readiness-guidelines.md",
                    model: modelId,
                },
                agentReadiness: {
                    ...currentAgentReadiness,
                    aiAnalysis: nextAiAnalysis,
                },
            };
                await writeFile(cachePath, JSON.stringify(merged, null, 2), "utf8");
            } catch (err: unknown) {
                logError(`AssessmentCacheStore: failed to persist LLM state for ${filePath}`, err);
            }
        });
    }

    public async readWorkspaceCache(filePath: string): Promise<LlmValidationState | null> {
        try {
            const cachePath = this.getWorkspaceCachePath(filePath);
            const content = await readFile(cachePath, "utf8");
            const parsed = JSON.parse(content) as unknown;
            if (!parsed || typeof parsed !== "object") return null;
            const object = parsed as Record<string, unknown>;
            if ("status" in object && "apiHash" in object) {
                return object as LlmValidationState;
            }
            const aiAnalysis = object.agentReadiness
                && typeof object.agentReadiness === "object"
                && (object.agentReadiness as Record<string, unknown>).aiAnalysis
                && typeof (object.agentReadiness as Record<string, unknown>).aiAnalysis === "object"
                ? (object.agentReadiness as Record<string, unknown>).aiAnalysis as Record<string, unknown>
                : null;
            if (!aiAnalysis) return null;
            const statusRaw = String(aiAnalysis.status || "failed");
            const status: LlmValidationState["status"] =
                statusRaw === "completed"
                    ? "ready"
                    : (statusRaw === "pending" || statusRaw === "failed" || statusRaw === "stale" || statusRaw === "ready")
                        ? statusRaw
                        : "failed";
            const scoreObj = aiAnalysis.score && typeof aiAnalysis.score === "object"
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
                rule: String(issue.rule || "llm.validation"),
                message: String(issue.issue || issue.description || "Potential AI readiness issue detected"),
                severity: this.helpers.mapReportSeverityToValidationSeverity(String(issue.severity || "").toUpperCase()),
                pathSegments: String(issue.path || "").split(".").map((segment) => segment.trim()).filter(Boolean),
                displayPath: String(issue.path || "General").split(".").join(" > "),
                suggestion: typeof issue.fixSuggestion === "string" ? issue.fixSuggestion : undefined,
            }));
            const meta = object.meta && typeof object.meta === "object" ? object.meta as Record<string, unknown> : {};
            const updatedAt = Date.parse(String(meta.assessedAt || "")) || Date.now();
            const specHash = typeof meta.specHash === "string" ? meta.specHash : "";
            return {
                status,
                apiHash: specHash,
                updatedAt,
                result: {
                    score: this.helpers.deriveScoreFromCounts(counts),
                    summary: "LLM AI readiness validation completed.",
                    findings,
                },
                error: typeof aiAnalysis.error === "string" ? aiAnalysis.error : undefined,
            };
        } catch {
            return null;
        }
    }

    public async resolveCachedLlmState(filePath: string, apiHash: string, inMemory: Map<string, LlmValidationState>): Promise<LlmValidationState | undefined> {
        const cacheFileExists = await this.workspaceCacheFileExists(filePath);
        if (!cacheFileExists) return undefined;
        const workspaceCache = await this.readWorkspaceCache(filePath);
        if (workspaceCache && workspaceCache.apiHash === apiHash) {
            inMemory.clear();
            inMemory.set(apiHash, workspaceCache);
            return workspaceCache;
        }
        return inMemory.get(apiHash);
    }
}
