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

import { tool } from 'ai';
import { z } from 'zod';
import { CONNECTOR_DB } from '../context/connectors/connector_db';
import { INBOUND_DB } from '../context/connectors/inbound_db';
import { ToolResult } from './types';
import { logInfo, logDebug, logWarn } from '../../copilot/logger';
import {
    getConnectorStoreCatalog,
    lookupConnectorFromCache,
    isFullArtifactId,
    ConnectorStoreSource,
} from './connector_store_cache';
import {
    getConnectorInfoFromLS,
    getInboundInfoFromLS,
    getLocalInboundCatalog,
    readOutputSchema,
    readOutputSchemaFile,
    LSConnectorResult,
    LSInboundResult,
    LocalInboundCatalogEntry,
} from './connector_ls_client';
import {
    resolveTargetVersion,
    describeVersionSource,
    ResolvedVersion,
    VersionResolutionError,
} from './connector_version';
import { ensureOperationNotAborted, isOperationAbortedError } from './abort-utils';

const NO_OUTPUT_SCHEMA_PLACEHOLDER = 'not available for this operation';

// ============================================================================
// Output schema flattener
// ============================================================================

function inferSchemaNodeType(node: any): string | null {
    if (!node || typeof node !== 'object') return null;
    if (typeof node.type === 'string') return node.type;
    if (Array.isArray(node.type)) return node.type.join('|');
    if (node.properties && typeof node.properties === 'object') return 'object';
    if (node.items) return 'array';
    return null;
}

function walkSchemaProperties(node: any, path: string, out: string[]): void {
    if (!node || typeof node !== 'object') return;

    if (path.length > 0) {
        const desc = typeof node.description === 'string' ? node.description.trim() : '';
        const type = inferSchemaNodeType(node);
        if (desc && type) {
            out.push(`${path} (${type}) — ${desc}`);
        } else if (desc) {
            out.push(`${path} — ${desc}`);
        } else if (type) {
            out.push(`${path} (${type})`);
        }
        // No description and no type → skip to avoid noise entries like `foo.bar`.
    }

    if (node.properties && typeof node.properties === 'object') {
        for (const [key, sub] of Object.entries(node.properties)) {
            const nextPath = path ? `${path}.${key}` : key;
            walkSchemaProperties(sub, nextPath, out);
        }
    }
    if (node.items && typeof node.items === 'object' && !Array.isArray(node.items)) {
        walkSchemaProperties(node.items, `${path}[]`, out);
    }
}

/**
 * Flatten a JSON Schema (draft-07-ish) into a list of `path (type) — description`
 * entries. Agents don't need the full schema envelope (`$schema`, `title`, etc.) —
 * just the available field paths and their purpose.
 *
 * Returns null when the input isn't a walkable object or produces no entries.
 */
function flattenOutputSchema(schema: any): string[] | null {
    if (!schema || typeof schema !== 'object') return null;
    const out: string[] = [];
    walkSchemaProperties(schema, '', out);
    return out.length > 0 ? out : null;
}

// ============================================================================
// Utility Functions
// ============================================================================

function normalizeIdentifier(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim().toLowerCase();
}

function normalizeSelectionNames(names: unknown): string[] {
    if (!Array.isArray(names)) {
        return [];
    }
    return Array.from(
        new Set(
            names
                .map((name) => normalizeIdentifier(name))
                .filter((name) => name.length > 0)
        )
    );
}

/**
 * Derive initialization flags from LS connector result.
 *
 * Three patterns observed from `synapse/getConnectorInfo`:
 *  - Connection-based (e.g. HTTP): `connections.length > 0`; the LS also
 *    surfaces an `init` operation but marks it `isHidden: true` — that is
 *    the connection initializer and belongs in a localEntry, referenced
 *    via `configKey` from operations. We must NOT treat the hidden init
 *    op as a signal for inline init.
 *  - Inline-init module (e.g. mi-module-fhirbase): `connections.length === 0`
 *    with a visible `init` operation that callers invoke inline inside a
 *    sequence before other operations.
 *  - Stateless: `connections.length === 0` and no visible `init` op —
 *    operations are called directly.
 */
function deriveInitFlags(lsResult: LSConnectorResult): { connectionLocalEntryNeeded: boolean; noInitializationNeeded: boolean } {
    const hasConnections = lsResult.connections.length > 0;
    const hasVisibleInitOp = lsResult.operations.some(
        a => normalizeIdentifier(a.name) === 'init' && !a.isHidden
    );
    const connectionLocalEntryNeeded = hasConnections;
    const noInitializationNeeded = !hasConnections && !hasVisibleInitOp;
    return { connectionLocalEntryNeeded, noInitializationNeeded };
}

/**
 * Look up a connector/inbound in the static DB for maven coords and repoName.
 * Used only for metadata that the LS doesn't provide (repoName for DeepWiki).
 */
function findInStaticDB(name: string): any | null {
    const normalized = normalizeIdentifier(name);
    if (normalized.length === 0) return null;

    // Fully-qualified artifact id ("mi-inbound-file") must match exactly — otherwise
    // stripped matching incorrectly collapses "mi-inbound-file" and "mi-connector-file"
    // to the same "file" and picks whichever DB comes first.
    if (isFullArtifactId(normalized)) {
        return CONNECTOR_DB.find(c => normalizeIdentifier(c.mavenArtifactId) === normalized)
            || INBOUND_DB.find(c => normalizeIdentifier(c.mavenArtifactId) === normalized)
            || null;
    }

    // Bare name ("file", "File Connector") — loose match on name or stripped artifact id.
    const stripped = normalized.replace(/^(mi-(connector|module|inbound)|esb-connector)-/, '');
    return CONNECTOR_DB.find(c =>
        normalizeIdentifier(c.connectorName) === normalized
        || normalizeIdentifier(c.mavenArtifactId) === normalized
        || normalizeIdentifier(c.connectorName) === stripped
        || normalizeIdentifier(c.mavenArtifactId) === stripped
    ) || INBOUND_DB.find(c =>
        normalizeIdentifier(c.connectorName) === normalized
        || normalizeIdentifier(c.mavenArtifactId) === normalized
        || normalizeIdentifier(c.connectorName) === stripped
        || normalizeIdentifier(c.mavenArtifactId) === stripped
    ) || null;
}

export type IdentifierKind = 'bundled-inbound' | 'maven-inbound' | 'connector';

/**
 * Tool modes:
 *  - 'summary'   (default): high-level info — artifact id, version, init semantics,
 *                operation names, connection type names, extracted path.
 *  - 'details':   rich details for specific operation_names / connection_names
 *                (connectors) or parameter_names (inbounds). At least one of those
 *                arrays must be provided. Does NOT repeat summary fields.
 *  - 'catalog': force-refresh the connector store catalog and return the
 *                available artifact ids (connectors, downloadable inbounds, bundled
 *                inbounds). No artifact_id required.
 */
export type ConnectorToolMode = 'summary' | 'details' | 'catalog';

/**
 * Classify an identifier by shape. User-specified rule:
 *  - Single "word" (no hyphen, no slash) → bundled inbound (e.g. "http", "jms")
 *  - Contains the substring "inbound"    → downloadable (maven) inbound (e.g. "mi-inbound-amazonsqs")
 *  - Otherwise                            → connector (e.g. "mi-connector-redis", "mi-module-fhirbase")
 *
 * This runs on the raw artifact_id from the tool call, before any cache lookup.
 */
export function classifyIdentifier(identifier: string): IdentifierKind {
    const id = typeof identifier === 'string' ? identifier.trim().toLowerCase() : '';
    if (id.length === 0) {
        return 'connector'; // caller handles the empty-input error earlier
    }
    if (!id.includes('-') && !id.includes('/')) {
        return 'bundled-inbound';
    }
    if (id.includes('inbound')) {
        return 'maven-inbound';
    }
    return 'connector';
}

// ============================================================================
// Output Builders
// ============================================================================

/**
 * Build the per-connector init-mode `<system-reminder>` string.
 * Shared between the summary and deep-details outputs.
 */
function buildInitModeReminder(name: string, lsResult: LSConnectorResult): string {
    const { connectionLocalEntryNeeded, noInitializationNeeded } = deriveInitFlags(lsResult);
    // lsResult.name is the authoritative connector XML prefix (e.g. "redis",
    // "salesforce") as declared by the language server. Fall back to
    // normalizing the caller's artifact id with common Maven/group prefixes
    // stripped when LS didn't populate a name.
    const xmlPrefix = resolveConnectorXmlPrefix(name, lsResult);
    let body: string;
    if (noInitializationNeeded) {
        body = `For this connector, no init is required. Call operations directly, no .init or localEntry required.`;
    } else if (connectionLocalEntryNeeded) {
        body = `For this connector, localEntry init is required. Create a local entry with <${xmlPrefix}.init>, use configKey in operations (the key of the local entry).`;
    } else {
        body = `For this connector, inline init is required. Call <${xmlPrefix}.init> before using any connector operation. No localEntry required.`;
    }
    return `<system-reminder>${body} Call get_connector_info with mode='details' and specific operation_names for richer operation details before writing XML. Use add_or_remove_connector to add the connector to the project.</system-reminder>\n`;
}

function resolveConnectorXmlPrefix(name: string, lsResult: LSConnectorResult): string {
    const lsName = typeof lsResult.name === 'string' ? lsResult.name.trim() : '';
    if (lsName.length > 0) {
        return lsName;
    }
    return normalizeIdentifier(name).replace(/^mi-(?:connector|module|inbound)-/, '');
}

/**
 * Build a high-level summary from LS data + static DB metadata.
 */
export function buildLSHighLevelSummary(
    name: string,
    lsResult: LSConnectorResult,
    dbEntry: any | null,
    resolvedVersion?: ResolvedVersion,
): string {
    const { connectionLocalEntryNeeded, noInitializationNeeded } = deriveInitFlags(lsResult);

    const connectionTypes = lsResult.connections.map(c => c.name).filter(n => n.length > 0);
    const visibleActions = lsResult.operations.filter(a => !a.isHidden);

    let message = buildInitModeReminder(name, lsResult);

    // Header
    message += `### ${lsResult.displayName || name}\n`;

    // GitHub repo from static DB (for DeepWiki)
    const repoName = dbEntry?.repoName;
    if (repoName) {
        message += `- GitHub: wso2-extensions/${repoName}\n`;
    }

    // Maven coordinate
    const groupId = dbEntry?.mavenGroupId || lsResult.packageName || 'unknown';
    const artifactId = dbEntry?.mavenArtifactId || lsResult.artifactId || 'unknown';
    message += `- Maven: ${groupId}:${artifactId}\n`;

    // Version from LS (authoritative for what was actually loaded)
    message += `- Version: ${lsResult.version || 'unknown'}\n`;

    // Where the requested version came from (pom / latest / explicit override)
    if (resolvedVersion) {
        message += `- Version source: ${describeVersionSource(resolvedVersion)}\n`;
    }

    // Init flags
    message += `- Init: ${noInitializationNeeded ? 'none required' : connectionLocalEntryNeeded ? 'localEntry + configKey' : 'in-sequence init'}\n`;

    // Connection types
    if (connectionTypes.length > 0) {
        message += `- Connection Types: ${connectionTypes.join(', ')}\n`;
    }

    // Operations
    const agentActions = visibleActions.filter(a => a.canActAsAgentTool);
    if (agentActions.length > 0) {
        message += `- Operations: ${agentActions.map(a => a.name).join(', ')}\n`;
    } else {
        message += `- Operations: none available\n`;
    }

    // Absolute path to the extracted connector — agents can file_read / grep
    // uischemas and output schemas directly without needing a details call.
    if (lsResult.extractedConnectorPath) {
        message += `- Extracted: ${lsResult.extractedConnectorPath}\n`;
    }

    return message;
}

/**
 * Build deep operation details from LS data.
 */
async function buildLSOperationDetails(
    name: string,
    lsResult: LSConnectorResult,
    requestedOperations: string[],
    requestedConnections: string[],
    warnings: Set<string>,
    mainAbortSignal?: AbortSignal,
): Promise<Record<string, any> | null> {
    const selectedOperations: any[] = [];
    const selectedConnections: any[] = [];

    // Process requested operations. Hidden ops (e.g. the connection
    // initializer surfaced as a hidden `init` for connection-based
    // connectors) must not leak into tool output, even if the agent
    // explicitly asks for them by name — treat them as not found.
    for (const reqOp of requestedOperations) {
        ensureOperationNotAborted(mainAbortSignal, `reading schema for '${name}.${reqOp}'`);
        const action = lsResult.operations.find(
            a => normalizeIdentifier(a.name) === reqOp && !a.isHidden
        );

        if (!action) {
            warnings.add(`Requested operation '${reqOp}' was not found for '${name}'.`);
            continue;
        }

        // Try to read output schema. Three states:
        //  1. action declares an outputSchemaPath AND the file reads + parses → flatten to `path (type) — description` lines
        //  2. action declares an outputSchemaPath BUT the file is missing/unreadable → warn (likely a bug), use placeholder
        //  3. action does NOT declare an outputSchemaPath → use placeholder (legacy/operation-style connectors)
        let outputSchema: any = NO_OUTPUT_SCHEMA_PLACEHOLDER;
        if (action.outputSchemaPath) {
            // Prefer the operation's own outputSchemaPath when set — it's a full
            // file path to the per-operation schema. Falling back to the
            // connector-level directory + <action.name>.json only covers
            // connectors that follow the default layout; some connectors ship
            // schemas at non-standard locations. In both cases the read is
            // constrained to a trusted connector-level base dir so a rogue
            // per-op path can't escape via symlink. If no trusted base is
            // known, fall back to extractedConnectorPath so we never pass
            // undefined and silently bypass the check.
            const schemaBaseDir =
                lsResult.outputSchemaPath
                || lsResult.extractedConnectorPath
                || '';
            if (!schemaBaseDir) {
                logWarn(`[ConnectorTool] No trusted base dir for '${name}.${action.name}' — skipping output schema read.`);
            } else {
                let parsed = await readOutputSchemaFile(action.outputSchemaPath, schemaBaseDir);
                // Re-check after each await — the schema read can block on
                // disk I/O, so we need a checkpoint to detect an abort that
                // fired during the await before we use `parsed` or emit
                // anything referencing this operation.
                ensureOperationNotAborted(mainAbortSignal, `reading schema for '${name}.${action.name}'`);
                if (parsed === null && lsResult.outputSchemaPath) {
                    parsed = await readOutputSchema(
                        lsResult.outputSchemaPath,
                        action.name
                    );
                    ensureOperationNotAborted(mainAbortSignal, `reading schema for '${name}.${action.name}'`);
                }
                if (parsed !== null) {
                    outputSchema = flattenOutputSchema(parsed) ?? NO_OUTPUT_SCHEMA_PLACEHOLDER;
                } else {
                    logWarn(`[ConnectorTool] Output schema declared for '${name}.${action.name}' but could not be read at '${action.outputSchemaPath}' or '${lsResult.outputSchemaPath}/${action.name}.json'`);
                }
            }
        }

        selectedOperations.push({
            name: action.name,
            description: action.description,
            supportsResponseModel: action.supportsResponseModel,
            canActAsAgentTool: action.canActAsAgentTool,
            allowedConnectionTypes: action.allowedConnectionTypes,
            parameters: action.parameters.map(p => ({
                name: p.name,
                description: p.description,
                required: p.required,
                type: p.xsdType,
                ...(p.defaultValue !== undefined ? { defaultValue: p.defaultValue } : {}),
            })),
            outputSchema,
            ...(action.uiSchemaPath ? { uiSchemaPath: action.uiSchemaPath } : {}),
            ...(action.outputSchemaPath ? { outputSchemaPath: action.outputSchemaPath } : {}),
        });
    }

    // Process requested connections — return full connection objects with parameters.
    for (const reqConn of requestedConnections) {
        ensureOperationNotAborted(mainAbortSignal, `reading connection '${name}.${reqConn}'`);
        const match = lsResult.connections.find(
            c => normalizeIdentifier(c.name) === reqConn
        );

        if (!match) {
            warnings.add(`Requested connection '${reqConn}' was not found for '${name}'.`);
            continue;
        }

        selectedConnections.push({
            name: match.name,
            displayName: match.displayName,
            description: match.description,
            uiSchemaPath: match.uiSchemaPath,
            parameters: match.parameters.map(p => ({
                name: p.name,
                description: p.description,
                required: p.required,
                type: p.xsdType,
                ...(p.defaultValue !== undefined ? { defaultValue: p.defaultValue } : {}),
            })),
        });
    }

    if (selectedOperations.length === 0 && selectedConnections.length === 0) {
        return null;
    }

    // Slim payload: details mode assumes the summary was already shown, so we do NOT
    // repeat name / maven / version / extractedConnectorPath / init flags here.
    const payload: Record<string, any> = {};
    if (selectedOperations.length > 0) {
        payload.operations = selectedOperations;
    }
    if (selectedConnections.length > 0) {
        payload.connections = selectedConnections;
    }
    return payload;
}

// ============================================================================
// Inbound rendering (parallel to the connector path)
// ============================================================================

/**
 * Build the high-level summary for an inbound endpoint result.
 * No init-mode reminder — inbounds don't have connections / init semantics.
 */
export function buildInboundSummary(
    identifier: string,
    ls: LSInboundResult,
    dbEntry: any | null,
    resolvedVersion?: ResolvedVersion,
): string {
    const visibleParams = ls.parameters;
    const paramList = visibleParams
        .map(p => `${p.name}${p.required ? '*' : ''}`)
        .join(', ');

    let message = `### ${ls.displayName || ls.name || identifier}\n`;

    if (ls.description) {
        message += `- Description: ${ls.description}\n`;
    }
    message += `- Source: ${ls.source}\n`;

    if (ls.source === 'downloaded') {
        const groupId = dbEntry?.mavenGroupId || 'unknown';
        const artifactId = dbEntry?.mavenArtifactId || identifier;
        message += `- Maven: ${groupId}:${artifactId}\n`;
        if (resolvedVersion) {
            message += `- Version: ${resolvedVersion.version}\n`;
            message += `- Version source: ${describeVersionSource(resolvedVersion)}\n`;
        }
    } else {
        // Bundled inbounds have no version; the id is the stable identifier.
        message += `- Id: ${ls.id}\n`;
    }

    if (ls.type) {
        message += `- Type: ${ls.type}\n`;
    }
    message += `- Parameters (${visibleParams.length}, * = required): ${paramList || 'none'}\n`;
    return message;
}

/**
 * Build deep parameter details for an inbound endpoint. Returns a JSON-friendly object
 * or null if the agent didn't request specific parameters and there's nothing to add
 * beyond the summary.
 */
function buildInboundDetails(
    identifier: string,
    ls: LSInboundResult,
    requestedParams: string[],
    warnings: Set<string>,
): Record<string, any> | null {
    let selected = ls.parameters;
    if (requestedParams.length > 0) {
        const wanted = new Set(requestedParams);
        selected = [];
        for (const p of ls.parameters) {
            if (wanted.has(normalizeIdentifier(p.name))) {
                selected.push(p);
            }
        }
        for (const req of requestedParams) {
            if (!ls.parameters.some(p => normalizeIdentifier(p.name) === req)) {
                warnings.add(`Requested parameter '${req}' was not found for inbound '${identifier}'.`);
            }
        }
        if (selected.length === 0) {
            return null;
        }
    }

    // Slim payload: details mode assumes the summary was already shown, so we do NOT
    // repeat name / id / source / type / maven here.
    return {
        parameters: selected.map(p => ({
            name: p.name,
            description: p.description,
            required: p.required,
            type: p.xsdType,
        })),
    };
}

function renderInboundOutput(
    identifier: string,
    ls: LSInboundResult,
    dbEntry: any | null,
    mode: ConnectorToolMode,
    requestedParameters: string[],
    resolvedVersion: ResolvedVersion | undefined,
    warningSet: Set<string>,
): string {
    let message: string;
    if (mode === 'details') {
        const detail = buildInboundDetails(identifier, ls, requestedParameters, warningSet);
        message = detail
            ? `Inbound details:\n\`\`\`json\n${JSON.stringify(detail, null, 2)}\n\`\`\`\n`
            : '';
    } else {
        message = buildInboundSummary(identifier, ls, dbEntry, resolvedVersion);
    }
    const warnings = Array.from(warningSet);
    if (warnings.length > 0) {
        message = `Warnings: ${warnings.join(' | ')}\n\n${message}`;
    }
    return message;
}

// ============================================================================
// Catalog Functions (store with fallbacks to static DB)
// ============================================================================

export interface AvailableConnectorCatalog {
    // Maven artifact ids from the connector store (e.g. "mi-connector-redis").
    connectorArtifactIds: string[];
    // Maven artifact ids from the connector store for downloadable inbound endpoints
    // (e.g. "mi-inbound-amazonsqs").
    inboundArtifactIds: string[];
    // Bundled inbound ids from the MI runtime (e.g. "http", "jms"). Runtime-dependent.
    bundledInboundIds: string[];
    storeStatus: 'healthy' | 'degraded';
    warnings: string[];
    runtimeVersionUsed: string;
    source: {
        connectors: ConnectorStoreSource;
        inbounds: ConnectorStoreSource;
    };
}

function toArtifactIds(items: any[]): string[] {
    const ids = new Set<string>();
    for (const item of items) {
        const id = item?.mavenArtifactId;
        if (typeof id === 'string' && id.length > 0) {
            ids.add(id);
        }
    }
    return Array.from(ids);
}

export async function getAvailableConnectorCatalog(projectPath: string): Promise<AvailableConnectorCatalog> {
    const [catalog, localInbound] = await Promise.all([
        getConnectorStoreCatalog(projectPath, CONNECTOR_DB, INBOUND_DB),
        getLocalInboundCatalog(projectPath),
    ]);
    return {
        connectorArtifactIds: toArtifactIds(catalog.connectors),
        inboundArtifactIds: toArtifactIds(catalog.inbounds),
        bundledInboundIds: localInbound.bundled.map(b => b.id),
        storeStatus: catalog.storeStatus,
        warnings: catalog.warnings,
        runtimeVersionUsed: catalog.runtimeVersionUsed,
        source: catalog.source,
    };
}

export async function getAvailableConnectors(projectPath: string): Promise<string[]> {
    const catalog = await getAvailableConnectorCatalog(projectPath);
    return catalog.connectorArtifactIds;
}

export async function getAvailableInboundEndpoints(projectPath: string): Promise<string[]> {
    const catalog = await getAvailableConnectorCatalog(projectPath);
    return catalog.inboundArtifactIds;
}

export async function getAvailableBundledInbounds(projectPath: string): Promise<string[]> {
    const catalog = await getAvailableConnectorCatalog(projectPath);
    return catalog.bundledInboundIds;
}

/**
 * Reverse lookup: given an artifact id, return a friendly display name if the
 * store cache / static DB / bundled catalog knows it. Used by tool-action-mapper
 * and UI to show "fetching Redis" instead of "fetching mi-connector-redis".
 *
 * Returns null if unknown — caller should fall back to the raw id.
 */
export async function findDisplayNameForArtifactId(
    projectPath: string,
    artifactId: string
): Promise<string | null> {
    const trimmed = typeof artifactId === 'string' ? artifactId.trim() : '';
    if (trimmed.length === 0) {
        return null;
    }
    const { item } = await lookupConnectorFromCache(projectPath, trimmed, CONNECTOR_DB, INBOUND_DB);
    if (item?.connectorName) {
        return item.connectorName;
    }
    const bundled = findInStaticDB(trimmed);
    if (bundled?.connectorName) {
        return bundled.connectorName;
    }
    // Try bundled inbound list (id → name). Compare case-insensitively because
    // the LS can return bundled ids with mixed casing (e.g. "HTTP", "jms").
    const local = await getLocalInboundCatalog(projectPath);
    const normalizedTrimmed = trimmed.toLowerCase();
    const match = local.bundled.find((b: LocalInboundCatalogEntry) =>
        typeof b.id === 'string' && b.id.toLowerCase() === normalizedTrimmed
    );
    return match?.name ?? null;
}

// ============================================================================
// Execute Function Type
// ============================================================================

export type ConnectorExecuteFn = (args: {
    mode?: ConnectorToolMode;
    artifact_id?: string;
    operation_names?: string[];
    connection_names?: string[];
    parameter_names?: string[];
    version?: string;
}) => Promise<ToolResult>;

// ============================================================================
// Catalog mode renderer
// ============================================================================

async function renderCatalogOutput(projectPath: string): Promise<string> {
    const [catalog, localInbound] = await Promise.all([
        getConnectorStoreCatalog(projectPath, CONNECTOR_DB, INBOUND_DB, { forceRefresh: true }),
        getLocalInboundCatalog(projectPath),
    ]);
    const connectorIds = toArtifactIds(catalog.connectors);
    const inboundIds = toArtifactIds(catalog.inbounds);
    const bundledIds = localInbound.bundled.map(b => b.id);

    let message = `### Connector catalog (refreshed)\n`;
    message += `- Runtime version used: ${catalog.runtimeVersionUsed}\n`;
    message += `- Store status: ${catalog.storeStatus} (connectors=${catalog.source.connectors}, inbounds=${catalog.source.inbounds})\n`;
    message += `- Connectors (${connectorIds.length}): ${connectorIds.join(', ') || 'none'}\n`;
    message += `- Downloadable inbound endpoints (${inboundIds.length}): ${inboundIds.join(', ') || 'none'}\n`;
    message += `- Bundled inbound ids (${bundledIds.length}): ${bundledIds.join(', ') || 'none'}\n`;

    if (catalog.warnings.length > 0) {
        message = `Warnings: ${catalog.warnings.join(' | ')}\n\n${message}`;
    }
    return message;
}

// ============================================================================
// Execute Function
// ============================================================================

/**
 * Creates the execute function for get_connector_info tool.
 *
 * Three modes:
 *  - 'summary' (default): high-level info for a single artifact_id.
 *  - 'details': rich details for specific operation_names / connection_names (connectors)
 *              or parameter_names (inbounds). Requires at least one selection.
 *  - 'catalog': force-refresh the connector store and return available ids.
 *
 * Identifier is a Maven artifact id ("mi-connector-redis") or a bundled inbound id ("jms").
 * Classification picks one of three branches — see `classifyIdentifier`.
 */
export function createConnectorExecute(projectPath: string, mainAbortSignal?: AbortSignal): ConnectorExecuteFn {
    return async (args: {
        mode?: ConnectorToolMode;
        artifact_id?: string;
        operation_names?: string[];
        connection_names?: string[];
        parameter_names?: string[];
        version?: string;
    }): Promise<ToolResult> => {
        const {
            mode = 'summary',
            artifact_id,
            operation_names = [],
            connection_names = [],
            parameter_names = [],
            version,
        } = args;

        // --- Catalog mode: no artifact_id required ---
        if (mode === 'catalog') {
            try {
                ensureOperationNotAborted(mainAbortSignal, 'refreshing connector catalog');
                const message = await renderCatalogOutput(projectPath);
                // Re-check after the async call — the catalog fetch itself can
                // block on HTTP, so we need a second checkpoint to detect an
                // abort that fired during the await.
                ensureOperationNotAborted(mainAbortSignal, 'refreshing connector catalog');
                logDebug(`[ConnectorTool] Catalog refreshed`);
                return { success: true, message };
            } catch (err) {
                // Aborts must propagate so the agent run halts; converting
                // them to a tool failure would feed the error back into the
                // loop and risk a retry after the user already interrupted.
                if (isOperationAbortedError(err)) {
                    throw err;
                }
                const msg = err instanceof Error ? err.message : String(err);
                return {
                    success: false,
                    message: `Failed to refresh connector catalog: ${msg}`,
                    error: `Error: ${msg}`,
                };
            }
        }

        const requestedId = typeof artifact_id === 'string' ? artifact_id.trim() : '';
        if (requestedId.length === 0) {
            return {
                success: false,
                message: `Provide artifact_id for mode='${mode}'.`,
                error: `Error: Missing artifact_id for get_connector_info (mode='${mode}')`,
            };
        }

        const requestedOperations = normalizeSelectionNames(operation_names);
        const requestedConnections = normalizeSelectionNames(connection_names);
        const requestedParameters = normalizeSelectionNames(parameter_names);
        const warningSet = new Set<string>();
        const kind = classifyIdentifier(requestedId);

        // --- Details mode hard requirement: at least one selection list. ---
        if (mode === 'details') {
            const needsOpsOrConns = kind === 'connector';
            const needsParams = kind === 'bundled-inbound' || kind === 'maven-inbound';
            const hasOpsOrConns = requestedOperations.length > 0 || requestedConnections.length > 0;
            const hasParams = requestedParameters.length > 0;
            if (needsOpsOrConns && !hasOpsOrConns) {
                return {
                    success: false,
                    message: `mode='details' for connectors requires at least one of operation_names or connection_names.`,
                    error: `Error: 'details' mode requires operation_names or connection_names for connectors`,
                };
            }
            if (needsParams && !hasParams) {
                return {
                    success: false,
                    message: `mode='details' for inbound endpoints requires parameter_names.`,
                    error: `Error: 'details' mode requires parameter_names for inbound endpoints`,
                };
            }
        }

        logInfo(`[ConnectorTool] mode=${mode} artifact_id=${requestedId} kind=${kind} version_override=${version ?? '(default)'}`);

        // --- Bundled inbound branch: no cache lookup, no version resolution ---
        if (kind === 'bundled-inbound') {
            if (typeof version === 'string' && version.trim().length > 0) {
                warningSet.add(`Bundled inbound endpoints have no version concept — override '${version}' ignored.`);
            }
            if (requestedOperations.length > 0 || requestedConnections.length > 0) {
                warningSet.add('operation_names and connection_names apply only to connectors. Use parameter_names for inbound endpoints.');
            }

            ensureOperationNotAborted(mainAbortSignal, `loading bundled inbound '${requestedId}'`);
            const inboundRes = await getInboundInfoFromLS(projectPath, { id: requestedId });
            if ('error' in inboundRes) {
                return {
                    success: false,
                    message: `Bundled inbound endpoint '${requestedId}' not found. ${inboundRes.error}`,
                    error: `Error: ${inboundRes.error}`,
                };
            }

            const message = renderInboundOutput(
                requestedId,
                inboundRes,
                null,
                mode,
                requestedParameters,
                undefined,
                warningSet,
            );
            return { success: true, message };
        }

        // --- Maven-inbound / Connector branch ---
        // Step 1: Look up maven coords from store cache (primary), fall back to static DB.
        ensureOperationNotAborted(mainAbortSignal, `looking up store metadata for '${requestedId}'`);
        const { item: storeItem } = await lookupConnectorFromCache(
            projectPath,
            requestedId,
            CONNECTOR_DB,
            INBOUND_DB
        );
        const dbEntry = storeItem ?? findInStaticDB(requestedId);

        if (!dbEntry) {
            return {
                success: false,
                message: `Artifact id '${requestedId}' was not found in the connector store or the local static catalog. Use mode='catalog' to refresh, or check the <AVAILABLE_*> lists in the system reminder.`,
                error: `Error: Unknown artifact id '${requestedId}'`,
            };
        }

        const groupId = typeof dbEntry.mavenGroupId === 'string' ? dbEntry.mavenGroupId : '';
        const artifactId = typeof dbEntry.mavenArtifactId === 'string' ? dbEntry.mavenArtifactId : '';
        const latestVersion = typeof dbEntry.version?.tagName === 'string' ? dbEntry.version.tagName : '';

        if (!groupId || !artifactId) {
            return {
                success: false,
                message: `'${requestedId}' is missing Maven coordinates in the store/DB — cannot fetch via LS.`,
                error: `Error: Incomplete maven coords for '${requestedId}'`,
            };
        }

        // Step 2: Resolve target version (pom-or-latest default).
        ensureOperationNotAborted(mainAbortSignal, `resolving version for '${requestedId}'`);
        let resolvedVersion: ResolvedVersion;
        try {
            resolvedVersion = await resolveTargetVersion(
                projectPath,
                { name: requestedId, groupId, artifactId, latestVersion },
                version,
                'pom-or-latest'
            );
        } catch (err) {
            if (err instanceof VersionResolutionError) {
                return {
                    success: false,
                    message: err.message,
                    error: `Error: ${err.message}`,
                };
            }
            throw err;
        }

        // Step 3: Single LS call, branching on inbound vs connector.
        if (kind === 'maven-inbound') {
            if (requestedOperations.length > 0 || requestedConnections.length > 0) {
                warningSet.add('operation_names and connection_names apply only to connectors. Use parameter_names for inbound endpoints.');
            }
            ensureOperationNotAborted(mainAbortSignal, `loading inbound '${requestedId}' from LS`);
            const inboundRes = await getInboundInfoFromLS(projectPath, {
                groupId, artifactId, version: resolvedVersion.version,
            });
            if ('error' in inboundRes) {
                return {
                    success: false,
                    message: `Failed to load inbound '${requestedId}' at ${resolvedVersion.version}: ${inboundRes.error}`,
                    error: `Error: ${inboundRes.error}`,
                };
            }

            const message = renderInboundOutput(
                requestedId,
                inboundRes,
                dbEntry,
                mode,
                requestedParameters,
                resolvedVersion,
                warningSet,
            );
            logDebug(`[ConnectorTool] Retrieved maven-inbound: ${requestedId}@${resolvedVersion.version}`);
            return { success: true, message };
        }

        // Connector branch
        ensureOperationNotAborted(mainAbortSignal, `loading connector '${requestedId}' from LS`);
        const connectorRes = await getConnectorInfoFromLS(projectPath, groupId, artifactId, resolvedVersion.version);
        if ('error' in connectorRes) {
            return {
                success: false,
                message: `Failed to load connector '${requestedId}' at ${resolvedVersion.version}: ${connectorRes.error}`,
                error: `Error: ${connectorRes.error}`,
            };
        }

        let message: string;
        if (mode === 'details') {
            const detailPayload = await buildLSOperationDetails(
                requestedId,
                connectorRes,
                requestedOperations,
                requestedConnections,
                warningSet,
                mainAbortSignal,
            );
            message = detailPayload
                ? `Connector details:\n\`\`\`json\n${JSON.stringify(detailPayload, null, 2)}\n\`\`\`\n`
                : '';
        } else {
            message = buildLSHighLevelSummary(requestedId, connectorRes, dbEntry, resolvedVersion);
        }

        const warnings = Array.from(warningSet);
        if (warnings.length > 0) {
            message = `Warnings: ${warnings.join(' | ')}\n\n${message}`;
        }

        logDebug(`[ConnectorTool] Retrieved connector: ${requestedId}@${resolvedVersion.version} mode=${mode}`);
        return { success: true, message };
    };
}

// ============================================================================
// Tool Definition (Vercel AI SDK format)
// ============================================================================

const connectorInputSchema = z.object({
    mode: z.enum(['summary', 'details', 'catalog'])
        .optional()
        .default('summary')
        .describe(
            "Tool mode. 'summary' (default): high-level info for one artifact_id — operations, connection type names, init flags, extracted path. " +
            "'details': rich details for selected operation_names / connection_names (connectors) or parameter_names (inbounds); requires at least one of those. " +
            "Does NOT repeat summary fields — call 'summary' first. " +
            "'catalog': force-refresh the connector store and list available artifact ids; artifact_id and the *_names are ignored. Use when the <AVAILABLE_*> reminder looks stale."
        ),
    artifact_id: z.string()
        .optional()
        .describe(
            "Maven artifact id for a connector or downloadable inbound endpoint " +
            "(e.g. \"mi-connector-redis\",\"esb-connector-salesforce\", \"mi-module-fhirbase\", \"mi-inbound-amazonsqs\"), " +
            "OR a bundled inbound id (e.g. \"http\", \"jms\", \"rabbitmq\", \"mqtt\", \"hl7\"). " +
            "Classification by shape: single-word (no hyphen) → bundled inbound; contains \"inbound\" → downloadable inbound; otherwise → connector. " +
            "Pull ids from the <AVAILABLE_*> reminder."
        ),
    operation_names: z.array(z.string())
        .optional()
        .describe("Connectors + mode='details'. Operation names to deeply describe — returns xsdType/required/allowedConnectionTypes/outputSchema plus uiSchemaPath and outputSchemaPath per op. Example: [\"sendMail\",\"readMail\"]."),
    connection_names: z.array(z.string())
        .optional()
        .describe("Connectors + mode='details'. Connection type names to deeply describe — returns each connection's parameters (name/description/required/xsdType/defaultValue) and uiSchemaPath. Example: [\"GMAIL_CONNECTION\"]."),
    parameter_names: z.array(z.string())
        .optional()
        .describe("Inbound endpoints (bundled or downloadable) + mode='details'. Parameter names to deeply describe. Example: [\"destination\",\"accessKey\"]."),
    version: z.string()
        .optional()
        .describe("Optional version selector for summary/details. Accepts a concrete version string (e.g. \"3.1.6\"), the literal \"latest\" (force the store-cache latest), or \"pom\" (force the version currently declared in the project pom.xml — errors if the artifact is not in pom). When omitted, defaults to \"pom if declared, else latest\". Bundled inbound endpoints ignore this field (they have no version)."),
});

/**
 * Creates the get_connector_info tool
 */
export function createConnectorTool(execute: ConnectorExecuteFn) {
    return (tool as any)({
        description: `Info about MI connectors, downloadable inbound endpoints, and bundled inbound endpoints. The LS downloads + parses on demand.
            In details output, each operation's outputSchema is a flat list of "path (type) — description" lines, or the placeholder "${NO_OUTPUT_SCHEMA_PLACEHOLDER}" — do not retry.
            Does NOT add the artifact to the project — use add_or_remove_connector for that.
            Call in parallel for multiple artifacts.`,
        inputSchema: connectorInputSchema,
        execute
    });
}
