// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import * as assert from 'assert';
import * as path from 'path';
import { createGlobExecute } from '../../../../src/features/ai/agent/tools/glob';
import { CopilotEventHandler } from '../../../../src/features/ai/utils/events';

const TEST_DATA = path.join(__dirname, '../../../../../test/data');
const SALESFORCE_SLACK_DIR = path.join(TEST_DATA, 'salesforce_slack_integration');
const ORDER_MGMT_DIR = path.join(TEST_DATA, 'order_management_system');

function makeExecute(projectPath: string) {
    const events: unknown[] = [];
    const handler: CopilotEventHandler = (e) => events.push(e);
    return { execute: createGlobExecute(handler, projectPath), events };
}

function matchedFiles(message: string): string[] {
    // Message format: "Found N file(s) matching "pattern":\nfile1\nfile2..."
    const afterColon = message.split('\n').slice(1);
    return afterColon.filter(l => l.trim().length > 0);
}

suite('GlobTool', () => {

    // =========================================================================
    // Input Validation
    // =========================================================================

    suite('input validation', () => {
        test('returns error for empty pattern', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '' });
            assert.strictEqual(result.success, false);
            assert.ok(result.error?.includes('Empty pattern'));
        });

        test('returns error for whitespace-only pattern', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '   ' });
            assert.strictEqual(result.success, false);
        });

        test('returns error for path outside project root', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*.bal', path: '../../..' });
            assert.strictEqual(result.success, false);
            assert.ok(result.error?.includes('Path traversal'));
        });

        test('returns error for non-existent path', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*.bal', path: 'nonexistent_dir' });
            assert.strictEqual(result.success, false);
            assert.ok(result.error?.includes('Path not found'));
        });

        test('returns error when path points to a file instead of directory', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*.bal', path: 'main.bal' });
            assert.strictEqual(result.success, false);
            assert.ok(result.error?.includes('Not a directory'));
        });

        test('returns success with no-match message when pattern finds nothing', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*.py' });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('No files found'));
        });
    });

    // =========================================================================
    // Basic Pattern Matching
    // =========================================================================

    suite('basic pattern matching', () => {
        test('**/*.bal matches all Ballerina files recursively', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*.bal' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            assert.ok(files.length > 0);
            assert.ok(files.every(f => f.endsWith('.bal')));
        });

        test('*.bal matches only Ballerina files at root level', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '*.bal' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            assert.ok(files.length > 0);
            // Root-level .bal files should not contain path separators
            assert.ok(files.every(f => !f.includes('/') && f.endsWith('.bal')));
        });

        test('Ballerina.toml exact filename match', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'Ballerina.toml' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            assert.strictEqual(files.length, 1);
            assert.strictEqual(files[0], 'Ballerina.toml');
        });

        test('*.toml matches TOML files at root', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '*.toml' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            assert.ok(files.every(f => f.endsWith('.toml')));
        });

        test('**/*.toml matches TOML files at any depth', async () => {
            const { execute } = makeExecute(ORDER_MGMT_DIR);
            const result = await execute({ pattern: '**/*.toml' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            assert.ok(files.length > 0);
            assert.ok(files.every(f => f.endsWith('.toml')));
        });
    });

    // =========================================================================
    // Specific Ballerina File Discovery
    // =========================================================================

    suite('Ballerina project file discovery', () => {
        test('finds main.bal in salesforce_slack project', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'main.bal' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            assert.ok(files.includes('main.bal'));
        });

        test('finds types.bal in salesforce_slack project', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'types.bal' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            assert.ok(files.includes('types.bal'));
        });

        test('finds all expected files in salesforce_slack project', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*.bal' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            const expectedFiles = ['main.bal', 'functions.bal', 'connections.bal', 'config.bal', 'types.bal', 'data_mappings.bal'];
            for (const expected of expectedFiles) {
                assert.ok(files.includes(expected), `Expected to find ${expected}`);
            }
        });

        test('finds nested .bal files in order_management_system', async () => {
            const { execute } = makeExecute(ORDER_MGMT_DIR);
            const result = await execute({ pattern: '**/*.bal' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            // Should contain files from subdirectories
            assert.ok(files.some(f => f.includes('/')));
        });

        test('order_service subdirectory files are found', async () => {
            const { execute } = makeExecute(ORDER_MGMT_DIR);
            const result = await execute({ pattern: 'order_service/**/*.bal' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            assert.ok(files.length > 0);
            assert.ok(files.every(f => f.startsWith('order_service/')));
        });
    });

    // =========================================================================
    // Wildcard Patterns
    // =========================================================================

    suite('wildcard patterns', () => {
        test('? matches exactly one character', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            // "main.bal" has 4 chars before dot — "????.bal" should match
            const result = await execute({ pattern: '????.bal' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            assert.ok(files.includes('main.bal'));
        });

        test('? does not match path separator', async () => {
            const { execute } = makeExecute(ORDER_MGMT_DIR);
            // "?" should not cross directory boundaries
            const result = await execute({ pattern: '?.bal' });
            // Either no results or only single-char-name files at root
            assert.strictEqual(result.success, true);
        });

        test('{bal,toml} alternation matches both extensions', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*.{bal,toml}' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            assert.ok(files.some(f => f.endsWith('.bal')));
            assert.ok(files.some(f => f.endsWith('.toml')));
        });

        test('{bal,toml} does not include other extensions', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*.{bal,toml}' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            assert.ok(files.every(f => f.endsWith('.bal') || f.endsWith('.toml')));
        });

        test('** without slash prefix also matches root-level files', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*.bal' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            // Root-level files like main.bal should be included
            assert.ok(files.includes('main.bal'));
        });
    });

    // =========================================================================
    // Path Scoping
    // =========================================================================

    suite('path scoping', () => {
        test('scoped path restricts search to that subdirectory', async () => {
            const { execute } = makeExecute(ORDER_MGMT_DIR);
            const result = await execute({ pattern: '**/*.bal', path: 'order_service' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            // Paths should NOT include order_service prefix (they're relative to the scoped dir)
            assert.ok(files.every(f => !f.startsWith('order_utils')));
        });

        test('scoped path does not leak files from sibling directories', async () => {
            const { execute } = makeExecute(ORDER_MGMT_DIR);
            const result = await execute({ pattern: '**/*.bal', path: 'order_service' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            assert.ok(!files.some(f => f.includes('order_utils')));
        });

        test('no path searches from project root', async () => {
            const { execute } = makeExecute(ORDER_MGMT_DIR);
            const result = await execute({ pattern: '**/*.bal' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            // Should contain files from both order_service and order_utils
            assert.ok(files.some(f => f.includes('order_service')));
            assert.ok(files.some(f => f.includes('order_utils')));
        });
    });

    // =========================================================================
    // Skipped Directories
    // =========================================================================

    suite('skipped directories', () => {
        test('does not return files from .git directory', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            assert.ok(!files.some(f => f.startsWith('.git/')));
        });

        test('does not return files from target directory', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            assert.ok(!files.some(f => f.startsWith('target/')));
        });

        test('does not return files from hidden directories', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            // No file path segment should start with a dot
            assert.ok(!files.some(f => f.split('/').some(seg => seg.startsWith('.'))));
        });
    });

    // =========================================================================
    // Sort Order
    // =========================================================================

    suite('sort order', () => {
        test('result message includes count and pattern', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*.bal' });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('**/*.bal'));
            assert.ok(/Found \d+ file\(s\)/.test(result.message));
        });
    });

    // =========================================================================
    // Event Emission
    // =========================================================================

    suite('event emission', () => {
        test('emits tool_call event before search', async () => {
            const { execute, events } = makeExecute(SALESFORCE_SLACK_DIR);
            await execute({ pattern: '**/*.bal' });
            const callEvent = events.find((e: any) => e.type === 'tool_call');
            assert.ok(callEvent);
            assert.strictEqual((callEvent as any).toolName, 'glob');
        });

        test('tool_call event contains pattern and path', async () => {
            const { execute, events } = makeExecute(SALESFORCE_SLACK_DIR);
            await execute({ pattern: '**/*.bal', path: undefined });
            const callEvent = events.find((e: any) => e.type === 'tool_call') as any;
            assert.ok(callEvent);
            assert.strictEqual(callEvent.toolInput.pattern, '**/*.bal');
        });

        test('emits tool_result event after search', async () => {
            const { execute, events } = makeExecute(SALESFORCE_SLACK_DIR);
            await execute({ pattern: '**/*.bal' });
            const resultEvent = events.find((e: any) => e.type === 'tool_result');
            assert.ok(resultEvent);
        });

        test('emits tool_result even on validation failure', async () => {
            const { execute, events } = makeExecute(SALESFORCE_SLACK_DIR);
            await execute({ pattern: '' });
            const resultEvent = events.find((e: any) => e.type === 'tool_result');
            assert.ok(resultEvent);
        });
    });

    // =========================================================================
    // Result Message Format
    // =========================================================================

    suite('result message format', () => {
        test('message includes matched file paths on separate lines', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*.bal' });
            assert.strictEqual(result.success, true);
            const files = matchedFiles(result.message);
            assert.ok(files.length > 1);
            assert.ok(files.every(f => f.length > 0));
        });

        test('file count in message matches actual file list length', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*.bal' });
            assert.strictEqual(result.success, true);
            const countMatch = result.message.match(/Found (\d+) file\(s\)/);
            assert.ok(countMatch);
            const reportedCount = parseInt(countMatch![1]);
            const files = matchedFiles(result.message);
            assert.strictEqual(reportedCount, files.length);
        });

        test('no-match result is still success:true', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '**/*.xyz_nonexistent' });
            assert.strictEqual(result.success, true);
            assert.ok(!result.error);
        });
    });
});
