# OpenAPI Agent-Readiness Guidelines

Rules and standards for transforming an OpenAPI specification so that AI agents can reliably
discover, understand, and execute it - without hallucinating endpoints, misusing parameters,
or causing irreversible side-effects.

---

## Severity Levels

| Severity | Meaning | Agent Impact |
|---|---|---|
| `CRITICAL` | Agent will likely fail or cause harm | Wrong tool selection, data destruction, auth failure |
| `HIGH` | Agent will be unreliable or inefficient | Hallucinated parameters, failed workflows, silent errors |
| `MEDIUM` | Agent performance degraded | Context window exhaustion, rate limit hits |
| `LOW` | Best practice missing | Reduced discoverability, minor inefficiency |

---

## Category 1 - Operation IDs
**Severity: CRITICAL**

### Rule 1.1 - Verb-noun format
Every `operationId` must read as a natural tool name. Rewrite any that are path-derived or mechanical.

| Bad (path-derived) | Good (verb-noun) |
|---|---|
| `get_api_v1_invoices_id` | `getInvoiceById` |
| `post_users` | `createUser` |
| `delete_orders_order_id` | `deleteOrderById` |

Pattern: `{verb}{Resource}{Qualifier}` - e.g., `listActiveOrders`, `searchUsersByEmail`, `bulkCreateProducts`.

### Rule 1.2 - Uniqueness and distinctiveness
If two endpoints have similar operationIds (e.g., `searchUsers` and `findUsers`), their descriptions
MUST be rewritten to be semantically distinct enough that a vector search returns the correct one.
Differentiators to use: input type, output shape, side-effects, scope.

---

## Category 2 - Summaries
**Severity: HIGH**

### Rule 2.1 - Imperative verb opening
Every `summary` must begin with an imperative verb describing the business action.

| Bad | Good |
|---|---|
| "Invoice endpoint" | "Retrieve a single invoice by its ID" |
| "User management" | "Create a new user account with email and role" |
| "Orders" | "List all orders filtered by status and date range" |

### Rule 2.2 - Business semantics, not HTTP mechanics
Summaries must describe *what the business outcome is*, not what HTTP method is used.

- Bad: `"POST to create"`
- Good: `"Submit a new support ticket and return the assigned ticket ID"`

---

## Category 3 - Descriptions
**Severity: HIGH**

Operation descriptions must cover all of the following where applicable. Add any that are missing:

### Rule 3.1 - Preconditions
What must be true before calling this endpoint?

> *"The user must have an active subscription. Call `getUserSubscriptionStatus` first to verify."*

### Rule 3.2 - Side effects
What does this endpoint change beyond its direct response?

> *"Creating an order also deducts inventory. This action cannot be reversed via the API."*

### Rule 3.3 - Draft vs. finalized state
If an operation creates a resource, explicitly state whether it is a draft or immediately active/published.

> *"This endpoint creates a DRAFT invoice. Call `finalizeInvoice` to make it billable."*

### Rule 3.4 - Required permissions/scopes
What OAuth scopes or roles are required?

> *"Requires the `orders:write` scope. Read-only API keys will receive a 403."*

### Rule 3.5 - Workflow position
Where does this endpoint sit in a multi-step flow?

> *"Step 2 of 3: Call `initiateCheckout` first to obtain a `checkoutSessionId`, then pass it here."*

---

## Category 4 - Destructive & Mutating Operations
**Severity: CRITICAL**

Applies to all `DELETE` operations and any `POST`/`PATCH`/`PUT` that is irreversible or has cascading effects.

### Rule 4.1 - Explicit irreversibility warning
Add to the description:

> *"⚠️ This operation is irreversible. The resource cannot be recovered after deletion."*

### Rule 4.2 - Cascade side-effects
Explicitly list what else gets deleted or modified.

> *"Deleting a workspace also permanently deletes all projects, members, and billing history associated with it."*

### Rule 4.3 - x-ai-reasoning-instructions extension *(recommended)*
For high-risk operations, add a vendor extension to embed agent-level guardrails:

```yaml
x-ai-reasoning-instructions: >
  Before executing this operation, confirm the resource ID with the user.
  Never infer the ID from prior context. Always treat this as a one-way door.
```

---

## Category 5 - Parameter Descriptions
**Severity: HIGH**

### Rule 5.1 - No mechanical repetition
Parameter descriptions must explain business meaning, not restate the parameter name.

| Bad | Good |
|---|---|
| `"status": "The status"` | `"status": "Filter orders by fulfillment state. Use 'pending' for unprocessed, 'shipped' for dispatched, 'delivered' for completed."` |
| `"limit": "The limit"` | `"limit": "Maximum number of results per page. Defaults to 20. Maximum allowed value is 100."` |

### Rule 5.2 - Enum value explanations
Every enum must have a description for each value explaining its business meaning.

```yaml
status:
  type: string
  enum: [draft, active, archived]
  description: >
    Lifecycle state of the resource.
    - draft: Created but not yet visible to end users.
    - active: Live and accessible. Billing applies.
    - archived: Hidden from users but retained for audit purposes.
```

### Rule 5.3 - ID parameter sourcing
For any `{resourceId}` path parameter, state explicitly where the agent can obtain this value.

> *"The `invoiceId` is returned in the `id` field of the `createInvoice` or `listInvoices` response."*

---

## Category 6 - Error Responses
**Severity: HIGH**

### Rule 6.1 - Structured 4xx responses
Every `400` and `422` response schema must include fields that allow an agent to self-correct:

```yaml
responses:
  '400':
    description: Validation failed
    content:
      application/json:
        schema:
          type: object
          properties:
            error:
              type: string
            field:
              type: string
              description: The specific field that failed validation
            expected:
              type: string
              description: What value or format was expected
            received:
              type: string
              description: What value was actually provided
```

### Rule 6.2 - 401 vs 403 distinction
Both must be documented with clearly different descriptions:

- `401`: *"Authentication token is missing or expired. Re-authenticate using `createSession`."*
- `403`: *"Token is valid but lacks required scope. Required: `{scope}`."*

### Rule 6.3 - 429 rate limit guidance
If a `429` response is possible, document the retry strategy:

> *"Rate limit exceeded. Retry after the duration specified in the `Retry-After` response header."*

---

## Category 7 - Workflow Expressibility
**Severity: HIGH**

### Rule 7.1 - Response-to-parameter linkage
When a response field is consumed as input to a downstream call, make this explicit in the description
of both the source response field and the destination parameter.

Source - in `createOrder` response schema:
```yaml
orderId:
  type: string
  description: "Unique order identifier. Pass this as the `orderId` path parameter to `getOrderStatus`, `updateOrder`, or `cancelOrder`."
```

Destination - in `cancelOrder` parameters:
```yaml
orderId:
  in: path
  description: "The order ID obtained from the `orderId` field in the `createOrder` response."
```

### Rule 7.2 - HATEOAS `_links` *(recommended)*
For stateful workflows, add a `_links` object to response schemas. This acts as a hallucination
firewall - the agent picks from explicitly returned valid next steps rather than inventing URLs.

```yaml
_links:
  type: object
  description: Valid next actions available from the current resource state.
  properties:
    self:
      type: string
    cancel:
      type: string
    finalize:
      type: string
```

---

## Category 8 - Bulk & Batch Operations
**Severity: MEDIUM**

### Rule 8.1 - Flag missing batch endpoints
For any resource likely to be processed in bulk (users, orders, products, notifications),
flag if batch endpoints are absent. Recommend adding:

- `POST /resources/batch` - bulk create
- `GET /resources?ids[]=1&ids[]=2` - multi-fetch by ID array
- `PATCH /resources/batch` - bulk update

> *"Without a batch endpoint, an agent processing 500 records will make 500 sequential API calls,
> rapidly exhausting rate limits."*

---

## Category 9 - Sparse Fieldsets / Field Selection
**Severity: MEDIUM**

### Rule 9.1 - Flag large response schemas
If a response schema has more than ~15 properties (especially with nested objects like `profile`,
`metadata`, `settings`), flag it as a context-window risk and recommend a `fields` query parameter:

```yaml
fields:
  in: query
  name: fields
  schema:
    type: string
  description: >
    Comma-separated list of fields to include in the response.
    Example: ?fields=id,email,status
    Omitting this parameter returns the full object.
```

---

## Category 10 - Agent Discovery Endpoints
**Severity: LOW**

### Rule 10.1 - Check for machine-readable discovery
Flag if any of the following standard paths are absent, and recommend adding them:

| Path | Purpose |
|---|---|
| `/.well-known/llms.txt` | Natural language description of the API's purpose and capabilities |
| `/.well-known/mcp.json` | Machine-readable manifest for MCP-compatible agents |
| `/skill.md` | Skill definition file for agent frameworks |

---

## Category 11 - Naming Consistency
**Severity: MEDIUM**

### Rule 11.1 - Singular vs. plural
Resource names must be consistent throughout the spec:

- Collections → always plural: `/orders`, `/users`, `/invoices`
- Single resources → always with ID on the plural base: `/orders/{id}` ✓ - `/order/{id}` ✗

### Rule 11.2 - Property name casing
Flag any mixing of `camelCase`, `snake_case`, or `kebab-case` within the same schema.
Pick one convention and apply it consistently.

### Rule 11.3 - Ambiguous property names
Flag property names that could be misinterpreted by an agent. Common offenders:

| Ambiguous | Problem | Better |
|---|---|---|
| `date` | Date of what? | `createdAt`, `dueDate`, `updatedAt` |
| `name` | Full name? First name? Resource name? | `fullName`, `resourceTitle` |
| `type` (no enum) | Could mean anything | Add an explicit enum with described values |
| `value` | Value of what unit? | `priceUsd`, `quantityUnits` |
