# Assessment Report JSON Schema

The assessment output is a single JSON object with this top-level shape:

```
{
  meta              — run metadata
  agentReadiness    — present when agent readiness was assessed
  securityReadiness — present when security readiness was assessed
}
```

---

## `meta`

```json
{
  "meta": {
    "specFile": "path/to/openapi.yaml",
    "assessedAt": "2026-04-25T10:30:00Z",
    "spectralVersion": "6.15.1",
    "guidelinesVersion": "agent-readiness-guidelines.md",
    "model": "claude-sonnet-4-6"
  }
}
```

| Field | Description |
|---|---|
| `specFile` | File path provided, or `"pasted-content"` if pasted |
| `assessedAt` | ISO 8601 UTC timestamp of the assessment run |
| `spectralVersion` | Output of `spectral --version`, or `"not-run"` if Spectral was skipped |
| `guidelinesVersion` | Always `"agent-readiness-guidelines.md"` |
| `model` | Claude model ID used |

---

## `agentReadiness`

Present only when an AI Agent Readiness assessment was requested.

```json
{
  "agentReadiness": {
    "spectral": { ... },
    "aiAnalysis": { ... }
  }
}
```

### `agentReadiness.spectral`

Results from running Spectral with the `ai-readiness.yaml` ruleset (69 automated rules).

```json
{
  "status": "completed",
  "ruleset": "references/agent-readiness-spectral/ai-readiness.yaml",
  "score": {
    "critical": 2,
    "high": 5,
    "medium": 3,
    "low": 8,
    "rating": "Fair"
  },
  "issues": [ ... ]
}
```

### `agentReadiness.aiAnalysis`

Results from the LLM-based guideline review (11 categories from `agent-readiness-guidelines.md`).

```json
{
  "status": "completed",
  "score": {
    "critical": 1,
    "high": 2,
    "medium": 0,
    "low": 1,
    "rating": "Fair"
  },
  "issues": [ ... ]
}
```

---

## `securityReadiness`

Present only when a Security Readiness assessment was requested.

```json
{
  "securityReadiness": {
    "spectral": {
      "status": "completed",
      "ruleset": "references/owasp-top-10-raw.yaml",
      "score": {
        "critical": 0,
        "high": 3,
        "medium": 0,
        "low": 0,
        "rating": "Good"
      },
      "issues": [ ... ]
    }
  }
}
```

---

## Issue Object

All three sections use the same issue shape:

```json
{
  "id": "spec-001",
  "severity": "CRITICAL",
  "rule": "ai-readiness-operation-id",
  "path": "paths./orders.post.operationId",
  "issue": "Operation must have an operationId for AI readiness",
  "description": "operationId is how agents reference tools. Without it, the agent cannot reliably call the operation.",
  "fixSuggestion": "Add an operationId using verb-noun format, e.g. 'createOrder'.",
  "autoFixable": true
}
```

| Field | Description |
|---|---|
| `id` | Sequential, zero-padded: `spec-NNN` (Spectral AI), `ai-NNN` (LLM analysis), `sec-NNN` (OWASP) |
| `severity` | `CRITICAL` / `HIGH` / `MEDIUM` / `LOW` |
| `rule` | Spectral rule code or guideline reference (e.g. `Rule 3.3`) |
| `path` | JSON path to the affected element (e.g. `paths./orders.post`) |
| `issue` | Concise description of what is wrong |
| `description` | Why this matters for agent behavior |
| `fixSuggestion` | Actionable description of what to change |
| `autoFixable` | `true` if a script can apply the fix without domain knowledge |

---

## Score / Rating Table

Applied independently to each section:

| Rating    | Condition                                    |
|-----------|----------------------------------------------|
| Poor      | ≥ 3 CRITICAL issues                          |
| Fair      | 1–2 CRITICAL, OR 0 CRITICAL + ≥ 5 HIGH       |
| Good      | 0 CRITICAL + 1–4 HIGH                        |
| Excellent | 0 CRITICAL + 0 HIGH                          |
