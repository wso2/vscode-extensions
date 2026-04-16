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

export interface ContextManagementConfig {
    /** Token threshold to trigger compact_20260112. Default: 150_000 (Anthropic API default). */
    compactTriggerTokens?: number;
    /** Token threshold to trigger clear_tool_uses_20250919. Default: 120_000. */
    clearToolUsesTriggerTokens?: number;
    /** Number of recent tool-use pairs to preserve when clearing. Default: 6. */
    keepRecentToolUses?: number;
    /** Custom instructions passed as `instructions` to the compact_20260112 edit. */
    compactionInstructions?: string;
    /**
     * Rough token estimate for the fixed overhead (system prompt + user message codebase).
     * If this value exceeds compactTriggerTokens, buildContextManagementOptions returns null
     * because compaction would fire on every turn with no benefit.
     */
    estimatedFloorTokens?: number;
}

export interface AppliedCompactionResult {
    /** Whether compact_20260112 fired during this step. */
    compacted: boolean;
    /** Number of tool uses cleared by clear_tool_uses_20250919. */
    clearedToolUses?: number;
    /** Total input tokens freed across all applied edits. */
    clearedInputTokens?: number;
}
