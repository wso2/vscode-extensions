/**
 * One row from your Spectral / lint result list (before normalization).
 */
export interface ValidationFinding {
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
}

/**
 * What you pass into {@link generateReport}: optional scores plus the violation list.
 */
export interface GenerateReportInput {
  violations?: ValidationFinding[];
  score?: number;
  passedChecks?: number;
  totalChecks?: number;
}

/**
 * Distinguishes AI readiness vs OWASP vs WSO2 REST in the generated payload (`reportId` on the result).
 */
export type ReportKind = 'ai-readiness' | 'owasp' | 'rest-api-readiness';

/**
 * Normalized issue in `violationsById` on the generated report.
 */
export interface ReportIssue {
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
}

/**
 * One category row under `breakdown.categories` (OWASP or WSO2 theme).
 */
export interface BreakdownCategory {
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
  viewIssuesFilter: { key: string; label: string };
  topRules?: string[];
}

/**
 * Full report object returned from {@link generateReport}.
 * (The `reportId` field name is kept for compatibility with API Designer’s RPC model.)
 */
export interface GeneratedReport {
  schemaVersion: '1';
  reportId: ReportKind;
  title: string;
  violationsById: Record<string, ReportIssue>;
  overview: {
    score: number;
    passedChecks: number;
    totalChecks: number;
    metrics: Array<{
      id: string;
      label: string;
      value: number | string;
      hint?: string;
      accent?: 'success' | 'error' | 'warning' | 'info' | 'neutral';
    }>;
  };
  breakdown: { title: string; categories: BreakdownCategory[] };
  issueExplorer: { breakdownFilterOptions: Array<{ key: string; label: string }> };
  aiReadinessSummary?: unknown;
}

export const OWASP_CATEGORIES: ReadonlyArray<{ key: string; label: string }>;
export const WSO2_THEMES: ReadonlyArray<{
  id: string;
  title: string;
  description: string;
  keywords: string[];
}>;

/** Guess report type from the ruleset’s display name (e.g. “OWASP …” → `owasp`). */
export function getReportKind(rulesetName: string): ReportKind;

/**
 * Build the full analyze/governance report from raw validation output.
 * @param rulesetName - Ruleset display name; used to choose report type and for `title`
 * @param input - Scores and violation list from your Spectral (or similar) run
 */
export function generateReport(rulesetName: string, input: GenerateReportInput): GeneratedReport;
