# Arazzo Designer VS Code Extension — Complete Architecture Explanation

> **Audience**: Someone who has never seen this codebase before.  
> **Goal**: After reading this, you should understand every moving part, how they connect, and where each piece of code lives.

---

## Table of Contents

1. [What Is This Extension?](#1-what-is-this-extension)
2. [The Workspace Packages (Monorepo Structure)](#2-the-workspace-packages-monorepo-structure)
3. [package.json — The Extension's Blueprint](#3-packagejson--the-extensions-blueprint)
4. [Extension Activation — Where Everything Starts](#4-extension-activation--where-everything-starts)
5. [Document Detection — How VS Code Knows It's an Arazzo File](#5-document-detection--how-vs-code-knows-its-an-arazzo-file)
6. [The Language Server (LSP) — The Go Binary](#6-the-language-server-lsp--the-go-binary)
7. [Code Lens — The Clickable "Visualize" Buttons](#7-code-lens--the-clickable-visualize-buttons)
8. [VS Code Commands — What the User Can Trigger](#8-vs-code-commands--what-the-user-can-trigger)
9. [The State Machine — The Brain of Navigation](#9-the-state-machine--the-brain-of-navigation)
10. [The RPC Layer — How Extension Talks to Webviews](#10-the-rpc-layer--how-extension-talks-to-webviews)
11. [The Webview — How React Panels Are Created](#11-the-webview--how-react-panels-are-created)
12. [VisualizerWebview and the webviewReady Handshake — Deep Dive](#12-visualizerwebview-and-the-webviewready-handshake--deep-dive)
13. [The Visualizer (React App) — What Renders Inside the Webview](#13-the-visualizer-react-app--what-renders-inside-the-webview)
14. [The RPC Client — How React Talks Back to the Extension](#14-the-rpc-client--how-react-talks-back-to-the-extension)
15. [Data Flow — How the Arazzo Model Is Fetched](#15-data-flow--how-the-arazzo-model-is-fetched)
16. [End-to-End Flow — From File Open to Workflow Visualization](#16-end-to-end-flow--from-file-open-to-workflow-visualization)
17. [File Location Reference](#17-file-location-reference)
18. [The CLI Binaries — What They Are and How to Build Them](#18-the-cli-binaries--what-they-are-and-how-to-build-them)
19. [The MCP Server Runner — The Play Button](#19-the-mcp-server-runner--the-play-button)

---

## 1. What Is This Extension?

The **Arazzo Designer** is a VS Code extension for working with [Arazzo Specification](https://spec.openapis.org/arazzo/v1.0.1.html) files. Arazzo is a standard for describing sequences of API calls (workflows) — like "create a pet, then get it, then delete it".

The extension provides:
- **Syntax highlighting** for `.arazzo.yaml` files
- **Autocompletion** (e.g., `$steps.`, `$response.body`)
- **Diagnostics** (real-time error checking)
- **Hover** information (hover over an `operationId` to see the API details)
- **Go to Definition** (Ctrl+Click an `operationId` to jump to the OpenAPI file)
- **Code Lens** ("Visualize" buttons above each workflow)
- **Visual Overview** page (shows all workflows in a document)
- **Visual Workflow Graph** (shows steps as a flow chart with nodes and edges)
- **File creation** scaffolding (right-click → Create Arazzo File)
- **MCP Server** (play button → starts an MCP server exposing workflows as tools for GitHub Copilot)

---

## 2. The Workspace Packages (Monorepo Structure)

The extension is a **monorepo** — multiple packages that work together. They all live under `workspaces/arazzo/`:

```
workspaces/arazzo/
├── arazzo-designer-extension/   ← The actual VS Code extension (TypeScript)
├── arazzo-designer-lsp/         ← The Language Server (Go binary)
├── arazzo-designer-core/        ← Shared types, interfaces, RPC definitions
├── arazzo-designer-rpc-client/  ← RPC client used by the React webview
├── arazzo-designer-visualizer/  ← The React app that renders in webview panels
├── arazzo-designer-cli/         ← The MCP server CLI (Go binary) [separate branch]
└── examples/                    ← Sample Arazzo files for testing
```

### What each package does:

| Package | Language | Purpose |
|---------|----------|---------|
| `arazzo-designer-extension` | TypeScript | The main VS Code extension. Handles activation, commands, LSP client, state machine, webview creation. This is what VS Code loads. |
| `arazzo-designer-lsp` | Go | A standalone binary that speaks the Language Server Protocol over stdio. Provides completions, diagnostics, hover, definition, and Code Lens. |
| `arazzo-designer-core` | TypeScript | Shared library. Contains all the TypeScript types, interfaces, RPC method definitions, state machine types, and the Arazzo data model interfaces. Both the extension and the visualizer depend on this. |
| `arazzo-designer-rpc-client` | TypeScript | A thin client library that the React webview uses to send RPC messages to the extension host. It wraps `vscode-messenger-webview`. |
| `arazzo-designer-visualizer` | TypeScript/React | The React application that renders the Overview page and the Workflow graph inside VS Code webview panels. It gets bundled into a single JS file and loaded by the extension. |
| `arazzo-designer-cli` | Go | A separate Go binary that acts as an MCP (Model Context Protocol) server for running Arazzo workflows. This is on a separate branch. |

### Why are they separate?

Because VS Code extensions have two "worlds" that cannot share code directly:
1. **Extension Host** (Node.js) — runs your TypeScript extension code
2. **Webview** (Browser-like iframe) — runs HTML/CSS/JS, has no access to VS Code APIs

The `core` package is the bridge — it defines the "contract" (types and RPC method names) that both sides use. The `rpc-client` package is the webview-side implementation. The `RPCLayer` in the extension is the host-side implementation.

---

## 3. package.json — The Extension's Blueprint

**File**: `arazzo-designer-extension/package.json`

This is the most important configuration file. VS Code reads it to know *everything* about the extension. Let's break down every section:

### 3.1 Activation Events
```json
"activationEvents": [
    "onLanguage:yaml",
    "onLanguage:json",
    "onLanguage:arazzo-yaml",
    "onLanguage:arazzo-json"
]
```
These tell VS Code **when to activate (load) the extension**. The extension activates when the user opens ANY yaml or json file. This is intentional because the extension needs to inspect the file content to determine if it's an Arazzo file.

### 3.2 Custom Languages
```json
"languages": [
    {
        "id": "arazzo-yaml",
        "extensions": [".arazzo.yaml", ".arazzo.yml", "-arazzo.yaml", "-arazzo.yml"],
        "configuration": "./language-configuration.json"
    },
    {
        "id": "arazzo-json",
        "extensions": [".arazzo.json", "-arazzo.json"]
    }
]
```
This registers two new language IDs with VS Code. Files ending in `.arazzo.yaml` (and similar) are automatically assigned the `arazzo-yaml` language. But even files that don't match these patterns can be dynamically reassigned (see Section 5).

### 3.3 Grammars (Syntax Highlighting)
```json
"grammars": [
    {
        "language": "arazzo-yaml",
        "scopeName": "source.arazzo",
        "path": "./syntaxes/arazzo.tmLanguage.json"
    }
]
```
Links the `arazzo-yaml` language to a TextMate grammar file that defines syntax coloring rules.

### 3.4 Commands
```json
"commands": [
    { "command": "ArazzoDesigner.openAPIDesigner", "title": "Open Arazzo Designer" },
    { "command": "ArazzoDesigner.createOpenAPIFile", "title": "Create OpenAPI/Arazzo File" },
    { "command": "ArazzoDesigner.showCode", "title": "Show Code" },
    { "command": "ArazzoDesigner.createArazzoFile", "title": "Create Arazzo Workflow File" },
    { "command": "arazzo.visualize", "title": "Visualize Arazzo Workflow" },
    { "command": "arazzo.openDesigner", "title": "Open Arazzo Designer" },
    { "command": "arazzo.startMCPServer", "title": "Start MCP Server", "icon": "$(play)" }
]
```
These register commands that users can trigger. Commands are like "functions" that VS Code knows about. They can be triggered from:
- The Command Palette (Ctrl+Shift+P)
- Menus
- Code Lens clicks
- Programmatically from code

### 3.5 Menus
```json
"menus": {
    "editor/title": [
        {
            "when": "isFileOpenAPI || isFileArazzo",
            "command": "ArazzoDesigner.openAPIDesigner",
            "group": "navigation"
        },
        {
            "command": "ArazzoDesigner.showCode",
            "when": "isViewOpenAPI || isViewArazzo"
        }
    ],
    "explorer/context": [
        { "command": "ArazzoDesigner.createOpenAPIFile" },
        { "command": "ArazzoDesigner.createArazzoFile" }
    ]
}
```
- **`editor/title`**: Adds buttons to the editor's title bar. The "Open Arazzo Designer" button (the eye icon `$(open-preview)`) only shows when `isFileArazzo` is true. The "Show Code" button only shows when a visualizer panel is active.
- **`explorer/context`**: Adds "Create OpenAPI/Arazzo File" entries to the right-click menu in the file explorer.

The `when` clauses use **context keys** — boolean flags that the extension sets dynamically (see Section 5).

### 3.6 Key Dependencies
```json
"dependencies": {
    "vscode-languageclient": "9.0.1",       // LSP client to talk to the Go language server
    "vscode-messenger": "0.4.5",            // RPC messaging between extension and webviews
    "xstate": "4.38.3",                     // State machine library
    "@wso2/arazzo-designer-core": "workspace:*",        // Shared types
    "@wso2/arazzo-designer-rpc-client": "workspace:*",  // Webview RPC client
    "@wso2/arazzo-designer-visualizer": "workspace:*",  // React visualizer app
    "js-yaml": "4.1.1"                      // YAML parsing
}
```

---

## 4. Extension Activation — Where Everything Starts

**File**: `arazzo-designer-extension/src/extension.ts` → `activate()` function

When VS Code loads the extension, it calls `activate()`. Here's what happens, step by step:

```
activate() is called
    │
    ├── 1. Store the extension context (extension.context = context)
    │      → File: src/Context.ts
    │      → This is a global singleton that holds the VS Code ExtensionContext
    │      → Other files import this to access extension paths, storage, etc.
    │
    ├── 2. Check the active document for Arazzo content
    │      → checkDocumentForOpenAPI(activeTextEditor?.document)
    │      → Sets context keys: isFileArazzo, isFileOpenAPI
    │
    ├── 3. Register document change listeners
    │      → onDidChangeTextDocument → re-check if it's Arazzo
    │      → onDidChangeActiveTextEditor → re-check when user switches tabs
    │
    ├── 4. RPCLayer.init()
    │      → Registers all the RPC message handlers
    │      → This is how the extension can respond to webview requests
    │      → File: src/RPCLayer.ts
    │
    ├── 5. activateHistory()
    │      → Creates a new History stack for navigation
    │      → File: src/history/activator.ts
    │
    ├── 6. activateVisualizer(context)
    │      → Registers the "ArazzoDesigner.openAPIDesigner" command
    │      → This is the eye icon button in the editor title bar
    │      → File: src/visualizer/activate.ts
    │
    ├── 7. StateMachine.initialize()
    │      → Starts the XState state machine
    │      → File: src/stateMachine.ts
    │
    ├── 8. Register "Create OpenAPI File" command
    │      → ArazzoDesigner.createOpenAPIFile
    │
    ├── 9. Register "Create Arazzo File" command
    │      → ArazzoDesigner.createArazzoFile
    │
    ├── 10. Register "Show Code" command
    │       → ArazzoDesigner.showCode
    │
    └── 11. initializeLanguageServer(context)
            → Finds the Go binary in the "ls/" folder
            → Starts it as a child process over stdio
            → Creates a LanguageClient to communicate with it
            → Registers "arazzo.visualize" and "arazzo.openDesigner" commands
```

---

## 5. Document Detection — How VS Code Knows It's an Arazzo File

There are **two completely separate mechanisms** that identify a file as Arazzo. They operate independently and handle different situations.

---

### Mechanism 1 — File Extension (Automatic, at startup)

**Who does it**: VS Code itself, by reading `package.json`  
**When**: The moment a file is opened, before any extension code runs  
**How**: The `languages` contribution in `package.json` maps file extensions to language IDs:

```json
"languages": [
    {
        "id": "arazzo-yaml",
        "extensions": [".arazzo.yaml", ".arazzo.yml", "-arazzo.yaml", "-arazzo.yml"],
        "configuration": "./language-configuration.json"
    },
    {
        "id": "arazzo-json",
        "extensions": [".arazzo.json", "-arazzo.json"]
    }
]
```

If you open a file named `workflow.arazzo.yaml`, VS Code automatically assigns it the `arazzo-yaml` language ID — **without reading the file contents at all**. This is a pure filename match.

**What this triggers**:
- Syntax highlighting (the TextMate grammar is linked to `arazzo-yaml`)
- The LSP attaches immediately (its `documentSelector` includes `arazzo-yaml`)
- No TypeScript extension code is involved at this stage

---

### Mechanism 2 — Content Inspection (Dynamic, at runtime)

**Who does it**: The TypeScript extension (`extension.ts`)  
**When**: Every time the active editor changes, a document is opened, or a document is edited  
**How**: `checkDocumentForOpenAPI()` reads the first 10 lines and looks for `arazzo:` using a regex

**File**: `arazzo-designer-extension/src/extension.ts` → `checkDocumentForOpenAPI()`

```
checkDocumentForOpenAPI() runs
    │
    ├── 1. Is the language YAML or JSON? If not → clear all flags, return.
    │
    ├── 2. Read the first 10 lines of the document.
    │
    ├── 3. Test: /\barazzo\s*:\s*\d+\.\d+\.\d+/i
    │         matches "arazzo: 1.0.0" anywhere in those first 10 lines
    │
    ├── 4a. If arazzo: found →
    │         setContext('isFileArazzo', true)      ← shows eye icon in title bar
    │         setContext('isFileOpenAPI', false)
    │         setTextDocumentLanguage(doc, 'arazzo-yaml')   ← DYNAMIC REASSIGNMENT
    │
    ├── 4b. If openapi: found →
    │         setContext('isFileOpenAPI', true)
    │         setContext('isFileArazzo', false)
    │
    └── 4c. Neither found → clear all flags
```

The critical line is `vscode.languages.setTextDocumentLanguage(document, 'arazzo-yaml')`. This **overrides** whatever language VS Code assigned to the file based on its extension. So a file named simply `workflow.yaml` (which VS Code would normally call `yaml`) gets **dynamically promoted** to `arazzo-yaml` if its content contains `arazzo: 1.0.0`.

---

### How the Two Mechanisms Work Together

| Scenario | Mechanism 1 (extension) | Mechanism 2 (content) | End result |
|----------|--------------------------|----------------------|------------|
| File named `workflow.arazzo.yaml` | Assigns `arazzo-yaml` immediately | Confirms it (redundantly sets language again) | `arazzo-yaml` ✅ |
| File named `workflow.yaml` with `arazzo: 1.0.0` inside | Assigns plain `yaml` | Detects content, **upgrades** to `arazzo-yaml` | `arazzo-yaml` ✅ |
| File named `workflow.arazzo.yaml` but with OpenAPI content inside | Assigns `arazzo-yaml` | Detects `openapi:`, sets `isFileOpenAPI`, **downgrades** to plain `yaml` | May cause confusion ⚠️ |
| File named `workflow.yaml` with OpenAPI content | Assigns plain `yaml` | Detects `openapi:`, sets `isFileOpenAPI` | `yaml` with OpenAPI context keys |

### Why does this matter?

The **language ID** is what the LSP uses to decide whether to attach. The LSP's `documentSelector` is:
```typescript
{ scheme: 'file', language: 'arazzo-yaml' }
```

So:
- If a file ends up as `arazzo-yaml` (by either mechanism) → LSP attaches, completions/diagnostics/Code Lens work
- If a file stays as plain `yaml` → LSP does NOT attach, no smart features

The content-inspection mechanism (Mechanism 2) is the safety net for files that don't follow the `.arazzo.yaml` naming convention but are still valid Arazzo files.

---

## 6. The Language Server (LSP) — The Go Binary

**Directory**: `arazzo-designer-lsp/`

### What is a Language Server?

A Language Server is a separate program that provides "smart" editor features: autocompletion, error checking, hover information, go-to-definition, etc. It communicates with VS Code using the **Language Server Protocol (LSP)** — a standardized JSON-RPC protocol.

### Why Go?

The language server is written in Go (not TypeScript) because it compiles to a single native binary. This means:
- No Node.js runtime dependency
- Fast startup
- Works on all platforms (Windows, macOS, Linux)

### Where is the binary?

The compiled binary lives in:
```
arazzo-designer-extension/ls/arazzo-language-server.exe   (Windows)
arazzo-designer-extension/ls/arazzo-language-server-darwin-amd64  (macOS Intel)
arazzo-designer-extension/ls/arazzo-language-server-darwin-arm64  (macOS Apple Silicon)
arazzo-designer-extension/ls/arazzo-language-server-linux-amd64   (Linux)
```

### How is it started?

In `extension.ts` → `initializeLanguageServer()`:

```typescript
// 1. Find the binary
const serverPath = path.join(context.extensionPath, 'ls', serverExecutable);

// 2. Configure how to start it
const serverOptions: ServerOptions = {
    command: serverPath,
    args: ['--debug'],
    transport: TransportKind.stdio    // Communication via stdin/stdout
};

// 3. Configure which documents it should handle
const clientOptions: LanguageClientOptions = {
    documentSelector: [
        { scheme: 'file', language: 'arazzo-yaml' },
        { scheme: 'file', language: 'arazzo-json' }
    ]
};

// 4. Create and start the client
languageClient = new LanguageClient('arazzoLanguageServer', ...);
languageClient.start();
```

The `LanguageClient` (from `vscode-languageclient` npm package) handles all the protocol details. It:
- Spawns the Go binary as a child process
- Sends `initialize` request
- Forwards document open/change/save events
- Requests completions, diagnostics, hover, etc.
- Receives responses and renders them in the editor

### What the Go server provides:

| LSP Feature | Go File | What It Does |
|-------------|---------|--------------|
| **Text Sync** | `server/server.go` | Tracks open documents, receives edits |
| **Diagnostics** | `diagnostics/diagnostics.go` | Validates the Arazzo document (required fields, valid expressions, etc.) and shows squiggly underlines for errors |
| **Completion** | `completion/completion.go` | Context-aware autocomplete: `$steps.`, `$response.body`, field names, etc. |
| **Hover** | `server/hover.go` | Hover over an `operationId` to see the HTTP method, path, summary from the OpenAPI spec |
| **Go to Definition** | `server/definition.go` | Ctrl+Click an `operationId` to jump to its definition in the OpenAPI file |
| **Code Lens** | `codelens/codelens.go` | Adds "Visualize" buttons above each `workflowId:` line |
| **Custom: getModel** | `server/server.go` | A custom `arazzo/getModel` request that returns the fully parsed Arazzo document as JSON. This is used by the visual designer. |

### How does Go-to-Definition work?

1. The `navigation/discovery.go` file scans the filesystem near the Arazzo file for OpenAPI specs.
2. `navigation/parser.go` parses those OpenAPI files and extracts all `operationId` values with their line numbers.
3. `navigation/indexer.go` builds an in-memory index of `operationId → { file, line, method, path }`.
4. When you Ctrl+Click an `operationId`, `server/definition.go` looks it up in the index and returns the file location.

---

## 7. Code Lens — The Clickable "Visualize" Buttons

**Files**:
- LSP side: `arazzo-designer-lsp/codelens/codelens.go`
- Extension side: `arazzo-designer-extension/src/extension.ts`

### What is Code Lens?

Code Lens is a VS Code feature that shows small clickable text above certain lines of code. It can look like this in your editor:

```
  Visualize                                    ← this is a Code Lens
  - workflowId: create_get_delete_pet
    summary: Create, get, and delete a pet
```

### How it works:

1. **VS Code asks the LSP**: "What Code Lenses should I show for this document?"

2. **The Go LSP responds** (in `codelens.go`): For each workflow in the document, it creates a Code Lens at the `workflowId:` line:
   ```go
   CodeLens{
       Range: lineOfWorkflowId,
       Command: {
           Title:   "Visualize",
           Command: "arazzo.openDesigner",    // ← the VS Code command to invoke
           Arguments: [{ workflowId: "create_get_delete_pet", uri: "file:///..." }]
       }
   }
   ```

3. **VS Code renders** the "Visualize" text as a clickable link.

4. **When clicked**, VS Code executes the `arazzo.openDesigner` command with the arguments. This is handled in `extension.ts`:
   ```typescript
   vscode.commands.registerCommand('arazzo.openDesigner', async (args) => {
       // args = { workflowId: "create_get_delete_pet", uri: "file:///..." }
       openView(EVENT_TYPE.OPEN_VIEW, {
           view: MACHINE_VIEW.Workflow,
           documentUri: uri.toString(),
           identifier: workflowId,
       });
   });
   ```

---

## 8. VS Code Commands — What the User Can Trigger

**Files**: `arazzo-designer-extension/src/extension.ts`, `src/visualizer/activate.ts`, `src/constants/index.ts`

Here's every command the extension registers:

| Command ID | Trigger | What It Does |
|------------|---------|--------------|
| `ArazzoDesigner.openAPIDesigner` | Eye icon in editor title bar | Opens the **Overview** page for the current Arazzo file |
| `ArazzoDesigner.createOpenAPIFile` | Right-click in file explorer | Scaffolds a new OpenAPI YAML file |
| `ArazzoDesigner.createArazzoFile` | Right-click in file explorer | Scaffolds a new Arazzo YAML file |
| `ArazzoDesigner.showCode` | Code icon in editor title bar (when visualizer is open) | Switches focus back to the YAML source code |
| `arazzo.visualize` | Code Lens / Command Palette | Opens the Overview visualizer |
| `arazzo.openDesigner` | Code Lens "Visualize" button | Opens the **Workflow graph** for a specific workflow |
| `arazzo.startMCPServer` | Play button in editor title bar (when `isFileArazzo`) | Starts the MCP server for the current Arazzo file, writes `.vscode/mcp.json`, and offers to open Copilot |

### Context Keys (the `when` system):

The extension dynamically sets these boolean flags:

| Context Key | Meaning | Set Where |
|-------------|---------|-----------|
| `isFileArazzo` | The active **editor** has an Arazzo file open | `checkDocumentForOpenAPI()` in `extension.ts` |
| `isFileOpenAPI` | The active **editor** has an OpenAPI file open | `checkDocumentForOpenAPI()` in `extension.ts` |
| `isViewArazzo` | A visualizer **panel** (webview tab) showing Arazzo content is currently focused | `webview.ts` → `onDidChangeViewState` |
| `isViewOpenAPI` | A visualizer **panel** (webview tab) showing OpenAPI content is currently focused | `webview.ts` → `onDidChangeViewState` |

#### `isFile*` vs `isView*` — What is the difference?

- **`isFile*`** = relates to the **text editor** (the YAML/JSON file you have open). Set whenever you switch editor tabs or edit a document.
- **`isView*`** = relates to the **webview panel** (the visual diagram tab). Set whenever a webview panel gains or loses focus.

They control **different buttons**:
- `isFileArazzo = true` → shows the **eye icon** ("Open Arazzo Designer") in the editor title bar — because you're looking at an Arazzo file and might want to open the visualizer
- `isViewArazzo = true` → shows the **"Show Code"** button in the panel title bar — because you're looking at a visualizer panel and might want to jump back to the YAML

#### Where exactly is `isViewArazzo` / `isViewOpenAPI` set?

**File**: `arazzo-designer-extension/src/visualizer/webview.ts`

Inside the `VisualizerWebview` constructor, event listeners are registered on the panel. The relevant one is `onDidChangeViewState`, which fires when a webview panel gains or loses focus:

```typescript
this._panel.onDidChangeViewState((e) => {
    const isActive = e.webviewPanel.active;  // true = this panel just got focus

    if (isActive) {
        // User clicked onto this visualizer panel tab
        vscode.commands.executeCommand('setContext', 'isViewArazzo', true);
        vscode.commands.executeCommand('setContext', 'isViewOpenAPI', false);
    } else {
        // User clicked away from this panel
        vscode.commands.executeCommand('setContext', 'isViewArazzo', false);
        vscode.commands.executeCommand('setContext', 'isViewOpenAPI', false);
    }
});
```

So the sequence for the "Show Code" button is:
1. User opens the Arazzo visualizer → webview panel created
2. User clicks on the webview panel tab → `onDidChangeViewState` fires with `active = true`
3. Extension sets `isViewArazzo = true`
4. `package.json` menu rule `"when": "isViewArazzo"` activates → **"Show Code" button appears** in that panel's title bar
5. User clicks on the YAML editor tab → `onDidChangeViewState` fires with `active = false`
6. Extension sets `isViewArazzo = false` → "Show Code" button disappears

---

## 9. The State Machine — The Brain of Navigation

**File**: `arazzo-designer-extension/src/stateMachine.ts`

### Why a State Machine?

Visualizer navigation is complex. The user might:
- Open a file → see the Overview
- Click a workflow → see the Workflow graph
- Open another file → both views need to update
- Close one panel → the other should still work

A state machine (using the **XState** library) guarantees that these transitions happen in a predictable order, and that no impossible state is reached.

### The States:

```
arazzo-designer (root)
├── ready (main operating state)
│   ├── activateProjectExplorer  → runs once on startup, then moves to viewReady
│   ├── viewReady                → idle, waiting for user action
│   ├── viewLoading              → opening/creating webview panel
│   ├── viewFinding              → resolving the view location
│   ├── viewStacking             → pushing to navigation history
│   ├── viewNavigated            → updating AI view (placeholder), then → viewReady
│   ├── viewUpdated              → called for NAVIGATE events (refresh same view)
│   └── viewEditing              → when editing mode is active
├── disabled                     → extension is disabled
└── newProject                   → creating a new project
```

### The Context (State Machine Memory):

The state machine has a "context" — a bag of variables that travel with it:

```typescript
interface MachineContext {
    view: MACHINE_VIEW;      // "Arazzo Overview" or "Arazzo Workflow"
    documentUri?: string;    // The URI of the Arazzo file being viewed
    identifier?: string;     // The workflowId (for Workflow view)
    projectUri?: string;     // The workspace folder path
    position?: any;          // Cursor position (unused currently)
    error?: any;
}
```

### Events:

| Event | What Triggers It | What Happens |
|-------|-----------------|--------------|
| `OPEN_VIEW` | User clicks Visualize, eye icon, or Code Lens | Updates context with new file/view info, then transitions through viewLoading → viewFinding → viewStacking → viewNavigated → viewReady |
| `NAVIGATE` | Refresh after file save | Transitions through viewUpdated → viewNavigated → viewReady |
| `RESET_TO_VIEW_READY` | Command handlers (before opening a new view) | Jumps back to viewReady immediately |
| `EDIT_DONE` | Editing completes | Returns from viewEditing to viewReady |

### The Services (Side Effects):

When the state machine enters certain states, it runs "services" — async functions:

| Service | Called In State | What It Does |
|---------|----------------|--------------|
| `openWebPanel` | `viewLoading` | Disposes any existing webview panel and creates a new one. Waits for the `webviewReady` notification from the React app. |
| `findView` | `viewFinding`, `viewUpdated` | Resolves the view location and updates the project explorer. |
| `updateStack` | `viewStacking` | Pushes the current view to the navigation history stack. |
| `updateAIView` | `viewNavigated` | Placeholder for AI view updates. Currently just resolves immediately. |
| `activateProjectExplorer` | `activateProjectExplorer` | Placeholder for project explorer activation. Resolves immediately. |

### The `openWebPanel` Service (The Most Important One):

> **See Section 12** for a detailed explanation of what `VisualizerWebview` and `onNotification(webviewReady, ...)` actually are and why this pattern is used.

```typescript
openWebPanel: (context, event) => {
    return new Promise((resolve) => {
        const sharedColumn =
            VisualizerWebview.currentPanel?.getWebview()?.viewColumn ??
            VisualizerWebview.workflowPanel?.getWebview()?.viewColumn ??
            ViewColumn.Beside;

        if (context.view === MACHINE_VIEW.Workflow) {
            // Dispose existing workflow panel, create fresh one
            if (VisualizerWebview.workflowPanel) {
                VisualizerWebview.workflowPanel.dispose();
            }
            VisualizerWebview.workflowPanel = new VisualizerWebview(sharedColumn, true);
            // ↑ Creates the VS Code webview panel and injects the React HTML.
            // The React app loads asynchronously inside the panel (browser iframe).
            // We CANNOT proceed until React is fully mounted and ready.
            // So we register a one-time listener: when the React app sends the
            // 'webviewReady' notification back, we resolve this Promise and
            // the state machine moves to the next state.
            RPCLayer._messenger.onNotification(webviewReady, () => resolve(true));
        } else if (context.view === MACHINE_VIEW.Overview) {
            if (VisualizerWebview.currentPanel) {
                VisualizerWebview.currentPanel.dispose();
            }
            VisualizerWebview.currentPanel = new VisualizerWebview(sharedColumn, false);
            RPCLayer._messenger.onNotification(webviewReady, () => resolve(true));
        }
    });
}
```

Key points:
- There are **two** webview panels: `currentPanel` (Overview) and `workflowPanel` (Workflow graph)
- Each time a view is opened, the **old panel is disposed** and a **new one is created**. This ensures fresh data.
- The service **pauses the state machine** by returning an unresolved Promise. It only resolves when React sends `webviewReady` — preventing the state machine from racing ahead before the UI is ready to receive data.

### State Transition Broadcasting:

Every time the state machine transitions, it broadcasts the new state to ALL open webviews:

```typescript
stateService.onTransition((state) => {
    if (state.changed) {
        RPCLayer._messenger.sendNotification(
            stateChanged,
            { type: 'webview', webviewType: 'arazzo-designer.visualizer' },
            state.value
        );
    }
});
```

This is how the React webviews know when to fetch new data.

### Public API:

The state machine is exported as a simple API:

```typescript
export const StateMachine = {
    initialize: () => stateService.start(),
    context: () => stateService.getSnapshot().context,
    state: () => stateService.getSnapshot().value,
    reset: () => stateService.send({ type: 'RESET_TO_VIEW_READY' }),
};

export function openView(type, viewLocation) {
    stateService.send({ type, viewLocation });
}
```

---

## 10. The RPC Layer — How Extension Talks to Webviews

**Files**:
- Extension side: `arazzo-designer-extension/src/RPCLayer.ts`
- Shared types: `arazzo-designer-core/src/state-machine-types.ts`
- Handler registration: `arazzo-designer-extension/src/rpc-managers/visualizer/rpc-handler.ts`
- Handler implementation: `arazzo-designer-extension/src/rpc-managers/visualizer/rpc-manager.ts`

### The Problem:

VS Code webviews (the panels that show the React UI) run in a sandboxed iframe. They CANNOT:
- Access the filesystem
- Import VS Code APIs
- Call the language server directly

So we need a **message-passing system** between the extension host (Node.js) and the webview (browser-like).

### The Solution: `vscode-messenger`

The extension uses the `vscode-messenger` library, which provides a typed RPC system over `postMessage`. Think of it like a phone line:
- **Extension side**: `Messenger` from `vscode-messenger` (Node.js)
- **Webview side**: `Messenger` from `vscode-messenger-webview` (browser)

### How it's set up:

#### 1. `RPCLayer.init()` — called once during activation

This registers all the **request and notification handlers** on the extension side:

```typescript
static init() {
    // When webview asks "what's the current state?", return the state machine context
    RPCLayer._messenger.onRequest(getVisualizerState, () => getContext());

    // Register all visualizer-specific RPC handlers (getArazzoModel, openView, etc.)
    registerVisualizerRpcHandlers(RPCLayer._messenger);

    // Register popup RPC handlers
    RPCLayer._messenger.onRequest(getPopupVisualizerState, () => getPopupContext());

    // Register VS Code interaction handlers (quick pick, input box, etc.)
    RPCLayer._messenger.onRequest(selectQuickPickItem, async (params) => {
        return window.showQuickPick(...);
    });
}
```

#### 2. `registerVisualizerRpcHandlers()` — in `rpc-handler.ts`

```typescript
export function registerVisualizerRpcHandlers(messenger: Messenger) {
    const rpcManager = new VisualizerRpcManager();
    messenger.onNotification(openView, (args) => rpcManager.openView(args));
    messenger.onRequest(getArazzoModel, (args) => rpcManager.getArazzoModel(args));
    // ... etc
}
```

#### 3. `VisualizerRpcManager` — in `rpc-manager.ts`

This is where the actual **business logic** lives:

```typescript
class VisualizerRpcManager implements VisualizerAPI {
    async openView(params) {
        stateMachineOpenView(params.type, params.location);
    }

    async getArazzoModel(params) {
        // This is the KEY function — it asks the LSP for the parsed Arazzo model
        const languageClient = getLanguageClient();
        const result = await languageClient.sendRequest('arazzo/getModel', { uri: params.uri });
        return { model: result };
    }
}
```

#### 4. `RPCLayer.create(webviewPanel)` — called when a new webview is created

This registers the webview panel with the messenger so it can receive messages:

```typescript
constructor(webViewPanel: WebviewPanel) {
    RPCLayer._messenger.registerWebviewPanel(webViewPanel);
    // Also subscribe to state machine transitions to broadcast to this panel
    StateMachine.service().onTransition((state) => {
        RPCLayer._messenger.sendNotification(stateChanged, ..., state.value);
    });
}
```

### RPC Message Types:

All RPC methods are defined in `arazzo-designer-core`:

| Message | Type | Direction | Purpose |
|---------|------|-----------|---------|
| `stateChanged` | Notification | Extension → Webview | State machine state changed |
| `getVisualizerState` | Request | Webview → Extension | Get current view, documentUri, identifier |
| `webviewReady` | Notification | Webview → Extension | React app has loaded and is ready |
| `getArazzoModel` | Request | Webview → Extension → LSP | Get the parsed Arazzo document model |
| `openView` | Notification | Webview → Extension | Navigate to a different view (e.g., click a workflow in Overview) |
| `selectQuickPickItem` | Request | Webview → Extension | Show a VS Code quick pick dialog |
| `showConfirmMessage` | Request | Webview → Extension | Show a VS Code confirm dialog |

---

## 11. The Webview — How React Panels Are Created

**File**: `arazzo-designer-extension/src/visualizer/webview.ts`

### What is a VS Code Webview?

A webview is like a browser tab embedded inside VS Code. It's an iframe that can render HTML, CSS, and JavaScript. The extension creates the webview panel and injects the React app's JavaScript into it.

### The `VisualizerWebview` Class:

```typescript
class VisualizerWebview {
    static currentPanel: VisualizerWebview | undefined;    // Overview panel
    static workflowPanel: VisualizerWebview | undefined;   // Workflow panel
    static readonly viewType = 'arazzo-designer.visualizer';
    private _panel: vscode.WebviewPanel;
    private _isWorkflowPanel: boolean;
}
```

Two static singletons — one for the Overview, one for the Workflow graph.

### How a panel is created:

1. **`new VisualizerWebview(viewColumn, isWorkflowPanel)`** is called from the state machine's `openWebPanel` service.

2. **A `WebviewPanel` is created** via VS Code API:
   ```typescript
   vscode.window.createWebviewPanel(
       'arazzo-designer.visualizer',  // viewType identifier
       'Arazzo Designer',             // title shown on the tab
       viewColumn,                    // ViewColumn.Beside = open next to current editor
       {
           enableScripts: true,           // Allow JavaScript
           retainContextWhenHidden: true,  // Don't destroy React state when tab is hidden
       }
   );
   ```

3. **The HTML content is set** — this is a minimal HTML page that loads the bundled React app:
   ```html
   <div id="root"></div>
   <script>
       visualizerWebview.renderWebview(
           document.getElementById("root"),
           "visualizer",
           ${this._isWorkflowPanel}   // true for Workflow panel, false for Overview
       );
   </script>
   ```
   The `visualizerWebview` global comes from the React bundle (`arazzo-designer-visualizer/build/Visualizer.js`) which is loaded via a `<script>` tag.

4. **RPCLayer.create(panel)** is called to register this panel for RPC messaging.

5. **Event listeners are set up**:
   - `onDidSaveTextDocument` → refresh the diagram when the Arazzo file is saved
   - `onDidChangeViewState` → update context keys when the panel gains/loses focus
   - `onDidDispose` → clean up when the panel is closed

### How does the React JS get loaded?

The `getComposerJSFiles()` utility function (in `src/util.ts`) finds the bundled JavaScript files from the `arazzo-designer-visualizer` package's `build/` folder and converts them to webview-safe URIs using `webview.asWebviewUri()`.

The built React app (`Visualizer.js`) is also copied to `arazzo-designer-extension/resources/jslibs/` during the build process.

---

## 12. VisualizerWebview and the webviewReady Handshake — Deep Dive

This section answers two specific questions that come up when reading the `openWebPanel` state machine service:

```typescript
VisualizerWebview.currentPanel = new VisualizerWebview(sharedColumn, false);
RPCLayer._messenger.onNotification(webviewReady, () => {
    resolve(true);
});
```

### 12.1 What is `VisualizerWebview`?

**File**: `arazzo-designer-extension/src/visualizer/webview.ts`

`VisualizerWebview` is a **wrapper class** around a VS Code `WebviewPanel`. A `WebviewPanel` is like an embedded browser tab inside VS Code — it shows an HTML/CSS/JS page (the React app) in an iframe next to your editor.

The class is defined roughly like this:

```typescript
class VisualizerWebview {
    // ── Static singletons ──────────────────────────────────────
    static currentPanel: VisualizerWebview | undefined;   // The Overview panel
    static workflowPanel: VisualizerWebview | undefined;  // The Workflow graph panel
    static readonly viewType = 'arazzo-designer.visualizer';

    // ── Instance properties ────────────────────────────────────
    private _panel: vscode.WebviewPanel;        // The actual VS Code panel
    private _isWorkflowPanel: boolean;          // true = Workflow, false = Overview

    constructor(viewColumn: ViewColumn, isWorkflowPanel: boolean) {
        this._isWorkflowPanel = isWorkflowPanel;

        // 1. Ask VS Code to create the webview panel
        this._panel = vscode.window.createWebviewPanel(
            VisualizerWebview.viewType,   // identifier string
            'Arazzo Designer',            // tab title
            viewColumn,                   // where to open it (Beside the editor)
            {
                enableScripts: true,            // allow JavaScript inside
                retainContextWhenHidden: true,  // keep React state if tab hidden
            }
        );

        // 2. Inject the HTML that loads the React bundle
        this._panel.webview.html = this.getHtmlContent();

        // 3. Register this panel with the RPC messenger so it can send/receive messages
        RPCLayer.create(this._panel);

        // 4. Wire up lifecycle events (save → refresh, focus change → context keys, close → cleanup)
        this.registerEventListeners();
    }
}
```

#### Why two static singletons?

There are exactly **two views** the extension can show:

| Singleton | View | What it shows | `isWorkflowPanel` |
|-----------|------|---------------|-------------------|
| `VisualizerWebview.currentPanel` | Overview | Lists all workflows in the open file | `false` |
| `VisualizerWebview.workflowPanel` | Workflow Graph | Detailed node-edge graph of one workflow | `true` |

Both can be open at the same time. The static references allow any part of the codebase (state machine, RPC layer, event handlers) to reach the panels without passing them through function arguments.

#### Panel lifecycle — why old panels are disposed before creating new ones:

```typescript
if (VisualizerWebview.currentPanel) {
    VisualizerWebview.currentPanel.dispose();   // ← destroys the old iframe
    VisualizerWebview.currentPanel = undefined;
}
VisualizerWebview.currentPanel = new VisualizerWebview(sharedColumn, false); // ← fresh iframe
```

Disposing and recreating ensures:
- The React app starts with a clean state (no stale data from the previous file)
- The RPC messenger gets a fresh panel registration
- Memory used by the old iframe is freed

#### `sharedColumn` — opening panels side-by-side:

```typescript
const sharedColumn =
    VisualizerWebview.currentPanel?.getWebview()?.viewColumn ??   // reuse Overview column
    VisualizerWebview.workflowPanel?.getWebview()?.viewColumn ??  // reuse Workflow column
    ViewColumn.Beside;                                            // default: next to editor
```

This logic says: "Open the new panel in the same column as any already-open visualizer panel, so they stay together. If none is open, use the column next to the code editor."

---

### 12.2 What is `RPCLayer._messenger.onNotification(webviewReady, ...)`?

This is the **"readiness handshake"** — a mechanism that prevents the state machine from racing ahead before the React app has finished loading.

#### The problem it solves:

When `new VisualizerWebview(...)` is called, VS Code creates the panel and injects the HTML. But the HTML just contains a `<script>` tag — the React app has not yet mounted. There is a gap of time (tens to hundreds of milliseconds) where:

- The webview iframe is loading
- The React JavaScript bundle is being parsed and executed
- React components are mounting
- The RPC messenger inside the webview is initializing

If the state machine continued immediately to `viewFinding` and sent a `stateChanged` notification, the React app would miss it (it isn't listening yet). The user would see a blank panel.

#### The solution — notifications as a synchronization signal:

**`webviewReady`** is a **notification message type** defined in `arazzo-designer-core`:

```typescript
// arazzo-designer-core/src/state-machine-types.ts
export const webviewReady: NotificationType<void> = { method: 'webviewReady' };
```

It's like a named signal with no payload. Think of it as a flag: "I exist and I'm ready."

The flow works like this:

```
State machine: openWebPanel service starts
    │
    │  new VisualizerWebview(...)  ← creates panel, injects HTML
    │                                  [panel is loading... React is starting...]
    │
    │  RPCLayer._messenger.onNotification(webviewReady, () => resolve(true))
    │  ↑ "I will wait here. Call me when the React app is ready."
    │
    │  [Promise stays unresolved — state machine is PAUSED in viewLoading]
    │
    ▼
React app (inside the iframe):
    │
    │  useEffect(() => {
    │      rpcClient.webviewReady();   // sends 'webviewReady' notification → postMessage
    │  }, []);
    │
    ↓  postMessage crosses the iframe boundary
    │
Extension host receives the notification:
    │
    │  onNotification callback fires → resolve(true)
    │
    ▼
State machine Promise resolves → transitions from viewLoading to viewFinding
```

#### Why `onNotification` not `onRequest`?

- A **notification** is fire-and-forget — no response is expected. "I'm ready" doesn't need a reply.
- A **request** expects a response. The webview doesn't need one here.
- `onNotification` is the right tool for one-way lifecycle signals.

#### Full message type anatomy:

```typescript
// The message type object (defined in arazzo-designer-core)
export const webviewReady: NotificationType<void> = { method: 'webviewReady' };
//                          ↑ from vscode-messenger   ↑ the JSON-RPC method name string

// Extension side — registers a handler (one-time listener in this case):
RPCLayer._messenger.onNotification(webviewReady, () => {
    resolve(true);  // unpauses the Promise
});

// Webview side — sends the signal:
rpcClient.webviewReady();
// which internally calls:
this._messenger.sendNotification(webviewReady, HOST_EXTENSION);
```

#### Is `onNotification` called every time? What about multiple panels?

`onNotification` registers a **persistent** handler, not a one-time one. Every future `webviewReady` from any panel will trigger this callback. This is generally fine because:
- Each time `openWebPanel` is called, the old panel is disposed first
- Only one panel of each type exists at a time
- The `resolve(true)` call on an already-resolved Promise is a no-op

However, this is a subtle design point: the first `webviewReady` received (from either panel type) will resolve the Promise and advance the state machine.

---

### 12.3 Where These Two Pieces Fit in the Overall Flow

Here's a focused slice of the end-to-end flow that shows exactly where these two concepts operate:

```
User clicks "Visualize"
    │
    ▼
State machine enters viewLoading
    │
    │  openWebPanel service starts
    │
    ├─→ VisualizerWebview.workflowPanel?.dispose()     ← kill old panel if any
    │
    ├─→ VisualizerWebview.workflowPanel =              ← create new panel wrapper
    │       new VisualizerWebview(sharedColumn, true)
    │           │
    │           ├─ vscode.window.createWebviewPanel()  ← VS Code creates the iframe
    │           ├─ panel.webview.html = ...            ← inject HTML + React bundle script
    │           └─ RPCLayer.create(panel)              ← register panel with messenger
    │
    ├─→ RPCLayer._messenger.onNotification(            ← "call me when React is ready"
    │       webviewReady,
    │       () => resolve(true)
    │   )
    │
    │   [STATE MACHINE PAUSED — Promise unresolved]
    │
    │   ... iframe loads ... React bundle executes ... components mount ...
    │
    ├─← React: rpcClient.webviewReady()                ← "I'm ready!" postMessage
    │
    ├─→ onNotification callback fires → resolve(true)  ← Promise resolves
    │
    ▼
State machine exits viewLoading → enters viewFinding
    │
    [continues normally — sendNotification(stateChanged) now reaches a live React app]
```

---

## 13. The Visualizer (React App) — What Renders Inside the Webview

**Directory**: `arazzo-designer-visualizer/src/`

### Entry Point: `index.tsx`

```typescript
export function renderWebview(target, mode, isWorkflowPanel) {
    (window as any).__isWorkflowPanel = isWorkflowPanel || false;
    const root = createRoot(target);
    root.render(
        <VisualizerContextProvider>
            <QueryClientProvider client={queryClient}>
                <Visualizer mode={mode} />
            </QueryClientProvider>
        </VisualizerContextProvider>
    );
}
```

This function is called from the HTML injected by the extension. It:
1. Stores `isWorkflowPanel` as a global (so MainPanel knows if it's the Workflow or Overview panel)
2. Creates a React root
3. Wraps everything in a `VisualizerContextProvider` (provides the RPC client to all components)
4. Wraps in `QueryClientProvider` (for React Query caching)
5. Renders the `Visualizer` component

### Context Provider: `Context.tsx`

```typescript
export function VisualizerContextProvider({ children }) {
    const [visualizerState] = useState({
        rpcClient: new RpcClient(),  // ← creates the RPC connection
    });
    return <Context.Provider value={visualizerState}>{children}</Context.Provider>;
}
```

The `RpcClient` (from `arazzo-designer-rpc-client`) is created here. It initializes the `vscode-messenger-webview` `Messenger` which connects to the extension host's messenger.

### Visualizer.tsx — The Root Component

```typescript
export function Visualizer({ mode }) {
    const { rpcClient } = useVisualizerContext();
    const [state, setState] = useState('initialize');

    // Listen for state machine changes from the extension
    rpcClient?.onStateChanged((newState) => setState(newState));

    // Tell the extension "I'm ready!"
    useEffect(() => { rpcClient.webviewReady(); }, []);

    // When state is { ready: "viewReady" } → show MainPanel
    // Otherwise → show loading spinner
}
```

The key moment: `rpcClient.webviewReady()` sends the `webviewReady` notification to the extension. This is what the state machine's `openWebPanel` service is waiting for before resolving.

### MainPanel.tsx — The View Router

```typescript
const MainPanel = () => {
    const isWorkflowPanel = (window as any).__isWorkflowPanel;

    const fetchContext = () => {
        rpcClient.getVisualizerState().then((machineView) => {
            const viewToRender = isWorkflowPanel ? machineView.view : MACHINE_VIEW.Overview;
            switch (viewToRender) {
                case MACHINE_VIEW.Overview:
                    setViewComponent(<Overview fileUri={machineView.documentUri} />);
                    break;
                case MACHINE_VIEW.Workflow:
                    setViewComponent(<WorkflowView
                        fileUri={machineView.documentUri}
                        workflowId={machineView.identifier}
                    />);
                    break;
            }
        });
    };

    // Listen for state changes
    rpcClient?.onStateChanged(() => fetchContext());

    // Initial fetch
    useEffect(() => { fetchContext(); }, []);
};
```

This component:
1. Calls `rpcClient.getVisualizerState()` to ask the extension "what should I show?"
2. The extension returns the state machine context: `{ view, documentUri, identifier }`
3. Based on `isWorkflowPanel`, it renders either `<Overview>` or `<WorkflowView>`
4. Every time the state machine changes, it re-fetches and potentially re-renders

### Overview Component

The Overview page shows:
- The Arazzo document title, version, description
- A list of source descriptions (OpenAPI specs)
- A list of all workflows with their steps
- Click a workflow → triggers `rpcClient.getVisualizerRpcClient().openView(...)` → sends an `openView` notification to the extension → state machine opens the Workflow view

### WorkflowView Component

The Workflow graph page:
- Uses **React Flow** (`@xyflow/react`) to render an interactive node-edge graph
- Each step is a node, connections between steps are edges
- Has a side panel showing step details when a node is clicked
- Fetches the Arazzo model via `rpcClient.getVisualizerRpcClient().getArazzoModel()`

---

## 14. The RPC Client — How React Talks Back to the Extension

**Files**:
- `arazzo-designer-rpc-client/src/RpcClient.ts` — General RPC client
- `arazzo-designer-rpc-client/src/rpc-clients/visualizer/rpc-client.ts` — Visualizer-specific RPC client

### The General RpcClient:

```typescript
class RpcClient {
    private messenger: Messenger;  // from vscode-messenger-webview
    private _visualizer: VisualizerAPI;

    constructor() {
        this.messenger = new Messenger(vscode);  // vscode = acquireVsCodeApi()
        this.messenger.start();
        this._visualizer = new VisualizerRpcClient(this.messenger);
    }
}
```

The `vscode` global (`acquireVsCodeApi()`) is the webview's only way to communicate with the extension host. The `Messenger` wraps it to provide typed request/response patterns.

### The VisualizerRpcClient:

```typescript
class VisualizerRpcClient implements VisualizerAPI {
    openView(params) {
        this._messenger.sendNotification(openView, HOST_EXTENSION, params);
    }

    getArazzoModel(params) {
        return this._messenger.sendRequest(getArazzoModel, HOST_EXTENSION, params);
    }
}
```

Each method maps to an RPC message. `sendNotification` = fire-and-forget. `sendRequest` = send and wait for response.

---

## 15. Data Flow — How the Arazzo Model Is Fetched

This is the most important data flow in the entire extension. Here's the full chain:

```
React Component (e.g., Overview)
    │
    │  rpcClient.getVisualizerRpcClient().getArazzoModel({ uri: fileUri })
    │
    ▼
VisualizerRpcClient (webview side)
    │
    │  messenger.sendRequest(getArazzoModel, HOST_EXTENSION, params)
    │  → postMessage to extension host
    │
    ▼
RPCLayer (extension side) — registered in rpc-handler.ts
    │
    │  messenger.onRequest(getArazzoModel, (args) => rpcManager.getArazzoModel(args))
    │
    ▼
VisualizerRpcManager (extension side)
    │
    │  languageClient.sendRequest('arazzo/getModel', { uri: params.uri })
    │  → sends JSON-RPC request over stdio to the Go binary
    │
    ▼
Go Language Server (arazzo-designer-lsp)
    │
    │  Handle("arazzo/getModel") → parser.Parse(content) → return ArazzoDocument
    │
    ▼
Response flows back through the entire chain:
    Go binary → stdio → LanguageClient → RpcManager → Messenger → postMessage → React
```

**Total hops**: React → postMessage → Extension → stdio → Go binary → stdio → Extension → postMessage → React

This is why the architecture has so many layers — it bridges three different runtimes (browser webview, Node.js extension host, native Go binary).

---

## 16. End-to-End Flow — From File Open to Workflow Visualization

Let's trace the complete flow when a user opens an Arazzo file and clicks "Visualize" on a workflow:

### Step 1: User opens `workflow.arazzo.yaml`

1. VS Code matches the `.arazzo.yaml` extension → assigns `arazzo-yaml` language ID immediately (**Mechanism 1** from Section 5) — this happens before any extension code runs
2. Because the language is `arazzo-yaml`, VS Code fires **`onLanguage:arazzo-yaml`** (listed in `activationEvents`) → extension `activate()` runs if not already active  
   *(Note: if the file was plain `workflow.yaml`, it would fire `onLanguage:yaml` instead — the extension still activates, then Mechanism 2 below upgrades the language)*
3. `onDidChangeActiveTextEditor` fires → `checkDocumentForOpenAPI()` runs (**Mechanism 2** from Section 5)
4. Reads first 10 lines, finds `arazzo: 1.0.0` with regex `/\barazzo\s*:\s*\d+\.\d+\.\d+/i` → confirms it's Arazzo
5. Sets `isFileArazzo = true` → eye icon appears in editor title bar
6. Calls `setTextDocumentLanguage(doc, 'arazzo-yaml')` (redundant if already `arazzo-yaml` by extension, but necessary for plain `.yaml` files) → LSP attaches

### Step 2: LSP provides Code Lens

1. VS Code asks LSP: "What Code Lenses for this document?"
2. Go LSP parses the file, finds workflows
3. Returns a "Visualize" Code Lens for each workflow, each pointing to `arazzo.openDesigner`
4. VS Code renders the clickable "Visualize" text above each `workflowId:`

### Step 3: User clicks "Visualize" on a workflow

1. VS Code executes `arazzo.openDesigner` with `{ workflowId, uri }`
2. Extension handler calls `StateMachine.reset()` then `openView(OPEN_VIEW, { view: Workflow, documentUri, identifier: workflowId })`
3. State machine transitions: `viewReady → OPEN_VIEW → viewLoading`
4. Context is updated: `{ view: "Arazzo Workflow", documentUri: "file:///...", identifier: "create_get_delete_pet" }`

### Step 4: Webview panel is created

1. `openWebPanel` service runs
2. Finds `sharedColumn` (Beside the editor)
3. Disposes any existing workflow panel
4. Creates `new VisualizerWebview(sharedColumn, true)`
5. The WebviewPanel is created with an HTML page that loads the React bundle
6. `RPCLayer.create(panel)` registers it for RPC messaging
7. Service waits for `webviewReady` notification

### Step 5: React app boots up

1. Browser loads the HTML
2. `<script>` runs `renderWebview(root, "visualizer", true)`
3. React mounts: `VisualizerContextProvider` → creates RpcClient → `Visualizer` component
4. `Visualizer` calls `rpcClient.webviewReady()` → sends notification to extension
5. Extension's `openWebPanel` promise resolves

### Step 6: State machine continues

1. `viewLoading` → `viewFinding` (findView resolves the location)
2. `viewFinding` → `viewStacking` (pushes to navigation history)
3. `viewStacking` → `viewNavigated` → `viewReady`
4. Each transition broadcasts `stateChanged` to webviews

### Step 7: React fetches and renders data

1. `MainPanel.fetchContext()` runs (triggered by stateChanged)
2. Calls `rpcClient.getVisualizerState()` → gets `{ view: Workflow, documentUri, identifier }`
3. Since `isWorkflowPanel = true`, renders `<WorkflowView fileUri=... workflowId=...>`
4. `WorkflowView.fetchData()` calls `rpcClient.getVisualizerRpcClient().getArazzoModel({ uri })`
5. This goes through the RPC chain → Extension → LSP → parsed model comes back
6. React Flow builds the node-edge graph
7. User sees the workflow visualization!

### Step 8: User clicks eye icon on another Arazzo file

1. `ArazzoDesigner.openAPIDesigner` command fires
2. `openView(OPEN_VIEW, { view: Overview, documentUri: newFile })`
3. State machine: `viewReady → OPEN_VIEW → viewLoading`
4. `openWebPanel`: Disposes existing Overview panel, creates new one
5. New webview boots, fetches context, renders Overview for the new file

---

## 17. File Location Reference

Quick reference for finding every major piece of code:

### Extension (TypeScript — Node.js side)

| File | Purpose |
|------|---------|
| `arazzo-designer-extension/src/extension.ts` | Main activation, LSP init, command registration |
| `arazzo-designer-extension/src/stateMachine.ts` | XState state machine for navigation |
| `arazzo-designer-extension/src/RPCLayer.ts` | RPC message handler setup |
| `arazzo-designer-extension/src/visualizer/webview.ts` | WebviewPanel creation and HTML injection |
| `arazzo-designer-extension/src/visualizer/activate.ts` | Registers the "Open API Designer" command |
| `arazzo-designer-extension/src/rpc-managers/visualizer/rpc-handler.ts` | Registers visualizer RPC handlers |
| `arazzo-designer-extension/src/rpc-managers/visualizer/rpc-manager.ts` | Implements visualizer RPC methods (getArazzoModel, openView) |
| `arazzo-designer-extension/src/Context.ts` | Global singleton holding ExtensionContext |
| `arazzo-designer-extension/src/constants/index.ts` | Command IDs and context key names |
| `arazzo-designer-extension/src/history/activator.ts` | Navigation history stack |
| `arazzo-designer-extension/src/mcp/mcpServerRunner.ts` | MCP server lifecycle: spawn CLI binary, write mcp.json, user notifications |
| `arazzo-designer-extension/package.json` | Extension manifest (commands, menus, activation events) |

### Language Server (Go)

| File | Purpose |
|------|---------|
| `arazzo-designer-lsp/main.go` | Entry point, stdio JSON-RPC setup |
| `arazzo-designer-lsp/server/server.go` | LSP handler dispatch (initialize, didOpen, etc.) |
| `arazzo-designer-lsp/codelens/codelens.go` | "Visualize" Code Lens for each workflow |
| `arazzo-designer-lsp/completion/completion.go` | Context-aware autocompletion |
| `arazzo-designer-lsp/diagnostics/diagnostics.go` | Error checking and squiggly underlines |
| `arazzo-designer-lsp/server/hover.go` | Hover info for operationId |
| `arazzo-designer-lsp/server/definition.go` | Go-to-definition for operationId |
| `arazzo-designer-lsp/parser/parser.go` | Arazzo YAML/JSON parser |
| `arazzo-designer-lsp/parser/ast.go` | Arazzo document AST types |
| `arazzo-designer-lsp/navigation/indexer.go` | OpenAPI operation indexing |
| `arazzo-designer-lsp/navigation/discovery.go` | Find nearby OpenAPI files |
| `arazzo-designer-lsp/navigation/parser.go` | Parse OpenAPI files for operations |

### Shared Types (TypeScript)

| File | Purpose |
|------|---------|
| `arazzo-designer-core/src/state-machine-types.ts` | MACHINE_VIEW, EVENT_TYPE, RPC message definitions |
| `arazzo-designer-core/src/rpc-types/visualizer/types.ts` | Request/response interfaces |
| `arazzo-designer-core/src/rpc-types/visualizer/rpc-type.ts` | RPC method name constants |
| `arazzo-designer-core/src/rpc-types/visualizer/index.ts` | VisualizerAPI interface |

### React Visualizer (TypeScript/React — Browser side)

| File | Purpose |
|------|---------|
| `arazzo-designer-visualizer/src/index.tsx` | Entry point: `renderWebview()` |
| `arazzo-designer-visualizer/src/Context.tsx` | React context provider with RpcClient |
| `arazzo-designer-visualizer/src/Visualizer.tsx` | Root component, listens for state changes |
| `arazzo-designer-visualizer/src/MainPanel.tsx` | View router (Overview vs Workflow) |
| `arazzo-designer-visualizer/src/views/Overview/Overview.tsx` | Overview page component |
| `arazzo-designer-visualizer/src/views/WorkflowView/WorkflowView.tsx` | Workflow graph component |

### RPC Client (TypeScript — Browser side)

| File | Purpose |
|------|---------|
| `arazzo-designer-rpc-client/src/RpcClient.ts` | General RPC client (messenger setup) |
| `arazzo-designer-rpc-client/src/rpc-clients/visualizer/rpc-client.ts` | Visualizer-specific RPC methods |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        VS Code                                   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Extension Host (Node.js)                      │   │
│  │                                                            │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │ extension.ts │  │ stateMachine │  │  RPCLayer.ts │    │   │
│  │  │  (activate)  │  │  (XState)    │  │  (Messenger) │    │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │   │
│  │         │                  │                  │            │   │
│  │         │         ┌───────┴────────┐         │            │   │
│  │         │         │ rpc-manager.ts │         │            │   │
│  │         │         │ (getArazzoModel│←────────┘            │   │
│  │         │         │  openView)     │                      │   │
│  │         │         └───────┬────────┘                      │   │
│  │         │                 │                                │   │
│  │         │    ┌────────────┴──────────────┐                │   │
│  │         │    │ LanguageClient (LSP)      │                │   │
│  │         │    │ vscode-languageclient      │                │   │
│  │         │    └────────────┬──────────────┘                │   │
│  └─────────┼────────────────┼────────────────────────────────┘   │
│            │                │ stdio (JSON-RPC)                    │
│            │    ┌───────────┴───────────────┐                    │
│            │    │  Go LSP Binary            │                    │
│            │    │  arazzo-language-server    │                    │
│            │    │  • CodeLens               │                    │
│            │    │  • Completion             │                    │
│            │    │  • Diagnostics            │                    │
│            │    │  • Hover / Definition     │                    │
│            │    │  • arazzo/getModel        │                    │
│            │    └───────────────────────────┘                    │
│            │                                                      │
│  ┌─────────┴────────────────────────────────────────────────┐   │
│  │              Webview (Browser iframe)                       │   │
│  │                                                            │   │
│  │  ┌──────────────┐    ┌───────────────────────────────┐   │   │
│  │  │  RpcClient   │    │  React App (Visualizer)       │   │   │
│  │  │  (Messenger) │◄──►│  • Visualizer.tsx             │   │   │
│  │  │              │    │  • MainPanel.tsx               │   │   │
│  │  └──────────────┘    │  • Overview.tsx                │   │   │
│  │                       │  • WorkflowView.tsx           │   │   │
│  │                       └───────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Communication: Extension ◄──postMessage──► Webview               │
│                 Extension ◄──stdio──► Go binary                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary

The Arazzo Designer extension is a layered system with three runtimes:

1. **Go binary** (Language Server) — does the heavy lifting: parsing, validation, completions, Code Lens
2. **TypeScript extension** (Node.js) — orchestrates everything: spawns the LSP, manages the state machine, creates webviews, routes RPC messages
3. **React app** (Browser webview) — renders the visual UI: Overview page, Workflow graph

The `vscode-messenger` library is the glue between the extension and webviews. The `vscode-languageclient` library is the glue between the extension and the Go LSP. The `arazzo-designer-core` package is the shared contract that keeps all three in sync.

Every user action follows a predictable path:
**User action → VS Code command → State machine event → Webview panel opens → React boots → Fetches data via RPC → RPC goes to extension → Extension asks LSP → LSP parses and returns → Data flows back → React renders**

---

## 18. The CLI Binaries — What They Are and How to Build Them

**Directory**: `workspaces/arazzo/arazzo-designer-cli/`

This Go module produces **two separate binaries** from two separate `main` packages. Here is what each one is, whether the extension needs it, and how to build it.

---

### 18.1 The Three Binaries at a Glance

| Binary | Source | Used by extension? | Purpose |
|--------|--------|--------------------|---------|
| `arazzo-designer-cli.exe` | `cmd/main.go` | **YES** — required | MCP server. The extension spawns this to expose Arazzo workflows as MCP tools for VS Code Copilot. |
| `arazzo-cli.exe` | `cmd/main.go` | No | The exact same program as above, just built with a different output name. The `Readme.md` in the CLI directory uses this name in its build instructions, but the extension looks for `arazzo-designer-cli.exe`, so this name is useless for the extension. Think of it as the "standalone / manual" name. |
| `test_runner.exe` | `test_runner/main.go` | No | A developer-only utility. Directly executes Arazzo workflows from the command line and prints results as JSON. Useful for testing workflows during development without needing an MCP client or VS Code at all. |

**Bottom line: you only need `arazzo-designer-cli.exe` for the extension to work.** The other two are never loaded by the extension.

---

### 18.2 What `arazzo-designer-cli` Actually Does (MCP Server)

`cmd/main.go` exposes a single sub-command: `serve`. It:

1. Reads an Arazzo YAML file you point it at (`-f` flag)
2. Starts an HTTP server on a configurable port (`-p`, default 8080)
3. Registers each Arazzo workflow as an **MCP tool** so that VS Code Copilot (or any other MCP client) can call `arazzo.executeWorkflow` to run them
4. Accepts auth credentials (`--bearer-token`, `--api-key`, `--api-key-header`) that are forwarded with every HTTP request it makes on behalf of the workflows

The extension's `mcpServerRunner.ts` spawns this binary, waits for it to start, then writes a `.vscode/mcp.json` pointing Copilot at the running server.

---

### 18.3 What `test_runner` Does (Dev Utility)

`test_runner/main.go` is a completely different entry point. It:

1. Takes an Arazzo file path, an optional workflow ID, and optional JSON inputs on the command line
2. Directly calls the internal `runner` package (same engine the MCP server uses)
3. Prints the full execution result as pretty-printed JSON to stdout
4. Exits with a non-zero code if any non-`expect_error_`-prefixed workflow fails

It is purely for development — run it to quickly verify that a workflow file executes correctly without needing VS Code or Copilot.

---

### 18.4 How to Build `arazzo-designer-cli.exe`

**Prerequisites**: Go 1.21+ installed and on your `PATH`. Verify with `go version`.

#### Step 1 — Navigate to the CLI directory

```powershell
cd workspaces\arazzo\arazzo-designer-cli
```

#### Step 2 — Download dependencies (first time only)

```powershell
go mod download
```

#### Step 3 — Build the binary

```powershell
# Produces arazzo-designer-cli.exe in the current directory
go build -o arazzo-designer-cli.exe ./cmd/
```

#### Step 4 — Copy it to where the extension expects it

The extension's `mcpServerRunner.ts` resolves the binary from the extension's `cli/` folder:

```powershell
copy arazzo-designer-cli.exe ..\arazzo-designer-extension\cli\arazzo-designer-cli.exe
```

After copying, the extension will find it automatically — no configuration needed.

---

### 18.5 Building for Other Platforms

Go cross-compilation is done by setting `GOOS` and `GOARCH` environment variables. The extension's `mcpServerRunner.ts` expects these exact file names on non-Windows platforms:

| Platform | Expected filename | Build command |
|----------|-------------------|---------------|
| Windows (x64) | `arazzo-designer-cli.exe` | `go build -o arazzo-designer-cli.exe ./cmd/` |
| macOS Intel | `arazzo-designer-cli-darwin-amd64` | `GOOS=darwin GOARCH=amd64 go build -o arazzo-designer-cli-darwin-amd64 ./cmd/` |
| macOS Apple Silicon | `arazzo-designer-cli-darwin-arm64` | `GOOS=darwin GOARCH=arm64 go build -o arazzo-designer-cli-darwin-arm64 ./cmd/` |
| Linux (x64) | `arazzo-designer-cli-linux-amd64` | `GOOS=linux GOARCH=amd64 go build -o arazzo-designer-cli-linux-amd64 ./cmd/` |

On PowerShell (Windows), set env vars inline:

```powershell
# 1. Set variables for Mac (Intel) and build
$env:GOOS='darwin'; $env:GOARCH='amd64'
go build -o cli/arazzo-designer-cli-darwin-amd64 ./cmd/

# 2. Set variables for Mac (Apple Silicon / M1 / M2) and build
$env:GOARCH='arm64'
go build -o cli/arazzo-designer-cli-darwin-arm64 ./cmd/

```
Later set it back to windows
```powershell
$env:GOOS='windows'; $env:GOARCH='amd64'
```
---

### 18.6 Building `test_runner.exe` (Optional — Dev Only)

If you want the test runner for local workflow debugging:

```powershell
# From workspaces\arazzo\arazzo-designer-cli
go build -o test_runner.exe ./test_runner/
```

Run it like this:

```powershell
# Run all workflows in a file
.\test_runner.exe path\to\workflow.arazzo.yaml

# Run a specific workflow
.\test_runner.exe path\to\workflow.arazzo.yaml my_workflow_id

# Run with JSON inputs
.\test_runner.exe path\to\workflow.arazzo.yaml my_workflow_id '{"petId": "123"}'
```

This does **not** need to be copied anywhere — it is never referenced by the extension.


---
MCP server implementation starts from here onwards
---

## 19. The MCP Server Runner — The Play Button

**File**: `arazzo-designer-extension/src/mcp/mcpServerRunner.ts`

This section explains the play button (`$(play)` icon) in the editor title bar, how it starts the MCP server, and two subtle bugs that were found and fixed during development.

---

### 19.1 What Is the Play Button?

When you have an Arazzo file open, a play icon (▶) appears in the editor title bar. It is registered in `package.json`:

```json
{
    "when": "isFileArazzo",
    "command": "arazzo.startMCPServer",
    "group": "navigation"
}
```

The `when: "isFileArazzo"` clause means it only appears when `checkDocumentForOpenAPI()` has confirmed the active editor contains an Arazzo file. Clicking it triggers `arazzo.startMCPServer`, which calls `startMCPServer()` in `mcpServerRunner.ts`.

---

### 19.2 What Happens When You Click Play

```
User clicks ▶ play button
    │
    ├── 1. Get/create the "Arazzo MCP Server" output channel
    │      output.show(true)  ← shows the output panel, preserveFocus=true
    │
    ├── 2. Kill any previously running MCP server
    │      mcpServerProcess.kill()  ← sends SIGTERM to old Go binary
    │
    ├── 3. Determine the Arazzo file path
    │      From the command args, or the active editor
    │
    ├── 4. Validate it's an Arazzo file
    │      Check filename or content for `arazzo: X.X.X`
    │
    ├── 5. Find the Go CLI binary
    │      extensionPath/cli/arazzo-designer-cli.exe  (platform-specific name)
    │
    ├── 6. Pick a random port (18080–19079)
    │
    ├── 7. Write .vscode/mcp.json automatically
    │      Adds/updates the "arazzo" server entry with the URL
    │      No user prompt — this happens every time
    │
    ├── 8. Spawn the Go binary
    │      arazzo-designer-cli serve -f <file> -p <port>
    │
    ├── 9. Pipe stdout/stderr to the output channel
    │
    └── 10. After 1.5 seconds:
            ├── Show info message:
            │   "Arazzo MCP server started. Running on http://localhost:<port>/mcp.
            │    Config added to mcp.json."
            │
            └── Show follow-up message:
                "Try your Arazzo workflows with GitHub Copilot." [Try Now]
                    │
                    └── If clicked → opens Copilot chat with pre-filled prompt:
                        "execute the workflow <first workflowId from the file>"
                        (isPartialQuery=true — user must press Enter to send)
```

---

### 19.3 The `mcp.json` Configuration

The `writeMcpConfig()` function creates or updates `.vscode/mcp.json` in the first workspace folder. This is the file VS Code reads to discover MCP servers for Copilot:

```json
{
    "servers": {
        "arazzo": {
            "type": "http",
            "url": "http://localhost:18342/mcp"
        }
    }
}
```

The server key `"arazzo"` is what VS Code Copilot uses to namespace tool names. Every tool from this server will be prefixed `mcp_arazzo_` in the Copilot tool list (e.g., `mcp_arazzo_list_workflows`, `mcp_arazzo_ApplyForLoanAtCheckout`). This prefix is added by VS Code Copilot itself — it is not controlled by the extension or the Go binary.

---

### 19.4 Process Lifecycle and Cleanup

The module keeps a single `mcpServerProcess` variable pointing to the current `ChildProcess`. When the play button is clicked again:
1. The old process is killed with `.kill()`
2. A new process is spawned
3. `mcp.json` is rewritten with the new port

When the extension deactivates (VS Code closes), `disposeMCPServer()` is called from `deactivate()` in `extension.ts`, which kills the running server.

**Important**: On Windows, orphaned `arazzo-designer-cli.exe` processes may survive if the Extension Development Host is restarted via F5 (the module variable resets to `undefined`, losing the process reference). To clean up:

```powershell
taskkill /F /IM arazzo-designer-cli.exe
```

---

### 19.5 Bugs Found and Fixed

Two subtle bugs were discovered and fixed. Understanding them helps explain why the code is written the way it is.

#### Bug 1 — Play Button Disappearing After Click

**Symptom**: Click ▶ → server starts → ▶ button vanishes. Switch to another tab and back — button reappears.

**Root Cause**: `output.show(true)` opens the output panel. Even with `preserveFocus=true`, VS Code fires the `onDidChangeActiveTextEditor` event with `editor = undefined` (the output panel is not a text editor). The old `checkDocumentForOpenAPI()` handler was:

```typescript
// OLD (buggy)
if (!document) {
    vscode.commands.executeCommand('setContext', 'isFileArazzo', undefined);  // ← clears the flag!
    return;
}
```

Clearing `isFileArazzo` hides the play button because its `when` clause is `"isFileArazzo"`. When the user clicks back to the YAML tab, the editor change event fires again with the real document, restoring the flag.

**Fix**: Don't clear context keys when there's no document — just return. The keys will be re-evaluated when a real editor regains focus:

```typescript
// FIXED
if (!document) {
    // Keep existing context keys — they will be re-evaluated when a real editor regains focus.
    return;
}
```

#### Bug 2 — "Server Started" Message Not Showing on First Click

**Symptom**: First click of ▶ → output log shows server started, but no info message appears. Second click → message appears correctly.

**Root Cause**: A classic **async race condition** between the old process's `on('exit')` callback and the new process spawn.

Timeline of events:

```
Click ▶ (first time, previous server is running)
    │
    ├── mcpServerProcess.kill()     ← send SIGTERM to old process
    ├── mcpServerProcess = undefined ← immediate, synchronous
    │
    ├── [... validation, port selection, mcp.json write ...]
    │
    ├── mcpServerProcess = spawn(...)  ← NEW process assigned
    │
    │   [Old process finishes dying — on('exit') fires ASYNCHRONOUSLY]
    │   │
    │   └── mcpServerProcess = undefined  ← WIPES the NEW process reference!
    │
    ├── setTimeout fires after 1.5s
    │   │
    │   └── if (!mcpServerProcess) return  ← undefined, so NO MESSAGE
    │
    ▼
    User sees nothing.
```

The old code:
```typescript
// OLD (buggy)
mcpServerProcess.on('exit', (code) => {
    mcpServerProcess = undefined;  // ← unconditionally clears the variable
});
```

**Fix**: Guard the callback with a local reference so it only clears `mcpServerProcess` if it's still the same process:

```typescript
// FIXED
const thisProcess = mcpServerProcess;  // capture reference at spawn time

mcpServerProcess.on('exit', (code) => {
    // Only clear if this is still the active process — a newer spawn
    // may have already replaced mcpServerProcess.
    if (mcpServerProcess === thisProcess) {
        mcpServerProcess = undefined;
    }
});
```

The second click always worked because there was no prior `on('exit')` racing — the first click's process was the only one, and by the second click it had already exited and been cleaned up.

---

### 19.6 How Tools Get Named in Copilot

The Go MCP server (`internal/mcpserver/server.go`) registers each workflow as a tool. The `sanitizeToolName()` function converts the `workflowId` to a valid MCP tool name by replacing `-`, spaces, and `.` with `_`. VS Code Copilot then prefixes every tool with `mcp_<server-key>_`:

```
Arazzo workflowId:  "ApplyForLoanAtCheckout"
Go tool name:       "ApplyForLoanAtCheckout"
mcp.json key:       "arazzo"
Copilot shows:      "mcp_arazzo_ApplyForLoanAtCheckout"
```

Additionally, two utility tools are always registered:
- `list_workflows` — lists all workflow IDs in the loaded document
- `get_workflow_details` — returns step/parameter/output info for a specific workflow

These appear in Copilot as `mcp_arazzo_list_workflows` and `mcp_arazzo_get_workflow_details`.