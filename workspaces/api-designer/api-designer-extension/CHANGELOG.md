# Change Log

All notable changes to the "API Designer" extension will be documented in this file.

## 0.9.1

### Added
- **APK Configuration Support**: Author and manage `.apk-conf` API configuration files.
  - Schema validation, autocompletion, and inline error checking for `.apk-conf` files.
  - Insert built-in templates (Basic, PetStore, Pizza Shack) via the **Choose Template (APK)** command.

## 0.9.0

### Added
- **OpenAPI Visual Designer**: Design and edit OpenAPI 3.x APIs directly in VS Code.
  - Edit paths, operations, parameters, request bodies, responses, headers, and reusable components.
  - Import JSON samples to generate schema definitions.
- **Governance Analysis Workspace**: Analyze APIs with built-in governance reports.
  - Score cards for **AI Readiness**, **Security (OWASP)**, and **REST Compliance**.
  - Detailed report pages with breakdowns, filtering, grouping, search, and issue-level diagnostics.
- **AI Readiness with LLM Findings**: Run AI-readiness checks with optional LLM-assisted findings.
  - LLM findings are merged into report issues and reflected in report counters.
  - Supports re-evaluation, plus clear stale and failed analysis states.
- **GitHub Copilot Integration**: Integrated Copilot-backed language model workflows in API Designer.
  - Use AI-assisted design/edit flows from the designer experience.
  - Use **Fix with AI** style actions from validation and parsing error states to generate remediation suggestions.
  - Open AI chat with context-aware prompts from API sections and report findings.
- **Commands and LM Tools**: Added API Designer commands and language model tool integrations.
  - Open API Designer from editor context, title actions, and command palette.
  - Validate specs, open in designer, and resolve AI findings through integrated tools.
