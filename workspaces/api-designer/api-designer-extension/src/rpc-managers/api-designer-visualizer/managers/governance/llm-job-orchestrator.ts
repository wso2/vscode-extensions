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

import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { AssessmentCacheStore } from "./assessment-cache-store";
import { formatLlmFailureError, LlmValidationService } from "./llm-validation-service";
import type { LlmValidationFinding, LlmValidationState, ResolveAIFindingRequest } from "./types";

type LlmJobOrchestratorDeps = {
    cacheStore: AssessmentCacheStore;
    llmService: LlmValidationService;
    normalizeFilePath: (filePath: string) => string;
    toInternalLlmRuleId: (rule: string) => string;
    logWarning: (message: string, error?: unknown) => void;
};

export class LlmJobOrchestrator {
    private static llmStateByApiHash = new Map<string, LlmValidationState>();
    private static llmJobsByApiHash = new Map<string, Promise<void>>();
    private readonly cacheStore: AssessmentCacheStore;
    private readonly llmService: LlmValidationService;
    private readonly normalizeFilePath: (filePath: string) => string;
    private readonly toInternalLlmRuleId: (rule: string) => string;
    private readonly logWarning: (message: string, error?: unknown) => void;

    constructor(deps: LlmJobOrchestratorDeps) {
        this.cacheStore = deps.cacheStore;
        this.llmService = deps.llmService;
        this.normalizeFilePath = deps.normalizeFilePath;
        this.toInternalLlmRuleId = deps.toInternalLlmRuleId;
        this.logWarning = deps.logWarning;
    }

    public computeApiHash(content: string): string {
        return createHash("sha256").update(content, "utf8").digest("hex");
    }

    public hasInFlightJob(apiHash: string): boolean {
        return LlmJobOrchestrator.llmJobsByApiHash.has(apiHash);
    }

    public async readWorkspaceCache(filePath: string): Promise<LlmValidationState | null> {
        return this.cacheStore.readWorkspaceCache(this.normalizeFilePath(filePath));
    }

    public async resolveCachedLlmState(filePath: string, apiHash: string): Promise<LlmValidationState | undefined> {
        return this.cacheStore.resolveCachedLlmState(this.normalizeFilePath(filePath), apiHash, LlmJobOrchestrator.llmStateByApiHash);
    }

    private async workspaceCacheFileExists(filePath: string): Promise<boolean> {
        return this.cacheStore.workspaceCacheFileExists(this.normalizeFilePath(filePath));
    }

    private async persistLlmState(filePath: string, state: LlmValidationState, options?: { modelId?: string }): Promise<void> {
        LlmJobOrchestrator.llmStateByApiHash.set(state.apiHash, state);
        await this.cacheStore.persistLlmState(this.normalizeFilePath(filePath), state, options);
    }

    private async startLlmJob(filePath: string, apiHash: string, specContent: string): Promise<void> {
        const existing = LlmJobOrchestrator.llmJobsByApiHash.get(apiHash);
        if (existing) return existing;
        const job = (async () => {
            try {
                const execution = await this.llmService.executeLlmValidation(specContent);
                await this.persistLlmState(filePath, {
                    status: "ready",
                    apiHash,
                    updatedAt: Date.now(),
                    result: execution.result,
                }, { modelId: execution.modelId });
            } catch (error) {
                await this.persistLlmState(filePath, {
                    status: "failed",
                    apiHash,
                    updatedAt: Date.now(),
                    error: formatLlmFailureError(error),
                });
            } finally {
                LlmJobOrchestrator.llmJobsByApiHash.delete(apiHash);
            }
        })();
        LlmJobOrchestrator.llmJobsByApiHash.set(apiHash, job);
        return job;
    }

    public async ensureLlmValidationForFile(filePath: string, options?: { force?: boolean }): Promise<void> {
        try {
            const normalizedPath = this.normalizeFilePath(filePath);
            const specContent = await readFile(normalizedPath, "utf8");
            const apiHash = this.computeApiHash(specContent);
            const force = options?.force === true;
            const cacheFileExists = await this.workspaceCacheFileExists(normalizedPath);
            const workspaceCache = await this.readWorkspaceCache(normalizedPath);
            const cached = await this.resolveCachedLlmState(normalizedPath, apiHash);
            if (cacheFileExists && !force) {
                if (cached?.status === "ready") {
                    LlmJobOrchestrator.llmStateByApiHash.clear();
                    LlmJobOrchestrator.llmStateByApiHash.set(apiHash, cached);
                }
                return;
            }
            if (cached?.status === "ready" && !force) {
                LlmJobOrchestrator.llmStateByApiHash.clear();
                LlmJobOrchestrator.llmStateByApiHash.set(apiHash, cached);
                return;
            }
            if (!force) {
                if (cached?.status === "failed") return;
                if (cached?.status === "pending" && !LlmJobOrchestrator.llmJobsByApiHash.has(apiHash)) return;
                if (!cached && workspaceCache) return;
            }
            if (cached?.status === "pending" && LlmJobOrchestrator.llmJobsByApiHash.has(apiHash)) {
                return;
            }
            await this.persistLlmState(normalizedPath, {
                status: "pending",
                apiHash,
                updatedAt: Date.now(),
            });
            void this.startLlmJob(normalizedPath, apiHash, specContent);
        } catch (error) {
            this.logWarning("Failed to schedule LLM validation", error);
        }
    }

    public async resolveAIFindingForFile(filePath: string, request: ResolveAIFindingRequest): Promise<void> {
        try {
            const normalizedPath = this.normalizeFilePath(filePath);
            const specContent = await readFile(normalizedPath, "utf8");
            const apiHash = this.computeApiHash(specContent);
            const cached = await this.readWorkspaceCache(normalizedPath);
            if (!cached?.result?.findings || !Array.isArray(cached.result.findings)) {
                return;
            }
            const targetRuleRaw = String(request.rule || "").trim();
            const targetRule = targetRuleRaw.toLowerCase();
            const targetRuleCanonical = targetRuleRaw ? this.toInternalLlmRuleId(targetRuleRaw) : "";
            const targetPath = (request.pathSegments || []).map((segment) => String(segment).trim()).filter(Boolean);
            const targetMessage = String(request.message || "").trim();
            const matchesFinding = (finding: LlmValidationFinding): boolean => {
                const findingRuleRaw = String(finding.rule || "").trim();
                const findingRule = findingRuleRaw.toLowerCase();
                const findingRuleCanonical = findingRuleRaw ? this.toInternalLlmRuleId(findingRuleRaw) : "";
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
                if (targetMessage && String(finding.message || "").trim() !== targetMessage) return false;
                return true;
            };
            const remainingFindings = cached.result.findings.filter((finding) => !matchesFinding(finding));
            if (remainingFindings.length === cached.result.findings.length) {
                return;
            }
            const updatedState: LlmValidationState = {
                ...cached,
                status: "ready",
                apiHash,
                updatedAt: Date.now(),
                result: {
                    ...cached.result,
                    findings: remainingFindings,
                },
                error: undefined,
            };
            await this.persistLlmState(normalizedPath, updatedState);
            LlmJobOrchestrator.llmStateByApiHash.clear();
            LlmJobOrchestrator.llmStateByApiHash.set(apiHash, updatedState);
        } catch (error) {
            this.logWarning("Failed to resolve LLM finding from cache", error);
        }
    }
}
