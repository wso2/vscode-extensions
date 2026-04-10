# Arazzo Designer — Debug / Step-Through Mode Plan

> **Purpose**: A comprehensive implementation plan for adding a "Debug Mode" to the Arazzo Designer VS Code extension. This mode lets users step through an Arazzo workflow one step at a time, see real HTTP requests/responses, inspect variables (inputs, outputs, runtime expressions), and understand how the workflow executes.

---

## Table of Contents

1. [Goal & User Experience](#1-goal--user-experience)
2. [Architecture Overview](#2-architecture-overview)
3. [Detailed Design](#3-detailed-design)
   - 3.1 [Debug Session Lifecycle](#31-debug-session-lifecycle)
   - 3.2 [Extension Side — Debug Controller](#32-extension-side--debug-controller)
   - 3.3 [Webview Side — Debug UI in the Visualizer](#33-webview-side--debug-ui-in-the-visualizer)
   - 3.4 [RPC Messages (New)](#34-rpc-messages-new)
   - 3.5 [Arazzo Execution Engine](#35-arazzo-execution-engine)
   - 3.6 [State Machine Changes](#36-state-machine-changes)
   - 3.7 [Code Lens Changes](#37-code-lens-changes)
4. [Data Structures](#4-data-structures)
5. [Step-by-Step User Flow](#5-step-by-step-user-flow)
6. [File Changes Map](#6-file-changes-map)
7. [Open Questions & Decisions](#7-open-questions--decisions)
8. [Implementation Phases](#8-implementation-phases)

---

## 1. Goal & User Experience

### What the user sees:

1. **Entry point**: The user opens an Arazzo file, clicks a **"Debug"** Code Lens above a workflow (next to the existing "Visualize" button), or uses the command palette: `Arazzo: Debug Workflow`.

2. **Input collection**: A panel (or series of VS Code input boxes) appears asking for the **workflow inputs** — the values for `inputs.type.properties` defined in the workflow. Example:
   ```
   Enter value for 'petId' (integer): 123
   Enter value for 'petName' (string): Fido
   ```

3. **Debug view opens**: The Workflow graph webview opens (or reuses the existing one) in **debug mode**. The graph looks the same as the normal visualizer, but with additional UI:
   - All step nodes are **dimmed/greyed out** initially
   - A **debug toolbar** at the top: `▶ Continue`, `⏭ Step Over`, `⏹ Stop`, `⟳ Restart`
   - A **Variables panel** on the side showing the current scope: `$inputs`, `$steps.<stepId>.outputs`, `$statusCode`, `$response.body`, etc.
   - A **Request/Response panel** below or in a tab showing the raw HTTP request and response for the current step

4. **Stepping through**: The debug session starts paused at the **first step**. The first step's node is **highlighted** (e.g., yellow border, pulsing glow). The user clicks `Step Over` (or presses F10):
   - The extension **executes** that step: resolves runtime expressions, makes the actual HTTP call
   - The node turns **green** (success) or **red** (failure based on `successCriteria`)
   - The Variables panel updates with new `$steps.<stepId>.outputs`, `$response.body`, `$statusCode`
   - The Request/Response panel shows what was sent and received
   - The **next step** highlights and the session pauses again

5. **Completion**: When all steps are done (or a failure/stop occurs), a summary appears showing the full execution trace.

### What the user does NOT see:

- This is NOT a full VS Code Debug Adapter Protocol (DAP) integration. We are not creating breakpoints in the YAML file or using the built-in debug pane. That would be a future phase. This is a **visual step-through mode inside the webview**.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  VS Code Extension Host (Node.js)                                    │
│                                                                       │
│  ┌──────────────────┐   ┌────────────────────┐   ┌───────────────┐  │
│  │  Debug Controller │   │  Execution Engine   │   │  State Machine│  │
│  │  (orchestrator)   │──▶│  (Arazzo runner)    │   │  (extended)   │  │
│  │                   │   │  • resolve exprs    │   │  + debug      │  │
│  │  Receives step/   │   │  • build HTTP req   │   │    states     │  │
│  │  continue/stop    │   │  • send HTTP req    │   │               │  │
│  │  from webview     │   │  • evaluate criteria│   │               │  │
│  └────────┬──────────┘   └────────┬───────────┘   └───────────────┘  │
│           │                       │                                    │
│           │ RPC (vscode-messenger) │ HTTP (node-fetch / undici)        │
│           │                       │                                    │
│  ┌────────┴──────────────────────────────────────────────────────┐   │
│  │  Webview (React)                                                │   │
│  │                                                                  │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │  WorkflowView (debug mode)                                │  │   │
│  │  │  • Debug toolbar (Continue, Step, Stop, Restart)          │  │   │
│  │  │  • React Flow graph with step status colors               │  │   │
│  │  │  • Variables panel ($inputs, $steps, $statusCode, etc.)   │  │   │
│  │  │  • Request/Response panel (raw HTTP)                      │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
         │
         │  Actual HTTP calls to target APIs
         ▼
   ┌─────────────┐
   │  Target API  │
   │  Servers     │
   └─────────────┘
```

Key architectural decisions:
- **The Execution Engine runs in the Extension Host (Node.js)**, not in the webview. This is because:
  - The webview is sandboxed — it cannot make arbitrary HTTP requests
  - The extension host has access to the filesystem (to read referenced OpenAPI files for base URLs)
  - The extension host already has the parsed Arazzo model via the LSP
- **The webview only renders** — it sends user actions (step, continue, stop) via RPC and receives state updates (step results, variable snapshots) via RPC
- **The Go LSP is NOT involved in execution** — it only provides the parsed model. Execution is a new TypeScript module in the extension.

---

## 3. Detailed Design

### 3.1 Debug Session Lifecycle

```
[Idle] ──user clicks "Debug"──▶ [Collecting Inputs]
                                        │
                                user provides inputs
                                        │
                                        ▼
                                 [Initializing]
                                  • parse model
                                  • resolve sourceDescriptions
                                  • find server base URLs
                                  • open/reuse webview in debug mode
                                        │
                                        ▼
                                 [Paused @ Step 0]  ◀──────────────────┐
                                  • highlight step 0                    │
                                  • show variables panel                │
                                        │                               │
                                  user clicks "Step"                    │
                                        │                               │
                                        ▼                               │
                                 [Executing Step N]                     │
                                  • resolve runtime expressions         │
                                  • build HTTP request                  │
                                  • send HTTP request                   │
                                  • receive HTTP response               │
                                  • evaluate successCriteria            │
                                  • capture outputs                     │
                                  • send result to webview              │
                                        │                               │
                                        ▼                               │
                          ┌─── [Step N Complete] ───┐                   │
                          │                         │                   │
                    has next step             no more steps              │
                          │                         │                   │
                          ▼                         ▼                   │
                   [Paused @ Step N+1] ────▶  [Session Complete]        │
                     (loop back)                • show summary          │
                                                • user can restart      │
                                                                        │
                   user clicks "Stop" at any point ──▶ [Session Stopped]│
                   user clicks "Restart" ──────────────────────────────┘
```

### 3.2 Extension Side — Debug Controller

**New file**: `arazzo-designer-extension/src/debug/debugController.ts`

This is the orchestrator. It holds the state of the current debug session and responds to RPC messages from the webview.

```typescript
interface DebugSession {
    workflowId: string;
    documentUri: string;
    model: ArazzoDocument;           // The parsed Arazzo model (from LSP)
    workflow: Workflow;               // The specific workflow being debugged
    inputs: Record<string, any>;     // User-provided input values
    currentStepIndex: number;        // Which step we're paused at (0-based)
    stepResults: StepResult[];       // Results of all executed steps so far
    variables: DebugVariables;       // Current variable scope
    status: 'paused' | 'executing' | 'complete' | 'stopped' | 'error';
    serverBaseUrls: Record<string, string>;  // sourceDescriptionName → base URL
}
```

**Responsibilities**:
1. **`startDebugSession(workflowId, documentUri)`** — Entry point
   - Fetches the Arazzo model from the LSP (`arazzo/getModel`)
   - Extracts the workflow by `workflowId`
   - Analyzes the workflow's `inputs` schema to determine what to ask the user
   - Collects inputs from the user (VS Code input boxes or webview form)
   - Resolves `sourceDescriptions` — reads the referenced OpenAPI files to find `servers[0].url` for base URLs
   - Opens/reuses the workflow webview in debug mode
   - Sets `currentStepIndex = 0`, status = `paused`
   - Sends initial debug state to the webview

2. **`executeCurrentStep()`** — Called when user clicks "Step Over"
   - Gets the step at `currentStepIndex`
   - Passes it to the Execution Engine
   - Waits for the HTTP response
   - Evaluates `successCriteria`
   - Captures `outputs`
   - Updates `variables` scope
   - Appends to `stepResults`
   - Increments `currentStepIndex`
   - If more steps → status = `paused`, send update to webview
   - If no more steps → status = `complete`, send summary to webview

3. **`continueExecution()`** — Called when user clicks "Continue"
   - Runs `executeCurrentStep()` in a loop until all steps are done or a failure occurs

4. **`stopSession()`** — Called when user clicks "Stop"
   - Sets status = `stopped`
   - Sends update to webview

5. **`restartSession()`** — Called when user clicks "Restart"
   - Resets `currentStepIndex = 0`, clears `stepResults`, resets `variables`
   - Sets status = `paused`
   - Sends update to webview

### 3.3 Webview Side — Debug UI in the Visualizer

**Modified files**:
- `arazzo-designer-visualizer/src/views/WorkflowView/WorkflowView.tsx`
- New: `arazzo-designer-visualizer/src/views/WorkflowView/DebugToolbar.tsx`
- New: `arazzo-designer-visualizer/src/views/WorkflowView/VariablesPanel.tsx`
- New: `arazzo-designer-visualizer/src/views/WorkflowView/RequestResponsePanel.tsx`
- New: `arazzo-designer-visualizer/src/views/WorkflowView/DebugStepNode.tsx` (custom React Flow node)

#### How the webview knows it's in debug mode:

The state machine context will carry a new field: `debugMode: boolean`. When `MainPanel.tsx` renders `<WorkflowView>`, it passes this flag:

```typescript
case MACHINE_VIEW.Workflow:
    setViewComponent(
        <WorkflowView
            fileUri={machineView.documentUri}
            workflowId={machineView.identifier}
            debugMode={machineView.debugMode ?? false}
        />
    );
```

When `debugMode` is true, the `WorkflowView` component:
- Renders the `DebugToolbar` at the top
- Uses `DebugStepNode` instead of the normal step node (adds status coloring)
- Renders `VariablesPanel` and `RequestResponsePanel` in a side/bottom area
- Listens for `debugStateChanged` RPC notifications to update

#### Debug Toolbar:

```tsx
const DebugToolbar = ({ onStep, onContinue, onStop, onRestart, status }) => (
    <div className="debug-toolbar">
        <button onClick={onContinue} disabled={status !== 'paused'}>▶ Continue</button>
        <button onClick={onStep} disabled={status !== 'paused'}>⏭ Step Over</button>
        <button onClick={onStop} disabled={status === 'complete' || status === 'stopped'}>⏹ Stop</button>
        <button onClick={onRestart}>⟳ Restart</button>
        <span className="status-badge">{status}</span>
    </div>
);
```

Each button sends an RPC notification to the extension:
- `onStep` → `rpcClient.sendNotification(debugStep)`
- `onContinue` → `rpcClient.sendNotification(debugContinue)`
- `onStop` → `rpcClient.sendNotification(debugStop)`
- `onRestart` → `rpcClient.sendNotification(debugRestart)`

#### Step Node Coloring:

| Step Status | Node Appearance |
|-------------|-----------------|
| `pending` (not yet reached) | Grey/dimmed, dashed border |
| `current` (paused here) | Yellow border, pulsing glow animation |
| `executing` (HTTP call in flight) | Yellow with spinner overlay |
| `success` | Green border, checkmark icon |
| `failure` | Red border, X icon |
| `skipped` | Grey with strikethrough |

#### Variables Panel:

Displays a tree view of the current debug scope:

```
▼ $inputs
    petId: 123
    petName: "Fido"
▼ $steps
    ▼ addStep
        ▼ outputs
            (empty — not yet executed)
    ▼ verifyStep
        (not yet executed)
▼ $statusCode: 200
▼ $response
    ▼ body
        id: 123
        name: "Fido"
        status: "available"
▼ $response.header
    Content-Type: "application/json"
```

This is a JSON tree renderer. The data comes from the `DebugVariables` structure sent by the extension via the `debugStateChanged` notification.

#### Request/Response Panel:

Shows the raw HTTP details for the most recently executed step:

```
── Request ──────────────────────────────
POST https://petstore.swagger.io/v2/pet
Content-Type: application/json

{
  "id": 123,
  "name": "Fido",
  "photoUrls": ["https://example.com/pet.jpg"],
  "status": "available"
}

── Response ─────────────────────────────
HTTP 200 OK
Content-Type: application/json
X-Request-Id: abc123

{
  "id": 123,
  "name": "Fido",
  "photoUrls": ["https://example.com/pet.jpg"],
  "status": "available"
}

── Duration: 234ms ──────────────────────
```

### 3.4 RPC Messages (New)

These are defined in `arazzo-designer-core` and registered in the extension's RPC layer.

#### Extension → Webview (Notifications):

| Message | Payload | When |
|---------|---------|------|
| `debugStateChanged` | `DebugStateSnapshot` | After every step execution, on pause, on complete, on stop |

```typescript
// arazzo-designer-core/src/rpc-types/debug/types.ts

export interface DebugStateSnapshot {
    status: 'paused' | 'executing' | 'complete' | 'stopped' | 'error';
    workflowId: string;
    currentStepIndex: number;                // -1 if complete
    currentStepId: string | null;            // null if complete
    stepStatuses: StepStatus[];              // status of every step
    variables: DebugVariables;               // current scope
    lastStepResult: StepResult | null;       // result of the most recently executed step
    error?: string;                          // if status === 'error'
}

export interface StepStatus {
    stepId: string;
    status: 'pending' | 'current' | 'executing' | 'success' | 'failure' | 'skipped';
}

export interface StepResult {
    stepId: string;
    operationId: string;
    request: {
        method: string;
        url: string;
        headers: Record<string, string>;
        body?: any;
    };
    response: {
        statusCode: number;
        headers: Record<string, string>;
        body: any;
        durationMs: number;
    };
    successCriteriaResults: {
        condition: string;
        passed: boolean;
    }[];
    outputs: Record<string, any>;
    passed: boolean;
}

export interface DebugVariables {
    inputs: Record<string, any>;
    steps: Record<string, {
        outputs: Record<string, any>;
    }>;
    statusCode?: number;
    response?: {
        body: any;
        header: Record<string, string>;
    };
    url?: string;
    method?: string;
}
```

#### Webview → Extension (Notifications):

| Message | Payload | When |
|---------|---------|------|
| `debugStep` | `void` | User clicks "Step Over" |
| `debugContinue` | `void` | User clicks "Continue" |
| `debugStop` | `void` | User clicks "Stop" |
| `debugRestart` | `void` | User clicks "Restart" |

#### Webview → Extension (Requests):

| Message | Request | Response | When |
|---------|---------|----------|------|
| `debugStart` | `{ workflowId, documentUri, inputs }` | `{ success: boolean, error?: string }` | After input collection; initiates the session |
| `debugGetState` | `void` | `DebugStateSnapshot` | Initial fetch when debug webview loads |

### 3.5 Arazzo Execution Engine

**New file**: `arazzo-designer-extension/src/debug/executionEngine.ts`

This is the module that actually **runs** an Arazzo step: resolves expressions, builds HTTP requests, sends them, and evaluates results.

#### 3.5.1 Runtime Expression Resolver

**New file**: `arazzo-designer-extension/src/debug/expressionResolver.ts`

Arazzo uses runtime expressions like:
- `$inputs.petId` → value from workflow inputs
- `$steps.addStep.outputs.pet` → output from a previous step
- `$response.body` → response body of the current step (used in outputs)
- `$response.body#/id` → JSON pointer into the response body
- `$statusCode` → HTTP status code of the current response
- `$url` → the request URL
- `$method` → the HTTP method

```typescript
class ExpressionResolver {
    private inputs: Record<string, any>;
    private stepOutputs: Record<string, Record<string, any>>;
    private currentResponse?: { statusCode: number; body: any; headers: Record<string, string> };
    private currentRequest?: { url: string; method: string };

    resolve(expression: string): any {
        if (expression.startsWith('$inputs.')) {
            return this.resolveJsonPath(this.inputs, expression.slice('$inputs.'.length));
        }
        if (expression.startsWith('$steps.')) {
            // $steps.<stepId>.outputs.<path>
            const parts = expression.slice('$steps.'.length).split('.');
            const stepId = parts[0];
            // parts[1] should be 'outputs'
            const outputPath = parts.slice(2).join('.');
            return this.resolveJsonPath(this.stepOutputs[stepId] ?? {}, outputPath);
        }
        if (expression === '$statusCode') return this.currentResponse?.statusCode;
        if (expression === '$response.body') return this.currentResponse?.body;
        if (expression.startsWith('$response.body#/')) {
            const pointer = expression.slice('$response.body#/'.length);
            return this.resolveJsonPointer(this.currentResponse?.body, pointer);
        }
        if (expression.startsWith('$response.header.')) {
            const headerName = expression.slice('$response.header.'.length);
            return this.currentResponse?.headers[headerName.toLowerCase()];
        }
        if (expression === '$url') return this.currentRequest?.url;
        if (expression === '$method') return this.currentRequest?.method;
        // Literal value — return as-is
        return expression;
    }

    // Recursively resolve expressions in objects, arrays, and strings
    resolveDeep(value: any): any {
        if (typeof value === 'string' && value.startsWith('$')) {
            return this.resolve(value);
        }
        if (Array.isArray(value)) return value.map(v => this.resolveDeep(v));
        if (typeof value === 'object' && value !== null) {
            const result: any = {};
            for (const [k, v] of Object.entries(value)) {
                result[k] = this.resolveDeep(v);
            }
            return result;
        }
        return value;
    }
}
```

#### 3.5.2 HTTP Request Builder

**New file**: `arazzo-designer-extension/src/debug/httpClient.ts`

Takes a resolved step and builds + sends the HTTP request.

```typescript
interface ResolvedStep {
    method: string;           // from OpenAPI operation (GET, POST, PUT, DELETE)
    url: string;              // base URL + path, with path params substituted
    headers: Record<string, string>;
    queryParams: Record<string, string>;
    body?: any;
}

async function executeHttpRequest(step: ResolvedStep): Promise<HttpResponse> {
    const url = new URL(step.url);
    for (const [k, v] of Object.entries(step.queryParams)) {
        url.searchParams.set(k, v);
    }

    const startTime = Date.now();
    const response = await fetch(url.toString(), {
        method: step.method,
        headers: step.headers,
        body: step.body ? JSON.stringify(step.body) : undefined,
    });
    const durationMs = Date.now() - startTime;

    const responseBody = await response.json().catch(() => response.text());
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => { responseHeaders[k] = v; });

    return {
        statusCode: response.status,
        headers: responseHeaders,
        body: responseBody,
        durationMs,
    };
}
```

#### 3.5.3 OpenAPI Resolver

**New file**: `arazzo-designer-extension/src/debug/openapiResolver.ts`

Responsible for:
1. Reading referenced OpenAPI files (from `sourceDescriptions[*].url`)
2. Extracting `servers[0].url` as the base URL
3. Finding operations by `operationId` and extracting:
   - HTTP method (`get`, `post`, etc.)
   - Path (`/pet/{petId}`)
   - Expected parameters (path, query, header)
   - Request body schema (for validation/hints)

```typescript
interface OperationInfo {
    method: string;
    path: string;
    baseUrl: string;
    parameters: ParameterInfo[];
    requestBodyContentType?: string;
}

class OpenAPIResolver {
    private specs: Map<string, any>;  // sourceDescriptionName → parsed OpenAPI doc

    async loadSourceDescriptions(
        sourceDescriptions: SourceDescription[],
        arazzoFileDir: string
    ): Promise<void> {
        for (const sd of sourceDescriptions) {
            const filePath = path.resolve(arazzoFileDir, sd.url);
            const content = fs.readFileSync(filePath, 'utf8');
            const spec = yaml.load(content);
            this.specs.set(sd.name, spec);
        }
    }

    findOperation(operationId: string): OperationInfo | undefined {
        for (const [name, spec] of this.specs) {
            // Walk all paths and methods to find matching operationId
            for (const [pathStr, pathItem] of Object.entries(spec.paths ?? {})) {
                for (const [method, operation] of Object.entries(pathItem)) {
                    if (operation.operationId === operationId) {
                        const baseUrl = spec.servers?.[0]?.url ?? 'http://localhost';
                        return { method: method.toUpperCase(), path: pathStr, baseUrl, ... };
                    }
                }
            }
        }
        return undefined;
    }

    buildUrl(operationInfo: OperationInfo, pathParams: Record<string, any>): string {
        let fullPath = operationInfo.path;
        for (const [name, value] of Object.entries(pathParams)) {
            fullPath = fullPath.replace(`{${name}}`, String(value));
        }
        return operationInfo.baseUrl + fullPath;
    }
}
```

#### 3.5.4 Success Criteria Evaluator

**New file**: `arazzo-designer-extension/src/debug/criteriaEvaluator.ts`

Evaluates conditions like `$statusCode == 200`, `$response.body#/status == 'available'`.

```typescript
function evaluateCriterion(
    condition: string,
    resolver: ExpressionResolver
): { condition: string; passed: boolean } {
    // Parse the condition: "<left> <operator> <right>"
    // Supported operators: ==, !=, <, >, <=, >=
    const match = condition.match(/^(.+?)\s*(==|!=|<=|>=|<|>)\s*(.+)$/);
    if (!match) return { condition, passed: false };

    const [, leftExpr, operator, rightExpr] = match;
    const left = resolver.resolve(leftExpr.trim());
    let right: any = rightExpr.trim();

    // Parse right side: remove quotes for strings, parse numbers
    if (right.startsWith("'") && right.endsWith("'")) {
        right = right.slice(1, -1);
    } else if (right.startsWith('$')) {
        right = resolver.resolve(right);
    } else if (!isNaN(Number(right))) {
        right = Number(right);
    }

    switch (operator) {
        case '==': return { condition, passed: left == right };
        case '!=': return { condition, passed: left != right };
        case '<':  return { condition, passed: left < right };
        case '>':  return { condition, passed: left > right };
        case '<=': return { condition, passed: left <= right };
        case '>=': return { condition, passed: left >= right };
        default:   return { condition, passed: false };
    }
}
```

#### 3.5.5 Step Executor (Tying It Together)

**In**: `arazzo-designer-extension/src/debug/executionEngine.ts`

```typescript
class ExecutionEngine {
    private resolver: ExpressionResolver;
    private openapiResolver: OpenAPIResolver;

    async executeStep(step: ArazzoStep, workflow: Workflow): Promise<StepResult> {
        // 1. Find the operation in OpenAPI
        const opInfo = this.openapiResolver.findOperation(step.operationId);
        if (!opInfo) throw new Error(`operationId '${step.operationId}' not found`);

        // 2. Resolve parameters
        const pathParams: Record<string, any> = {};
        const queryParams: Record<string, any> = {};
        const headerParams: Record<string, string> = {};

        for (const param of step.parameters ?? []) {
            const value = this.resolver.resolveDeep(param.value);
            switch (param.in) {
                case 'path':   pathParams[param.name] = value; break;
                case 'query':  queryParams[param.name] = value; break;
                case 'header': headerParams[param.name] = String(value); break;
            }
        }

        // 3. Build URL
        const url = this.openapiResolver.buildUrl(opInfo, pathParams);

        // 4. Resolve request body
        let body: any = undefined;
        if (step.requestBody) {
            body = this.resolver.resolveDeep(step.requestBody.payload);
            headerParams['Content-Type'] = step.requestBody.contentType ?? 'application/json';
        }

        // 5. Execute HTTP request
        const resolvedStep: ResolvedStep = {
            method: opInfo.method,
            url,
            headers: headerParams,
            queryParams,
            body,
        };

        const httpResponse = await executeHttpRequest(resolvedStep);

        // 6. Update resolver with response context
        this.resolver.setCurrentResponse(httpResponse);
        this.resolver.setCurrentRequest({ url, method: opInfo.method });

        // 7. Evaluate success criteria
        const criteriaResults = (step.successCriteria ?? []).map(sc =>
            evaluateCriterion(sc.condition, this.resolver)
        );
        const passed = criteriaResults.every(r => r.passed);

        // 8. Capture outputs
        const outputs: Record<string, any> = {};
        for (const [key, expr] of Object.entries(step.outputs ?? {})) {
            outputs[key] = this.resolver.resolveDeep(expr);
        }

        // 9. Store outputs in resolver for subsequent steps
        this.resolver.setStepOutputs(step.stepId, outputs);

        return {
            stepId: step.stepId,
            operationId: step.operationId,
            request: { method: opInfo.method, url, headers: headerParams, body },
            response: {
                statusCode: httpResponse.statusCode,
                headers: httpResponse.headers,
                body: httpResponse.body,
                durationMs: httpResponse.durationMs,
            },
            successCriteriaResults: criteriaResults,
            outputs,
            passed,
        };
    }
}
```

### 3.6 State Machine Changes

The existing state machine in `stateMachine.ts` needs a new **debug sub-state** inside the `ready` state. This is parallel to (not replacing) the existing `viewLoading → viewFinding → ...` flow.

**Option A — Separate state (simpler)**: Add a `debugging` state alongside `viewReady`:

```
ready
├── viewReady
│   ├── on OPEN_VIEW → viewLoading
│   ├── on NAVIGATE → viewUpdated
│   └── on START_DEBUG → debugging        ← NEW
├── viewLoading → viewFinding → ...
└── debugging                              ← NEW
    ├── on DEBUG_STEP → (invoke executeStep service)
    ├── on DEBUG_CONTINUE → (invoke executAll service)
    ├── on DEBUG_STOP → viewReady
    └── on DEBUG_RESTART → debugging (reset)
```

**Option B — Bypass state machine (simpler still)**: Don't add debug states to the XState machine at all. Instead, the `DebugController` manages its own state independently and communicates directly with the webview via RPC. The state machine only handles opening the webview panel (via `OPEN_VIEW` with a `debugMode` flag).

**Recommendation**: **Option B** — because:
- The debug session has its own complex lifecycle that doesn't map well to the existing navigation state machine
- The state machine's purpose is view navigation, not execution control
- It keeps changes minimal and non-breaking
- The `DebugController` is self-contained and easier to test

With Option B, the flow is:
1. User clicks "Debug" → extension registers the debug controller → calls `openView(OPEN_VIEW, { view: Workflow, debugMode: true, ... })`
2. State machine opens the webview panel normally (same flow as visualize)
3. Once webview is ready, the debug controller takes over — all further communication is via the new RPC messages, bypassing the state machine

### 3.7 Code Lens Changes

**File**: `arazzo-designer-lsp/codelens/codelens.go`

Add a second Code Lens next to "Visualize" for each workflow:

```go
// Existing:
CodeLens{
    Range: workflowIdLine,
    Command: { Title: "Visualize", Command: "arazzo.openDesigner", Arguments: [...] }
}
// New:
CodeLens{
    Range: workflowIdLine,
    Command: { Title: "Debug", Command: "arazzo.debugWorkflow", Arguments: [{ workflowId, uri }] }
}
```

**Extension side** — new command registration in `extension.ts`:

```typescript
vscode.commands.registerCommand('arazzo.debugWorkflow', async (args) => {
    const { workflowId, uri } = args;
    await debugController.startDebugSession(workflowId, uri);
});
```

---

## 4. Data Structures

### 4.1 DebugStateSnapshot (Extension → Webview)

The single source of truth that the webview renders. Sent after every state change.

```typescript
interface DebugStateSnapshot {
    sessionId: string;                      // Unique ID for this debug session
    status: 'collecting-inputs' | 'paused' | 'executing' | 'complete' | 'stopped' | 'error';
    workflowId: string;
    workflowSummary: string;
    totalSteps: number;
    currentStepIndex: number;               // 0-based, -1 if complete
    currentStepId: string | null;
    stepStatuses: Array<{
        stepId: string;
        index: number;
        status: 'pending' | 'current' | 'executing' | 'success' | 'failure' | 'skipped';
    }>;
    variables: DebugVariables;
    lastStepResult: StepResult | null;
    allStepResults: StepResult[];           // Full history for the summary view
    error?: string;
}
```

### 4.2 DebugVariables

```typescript
interface DebugVariables {
    inputs: Record<string, any>;
    steps: Record<string, {
        outputs: Record<string, any>;
        statusCode?: number;
    }>;
    // These are from the LAST executed step (current context)
    statusCode?: number;
    response?: {
        body: any;
        header: Record<string, string>;
    };
    url?: string;
    method?: string;
}
```

### 4.3 StepResult

```typescript
interface StepResult {
    stepId: string;
    stepIndex: number;
    operationId: string;
    description?: string;
    request: {
        method: string;
        url: string;
        headers: Record<string, string>;
        body?: any;
    };
    response: {
        statusCode: number;
        statusText: string;
        headers: Record<string, string>;
        body: any;
        durationMs: number;
    };
    successCriteria: Array<{
        condition: string;
        passed: boolean;
        leftValue?: any;
        rightValue?: any;
    }>;
    outputs: Record<string, any>;
    passed: boolean;
    error?: string;                         // If the HTTP call itself failed (network error, etc.)
    timestamp: string;                      // ISO 8601
}
```

---

## 5. Step-by-Step User Flow

### Scenario: Debug the `createNewPet` workflow from `multi_workflow_indep.yaml`

#### Step 1: User sees Code Lens
```
  Visualize | Debug                          ← two Code Lens buttons
  - workflowId: createNewPet
    summary: Create a new pet and then verify it was persisted.
```

#### Step 2: User clicks "Debug"
- Extension command `arazzo.debugWorkflow` fires with `{ workflowId: "createNewPet", uri: "file:///...multi_workflow_indep.yaml" }`
- `DebugController.startDebugSession()` is called

#### Step 3: Input collection
VS Code shows sequential input boxes (or a webview form):
```
┌────────────────────────────────────────────┐
│ Debug: createNewPet                         │
│                                             │
│ Enter value for 'petId' (integer): [123   ] │
│                                             │
│ [OK] [Cancel]                               │
└────────────────────────────────────────────┘
```
Then:
```
┌────────────────────────────────────────────┐
│ Enter value for 'petName' (string): [Fido ] │
│ [OK] [Cancel]                               │
└────────────────────────────────────────────┘
```

#### Step 4: Debug webview opens
- State machine opens the workflow webview in debug mode
- The graph shows two steps: `addStep` → `verifyStep`
- Both nodes are **grey/dimmed** (pending)
- `addStep` has a **yellow pulsing border** (current)
- Debug toolbar shows: `▶ Continue | ⏭ Step Over | ⏹ Stop | ⟳ Restart`
- Variables panel shows:
  ```
  ▼ $inputs
      petId: 123
      petName: "Fido"
  ▼ $steps
      ▼ addStep.outputs: (pending)
      ▼ verifyStep.outputs: (pending)
  ```

#### Step 5: User clicks "Step Over"
- Extension resolves `addStep`:
  - `operationId: addPet` → looks up in OpenAPI → `POST /pet`
  - `requestBody.payload` → resolves `$inputs.petId` → 123, `$inputs.petName` → "Fido"
  - Sends: `POST https://petstore.swagger.io/v2/pet` with body `{ id: 123, name: "Fido", ... }`
- Gets response: `200 OK` with body `{ id: 123, name: "Fido", status: "available" }`
- Evaluates: `$statusCode == 200` → `200 == 200` → ✅
- `addStep` node turns **green**
- `verifyStep` node becomes **yellow** (current)
- Variables update:
  ```
  ▼ $inputs
      petId: 123
      petName: "Fido"
  ▼ $steps
      ▼ addStep
          outputs: (none defined for addStep)
      ▼ verifyStep.outputs: (pending)
  $statusCode: 200
  $response.body: { id: 123, name: "Fido", ... }
  ```
- Request/Response panel shows the full HTTP exchange

#### Step 6: User clicks "Step Over" again
- Extension resolves `verifyStep`:
  - `operationId: getPetById` → `GET /pet/{petId}`
  - `parameters[0]`: `petId` = `$inputs.petId` → 123
  - Sends: `GET https://petstore.swagger.io/v2/pet/123`
- Gets response: `200 OK`
- Evaluates: `$statusCode == 200` → ✅
- Captures output: `pet: $response.body` → `{ id: 123, name: "Fido", ... }`
- `verifyStep` node turns **green**
- Status: `complete`
- Summary view appears showing both steps with ✅

#### Step 7: User clicks "Restart" or closes the panel

---

## 6. File Changes Map

### New Files:

| File | Package | Purpose |
|------|---------|---------|
| `src/debug/debugController.ts` | extension | Orchestrates the debug session lifecycle |
| `src/debug/executionEngine.ts` | extension | Executes Arazzo steps (resolves, calls HTTP, evaluates) |
| `src/debug/expressionResolver.ts` | extension | Resolves Arazzo runtime expressions (`$inputs.x`, `$steps.y.outputs.z`, etc.) |
| `src/debug/httpClient.ts` | extension | Builds and sends HTTP requests, returns structured responses |
| `src/debug/openapiResolver.ts` | extension | Reads OpenAPI files, finds operations by ID, extracts base URLs |
| `src/debug/criteriaEvaluator.ts` | extension | Evaluates `successCriteria` conditions |
| `src/debug/types.ts` | extension | TypeScript interfaces for debug session, step results, etc. |
| `src/rpc-types/debug/types.ts` | core | Shared RPC message types for debug (DebugStateSnapshot, etc.) |
| `src/rpc-types/debug/rpc-type.ts` | core | RPC method name constants (`debugStep`, `debugContinue`, etc.) |
| `src/rpc-managers/debug/rpc-handler.ts` | extension | Registers debug RPC handlers with the messenger |
| `src/rpc-managers/debug/rpc-manager.ts` | extension | Implements debug RPC handlers (delegates to DebugController) |
| `src/rpc-clients/debug/rpc-client.ts` | rpc-client | Webview-side debug RPC methods |
| `src/views/WorkflowView/DebugToolbar.tsx` | visualizer | Continue/Step/Stop/Restart toolbar component |
| `src/views/WorkflowView/VariablesPanel.tsx` | visualizer | JSON tree view of current debug variables |
| `src/views/WorkflowView/RequestResponsePanel.tsx` | visualizer | Raw HTTP request/response display |
| `src/views/WorkflowView/DebugStepNode.tsx` | visualizer | Custom React Flow node with status coloring |
| `src/views/WorkflowView/debugUtils.ts` | visualizer | Helper functions for debug UI (color mapping, etc.) |

### Modified Files:

| File | Package | Change |
|------|---------|--------|
| `src/extension.ts` | extension | Register `arazzo.debugWorkflow` command; instantiate DebugController |
| `src/RPCLayer.ts` | extension | Call `registerDebugRpcHandlers()` in `init()` |
| `src/stateMachine.ts` | extension | Add `debugMode` to `MachineContext` interface (optional boolean) |
| `package.json` | extension | Add `arazzo.debugWorkflow` command, add "Debug" Code Lens to menus |
| `codelens/codelens.go` | lsp | Add "Debug" Code Lens next to "Visualize" for each workflow |
| `src/state-machine-types.ts` | core | Add `debugMode?: boolean` to `VisualizerLocation` |
| `src/MainPanel.tsx` | visualizer | Pass `debugMode` prop to `<WorkflowView>` |
| `src/views/WorkflowView/WorkflowView.tsx` | visualizer | Accept `debugMode` prop; conditionally render debug UI |
| `src/RpcClient.ts` | rpc-client | Add `getDebugRpcClient()` method |
| `src/index.ts` | rpc-client | Export debug RPC client |

---

## 7. Open Questions & Decisions

| # | Question | Options | Recommended |
|---|----------|---------|-------------|
| 1 | **Input collection UI**: VS Code input boxes vs. webview form? | A) Sequential `showInputBox` calls — simpler, no new UI. B) Dedicated webview page — richer, shows all fields at once. | **A for Phase 1**, B for Phase 2. Input boxes are fast to implement. |
| 2 | **Where to show the debug webview?** | A) Reuse the existing workflow panel in debug mode. B) Open a separate "debug panel". | **A** — reuse the workflow panel. Less confusion, one panel per workflow. |
| 3 | **What if the target API requires auth?** | A) Ignore — user must configure auth themselves. B) Support `securitySchemes` from OpenAPI specs. C) Allow custom headers via an input box. | **C for Phase 1** — add an optional "Custom Headers" input that accepts JSON. Parse auth from OpenAPI in Phase 2. |
| 4 | **What about `onSuccess`/`onFailure` handlers?** | Arazzo spec allows steps to define `onSuccess` and `onFailure` actions (goto, retry, end). | **Phase 2** — for Phase 1, execute steps linearly. Phase 2 adds branching logic. |
| 5 | **What about `$ref` and `$components`?** | Arazzo allows `$ref` to reference reusable components. | Must be resolved before execution. The LSP's `arazzo/getModel` response should already have these resolved. Verify. |
| 6 | **What if `sourceDescriptions[*].url` is a URL (not a local file)?** | A) Download the OpenAPI spec. B) Error — require local file. | **A** — use `fetch` to download it. Cache in memory for the session. |
| 7 | **Should the debug mode support `workflowId` references (one workflow calling another)?** | Arazzo allows `$sourceDescriptions.<name>.<workflowId>` references. | **Phase 2** — for Phase 1, only support workflows that call OpenAPI operations directly. |
| 8 | **How to handle self-signed certs / HTTP vs HTTPS?** | A) Always verify. B) Add a setting `arazzo.debug.rejectUnauthorized`. | **B** — add an extension setting. Default to `true`. |

---

## 8. Implementation Phases

### Phase 1 — Minimum Viable Debug Mode (Target: 2-3 weeks)

**Goal**: Step through a simple linear workflow, see HTTP requests/responses, see variables.

- [ ] Expression resolver (supports `$inputs`, `$steps.*.outputs`, `$statusCode`, `$response.body`, `$response.body#/...`, `$response.header.*`)
- [ ] OpenAPI resolver (reads local files, finds operations, extracts base URLs)
- [ ] HTTP client (sends requests, captures responses)
- [ ] Success criteria evaluator (supports `==`, `!=`, `<`, `>`, `<=`, `>=`)
- [ ] Debug controller (session lifecycle: start → pause → step → complete/stop)
- [ ] RPC messages (debugStateChanged, debugStep, debugContinue, debugStop, debugRestart)
- [ ] RPC handlers (extension side + webview side)
- [ ] "Debug" Code Lens in Go LSP
- [ ] `arazzo.debugWorkflow` command registration
- [ ] Input collection via `showInputBox`
- [ ] Debug toolbar in WorkflowView
- [ ] Step node status coloring (pending/current/executing/success/failure)
- [ ] Variables panel (JSON tree)
- [ ] Request/Response panel (raw HTTP display)
- [ ] Debug mode flag through state machine context

### Phase 2 — Enhanced Debug Features (Target: 2 weeks after Phase 1)

- [ ] `onSuccess`/`onFailure` branching (step jump, retry, end workflow)
- [ ] Workflow-to-workflow references (`$sourceDescriptions.<name>.<workflowId>`)
- [ ] Richer input collection UI (webview form with type validation)
- [ ] Breakpoints — ability to set breakpoints on specific steps (pause only there on "Continue")
- [ ] Custom headers / auth configuration via settings or webview
- [ ] Remote `sourceDescriptions` URL support (download OpenAPI specs)
- [ ] `$components` / `$ref` resolution (if not handled by LSP already)
- [ ] Export debug trace as JSON/HAR file

### Phase 3 — Full DAP Integration (Future)

- [ ] VS Code Debug Adapter Protocol (DAP) integration
- [ ] Breakpoints in the YAML file (click gutter to set breakpoint)
- [ ] Use the built-in VS Code Debug panel (Variables, Call Stack, Watch)
- [ ] Debug configuration in `launch.json`
- [ ] Conditional breakpoints
- [ ] Watch expressions

---

## Summary

The debug mode adds a **visual step-through execution layer** on top of the existing Arazzo Designer. It reuses the existing infrastructure (LSP for parsing, state machine for webview management, RPC for communication) and introduces a new **Execution Engine** in the extension host that can resolve Arazzo runtime expressions, make real HTTP calls, and evaluate success criteria. The webview gets enhanced with debug-specific UI (toolbar, variable inspector, request/response viewer) while the core graph rendering (React Flow) is reused with status-aware node styles.

The key architectural insight is that **execution happens in the extension host** (not the webview and not the Go LSP), because only the extension host has unrestricted network access and filesystem access. The webview is purely a rendering layer that sends user actions and receives state snapshots.
