# AI Readiness scoring (OpenAPI) — WSO2 API Designer

This document describes **how API Designer computes the AI Readiness score** for an OpenAPI document, and how that relates to the **[Jentic API AI-Readiness Framework (JAIRF)](https://docs.jentic.com/reference/api-readiness-framework/specification/)** (v1.0.0). It is intended for engineers and PMs; it is **not** a claim of JAIRF conformance.

---

## 1. Scope

- **In scope:** The score and bucket breakdown produced from governance analysis of a REST/OpenAPI artifact using the **WSO2 AI Readiness** Spectral ruleset (`ai-readiness.yaml`) and the summarization logic in `api-designer-core`.
- **Out of scope:** Jentic’s full signal pipeline (embeddings, LLM-based legibility, registry crawls, etc.).

---

## 2. High-level model

### 2.1 What we measure

AI Readiness here is a **rule-based compliance index**: a fixed catalog of Spectral rules, each checking a specific documentation or contract property (summaries, descriptions, examples, typing, error shape, security, pagination, idempotency, and so on). The engine reports **per-rule pass/fail** (and often **per-rule instance counts** via custom functions that record metrics).

The **displayed score** is derived from **how many rules pass**, grouped into **11 sub-buckets**, then into **four dimensions** (pillars), then combined with a **JAIRF-style weighted harmonic mean** across those four dimensions.

This is **conceptually similar** to JAIRF’s “signals → dimensions → index” idea, but **much simpler**:

| Aspect | JAIRF (JAIRF v1.0.0) | WSO2 API Designer (this product) |
|--------|----------------------|----------------------------------|
| Structure | 6 **dimensions** (FC, DXJ, ARAX, AU, SEC, AID), each with many **signals** | **4 dimensions** (Semantic Discovery, Contract Integrity, Resilience &amp; Recovery, Security &amp; Integrity), each grouping several **sub-buckets**; each sub-bucket contains many **rules** |
| Signal values | Continuous normalised \([0,1]\) signals + documented normalisation rules | Mostly **binary per rule** (pass/fail); underlying rules may use coverage metrics internally |
| Sub-bucket score | — | \(100 \times\) (rules passed ÷ rules in sub-bucket), rounded |
| Dimension score | \(100 \times\) mean of normalised signals in that dimension | **Weighted arithmetic mean** of that dimension’s sub-bucket percentages (weights in `SUB_BUCKET_WEIGHTS` in `ai-readiness.ts`) |
| Overall score | **Weighted harmonic mean** of six dimension scores (penalises imbalance) | **Weighted harmonic mean** of **four** dimension scores (weights `aggregationWeight` per dimension, sum to 1) |
| Gating | Hard caps (e.g. FC &lt; 40 → Level 0, security caps) | **No** formal gating layer in the summary function (severity lives in individual rules) |
| Readiness levels | Five bands (&lt;40 … &gt;90) | Product UI may show % and grades; not the same normative table as JAIRF |

Reference: [Jentic — Specification (JAIRF)](https://docs.jentic.com/reference/api-readiness-framework/specification/).

---

## 3. Source of truth in code

| Piece | Location |
|-------|----------|
| Rule definitions (what is checked) | `api-designer-core/src/utils/spectral-rules/ai-readiness.yaml` |
| Rule → sub-bucket mapping, four dimensions, harmonic overall | `api-designer-core/src/utils/ai-readiness.ts` (`buildAiReadinessSummary`, `RULE_CATEGORY_MAP`, `BUCKET_DEFINITIONS`, `AI_READINESS_DIMENSIONS`, `SUB_BUCKET_WEIGHTS`) |
| Alternate score from raw metrics only | `api-designer-core/src/utils/ai-readiness.ts` (`computeReadinessScoreFromMetrics`) |
| Rule → sub-bucket for issue grouping in UI | `api-designer-core/src/utils/ai-readiness.ts` (`getAiReadinessRuleSubBucket`) |

---

## 4. Per-rule evaluation

1. **Governance** runs the ruleset against the API definition.
2. For each rule ID (e.g. `ai-readiness-operation-summary`), the pipeline provides:
   - Optional **metrics** in `aiReadinessMetrics.rules[ruleId]` (e.g. `failed` &gt; 0 if any instance failed).
   - **Violations** for failing instances.
3. In `buildAiReadinessSummary`, each mapped rule is treated as **one logical check**:
   - **Fail** if the metrics say there are failures **or** there is at least one violation for that rule.
   - **Pass** otherwise.
4. **Bucket percentage** = `round(100 * passed_rules / total_rules_in_bucket)` where `total_rules_in_bucket` is the count of rules listed for that bucket in `RULE_CATEGORY_MAP` (static catalog).

So the score is **not** a direct “% of operations documented”; it is **% of our checklist items satisfied**, where each item may itself aggregate many operation-level findings.

---

## 5. Dimension scores and overall (JAIRF-style)

### 5.1 Within each dimension

For each of the four dimensions, only sub-buckets with `total &gt; 0` contribute. The **dimension score** is a **weighted arithmetic mean** of those sub-buckets’ `percentage` values, using `SUB_BUCKET_WEIGHTS` (same family of weights as the former UI-only map).

### 5.2 Overall score

The **headline** `AiReadinessSummary.score` is the **weighted harmonic mean** of the four dimension scores (each in \([0,100]\)), using each dimension’s `aggregationWeight` (fixed constants summing to \(1\)):

\[
\text{score} = \mathrm{round}\left(\min\left(100,\max\left(0,
  \frac{\sum_d w_d}{\sum_d w_d / (s_d + \varepsilon)}
\right)\right)\right)
\]

where \(s_d\) is dimension \(d\)’s score, \(w_d\) is its aggregation weight, and \(\varepsilon\) is a tiny positive constant to avoid division by zero (same pattern as JAIRF).

`BUCKET_DEFINITIONS[].weight` is retained for documentation / possible future use but **does not** drive the headline score once the four-dimension model is applied.

---

## 6. Alternative: `computeReadinessScoreFromMetrics`

If only **category-level** metrics are available (`aiReadinessMetrics.categories`), the helper `computeReadinessScoreFromMetrics` returns:

\[
\mathrm{round}\left(100 \times \frac{\sum \mathrm{passed}_i}{\sum \mathrm{total}_i}\right)
\]

across categories with `total &gt; 0`. This can **diverge** from `buildAiReadinessSummary` because aggregation boundaries differ. Product surfaces should **prefer one** definition and document which path they use.

---

## 7. UI: “AI Readiness Breakdown” (four pillars)

The Analyze view **renders** `aiReadinessSummary.dimensions` from the governance RPC: labels, descriptions, per-dimension scores, and nested `subBuckets` are all computed in `buildAiReadinessSummary`. The webview does not recompute aggregation.

---

## 8. Rough mapping to JAIRF dimensions (informative)

This is **not** a formal alignment; it helps compare narratives.

| JAIRF dimension | WSO2 buckets (roughly) |
|-----------------|-------------------------|
| **FC** Foundational Compliance | Partially: typing, no empty objects, array items; no separate “spec parse / $ref resolution / structural integrity” score unless added as rules |
| **DXJ** Developer experience & tooling | Descriptions, examples, responses (success/error) rules |
| **ARAX** AI-readiness & agent experience | Summaries, descriptions, operationIds, error semantics, RFC 7807-style error rules |
| **AU** Agent usability | Pagination, idempotency, some “contract” rules |
| **SEC** Security | `security` bucket, mutating op security, no interactive auth, etc. |
| **AID** AI discoverability | Lightly: `info`, contact, tags external docs; **not** full registry / `llms.txt` / MCP signals |

---

## 9. Suggested improvements (vs JAIRF and general best practice)

1. **Aggregation: harmonic or “weakest link”**  
   JAIRF uses a **weighted harmonic mean** so one terrible dimension cannot be masked by high scores elsewhere. A **soft** version for us: e.g. blend arithmetic mean with harmonic, or show **min bucket score** alongside the headline number.

2. **Explicit gating**  
   Consider capping the overall score when **critical** rules fail (e.g. security on mutating operations, or catastrophic structural issues) — analogous to JAIRF’s FC &lt; 40 and security caps.

3. **Per-rule or per-finding weights**  
   Today many rules are **equally important** within a bucket. JAIRF-style **severity-weighted** cost functions (or OWASP-style weighting) could better reflect risk.

4. **Separate “infrastructure” vs “content” scores**  
   JAIRF splits **parsing, refs, structure** (FC) from **semantic** layers. Adding explicit **FC-style** signals (valid OpenAPI, `$ref` resolution rate, optional Spectral/Redocly aggregate) would make the index more defensible and closer to JAIRF’s first pillar.

5. **Coverage at the right granularity**  
   Our rules often encode **“all operations must have X”** via field-coverage functions; ensure the **published score** matches user mental models (e.g. “% of operations with a summary” vs “binary rule pass”). If they differ, **surface both** (headline + drill-down).

6. **Discoverability (AID) depth**  
   JAIRF rewards **llms.txt**, **APIs.json**, MCP, workflow links. Optional: small bonus signals or a separate “discoverability” sub-score to avoid conflating **design-time doc quality** with **deployment-time discovery**.

7. **Agent usability without ML**  
   JAIRF uses **embeddings** for distinctiveness and intent. Cheaper heuristics could still help: path/summary **deduplication**, **verb + resource** shape checks, **pagination pattern** coverage.

8. **Consistency of rule catalogs**  
   Keep **one** authoritative list: UI sub-bucket maps, `RULE_CATEGORY_MAP`, and any **“total rules in bucket”** counts should include the same rule IDs (e.g. uniqueness of `operationId` if the ruleset enforces it).

9. **Documentation and auditability**  
   For each major release, publish: **version of ruleset**, **hash or date**, and **which aggregation** (`buildAiReadinessSummary` vs metrics-only) the dashboard uses—similar in spirit to JAIRF’s reproducibility goal.

10. **Optional: JAIRF compatibility mode**  
   A long-term path is an **optional adapter** that maps our rule outcomes into JAIRF’s six dimensions and **harmonic** aggregation for customers who need comparability with Jentic’s published methodology.

---

## 10. References

- Jentic — **API AI-Readiness Framework (JAIRF) Specification (v1.0.0):**  
  https://docs.jentic.com/reference/api-readiness-framework/specification/
- Internal: `workspaces/api-designer/api-designer-core/src/utils/ai-readiness.ts`  
- Internal: `workspaces/api-designer/api-designer-core/src/utils/spectral-rules/ai-readiness.yaml`

---

*This document describes behavior intended by the current implementation; if code and doc disagree, treat the code as authoritative until the doc is updated.*
