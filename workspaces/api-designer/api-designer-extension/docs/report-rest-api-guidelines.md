# REST API Guidelines Report: Themes, Rule Bucketing, and Scoring

This document explains how the WSO2 REST API guidelines report works, including:

- theme definitions
- deterministic rule-id bucketing behavior
- default ruleset rules and their current theme mapping
- score and breakdown formulas

## 1) Runtime sources

- Spectral execution + base scoring: `api-designer-extension/src/utils/validation-utils.ts`
- REST theme definitions + bucketing logic: `api-designer-extension/src/rpc-managers/api-designer-visualizer/managers/governance-manager.ts`
- Default ruleset catalog entry: `api-designer-core/src/constants/default-spectral-rulesets.ts`

Default REST ruleset entry:

- name: `WSO2 REST API Design Guidelines`
- file: `wso2_rest_api_design_guidelines.yaml`
- ruleset content key: `rulesetContent`

## 2) Theme set used by UI

The report uses six fixed themes:

- `resource-design` (Resource Design)
- `operations-methods` (Operations & Methods)
- `contracts-responses` (Contracts & Responses)
- `documentation` (Documentation Quality)
- `security-governance` (Security & Governance)
- `other` (Other / unmapped)

## 3) How each violation is assigned to a theme

Theme selection is deterministic and rule-id based.

Algorithm:

1. Normalize the violation rule id to lowercase
2. Look up the rule id in a fixed `WSO2_RULE_THEME_MAP`
3. Assign the mapped theme id
4. If a rule id is not present in the map, fallback to `other`

This removes message-text dependency and gives stable, predictable bucketing.

## 4) Default WSO2 REST ruleset rules and current mapping

Default ruleset has 28 rules. With deterministic mapping, they map as follows:

Rationale for this grouping:

- **Resource Design**: URL/path shape and REST resource naming conventions
- **Operations & Methods**: operation identity and method-level semantics
- **Contracts & Responses**: schema/example/parameter contract quality
- **Documentation**: descriptive metadata and discoverability text
- **Security & Governance**: unsafe documentation/script content controls

### `resource-design`

- `path-declarations-must-exist`
- `paths-no-trailing-slash`
- `path-not-include-query`
- `paths-no-query-params`
- `path-casing`
- `resource-names-plural`
- `paths-no-http-verbs`
- `paths-avoid-special-characters`

### `operations-methods`

- `operation-operationId`
- `operation-operationId-valid-in-url`

### `contracts-responses`

- `path-parameters-on-path-only`
- `oas3-examples-value-or-externalValue`
- `array-items`

### `documentation`

- `contact-url`
- `contact-email`
- `contact-name`
- `info-contact`
- `info-description`
- `info-license`
- `license-url`
- `openapi-tags-alphabetical`
- `openapi-tags`
- `operation-description`
- `operation-tags`
- `tag-description`
- `parameter-description`

### `security-governance`

- `no-eval-in-markdown`
- `no-script-tags-in-markdown`

### `other`

- none by default mapping (reserved for future/unmapped rules)

Note:

- Mapping stability now depends on `WSO2_RULE_THEME_MAP`. A rule changes theme only when this mapping is updated.

## 5) Score calculation

REST report now uses a weighted theme mean (returned in `score`).

### 5.1 Rule-level sets

- `failedRules`: unique failed rule IDs from violations
- `allRules`: union of `failedRules` and `passedRules`

If `allRules` is empty, fallback is incoming Spectral base score.

### 5.2 Theme assignment

Each rule is assigned by deterministic `WSO2_RULE_THEME_MAP`.
Unmapped/future rules go to `other`.

For each theme bucket:

- `bucket.total = number of rules in that theme`
- `bucket.failed = number of failed rules in that theme`
- `bucketScore = ((bucket.total - bucket.failed) / bucket.total) * 100`

### 5.3 Theme weights (exact)

- `resource-design`: `1.2`
- `operations-methods`: `1.1`
- `contracts-responses`: `1.3`
- `documentation`: `1.0`
- `security-governance`: `1.4`
- `other`: `0.8`

### 5.4 Final score formula

- `weightedSum = Σ(bucketScore * bucketWeight)`
- `totalWeight = Σ(bucketWeight for active buckets)`
- `score = round(weightedSum / totalWeight)`
- clamp to `[0, 100]`

If `totalWeight <= 0`, fallback is incoming Spectral base score.

Compatibility note:

- This weighted value is sent in both `score` and `report.overview.score`.

## 6) Breakdown metrics per theme

For each theme bucket:

- `total`: violation count assigned to theme
- `errors`: count with severity `error`
- `warnings`: count with severity `warn`
- `percentage = round((total / allViolations) * 100)` (0 if no violations)
- `affectedEndpoints`: unique `(METHOD, PATH)` pairs touched by theme violations
- `topRules`: top 2 most frequent rule IDs in that theme
- `status = failed` if `total > 0`, else `passed`

Breakdown filters are generated from these theme buckets.
