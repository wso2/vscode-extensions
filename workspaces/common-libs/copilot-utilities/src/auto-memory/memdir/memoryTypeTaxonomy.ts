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

// import type is erased at compile time — no circular runtime dependency.
import type { MemoryType } from './memoryTypes';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface MemoryTypeExample {
    readonly user: string;
    readonly assistant: string;
}

export interface MemoryTypeDefinition {
    readonly name: MemoryType;
    /** Whether this type belongs in the global or workspace memory directory. */
    readonly scope: 'global' | 'workspace';
    readonly description: string;
    readonly when_to_save: string;
    readonly how_to_use: string;
    /** Optional: explains expected body structure (e.g. rule + Why + How to apply). */
    readonly body_structure?: string;
    readonly examples: readonly MemoryTypeExample[];
}

// ---------------------------------------------------------------------------
// Data — add, remove, or reorder types here. memoryTypes.ts derives
// MEMORY_TYPES, GLOBAL_MEMORY_TYPES, WORKSPACE_MEMORY_TYPES.
// ---------------------------------------------------------------------------

export const MEMORY_TYPE_DEFINITIONS: readonly MemoryTypeDefinition[] = [
    {
        name: 'user',
        scope: 'global',
        description:
            'Who the engineer is — their background, integration expertise, preferred tools, ' +
            'and how they like the Copilot to communicate. Use this to tailor explanations and avoid ' +
            'repeating things they already know. Avoid writing memories that could be viewed as a negative judgement.',
        when_to_save:
            "When you learn the user's role, integration background " +
            '(ESB/MI/MuleSoft/Ballerina experience), preferred language features, ' +
            'or how they want explanations delivered.',
        how_to_use:
            'Tailor your communication style and code examples to their expertise. ' +
            'A senior ESB architect migrating to Ballerina needs ESB analogues. ' +
            'A non-developer Salesforce admin needs business terms, not code jargon.',
        examples: [
            {
                user: 'I have 10 years of WSO2 ESB experience but this is my first Ballerina project',
                assistant:
                    '[saves user memory (global): deep WSO2 ESB expertise, new to Ballerina — ' +
                    'frame Ballerina concepts using ESB analogues]',
            },
            {
                user: 'Stop showing me XML config examples — I only use Ballerina code',
                assistant:
                    '[saves user memory (global): never suggest XML mediators — user works exclusively in Ballerina code]',
            },
        ],
    },
    {
        name: 'codingstyle',
        scope: 'workspace',
        description:
            'TEAM-SPECIFIC architectural decisions for THIS project that the Ballerina language does NOT enforce — ' +
            'dead-letter topology, topic naming conventions, custom module layouts, compensation strategies, ' +
            'alerting destinations. Includes both corrections and confirmations. Always include WHY the decision was made. ' +
            'Do NOT save Ballerina-native mechanics: `retry(N)`, `http:Client retryConfig`/`circuitBreaker`/`timeout`, ' +
            'failover, OAuth2 refresh, `transaction { }`, `check`/`on fail`/`error?` — those are visible in source code.',
        when_to_save:
            'When the user states a team decision the LANGUAGE DOES NOT ENFORCE: which dead-letter topic, ' +
            'which alerting destination, which compensation/saga design, custom directory conventions beyond ' +
            '`modules/`/`tests/`/`resources/`, idempotency-key strategies, bulkhead/quota patterns. ' +
            'Record corrections AND confirmations. If the user states a retry count, timeout, or circuit-breaker ' +
            'threshold — that is `http:Client` config visible in code, do NOT save it. Save the TOPOLOGY around it.',
        how_to_use:
            'Apply these conventions to every code suggestion for this project. ' +
            'Never propose an architecture that violates a saved codingstyle without explicitly flagging the conflict.',
        body_structure: 'Lead with the rule itself, then a **Why:** line and a **How to apply:** line.',
        examples: [
            {
                user: 'We always buffer through Kafka before writing to Google Sheets — direct writes caused data loss',
                assistant:
                    '[saves codingstyle memory (workspace): all pipelines ending at Google Sheets must go through a Kafka buffer stage. ' +
                    'Why: direct writes caused data loss during a Sheets API outage in 2025-Q4. ' +
                    'How to apply: never propose a Sheets sink without an upstream Kafka topic, even for low-volume pipelines.]',
            },
            {
                user: 'Integration failures dead-letter to {env}.errors.{domain} Kafka topics with 7-day retention; on-call PagerDuty watches that',
                assistant:
                    '[saves codingstyle memory (workspace): dead-letter topology — failed external calls land in Kafka topics named ' +
                    '`{env}.errors.{domain}` with 7-day retention; on-call PagerDuty consumes from there. ' +
                    'Why: ops SLA requires an auditable trail of every integration failure. ' +
                    'How to apply: any external-call `on fail` block must terminate at this topology — the retry mechanics ' +
                    'belong to `http:Client retryConfig` and are not part of this rule.]',
            },
            {
                user: 'Transformation logic over 20 lines always goes in its own .bal file under transforms/',
                assistant:
                    '[saves codingstyle memory (workspace): transforms over 20 lines must live in their own file under `transforms/` ' +
                    '(this is a project-specific directory beyond Ballerina\'s enforced `modules/`/`tests/` layout). ' +
                    'Why: team code review rule for maintainability. ' +
                    'How to apply: extract long inline transformations into `transforms/<name>.bal` before suggesting service code.]',
            },
        ],
    },
    {
        name: 'integration',
        scope: 'workspace',
        description:
            'Facts about external systems that the Ballerina compiler and connectors CANNOT see — ' +
            'undocumented API behaviours, idempotency requirements, undocumented rate limits, ' +
            'auth-flow surprises, payload-shape edge cases, operationally-tuned values. ' +
            'Do NOT save things visible from `import ballerinax/<connector>` (which connectors are in use, standard auth grants, ' +
            'JSON↔record binding, OpenAPI-generated schemas) — those are visible in source.',
        when_to_save:
            'When you learn NON-OBVIOUS runtime behaviour of an external system: webhook duplication, ' +
            'errors masked behind 2xx responses, undocumented rate limits, idempotency-key requirements, ' +
            'pagination quirks, operationally-tuned values (connection-pool sizes, batch sizes) discovered under load. ' +
            'Key distinction: this captures how a system BEHAVES. `reference` captures WHERE to find things. ' +
            '`codingstyle` captures the team\'s response to that behaviour.',
        how_to_use:
            'Apply this knowledge when suggesting code that interacts with that system. ' +
            'For example, if the API returns 200 on errors, always check the response body — never rely on HTTP status alone.',
        examples: [
            {
                user: 'The Shopify webhook for orders fires twice — once on placement, once on payment confirmation',
                assistant:
                    '[saves integration memory (workspace): Shopify order webhooks fire twice per order (placement + payment confirmation). ' +
                    'How to apply: always deduplicate on order_id before any downstream side effect — Ballerina record binding will not catch this.]',
            },
            {
                user: 'The inventory API returns HTTP 200 even when orders fail — check the response.status field',
                assistant:
                    '[saves integration memory (workspace): inventory API returns HTTP 200 on business errors; failure signal lives in `response.status` field. ' +
                    'How to apply: never rely on HTTP status — match on the response record\'s status field after data binding.]',
            },
            {
                user: 'The SAP S/4HANA connector pool size of 5 was tuned for our peak load — anything higher caused RFC connection exhaustion',
                assistant:
                    '[saves integration memory (workspace): SAP S/4HANA connection pool size = 5 (operationally tuned for peak load). ' +
                    'Why: pool sizes >5 caused RFC connection exhaustion under load testing in 2026-Q1. ' +
                    'How to apply: never raise the pool size in `http:Client` config without re-running load tests against the SAP test instance.]',
            },
        ],
    },
    {
        name: 'about',
        scope: 'workspace',
        description:
            'What this project is about — what is actively being built, why it exists, ' +
            'and constraints that affect every suggestion: migration phase, deadlines, compliance requirements, ' +
            'feature freezes, business drivers. Time-sensitive context that matters today but may be irrelevant in a few months.',
        when_to_save:
            'When you learn the business driver behind current work, a migration phase, a hard deadline, ' +
            'an active freeze, or a compliance constraint. Always convert relative dates to absolute dates ' +
            '("by Thursday" → "by 2026-04-10") so the memory stays meaningful over time.',
        how_to_use:
            'Use this to prioritise suggestions and flag anything that conflicts with current constraints.',
        body_structure: 'Lead with the fact or constraint, then a **Why:** line and a **How to apply:** line.',
        examples: [
            {
                user: "We're migrating our Salesforce→SAP integration from MuleSoft to Ballerina — license expires 2026-07-01",
                assistant:
                    '[saves about memory (workspace): MuleSoft→Ballerina migration, deadline 2026-07-01. ' +
                    'Why: license expiry. How to apply: prioritise completeness; flag any approach that risks missing the deadline.]',
            },
            {
                user: 'This Stripe→QuickBooks sync must be GDPR compliant — no customer PII in the integration layer',
                assistant:
                    '[saves about memory (workspace): GDPR-scoped — PII must not be stored in the integration layer. ' +
                    'How to apply: never suggest caching or storing customer data in this integration.]',
            },
        ],
    },
    {
        name: 'reference',
        scope: 'workspace',
        description:
            'Where to find things — monitoring dashboards, issue tracker project keys, ' +
            'internal documentation URLs, runbooks, Confluence spaces. Not what those things contain ' +
            '(that belongs in `integration`) — just where they live.',
        when_to_save:
            'When you learn a URL, JIRA project key, Confluence space, monitoring dashboard, ' +
            'or any external location where work or documentation is tracked.',
        how_to_use:
            'When the Copilot suggests "check the monitoring dashboard" or "file a ticket," ' +
            'use these pointers to be specific rather than generic.',
        examples: [
            {
                user: "Integration monitoring is all in Grafana at grafana.internal/d/integrations — that's what on-call watches",
                assistant:
                    '[saves reference memory (workspace): integration monitoring at grafana.internal/d/integrations — ' +
                    'check before touching any integration request-path code]',
            },
            {
                user: 'We use an internal Ballerina connector fork at confluence.internal/ballerina-connectors — not the public docs',
                assistant:
                    '[saves reference memory (workspace): use internal connector docs at confluence.internal/ballerina-connectors — ' +
                    'not public ballerina.io docs]',
            },
        ],
    },
    {
        name: 'history',
        scope: 'global',
        description:
            'Completed integration projects — what was built, what systems were connected, ' +
            'key architectural decisions, and lessons learned. This is permanent institutional knowledge ' +
            'that persists across all future projects. It is the answer to: ' +
            '"I finished the Salesforce→SAP integration last year — a new project session should know about it."',
        when_to_save:
            'When a user describes a completed integration ("we shipped X last quarter"), ' +
            'references prior work ("like we did in the last project"), or when auto-dream detects that an ' +
            '`about` memory has a passed deadline and the work is done. ' +
            'Key distinction from `about`: about is for active work that fades when it ends. ' +
            'history is permanent — it captures what was built and why.',
        how_to_use:
            'When starting a new integration, use history memories to bring forward relevant knowledge: ' +
            'systems the developer has connected before, codingstyles that worked, lessons learned. ' +
            'Saves the developer from re-explaining past work at the start of every new project.',
        examples: [
            {
                user: 'We finished migrating the Salesforce→SAP integration from MuleSoft — it went live last month',
                assistant:
                    '[saves history memory (global): Salesforce→SAP order fulfillment completed and live. ' +
                    'Used JWT Bearer OAuth2 for Salesforce, RFC auth for SAP BAPI, Kafka buffer between them. ' +
                    'Key lesson: always buffer before SAP — direct writes timeout under peak load.]',
            },
            {
                user: 'The OneDrive→Google Drive migration we did in 2024 is all done',
                assistant:
                    '[saves history memory (global): OneDrive→Google Drive migration completed 2024. ' +
                    'OneDrive returns flat file metadata; Google Drive expects nested fileResource — always add mapping layer.]',
            },
        ],
    },
];
