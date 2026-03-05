# WSO2 API TryIt

**WSO2 API TryIt** is a Visual Studio Code extension for composing, sending, and organizing HTTP API requests — stored as human-readable [Hurl](https://hurl.dev) files alongside your code.

---

## Features

- **API Explorer** — sidebar panel for organizing requests into named collections
- **Hurl file format** — requests are stored as `.hurl` files with structured metadata annotations
- **Auto-detection** — automatically activates when you open a workspace containing annotated `.hurl` files
- **Live request execution** — send requests directly from the editor and inspect responses
- **Hurl runner** — run entire collections via the `hurl` CLI with pass/fail results
- **Import workflows** — import from cURL, Hurl snippets, or Hurl collection payloads
- **Assertions** — define and persist HTTP response assertions alongside each request

---

## Getting Started

### 1. Open a workspace

Open any folder in VS Code. The extension activates automatically on startup.

If the folder contains `.hurl` files with `# @collectionName` or `# @name` annotations, the **API Explorer** sidebar opens automatically and loads your collections.

### 2. Create a new collection

Click the **+** icon in the API Explorer toolbar and choose **New Collection**. You will be prompted to name the collection and choose a save location. A new `.hurl` file is created.

### 3. Add requests

- Click the **+** button next to a collection name to add a new request.
- Configure the method, URL, headers, query parameters, and body in the TryIt panel.
- Click **Save** to write the request back to the `.hurl` file.

### 4. Send a request

Select any request in the API Explorer and click **Send** in the TryIt panel. The response body, status code, and headers are displayed inline.

### 5. Run a collection

Click the **Run All** (▶) button in the API Explorer toolbar to execute all requests in all collections using the `hurl` CLI. Results are shown with pass/fail status per request and per file.

---

## Hurl File Format

Requests are stored as standard `.hurl` files. WSO2 API TryIt extends the format with metadata comment annotations to support named requests and collection grouping.

### Annotations

| Annotation | Scope | Description |
|---|---|---|
| `# @collectionName <name>` | File header | Display name of the collection in the API Explorer |
| `# @name <name>` | Per request | Display name of the individual request |
| `# @id <id>` | Per request | Stable identifier used to locate the request on save |

### Example — single request

```hurl
# @collectionName Tester

# @name Tester
GET https://example.com/api/health

HTTP 200
```

### Example — multiple requests in one file

A single `.hurl` file can contain multiple requests. Each request block is separated by a blank line:

```hurl
# @collectionName Figma API

# @name Get File
GET https://api.figma.com/v1/files/nMy8shh1buvQiirXMzpORz
Authorization: Bearer {{FIGMA_TOKEN}}

HTTP 200

# @name Get Node
GET https://api.figma.com/v1/files/nMy8shh1buvQiirXMzpORz/nodes?ids=89-547
Authorization: Bearer {{FIGMA_TOKEN}}

HTTP 200
```

### Supported request sections

| Section | Maps to |
|---|---|
| Header lines (`Key: Value`) | Request headers |
| `[Query]` / `[QueryStringParams]` | URL query parameters |
| `[Form]` / `[FormParams]` | URL-encoded form body |
| `[Multipart]` / `[MultipartFormData]` | Multipart form body |
| `[Cookies]` | `Cookie` request header |
| `[BasicAuth]` | `Authorization: Basic …` header |

### Assertions

Response assertions are stored in the `[Asserts]` section and preserved on save:

```hurl
# @name Health Check
GET https://example.com/api/health

HTTP 200
[Asserts]
status == 200
header "Content-Type" == "application/json"
```

---

## Auto-Detection

When you open a folder (or add a workspace folder) that contains `.hurl` files annotated with `# @collectionName` or `# @name`, the extension:

1. Scans the workspace for `.hurl` files (up to 20 files, excluding `node_modules`)
2. Loads collections from any matching files
3. Focuses the **API Explorer** sidebar automatically

This allows teams to commit API collections alongside source code — anyone who clones the repository and opens the folder in VS Code will see the collections appear immediately.

---

## Import

### From cURL

Use **API TryIt: Open from Curl** from the Command Palette to paste a `curl` command and convert it to a saved request.

### From a Hurl snippet

Use **API TryIt: Open from Hurl** to paste raw Hurl text and open it in the TryIt panel.

### From a Hurl collection payload

Use **API TryIt: Import Hurl Collection** to import a structured JSON/YAML payload containing one or more Hurl entries. The extension creates `.hurl` files under an `api-test/` directory in your workspace.

---

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `api-tryit.collectionsPath` | `string` | `""` | Directory to scan for collections. Defaults to the workspace root. |
| `api-tryit.hurl.path` | `string` | `""` | Absolute path to the `hurl` executable. Falls back to managed install or `PATH`. |
| `api-tryit.hurl.autoInstall` | `boolean` | `true` | Automatically download and install a managed `hurl` binary when needed. |
| `api-tryit.hurl.version` | `string` | `"7.1.0"` | Version of the managed `hurl` binary to install. |

### Setting a custom collections path

If your API collections live in a subdirectory (e.g., `api-tests/`), configure:

```json
{
  "api-tryit.collectionsPath": "${workspaceFolder}/api-tests"
}
```

### Using a custom Hurl binary

```json
{
  "api-tryit.hurl.path": "/usr/local/bin/hurl"
}
```

---

## Commands

All commands are accessible from the Command Palette (`⌘⇧P` / `Ctrl+Shift+P`):

| Command | Description |
|---|---|
| `API TryIt: Open TryIt Panel` | Open the request editor panel |
| `API TryIt: Open from Curl` | Import a request from a cURL command |
| `API TryIt: Open from Hurl` | Open a Hurl snippet in the TryIt panel |
| `API TryIt: Import Hurl Collection` | Import a Hurl collection payload |
| `API TryIt: Import Collection Payload` | Import a raw collection payload into the workspace |
| `API TryIt: Install Hurl` | Manually trigger download of the managed `hurl` binary |
| `API TryIt: Set Collections Path` | Change the directory scanned for collections |

---

## Working with Version Control

Because collections are stored as plain `.hurl` files, they integrate naturally with Git:

- Commit `.hurl` files alongside your source code to share API collections with your team.
- Diff and review request changes in pull requests like any other text file.
- Anyone who clones the repository and opens the folder in VS Code will have the collections automatically loaded.

### Recommended `.gitignore` entries

```gitignore
# Ignore sensitive environment files used with hurl --variables-file
*.env
.hurl.env
```

---

## Requirements

- Visual Studio Code **1.100.0** or later
- `hurl` CLI **7.1.0** or later (auto-installed by default; see [hurl.dev](https://hurl.dev) for manual installation)

---

## License

Copyright (c) 2026, WSO2 LLC. Licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
