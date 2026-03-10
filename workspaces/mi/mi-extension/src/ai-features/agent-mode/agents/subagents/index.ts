/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { logDebug } from '../../../copilot/logger';

// Explore Subagent
export { EXPLORE_SUBAGENT_SYSTEM } from './explore/system';
export { executeExploreSubagent } from './explore/agent';

// SynapseContext Subagent
export { SYNAPSE_CONTEXT_SUBAGENT_SYSTEM } from './synapse-context/system';
export { executeSynapseContextSubagent } from './synapse-context/agent';

/**
 * Extract response messages from Vercel AI SDK generateText result steps.
 * Safely handles missing or malformed step data with fallback to final text.
 */
export function extractStepMessages(
    steps: any[] | undefined,
    finalText: string,
    label: string
): any[] {
    if (!steps || steps.length === 0) {
        logDebug(`[${label}] No steps found, using final text as response`);
        return [{ role: 'assistant', content: finalText }];
    }

    const extracted: any[] = [];
    for (const step of steps) {
        const msgs = step?.response?.messages;
        if (Array.isArray(msgs)) {
            extracted.push(...msgs);
        }
    }

    if (extracted.length === 0) {
        logDebug(`[${label}] Steps found but no response messages extracted, using final text`);
        return [{ role: 'assistant', content: finalText }];
    }

    logDebug(`[${label}] Extracted ${extracted.length} messages from ${steps.length} steps`);
    return extracted;
}
