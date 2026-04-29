# AI Readiness Report: Buckets, Rules, Weights, and Scoring

This document describes the AI readiness report behavior in detail, including:

- exact bucket definitions
- exact rule-to-bucket mapping
- sub-bucket and dimension weights
- all scoring formulas used in runtime

## 1) Data sources and runtime paths

- Spectral run + base score: `api-designer-extension/src/utils/validation-utils.ts`
- Unified report shaping: `api-designer-extension/src/rpc-managers/api-designer-visualizer/managers/governance-manager.ts`
- AI readiness summary (weighted aggregation): `api-designer-core/src/governance/ai-readiness.ts`
- AI readiness ruleset: `api-designer-extension/skills/api-readiness-assessment/references/agent-readiness-spectral/ai-readiness.yaml`

## 2) Score concepts (all of them)

AI readiness currently exposes three score constructs:

1. **Base Spectral governance score** (`response.score`, shown in `report.overview.score`)
2. **AI readiness weighted summary score** (`aiReadinessSummary.score`)
3. **LLM analysis score** in workspace cache (`agentReadiness.aiAnalysis.score`)

These are separate and are not interchangeable.

## 3) AI readiness score in report payload (`score`)

For AI readiness, the score returned in both:

- top-level `score`
- `report.overview.score`

is the weighted AI summary score (`aiReadinessSummary.score`) when available.

Fallback behavior:

- if `aiReadinessSummary.score` is unavailable, it falls back to the Spectral base score.

## 4) AI readiness weighted summary score (`aiReadinessSummary`)

This is calculated in `buildAiReadinessSummary(...)`.

### 4.1 Rule pass/fail decision at summary time

For each mapped AI rule:

- rule is **failed** if either:
  - metrics says `ruleMetric.failed > 0`, or
  - there is at least one violation with that rule code
- otherwise rule is **passed**

Each mapped rule contributes as a binary check:

- failed rule => `filled = 0`
- passed rule => `filled = 1`

### 4.2 Sub-bucket percentage

For each bucket:

- `total = number of mapped rules in that bucket`
- `filled = count(passed rules in that bucket)`
- `percentage = round((filled / total) * 100)`

### 4.3 Dimension score (weighted arithmetic mean)

Each dimension has sub-buckets and each sub-bucket has a weight (`SUB_BUCKET_WEIGHTS`).

Within one dimension:

- `dimensionScore = sum(subBucket.percentage * subBucketWeight) / sum(subBucketWeight)`

Only sub-buckets with `total > 0` are considered active for dimension computation.

### 4.4 Final AI readiness score (weighted harmonic mean)

The final `aiReadinessSummary.score` is the weighted harmonic mean across the four dimensions:

- weights are dimension `aggregationWeight` values
- constants:
  - `HARMONIC_EPS = 1e-6`
- implementation equivalent:
  - `sumW = Σ w_d`
  - `denom = Σ [w_d / max(HARMONIC_EPS, s_d + HARMONIC_EPS)]`
  - `score = round(clamp(sumW / denom, 0, 100))`

This intentionally penalizes weak dimensions more than an arithmetic mean.

## 5) Dimension definitions and weights (exact)

- `discovery` (Semantic Discovery), aggregation weight `0.26`
  - sub-buckets: `summaries`, `descriptions`, `operationIds`
- `contract` (Contract Integrity), aggregation weight `0.26`
  - sub-buckets: `examples`, `typing`, `errors`
- `resilience` (Resilience & Recovery), aggregation weight `0.24`
  - sub-buckets: `errorSemantics`, `headers`, `pagination`
- `security` (Security & Integrity), aggregation weight `0.24`
  - sub-buckets: `security`, `idempotency`

## 6) Full hierarchy: dimensions, sub-buckets, weights, and rule counts

This is the complete hierarchy used by `buildAiReadinessSummary(...)`.

- **Dimension:** `discovery` (Semantic Discovery), aggregation weight `0.26`
  - **Sub-bucket:** `summaries`, weight `1.2`, rule count `4`
  - **Sub-bucket:** `descriptions`, weight `1.0`, rule count `18`
  - **Sub-bucket:** `operationIds`, weight `1.3`, rule count `3`

- **Dimension:** `contract` (Contract Integrity), aggregation weight `0.26`
  - **Sub-bucket:** `examples`, weight `1.0`, rule count `10`
  - **Sub-bucket:** `typing`, weight `1.1`, rule count `12`
  - **Sub-bucket:** `errors`, weight `1.25`, rule count `9`

- **Dimension:** `resilience` (Resilience & Recovery), aggregation weight `0.24`
  - **Sub-bucket:** `errorSemantics`, weight `1.35`, rule count `4`
  - **Sub-bucket:** `headers`, weight `1.15`, rule count `1`
  - **Sub-bucket:** `pagination`, weight `1.1`, rule count `2`

- **Dimension:** `security` (Security & Integrity), aggregation weight `0.24`
  - **Sub-bucket:** `security`, weight `1.5`, rule count `5`
  - **Sub-bucket:** `idempotency`, weight `1.4`, rule count `1`

Total mapped AI readiness rules used in weighted summary = `69`.

## 7) Sub-bucket weights (exact)

- `summaries`: `1.2`
- `descriptions`: `1.0`
- `operationIds`: `1.3`
- `examples`: `1.0`
- `errors`: `1.25`
- `typing`: `1.1`
- `errorSemantics`: `1.35`
- `headers`: `1.15`
- `pagination`: `1.1`
- `security`: `1.5`
- `idempotency`: `1.4`

## 8) Rules in each sub-bucket (with check intent)

### `summaries`

- `ai-readiness-operation-summary`: operation summary exists.
- `ai-readiness-callback-operation-summary`: callback operation summary exists.
- `ai-readiness-webhook-operation-summary`: webhook operation summary exists.
- `ai-readiness-path-item-summary`: path item summary exists.

### `descriptions`

- `ai-readiness-api-description`: `info.description` exists and meets minimum length.
- `ai-readiness-server-description`: each server has a description.
- `ai-readiness-path-item-description`: path item description exists.
- `ai-readiness-operation-description`: operation description exists and meets minimum length.
- `ai-readiness-operation-tags`: operation has at least one tag.
- `ai-readiness-parameter-description`: each parameter has description.
- `ai-readiness-parameter-description-length`: parameter description length threshold.
- `ai-readiness-request-body-description`: request body description exists.
- `ai-readiness-response-description`: each response has description.
- `ai-readiness-error-response-description-length`: error response descriptions are meaningful.
- `ai-readiness-schema-description`: component schema description exists.
- `ai-readiness-schema-description-length`: schema description length threshold.
- `ai-readiness-schema-title`: schema title exists.
- `ai-readiness-schema-property-description`: schema property description exists.
- `ai-readiness-schema-enum-description`: enum property description exists.
- `ai-readiness-tags-description`: global tag description exists.
- `ai-readiness-tags-external-docs`: global tags include external docs.
- `ai-readiness-deprecation-notice`: deprecated operation description includes migration hints.

### `operationIds`

- `ai-readiness-operation-id`: operation has `operationId`.
- `ai-readiness-operation-id-casing`: `operationId` style is consistent across API.
- `ai-readiness-operation-id-unique`: `operationId` values are unique.

### `examples`

- `ai-readiness-parameter-example`: query/path parameters include examples.
- `ai-readiness-path-parameter-example`: path-level query/path parameters include examples.
- `ai-readiness-parameter-content-example`: parameter `content` includes example(s).
- `ai-readiness-path-parameter-content-example`: path-level parameter `content` includes example(s).
- `ai-readiness-request-body-example`: request body content includes examples.
- `ai-readiness-response-example`: successful response content includes examples.
- `ai-readiness-response-header-example`: response headers include examples.
- `ai-readiness-schema-example`: component schemas include examples.
- `ai-readiness-schema-property-example`: schema properties include examples.
- `ai-readiness-component-header-example`: component headers include examples.

### `typing`

- `ai-readiness-request-body-schema-typed`: request body schema has type or `$ref`.
- `ai-readiness-request-body-schema-required`: request body schema declares `required`.
- `ai-readiness-response-schema-typed`: response schema has type or `$ref`.
- `ai-readiness-schema-property-type`: schema properties define explicit type.
- `ai-readiness-parameter-schema-type`: parameter schemas define explicit type.
- `ai-readiness-schema-string-format`: string schemas use semantic `format`.
- `ai-readiness-schema-no-empty-object`: object schemas are not empty/ambiguous.
- `ai-readiness-schema-property-no-empty-object`: object-typed properties are not empty.
- `ai-readiness-array-items-defined`: array schemas define `items`.
- `ai-readiness-array-property-items-defined`: array-type properties define `items`.
- `ai-readiness-schema-validation-constraints`: scalar properties define constraints.
- `ai-readiness-discriminator`: polymorphic schemas define discriminator.

### `errors`

- `ai-readiness-success-response`: operation defines at least one success status.
- `ai-readiness-success-response-content`: success response defines `content`.
- `ai-readiness-success-response-json-schema`: JSON success response has schema.
- `ai-readiness-error-responses-4xx`: operation includes at least one key client-error code.
- `ai-readiness-error-responses-5xx`: operation includes server-error response.
- `ai-readiness-error-response-content`: error response defines `content`.
- `ai-readiness-error-response-json-schema`: JSON error response has schema.
- `ai-readiness-response-content-type`: response content type is explicitly declared.
- `ai-readiness-error-response-schema`: error response schema is present.

### `errorSemantics`

- `ai-readiness-error-schema-fields`: error schema includes `message` and `code`.
- `ai-readiness-error-schema-rfc7807`: error schema includes RFC7807-style fields.
- `ai-readiness-error-schema-details`: error schema includes `details`.
- `ai-readiness-error-schema-actionable`: `422` schema includes `expected` and `received`.

### `headers`

- `ai-readiness-429-rate-limit-headers`: `429` response provides retry/rate-limit headers.

### `pagination`

- `ai-readiness-list-pagination-params`: list GET operations expose pagination params.
- `ai-readiness-pagination-response-meta`: list responses include pagination metadata.

### `security`

- `ai-readiness-api-contact`: API contact information exists.
- `ai-readiness-no-interactive-auth`: security scheme avoids interactive OAuth flows.
- `ai-readiness-security-defined`: `components.securitySchemes` exists.
- `ai-readiness-security-description`: security schemes include descriptions.
- `ai-readiness-security-on-mutating-ops`: mutating operations declare security requirements.

### `idempotency`

- `ai-readiness-idempotency-key`: POST/PATCH operations support `Idempotency-Key`.

## 9) LLM analysis scoring in workspace cache

This is separate from the weighted summary score.

### 9.1 Severity mapping

From validation severity to cached report severity:

- `error -> HIGH`
- `warn -> MEDIUM`
- `info/hint -> LOW`

### 9.2 Derived numeric score

Counts are aggregated as `critical/high/medium/low`, then:

- `penalty = critical*30 + high*15 + medium*7 + low*3`
- `llmScore = clamp(100 - penalty, 0, 100)`

### 9.3 Rating label

- `Poor`: `critical >= 3`
- `Fair`: `critical in [1..2]` OR (`critical == 0` AND `high >= 5`)
- `Good`: `critical == 0` AND `high in [1..4]`
- `Excellent`: otherwise

## 10) Breakdown and issue-explorer metrics in unified report

In addition to score:

- `errors`: count of violations with severity `error`
- `warnings`: count of violations with severity `warn`
- `operations affected`: unique `(method, endpoint)` impacted by violations

These are displayed in `report.overview.metrics`.
