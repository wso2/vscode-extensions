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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parsePowerShellAst, PowerShellAstCommand, PowerShellAstResult } from './shell_sandbox_powershell_ast';

interface ShellSegmentAnalysisLike {
    raw: string;
    command: string;
    tokens: string[];
    requiresApproval: boolean;
    reasons: string[];
    isDestructive: boolean;
    blocked: boolean;
}

interface ShellCommandAnalysisLike {
    requiresApproval: boolean;
    blocked: boolean;
    reasons: string[];
    suggestedPrefixRule: string[];
    isDestructive: boolean;
    isComplexSyntax: boolean;
    runInBackground: boolean;
    segments: ShellSegmentAnalysisLike[];
    analysisEngine?: string;
    classificationMetadata?: Record<string, unknown>;
}

interface PowerShellAnalyzerOptions {
    parseAst?: (command: string) => PowerShellAstResult;
}

interface ResolvedPathInfo {
    rawToken: string;
    resolvedPath?: string;
    providerPrefix?: string;
    unresolvedEnv: boolean;
    isDriveRelative: boolean;
    isRootRelative: boolean;
}

const POWERSHELL_SAFE_READ_COMMANDS = new Set([
    'cat',
    'dir',
    'get-childitem',
    'get-content',
    'get-item',
    'get-location',
    'get-process',
    'ls',
    'measure-object',
    'pwd',
    'resolve-path',
    'select-string',
    'sort-object',
    'split-path',
    'test-path',
    'type',
    'whoami',
]);

const POWERSHELL_SAFE_READ_GIT_SUBCOMMANDS = new Set([
    'status',
    'rev-parse',
    'log',
    'show',
    'diff',
    'ls-files',
]);

const POWERSHELL_NETWORK_COMMANDS = new Set([
    'curl',
    'invoke-restmethod',
    'invoke-webrequest',
    'iwr',
    'irm',
    'nslookup',
    'ping',
    'scp',
    'sftp',
    'ssh',
    'telnet',
    'tracert',
    'traceroute',
    'wget',
    'test-netconnection',
]);

const POWERSHELL_MUTATION_COMMANDS = new Set([
    'add-content',
    'clear-content',
    'copy-item',
    'cp',
    'del',
    'erase',
    'export-clixml',
    'export-csv',
    'export-xml',
    'mkdir',
    'move-item',
    'mv',
    'new-item',
    'ni',
    'out-file',
    'remove-item',
    'rename-item',
    'rm',
    'rmdir',
    'set-content',
    'set-itemproperty',
    'tee-object',
]);

const POWERSHELL_DESTRUCTIVE_COMMANDS = new Set([
    'clear-content',
    'del',
    'erase',
    'remove-item',
    'remove-itemproperty',
    'rm',
    'rmdir',
]);

const POWERSHELL_PROCESS_COMMANDS = new Set([
    'invoke-command',
    'start-job',
    'start-process',
]);

const POWERSHELL_SCHEDULED_TASK_COMMANDS = new Set([
    'disable-scheduledtask',
    'enable-scheduledtask',
    'new-scheduledtask',
    'register-scheduledtask',
    'set-scheduledtask',
    'start-scheduledtask',
    'stop-scheduledtask',
    'unregister-scheduledtask',
]);

const WRITE_PARAMETER_NAMES = new Set([
    'destination',
    'filepath',
    'literalpath',
    'outfile',
    'path',
    'workingdirectory',
]);

const PATH_PARAMETER_NAMES = new Set([
    ...Array.from(WRITE_PARAMETER_NAMES),
    'filter',
    'include',
    'exclude',
    'source',
    'target',
]);

const NON_FILESYSTEM_PROVIDER_PREFIXES = new Set([
    'cert',
    'env',
    'registry',
    'hklm',
    'hkcu',
    'hkcr',
    'hku',
    'hkcc',
]);

const SENSITIVE_PATH_SEGMENTS = new Set([
    '.aws',
    '.azure',
    '.gnupg',
    '.kube',
    '.npm',
    '.pypirc',
    '.ssh',
]);

const SENSITIVE_FILE_BASENAMES = new Set([
    '.bash_profile',
    '.bashrc',
    '.env',
    '.git-credentials',
    '.netrc',
    '.npmrc',
    '.profile',
    '.zprofile',
    '.zsh_history',
    '.zshrc',
    'authorized_keys',
    'credentials',
    'id_dsa',
    'id_ecdsa',
    'id_ed25519',
    'id_rsa',
    'known_hosts',
]);

function dedupe(values: string[]): string[] {
    return Array.from(new Set(values));
}

function normalizeToken(value: string): string {
    return value.trim().toLowerCase();
}

function stripWrappingQuotes(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length >= 2) {
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('\'') && trimmed.endsWith('\''))) {
            return trimmed.slice(1, -1);
        }
    }
    return trimmed;
}

function normalizeWindowsPathForComparison(inputPath: string): string {
    let normalized = inputPath.trim().replace(/\//g, '\\');
    if (normalized.startsWith('\\\\')) {
        normalized = `\\\\${normalized.slice(2).replace(/\\+/g, '\\')}`;
    } else {
        normalized = normalized.replace(/\\+/g, '\\');
    }
    if (/^[A-Za-z]:/.test(normalized)) {
        normalized = `${normalized[0].toLowerCase()}${normalized.slice(1)}`;
    }
    normalized = normalized.replace(/\\+$/, '');
    return normalized.length > 0 ? normalized : '\\';
}

function isPathWithinWindows(basePath: string, targetPath: string): boolean {
    const normalizedBase = normalizeWindowsPathForComparison(basePath);
    const normalizedTarget = normalizeWindowsPathForComparison(targetPath);
    return normalizedTarget === normalizedBase || normalizedTarget.startsWith(`${normalizedBase}\\`);
}

function resolveWindowsPathWithRealpath(inputPath: string): string {
    const normalizedInput = normalizeWindowsPathForComparison(path.win32.resolve(inputPath));
    if (process.platform !== 'win32') {
        return normalizedInput;
    }

    const tryRealpath = (candidate: string): string | undefined => {
        try {
            return normalizeWindowsPathForComparison(fs.realpathSync.native(candidate));
        } catch {
            try {
                return normalizeWindowsPathForComparison(fs.realpathSync(candidate));
            } catch {
                return undefined;
            }
        }
    };

    const directRealpath = tryRealpath(normalizedInput);
    if (directRealpath) {
        return directRealpath;
    }

    const tailSegments: string[] = [];
    let cursor = normalizedInput;
    while (true) {
        const parent = normalizeWindowsPathForComparison(path.win32.dirname(cursor));
        if (parent === cursor) {
            break;
        }
        tailSegments.unshift(path.win32.basename(cursor));
        const parentRealpath = tryRealpath(parent);
        if (parentRealpath) {
            return normalizeWindowsPathForComparison(path.win32.join(parentRealpath, ...tailSegments));
        }
        cursor = parent;
    }

    return normalizedInput;
}

function detectProviderPrefix(pathToken: string): string | undefined {
    const normalizedToken = stripWrappingQuotes(pathToken);
    if (!normalizedToken || normalizedToken.includes('://')) {
        return undefined;
    }

    const prefixMatch = /^([A-Za-z][A-Za-z0-9_.-]*):/.exec(normalizedToken);
    if (!prefixMatch) {
        return undefined;
    }

    const prefix = normalizeToken(prefixMatch[1]);
    if (prefix.length === 1) {
        return undefined;
    }
    return prefix;
}

function expandWindowsEnvVariables(pathToken: string): { expanded: string; unresolved: boolean } {
    let unresolved = false;
    const resolveVariable = (variableName: string): string | undefined => {
        return process.env[variableName]
            ?? process.env[variableName.toUpperCase()]
            ?? process.env[variableName.toLowerCase()];
    };

    let expanded = pathToken;
    expanded = expanded.replace(/\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/gi, (fullMatch, variableName) => {
        const value = resolveVariable(variableName);
        if (value === undefined) {
            unresolved = true;
            return fullMatch;
        }
        return value;
    });
    expanded = expanded.replace(/\$env:([A-Za-z_][A-Za-z0-9_]*)/gi, (fullMatch, variableName) => {
        const value = resolveVariable(variableName);
        if (value === undefined) {
            unresolved = true;
            return fullMatch;
        }
        return value;
    });
    expanded = expanded.replace(/%([^%]+)%/g, (fullMatch, variableName) => {
        const value = resolveVariable(variableName.trim());
        if (value === undefined) {
            unresolved = true;
            return fullMatch;
        }
        return value;
    });

    return { expanded, unresolved };
}

function looksLikePowerShellPathToken(pathToken: string): boolean {
    const normalizedToken = stripWrappingQuotes(pathToken);
    if (!normalizedToken) {
        return false;
    }
    if (normalizedToken.includes('://')) {
        return false;
    }
    if (detectProviderPrefix(normalizedToken)) {
        return true;
    }
    if (/^[A-Za-z]:/.test(normalizedToken)) {
        return true;
    }
    if (/^(~|\.{1,2}[\\/]|[\\/]{1,2})/.test(normalizedToken)) {
        return true;
    }
    if (/\$env:|\$\{env:|%[^%]+%/i.test(normalizedToken)) {
        return true;
    }
    return normalizedToken.includes('\\') || normalizedToken.includes('/');
}

function isSensitiveTokenName(pathToken: string): boolean {
    const normalizedToken = normalizeToken(stripWrappingQuotes(pathToken)).replace(/\\/g, '/');
    if (!normalizedToken) {
        return false;
    }

    const basename = normalizeToken(path.posix.basename(normalizedToken));
    if (!basename) {
        return false;
    }

    if (basename === '.env' || basename.startsWith('.env.')) {
        return true;
    }
    if (SENSITIVE_FILE_BASENAMES.has(basename)) {
        return true;
    }
    if (/^id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/.test(basename)) {
        return true;
    }
    if (normalizedToken.includes('/.aws/') || normalizedToken.endsWith('/.aws')) {
        return true;
    }
    if (normalizedToken.includes('/.ssh/') || normalizedToken.endsWith('/.ssh')) {
        return true;
    }
    if (/(^|\/)\.(bashrc|bash_profile|zshrc|zprofile|profile|env(\..+)?)$/i.test(normalizedToken)) {
        return true;
    }
    return false;
}

function resolvePowerShellPathToken(projectPath: string, pathToken: string): ResolvedPathInfo {
    const strippedToken = stripWrappingQuotes(pathToken);
    const providerPrefix = detectProviderPrefix(strippedToken);
    if (providerPrefix) {
        return {
            rawToken: pathToken,
            providerPrefix,
            unresolvedEnv: false,
            isDriveRelative: false,
            isRootRelative: false,
        };
    }

    const expanded = expandWindowsEnvVariables(strippedToken);
    const expandedToken = stripWrappingQuotes(expanded.expanded);
    const expandedProviderPrefix = detectProviderPrefix(expandedToken);
    if (expandedProviderPrefix) {
        return {
            rawToken: pathToken,
            providerPrefix: expandedProviderPrefix,
            unresolvedEnv: expanded.unresolved,
            isDriveRelative: false,
            isRootRelative: false,
        };
    }

    const isDriveRelative = /^[A-Za-z]:(?![\\/])/.test(expandedToken);
    const isRootRelative = /^[\\/](?![\\/])/.test(expandedToken);

    if (isDriveRelative || isRootRelative) {
        return {
            rawToken: pathToken,
            unresolvedEnv: expanded.unresolved,
            isDriveRelative,
            isRootRelative,
        };
    }

    const windowsHomePath = process.env.USERPROFILE || process.env.HOME || os.homedir();
    let absolutePath = '';
    if (expandedToken.startsWith('~')) {
        const homeRelative = expandedToken.slice(1).replace(/^[/\\]+/, '');
        absolutePath = path.win32.resolve(windowsHomePath, homeRelative);
    } else if (/^\\\\/.test(expandedToken) || /^[A-Za-z]:[\\/]/.test(expandedToken)) {
        absolutePath = path.win32.resolve(expandedToken);
    } else {
        absolutePath = path.win32.resolve(projectPath, expandedToken);
    }

    return {
        rawToken: pathToken,
        resolvedPath: resolveWindowsPathWithRealpath(absolutePath),
        unresolvedEnv: expanded.unresolved,
        isDriveRelative: false,
        isRootRelative: false,
    };
}

function normalizePowerShellCommandName(commandName: string): string {
    let normalizedName = stripWrappingQuotes(commandName);
    if (!normalizedName) {
        return '';
    }
    normalizedName = normalizedName.replace(/^&\s*/, '').replace(/^\.\s*/, '');
    if (normalizedName.includes('\\') || normalizedName.includes('/')) {
        normalizedName = path.win32.basename(normalizedName);
    }
    return normalizeToken(normalizedName);
}

function getGitSubcommand(commandNode: PowerShellAstCommand): { subcommand: string; remainingArgs: string[] } | null {
    const args = commandNode.positionalArguments
        .map((argument) => normalizeToken(stripWrappingQuotes(argument)))
        .filter((argument) => argument.length > 0);

    if (args.length === 0) {
        return null;
    }

    const globalFlagsWithValues = new Set([
        '-c',
        '-C',
        '--config-env',
        '--exec-path',
        '--git-dir',
        '--namespace',
        '--super-prefix',
        '--work-tree',
    ]);

    for (let index = 0; index < args.length; index += 1) {
        const current = args[index];
        if (current === '--') {
            break;
        }

        if (current.startsWith('-')) {
            if (globalFlagsWithValues.has(current)) {
                index += 1;
            }
            continue;
        }

        return {
            subcommand: current,
            remainingArgs: args.slice(index + 1),
        };
    }

    return null;
}

function isReadOnlyGitCommand(commandNode: PowerShellAstCommand): boolean {
    const gitSubcommand = getGitSubcommand(commandNode);
    if (!gitSubcommand) {
        return false;
    }

    if (POWERSHELL_SAFE_READ_GIT_SUBCOMMANDS.has(gitSubcommand.subcommand)) {
        return true;
    }

    if (gitSubcommand.subcommand === 'branch') {
        return gitSubcommand.remainingArgs.some((arg) => arg === '-r' || arg === '--remotes');
    }

    if (gitSubcommand.subcommand === 'remote') {
        return gitSubcommand.remainingArgs.some((arg) => arg === '-v' || arg === '--verbose');
    }

    if (gitSubcommand.subcommand === 'tag') {
        return gitSubcommand.remainingArgs.some((arg) => arg === '-l' || arg === '--list');
    }

    return false;
}

function getUnsupportedReadCommand(commandNode: PowerShellAstCommand): string | null {
    const commandName = normalizePowerShellCommandName(commandNode.name);
    if (!commandName) {
        return null;
    }

    if (commandName !== 'git') {
        return POWERSHELL_SAFE_READ_COMMANDS.has(commandName) ? null : commandName;
    }

    if (isReadOnlyGitCommand(commandNode)) {
        return null;
    }

    const gitSubcommand = getGitSubcommand(commandNode);
    return gitSubcommand ? `git ${gitSubcommand.subcommand}` : 'git';
}

function buildPowerShellSuggestedPrefixRule(commands: PowerShellAstCommand[]): string[] {
    if (commands.length === 0) {
        return [];
    }
    const firstCommandName = normalizePowerShellCommandName(commands[0].name);
    return firstCommandName.length > 0 ? [firstCommandName] : [];
}

function extractPathTokens(commandNodes: PowerShellAstCommand[], redirectionTargets: string[]): {
    allPathTokens: string[];
    mutationPathTokens: string[];
    unresolvedPathLikeTokens: string[];
} {
    const allPathTokens: string[] = [];
    const mutationPathTokens: string[] = [];
    const unresolvedPathLikeTokens: string[] = [];

    for (const commandNode of commandNodes) {
        const commandName = normalizePowerShellCommandName(commandNode.name);
        const isMutationCommand = POWERSHELL_MUTATION_COMMANDS.has(commandName)
            || commandName.startsWith('export-');

        for (const parameter of commandNode.parameters) {
            const parameterName = normalizeToken(parameter.name || '');
            const argumentText = parameter.argumentText || '';
            if (!argumentText) {
                continue;
            }

            if (PATH_PARAMETER_NAMES.has(parameterName) || isSensitiveTokenName(argumentText)) {
                allPathTokens.push(argumentText);
            }
            if (WRITE_PARAMETER_NAMES.has(parameterName)) {
                mutationPathTokens.push(argumentText);
            }
        }

        for (const positionalArgument of commandNode.positionalArguments) {
            if (looksLikePowerShellPathToken(positionalArgument) || isSensitiveTokenName(positionalArgument)) {
                allPathTokens.push(positionalArgument);
                if (isMutationCommand) {
                    mutationPathTokens.push(positionalArgument);
                }
            } else if (isMutationCommand) {
                unresolvedPathLikeTokens.push(positionalArgument);
            }
        }
    }

    allPathTokens.push(...redirectionTargets);
    mutationPathTokens.push(...redirectionTargets);

    return {
        allPathTokens: dedupe(allPathTokens),
        mutationPathTokens: dedupe(mutationPathTokens),
        unresolvedPathLikeTokens: dedupe(unresolvedPathLikeTokens),
    };
}

function detectNetworkFromDotNet(command: string): boolean {
    const dotNetNetworkPatterns = [
        /System\.Net\.Http\.HttpClient/i,
        /System\.Net\.WebClient/i,
        /System\.Net\.WebRequest/i,
        /new-object\s+System\.Net\.(Http\.HttpClient|WebClient|WebRequest)/i,
        /\[System\.Net\.Http\.HttpClient\]::new\(/i,
    ];
    return dotNetNetworkPatterns.some((pattern) => pattern.test(command));
}

function detectScriptBlockCreateInvocation(command: string): boolean {
    return /\[scriptblock\]\s*::\s*Create\s*\(/i.test(command);
}

function buildSensitivePaths(resolvedPathInfos: ResolvedPathInfo[]): string[] {
    const sensitivePaths: string[] = [];
    for (const resolvedPathInfo of resolvedPathInfos) {
        if (!resolvedPathInfo.resolvedPath) {
            if (isSensitiveTokenName(resolvedPathInfo.rawToken)) {
                sensitivePaths.push(resolvedPathInfo.rawToken);
            }
            continue;
        }

        const normalized = normalizeWindowsPathForComparison(resolvedPathInfo.resolvedPath).replace(/\\/g, '/');
        const segments = normalized.split('/').filter((segment) => segment.length > 0);
        const basename = segments.length > 0 ? normalizeToken(segments[segments.length - 1]) : '';

        if (
            basename === '.env'
            || basename.startsWith('.env.')
            || SENSITIVE_FILE_BASENAMES.has(basename)
            || segments.some((segment) => SENSITIVE_PATH_SEGMENTS.has(normalizeToken(segment)))
            || isSensitiveTokenName(resolvedPathInfo.rawToken)
        ) {
            sensitivePaths.push(normalized);
        }
    }
    return dedupe(sensitivePaths);
}

function createSegment(command: string, commandNames: string[], reasons: string[], blocked: boolean, isDestructive: boolean): ShellSegmentAnalysisLike {
    return {
        raw: command,
        command: commandNames[0] || '',
        tokens: commandNames,
        requiresApproval: reasons.length > 0 || blocked,
        reasons: dedupe(reasons),
        isDestructive,
        blocked,
    };
}

function buildSegmentTokens(commandNodes: PowerShellAstCommand[]): string[] {
    if (commandNodes.length === 0) {
        return [];
    }

    const firstCommand = commandNodes[0];
    const firstCommandName = normalizePowerShellCommandName(firstCommand.name);
    if (!firstCommandName) {
        return [];
    }

    const tokens: string[] = [firstCommandName];
    for (const argument of firstCommand.arguments) {
        const normalizedArgument = normalizeToken(stripWrappingQuotes(argument));
        if (
            normalizedArgument.length > 0
            && !normalizedArgument.startsWith('-')
            && !looksLikePowerShellPathToken(normalizedArgument)
            && !normalizedArgument.includes('://')
        ) {
            tokens.push(normalizedArgument);
        }
    }

    return dedupe(tokens);
}

function buildFailClosedAnalysis(command: string, runInBackground: boolean, reason: string, parserBinary?: string): ShellCommandAnalysisLike {
    const reasons = [reason];
    return {
        requiresApproval: true,
        blocked: false,
        reasons,
        suggestedPrefixRule: [],
        isDestructive: false,
        isComplexSyntax: false,
        runInBackground,
        segments: [createSegment(command, [], reasons, false, false)],
        analysisEngine: 'powershell_ast_fail_closed',
        classificationMetadata: {
            parserBinary,
            failClosed: true,
        },
    };
}

export function analyzePowerShellCommand(
    command: string,
    projectPath: string,
    runInBackground: boolean,
    options?: PowerShellAnalyzerOptions
): ShellCommandAnalysisLike {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) {
        const reasons = ['Shell command cannot be empty.'];
        return {
            requiresApproval: false,
            blocked: true,
            reasons,
            suggestedPrefixRule: [],
            isDestructive: false,
            isComplexSyntax: false,
            runInBackground,
            segments: [createSegment(command, [], reasons, true, false)],
            analysisEngine: 'powershell_ast',
        };
    }

    const parseAst = options?.parseAst ?? parsePowerShellAst;
    const parseResult = parseAst(trimmedCommand);
    if (parseResult.failureReason) {
        return buildFailClosedAnalysis(
            trimmedCommand,
            runInBackground,
            `PowerShell AST parser is unavailable; explicit approval is required (${parseResult.failureReason}).`,
            parseResult.parserBinary
        );
    }

    const commandNames = parseResult.commands
        .map((commandNode) => normalizePowerShellCommandName(commandNode.name))
        .filter((commandName) => commandName.length > 0);

    const reasons: string[] = [];
    let blocked = false;

    if (parseResult.parseFailed || parseResult.parseErrors.length > 0) {
        reasons.push('PowerShell AST parse errors were detected; explicit approval is required.');
    }

    const hasInvokeExpression = commandNames.includes('invoke-expression') || commandNames.includes('iex');
    const hasEncodedCommandParameter = parseResult.commands.some((commandNode) =>
        commandNode.parameters.some((parameter) => {
            const parameterName = normalizeToken(parameter.name || '').replace(/^-+/, '');
            return parameterName === 'encodedcommand'
                || parameterName === 'e'
                || parameterName === 'ec'
                || parameterName.startsWith('enc');
        })
    );
    const hasEncodedCommand = hasEncodedCommandParameter
        || /(^|\s)-(?:e|ec|enc[a-z]*|encodedcommand)(?=[:=]|\s|$)/i.test(trimmedCommand);
    const hasStopParsingToken = parseResult.tokens.some((token) => token.text === '--%') || /(^|\s)--%(\s|$)/.test(trimmedCommand);
    const hasScriptBlockCreate = detectScriptBlockCreateInvocation(trimmedCommand);

    if (hasInvokeExpression) {
        blocked = true;
        reasons.push('Escape hatch usage is blocked: Invoke-Expression.');
    }
    if (hasEncodedCommand) {
        blocked = true;
        reasons.push('Escape hatch usage is blocked: -EncodedCommand.');
    }
    if (hasScriptBlockCreate) {
        blocked = true;
        reasons.push('Escape hatch usage is blocked: [scriptblock]::Create(...) invocation pattern.');
    }
    if (hasStopParsingToken) {
        blocked = true;
        reasons.push('Escape hatch usage is blocked: stop-parsing token (--%).');
    }

    const processCommands = commandNames.filter((commandName) =>
        POWERSHELL_PROCESS_COMMANDS.has(commandName) || POWERSHELL_SCHEDULED_TASK_COMMANDS.has(commandName)
    );
    const invokeCommandAsJobDetected = parseResult.commands.some((commandNode) =>
        normalizePowerShellCommandName(commandNode.name) === 'invoke-command'
        && commandNode.parameters.some((parameter) => normalizeToken(parameter.name || '') === 'asjob')
    );
    if (invokeCommandAsJobDetected && !processCommands.includes('invoke-command')) {
        processCommands.push('invoke-command');
    }

    const networkCommandNames = commandNames.filter((commandName) => POWERSHELL_NETWORK_COMMANDS.has(commandName));
    const networkFromCommands = networkCommandNames.length > 0;
    const networkFromDotNet = detectNetworkFromDotNet(trimmedCommand);
    const networkDetected = networkFromCommands || networkFromDotNet;
    if (networkDetected) {
        const reasonParts: string[] = [];
        if (networkFromCommands) {
            reasonParts.push(`command(s): ${dedupe(networkCommandNames).join(', ')}`);
        }
        if (networkFromDotNet) {
            reasonParts.push('.NET network API invocation');
        }

        const reasonDetail = reasonParts.length > 0
            ? reasonParts.join(' and ')
            : 'command/dotnet call';
        reasons.push(`Network access detected via ${reasonDetail}; explicit approval is required.`);
    }

    const mutationFromCommands = commandNames.some((commandName) =>
        POWERSHELL_MUTATION_COMMANDS.has(commandName) || commandName.startsWith('export-')
    );
    const mutationFromRedirection = parseResult.redirections.length > 0;
    const isMutation = mutationFromCommands || mutationFromRedirection;
    const isDestructive = commandNames.some((commandName) => POWERSHELL_DESTRUCTIVE_COMMANDS.has(commandName));

    const redirectionTargets = parseResult.redirections
        .map((redirectionNode) => redirectionNode.targetText || '')
        .filter((targetText) => targetText.length > 0);

    const extractedPathTokens = extractPathTokens(parseResult.commands, redirectionTargets);
    const resolvedPathInfos = extractedPathTokens.allPathTokens.map((pathToken) =>
        resolvePowerShellPathToken(projectPath, pathToken)
    );
    const resolvedMutationPathInfos = extractedPathTokens.mutationPathTokens.map((pathToken) =>
        resolvePowerShellPathToken(projectPath, pathToken)
    );

    const providerPaths = resolvedPathInfos
        .filter((pathInfo) => pathInfo.providerPrefix && NON_FILESYSTEM_PROVIDER_PREFIXES.has(pathInfo.providerPrefix))
        .map((pathInfo) => `${pathInfo.providerPrefix}:`);
    if (providerPaths.length > 0) {
        blocked = true;
        reasons.push(
            `Access to non-filesystem providers is blocked: ${dedupe(providerPaths).join(', ')}.`
        );
    }

    const unresolvedEnvPathTokens = resolvedPathInfos
        .filter((pathInfo) => pathInfo.unresolvedEnv)
        .map((pathInfo) => pathInfo.rawToken);
    if (unresolvedEnvPathTokens.length > 0) {
        reasons.push(
            `Path resolution requires approval because environment variables could not be resolved: ${dedupe(unresolvedEnvPathTokens).join(', ')}.`
        );
    }

    const driveRelativePathTokens = resolvedPathInfos
        .filter((pathInfo) => pathInfo.isDriveRelative || pathInfo.isRootRelative)
        .map((pathInfo) => pathInfo.rawToken);
    if (driveRelativePathTokens.length > 0) {
        reasons.push(
            `Drive-relative or root-relative Windows paths are ambiguous and require approval: ${dedupe(driveRelativePathTokens).join(', ')}.`
        );
    }

    const sensitivePaths = buildSensitivePaths(resolvedPathInfos);
    if (sensitivePaths.length > 0) {
        blocked = true;
        reasons.push(`Access to sensitive paths is blocked by shell sandbox policy. Sensitive path(s): ${sensitivePaths.join(', ')}.`);
    }

    const normalizedProjectPath = normalizeWindowsPathForComparison(path.win32.resolve(projectPath));
    const normalizedExternalAllowedRoots = [
        normalizeWindowsPathForComparison(path.win32.resolve(os.tmpdir())),
    ];
    const normalizedAllowedMutationRoots = dedupe([normalizedProjectPath, ...normalizedExternalAllowedRoots]);

    const disallowedMutationPaths = resolvedMutationPathInfos
        .filter((pathInfo) => pathInfo.resolvedPath && !pathInfo.providerPrefix)
        .map((pathInfo) => normalizeWindowsPathForComparison(pathInfo.resolvedPath!))
        .filter((resolvedPath) =>
            !normalizedAllowedMutationRoots.some((allowedRoot) => isPathWithinWindows(allowedRoot, resolvedPath))
        );

    if (disallowedMutationPaths.length > 0) {
        blocked = true;
        reasons.push(
            `Mutating paths outside allowed roots is blocked. Disallowed path(s): ${dedupe(disallowedMutationPaths).join(', ')}. ` +
            `Allowed roots: project root, ${normalizedExternalAllowedRoots.join(', ')}.`
        );
    }

    const resolvedMutationPaths = resolvedMutationPathInfos
        .filter((pathInfo) => pathInfo.resolvedPath && !pathInfo.providerPrefix)
        .map((pathInfo) => normalizeWindowsPathForComparison(pathInfo.resolvedPath!));
    const writesOnlyToExternalAllowedRoots = resolvedMutationPaths.length > 0
        && resolvedMutationPaths.every((resolvedPath) =>
            !isPathWithinWindows(normalizedProjectPath, resolvedPath)
            && normalizedExternalAllowedRoots.some((allowedRoot) => isPathWithinWindows(allowedRoot, resolvedPath))
        );

    if (isMutation && !blocked && !writesOnlyToExternalAllowedRoots) {
        reasons.push('Commands that may modify files or system state require approval.');
    }

    if (isMutation && extractedPathTokens.unresolvedPathLikeTokens.length > 0) {
        reasons.push(
            `Potential mutation target paths are ambiguous and require approval: ${extractedPathTokens.unresolvedPathLikeTokens.join(', ')}.`
        );
    }

    if (!networkDetected && !isMutation) {
        if (commandNames.length === 0) {
            reasons.push('Unable to classify PowerShell command intent; explicit approval is required.');
        } else {
            const unsupportedReadCommands = parseResult.commands
                .map((commandNode) => getUnsupportedReadCommand(commandNode))
                .filter((commandName): commandName is string => commandName !== null);
            if (unsupportedReadCommands.length > 0) {
                reasons.push(
                    `Command is outside the read-only allowlist and requires approval: ${dedupe(unsupportedReadCommands).join(', ')}.`
                );
            }
        }
    }

    const suggestedPrefixRule = buildPowerShellSuggestedPrefixRule(parseResult.commands);

    const finalReasons = dedupe(reasons);
    const segmentTokens = buildSegmentTokens(parseResult.commands);
    const segment = createSegment(trimmedCommand, segmentTokens, finalReasons, blocked, isDestructive);

    return {
        requiresApproval: finalReasons.length > 0 || blocked,
        blocked,
        reasons: finalReasons,
        suggestedPrefixRule,
        isDestructive,
        isComplexSyntax: false,
        runInBackground,
        segments: [segment],
        analysisEngine: 'powershell_ast',
        classificationMetadata: {
            parserBinary: parseResult.parserBinary,
            parseErrorsCount: parseResult.parseErrors.length,
            commandNames,
            networkDetected,
            processBackgroundDetected: processCommands.length > 0,
            processCommands: dedupe(processCommands),
            invokeCommandAsJobDetected,
            mutationPathTokens: extractedPathTokens.mutationPathTokens,
            resolvedMutationPaths: dedupe(resolvedMutationPaths),
            redirectionCount: parseResult.redirections.length,
            writesOnlyToExternalAllowedRoots,
            runInBackground,
        },
    };
}
