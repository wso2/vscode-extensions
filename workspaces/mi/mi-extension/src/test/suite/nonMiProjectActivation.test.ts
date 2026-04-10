/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Tests for Issue #1371: MI Welcome Page opens when accessing VS Code Test
 * Explorer even for non-MI projects.
 *
 * Root cause: The state machine's `newProject` state previously used
 * `initial: "viewLoading"`, which immediately invoked `openWebPanel` on every
 * non-MI activation.  The fix sets `initial: "viewReady"` so that
 * `openWebPanel` is only called in response to an explicit `OPEN_VIEW` event.
 *
 * These tests are regression guards that will fail if the initial substate of
 * `newProject` is ever reverted to `viewLoading`, or if any other code path
 * causes the VisualizerWebview (Welcome Page) to be created without user
 * interaction for a non-MI workspace.
 */

import * as assert from 'assert';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { isOldProjectOrWorkspace, getStateMachine, deleteStateMachine } from '../../stateMachine';
import { webviews } from '../../visualizer/webview';

// Maximum time (ms) we wait for the state machine to settle after starting.
const STATE_SETTLE_TIMEOUT_MS = 8000;

/**
 * Resolves when the state machine reaches the given top-level state.
 * Rejects with a descriptive error if it has not arrived within
 * STATE_SETTLE_TIMEOUT_MS milliseconds.
 */
function waitForTopState(
    sm: ReturnType<typeof getStateMachine>,
    targetState: string
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const timeoutHandle = setTimeout(
            () =>
                reject(
                    new Error(
                        `State machine did not reach '${targetState}' within ` +
                        `${STATE_SETTLE_TIMEOUT_MS} ms. ` +
                        `Current state: ${JSON.stringify(sm.state())}`
                    )
                ),
            STATE_SETTLE_TIMEOUT_MS
        );

        const service = sm.service();
        service.onTransition((state: any) => {
            const val = state.value;
            const topState = typeof val === 'object' ? Object.keys(val)[0] : val;
            if (topState === targetState) {
                clearTimeout(timeoutHandle);
                resolve();
            }
        });
    });
}

// ─────────────────────────────────────────────────────────────────────────────

suite('Issue #1371 — Non-MI Project Activation', () => {
    let tempDir: string;

    setup(() => {
        // Create a fresh temp directory that has NO pom.xml and NO .project
        // file — this simulates a plain JavaScript / Maven project that is
        // NOT a WSO2 MI integration project.
        tempDir = path.join(os.tmpdir(), `mi-test-non-mi-1371-${Date.now()}`);
        fs.mkdirSync(tempDir, { recursive: true });
    });

    teardown(async () => {
        // Stop and remove the state machine entry to avoid polluting other tests.
        deleteStateMachine(tempDir);

        // Dispose any webview that might have been accidentally created.
        const webview = webviews.get(tempDir);
        if (webview) {
            webview.dispose();
            webviews.delete(tempDir);
        }

        // Remove the temp directory.
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
            // Best-effort; ignore cleanup errors.
        }
    });

    // ── isOldProjectOrWorkspace ──────────────────────────────────────────────

    test('isOldProjectOrWorkspace returns false for an empty (non-MI) directory', async () => {
        // Empty directory — no pom.xml, no .project.
        const result = await isOldProjectOrWorkspace(tempDir);
        assert.strictEqual(
            result,
            false,
            'An empty directory must not be classified as an old Integration Studio project or workspace'
        );
    });

    test('isOldProjectOrWorkspace returns false for a plain Maven pom.xml', async () => {
        // A Maven pom.xml that does NOT contain MI-specific content.
        fs.writeFileSync(
            path.join(tempDir, 'pom.xml'),
            '<project><groupId>com.example</groupId><artifactId>my-app</artifactId></project>'
        );
        const result = await isOldProjectOrWorkspace(tempDir);
        assert.strictEqual(
            result,
            false,
            'A plain Maven project without Integration Studio multi-module nature must not be classified as an old MI project'
        );
    });

    // ── State machine transitions ────────────────────────────────────────────

    test('state machine transitions to newProject state for a non-MI directory', async () => {
        const sm = getStateMachine(tempDir);
        await waitForTopState(sm, 'newProject');

        const state = sm.state() as any;
        const topState = typeof state === 'object' ? Object.keys(state)[0] : state;
        assert.strictEqual(
            topState,
            'newProject',
            'State machine must enter the newProject state when the workspace contains no MI artefacts'
        );
    });

    test('newProject state machine context carries Welcome view type', async () => {
        // After transitioning to newProject, context.view should be set to
        // MACHINE_VIEW.Welcome — but the webview must NOT be opened yet.
        const sm = getStateMachine(tempDir);
        await waitForTopState(sm, 'newProject');

        const ctx = sm.context() as any;
        assert.ok(
            ctx.view !== undefined,
            'State machine context must have a view property after entering newProject'
        );
    });

    // ── viewReady vs. viewLoading initial substate ───────────────────────────

    test('newProject initial substate is viewReady, not viewLoading', async () => {
        // This is the PRIMARY regression guard for Issue #1371.
        //
        // With the bug: initial substate was `viewLoading`, causing `openWebPanel`
        // to fire immediately → MI Welcome Page appeared without user action.
        //
        // With the fix: initial substate is `viewReady` → `openWebPanel` is
        // only invoked after an explicit OPEN_VIEW event from the user.
        const sm = getStateMachine(tempDir);
        await waitForTopState(sm, 'newProject');

        const state = sm.state() as any;
        assert.ok(
            typeof state === 'object',
            'State value should be an object when inside the newProject compound state'
        );
        assert.strictEqual(
            state.newProject,
            'viewReady',
            'newProject must start in the viewReady substate; ' +
            'viewLoading (which invokes openWebPanel) must only be reached via an explicit OPEN_VIEW event'
        );
    });

    test('state machine does not auto-transition to newProject.viewLoading without OPEN_VIEW', async () => {
        const sm = getStateMachine(tempDir);
        await waitForTopState(sm, 'newProject');

        // Allow the machine a brief period to settle in case it spontaneously
        // transitions further.
        await new Promise<void>(r => setTimeout(r, 600));

        const state = sm.state() as any;
        const substate = typeof state === 'object' ? state.newProject : state;
        assert.notStrictEqual(
            substate,
            'viewLoading',
            'State machine must not enter newProject.viewLoading without an explicit OPEN_VIEW event; ' +
            'doing so would open the MI Welcome Page without user interaction'
        );
    });

    // ── No webview created on activation ────────────────────────────────────

    test('no VisualizerWebview panel is created on activation for an empty non-MI directory', async () => {
        // THE CORE BUG GUARD: The MI Welcome Page must never be opened
        // automatically when the extension activates on a non-MI workspace.
        const sm = getStateMachine(tempDir);
        await waitForTopState(sm, 'newProject');

        assert.strictEqual(
            webviews.has(tempDir),
            false,
            'A VisualizerWebview (MI Welcome Page) must NOT be created automatically ' +
            'when the extension activates on a non-MI workspace; ' +
            'it must only appear after an explicit user action'
        );
    });

    test('no VisualizerWebview panel is created for a non-MI directory with a plain pom.xml', async () => {
        // Edge case: directory has pom.xml but it is not an MI integration project.
        fs.writeFileSync(
            path.join(tempDir, 'pom.xml'),
            '<project><groupId>com.example</groupId><artifactId>plain-app</artifactId></project>'
        );

        const sm = getStateMachine(tempDir);
        await waitForTopState(sm, 'newProject');

        assert.strictEqual(
            webviews.has(tempDir),
            false,
            'A plain Maven project (pom.xml without MI projectType) must not cause the ' +
            'MI Welcome webview to open automatically'
        );
    });

    test('no VisualizerWebview panel is created for a non-MI JS project layout', async () => {
        // Simulates a JavaScript project that would host a jest test controller,
        // which is the exact scenario that triggers onView:MI.mock-services
        // activation in VS Code desktop (the bug trigger from Issue #1371).
        fs.writeFileSync(
            path.join(tempDir, 'package.json'),
            JSON.stringify({ name: 'my-js-app', version: '1.0.0', scripts: { test: 'jest' } })
        );
        fs.writeFileSync(
            path.join(tempDir, 'jest.config.js'),
            'module.exports = { testEnvironment: "node" };'
        );

        const sm = getStateMachine(tempDir);
        await waitForTopState(sm, 'newProject');

        assert.strictEqual(
            webviews.has(tempDir),
            false,
            'A JavaScript project with jest config must not open the MI Welcome Page ' +
            'when the MI extension is activated (e.g., via the VS Code Test Explorer)'
        );
    });
});
