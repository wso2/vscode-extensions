// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import {
    truncateEntrypointContent,
    MAX_ENTRYPOINT_LINES,
    buildMemoryLines,
    buildDreamSystemPrompt,
} from '../memdir/memdir';
import { scanMemoryFiles, formatMemoryManifest, MemoryHeader } from '../memdir/memoryScan';
import { tryAcquireLock, rollbackLock, releaseLock, readLastConsolidatedAt, getLockPath, countGenerationsSince } from '../services/autoDream/consolidationLock';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'auto-memory-test-'));
}

function removeTempDir(dir: string): void {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ok */ }
}

function writeMemoryFile(dir: string, filename: string, type: string, description: string, body = 'content'): void {
    fs.writeFileSync(path.join(dir, filename), [
        '---',
        `name: ${filename}`,
        `description: ${description}`,
        `type: ${type}`,
        '---',
        '',
        body,
    ].join('\n'), 'utf-8');
}

function writeThreadJson(threadsDir: string, threadId: string, generations: Array<{ timestamp: number }>): void {
    const threadDir = path.join(threadsDir, threadId);
    fs.mkdirSync(threadDir, { recursive: true });
    const thread = { schemaVersion: 1, id: threadId, name: threadId, createdAt: 0, updatedAt: 0, generations };
    fs.writeFileSync(path.join(threadDir, 'thread.json'), JSON.stringify(thread), 'utf-8');
}

// ---------------------------------------------------------------------------
// truncateEntrypointContent
// ---------------------------------------------------------------------------

describe('truncateEntrypointContent', () => {
    it('returns content unchanged when within both limits', () => {
        const input = 'line1\nline2\nline3';
        const result = truncateEntrypointContent(input);
        assert.equal(result.content, input);
        assert.equal(result.wasLineTruncated, false);
        assert.equal(result.wasByteTruncated, false);
    });

    it('truncates to MAX_ENTRYPOINT_LINES and appends warning', () => {
        const lines = Array.from({ length: MAX_ENTRYPOINT_LINES + 10 }, (_, i) => `line${i}`);
        const input = lines.join('\n');
        const result = truncateEntrypointContent(input);
        assert.equal(result.wasLineTruncated, true);
        assert.ok(result.content.includes('WARNING'));
        // Filter empty lines and the WARNING line before counting
        const contentLines = result.content.split('\n').filter(l => l.length > 0 && !l.startsWith('>'));
        assert.ok(contentLines.length <= MAX_ENTRYPOINT_LINES);
    });

    it('truncates at last newline before byte cap, not mid-line', () => {
        // 60 lines of 500 chars each → 60 * 501 = 30,060 bytes > 25,000 limit
        // Line truncation does NOT fire (60 < 200 lines).
        const longLine = 'a'.repeat(500);
        const lines = Array.from({ length: 60 }, () => longLine);
        const input = lines.join('\n');
        const result = truncateEntrypointContent(input);
        assert.equal(result.wasByteTruncated, true);
        assert.ok(result.content.includes('WARNING'));
        // Every retained line of 'a's must be exactly 500 chars (no mid-line cut)
        const contentBeforeWarning = result.content.split('\n\n>')[0];
        const aLines = contentBeforeWarning.split('\n').filter(l => /^a+$/.test(l));
        assert.ok(aLines.length > 0, 'expected at least one retained line');
        for (const line of aLines) {
            assert.equal(line.length, 500, `line cut mid-char: length was ${line.length}`);
        }
    });

    it('trims leading/trailing whitespace before checking limits', () => {
        const input = '\n\nline1\nline2\n\n';
        const result = truncateEntrypointContent(input);
        assert.equal(result.content, 'line1\nline2');
        assert.equal(result.wasLineTruncated, false);
    });
});

// ---------------------------------------------------------------------------
// scanMemoryFiles + formatMemoryManifest
// ---------------------------------------------------------------------------

describe('scanMemoryFiles', () => {
    let tmpDir: string;

    beforeEach(() => { tmpDir = makeTempDir(); });
    afterEach(() => removeTempDir(tmpDir));

    it('returns empty array for empty directory', async () => {
        assert.deepEqual(await scanMemoryFiles(tmpDir), []);
    });

    it('returns empty array for non-existent directory', async () => {
        assert.deepEqual(await scanMemoryFiles(path.join(tmpDir, 'does-not-exist')), []);
    });

    it('excludes MEMORY.md and hidden files', async () => {
        fs.writeFileSync(path.join(tmpDir, 'MEMORY.md'), '# index', 'utf-8');
        fs.writeFileSync(path.join(tmpDir, '.consolidate-lock'), 'pid', 'utf-8');
        writeMemoryFile(tmpDir, 'user_expertise.md', 'user', 'WSO2 expert');
        const results = await scanMemoryFiles(tmpDir);
        assert.equal(results.length, 1);
        assert.equal(results[0].filename, 'user_expertise.md');
    });

    it('parses frontmatter type and description', async () => {
        writeMemoryFile(tmpDir, 'codingstyle_retry.md', 'codingstyle', 'retry 3× → dead-letter');
        const results = await scanMemoryFiles(tmpDir);
        assert.equal(results.length, 1);
        assert.equal(results[0].type, 'codingstyle');
        assert.equal(results[0].description, 'retry 3× → dead-letter');
    });

    it('returns null description for file without frontmatter', async () => {
        fs.writeFileSync(path.join(tmpDir, 'plain.md'), 'no frontmatter here', 'utf-8');
        const results = await scanMemoryFiles(tmpDir);
        assert.equal(results[0].description, null);
        assert.equal(results[0].type, undefined);
    });

    it('sorts newest-first by mtime', async () => {
        writeMemoryFile(tmpDir, 'old.md', 'user', 'old file');
        // Wait a tick so OS mtime differs, then write newer file
        const oldPath = path.join(tmpDir, 'old.md');
        const oldTime = (Date.now() - 2000) / 1000;
        fs.utimesSync(oldPath, oldTime, oldTime);
        writeMemoryFile(tmpDir, 'new.md', 'user', 'new file');
        const results = await scanMemoryFiles(tmpDir);
        assert.equal(results[0].filename, 'new.md');
        assert.equal(results[1].filename, 'old.md');
    });
});

describe('formatMemoryManifest', () => {
    it('shows both sections', () => {
        const globalFiles: MemoryHeader[] = [
            { filename: 'user_expertise.md', mtimeMs: 0, description: 'WSO2 expert', type: 'user' },
        ];
        const wsFiles: MemoryHeader[] = [
            { filename: 'integration_shopify.md', mtimeMs: 0, description: 'Shopify quirks', type: 'integration' },
        ];
        const manifest = formatMemoryManifest(globalFiles, wsFiles);
        assert.ok(manifest.includes('Global memory files'));
        assert.ok(manifest.includes('Workspace memory files'));
        assert.ok(manifest.includes('[user] user_expertise.md'));
        assert.ok(manifest.includes('[integration] integration_shopify.md'));
    });

    it('shows "(no memories yet)" for empty lists', () => {
        const manifest = formatMemoryManifest([], []);
        assert.equal(manifest.match(/\(no memories yet\)/g)?.length, 2);
    });

    it('omits type tag when type is undefined', () => {
        const files: MemoryHeader[] = [
            { filename: 'misc.md', mtimeMs: 0, description: 'misc', type: undefined },
        ];
        const manifest = formatMemoryManifest(files, []);
        assert.ok(!manifest.includes('[undefined]'));
        assert.ok(manifest.includes('misc.md: misc'));
    });
});

// ---------------------------------------------------------------------------
// prompt builders
// ---------------------------------------------------------------------------

describe('memory prompt builders', () => {
    it('instructs the main agent to use save_memory and delete_memory tools', () => {
        const prompt = buildMemoryLines('/tmp/global-memory', '/tmp/workspace-memory').join('\n');

        assert.ok(prompt.includes('save_memory'));
        assert.ok(prompt.includes('delete_memory'));
        assert.ok(prompt.includes('ROUTING RULE'));
        assert.ok(prompt.includes('/tmp/global-memory'));
        assert.ok(prompt.includes('/tmp/workspace-memory'));
    });

    it('omits main-agent memory tools from the dream system prompt', () => {
        const prompt = buildDreamSystemPrompt('/tmp/global-memory', '/tmp/workspace-memory');

        assert.ok(prompt.includes('consolidation agent'));
        assert.ok(prompt.includes('file I/O tools'));
        assert.ok(prompt.includes('/tmp/global-memory'));
        assert.ok(prompt.includes('/tmp/workspace-memory'));
        assert.ok(!prompt.includes('save_memory'));
        assert.ok(!prompt.includes('delete_memory'));
    });
});

// ---------------------------------------------------------------------------
// consolidationLock: tryAcquireLock / rollbackLock / readLastConsolidatedAt
// ---------------------------------------------------------------------------

describe('tryAcquireLock', () => {
    let tmpDir: string;
    let lockPath: string;

    beforeEach(() => {
        tmpDir = makeTempDir();
        lockPath = getLockPath(tmpDir);
    });
    afterEach(() => removeTempDir(tmpDir));

    it('acquires lock when no lock file exists, returns 0 as priorMtime', () => {
        const result = tryAcquireLock(lockPath);
        assert.equal(result, 0);
        assert.ok(fs.existsSync(lockPath));
        const body = fs.readFileSync(lockPath, 'utf-8').trim();
        assert.equal(body, String(process.pid));
    });

    it('returns null when lock is held by a live process with recent mtime', () => {
        // Write a lock file with our own PID and current time
        fs.writeFileSync(lockPath, String(process.pid), 'utf-8');
        // mtime is now (within stale window)
        const result = tryAcquireLock(lockPath);
        assert.equal(result, null);
    });

    it('reclaims stale lock (mtime > 60 min ago)', () => {
        fs.writeFileSync(lockPath, '99999', 'utf-8'); // non-existent PID
        // Wind back mtime to 2 hours ago
        const oldTime = (Date.now() - 2 * 60 * 60 * 1000) / 1000;
        fs.utimesSync(lockPath, oldTime, oldTime);
        const result = tryAcquireLock(lockPath);
        assert.ok(result !== null);
        assert.ok(result > 0); // priorMtime returned
    });
});

describe('rollbackLock', () => {
    let tmpDir: string;
    let lockPath: string;

    beforeEach(() => {
        tmpDir = makeTempDir();
        lockPath = getLockPath(tmpDir);
    });
    afterEach(() => removeTempDir(tmpDir));

    it('removes the lock file when priorMtime is 0', () => {
        fs.writeFileSync(lockPath, String(process.pid), 'utf-8');
        rollbackLock(lockPath, 0);
        assert.ok(!fs.existsSync(lockPath));
    });

    it('restores prior mtime when priorMtime > 0', () => {
        const priorMs = Date.now() - 5 * 60 * 60 * 1000; // 5 hours ago
        fs.writeFileSync(lockPath, String(process.pid), 'utf-8');
        rollbackLock(lockPath, priorMs);
        assert.ok(fs.existsSync(lockPath));
        const restoredMtime = fs.statSync(lockPath).mtimeMs;
        // Allow 2-second tolerance for filesystem precision
        assert.ok(Math.abs(restoredMtime - priorMs) < 2_000);
    });
});

describe('releaseLock', () => {
    let tmpDir: string;
    let lockPath: string;

    beforeEach(() => {
        tmpDir = makeTempDir();
        lockPath = getLockPath(tmpDir);
    });
    afterEach(() => removeTempDir(tmpDir));

    it('clears the PID body while keeping the lock file', () => {
        fs.writeFileSync(lockPath, String(process.pid), 'utf-8');
        releaseLock(lockPath);
        assert.ok(fs.existsSync(lockPath), 'lock file should still exist');
        const body = fs.readFileSync(lockPath, 'utf-8');
        assert.equal(body, '', 'PID body should be empty after release');
    });

    it('advances mtime so readLastConsolidatedAt reflects completion time', () => {
        const beforeMs = Date.now();
        // Create lock with an old mtime
        fs.writeFileSync(lockPath, String(process.pid), 'utf-8');
        const oldTime = (beforeMs - 60_000) / 1000;
        fs.utimesSync(lockPath, oldTime, oldTime);
        releaseLock(lockPath);
        const mtime = readLastConsolidatedAt(lockPath);
        assert.ok(mtime >= beforeMs - 1_000, `mtime should be recent, got ${mtime}`);
    });

    it('allows tryAcquireLock to re-acquire after release (empty body = no live holder)', () => {
        fs.writeFileSync(lockPath, String(process.pid), 'utf-8');
        releaseLock(lockPath);
        // After release, body is empty — isProcessRunning('') is false, so lock is reclaimable
        const result = tryAcquireLock(lockPath);
        assert.ok(result !== null, 'should be able to re-acquire after release');
    });
});

describe('readLastConsolidatedAt', () => {
    let tmpDir: string;

    beforeEach(() => { tmpDir = makeTempDir(); });
    afterEach(() => removeTempDir(tmpDir));

    it('returns 0 when lock file does not exist', () => {
        const lockPath = getLockPath(tmpDir);
        assert.equal(readLastConsolidatedAt(lockPath), 0);
    });

    it('returns the mtime of the existing lock file', () => {
        const lockPath = getLockPath(tmpDir);
        fs.writeFileSync(lockPath, 'pid', 'utf-8');
        const mtime = readLastConsolidatedAt(lockPath);
        assert.ok(mtime > 0);
        assert.ok(mtime <= Date.now());
    });
});

// ---------------------------------------------------------------------------
// countGenerationsSince
// ---------------------------------------------------------------------------

describe('countGenerationsSince', () => {
    let tmpDir: string;
    let workspacesDir: string;
    const HASH = 'abc1234567890def';

    beforeEach(() => {
        tmpDir = makeTempDir();
        workspacesDir = path.join(tmpDir, 'workspaces');
        fs.mkdirSync(workspacesDir, { recursive: true });
    });
    afterEach(() => removeTempDir(tmpDir));

    it('returns 0 when workspaces directory does not exist', async () => {
        const count = await countGenerationsSince(path.join(tmpDir, 'no-such-dir'), HASH, 0);
        assert.equal(count, 0);
    });

    it('returns 0 when workspace hash directory has no threads', async () => {
        const count = await countGenerationsSince(workspacesDir, HASH, 0);
        assert.equal(count, 0);
    });

    it('counts generations with timestamp after sinceMs', async () => {
        const threadsDir = path.join(workspacesDir, HASH, 'threads');
        const now = Date.now();
        // Thread with 3 generations: 2 after cutoff, 1 before
        writeThreadJson(threadsDir, 'thread1', [
            { timestamp: now - 10_000 }, // before cutoff
            { timestamp: now + 1_000 },  // after cutoff
            { timestamp: now + 2_000 },  // after cutoff
        ]);
        const count = await countGenerationsSince(workspacesDir, HASH, now - 5_000);
        assert.equal(count, 2);
    });

    it('aggregates across multiple threads', async () => {
        const threadsDir = path.join(workspacesDir, HASH, 'threads');
        const now = Date.now();
        writeThreadJson(threadsDir, 'thread1', [{ timestamp: now + 1_000 }, { timestamp: now + 2_000 }]);
        writeThreadJson(threadsDir, 'thread2', [{ timestamp: now + 3_000 }]);
        const count = await countGenerationsSince(workspacesDir, HASH, now);
        assert.equal(count, 3);
    });

    it('skips corrupt thread.json files gracefully', async () => {
        const threadsDir = path.join(workspacesDir, HASH, 'threads');
        const corruptDir = path.join(threadsDir, 'corrupt');
        fs.mkdirSync(corruptDir, { recursive: true });
        fs.writeFileSync(path.join(corruptDir, 'thread.json'), 'not valid json', 'utf-8');
        // Should not throw
        const count = await countGenerationsSince(workspacesDir, HASH, 0);
        assert.equal(count, 0);
    });
});
