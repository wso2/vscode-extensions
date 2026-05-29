---
name: ballerina-e2e-writer
description: Use when adding or updating Ballerina extension E2E tests that need agent-assisted VS Code authoring before promotion into the Playwright suite.
---

# Ballerina E2E Writer

Use this skill when adding new Ballerina extension user-flow E2E coverage in `workspaces/ballerina/ballerina-extension`.

For user-facing instructions and prompt examples, see `USER_GUIDE.md` in this skill directory.

## Workflow

1. Read the requested scenario and existing tests in `e2e-test/e2e-playwright-tests`.
2. Ensure the Ballerina VSIX exists locally. Check for a file matching `ballerina-*.vsix` in the workspace root (e.g., `ballerina-5.11.0.vsix`). If none is found, ask the user to run:

   ```bash
   rush build -t ballerina
   ```

3. Create `scenario.md` under the authoring scenario directory before writing any step files:

   ```text
   e2e-test/e2e-authoring/scenarios/<scenario-name>/scenario.md
   ```

   If the user only described the scenario in the prompt, derive the steps and write `scenario.md` now. If the user provided a `scenario.md` path, read it first.

4. Write small step files in `steps/*.step.js`. Keep each step focused and rerunnable.
   For diagram flows, steps must build the flow through the product UI:
   click the diagram plus button, open the node palette, search or select the node, fill the form, then save.
5. Run the steps through the named daemon:

   ```bash
   bash e2e-test/e2e-authoring/scripts/run-steps.sh <scenario-name> e2e-test/e2e-authoring/scenarios/<scenario-name>/steps
   ```

6. If a selector is unstable, add a stable `data-testid` in the relevant `workspaces/ballerina/*/src` UI package. Do not use dynamic/generated class names as selectors, including Emotion class names.
   After adding any `data-testid` — even a single attribute in one file — always rebuild the VSIX before rerunning steps:

   ```bash
   rush build -t ballerina
   ```

7. Once the step flow is proven, promote the same UI flow into a new spec file. Place the spec in the subdirectory that best matches the integration category, following the existing layout:

   ```text
   e2e-test/e2e-playwright-tests/<category>/<scenario-name>.spec.ts
   ```

   Existing categories: `api-integration`, `file-integration`, `other-artifacts`, `diagram`, `configuration`, `type-editor`. Check the subdirectories and pick the closest match.
8. Register the promoted spec in `e2e-test/e2e-playwright-tests/test.list.ts`.
9. Verify with:

   ```bash
   npm run e2e-test -- --grep "<test name>"
   ```

   A passing run prints each `logStep` line to the terminal and exits 0. If the extension fails to launch, check the VS Code host stderr for VSIX load errors — this means a stale build; rebuild and rerun.

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
