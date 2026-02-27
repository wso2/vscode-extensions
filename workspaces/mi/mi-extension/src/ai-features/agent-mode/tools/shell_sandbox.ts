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
import { analyzePowerShellCommand } from './shell_sandbox_powershell';

/**
 * Shell sandbox policy summary:
 * - Allows read-only commands, network calls, and background execution by default.
 * - Requires approval for potentially mutating commands that are allowed to run, except /tmp-only writes.
 * - Hard-blocks interactive/elevated commands (e.g., sudo, shells, editors).
 * - Hard-blocks access to sensitive secret paths (for example ~/.ssh, ~/.aws, shell rc files, and .env files).
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
    analysisEngine?: string;
    classificationMetadata?: Record<string, unknown>;
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

const WRAPPER_COMMANDS_REQUIRING_APPROVAL = new Set([
    'env',
    'xargs',
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

const ALLOWED_EXTERNAL_MUTATION_ROOTS = [resolvePathWithRealpath(os.tmpdir())];

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
            if (ch === '&') {
                let previousNonSpace = '';
                for (let j = i - 1; j >= 0; j--) {
                    if (!/\s/.test(command[j])) {
                        previousNonSpace = command[j];
                        break;
                    }
                }

                const previousChar = command[i - 1] || '';
                const nextChar = next || '';
                const isRedirectionAmpersand =
                    nextChar === '>'
                    || nextChar === '&'
                    || /\d/.test(nextChar)
                    || (/\d/.test(previousNonSpace) && nextChar === '>');
                const isBackgroundBoundary =
                    i === 0
                    || i === command.length - 1
                    || /\s/.test(previousChar)
                    || /\s/.test(nextChar);

                if (!isRedirectionAmpersand && isBackgroundBoundary) {
                    pushSegment();
                    continue;
                }
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

function isSensitiveTokenName(token: string): boolean {
    const normalizedToken = stripWrappingQuotes(token.trim());
    if (!normalizedToken) {
        return false;
    }

    const normalizedLower = normalizeToken(normalizedToken);
    const normalizedWithForwardSlashes = normalizedLower.replace(/\\/g, '/');
    const basename = normalizeToken(path.basename(normalizedToken));
    if (!basename) {
        return false;
    }

    if (basename === '.env' || basename.startsWith('.env.')) {
        return true;
    }

    if (SENSITIVE_FILE_BASENAMES.has(basename)) {
        return true;
    }

    if (/^id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/i.test(basename)) {
        return true;
    }

    if (normalizedWithForwardSlashes.includes('/.aws/') || normalizedWithForwardSlashes.endsWith('/.aws')) {
        return true;
    }

    if (normalizedWithForwardSlashes.includes('/.ssh/') || normalizedWithForwardSlashes.endsWith('/.ssh')) {
        return true;
    }

    if (/(^|\/)\.(bashrc|bash_profile|zshrc|zprofile|profile|env(\..+)?)$/i.test(normalizedWithForwardSlashes)) {
        return true;
    }

    return false;
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
            const isShortOption = optionName.startsWith('-') && !optionName.startsWith('--');
            if (isShortOption && token.startsWith(optionName) && token.length > optionName.length) {
                const attached = token.slice(optionName.length);
                values.push(attached.startsWith('=') ? attached.slice(1) : attached);
                break;
            }
        }
    }
    return values;
}

function extractPathOptions(tokens: string[]): string[] {
    return extractOptionValues(tokens, [
        '-C',
        '-f',
        '-t',
        '--config',
        '--cwd',
        '--destination',
        '--file',
        '--git-dir',
        '--out',
        '--output',
        '--path',
        '--prefix',
        '--target',
        '--target-directory',
        '--work-tree',
    ]);
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
        const gitGlobalOptionsWithValue = new Set(['-C', '--git-dir', '--work-tree']);
        const gitSubcommandOptionsWithValue = new Set([
            '--config',
            '--config-env',
            '--depth',
            '--branch',
            '--origin',
            '--reference',
            '--reference-if-able',
            '--server-option',
            '--template',
            '--upload-pack',
            '--separate-git-dir',
            '--object-format',
            '--shared',
            '--initial-branch',
        ]);

        const gitArgs = tokens.slice(1);
        let subcommandIndex = -1;
        for (let i = 0; i < gitArgs.length; i++) {
            const token = gitArgs[i];
            if (token === '--') {
                break;
            }
            if (!token.startsWith('-')) {
                subcommandIndex = i;
                break;
            }
            if (gitGlobalOptionsWithValue.has(token) && i + 1 < gitArgs.length) {
                i++;
            }
        }

        if (subcommandIndex >= 0) {
            const subcommand = normalizeToken(gitArgs[subcommandIndex]);
            const positionalArgs: string[] = [];
            for (let i = subcommandIndex + 1; i < gitArgs.length; i++) {
                const token = gitArgs[i];
                if (token === '--') {
                    positionalArgs.push(...gitArgs.slice(i + 1).filter(Boolean));
                    break;
                }
                if (token.startsWith('-')) {
                    const optionName = token.includes('=') ? token.slice(0, token.indexOf('=')) : token;
                    if (!token.includes('=') && gitSubcommandOptionsWithValue.has(optionName) && i + 1 < gitArgs.length) {
                        i++;
                    }
                    continue;
                }
                positionalArgs.push(token);
            }

            if (subcommand === 'clone' && positionalArgs.length >= 2) {
                writePaths.push(positionalArgs[positionalArgs.length - 1]);
            } else if (subcommand === 'init' && positionalArgs.length >= 1) {
                writePaths.push(positionalArgs[positionalArgs.length - 1]);
            }
        }
    } else if (['bun', 'npm', 'pnpm', 'pip', 'pip3', 'poetry', 'yarn'].includes(command)) {
        writePaths.push(...extractOptionValues(tokens, ['-C', '--prefix', '--cwd']));
    } else {
        const positionalArgs = tokens.slice(1)
            .filter((token) => !token.startsWith('-'))
            .map((token) => stripWrappingQuotes(token))
            .filter((token) => looksLikePathToken(token));
        writePaths.push(...positionalArgs);
        writePaths.push(
            ...extractOptionValues(tokens, ['--path', '--output', '--out', '--file', '--target', '--destination'])
                .map((token) => stripWrappingQuotes(token))
                .filter((token) => looksLikePathToken(token))
        );
    }

    return dedupe(
        writePaths
            .map((token) => stripWrappingQuotes(token))
            .filter((token) => isLikelyFilePathValue(token) && !isNullDevicePath(token))
    );
}

function extractSegmentPathTokens(command: string, tokens: string[], rawSegment: string, isMutation: boolean): string[] {
    const pathTokens: string[] = [];
    if (isMutation) {
        pathTokens.push(...extractMutationWritePathTokens(command, tokens, rawSegment));
    }

    const optionPathValues = extractPathOptions(tokens);
    pathTokens.push(...optionPathValues);

    const positionalArgs = tokens.slice(1).filter((token) => !token.startsWith('-'));
    let positionalPathCandidates = positionalArgs;

    if (['grep', 'rg', 'select-string'].includes(command)) {
        positionalPathCandidates = positionalArgs.slice(1);
    }

    for (const token of positionalPathCandidates) {
        const strippedToken = stripWrappingQuotes(token);
        if (looksLikePathToken(strippedToken) || isSensitiveTokenName(strippedToken)) {
            pathTokens.push(strippedToken);
        }
    }

    return dedupe(pathTokens);
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

function resolveMutationPaths(projectPath: string, writePathTokens: string[]): string[] {
    const resolvedPaths: string[] = [];
    for (const writePathToken of writePathTokens) {
        try {
            resolvedPaths.push(resolvePathCandidate(projectPath, writePathToken));
        } catch {
            // Ignore; unresolved paths are treated as disallowed by caller logic.
        }
    }
    return dedupe(resolvedPaths);
}

function findSensitivePaths(projectPath: string, pathTokens: string[]): string[] {
    const sensitivePaths: string[] = [];
    for (const pathToken of pathTokens) {
        const tokenIsSensitive = isSensitiveTokenName(pathToken);
        if (!tokenIsSensitive && !looksLikePathToken(pathToken)) {
            continue;
        }

        try {
            const resolvedPath = resolvePathCandidate(projectPath, pathToken);
            const normalizedPath = normalizePathForComparison(resolvedPath);
            const segments = normalizedPath.split('/').filter((segment) => segment.length > 0);
            const basename = segments.length > 0 ? segments[segments.length - 1] : '';

            if (
                basename === '.env' ||
                basename.startsWith('.env.') ||
                SENSITIVE_FILE_BASENAMES.has(basename) ||
                segments.some((segment) => SENSITIVE_PATH_SEGMENTS.has(segment)) ||
                tokenIsSensitive
            ) {
                sensitivePaths.push(normalizedPath);
            }
        } catch {
            if (tokenIsSensitive) {
                sensitivePaths.push(pathToken);
            }
        }
    }

    return dedupe(sensitivePaths);
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
        'clone',
        'commit',
        'fetch',
        'init',
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

function isFindDestructive(tokens: string[], rawSegment: string): boolean {
    if (normalizeToken(tokens[0] || '') !== 'find') {
        return false;
    }

    const normalizedTokens = tokens.map((token) => normalizeToken(stripWrappingQuotes(token)));
    const hasDeleteAction = normalizedTokens.some((token) => token === '-delete' || token.startsWith('-delete'));
    if (hasDeleteAction) {
        return true;
    }

    const hasExecAction = normalizedTokens.some((token) =>
        token === '-exec'
        || token.startsWith('-exec=')
        || token === '-execdir'
        || token.startsWith('-execdir=')
    );
    if (hasExecAction) {
        return true;
    }

    const hasPlaceholder = tokens.some((token) => stripWrappingQuotes(token) === '{}') || /\{\s*\}/.test(rawSegment);
    const hasExecTerminator = normalizedTokens.some((token) => token === ';' || token === '\\;' || token === '+')
        || /\{\s*\}\s*(?:\\;|;|\+)/.test(rawSegment);
    return hasPlaceholder && hasExecTerminator;
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

function analyzeSegment(
    rawSegment: string,
    projectPath: string,
    allowedMutationRoots: string[],
    externalAllowedMutationRoots: string[]
): ShellSegmentAnalysis {
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
    const findIsDestructive = isFindDestructive(tokens, rawSegment);
    const isWrapperCommand = WRAPPER_COMMANDS_REQUIRING_APPROVAL.has(command);
    const isMutation = MUTATION_COMMANDS.has(command)
        || findIsDestructive
        || isGitMutation(tokens)
        || isPackageManagerMutation(tokens)
        || isSedOrPerlInPlaceMutation(tokens)
        || hasOutputRedirection(rawSegment);
    const isDestructive = isDestructiveCommand(command, tokens) || findIsDestructive;
    const segmentPathTokens = extractSegmentPathTokens(command, tokens, rawSegment, isMutation);
    const sensitivePaths = findSensitivePaths(projectPath, segmentPathTokens);
    const writePathTokens = isMutation ? extractMutationWritePathTokens(command, tokens, rawSegment) : [];
    const disallowedMutationPaths = isMutation
        ? findDisallowedMutationPaths(projectPath, allowedMutationRoots, writePathTokens)
        : [];
    const resolvedMutationPaths = isMutation ? resolveMutationPaths(projectPath, writePathTokens) : [];
    const writesOnlyToExternalAllowedRoots = resolvedMutationPaths.length > 0
        && resolvedMutationPaths.every((resolvedPath) =>
            !isPathWithin(projectPath, resolvedPath)
            && (
            externalAllowedMutationRoots.some((allowedRoot) => isPathWithin(allowedRoot, resolvedPath))
            )
        );

    if (sensitivePaths.length > 0) {
        blocked = true;
        reasons.push(
            `Access to sensitive paths is blocked by shell sandbox policy. Sensitive path(s): ${sensitivePaths.join(', ')}.`
        );
    } else if (disallowedMutationPaths.length > 0) {
        blocked = true;
        const outsideRoots = ALLOWED_EXTERNAL_MUTATION_ROOTS.join(', ');
        reasons.push(
            `Mutating paths outside allowed roots is blocked. Disallowed path(s): ${disallowedMutationPaths.join(', ')}. ` +
            `Allowed roots: project root${outsideRoots ? `, ${outsideRoots}` : ''}.`
        );
    } else if (isMutation && !writesOnlyToExternalAllowedRoots) {
        reasons.push('Commands that may modify files or system state require approval.');
    }
    if (isWrapperCommand) {
        reasons.push('Wrapper commands that can execute nested subcommands require approval.');
    } else if (!SAFE_READ_COMMANDS.has(command) && !isNetwork && !isMutation) {
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

function analyzeGenericShellCommand(
    command: string,
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
    const resolvedExternalMutationRoots = ALLOWED_EXTERNAL_MUTATION_ROOTS.map((mutationRoot) =>
        resolvePathWithRealpath(mutationRoot)
    );
    const allowedMutationRoots = dedupe([
        resolvedProjectPath,
        ...resolvedExternalMutationRoots,
    ]);

    const analyzedSegments = segmentsToAnalyze.map((segment) =>
        analyzeSegment(segment, resolvedProjectPath, allowedMutationRoots, resolvedExternalMutationRoots)
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
        analysisEngine: 'generic',
    };
}

export function analyzeShellCommand(
    command: string,
    platform: NodeJS.Platform,
    projectPath: string,
    runInBackground: boolean
): ShellCommandAnalysis {
    if (platform === 'win32') {
        return analyzePowerShellCommand(command, projectPath, runInBackground);
    }
    return analyzeGenericShellCommand(command, projectPath, runInBackground);
}
