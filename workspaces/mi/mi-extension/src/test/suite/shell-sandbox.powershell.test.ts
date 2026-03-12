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
import { analyzeShellCommand } from '../../ai-features/agent-mode/tools/shell_sandbox';
import { analyzePowerShellCommand } from '../../ai-features/agent-mode/tools/shell_sandbox_powershell';

const WINDOWS_PROJECT_PATH = 'C:\\mi-shell-sandbox-project';

function buildParsedAstCommand(name: string, args: string[]) {
    return {
        parseFailed: false,
        parserEngine: 'powershell_ast' as const,
        parserBinary: 'powershell.exe',
        timedOut: false,
        parseErrors: [],
        commands: [
            {
                name,
                text: `${name} ${args.join(' ')}`.trim(),
                invocationOperator: 'None',
                parameters: [],
                arguments: args,
                positionalArguments: args,
            },
        ],
        redirections: [],
        tokens: [],
        invocationOperators: [],
        elapsedMs: 1,
    };
}

suite('Shell Sandbox PowerShell Tests', () => {
    test('win32 dispatch uses powershell analyzer path', () => {
        const analysis = analyzeShellCommand('Get-ChildItem', 'win32', WINDOWS_PROJECT_PATH, false);
        assert.ok(
            analysis.analysisEngine === 'powershell_ast' || analysis.analysisEngine === 'powershell_ast_fail_closed'
        );
    });

    test('powershell analyzer fail-closed when parser fails', () => {
        const analysis = analyzePowerShellCommand('Get-ChildItem', WINDOWS_PROJECT_PATH, false, {
            parseAst: () => ({
                parseFailed: true,
                parserEngine: 'powershell_ast',
                parserBinary: 'powershell.exe',
                timedOut: true,
                failureReason: 'simulated timeout',
                parseErrors: [],
                commands: [],
                redirections: [],
                tokens: [],
                invocationOperators: [],
                elapsedMs: 1,
            }),
        });

        assert.strictEqual(analysis.analysisEngine, 'powershell_ast_fail_closed');
        assert.strictEqual(analysis.requiresApproval, true);
        assert.strictEqual(analysis.blocked, false);
        assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('explicit approval')));
    });

    test('powershell git status is treated as read-only', () => {
        const analysis = analyzePowerShellCommand('git status', WINDOWS_PROJECT_PATH, false, {
            parseAst: () => buildParsedAstCommand('git', ['status']),
        });

        assert.strictEqual(analysis.analysisEngine, 'powershell_ast');
        assert.strictEqual(analysis.blocked, false);
        assert.strictEqual(analysis.requiresApproval, false);
    });

    test('powershell git commit requires approval', () => {
        const analysis = analyzePowerShellCommand('git commit -m "msg"', WINDOWS_PROJECT_PATH, false, {
            parseAst: () => buildParsedAstCommand('git', ['commit', '-m', 'msg']),
        });

        assert.strictEqual(analysis.analysisEngine, 'powershell_ast');
        assert.strictEqual(analysis.blocked, false);
        assert.strictEqual(analysis.requiresApproval, true);
        assert.ok(analysis.reasons.some((reason) => reason.includes('git commit')));
    });

    test('powershell git branch requires -r/--remotes to be treated as read-only', () => {
        const remoteOnlyAnalysis = analyzePowerShellCommand('git branch -r', WINDOWS_PROJECT_PATH, false, {
            parseAst: () => buildParsedAstCommand('git', ['branch', '-r']),
        });
        assert.strictEqual(remoteOnlyAnalysis.requiresApproval, false);

        const localBranchAnalysis = analyzePowerShellCommand('git branch', WINDOWS_PROJECT_PATH, false, {
            parseAst: () => buildParsedAstCommand('git', ['branch']),
        });
        assert.strictEqual(localBranchAnalysis.requiresApproval, true);
        assert.ok(localBranchAnalysis.reasons.some((reason) => reason.includes('git branch')));
    });

    test('powershell network command requires approval', () => {
        const analysis = analyzePowerShellCommand('curl https://example.com', WINDOWS_PROJECT_PATH, false, {
            parseAst: () => buildParsedAstCommand('curl', ['https://example.com']),
        });

        assert.strictEqual(analysis.analysisEngine, 'powershell_ast');
        assert.strictEqual(analysis.blocked, false);
        assert.strictEqual(analysis.requiresApproval, true);
        assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('network access detected')));
    });

    test('powershell write target extraction blocks outside project paths', function () {
        if (process.platform !== 'win32') {
            this.skip();
            return;
        }

        const analysis = analyzeShellCommand(
            'Set-Content -Path "C:\\Windows\\Temp\\blocked-by-policy.txt" -Value "hello"',
            'win32',
            WINDOWS_PROJECT_PATH,
            false
        );

        assert.strictEqual(analysis.blocked, true);
        assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('outside allowed roots')));
    });

    test('powershell redirection target extraction blocks outside project paths', function () {
        if (process.platform !== 'win32') {
            this.skip();
            return;
        }

        const analysis = analyzeShellCommand(
            '"hello" *> "C:\\Windows\\Temp\\redirect-blocked.txt"',
            'win32',
            WINDOWS_PROJECT_PATH,
            false
        );

        assert.strictEqual(analysis.blocked, true);
        assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('outside allowed roots')));
    });

    test('powershell escape hatches are hard-blocked', function () {
        if (process.platform !== 'win32') {
            this.skip();
            return;
        }

        const analysis = analyzeShellCommand(
            'Invoke-Expression "Get-ChildItem"',
            'win32',
            WINDOWS_PROJECT_PATH,
            false
        );

        assert.strictEqual(analysis.blocked, true);
        assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('escape hatch')));
    });

    test('powershell non-filesystem providers are hard-blocked', function () {
        if (process.platform !== 'win32') {
            this.skip();
            return;
        }

        const analysis = analyzeShellCommand(
            'Get-Item Env:PATH',
            'win32',
            WINDOWS_PROJECT_PATH,
            false
        );

        assert.strictEqual(analysis.blocked, true);
        assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('non-filesystem providers')));
    });

    test('powershell drive-relative paths require approval', function () {
        if (process.platform !== 'win32') {
            this.skip();
            return;
        }

        const analysis = analyzeShellCommand(
            'Set-Content -Path C:temp.txt -Value "hello"',
            'win32',
            WINDOWS_PROJECT_PATH,
            false
        );

        assert.strictEqual(analysis.blocked, false);
        assert.strictEqual(analysis.requiresApproval, true);
        assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('drive-relative')));
    });

    test('powershell .NET HTTP usage requires approval', () => {
        const analysis = analyzePowerShellCommand(
            '$client = [System.Net.Http.HttpClient]::new()',
            WINDOWS_PROJECT_PATH,
            false,
            {
                parseAst: () => buildParsedAstCommand('Get-ChildItem', []),
            }
        );

        assert.strictEqual(analysis.blocked, false);
        assert.strictEqual(analysis.requiresApproval, true);
        assert.strictEqual(analysis.analysisEngine, 'powershell_ast');
        assert.strictEqual(analysis.classificationMetadata?.networkDetected, true);
        assert.ok(analysis.reasons.some((reason) => reason.toLowerCase().includes('network access detected')));
    });
});
