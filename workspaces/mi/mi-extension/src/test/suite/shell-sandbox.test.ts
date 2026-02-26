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
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    analyzeShellCommand,
    buildShellCommandDeniedResult,
    buildShellSandboxBlockedResult,
    isAnalysisCoveredByRules,
} from '../../ai-features/agent-mode/tools/shell_sandbox';

const TEST_PLATFORM: NodeJS.Platform = 'linux';
const PROJECT_PATH = '/tmp/mi-shell-sandbox-project';

suite('Shell Sandbox Tests', () => {
    test('safe read command does not require approval', () => {
        const analysis = analyzeShellCommand('git status', TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.blocked, false);
        assert.strictEqual(analysis.requiresApproval, false);
    });

    test('find command requires approval', () => {
        const analysis = analyzeShellCommand('find . -name "*.ts"', TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.blocked, false);
        assert.strictEqual(analysis.requiresApproval, true);
        assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('read-only allowlist')));
    });

    test('wrapper env command requires approval', () => {
        const analysis = analyzeShellCommand('env ls', TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.blocked, false);
        assert.strictEqual(analysis.requiresApproval, true);
        assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('wrapper commands')));
    });

    test('find with -delete is treated as destructive mutation', () => {
        const analysis = analyzeShellCommand('find . -type f -name "*.tmp" -delete', TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.blocked, false);
        assert.strictEqual(analysis.requiresApproval, true);
        assert.strictEqual(analysis.isDestructive, true);
        assert.strictEqual(isAnalysisCoveredByRules(analysis, [['find']]), false);
    });

    test('find with -exec is treated as destructive mutation', () => {
        const analysis = analyzeShellCommand('find . -type f -exec rm {} \\;', TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.blocked, false);
        assert.strictEqual(analysis.requiresApproval, true);
        assert.strictEqual(analysis.isDestructive, true);
        assert.strictEqual(isAnalysisCoveredByRules(analysis, [['find']]), false);
    });

    test('network command does not require approval', () => {
        const analysis = analyzeShellCommand('curl https://example.com', TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.requiresApproval, false);
        assert.strictEqual(analysis.blocked, false);
    });

    test('outside-project read command does not require approval', () => {
        const command = 'cat /etc/hosts';
        const analysis = analyzeShellCommand(command, TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.blocked, false);
        assert.strictEqual(analysis.requiresApproval, false);
    });

    test('sensitive home shell rc read is hard-blocked', () => {
        const command = 'cat ~/.zshrc';
        const analysis = analyzeShellCommand(command, TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.blocked, true);
        assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('sensitive paths')));
    });

    test('project .env read is hard-blocked', () => {
        const analysis = analyzeShellCommand('cat .env', TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.blocked, true);
        assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('sensitive paths')));
    });

    test('outside-project mutation path is hard-blocked', () => {
        const disallowedTarget = '/etc/mi-shell-sandbox.txt';
        const analysis = analyzeShellCommand(`echo hello > ${disallowedTarget}`, TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.blocked, true);
        assert.strictEqual(analysis.requiresApproval, true);
        assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('outside allowed roots')));
    });

    test('outside-project mutation to allowed /tmp root is not blocked and does not require approval', () => {
        const tmpTarget = '/tmp/mi-shell-sandbox.txt';
        const escapedTarget = tmpTarget.includes(' ') ? `"${tmpTarget}"` : tmpTarget;
        const analysis = analyzeShellCommand(`echo hello > ${escapedTarget}`, TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.blocked, false);
        assert.strictEqual(analysis.requiresApproval, false);
    });

    test('attached short option values are extracted for mutation destinations', () => {
        const sourcePath = '/etc/hosts';
        const targetDirectory = `${PROJECT_PATH}/sandbox-target`.replace(/\\/g, '/');
        const analysis = analyzeShellCommand(
            `cp ${sourcePath} -t${targetDirectory}`,
            TEST_PLATFORM,
            PROJECT_PATH,
            false
        );
        assert.strictEqual(analysis.blocked, false);
        assert.strictEqual(analysis.requiresApproval, true);
    });

    test('destructive commands always require approval', () => {
        const analysis = analyzeShellCommand('rm -rf src', TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.requiresApproval, true);
        assert.strictEqual(analysis.isDestructive, true);
    });

    test('remembered rule can bypass approval for non-destructive command', () => {
        const analysis = analyzeShellCommand('npm install lodash', TEST_PLATFORM, PROJECT_PATH, false);
        const covered = isAnalysisCoveredByRules(analysis, [['npm', 'install']]);
        assert.strictEqual(covered, true);
    });

    test('remembered rule does not bypass destructive command', () => {
        const analysis = analyzeShellCommand('rm -rf src', TEST_PLATFORM, PROJECT_PATH, false);
        const covered = isAnalysisCoveredByRules(analysis, [['rm']]);
        assert.strictEqual(analysis.isDestructive, true);
        assert.strictEqual(covered, false);
    });

    test('complex syntax falls back to approval', () => {
        const analysis = analyzeShellCommand('echo $(date)', TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.isComplexSyntax, true);
        assert.strictEqual(analysis.requiresApproval, true);
    });

    test('background execution does not require approval by itself', () => {
        const analysis = analyzeShellCommand('pwd', TEST_PLATFORM, PROJECT_PATH, true);
        assert.strictEqual(analysis.runInBackground, true);
        assert.strictEqual(analysis.requiresApproval, false);
    });

    test('standalone ampersand splits backgrounded commands into separate segments', () => {
        const analysis = analyzeShellCommand('pwd & rm -rf src', TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.blocked, false);
        assert.strictEqual(analysis.requiresApproval, true);
        assert.strictEqual(analysis.isDestructive, true);
        assert.strictEqual(analysis.segments.length, 2);
        assert.strictEqual(analysis.segments[0].command, 'pwd');
        assert.strictEqual(analysis.segments[1].command, 'rm');
        assert.strictEqual(analysis.segments[1].requiresApproval, true);
        assert.strictEqual(analysis.segments[1].isDestructive, true);
    });

    test('redirection forms using ampersand are not split as background operators', () => {
        const analysis = analyzeShellCommand(
            'echo hello > /tmp/mi-shell-sandbox.log 2>&1',
            TEST_PLATFORM,
            PROJECT_PATH,
            false
        );
        assert.strictEqual(analysis.blocked, false);
        assert.strictEqual(analysis.requiresApproval, false);
        assert.strictEqual(analysis.segments.length, 1);
    });

    test('tee write outside project is hard-blocked', () => {
        const disallowedTarget = '/etc/mi-shell-sandbox.log';
        const analysis = analyzeShellCommand(`cat /etc/hosts | tee ${disallowedTarget}`, TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.blocked, true);
        assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('outside allowed roots')));
    });

    test('sensitive .env write is hard-blocked', () => {
        const analysis = analyzeShellCommand('echo KEY=VALUE > .env', TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.blocked, true);
        assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('sensitive paths')));
    });

    test('symlink escapes are blocked for mutation paths', function () {
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mi-shell-sandbox-'));
        const projectDir = path.join(tempRoot, 'project');
        const outsideDir = path.join(tempRoot, 'outside');

        fs.mkdirSync(projectDir, { recursive: true });
        fs.mkdirSync(outsideDir, { recursive: true });

        const linkPath = path.join(projectDir, 'link-out');
        try {
            fs.symlinkSync(outsideDir, linkPath, 'dir');
        } catch {
            fs.rmSync(tempRoot, { recursive: true, force: true });
            this.skip();
            return;
        }

        try {
            const analysis = analyzeShellCommand('touch link-out/file.txt', TEST_PLATFORM, projectDir, false);
            assert.strictEqual(analysis.blocked, true);
            assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('outside allowed roots')));
        } finally {
            fs.rmSync(tempRoot, { recursive: true, force: true });
        }
    });

    test('interactive/elevated commands are blocked', () => {
        const analysis = analyzeShellCommand('sudo ls', TEST_PLATFORM, PROJECT_PATH, false);
        assert.strictEqual(analysis.blocked, true);
    });

    test('shell approval denial result contains explicit error and system reminder', () => {
        const result = buildShellCommandDeniedResult();
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.error, 'SHELL_COMMAND_DENIED');
        assert.ok(result.message.includes('<system-reminder>'));
    });

    test('shell sandbox blocked result contains explicit error and system reminder', () => {
        const result = buildShellSandboxBlockedResult(['Mutating paths outside allowed roots is blocked.']);
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.error, 'SHELL_SANDBOX_BLOCKED');
        assert.ok(result.message.includes('<system-reminder>'));
    });

    test('rule matching remains session-scoped by rule set', () => {
        const analysis = analyzeShellCommand('npm install lodash', TEST_PLATFORM, PROJECT_PATH, false);
        const firstSessionCoverage = isAnalysisCoveredByRules(analysis, [['npm', 'install']]);
        const secondSessionCoverage = isAnalysisCoveredByRules(analysis, []);
        assert.strictEqual(firstSessionCoverage, true);
        assert.strictEqual(secondSessionCoverage, false);
    });
});
