# API Designer Governance Reports: Docs Index

This index points to detailed documentation for each Analyze report type.

## Separate report docs

- `docs/report-ai-readiness.md`
- `docs/report-owasp-api-security.md`
- `docs/report-rest-api-guidelines.md`

## Score behavior by report

All reports still compute a Spectral base score:

- `totalRules = number of rules in selected ruleset`
- `failedRuleCount = number of unique failed rule codes`
- `passedRuleCount = totalRules - failedRuleCount`
- `score = round((passedRuleCount / totalRules) * 100)`

How `score` is exposed now:

- `ai-readiness`: `score` uses weighted AI summary score (`aiReadinessSummary.score`) when available, with Spectral base score as fallback.
- `owasp` and `rest-api-readiness`: `score` is now a weighted mean over rule buckets (category/theme level), computed in `governance-manager.ts`.
- For compatibility, the same computed value is mirrored in both:
  - top-level `score`
  - `report.overview.score`

Common notes:

- Multiple findings from the same rule still count as one failed rule.
- Violations are still listed individually in issue explorer/breakdown.
- Severity is normalized to `error | warn | info | hint`.

