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

/**
 * Memory type taxonomy for WSO2 Integrator Copilot.
 *
 * To add, remove, or edit a memory type — edit MEMORY_TYPE_DEFINITIONS
 * in memoryTypeTaxonomy.ts. MEMORY_TYPES, GLOBAL_MEMORY_TYPES,
 * WORKSPACE_MEMORY_TYPES, and TYPES_SECTION are all derived from it.
 */

import { MEMORY_TYPE_DEFINITIONS } from './memoryTypeTaxonomy';
export type { MemoryTypeDefinition, MemoryTypeExample } from './memoryTypeTaxonomy';

// ---------------------------------------------------------------------------
// Type constants derived from taxonomy data
// ---------------------------------------------------------------------------

/**
 * Source of truth for the memory type names.
 * Adding/removing a type requires editing both this union AND the matching
 * entry in MEMORY_TYPE_DEFINITIONS — TypeScript will fail compilation if
 * MEMORY_TYPE_DEFINITIONS contains a name not present in this union.
 */
export type MemoryType = 'user' | 'codingstyle' | 'integration' | 'about' | 'reference' | 'history';

export const MEMORY_TYPES: readonly MemoryType[] = MEMORY_TYPE_DEFINITIONS.map(d => d.name);

/** Types that always belong in the global memory directory. */
export const GLOBAL_MEMORY_TYPES: readonly MemoryType[] = MEMORY_TYPE_DEFINITIONS
    .filter(d => d.scope === 'global')
    .map(d => d.name) as MemoryType[];

/** Types that always belong in the workspace memory directory. */
export const WORKSPACE_MEMORY_TYPES: readonly MemoryType[] = MEMORY_TYPE_DEFINITIONS
    .filter(d => d.scope === 'workspace')
    .map(d => d.name) as MemoryType[];

export function isGlobalMemoryType(type: MemoryType): boolean {
    return (GLOBAL_MEMORY_TYPES as readonly string[]).includes(type);
}

export function parseMemoryType(raw: unknown): MemoryType | undefined {
    if (typeof raw !== 'string') { return undefined; }
    return MEMORY_TYPES.find(t => t === raw);
}

// ---------------------------------------------------------------------------
// Prompt text constants injected into system prompt and extraction prompts
// ---------------------------------------------------------------------------

export const MEMORY_DRIFT_CAVEAT =
    '- Memory records can become stale over time. Before answering based solely on a memory, ' +
    'verify it is still correct by reading the current project files. ' +
    'If a recalled memory conflicts with current state, trust what you observe now — ' +
    'and update or remove the stale memory.';

export const WHEN_TO_ACCESS_SECTION: readonly string[] = [
    '## When to access memories',
    '- When memories seem relevant, or the user references prior-conversation work.',
    '- You MUST access memory when the user explicitly asks you to check, recall, or remember.',
    '- If the user says to *ignore* memory: proceed as if both MEMORY.md files were empty.',
    MEMORY_DRIFT_CAVEAT,
];

export const TRUSTING_RECALL_SECTION: readonly string[] = [
    '## Before recommending from memory',
    '',
    'A memory that names a specific API endpoint, connector config, or file path is a claim ' +
    'that it existed *when the memory was written*. It may have changed.',
    '',
    '- If the memory names a file path: check the file exists.',
    '- If the memory names an API endpoint or connector config: verify it is still current.',
    '"The memory says X exists" is not the same as "X exists now."',
];

export const MEMORY_FRONTMATTER_EXAMPLE: readonly string[] = [
    '```markdown',
    '---',
    'name: {{memory name}}',
    'description: {{one-line description — used to decide relevance, so be specific}}',
    `type: {{${MEMORY_TYPES.join(', ')}}}`,
    '---',
    '',
    '{{memory content — for codingstyle/about/history types include **Why:** and **How to apply:** lines}}',
    '```',
];

// ---------------------------------------------------------------------------
// TYPES_SECTION — built from MEMORY_TYPE_DEFINITIONS
// ---------------------------------------------------------------------------

function buildTypesSection(): readonly string[] {
    const globalNames = GLOBAL_MEMORY_TYPES.join(', ');
    const workspaceNames = WORKSPACE_MEMORY_TYPES.join(', ');

    const lines: string[] = [
        '## Types of memory',
        '',
        `There are ${MEMORY_TYPE_DEFINITIONS.length} types of memory across two scopes — ` +
        `global (${globalNames}) and workspace (${workspaceNames}):`,
        '',
        '<types>',
    ];

    for (const def of MEMORY_TYPE_DEFINITIONS) {
        const scopeNote = `SCOPE: ${def.scope} — write to the ${def.scope} memory directory.`;

        lines.push('<type>');
        lines.push(`    <name>${def.name}</name>`);
        lines.push(`    <description>${def.description} ${scopeNote}</description>`);
        lines.push(`    <when_to_save>${def.when_to_save}</when_to_save>`);
        lines.push(`    <how_to_use>${def.how_to_use}</how_to_use>`);

        if (def.body_structure) {
            lines.push(`    <body_structure>${def.body_structure}</body_structure>`);
        }

        lines.push('    <examples>');
        for (let i = 0; i < def.examples.length; i++) {
            const ex = def.examples[i];
            lines.push(`    user: ${ex.user}`);
            lines.push(`    assistant: ${ex.assistant}`);
            if (i < def.examples.length - 1) { lines.push(''); }
        }
        lines.push('    </examples>');
        lines.push('</type>');
    }

    lines.push('</types>');
    lines.push('');

    return lines;
}

export const TYPES_SECTION: readonly string[] = buildTypesSection();

export const WHAT_NOT_TO_SAVE_SECTION: readonly string[] = [
    '## What NOT to save in memory',
    '',
    '### Ballerina-native language mechanics — visible in source, the compiler enforces them',
    '',
    'Ballerina handles these declaratively. Saving them as memory is duplicate state. ' +
    'Save the team\'s TOPOLOGY DECISION around them — never the language feature itself.',
    '',
    '- Retry / exponential backoff — `retry(N) { }` keyword and `http:Client retryConfig` field.',
    '- Circuit breaker — `http:Client circuitBreaker` config (failureThreshold, resetTime).',
    '- HTTP timeouts — `http:Client timeout` (default ~60s, configurable per client).',
    '- Failover / load balance — `http:FailoverClient`, `http:LoadBalanceClient`.',
    '- OAuth2 token refresh — automatic with `http:OAuth2*GrantConfig` (no manual refresh logic).',
    '- Local + 2PC distributed transactions — `transaction { }`, `retry transaction { }`, `transactional` qualifier.',
    '- Error propagation — `check`, `on fail`, `error?` enforced at compile time (no try/catch).',
    '- Connector existence — `import ballerinax/salesforce` is visible in source. Save QUIRKS the compiler can\'t see, not which connector is in use.',
    '- Service-to-service call topology — auto-rendered in the BI sequence diagram view. Save WHY a dependency exists or non-obvious dataflow, not that it exists.',
    '- Standard project layout — `modules/`, `tests/`, `resources/` are enforced. Save only CUSTOM directories beyond this.',
    '- `configurable` + `Config.toml` — language-standard config loading. Save only the project\'s SPECIFIC config-layout decisions, not that secrets live in Config.toml.',
    '- Standard auth grant flows (OAuth2 client credentials, password, refresh-token, JWT, basic, API key) — built-in `http:*AuthConfig` records. Save only NON-STANDARD auth quirks of a specific system.',
    '- JSON ↔ record / XML ↔ record binding — built-in via `cloneWithType`, `data.xmldata`, etc. Save only payload-shape EDGE CASES the binding cannot infer.',
    '',
    '### General exclusions',
    '',
    '- Ballerina sequences, integration XML, or connector configs already in the project — derivable by reading the files.',
    '- Deployment topology already in `deployment.toml` — derivable.',
    '- Credentials, API keys, or secrets — never save these, even if explicitly asked.',
    '- Stack traces and error logs — ephemeral, useless next session.',
    '- Payload examples from actual API calls — ephemeral and potentially contain PII/PHI.',
    '- Test data and mock payloads — ephemeral.',
    '- Anything already documented in COPILOT.md files.',
    '- Ephemeral task details: in-progress work, current conversation context.',
    '',
    'These exclusions apply even when the user explicitly asks you to save. ' +
    'If they ask you to save retry counts, timeouts, payload examples, or error logs, ' +
    'ask what was *surprising, non-obvious, or specific to your team\'s architecture* — that is the part worth keeping.',
];
