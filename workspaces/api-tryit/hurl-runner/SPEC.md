# Hurl Runner Package Specification

## 1. Overview

`hurl-runner` executes `.hurl` collections and returns structured run results for an intuitive API TryIt UI.

Proposed package name:
- `@wso2/api-tryit-hurl-runner`

Workspace location:
- `workspaces/api-tryit/hurl-runner`

Primary goals:
- Run one or many `.hurl` files (collection/folder level).
- Produce normalized pass/fail/error results.
- Support live progress updates for UI rendering.
- Enable rerun workflows (all, failed, single file).

## 2. Scope

In scope:
- Discovery of `.hurl` files from folder/collection path.
- Execute runs through installed `hurl` CLI.
- Parse execution output into stable TypeScript models.
- Emit streaming events and final summary.
- Result model designed for visual UI consumption.

Out of scope (v1):
- Editing `.hurl` files.
- Replacing Hurl engine with custom HTTP executor.
- Persistent historical analytics store.

## 3. Architecture

`hurl-runner` is a Node-focused package with three layers:

1. `Discovery`
- Resolve target path(s).
- Expand to ordered list of `.hurl` files.
- Optional include/exclude patterns.

2. `Execution`
- Spawn `hurl` process(es).
- Support sequential and configurable parallel file execution.
- Support cancellation via `AbortSignal`.

3. `Normalization`
- Parse structured report output from Hurl.
- Convert into stable `HurlRunResult` domain model.
- Attach diagnostics (stderr, exit code, tool version).

## 4. Public API

```ts
export interface HurlRunner {
  verifyEnvironment(): Promise<HurlEnvironmentInfo>;
  discover(input: HurlRunInput): Promise<HurlDiscoveryResult>;
  run(input: HurlRunInput, options?: HurlRunOptions): Promise<HurlRunResult>;
  runStream(
    input: HurlRunInput,
    options: HurlRunOptions,
    onEvent: (event: HurlRunEvent) => void
  ): Promise<HurlRunResult>;
}
```

### 4.1 Input Models

```ts
interface HurlRunInput {
  collectionPath: string;            // folder or single .hurl file
  includePatterns?: string[];        // optional glob filters
  excludePatterns?: string[];
}

interface HurlRunOptions {
  parallelism?: number;              // default 1
  failFast?: boolean;                // default false
  timeoutMs?: number;                // optional global timeout
  env?: Record<string, string>;
  variables?: Record<string, string>; // mapped to hurl --variable
  insecure?: boolean;                // hurl -k
  followRedirects?: boolean;         // hurl -L
  onlyFailedFromRunId?: string;      // rerun failed subset
  reportArtifactsDir?: string;       // output json/junit artifacts
}
```

### 4.2 Output Models

```ts
type HurlRunStatus = 'passed' | 'failed' | 'error' | 'cancelled';

type HurlFileStatus = 'passed' | 'failed' | 'error' | 'skipped';

interface HurlRunResult {
  runId: string;
  status: HurlRunStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  summary: HurlRunSummary;
  files: HurlFileResult[];
  diagnostics: HurlRunDiagnostics;
}

interface HurlRunSummary {
  totalFiles: number;
  passedFiles: number;
  failedFiles: number;
  errorFiles: number;
  skippedFiles: number;
  totalEntries: number;      // total requests in all files
  passedEntries: number;
  failedEntries: number;
}

interface HurlFileResult {
  filePath: string;
  status: HurlFileStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  entries: HurlEntryResult[];
  assertions: HurlAssertionResult[];
  errorMessage?: string;
  stdout?: string;
  stderr?: string;
}

interface HurlEntryResult {
  name: string;
  method?: string;
  url?: string;
  statusCode?: number;
  status: 'passed' | 'failed' | 'error';
  durationMs?: number;
}

interface HurlAssertionResult {
  filePath: string;
  entryName?: string;
  expression: string;
  status: 'passed' | 'failed';
  expected?: string;
  actual?: string;
  message?: string;
  line?: number;
}

interface HurlRunDiagnostics {
  hurlVersion?: string;
  commandLine: string[];
  exitCode?: number;
  warnings: string[];
}
```

### 4.3 Streaming Events

```ts
type HurlRunEvent =
  | { type: 'runStarted'; runId: string; totalFiles: number }
  | { type: 'fileStarted'; runId: string; filePath: string }
  | { type: 'fileFinished'; runId: string; file: HurlFileResult }
  | { type: 'runProgress'; runId: string; completedFiles: number; totalFiles: number }
  | { type: 'runFinished'; runId: string; result: HurlRunResult }
  | { type: 'runCancelled'; runId: string };
```

## 5. CLI Strategy

Execution should rely on official Hurl CLI.

Preferred strategy:
- For each file, run `hurl` with machine-readable report output (JSON report artifact).
- Capture stdout/stderr and exit code.
- Parse report artifact into `HurlFileResult`.

Command baseline (v1 idea):
- `hurl <file> --report-json <tmpReportPath>`

Optional flags from `HurlRunOptions`:
- `-k`, `-L`, `--variable key=value`, etc.

Environment checks:
- Ensure `hurl` exists in PATH.
- Read version (`hurl --version`) once per run session.

## 6. Error Model

Error categories:
- `environment_error` (hurl missing/not executable)
- `discovery_error` (invalid path, no `.hurl` files)
- `execution_error` (process spawn/timeout/cancellation)
- `parse_error` (unexpected report format)

Requirements:
- Never throw raw process errors to UI.
- Always return meaningful `errorMessage` in `HurlFileResult` or top-level `diagnostics`.

## 7. UI Specification (Intuitive Run Results)

Target: API TryIt visualizer/extension run screen.

### 7.1 Summary Header

Display:
- Overall status badge (`Passed`, `Failed`, `Error`, `Cancelled`)
- Totals: files, passed, failed, duration
- Primary actions:
  - `Run All`
  - `Rerun Failed`
  - `Stop` (while running)

### 7.2 File Results Pane

List each `.hurl` file with:
- Status icon/color
- File name + relative path
- Duration
- Failed assertion count (if any)

Interactions:
- Filter tabs: `All`, `Failed`, `Passed`
- Text search by file name/path/assertion text

### 7.3 Details Pane

For selected file, show:
- Entry list with method/url/status
- Failed assertions with:
  - expression
  - expected vs actual
  - line number (if available)
  - failure message
- Raw stderr/stdout collapsible sections

### 7.4 Progressive Feedback

While running:
- Incremental file completion updates.
- Current file indicator.
- Partial summary updates in real-time.

## 8. Integration Contract (Extension <-> UI)

Extension side:
- Owns process execution (`hurl-runner` invocation).
- Emits run events through existing messaging/RPC channel.

UI side:
- Subscribes to `HurlRunEvent` stream.
- Maintains local view state keyed by `runId`.
- Supports rerun commands by sending run options (`onlyFailedFromRunId`).

## 9. Testing Strategy

### 9.1 Unit Tests

- File discovery logic.
- Command construction from options.
- Report parser mapping to normalized model.
- Status aggregation and summary math.
- Event emission order.

### 9.2 Integration Tests

- Mocked process adapter for deterministic pass/fail/error runs.
- Cancellation behavior.
- Timeout behavior.

### 9.3 Contract Tests

- Fixtures for representative Hurl reports.
- Validate parser resilience to minor report shape changes.

## 10. Non-Functional Requirements

- Deterministic ordering of files and results.
- Safe for large collections (streaming events, avoid loading huge logs eagerly).
- No UI freeze due to long-running process.
- Clear diagnostics for operational failures.

## 11. Acceptance Criteria

1. Running a folder with multiple `.hurl` files returns one `HurlRunResult` with accurate summary counts.
2. Failed assertions are surfaced with actionable details in details pane.
3. `Rerun Failed` executes only previously failed files.
4. Cancellation stops active process and returns `cancelled` status.
5. UI receives progressive run updates and final result.
6. Unit/integration tests cover pass/fail/error/cancel paths.

## 12. Implementation Plan (Post-Spec)

Phase 1:
- Package scaffold + domain models + discovery.

Phase 2:
- Process execution adapter + report parsing + `run` API.

Phase 3:
- Streaming API + cancellation + rerun failed support.

Phase 4:
- UI integration wiring + result screen implementation.

Phase 5:
- Hardening, fixtures, and docs.
