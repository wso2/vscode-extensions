# Change Log

All notable changes to the "arazzo-visualizer" extension will be documented in this file.

## 0.2.0

### Added
- **Built-in Workflow Runner**: Added support for running Arazzo workflows directly from VS Code without installing a separate runner
  - Execute workflows from the visualizer or workflow CodeLens actions
  - Packaged runner binaries with extension build support
  - Automatic Arazzo server startup for the active workflow file
- **GitHub Copilot Workflow Execution**: Added a **Try with AI** experience for running workflows through Copilot
  - Workflow-level CodeLens actions for Try and Retry
  - Visualizer Try action that opens the selected workflow and starts the execution flow
  - MCP configuration support for connecting the active Arazzo workflow to Copilot
- **Execution Logs and Tracing**: Added workflow execution observability in the visualizer
  - Live execution status for workflow, step, retry, HTTP, and nested workflow spans
  - Logs tab with grouped execution runs, request/response details, failures, and raw trace data
  - Node and path highlighting for successful, failed, retry, goto, condition, and nested workflow execution paths

## 0.1.0

### Added
- **Language Server Protocol (LSP) Integration**: Integrated Go-based Arazzo Language Server for procode features
  - Real-time validation with detailed diagnostics
  - Context-aware code completion (triggered by `:`, `-`, `$`, `.`, `/`, `#`)
  - Code Lens actions: Visualize and Open Visualizer buttons appear above workflows
  - Full YAML and JSON support with automatic format detection
- **Arazzo File Support**: Added comprehensive support for `.arazzo.yaml`, `.arazzo.yml`, and `.arazzo.json` files
  - File type associations and language IDs
  - Syntax highlighting via TextMate grammar
  - Activation on Arazzo files
- **New Commands**:
  - `arazzo.visualize` - Visualize workflow from Code Lens
  - `arazzo.openDesigner` - Open visual visualizer from Code Lens
  - `ArazzoDesigner.createArazzoFile` - Create new Arazzo workflow file with template
- **File Detection**:
  - Detects both OpenAPI and Arazzo files
  - Context variables for UI state management (`isFileArazzo`, `isViewArazzo`)
- **Language Server Logging**: View detailed LSP logs in Output panel ("Arazzo Language Server")
- **Custom File Icons**: Added custom icon theme for Arazzo files
  - Displays a unique green workflow icon for `.arazzo.yaml`, `.arazzo.yml`, and `.arazzo.json` files
  - User-selectable icon theme: "Arazzo File Icons"
  - Works alongside existing icon themes


