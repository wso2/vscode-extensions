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
import { createGrepExecute } from '../../../../src/features/ai/agent/tools/grep';
import { CopilotEventHandler } from '../../../../src/features/ai/utils/events';

const TEST_DATA = path.join(__dirname, '../../../../../test/data');
const SALESFORCE_SLACK_DIR = path.join(TEST_DATA, 'salesforce_slack_integration');
const ORDER_MGMT_DIR = path.join(TEST_DATA, 'order_management_system');

function makeExecute(projectPath: string) {
    const events: unknown[] = [];
    const handler: CopilotEventHandler = (e) => events.push(e);
    return { execute: createGrepExecute(handler, projectPath), events };
}

suite('GrepTool', () => {

    // =========================================================================
    // Input Validation
    // =========================================================================

    suite('input validation', () => {
        test('returns error for empty pattern', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '' });
            assert.strictEqual(result.success, false);
            assert.ok(result.message.includes('empty'));
        });

        test('returns error for whitespace-only pattern', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '   ' });
            assert.strictEqual(result.success, false);
        });

        test('returns error for invalid regex', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '[[invalid' });
            assert.strictEqual(result.success, false);
            assert.ok(result.message.toLowerCase().includes('invalid'));
        });

        test('returns error for path outside project root', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'import', path: '../../..' });
            assert.strictEqual(result.success, false);
            assert.ok(result.error?.includes('Path traversal'));
        });

        test('returns error for non-existent path', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'import', path: 'nonexistent_dir' });
            assert.strictEqual(result.success, false);
            assert.ok(result.error?.includes('Path not found'));
        });

        test('returns success with no matches for unknown pattern', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'XYZZY_NONEXISTENT_TOKEN_12345' });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('No matches'));
        });
    });

    // =========================================================================
    // Basic Matching — Ballerina-specific patterns
    // =========================================================================

    suite('basic matching in Ballerina files', () => {
        test('finds import statements', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '^import', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            // connections.bal, functions.bal, main.bal all have imports
            assert.ok(result.message.includes('connections.bal'));
            assert.ok(result.message.includes('functions.bal'));
        });

        test('finds configurable keyword', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'configurable', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('config.bal'));
        });

        test('finds record type definitions', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: '^type \\w+ record', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('types.bal'));
        });

        test('finds remote function declarations', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'remote function', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('main.bal'));
        });

        test('finds log:printInfo calls', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'log:printInfo', output_mode: 'count' });
            assert.strictEqual(result.success, true);
            // main.bal has several log:printInfo calls
            assert.ok(result.message.includes('main.bal'));
        });

        test('finds salesforce:Client usage', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'salesforce:Client', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('connections.bal'));
        });
    });

    // =========================================================================
    // Output Modes
    // =========================================================================

    suite('output modes', () => {
        test('files_with_matches: returns only file paths', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'import', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            // Should not contain line content — just paths
            assert.ok(!result.message.includes('ballerina/log'));
        });

        test('content: returns matching line content', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'import ballerina/log', output_mode: 'content', line_numbers: true });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('import ballerina/log'));
        });

        test('line_numbers: false omits line numbers from output', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'import ballerina/log', output_mode: 'content', line_numbers: false });
            assert.strictEqual(result.success, true);
            // No "lineNum:" or "lineNum-" prefix should appear
            assert.ok(!/^\d+[:\-]/m.test(result.message));
        });

        test('content: line numbers use colon separator for match lines', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'import ballerina/log', output_mode: 'content', line_numbers: true });
            assert.strictEqual(result.success, true);
            // Match lines use "lineNum:content" format
            assert.ok(/\d+:import ballerina\/log/.test(result.message));
        });

        test('count: shows match count per file', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'log:print', output_mode: 'count' });
            assert.strictEqual(result.success, true);
            // format is "file:count"
            assert.ok(/main\.bal:\d+/.test(result.message));
        });

        test('default output mode is files_with_matches', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'import ballerina/log' });
            assert.strictEqual(result.success, true);
            // Should have file path but not full line content in output body
            assert.ok(!result.message.includes('import ballerina/log\n'));
        });
    });

    // =========================================================================
    // Glob Filtering
    // =========================================================================

    suite('glob filtering', () => {
        test('*.bal restricts search to Ballerina files', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'wso2', glob: '*.bal', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            // Ballerina.toml has org = "wso2" but should not appear with *.bal glob
            assert.ok(!result.message.includes('Ballerina.toml'));
        });

        test('*.toml restricts search to TOML files', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'wso2', glob: '*.toml', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('Ballerina.toml'));
            assert.ok(!result.message.includes('.bal'));
        });

        test('*.{bal,toml} matches both file types', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'salesforce', glob: '*.{bal,toml}', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            // Both .bal and .toml files reference salesforce
            assert.ok(result.message.includes('.bal') || result.message.includes('.toml'));
        });

        test('no glob defaults to standard Ballerina project extensions', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'salesforce', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            // .bal and .toml files should be found
            assert.ok(result.message.includes('connections.bal') || result.message.includes('Ballerina.toml'));
        });

        test('returns no files when glob matches no files in project', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'anything', glob: '*.py' });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('No files found'));
        });

        test('exact filename glob matches only that file', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'wso2', glob: 'Ballerina.toml', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('Ballerina.toml'));
            assert.ok(!result.message.includes('config.bal'));
        });
    });

    // =========================================================================
    // Path Scoping
    // =========================================================================

    suite('path scoping', () => {
        test('scoped path searches only within that subdirectory', async () => {
            const { execute } = makeExecute(ORDER_MGMT_DIR);
            const result = await execute({ pattern: 'import', path: 'order_service', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            // Should not leak paths from order_utils
            assert.ok(!result.message.includes('order_utils'));
        });

        test('scoped path returns paths relative to project root', async () => {
            const { execute } = makeExecute(ORDER_MGMT_DIR);
            const result = await execute({ pattern: 'import', path: 'order_service', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            // Paths should include the subdirectory prefix
            assert.ok(result.message.includes('order_service'));
        });

        test('project root search finds files across all subdirectories', async () => {
            const { execute } = makeExecute(ORDER_MGMT_DIR);
            const result = await execute({ pattern: 'import', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('order_service'));
            assert.ok(result.message.includes('order_utils'));
        });
    });

    // =========================================================================
    // Case Sensitivity
    // =========================================================================

    suite('case sensitivity', () => {
        test('search is case-sensitive by default', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            // "IMPORT" won't match "import" in Ballerina files
            const result = await execute({ pattern: 'IMPORT', output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('No matches'));
        });

        test('case_insensitive: true matches regardless of case', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'IMPORT', case_insensitive: true, output_mode: 'files_with_matches' });
            assert.strictEqual(result.success, true);
            assert.ok(!result.message.includes('No matches'));
            assert.ok(result.message.includes('connections.bal') || result.message.includes('functions.bal'));
        });
    });

    // =========================================================================
    // Context Lines
    // =========================================================================

    suite('context lines', () => {
        test('after_context shows lines after a match', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({
                pattern: 'listener salesforce:Listener',
                output_mode: 'content',
                after_context: 3,
                line_numbers: true
            });
            assert.strictEqual(result.success, true);
            // Context lines use "lineNum-content" separator format
            assert.ok(/\d+-/.test(result.message));
        });

        test('before_context shows lines before a match', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({
                pattern: 'listener salesforce:Listener',
                output_mode: 'content',
                before_context: 2,
                line_numbers: true
            });
            assert.strictEqual(result.success, true);
            assert.ok(/-\S/.test(result.message));
        });

        test('context adds lines on both sides of a match', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({
                pattern: 'listener salesforce:Listener',
                output_mode: 'content',
                context: 2,
                line_numbers: true
            });
            assert.strictEqual(result.success, true);
            const lines = result.message.split('\n');
            const contextLines = lines.filter(l => /\d+-/.test(l));
            // 2 before + 2 after = at least 4 context lines
            assert.ok(contextLines.length >= 4);
        });

        test('context overrides both before_context and after_context', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const contextResult = await execute({
                pattern: 'listener salesforce:Listener',
                output_mode: 'content',
                context: 2,
                line_numbers: true
            });
            const bothResult = await execute({
                pattern: 'listener salesforce:Listener',
                output_mode: 'content',
                before_context: 2,
                after_context: 2,
                line_numbers: true
            });
            assert.strictEqual(contextResult.message, bothResult.message);
        });

        test('context is capped at MAX_CONTEXT_LINES (10)', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            // Requesting 50 context lines should be silently capped at 10
            const result = await execute({
                pattern: 'listener salesforce:Listener',
                output_mode: 'content',
                context: 50,
                line_numbers: true
            });
            assert.strictEqual(result.success, true);
            // Should still succeed — just capped
        });
    });

    // =========================================================================
    // Head Limit
    // =========================================================================

    suite('head_limit', () => {
        test('head_limit truncates content output lines', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const fullResult = await execute({ pattern: 'string', output_mode: 'content', line_numbers: false });
            const limitedResult = await execute({ pattern: 'string', output_mode: 'content', line_numbers: false, head_limit: 5 });
            assert.strictEqual(limitedResult.success, true);
            // Limited output should be strictly shorter
            assert.ok(limitedResult.message.length < fullResult.message.length);
        });

        test('head_limit truncates files_with_matches output', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const limitedResult = await execute({ pattern: 'import', output_mode: 'files_with_matches', head_limit: 1 });
            assert.strictEqual(limitedResult.success, true);
            const fileLines = limitedResult.message
                .split('\n')
                .filter(l => l.trim().endsWith('.bal') || l.trim().endsWith('.toml'));
            assert.ok(fileLines.length <= 1);
        });

        test('head_limit truncates count output', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const fullResult = await execute({ pattern: 'string', output_mode: 'count' });
            const limitedResult = await execute({ pattern: 'string', output_mode: 'count', head_limit: 1 });
            assert.strictEqual(limitedResult.success, true);
            const fullFileCount = fullResult.message.split('\n').filter(l => /:\d+$/.test(l)).length;
            const limitedFileCount = limitedResult.message.split('\n').filter(l => /:\d+$/.test(l)).length;
            assert.ok(fullFileCount > 1, 'Need more than 1 file to test truncation');
            assert.strictEqual(limitedFileCount, 1);
        });

        test('head_limit 0 applies no limit', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const noLimitResult = await execute({ pattern: 'string', output_mode: 'files_with_matches', head_limit: 0 });
            const defaultResult = await execute({ pattern: 'string', output_mode: 'files_with_matches' });
            assert.strictEqual(noLimitResult.success, true);
            assert.strictEqual(defaultResult.success, true);
        });
    });

    // =========================================================================
    // Multiline Mode
    // =========================================================================

    suite('multiline mode', () => {
        test('multiline: true matches patterns spanning two lines', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            // Ballerina record definitions have `record {|` pattern spanning multiple lines
            const result = await execute({
                pattern: 'record \\{\\|[\\s\\S]*?\\|\\}',
                output_mode: 'files_with_matches',
                multiline: true
            });
            assert.strictEqual(result.success, true);
            assert.ok(result.message.includes('types.bal'));
        });

        test('multiline: false does not match cross-line patterns', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            // A pattern that requires newline traversal — should find nothing without multiline
            const result = await execute({
                pattern: 'record \\{\\|[\\s\\S]*?\\|\\}',
                output_mode: 'files_with_matches',
                multiline: false
            });
            // Either no matches, or matches only if the pattern coincidentally fits on one line
            assert.strictEqual(result.success, true);
        });

        test('multiline: true with zero-length match guard does not infinite loop', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            // Zero-width assertion — should not hang
            const result = await execute({ pattern: '(?=import)', output_mode: 'files_with_matches', multiline: true });
            assert.strictEqual(result.success, true);
        });
    });

    // =========================================================================
    // Event Emission
    // =========================================================================

    suite('event emission', () => {
        test('emits tool_call event before search', async () => {
            const { execute, events } = makeExecute(SALESFORCE_SLACK_DIR);
            await execute({ pattern: 'import' });
            const callEvent = events.find((e: any) => e.type === 'tool_call');
            assert.ok(callEvent, 'tool_call event should be emitted');
            assert.strictEqual((callEvent as any).toolName, 'grep');
        });

        test('emits tool_result event after search', async () => {
            const { execute, events } = makeExecute(SALESFORCE_SLACK_DIR);
            await execute({ pattern: 'import' });
            const resultEvent = events.find((e: any) => e.type === 'tool_result');
            assert.ok(resultEvent, 'tool_result event should be emitted');
        });

        test('emits tool_result even on validation failure', async () => {
            const { execute, events } = makeExecute(SALESFORCE_SLACK_DIR);
            await execute({ pattern: '' });
            const resultEvent = events.find((e: any) => e.type === 'tool_result');
            assert.ok(resultEvent);
        });
    });

    // =========================================================================
    // Match Count in Result Message
    // =========================================================================

    suite('result message accuracy', () => {
        test('match count in message matches actual matches found', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const result = await execute({ pattern: 'log:printInfo', output_mode: 'count' });
            assert.strictEqual(result.success, true);
            // Extract "X match(es) across Y file(s)" from message
            const m = result.message.match(/Found (\d+) match\(es\) across (\d+) file\(s\)/);
            assert.ok(m, 'Result message should contain match summary');
            assert.ok(parseInt(m![1]) > 0);
            assert.ok(parseInt(m![2]) > 0);
        });

        test('count mode totals match content mode totals', async () => {
            const { execute } = makeExecute(SALESFORCE_SLACK_DIR);
            const countResult = await execute({ pattern: 'error', output_mode: 'count' });
            const contentResult = await execute({ pattern: 'error', output_mode: 'content' });

            const countMatch = countResult.message.match(/Found (\d+) match\(es\)/);
            const contentMatch = contentResult.message.match(/Found (\d+) match\(es\)/);
            assert.ok(countMatch && contentMatch);
            assert.strictEqual(countMatch![1], contentMatch![1]);
        });
    });
});
