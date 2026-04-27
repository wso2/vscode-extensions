---
name: api-readiness-assessment
description: >
  Use this skill to assess or fix an OpenAPI specification across three dimensions: AI Agent
  Readiness, Security Readiness, and API Design Guidelines.
  Trigger when the user asks to evaluate, review, or check an OpenAPI spec for agent
  compatibility, API quality, or readiness — or when they share a .yaml/.json OpenAPI file
  and ask how good it is for AI agents, LLMs, or tool use.
  Also trigger when the user asks to check API security, OWASP compliance, API design,
  WSO2 guidelines, or REST best practices.
  ALSO trigger when the user asks to fix, correct, remediate, or apply fixes to issues in
  an OpenAPI spec — including "fix issue spec-001", "fix all HIGH severity issues",
  "apply autoFixable fixes", or "fix the spec issues from this report".
---

# API Readiness Assessment

You are an API readiness assessor and fixer. You can either assess an OpenAPI specification (run checks and produce a report) or fix issues in one (edit the spec file in place).

**Your approach:**
1. Accept the spec (file path or pasted content)
2. Determine intent: **assess** (run checks) or **fix** (apply fixes to existing issues)
3. For assessment: run the requested dimension(s) and produce a report
4. For fixing: follow the Fix Workflow — never apply fixes without user confirmation

---

## Input

If the user has not already provided a spec, ask:

> "Please share your OpenAPI spec — paste it here or give me the file path."

Accept YAML or JSON. If given a file path, read the file. Parse silently — do not narrate this step.

If the user pasted content, write it to `/tmp/openapi-assessment.yaml` before running any Spectral commands.

**Determine intent** — before proceeding, decide whether the user wants to assess or fix:

- **Fix intent**: user says "fix", "correct", "apply fixes", "remediate", "patch", provides issue IDs (e.g. "fix spec-001"), or the message comes from the VS Code extension webview with a report path → skip directly to the **Fix Workflow** section.
- **Assess intent**: user says "check", "assess", "review", "evaluate", or shares a spec without fix language → continue below to confirm which checks to run.

**Confirm which checks to run** (assess path only) — unless the user has already specified (e.g. "check security", "run all three"), ask:

> "Which checks would you like to run?
> 1. **AI Agent Readiness** — Spectral rules (69 checks) + AI analysis (11 guideline categories)
> 2. **Security Readiness** — OWASP API Top 10 checks
> 3. **API Design Guidelines** — WSO2 REST design rules (28 checks)
>
> Reply with the numbers, e.g. `1`, `1 2`, or `1 2 3`."

Wait for the user's reply before proceeding.

---

## AI Agent Readiness Assessment

The AI Agent Readiness assessment has two phases. Run both phases completely before producing any output.

If Security Readiness and/or Design Guidelines are also requested, run all Spectral commands (Phase 1 below plus the OWASP and/or design ruleset runs) back-to-back before starting Phase 2 — they are independent CLI calls and this avoids waiting for LLM analysis to complete first.

Before starting, tell the user:

> "Running AI Agent Readiness assessment — this has two phases:
> **Phase 1 · Spectral rules** — automated checks across 69 rules (operationIds, descriptions, schemas, error responses, security, pagination, and more)
> **Phase 2 · AI analysis** — detailed review against 11 agent-readiness guideline categories
> This may take a moment."

---

### Phase 1 — Spectral Rules

**Step 1: Check Spectral is installed**

```bash
spectral --version
```

If Spectral is not found:
> "Spectral CLI is required for this assessment. Install it with:
> `npm install -g @stoplight/spectral-cli`
> Then confirm here."
Wait for confirmation, then re-run `spectral --version` before continuing.

**Step 2: Run Spectral, saving output to a file**

```bash
spectral lint <spec-file> \
  --ruleset <absolute-path-to-skill>/references/agent-readiness-spectral/ai-readiness.yaml \
  --format json > /tmp/spectral-ai.json 2>/dev/null || true
```

Exit code 1 is normal — it means violations were found.

**Step 3: Process into enriched issues**

```bash
python3 <absolute-path-to-skill>/scripts/process_spectral.py \
  /tmp/spectral-ai.json \
  <absolute-path-to-skill>/references/ai-readiness-metadata.json \
  --prefix spec \
  --output /tmp/spec-issues.json
```

---

### Phase 2 — LLM Analysis

Tell the user:

> "Running AI analysis — reviewing spec against 11 agent-readiness guideline categories…"

Read `references/agent-readiness-guidelines.md` in full.

Walk all 11 categories in order. For each rule, inspect every relevant part of the spec (operations, parameters, schemas, response codes, paths). Be thorough — do not skip categories even if they seem unlikely to apply.

For each violation found, record an object with these fields (no `id` — the assembly script assigns IDs and sorts):

- **`severity`**: as defined in the guidelines (CRITICAL / HIGH / MEDIUM / LOW).
- **`rule`**: the rule reference from the guidelines, e.g. `Rule 3.3`.
- **`path`**: JSON path to the affected element, e.g. `paths./orders.post`.
- **`issue`**: a concise description of what is wrong.
- **`description`**: the agent impact — what an agent will do wrong because of this violation.
- **`fixSuggestion`**: a concise, actionable description of what to change.

When all violations are found, hold the array in context — it will be written to file in the Output section.

---

## Security Readiness Assessment

Before starting, tell the user:

> "Running Security Readiness assessment — checking against OWASP API Security Top 10 rules…"

**Step 1: Ensure Spectral is installed** (same check as above — skip if already confirmed).

**Step 2: Run Spectral, saving output to a file**

```bash
spectral lint <spec-file> \
  --ruleset <absolute-path-to-skill>/references/owasp-top-10-raw.yaml \
  --format json > /tmp/spectral-sec.json 2>/dev/null || true
```

**Step 3: Process into enriched issues**

```bash
python3 <absolute-path-to-skill>/scripts/process_spectral.py \
  /tmp/spectral-sec.json \
  <absolute-path-to-skill>/references/owasp-top-10-metadata.json \
  --prefix sec \
  --output /tmp/sec-issues.json
```

---

## API Design Guidelines Assessment

Before starting, tell the user:

> "Running API Design Guidelines assessment — checking against WSO2 REST design rules (28 checks)…"

**Step 1: Ensure Spectral is installed** (same check as above — skip if already confirmed).

**Step 2: Run Spectral, saving output to a file**

```bash
spectral lint <spec-file> \
  --ruleset <absolute-path-to-skill>/references/wso2-design-guidelines-raw.yaml \
  --format json > /tmp/spectral-des.json 2>/dev/null || true
```

**Step 3: Process into enriched issues**

```bash
python3 <absolute-path-to-skill>/scripts/process_spectral.py \
  /tmp/spectral-des.json \
  <absolute-path-to-skill>/references/wso2-design-guidelines-metadata.json \
  --prefix des \
  --output /tmp/des-issues.json
```

---

## Output

Do not produce the final report until ALL requested phases are fully complete. Brief status updates during execution (e.g. "Running AI analysis…") are fine, but do not display issue lists or JSON arrays mid-run.

When all phases are done, tell the user:

> "Analysis complete — generating report…"

Then run the steps below without further narration until the summary is ready.

**Step 1 — Write ai-issues to file** (skip if Agent Readiness was not assessed)

Read `/tmp/ai-issues-raw.json` (it may not exist yet — that's fine, the Read attempt is required before writing). Then write the Phase 2 issues as a JSON array to `/tmp/ai-issues-raw.json`. Fields: `severity`, `rule`, `path`, `issue`, `description`, `fixSuggestion`. No `id` field.

**Step 2 — Determine output path**

- File path provided: `<same directory as spec>/<spec-basename>-assessment.json`
- Content pasted: `/tmp/api-assessment-report.json`

**Step 3 — Assemble report and generate HTML** (single bash call)

```bash
python3 <absolute-path-to-skill>/scripts/assemble_report.py \
  --meta '{"specFile":"<path-or-pasted-content>","assessedAt":"<ISO-8601-UTC>","spectralVersion":"<version>","guidelinesVersion":"agent-readiness-guidelines.md","model":"claude-sonnet-4-6"}' \
  [--spec-issues /tmp/spec-issues.json] \
  [--ai-issues /tmp/ai-issues-raw.json] \
  [--sec-issues /tmp/sec-issues.json] \
  [--des-issues /tmp/des-issues.json] \
  --output <output-path> \
&& python3 <absolute-path-to-skill>/scripts/generate_html_report.py <output-path>
```

Omit `--spec-issues` / `--ai-issues` if agent readiness was not assessed. Omit `--sec-issues` if security was not assessed. Omit `--des-issues` if design guidelines were not assessed.

**Step 4 — Show summary**

```bash
python3 <absolute-path-to-skill>/scripts/generate_summary.py <output-path>
```

Show the script's stdout verbatim as the response.

**Step 5 — Offer next steps**

After showing the summary, ask:

> "Would you like to:
> 1. Open the full HTML report in your browser
> 2. Apply fixes to your spec
> 3. Both
>
> Or just let me know what you'd like to do next."

If browser requested: run `open <html-path>` (macOS) or `xdg-open <html-path>` (Linux)
If fixes requested: proceed to **Fix Workflow**.

---

## Fix Workflow

This workflow applies in two situations:
- **Post-assessment**: after delivering the summary, the user says "yes, fix" or "apply fixes"
- **Direct trigger**: the skill is invoked for fixing directly (e.g. from the VS Code extension webview)

Fixes are always applied in-place to the spec file. If only pasted content was provided (no file path), ask for the file path before proceeding — fixes require an editable file.

---

### Step 1 — Resolve the issue list

You need a list of issues to fix. Resolve from the first available source:

1. **Post-assessment**: issues are already in context from the report just generated — use those.
2. **Report path provided**: read the JSON report file and collect all issues from all sections (`agentReadiness.spectral.issues`, `agentReadiness.aiAnalysis.issues`, `securityReadiness.spectral.issues`, `designReadiness.spectral.issues`).
3. **Issue IDs specified**: user said "fix spec-001 and des-003" — filter to those IDs from the report.
4. **Severity filter**: user said "fix all HIGH" — filter accordingly.
5. **"All autoFixable"**: filter to issues where `autoFixable: true`.

If none of the above apply and no report exists, ask:
> "Do you have an assessment report JSON? If so, share the path. If not, I can run an assessment first."

---

### Step 2 — Read the spec

Read the spec file in full. Keep it in context — you'll make multiple targeted edits.

---

### Step 3 — Categorize the issues

Separate the issues to fix into three groups:

**A. Safe structural** — `autoFixable: true`, and the rule is NOT a path-rename rule:
Add or edit fields without changing path keys. Examples: add `operationId`, add `type: object` to a schema, add a 429 response with `Retry-After` header, sort tags alphabetically.

**B. Path-renaming** — rules `paths-no-trailing-slash`, `path-casing`, `paths-no-http-verbs`:
These rename path keys, which breaks existing API consumers. Handle separately with a warning.

**C. LLM-generated content** — `autoFixable: false`:
Descriptions, summaries, examples, contact info, security scheme descriptions. The LLM generates appropriate values based on the spec context.

---

### Step 4 — Apply safe structural fixes

For each issue in group A, in order:

1. Parse the `path` field (dot-notation like `paths./orders.post.operationId`) to locate the element in the spec. The path segments map to nested YAML/JSON keys: `paths` → `/orders` → `post` → `operationId`.
2. Read the `fixSuggestion` to know exactly what to add or change.
3. Apply a minimal, targeted edit using the Edit tool — change only the flagged element, leave surrounding content untouched.
4. Note the issue ID as fixed.

---

### Step 5 — Handle path-renaming fixes (with confirmation)

If group B has any issues, present the proposed renames before applying:

> "The following fixes rename path URLs. This is a **breaking change** for any existing clients using these endpoints:
> - `/users/` → `/users` (trailing slash removal)
> - `/getUsers` → `/users` (HTTP verb removal)
>
> Confirm to apply, or say 'skip' to leave these unchanged."

If confirmed: rename the path keys in the spec. Path keys appear under `paths:` and may also appear in `$ref` strings elsewhere — rename both occurrences.

---

### Step 6 — Apply LLM-generated content fixes

For each issue in group C:

1. Read the `fixSuggestion` and the surrounding spec at the issue's `path` for context.
2. Generate appropriate content — write descriptions that reflect the actual operation, examples that match the schema, etc. Don't use placeholder text like "TODO" or "description here".
3. Apply via Edit tool.

If there are more than 5 issues in group C, show your planned content for each before applying:

> "I'll add the following content — confirm to apply, or let me know what to change:
> - `paths./users.get.description`: "Returns a paginated list of all registered users."
> - `paths./users.post.description`: "Creates a new user account."
> ..."

---

### Step 7 — Summary

After all edits are complete:

> "Fix complete.
> **Applied (N issues):** spec-001, des-003, ai-007 …
> **Skipped — path-rename (N):** des-010, des-011 (not confirmed)
> **Requires manual action (N):** sec-001 — OAuth scheme configuration requires architectural decisions; see the fixSuggestion in the report.
>
> The spec at `<path>` has been updated in place."

OWASP security issues and any issue where the fix requires domain knowledge beyond what's in the spec (e.g. actual server URLs, real contact details) should be listed under "requires manual action" rather than guessed.
