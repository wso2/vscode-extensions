# MCP Inspector for VSCode

Inspect, debug, and monitor [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) connections directly within Visual Studio Code.

## Features

### 🔍 Real-time Connection Monitoring
Monitor MCP server and client connections in real-time with detailed request and response inspection.

### 🐛 Debug MCP Servers
Test and debug your MCP servers with an integrated debugging interface—no need to leave VSCode.

### 🔧 Pre-populate Server Configuration
Launch the inspector with pre-configured server URLs or commands using the **"Open MCP Inspector with URL"** command.

### 🎨 Custom Dark Theme
Enjoy a carefully crafted dark theme optimized for long debugging sessions.

## Getting Started

### Installation

1. Install the extension from the [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=wso2.mcp-inspector)
2. Reload VSCode

### Usage

**Open the Inspector:**
- Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
- Type `Open MCP Inspector` and press Enter

**Open with Pre-configured Server:**
- Use the command `Open MCP Inspector with URL` to specify server details

## Requirements

- **Node.js** v18.x or later
- **Visual Studio Code** v1.104.0 or later

## Commands

| Command | Description |
|---------|-------------|
| `Open MCP Inspector` | Open the MCP Inspector panel |
| `Open MCP Inspector with URL` | Open with pre-populated server configuration |

## Support

- 📖 [Documentation](https://github.com/wso2/mcp-inspector-extension/blob/main/QUICKSTART.md)
- 🐛 [Report Issues](https://github.com/wso2/mcp-inspector-extension/issues)
- 💬 [Discussions](https://github.com/wso2/mcp-inspector-extension/discussions)

## About

This extension integrates the official [MCP Inspector](https://github.com/modelcontextprotocol/inspector) into VSCode, providing a seamless debugging experience for Model Context Protocol implementations.

### Third-Party Software

This extension includes the following third-party software:

- **[@modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector)** - MIT License  
  Visual testing tool for MCP servers

## License

**MCP Inspector for VSCode**: Apache License 2.0

This extension is licensed under the Apache License 2.0. See [LICENSE](https://github.com/wso2/mcp-inspector-extension/blob/main/LICENSE.txt) for full details.

The wrapped `@modelcontextprotocol/inspector` package is licensed under the MIT License, which is compatible with Apache 2.0.

By using this extension, you agree to the [WSO2 Privacy Policy](https://wso2.com/privacy-policy).

---

**Developed by [WSO2](https://wso2.com)**
