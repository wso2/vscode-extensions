# Changelog

All notable changes to the **WSO2 Integrator: BI** extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]


## [1.3.2](https://github.com/wso2/vscode-extensions/compare/ballerina-integrator-1.3.1...ballerina-integrator-1.3.2) - 2025-10-26

### Changed

- **Data Mapper** Enable reset and refresh options.

### Fixed

- **Editor** Allow artifact creation even when corresponding source files are missing.
- **Data Mapper** — Add support for mappings with built-in Ballerina sub-types (e.g., int:Signed32), fix creation using types from sub-modules, enable expression-bar completions for reusable mappers, and correct link rendering for optional field access.
- **Type Browser** — Improve type filtering based on user queries.
- **Service Class Designer** — Enable connection generation for clients created from WSDL files.


## [1.3.1](https://github.com/wso2/vscode-extensions/compare/ballerina-integrator-1.3.0...ballerina-integrator-1.3.1) - 2025-10-15

### Changed

- Enable undo/redo across extension views for a consistent editing experience.
- **BI forms** — fix type-diagram field rendering, improve read-only handling, and stabilize context menus.
- **Data Mapper** — improved productivity: auto-focus navigation, safer primitive mapping options, updated array-element APIs, and richer custom/transform requests.

### Fixed

- **Editor** — Fixed expression-bar focus, flow-diagram race conditions, service-navigation sync, context-menu triggers, and connector list navigation.
- **Data Mapper** — Fixed stale contexts, filter/map link rendering, ESC key handling, long-field type visibility, and query-view navigation.
- **Service Class Designer** — Fixed diagnostics, HTTP resource parameter editing, MCP client updates, and MI helper-pane sizing.

## [1.3.0] - 2025-09-19

### Added

- **Data Mapper** — Support for enums/unions, constants, nested arrays, optional fields and transformation function mappings.
- **AI & Knowledge Base** — Document generation, chunking tools (Chunker, Dataloader), smarter agent creation with reusable model providers.
- **Connector Experience** — Local Connectors renamed to Custom Connectors, new tab-based UI, better multi-project switching, migration tool UI.
- **BI Extension** — Redesigned welcome page, new commands, type editor improvements, and migration tools support.
- **Type Diagram** — Optimized view for diagrams with high node count, added node deletion, and support for making types read-only via TypeEditor.
- **AWS Bedrock authentication support for BI Copilot**

### Changed

- **Improved Data Mapper** — Improved performance for large, deeply nested records, more intuitive design, and a new expression editor for easier transformations.
- **Mappings API** — Standardized field names (name, displayName) and improved optionality handling.
- **AI & Authentication** — Now uses Devant login and integrates the Search API for template discovery.
- **Editor & Designer** — UI refinements, project names now sourced from ballerina.toml, and AI RAG nodes relocated to advanced settings.
- **UX Improvements** — Enhanced connector workflows, better record rendering, and more robust diagram/test coverage.

### Fixed

- **Data Mapper** — Fixed issues with array handling, default values, reserved keyword responses, label consistency, and mapping deletion.
- **Flow Diagram & Editor** — Resolved readonly record rendering and improved service configuration synchronization.
- **AI & Copilot** — Addressed stability issues, resolved missing dependencies, fixed race conditions, and improved notification handling.

## [1.2.1] - 2025-08-13

### Fixed

- Resolved issues affecting Inline Data Mapper functionality and flow diagram rendering.

## [1.2.0] - 2025-07-29

### Added

- **AI Capabilities** — Support for Anthropic's Claude Sonnet v4 for code generation; added Vector Knowledge Base node for RAG workflows; configuration for default AI model providers in the Flow Diagram.
- **Editor & IDE Features** — New VSCode setting to manage the visibility of the Sequence Diagram; option to include the current organization in search results.

### Changed

- **Enhanced Inline Data Mapper** — Redesigned for improved user experience with AI-driven mapping suggestions and a sub-mapping form.
- **AI Copilot & RAG Workflows** — Upgraded AI Copilot now uses ballerina/ai packages, with low-code support added for advanced RAG workflows.
- **Data Mapper** — Improved search, label positioning, and performance; now refreshes automatically when code changes.

### Fixed

- **Data Mapper** — Corrected rendering issues and various bugs in mapping generation and type resolution.
- **AI & Copilot** — Resolved re-rendering bugs and authentication flow issues.

## [1.1.0] - 2025-07-14

### Added

- **Bundled Language Server** — Ballerina Language Server is now bundled with the extension, eliminating separate installation requirements and improving startup performance.
- **Configurable Editor v2** — Complete redesign of the configuration editor with enhanced UI/UX and improved functionality.
- **Type Editor Revamp** — A redesign of the type editor to improve feature discoverability and deliver a better user experience.

### Changed

- **Integration Management** — Refactored artifacts management and navigation.
- **UI Components** — Type Diagram and GraphQL designer with improved visual presentation.
- **Developer Experience** — Enhanced renaming editor functionality; enhanced Form and Input Editor with Markdown support; updated imported types display as view-only nodes for clarity.

### Fixed

- **Extension Stability** — Resolved extension startup and activation issues for reliable performance.
- **Data Mapping & Visualization** — Fixed issues when working with complex data types from imported modules; improved visualization of array types and nested data structures; enhanced connection line display in design diagrams.

## [1.0.3] - 2024-05-28

### Fixed

- Resolved issues with TryIt functionality for service paths containing special characters.
- Enhanced Data Mapper usability and visual presentation.
- Updated the record editor to correctly use `packageName`.

## [1.0.2] - 2024-05-18

### Added

- Integrated AI Chat onboarding experience with guided tutorials for new users.
- Enhanced Flow Diagram with new node types including Lock node support and experimental Match node functionality.

### Changed

- Streamlined AI Chat experience with improved authentication flow and command organization.

### Fixed

- Improved reliability of AI-assisted features with enhanced error handling.

## [1.0.0]

- Initial release

