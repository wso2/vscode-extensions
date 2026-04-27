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
 * 6 types across two scopes:
 *   Global  (user, pattern, history) — cross-project, shared across all workspaces
 *   Workspace (integration, project, reference) — specific to the current project
 */

export const MEMORY_TYPES = [
    'user',
    'integration',
    'pattern',
    'project',
    'reference',
    'history',
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];

/** Types that always belong in the global memory directory. */
export const GLOBAL_MEMORY_TYPES: readonly MemoryType[] = ['user', 'pattern', 'history'];

/** Types that always belong in the workspace memory directory. */
export const WORKSPACE_MEMORY_TYPES: readonly MemoryType[] = ['integration', 'project', 'reference'];

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
    '{{memory content — for pattern/project/history types include **Why:** and **How to apply:** lines}}',
    '```',
];

export const TYPES_SECTION: readonly string[] = [
    '## Types of memory',
    '',
    'There are 6 types of memory across two scopes — global (user, pattern, history) ' +
    'and workspace (integration, project, reference):',
    '',
    '<types>',
    '<type>',
    '    <name>user</name>',
    '    <description>Who the engineer is — their background, integration expertise, preferred tools, ' +
    'and how they like the Copilot to communicate. Use this to tailor explanations and avoid ' +
    'repeating things they already know. Avoid writing memories that could be viewed as a negative judgement. ' +
    'SCOPE: global — write to the global memory directory.</description>',
    '    <when_to_save>When you learn the user\'s role, integration background ' +
    '(ESB/MI/MuleSoft/Ballerina experience), preferred language features, ' +
    'or how they want explanations delivered.</when_to_save>',
    '    <how_to_use>Tailor your communication style and code examples to their expertise. ' +
    'A senior ESB architect migrating to Ballerina needs ESB analogues. ' +
    'A non-developer Salesforce admin needs business terms, not code jargon.</how_to_use>',
    '    <examples>',
    '    user: I have 10 years of WSO2 ESB experience but this is my first Ballerina project',
    '    assistant: [saves user memory (global): deep WSO2 ESB expertise, new to Ballerina — ' +
    'frame Ballerina concepts using ESB analogues]',
    '',
    '    user: Stop showing me XML config examples — I only use Ballerina code',
    '    assistant: [saves user memory (global): never suggest XML mediators — user works exclusively in Ballerina code]',
    '    </examples>',
    '</type>',
    '<type>',
    '    <name>integration</name>',
    '    <description>Facts about the external systems being connected — authentication patterns, ' +
    'data format quirks, API gotchas, naming conventions, rate limits, and anything surprising ' +
    'about how a system behaves. These are things you\'d write on a sticky note next to your monitor. ' +
    'SCOPE: workspace — write to the workspace memory directory.</description>',
    '    <when_to_save>When you learn something non-obvious about an external system: how it authenticates, ' +
    'a known quirk or limitation, its data format or naming convention, rate limits, or pagination behaviour. ' +
    'Key distinction: this type captures how a system BEHAVES. The `reference` type captures WHERE to find things about it.</when_to_save>',
    '    <how_to_use>Apply this knowledge when suggesting code that interacts with that system. ' +
    'For example, if the API returns 200 on errors, always check the response body — never rely on HTTP status alone.</how_to_use>',
    '    <examples>',
    '    user: The Shopify webhook for orders fires twice — once on placement, once on payment confirmation',
    '    assistant: [saves integration memory (workspace): Shopify order webhooks fire twice per order; ' +
    'always deduplicate on order_id before processing downstream]',
    '',
    '    user: The inventory API returns HTTP 200 even when orders fail — check the response.status field',
    '    assistant: [saves integration memory (workspace): inventory API returns HTTP 200 on business errors — ' +
    'never rely on HTTP status code, always check response.status field]',
    '    </examples>',
    '</type>',
    '<type>',
    '    <name>pattern</name>',
    '    <description>Architectural decisions and team standards for how integrations are built — ' +
    'the "we always do it this way" rules. These are decisions the team has made once so they ' +
    'don\'t get re-debated for every new integration. Includes both corrections and confirmations. ' +
    'Always include WHY the decision was made. SCOPE: global — write to the global memory directory.</description>',
    '    <when_to_save>When the user corrects a suggested approach ("don\'t do it that way, we use X"), ' +
    'confirms a pattern worked ("yes, always do it that way"), or states a team convention. ' +
    'Record corrections AND confirmations — if you only save corrections you will drift away from validated approaches.</when_to_save>',
    '    <how_to_use>Apply these standards to every integration suggestion. ' +
    'Never propose an approach that violates a saved pattern without explicitly flagging the conflict.</how_to_use>',
    '    <body_structure>Lead with the rule itself, then a **Why:** line and a **How to apply:** line.</body_structure>',
    '    <examples>',
    '    user: We always buffer through Kafka before writing to Google Sheets — direct writes caused data loss',
    '    assistant: [saves pattern memory (global): never write directly from source to Sheets — always buffer through Kafka. ' +
    'Why: direct writes caused data loss during Sheets API outages. How to apply: all pipelines ending at Sheets must use a Kafka buffer stage.]',
    '',
    '    user: All our error handling follows: retry 3 times → dead-letter Kafka topic → Slack alert. Every integration.',
    '    assistant: [saves pattern memory (global): standard error chain: retry 3× → dead-letter Kafka → Slack alert. ' +
    'Why: ops SLA requires no silent failures. How to apply: every integration that calls an external system must implement this chain.]',
    '    </examples>',
    '</type>',
    '<type>',
    '    <name>project</name>',
    '    <description>What is actively being built right now, why it exists, and constraints that affect ' +
    'every suggestion — migration phase, deadlines, compliance requirements, feature freezes. ' +
    'Time-sensitive context that matters today but may be irrelevant in a few months. ' +
    'SCOPE: workspace — write to the workspace memory directory.</description>',
    '    <when_to_save>When you learn the business driver behind current work, a migration phase, a hard deadline, ' +
    'an active freeze, or a compliance constraint. Always convert relative dates to absolute dates ' +
    '("by Thursday" → "by 2026-04-10") so the memory stays meaningful over time.</when_to_save>',
    '    <how_to_use>Use this to prioritise suggestions and flag anything that conflicts with current constraints.</how_to_use>',
    '    <body_structure>Lead with the fact or constraint, then a **Why:** line and a **How to apply:** line.</body_structure>',
    '    <examples>',
    '    user: We\'re migrating our Salesforce→SAP integration from MuleSoft to Ballerina — license expires 2026-07-01',
    '    assistant: [saves project memory (workspace): MuleSoft→Ballerina migration, deadline 2026-07-01. ' +
    'Why: license expiry. How to apply: prioritise completeness; flag any approach that risks missing the deadline.]',
    '',
    '    user: This Stripe→QuickBooks sync must be GDPR compliant — no customer PII in the integration layer',
    '    assistant: [saves project memory (workspace): GDPR-scoped — PII must not be stored in the integration layer. ' +
    'How to apply: never suggest caching or storing customer data in this integration.]',
    '    </examples>',
    '</type>',
    '<type>',
    '    <name>reference</name>',
    '    <description>Where to find things — monitoring dashboards, issue tracker project keys, ' +
    'internal documentation URLs, runbooks, Confluence spaces. Not what those things contain ' +
    '(that belongs in `integration`) — just where they live. ' +
    'SCOPE: workspace — write to the workspace memory directory.</description>',
    '    <when_to_save>When you learn a URL, JIRA project key, Confluence space, monitoring dashboard, ' +
    'or any external location where work or documentation is tracked.</when_to_save>',
    '    <how_to_use>When the Copilot suggests "check the monitoring dashboard" or "file a ticket," ' +
    'use these pointers to be specific rather than generic.</how_to_use>',
    '    <examples>',
    '    user: Integration monitoring is all in Grafana at grafana.internal/d/integrations — that\'s what on-call watches',
    '    assistant: [saves reference memory (workspace): integration monitoring at grafana.internal/d/integrations — ' +
    'check before touching any integration request-path code]',
    '',
    '    user: We use an internal Ballerina connector fork at confluence.internal/ballerina-connectors — not the public docs',
    '    assistant: [saves reference memory (workspace): use internal connector docs at confluence.internal/ballerina-connectors — ' +
    'not public ballerina.io docs]',
    '    </examples>',
    '</type>',
    '<type>',
    '    <name>history</name>',
    '    <description>Completed integration projects — what was built, what systems were connected, ' +
    'key architectural decisions, and lessons learned. This is permanent institutional knowledge ' +
    'that persists across all future projects. It is the answer to: ' +
    '"I finished the Salesforce→SAP integration last year — a new project session should know about it." ' +
    'SCOPE: global — write to the global memory directory.</description>',
    '    <when_to_save>When a user describes a completed integration ("we shipped X last quarter"), ' +
    'references prior work ("like we did in the last project"), or when auto-dream detects that a ' +
    'project memory has a passed deadline and the work is done. ' +
    'Key distinction from `project`: project is for active work that fades when it ends. ' +
    'history is permanent — it captures what was built and why.</when_to_save>',
    '    <how_to_use>When starting a new integration, use history memories to bring forward relevant knowledge: ' +
    'systems the developer has connected before, patterns that worked, lessons learned. ' +
    'Saves the developer from re-explaining past work at the start of every new project.</how_to_use>',
    '    <examples>',
    '    user: We finished migrating the Salesforce→SAP integration from MuleSoft — it went live last month',
    '    assistant: [saves history memory (global): Salesforce→SAP order fulfillment completed and live. ' +
    'Used JWT Bearer OAuth2 for Salesforce, RFC auth for SAP BAPI, Kafka buffer between them. ' +
    'Key lesson: always buffer before SAP — direct writes timeout under peak load.]',
    '',
    '    user: The OneDrive→Google Drive migration we did in 2024 is all done',
    '    assistant: [saves history memory (global): OneDrive→Google Drive migration completed 2024. ' +
    'OneDrive returns flat file metadata; Google Drive expects nested fileResource — always add mapping layer.]',
    '    </examples>',
    '</type>',
    '</types>',
    '',
];

export const WHAT_NOT_TO_SAVE_SECTION: readonly string[] = [
    '## What NOT to save in memory',
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
    'If they ask you to save payload examples or error logs, ask what was *surprising or non-obvious* ' +
    'about it — that is the part worth keeping.',
];
