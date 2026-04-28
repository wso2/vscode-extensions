---
name: api-design
description: >
  Use this skill to design an OpenAPI specification from scratch. Trigger when the user
  describes an API they want to build, asks to "design", "create", "draft", or "scaffold"
  an OpenAPI spec, or mentions building a REST API for a service or domain. Also trigger
  when the user says things like "I want to expose endpoints for X", "help me design an
  API for Y", or "I need an OpenAPI spec for Z" — even if they don't say "OpenAPI" explicitly.
---

# API Design

You help the user design an OpenAPI 3.x specification from scratch through a structured,
iterative conversation. The output is a production-quality YAML file that follows WSO2
design guidelines and is ready for AI agent use.

**Your approach:**
1. Capture what the user wants to build
2. Produce a smart outline — resources, operations, models — for review
3. Refine iteratively until the user is satisfied
4. Generate the final OpenAPI YAML
5. Offer assessment using the api-readiness-assessment skill

---

## Step 1 — Understand what they want to build

If the user hasn't already described their API, ask:

> "What would you like to build? Describe your service — what it does, who uses it, and
> the main things it manages (e.g., orders, users, products). A sentence or two is enough
> to get started."

Extract from the description:
- The domain (e.g., restaurant management, inventory tracking)
- The main resources — nouns: orders, menus, products, users
- Any non-CRUD actions (e.g., "approve a request", "cancel an order")
- Any auth or versioning preferences mentioned

---

## Step 2 — Produce a smart outline

Present a structured outline — do not generate YAML yet. Use this format:

```
## API Overview
Name: <api-name>
Base path: /<context>/v1
Purpose: <one-line description>

## Resources & Operations
### /<resource>
- GET /<resource> — List all <resource>s
- POST /<resource> — Create a <resource>
- GET /<resource>/{<resource>Id} — Get a specific <resource>
- PUT /<resource>/{<resource>Id} — Update a <resource>
- DELETE /<resource>/{<resource>Id} — Delete a <resource>
(only include operations that make sense — not every resource needs all five)

## Key Models
- <ModelName>: field1 (type), field2 (type), ...
(3–5 most important fields per model — not exhaustive)

## Auth
- <recommended scheme and why>

## Standard Error Responses
- 400, 401, 404, 429, 500 on all operations
```

After presenting:

> "Does this look good to you, or would you like to make any changes before I generate the spec?"

---

## Step 3 — Refine iteratively

Accept natural language changes and update the outline accordingly. Show only the changed
sections, not the full outline again (unless the restructuring is major). After each change:

> "Updated. Anything else, or ready to generate?"

Common change patterns:
- "Add a search endpoint" → add `GET /<resource>?query=` with a `query` parameter
- "Add a status field" → update the model and consider adding a `PATCH /<resource>/{id}/status` operation
- "Remove DELETE" → drop from outline
- "Rename /menus to /menu" → update path
- "No auth needed" → update auth section
- "Add pagination" → add `limit` and `offset` query params to list operations

---

## Step 4 — Generate the OpenAPI YAML

When the user approves the outline, tell them:

> "Generating your OpenAPI spec…"

Generate a complete OpenAPI 3.x YAML. The spec must meet WSO2 design guidelines and AI
agent readiness checks out of the box — it should score well on assessment without requiring fixes.

**Structure:**
- `openapi: "3.0.3"`
- `info`: title, description (50+ chars covering purpose, consumers, and primary use cases), version, contact (name + email)
- `servers`: at least one entry with a description (e.g., "Production API")
- `tags`: one per resource, alphabetically sorted, each with a description
- `paths`: all operations from the approved outline
- `components.schemas`: all models
- `components.securitySchemes`: appropriate scheme(s)

**Per operation:**
- `operationId`: camelCase verb + noun (e.g., `listOrders`, `createOrder`, `getOrderById`)
- `summary`: imperative verb phrase describing the business action (e.g., "List all orders by status")
- `description`: what the operation does and when an agent should call it (2–3 sentences)
- `tags`: the resource tag
- `parameters`: all path params; for list operations add `limit` (integer, default 20) and `offset` (integer, default 0) with descriptions and examples
- `requestBody` (POST/PUT): schema `$ref` plus a concrete inline example
- `responses`:
  - 200 / 201: schema `$ref` plus a concrete inline example
  - 400, 401, 404: reference the shared `Error` schema
  - 429: reference `Error` schema, include `Retry-After` response header
  - 500: reference `Error` schema

**Design rules (WSO2 guidelines):**
- No trailing slashes on paths
- Paths in kebab-case (e.g., `/order-items`, not `/orderItems`)
- No HTTP verbs in path names (use `/orders/{id}/cancel` not `/cancelOrder`)
- Path parameters (e.g., `{id}`) must be declared at the **path level** in the path's `parameters` array, not repeated inside each operation. Query parameters stay at the operation level.
- All schemas have `type: object` and a `description` on each property
- Consistent error schema in `components.schemas.Error`: `{ code (integer), message (string), details (string) }`
- `security` applied at the operation level (or globally if all operations share the same scheme)

Save the file as `<api-name>-openapi.yaml` in the current directory. Tell the user:

> "Saved to `<filename>.yaml`."

---

## Step 5 — Offer assessment

> "Would you like me to assess this spec for AI agent readiness, security, and design quality?"

If yes: follow the api-readiness-assessment skill flow — it will confirm which checks to
run based on what the user said, or ask if unclear.
