# Hurl Client

> This extension was developed to serve as the HTTP client for the [WSO2 Integrator](https://marketplace.visualstudio.com/items?itemName=WSO2.wso2-integrator).

Open, edit, and execute `.hurl` files as interactive notebooks in VS Code.

Each HTTP request in a `.hurl` file becomes a runnable notebook cell. Responses are displayed inline as formatted Markdown — status code, response body (pretty-printed JSON), and assertion results. Markdown cells provide rich documentation between requests.

![Hurl Client demo](https://raw.githubusercontent.com/wso2/vscode-extensions/main/workspaces/hurl-client/hurl-client-extension/images/hurl-client.gif)

## Getting Started

Right-click any `.hurl` file in the Explorer and choose **Hurl Client: Open Hurl Notebook**, or run the command from the Command Palette (`Cmd/Ctrl+Shift+P`).

## Commands

| Command | Description |
|---------|-------------|
| `Hurl Client: Open Hurl Notebook` | Open a `.hurl` file as a notebook (also available via right-click in Explorer) |
| `Hurl Client: Install Hurl` | Manually trigger the managed hurl binary download |
| `Hurl Client: Import Hurl String` | Create a notebook from a pasted hurl string (prompts for input if called from the Command Palette) |

## File Format

Hurl Client reads and writes standard `.hurl` files.

```hurl
POST https://api.example.com/users
Content-Type: application/json
{
  "name": "Alice"
}
```
