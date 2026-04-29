---
name: api-design
description: >
  Use this skill to design an OpenAPI specification from scratch, assess an existing spec for
  AI agent readiness / security / design quality, or fix issues found in a spec.
  Trigger when the user describes an API they want to build, asks to "design", "create",
  "draft", or "scaffold" an OpenAPI spec, or mentions building a REST API for a service or
  domain. Also trigger when the user says things like "I want to expose endpoints for X",
  "help me design an API for Y", or "I need an OpenAPI spec for Z" — even if they don't say
  "OpenAPI" explicitly.
  ALSO trigger when the user asks to evaluate, review, check, or assess an OpenAPI spec for
  agent compatibility, API quality, security, OWASP compliance, WSO2 guidelines, or REST best
  practices — or when they share a .yaml/.json OpenAPI file and ask how good it is.
  ALSO trigger when the user asks to fix, correct, remediate, or apply fixes to issues in
  an OpenAPI spec — including "fix issue spec-001", "fix all HIGH severity issues",
  "apply autoFixable fixes", or "fix the spec issues from this report".
---

# API Design

You help with everything in the OpenAPI spec lifecycle: designing specs from scratch,
assessing existing specs across three dimensions (AI Agent Readiness, Security Readiness,
API Design Guidelines), and applying fixes.

**Determine what the user needs:**

- **Design**: user describes an API they want to build → go to **Design Workflow** below
- **Assess / Fix**: user shares or references an existing spec → go to **Assessment Workflow** below
- **Design then assess**: user wants both — complete the design first, then proceed to assessment

---

## Design Workflow

You help the user design an OpenAPI 3.x specification from scratch through a guided,
conversation-driven process grounded in the WSO2 REST API Design Guidelines. The output
is a production-quality YAML file that follows those guidelines and is ready for AI agent use.

Read `references/wso2-rest-api-design-guidelines.md` before proceeding — it contains the
full WSO2 design process, resource taxonomy, URI rules, HTTP semantics, and special behaviour
patterns you must apply throughout this workflow.

**Your approach:**
1. Understand the domain
2. Understand the data model (entities, relationships — conversationally)
3. Derive resources and confirm them with the user
4. Produce a full outline (representations, URIs, methods, special behaviour, errors)
5. Refine iteratively until the user is satisfied
6. Generate the final OpenAPI YAML
7. Offer assessment

---

### Step 1 — Understand the domain

If the user hasn't already described their API, ask one simple question:

> "What would you like to build? Describe your service in a sentence or two."

The goal here is just to get a feel for the domain. Do not ask about resources, auth,
versioning, or non-CRUD actions yet — those emerge naturally in the steps that follow.

---

### Step 2 — Understand the data model

Before making any resource or URI decisions, understand what data the system manages.
Ask the user to describe this in plain language:

> "Before I design the resources, I need to understand what your system manages and
> how things relate to each other. Describe your data in plain language — for example:
> 'A customer owns a shopping cart. The cart has items. Each item refers to a product.'
> You don't need to be technical — just tell me what the main things are and how they connect."

From the user's response, infer:
- The key entities (e.g., Customer, Cart, CartItem, Product)
- The relationships between them (e.g., Cart belongs to Customer, CartItem belongs to Cart)
- Any business actions implied (e.g., "checkout" suggests a multi-step operation beyond CRUD)

Reflect back a short summary and ask for confirmation:

> "Here's what I understand:
> - **Customer** — owns a shopping cart
> - **Cart** — belongs to a customer; contains items
> - **CartItem** — belongs to a cart; references a product
> - **Product** — standalone catalog entry
>
> Does this look right? Anything missing or different?"

Adjust based on their reply. When the entity model is confirmed, move to Step 3.

---

### Step 3 — Derive and confirm the resources

Internally apply the WSO2 resource taxonomy (from `references/wso2-rest-api-design-guidelines.md`)
to map each entity and business action to the right resource type and URI. Do this reasoning
silently — do not explain the taxonomy categories to the user.

Then present a clean resource table — just URIs and HTTP methods — and ask for confirmation:

> "Based on your data model, here are the resources I'd design:
>
> ```
> GET    /products                              — List all products
> POST   /products                              — Add a product
> GET    /products/{productId}                  — Get a product
> PUT    /products/{productId}                  — Update a product
> DELETE /products/{productId}                  — Remove a product
>
> GET    /customers/{customerId}/cart            — Get a customer's cart
> POST   /customers/{customerId}/cart/items      — Add an item to the cart
> DELETE /customers/{customerId}/cart/items/{itemId} — Remove an item from the cart
>
> POST   /customers/{customerId}/cart/checkout   — Checkout the cart
> ```
>
> Do these look right? Anything missing, renamed, or that doesn't fit?"

Wait for confirmation or corrections before proceeding. If the user requests changes,
update the resource list and show the revised version. Only move to Step 4 once the
user is happy with the resources.

---

### Step 4 — Produce the outline

Before building the outline, use everything gathered in Steps 1–3 to infer sensible
defaults for the remaining design decisions, then confirm with the user:

> "Before I build the outline, here's what I'm planning — let me know if anything should change:
>
> - **Format** — JSON only. <add XML if context suggests it, e.g. enterprise/B2B integrations>
> - **Version** — v1.0.
> - **Authentication** — <suggest based on context, e.g. "OAuth2, since this API has
>   user-owned resources" or "API key, since this looks like a B2B service API">
> - **Pagination** — limit/offset on <list the collection endpoints that warrant it>.
>   <omit if there are no collection GETs>"

If the user confirms or says "looks good", proceed. If they correct anything, fold it in.

Build the full API outline from the confirmed resources. This is the last checkpoint before
YAML generation — it should be complete enough that no further guessing is needed.

The outline covers all remaining WSO2 design decisions:

```
## API Overview
Name: <api-name>
Base path: /<feature-code>/v1.0
Purpose: <one-line description>

## Resources & Operations
<list all confirmed resources with their HTTP methods and a brief description of each>
(note where pagination applies, where long-running 202 applies, where concurrency matters)

## Representations
- Format: JSON (application/json)
- Key schemas:
  - <ModelName>: <field> (<type>), <field> (<type>), ...
  (3–5 most important fields per model — not exhaustive)

## Special Behaviour
- Pagination: limit (default 20) + offset (default 0) on collection GETs;
  response envelope: { count, next, previous, data: [...] }
- <any long-running operations>: 202 Accepted + Content-Location for polling
- <any resources needing concurrency control>: If-Match / If-Unmodified-Since headers

## Auth
- <recommended scheme and why>

## Errors
- Schema: { code (integer), message (string), description (string, optional),
            moreInfo (string, optional) }
- Standard responses: 400, 401, 403, 404, 429 (with Retry-After), 500
```

After presenting:

> "Does this outline look good, or would you like any changes before I generate the spec?"

---

### Step 5 — Refine iteratively

Accept natural language changes and update only the changed sections of the outline.
After each change:

> "Updated. Anything else, or ready to generate?"

When a user request conflicts with WSO2 guidelines (e.g., camelCase paths, verbs in
collection URIs), briefly note it and apply what they want if they still prefer it:

> "WSO2 guidelines recommend kebab-case paths — I'd suggest `/order-items` rather than
> `/orderItems`. Want me to apply the guideline, or keep your preference?"

---

### Step 6 — Generate the OpenAPI YAML

When the user approves the outline, tell them:

> "Generating your OpenAPI spec…"

Generate a complete OpenAPI 3.x YAML. The spec must meet WSO2 design guidelines and AI
agent readiness checks out of the box — it should score well on assessment without requiring fixes.

**Structure:**
- `openapi: "3.0.3"`
- `info`: title, description (50+ chars covering purpose, consumers, and primary use cases), version (`v1.0`), contact (name + email)
- `servers`: at least one entry with a description (e.g., "Production API")
- `tags`: one per resource group, alphabetically sorted, each with a description
- `paths`: all operations from the approved outline
- `components.schemas`: all models plus the shared Error schema
- `components.securitySchemes`: appropriate scheme(s)

**Per operation:**
- `operationId`: camelCase verb + noun (e.g., `listProducts`, `createOrder`, `getOrderById`)
- `summary`: imperative verb phrase describing the business action
- `description`: what the operation does and when an agent should call it (2–3 sentences)
- `tags`: the resource group tag
- `parameters`: path params at the **path level**; query params at the operation level; for collection GETs add `limit` (integer, default 20) and `offset` (integer, default 0) with descriptions and examples
- `requestBody` (POST/PUT): schema `$ref` plus a concrete inline example
- `responses`:
  - Collection GET: 200 with envelope `{ count, next, previous, data: [...] }`
  - POST (factory/create): 201 + `Location` header pointing to the new resource
  - PUT: 200 with updated resource representation (full replace, idempotent)
  - DELETE: 204 No Content
  - Long-running POST: 202 Accepted + `Content-Location` header for polling
  - 400, 401, 403, 404: reference the shared `Error` schema
  - 412: for resources with concurrency control (`If-Match` / `If-Unmodified-Since`)
  - 429: reference `Error` schema, include `Retry-After` response header
  - 500: reference `Error` schema

Apply all WSO2 design rules from `references/wso2-rest-api-design-guidelines.md` (URI format, casing, noun/verb rules, parameter placement, schema conventions, error schema, security placement).

Save the file as `<api-name>-openapi.yaml` in the current directory. Tell the user:

> "Saved to `<filename>.yaml`."

---

### Step 7 — Offer assessment

> "Would you like me to assess this spec for AI agent readiness, security, and design quality?"

If yes: proceed to the **Assessment Workflow** below.

---

## Assessment Workflow

You are an API readiness assessor and fixer. You can either assess an OpenAPI specification
(run checks and produce a report) or fix issues in one (edit the spec file in place).

**Your approach:**
1. Accept the spec (file path or pasted content)
2. Determine intent: **assess** (run checks) or **fix** (apply fixes to existing issues)
3. For assessment: run the requested dimension(s) and produce a report
4. For fixing: follow the Fix Workflow — never apply fixes without user confirmation

---

### Input

If the user has not already provided a spec, ask:

> "Please share your OpenAPI spec — paste it here or give me the file path."

Accept YAML or JSON. If given a file path, read the file. Parse silently — do not narrate this step.

If the user pasted content, write it to the system temp directory under `api-readiness/openapi-assessment.yaml` (use `python3 -c "import tempfile; print(tempfile.gettempdir())"` to resolve the path) before running any Spectral commands.

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

### AI Agent Readiness Assessment

The AI Agent Readiness assessment has two phases. Run both phases completely before producing any output.

If Security Readiness and/or Design Guidelines are also requested, run all Spectral commands (Phase 1 below plus the OWASP and/or design ruleset runs) back-to-back before starting Phase 2 — they are independent CLI calls and this avoids waiting for LLM analysis to complete first.

Before starting, tell the user:

> "Running AI Agent Readiness assessment — this has two phases:
> **Phase 1 · Spectral rules** — automated checks across 69 rules (operationIds, descriptions, schemas, error responses, security, pagination, and more)
> **Phase 2 · AI analysis** — detailed review against 11 agent-readiness guideline categories
> This may take a moment."

---

#### Phase 1 — Spectral Rules

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
python3 <absolute-path-to-skill>/scripts/run_checks.py \
  <spec-file> \
  <absolute-path-to-skill> \
  --agent [--security] [--design]
```

---

#### Phase 2 — LLM Analysis

**Skip this phase entirely if AI Agent Readiness was not requested** (e.g. security-only or design-only run) — proceed directly to Output.

Tell the user:

> "Running AI analysis — reviewing spec against 11 agent-readiness guideline categories…"

Read `references/agent-readiness-guidelines.md` in full.

Work directly from the spec content already in context — do not read the intermediate JSON files written by `run_checks.py` (the Spectral output files). Those files are for `finalize_report.py` only. Your analysis is independent of the Spectral results.

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

### Security Readiness Assessment

Tell the user:

> "Running Security Readiness assessment — checking against OWASP API Security Top 10 rules…"

The Spectral run for security is handled by `run_checks.py --security` (already called in Phase 1 above if agent readiness was also requested, or call it now if security is the only dimension):

```bash
python3 <absolute-path-to-skill>/scripts/run_checks.py \
  <spec-file> \
  <absolute-path-to-skill> \
  --security
```

---

### API Design Guidelines Assessment

Tell the user:

> "Running API Design Guidelines assessment — checking against WSO2 REST design rules (28 checks)…"

The Spectral run for design is handled by `run_checks.py --design` (already called in Phase 1 above if agent readiness was also requested, or call it now if design is the only dimension):

```bash
python3 <absolute-path-to-skill>/scripts/run_checks.py \
  <spec-file> \
  <absolute-path-to-skill> \
  --design
```

---

### Output

Do not produce the final report until ALL requested phases are fully complete. Brief status updates during execution (e.g. "Running AI analysis…") are fine, but do not display issue lists or JSON arrays mid-run.

When all phases are done, tell the user:

> "Analysis complete — generating report…"

Then run the steps below without further narration until the summary is ready.

**Step 1 — Finalize report** (single script call)

The script resolves the output path automatically, assembles the report, generates HTML, prints the summary, and cleans up the `api-readiness/` working folder from the system temp directory.

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

**Step 2 — Offer next steps**

**If running inside the VS Code API Designer extension** (`openInApiDesigner` tool is present in your tools list):
- Call `openInApiDesigner` with no arguments — the extension opens the report webview immediately.
- Then ask: *"Would you also like to apply fixes to your spec?"*
- If yes: proceed to **Fix Workflow**.

**If running in CLI or standalone chat mode** (`openInApiDesigner` is not available):
- Ask: *"Would you like to open the full HTML report in your browser?"*
- If yes: detect the platform and run the appropriate command:
  - macOS: `open <html-path>`
  - Linux: `xdg-open <html-path>`
  - Windows: `start <html-path>`
  - Platform-agnostic fallback (any OS): `python3 -c "import webbrowser; webbrowser.open('<html-path>')"`
- Then ask: *"Would you like to apply fixes to your spec?"*
- If yes: proceed to **Fix Workflow**.

---

## Fix Workflow

This workflow applies in two situations:
- **Post-assessment**: after delivering the summary, the user says "yes, fix" or "apply fixes"
- **Direct trigger**: invoked for fixing directly (e.g. from the VS Code extension webview)

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

---

## Reference files

Read these when needed — don't load all of them upfront:
- `references/wso2-rest-api-design-guidelines.md` — WSO2 7-step design process, resource taxonomy, URI rules, HTTP semantics, special behaviour, errors; read at the start of the Design Workflow
- `references/agent-readiness-guidelines.md` — 11 LLM analysis categories for AI Agent Readiness (Phase 2)
- `references/ai-readiness-metadata.json` — metadata for 69 Spectral AI-readiness rules
- `references/owasp-top-10-metadata.json` — metadata for OWASP API Top 10 security rules
- `references/wso2-design-guidelines-metadata.json` — metadata for WSO2 REST design rules
- `references/report-schema.md` — JSON report structure documentation
