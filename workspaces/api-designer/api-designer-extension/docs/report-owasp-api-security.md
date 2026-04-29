# OWASP API Security Report: Categories, Rules, and Scoring

This document explains the OWASP report in full detail:

- how categories are determined
- what rules are in each category (default ruleset)
- how score and bucket metrics are calculated

## 1) Runtime sources

- Spectral execution + base scoring: `api-designer-extension/src/utils/validation-utils.ts`
- OWASP categories + breakdown/scoring shaping: `api-designer-extension/src/rpc-managers/api-designer-visualizer/managers/governance/report-unifier.ts`
- Default ruleset catalog entries: `api-designer-core/src/constants/default-spectral-rulesets.ts`

Default OWASP ruleset entry:

- name: `OWASP Top 10 Security`
- file: `owasp_top_10.yaml`
- ruleset content key: `rulesetContent`

## 2) Category model used by UI

The OWASP report has fixed category definitions:

- `API1:2023` Broken Object Level Authorization
- `API2:2023` Broken Authentication
- `API3:2023` Broken Object Property Level Authorization
- `API4:2023` Unrestricted Resource Consumption
- `API5:2023` Broken Function Level Authorization
- `API6:2023` Unrestricted Access to Sensitive Business Flows
- `API7:2023` Server Side Request Forgery
- `API8:2023` Security Misconfiguration
- `API9:2023` Improper Inventory Management
- `API10:2023` Unsafe Consumption of APIs

## 3) How each violation is mapped to an OWASP category

For each violation:

- read rule code/name (e.g., `owasp:api8:2023-no-server-http`)
- extract `API<number>[:year]` via regex
- if year missing, default to `:2023`
- category key becomes `API<number>:<year>`

Examples:

- `owasp:api3:2023-no-additionalProperties` -> `API3:2023`
- `owasp:api8-no-server-http` (if year omitted) -> `API8:2023`

## 4) Which categories are shown

Displayed categories are constrained to categories that have at least one rule in the active ruleset (`allRulesByBucket` / `failedRulesByBucket`).

## 5) Default WSO2 OWASP rules and category grouping (exact)

From default `owasp_top_10.yaml`:

### `API2:2023`

- `owasp:api2:2023-no-http-basic`
- `owasp:api2:2023-jwt-best-practices`

### `API3:2023`

- `owasp:api3:2023-no-additionalProperties`
- `owasp:api3:2023-constrained-additionalProperties`
- `owasp:api3:2023-no-unevaluatedProperties`
- `owasp:api3:2023-constrained-unevaluatedProperties`

### `API4:2023`

- `owasp:api4:2023-rate-limit-retry-after`
- `owasp:api4:2023-rate-limit-responses-429`

### `API8:2023`

- `owasp:api8:2023-no-scheme-http`
- `owasp:api8:2023-no-server-http`
- `owasp:api8:2023-define-error-validation`
- `owasp:api8:2023-define-error-responses-401`
- `owasp:api8:2023-define-error-responses-500`

### `API9:2023`

- `owasp:api9:2023-inventory-access`
- `owasp:api9:2023-inventory-environment`

Observed default coverage:

- categories present by default: `API2`, `API3`, `API4`, `API8`, `API9`
- categories with zero mapped rules in default ruleset: `API1`, `API5`, `API6`, `API7`, `API10`

## 6) Score calculation

OWASP now uses a weighted category mean (returned in `score`).

### 6.1 Rule-level sets

- `allRules`: union of failed and passed rule IDs
- `rulePenaltyByRule`: max severity penalty per failed rule

If `allRules` is empty, fallback is the incoming Spectral base score.

### 6.2 Bucket assignment

Each rule is mapped to an OWASP category key from its rule id:

- extract `API<number>[:year]`
- if year missing, default to `:2023`
- example: `owasp:api8:2023-no-server-http` -> `API8:2023`

For each category bucket:

- `bucket.total = number of rules in that category`
- `bucket.penalty = sum(max penalty per rule in that category)`
- `bucketScore = ((bucket.total - bucket.penalty) / bucket.total) * 100`

Severity penalties:

- `error = 1.0`
- `warn = 0.6`
- `info = 0.3`
- `hint = 0.15`

### 6.3 Category weights (exact)

- `API1:2023`: `1.4`
- `API2:2023`: `1.3`
- `API3:2023`: `1.2`
- `API4:2023`: `1.1`
- `API5:2023`: `1.3`
- `API6:2023`: `1.1`
- `API7:2023`: `1.2`
- `API8:2023`: `1.0`
- `API9:2023`: `0.8`
- `API10:2023`: `0.9`

### 6.4 Final score formula

- `weightedSum = Σ(bucketScore * bucketWeight)`
- `totalWeight = Σ(bucketWeight for active buckets)`
- `score = round(weightedSum / totalWeight)`
- clamp to `[0, 100]`

If `totalWeight <= 0`, fallback is incoming Spectral base score.

Compatibility note:

- This weighted value is sent in both top-level `score` and `report.overview.score`.

## 7) Breakdown metrics per category

For each category bucket:

- `total`: violations in that category
- `errors`: count with severity `error`
- `warnings`: count with severity `warn`
- `percentage` is rule-coverage percentage for that OWASP category using the same severity-weighted penalty model
- `affectedEndpoints`: unique `(METHOD, PATH)` pairs touched by the category
- `status = failed` if `total > 0`, else `passed`

Breakdown filters are generated from these category buckets and labels.
