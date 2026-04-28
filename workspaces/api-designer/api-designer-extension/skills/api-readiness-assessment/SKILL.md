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

If the user pasted content, write it to `/tmp/api-readiness/openapi-assessment.yaml` before running any Spectral commands.

**Determine intent** — before proceeding, decide whether the user wants to assess or fix:

- **Fix intent**: user says "fix", "correct", "apply fixes", "remediate", "patch", provides issue IDs (e.g. "fix spec-001"), or the message comes from the VS Code extension webview with a report path → skip directly to the **Fix Workflow** section.
- **Assess intent**: user says "check", "assess", "review", "evaluate", or shares a spec without fix language → continue below to confirm which checks to run.

**Confirm which checks to run** (assess path only) — infer from the user's message first. Only ask if the intent is genuinely ambiguous.

**Infer without asking when the user mentions:**
- "agent readiness", "AI readiness", "LLM", "tool use", "agent", "agent-friendly" → run **AI Agent Readiness** only
- "security", "OWASP", "vulnerabilities", "auth" → run **Security Readiness** only
- "design", "design guidelines", "WSO2 guidelines", "REST best practices", "API design" → run **API Design Guidelines** only
- "all", "everything", "all three", "full assessment" → run all three
- Combination phrases → run the mentioned dimensions

**Ask only when the user shares a spec without any dimension hint:**

> "What would you like to check?
> - **API Design Guidelines** — WSO2 REST design rules (28 checks)
> - **Security Readiness** — OWASP API Top 10 checks
> - **AI Agent Readiness** — Spectral rules (69 checks) + AI analysis (11 guideline categories)
>
> You can pick one, a few, or all three."

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

**Step 2: Run all Spectral checks**

Pass `--agent` here, plus `--security` and/or `--design` if those dimensions are also requested — all checks run in a single script call.

```bash
bash <absolute-path-to-skill>/scripts/run_checks.sh \
  <spec-file> \
  <absolute-path-to-skill> \
  --agent [--security] [--design]
```

---

### Phase 2 — LLM Analysis

**Skip this phase entirely if AI Agent Readiness was not requested** (e.g. security-only or design-only run) — proceed directly to Output.

Tell the user:

> "Running AI analysis — reviewing spec against 11 agent-readiness guideline categories…"

Read `references/agent-readiness-guidelines.md` in full.

Work directly from the spec content already in context — do not read any files from `/tmp/api-readiness/`. Those files are for `finalize_report.py` only. Your analysis is independent of the Spectral results.

Walk all 11 categories in order. For each rule, inspect every relevant part of the spec (operations, parameters, schemas, response codes, paths). Be thorough — do not skip categories even if they seem unlikely to apply.

For each violation found, record an object with these fields (no `id` — the assembly script assigns IDs and sorts):

- **`severity`**: as defined in the guidelines (CRITICAL / HIGH / MEDIUM / LOW).
- **`rule`**: the rule reference from the guidelines, e.g. `Rule 3.3`.
- **`path`**: JSON path to the affected element, e.g. `paths./orders.post`.
- **`issue`**: a concise description of what is wrong.
- **`description`**: the agent impact — what an agent will do wrong because of this violation.
- **`fixSuggestion`**: a concise, actionable description of what to change.

When all violations are found, serialize the array to a compact JSON string and hold it in context — it will be passed to `finalize_report.py` via `--ai-issues-json` in the Output section (no file write needed).

---

## Security Readiness Assessment

Tell the user:

> "Running Security Readiness assessment — checking against OWASP API Security Top 10 rules…"

The Spectral run for security is handled by `run_checks.sh --security` (already called in Phase 1 above if agent readiness was also requested, or call it now if security is the only dimension):

```bash
bash <absolute-path-to-skill>/scripts/run_checks.sh \
  <spec-file> \
  <absolute-path-to-skill> \
  --security
```

---

## API Design Guidelines Assessment

Tell the user:

> "Running API Design Guidelines assessment — checking against WSO2 REST design rules (28 checks)…"

The Spectral run for design is handled by `run_checks.sh --design` (already called in Phase 1 above if agent readiness was also requested, or call it now if design is the only dimension):

```bash
bash <absolute-path-to-skill>/scripts/run_checks.sh \
  <spec-file> \
  <absolute-path-to-skill> \
  --design
```

---

## Output

Do not produce the final report until ALL requested phases are fully complete. Brief status updates during execution (e.g. "Running AI analysis…") are fine, but do not display issue lists or JSON arrays mid-run.

When all phases are done, tell the user:

> "Analysis complete — generating report…"

Then run the steps below without further narration until the summary is ready.

**Step 1 — Finalize report** (single script call)

The script resolves the output path automatically, assembles the report, generates HTML, prints the summary, and cleans up `/tmp/api-readiness/`.

- Pass `--ai-issues-json` only if Agent Readiness was assessed — serialize the Phase 2 violations array to a compact JSON string and pass it here directly (no file write needed). Omit it entirely for security-only or design-only runs.
- Pass `"pasted"` for `--spec-file` if the spec was pasted rather than given as a path.

Agent Readiness run (all three or agent included):
```bash
python3 <absolute-path-to-skill>/scripts/finalize_report.py \
  --spec-file <spec-file-path-or-"pasted"> \
  --meta '{"specFile":"<path-or-pasted>","assessedAt":"<ISO-8601-UTC>","spectralVersion":"<version>","guidelinesVersion":"agent-readiness-guidelines.md","model":"claude-sonnet-4-6"}' \
  --skill-dir <absolute-path-to-skill> \
  --ai-issues-json '<compact-json-array>'
```

Security-only or design-only run (no `--ai-issues-json`):
```bash
python3 <absolute-path-to-skill>/scripts/finalize_report.py \
  --spec-file <spec-file-path-or-"pasted"> \
  --meta '{"specFile":"<path-or-pasted>","assessedAt":"<ISO-8601-UTC>","spectralVersion":"<version>","guidelinesVersion":"agent-readiness-guidelines.md","model":"claude-sonnet-4-6"}' \
  --skill-dir <absolute-path-to-skill>
```

Show the script's stdout verbatim as the response. The script prints the report and HTML paths at the end — use those for the next step.

**Step 5 — Offer next steps**

**If running inside the VS Code API Designer extension** (`openInApiDesigner` tool is present in your tools list):
- Call `openInApiDesigner` with no arguments — the extension opens the report webview immediately.
- Then ask: *"Would you also like to apply fixes to your spec?"*
- If yes: proceed to **Fix Workflow**.

**If running in Claude Code CLI or standalone chat** (`openInApiDesigner` is not available):
- Ask: *"Would you like to open the full HTML report in your browser?"*
- If yes: run `open <html-path>` (macOS) or `xdg-open <html-path>` (Linux)
- Then ask: *"Would you like to apply fixes to your spec?"*
- If yes: proceed to **Fix Workflow**.

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
