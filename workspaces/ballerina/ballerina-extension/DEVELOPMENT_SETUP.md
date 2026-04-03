# Ballerina Extension Development Setup

## Initial Setup

Run `rush install` once after cloning the repository to install dependencies and set up the workspace.

## Build

Use `rush build` for a full build of the repository.

To build only the Ballerina package, run:

```bash
rush build -t ballerina
```

## Language Server

For local development, the Ballerina language server is not downloaded automatically during `rush build` anymore. Before building the extension, download the bundled language server into `workspaces/ballerina/ballerina-extension/ls`:

```bash
pnpm --dir workspaces/ballerina/ballerina-extension run download-ls
```

If you want the latest prerelease instead, run:

```bash
pnpm --dir workspaces/ballerina/ballerina-extension run download-ls -- --prerelease --replace
```

If you need a specific release tag such as `v1.8.0.m1`, run:

```bash
pnpm --dir workspaces/ballerina/ballerina-extension run download-ls -- --tag v1.8.0.m1 --replace
```

The build will fail with a clear message if the `ls` directory does not contain a `ballerina-language-server*.jar`.

## BI End-to-End Tests

BI Playwright tests are located in `e2e-test/e2e-playwright-tests`.

From this directory (`workspaces/ballerina/ballerina-extension`):

- Run `pnpm run e2e-test:bi` to execute BI Playwright tests.
- Run `pnpm run e2e-test:bi:download-prerelease` to run BI tests after downloading prerelease VSIXs.
