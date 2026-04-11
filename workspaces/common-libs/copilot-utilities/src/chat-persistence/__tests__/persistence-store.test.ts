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
import { computeWorkspaceHash } from '../workspace-hash';
import { CURRENT_THREAD_SCHEMA_VERSION, CURRENT_CHECKPOINT_SCHEMA_VERSION } from '../schema-migration';
import { PersistedThread, PersistedCheckpoint, PersistedGeneration } from '../types';

// ============================================
// Test Helpers
// ============================================

let tmpDir: string;
let store: CopilotPersistenceStore;

function createTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'copilot-persistence-test-'));
}

function cleanupTmpDir(dir: string): void {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

function makeGeneration(overrides: Partial<PersistedGeneration> = {}): PersistedGeneration {
    return {
        id: `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        userPrompt: 'Create a REST API',
        modelMessages: [
            { role: 'user', content: 'Create a REST API' },
            {
                role: 'assistant',
                content: [
                    { type: 'text', text: 'I will create a REST API for you.' },
                    { type: 'tool-call', toolCallId: 'tc1', toolName: 'writeFile', args: { path: 'main.bal' } },
                ],
            },
            {
                role: 'tool',
                content: [
                    { type: 'tool-result', toolCallId: 'tc1', toolName: 'writeFile', result: 'File written.' },
                ],
            },
        ],
        uiResponse: '## Created REST API\n\nI created `main.bal` with an HTTP service.',
        timestamp: Date.now(),
        currentTaskIndex: -1,
        reviewState: {
            status: 'accepted',
            modifiedFiles: ['main.bal'],
        },
        metadata: {
            isPlanMode: false,
            operationType: 'CODE_FOR_USER_REQUIREMENT',
            generationType: 'agent',
        },
        hasCheckpoint: false,
        ...overrides,
    };
}

function makeThread(overrides: Partial<PersistedThread> = {}): PersistedThread {
    return {
        schemaVersion: CURRENT_THREAD_SCHEMA_VERSION,
        id: 'default',
        name: 'Default Thread',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        generations: [makeGeneration()],
        ...overrides,
    };
}

function makeCheckpoint(generationId: string): PersistedCheckpoint {
    return {
        schemaVersion: CURRENT_CHECKPOINT_SCHEMA_VERSION,
        id: `cp-${Date.now()}`,
        messageId: generationId,
        timestamp: Date.now(),
        fileList: ['main.bal', 'Ballerina.toml', 'modules/greet/greet.bal'],
        snapshotSize: 1234,
        workspaceSnapshot: {
            'main.bal': 'import ballerina/http;\n\nservice / on new http:Listener(8080) {\n    resource function get hello() returns string {\n        return "Hello, World!";\n    }\n}\n',
            'Ballerina.toml': '[package]\norg = "wso2"\nname = "myapp"\nversion = "0.1.0"\n',
            'modules/greet/greet.bal': 'public function greet(string name) returns string {\n    return "Hello, " + name + "!";\n}\n',
        },
    };
}

const WORKSPACE_PATH = '/Users/test/projects/my-ballerina-project';

// ============================================
// Tests
// ============================================

describe('CopilotPersistenceStore', () => {
    beforeEach(() => {
        tmpDir = createTmpDir();
        store = new CopilotPersistenceStore({ baseDir: tmpDir });
    });

    afterEach(() => {
        cleanupTmpDir(tmpDir);
    });

    // --- Workspace Operations ---

    describe('workspace operations', () => {
        it('should return null for non-existent workspace', () => {
            const meta = store.getWorkspaceMetadata(WORKSPACE_PATH);
            assert.equal(meta, null);
        });

        it('should save and load workspace metadata', () => {
            const now = Date.now();
            store.saveWorkspaceMetadata(WORKSPACE_PATH, {
                workspacePath: WORKSPACE_PATH,
                activeThreadId: 'default',
                createdAt: now,
                updatedAt: now,
            });

            const loaded = store.getWorkspaceMetadata(WORKSPACE_PATH);
            assert.ok(loaded);
            assert.equal(loaded.workspacePath, WORKSPACE_PATH);
            assert.equal(loaded.activeThreadId, 'default');
            assert.equal(loaded.createdAt, now);
        });

        it('should list workspaces', () => {
            const ws1 = '/Users/test/project-a';
            const ws2 = '/Users/test/project-b';
            const now = Date.now();

            store.saveWorkspaceMetadata(ws1, {
                workspacePath: ws1, activeThreadId: 'default', createdAt: now, updatedAt: now,
            });
            store.saveWorkspaceMetadata(ws2, {
                workspacePath: ws2, activeThreadId: 'default', createdAt: now, updatedAt: now,
            });

            const list = store.listWorkspaces();
            assert.equal(list.length, 2);
            const paths = list.map(w => w.workspacePath).sort();
            assert.deepEqual(paths, [ws1, ws2].sort());
        });

        it('should delete workspace and all contents', () => {
            store.saveWorkspaceMetadata(WORKSPACE_PATH, {
                workspacePath: WORKSPACE_PATH, activeThreadId: 'default',
                createdAt: Date.now(), updatedAt: Date.now(),
            });
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());

            assert.ok(store.getWorkspaceMetadata(WORKSPACE_PATH));
            store.deleteWorkspace(WORKSPACE_PATH);
            assert.equal(store.getWorkspaceMetadata(WORKSPACE_PATH), null);
            assert.equal(store.loadThread(WORKSPACE_PATH, 'default'), null);
        });

        it('should report workspace data existence', () => {
            assert.equal(store.hasWorkspaceData(WORKSPACE_PATH), false);
            store.saveWorkspaceMetadata(WORKSPACE_PATH, {
                workspacePath: WORKSPACE_PATH, activeThreadId: 'default',
                createdAt: Date.now(), updatedAt: Date.now(),
            });
            assert.equal(store.hasWorkspaceData(WORKSPACE_PATH), true);
        });
    });

    // --- Thread Operations ---

    describe('thread operations', () => {
        it('should return null for non-existent thread', () => {
            const thread = store.loadThread(WORKSPACE_PATH, 'non-existent');
            assert.equal(thread, null);
        });

        it('should save and load a thread', () => {
            const thread = makeThread();
            store.saveThread(WORKSPACE_PATH, 'default', thread);

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.equal(loaded.id, 'default');
            assert.equal(loaded.name, 'Default Thread');
            assert.equal(loaded.generations.length, 1);
            assert.equal(loaded.schemaVersion, CURRENT_THREAD_SCHEMA_VERSION);
        });

        it('should preserve modelMessages through save/load roundtrip', () => {
            const gen = makeGeneration();
            const thread = makeThread({ generations: [gen] });
            store.saveThread(WORKSPACE_PATH, 'default', thread);

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.deepEqual(loaded.generations[0].modelMessages, gen.modelMessages);
        });

        it('should list threads', () => {
            store.saveThread(WORKSPACE_PATH, 'thread-1', makeThread({ id: 'thread-1', name: 'Thread One' }));
            store.saveThread(WORKSPACE_PATH, 'thread-2', makeThread({ id: 'thread-2', name: 'Thread Two' }));
            store.saveThread(WORKSPACE_PATH, 'thread-3', makeThread({ id: 'thread-3', name: 'Thread Three' }));

            const summaries = store.listThreads(WORKSPACE_PATH);
            assert.equal(summaries.length, 3);
            const ids = summaries.map(s => s.id).sort();
            assert.deepEqual(ids, ['thread-1', 'thread-2', 'thread-3']);
        });

        it('should delete a thread', () => {
            store.saveThread(WORKSPACE_PATH, 'to-delete', makeThread({ id: 'to-delete' }));
            assert.ok(store.loadThread(WORKSPACE_PATH, 'to-delete'));

            store.deleteThread(WORKSPACE_PATH, 'to-delete');
            assert.equal(store.loadThread(WORKSPACE_PATH, 'to-delete'), null);
        });

        it('should save thread with multiple generations', () => {
            const gens = [
                makeGeneration({ id: 'gen-1', userPrompt: 'First prompt' }),
                makeGeneration({ id: 'gen-2', userPrompt: 'Second prompt' }),
                makeGeneration({ id: 'gen-3', userPrompt: 'Third prompt' }),
            ];
            const thread = makeThread({ generations: gens });
            store.saveThread(WORKSPACE_PATH, 'default', thread);

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.equal(loaded.generations.length, 3);
            assert.equal(loaded.generations[0].userPrompt, 'First prompt');
            assert.equal(loaded.generations[2].userPrompt, 'Third prompt');
        });

        it('should overwrite existing thread on save', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread({ name: 'Original' }));
            store.saveThread(WORKSPACE_PATH, 'default', makeThread({ name: 'Updated' }));

            const loaded = store.loadThread(WORKSPACE_PATH, 'default');
            assert.ok(loaded);
            assert.equal(loaded.name, 'Updated');
        });
    });

    // --- Checkpoint Operations ---

    describe('checkpoint operations', () => {
        it('should return null for non-existent checkpoint', () => {
            const cp = store.loadCheckpoint(WORKSPACE_PATH, 'default', 'non-existent');
            assert.equal(cp, null);
        });

        it('should save and load a checkpoint (sync)', () => {
            const genId = 'gen-123';
            const checkpoint = makeCheckpoint(genId);
            store.saveCheckpoint(WORKSPACE_PATH, 'default', genId, checkpoint);

            const loaded = store.loadCheckpoint(WORKSPACE_PATH, 'default', genId);
            assert.ok(loaded);
            assert.equal(loaded.messageId, genId);
            assert.deepEqual(loaded.fileList, checkpoint.fileList);
            assert.deepEqual(loaded.workspaceSnapshot, checkpoint.workspaceSnapshot);
        });

        it('should save and load a checkpoint (async)', async () => {
            const genId = 'gen-456';
            const checkpoint = makeCheckpoint(genId);
            await store.saveCheckpointAsync(WORKSPACE_PATH, 'default', genId, checkpoint);

            const loaded = store.loadCheckpoint(WORKSPACE_PATH, 'default', genId);
            assert.ok(loaded);
            assert.equal(loaded.messageId, genId);
            assert.deepEqual(loaded.workspaceSnapshot, checkpoint.workspaceSnapshot);
        });

        it('should compress checkpoint data (gzip)', () => {
            const genId = 'gen-compress';
            // Create a large snapshot with repetitive content (compresses well)
            const largeContent = 'import ballerina/http;\n'.repeat(10000);
            const checkpoint = makeCheckpoint(genId);
            checkpoint.workspaceSnapshot['large-file.bal'] = largeContent;
            checkpoint.snapshotSize = largeContent.length;

            store.saveCheckpoint(WORKSPACE_PATH, 'default', genId, checkpoint);

            // Verify file on disk is compressed (smaller than raw JSON)
            const wsDir = store.getWorkspaceDir(WORKSPACE_PATH);
            const snapshotPath = path.join(wsDir, 'threads', 'default', 'checkpoints', `${genId}.snapshot.gz`);
            assert.ok(fs.existsSync(snapshotPath));

            const fileSize = fs.statSync(snapshotPath).size;
            const rawJsonSize = JSON.stringify(checkpoint).length;
            assert.ok(fileSize < rawJsonSize, `Compressed (${fileSize}) should be smaller than raw (${rawJsonSize})`);

            // Verify data integrity after roundtrip
            const loaded = store.loadCheckpoint(WORKSPACE_PATH, 'default', genId);
            assert.ok(loaded);
            assert.equal(loaded.workspaceSnapshot['large-file.bal'], largeContent);
        });

        it('should delete a checkpoint', () => {
            const genId = 'gen-to-delete';
            store.saveCheckpoint(WORKSPACE_PATH, 'default', genId, makeCheckpoint(genId));
            assert.ok(store.loadCheckpoint(WORKSPACE_PATH, 'default', genId));

            store.deleteCheckpoint(WORKSPACE_PATH, 'default', genId);
            assert.equal(store.loadCheckpoint(WORKSPACE_PATH, 'default', genId), null);
        });

        it('should list checkpoints', () => {
            store.saveCheckpoint(WORKSPACE_PATH, 'default', 'gen-a', makeCheckpoint('gen-a'));
            store.saveCheckpoint(WORKSPACE_PATH, 'default', 'gen-b', makeCheckpoint('gen-b'));
            store.saveCheckpoint(WORKSPACE_PATH, 'default', 'gen-c', makeCheckpoint('gen-c'));

            const checkpoints = store.listCheckpoints(WORKSPACE_PATH, 'default');
            assert.equal(checkpoints.length, 3);
            assert.ok(checkpoints.includes('gen-a'));
            assert.ok(checkpoints.includes('gen-b'));
            assert.ok(checkpoints.includes('gen-c'));
        });

        it('should return empty list when no checkpoints exist', () => {
            const checkpoints = store.listCheckpoints(WORKSPACE_PATH, 'non-existent-thread');
            assert.deepEqual(checkpoints, []);
        });
    });

    // --- Workspace Hash ---

    describe('workspace hash', () => {
        it('should produce deterministic hash', () => {
            const hash1 = computeWorkspaceHash('/Users/test/project');
            const hash2 = computeWorkspaceHash('/Users/test/project');
            assert.equal(hash1, hash2);
        });

        it('should produce different hashes for different paths', () => {
            const hash1 = computeWorkspaceHash('/Users/test/project-a');
            const hash2 = computeWorkspaceHash('/Users/test/project-b');
            assert.notEqual(hash1, hash2);
        });

        it('should produce 16-character hex string', () => {
            const hash = computeWorkspaceHash('/Users/test/project');
            assert.equal(hash.length, 16);
            assert.match(hash, /^[0-9a-f]{16}$/);
        });

        it('should hash the input string verbatim (no path normalization)', () => {
            // computeWorkspaceHash no longer normalizes its input — callers are
            // responsible for producing a stable identity (the store uses
            // path.resolve by default via its workspaceIdResolver).
            const hash1 = computeWorkspaceHash('/Users/test/project');
            const hash2 = computeWorkspaceHash('/Users/test/project/');
            assert.notEqual(hash1, hash2);
        });

        it('should treat paths as equal when the store resolves them through its default resolver', () => {
            // The store's default resolver is path.resolve, which normalizes
            // trailing slashes — so both inputs should land in the same workspace dir.
            assert.equal(
                store.getWorkspaceDir('/Users/test/project'),
                store.getWorkspaceDir('/Users/test/project/')
            );
        });
    });

    // --- Workspace ID Resolver ---

    describe('workspaceIdResolver', () => {
        it('should override the default path-based identity when provided', () => {
            const customStore = new CopilotPersistenceStore({
                baseDir: tmpDir,
                workspaceIdResolver: () => 'fixed-identity',
            });
            // Two different paths resolve to the same fixed identity → same workspace dir.
            assert.equal(
                customStore.getWorkspaceDir('/path/a'),
                customStore.getWorkspaceDir('/path/b')
            );
        });

        it('should keep workspaces separate when the resolver returns distinct identities for the same path', () => {
            let identity = 'project-1';
            const customStore = new CopilotPersistenceStore({
                baseDir: tmpDir,
                workspaceIdResolver: () => identity,
            });
            const dir1 = customStore.getWorkspaceDir('/same/path');
            identity = 'project-2';
            const dir2 = customStore.getWorkspaceDir('/same/path');
            assert.notEqual(dir1, dir2);
        });
    });

    // --- Edge Cases ---

    describe('edge cases', () => {
        it('should return null for corrupt JSON thread file', () => {
            // Manually write corrupt JSON to the thread file location
            const threadDir = path.join(
                store.getWorkspaceDir(WORKSPACE_PATH), 'threads', 'corrupt'
            );
            fs.mkdirSync(threadDir, { recursive: true });
            fs.writeFileSync(path.join(threadDir, 'thread.json'), '{ invalid json !!!', 'utf8');

            const loaded = store.loadThread(WORKSPACE_PATH, 'corrupt');
            assert.equal(loaded, null);
        });

        it('should return null for corrupt gzip checkpoint file', () => {
            const checkpointsDir = path.join(
                store.getWorkspaceDir(WORKSPACE_PATH), 'threads', 'default', 'checkpoints'
            );
            fs.mkdirSync(checkpointsDir, { recursive: true });
            fs.writeFileSync(path.join(checkpointsDir, 'gen-corrupt.snapshot.gz'), 'not gzip data');

            const loaded = store.loadCheckpoint(WORKSPACE_PATH, 'default', 'gen-corrupt');
            assert.equal(loaded, null);
        });

        it('should handle empty generations array', () => {
            const thread = makeThread({ generations: [] });
            store.saveThread(WORKSPACE_PATH, 'empty', thread);

            const loaded = store.loadThread(WORKSPACE_PATH, 'empty');
            assert.ok(loaded);
            assert.deepEqual(loaded.generations, []);
        });

        it('should handle generation with compaction metadata', () => {
            const gen = makeGeneration({
                metadata: {
                    isPlanMode: false,
                    generationType: 'agent',
                    compactionMetadata: {
                        compactedAt: Date.now(),
                        originalMessageCount: 100,
                        originalTokenEstimate: 50000,
                        compactedTokenEstimate: 5000,
                        retries: 0,
                        mode: 'auto',
                        isCompactedGeneration: true,
                    },
                },
            });
            const thread = makeThread({ generations: [gen] });
            store.saveThread(WORKSPACE_PATH, 'compacted', thread);

            const loaded = store.loadThread(WORKSPACE_PATH, 'compacted');
            assert.ok(loaded);
            const meta = loaded.generations[0].metadata.compactionMetadata;
            assert.ok(meta);
            assert.equal(meta.isCompactedGeneration, true);
            assert.equal(meta.mode, 'auto');
        });

        it('should handle generation with file attachments and code context', () => {
            const gen = makeGeneration({
                fileAttachments: [
                    { fileName: 'config.toml', content: '[package]\norg = "wso2"' },
                ],
                codeContext: {
                    type: 'selection',
                    startPosition: { line: 10, offset: 0 },
                    endPosition: { line: 20, offset: 0 },
                    filePath: '/project/main.bal',
                },
            });
            const thread = makeThread({ generations: [gen] });
            store.saveThread(WORKSPACE_PATH, 'with-ctx', thread);

            const loaded = store.loadThread(WORKSPACE_PATH, 'with-ctx');
            assert.ok(loaded);
            assert.equal(loaded.generations[0].fileAttachments?.[0].fileName, 'config.toml');
            assert.deepEqual(loaded.generations[0].codeContext, gen.codeContext);
        });

        it('should handle delete of non-existent workspace gracefully', () => {
            // Should not throw
            store.deleteWorkspace('/non/existent/path');
        });

        it('should handle delete of non-existent thread gracefully', () => {
            // Should not throw
            store.deleteThread(WORKSPACE_PATH, 'non-existent');
        });

        it('should handle delete of non-existent checkpoint gracefully', () => {
            // Should not throw
            store.deleteCheckpoint(WORKSPACE_PATH, 'default', 'non-existent');
        });
    });

    // --- Atomic Write Safety ---

    describe('atomic write safety', () => {
        it('should not leave tmp files on successful write', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());

            const threadDir = path.join(
                store.getWorkspaceDir(WORKSPACE_PATH), 'threads', 'default'
            );
            const files = fs.readdirSync(threadDir);
            const tmpFiles = files.filter(f => f.includes('.tmp.'));
            assert.equal(tmpFiles.length, 0, `Found leftover tmp files: ${tmpFiles.join(', ')}`);
        });

        it('should produce valid JSON on disk', () => {
            store.saveThread(WORKSPACE_PATH, 'default', makeThread());

            const threadFile = path.join(
                store.getWorkspaceDir(WORKSPACE_PATH), 'threads', 'default', 'thread.json'
            );
            const raw = fs.readFileSync(threadFile, 'utf8');
            // Should not throw
            const parsed = JSON.parse(raw);
            assert.equal(parsed.id, 'default');
        });
    });

    // --- Isolation between workspaces ---

    describe('workspace isolation', () => {
        it('should keep threads separate between workspaces', () => {
            const ws1 = '/Users/test/workspace-1';
            const ws2 = '/Users/test/workspace-2';

            store.saveThread(ws1, 'default', makeThread({ name: 'WS1 Thread' }));
            store.saveThread(ws2, 'default', makeThread({ name: 'WS2 Thread' }));

            const loaded1 = store.loadThread(ws1, 'default');
            const loaded2 = store.loadThread(ws2, 'default');
            assert.ok(loaded1);
            assert.ok(loaded2);
            assert.equal(loaded1.name, 'WS1 Thread');
            assert.equal(loaded2.name, 'WS2 Thread');
        });

        it('should delete workspace without affecting others', () => {
            const ws1 = '/Users/test/workspace-1';
            const ws2 = '/Users/test/workspace-2';

            store.saveThread(ws1, 'default', makeThread());
            store.saveThread(ws2, 'default', makeThread());

            store.deleteWorkspace(ws1);
            assert.equal(store.loadThread(ws1, 'default'), null);
            assert.ok(store.loadThread(ws2, 'default'));
        });
    });
});
