# WSO2 Integrator Copilot — Auto Memory + Auto Dream: High-Level Architecture

> Design v4 — refined 6-type memory taxonomy (incl. `history` for cross-project continuity); global + workspace dual-directory storage; adapted implementation to WSO2 Ballerina codebase.

---

## Context & Goal

Claude Code ships a persistent memory system with two background agents:
- **Extract Memories** — captures important facts after every chat turn (reactive)
- **Auto Dream** — periodically consolidates and organizes those facts (proactive)

We want an **identical system** for the WSO2 Integrator Copilot VS Code extension, adapted to the WSO2 domain. The system gives the Copilot a persistent, self-organizing memory of the user, their integration projects, and their preferences — so users never have to re-explain themselves across sessions.

---

## Implementation Adaptations (WSO2 Codebase)

Key decisions where the actual implementation diverges from the original Claude Code design:

| Aspect | Original Design | WSO2 Implementation |
|--------|----------------|---------------------|
| Storage path | `~/.wso2/projects/{sanitized}/memory/` | `~/.ballerina/copilot/memory/global/` (cross-project) + `memory/{hash}/` (per-project) |
| Workspace identity | Sanitized path string | SHA-256 hash via `computeWorkspaceHash()` already in `copilot-utilities` |
| Dream activity gate | Count JSONL session files in `sessions/` dir | Count generation timestamps from existing `thread.json` files — no new files |
| Agent loop + tools | Custom `runForkedAgent` + reimplemented Read/Write/Edit | Vercel AI SDK `generateText` + reuse `createReadTool`/`createWriteTool`/`createEditTool` from `text-editor.ts` |
| Tool LS notifications | N/A | `sendAiSchemaDidOpen`/`sendAISchemaDidChange` are no-ops for `.md` files (early return in `ls-schema-notifications.ts`) — safe to reuse |
| Trigger point | `stopHooks.ts` after CLI query loop | `AgentExecutor.handleStreamFinish()` after agent completes |
| Implementation split | Single module | Utilities in `copilot-utilities/src/auto-memory/`, orchestration in `ballerina-extension/src/features/ai/memory/` |
| VS Code API in paths | `vscode.workspace.workspaceFolders` | Workspace hash passed as parameter — no VS Code dep in `copilot-utilities` |
| Feature flags | GrowthBook `tengu_*` | `COPILOT_DISABLE_AUTO_MEMORY` env var + `autoMemoryEnabled` in settings.json |
| Target scope | Both copilots | Ballerina AgentExecutor only (Phase 1). MI copilot is follow-up. |

### Module Split

**`copilot-utilities/src/auto-memory/`** — pure utilities, zero external npm dependencies (Node.js built-ins only):
```
memdir/paths.ts                  getMemoryDir(hash), getGlobalMemoryDir(), isInMemoryDir()
memdir/memoryTypes.ts            6-type taxonomy, GLOBAL_MEMORY_TYPES, WORKSPACE_MEMORY_TYPES
memdir/memoryScan.ts             scan .md files in both dirs, build dual manifest
memdir/memdir.ts                 loads both MEMORY.md files, builds combined system prompt
services/extractMemories/prompts.ts       extraction prompt with routing rules
services/autoDream/consolidationLock.ts   two lock files + generation count gate
services/autoDream/consolidationPrompt.ts 4-phase dream prompt covering both directories
index.ts
```

**`ballerina-extension/src/features/ai/memory/`** — agent orchestration (uses Vercel AI SDK):
```
extractMemories.ts    init + trigger + coalescing state machine
autoDream.ts          gate checks + dream agent loop
```

---

## High-Level Component Map

```
ballerina-extension
│
├── activate.ts
│   └── initExtractMemories() + initAutoDream()    ← initialise both agents at startup
│
├── features/ai/agent/
│   ├── AgentExecutor.ts
│   │   └── handleStreamFinish()
│   │       ├── executeExtractMemories()            ← fires after every agent response
│   │       └── executeAutoDream()                  ← fires when gates pass
│   └── prompts.ts
│       └── loadMemoryPrompt()                      ← injects MEMORY.md into system prompt
│
└── features/ai/memory/                             ← orchestration layer (new)
    ├── extractMemories.ts                          ← init + trigger + coalescing
    └── autoDream.ts                                ← gate checks + dream loop

copilot-utilities/src/auto-memory/                  ← pure utilities (no VS Code dep)
│
├── memdir/
│   ├── paths.ts                                    ← path computation (hash-based)
│   ├── memoryTypes.ts                              ← 6-type taxonomy + prompt constants
│   ├── memoryScan.ts                               ← scan .md files, build manifest
│   └── memdir.ts                                   ← MEMORY.md loader, truncation, prompt builder
│
└── services/
    ├── extractMemories/prompts.ts                  ← extraction prompt builder
    └── autoDream/
        ├── consolidationLock.ts                    ← lock file + generation count gate
        └── consolidationPrompt.ts                  ← 4-phase consolidation prompt
```

---

## Memory Directory Structure

Two independent memory directories: **global** (cross-project) and **workspace** (project-specific). Both are injected into the system prompt at session start.

```
~/.ballerina/copilot/
├── workspaces/{hash}/                   ← existing chat persistence (unchanged)
│   ├── workspace.meta.json
│   └── threads/
│       └── {threadId}/
│           ├── thread.json              ← generation timestamps read here for dream gate
│           └── checkpoints/
└── memory/
    ├── global/                          ← NEW: cross-project memory (all workspaces share this)
    │   ├── MEMORY.md                    ← global index (≤200 lines, ≤25KB)
    │   ├── user_expertise.md            ← user type: engineer profile
    │   ├── pattern_error_handling.md    ← pattern type: team standards
    │   ├── history_salesforce_sap.md    ← history type: completed project knowledge
    │   └── .consolidate-lock           ← global dream lock (mtime = lastGlobalDreamAt)
    └── {hash}/                          ← workspace-specific memory (per project)
        ├── MEMORY.md                    ← workspace index (≤200 lines, ≤25KB)
        ├── integration_shopify.md       ← integration type: this project's systems
        ├── project_esb_migration.md     ← project type: active constraints
        ├── reference_monitoring.md      ← reference type: this project's dashboards
        └── .consolidate-lock           ← workspace dream lock (mtime = lastWorkspaceDreamAt)
```

### Why Two Directories

A developer who finishes Project A and starts Project B opens a new workspace folder — a new hash, an empty workspace memory. But they carry knowledge with them: who they are, how their team builds integrations, and what they built before. That knowledge lives in **global** memory and is always available regardless of which project is open.

### Type-to-Directory Assignment

Types are hardcoded to a directory — the LLM never decides:

| Type | Directory | Reasoning |
|------|-----------|-----------|
| `user` | global | Engineer profile doesn't change per project |
| `pattern` | global | Team standards apply to all integrations |
| `history` | global | Completed project knowledge persists across projects |
| `integration` | workspace | System quirks are specific to this project's connections |
| `project` | workspace | Active constraints and deadlines are project-specific |
| `reference` | workspace | Dashboards, JIRA projects are project-specific |

### Directory Design Decisions

- **Global directory** — `~/.ballerina/copilot/memory/global/` — one per user machine, shared across all workspace
- **Workspace directory** — `~/.ballerina/copilot/memory/{hash}/` — one per project, uses same `computeWorkspaceHash()` already in `copilot-utilities`
- **No `sessions/` directory** — dream activity gate reads generation timestamps from existing `thread.json` files
- **Each directory** has its own `MEMORY.md` (≤200 lines / 25KB) and `.consolidate-lock`
- **Topic files (`*.md`)** — one file per topic, AI-chosen names, frontmatter type field

### Topic File Format

```markdown
---
name: Salesforce→SAP order fulfillment integration
description: Completed 2025 — Salesforce→SAP via Ballerina, JWT auth, Kafka buffer, in production
type: history
---

Completed the Salesforce→SAP order fulfillment integration (MuleSoft→Ballerina migration).

Systems: Salesforce (JWT Bearer OAuth2) → Kafka buffer → SAP (RFC BAPI connector, pool of 5).

Key learnings:
- Salesforce JWT Bearer OAuth2 is reliable; auth code flow caused token refresh issues at scale
- SAP BAPI connector requires RFC auth; direct HTTP calls are not supported
- Kafka buffer was essential — direct SAP writes caused timeouts during peak order hours
- outbox pattern guaranteed no lost orders during SAP downtime windows

Status: In production as of 2026-01. Payment service and warehouse depend on it.
```

### MEMORY.md Index Format — Global

```markdown
- [Engineer background](user_expertise.md) — 10yr ESB veteran, migrating to Ballerina, prefers code
- [Error handling standard](pattern_error_handling.md) — retry 3× → dead-letter Kafka → Slack alert
- [Salesforce→SAP integration](history_salesforce_sap.md) — completed 2025, JWT auth, Kafka buffer, in prod
- [Shopify→QuickBooks sync](history_shopify_qbo.md) — completed 2024, GDPR-scoped, pass-through only
```

### MEMORY.md Index Format — Workspace

```markdown
- [Shopify webhook](integration_shopify.md) — fires twice per order, deduplicate on order_id
- [ESB to MI migration](project_esb_migration.md) — deadline 2026-08-01, flag ESB-only approaches
- [Monitoring dashboard](reference_monitoring.md) — Grafana at grafana.internal/d/integrations
```

---

## Memory Type Taxonomy (WSO2 Integration Engineering)

6 types across two scopes. Core principle: **only save what cannot be derived from the project files**.

| Type | Scope | What it holds |
|------|-------|--------------|
| `user` | **global** | Engineer profile, expertise, preferences |
| `pattern` | **global** | Team standards, architectural decisions |
| `history` | **global** | Completed integration projects and their learnings |
| `integration` | workspace | This project's connected systems and their quirks |
| `project` | workspace | Active work, deadlines, constraints |
| `reference` | workspace | Links, dashboards, issue trackers for this project |

---

### Type 1: `user` — *global*
**What it contains:** Who the engineer is — their background, expertise level, and how they like the Copilot to work with them.

**Purpose:** So the Copilot doesn't explain things the user already knows, and doesn't skip things they don't. A 10-year WSO2 veteran and a developer writing their first Ballerina integration need completely different responses.

**When to capture:** User mentions their background, complains about explanation level, reveals a tool preference, or corrects how the Copilot is communicating.

```markdown
---
name: Engineer background
description: 10yr WSO2 ESB veteran migrating to Ballerina, prefers code over visual mapper
type: user
---

User has 10 years of WSO2 ESB experience and is migrating to Ballerina.
Frame Ballerina concepts using ESB analogues (e.g., Filter service ≈ CBR mediator).
Prefers code over the visual mapper. Does not need HTTP or protocol basics explained.
```

**More examples of what triggers a `user` memory:**
- *"I'm a Salesforce admin learning to build integrations — I'm not a developer"* → explain code concepts simply, use business terms
- *"Stop showing me XML config examples, I only use Ballerina code"* → never suggest XML mediators
- *"I always prefer reading the sequence diagram view"* → mention diagram view when relevant

---

### Type 2: `integration` — *workspace*
**What it contains:** Everything surprising, quirky, or non-obvious about the **external systems being connected** — things you'd write on a sticky note next to your monitor that you'd otherwise have to repeat every session.

**Purpose:** The Copilot can read your Ballerina code but cannot know how an external API actually behaves. Without this, you re-explain system quirks every session.

**When to capture:** User describes how a specific system authenticates, mentions a gotcha or limitation, explains a data format or naming convention, or describes the shape of data coming from an external system.

**Critical distinction from `reference`:** `integration` captures *how a system behaves*. `reference` captures *where to find things*. "The Shopify API paginates with cursors" is `integration`. "Shopify API docs are at X URL" is `reference`.

```markdown
---
name: Shopify order webhook behaviour
description: Shopify order webhooks fire twice per order — deduplicate on order_id
type: integration
---

The Shopify webhook for order events fires twice: once when the order is placed,
once when payment confirms. Always deduplicate on `order_id` before processing.

**How to apply:** Any Shopify → downstream integration must check for duplicate
order_id before writing to the destination system.
```

**More examples of what triggers an `integration` memory:**
- *"Our Salesforce connector uses JWT Bearer OAuth2, not the standard auth code flow"* → always suggest the right auth flow for Salesforce
- *"The inventory API returns HTTP 200 even on business errors — check `response.status` field"* → never rely on HTTP status code for this API
- *"The legacy ERP returns all dates as `DD/MM/YYYY HH:mm` strings, not ISO 8601"* → always add date parsing in any ERP integration
- *"Our Kafka topics follow the naming convention `{env}.{domain}.{entity}.v1`"* → use this convention when suggesting topic names
- *"The OneDrive API returns flat file metadata but Google Drive expects a nested `fileResource` object"* → always add the mapping layer in OneDrive→Drive integrations

---

### Type 3: `pattern` — *global*
**What it contains:** Architectural decisions and team standards for how integrations are built — the "we always do it this way" rules that apply across every integration in the project.

**Purpose:** So the Copilot never suggests an approach that works technically but violates how the team builds things. These are decisions made once so they don't get re-debated for every new integration.

**When to capture:** User corrects a suggested approach ("don't do it that way, we always use X"), confirms a pattern worked ("yes, always do it that way"), or explains a team convention. Record corrections AND confirmations.

```markdown
---
name: Standard error handling chain
description: All integrations use retry 3x → dead-letter Kafka topic → Slack alert
type: pattern
---

All integrations follow the same error handling chain:
retry 3× with exponential backoff (100ms base) →
dead-letter to `{env}.errors.{domain}` Kafka topic →
PagerDuty alert.

**Why:** Ops team SLA requires no silent failures. Established after a
production incident in Nov 2025 where errors were silently dropped.
**How to apply:** Every integration that calls an external system must
implement this chain. No exceptions.
```

**More examples of what triggers a `pattern` memory:**
- *"For file sync integrations, we always track processed files in a DB table — in-memory tracking doesn't survive restarts"* → always use DB-based idempotency for file sync
- *"We never hardcode API URLs — they always go in `Config.toml` as `configurable` variables"* → always use configurable variables, never hardcode
- *"Transformation logic over 20 lines always goes in its own `.bal` file under `transforms/`"* → extract long transforms to `transforms/` module
- *"All outbound HTTP calls must have a 30s timeout and circuit breaker — required after a cascade failure"* → always add timeout + circuit breaker to HTTP clients
- *"We buffer through Kafka before writing to Google Sheets — direct writes caused data loss during API outages"* → never write directly from source to Sheets

---

### Type 4: `project` — *workspace*
**What it contains:** What is actively being built *right now*, *why* it exists, and constraints that affect every suggestion. Time-sensitive — matters now, may be irrelevant in a few months.

**Purpose:** So the Copilot understands the business context behind requests. Knowing *why* something is being built changes what approach makes sense.

**Key rule:** Always convert relative dates to absolute. `"by Thursday"` → `"by 2026-04-10"`. Otherwise the memory is meaningless next week.

**When to capture:** User explains a deadline, describes what they're migrating from, mentions a business driver, flags a constraint like a freeze or compliance requirement.

```markdown
---
name: MuleSoft to Ballerina migration
description: Migrating Salesforce→SAP integration from MuleSoft to Ballerina, deadline 2026-07-01
type: project
---

Migrating the Salesforce → SAP order fulfillment integration from MuleSoft to Ballerina.
Hard deadline: 2026-07-01 (MuleSoft license expires).

**Why:** License cost and EOL — not a tech debt cleanup.
**How to apply:** Prioritise completeness over elegance. Flag any approach
that risks missing the deadline.
```

**More examples of what triggers a `project` memory:**
- *"We're in phase 2 of 3 of the GWS → M365 migration. Phase 1 (email) is done, now on calendar/contacts"* → don't suggest SharePoint-related work yet
- *"There's a Salesforce schema freeze until the audit finishes on 2026-06-15"* → flag any suggestions that require Salesforce schema changes
- *"This Stripe → QuickBooks sync must be GDPR compliant — no PII in the integration layer"* → always treat integration layer as pass-through, no PII storage
- *"No new APIs to the gateway until the security audit clears on 2026-05-15"* → flag API publishing suggestions until after that date

---

### Type 5: `reference` — *workspace*
**What it contains:** *Where to find things* — links, project keys, dashboard URLs, and pointers to external resources. Not what those things do (that belongs in `integration`) — just where they live.

**Purpose:** So when the Copilot says "check the monitoring dashboard" or "file a ticket," it knows exactly which one.

**When to capture:** User mentions a URL, JIRA project key, Confluence space, monitoring dashboard, internal tool, or any external system where work or documentation is tracked.

```markdown
---
name: Integration monitoring dashboard
description: Grafana at grafana.internal/d/integrations — watched by on-call
type: reference
---

Integration monitoring is at grafana.internal/d/integrations.
This is what the on-call team watches — check before touching any
request-path integration code.
```

**More examples of what triggers a `reference` memory:**
- *"Salesforce connector bugs go to JIRA `SFDC`, Google Workspace issues to `GWS`"* → use correct JIRA project per system
- *"We don't use the public Ballerina connector docs — we have an internal fork at `confluence.internal/ballerina-connectors`"* → always use internal docs
- *"The runbook for when the Stripe → QuickBooks sync fails is at `notion.so/team/stripe-qbo-runbook`"* → link to runbook when discussing that integration

---

### Type 6: `history` — *global*
**What it contains:** Completed integration projects — what was built, what systems were connected, the key architectural decisions made, and lessons learned. This is the institutional knowledge that survives after a project is done and the `project` memory fades.

**Purpose:** So when starting a new integration project, the Copilot already knows what the developer has built before and can apply those learnings. This is the answer to: *"I finished the Salesforce→SAP integration last year — the new copilot session knows nothing about it."*

**When to capture:** User describes a completed integration ("we shipped X last quarter"), references previous work ("like we did in the last project"), or mentions a system that's already in production from prior work. Auto-dream can also promote completed `project` memories to `history` when the project deadline passes.

**Key distinction from `project`:** `project` is for active work with deadlines and constraints — it fades when work ends. `history` is permanent — it captures what was built and why, for reference in all future sessions.

```markdown
---
name: Salesforce→SAP order fulfillment integration
description: Completed 2025 — Salesforce→SAP via Ballerina, JWT auth, Kafka buffer, in production
type: history
---

Completed the Salesforce→SAP order fulfillment integration (migrated from MuleSoft).
Live in production since 2026-01. Payment service and warehouse systems depend on it.

Systems: Salesforce → Kafka buffer → SAP BAPI (RFC connector, pool of 5).
Auth: Salesforce uses JWT Bearer OAuth2 (not auth code — caused token refresh issues at scale).

Key learnings carried forward:
- Always buffer through Kafka before writing to SAP — direct writes timeout under peak load
- SAP BAPI connector requires RFC auth; test the connection pool size under load
- outbox pattern is essential for guaranteed delivery during SAP maintenance windows
```

**More examples of what triggers a `history` memory:**
- *"We finished migrating OneDrive to Google Drive last month — it's all live now"* → save what was learned about both APIs, any quirks, patterns used
- *"The Shopify→QuickBooks sync we built in 2024 is still running"* → save that GDPR pass-through constraint and the deduplication approach
- *"We've integrated with this HR system before — same connector, different project"* → connect prior experience to current work

---

### How the 6 types work together — new project scenario

**Scenario:** Developer opens a brand new Ballerina project to build a Shopify → SAP integration.

The Copilot loads both memory directories:

**From global memory (carries over from past work):**

| Memory | What it contributes |
|--------|-------------------|
| `user` | 10yr ESB veteran, prefers code, don't explain HTTP basics |
| `pattern` | retry 3× → dead-letter Kafka → Slack alert; always buffer before SAP |
| `history` | Previously integrated SAP BAPI — RFC auth required, pool of 5, buffer mandatory |

**From workspace memory (empty on day 1, builds up fast):**

| Memory | What it contributes |
|--------|-------------------|
| `integration` | Shopify webhooks fire twice — deduplicate on order_id *(saved after first session)* |
| `project` | *(captured once developer explains what they're building)* |
| `reference` | *(captured once developer mentions dashboards and issue trackers)* |

On day 1: The Copilot already knows the developer's expertise, their error handling standard, and that SAP needs RFC auth and a Kafka buffer — without the developer saying a word about their history.

---

### What NOT to Save

| Don't save | Why |
|---|---|
| Ballerina sequences or integration XML in the repo | Copilot can read the files directly |
| Connector configs already in `Config.toml` | Derivable |
| `deployment.toml` topology | Derivable |
| Credentials, API keys, or secrets | Security risk — never save these |
| Stack traces and error logs | Ephemeral, useless next session |
| Payload examples from actual API calls | Ephemeral, potentially contains PII/PHI |
| Test data and mock payloads | Ephemeral |
| Anything already in `COPILOT.md` | Duplicate |
| "We used Filter mediator in xyz.bal" | Derivable by reading the file |

---

## The 3 LLM Calls Per Turn

Both agents make **separate, independent LLM calls** — completely invisible to the user.

```
User message
      ↓
LLM Call 1 — Main Copilot Agent      ← user sees this response
      ↓ (fire-and-forget)
LLM Call 2 — Extract Memories Agent  ← silent background call
      ↓ (only when gates pass)
LLM Call 3 — Auto Dream Agent        ← silent periodic call
```

---

## Extract Memories — Detailed Design

### Role
A **separate background `generateText` call** that runs after every Copilot response. The user never sees it. It has one job: read the recent conversation, decide if anything is worth remembering, write it to disk.

### Trigger
After every agent response via `AgentExecutor.handleStreamFinish()`. Fire-and-forget — user gets the response immediately, extraction runs in parallel.

### LLM Call Structure

```
model:          same model as main agent
system prompt:  same as main Copilot agent (shares prompt cache — cheaper)
messages:       full conversation history + extraction prompt appended as final message
tools:          file_read (unrestricted) + file_write / file_edit (memory dir ONLY)
max steps:      5
```

### Execution Flow

```
Agent response received
        ↓
handleStreamFinish() fires (fire-and-forget)
        ↓
Gate checks:
  - COPILOT_DISABLE_AUTO_MEMORY not set?
  - Not already extracting this turn?
  - Main agent didn't already write to memory dir this turn?
        ↓
generateText() call with memory tools
        ↓
Step 1 — READ (all in parallel)
  Read every memory file that might need updating
        ↓
Step 2 — WRITE (all in parallel)
  Create new files or update existing ones
  Update MEMORY.md index
        ↓
Done silently
```

### Tool Restrictions (Sandboxed)

Reuses `createReadTool`, `createWriteTool`, `createEditTool` from `text-editor.ts`. Two tool registries are created — one rooted at the global directory, one at the workspace directory. Both are passed to `generateText()`. The type field in the memory content determines which directory the agent writes to (enforced by the prompt, not by path validation — both directories have `.md` extension, which passes `text-editor.ts` validation).

| Tool | Permission |
|---|---|
| `file_read` | Unrestricted — can read from both global and workspace dirs |
| `file_write` / `file_edit` | Writes routed by type: `user`/`pattern`/`history` → global dir; `integration`/`project`/`reference` → workspace dir |
| Everything else | Not provided to the agent |

### Mutual Exclusion (One Writer Per Turn)
If the main Copilot already wrote to the memory directory in that turn (user said "remember this"), the extraction agent **skips that turn entirely**. Prevents duplicates and write conflicts.

```
Main agent wrote memories this turn?
    YES → extraction skips, cursor advances past those messages
    NO  → extraction runs normally
```

### Closure-Scoped State
```typescript
let lastMemoryMessageIndex: number    // cursor — tracks which messages have been processed
let inProgress: boolean               // prevents overlapping runs
let turnsSinceLastExtraction: number  // throttle counter
```

### Exact Prompt Sent (Extract Memories)

Assembled from 4 parts and appended to conversation history:

**Part 1 — Opener (dynamic):**
```
You are now acting as the memory extraction subagent. Analyze the most recent ~{N} messages above and use them to update your persistent memory systems.

Available tools: file_read (unrestricted), file_write and file_edit for memory directories only. All other tools are not available.

You have TWO memory directories:
- Global memory: {globalMemoryDir}  ← for user, pattern, history types (applies to ALL projects)
- Workspace memory: {workspaceMemoryDir}  ← for integration, project, reference types (this project only)

ROUTING RULE — you must write each memory to the correct directory based on its type:
  user, pattern, history  →  global memory directory
  integration, project, reference  →  workspace memory directory

You have a limited step budget. The efficient strategy is: step 1 — read all files you might update in parallel; step 2 — write all updates in parallel. Do not interleave.

You MUST only use content from the last ~{N} messages. Do not investigate further.

## Global memory files (user/pattern/history types)

[user] user_expertise.md (2026-04-08): 10yr ESB veteran, new to Ballerina, prefers code over visual mapper
[pattern] pattern_error_handling.md (2026-04-06): retry 3× → dead-letter Kafka → Slack alert
[history] history_salesforce_sap.md (2026-03-01): completed Salesforce→SAP integration, JWT auth, Kafka buffer

## Workspace memory files (integration/project/reference types)

[integration] integration_shopify.md (2026-04-07): Shopify order webhooks fire twice — deduplicate on order_id
[project] project_esb_migration.md (2026-04-05): ESB→MI migration, deadline 2026-08-01

Check both lists before writing — update an existing file rather than creating a duplicate.
```

**Part 2 — Memory type taxonomy (sourced from `memoryTypes.ts` → `TYPES_SECTION`):**

This section is generated from the `TYPES_SECTION` constant in `memoryTypes.ts`. It contains the full 6-type WSO2 taxonomy (user, integration, pattern, project, reference, history) with descriptions, when_to_save, how_to_use, and examples as defined in File 2 of this document.

**Part 3 — What NOT to save (sourced from `memoryTypes.ts` → `WHAT_NOT_TO_SAVE_SECTION`):**

This section is generated from the `WHAT_NOT_TO_SAVE_SECTION` constant in `memoryTypes.ts`. See File 2 for the full list.

**Part 4 — How to save (from `prompts.ts` → `buildExtractPrompt()`):**
```
## How to save memories

Saving a memory is a two-step process:

**Step 1** — write the memory to its own file (e.g., `user_expertise.md`, `integration_shopify.md`, `pattern_error_handling.md`) using this frontmatter format:

```markdown
---
name: {{memory name}}
description: {{one-line description — used to decide relevance in future conversations, so be specific}}
type: {{user, integration, pattern, project, reference, history}}
---

{{memory content — for pattern/project types, structure as: rule/fact, then **Why:** and **How to apply:** lines}}
```

**Step 2** — add a pointer to that file in `MEMORY.md`. `MEMORY.md` is an index, not a memory — each entry should be one line, under ~150 characters: `- [Title](file.md) — one-line hook`. It has no frontmatter. Never write memory content directly into `MEMORY.md`.

- `MEMORY.md` is always loaded into your system prompt — lines after 200 will be truncated, so keep the index concise
- Keep the name, description, and type fields in memory files up-to-date with the content
- Organize memory semantically by topic, not chronologically
- Update or remove memories that turn out to be wrong or outdated
- Do not write duplicate memories. First check if there is an existing memory you can update before writing a new one.
```

---

## Auto Dream — Detailed Design

### Role
A **separate periodic background `generateText` call** that consolidates and organizes everything Extract Memories has accumulated. Unlike Extract Memories, it does NOT run every turn — it runs when enough time and activity has accumulated.

### Trigger — 3 Gates (all must pass, cheapest first)

```
Gate 1 — Time Gate (one stat() call)
  Has it been ≥24 hours since the last dream?
  Read .consolidate-lock mtime to check
  NO → skip entirely
  YES → continue

Gate 2 — Scan Throttle
  Has it been ≥10 minutes since we last scanned?
  Prevents repeated scanning when time gate passes but activity hasn't
  NO → skip
  YES → continue

Gate 3 — Activity Gate (read existing thread.json files)
  Have ≥10 new generations been added since the last dream?
  Count generations with timestamp > lastDreamAt across all thread.json files
  No separate session files needed — reuses existing chat persistence data
  NO → skip, not enough material yet
  YES → FIRE
```

### LLM Call Structure

```
model:          same model as main agent
system prompt:  consolidation instructions (same memory type rules as main agent)
messages:       just the dream prompt — no conversation history needed
tools:          file_read (unrestricted) + file_write / file_edit (memory dir ONLY)
max steps:      unlimited
```

Note: Auto Dream does **not** share the main conversation history — it only needs the memory files.

### Consolidation Lock

Each memory directory has its own independent lock file:

```
memory/global/.consolidate-lock   ← global dream lock
memory/{hash}/.consolidate-lock   ← workspace dream lock
```

Both lock files use the same mechanics:
```
Body: PID of the process currently dreaming
mtime: timestamp of last completed dream (this IS lastDreamAt)
Stale: after 60 minutes even if PID is alive (PID reuse guard)
```

The dream runs once per trigger and consolidates **both** directories in a single `generateText()` call. Both lock files are acquired before starting and stamped together on completion. If the global lock is held by another process (another workspace dreaming simultaneously), the workspace lock is acquired anyway and the dream runs — but skips the global consolidation, doing only the workspace portion.

**Acquire order:**
```
1. Acquire workspace lock (required — abort if held)
2. Try to acquire global lock (optional — skip global consolidation if held)
3. Run dream (consolidate workspace always, consolidate global if lock acquired)
4. Stamp both lock mtimes on success
5. Rollback both on failure
```

### 4-Phase Dream Prompt (exact)

```
# Dream: Memory Consolidation

You are performing a dream — a reflective pass over your memory files. Synthesize
what you've learned recently into durable, well-organized memories so that future
sessions can orient quickly.

You are consolidating TWO memory directories:
- Global memory: `~/.ballerina/copilot/memory/global/`  (user, pattern, history types)
- Workspace memory: `~/.ballerina/copilot/memory/{hash}/`  (integration, project, reference types)

Both directories already exist — write directly with file_write.

ROUTING RULE: user/pattern/history types → global directory. integration/project/reference types → workspace directory.

---

## Phase 1 — Orient (both directories)
- Read global `MEMORY.md` and workspace `MEMORY.md`
- Skim existing topic files in both directories

## Phase 2 — Gather recent signal
Sources in priority order:
1. Existing memories that drifted — facts that contradict current project state
2. Completed project work that should be promoted: if a `project` memory has a deadline that has passed and the work is done, distill its key learnings into a `history` memory in the global directory

## Phase 3 — Consolidate
- Merge new signal into existing topic files
- Convert relative dates to absolute dates
- Delete contradicted facts
- **Promote completed projects**: if a workspace `project` memory describes work that is now done, extract the durable learnings (systems connected, key patterns, gotchas) into a new `history` memory in the global directory

## Phase 4 — Prune and index (both directories)
Update both `MEMORY.md` files (each ≤200 lines, ≤25KB).
- Remove stale or superseded pointers
- Demote verbose entries to topic files
- Add pointers to newly important memories

---

Return a brief summary of what you consolidated, promoted to history, or pruned.
If nothing changed, say so.

## Additional context
New generations since last workspace consolidation: {N} (since {lastWorkspaceDreamAt})
Last global consolidation: {lastGlobalDreamAt}
```

### UI Visibility
```
Status bar: $(sparkle) Dreaming...    ← while running
Status bar: $(check) Memory updated   ← on completion (disappears after 5s)
```

---

## System Prompt Injection (Session Start)

At session start, `loadMemoryPrompt(workspaceHash)` builds the system prompt section from **both** memory directories. This is how past memories — including from previous projects — influence current conversations.

**What gets injected:**
1. Memory behavioral instructions (when/how to save, type routing rules, drift caveat)
2. Contents of global `MEMORY.md` (truncated to 200 lines / 25KB) — labeled "Global Memory"
3. Contents of workspace `MEMORY.md` (truncated to 200 lines / 25KB) — labeled "Workspace Memory"

**Injected structure:**
```
# auto memory

You have a persistent memory system with two scopes...

## Global Memory (applies to all your projects)

- [Engineer background](user_expertise.md) — 10yr ESB veteran, prefers code
- [Error handling standard](pattern_error_handling.md) — retry 3× → dead-letter Kafka → Slack
- [Salesforce→SAP integration](history_salesforce_sap.md) — completed 2025, JWT auth, Kafka buffer

## Workspace Memory (this project)

- [Shopify webhook](integration_shopify.md) — fires twice per order, deduplicate on order_id
- [ESB migration](project_esb_migration.md) — deadline 2026-08-01
```

**The drift caveat** — always included in system prompt:
```
Memory records can become stale over time. Use memory as context for what was
true at a given point in time. Before answering or building assumptions based
solely on information in memory records, verify that the memory is still
correct and up-to-date by reading the current state of the files or resources.
If a recalled memory conflicts with current information, trust what you observe
now — and update or remove the stale memory rather than acting on it.
```

**The trust caveat** — also included:
```
## Before recommending from memory

A memory that names a specific function, file, or flag is a claim that it
existed when the memory was written. It may have been renamed, removed, or
never merged. Before recommending it:
- If the memory names a file path: check the file exists
- If the memory names a function or flag: grep for it
- "The memory says X exists" is not the same as "X exists now."
```

---

## Extract Memories vs Auto Dream — Full Comparison

| Aspect | Extract Memories | Auto Dream |
|---|---|---|
| What it is | Separate background LLM call | Separate background LLM call |
| Frequency | After every agent response | After 24h AND 10+ new generations |
| Input | Last N conversation messages | Memory files + generation count from thread.json |
| Output | New/updated topic files + MEMORY.md | Reorganized + pruned everything |
| Shares conversation history | Yes (same model + system prompt = cheaper via cache) | No (standalone call) |
| Visible to user | No | Lightly — status bar only |
| Blocks response | No (fire-and-forget) | No |
| Tool access | Sandboxed to memory dir only | Sandboxed to memory dir only |
| Max steps | 5 | Unlimited |
| Concurrency guard | Mutual exclusion (skip if main wrote) | Lock file with PID + mtime |
| Analogy | Note-taker | Librarian |

---

## Component Details

### 1. `copilot-utilities/src/auto-memory/memdir/`

**`paths.ts`**
- `getMemoryDir(workspaceHash)` → `~/.ballerina/copilot/memory/{hash}/`
- `getGlobalMemoryDir()` → `~/.ballerina/copilot/memory/global/`
- `isAutoMemoryEnabled()` — checks `COPILOT_DISABLE_AUTO_MEMORY` env var; default enabled
- `isInMemoryDir(absolutePath, workspaceHash)` — path is within workspace OR global memory dir

**`memoryScan.ts`**
- `scanMemoryFiles(memoryDir)` — reads `.md` frontmatter, sorted newest-first (max 200)
- `formatMemoryManifest(globalFiles, workspaceFiles)` — formats two separate lists with section headers — pre-injected into extraction prompt

**`memdir.ts`**
- `loadMemoryPrompt(workspaceHash)` — reads both MEMORY.md files, truncates each to 200 lines / 25KB, builds combined system prompt section with Global/Workspace sections
- `buildMemoryLines(globalDir, workspaceDir)` — behavioral instructions including type routing rules
- `truncateEntrypointContent()` — enforces line AND byte caps per directory

---

### 2. Integration Points in `ballerina-extension`

| Claude Code | WSO2 Ballerina Copilot |
|---|---|
| `stopHooks.ts` — fires after query loop | `AgentExecutor.handleStreamFinish()` |
| Forked agent via `runForkedAgent()` | `generateText()` from Vercel AI SDK |
| Custom Read/Write/Edit tool implementations | `createReadTool`/`createWriteTool`/`createEditTool` from `text-editor.ts` |
| Process-level PID in lock file | Extension host process PID |
| JSONL session transcripts for dream gate | Generation timestamps from existing `thread.json` files |
| Single memory directory | Two directories: `memory/global/` + `memory/{hash}/` |

---

## End-to-End Data Flow

```
First Session on a New Project
  → loadMemoryPrompt(workspaceHash) reads global MEMORY.md + workspace MEMORY.md
  → global is pre-populated (user profile, patterns, history from past projects)
  → workspace MEMORY.md is empty on day 1
  → Copilot already knows who the developer is and what they've built before

Each Agent Response
  → User sends message, Copilot responds (generateText call 1)
  → AgentExecutor.handleStreamFinish() fires
  → executeExtractMemories() runs fire-and-forget (generateText call 2)
  → global types (user/pattern/history) → written to memory/global/
  → workspace types (integration/project/reference) → written to memory/{hash}/

After 24h + 10 new generations
  → executeAutoDream() gates pass
  → Dream runs fire-and-forget (generateText call 3)
  → Consolidates BOTH directories
  → Promotes completed project memories to history in global directory
  → Both MEMORY.md files updated, both .consolidate-lock mtimes stamped

Next Project (new workspace folder)
  → loadMemoryPrompt(newHash) reads global MEMORY.md (full history) + new empty workspace
  → Copilot immediately knows user profile, team patterns, and all prior project history
  → Workspace memory builds up as the new project progresses
```

---

## Configuration

Environment overrides (checked in `copilot-utilities/src/auto-memory/memdir/paths.ts`):
- `COPILOT_DISABLE_AUTO_MEMORY=1` — kill switch for all memory features (CI/automated runs)

Settings (checked in `ballerina-extension`, passed into auto-memory module):
```json
{
  "autoMemoryEnabled": true,
  "autoDreamEnabled": true
}
```

Memory is stored in two fixed directories — `~/.ballerina/copilot/memory/global/` and `~/.ballerina/copilot/memory/{workspaceHash}/`. Neither path is user-configurable. The workspace hash is derived from the existing `computeWorkspaceHash()` in `CopilotPersistenceStore`.

---

## Key Design Decisions

1. **Vercel AI SDK `generateText`** — uses the same SDK as the main agent, no new API client needed. The existing `getAnthropicClient()` is reused directly.
2. **Reuse `text-editor.ts` tools** — `createReadTool`, `createWriteTool`, `createEditTool` work for `.md` files unchanged. Language Server notifications (`sendAiSchemaDidOpen`, `sendAISchemaDidChange`) are no-ops for non-`.bal` files — verified in `ls-schema-notifications.ts`.
3. **Co-located storage with hash-based identity** — `~/.ballerina/copilot/memory/{hash}/` uses the same `computeWorkspaceHash()` already in `copilot-utilities`. No new hash logic or sanitization needed.
4. **No sessions directory** — Auto Dream activity gate reads generation timestamps from existing `thread.json` files. No new files written anywhere.
5. **Module split: utilities vs orchestration** — `copilot-utilities/src/auto-memory/` has zero external npm dependencies (Node.js built-ins only). Vercel AI SDK calls live in `ballerina-extension/src/features/ai/memory/`.
6. **Prompt cache sharing (Extract Memories)** — same model + system prompt + message history as main call = shared prompt cache = cheaper per-step cost.
7. **No cache sharing (Auto Dream)** — standalone call, only needs memory files, not chat history.
8. **Fire-and-forget** — extraction and dream never block the agent response.
9. **Lock file `mtime` as timestamp** — `mtime` of `.consolidate-lock` IS `lastDreamAt`. No extra state.
10. **6-type taxonomy with two scopes** — global types (`user`, `pattern`, `history`) persist across all workspaces; workspace types (`integration`, `project`, `reference`) are project-specific. `history` is new — captures completed project institutional knowledge so it survives when a developer moves to a new project.
11. **Cross-project continuity** — global memory directory (`memory/global/`) is shared by all workspaces. A developer starting a new project immediately has their user profile, team standards, and all past project learnings available without re-explaining anything.

---

## What's NOT in This Design (Out of Scope for v1)

- Team memory sharing (private only — no shared directory)
- KAIROS/daily-log mode (daily append-only logs)
- Manual `/dream` command (can be added in v2)
- Memory UI panel in VS Code sidebar

---

## Verification Plan

1. **Global routing**: Say "I prefer Ballerina over XML" (user type). Confirm file written to `~/.ballerina/copilot/memory/global/` NOT `memory/{hash}/`.
2. **Workspace routing**: Say "The Shopify webhook fires twice" (integration type). Confirm file written to `memory/{hash}/`.
3. **Cross-project continuity**: Open a brand new workspace folder (new hash). Confirm system prompt contains the global memories (user, pattern) from previous work even though workspace memory is empty.
4. **System prompt structure**: Confirm injected prompt has both "Global Memory" and "Workspace Memory" labeled sections.
5. **History promotion**: Add a project memory with a past deadline, run auto-dream. Confirm completed project is distilled into `history_*.md` in `global/` directory.
6. **Mutual exclusion**: Have the main agent write a memory file, confirm extraction skips that turn.
7. **Disable flag**: Set `COPILOT_DISABLE_AUTO_MEMORY=1`, confirm no files written to either directory.
8. **Truncation**: Create a global `MEMORY.md` with 210 lines, confirm system prompt receives only 200 lines with warning.
9. **Global lock contention**: Simulate two workspaces dreaming simultaneously. Confirm second dream skips global consolidation but still consolidates its own workspace.
10. **Lock rollback**: Kill dream mid-run, confirm both `.consolidate-lock` mtimes rewind.

---

---

# Implementation Code — WSO2 Adaptation

> Reference implementations for `copilot-utilities/src/auto-memory/` and `ballerina-extension/src/features/ai/memory/`.
> Key changes from original Claude Code source:
> - Storage: `~/.claude/projects/<cwd>/` → `~/.ballerina/copilot/memory/global/` (user/pattern/history) + `memory/{hash}/` (integration/project/reference)
> - Workspace identity: sanitized path → `computeWorkspaceHash()` (already in copilot-utilities)
> - No VS Code API in `copilot-utilities` — workspace hash passed as parameter
> - `CLAUDE_CODE_DISABLE_AUTO_MEMORY` → `COPILOT_DISABLE_AUTO_MEMORY`
> - `CLAUDE.md` → `COPILOT.md` in prompts
> - GrowthBook feature flags → simple env var + settings.json
> - `runForkedAgent()` → `generateText()` from Vercel AI SDK
> - Custom Read/Write/Edit tools → reuse `createReadTool`/`createWriteTool`/`createEditTool` from `text-editor.ts`
> - Session JSONL transcripts → generation count from `thread.json` (no new files)
> - KAIROS / TEAMMEM / LODESTONE branches → removed entirely

---

## File 1: `src/memdir/paths.ts`

No VS Code dependency. Workspace hash passed in by the caller (`ballerina-extension` computes it via `computeWorkspaceHash(workspacePath)` already in `copilot-utilities`).

```typescript
import { normalize, join, sep } from 'path'
import { homedir } from 'os'

const COPILOT_BASE = join(homedir(), '.ballerina', 'copilot', 'memory')

/**
 * Returns the workspace-specific memory directory.
 * ~/.ballerina/copilot/memory/{hash}/
 */
export function getMemoryDir(workspaceHash: string): string {
  return normalize(join(COPILOT_BASE, workspaceHash)) + sep
}

/**
 * Returns the global memory directory shared across all workspaces.
 * ~/.ballerina/copilot/memory/global/
 */
export function getGlobalMemoryDir(): string {
  return normalize(join(COPILOT_BASE, 'global')) + sep
}

/**
 * Whether auto-memory is enabled.
 * Checks COPILOT_DISABLE_AUTO_MEMORY env var only.
 */
export function isAutoMemoryEnabled(): boolean {
  const env = process.env.COPILOT_DISABLE_AUTO_MEMORY
  if (env === '1' || env === 'true') return false
  return true
}

/**
 * Returns true if absolutePath is within either the global or workspace memory dir.
 * Used to sandbox file_write / file_edit tool calls.
 */
export function isInMemoryDir(absolutePath: string, workspaceHash: string): boolean {
  const normalized = normalize(absolutePath)
  return (
    normalized.startsWith(getMemoryDir(workspaceHash)) ||
    normalized.startsWith(getGlobalMemoryDir())
  )
}
```

---

## File 2: `src/memdir/memoryTypes.ts`

```typescript
/**
 * Memory type taxonomy — WSO2 Integrator Copilot.
 * 6 types across two scopes: global (user/pattern/history) and workspace (integration/project/reference).
 */

export const MEMORY_TYPES = ['user', 'integration', 'pattern', 'project', 'reference', 'history'] as const
export type MemoryType = (typeof MEMORY_TYPES)[number]

/** Types that belong in the global memory directory (cross-project) */
export const GLOBAL_MEMORY_TYPES: readonly MemoryType[] = ['user', 'pattern', 'history']

/** Types that belong in the workspace memory directory (project-specific) */
export const WORKSPACE_MEMORY_TYPES: readonly MemoryType[] = ['integration', 'project', 'reference']

export function isGlobalMemoryType(type: MemoryType): boolean {
  return (GLOBAL_MEMORY_TYPES as readonly string[]).includes(type)
}

export function parseMemoryType(raw: unknown): MemoryType | undefined {
  if (typeof raw !== 'string') return undefined
  return MEMORY_TYPES.find(t => t === raw)
}

export const TYPES_SECTION: readonly string[] = [
  '## Types of memory',
  '',
  'There are 6 types of memory across two scopes — global (user, pattern, history) and workspace (integration, project, reference):',
  '',
  '<types>',
  '<type>',
  '    <name>user</name>',
  '    <description>Who the engineer is — their background, integration expertise, preferred tools, and how they like the Copilot to communicate. Use this to tailor explanations and avoid repeating things they already know. Avoid writing memories that could be viewed as a negative judgement.</description>',
  '    <when_to_save>When you learn the user\'s role, integration background (ESB/MI/MuleSoft/Ballerina experience), preferred language features, or how they want explanations delivered.</when_to_save>',
  '    <how_to_use>Tailor your communication style and code examples to their expertise. A senior ESB architect migrating to Ballerina needs ESB analogues. A non-developer Salesforce admin needs business terms, not code jargon.</how_to_use>',
  '    <examples>',
  '    user: I have 10 years of WSO2 ESB experience but this is my first Ballerina project',
  '    assistant: [saves user memory: deep WSO2 ESB expertise, new to Ballerina — frame Ballerina concepts using ESB analogues (e.g., Filter service ≈ CBR mediator)]',
  '',
  '    user: Stop showing me XML config examples — I only use Ballerina code',
  '    assistant: [saves user memory: never suggest XML mediators or config-based approaches — user works exclusively in Ballerina code]',
  '',
  '    user: I\'m a Salesforce admin learning integrations — not a developer',
  '    assistant: [saves user memory: non-developer background — explain code concepts simply using business terms, avoid technical jargon]',
  '    </examples>',
  '</type>',
  '<type>',
  '    <name>integration</name>',
  '    <description>Facts about the external systems being connected — authentication patterns, data format quirks, API gotchas, naming conventions, rate limits, and anything surprising about how a system behaves. These are things you\'d write on a sticky note next to your monitor. The Copilot can read integration code but cannot know how an external API actually behaves in practice.</description>',
  '    <when_to_save>When you learn something non-obvious about an external system: how it authenticates, a known quirk or limitation, its data format or naming convention, rate limits, or pagination behaviour. Key distinction: this type captures how a system BEHAVES. The `reference` type captures WHERE to find things about it.</when_to_save>',
  '    <how_to_use>Apply this knowledge when suggesting code that interacts with that system. For example, if the API returns 200 on errors, always check the response body — never rely on HTTP status alone.</how_to_use>',
  '    <examples>',
  '    user: The Shopify webhook for orders fires twice — once on placement, once on payment confirmation',
  '    assistant: [saves integration memory: Shopify order webhooks fire twice per order; always deduplicate on order_id before processing downstream]',
  '',
  '    user: Our Salesforce connector uses JWT Bearer OAuth2, not the standard auth code flow',
  '    assistant: [saves integration memory: Salesforce connection uses JWT Bearer OAuth2 flow — always suggest this, not auth code flow]',
  '',
  '    user: The inventory API returns HTTP 200 even when orders fail — check the response.status field',
  '    assistant: [saves integration memory: inventory API returns HTTP 200 on business errors — never rely on HTTP status code, always check response.status field]',
  '',
  '    user: Our Kafka topics follow the naming convention {env}.{domain}.{entity}.v1',
  '    assistant: [saves integration memory: Kafka topic naming convention is {env}.{domain}.{entity}.v1 — use this when suggesting topic names]',
  '    </examples>',
  '</type>',
  '<type>',
  '    <name>pattern</name>',
  '    <description>Architectural decisions and team standards for how integrations are built — the "we always do it this way" rules. These are decisions the team has made once so they don\'t get re-debated for every new integration. Includes both corrections (do not suggest approach X) and confirmations (yes, always use approach Y). Always include WHY the decision was made — it allows the Copilot to judge edge cases rather than blindly following rules.</description>',
  '    <when_to_save>When the user corrects a suggested approach ("don\'t do it that way, we use X"), confirms a pattern worked ("yes, always do it that way"), or states a team convention. Record corrections AND confirmations — if you only save corrections you will drift away from validated approaches.</when_to_save>',
  '    <how_to_use>Apply these standards to every integration suggestion. Never propose an approach that violates a saved pattern without explicitly flagging the conflict.</how_to_use>',
  '    <body_structure>Lead with the rule itself, then a **Why:** line (the reason — often a past incident or business constraint) and a **How to apply:** line (when this rule kicks in).</body_structure>',
  '    <examples>',
  '    user: We always buffer through Kafka before writing to Google Sheets — direct writes caused data loss during API outages',
  '    assistant: [saves pattern memory: never write directly from source to Sheets — always buffer through Kafka first. Why: direct writes caused data loss during Sheets API outages. How to apply: all pipelines ending at Google Sheets must use a Kafka buffer stage.]',
  '',
  '    user: All our error handling follows: retry 3 times → dead-letter Kafka topic → Slack alert. Every integration.',
  '    assistant: [saves pattern memory: standard error chain for all integrations: retry 3× with exponential backoff → dead-letter to {env}.errors.{domain} Kafka topic → Slack alert. Why: ops SLA requires no silent failures. How to apply: every integration that calls an external system must implement this chain.]',
  '',
  '    user: Transformation logic over 20 lines always goes in its own .bal file under transforms/ — we have a code review rule for it',
  '    assistant: [saves pattern memory: transforms over 20 lines must be extracted to transforms/ directory. Why: team code review rule for maintainability. How to apply: never inline long transformation logic in service files.]',
  '    </examples>',
  '</type>',
  '<type>',
  '    <name>project</name>',
  '    <description>What is actively being built right now, why it exists, and constraints that affect every suggestion — migration phase, deadlines, compliance requirements, feature freezes. This is time-sensitive context that matters today but may be irrelevant in a few months.</description>',
  '    <when_to_save>When you learn the business driver behind current work, a migration phase, a hard deadline, an active freeze, or a compliance constraint. Always convert relative dates to absolute dates ("by Thursday" → "by 2026-04-10") so the memory stays meaningful over time.</when_to_save>',
  '    <how_to_use>Use this to prioritise suggestions appropriately and flag anything that conflicts with current constraints. For example, if there is an active schema freeze, flag suggestions that require schema changes.</how_to_use>',
  '    <body_structure>Lead with the fact or constraint, then a **Why:** line (the business driver) and a **How to apply:** line (what to do differently because of this context).</body_structure>',
  '    <examples>',
  '    user: We\'re migrating our Salesforce→SAP integration from MuleSoft to Ballerina — MuleSoft license expires 2026-07-01',
  '    assistant: [saves project memory: MuleSoft → Ballerina migration for Salesforce→SAP integration, deadline 2026-07-01 (license expiry). Why: cost and EOL. How to apply: prioritise completeness over elegance; flag any approach that risks missing the deadline.]',
  '',
  '    user: There\'s a Salesforce schema freeze until the governance audit finishes on 2026-06-15',
  '    assistant: [saves project memory: Salesforce schema is read-only until 2026-06-15 (governance audit). How to apply: flag any suggestion that requires a Salesforce schema change.]',
  '',
  '    user: This Stripe→QuickBooks sync must be GDPR compliant — no customer PII can be stored in our integration layer',
  '    assistant: [saves project memory: Stripe→QuickBooks integration is GDPR-scoped — PII must not be stored in the integration layer, pass-through only. How to apply: never suggest caching or storing customer data in this integration.]',
  '    </examples>',
  '</type>',
  '<type>',
  '    <name>reference</name>',
  '    <description>Where to find things — monitoring dashboards, issue tracker project keys, internal documentation URLs, runbooks, Confluence spaces. Not what those things contain (that belongs in `integration`) — just where they live.</description>',
  '    <when_to_save>When you learn a URL, JIRA project key, Confluence space, monitoring dashboard, or any external location where work or documentation is tracked.</when_to_save>',
  '    <how_to_use>When the Copilot suggests "check the monitoring dashboard" or "file a ticket," use these pointers to be specific rather than generic.</how_to_use>',
  '    <examples>',
  '    user: Integration monitoring is all in Grafana at grafana.internal/d/integrations — that\'s what on-call watches',
  '    assistant: [saves reference memory: integration monitoring at grafana.internal/d/integrations — check before touching any integration request-path code]',
  '',
  '    user: Salesforce connector bugs go to JIRA SFDC, Google Workspace issues go to GWS',
  '    assistant: [saves reference memory: Salesforce connector bugs → JIRA project SFDC; Google Workspace issues → JIRA project GWS]',
  '',
  '    user: We use an internal Ballerina connector fork at confluence.internal/ballerina-connectors — not the public docs',
  '    assistant: [saves reference memory: use internal connector docs at confluence.internal/ballerina-connectors — not public ballerina.io docs]',
  '    </examples>',
  '</type>',
  '<type>',
  '    <name>history</name>',
  '    <description>Completed integration projects — what was built, what systems were connected, key architectural decisions, and lessons learned. This is permanent institutional knowledge that persists across all future projects. It is the answer to: "I finished the Salesforce→SAP integration last year — a new project session should know about it." Saved to the GLOBAL memory directory so it is available in every workspace.</description>',
  '    <when_to_save>When a user describes a completed integration ("we shipped X last quarter"), references prior work ("like we did in the last project"), or when auto-dream detects that a project memory has a passed deadline and the work is done. Key distinction from `project`: `project` is for active work that fades when it ends. `history` is permanent — it captures what was built and why.</when_to_save>',
  '    <how_to_use>When starting a new integration, use history memories to bring forward relevant knowledge: systems the developer has connected before, patterns that worked, lessons learned. Saves the developer from re-explaining past work at the start of every new project.</how_to_use>',
  '    <examples>',
  '    user: We finished migrating the Salesforce→SAP integration from MuleSoft to Ballerina — it went live last month',
  '    assistant: [saves history memory (global): Salesforce→SAP order fulfillment integration completed and live. Used JWT Bearer OAuth2 for Salesforce, RFC auth for SAP BAPI, Kafka buffer between them. outbox pattern for reliability. Key lesson: always buffer before SAP — direct writes timeout under peak load.]',
  '',
  '    user: The OneDrive→Google Drive migration project we did in 2024 is all done now',
  '    assistant: [saves history memory (global): OneDrive→Google Drive migration completed 2024. OneDrive returns flat file metadata; Google Drive expects nested fileResource — always add mapping layer. Drive API rate-limits at 1000 requests/100 seconds.]',
  '',
  '    user: We\'ve integrated with this HR system before on the payroll project — same SAP connector',
  '    assistant: [saves history memory (global): previously integrated SAP HR connector on payroll project. RFC auth, connection pool of 5 was optimal at our load, Kafka buffer before SAP mandatory for reliability.]',
  '    </examples>',
  '</type>',
  '</types>',
  '',
]

export const WHAT_NOT_TO_SAVE_SECTION: readonly string[] = [
  '## What NOT to save in memory',
  '',
  '- Ballerina sequences, integration XML, or connector configs already in the project — derivable by reading the files.',
  '- Deployment topology already in `deployment.toml` — derivable.',
  '- Credentials, API keys, or secrets — never save these, even if explicitly asked.',
  '- Stack traces and error logs — ephemeral, useless next session.',
  '- Payload examples from actual API calls — ephemeral and potentially contain PII/PHI.',
  '- Test data and mock payloads — ephemeral.',
  '- Anything already documented in COPILOT.md files.',
  '- Ephemeral task details: in-progress work, current conversation context.',
  '',
  'These exclusions apply even when the user explicitly asks you to save. If they ask you to save payload examples or error logs, ask what was *surprising or non-obvious* about it — that is the part worth keeping.',
]

export const MEMORY_DRIFT_CAVEAT =
  '- Memory records can become stale over time. Before answering based solely on a memory, verify it is still correct by reading the current project files. If a recalled memory conflicts with current state, trust what you observe now — and update or remove the stale memory.'

export const WHEN_TO_ACCESS_SECTION: readonly string[] = [
  '## When to access memories',
  '- When memories seem relevant, or the user references prior-conversation work.',
  '- You MUST access memory when the user explicitly asks you to check, recall, or remember.',
  '- If the user says to *ignore* memory: proceed as if MEMORY.md were empty.',
  MEMORY_DRIFT_CAVEAT,
]

export const TRUSTING_RECALL_SECTION: readonly string[] = [
  '## Before recommending from memory',
  '',
  'A memory that names a specific API endpoint, connector config, or file path is a claim that it existed *when the memory was written*. It may have changed.',
  '',
  '- If the memory names a file path: check the file exists.',
  '- If the memory names an API endpoint or connector config: verify it is still current.',
  '"The memory says X exists" is not the same as "X exists now."',
]

export const MEMORY_FRONTMATTER_EXAMPLE: readonly string[] = [
  '```markdown',
  '---',
  'name: {{memory name}}',
  'description: {{one-line description — used to decide relevance in future conversations, so be specific}}',
  `type: {{${MEMORY_TYPES.join(', ')}}}`,
  '---',
  '',
  '{{memory content — for pattern/project types, structure as: rule/fact, then **Why:** and **How to apply:** lines}}',
  '```',
]
```

---

## File 3: `src/memdir/memoryScan.ts`

```typescript
import { readdir } from 'fs/promises'
import { basename, join } from 'path'
import { parseFrontmatter } from '../utils/frontmatterParser'
import { readFileInRange } from '../utils/readFileInRange'
import { type MemoryType, parseMemoryType } from './memoryTypes'

export type MemoryHeader = {
  filename: string
  filePath: string
  mtimeMs: number
  description: string | null
  type: MemoryType | undefined
}

const MAX_MEMORY_FILES = 200
const FRONTMATTER_MAX_LINES = 30

/**
 * Scan a memory directory for .md files, read their frontmatter, and return
 * a header list sorted newest-first (capped at 200).
 * Pre-injected into extraction prompt so the agent doesn't waste a turn on `ls`.
 */
export async function scanMemoryFiles(
  memoryDir: string,
  signal: AbortSignal,
): Promise<MemoryHeader[]> {
  try {
    const entries = await readdir(memoryDir, { recursive: true })
    const mdFiles = (entries as string[]).filter(
      f => f.endsWith('.md') && basename(f) !== 'MEMORY.md',
    )

    const headerResults = await Promise.allSettled(
      mdFiles.map(async (relativePath): Promise<MemoryHeader> => {
        const filePath = join(memoryDir, relativePath)
        const { content, mtimeMs } = await readFileInRange(
          filePath, 0, FRONTMATTER_MAX_LINES, undefined, signal,
        )
        const { frontmatter } = parseFrontmatter(content, filePath)
        return {
          filename: relativePath,
          filePath,
          mtimeMs,
          description: frontmatter.description || null,
          type: parseMemoryType(frontmatter.type),
        }
      }),
    )

    return headerResults
      .filter((r): r is PromiseFulfilledResult<MemoryHeader> => r.status === 'fulfilled')
      .map(r => r.value)
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, MAX_MEMORY_FILES)
  } catch {
    return []
  }
}

/**
 * Format memory headers as a text manifest for injection into extraction prompt.
 * Format: - [type] filename (ISO timestamp): description
 */
export function formatMemoryManifest(memories: MemoryHeader[]): string {
  return memories
    .map(m => {
      const tag = m.type ? `[${m.type}] ` : ''
      const ts = new Date(m.mtimeMs).toISOString()
      return m.description
        ? `- ${tag}${m.filename} (${ts}): ${m.description}`
        : `- ${tag}${m.filename} (${ts})`
    })
    .join('\n')
}
```

---

## File 4: `src/memdir/memdir.ts`

```typescript
import { readFileSync } from 'fs'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { getMemoryDir } from './paths'
import {
  MEMORY_FRONTMATTER_EXAMPLE,
  TRUSTING_RECALL_SECTION,
  TYPES_SECTION,
  WHAT_NOT_TO_SAVE_SECTION,
  WHEN_TO_ACCESS_SECTION,
} from './memoryTypes'

export const ENTRYPOINT_NAME = 'MEMORY.md'
export const MAX_ENTRYPOINT_LINES = 200
export const MAX_ENTRYPOINT_BYTES = 25_000

export type EntrypointTruncation = {
  content: string
  lineCount: number
  byteCount: number
  wasLineTruncated: boolean
  wasByteTruncated: boolean
}

/**
 * Truncate MEMORY.md content to the line AND byte caps, appending a warning
 * that names which cap fired. Line-truncates first, then byte-truncates at
 * the last newline before the cap so we don't cut mid-line.
 */
export function truncateEntrypointContent(raw: string): EntrypointTruncation {
  const trimmed = raw.trim()
  const contentLines = trimmed.split('\n')
  const lineCount = contentLines.length
  const byteCount = trimmed.length

  const wasLineTruncated = lineCount > MAX_ENTRYPOINT_LINES
  const wasByteTruncated = byteCount > MAX_ENTRYPOINT_BYTES

  if (!wasLineTruncated && !wasByteTruncated) {
    return { content: trimmed, lineCount, byteCount, wasLineTruncated, wasByteTruncated }
  }

  let truncated = wasLineTruncated
    ? contentLines.slice(0, MAX_ENTRYPOINT_LINES).join('\n')
    : trimmed

  if (truncated.length > MAX_ENTRYPOINT_BYTES) {
    const cutAt = truncated.lastIndexOf('\n', MAX_ENTRYPOINT_BYTES)
    truncated = truncated.slice(0, cutAt > 0 ? cutAt : MAX_ENTRYPOINT_BYTES)
  }

  const reason =
    wasByteTruncated && !wasLineTruncated
      ? `${byteCount} bytes (limit: 25KB) — index entries are too long`
      : wasLineTruncated && !wasByteTruncated
        ? `${lineCount} lines (limit: ${MAX_ENTRYPOINT_LINES})`
        : `${lineCount} lines and ${byteCount} bytes`

  return {
    content:
      truncated +
      `\n\n> WARNING: ${ENTRYPOINT_NAME} is ${reason}. Only part of it was loaded. Keep index entries to one line under ~200 chars; move detail into topic files.`,
    lineCount,
    byteCount,
    wasLineTruncated,
    wasByteTruncated,
  }
}

export const DIR_EXISTS_GUIDANCE =
  'This directory already exists — write to it directly with the Write tool (do not run mkdir or check for its existence).'

/**
 * Ensure the memory directory exists. Called once at session start so
 * the agent can always write without checking existence first.
 */
export async function ensureMemoryDirExists(memoryDir: string): Promise<void> {
  try {
    await mkdir(memoryDir, { recursive: true })
  } catch {
    // EEXIST is fine — any other error surfaces at write time
  }
}

/**
 * Build the behavioral memory instructions (without MEMORY.md content).
 * This is what gets injected into the system prompt.
 */
export function buildMemoryLines(
  memoryDir: string,
  skipIndex = false,
): string[] {
  const howToSave = skipIndex
    ? [
        '## How to save memories',
        '',
        'Write each memory to its own file (e.g., `user_expertise.md`, `integration_shopify.md`, `pattern_error_handling.md`) using this frontmatter format:',
        '',
        ...MEMORY_FRONTMATTER_EXAMPLE,
        '',
        '- Keep the name, description, and type fields in memory files up-to-date with the content',
        '- Organize memory semantically by topic, not chronologically',
        '- Update or remove memories that turn out to be wrong or outdated',
        '- Do not write duplicate memories. First check if there is an existing memory you can update before writing a new one.',
      ]
    : [
        '## How to save memories',
        '',
        'Saving a memory is a two-step process:',
        '',
        `**Step 1** — write the memory to its own file (e.g., \`user_expertise.md\`, \`integration_shopify.md\`, \`pattern_error_handling.md\`) using this frontmatter format:`,
        '',
        ...MEMORY_FRONTMATTER_EXAMPLE,
        '',
        `**Step 2** — add a pointer to that file in \`${ENTRYPOINT_NAME}\`. \`${ENTRYPOINT_NAME}\` is an index, not a memory — each entry should be one line, under ~150 characters: \`- [Title](file.md) — one-line hook\`. It has no frontmatter. Never write memory content directly into \`${ENTRYPOINT_NAME}\`.`,
        '',
        `- \`${ENTRYPOINT_NAME}\` is always loaded into your conversation context — lines after ${MAX_ENTRYPOINT_LINES} will be truncated, so keep the index concise`,
        '- Keep the name, description, and type fields in memory files up-to-date with the content',
        '- Organize memory semantically by topic, not chronologically',
        '- Update or remove memories that turn out to be wrong or outdated',
        '- Do not write duplicate memories. First check if there is an existing memory you can update before writing a new one.',
      ]

  return [
    '# auto memory',
    '',
    `You have a persistent, file-based memory system at \`${memoryDir}\`. ${DIR_EXISTS_GUIDANCE}`,
    '',
    "You should build up this memory system over time so that future conversations can have a complete picture of who the user is, how they'd like to collaborate with you, what WSO2 integration patterns they prefer, and the context behind the work they give you.",
    '',
    'If the user explicitly asks you to remember something, save it immediately as whichever type fits best. If they ask you to forget something, find and remove the relevant entry.',
    '',
    ...TYPES_SECTION,
    ...WHAT_NOT_TO_SAVE_SECTION,
    '',
    ...howToSave,
    '',
    ...WHEN_TO_ACCESS_SECTION,
    '',
    ...TRUSTING_RECALL_SECTION,
    '',
  ]
}

/**
 * Load the full memory prompt for injection into the system prompt.
 * Reads MEMORY.md, truncates to limits, combines with behavioral instructions.
 * Returns null if auto-memory is disabled.
 */
export async function loadMemoryPrompt(workspaceHash: string): Promise<string | null> {
  const autoDir = getMemoryDir(workspaceHash)
  await ensureMemoryDirExists(autoDir)

  const lines = buildMemoryLines(autoDir)
  const entrypoint = join(autoDir, ENTRYPOINT_NAME)

  let entrypointContent = ''
  try {
    entrypointContent = readFileSync(entrypoint, { encoding: 'utf-8' })
  } catch {
    // No MEMORY.md yet — first session
  }

  if (entrypointContent.trim()) {
    const t = truncateEntrypointContent(entrypointContent)
    lines.push(`## ${ENTRYPOINT_NAME}`, '', t.content)
  } else {
    lines.push(
      `## ${ENTRYPOINT_NAME}`,
      '',
      `Your ${ENTRYPOINT_NAME} is currently empty. When you save new memories, they will appear here.`,
    )
  }

  return lines.join('\n')
}
```

---

## File 5: `src/services/extractMemories/prompts.ts`

```typescript
import {
  MEMORY_FRONTMATTER_EXAMPLE,
  TYPES_SECTION,
  WHAT_NOT_TO_SAVE_SECTION,
} from '../../memdir/memoryTypes'
import { ENTRYPOINT_NAME, MAX_ENTRYPOINT_LINES } from '../../memdir/memdir'

function opener(newMessageCount: number, existingMemories: string): string {
  const manifest =
    existingMemories.length > 0
      ? `\n\n## Existing memory files\n\n${existingMemories}\n\nCheck this list before writing — update an existing file rather than creating a duplicate.`
      : ''
  return [
    `You are now acting as the memory extraction subagent. Analyze the most recent ~${newMessageCount} messages above and use them to update your persistent memory systems.`,
    '',
    `Available tools: file_read (unrestricted), file_write and file_edit (memory directory only). All other tools are not available.`,
    '',
    `You have a limited step budget. file_edit requires a prior file_read of the same file, so the efficient strategy is: step 1 — issue all file_read calls in parallel for every file you might update; step 2 — issue all file_write/file_edit calls in parallel. Do not interleave reads and writes across multiple steps.`,
    '',
    `You MUST only use content from the last ~${newMessageCount} messages to update your persistent memories. Do not waste any turns attempting to investigate or verify that content further — no grepping source files, no reading code to confirm a pattern exists, no git commands.` +
      manifest,
  ].join('\n')
}

export function buildExtractPrompt(
  newMessageCount: number,
  existingMemories: string,
  skipIndex = false,
): string {
  const howToSave = skipIndex
    ? [
        '## How to save memories',
        '',
        'Write each memory to its own file (e.g., `user_role.md`, `feedback_mediator.md`) using this frontmatter format:',
        '',
        ...MEMORY_FRONTMATTER_EXAMPLE,
        '',
        '- Organize memory semantically by topic, not chronologically',
        '- Update or remove memories that turn out to be wrong or outdated',
        '- Do not write duplicate memories. First check if there is an existing memory you can update before writing a new one.',
      ]
    : [
        '## How to save memories',
        '',
        'Saving a memory is a two-step process:',
        '',
        '**Step 1** — write the memory to its own file (e.g., `user_role.md`, `feedback_mediator.md`) using this frontmatter format:',
        '',
        ...MEMORY_FRONTMATTER_EXAMPLE,
        '',
        `**Step 2** — add a pointer to that file in \`${ENTRYPOINT_NAME}\`. \`${ENTRYPOINT_NAME}\` is an index, not a memory — each entry should be one line, under ~150 characters: \`- [Title](file.md) — one-line hook\`. It has no frontmatter. Never write memory content directly into \`${ENTRYPOINT_NAME}\`.`,
        '',
        `- \`${ENTRYPOINT_NAME}\` is always loaded into your system prompt — lines after ${MAX_ENTRYPOINT_LINES} will be truncated, so keep the index concise`,
        '- Keep the name, description, and type fields up-to-date with the content',
        '- Organize memory semantically by topic, not chronologically',
        '- Update or remove memories that turn out to be wrong or outdated',
        '- Do not write duplicate memories. First check if there is an existing memory you can update before writing a new one.',
      ]

  return [
    opener(newMessageCount, existingMemories),
    '',
    'If the user explicitly asks you to remember something, save it immediately as whichever type fits best. If they ask you to forget something, find and remove the relevant entry.',
    '',
    ...TYPES_SECTION,
    ...WHAT_NOT_TO_SAVE_SECTION,
    '',
    ...howToSave,
  ].join('\n')
}
```

---

## File 6: `src/services/extractMemories/extractMemories.ts`

> **Note:** This file lives in `ballerina-extension/src/features/ai/memory/extractMemories.ts`, not in `copilot-utilities`. It uses Vercel AI SDK `generateText()` and reuses `createReadTool`/`createWriteTool`/`createEditTool` from `text-editor.ts`. The code below is the original Claude Code reference — the WSO2 adaptation replaces `anthropic.messages.create()` / `runForkedAgentLoop` with `generateText()`, and `getAutoMemPath()` with `getMemoryDir(workspaceHash)`.

```typescript
/**
 * Extracts durable memories from the current conversation
 * and writes them to the auto-memory directory.
 *
 * Runs as a fire-and-forget background call after every agent response,
 * triggered from AgentExecutor.handleStreamFinish().
 *
 * Uses generateText() from Vercel AI SDK with file_read/file_write/file_edit
 * tools reused from text-editor.ts with memoryDir as the base path.
 */

import Anthropic from '@anthropic-ai/sdk'
import { basename } from 'path'
import { ENTRYPOINT_NAME } from '../../memdir/memdir'
import { formatMemoryManifest, scanMemoryFiles } from '../../memdir/memoryScan'
import { getAutoMemPath, isAutoMemPath, isAutoMemoryEnabled } from '../../memdir/paths'
import { buildExtractPrompt } from './prompts'

// ============================================================================
// Types
// ============================================================================

export type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

type ExtractionContext = {
  messages: ConversationMessage[]
  systemPrompt: string
  apiKey: string
  model: string
}

// ============================================================================
// Tool permission sandbox
// ============================================================================

const READ_ONLY_BASH_PATTERN =
  /^\s*(ls|find|grep|cat|stat|wc|head|tail|echo|pwd|which|type|file|du|df)\b/

/**
 * Creates the canUseTool gate: Read/Grep/Glob unrestricted,
 * Bash read-only, Write/Edit memory dir only, everything else denied.
 * Used by both extractMemories and autoDream.
 */
export function createMemoryToolGate(memoryDir: string) {
  return function canUseTool(toolName: string, input: Record<string, unknown>): boolean {
    if (['Read', 'Grep', 'Glob'].includes(toolName)) return true

    if (toolName === 'Bash') {
      const cmd = String(input.command ?? '')
      return READ_ONLY_BASH_PATTERN.test(cmd)
    }

    if (toolName === 'Edit' || toolName === 'Write') {
      const filePath = String(input.file_path ?? '')
      return isAutoMemPath(filePath)
    }

    return false
  }
}

// ============================================================================
// Mutual exclusion helpers
// ============================================================================

/**
 * Returns true if any assistant message after the cursor contains a
 * Write/Edit tool_use targeting an auto-memory path.
 * When the main agent wrote memories, extraction is redundant.
 */
function hasMemoryWritesSince(
  messages: ConversationMessage[],
  sinceIndex: number,
): boolean {
  for (let i = sinceIndex; i < messages.length; i++) {
    const msg = messages[i]
    if (msg.role !== 'assistant') continue
    // Check if message content contains memory file path references
    // (simplified: check if content mentions the memory directory)
    if (msg.content.includes(getAutoMemPath())) return true
  }
  return false
}

// ============================================================================
// Closure-scoped state — reset per session via initExtractMemories()
// ============================================================================

let extractor: ((ctx: ExtractionContext) => Promise<void>) | null = null
let drainer: (timeoutMs?: number) => Promise<void> = async () => {}

/**
 * Initialize the extraction system. Call once at extension activate,
 * or per-test in beforeEach for a fresh closure.
 */
export function initExtractMemories(): void {
  const inFlightExtractions = new Set<Promise<void>>()
  let lastProcessedMessageIndex = 0
  let inProgress = false
  let pendingContext: ExtractionContext | undefined

  async function runExtraction(ctx: ExtractionContext, isTrailingRun = false): Promise<void> {
    const memoryDir = getAutoMemPath()
    const newMessages = ctx.messages.slice(lastProcessedMessageIndex)
    const newMessageCount = newMessages.filter(m => m.role === 'user' || m.role === 'assistant').length

    if (newMessageCount === 0) return

    // Mutual exclusion: if main agent already wrote memories, skip and advance cursor
    if (hasMemoryWritesSince(ctx.messages, lastProcessedMessageIndex)) {
      lastProcessedMessageIndex = ctx.messages.length
      return
    }

    inProgress = true
    try {
      const existingMemories = formatMemoryManifest(
        await scanMemoryFiles(memoryDir, new AbortController().signal),
      )

      const extractionPrompt = buildExtractPrompt(newMessageCount, existingMemories)

      const client = new Anthropic({ apiKey: ctx.apiKey })

      // Fork: same system prompt + message history, extraction prompt appended
      await runForkedAgentLoop({
        client,
        model: ctx.model,
        systemPrompt: ctx.systemPrompt,
        messages: [
          ...ctx.messages,
          { role: 'user', content: extractionPrompt },
        ],
        memoryDir,
        maxTurns: 5,
      })

      // Advance cursor only on success
      lastProcessedMessageIndex = ctx.messages.length
    } catch (error) {
      console.error('[extractMemories] error:', error)
      // Cursor stays put — messages reconsidered next turn
    } finally {
      inProgress = false

      // Process any stashed trailing context
      const trailing = pendingContext
      pendingContext = undefined
      if (trailing) {
        await runExtraction(trailing, true)
      }
    }
  }

  extractor = async (ctx: ExtractionContext) => {
    if (!isAutoMemoryEnabled()) return
    if (inProgress) {
      pendingContext = ctx // stash, run as trailing
      return
    }
    const p = runExtraction(ctx)
    inFlightExtractions.add(p)
    try {
      await p
    } finally {
      inFlightExtractions.delete(p)
    }
  }

  drainer = async (timeoutMs = 60_000) => {
    if (inFlightExtractions.size === 0) return
    await Promise.race([
      Promise.all(inFlightExtractions).catch(() => {}),
      new Promise<void>(r => setTimeout(r, timeoutMs).unref()),
    ])
  }
}

// ============================================================================
// Forked agent agentic loop
// ============================================================================

/**
 * Runs an agentic loop with the given messages, handling tool calls
 * with the memory-dir-only sandbox. Equivalent to runForkedAgent() in
 * Claude Code but using the Anthropic SDK directly.
 */
async function runForkedAgentLoop(opts: {
  client: Anthropic
  model: string
  systemPrompt: string
  messages: ConversationMessage[]
  memoryDir: string
  maxTurns: number
}): Promise<void> {
  const { client, model, systemPrompt, messages, memoryDir, maxTurns } = opts
  const canUseTool = createMemoryToolGate(memoryDir)

  let conversationMessages: Anthropic.MessageParam[] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }))

  const tools = buildMemoryTools()

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: conversationMessages,
      tools,
    })

    if (response.stop_reason === 'end_turn') break

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        const toolInput = block.input as Record<string, unknown>

        if (!canUseTool(block.name, toolInput)) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Tool ${block.name} is not permitted in this context.`,
            is_error: true,
          })
          continue
        }

        const result = await executeMemoryTool(block.name, toolInput)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        })
      }

      conversationMessages = [
        ...conversationMessages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ]
    } else {
      break
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

export async function executeExtractMemories(ctx: ExtractionContext): Promise<void> {
  await extractor?.(ctx)
}

export async function drainPendingExtraction(timeoutMs?: number): Promise<void> {
  await drainer(timeoutMs)
}
```

> **Note:** `buildMemoryTools()` and `executeMemoryTool()` are utility functions that define the Read/Write/Edit/Grep/Glob/Bash tool schemas and execute them against the local filesystem. These map to the standard Anthropic tool-use format and are implemented as simple Node.js `fs` operations.

---

## File 7: `src/services/autoDream/consolidationLock.ts`

> **Note:** In the WSO2 adaptation, `getAutoMemPath()` is replaced with `getMemoryDir(workspaceHash)` (workspaceHash passed as parameter), `getSessionsPath()` is removed entirely, and `listSessionsTouchedSince()` is replaced with `countGenerationsSince()` which reads generation timestamps from existing `thread.json` files.

```typescript
/**
 * Lock file whose mtime IS lastConsolidatedAt. Body is the holder's PID.
 * Lives inside the memory directory.
 */

import { mkdir, readFile, stat, unlink, utimes, writeFile } from 'fs/promises'
import { join } from 'path'
import { getMemoryDir } from '../../memdir/paths'
import { readdir } from 'fs/promises'

const LOCK_FILE = '.consolidate-lock'
const HOLDER_STALE_MS = 60 * 60 * 1000   // 60 minutes

function lockPath(): string {
  return join(getAutoMemPath(), LOCK_FILE)
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** mtime of the lock file = lastConsolidatedAt. 0 if absent. */
export async function readLastConsolidatedAt(): Promise<number> {
  try {
    const s = await stat(lockPath())
    return s.mtimeMs
  } catch {
    return 0
  }
}

/**
 * Acquire the lock. Returns prior mtime (for rollback), or null if blocked.
 */
export async function tryAcquireConsolidationLock(): Promise<number | null> {
  const path = lockPath()

  let mtimeMs: number | undefined
  let holderPid: number | undefined
  try {
    const [s, raw] = await Promise.all([stat(path), readFile(path, 'utf8')])
    mtimeMs = s.mtimeMs
    const parsed = parseInt(raw.trim(), 10)
    holderPid = Number.isFinite(parsed) ? parsed : undefined
  } catch {
    // ENOENT — no prior lock
  }

  if (mtimeMs !== undefined && Date.now() - mtimeMs < HOLDER_STALE_MS) {
    if (holderPid !== undefined && isProcessRunning(holderPid)) {
      return null  // another process is dreaming
    }
  }

  await mkdir(getAutoMemPath(), { recursive: true })
  await writeFile(path, String(process.pid))

  // Race detection: two reclaimers write simultaneously — last write wins
  let verify: string
  try {
    verify = await readFile(path, 'utf8')
  } catch {
    return null
  }
  if (parseInt(verify.trim(), 10) !== process.pid) return null

  return mtimeMs ?? 0
}

/**
 * Rollback mtime to pre-acquire after fork failure.
 * priorMtime 0 → unlink (restore no-file state).
 */
export async function rollbackConsolidationLock(priorMtime: number): Promise<void> {
  const path = lockPath()
  try {
    if (priorMtime === 0) {
      await unlink(path)
      return
    }
    await writeFile(path, '')
    const t = priorMtime / 1000
    await utimes(path, t, t)
  } catch (e: unknown) {
    console.error('[autoDream] rollback failed:', (e as Error).message)
  }
}

/**
 * List session IDs (filenames without extension) with mtime after sinceMs.
 * Excludes the current session ID.
 */
export async function listSessionsTouchedSince(sinceMs: number): Promise<string[]> {
  const sessionsDir = getSessionsPath()
  try {
    const entries = await readdir(sessionsDir, { withFileTypes: true })
    const results: string[] = []
    await Promise.all(
      entries.map(async entry => {
        if (!entry.isFile() || !entry.name.endsWith('.jsonl')) return
        try {
          const s = await stat(join(sessionsDir, entry.name))
          if (s.mtimeMs > sinceMs) {
            results.push(entry.name.replace('.jsonl', ''))
          }
        } catch {}
      }),
    )
    return results
  } catch {
    return []
  }
}

/** Stamp from manual /dream. Best-effort. */
export async function recordConsolidation(): Promise<void> {
  try {
    await mkdir(getAutoMemPath(), { recursive: true })
    await writeFile(lockPath(), String(process.pid))
  } catch (e: unknown) {
    console.error('[autoDream] recordConsolidation failed:', (e as Error).message)
  }
}
```

---

## File 8: `src/services/autoDream/consolidationPrompt.ts`

```typescript
// Identical to Claude Code — no WSO2-specific changes needed
import { DIR_EXISTS_GUIDANCE, ENTRYPOINT_NAME, MAX_ENTRYPOINT_LINES } from '../../memdir/memdir'

export function buildConsolidationPrompt(
  memoryRoot: string,
  transcriptDir: string,
  extra: string,
): string {
  return `# Dream: Memory Consolidation

You are performing a dream — a reflective pass over your memory files. Synthesize what you've learned recently into durable, well-organized memories so that future sessions can orient quickly.

Memory directory: \`${memoryRoot}\`
${DIR_EXISTS_GUIDANCE}

Session transcripts: \`${transcriptDir}\` (large JSONL files — grep narrowly, don't read whole files)

---

## Phase 1 — Orient

- \`ls\` the memory directory to see what already exists
- Read \`${ENTRYPOINT_NAME}\` to understand the current index
- Skim existing topic files so you improve them rather than creating duplicates

## Phase 2 — Gather recent signal

Look for new information worth persisting. Sources in rough priority order:

1. **Existing memories that drifted** — facts that contradict something you see in the project now
2. **Transcript search** — grep the JSONL transcripts for narrow terms:
   \`grep -rn "<narrow term>" ${transcriptDir} --include="*.jsonl" | tail -50\`

Don't exhaustively read transcripts. Look only for things you already suspect matter.

## Phase 3 — Consolidate

For each thing worth remembering, write or update a memory file at the top level of the memory directory. Use the memory file format and type conventions from your system prompt.

Focus on:
- Merging new signal into existing topic files rather than creating near-duplicates
- Converting relative dates ("yesterday", "last week") to absolute dates so they remain interpretable after time passes
- Deleting contradicted facts — if today's investigation disproves an old memory, fix it at the source

## Phase 4 — Prune and index

Update \`${ENTRYPOINT_NAME}\` so it stays under ${MAX_ENTRYPOINT_LINES} lines AND under ~25KB. It's an **index**, not a dump — each entry should be one line under ~150 characters: \`- [Title](file.md) — one-line hook\`. Never write memory content directly into it.

- Remove pointers to memories that are now stale, wrong, or superseded
- Demote verbose entries: if an index line is over ~200 chars, move the detail to the topic file
- Add pointers to newly important memories
- Resolve contradictions — if two files disagree, fix the wrong one

---

Return a brief summary of what you consolidated, updated, or pruned. If nothing changed (memories are already tight), say so.${extra ? `\n\n## Additional context\n\n${extra}` : ''}`
}
```

---

## File 9: `src/services/autoDream/config.ts`

> **Note:** In the WSO2 adaptation, `getSettings()` (VS Code API) is not used in `copilot-utilities`. The `autoDreamEnabled` flag is read by `ballerina-extension` from VS Code settings and passed into the auto-memory module as a parameter.

```typescript
// autoDreamEnabled is passed in from ballerina-extension — no VS Code dep here.
// The extension reads it from workspace configuration and passes it to executeAutoDream().
export function isAutoDreamEnabled(autoDreamEnabled?: boolean): boolean {
  return autoDreamEnabled !== false  // default enabled
}
```

---

## File 10: `src/services/autoDream/autoDream.ts`

> **Note:** In the WSO2 adaptation, this file lives in `ballerina-extension/src/features/ai/memory/autoDream.ts`. It uses `generateText()` from Vercel AI SDK (not Anthropic SDK directly), `getMemoryDir(workspaceHash)` instead of `getAutoMemPath()`, and `countGenerationsSince()` instead of `listSessionsTouchedSince()`. The session/JSONL-based gate 3 is replaced with a generation count from existing `thread.json` files.

```typescript
/**
 * Background memory consolidation. Fires the consolidation prompt as a
 * fire-and-forget generateText() call when time-gate AND activity-gate pass.
 *
 * Gate order (cheapest first):
 *   1. Time: hours since lastConsolidatedAt >= minHours (one stat)
 *   2. Scan throttle: 10 min cooldown between scans
 *   3. Activity: new generations since lastConsolidatedAt >= minGenerations (read thread.json files)
 *   4. Lock: no other process mid-consolidation
 */

import { getMemoryDir, isAutoMemoryEnabled } from '../../memdir/paths'
import { isAutoDreamEnabled } from './config'
import { buildConsolidationPrompt } from './consolidationPrompt'
import {
  readLastConsolidatedAt,
  listSessionsTouchedSince,
  tryAcquireConsolidationLock,
  rollbackConsolidationLock,
} from './consolidationLock'
import { createMemoryToolGate } from '../extractMemories/extractMemories'

const SESSION_SCAN_INTERVAL_MS = 10 * 60 * 1000   // 10 minutes

type DreamConfig = {
  minHours: number
  minSessions: number
}

const DEFAULTS: DreamConfig = { minHours: 24, minSessions: 5 }

export type DreamStatus = {
  phase: 'starting' | 'updating'
  sessionsReviewing: number
  filesTouched: string[]
}

export type OnDreamProgress = (status: DreamStatus) => void
export type OnDreamComplete = (filesTouched: string[]) => void
export type OnDreamFail = () => void

let runner: ((opts: DreamRunOptions) => Promise<void>) | null = null

type DreamRunOptions = {
  apiKey: string
  model: string
  systemPrompt: string
  currentSessionId: string
  onProgress?: OnDreamProgress
  onComplete?: OnDreamComplete
  onFail?: OnDreamFail
  config?: Partial<DreamConfig>
}

/**
 * Initialize auto-dream. Call once at extension activate, or per-test in beforeEach.
 */
export function initAutoDream(): void {
  let lastSessionScanAt = 0

  runner = async function runAutoDream(opts: DreamRunOptions) {
    const cfg = { ...DEFAULTS, ...opts.config }

    if (!isAutoMemoryEnabled() || !isAutoDreamEnabled()) return

    // Gate 1 — Time gate (one stat call)
    let lastAt: number
    try {
      lastAt = await readLastConsolidatedAt()
    } catch {
      return
    }
    const hoursSince = (Date.now() - lastAt) / 3_600_000
    if (hoursSince < cfg.minHours) return

    // Gate 2 — Scan throttle
    const sinceScanMs = Date.now() - lastSessionScanAt
    if (sinceScanMs < SESSION_SCAN_INTERVAL_MS) return
    lastSessionScanAt = Date.now()

    // Gate 3 — Session gate
    let sessionIds: string[]
    try {
      sessionIds = await listSessionsTouchedSince(lastAt)
    } catch {
      return
    }
    sessionIds = sessionIds.filter(id => id !== opts.currentSessionId)
    if (sessionIds.length < cfg.minSessions) return

    // Lock acquisition
    let priorMtime: number | null
    try {
      priorMtime = await tryAcquireConsolidationLock()
    } catch {
      return
    }
    if (priorMtime === null) return

    const status: DreamStatus = {
      phase: 'starting',
      sessionsReviewing: sessionIds.length,
      filesTouched: [],
    }

    opts.onProgress?.(status)

    try {
      const memoryRoot = getAutoMemPath()
      const transcriptDir = getSessionsPath()

      const extra = `
**Tool constraints for this run:** Bash is restricted to read-only commands (ls, find, grep, cat, stat, wc, head, tail). Writes to non-memory paths will be denied.

Sessions since last consolidation (${sessionIds.length}):
${sessionIds.map(id => `- ${id}`).join('\n')}`

      const prompt = buildConsolidationPrompt(memoryRoot, transcriptDir, extra)
      const client = new Anthropic({ apiKey: opts.apiKey })
      const canUseTool = createMemoryToolGate(memoryRoot)

      // Standalone call — no conversation history needed
      await runDreamAgentLoop({
        client,
        model: opts.model,
        systemPrompt: opts.systemPrompt,
        prompt,
        memoryDir: memoryRoot,
        canUseTool,
        onFileTouched: (filePath: string) => {
          if (!status.filesTouched.includes(filePath)) {
            status.filesTouched.push(filePath)
            status.phase = 'updating'
            opts.onProgress?.({ ...status })
          }
        },
      })

      opts.onComplete?.(status.filesTouched)
    } catch (e: unknown) {
      console.error('[autoDream] failed:', (e as Error).message)
      opts.onFail?.()
      await rollbackConsolidationLock(priorMtime)
    }
  }
}

async function runDreamAgentLoop(opts: {
  client: Anthropic
  model: string
  systemPrompt: string
  prompt: string
  memoryDir: string
  canUseTool: (name: string, input: Record<string, unknown>) => boolean
  onFileTouched: (path: string) => void
}): Promise<void> {
  const { client, model, systemPrompt, prompt, canUseTool, onFileTouched } = opts
  const tools = buildMemoryTools()

  let messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]
  const MAX_TURNS = 50

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model,
      max_tokens: 8096,
      system: systemPrompt,
      messages,
      tools,
    })

    if (response.stop_reason === 'end_turn') break

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        const input = block.input as Record<string, unknown>

        if (!canUseTool(block.name, input)) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Tool ${block.name} is not permitted.`,
            is_error: true,
          })
          continue
        }

        // Track file writes for phase detection
        if ((block.name === 'Edit' || block.name === 'Write') && typeof input.file_path === 'string') {
          onFileTouched(input.file_path)
        }

        const result = await executeMemoryTool(block.name, input)
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
      }

      messages = [
        ...messages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ]
    } else {
      break
    }
  }
}

export async function executeAutoDream(opts: DreamRunOptions): Promise<void> {
  await runner?.(opts)
}
```

> **Note:** In the WSO2 adaptation, there is no `buildMemoryTools()` / `executeMemoryTool()`. Tools are provided by reusing `createReadTool`, `createWriteTool`, `createEditTool` from `text-editor.ts` with `memoryDir` as the base path. These are passed directly to `generateText()` via a `tools` object.

---

## File 11: `src/ui/DreamStatusBar.ts`

```typescript
/**
 * VS Code status bar item for auto-dream visibility.
 * Replaces Claude Code's terminal task registry with a lightweight status bar item.
 */

import * as vscode from 'vscode'
import type { DreamStatus } from '../services/autoDream/autoDream'

let statusBarItem: vscode.StatusBarItem | undefined

export function initDreamStatusBar(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
  context.subscriptions.push(statusBarItem)
}

export function showDreamStarting(sessionsReviewing: number): void {
  if (!statusBarItem) return
  statusBarItem.text = `$(sync~spin) Dreaming... (${sessionsReviewing} sessions)`
  statusBarItem.tooltip = 'WSO2 Copilot is consolidating your memory files in the background'
  statusBarItem.show()
}

export function updateDreamProgress(status: DreamStatus): void {
  if (!statusBarItem) return
  const phase = status.phase === 'updating'
    ? `$(edit) Updating ${status.filesTouched.length} file(s)...`
    : `$(sync~spin) Dreaming...`
  statusBarItem.text = phase
  statusBarItem.show()
}

export function showDreamComplete(filesTouched: string[]): void {
  if (!statusBarItem) return
  statusBarItem.text = `$(check) Memory updated (${filesTouched.length} file(s))`
  statusBarItem.tooltip = `Consolidated: ${filesTouched.join(', ')}`
  statusBarItem.show()
  // Auto-hide after 5 seconds
  setTimeout(() => statusBarItem?.hide(), 5_000)
}

export function showDreamFailed(): void {
  if (!statusBarItem) return
  statusBarItem.text = '$(warning) Memory consolidation failed'
  statusBarItem.show()
  setTimeout(() => statusBarItem?.hide(), 8_000)
}
```

---

## File 12: Initialization in `ballerina-extension/src/views/ai-panel/activate.ts`

```typescript
import { initExtractMemories } from '../features/ai/memory/extractMemories'
import { initAutoDream } from '../features/ai/memory/autoDream'

// Called once in the extension's activate() function.
export function activate(context: vscode.ExtensionContext): void {
  // ... existing activation code ...
  initExtractMemories()
  initAutoDream()
}

// Called in the extension's deactivate() function.
export async function deactivate(): Promise<void> {
  await drainPendingExtraction(30_000)
}
```

---

## File 13: Integration in `AgentExecutor.ts` and `prompts.ts`

```typescript
// --- In features/ai/agent/prompts.ts: system prompt injection ---

import { isAutoMemoryEnabled } from '@wso2/copilot-utilities/auto-memory'
import { loadMemoryPrompt } from '@wso2/copilot-utilities/auto-memory'
import { computeWorkspaceHash } from '@wso2/copilot-utilities/chat-persistence'

async function buildSystemPrompt(workspacePath: string): Promise<string> {
  let basePrompt = COPILOT_BASE_SYSTEM_PROMPT

  if (isAutoMemoryEnabled()) {
    const hash = computeWorkspaceHash(workspacePath)
    const memorySection = await loadMemoryPrompt(hash)
    if (memorySection) {
      basePrompt = memorySection + '\n\n---\n\n' + basePrompt
    }
  }

  return basePrompt
}

// --- In features/ai/agent/AgentExecutor.ts: trigger after each agent response ---

import { executeExtractMemories } from '../memory/extractMemories'
import { executeAutoDream } from '../memory/autoDream'

// Inside handleStreamFinish(), after updating chat state:
async function handleStreamFinish(): Promise<void> {
  // ... existing chat state update code ...

  if (isAutoMemoryEnabled()) {
    void executeExtractMemories({
      messages: this.getChatHistoryMessages(),
      workspaceHash: computeWorkspaceHash(this.config.workspacePath),
      model: this.config.model,
      systemPrompt: this.config.systemPrompt,
    })

    void executeAutoDream({
      workspaceHash: computeWorkspaceHash(this.config.workspacePath),
      workspacesDir: join(homedir(), '.ballerina', 'copilot', 'workspaces'),
      model: this.config.model,
      systemPrompt: this.config.systemPrompt,
    })
  }
}
```

---

## File 14: Settings in `ballerina-extension` (VS Code configuration)

Settings are read by the extension and passed into the auto-memory module — `copilot-utilities` never touches VS Code APIs.

```typescript
// In ballerina-extension — read settings and pass to memory module
import * as vscode from 'vscode'

function getAutoMemorySettings() {
  const config = vscode.workspace.getConfiguration('wso2Copilot')
  return {
    autoMemoryEnabled: config.get<boolean>('autoMemoryEnabled') ?? true,
    autoDreamEnabled: config.get<boolean>('autoDreamEnabled') ?? true,
  }
}

// Pass to executeExtractMemories / executeAutoDream:
// void executeExtractMemories({ ...ctx, ...getAutoMemorySettings() })
```

---

## Shared Utility: Memory Tool Registry

> **Note:** In the WSO2 adaptation, there is no separate `memoryTools.ts`. Instead, `createReadTool`, `createWriteTool`, `createEditTool` from `text-editor.ts` are reused with `memoryDir` as the base path. The reference implementation below shows what those tools do — the actual implementation delegates to `text-editor.ts`.

```typescript
// In ballerina-extension/src/features/ai/memory/extractMemories.ts and autoDream.ts:
import {
  createReadTool, createReadExecute,
  createWriteTool, createWriteExecute,
  createEditTool, createEditExecute,
  createBatchEditTool, createMultiEditExecute,
} from '../tools/text-editor'

const noopEventHandler: CopilotEventHandler = () => {}

function createMemoryTools(memoryDir: string) {
  return {
    [FILE_READ_TOOL_NAME]:        createReadTool(createReadExecute(noopEventHandler, memoryDir)),
    [FILE_WRITE_TOOL_NAME]:       createWriteTool(createWriteExecute(noopEventHandler, memoryDir)),
    [FILE_SINGLE_EDIT_TOOL_NAME]: createEditTool(createEditExecute(noopEventHandler, memoryDir)),
    [FILE_BATCH_EDIT_TOOL_NAME]:  createBatchEditTool(createMultiEditExecute(noopEventHandler, memoryDir)),
  }
}

// --- Original reference (shows what the tools do) ---
export function buildMemoryTools_REFERENCE(): Record<string, unknown> {
  return [
    {
      name: 'Read',
      description: 'Read the contents of a file',
      input_schema: {
        type: 'object' as const,
        properties: {
          file_path: { type: 'string', description: 'Absolute path to the file' },
        },
        required: ['file_path'],
      },
    },
    {
      name: 'Write',
      description: 'Write content to a file (creates or overwrites)',
      input_schema: {
        type: 'object' as const,
        properties: {
          file_path: { type: 'string', description: 'Absolute path to the file' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['file_path', 'content'],
      },
    },
    {
      name: 'Edit',
      description: 'Replace a specific string in a file',
      input_schema: {
        type: 'object' as const,
        properties: {
          file_path: { type: 'string', description: 'Absolute path to the file' },
          old_string: { type: 'string', description: 'Exact string to replace' },
          new_string: { type: 'string', description: 'Replacement string' },
        },
        required: ['file_path', 'old_string', 'new_string'],
      },
    },
    {
      name: 'Bash',
      description: 'Run a read-only shell command (ls, find, cat, grep, stat, wc, head, tail)',
      input_schema: {
        type: 'object' as const,
        properties: {
          command: { type: 'string', description: 'Shell command to execute' },
        },
        required: ['command'],
      },
    },
    {
      name: 'Glob',
      description: 'Find files matching a glob pattern',
      input_schema: {
        type: 'object' as const,
        properties: {
          pattern: { type: 'string', description: 'Glob pattern' },
          path: { type: 'string', description: 'Directory to search in' },
        },
        required: ['pattern'],
      },
    },
    {
      name: 'Grep',
      description: 'Search for a pattern in files',
      input_schema: {
        type: 'object' as const,
        properties: {
          pattern: { type: 'string', description: 'Regex pattern to search for' },
          path: { type: 'string', description: 'Path to search in' },
          glob: { type: 'string', description: 'File glob filter' },
        },
        required: ['pattern'],
      },
    },
  ]
}

export async function executeMemoryTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  try {
    switch (name) {
      case 'Read': {
        const content = await readFile(String(input.file_path), 'utf-8')
        return content
      }
      case 'Write': {
        const { mkdir } = await import('fs/promises')
        const { dirname } = await import('path')
        await mkdir(dirname(String(input.file_path)), { recursive: true })
        await writeFile(String(input.file_path), String(input.content), 'utf-8')
        return `File written successfully at: ${input.file_path}`
      }
      case 'Edit': {
        const existing = await readFile(String(input.file_path), 'utf-8')
        const oldStr = String(input.old_string)
        if (!existing.includes(oldStr)) {
          return `No replacement performed — old_string not found verbatim in ${input.file_path}`
        }
        const updated = existing.replace(oldStr, String(input.new_string))
        await writeFile(String(input.file_path), updated, 'utf-8')
        return `File edited successfully.`
      }
      case 'Bash': {
        const result = execSync(String(input.command), {
          encoding: 'utf-8',
          timeout: 10_000,
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        return result
      }
      case 'Glob': {
        // Simple implementation using readdir — replace with glob library if needed
        const { glob } = await import('glob')
        const files = await glob(String(input.pattern), {
          cwd: String(input.path ?? process.cwd()),
          absolute: true,
        })
        return files.join('\n')
      }
      case 'Grep': {
        const cmd = [
          'grep', '-rn',
          `"${String(input.pattern)}"`,
          String(input.path ?? '.'),
          input.glob ? `--include="${String(input.glob)}"` : '',
        ].filter(Boolean).join(' ')
        try {
          return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] })
        } catch (e: any) {
          return e.stdout ?? ''  // grep returns exit 1 when no matches
        }
      }
      default:
        return `Unknown tool: ${name}`
    }
  } catch (e: unknown) {
    return `Error: ${(e as Error).message}`
  }
}
```

---

## `package.json` — VS Code Extension Configuration Points

```json
{
  "contributes": {
    "configuration": {
      "title": "WSO2 Integrator Copilot",
      "properties": {
        "wso2Copilot.autoMemoryEnabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable auto-memory: automatically capture and persist context across sessions."
        },
        "wso2Copilot.autoDreamEnabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable auto-dream: periodically consolidate and organize memory files."
        }
      }
    }
  }
}
```

---

## Implementation Notes

### What was removed from Claude Code

| Removed | Reason |
|---|---|
| GrowthBook / feature flags | Not needed — features are always on, config via settings.json |
| `bun:bundle` `feature()` | Bun-specific, not used in VS Code extensions |
| KAIROS / daily-log mode | Out of scope for v1 |
| TEAMMEM (team memory sharing) | Out of scope for v1 |
| LODESTONE deep-link protocol | Claude Code CLI-specific |
| `runForkedAgent()` internal API | Replaced with `generateText()` from Vercel AI SDK |
| Custom Read/Write/Edit/Grep/Glob tools | Replaced with `createReadTool`/`createWriteTool`/`createEditTool` from `text-editor.ts` |
| Terminal task registry | Replaced with VS Code status bar item (File 11) |
| `createCacheSafeParams()` | Not needed — Vercel AI SDK handles prompt caching |
| Session JSONL transcripts + `sessions/` dir | Replaced with generation count from existing `thread.json` |
| Sanitized-path workspace identity | Replaced with `computeWorkspaceHash()` already in `copilot-utilities` |
| VS Code API in `copilot-utilities` | Not used — workspace hash passed as parameter |

### What is structurally identical

| Component | Identical |
|---|---|
| Memory file format (frontmatter) | Yes — identical |
| MEMORY.md index format | Yes — identical (one per directory) |
| 3-gate dream trigger logic | Yes — identical (activity gate uses different data source) |
| Lock file mechanics (mtime = lastDreamAt) | Yes — identical |
| Mutual exclusion (one writer per turn) | Yes — identical |
| Cursor-based message tracking | Yes — identical |
| Trailing run pattern | Yes — identical |
| Fire-and-forget extraction | Yes — identical |
| `drainPendingExtraction()` at shutdown | Yes — identical |
| 4-phase dream prompt | Yes — identical |
| Extract prompt structure (4 parts) | Yes — identical |
