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

6. If a selector is unstable or an element cannot be found by `data-testid`, add a stable `data-testid` attribute to that element in the relevant `workspaces/ballerina/*/src` UI package. Do not use dynamic/generated class names as selectors, including Emotion class names.
   After adding any `data-testid` — even a single attribute in one file — always rebuild the VSIX and install it before rerunning steps:

   ```bash
   rush build -t ballerina
   ```

   Then install the newly built VSIX into the test VS Code instance (the harness daemon picks up the VSIX from the workspace root). If the VS Code instance is already running the old extension version, stop it, reinstall the VSIX, and restart before retrying.

   **If the installed version looks unchanged** (VS Code loads the cached build because the version string is identical): bump the version in `workspaces/ballerina/ballerina-extension/package.json` by appending a timestamp suffix, e.g. `"5.12.0"` → `"5.12.0-20260520"`. Then rebuild and reinstall:

   ```bash
   rush build -t ballerina
   ```

   This forces VS Code to treat it as a genuinely new extension version, bypassing any cached install. Once the selector is confirmed working you can revert the version string.

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
- Extension webview action selectors should be `data-testid`, stable roles, or stable accessible names. If an element has no `data-testid`, do not work around it with fragile selectors — add the `data-testid`, rebuild, reinstall, and retry.
- VS Code shell selectors may use stable workbench ARIA labels where needed.
- Do not create or modify Ballerina flow files directly to build the scenario. Source files may be read for final verification only.
- Build diagram flows top-to-bottom so each saved form leaves the project compilable for the next form.
- When a form input opens the helper panel, either use it intentionally to choose inputs/variables or press `Escape` to dismiss it before saving. The helper panel can cover the Save button.
- Fill form fields through stable labels, `data-testid`, CodeMirror helpers, or helper-panel selections. Never select extension UI by dynamic/generated class names such as Emotion CSS classes.
- Add terminal-visible progress logs for each major E2E step using `logStep` from `e2e-playwright-tests/utils/helpers`, so headless failures show the last completed action.
- Always use the authoring harness first, then promote the passing UI flow into `e2e-playwright-tests`, and verify with `npm run e2e-test -- --grep "<test name>"`.

## Diagram and SidePanel — Correct Usage in Specs

`Diagram` and `SidePanel` require explicit initialisation before use. The constructor signature is not enough — `init()` must be awaited:

```typescript
// Diagram: pass only page.page, then call init()
const diagram = new Diagram(page.page);
await diagram.init();
await diagram.clickHoverAddButtonByIndex(0);

// SidePanel: pass BOTH the webview Frame AND page.page, then call init()
const sidePanel = new SidePanel(artifactWebView, page.page);
await sidePanel.init();
await sidePanel.clickNode('Return');
```

Common mistakes that cause silent failures:
- `new Diagram(page.page, artifactWebView)` — extra arg is silently ignored, but `init()` is still needed
- `new SidePanel(artifactWebView)` — missing `page.page` makes `clickNode` crash when it tries `this._page.waitForTimeout()`
- Skipping `await diagram.init()` — `diagramWebView` stays `undefined`, every method throws

### `clickHoverAddButtonByIndex` does NOT work for function body diagrams

`Diagram.clickHoverAddButtonByIndex(index)` looks for `[data-testid="diagram-link-${index}"]`. In most flows this works fine, but the function body diagram's start→end link has `data-testid="diagram-link-undefined"` (not a numeric index). The method will always time out.

For function body diagrams, use prefix matching instead:

```typescript
const link = canvas.locator('[data-testid^="diagram-link-"]').first();
await link.waitFor({ timeout: 15000 });
await link.hover();
await artifactWebView.waitForTimeout(500);
const addBtn = canvas.locator('[data-testid^="link-add-button-"]').first();
await addBtn.waitFor({ state: 'visible', timeout: 5000 });
await addBtn.click({ force: true });
```

This is the same approach the authoring harness `clickNextDiagramPlus` uses internally.

## Daemon Context Limitations

The daemon VM context does NOT include the Playwright page-helper classes from `e2e-playwright-tests`. In step files, these are **not available**: `ProjectExplorer`, `Diagram`, `SidePanel`. These are only available in the promoted spec (which imports them from `utils/pages`).

When a step needs host-window navigation (e.g. right-clicking a tree item to delete an artifact), inline the logic instead:

```javascript
// Inline ProjectExplorer.findItem — NOT available in daemon context
const explorer = window.getByRole('tree').locator('div').first();
const treeItem = explorer.locator(`div[role="treeitem"][aria-label='${name}']`);
await treeItem.click({ button: 'right' });
```

The daemon context DOES have: `window`, `Form`, `switchToIFrame`, `ExtendedPage`, `BI_INTEGRATOR_LABEL`, `fs`, `path`, `sessionDir`, and all globals registered in `helpers/*.js` (e.g. `addReturnNode`, `addDeclareVariableNode`, `getBIWebview`).

## Diagram DOM — React-Flow Renderer

The Ballerina Integrator diagram uses a **React-Flow** renderer. This means:

- **All node CSS classes are Emotion-generated** (e.g. `css-6l4gmo`). Do NOT use them as selectors — they change with each build.
- **Old SVG-based SCSS classes do not exist** in the DOM. Classes like `.return-comp-error`, `.return-comp-warning`, `.process-comp` (from `ballerina-low-code-diagram`) are NOT present.
- **Node error state** is shown via `<i class="fw-error-outline-rounded">` — a stable WSO2 design-system icon class. Assert it like: `canvas.locator('i.fw-error-outline-rounded')`.
- Nodes have `data-nodeid` attributes (internal React-Flow IDs), not stable `data-testid`. If you need to target a specific node type, add a `data-testid` to its component and rebuild.

When a locator fails on a diagram element, use `frame.evaluate` to inspect what's actually in the DOM:

```javascript
const classes = await frame.evaluate(() => {
  return Array.from(document.querySelectorAll('[class]'))
    .map(el => typeof el.className === 'string' ? el.className : el.className?.baseVal)
    .filter(Boolean);
});
console.log('classes:', JSON.stringify([...new Set(classes)]));
```

## CodeMirror Expression Fields — Fill via API, Not Keyboard

`keyboard.type(text)` or `keyboard.press` after `returnEditor.click()` drops the first character because CodeMirror needs a render tick to register focus. The authoring harness avoids this with `cmFill` which dispatches directly to the CM view. Replicate it in specs with `frame.evaluate`:

```typescript
await artifactWebView.evaluate(() => {
    const el = document.querySelectorAll('.cm-content')[0];
    const view = (el as any).cmView?.view;
    if (!view) throw new Error('CodeMirror view instance not found');
    view.focus();
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'firstName' } });
});
```

Use index `[1]`, `[2]` etc. if there are multiple CM editors on the form. After filling, press `Escape` to dismiss any autocomplete/helper panel before clicking Save.

Do NOT use `page.page.keyboard.type(text)` for CM editors — the first character will be silently dropped about half the time.

## Daemon Debugging — exec.sh

The daemon exposes `/tmp/ballerina-e2e-<session>/exec.sh` for running arbitrary step code against a live session without going through `run-steps.sh`. Use it to probe selectors interactively:

```bash
cat << 'STEP' | bash /tmp/ballerina-e2e-<session>/exec.sh
{
  const frame = await getBIWebview();
  const snap = await snapshot();
  console.log(snap.substring(0, 2000));
}
STEP
```

The `snapshot()` helper returns an ARIA snapshot of the webview. Use `hostSnapshot()` for the VS Code host window.

## Daemon Cleanup

If the daemon fails mid-run or VS Code crashes, stale Electron profile directories in `/var/folders/` prevent a clean restart. Always run this before retrying:

```bash
pkill -f "daemon.mjs <session-name>" 2>/dev/null
rm -f /tmp/ballerina-e2e-<session>/daemon.port /tmp/ballerina-e2e-<session>/daemon.pid
rm -rf /var/folders/*/T/settings/bi-authoring-*
```

## ParamEditor Interaction Patterns

The function/service parameter editor has several non-obvious behaviours validated in production:

1. **Scope locators to `[data-testid="bi-param-editor"]`** — the function form has multiple `vscode-text-area` elements; without scoping, the Description field gets filled instead of the Type field.

2. **Pierce shadow DOM with chained locator**: `paramEditor.locator('vscode-text-area').first().locator('textarea')` — CSS compound selectors do NOT pierce shadow DOM.

3. **Dismiss TypeHelper before clicking Add/Save** — after typing a type, the TypeHelper portal can intercept clicks:
   ```javascript
   const helper = frame.locator(`[data-testid="type-helper-item-${type}"]`);
   if (await helper.isVisible({ timeout: 3000 }).catch(() => false)) {
     await helper.click({ force: true });
   } else {
     await typeInput.press('Escape');
   }
   ```

4. **Use `pressSequentially` (not `fill`) for the name input** — the IdentifierField validator needs character-level events. Also `selectText()` before typing to clear existing value.

5. **After form save + server round-trip, the name field becomes read-only** — `identifierEditable` from the server is `false`. To rename: click the `Icon Button` (pencil) button inside the paramEditor, fill the new name, click the first `Save` button (inline save), then change type, then click the last `Save` button (main param editor save).

6. **Wait for `[data-testid="${paramName}-item"]` after clicking Add** — this confirms the param was saved and the editor closed.

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
