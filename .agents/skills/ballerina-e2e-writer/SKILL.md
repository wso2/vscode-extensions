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
   For diagram flows, steps must build the flow through the product UI:
   click the diagram plus button, open the node palette, search or select the node, fill the form, then save.
5. Run the steps through the named daemon:

   ```bash
   bash e2e-test/e2e-authoring/scripts/run-steps.sh <scenario-name> e2e-test/e2e-authoring/scenarios/<scenario-name>/steps
   ```

6. If a selector is unstable, add a stable `data-testid` in the relevant `workspaces/ballerina/*/src` UI package. Do not use dynamic/generated class names as selectors, including Emotion class names.
   If product source was changed for a new `data-testid`, rebuild the VSIX before rerunning E2E:

   ```bash
   rush build -t ballerina
   ```

7. Once the step flow is proven, promote the same UI flow into `e2e-test/e2e-playwright-tests`.
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
- Do not create or modify Ballerina flow files directly to build the scenario. Source files may be read for final verification only.
- Build diagram flows top-to-bottom so each saved form leaves the project compilable for the next form.
- When a form input opens the helper panel, either use it intentionally to choose inputs/variables or press `Escape` to dismiss it before saving. The helper panel can cover the Save button.
- Fill form fields through stable labels, `data-testid`, CodeMirror helpers, or helper-panel selections. Never select extension UI by dynamic/generated class names such as Emotion CSS classes.
- Add terminal-visible progress logs for each major E2E step using `logStep` from `e2e-playwright-tests/utils/helpers`, so headless failures show the last completed action.
- Always use the authoring harness first, then promote the passing UI flow into `e2e-playwright-tests`, and verify with `npm run e2e-test -- --grep "<test name>"`.

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
