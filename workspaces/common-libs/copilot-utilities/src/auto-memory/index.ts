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

// Access via: @wso2/copilot-utilities/auto-memory

// Path utilities
export { getMemoryDir, getGlobalMemoryDir, isAutoMemoryEnabled, isInMemoryDir } from './memdir/paths';

// Type taxonomy
export type { MemoryType, MemoryTypeDefinition, MemoryTypeExample } from './memdir/memoryTypes';
export {
    MEMORY_TYPES,
    GLOBAL_MEMORY_TYPES,
    WORKSPACE_MEMORY_TYPES,
    isGlobalMemoryType,
    parseMemoryType,
} from './memdir/memoryTypes';
export { MEMORY_TYPE_DEFINITIONS } from './memdir/memoryTypeTaxonomy';

// Memory file scanning
export type { MemoryHeader } from './memdir/memoryScan';
export { scanMemoryFiles, formatMemoryManifest } from './memdir/memoryScan';

// System prompt builder
export type { EntrypointTruncation } from './memdir/memdir';
export {
    ENTRYPOINT_NAME,
    MAX_ENTRYPOINT_LINES,
    MAX_ENTRYPOINT_BYTES,
    truncateEntrypointContent,
    ensureMemoryDirsExist,
    buildMemoryLines,
    buildDreamSystemPrompt,
    buildSaveMemoryDescription,
    loadMemoryPrompt,
    invalidateMemoryPromptCache,
} from './memdir/memdir';

// Extraction prompt builder
export type { ExtractPromptParams } from './services/extractMemories/prompts';
export { buildExtractPrompt } from './services/extractMemories/prompts';

// Consolidation lock (dream gate)
export {
    getLockPath,
    readLastConsolidatedAt,
    tryAcquireLock,
    releaseLock,
    rollbackLock,
    countGenerationsSince,
} from './services/autoDream/consolidationLock';

// Consolidation prompt builder
export type { ConsolidationContext } from './services/autoDream/consolidationPrompt';
export { buildConsolidationPrompt } from './services/autoDream/consolidationPrompt';
