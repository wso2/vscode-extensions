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

import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { formatFileTree, getExistingFiles } from '../../../utils/file-utils';
import { getAvailableConnectorCatalog } from '../../tools/connector_tools';
import { getPlanModeReminder as getPlanModeSessionReminder } from '../../tools/plan_mode_tools';
import { getRuntimeVersionFromPom } from '../../tools/connector_store_cache';
import { getServerPathFromConfig } from '../../../../util/onboardingUtils';
import { AgentMode, LoginMethod } from '@wso2/mi-core';
import { getModeBriefNote, getModeReminder } from './mode';
import { logDebug } from '../../../copilot/logger';
import { getStateMachine } from '../../../../stateMachine';

const MAX_PROJECT_STRUCTURE_FILES = 50;
const MAX_PROJECT_STRUCTURE_CHARS = 10000;

// ============================================================================
// User Prompt Template
// ============================================================================

// ============================================================================
// Content Block Type
// ============================================================================

/**
 * A single text content block for the user message.
 * Splitting the user prompt into multiple blocks enables better prompt caching:
 * - Stable blocks (env, connectors) get cache hits even when volatile blocks change
 * - Blocks are ordered from most stable to most volatile for maximum prefix reuse
 */
export interface UserPromptContentBlock {
    type: 'text';
    text: string;
}

// ============================================================================
// User Prompt Template
// ============================================================================

/**
 * Handlebars template for the user prompt.
 *
 * After rendering, the output is split into separate content blocks at
 * <system-reminder>...</system-reminder> and <user_query>...</user_query> boundaries.
 * Each <system-reminder> block becomes a separate API content block (for prompt caching).
 * The <user_query> content becomes a plain text block (tags stripped).
 *
 * Block order: stable → volatile (for optimal prefix-based caching)
 */

// {{#if fileList}}
// <system-reminder>
// # Project Structure
// {{#each fileList}}
// {{this}}
// {{/each}}
// </system-reminder>
// {{/if}}

export const PROMPT_TEMPLATE = `
{{#if env_block}}
<system-reminder>
{{{env_block}}}
</system-reminder>
{{/if}}

{{#if connectors_block}}
<system-reminder>
{{{connectors_block}}}
</system-reminder>
{{/if}}

{{#if web_availability_block}}
<system-reminder>
{{{web_availability_block}}}
</system-reminder>
{{/if}}

{{#if currentlyOpenedFile}}
<system-reminder>
# IDE Context
The user has opened the file {{currentlyOpenedFile}} in the IDE. This may or may not be related to the current task. User may refer to it as "this".
</system-reminder>
{{/if}}

{{#if payloads_block}}
<system-reminder>
{{{payloads_block}}}
</system-reminder>
{{/if}}

{{#if runtime_version_detection_warning}}
<system-reminder>
# Runtime Version Warning
{{runtime_version_detection_warning}}
</system-reminder>
{{/if}}

<system-reminder>
You are in {{mode_upper}} mode.{{#if mode_changed_from}} [mode changed from {{mode_changed_from}}]{{/if}}{{#if mode_brief_note}}

{{mode_brief_note}}{{/if}}
</system-reminder>

{{#if full_mode_policy_block}}
<system-reminder>
{{{full_mode_policy_block}}}
</system-reminder>
{{/if}}

{{#if plan_file_reminder}}
<system-reminder>
{{plan_file_reminder}}
</system-reminder>
{{/if}}

{{#if connector_store_reminder}}
<system-reminder>
# Connector Store Status
{{connector_store_reminder}}
</system-reminder>
{{/if}}

<system-reminder>
**DO NOT CREATE ANY README FILES or ANY DOCUMENTATION FILES after end of the task unless explicitly requested by the user.**
</system-reminder>

<user_query>
{{question}}
</user_query>
`;

// ============================================================================
// Types
// ============================================================================

/**
 * Per-block injection status. Decided in agent.ts based on first-message /
 * post-compaction triggers and per-block hash drift, then passed to
 * `getUserPrompt` so each block renders the correct content (with or without
 * a "[context updated]" notice, or omitted entirely).
 *
 * `cleared`: the block was injected on a prior turn but is absent now (e.g.
 * payloads removed by the user). Render an explicit removal notice so the
 * model doesn't keep referencing the stale prior-turn reminder, and clear
 * the persisted hash so the next non-empty injection starts fresh.
 */
export type BlockInjectionStatus = 'omit' | 'first-injection' | 're-injection' | 'cleared';

/**
 * Per-block injection statuses for the five tracked session-context blocks.
 * Default (when omitted from `UserPromptParams`) is 'first-injection' for all
 * blocks — matches the legacy "always inject session context" behavior.
 */
export interface BlockInjectionStatuses {
    env: BlockInjectionStatus;
    connectors: BlockInjectionStatus;
    webAvailability: BlockInjectionStatus;
    /** Plan-only. For Ask/Edit, the full policy is always rendered regardless of this status. */
    modePolicy: BlockInjectionStatus;
    payloads: BlockInjectionStatus;
}

/**
 * Parameters for rendering the user prompt
 */
export interface UserPromptParams {
    /** User's query or requirement */
    query: string;
    /** Agent mode: ask (read-only), edit (full tool access), or plan (planning read-only) */
    mode?: AgentMode;
    /** Path to the MI project */
    projectPath: string;
    /** Session ID for plan file path generation */
    sessionId?: string;
    /** MI runtime version from pom.xml (optional; avoids re-reading pom when already known) */
    runtimeVersion?: string | null;
    /** True when runtime version was detected from project metadata */
    runtimeVersionDetected?: boolean;
    /** True when the active provider can't run web_search/web_fetch (e.g. Bedrock without a Tavily key). */
    webSearchUnavailable?: boolean;
    /**
     * Active Copilot backend for this session. Surfaced to the model in the
     * `<env>` block so it can reason about backend-specific behaviour (notably the
     * web tools — Anthropic server-side on Proxy/BYOK, Tavily-local on Bedrock).
     */
    loginMethod?: LoginMethod;
    /**
     * Per-block injection statuses computed by agent.ts from the previous
     * `SessionMetadata.sessionContextBlocks` and the current snapshot. When
     * omitted, all blocks default to 'first-injection' (full content, no notice).
     */
    blockStatuses?: BlockInjectionStatuses;
    /**
     * Previous mode name used for the "[mode changed from EDIT]" notice when
     * `blockStatuses.modePolicy === 're-injection'` and the agent is in Plan
     * mode. Ignored otherwise.
     */
    previousMode?: AgentMode;
    /**
     * Pre-built session context from `computeSessionContextBlockHashes`. When
     * provided, `getUserPrompt` reuses the same snapshot instead of rebuilding
     * it (avoids the second pass of pom.xml read, .git/HEAD read, and
     * connector-store catalog lookup).
     */
    precomputedContext?: SessionContextBuildResult;
}

// ============================================================================
// Backend label mapping
// ============================================================================

/**
 * One-line summary of each Copilot backend, surfaced in the `<env>` block.
 * Keep in sync with the "Copilot backends" section of system.ts.
 */
function describeBackend(loginMethod?: LoginMethod): string {
    switch (loginMethod) {
        case LoginMethod.MI_INTEL:
            return 'WSO2 Integrator Copilot Proxy (SSO via WSO2 Devant) — quota-limited; Anthropic server-side web_search / web_fetch';
        case LoginMethod.ANTHROPIC_KEY:
            return 'Anthropic Direct (BYOK) — user-paid; Anthropic server-side web_search / web_fetch';
        case LoginMethod.AWS_BEDROCK:
            return 'AWS Bedrock — user-paid; web tools only available when a Tavily API key is configured (Tavily-backed wrapper)';
        default:
            return 'unknown';
    }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Render a Handlebars template with context
 */
function renderTemplate(templateContent: string, context: Record<string, any>): string {
    const template = Handlebars.compile(templateContent);
    return template(context);
}

/**
 * Split a rendered prompt string into separate content blocks.
 *
 * Extracts:
 * - Each `<system-reminder>...</system-reminder>` block → content block (tags kept)
 * - `<user_query>...</user_query>` → plain text content block (tags stripped)
 * - Whitespace between blocks is ignored
 *
 * This enables Anthropic's prefix-based prompt caching: stable blocks at the start
 * get cache hits even when later volatile blocks change.
 */
export function splitPromptIntoBlocks(rendered: string): UserPromptContentBlock[] {
    const blocks: UserPromptContentBlock[] = [];

    // Match all <system-reminder> blocks and the <user_query> block
    const blockPattern = /(<system-reminder>[\s\S]*?<\/system-reminder>)|(<user_query>\s*([\s\S]*?)\s*<\/user_query>)/g;
    let match: RegExpExecArray | null;

    while ((match = blockPattern.exec(rendered)) !== null) {
        if (match[1]) {
            // <system-reminder> block — keep tags intact
            blocks.push({ type: 'text', text: match[1].trim() });
        } else if (match[3] !== undefined) {
            // <user_query> block — strip tags, extract inner content
            blocks.push({ type: 'text', text: match[3].trim() });
        }
    }

    return blocks;
}

/**
 * Formats the project structure as a tree (relative paths only)
 */
function formatProjectStructure(files: string[]): string {
    if (files.length === 0) {
        return `Empty project - no existing files`;
    }

    // Use the tree formatter to display files in a hierarchical structure
    return formatFileTree(
        files,
        [
            '.devtools/**',
            '.mvn/**',
            '.git/**',
            '.vscode/**',
            '.idea/**',
            '.mi-copilot/**',
            '.env',
            '.env.local',
            '.env.development.local',
            '.env.test.local',
            '.env.production.local',
            '**.jsonl'
        ]
    );
}

function capProjectStructureLength(projectStructure: string): string {
    if (projectStructure.length <= MAX_PROJECT_STRUCTURE_CHARS) {
        return projectStructure;
    }

    const truncated = projectStructure.slice(0, MAX_PROJECT_STRUCTURE_CHARS).trimEnd();
    return `${truncated}\n... (project structure truncated due to size limit).`;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the currently opened file path from the state machine
 * @param projectPath - Absolute path to the project root
 * @returns Project-relative file path if available, null otherwise
 */
async function getCurrentlyOpenedFile(projectPath: string): Promise<string | null> {
    try {
        const currentFile = getStateMachine(projectPath).context().documentUri;
        if (currentFile && fs.existsSync(currentFile)) {
            // Make the path relative to project root
            const relativePath = path.relative(projectPath, currentFile);

            return relativePath;
        }
    } catch (error) {
        logDebug(
            `[Prompt] Unable to resolve currently opened file for project ${projectPath}: ` +
            `${error instanceof Error ? error.message : String(error)}`
        );
    }
    return null;
}

function getRuntimePaths(projectPath: string): {
    runtimeHomePath: string;
    logDirPath: string;
    carbonLogPath: string;
    errorLogPath: string;
    httpAccessLogPath: string;
    serviceLogPath: string;
    correlationLogPath: string;
} {
    const NOT_CONFIGURED = 'not_configured';
    const runtimeHome = getServerPathFromConfig(projectPath);
    if (!runtimeHome || runtimeHome.trim().length === 0) {
        return {
            runtimeHomePath: NOT_CONFIGURED,
            logDirPath: NOT_CONFIGURED,
            carbonLogPath: NOT_CONFIGURED,
            errorLogPath: NOT_CONFIGURED,
            httpAccessLogPath: NOT_CONFIGURED,
            serviceLogPath: NOT_CONFIGURED,
            correlationLogPath: NOT_CONFIGURED,
        };
    }

    const resolvedRuntimeHome = path.resolve(runtimeHome.trim());
    const runtimeExists = fs.existsSync(resolvedRuntimeHome);
    const logDir = path.join(resolvedRuntimeHome, 'repository', 'logs');
    const logDirExists = fs.existsSync(logDir);

    const resolveLogPath = (filename: string) => {
        const p = path.join(logDir, filename);
        return fs.existsSync(p) ? p : `${p} (missing)`;
    };

    return {
        runtimeHomePath: runtimeExists ? resolvedRuntimeHome : `${resolvedRuntimeHome} (path_not_found)`,
        logDirPath: logDirExists ? logDir : `${logDir} (missing)`,
        carbonLogPath: resolveLogPath('wso2carbon.log'),
        errorLogPath: resolveLogPath('wso2error.log'),
        httpAccessLogPath: resolveLogPath('http_access.log'),
        serviceLogPath: resolveLogPath('wso2-mi-service.log'),
        correlationLogPath: resolveLogPath('correlation.log'),
    };
}

// ============================================================================
// Session Context Snapshot
// ============================================================================

/**
 * Subset of `UserPromptParams` needed to compute the session-context snapshot
 * (env + connectors + web availability + mode + tryout payloads). Used by both
 * `getUserPrompt` and `computeSessionContextBlockHashes` so the two stay in
 * lockstep.
 */
export interface SessionContextParams {
    projectPath: string;
    runtimeVersion?: string | null;
    webSearchUnavailable?: boolean;
    loginMethod?: LoginMethod;
    mode?: AgentMode;
}

/**
 * Per-file fingerprint for `.tryout/*.json`. mtimeMs+size is good enough
 * for change detection here — the IDE always writes through normal
 * `fs.writeFile`, so an unchanged-content file keeps its mtime, and any
 * real edit bumps it. Avoids reading every payload's bytes per turn
 * (matters when users stash large saved requests).
 */
interface TryoutPayloadEntry {
    name: string;
    mtimeMs: number;
    size: number;
}

/**
 * Captures every value rendered inside any tracked session-context block of
 * the user-prompt template. The block-hashing logic in
 * `computeSessionContextBlockHashes` derives a per-block hash from a stable
 * subset of these fields.
 */
export interface SessionContextSnapshot {
    // env block
    workingDirectory: string;
    isGitRepo: boolean;
    gitBranch: string | null;
    platform: string;
    osVersion: string;
    today: string;
    backend: string;
    miRuntimeVersion: string;
    miRuntimeHomePath: string;
    miLogDirPath: string;
    miCarbonLogPath: string;
    miErrorLogPath: string;
    miHttpAccessLogPath: string;
    miServiceLogPath: string;
    miCorrelationLogPath: string;
    // connectors block
    connectorArtifactIds: string;
    inboundArtifactIds: string;
    bundledInboundIds: string;
    // web availability block
    webSearchUnavailable: boolean;
    // mode policy block (stored as the verbatim mode name)
    mode: AgentMode;
    /**
     * Listing of `.tryout/*.json` files (sorted by name). The model reads them
     * on demand via `file_read` — we surface only the listing in the user
     * prompt to avoid dumping (potentially large) saved request bodies on
     * every turn. Empty array = no `.tryout/` folder or no payload files.
     */
    tryoutPayloads: TryoutPayloadEntry[];
}

interface SessionContextWithCatalog {
    snapshot: SessionContextSnapshot;
    catalogWarnings: string[];
    catalogStoreStatus: string;
    runtimeVersionResolved: string | null;
}

/**
 * Per-block hashes / scalars used by agent.ts for change detection.
 * `modePolicy` stores the verbatim mode name, not a hash, so the change
 * notice can say `[mode changed from EDIT]`. `payloads` is `undefined` when
 * no payloads are provided this turn (block is omitted entirely).
 */
export interface SessionContextBlockHashes {
    env: string;
    connectors: string;
    webAvailability: string;
    modePolicy: AgentMode;
    payloads: string | undefined;
}

/**
 * Recursive stable JSON stringifier — sorts object keys deterministically so
 * semantically-equal objects produce identical strings regardless of insertion
 * order. Used by `hashJson` so block hashes are reproducible across processes.
 */
function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return '[' + value.map(stableStringify).join(',') + ']';
    }
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

function hashJson(value: unknown): string {
    return crypto.createHash('sha256').update(stableStringify(value)).digest('hex').slice(0, 16);
}

/**
 * Scan `.tryout/*.json` and return a sorted listing for change detection.
 * mtimeMs+size is enough — IDE writes always bump mtime, and the cost of a
 * false-positive re-injection is one extra reminder (negligible) while the
 * cost of reading every payload's bytes per turn would be real for users
 * who save large request bodies.
 */
function scanTryoutPayloads(projectPath: string): TryoutPayloadEntry[] {
    const tryoutDir = path.join(projectPath, '.tryout');
    if (!fs.existsSync(tryoutDir)) {
        return [];
    }
    try {
        const files = fs.readdirSync(tryoutDir).filter(f => f.endsWith('.json'));
        const result: TryoutPayloadEntry[] = [];
        for (const file of files) {
            const filePath = path.join(tryoutDir, file);
            try {
                const stat = fs.statSync(filePath);
                if (!stat.isFile()) {
                    continue;
                }
                result.push({ name: file, mtimeMs: stat.mtimeMs, size: stat.size });
            } catch {
                // Skip unreadable entries silently — model can still file_read by name.
            }
        }
        return result.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        logDebug(
            `[Prompt] Failed to scan .tryout/ for project ${projectPath}: ` +
            `${error instanceof Error ? error.message : String(error)}`
        );
        return [];
    }
}

async function buildSessionContextSnapshot(params: SessionContextParams): Promise<SessionContextWithCatalog> {
    const isGitRepo = fs.existsSync(path.join(params.projectPath, '.git'));
    let gitBranch: string | null = null;
    if (isGitRepo) {
        try {
            const headPath = path.join(params.projectPath, '.git', 'HEAD');
            const headContent = fs.readFileSync(headPath, 'utf8').trim();
            if (headContent.startsWith('ref: refs/heads/')) {
                gitBranch = headContent.replace('ref: refs/heads/', '');
            } else if (/^[0-9a-f]{40}$/i.test(headContent)) {
                gitBranch = `DETACHED@${headContent.substring(0, 7)}`;
            }
        } catch (error) {
            logDebug(
                `[Prompt] Failed to resolve git branch from HEAD for project ${params.projectPath}: ` +
                `${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    const today = new Date().toISOString().split('T')[0];
    const runtimeVersion = params.runtimeVersion ?? await getRuntimeVersionFromPom(params.projectPath);
    const runtimePaths = getRuntimePaths(params.projectPath);
    const catalog = await getAvailableConnectorCatalog(params.projectPath);

    return {
        snapshot: {
            workingDirectory: params.projectPath,
            isGitRepo,
            gitBranch,
            platform: process.platform,
            osVersion: `${os.type()} ${os.release()}`,
            today,
            backend: describeBackend(params.loginMethod),
            miRuntimeVersion: runtimeVersion || 'unknown',
            miRuntimeHomePath: runtimePaths.runtimeHomePath,
            miLogDirPath: runtimePaths.logDirPath,
            miCarbonLogPath: runtimePaths.carbonLogPath,
            miErrorLogPath: runtimePaths.errorLogPath,
            miHttpAccessLogPath: runtimePaths.httpAccessLogPath,
            miServiceLogPath: runtimePaths.serviceLogPath,
            miCorrelationLogPath: runtimePaths.correlationLogPath,
            connectorArtifactIds: catalog.connectorArtifactIds.join(', '),
            inboundArtifactIds: catalog.inboundArtifactIds.join(', '),
            bundledInboundIds: catalog.bundledInboundIds.join(', '),
            webSearchUnavailable: params.webSearchUnavailable === true,
            mode: params.mode || 'edit',
            tryoutPayloads: scanTryoutPayloads(params.projectPath),
        },
        catalogWarnings: catalog.warnings,
        catalogStoreStatus: catalog.storeStatus,
        runtimeVersionResolved: runtimeVersion ?? null,
    };
}

/**
 * Per-block tracking values derived from a snapshot. agent.ts compares each
 * value against the previous value stored on `SessionMetadata.sessionContextBlocks`
 * to decide which blocks to re-inject this turn.
 */
function deriveBlockHashes(snapshot: SessionContextSnapshot): SessionContextBlockHashes {
    return {
        env: hashJson({
            workingDirectory: snapshot.workingDirectory,
            isGitRepo: snapshot.isGitRepo,
            gitBranch: snapshot.gitBranch,
            platform: snapshot.platform,
            osVersion: snapshot.osVersion,
            today: snapshot.today,
            backend: snapshot.backend,
            miRuntimeVersion: snapshot.miRuntimeVersion,
            miRuntimeHomePath: snapshot.miRuntimeHomePath,
            miLogDirPath: snapshot.miLogDirPath,
            miCarbonLogPath: snapshot.miCarbonLogPath,
            miErrorLogPath: snapshot.miErrorLogPath,
            miHttpAccessLogPath: snapshot.miHttpAccessLogPath,
            miServiceLogPath: snapshot.miServiceLogPath,
            miCorrelationLogPath: snapshot.miCorrelationLogPath,
        }),
        connectors: hashJson({
            connectorArtifactIds: snapshot.connectorArtifactIds,
            inboundArtifactIds: snapshot.inboundArtifactIds,
            bundledInboundIds: snapshot.bundledInboundIds,
        }),
        webAvailability: hashJson({ webSearchUnavailable: snapshot.webSearchUnavailable }),
        modePolicy: snapshot.mode,
        // Hash over the file listing — adding/removing/modifying any
        // .tryout/*.json flips the block hash and triggers a re-injection.
        // `undefined` when the folder is empty so 'cleared' fires correctly
        // when the user wipes all saved payloads.
        payloads: snapshot.tryoutPayloads.length > 0 ? hashJson(snapshot.tryoutPayloads) : undefined,
    };
}

/**
 * Bundles the per-block hashes (used by agent.ts for change detection) with
 * the snapshot + catalog metadata they were derived from. Letting agent.ts
 * pass this back into `getUserPrompt` via `precomputedContext` avoids
 * `buildSessionContextSnapshot` running twice per turn (it touches .git/HEAD,
 * pom.xml, runtime paths, and the connector store catalog).
 */
export interface SessionContextBuildResult {
    hashes: SessionContextBlockHashes;
    snapshot: SessionContextSnapshot;
    catalogWarnings: string[];
    catalogStoreStatus: string;
    runtimeVersionResolved: string | null;
}

/**
 * Build the per-turn session context: snapshot + per-block hashes + catalog
 * metadata. Agent.ts uses `result.hashes` for the block-status decisions and
 * passes the whole result back through `UserPromptParams.precomputedContext`
 * so `getUserPrompt` reuses the same snapshot.
 */
export async function computeSessionContextBlockHashes(params: SessionContextParams): Promise<SessionContextBuildResult> {
    const built = await buildSessionContextSnapshot(params);
    return {
        hashes: deriveBlockHashes(built.snapshot),
        snapshot: built.snapshot,
        catalogWarnings: built.catalogWarnings,
        catalogStoreStatus: built.catalogStoreStatus,
        runtimeVersionResolved: built.runtimeVersionResolved,
    };
}

// ============================================================================
// Tracked-block text builders
// ============================================================================

const CONTEXT_UPDATED = '[context updated]';

const DEFAULT_BLOCK_STATUSES: BlockInjectionStatuses = {
    env: 'first-injection',
    connectors: 'first-injection',
    webAvailability: 'first-injection',
    modePolicy: 'first-injection',
    payloads: 'first-injection',
};

function buildEnvBlockText(snapshot: SessionContextSnapshot, status: BlockInjectionStatus): string | undefined {
    // 'cleared' is unreachable for env (always-defined hash) but treat it as
    // omit defensively so adding new statuses can't silently render junk.
    if (status === 'omit' || status === 'cleared') {
        return undefined;
    }
    const headerSuffix = status === 're-injection' ? ` ${CONTEXT_UPDATED}` : '';
    const lines: string[] = [
        `# Environment${headerSuffix}`,
        `Working directory: ${snapshot.workingDirectory}`,
        `Is directory a git repo: ${snapshot.isGitRepo ? 'true' : 'false'}`,
    ];
    if (snapshot.gitBranch) {
        lines.push(`Current git branch: ${snapshot.gitBranch}`);
    }
    lines.push(
        `Platform: ${snapshot.platform}`,
        `OS Version: ${snapshot.osVersion}`,
        `Today's date: ${snapshot.today}`,
        `Copilot backend: ${snapshot.backend}`,
        `MI Runtime version: ${snapshot.miRuntimeVersion}`,
        `MI Runtime home path: ${snapshot.miRuntimeHomePath}`,
        `MI Runtime log directory: ${snapshot.miLogDirPath}`,
        `MI Runtime logs:`,
        `  - wso2carbon.log (main): ${snapshot.miCarbonLogPath}`,
        `  - wso2error.log (errors + stack traces): ${snapshot.miErrorLogPath}`,
        `  - http_access.log (HTTP requests): ${snapshot.miHttpAccessLogPath}`,
        `  - wso2-mi-service.log (service lifecycle): ${snapshot.miServiceLogPath}`,
        `  - correlation.log (request tracing): ${snapshot.miCorrelationLogPath}`,
    );
    return lines.join('\n');
}

function buildConnectorsBlockText(snapshot: SessionContextSnapshot, status: BlockInjectionStatus): string | undefined {
    if (status === 'omit' || status === 'cleared') {
        return undefined;
    }
    const prefix = status === 're-injection' ? `${CONTEXT_UPDATED}\n` : '';
    return `${prefix}Available WSO2 connector artifact ids for this version of the MI runtime (from the connector store — pass these to get_connector_info / add_or_remove_connector):
${snapshot.connectorArtifactIds}

Available downloadable inbound artifact ids for this version of the MI runtime (from the connector store — add via add_or_remove_connector):
${snapshot.inboundArtifactIds}

Available bundled inbound ids (shipped with this version of the MI runtime — use the id directly with get_connector_info, do NOT add to pom.xml):
${snapshot.bundledInboundIds}`;
}

/**
 * Web-availability block: only renders the "not available" warning when
 * Bedrock has no Tavily key. When the flag flips to "available", the block
 * disappears — the model sees the prior turn's warning fade out of relevance,
 * and the underlying tools start succeeding. Asymmetric but matches today's
 * semantics; the `[context updated]` notice fires when the warning re-appears.
 */
function buildWebAvailabilityBlockText(snapshot: SessionContextSnapshot, status: BlockInjectionStatus): string | undefined {
    if (status === 'omit' || status === 'cleared') {
        return undefined;
    }
    if (!snapshot.webSearchUnavailable) {
        return undefined;
    }
    const prefix = status === 're-injection' ? `${CONTEXT_UPDATED}\n` : '';
    return `${prefix}Web search is not available in this environment because no Tavily API key is configured (AWS Bedrock has no first-party web tools). Do NOT call web_search or web_fetch — they will fail with WEB_SEARCH_NOT_CONFIGURED / WEB_FETCH_NOT_CONFIGURED. Override the system prompt's research-priority guidance: skip step (3) entirely. If the user asks for external/web information, tell them to add a Tavily API key in the AI Panel settings (Web Search section) to enable it. For Synapse/MI internals continue to use load_context_reference and deepwiki_ask_question as the system prompt instructs.`;
}

/**
 * Full mode-policy block. For Ask/Edit, always renders (status is ignored —
 * their policies are short, gating saves nothing). For Plan, gated by status:
 * 'omit' skips entirely (relies on the always-rendered brief Plan note for
 * the highest-stakes rules).
 *
 * The "[mode changed from PREV]" notice is rendered separately on the mode-
 * header line by the template — works for every mode transition, not just
 * entering Plan, so the model always knows when the mode flipped.
 */
function buildFullModePolicyBlockText(
    mode: AgentMode,
    fullPolicy: string,
    status: BlockInjectionStatus,
): string | undefined {
    if (mode !== 'plan') {
        return fullPolicy.trim();
    }
    if (status === 'omit' || status === 'cleared') {
        return undefined;
    }
    return fullPolicy.trim();
}

/**
 * Render the tryout payloads block. We surface only a *listing* of
 * `.tryout/*.json` files (not their contents) — the model reads the relevant
 * file on demand via `file_read`. See system.ts "Tryout payloads" section
 * for file-format details and read-on-demand guidance.
 */
function buildPayloadsBlockText(
    files: TryoutPayloadEntry[],
    status: BlockInjectionStatus,
): string | undefined {
    if (status === 'cleared') {
        // Listing was non-empty on a prior turn but `.tryout/` is now empty —
        // model still has the stale listing in context.
        return `# Tryout payloads [removed]
The .tryout/ folder no longer contains saved sample request payloads. Discard any prior payload references and do not read .tryout/*.json until new ones are saved.`;
    }
    if (status === 'omit' || files.length === 0) {
        return undefined;
    }
    const headerSuffix = status === 're-injection' ? ` ${CONTEXT_UPDATED}` : '';
    const list = files.map(f => `  - .tryout/${f.name}`).join('\n');
    return `# Tryout payloads${headerSuffix}
The user has saved sample request payloads in .tryout/ (one file per artifact). Use file_read on the relevant file ONLY when you need to reason about runtime inputs (expression mapping, body shape, query/path params, field names) — do not read otherwise. See the system prompt's "Tryout payloads" section for the file format and how to pick the default request.
${list}`;
}

// ============================================================================
// User Prompt Generation
// ============================================================================

/**
 * Generates the user prompt as an array of content blocks.
 *
 * Renders the Handlebars template, then splits the result into separate
 * content blocks at <system-reminder> and <user_query> boundaries.
 * Each <system-reminder> block becomes a separate API content block.
 * The <user_query> content becomes a plain text block (tags stripped).
 *
 * The agent can read any file content on-demand using file_read tool.
 */
export async function getUserPrompt(params: UserPromptParams): Promise<UserPromptContentBlock[]> {
    // Get all files in the project (relative paths from project root)
    const existingFiles = getExistingFiles(params.projectPath, MAX_PROJECT_STRUCTURE_FILES);
    let projectStructure = formatProjectStructure(existingFiles);
    if (existingFiles.length >= MAX_PROJECT_STRUCTURE_FILES) {
        projectStructure += `\n... (project structure truncated to first ${MAX_PROJECT_STRUCTURE_FILES} files)`;
    }
    const fileList = [capProjectStructureLength(projectStructure)];

    // Get currently opened file content
    const currentlyOpenedFile = await getCurrentlyOpenedFile(params.projectPath);

    const mode = params.mode || 'edit';
    // Reuse the pre-built context from agent.ts when available — otherwise
    // fall back to building it here (e.g. tests or callers that haven't run
    // `computeSessionContextBlockHashes` first).
    const sessionContext: { snapshot: SessionContextSnapshot; catalogWarnings: string[]; catalogStoreStatus: string; runtimeVersionResolved: string | null } =
        params.precomputedContext ?? await buildSessionContextSnapshot({
            projectPath: params.projectPath,
            runtimeVersion: params.runtimeVersion,
            webSearchUnavailable: params.webSearchUnavailable,
            loginMethod: params.loginMethod,
            mode,
        });
    const { snapshot } = sessionContext;

    const fullModePolicy = await getModeReminder({ mode });
    const modeBriefNote = getModeBriefNote(mode);
    const planFileReminder = mode === 'plan'
        ? await getPlanModeSessionReminder(params.projectPath, params.sessionId || 'default')
        : '';
    const connectorStoreReminder = sessionContext.catalogWarnings.length > 0
        ? `Connector store status: ${sessionContext.catalogStoreStatus}. ${sessionContext.catalogWarnings.join(' ')}`
        : '';

    const runtimeVersionDetected = params.runtimeVersionDetected ?? !!sessionContext.runtimeVersionResolved;
    const runtimeVersionDetectionWarning = runtimeVersionDetected
        ? ''
        : 'MI runtime version could not be detected. Code examples use modern syntax (MI >= 4.4.0). If your project uses an older MI runtime, specify it explicitly.';

    const blockStatuses = params.blockStatuses ?? DEFAULT_BLOCK_STATUSES;

    const envBlock = buildEnvBlockText(snapshot, blockStatuses.env);
    const connectorsBlock = buildConnectorsBlockText(snapshot, blockStatuses.connectors);
    const webAvailabilityBlock = buildWebAvailabilityBlockText(snapshot, blockStatuses.webAvailability);
    const payloadsBlock = buildPayloadsBlockText(snapshot.tryoutPayloads, blockStatuses.payloads);
    const fullModePolicyBlock = buildFullModePolicyBlockText(
        mode,
        fullModePolicy,
        blockStatuses.modePolicy,
    );
    // Render "[mode changed from PREV]" inline on the mode-header line for any
    // mode transition (not just entering Plan), so the model always sees a
    // diff when the active mode flipped — even for Ask/Edit where the full
    // policy isn't gated.
    const modeChangedFrom = blockStatuses.modePolicy === 're-injection' && params.previousMode
        ? params.previousMode.toUpperCase()
        : undefined;

    const context: Record<string, any> = {
        question: params.query,
        fileList: fileList,
        currentlyOpenedFile: currentlyOpenedFile, // Currently editing file (optional)
        env_block: envBlock,
        connectors_block: connectorsBlock,
        web_availability_block: webAvailabilityBlock,
        payloads_block: payloadsBlock,
        full_mode_policy_block: fullModePolicyBlock,
        runtime_version_detection_warning: runtimeVersionDetectionWarning,
        mode_upper: mode.toUpperCase(),
        mode_brief_note: modeBriefNote,
        mode_changed_from: modeChangedFrom,
        plan_file_reminder: planFileReminder,
        connector_store_reminder: connectorStoreReminder,
    };

    // Render the template and split into content blocks
    const rendered = renderTemplate(PROMPT_TEMPLATE, context);
    return splitPromptIntoBlocks(rendered);
}
