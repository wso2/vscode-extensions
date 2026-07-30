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

import { PersistedThread, PersistedCheckpoint, WorkspaceMetadata } from './types';

// ============================================
// Current Schema Versions
// ============================================

export const CURRENT_THREAD_SCHEMA_VERSION = 2;
export const CURRENT_WORKSPACE_SCHEMA_VERSION = 1;
export const CURRENT_CHECKPOINT_SCHEMA_VERSION = 1;

// ============================================
// Migration Infrastructure
// ============================================

interface SchemaMigration<T> {
    fromVersion: number;
    toVersion: number;
    migrate(data: unknown): T;
}

/**
 * Apply a migration chain to bring data from its stored version to the current version.
 * Returns the migrated data, or throws if no migration path exists.
 */
function applyMigrations<T>(
    data: Record<string, unknown>,
    currentVersion: number,
    migrations: SchemaMigration<T>[],
    label: string
): T {
    let current = data;
    let version = (current.schemaVersion as number) ?? 0;

    while (version < currentVersion) {
        const migration = migrations.find(m => m.fromVersion === version);
        if (!migration) {
            throw new Error(
                `[ChatPersistence] No ${label} migration path from version ${version} to ${currentVersion}`
            );
        }
        current = migration.migrate(current) as Record<string, unknown>;
        version = migration.toVersion;
    }

    return current as T;
}

// ============================================
// Thread Migrations
// ============================================

// No live process resumes across a restart, so any non-terminal v1 status folds into 'accepted'.
const V1_TO_V2_STATUS: Record<string, string> = {
    pending: 'accepted',
    under_review: 'accepted',
    accepted: 'accepted',
    error: 'error',
};

function migrateThreadV1ToV2(data: Record<string, unknown>): Record<string, unknown> {
    // Fail closed on malformed data rather than coercing it: loadThread re-saves a successful
    // migration, so silently defaulting here would permanently erase generations or stamp
    // corrupt work as (unrevertible) 'accepted'. Throwing makes loadThread treat the thread as
    // corrupt and leave the on-disk file untouched.
    if (!Array.isArray(data.generations)) {
        throw new Error('Invalid persisted thread: generations is not an array');
    }
    return {
        ...data,
        schemaVersion: 2,
        generations: data.generations.map((gen) => {
            if (!gen || typeof gen !== 'object') {
                throw new Error('Invalid persisted generation entry');
            }
            const g = gen as Record<string, unknown>;
            const reviewState = (g.reviewState && typeof g.reviewState === 'object')
                ? g.reviewState as Record<string, unknown>
                : {};
            const oldStatus = reviewState.status;
            if (typeof oldStatus !== 'string' || !Object.prototype.hasOwnProperty.call(V1_TO_V2_STATUS, oldStatus)) {
                throw new Error(`Invalid persisted review status: ${String(oldStatus)}`);
            }
            return {
                ...g,
                reviewState: {
                    ...reviewState,
                    status: V1_TO_V2_STATUS[oldStatus],
                },
            };
        }),
    };
}

const threadMigrations: SchemaMigration<PersistedThread>[] = [
    { fromVersion: 1, toVersion: 2, migrate: (data) => migrateThreadV1ToV2(data as Record<string, unknown>) as unknown as PersistedThread },
];

/**
 * Migrate a raw thread object to the current schema version.
 * If already at current version, returns as-is.
 */
export function migrateThread(raw: Record<string, unknown>): PersistedThread {
    const version = (raw.schemaVersion as number) ?? 0;
    if (version === CURRENT_THREAD_SCHEMA_VERSION) {
        return raw as unknown as PersistedThread;
    }
    return applyMigrations<PersistedThread>(raw, CURRENT_THREAD_SCHEMA_VERSION, threadMigrations, 'thread');
}

// ============================================
// Workspace Metadata Migrations
// ============================================

const workspaceMigrations: SchemaMigration<WorkspaceMetadata>[] = [];

/**
 * Migrate a raw workspace metadata object to the current schema version.
 */
export function migrateWorkspaceMetadata(raw: Record<string, unknown>): WorkspaceMetadata {
    const version = (raw.schemaVersion as number) ?? 0;
    if (version === CURRENT_WORKSPACE_SCHEMA_VERSION) {
        return raw as unknown as WorkspaceMetadata;
    }
    return applyMigrations<WorkspaceMetadata>(
        raw, CURRENT_WORKSPACE_SCHEMA_VERSION, workspaceMigrations, 'workspace'
    );
}

// ============================================
// Checkpoint Migrations
// ============================================

const checkpointMigrations: SchemaMigration<PersistedCheckpoint>[] = [];

/**
 * Migrate a raw checkpoint object to the current schema version.
 */
export function migrateCheckpoint(raw: Record<string, unknown>): PersistedCheckpoint {
    const version = (raw.schemaVersion as number) ?? 0;
    if (version === CURRENT_CHECKPOINT_SCHEMA_VERSION) {
        return raw as unknown as PersistedCheckpoint;
    }
    return applyMigrations<PersistedCheckpoint>(
        raw, CURRENT_CHECKPOINT_SCHEMA_VERSION, checkpointMigrations, 'checkpoint'
    );
}
