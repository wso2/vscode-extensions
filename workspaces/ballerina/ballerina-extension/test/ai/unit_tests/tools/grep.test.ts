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
import { createGrepExecute } from '../../../../src/features/ai/agent/tools/grep';

// ============================================================================
// Fixture helpers
// ============================================================================

let tempDir: string;

function writeFixture(relPath: string, content: string): void {
    const abs = path.join(tempDir, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf-8');
}

/** Collects events emitted by the tool during a single call. */
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

suite('GrepTool', () => {
    suiteSetup(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grep-test-'));

        writeFixture('main.bal', [
            'import ballerina/http;',
            '',
            'public type OrderService service object {',
            '    resource function get orders() returns Order[]|error;',
            '};',
            '',
            'public type Order record {|',
            '    int id;',
            '    string name;',
            '|};',
            '',
            'public function processOrder(Order order) returns error? {',
            '    // TODO: implement',
            '}',
        ].join('\n'));

        writeFixture('Ballerina.toml', [
            '[package]',
            'name = "test_project"',
            'org = "wso2"',
            'version = "0.1.0"',
        ].join('\n'));

        writeFixture('README.md', [
            '# Test Project',
            'A sample Ballerina project for unit tests.',
        ].join('\n'));

        writeFixture('modules/payment/payment.bal', [
            'import ballerina/http;',
            '',
            'public service class PaymentService {',
            '    resource function post payments() returns error? {',
            '        // process payment',
            '    }',
            '}',
        ].join('\n'));
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
            const execute = createGrepExecute(handler as any, tempDir);
            const result = await execute({ pattern: '' });
            assert.strictEqual(result.success, false);
            assert.ok(result.message.includes('empty'));
        });

        test('whitespace-only pattern returns failure', async () => {
            const { handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            const result = await execute({ pattern: '   ' });
            assert.strictEqual(result.success, false);
        });

        test('path traversal returns failure', async () => {
            const { handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            const result = await execute({ pattern: 'import', path: '../../outside' });
            assert.strictEqual(result.success, false);
            assert.ok(result.message.includes('project root'));
        });

        test('non-existent path returns failure', async () => {
            const { handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            const result = await execute({ pattern: 'import', path: 'nonexistent_dir' });
            assert.strictEqual(result.success, false);
            assert.ok(result.message.includes('not found') || result.message.includes('nonexistent_dir'));
        });
    });

    // -----------------------------------------------------------------------
    // Output modes
    // -----------------------------------------------------------------------
    suite('Output Modes', () => {
        test('files_with_matches mode returns file paths only', async () => {
            const { handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            const result = await execute({ pattern: 'import', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            // Should contain file paths but NOT the matched line content
            const lines = result.message.split('\n').filter(l => l.length > 0);
            assert.ok(lines.length > 0, 'Should return at least one file');
            for (const line of lines) {
                // Each line should be a path, not a grep match line (no ":" followed by content)
                assert.ok(!line.match(/:\d+:/), `Line "${line}" looks like content output, not a file path`);
            }
        });

        test('content mode returns matching lines with content', async () => {
            const { handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            const result = await execute({ pattern: 'import ballerina', output_mode: 'content', line_numbers: false });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('import ballerina'), 'Content mode should include the matching text');
        });

        test('count mode returns match counts per file', async () => {
            const { handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            const result = await execute({ pattern: 'import', output_mode: 'count' });
            assert.strictEqual(result.success, true);
            // count output format: "filepath:N"
            const lines = result.message.split('\n').filter(l => l.length > 0);
            for (const line of lines) {
                assert.ok(/:\d+$/.test(line), `Expected "file:count" format, got: "${line}"`);
            }
        });

        test('content mode with line_numbers=true prefixes line numbers', async () => {
            const { handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            const result = await execute({ pattern: 'import ballerina', output_mode: 'content', line_numbers: true });
            assert.strictEqual(result.success, true);
            // ripgrep line-number format: "file:lineno:content"
            const lines = result.message.split('\n').filter(l => l.length > 0);
            assert.ok(lines.some(l => /:\d+:/.test(l)), 'Expected at least one line with line number notation');
        });
    });

    // -----------------------------------------------------------------------
    // Match behaviour
    // -----------------------------------------------------------------------
    suite('Match Behaviour', () => {
        test('returns success with no-matches message when pattern not found', async () => {
            const { handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            const result = await execute({ pattern: 'PATTERN_THAT_DOES_NOT_EXIST_XYZ' });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('No matches found'));
        });

        test('case_insensitive=true matches regardless of casing', async () => {
            const { handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);

            const sensitive = await execute({ pattern: 'ORDERSERVICE', output_mode: 'files_with_matches', case_insensitive: false });
            const insensitive = await execute({ pattern: 'ORDERSERVICE', output_mode: 'files_with_matches', case_insensitive: true });

            // Case-sensitive should find nothing; case-insensitive should find main.bal
            assert.ok(sensitive.message.includes('No matches found'));
            assert.strictEqual(insensitive.success, true);
            assert.ok(!insensitive.message.includes('No matches found'), 'Case-insensitive should find matches');
        });

        test('custom glob filter restricts search to matching file types', async () => {
            const { handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);

            // "name" appears in Ballerina.toml, but also in main.bal (string name)
            // Searching only *.toml should return only the toml file
            const result = await execute({ pattern: 'name', output_mode: 'files_with_matches', glob: '*.toml' });
            assert.strictEqual(result.success, true);
            const files = result.message.split('\n').filter(l => l.length > 0);
            assert.ok(files.every(f => f.endsWith('.toml')), 'All matched files should be .toml');
        });

        test('default glob filter excludes non-Ballerina file types', async () => {
            // Write a .log file that would match if glob wasn't filtering
            writeFixture('debug.log', 'import something');
            const { handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            const result = await execute({ pattern: 'import', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            const files = result.message.split('\n').filter(l => l.length > 0);
            assert.ok(!files.some(f => f.endsWith('.log')), '.log files should be excluded by default glob');
        });

        test('scoped path search limits results to subdirectory', async () => {
            const { handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            const result = await execute({ pattern: 'import', output_mode: 'files_with_matches', path: 'modules' });
            assert.strictEqual(result.success, true);
            const files = result.message.split('\n').filter(l => l.length > 0);
            assert.ok(files.length > 0, 'Should find matches inside modules/');
            assert.ok(files.every(f => f.startsWith('modules')), 'All results should be under modules/');
        });
    });

    // -----------------------------------------------------------------------
    // Output processing
    // -----------------------------------------------------------------------
    suite('Output Processing', () => {
        test('returned paths are relative to project root, not absolute', async () => {
            const { handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            const result = await execute({ pattern: 'import', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            const lines = result.message.split('\n').filter(l => l.length > 0);
            for (const line of lines) {
                assert.ok(!line.startsWith(tempDir), `Path "${line}" should be relative, not absolute`);
            }
        });

        test('head_limit truncates output and appends truncation note', async () => {
            const { handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            // Use a very small limit and a pattern that matches many lines
            const result = await execute({ pattern: '.', output_mode: 'content', head_limit: 3 });
            assert.strictEqual(result.success, true);
            const lines = result.message.split('\n').filter(l => l.length > 0);
            // Last line should be truncation note
            assert.ok(lines[lines.length - 1].includes('truncated'), 'Should append truncation note');
            // Content lines should be at most head_limit
            const contentLines = lines.slice(0, lines.length - 1);
            assert.ok(contentLines.length <= 3, `Should cap at 3 lines, got ${contentLines.length}`);
        });

        test('head_limit=0 returns all results without truncation', async () => {
            const { handler: h1 } = makeCapture();
            const { handler: h2 } = makeCapture();
            const execDefault = createGrepExecute(h1, tempDir);
            const execUnlimited = createGrepExecute(h2, tempDir);

            const limited = await execDefault({ pattern: '.', output_mode: 'content', head_limit: 3 });
            const unlimited = await execUnlimited({ pattern: '.', output_mode: 'content', head_limit: 0 });

            const unlimitedLines = unlimited.message.split('\n').filter(l => l.length > 0);
            assert.ok(!unlimited.message.includes('truncated'), 'head_limit=0 should not truncate');
            assert.ok(unlimitedLines.length > 3, 'Unlimited should return more lines than head_limit=3');
        });

        test('context lines are included in content mode output', async () => {
            const { handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            // "processOrder" appears on a single line; with after_context=1 we should see the next line too
            const result = await execute({
                pattern: 'processOrder',
                output_mode: 'content',
                after_context: 1,
                line_numbers: false,
            });
            assert.strictEqual(result.success, true);
            // The line after "processOrder" is "    // TODO: implement"
            assert.ok(result.message.includes('TODO'), 'After context should include the line after the match');
        });
    });

    // -----------------------------------------------------------------------
    // Event handler
    // -----------------------------------------------------------------------
    suite('Event Handler', () => {
        test('emits tool_call then tool_result on success', async () => {
            const { events, handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            await execute({ pattern: 'import', output_mode: 'files_with_matches' });

            const types = events.map(e => e.type);
            assert.ok(types.includes('tool_call'), 'Should emit tool_call');
            assert.ok(types.includes('tool_result'), 'Should emit tool_result');
            assert.ok(types.indexOf('tool_call') < types.indexOf('tool_result'), 'tool_call should come before tool_result');
        });

        test('emits tool_result on validation failure', async () => {
            const { events, handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            await execute({ pattern: '' });

            assert.ok(events.some(e => e.type === 'tool_result'), 'Should emit tool_result on failure');
        });

        test('tool_call event contains pattern, path, and output_mode', async () => {
            const { events, handler } = makeCapture();
            const execute = createGrepExecute(handler as any, tempDir);
            await execute({ pattern: 'Order', path: 'modules', output_mode: 'content' });

            const callEvent = events.find(e => e.type === 'tool_call') as any;
            assert.ok(callEvent, 'tool_call event should exist');
            assert.strictEqual(callEvent.toolInput.pattern, 'Order');
            assert.strictEqual(callEvent.toolInput.path, 'modules');
            assert.strictEqual(callEvent.toolInput.output_mode, 'content');
        });
    });
});
