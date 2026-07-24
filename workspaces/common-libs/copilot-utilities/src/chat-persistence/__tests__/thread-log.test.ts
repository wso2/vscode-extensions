/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { CopilotPersistenceStore } from '../persistence-store';
import { appendLineSync, readJsonlSync } from '../file-utils';
import { CURRENT_THREAD_SCHEMA_VERSION } from '../schema-migration';
import { PersistedGeneration, PersistedThread, ThreadLogRecord } from '../types';

// ============================================
// Test Helpers
// ============================================

let tmpDir: string;
let store: CopilotPersistenceStore;

const WORKSPACE_PATH = '/Users/test/projects/my-ballerina-project';

function createTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-threadlog-test-'));
}

function cleanupTmpDir(dir: string): void {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

let genCounter = 0;
function makeGeneration(overrides: Partial<PersistedGeneration> = {}): PersistedGeneration {
    genCounter++;
    return {
        id: `gen-${genCounter}`,
        userPrompt: 'Create a REST API',
        modelMessages: [
            { role: 'user', content: 'Create a REST API' },
            {
                role: 'assistant',
                content: [
                    { type: 'text', text: 'Working on it.' },
                    { type: 'tool-call', toolCallId: 'tc1', toolName: 'writeFile', args: { path: 'main.bal' } },
                ],
            },
        ],
        uiResponse: 'Done.',
        timestamp: 1000 + genCounter,
        currentTaskIndex: -1,
        reviewState: { status: 'accepted', modifiedFiles: ['main.bal'] },
        metadata: { isPlanMode: false, generationType: 'agent' },
        hasCheckpoint: false,
        ...overrides,
    };
}

function makeThread(overrides: Partial<PersistedThread> = {}): PersistedThread {
    return {
        schemaVersion: CURRENT_THREAD_SCHEMA_VERSION,
        id: 'default',
        name: 'Default Thread',
        createdAt: 1000,
        updatedAt: 1000,
        generations: [],
        ...overrides,
    };
}

function threadDir(threadId: string): string {
    return path.join(store.getWorkspaceDir(WORKSPACE_PATH), 'threads', threadId);
}

function logPath(threadId: string): string {
    return path.join(threadDir(threadId), 'thread.jsonl');
}

function legacyJsonPath(threadId: string): string {
    return path.join(threadDir(threadId), 'thread.json');
}

function countLines(threadId: string): number {
    const raw = fs.readFileSync(logPath(threadId), 'utf8');
    return raw.split('\n').filter(l => l.trim().length > 0).length;
}

// ============================================
// Tests
// ============================================

describe('Thread append-only log (JSONL)', () => {
    beforeEach(() => {
        tmpDir = createTmpDir();
        store = new CopilotPersistenceStore({ baseDir: tmpDir });
        genCounter = 0;
    });

    afterEach(() => {
        cleanupTmpDir(tmpDir);
    });

    // --- Append → replay round-trip ---

    describe('append and replay', () => {
        it('should reconstruct generations appended after a save-initialized thread', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());
            const g1 = makeGeneration({ id: 'g1', userPrompt: 'first' });
            const g2 = makeGeneration({ id: 'g2', userPrompt: 'second' });
            store.appendGeneration(WORKSPACE_PATH, 'default', g1);
            store.appendGeneration(WORKSPACE_PATH, 'default', g2);

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.equal(loaded.generations.length, 2);
            assert.deepEqual(loaded.generations.map(g => g.id), ['g1', 'g2']);
            assert.equal(loaded.generations[0].userPrompt, 'first');
            assert.deepEqual(loaded.generations[1].modelMessages, g2.modelMessages);
        });

        it('should treat the latest upsert for a generation id as authoritative (in place)', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g1', uiResponse: 'v1' }));
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g2', uiResponse: 'other' }));
            // Update g1 in place (simulates AgentExecutor persisting after each step).
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g1', uiResponse: 'v2-final' }));

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            // Order preserved (g1 keeps its original position), content is latest.
            assert.deepEqual(loaded.generations.map(g => g.id), ['g1', 'g2']);
            assert.equal(loaded.generations[0].uiResponse, 'v2-final');
        });

        it('should apply a tombstone (del) removing a generation', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g1' }));
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g2' }));
            store.removeGenerationRecord(WORKSPACE_PATH, 'default', 'g1');

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.deepEqual(loaded.generations.map(g => g.id), ['g2']);
        });

        it('should ignore a del for an unknown generation id', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g1' }));
            store.removeGenerationRecord(WORKSPACE_PATH, 'default', 'does-not-exist');

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.deepEqual(loaded.generations.map(g => g.id), ['g1']);
        });

        it('should truncate a generation and everything appended after it', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g1' }));
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g2' }));
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g3' }));
            // Restore-to-checkpoint at g2 drops g2 and g3.
            store.truncateFromGeneration(WORKSPACE_PATH, 'default', 'g2');

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.deepEqual(loaded.generations.map(g => g.id), ['g1']);
        });

        it('should ignore a trunc for an unknown generation id', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g1' }));
            store.truncateFromGeneration(WORKSPACE_PATH, 'default', 'unknown');

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.deepEqual(loaded.generations.map(g => g.id), ['g1']);
        });

        it('should re-add a generation after it was tombstoned (position resets to append order)', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g1' }));
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g2' }));
            store.removeGenerationRecord(WORKSPACE_PATH, 'default', 'g1');
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g1', uiResponse: 'again' }));

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.deepEqual(loaded.generations.map(g => g.id), ['g2', 'g1']);
            assert.equal(loaded.generations[1].uiResponse, 'again');
        });

        it('should apply thread metadata updates (name, sessionId)', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());
            store.updateThreadMeta(WORKSPACE_PATH, 'default', { name: 'Renamed', sessionId: 'sess-42' });

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.equal(loaded.name, 'Renamed');
            assert.equal(loaded.sessionId, 'sess-42');
        });

        it('should derive updatedAt from the latest record', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread({ updatedAt: 1000 }));
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g1' }), 5000);

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.equal(loaded.updatedAt, 5000);
        });

        it('should round-trip an empty thread (head + meta, no generations)', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread({ generations: [] }));
            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.deepEqual(loaded.generations, []);
            assert.equal(loaded.name, 'Default Thread');
        });

        function records(threadId: string): any[] {
            return fs.readFileSync(logPath(threadId), 'utf8')
                .split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
        }

        it('should write each model message exactly once across a multi-step turn (no O(S^2) duplication)', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread({ generations: [] }));

            // Simulate the agent hot path: same generation, unchanged header, the
            // modelMessages array grows by one message per step.
            const S = 30;
            const msgs: unknown[] = [];
            for (let step = 1; step <= S; step++) {
                msgs.push({ role: 'assistant', content: `step-${step}` });
                store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({
                    id: 'g1',
                    timestamp: 5,          // fixed so the header never changes
                    uiResponse: 'fixed',
                    modelMessages: [...msgs],
                }));
            }

            const recs = records('default');
            const msgRecords = recs.filter(r => r.t === 'msg').length;
            const genRecords = recs.filter(r => r.t === 'gen').length;
            // Each message persisted once (S), NOT 1+2+...+S. This is the fix.
            assert.equal(msgRecords, S, `expected ${S} msg records, got ${msgRecords}`);
            // The header is written once, since it never changed.
            assert.equal(genRecords, 1, `expected a single gen header, got ${genRecords}`);

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.equal(loaded.generations[0].modelMessages.length, S);
            assert.deepEqual(loaded.generations[0].modelMessages[S - 1], { role: 'assistant', content: `step-${S}` });
        });

        it('should append a gen header only when a non-message field changes', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread({ generations: [] }));
            const base = { id: 'g1', timestamp: 5, modelMessages: [{ role: 'user', content: 'x' }] };
            // Same header three times -> one header record.
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ ...base, uiResponse: 'a' }));
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ ...base, uiResponse: 'a' }));
            // uiResponse change -> a second header record.
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ ...base, uiResponse: 'b' }));

            const recs = records('default');
            assert.equal(recs.filter(r => r.t === 'gen').length, 2);
            assert.equal(recs.filter(r => r.t === 'msg').length, 1); // one message, written once
            assert.equal(store.loadThread(WORKSPACE_PATH, 'default')!.generations[0].uiResponse, 'b');
        });

        it('should emit a msgs reset when modelMessages are rewritten rather than extended', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread({ generations: [] }));
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({
                id: 'g1', timestamp: 5,
                modelMessages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }],
            }));
            // Same length but the last message changed (e.g. server-side rewrite).
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({
                id: 'g1', timestamp: 5,
                modelMessages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'REWRITTEN' }],
            }));

            const recs = records('default');
            assert.ok(recs.some(r => r.t === 'msgs'), 'expected a msgs reset record');

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.deepEqual(loaded.generations[0].modelMessages, [
                { role: 'user', content: 'a' }, { role: 'assistant', content: 'REWRITTEN' },
            ]);
        });
    });

    // --- Crash / corruption resilience ---

    describe('resilience', () => {
        it('should recover all complete records when the trailing line is torn', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g1' }));
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g2' }));
            // Simulate a crash mid-append: a partial JSON line with no newline.
            fs.appendFileSync(logPath('default'), '{"t":"gen","updatedAt":9999,"gen":{"id":"g3","userPr');

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.deepEqual(loaded.generations.map(g => g.id), ['g1', 'g2']);
        });

        it('should skip a corrupt line in the middle and keep the rest', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g1' }));
            appendLineSync(logPath('default'), 'this is not json at all');
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g2' }));

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.deepEqual(loaded.generations.map(g => g.id), ['g1', 'g2']);
        });

        it('should return null when the log exists but contains no recognizable records', () => {
            fs.mkdirSync(threadDir('garbage'), { recursive: true });
            fs.writeFileSync(logPath('garbage'), 'not json\n{also not\n');
            assert.equal(store.loadThread(WORKSPACE_PATH, 'garbage'), null);
        });

        it('should return null for an empty log file', () => {
            fs.mkdirSync(threadDir('empty-file'), { recursive: true });
            fs.writeFileSync(logPath('empty-file'), '');
            assert.equal(store.loadThread(WORKSPACE_PATH, 'empty-file'), null);
        });

        it('should reconstruct without data loss when the head record is missing', () => {
            // Simulate gen header + message records that reached disk before an
            // interrupted init wrote the thread `head` record.
            const { modelMessages: m1, ...h1 } = makeGeneration({ id: 'g1' });
            const { modelMessages: _m2, ...h2 } = makeGeneration({ id: 'g2' });
            fs.mkdirSync(threadDir('headless'), { recursive: true });
            appendLineSync(logPath('headless'), JSON.stringify({ t: 'gen', updatedAt: 2000, gen: h1 } as ThreadLogRecord));
            appendLineSync(logPath('headless'), JSON.stringify({ t: 'msg', updatedAt: 2000, genId: 'g1', message: m1[0] } as ThreadLogRecord));
            appendLineSync(logPath('headless'), JSON.stringify({ t: 'gen', updatedAt: 2500, gen: h2 } as ThreadLogRecord));

            const loaded = store.loadThread(WORKSPACE_PATH, 'headless');
            assert.ok(loaded);
            assert.deepEqual(loaded.generations.map(g => g.id), ['g1', 'g2']);
            assert.deepEqual(loaded.generations[0].modelMessages, [m1[0]]); // message reconstructed
            assert.deepEqual(loaded.generations[1].modelMessages, []);
            assert.equal(loaded.id, 'headless');
            assert.equal(loaded.createdAt, 2000); // earliest record timestamp
        });

        it('should return null for a non-existent thread (no log, no legacy json)', () => {
            assert.equal(store.loadThread(WORKSPACE_PATH, 'nope'), null);
        });
    });

    // --- Legacy migration ---

    describe('legacy thread.json migration', () => {
        it('should migrate a v1 thread.json to thread.jsonl and delete the legacy file', () => {
            // Hand-write a legacy v1 whole-file snapshot.
            const legacy = {
                schemaVersion: 1,
                id: 'default',
                name: 'Legacy Thread',
                createdAt: 111,
                updatedAt: 222,
                generations: [makeGeneration({ id: 'g1', userPrompt: 'legacy prompt' })],
            };
            fs.mkdirSync(threadDir('default'), { recursive: true });
            fs.writeFileSync(legacyJsonPath('default'), JSON.stringify(legacy), 'utf8');
            assert.equal(fs.existsSync(logPath('default')), false);

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.equal(loaded.name, 'Legacy Thread');
            assert.equal(loaded.schemaVersion, CURRENT_THREAD_SCHEMA_VERSION);
            assert.equal(loaded.generations[0].userPrompt, 'legacy prompt');

            // The log now exists and the legacy file is gone.
            assert.ok(fs.existsSync(logPath('default')));
            assert.equal(fs.existsSync(legacyJsonPath('default')), false);

            // Second load reads from the log and is identical.
            const reloaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.deepEqual(reloaded, loaded);
        });

        it('should prefer thread.jsonl and remove a stale thread.json if both exist', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread({ name: 'From Log' }));
            // A stale legacy file lingers (e.g. an interrupted prior migration).
            fs.writeFileSync(legacyJsonPath('default'), JSON.stringify({ schemaVersion: 1, id: 'default', name: 'Stale', createdAt: 1, updatedAt: 1, generations: [] }), 'utf8');

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.equal(loaded.name, 'From Log');
            assert.equal(fs.existsSync(legacyJsonPath('default')), false);
        });

        it('should fall back to a legacy thread.json when the jsonl is empty/unrecoverable', () => {
            // Defensive: an externally-truncated (0-byte) log must not shadow a
            // still-present legacy snapshot and report the thread as gone.
            fs.mkdirSync(threadDir('both'), { recursive: true });
            fs.writeFileSync(logPath('both'), '');
            const legacy = {
                schemaVersion: 1, id: 'both', name: 'Recovered', createdAt: 1, updatedAt: 2,
                generations: [makeGeneration({ id: 'g1' })],
            };
            fs.writeFileSync(legacyJsonPath('both'), JSON.stringify(legacy), 'utf8');

            const loaded = store.loadThread(WORKSPACE_PATH, 'both');
            assert.ok(loaded);
            assert.equal(loaded.name, 'Recovered');
            assert.deepEqual(loaded.generations.map(g => g.id), ['g1']);
            // Migration rewrote the log and removed the legacy file.
            assert.equal(fs.existsSync(legacyJsonPath('both')), false);
        });

        it('should return null for a corrupt legacy thread.json', () => {
            fs.mkdirSync(threadDir('corrupt'), { recursive: true });
            fs.writeFileSync(legacyJsonPath('corrupt'), '{ invalid json', 'utf8');
            assert.equal(store.loadThread(WORKSPACE_PATH, 'corrupt'), null);
        });

        it('should return null when a legacy thread.json has an unmigratable schema version', () => {
            // Parses as JSON but has no migration path (version 0 -> no 0->1
            // migration exists) so migrateThread throws and loadThread reports
            // the thread as unreadable rather than crashing.
            const unmigratable = { schemaVersion: 0, id: 'default', name: 'X', createdAt: 1, updatedAt: 1, generations: [] };
            fs.mkdirSync(threadDir('ancient'), { recursive: true });
            fs.writeFileSync(legacyJsonPath('ancient'), JSON.stringify(unmigratable), 'utf8');
            assert.equal(store.loadThread(WORKSPACE_PATH, 'ancient'), null);
        });
    });

    // --- Compaction ---

    describe('compaction', () => {
        it('compactThread should collapse superseded records while preserving the replayed thread', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());
            // Update the same generation several times (mid-stream persistence).
            // Kept under the on-load compaction threshold so loadThread does not
            // pre-compact and we can isolate compactThread's effect.
            for (let i = 0; i < 10; i++) {
                store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g1', uiResponse: `step-${i}` }));
            }
            const before = store.loadThread(WORKSPACE_PATH, 'default');
            const linesBefore = countLines('default');
            assert.ok(linesBefore > 3);

            store.compactThread(WORKSPACE_PATH, 'default');

            const after = store.loadThread(WORKSPACE_PATH, 'default');
            const linesAfter = countLines('default');

            // Replayed thread is unchanged by compaction.
            assert.deepEqual(after, before);
            // The log shrank to head + meta + 1 gen header + its messages.
            const msgCount = after!.generations[0].modelMessages.length;
            assert.equal(linesAfter, 3 + msgCount);
            assert.ok(linesBefore > linesAfter);
            assert.equal(after!.generations[0].uiResponse, 'step-9');
        });

        it('should preserve sessionId through a compacted save/replay', () => {
            // Exercises the compacted-record builder's sessionId branch.
            store.saveThread(WORKSPACE_PATH, 'default', makeThread({ sessionId: 'sess-xyz', generations: [makeGeneration({ id: 'g1' })] }));
            store.compactThread(WORKSPACE_PATH, 'default');

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.equal(loaded.sessionId, 'sess-xyz');
            assert.deepEqual(loaded.generations.map(g => g.id), ['g1']);
        });

        it('compactThread should be a no-op when the thread has no log', () => {
            // Should not throw and should not create a file.
            store.compactThread(WORKSPACE_PATH, 'ghost');
            assert.equal(fs.existsSync(logPath('ghost')), false);
        });

        it('should auto-compact once the size-aware append threshold is reached', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());
            // One live generation -> threshold is the floor (64). Append well past
            // it with in-place updates so compaction must fire without any explicit
            // compactThread call.
            for (let i = 0; i < 120; i++) {
                store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g1', uiResponse: `v${i}` }));
            }
            const lines = countLines('default');
            assert.ok(lines < 70, `expected auto-compaction to bound growth, got ${lines} lines`);

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.equal(loaded.generations.length, 1);
            assert.equal(loaded.generations[0].uiResponse, 'v119');
        });

        it('should scale the compaction threshold with live generation count', () => {
            // 30 live generations -> threshold = max(64, 3*30) = 90.
            const gens = Array.from({ length: 30 }, (_, i) => makeGeneration({ id: `g${i}` }));
            store.saveThread(WORKSPACE_PATH, 'big', makeThread({ id: 'big', generations: gens }));

            // 80 in-place updates of one generation stay UNDER the size-aware
            // threshold (90), so NO auto-compaction fires. A fixed 64-append
            // interval would have compacted here — this asserts the amortized,
            // size-proportional behaviour that keeps per-append cost ~O(1).
            for (let i = 0; i < 80; i++) {
                store.appendGeneration(WORKSPACE_PATH, 'big', makeGeneration({ id: 'g0', uiResponse: `v${i}` }));
            }
            const lines = countLines('big');
            assert.ok(lines > 100, `expected no compaction below the size-aware threshold, got ${lines} lines`);

            const loaded = store.loadThread(WORKSPACE_PATH, 'big');
            assert.ok(loaded);
            assert.equal(loaded.generations.length, 30);
        });

        it('should not fail load when on-load compaction cannot write (read-only dir)', () => {
            store.saveThread(WORKSPACE_PATH, 'ro', makeThread({ id: 'ro' }));
            for (let i = 0; i < 50; i++) {
                store.appendGeneration(WORKSPACE_PATH, 'ro', makeGeneration({ id: 'g1', uiResponse: `v${i}` }));
            }
            // 52 lines: past the on-load compaction trigger. Make the thread dir
            // read-only so the compaction's atomic write (a new tmp file) fails.
            const dir = threadDir('ro');
            fs.chmodSync(dir, 0o555);
            try {
                // Must NOT throw and must return the already-replayed thread even
                // though compaction could not persist. (If the test runs as root,
                // the write succeeds; either way load returns the thread.)
                const loaded = store.loadThread(WORKSPACE_PATH, 'ro');
                assert.ok(loaded, 'load must still return the replayed thread');
                assert.equal(loaded.generations[0].uiResponse, 'v49');
            } finally {
                fs.chmodSync(dir, 0o755);
            }
        });

        it('should compact on load when the log has grown well beyond its compact size', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());
            // Stay under the auto-compaction interval so the file stays large.
            for (let i = 0; i < 50; i++) {
                store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'g1', uiResponse: `v${i}` }));
            }
            assert.ok(countLines('default') > 40);

            // Loading triggers opportunistic compaction.
            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.equal(loaded.generations[0].uiResponse, 'v49');
            // head + meta + 1 gen header + its messages.
            assert.equal(countLines('default'), 3 + loaded.generations[0].modelMessages.length);
        });
    });

    // --- Isolation ---

    describe('log isolation', () => {
        it('should keep append logs separate across threads and workspaces', () => {
            const wsB = '/Users/test/other-project';
            store.saveThread(WORKSPACE_PATH, 'default', makeThread({ name: 'A' }));
            store.saveThread(wsB, 'default', makeThread({ name: 'B' }));
            store.appendGeneration(WORKSPACE_PATH, 'default', makeGeneration({ id: 'a1' }));
            store.appendGeneration(wsB, 'default', makeGeneration({ id: 'b1' }));

            const a = store.loadThread(WORKSPACE_PATH, 'default');
            const b = store.loadThread(wsB, 'default');
            assert.equal(a!.name, 'A');
            assert.equal(b!.name, 'B');
            assert.deepEqual(a!.generations.map(g => g.id), ['a1']);
            assert.deepEqual(b!.generations.map(g => g.id), ['b1']);
        });
    });
});

// ============================================
// File utilities (JSONL primitives)
// ============================================

describe('file-utils JSONL primitives', () => {
    beforeEach(() => { tmpDir = createTmpDir(); });
    afterEach(() => { cleanupTmpDir(tmpDir); });

    it('appendLineSync should create parent directories and append newline-terminated lines', () => {
        const p = path.join(tmpDir, 'nested', 'deep', 'log.jsonl');
        appendLineSync(p, JSON.stringify({ a: 1 }));
        appendLineSync(p, JSON.stringify({ a: 2 }));
        const raw = fs.readFileSync(p, 'utf8');
        assert.equal(raw, '{"a":1}\n{"a":2}\n');
    });

    it('readJsonlSync should return null for a missing file', () => {
        assert.equal(readJsonlSync(path.join(tmpDir, 'missing.jsonl')), null);
    });

    it('readJsonlSync should parse valid lines and skip blank/corrupt ones', () => {
        const p = path.join(tmpDir, 'mixed.jsonl');
        fs.writeFileSync(p, '{"a":1}\n\n  \nnot-json\n{"a":2}\n');
        const records = readJsonlSync<{ a: number }>(p);
        assert.deepEqual(records, [{ a: 1 }, { a: 2 }]);
    });

    it('readJsonlSync should return an empty array for an empty file', () => {
        const p = path.join(tmpDir, 'empty.jsonl');
        fs.writeFileSync(p, '');
        assert.deepEqual(readJsonlSync(p), []);
    });

    it('readJsonlSync should return null on an I/O error (path is a directory)', () => {
        const p = path.join(tmpDir, 'a-directory');
        fs.mkdirSync(p);
        // existsSync is true but readFileSync throws EISDIR -> outer catch.
        assert.equal(readJsonlSync(p), null);
    });
});
