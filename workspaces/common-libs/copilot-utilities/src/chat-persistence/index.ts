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

// Types
export type {
    PersistedGeneration,
    PersistedThread,
    PersistedCheckpoint,
    PersistedReviewState,
    PersistedGenerationMetadata,
    PersistedCompactionMetadata,
    PersistedFileAttachment,
    PersistedPlan,
    PersistedTask,
    PersistedCodeContext,
    PersistedLinePosition,
    WorkspaceMetadata,
    ThreadSummary,
    PersistenceStoreConfig,
} from './types';

// Store
export { CopilotPersistenceStore } from './persistence-store';

// Utilities
export { computeWorkspaceHash } from './workspace-hash';

// Schema versions
export {
    CURRENT_THREAD_SCHEMA_VERSION,
    CURRENT_WORKSPACE_SCHEMA_VERSION,
    CURRENT_CHECKPOINT_SCHEMA_VERSION,
} from './schema-migration';
