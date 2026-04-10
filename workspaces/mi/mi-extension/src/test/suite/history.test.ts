/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
 * Unit tests for the History class — covers Issue #820.
 *
 * The bug required two fixes:
 *   1. goBack() must pop from history and navigate to the popped entry.
 *   2. The Add Artifact view must be pushed to history before a creation form
 *      is opened, so that goBack() can return the user to it.
 *
 * These unit tests verify the History stack behaviour that both fixes rely on.
 */

import * as assert from 'assert';
import { History, HistoryEntry } from '@wso2/mi-core';
import { MACHINE_VIEW } from '@wso2/mi-core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(view: MACHINE_VIEW): HistoryEntry {
    return { location: { view } };
}

const OVERVIEW_ENTRY     = makeEntry(MACHINE_VIEW.Overview);
const ADD_ARTIFACT_ENTRY = makeEntry(MACHINE_VIEW.ADD_ARTIFACT);
const API_FORM_ENTRY     = makeEntry(MACHINE_VIEW.APIForm);

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

suite('History — Issue #820', () => {
    let history: History;

    setup(() => {
        history = new History();
    });

    // -----------------------------------------------------------------------
    // Basic push / pop behaviour
    // -----------------------------------------------------------------------

    test('pop() on empty history returns undefined', () => {
        assert.strictEqual(history.pop(), undefined);
    });

    test('push() and pop() round-trip preserves the entry', () => {
        history.push(OVERVIEW_ENTRY);
        const popped = history.pop();
        assert.deepStrictEqual(popped, OVERVIEW_ENTRY);
    });

    test('pop() follows LIFO order', () => {
        history.push(OVERVIEW_ENTRY);
        history.push(ADD_ARTIFACT_ENTRY);
        history.push(API_FORM_ENTRY);

        assert.deepStrictEqual(history.pop(), API_FORM_ENTRY);
        assert.deepStrictEqual(history.pop(), ADD_ARTIFACT_ENTRY);
        assert.deepStrictEqual(history.pop(), OVERVIEW_ENTRY);
        assert.strictEqual(history.pop(), undefined);
    });

    test('get() returns a copy of the stack that does not mutate the original', () => {
        history.push(OVERVIEW_ENTRY);
        history.push(ADD_ARTIFACT_ENTRY);

        const snapshot = history.get();
        snapshot.pop(); // mutate the copy

        assert.strictEqual(history.get().length, 2, 'Original stack must not be mutated');
    });

    // -----------------------------------------------------------------------
    // Issue #820 — Add Artifact entry is present before form entry
    // -----------------------------------------------------------------------

    /**
     * Simulates the fixed handleClick() flow:
     *   1. addToHistory(AddArtifact)  ← fix applied
     *   2. executeCommand opens API Form  [not tracked in history directly]
     *
     * Then simulates goBack():
     *   pop() should return the Add Artifact entry, not Overview.
     */
    test('pop() after pushing Overview then AddArtifact returns AddArtifact entry', () => {
        // Project Overview is always in history first (navigated to via home/init).
        history.push(OVERVIEW_ENTRY);
        // handleClick() now calls addToHistory for ADD_ARTIFACT before opening a form.
        history.push(ADD_ARTIFACT_ENTRY);

        const poppedByGoBack = history.pop();

        assert.deepStrictEqual(
            poppedByGoBack,
            ADD_ARTIFACT_ENTRY,
            'goBack() must return Add Artifact, not Project Overview'
        );
        assert.notDeepStrictEqual(
            poppedByGoBack,
            OVERVIEW_ENTRY,
            'goBack() must NOT return Project Overview'
        );
    });

    /**
     * Without the fix, Add Artifact was never pushed to history.
     * Simulates the pre-fix history state: Overview is the only entry.
     * pop() would then return Overview — confirming what the bug caused.
     */
    test('pop() without AddArtifact in stack returns Overview — documents pre-fix behaviour', () => {
        // Pre-fix: only Overview in stack; Add Artifact was never pushed.
        history.push(OVERVIEW_ENTRY);

        const poppedByOldGoBack = history.pop();

        assert.deepStrictEqual(
            poppedByOldGoBack,
            OVERVIEW_ENTRY,
            'Without the fix, pop() would return Overview (the bug)'
        );
    });

    /**
     * Verifies that after go-back, the remaining history contains only
     * the entries that were in the stack before the user entered the form.
     */
    test('history length decreases by 1 after each pop()', () => {
        history.push(OVERVIEW_ENTRY);
        history.push(ADD_ARTIFACT_ENTRY);

        assert.strictEqual(history.get().length, 2);

        history.pop();
        assert.strictEqual(history.get().length, 1);

        history.pop();
        assert.strictEqual(history.get().length, 0);
    });

    // -----------------------------------------------------------------------
    // clear() / clearAndPopulateWith()
    // -----------------------------------------------------------------------

    test('clear() empties the history stack', () => {
        history.push(OVERVIEW_ENTRY);
        history.push(ADD_ARTIFACT_ENTRY);
        history.clear();
        assert.strictEqual(history.get().length, 0);
        assert.strictEqual(history.pop(), undefined);
    });

    test('clearAndPopulateWith() replaces the stack with a single entry', () => {
        history.push(OVERVIEW_ENTRY);
        history.push(ADD_ARTIFACT_ENTRY);
        history.clearAndPopulateWith(OVERVIEW_ENTRY);

        const stack = history.get();
        assert.strictEqual(stack.length, 1);
        assert.deepStrictEqual(stack[0], OVERVIEW_ENTRY);
    });

    // -----------------------------------------------------------------------
    // select() — used by breadcrumb navigation
    // -----------------------------------------------------------------------

    test('select(index) truncates history to the selected entry', () => {
        history.push(OVERVIEW_ENTRY);
        history.push(ADD_ARTIFACT_ENTRY);
        history.push(API_FORM_ENTRY);

        history.select(0); // select Overview

        const stack = history.get();
        assert.strictEqual(stack.length, 1);
        assert.deepStrictEqual(stack[0], OVERVIEW_ENTRY);
    });

    test('select() with an out-of-range index is a no-op', () => {
        history.push(OVERVIEW_ENTRY);
        history.push(ADD_ARTIFACT_ENTRY);

        history.select(-1);
        assert.strictEqual(history.get().length, 2, 'select(-1) must not mutate the stack');

        history.select(99);
        assert.strictEqual(history.get().length, 2, 'select(99) must not mutate the stack');
    });

    // -----------------------------------------------------------------------
    // updateCurrentEntry()
    // -----------------------------------------------------------------------

    test('updateCurrentEntry() replaces the top of the stack', () => {
        history.push(OVERVIEW_ENTRY);
        history.push(ADD_ARTIFACT_ENTRY);
        history.updateCurrentEntry(API_FORM_ENTRY);

        const stack = history.get();
        assert.strictEqual(stack.length, 2);
        assert.deepStrictEqual(stack[1], API_FORM_ENTRY);
        assert.deepStrictEqual(stack[0], OVERVIEW_ENTRY, 'earlier entries must remain unchanged');
    });

    test('updateCurrentEntry() on empty history is a no-op', () => {
        history.updateCurrentEntry(OVERVIEW_ENTRY);
        assert.strictEqual(history.get().length, 0);
    });
});
