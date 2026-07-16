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

/**
 * Repair passes that keep a model-message history provider-valid before it is sent to Anthropic.
 * `sanitizeMessages` is the single entry point; individual repairs compose under it, so new failure
 * modes can be handled by adding a pass rather than touching call sites.
 */

function isMalformedToolCallPart(part: any): boolean {
    return part?.type === 'tool-call' && typeof part.input === 'string';
}

function coerceInput(raw: string): Record<string, unknown> {
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
    } catch {
        // unparseable
    }
    return {};
}

/**
 * Coerce every malformed (string) tool-call input to an object, in place. Returns the number
 * repaired; clean histories are a no-op.
 *
 * When a streamed tool call's JSON is invalid — most often truncated at the output-token cap on a
 * large file write — the AI SDK cannot parse it and keeps the raw text as a string on the
 * `tool-call` part. Anthropic requires `tool_use.input` to be an object and rejects replay with
 * `tool_use.input: Input should be an object`, which bricks the thread on every later request.
 */
export function repairToolCallInputs(messages: any[]): number {
    let repaired = 0;
    for (const message of messages ?? []) {
        if (!Array.isArray(message?.content)) {
            continue;
        }
        for (const part of message.content) {
            if (isMalformedToolCallPart(part)) {
                part.input = coerceInput(part.input);
                repaired++;
            }
        }
    }
    if (repaired > 0) {
        console.warn(`[messageSanitization] Coerced ${repaired} malformed tool-call input(s) to objects.`);
    }
    return repaired;
}

/**
 * Run every repair pass over a message history, in place, so it stays provider-valid. Call before
 * sending history to the provider (prepareStep, history load). Add new passes here as needed.
 */
export function sanitizeMessages(messages: any[]): void {
    repairToolCallInputs(messages);
}
