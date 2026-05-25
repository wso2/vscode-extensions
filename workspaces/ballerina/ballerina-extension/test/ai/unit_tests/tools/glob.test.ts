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
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createGlobExecute } from '../../../../src/features/ai/agent/tools/glob';

// ============================================================================
// Fixture helpers
// ============================================================================

let tempDir: string;

function writeFixture(relPath: string, content: string = ''): void {
    const abs = path.join(tempDir, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf-8');
}

function makeCapture() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (e: any) => { events.push(e); };
    return { events, handler };
}

// ============================================================================
// Suite
// ============================================================================

suite('GlobTool', () => {
    suiteSetup(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glob-test-'));

        writeFixture('main.bal', 'import ballerina/http;');
        writeFixture('Ballerina.toml', '[package]\nname = "test_project"');
        writeFixture('README.md', '# Test Project');
        writeFixture('modules/order/order.bal', 'public type Order record {|int id;|};');
        writeFixture('modules/order/order_test.bal', 'import ballerina/test;');
        writeFixture('modules/payment/payment.bal', 'public service class PaymentService {}');
        writeFixture('resources/schema.json', '{"type":"object"}');
        writeFixture('resources/data.yaml', 'key: value');
        writeFixture('debug.log', 'some log content');
    });

    suiteTeardown(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    // -----------------------------------------------------------------------
    // Input validation
    // -----------------------------------------------------------------------
    suite('Input Validation', () => {
        test('empty pattern returns failure', async () => {
            const { handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            const result = await execute({ pattern: '' });
            assert.strictEqual(result.success, false);
            assert.ok(result.message.includes('empty'));
        });

        test('path traversal returns failure', async () => {
            const { handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            const result = await execute({ pattern: '**/*.bal', path: '../../outside' });
            assert.strictEqual(result.success, false);
            assert.ok(result.message.includes('project root'));
        });

        test('non-existent path returns failure', async () => {
            const { handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            const result = await execute({ pattern: '**/*.bal', path: 'nonexistent_dir' });
            assert.strictEqual(result.success, false);
            assert.ok(result.message.includes('not found') || result.message.includes('nonexistent_dir'));
        });

        test('file path instead of directory returns failure', async () => {
            const { handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            const result = await execute({ pattern: '**/*.bal', path: 'main.bal' });
            assert.strictEqual(result.success, false);
            assert.ok(result.message.includes('directory') || result.message.includes('main.bal'));
        });
    });

    // -----------------------------------------------------------------------
    // Match behaviour
    // -----------------------------------------------------------------------
    suite('Match Behaviour', () => {
        test('**/*.bal finds all Ballerina files recursively', async () => {
            const { handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            const result = await execute({ pattern: '**/*.bal' });
            assert.strictEqual(result.success, true);
            assert.ok(!result.message.includes('No files found'));
            const lines = result.message.split('\n').filter(l => l.endsWith('.bal'));
            assert.ok(lines.length >= 3, `Expected at least 3 .bal files, found ${lines.length}`);
        });

        test('exact filename pattern matches single file', async () => {
            const { handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            const result = await execute({ pattern: 'Ballerina.toml' });
            assert.strictEqual(result.success, true);
            // The first line of the message is the count header; check it says "1 file"
            const header = result.message.split('\n')[0];
            assert.ok(header.includes('Found 1 file'), `Expected "Found 1 file" in header, got: "${header}"`);
        });

        test('non-matching pattern returns no-matches success', async () => {
            const { handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            const result = await execute({ pattern: '**/*.nonexistent' });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('No files found'));
        });

        test('brace expansion matches multiple extensions', async () => {
            const { handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            const result = await execute({ pattern: '**/*.{bal,toml}' });
            assert.strictEqual(result.success, true);
            assert.ok(!result.message.includes('No files found'));
            const lines = result.message.split('\n').filter(l => l.endsWith('.bal') || l.endsWith('.toml'));
            assert.ok(lines.length >= 4, `Expected at least 4 .bal/.toml files, found ${lines.length}`);
        });

        test('subdirectory path restricts search scope', async () => {
            const { handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            const result = await execute({ pattern: '**/*.bal', path: 'modules/order' });
            assert.strictEqual(result.success, true);
            const files = result.message.split('\n').filter(l => l.endsWith('.bal'));
            // Should only find files in modules/order, not modules/payment
            assert.ok(files.every(f => f.includes('order')), 'All results should be from modules/order/');
            assert.ok(!files.some(f => f.includes('payment')), 'Should not include files from modules/payment/');
        });

        test('*_test.bal suffix pattern finds test files', async () => {
            const { handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            const result = await execute({ pattern: '**/*_test.bal' });
            assert.strictEqual(result.success, true);
            assert.ok(!result.message.includes('No files found'));
            const files = result.message.split('\n').filter(l => l.endsWith('.bal'));
            assert.ok(files.every(f => f.endsWith('_test.bal')), 'All results should be _test.bal files');
        });

        test('.git directory is excluded from search', async () => {
            // Write a .bal file inside .git — without the explicit !.git/** glob it would be found
            writeFixture('.git/internal.bal', 'public function gitInternal() {}');
            const { handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            const result = await execute({ pattern: '**/*.bal' });
            assert.strictEqual(result.success, true);
            const files = result.message.split('\n');
            assert.ok(!files.some(f => f.includes('.git')), '.git/ content should not appear in results');
        });
    });

    // -----------------------------------------------------------------------
    // Output processing
    // -----------------------------------------------------------------------
    suite('Output Processing', () => {
        test('returned paths are relative to project root, not absolute', async () => {
            const { handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            const result = await execute({ pattern: '**/*.bal' });
            assert.strictEqual(result.success, true);
            const files = result.message.split('\n').filter(l => l.endsWith('.bal'));
            for (const file of files) {
                assert.ok(!file.startsWith(tempDir), `Path "${file}" should be relative, not absolute`);
                assert.ok(!path.isAbsolute(file), `Path "${file}" should not be absolute`);
            }
        });

        test('message includes file count', async () => {
            const { handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            const result = await execute({ pattern: '**/*.bal' });
            assert.strictEqual(result.success, true);
            assert.ok(/Found \d+ file/.test(result.message), 'Message should include file count');
        });

        test('scoped path results are still relative to project root not the scope', async () => {
            const { handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            const result = await execute({ pattern: '**/*.bal', path: 'modules' });
            assert.strictEqual(result.success, true);
            const files = result.message.split('\n').filter(l => l.endsWith('.bal'));
            // Paths should start with "modules/" (relative to project root), not just "order/..."
            assert.ok(files.every(f => f.startsWith('modules')), 'Scoped paths should still include the scope prefix');
        });
    });

    // -----------------------------------------------------------------------
    // Event handler
    // -----------------------------------------------------------------------
    suite('Event Handler', () => {
        test('emits tool_call then tool_result on success', async () => {
            const { events, handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            await execute({ pattern: '**/*.bal' });

            const types = events.map(e => e.type);
            assert.ok(types.includes('tool_call'), 'Should emit tool_call');
            assert.ok(types.includes('tool_result'), 'Should emit tool_result');
            assert.ok(types.indexOf('tool_call') < types.indexOf('tool_result'), 'tool_call must precede tool_result');
        });

        test('emits tool_result on validation failure', async () => {
            const { events, handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            await execute({ pattern: '' });

            assert.ok(events.some(e => e.type === 'tool_result'), 'Should emit tool_result even on failure');
        });

        test('tool_call event contains pattern and path', async () => {
            const { events, handler } = makeCapture();
            const execute = createGlobExecute(handler as any, tempDir);
            await execute({ pattern: '**/*.bal', path: 'modules' });

            const callEvent = events.find(e => e.type === 'tool_call') as any;
            assert.ok(callEvent, 'tool_call event should exist');
            assert.strictEqual(callEvent.toolInput.pattern, '**/*.bal');
            assert.strictEqual(callEvent.toolInput.path, 'modules');
        });
    });
});
