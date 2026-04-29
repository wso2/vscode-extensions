# API Designer Governance Reports: Docs Index

This index points to detailed documentation for each Analyze report type.

## Separate report docs

- `docs/report-ai-readiness.md`
- `docs/report-owasp-api-security.md`
- `docs/report-rest-api-guidelines.md`

## Score behavior by report

Spectral still computes a base score:

- `totalRules = number of rules in selected ruleset`
- `failedRuleCount = number of unique failed rule codes`
- `passedRuleCount = totalRules - failedRuleCount`
- `score = round((passedRuleCount / totalRules) * 100)`

How `score` is exposed now:

- All report types (`ai-readiness`, `owasp`, `rest-api-readiness`) now use severity-weighted rule penalties inside buckets before weighted aggregation.
- For compatibility, the same computed value is mirrored in both:
  - top-level `score`
  - `report.overview.score`

Common notes:

- Multiple findings from the same rule still count as one failed rule.
- Violations are still listed individually in issue explorer/breakdown.
- Severity is normalized to `error | warn | info | hint`.
- Severity penalty model used in weighted bucket scoring:
  - `error = 1.0`
  - `warn = 0.6`
  - `info = 0.3`
  - `hint = 0.15`
- AI LLM findings are mapped to internal AI rules before report unification and become regular violations with `breakdownKeys`.
- Report cache (`api-reports/<spec>-api-readiness-report.json`) can contain all sections together:
  - `agentReadiness` (Spectral + `aiAnalysis`)
  - `securityReadiness`
  - `restApiReadiness`

