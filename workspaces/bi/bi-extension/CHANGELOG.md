# Changelog

All notable changes to the **WSO2 Integrator: BI** extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Persist Database Support** — Added support for persist database workflows in BI, including multiple database connections.
- **Library Projects** — Added end-to-end support for library projects, including creation improvements, new overview page, `lib.bal` validator import, publishing to Ballerina Central, and deployment enforcement when deploying workspaces to Devant.
- **BI Copilot** — Added new agent capabilities including library search/get tools, ConfigCollector, test-runner integration, plan-mode toggle, new/old review preview, telemetry insights, and support for agent evaluations.
- **Data Mapper** — Added support for JSON/XML mappings, DSS query input/output mapping generation, module-level construct consolidation, and diagnostics support in clause forms.
- **Developer Experience** — Added support for Devant connections in BI and remote server debugging improvements.

### Changed

- **Copilot Authentication & Config** — Migrated Copilot to the Devant auth flow, updated environment keys and pipeline inputs, and improved BI Copilot configuration handling.
- **Editor & Forms** — Implemented new array/map editor experience, introduced dependent type editor behavior for persist forms, and improved record configuration modal UX and layout.
- **Service Designer & Connectors** — Updated FTP service-designer flows and reordered Devant marketplace placement in connector selection views.

### Fixed

- **Forms & Validation** — Fixed project create-form validation regressions, if/match form behavior, response editor checkbox issues, loader styling, and form diagnostics handling edge cases.
- **Expression & Type Editing** — Fixed SQL editor rendering for query fields, imported-type import insertion, user-defined type visibility in non-workspace projects, and function-call related create-function action visibility.
- **Service & Resource Flows** — Fixed service designer/configurable view issues, resource header value handling, path sanitization for `.` resource paths, and XML corruption during data-service editing.
- **Copilot & Agent Flow** — Fixed multi-turn chat state persistence, chat agent creation with listener support, config-collector placeholder handling, and login notification issues for default model provider configuration.
- **Security** — Applied vulnerability and dependency security fixes across BI extension components.


## [1.7.0](https://github.com/wso2/vscode-extensions/compare/ballerina-integrator-1.6.1...ballerina-integrator-1.7.0) - 2026-02-14

### Added

- **Event Integration** — Introduced CDC for PostgreSQL support.
- **FTP Integration** — Added support for deprecated FTP functions.
- **Expression Editor** — Added SQL support for expression editing.

### Changed

- **Project Creation** — Refactored form layout and validation.
- **Service Management** — Improved Try-it flow and multiple Ballerina version detection; sorted HTTP resources in service designer and artifact views.
- **Form Validation** — Ensured form validation runs before language server diagnostics.

### Fixed

- **Installation** — Added warning for conflicting Ballerina installations.
- **UI Components** — Fixed resource configuration response reset, record config helper overflow, and Boolean/enum editor selection.
- **Type Editor** — Fixed recursive type creation issue.
- **Expression Editor** — Fixed completions for method access.
- **Security** — Updated dependencies to address vulnerabilities (CVE-2026-25128, CVE-2025-50537, CVE-2025-13465, CVE-2026-25547).

## [1.6.1](https://github.com/wso2/vscode-extensions/compare/ballerina-integrator-1.6.0...ballerina-integrator-1.6.1) - 2026-01-22

### Fixed

- **Extension Activity Tree View** — Fixed the tree view refresh issue.

## [1.6.0](https://github.com/wso2/vscode-extensions/compare/ballerina-integrator-1.5.4...ballerina-integrator-1.6.0) - 2026-01-20

### Added

- **AI Agent Mode** — Introduced a comprehensive Agent Mode with design capabilities, automatic code integration, task approval workflows, and diagnostic tools. Added support for dynamic OpenAPI connector generation and chat checkpoints.
- **Connectors** — Revamped the Connectors view with support for Persist and WSDL connections. Improved connector generation workflows.
- **Expression Editor** — Expanded expression support with new editors for String Templates, SQL expressions, booleans, numbers, enums, and maps.
- **Data Mapper** — Enhanced mapping capabilities with a "Group by" option, visual icons for mapping options, and support for all primitive type conversions.
- **CDC for Microsoft SQL Server** - Introduced Change Data Capture for Microsoft SQL Server under the event integration section.

### Changed

- **AI & Copilot** — Migrated to Devant authentication and improved chat state management. Enhanced Design Mode with better user communication, history persistence, and review modes.
- **Workspace Support** — Updated core commands (including `Type Diagram`, `Add Construct`, `Debug Integration`, and `Run`) to fully support multi-project and workspace environments.
- **Data Mapper** — Improved error handling, type compatibility, and the switching experience for reusable mappers.
- **Editor & UI** — Refactored form properties for better performance and consistency. Improved the Samples view and Project Explorer rendering.

### Fixed

- **General** — Resolved issues with `Ballerina: Pack` on Windows, proxy renaming, and Cloud Editor organization selection.
- **Data Mapper** — Fixed bugs related to undo functionality, sub-mapping rendering, output port states, and variable visibility in let-clauses.
- **Expression Editor** — Corrected issues with interpolation wrapping, record editor visibility, and input validation.
- **Security** — Updated dependencies to address known vulnerabilities.

## [1.5.4](https://github.com/wso2/vscode-extensions/compare/ballerina-integrator-1.5.3...ballerina-integrator-1.5.4) - 2025-12-05

### Fixed

- **Data Mapper** — Fixed the issue with focusing into inner array queries.
- **Security** — Updated dependencies to address security vulnerabilities (`CVE-2024-51999`).

## [1.5.3](https://github.com/wso2/vscode-extensions/compare/ballerina-integrator-1.5.2...ballerina-integrator-1.5.3) - 2025-12-01

### Changed

- **Data Mapper** — Improved completion support for the expression bar and clause editor. Re-enabled array aggregating options.

### Fixed

- **Data Mapper** — Fixed expression bar focusing, inline undo button, and crashes during mapping clearance.
- **AI Data Mapper** — Fixed error handling, output formatting, and compilation errors.

## [1.5.2](https://github.com/wso2/vscode-extensions/compare/ballerina-integrator-1.5.1...ballerina-integrator-1.5.2) - 2025-11-18

### Changed

- **Workspace & Project Management** — Improved workspace management with a new Workspace Overview, expanded tree view support, and multi-project migration capabilities. Integration management is enhanced, allowing additions and deletions directly from the overview. The build command and language server integration have also been updated for better multi-project support.
- **Editor & Configuration** — Updated the expression editor with an expanded view for a better editing experience. The service and record configuration views have been improved with better styling, diagnostics, and form support. Configuration editing is enhanced with a new configuration object editor, and the dependency pull flow now provides improved visual feedback.
- **AI Features** — Enhanced the AI Data Mapper to support multiple file uploads and updated the AI code generator for compatibility with Ballerina workspaces.
- **Editor & UX** — Improved the user experience for the expanded expression editor and component diagram. Refactored floating button styles in the expression editor for better theming, and improved chip styling for light themes.
- **Project & Configuration** — Enhanced feature compatibility validation across different Ballerina versions. Updated the package configurable view for better configuration management.

### Fixed

- **Expression Editor & Configuration Views** — Resolved multiple issues in the expression editor, including problems with completions, styles, and value synchronization in the record config view. Fixed popup stacking order and button alignment in configuration popups.
- **General UI & Editor** — Addressed UI glitches, including a helper pane overflow issue, incorrect tree item highlighting with diagnostics, and an infinite re-render bug in the print form. Fixed a language server project loading issue in workspace setups.
- **Security** — Updated dependencies to address security vulnerabilities (`CVE-2025-64718`, `CVE-2025-64756`).

## [1.5.1](https://github.com/wso2/vscode-extensions/compare/ballerina-integrator-1.5.0...ballerina-integrator-1.5.1) - 2025-11-12

### Fixed

- **Ballerina Version Compatibility** — The "New Project" and "Natural Programming functions" features are now only shown for Ballerina versions 2201.13.0 and above.

## [1.5.0](https://github.com/wso2/vscode-extensions/compare/ballerina-integrator-1.4.0...ballerina-integrator-1.5.0) - 2025-11-11

### Added

- **Editor** — Added support for [Ballerina workspaces](https://ballerina.io/learn/workspaces/). This allows you to seamlessly manage, navigate, and build multiple related Ballerina projects within a single VS Code window, greatly improving the development workflow for complex systems.

## [1.4.0](https://github.com/wso2/vscode-extensions/compare/ballerina-integrator-1.3.2...ballerina-integrator-1.4.0) - 2025-11-05

### Added

- **Service & Data Handling** — Introduced MCP AI and Solace Event integrations, redesigned Service and Event Integration flows with AI-powered payload generation, and introduced an LLM-based Data Mapper.
- **GraphQL Designer** — Added schema-based service generation, GraphQL-based type suggestions, `graphql:ID` annotation support, and documentation on GraphQL fields.
- **Expression Editor** — Enhanced the expression editor with improved syntax highlighting. The expression helper now offers distinct modes for both text and expression inputs.

### Changed

- **AI & Copilot** — Improved AI code generation formatting, step handling, and system prompts for better response structure.
- **Service Designer** — Revamped the view with more organized listener and service properties, enhanced with readable listener names, and refactored metadata display.
- **Data Mapper** — Improved breadcrumb labels and refactored preview behavior for output-side arrays.
- **UI & UX** — Enhanced the Helper Pane UI and navigation, and refactored the Resource form styles. Improved the Type Editor with type import capability and automatic generation of sample JSON for payload types.

### Fixed

- **Data Mapper** — Corrected issues with mappings generated for output header ports.
- **Service Designer** — Resolved an infinite re-render issue and fixed bugs in the API designer and MCP tool editing.
- **Expression Editor** — Fixed issues with constrained language in Windows PowerShell, delete key behavior, and text selection.
- **UI & UX** — Addressed UI glitches, including a popup movement issue when dragging the terminal, and fixed `undo/redo` stack reset conditions.
- **GraphQL** — Removed Union Types from GraphQL Input Types.
- **AI & Copilot** — Fixed invalid markdown characters in the chat window, file creation issues, and state management in the chat window. Resolved a bug where the reusable model provider form was not displaying correctly.

## [1.3.2](https://github.com/wso2/vscode-extensions/compare/ballerina-integrator-1.3.1...ballerina-integrator-1.3.2) - 2025-10-26

### Changed

- **Data Mapper** — Enabled reset and refresh options.

### Fixed

- **Editor** — Allowed artifact creation even when corresponding source files are missing.
- **Data Mapper** — Added support for mappings with built-in Ballerina sub-types (e.g., `int:Signed32`), fixed creation using types from sub-modules, enabled expression-bar completions for reusable mappers, and corrected link rendering for optional field access.
- **Type Browser** — Improved type filtering based on user queries.
- **Service Class Designer** — Enabled connection generation for clients created from WSDL files.


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

