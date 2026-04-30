---
name: api-designer-code-review
description: Review changes in the API Designer extension for correctness, regressions, MCP/RPC integration risks, governance scoring consistency, and UI behavior. Use when reviewing pull requests, modified files, or bug-fix changes in api-designer-extension or api-designer-visualizer.
---

# API Designer Code Review

## When to apply

Use this skill when:
- The user asks to review code, PRs, or diffs in API Designer.
- Changes touch `api-designer-extension`, `api-designer-visualizer`, or governance/reporting logic.
- A bug fix might impact validation flows, scoring, cache persistence, or filter/bucket behavior.

## Review priorities (in order)

1. **Behavior correctness**
   - Does the new behavior match the requested UX/runtime behavior?
   - Are edge cases handled (empty report, stale LLM state, missing breakdown keys, unknown severities)?

2. **Regression risk**
   - Could changes break existing flows (Design View, Analyze View, Issue Explorer, Validation modal)?
   - Are default/fallback paths still safe when optional payload fields are missing?

3. **Governance/report integrity**
   - Rule mapping: rule -> sub-bucket -> dimension is consistent.
   - Filtering: overview/breakdown cards open matching issue lists.
   - Scoring: weighted score logic includes all expected rules/findings and severity handling.

4. **Integration safety**
   - MCP tool IDs and `package.json` declarations match exactly.
   - RPC payload contracts are preserved (types and nullable fields).
   - Cache writes preserve all sections and avoid overwrites/races.

5. **Code health**
   - Clear naming, minimal duplication, and consistent type usage.
   - No dead branches or stale comments.
   - UI changes preserve readability and button contrast in dark themes.

## File-aware checklist

### Extension backend (`api-designer-extension/src/**`)
- `governance-manager.ts`: orchestration order, merge points, and default fallback behavior.
- `governance/report-unifier.ts`: bucket/category assignment and score math.
- `governance/rule-constants.ts`: mapping consistency between rule category map and bucket rule map.
- `tools/mcp-tools.ts` + `package.json`: tool id parity and schema alignment.
- `governance/assessment-cache-store.ts`: merge semantics and concurrency-safe writes.

### Visualizer frontend (`api-designer-visualizer/src/**`)
- `AnalyzeSingleReportPage.tsx`: scoped row selection and breakdown drill-down behavior.
- `AnalyzeSingleReportIssueExplorer.tsx`: filter chips, severity handling, prompt safety.
- `hooks/useReport.ts`: normalized issue rows, severity normalization, filter logic parity with UI counts.
- Styling updates: no horizontal overflow; modern card styling still keeps controls readable.

## Expected review output format

Return findings in this order:
1. **Critical issues** (must fix before merge)
2. **Major risks** (high confidence regressions or contract mismatches)
3. **Minor improvements** (readability, maintainability, polish)
4. **Test gaps** (what should be manually/automatically verified)

For each issue include:
- Severity (`critical`, `major`, `minor`)
- Why it is a problem
- Exact file path(s)
- Suggested fix

If no issues are found, explicitly state:
- "No blocking issues found."
- Remaining test gaps or residual risk.

## Verification steps after review

- Run targeted type/lint/build for touched workspaces.
- Reproduce key UX flows impacted by the change (especially filter-to-list and bucket drill-down behavior).
- Verify MCP tool invocation and ids for AI-related actions when relevant.
