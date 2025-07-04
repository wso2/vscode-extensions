# Source Organization

This document describes the structure and organization of the `vscode-extensions` monorepo.

---

## Overview

This monorepo contains all Visual Studio Code extensions, shared libraries, and supporting tools developed and maintained by WSO2 for the Choreo, Ballerina, MI, and related platforms. It is managed using [Rush](https://rushjs.io/) for consistent dependency management and builds.

---

## Directory Structure

```
vscode-extensions/
│
├── workspaces/
│   ├── ballerina/                # Contains the Ballerina extension packages
│   │  
│   ├── mi/                       # Contains the MI extension packages
│   │  
│   ├── wso2-platform/            # Contains the WSO2 Platform extension packages
│   │
│   ├── choreo/                   # Contains the Choreo extension packages
│   │
│   └── common-libs/              # Shared libraries and utilities used by multiple extensions
```

---

## Key Components

- **Extensions**: Each extension (e.g., `ballerina-extension`, `mi-extension`, `wso2-platform-extension`, `choreo-extension`) resides in its own folder under `workspaces/`.
- **Shared Libraries**: Common code and utilities are placed in `workspaces/common-libs/`.
---

## Environment Variables

A `.env` file is **required** for the following extensions:
- `workspaces/mi/mi-extension`
- `workspaces/ballerina/ballerina-extension`
- `workspaces/wso2-platform/wso2-platform-extension`

Please refer to the corresponding `.env.example` file in each extension directory for the required variables and structure.  
**You must copy `.env.example` to `.env` and fill in the necessary values before building or running these extensions.**

---

## Node.js Version

- **Recommended Node.js version:** `v22`
- **Supported Node.js versions:** `v20` to `v22`

Make sure you are using a compatible Node.js version for development and builds.

---

## Development Workflow

- **Dependency Management**: Use Rush commands (`rush install`, `rush build`, etc.) for all dependency and build operations.
- **Environment Setup**: Ensure required `.env` files are present for extensions that need them. Use the provided `.env.example` files as templates.
- **Code Generation**: Use the code generators (such as `rpc-generator` and `syntax-tree/generator`) as needed to automate repetitive code tasks.
- **Code Review**: Submit pull requests for all changes and follow the repository’s contribution guidelines for code quality and review.

---

## Contribution Guidelines

- Fork the repository before making changes.
- Follow the structure and conventions outlined in this document.
- Submit pull requests with clear descriptions and reference related issues if applicable.

---

## Contact

For questions or support, please open an issue in the [GitHub repository](https://github.com/wso2/vscode-extensions) or contact the WSO2 developer team.

---
