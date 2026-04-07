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

/** Anthropic API default trigger for compact_20260112 (tokens). */
export const DEFAULT_COMPACT_TRIGGER = 160_000;

/** Trigger for clear_tool_uses_20250919 (tokens). Fires before compact to reduce overhead. */
export const DEFAULT_CLEAR_TOOL_USES_TRIGGER = 120_000;

/** Number of recent tool-use pairs to preserve when clearing. */
export const DEFAULT_KEEP_RECENT_TOOL_USES = 6;

/**
 * Default model configuration for Claude Sonnet 4.
 *
 * maxOutputTokens MUST match the value configured in AgentExecutor.ts
 * streamText call. If AgentExecutor changes maxOutputTokens, update this constant.
 *
 * Threshold calculation:
 *   effectiveWindow = maxContextWindow - maxOutputTokens = 500_000 - 8_192 = 491_808
 *   autoCompactThreshold = effectiveWindow - autoCompactBuffer = 491_808 - 13_000 = 478_808
 */
export const DEFAULT_MODEL_CONFIG = {
    maxContextWindow: 600_000,
    maxOutputTokens: 8_192,  // Matches AgentExecutor.ts streamText maxOutputTokens
    autoCompactBuffer: 13_000,
};
