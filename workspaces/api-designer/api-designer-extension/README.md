# API Designer for Visual Studio Code

API Designer is an OpenAPI-first extension for designing and analyzing API specifications directly in VS Code.

## Features

### Design OpenAPI Specs
- Visual editor for OpenAPI 3.x files.
- Edit paths, operations, request bodies, responses, parameters, headers, and reusable components.
- Built-in schema editing support, including **Import JSON** to generate schema definitions from sample payloads.

### Analyze Governance and AI Readiness
- Validate specs with Spectral-based governance reports.
- View categorized issues, severity breakdowns, and report scores.
- Includes AI Readiness analysis with agent-assisted evaluation and cached stale findings support.

### Ruleset Support
- Built-in default governance rulesets:
  - WSO2 REST API Design Guidelines
  - OWASP API Security Top 10
  - WSO2 REST API AI Readiness Guidelines
- Additional rulesets can be discovered from configured GitHub/local folders via extension settings.

## Quick Start

1. Install the extension from Marketplace or VSIX.
2. Open an OpenAPI YAML/JSON file.
3. Run **Open API Designer** (CodeLens, editor title action, or command palette).
4. Use:
   - **Design** view to edit the API.
   - **Analyze** view to run governance and AI readiness checks.

## Resources

- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [Spectral Documentation](https://stoplight.io/open-source/spectral)

## License

Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.

Licensed under the Apache License, Version 2.0. See [LICENSE](./LICENSE) for details.

---

**Built by WSO2**
