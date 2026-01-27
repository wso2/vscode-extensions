# Arazzo LSP Server - Endpoints and Logging Guide

## How to View Logs

### In VS Code
1. Open the Output panel: `View > Output` (or `Cmd+Shift+U` on Mac, `Ctrl+Shift+U` on Windows/Linux)
2. Select **"Arazzo Language Server"** from the dropdown in the Output panel
3. All LSP server logs will appear here in real-time

### Debug Mode
The language server runs with `--debug` flag by default, which enables verbose logging.

---

## LSP Endpoints Implemented

### 1. Lifecycle Methods

#### `initialize`
- **Direction**: Client → Server
- **Purpose**: Initialize the language server with client capabilities
- **Logging**:
  - `<<< Incoming LSP Request: initialize`
  - `Initialize request received from client: <client_name>`
- **Response**: Server capabilities including:
  - TextDocumentSync (Full sync mode)
  - CodeLensProvider
  - CompletionProvider (triggers: `:`, `-`, `$`, `.`, `/`, `#`)

#### `initialized`
- **Direction**: Client → Server (notification)
- **Purpose**: Confirm initialization complete
- **Logging**:
  - `<<< Incoming LSP Request: initialized`
  - `Server initialized successfully`

#### `shutdown`
- **Direction**: Client → Server
- **Purpose**: Gracefully shut down the server
- **Logging**:
  - `<<< Incoming LSP Request: shutdown`
  - `Shutdown request received`
  - `Cleaning up server resources...`
- **Actions**:
  - Set shutdown flag to true
  - Clean up resources (close connections, clear caches)
  - Return success to client

#### `exit`
- **Direction**: Client → Server (notification)
- **Purpose**: Exit the server process
- **Logging**:
  - `<<< Incoming LSP Request: exit`
  - `Exit notification received`
  - If shutdown was called: `Exiting cleanly with code 0`
  - If shutdown was NOT called: `Exit called without shutdown request - exiting with error code 1`
- **Actions**:
  - Handled immediately without sending response (notifications don't have responses)
  - Flush log buffers with `utils.CloseLogger()`
  - Call `os.Exit(0)` if shutdown was requested, otherwise `os.Exit(1)`
  - Process terminates immediately before handler returns

---

### 2. Document Synchronization

#### `textDocument/didOpen`
- **Direction**: Client → Server (notification)
- **Purpose**: Notify server that a document was opened
- **Logging**:
  - `<<< Incoming LSP Request: textDocument/didOpen`
  - `Document opened: <uri>`
  - `Generating diagnostics for: <uri>`
  - `[Parser] Parsed document: arazzo=<version>, info.title=<title>, info.version=<version>`
  - `DiagnosticsProvider: Parse successful, validating document`
  - `Generated <N> diagnostics for <uri>`
  - `Publishing diagnostics to client for: <uri>`
- **Actions**:
  - Store document content
  - Run diagnostics
  - Publish diagnostics to client

#### `textDocument/didChange`
- **Direction**: Client → Server (notification)
- **Purpose**: Notify server that document content changed
- **Logging**:
  - `<<< Incoming LSP Request: textDocument/didChange`
  - `Document change event received for: <uri>`
  - `Document version: <version_number>`
  - `Number of content changes: <N>`
  - `Change text length: <bytes>`
  - `First 200 chars: <preview>`
  - `Document content updated, length: <bytes> bytes`
  - `Running diagnostics for changed document: <uri>`
  - All parser and diagnostics logs (same as didOpen)
- **Actions**:
  - Update stored document content
  - Re-run diagnostics
  - Publish updated diagnostics

#### `textDocument/didSave`
- **Direction**: Client → Server (notification)
- **Purpose**: Notify server that document was saved
- **Logging**:
  - `<<< Incoming LSP Request: textDocument/didSave`
  - `Document saved: <uri>`
  - Re-runs diagnostics
- **Actions**:
  - Update document content if provided
  - Re-run diagnostics

#### `textDocument/didClose`
- **Direction**: Client → Server (notification)
- **Purpose**: Notify server that document was closed
- **Logging**:
  - `<<< Incoming LSP Request: textDocument/didClose`
  - `Document closed: <uri>`
- **Actions**:
  - Remove document from cache
  - Clear diagnostics (publish empty diagnostics array)

---

### 3. Language Features

#### `textDocument/codeLens`
- **Direction**: Client → Server (request)
- **Purpose**: Request Code Lens items for a document
- **Logging**:
  - `<<< Incoming LSP Request: textDocument/codeLens`
  - `Code Lens request for: <uri>`
  - `Document not found in cache: <uri>` (if document not in memory)
- **Response**: Array of CodeLens items
  - `▶ Visualize` - Command: `arazzo.visualize`
  - `🎨 Open Designer` - Command: `arazzo.openDesigner`
- **Triggered**: When document is opened or changed

#### `textDocument/completion`
- **Direction**: Client → Server (request)
- **Purpose**: Request code completion suggestions
- **Logging**:
  - `<<< Incoming LSP Request: textDocument/completion`
  - `Completion request for: <uri> at line <N>, char <N>`
  - `Document content length: <bytes> bytes`
  - `Provided <N> completion items`
- **Trigger Characters**: `:`, `-`, `$`, `.`, `/`, `#`
- **Response**: CompletionList with context-aware items:
  - Root level: `arazzo`, `info`, `sourceDescriptions`, `workflows`, `components`
  - Info context: `title`, `version`, `summary`, `description`
  - Workflow context: `workflowId`, `steps`, `outputs`, `parameters`, etc.
  - Step context: `stepId`, `operationId`, `operationPath`, `parameters`, etc.
  - Runtime expressions: `$inputs`, `$steps`, `$workflows`, `$url`, `$method`, `$statusCode`, `$request`, `$response`

---

## Diagnostics Flow

### When Diagnostics Are Generated
1. **Document opened** (`textDocument/didOpen`)
2. **Document changed** (`textDocument/didChange`)
3. **Document saved** (`textDocument/didSave`)

### Diagnostics Pipeline

```
textDocument/didChange
    ↓
Server.DidChange()
    ↓
Server.provideDiagnostics(uri, content)
    ↓
DiagnosticsProvider.ProvideDiagnostics(content)
    ↓
Parser.Parse(content)
    → Logs: "Parsed document: arazzo=..., info.version=..."
    ↓
Validator.Validate(doc)
    → Validates: arazzo version, info fields, sourceDescriptions, workflows, steps
    → Logs: "Validation completed, found <N> errors"
    ↓
Convert ValidationErrors to LSP Diagnostics
    ↓
Client.PublishDiagnostics(uri, diagnostics[])
    → Logs: "Publishing <N> diagnostics to client"
```

### Diagnostic Logging Details

```
[INFO] Document change event received for: file:///path/to/file.arazzo.yaml
[INFO] Document version: 5
[DEBUG] Number of content changes: 1
[DEBUG] Change text length: 1234
[DEBUG] First 200 chars: arazzo: 1.0.0\ninfo:\n  title: ...
[INFO] Document content updated, length: 1234 bytes
[INFO] Running diagnostics for changed document: file:///...
[INFO] Generating diagnostics for: file:///...
[DEBUG] DiagnosticsProvider: Parsing document (length: 1234 bytes)
[Parser] Parsed document: arazzo=1.0.0, info.title=My API, info.version=1.0.0
[DEBUG] DiagnosticsProvider: Parse successful, validating document
[DEBUG]   - Arazzo version: 1.0.0
[DEBUG]   - Info.Title: My API
[DEBUG]   - Info.Version: 1.0.0
[DEBUG]   - Workflows count: 2
[DEBUG] DiagnosticsProvider: Validation completed, found 0 errors
[INFO] Generated 0 diagnostics for file:///...
[INFO] Publishing diagnostics to client for: file:///...
[INFO] Successfully published 0 diagnostics
```

---

## Known Issue: Stale Diagnostics

### Problem
When you add a missing field (e.g., `version: 1.0.0` in the `info` section), the error diagnostic may not disappear immediately. It only clears after reloading the window.

### Possible Causes
1. **Parser caching**: The parser might not be receiving the updated content ✅ **Verified: No caching in parser**
2. **Document sync issue**: The `didChange` notification might not contain the full updated document
3. **Diagnostics not being republished**: The diagnostics might be generated but not sent to client
4. **Client-side caching**: VS Code might be caching old diagnostics

### Debugging Steps
With the enhanced logging, you can now:
1. Open VS Code Output panel
2. Select "Arazzo Language Server"
3. Type the missing field (e.g., `version: 1.0.0`)
4. Watch the logs to see:
   - Is `textDocument/didChange` being called?
   - What's the document version number?
   - What content is being parsed?
   - What does the parser see for `info.version`?
   - How many diagnostics are generated?
   - Are diagnostics being published successfully?

### Next Steps
Once you test with the enhanced logging, look for:
- Does the parser log show `info.version=1.0.0` after you type it?
- Does validation still report "Missing required field 'info.version'"?
- Are diagnostics being published (look for "Successfully published N diagnostics")?

---

## Unhandled Methods

Any LSP method not explicitly handled will log:
```
[WARNING] >>> Unhandled LSP method: <method_name>
```

This helps identify if the client is calling methods the server doesn't support yet.

---

## Log Levels

- **INFO**: Important events (document opened, diagnostics generated, etc.)
- **DEBUG**: Detailed information (document content, parsed values, etc.)
- **WARNING**: Unexpected situations (document not found, unhandled methods)
- **ERROR**: Failures (parse errors, validation errors, failed to publish)

Enable debug mode by passing `--debug` flag to the server (already enabled by default in extension.ts).

---

## Troubleshooting

### Server Exit Timeout (FIXED)

**Symptom:**
```
[Error] Stopping server failed
Error: Stopping the server timed out
[Error] Server process exited with signal SIGKILL
```

**Cause:** The server wasn't properly handling the LSP shutdown/exit lifecycle. When VS Code sent the `exit` notification, the server would log it but not actually terminate the process, causing VS Code to wait until timeout and then force-kill it with SIGKILL.

**Fix:** The `exit` notification is now handled specially without sending a response:
- Exit is a notification (not a request), so no response should be sent
- The handler calls `os.Exit()` immediately to terminate the process
- If `shutdown` was called first → exits with code 0 (success)
- If `exit` called without `shutdown` → exits with code 1 (error)
- The process terminates before attempting to send a response, preventing timeout

**Verification:** Check the logs for:
```
[INFO] Exit notification received
[INFO] Exiting cleanly with code 0
```

The server should now exit immediately without timeout or SIGKILL.
