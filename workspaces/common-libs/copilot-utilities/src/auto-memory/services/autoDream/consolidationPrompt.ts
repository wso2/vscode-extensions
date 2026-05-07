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

import { ENTRYPOINT_NAME, MAX_ENTRYPOINT_LINES } from '../../memdir/memdir';

export interface ConsolidationContext {
    newGenerationCount: number;
    lastWorkspaceDreamAt: number;
    lastGlobalDreamAt: number;
    /** Whether the global lock was acquired for this run. */
    hasGlobalLock: boolean;
}

/**
 * Builds the 4-phase dream consolidation prompt.
 * When hasGlobalLock is false, the agent is told to skip global directory changes.
 */
export function buildConsolidationPrompt(
    globalMemoryDir: string,
    workspaceMemoryDir: string,
    ctx: ConsolidationContext
): string {
    const lastWorkspace = ctx.lastWorkspaceDreamAt
        ? new Date(ctx.lastWorkspaceDreamAt).toISOString()
        : 'never';
    const lastGlobal = ctx.lastGlobalDreamAt
        ? new Date(ctx.lastGlobalDreamAt).toISOString()
        : 'never';

    const globalScope = ctx.hasGlobalLock
        ? `- Global memory: \`${globalMemoryDir}\`  (user, history types)`
        : `- Global memory: SKIPPED — lock held by another process`;

    const globalPhase1 = ctx.hasGlobalLock
        ? `- Read global \`${ENTRYPOINT_NAME}\` and skim global topic files`
        : `- Global directory is locked by another process — skip all global operations this run`;

    const globalPhase3 = ctx.hasGlobalLock
        ? [
            '- **Promote completed projects**: if a workspace `about` memory has a deadline that has',
            '  passed and the work appears done, extract the durable learnings (systems connected,',
            '  key codingstyles, lessons) into a new `history` memory in the **global** directory.',
          ].join('\n')
        : '- Global promotion skipped (lock unavailable)';

    const globalPhase4 = ctx.hasGlobalLock
        ? `- Update global \`${ENTRYPOINT_NAME}\` so it stays under ${MAX_ENTRYPOINT_LINES} lines AND under ~25KB.`
        : '';

    return [
        '# Dream: Memory Consolidation',
        '',
        'You are performing a dream — a reflective pass over your memory files. Synthesise',
        'what has accumulated into durable, well-organised memories so that future sessions',
        'can orient quickly.',
        '',
        'You are consolidating TWO memory directories:',
        globalScope,
        `- Workspace memory: \`${workspaceMemoryDir}\`  (codingstyle, integration, about, reference types)`,
        '',
        'Both directories already exist — write directly with the file write tools.',
        '',
        'ROUTING RULE: user/history types → global directory.',
        'codingstyle/integration/about/reference types → workspace directory.',
        '',
        '---',
        '',
        '## Phase 1 — Orient (both directories)',
        globalPhase1,
        `- Read workspace \`${ENTRYPOINT_NAME}\` and skim workspace topic files`,
        '- Understand what already exists before making changes',
        '',
        '## Phase 2 — Gather recent signal',
        'Sources in priority order:',
        '1. Existing memories that drifted — facts that contradict the current project state',
        '2. Gaps in memory coverage apparent from the accumulated memories themselves',
        '',
        '## Phase 3 — Consolidate',
        '- Merge new signal into existing topic files rather than creating near-duplicates',
        '- Convert relative dates ("yesterday", "last week") to absolute dates',
        '- Delete contradicted facts',
        globalPhase3,
        '',
        '## Phase 4 — Prune and index (both directories)',
        `- Update workspace \`${ENTRYPOINT_NAME}\` so it stays under ${MAX_ENTRYPOINT_LINES} lines AND under ~25KB.`,
        globalPhase4,
        '- Remove pointers to memories that are stale, wrong, or superseded',
        '- Demote verbose entries: if a line is over ~200 chars, move detail to the topic file',
        '- Resolve contradictions — if two files disagree, fix the wrong one',
        '',
        '---',
        '',
        'Return a brief summary of what you consolidated, promoted to history, or pruned.',
        'If nothing changed, say so.',
        '',
        '## Additional context',
        `New generations since last workspace consolidation: ${ctx.newGenerationCount} (since ${lastWorkspace})`,
        `Last global consolidation: ${lastGlobal}`,
    ].join('\n');
}
