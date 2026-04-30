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

import { readFile } from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { extension } from "../../../../APIDesignerExtensionContext";
import type { LlmExecutionResult, LlmValidationFinding, LlmValidationResult } from "./types";

type Deps = {
    normalizeGuidelineRuleRef: (rule: string) => string | null;
    extractGuidelineRuleRefs: (guidelines: string) => string[];
    toInternalLlmRuleId: (rule: string) => string;
};

/** User-facing text for any thrown value from the LLM pipeline (API, model, parse). */
export function formatLlmFailureError(error: unknown): string {
    if (error instanceof Error) {
        const base = (error.message || "").trim();
        const cause = (error as Error & { cause?: unknown }).cause;
        if (cause instanceof Error) {
            const c = (cause.message || "").trim();
            if (c) {
                return c.length > 500 ? `${base} (${c.slice(0, 500)}…)` : `${base} (${c})`;
            }
        }
        return base || "LLM validation failed";
    }
    if (typeof error === "string" && error.trim()) {
        return error.trim();
    }
    if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
        return String((error as { message: string }).message).trim() || "LLM validation failed";
    }
    return "LLM validation failed";
}

function isUnsupportedModelError(error: unknown): boolean {
    const message = formatLlmFailureError(error).toLowerCase();
    return message.includes("model_not_supported") || message.includes("requested model is not supported");
}

export class LlmValidationService {
    private guidelinesContent: string | null = null;

    constructor(private readonly deps: Deps) {}

    private getAgentReadinessGuidelinesPath(): string {
        const extensionPath = extension.context?.extensionPath;
        if (!extensionPath) {
            throw new Error("Extension path is not initialized");
        }
        return path.join(extensionPath, "skills", "api-design", "references", "agent-readiness-guidelines.md");
    }

    public async getAgentReadinessGuidelines(): Promise<string> {
        if (this.guidelinesContent) {
            return this.guidelinesContent;
        }
        const content = await readFile(this.getAgentReadinessGuidelinesPath(), "utf8");
        this.guidelinesContent = content;
        return content;
    }

    public async buildLlmPrompt(specContent: string): Promise<string> {
        let guidelines = "";
        try {
            guidelines = await this.getAgentReadinessGuidelines();
        } catch {
            // fallback to minimal prompt if guidelines fail to load
        }
        return [
            "You are validating API AI readiness.",
            "Use the following guidelines as the primary rubric for scoring and findings.",
            guidelines,
            "Analyze the OpenAPI content and return strict JSON only with this shape:",
            "{\"score\":number,\"summary\":string,\"findings\":[{\"rule\":string,\"message\":string,\"severity\":\"error|warn|info|hint\",\"path\":\"dot.path.or.empty\",\"suggestion\":\"optional\"}]}",
            "For finding.rule, use guideline rule references exactly in this format: \"Rule X.Y\" (for example \"Rule 3.3\").",
            "Use ONLY rule refs present in the guideline document. Available refs:",
            this.deps.extractGuidelineRuleRefs(guidelines).join(", "),
            "Rules:",
            "- Score must be 0-100",
            "- Keep summary under 220 chars",
            "- Use concise actionable messages",
            "- Findings should be specific and non-duplicative",
            "- Prefer real API design risks over stylistic nits",
            "- suggestion should be an implementable next step",
            "- Return ONLY raw JSON (no markdown, no prose outside JSON)",
            "",
            "OpenAPI document:",
            specContent,
        ].join("\n");
    }

    public normalizeLlmResult(rawText: string): LlmValidationResult {
        const text = rawText.trim();
        if (!text) {
            throw new Error("The model returned an empty response. Try again or use a smaller OpenAPI document.");
        }
        const firstBrace = text.indexOf("{");
        const lastBrace = text.lastIndexOf("}");
        const jsonText = firstBrace >= 0 && lastBrace > firstBrace ? text.slice(firstBrace, lastBrace + 1) : text;
        let parsed: {
            score?: number;
            summary?: string;
            findings?: Array<{ rule?: string; message?: string; severity?: string; path?: string; suggestion?: string }>;
        };
        try {
            parsed = JSON.parse(jsonText) as typeof parsed;
        } catch (e) {
            const hint =
                e instanceof Error && e.message
                    ? ` Parse error: ${e.message.length > 120 ? `${e.message.slice(0, 120)}…` : e.message}`
                    : "";
            throw new Error(
                "The model response was not valid JSON, so the analysis could not be applied." +
                    hint +
                    " Try re-running the analysis, or check that GitHub Copilot’s language model is available."
            );
        }
        const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 0))));
        const findings = (parsed.findings || []).slice(0, 20).map((finding, index) => {
            const pathSegments = String(finding.path || "").split(".").map((segment) => segment.trim()).filter(Boolean);
            const severity: LlmValidationFinding["severity"] =
                (finding.severity === "error" || finding.severity === "warn" || finding.severity === "hint" || finding.severity === "info")
                    ? finding.severity
                    : "info";
            const guidelineRuleRef = this.deps.normalizeGuidelineRuleRef(String(finding.rule || "")) || "Rule Unknown";
            return {
                id: `llm:${index}`,
                rule: guidelineRuleRef,
                message: String(finding.message || "Potential AI readiness issue detected"),
                severity,
                pathSegments,
                displayPath: pathSegments.length > 0 ? pathSegments.join(" > ") : "General",
                suggestion: finding.suggestion ? String(finding.suggestion) : undefined,
            };
        });
        return {
            score,
            summary: String(parsed.summary || "LLM AI readiness validation completed."),
            findings,
        };
    }

    public mapLlmFindingsToGovernanceViolations(llmValidation?: { result?: { findings?: LlmValidationFinding[] } }): Array<{
        rule: string;
        code?: string;
        message: string;
        description?: string;
        fixSuggestion?: string;
        severity: string;
        path?: string[] | string;
    }> {
        const findings = llmValidation?.result?.findings || [];
        return findings.map((finding) => {
            const mappedRule = this.deps.toInternalLlmRuleId(finding.rule);
            return {
                rule: mappedRule,
                code: finding.rule,
                message: finding.message,
                description: finding.suggestion,
                fixSuggestion: finding.suggestion,
                severity: finding.severity,
                path: finding.pathSegments,
            };
        });
    }

    public async executeLlmValidation(specContent: string): Promise<LlmExecutionResult> {
        const vscodeAny = vscode as any;
        if (!vscodeAny.lm?.selectChatModels) {
            throw new Error(
                "The VS Code Language Model API is not available in this host. " +
                    "Open API Designer in VS Code with a recent version and the GitHub Copilot extension."
            );
        }
        const models = await vscodeAny.lm.selectChatModels({ vendor: "copilot" });
        if (!Array.isArray(models) || models.length === 0) {
            throw new Error(
                "No GitHub Copilot chat model is registered. Sign in to Copilot and ensure the default chat model is available, then try again."
            );
        }
        const prompt = await this.buildLlmPrompt(specContent);
        const userMessage = vscodeAny.LanguageModelChatMessage?.User
            ? vscodeAny.LanguageModelChatMessage.User(prompt)
            : { role: "user", content: prompt };
        let lastError: unknown;

        for (const model of models) {
            let output = "";
            let tokenSource: vscode.CancellationTokenSource | undefined;
            try {
                tokenSource = new vscode.CancellationTokenSource();
                const response = await model.sendRequest([userMessage], {}, tokenSource.token);
                for await (const chunk of response.text) {
                    output += String(chunk);
                }
                const modelId = String((model as { id?: string; name?: string })?.id || (model as { id?: string; name?: string })?.name || "copilot");
                return { result: this.normalizeLlmResult(output), modelId };
            } catch (e) {
                lastError = e;
                // If this specific model is unsupported, try the next available Copilot model.
                if (isUnsupportedModelError(e)) {
                    continue;
                }
                const detail = formatLlmFailureError(e);
                throw new Error(
                    `The language model request did not complete: ${detail}. ` +
                        "If this persists, check your Copilot subscription and try a smaller spec."
                );
            } finally {
                tokenSource?.dispose();
            }
        }

        const detail = formatLlmFailureError(lastError);
        throw new Error(
            `The language model request did not complete: ${detail}. ` +
                "No supported Copilot chat model was accepted. " +
                "Check your Copilot subscription/model access and try again."
        );
    }
}
