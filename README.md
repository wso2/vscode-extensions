# WSO2 VSCode Extensions

This repository contains multiple Visual Studio Code extensions developed by WSO2, along with a set of shared libraries. The extensions in this monorepo include:

- [Ballerina](https://marketplace.visualstudio.com/items?itemName=WSO2.ballerina)
- [Choreo](https://marketplace.visualstudio.com/items?itemName=WSO2.choreo)
- [WSO2 Integrator: BI](https://marketplace.visualstudio.com/items?itemName=WSO2.ballerina-integrator)
- [APK Config Language Support](https://marketplace.visualstudio.com/items?itemName=WSO2.apk-config-language-support)
- [WSO2 Integrator: MI](https://marketplace.visualstudio.com/items?itemName=WSO2.micro-integrator)

## Prerequisites

Before using this repository, ensure you have the following installed:

- **Node.js** – version **22.x** or later  
  [Download Node.js](https://nodejs.org)

- **npm** – version **10.x** or later (comes with Node.js)

- **pnpm** – version **10.10** or later  
  Install with:
    ```bash
    npm install -g pnpm
    ```

- **Rush.js** – version **5.153** or later  
  Install with:
    ```bash
    npm install -g @microsoft/rush
    ```

## Installation

Install all dependencies for the repository:

```bash
rush install
```

This will install dependencies for all workspaces in the monorepo.

## Building the Monorepo

To build all packages:

```bash
rush build
```

This uses a local build cache, so only changed packages are rebuilt.

### Building a Single Workspace

To build a specific package:

```bash
rush build --to <package-name>
```

Replace `<package-name>` with the name of the package you want to build.

Example:
```bash
rush build --to @wso2/ballerina-visualizer
```

### Adding a New Package

To add a new package:

1. Navigate to the root directory of the desired package:
    ```bash
    cd <path-to-workspace>
    ```
2. Run:
    ```bash
    rush add --package <package-name>
    ```
   Use the `-m` argument to update other packages' `package.json` files to the same version if needed.

## Other Important Commands

- `rush update`: Updates the dependencies shrinkwrap file.
- `rush rebuild`: Cleans the `common/temp` folder and then runs `rush build`.
- `rush check`: Checks dependency consistency across packages.
- `rush purge`: Cleans up temporary files and folders.

## Git Pre-Commit Hooks

This repository uses [Husky](https://typicode.github.io/husky/) to enforce code quality standards before commits.

### Strict Version Validation

All `package.json` files must use **strict versioning** for npm dependencies:
- ❌ **Not allowed**: `^1.2.3`, `~1.2.3` (caret and tilde prefixes)
- ✅ **Allowed**: `1.2.3` (exact version)

The pre-commit hook will automatically validate all staged `package.json` files and block commits with non-strict versions.

For more details, see the [Git Hooks Documentation](./docs/git-hooks.md).

## Contribution Guidelines

If you are planning on contributing to the development efforts of WSO2 API Manager or related extensions, you can do so by checking out the latest development version. The `master` branch holds the latest unreleased source code.

Please follow the detailed instructions available here: [https://wso2.github.io](https://wso2.github.io)

- Fork the repository before making changes.
- Follow the structure and conventions outlined in this document.
- Submit pull requests with clear descriptions and reference related issues if applicable.

## License

By downloading and using any of the Visual Studio Code extensions in this repository, you agree to the [license terms](https://wso2.com/licenses/ballerina-vscode-plugin-2021-05-25/) and [privacy statement](https://wso2.com/privacy-policy).

Some extensions use additional components licensed separately. For example:

- The Ballerina extension uses the Ballerina Language Server, part of the [Ballerina language](https://ballerina.io/) (Apache License 2.0).
- The Ballerina extension pack includes [TOML Language Support](https://marketplace.visualstudio.com/items?itemName=be5invis.toml).

Please refer to each extension's documentation for more details on licensing and dependencies.

## Source Organization Document

For organization-wide standards and additional information, see [SOURCE_ORG.md](./SOURCE_ORG.md).
