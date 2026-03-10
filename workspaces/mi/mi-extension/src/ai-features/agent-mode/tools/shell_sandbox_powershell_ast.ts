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

import * as childProcess from 'child_process';

export interface PowerShellAstParameter {
    name: string;
    text: string;
    argumentText?: string;
}

export interface PowerShellAstCommand {
    name: string;
    text: string;
    invocationOperator?: string;
    parameters: PowerShellAstParameter[];
    arguments: string[];
    positionalArguments: string[];
}

export interface PowerShellAstRedirection {
    text: string;
    targetText?: string;
    append?: boolean;
    fromStream?: string;
    toStream?: string;
}

export interface PowerShellAstToken {
    kind: string;
    text: string;
}

export interface PowerShellAstParseError {
    message: string;
    errorId?: string;
    line?: number;
    column?: number;
    text?: string;
}

export interface PowerShellAstResult {
    parseFailed: boolean;
    parserEngine: 'powershell_ast';
    parserBinary?: string;
    timedOut: boolean;
    failureReason?: string;
    parseErrors: PowerShellAstParseError[];
    commands: PowerShellAstCommand[];
    redirections: PowerShellAstRedirection[];
    tokens: PowerShellAstToken[];
    invocationOperators: string[];
    elapsedMs: number;
}

const PARSER_TIMEOUT_MS = 3000;
const PARSER_MAX_BUFFER = 1024 * 1024;
const PARSER_BINARIES = ['powershell.exe', 'pwsh'];

const POWERSHELL_AST_SCRIPT = `
$ErrorActionPreference = 'Stop'
$commandText = [Environment]::GetEnvironmentVariable('WSO2_MI_SHELL_COMMAND')
if ($null -eq $commandText) { $commandText = '' }

$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput($commandText, [ref]$tokens, [ref]$errors)

$commands = @()
foreach ($commandAst in $ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.CommandAst] }, $true)) {
    $elements = @($commandAst.CommandElements)
    $commandName = ''
    if ($elements.Count -gt 0) {
        $commandName = [string]$elements[0].Extent.Text
    }

    $parameters = @()
    $arguments = @()
    $positionalArguments = @()
    for ($i = 0; $i -lt $elements.Count; $i++) {
        $element = $elements[$i]
        if ($element -is [System.Management.Automation.Language.CommandParameterAst]) {
            $argText = $null
            if ($element.Argument) {
                $argText = [string]$element.Argument.Extent.Text
            }

            $parameters += [ordered]@{
                name = [string]$element.ParameterName
                text = [string]$element.Extent.Text
                argumentText = $argText
            }
        } elseif ($i -gt 0) {
            $arg = [string]$element.Extent.Text
            $arguments += $arg
            $positionalArguments += $arg
        }
    }

    $commands += [ordered]@{
        name = $commandName
        text = [string]$commandAst.Extent.Text
        invocationOperator = [string]$commandAst.InvocationOperator
        parameters = $parameters
        arguments = $arguments
        positionalArguments = $positionalArguments
    }
}

$redirections = @()
foreach ($redirectionAst in $ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.RedirectionAst] }, $true)) {
    $targetText = $null
    if ($redirectionAst.PSObject.Properties['Location'] -and $redirectionAst.Location) {
        $targetText = [string]$redirectionAst.Location.Extent.Text
    } elseif ($redirectionAst.PSObject.Properties['File'] -and $redirectionAst.File) {
        $targetText = [string]$redirectionAst.File.Extent.Text
    }

    $append = $false
    if ($redirectionAst.PSObject.Properties['Append']) {
        $append = [bool]$redirectionAst.Append
    }

    $fromStream = $null
    if ($redirectionAst.PSObject.Properties['FromStream']) {
        $fromStream = [string]$redirectionAst.FromStream
    }

    $toStream = $null
    if ($redirectionAst.PSObject.Properties['ToStream']) {
        $toStream = [string]$redirectionAst.ToStream
    }

    $redirections += [ordered]@{
        text = [string]$redirectionAst.Extent.Text
        targetText = $targetText
        append = $append
        fromStream = $fromStream
        toStream = $toStream
    }
}

$tokenItems = @()
if ($tokens) {
    foreach ($token in $tokens) {
        $tokenItems += [ordered]@{
            kind = [string]$token.Kind
            text = [string]$token.Text
        }
    }
}

$errorItems = @()
if ($errors) {
    foreach ($error in $errors) {
        $line = $null
        $column = $null
        $extentText = $null
        if ($error.Extent) {
            $line = [int]$error.Extent.StartLineNumber
            $column = [int]$error.Extent.StartColumnNumber
            $extentText = [string]$error.Extent.Text
        }

        $errorItems += [ordered]@{
            message = [string]$error.Message
            errorId = [string]$error.ErrorId
            line = $line
            column = $column
            text = $extentText
        }
    }
}

$invocationOperators = @()
foreach ($parsedCommand in $commands) {
    if ($parsedCommand.invocationOperator -and $parsedCommand.invocationOperator -ne 'None') {
        $invocationOperators += [string]$parsedCommand.invocationOperator
    }
}

$result = [ordered]@{
    parseFailed = ($errorItems.Count -gt 0)
    parserEngine = 'powershell_ast'
    parseErrors = $errorItems
    commands = $commands
    redirections = $redirections
    tokens = $tokenItems
    invocationOperators = @($invocationOperators | Select-Object -Unique)
}

$result | ConvertTo-Json -Depth 30 -Compress
`;

function buildFailureResult(startTimeMs: number, options: {
    reason: string;
    parserBinary?: string;
    timedOut?: boolean;
}): PowerShellAstResult {
    return {
        parseFailed: true,
        parserEngine: 'powershell_ast',
        parserBinary: options.parserBinary,
        timedOut: options.timedOut === true,
        failureReason: options.reason,
        parseErrors: [],
        commands: [],
        redirections: [],
        tokens: [],
        invocationOperators: [],
        elapsedMs: Date.now() - startTimeMs,
    };
}

function normalizeParsedJson(startTimeMs: number, parserBinary: string, parsed: any): PowerShellAstResult {
    return {
        parseFailed: parsed?.parseFailed === true,
        parserEngine: 'powershell_ast',
        parserBinary,
        timedOut: false,
        parseErrors: Array.isArray(parsed?.parseErrors) ? parsed.parseErrors : [],
        commands: Array.isArray(parsed?.commands) ? parsed.commands : [],
        redirections: Array.isArray(parsed?.redirections) ? parsed.redirections : [],
        tokens: Array.isArray(parsed?.tokens) ? parsed.tokens : [],
        invocationOperators: Array.isArray(parsed?.invocationOperators) ? parsed.invocationOperators : [],
        elapsedMs: Date.now() - startTimeMs,
    };
}

function tryParseWithBinary(startTimeMs: number, parserBinary: string, command: string): PowerShellAstResult | undefined {
    const parseResult = childProcess.spawnSync(
        parserBinary,
        ['-NoProfile', '-NonInteractive', '-Command', POWERSHELL_AST_SCRIPT],
        {
            env: { ...process.env, WSO2_MI_SHELL_COMMAND: command },
            encoding: 'utf8',
            timeout: PARSER_TIMEOUT_MS,
            maxBuffer: PARSER_MAX_BUFFER,
        }
    );

    if (parseResult.error) {
        const errorCode = (parseResult.error as NodeJS.ErrnoException).code;
        if (errorCode === 'ENOENT') {
            return undefined;
        }
        return buildFailureResult(startTimeMs, {
            parserBinary,
            reason: `PowerShell AST parser failed: ${parseResult.error.message}`,
            timedOut: errorCode === 'ETIMEDOUT',
        });
    }

    if ((parseResult.status ?? 1) !== 0) {
        const stderrText = (parseResult.stderr || '').trim();
        return buildFailureResult(startTimeMs, {
            parserBinary,
            reason: stderrText.length > 0
                ? `PowerShell AST parser exited with non-zero status: ${stderrText}`
                : 'PowerShell AST parser exited with non-zero status.',
        });
    }

    const stdoutText = (parseResult.stdout || '').trim();
    if (stdoutText.length === 0) {
        return buildFailureResult(startTimeMs, {
            parserBinary,
            reason: 'PowerShell AST parser returned an empty result.',
        });
    }

    try {
        const parsed = JSON.parse(stdoutText);
        return normalizeParsedJson(startTimeMs, parserBinary, parsed);
    } catch (error) {
        return buildFailureResult(startTimeMs, {
            parserBinary,
            reason: `PowerShell AST parser returned invalid JSON: ${(error as Error).message}`,
        });
    }
}

export function parsePowerShellAst(command: string): PowerShellAstResult {
    const startTimeMs = Date.now();

    for (const parserBinary of PARSER_BINARIES) {
        const result = tryParseWithBinary(startTimeMs, parserBinary, command);
        if (result) {
            return result;
        }
    }

    return buildFailureResult(startTimeMs, {
        reason: 'PowerShell AST parser is unavailable in this environment.',
    });
}
