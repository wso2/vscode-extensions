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

/**
 * Shell sandbox policy summary:
 * - Allows read-only commands, network calls, and background execution by default.
 * - Requires approval for potentially mutating commands that are allowed to run.
 * - Hard-blocks interactive/elevated commands (e.g., sudo, shells, editors).
 * - Hard-blocks file mutations outside the project, except explicitly allowed roots (currently /tmp).
 * - Resolves paths via realpath (or nearest existing parent) to prevent symlink/path-escape bypasses.
 */
export interface ShellSegmentAnalysis {
    raw: string;
    command: string;
    tokens: string[];
    requiresApproval: boolean;
    reasons: string[];
    isDestructive: boolean;
    blocked: boolean;
}

export interface ShellCommandAnalysis {
    requiresApproval: boolean;
    blocked: boolean;
    reasons: string[];
    suggestedPrefixRule: string[];
    isDestructive: boolean;
    isComplexSyntax: boolean;
    runInBackground: boolean;
    segments: ShellSegmentAnalysis[];
}

export function buildShellCommandDeniedResult(): {
    success: false;
    message: string;
    error: 'SHELL_COMMAND_DENIED';
} {
    return {
        success: false,
        message: [
            'User denied permission to execute shell command.',
            '',
            '<system-reminder>',
            'Do not retry the same shell command. Use other tools or ask the user for an alternative approach.',
            '</system-reminder>',
        ].join('\n'),
        error: 'SHELL_COMMAND_DENIED',
    };
}

export function buildShellSandboxBlockedResult(reasons: string[]): {
    success: false;
    message: string;
    error: 'SHELL_SANDBOX_BLOCKED';
} {
    const blockedReasons = reasons.length > 0
        ? reasons.map((reason) => `- ${reason}`).join('\n')
        : '- Command is blocked by shell sandbox policy.';

    return {
        success: false,
        message: [
            'Shell command blocked by sandbox policy.',
            blockedReasons,
            '',
            '<system-reminder>',
            'Do not retry blocked shell commands. Keep file mutations inside the project or use /tmp.',
            '</system-reminder>',
        ].join('\n'),
        error: 'SHELL_SANDBOX_BLOCKED',
    };
}

const SAFE_READ_COMMANDS = new Set([
    'cat',
    'cd',
    'cut',
    'dir',
    'dirname',
    'du',
    'echo',
    'env',
    'find',
    'git',
    'grep',
    'head',
    'id',
    'ls',
    'pwd',
    'readlink',
    'realpath',
    'rg',
    'select-string',
    'sort',
    'stat',
    'tail',
    'tree',
    'type',
    'uniq',
    'wc',
    'where',
    'which',
    'whoami',
]);

const NETWORK_COMMANDS = new Set([
    'curl',
    'dig',
    'ftp',
    'invoke-restmethod',
    'invoke-webrequest',
    'nc',
    'netcat',
    'nmap',
    'nslookup',
    'ping',
    'scp',
    'sftp',
    'ssh',
    'telnet',
    'traceroute',
    'wget',
]);

const MUTATION_COMMANDS = new Set([
    'add-content',
    'clear-content',
    'copy-item',
    'cp',
    'dd',
    'del',
    'install',
    'ln',
    'mkdir',
    'move-item',
    'mv',
    'new-item',
    'npm',
    'out-file',
    'perl',
    'pip',
    'pip3',
    'pnpm',
    'poetry',
    'python',
    'python3',
    'remove-item',
    'rename-item',
    'rm',
    'rmdir',
    'sed',
    'set-content',
    'tee',
    'touch',
    'truncate',
    'yarn',
]);

const DESTRUCTIVE_COMMANDS = new Set([
    'chmod',
    'chown',
    'chgrp',
    'del',
    'move-item',
    'mv',
    'rd',
    'remove-item',
    'rename-item',
    'rm',
    'rmdir',
    'truncate',
]);

const BLOCKED_INTERACTIVE_OR_ELEVATED_COMMANDS = new Set([
    'bash',
    'cmd',
    'cmd.exe',
    'doas',
    'emacs',
    'htop',
    'less',
    'man',
    'more',
    'nano',
    'nvim',
    'passwd',
    'powershell',
    'powershell.exe',
    'pwsh',
    'sh',
    'su',
    'sudo',
    'top',
    'vi',
    'vim',
    'watch',
    'zsh',
]);

const ALLOWED_EXTERNAL_MUTATION_ROOTS = process.platform === 'win32'
    ? [path.resolve(os.tmpdir())]
    : ['/tmp'];

function dedupe(values: string[]): string[] {
    return Array.from(new Set(values));
}

function normalizePathForComparison(targetPath: string): string {
    const normalized = path.resolve(targetPath).replace(/\\/g, '/').replace(/\/+$/, '');
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function tryRealpath(targetPath: string): string | undefined {
    try {
        return fs.realpathSync.native(targetPath);
    } catch {
        try {
            return fs.realpathSync(targetPath);
        } catch {
            return undefined;
        }
    }
}

function resolvePathWithRealpath(targetPath: string): string {
    const absolutePath = path.resolve(targetPath);
    const directRealPath = tryRealpath(absolutePath);
    if (directRealPath) {
        return normalizePathForComparison(directRealPath);
    }

    const tailSegments: string[] = [];
    let cursor = absolutePath;
    while (true) {
        const parent = path.dirname(cursor);
        if (parent === cursor) {
            break;
        }
        tailSegments.unshift(path.basename(cursor));
        const realParentPath = tryRealpath(parent);
        if (realParentPath) {
            return normalizePathForComparison(path.join(realParentPath, ...tailSegments));
        }
        cursor = parent;
    }

    return normalizePathForComparison(absolutePath);
}

function isPathWithin(basePath: string, targetPath: string): boolean {
    const normalizedBase = normalizePathForComparison(basePath);
    const normalizedTarget = normalizePathForComparison(targetPath);
    return normalizedTarget === normalizedBase || normalizedTarget.startsWith(`${normalizedBase}/`);
}

function normalizeToken(token: string): string {
    return token.trim().toLowerCase();
}

function tokenizeSegment(segment: string): { tokens: string[]; parseFailed: boolean } {
    const tokens: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escapeNext = false;

    for (let i = 0; i < segment.length; i++) {
        const ch = segment[i];

        if (escapeNext) {
            current += ch;
            escapeNext = false;
            continue;
        }

        if (ch === '\\' && !inSingleQuote) {
            escapeNext = true;
            continue;
        }

        if (ch === '\'' && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote;
            continue;
        }

        if (ch === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
            continue;
        }

        if (!inSingleQuote && !inDoubleQuote && /\s/.test(ch)) {
            if (current.trim().length > 0) {
                tokens.push(current);
                current = '';
            }
            continue;
        }

        current += ch;
    }

    if (escapeNext || inSingleQuote || inDoubleQuote) {
        return { tokens: [], parseFailed: true };
    }

    if (current.trim().length > 0) {
        tokens.push(current);
    }

    return {
        tokens: tokens.map((token) => token.trim()).filter((token) => token.length > 0),
        parseFailed: false,
    };
}

function splitTopLevelSegments(command: string): { segments: string[]; parseFailed: boolean } {
    const segments: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escapeNext = false;

    const pushSegment = () => {
        const trimmed = current.trim();
        if (trimmed.length > 0) {
            segments.push(trimmed);
        }
        current = '';
    };

    for (let i = 0; i < command.length; i++) {
        const ch = command[i];
        const next = command[i + 1];

        if (escapeNext) {
            current += ch;
            escapeNext = false;
            continue;
        }

        if (ch === '\\' && !inSingleQuote) {
            current += ch;
            escapeNext = true;
            continue;
        }

        if (ch === '\'' && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote;
            current += ch;
            continue;
        }

        if (ch === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
            current += ch;
            continue;
        }

        if (!inSingleQuote && !inDoubleQuote) {
            if (ch === '&' && next === '&') {
                pushSegment();
                i++;
                continue;
            }
            if (ch === '|' && next === '|') {
                pushSegment();
                i++;
                continue;
            }
            if (ch === '|' || ch === ';') {
                pushSegment();
                continue;
            }
        }

        current += ch;
    }

    if (escapeNext || inSingleQuote || inDoubleQuote) {
        return { segments: [], parseFailed: true };
    }

    pushSegment();
    return { segments, parseFailed: false };
}

function detectComplexSyntax(command: string): { isComplex: boolean; reason?: string } {
    if (command.includes('\n')) {
        return {
            isComplex: true,
            reason: 'Multiline shell commands require explicit approval.',
        };
    }

    if (/(^|[^\\])`/.test(command)) {
        return {
            isComplex: true,
            reason: 'Backtick command substitution requires explicit approval.',
        };
    }

    if (/\$\(/.test(command)) {
        return {
            isComplex: true,
            reason: 'Subshell command substitution ($( ... )) requires explicit approval.',
        };
    }

    if (/<<<?\s*\w*/.test(command)) {
        return {
            isComplex: true,
            reason: 'Heredoc or here-string syntax requires explicit approval.',
        };
    }

    if (/[<>]\(/.test(command)) {
        return {
            isComplex: true,
            reason: 'Process substitution syntax requires explicit approval.',
        };
    }

    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escapeNext = false;
    for (let i = 0; i < command.length; i++) {
        const ch = command[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }
        if (ch === '\\' && !inSingleQuote) {
            escapeNext = true;
            continue;
        }
        if (ch === '\'' && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote;
            continue;
        }
        if (ch === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
            continue;
        }
        if (!inSingleQuote && !inDoubleQuote && (ch === '(' || ch === ')')) {
            return {
                isComplex: true,
                reason: 'Nested shell grouping syntax requires explicit approval.',
            };
        }
    }

    return { isComplex: false };
}

function looksLikePathToken(token: string): boolean {
    const normalizedToken = stripWrappingQuotes(token);
    if (!normalizedToken || normalizedToken.length === 0) {
        return false;
    }

    if (normalizedToken.includes('://')) {
        return false;
    }

    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(normalizedToken)) {
        return false;
    }

    if (normalizedToken.startsWith('$')) {
        return false;
    }

    if (normalizedToken.startsWith('-')) {
        return false;
    }

    if (path.isAbsolute(normalizedToken)) {
        return true;
    }

    if (normalizedToken.startsWith('~') || normalizedToken.startsWith('./') || normalizedToken.startsWith('../')) {
        return true;
    }

    if (/^[A-Za-z]:[\\/]/.test(normalizedToken)) {
        return true;
    }

    return normalizedToken.includes('/') || normalizedToken.includes('\\');
}

function stripWrappingQuotes(token: string): string {
    if (token.length >= 2) {
        if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith('\'') && token.endsWith('\''))) {
            return token.slice(1, -1);
        }
    }
    return token;
}

function isLikelyFilePathValue(token: string): boolean {
    const normalizedToken = stripWrappingQuotes(token.trim());
    if (!normalizedToken || normalizedToken.length === 0) {
        return false;
    }

    if (normalizedToken === '-' || normalizedToken === '--') {
        return false;
    }

    if (normalizedToken.includes('://')) {
        return false;
    }

    if (/^[0-9]+$/.test(normalizedToken)) {
        return false;
    }

    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(normalizedToken)) {
        return false;
    }

    if (normalizedToken.startsWith('$')) {
        return false;
    }

    return true;
}

function isNullDevicePath(token: string): boolean {
    const normalizedToken = normalizeToken(stripWrappingQuotes(token));
    return normalizedToken === '/dev/null' || normalizedToken === 'nul';
}

function resolvePathCandidate(projectPath: string, token: string): string {
    const normalizedToken = stripWrappingQuotes(token.trim());
    if (normalizedToken.startsWith('~')) {
        const homeDir = os.homedir();
        const relative = normalizedToken.slice(1).replace(/^[/\\]+/, '');
        return resolvePathWithRealpath(path.resolve(homeDir, relative));
    }

    if (path.isAbsolute(normalizedToken) || /^[A-Za-z]:[\\/]/.test(normalizedToken)) {
        return resolvePathWithRealpath(path.resolve(normalizedToken));
    }

    return resolvePathWithRealpath(path.resolve(projectPath, normalizedToken));
}

function extractOutputRedirectionPaths(segment: string): string[] {
    const paths: string[] = [];
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escapeNext = false;

    for (let i = 0; i < segment.length; i++) {
        const ch = segment[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (ch === '\\' && !inSingleQuote) {
            escapeNext = true;
            continue;
        }

        if (ch === '\'' && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote;
            continue;
        }

        if (ch === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
            continue;
        }

        if (inSingleQuote || inDoubleQuote || ch !== '>') {
            continue;
        }

        if (segment[i + 1] === '>') {
            i++;
        }

        let cursor = i + 1;
        while (cursor < segment.length && /\s/.test(segment[cursor])) {
            cursor++;
        }
        if (cursor >= segment.length) {
            break;
        }

        let token = '';
        const opener = segment[cursor];
        if (opener === '\'' || opener === '"') {
            const closer = opener;
            cursor++;
            while (cursor < segment.length && segment[cursor] !== closer) {
                token += segment[cursor];
                cursor++;
            }
        } else {
            while (
                cursor < segment.length &&
                !/\s/.test(segment[cursor]) &&
                segment[cursor] !== ';' &&
                segment[cursor] !== '|' &&
                segment[cursor] !== '&'
            ) {
                token += segment[cursor];
                cursor++;
            }
        }

        const cleaned = stripWrappingQuotes(token.trim());
        if (cleaned && !cleaned.startsWith('&') && isLikelyFilePathValue(cleaned) && !isNullDevicePath(cleaned)) {
            paths.push(cleaned);
        }

        i = cursor - 1;
    }

    return dedupe(paths);
}

function extractOptionValues(tokens: string[], optionNames: string[]): string[] {
    const values: string[] = [];
    for (let i = 1; i < tokens.length; i++) {
        const token = tokens[i];
        for (const optionName of optionNames) {
            if (token === optionName && i + 1 < tokens.length) {
                values.push(tokens[i + 1]);
                break;
            }
            if (token.startsWith(`${optionName}=`)) {
                values.push(token.slice(optionName.length + 1));
                break;
            }
        }
    }
    return values;
}

function extractTeeWritePaths(tokens: string[]): string[] {
    if (normalizeToken(tokens[0] || '') !== 'tee') {
        return [];
    }

    const writePaths = tokens.slice(1)
        .filter((token) => !token.startsWith('-'))
        .map((token) => stripWrappingQuotes(token))
        .filter((token) => isLikelyFilePathValue(token) && !isNullDevicePath(token));

    return dedupe(writePaths);
}

function extractMutationWritePathTokens(command: string, tokens: string[], rawSegment: string): string[] {
    const writePaths: string[] = [];
    writePaths.push(...extractOutputRedirectionPaths(rawSegment));
    writePaths.push(...extractTeeWritePaths(tokens));

    if (['cp', 'copy-item', 'mv', 'move-item', 'rename-item', 'ln'].includes(command)) {
        const targetDirectory = extractOptionValues(tokens, ['-t', '--target-directory']);
        if (targetDirectory.length > 0) {
            writePaths.push(targetDirectory[targetDirectory.length - 1]);
        } else {
            const positionalArgs = tokens.slice(1).filter((token) => !token.startsWith('-'));
            if (positionalArgs.length > 0) {
                writePaths.push(positionalArgs[positionalArgs.length - 1]);
            }
        }
    } else if (command === 'dd') {
        for (const token of tokens.slice(1)) {
            if (token.startsWith('of=')) {
                writePaths.push(token.slice(3));
            }
        }
    } else if (command === 'git') {
        writePaths.push(...extractOptionValues(tokens, ['-C', '--git-dir', '--work-tree']));
    } else if (['bun', 'npm', 'pnpm', 'pip', 'pip3', 'poetry', 'yarn'].includes(command)) {
        writePaths.push(...extractOptionValues(tokens, ['-C', '--prefix', '--cwd']));
    } else {
        const positionalArgs = tokens.slice(1)
            .filter((token) => !token.startsWith('-'))
            .map((token) => stripWrappingQuotes(token))
            .filter((token) => isLikelyFilePathValue(token));
        writePaths.push(...positionalArgs);
        writePaths.push(...extractOptionValues(tokens, ['--path', '--output', '--out', '--file', '--target', '--destination']));
    }

    return dedupe(
        writePaths
            .map((token) => stripWrappingQuotes(token))
            .filter((token) => isLikelyFilePathValue(token) && !isNullDevicePath(token))
    );
}

function findDisallowedMutationPaths(
    projectPath: string,
    allowedMutationRoots: string[],
    writePathTokens: string[]
): string[] {
    const disallowedPaths: string[] = [];
    for (const writePathToken of writePathTokens) {
        try {
            const resolvedPath = resolvePathCandidate(projectPath, writePathToken);
            const isAllowed = allowedMutationRoots.some((allowedRoot) => isPathWithin(allowedRoot, resolvedPath));
            if (!isAllowed) {
                disallowedPaths.push(resolvedPath);
            }
        } catch {
            disallowedPaths.push(writePathToken);
        }
    }
    return dedupe(disallowedPaths);
}

function hasOutputRedirection(segment: string): boolean {
    return extractOutputRedirectionPaths(segment).length > 0;
}

function isGitMutation(tokens: string[]): boolean {
    if (tokens.length < 2 || normalizeToken(tokens[0]) !== 'git') {
        return false;
    }

    const gitAction = normalizeToken(tokens[1]);
    return [
        'add',
        'apply',
        'am',
        'checkout',
        'cherry-pick',
        'clean',
        'commit',
        'fetch',
        'merge',
        'pull',
        'push',
        'rebase',
        'reset',
        'restore',
        'revert',
        'stash',
        'switch',
    ].includes(gitAction);
}

function isGitDestructive(tokens: string[]): boolean {
    if (tokens.length < 2 || normalizeToken(tokens[0]) !== 'git') {
        return false;
    }

    const gitAction = normalizeToken(tokens[1]);
    return ['checkout', 'clean', 'reset', 'restore', 'switch'].includes(gitAction);
}

function isPackageManagerMutation(tokens: string[]): boolean {
    if (tokens.length < 2) {
        return false;
    }

    const manager = normalizeToken(tokens[0]);
    if (!['bun', 'npm', 'pip', 'pip3', 'pnpm', 'poetry', 'yarn'].includes(manager)) {
        return false;
    }

    const action = normalizeToken(tokens[1]);
    return [
        'add',
        'build',
        'install',
        'init',
        'publish',
        'remove',
        'run',
        'test',
        'uninstall',
        'update',
        'upgrade',
    ].includes(action);
}

function isSedOrPerlInPlaceMutation(tokens: string[]): boolean {
    const command = normalizeToken(tokens[0] || '');
    if (!['perl', 'sed'].includes(command)) {
        return false;
    }

    return tokens.some((token) => token === '-i' || token.startsWith('-i'));
}

function isDestructiveCommand(command: string, tokens: string[]): boolean {
    if (DESTRUCTIVE_COMMANDS.has(command)) {
        return true;
    }

    if (isGitDestructive(tokens)) {
        return true;
    }

    return false;
}

function buildSuggestedPrefixRule(tokens: string[]): string[] {
    if (tokens.length === 0) {
        return [];
    }

    const prefix: string[] = [normalizeToken(tokens[0])];
    if (tokens.length > 1) {
        const second = normalizeToken(tokens[1]);
        if (
            second.length > 0 &&
            !second.startsWith('-') &&
            !second.includes('://') &&
            !looksLikePathToken(second)
        ) {
            prefix.push(second);
        }
    }

    return prefix;
}

function analyzeSegment(rawSegment: string, projectPath: string, allowedMutationRoots: string[]): ShellSegmentAnalysis {
    const tokenized = tokenizeSegment(rawSegment);
    if (tokenized.parseFailed) {
        return {
            raw: rawSegment,
            command: '',
            tokens: [],
            requiresApproval: true,
            reasons: ['Failed to parse shell segment safely; explicit approval is required.'],
            isDestructive: false,
            blocked: false,
        };
    }

    const tokens = tokenized.tokens;
    if (tokens.length === 0) {
        return {
            raw: rawSegment,
            command: '',
            tokens: [],
            requiresApproval: false,
            reasons: [],
            isDestructive: false,
            blocked: false,
        };
    }

    const command = normalizeToken(tokens[0]);
    const reasons: string[] = [];
    let blocked = false;

    if (BLOCKED_INTERACTIVE_OR_ELEVATED_COMMANDS.has(command)) {
        blocked = true;
        reasons.push('Interactive/elevated commands are blocked in the shell sandbox.');
    }

    const isNetwork = NETWORK_COMMANDS.has(command);
    const isMutation = MUTATION_COMMANDS.has(command)
        || isGitMutation(tokens)
        || isPackageManagerMutation(tokens)
        || isSedOrPerlInPlaceMutation(tokens)
        || hasOutputRedirection(rawSegment);
    const isDestructive = isDestructiveCommand(command, tokens);
    const writePathTokens = isMutation ? extractMutationWritePathTokens(command, tokens, rawSegment) : [];
    const disallowedMutationPaths = isMutation
        ? findDisallowedMutationPaths(projectPath, allowedMutationRoots, writePathTokens)
        : [];

    if (disallowedMutationPaths.length > 0) {
        blocked = true;
        const outsideRoots = ALLOWED_EXTERNAL_MUTATION_ROOTS.join(', ');
        reasons.push(
            `Mutating paths outside allowed roots is blocked. Disallowed path(s): ${disallowedMutationPaths.join(', ')}. ` +
            `Allowed roots: project root${outsideRoots ? `, ${outsideRoots}` : ''}.`
        );
    } else if (isMutation) {
        reasons.push('Commands that may modify files or system state require approval.');
    }
    if (!SAFE_READ_COMMANDS.has(command) && !isNetwork && !isMutation) {
        reasons.push('Command is outside the read-only allowlist and requires approval.');
    }

    return {
        raw: rawSegment,
        command,
        tokens,
        requiresApproval: reasons.length > 0 || blocked,
        reasons: dedupe(reasons),
        isDestructive,
        blocked,
    };
}

export function normalizePrefixRule(rule: string[]): string[] {
    return rule
        .map((token) => normalizeToken(token))
        .filter((token) => token.length > 0);
}

export function matchesPrefixRule(tokens: string[], rule: string[]): boolean {
    const normalizedTokens = normalizePrefixRule(tokens);
    const normalizedRule = normalizePrefixRule(rule);
    if (normalizedRule.length === 0 || normalizedRule.length > normalizedTokens.length) {
        return false;
    }

    for (let i = 0; i < normalizedRule.length; i++) {
        if (normalizedTokens[i] !== normalizedRule[i]) {
            return false;
        }
    }

    return true;
}

export function isAnalysisCoveredByRules(analysis: ShellCommandAnalysis, rules: string[][]): boolean {
    if (analysis.blocked || analysis.isDestructive || analysis.isComplexSyntax) {
        return false;
    }

    const normalizedRules = rules.map((rule) => normalizePrefixRule(rule)).filter((rule) => rule.length > 0);
    if (normalizedRules.length === 0) {
        return false;
    }

    const segmentsNeedingApproval = analysis.segments.filter((segment) => segment.requiresApproval && !segment.blocked);
    if (segmentsNeedingApproval.length === 0) {
        return false;
    }

    return segmentsNeedingApproval.every((segment) =>
        normalizedRules.some((rule) => matchesPrefixRule(segment.tokens, rule))
    );
}

export function analyzeShellCommand(
    command: string,
    _platform: NodeJS.Platform,
    projectPath: string,
    runInBackground: boolean
): ShellCommandAnalysis {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) {
        return {
            requiresApproval: false,
            blocked: true,
            reasons: ['Shell command cannot be empty.'],
            suggestedPrefixRule: [],
            isDestructive: false,
            isComplexSyntax: false,
            runInBackground,
            segments: [],
        };
    }

    const complexSyntax = detectComplexSyntax(trimmedCommand);
    const splitSegments = splitTopLevelSegments(trimmedCommand);
    const segmentsToAnalyze = splitSegments.parseFailed
        ? [trimmedCommand]
        : (splitSegments.segments.length > 0 ? splitSegments.segments : [trimmedCommand]);

    const resolvedProjectPath = resolvePathWithRealpath(projectPath);
    const allowedMutationRoots = dedupe([
        resolvedProjectPath,
        ...ALLOWED_EXTERNAL_MUTATION_ROOTS.map((mutationRoot) => resolvePathWithRealpath(mutationRoot)),
    ]);

    const analyzedSegments = segmentsToAnalyze.map((segment) =>
        analyzeSegment(segment, resolvedProjectPath, allowedMutationRoots)
    );

    const blocked = analyzedSegments.some((segment) => segment.blocked);
    const isDestructive = analyzedSegments.some((segment) => segment.isDestructive);
    const segmentReasons = analyzedSegments.flatMap((segment) => segment.reasons);
    const reasons: string[] = [...segmentReasons];

    let isComplexSyntax = complexSyntax.isComplex || splitSegments.parseFailed;
    if (splitSegments.parseFailed) {
        reasons.push('Failed to parse shell operators safely; explicit approval is required.');
    }
    if (complexSyntax.reason) {
        reasons.push(complexSyntax.reason);
    }

    const requiresApproval = isComplexSyntax
        || analyzedSegments.some((segment) => segment.requiresApproval);

    const preferredSegment = analyzedSegments.find((segment) =>
        segment.requiresApproval && !segment.blocked && !segment.isDestructive && segment.tokens.length > 0
    );
    const suggestedPrefixRule = preferredSegment ? buildSuggestedPrefixRule(preferredSegment.tokens) : [];

    return {
        requiresApproval,
        blocked,
        reasons: dedupe(reasons),
        suggestedPrefixRule,
        isDestructive,
        isComplexSyntax,
        runInBackground,
        segments: analyzedSegments,
    };
}
