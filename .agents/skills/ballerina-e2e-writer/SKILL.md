---
name: ballerina-e2e-writer
description: Use when adding or updating Ballerina extension E2E tests that need agent-assisted VS Code authoring before promotion into the Playwright suite.
---

# Ballerina E2E Writer

Use this skill when adding new Ballerina extension user-flow E2E coverage in `workspaces/ballerina/ballerina-extension`.

For user-facing instructions and prompt examples, see `USER_GUIDE.md` in this skill directory.

## Workflow

1. Read the requested scenario and existing tests in `e2e-test/e2e-playwright-tests`.
2. Ensure the Ballerina VSIX exists locally. If it is missing, ask the user to run:

   ```bash
   rush build -t ballerina
   ```

3. Create or update an authoring scenario under:

   ```text
   e2e-test/e2e-authoring/scenarios/<scenario-name>/
   ```

4. Write small step files in `steps/*.step.js`. Keep each step focused and rerunnable.
5. Run the steps through the named daemon:

   ```bash
   bash e2e-test/e2e-authoring/scripts/run-steps.sh <scenario-name> e2e-test/e2e-authoring/scenarios/<scenario-name>/steps
   ```

6. If a selector is unstable, add a stable `data-testid` in the relevant `workspaces/ballerina/*/src` UI package. Do not use generated Emotion class names.
7. Once the step flow is proven, promote it into `e2e-test/e2e-playwright-tests`.
8. Register the promoted spec in `e2e-test/e2e-playwright-tests/test.list.ts`.
9. Verify with:

   ```bash
   npm run e2e-test -- --grep "<test name>"
   ```

## Harness Rules

- The authoring daemon is only for scenario discovery and fast iteration.
- The committed source of truth is the normal Playwright spec.
- Use `@wso2/playwright-vscode-tester` launch behavior through the authoring daemon.
- Prefer existing helpers: `initTest`, `getWebview`, `addArtifact`, `ProjectExplorer`, and `Diagram`.
- Extension webview action selectors should be `data-testid`, stable roles, or stable accessible names.
- VS Code shell selectors may use stable workbench ARIA labels where needed.

## Useful Commands

Run all authoring steps:

```bash
cd workspaces/ballerina/ballerina-extension
bash e2e-test/e2e-authoring/scripts/run-steps.sh http-upload e2e-test/e2e-authoring/scenarios/http-upload/steps
```

Run a step range:

```bash
bash e2e-test/e2e-authoring/scripts/run-steps.sh http-upload e2e-test/e2e-authoring/scenarios/http-upload/steps 02 03
```

Run promoted test:

```bash
npm run e2e-test -- --grep "HTTP Upload"
```
