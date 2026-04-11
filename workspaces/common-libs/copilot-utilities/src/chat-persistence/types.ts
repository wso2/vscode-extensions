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

// ============================================
// Persisted Review State
// ============================================

export interface PersistedReviewState {
    status: 'pending' | 'under_review' | 'accepted' | 'error';
    modifiedFiles: string[];
    errorMessage?: string;
    // NOTE: tempProjectPath and affectedPackagePaths are runtime-only — not persisted
}

// ============================================
// Persisted Line Position
// ============================================

export interface PersistedLinePosition {
    line: number;
    offset: number;
}

// ============================================
// Persisted Code Context
// ============================================

export type PersistedCodeContext =
    | { type: 'addition'; position: PersistedLinePosition; filePath: string }
    | { type: 'selection'; startPosition: PersistedLinePosition; endPosition: PersistedLinePosition; filePath: string };

// ============================================
// Persisted Plan / Task
// ============================================

export interface PersistedTask {
    description: string;
    status: string;
    type: string;
}

export interface PersistedPlan {
    id: string;
    tasks: PersistedTask[];
    createdAt: number;
    updatedAt: number;
}

// ============================================
// Persisted Compaction Metadata
// ============================================

export interface PersistedCompactionMetadata {
    compactedAt: number;
    originalMessageCount: number;
    originalTokenEstimate: number;
    compactedTokenEstimate: number;
    retries: number;
    mode: string;
    userInstructions?: string;
    backupPath?: string;
    compactedGenerationIds?: string[];
    isCompactedGeneration?: boolean;
}

// ============================================
// Persisted Generation Metadata
// ============================================

export interface PersistedGenerationMetadata {
    isPlanMode: boolean;
    operationType?: string;
    generationType?: string;
    commandType?: string;
    compactionMetadata?: PersistedCompactionMetadata;
}

// ============================================
// Persisted File Attachment
// ============================================

export interface PersistedFileAttachment {
    fileName: string;
    content: string;
}

// ============================================
// Persisted Generation
// ============================================

/**
 * Serializable generation — mirrors the domain `Generation` type but strips
 * runtime-only fields and replaces the inline checkpoint blob with a boolean flag.
 *
 * `modelMessages` stores Vercel AI SDK `ModelMessage[]` as plain JSON.
 * This is safe because the codebase never uses non-JSON-serializable content
 * types (Uint8Array, Buffer, URL) in message content.
 */
export interface PersistedGeneration {
    id: string;
    userPrompt: string;
    modelMessages: unknown[];
    uiResponse: string;
    timestamp: number;
    currentTaskIndex: number;
    reviewState: PersistedReviewState;
    metadata: PersistedGenerationMetadata;
    hasCheckpoint: boolean;
    plan?: PersistedPlan;
    fileAttachments?: PersistedFileAttachment[];
    codeContext?: PersistedCodeContext;
}

// ============================================
// Persisted Thread
// ============================================

export interface PersistedThread {
    schemaVersion: number;
    id: string;
    name: string;
    sessionId?: string;
    createdAt: number;
    updatedAt: number;
    generations: PersistedGeneration[];
}

// ============================================
// Persisted Checkpoint
// ============================================

/**
 * Checkpoint snapshot stored in a separate gzipped file.
 * Contains full workspace file contents at a point in time.
 */
export interface PersistedCheckpoint {
    schemaVersion: number;
    id: string;
    messageId: string;
    timestamp: number;
    fileList: string[];
    snapshotSize: number;
    workspaceSnapshot: Record<string, string>;
}

// ============================================
// Workspace Metadata
// ============================================

export interface WorkspaceMetadata {
    schemaVersion: number;
    workspacePath: string;
    activeThreadId: string;
    createdAt: number;
    updatedAt: number;
}

// ============================================
// Thread Summary (lightweight, for listing)
// ============================================

export interface ThreadSummary {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    generationCount: number;
}

// ============================================
// Store Configuration
// ============================================

export interface PersistenceStoreConfig {
    /** Base directory for persistence storage. Defaults to ~/.ballerina/copilot */
    baseDir?: string;
    /**
     * Resolve a stable, unique identity for a workspace. Defaults to
     * `path.resolve(workspacePath)`. Callers running in environments where
     * multiple workspaces share the same filesystem path (cloud editors)
     * should return an external project id instead.
     *
     * The returned string is hashed to derive the on-disk workspace directory.
     */
    workspaceIdResolver?: (workspacePath: string) => string;
}
