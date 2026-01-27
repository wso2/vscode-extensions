# Change Log

All notable changes to the "arazzo-designer" extension will be documented in this file.

## [Unreleased]

### Fixed
- **Stale Diagnostics Issue**: Fixed issue where error messages would not clear after fixing YAML validation errors
  - LSP now explicitly clears old diagnostics before publishing new ones
  - Ensures VS Code properly updates the Problems panel in real-time
  - No more need to reload window to see updated diagnostics

### Added
- **Language Server Protocol (LSP) Integration**: Integrated Go-based Arazzo Language Server for procode features
  - Real-time validation with detailed diagnostics
  - Context-aware code completion (triggered by `:`, `-`, `$`, `.`, `/`, `#`)
  - Code Lens actions: Visualize and Open Designer buttons appear above workflows
  - Full YAML and JSON support with automatic format detection
- **Arazzo File Support**: Added comprehensive support for `.arazzo.yaml`, `.arazzo.yml`, and `.arazzo.json` files
  - File type associations and language IDs
  - Syntax highlighting via TextMate grammar
  - Activation on Arazzo files
- **New Commands**:
  - `arazzo.visualize` - Visualize workflow from Code Lens
  - `arazzo.openDesigner` - Open visual designer from Code Lens
  - `APIDesigner.createArazzoFile` - Create new Arazzo workflow file with template
- **Enhanced File Detection**:
  - Detects both OpenAPI and Arazzo files
  - Context variables for UI state management (`isFileArazzo`, `isViewArazzo`)
- **Language Server Logging**: View detailed LSP logs in Output panel ("Arazzo Language Server")
- **Custom File Icons**: Added custom icon theme for Arazzo files
  - Displays a unique green workflow icon for `.arazzo.yaml`, `.arazzo.yml`, and `.arazzo.json` files
  - User-selectable icon theme: "Arazzo File Icons"
  - Works alongside existing icon themes

### Changed
- Updated `package.json` to include `vscode-languageclient` dependency
- Enhanced activation events to trigger on YAML, JSON, and Arazzo files
- Updated extension.ts to initialize LSP client on activation
- Modified context detection to support both OpenAPI and Arazzo workflows
- **LSP Binary Location**: Changed from `bin/` to `ls/` folder for better organization
  - Build script now copies to `ls/arazzo-language-server`
  - Extension loads from `ls/arazzo-language-server`

### Technical Details
- Language Server built with Go for high performance
- JSON-RPC 2.0 communication protocol
- Full document synchronization mode
- Binary included at `ls/arazzo-language-server` (6.9 MB)
- Explicit diagnostic clearing mechanism to prevent stale errors
- Build script (`build.sh`) automates compilation and deployment

## [1.0.1] (2024-07-26)

- Fixed inbound endpoint editing 
- Other minor bug fixes

## [1.0.0]

- Initial release
