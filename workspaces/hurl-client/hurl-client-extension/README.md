# WSO2 HTTP Client

Open, edit, and execute `.hurl` files as interactive notebooks in VS Code.

Each HTTP request in a `.hurl` file becomes a runnable notebook cell. Responses are displayed inline as formatted Markdown — status code, response body (pretty-printed JSON), and assertion results. Markdown cells provide rich documentation between requests.

## Features

- **Notebook interface for `.hurl` files** — any `.hurl` file opens directly as a notebook with one cell per request block.
- **Run cells individually or all at once** — click ▶ next to a cell or use **Run All** to execute the full file.
- **Rich response output** — status code, response body (auto-formatted JSON), assertion pass/fail table, and execution time rendered inline.
- **Markdown documentation cells** — intersperse narrative, headers, and parameter descriptions alongside your requests.
- **Hurl syntax highlighting** — full grammar coverage: methods, URLs, headers, query/assert sections, templates `{{variable}}`, predicates, filters, and more.
- **Managed hurl binary** — automatically downloads and installs the correct `hurl` binary for your platform on first use. No manual setup needed.
- **Cross-platform** — macOS (Apple Silicon & Intel), Linux (x64 & ARM64), Windows (x64 & ARM64).
- **Saveable notebooks** — edited notebooks save back to the original `.hurl` file. Unsaved notebooks prompt on close.

## Getting Started

### 1. Open a `.hurl` file as a notebook

Right-click any `.hurl` file in the Explorer and choose **Http Client: Open Hurl Notebook**, or run the command from the Command Palette (`Cmd/Ctrl+Shift+P`).

The file opens as a notebook with one code cell per HTTP request block.

### 2. Run a request

Click the **▶ Run Cell** button to the left of any cell, or press `Shift+Enter` while the cell is focused. The response appears inline below the cell.

### 3. Run all requests

Use the **Run All** button in the notebook toolbar to execute every cell in order.

### 4. Edit and save

Edit cells directly. When done, press `Cmd/Ctrl+S` to save back to the `.hurl` file.

## Commands

| Command | Description |
|---------|-------------|
| `HTTP Client: Open Hurl Notebook` | Open a `.hurl` file as a notebook (also available via right-click in Explorer) |
| `HTTP Client: Install Hurl` | Manually trigger the managed hurl binary download |
| `HTTP Client: Import Hurl String` | Create a notebook from a pasted hurl string (prompts for input if called from the Command Palette) |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `http-client.hurl.path` | `""` | Absolute path to a custom `hurl` executable. If empty, the managed install or `PATH` is used. |
| `http-client.hurl.autoInstall` | `true` | Automatically download and install a managed hurl binary when no binary is found. |
| `http-client.hurl.version` | `"7.1.0"` | The managed hurl version to install. |

## Managed Hurl Binary

HTTP Client bundles its own hurl binary manager. On first use (or on activation when `autoInstall` is enabled), it:

1. Checks `http-client.hurl.path` in settings — uses it if set.
2. Checks whether `hurl` is available on your system `PATH` — uses it if found.
3. Downloads the correct binary from the [official Hurl GitHub releases](https://github.com/Orange-OpenSource/hurl/releases) for your platform and architecture, stores it in the extension's global storage directory, and reuses it across sessions.

**Supported platforms:**

| Platform | Architecture |
|----------|-------------|
| macOS | Apple Silicon (arm64), Intel (x64) |
| Linux | x64, ARM64 |
| Windows | x64, ARM64 |

To pin a specific hurl version, set `http-client.hurl.version` in your VS Code settings and run **HTTP Client: Install Hurl** from the Command Palette.

## File Format

HTTP Client reads and writes standard `.hurl` files. Markdown cells are stored as `# md:` comment blocks so they survive round-trips through the file without loss:

```hurl
# md: ### Create a User
# md:
# md: **POST** `/users` — creates a new user in the system.

POST https://api.example.com/users
Content-Type: application/json
{
  "name": "Alice"
}
```

Files with documentation cells remain valid `hurl` files and can be executed directly with the `hurl` CLI.

## Requirements

- VS Code 1.100.0 or later
- Internet access for the initial hurl binary download (or point `http-client.hurl.path` to a local binary)
