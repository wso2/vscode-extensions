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

export class LlmValidationService {
    private guidelinesContent: string | null = null;

    constructor(private readonly deps: Deps) {}

    private getAgentReadinessGuidelinesPath(): string {
        const extensionPath = extension.context?.extensionPath;
        if (!extensionPath) {
            throw new Error("Extension path is not initialized");
        }
        return path.join(extensionPath, "skills", "api-readiness-assessment", "references", "agent-readiness-guidelines.md");
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
        const firstBrace = text.indexOf("{");
        const lastBrace = text.lastIndexOf("}");
        const jsonText = firstBrace >= 0 && lastBrace > firstBrace ? text.slice(firstBrace, lastBrace + 1) : text;
        const parsed = JSON.parse(jsonText) as {
            score?: number;
            summary?: string;
            findings?: Array<{ rule?: string; message?: string; severity?: string; path?: string; suggestion?: string }>;
        };
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
            throw new Error("Language model API is not available");
        }
        const models = await vscodeAny.lm.selectChatModels({ vendor: "copilot" });
        if (!Array.isArray(models) || models.length === 0) {
            throw new Error("No Copilot chat model available");
        }
        const model = models[0];
        const prompt = await this.buildLlmPrompt(specContent);
        const userMessage = vscodeAny.LanguageModelChatMessage?.User
            ? vscodeAny.LanguageModelChatMessage.User(prompt)
            : { role: "user", content: prompt };
        const response = await model.sendRequest([userMessage], {}, new vscode.CancellationTokenSource().token);
        let output = "";
        for await (const chunk of response.text) {
            output += String(chunk);
        }
        const modelId = String((model as { id?: string; name?: string })?.id || (model as { id?: string; name?: string })?.name || "copilot");
        return { result: this.normalizeLlmResult(output), modelId };
    }
}
