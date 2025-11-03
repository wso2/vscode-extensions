# MCP Inspector

A Visual Studio Code extension for inspecting and debugging Model Context Protocol (MCP) connections.

## Overview

The MCP Inspector provides developers with tools to inspect, debug, and monitor Model Context Protocol connections directly within Visual Studio Code. This extension integrates the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) into VSCode for a seamless development experience.

## Prerequisites

Before using this extension, ensure you have the following installed:

- **Node.js** – version **18.x** or later
  [Download Node.js](https://nodejs.org)

- **pnpm** – version **9.0** or later
  Install with:
  ```bash
  npm install -g pnpm
  ```

- **Visual Studio Code** – version **1.104.0** or later
  [Download VSCode](https://code.visualstudio.com)

## Installation

### From VSIX

1. Download the latest `.vsix` file from the [releases page](https://github.com/wso2/mcp-inspector-extension/releases)
2. In VSCode, go to **Extensions** → **Views and More Actions (...)** → **Install from VSIX**
3. Select the downloaded `.vsix` file

### From Source

1. **Clone the repository**:
   ```bash
   git clone https://github.com/wso2/mcp-inspector-extension.git
   cd mcp-inspector-extension
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Build the extension**:
   ```bash
   pnpm build
   ```

4. **Package the extension**:
   ```bash
   pnpm package
   ```

5. **Install locally**:
   ```bash
   pnpm run install:local
   ```

## Usage

### Opening the Inspector

- Use the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and search for **"Open MCP Inspector"**
- Or use the command **"Open MCP Inspector with URL"** to pre-populate server configuration

### Features

- **Real-time MCP connection monitoring**
- **Request/response inspection**
- **Debug MCP servers and clients**
- **Integrated within VSCode** for a seamless workflow

## Development

### Available Commands

- `pnpm build` – Build the extension for production
- `pnpm dev` – Watch mode for development
- `pnpm lint` – Lint TypeScript files
- `pnpm lint:fix` – Auto-fix linting issues
- `pnpm test` – Run tests
- `pnpm clean` – Remove build artifacts
- `pnpm package` – Create VSIX package
- `pnpm install:local` – Install VSIX locally

### Development Workflow

1. **Start watch mode**:
   ```bash
   pnpm dev
   ```

2. **Launch the extension**:
   - Press `F5` in VSCode
   - Or use **Run → Start Debugging**
   - The Extension Development Host window will open

3. **Test your changes** in the new VSCode window

## Contribution Guidelines

If you are planning on contributing to the development of the MCP Inspector extension:

1. Fork the repository before making changes
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Follow the existing code style and conventions
4. Write tests for new functionality
5. Ensure all tests pass (`pnpm test`)
6. Submit a pull request with a clear description

Please follow the detailed instructions available at: [https://wso2.github.io](https://wso2.github.io)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

By downloading and using this Visual Studio Code extension, you agree to the license terms and [privacy statement](https://wso2.com/privacy-policy).

This extension uses the MCP Inspector, which is part of the [Model Context Protocol](https://modelcontextprotocol.io/) project.

---

**Developed by WSO2**
