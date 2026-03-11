/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as assert from 'assert';
import { applyStructuredFilePatch } from '../../ai-features/agent-mode/tools/file_edit_patch';

suite('File Edit Patch Tests', () => {
    test('unique hunk replacement applies successfully', () => {
        const result = applyStructuredFilePatch('a\nb\nc', [
            { old_text: 'b', new_text: 'B' },
        ]);

        assert.strictEqual(result.success, true);
        if (result.success) {
            assert.strictEqual(result.newContent, 'a\nB\nc');
            assert.strictEqual(result.appliedHunks, 1);
        }
    });

    test('multiple hunks apply in one file', () => {
        const result = applyStructuredFilePatch('a\nb\nc\nd', [
            { old_text: 'a', new_text: 'A' },
            { old_text: 'd', new_text: 'D' },
        ]);

        assert.strictEqual(result.success, true);
        if (result.success) {
            assert.strictEqual(result.newContent, 'A\nb\nc\nD');
            assert.strictEqual(result.appliedHunks, 2);
        }
    });

    test('trailing whitespace differences do not break matching', () => {
        const result = applyStructuredFilePatch('key = value   \nnext', [
            { old_text: 'key = value', new_text: 'key = changed' },
        ]);

        assert.strictEqual(result.success, true);
        if (result.success) {
            assert.strictEqual(result.newContent, 'key = changed\nnext');
        }
    });

    test('CRLF content preserves CRLF output', () => {
        const result = applyStructuredFilePatch('a\r\nb\r\nc', [
            { old_text: 'b\nc', new_text: 'B\nC' },
        ]);

        assert.strictEqual(result.success, true);
        if (result.success) {
            assert.strictEqual(result.newContent, 'a\r\nB\r\nC');
            assert.ok(result.newContent.includes('\r\n'));
        }
    });

    test('repeated match without context is ambiguous', () => {
        const result = applyStructuredFilePatch('x\nneedle\nx\nneedle\nx', [
            { old_text: 'needle', new_text: 'N' },
        ]);

        assert.strictEqual(result.success, false);
        if (!result.success) {
            assert.strictEqual(result.code, 'HUNK_AMBIGUOUS');
        }
    });

    test('repeated match with context resolves uniquely', () => {
        const content = 'first\nneedle\nafter-first\nsecond\nneedle\nafter-second';
        const result = applyStructuredFilePatch(content, [
            {
                old_text: 'needle',
                new_text: 'NEEDLE',
                context_before: 'second',
                context_after: 'after-second',
            },
        ]);

        assert.strictEqual(result.success, true);
        if (result.success) {
            assert.strictEqual(result.newContent, 'first\nneedle\nafter-first\nsecond\nNEEDLE\nafter-second');
        }
    });

    test('line_hint disambiguates nearest match', () => {
        const content = 'alpha\nneedle\nbeta\nneedle\ngamma';
        const result = applyStructuredFilePatch(content, [
            {
                old_text: 'needle',
                new_text: 'NEEDLE',
                line_hint: 4,
            },
        ]);

        assert.strictEqual(result.success, true);
        if (result.success) {
            assert.strictEqual(result.newContent, 'alpha\nneedle\nbeta\nNEEDLE\ngamma');
        }
    });

    test('deletion hunk removes matching line', () => {
        const content = 'keep_before\nline_to_delete\nkeep_after';
        const result = applyStructuredFilePatch(content, [
            {
                old_text: 'line_to_delete',
                new_text: '',
            },
        ]);

        assert.strictEqual(result.success, true);
        if (result.success) {
            assert.strictEqual(result.newContent, 'keep_before\nkeep_after');
            assert.ok(!result.newContent.includes('line_to_delete'));
        }
    });

    test('equidistant line_hint remains ambiguous when multiple candidates tie', () => {
        const content = 'start\nneedle\nmiddle\nneedle\nend';
        const result = applyStructuredFilePatch(content, [
            {
                old_text: 'needle',
                new_text: 'NEEDLE',
                line_hint: 3,
            },
        ]);

        assert.strictEqual(result.success, false);
        if (!result.success) {
            assert.strictEqual(result.code, 'HUNK_AMBIGUOUS');
        }
    });

    test('missing target returns not found', () => {
        const result = applyStructuredFilePatch('a\nb\nc', [
            { old_text: 'missing', new_text: 'x' },
        ]);

        assert.strictEqual(result.success, false);
        if (!result.success) {
            assert.strictEqual(result.code, 'HUNK_NOT_FOUND');
        }
    });

    test('overlapping hunks are rejected', () => {
        const result = applyStructuredFilePatch('a\nb\nc\nd', [
            { old_text: 'b\nc', new_text: 'B\nC' },
            { old_text: 'c\nd', new_text: 'C\nD' },
        ]);

        assert.strictEqual(result.success, false);
        if (!result.success) {
            assert.strictEqual(result.code, 'HUNK_OVERLAP');
        }
    });

    test('failed multi-hunk patch is atomic in-memory', () => {
        const original = 'a\nb\nc';
        const result = applyStructuredFilePatch(original, [
            { old_text: 'a', new_text: 'A' },
            { old_text: 'missing', new_text: 'X' },
        ]);

        assert.strictEqual(result.success, false);
        if (!result.success) {
            assert.strictEqual(result.code, 'HUNK_NOT_FOUND');
            assert.strictEqual((result as any).newContent, undefined);
        }
        assert.strictEqual(original, 'a\nb\nc');
    });

    test('invalid hunk with empty old_text is rejected', () => {
        const result = applyStructuredFilePatch('a\nb\nc', [
            { old_text: '', new_text: 'x' },
        ]);

        assert.strictEqual(result.success, false);
        if (!result.success) {
            assert.strictEqual(result.code, 'INVALID_HUNK');
        }
    });
});
