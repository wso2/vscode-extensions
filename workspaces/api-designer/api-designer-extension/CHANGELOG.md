# Change Log

All notable changes to the "API Designer" extension will be documented in this file.

## **0.9.2** (2025-11-05)

### Added

- Integrated Swagger UI split-screen preview for OpenAPI files
- AI-powered API design assistance with support for GitHub Copilot
- API governance dashboard with Spectral ruleset validation
- Configuration UI for managing API projects and governance rulesets
- Support for GitHub folder URLs with `@` prefix for ruleset management
- WSO2 API Platfomr artifact (`.api-platform.yaml`) generation and update functionality
- File tree selector for browsing and selecting files from git repositories
- Support for local folder rulesets in addition to GitHub sources
- Dynamic button states (Initialize/Add/Configure) based on project status

### Changed

- Responses side panel now collapsed by default for better UX
- Method action buttons in paths panel now appear only on hover
- Improved configuration modal with collapsible sections
- Enhanced file tree filtering for documentation, tests, and WSO2 artifacts
- Refactored config.yaml structure to support multiple APIs with individual paths
- Button styling updated to match VS Code theme consistency

### Fixed

- Resolved Copilot API model compatibility issues
- Fixed text overflow in configuration modal input fields
- Corrected OpenAPI file detection regex to prevent false positives
- Fixed Swagger UI preview glitching and state management
- Resolved issues with file tree filtering for documentation and test files
- Fixed governance dashboard header width alignment
- Improved error handling for GitHub authentication and private repositories

## **0.9.1** (2024-07-26)

### Fixed

- Inbound endpoint editing issues
- Minor bug fixes

## **0.9.0** (2024-07-01)

### Added

- Initial release
- OpenAPI 3.x visual editor with real-time validation
- Basic Swagger UI integration
- Spectral ruleset support for API governance
