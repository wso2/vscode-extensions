# API TryIt Extension

This extension provides API testing and try-it capabilities in VS Code.

## Structure

- `api-tryit-core/` - Core types and interfaces
- `api-tryit-rpc-client/` - RPC client for communication between extension and webview
- `api-tryit-visualizer/` - React-based webview UI
- `api-tryit-extension/` - Main VS Code extension

## Getting Started

1. Install dependencies:
   ```bash
   rush update
   ```

2. Build all packages:
   ```bash
   rush build
   ```

3. Run the extension:
   - Open `api-tryit-extension` folder in VS Code
   - Press F5 to launch Extension Development Host

## Features

- Activity bar panel with "Hello World" UI
- Basic webview integration
- Extensible architecture based on MI extension pattern
