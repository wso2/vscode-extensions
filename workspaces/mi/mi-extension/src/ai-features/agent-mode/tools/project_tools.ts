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
import { ToolResult } from './types';
import { MiVisualizerRpcManager } from '../../../rpc-managers/mi-visualizer/rpc-manager';
import { MILanguageClient } from '../../../lang-client/activator';
import { DependencyDetails } from '@wso2/mi-core';
import { logDebug, logError } from '../../copilot/logger';
import { AgentUndoCheckpointManager } from '../undo/checkpoint-manager';
import { lookupConnectorFromCache } from './connector_store_cache';
import { ensureOperationNotAborted, isOperationAbortedError } from './abort-utils';
import { CONNECTOR_DB } from '../context/connectors/connector_db';
import { INBOUND_DB } from '../context/connectors/inbound_db';
import {
    resolveTargetVersion,
    describeVersionSource,
    VersionResolutionError,
    ResolvedVersion,
} from './connector_version';
import { classifyIdentifier } from './connector_tools';

// ============================================================================
// Execute Function Types
// ============================================================================

export type ManageConnectorExecuteFn = (args: {
    operation: 'add' | 'remove';
    connector_artifact_ids?: string[];
    inbound_artifact_ids?: string[];
    versions?: Record<string, string>;
}) => Promise<ToolResult>;

interface ProcessItemResult {
    name: string;
    type: 'connector' | 'inbound';
    success: boolean;
    alreadyAdded?: boolean;
    error?: string;
    versionUsed?: string;
    versionSource?: string;
}

/**
 * Look up a per-item version override from the user-supplied map. The map is
 * keyed by the Maven artifact id the agent passed in (e.g. "mi-connector-redis"
 * or "mi-inbound-amazonsqs"), but we accept case-insensitive lookups too — the
 * agent isn't always consistent about casing.
 */
function pickVersionOverride(
    versions: Record<string, string> | undefined,
    itemId: string
): string | undefined {
    if (!versions) {
        return undefined;
    }
    if (Object.prototype.hasOwnProperty.call(versions, itemId)) {
        return versions[itemId];
    }
    const lower = itemId.trim().toLowerCase();
    for (const key of Object.keys(versions)) {
        if (key.trim().toLowerCase() === lower) {
            return versions[key];
        }
    }
    return undefined;
}

/**
 * Resolve a version string for the remove path. The underlying RPC ignores
 * the version (it matches pom entries by groupId + artifact only), but the
 * DependencyDetails shape still requires a string. This helper tries, in
 * order: an explicit override, the pom-declared version, the latest from
 * the store cache, and finally an empty placeholder. It never throws —
 * a remove must not fail just because version metadata is stale/offline.
 */
async function resolveRemoveVersion(
    projectPath: string,
    target: { name: string; groupId: string; artifactId: string; latestVersion: string },
    versionOverride: string | undefined
): Promise<ResolvedVersion> {
    const override = typeof versionOverride === 'string' ? versionOverride.trim() : '';
    // Explicit override wins, whether it's a concrete version or 'pom'/'latest'.
    if (override.length > 0) {
        try {
            return await resolveTargetVersion(projectPath, target, versionOverride, 'latest');
        } catch {
            // Fall through to best-effort resolution below.
        }
    }
    // Best-effort: try 'pom' first so we pass what's actually declared.
    try {
        return await resolveTargetVersion(projectPath, target, 'pom', 'latest');
    } catch {
        // Not declared in pom — continue.
    }
    if (target.latestVersion) {
        return { version: target.latestVersion, source: 'latest' };
    }
    return { version: '', source: 'override' };
}

interface ConnectorDefinition {
    mavenGroupId?: string;
    mavenArtifactId?: string;
    version?: {
        tagName?: string;
    };
}

interface ExistingDependency {
    groupId: string;
    artifact: string;
    version?: string;
}

interface ExistingDependencies {
    connectorDependencies?: ExistingDependency[];
    otherDependencies?: ExistingDependency[];
}

// ============================================================================
// Execute Functions
// ============================================================================

/**
 * Creates the execute function for manage_connector tool
 * Handles both add and remove operations for connectors and inbound endpoints
 */
export function createManageConnectorExecute(
    projectPath: string,
    undoCheckpointManager?: AgentUndoCheckpointManager,
    mainAbortSignal?: AbortSignal
): ManageConnectorExecuteFn {
    return async (args: {
        operation: 'add' | 'remove';
        connector_artifact_ids?: string[];
        inbound_artifact_ids?: string[];
        versions?: Record<string, string>;
    }): Promise<ToolResult> => {
        const { operation, connector_artifact_ids = [], inbound_artifact_ids = [], versions } = args;
        const isAdd = operation === 'add';
        const toolName = isAdd ? 'ManageConnector[add]' : 'ManageConnector[remove]';

        // Validate that at least one array has items
        if (connector_artifact_ids.length === 0 && inbound_artifact_ids.length === 0) {
            return {
                success: false,
                message: 'At least one artifact id must be provided via connector_artifact_ids or inbound_artifact_ids.',
                error: 'Error: No artifact ids provided'
            };
        }

        logDebug(`[${toolName}] ${isAdd ? 'Adding' : 'Removing'} connectors: [${connector_artifact_ids.join(', ')}], inbounds: [${inbound_artifact_ids.join(', ')}]`);

        try {
            ensureOperationNotAborted(mainAbortSignal, 'starting connector operation');
            const miVisualizerRpcManager = new MiVisualizerRpcManager(projectPath);
            await undoCheckpointManager?.captureBeforeChange('pom.xml');

            // For add operation, get existing dependencies to check for duplicates
            let existingDependencies: ExistingDependencies = { connectorDependencies: [], otherDependencies: [] };
            if (isAdd) {
                ensureOperationNotAborted(mainAbortSignal, 'loading existing dependencies');
                const langClient = await MILanguageClient.getInstance(projectPath);
                const projectDetails = await langClient.getProjectDetails();
                existingDependencies = projectDetails.dependencies || { connectorDependencies: [], otherDependencies: [] };
                logDebug(`[${toolName}] Existing connector dependencies: ${existingDependencies.connectorDependencies?.length || 0}`);
            }

            const results: ProcessItemResult[] = [];
            const allIds: Array<{ id: string; type: 'connector' | 'inbound' }> = [
                ...connector_artifact_ids.map((id: string) => ({ id, type: 'connector' as const })),
                ...inbound_artifact_ids.map((id: string) => ({ id, type: 'inbound' as const })),
            ];

            for (const { id: itemId, type: itemType } of allIds) {
                ensureOperationNotAborted(mainAbortSignal, `processing ${itemType} ${itemId}`);
                // Reject bundled inbound ids early regardless of which bucket
                // the agent placed them in. They can't be added to pom.xml, and
                // sliding one into `connector_artifact_ids` shouldn't bypass
                // this guard.
                if (classifyIdentifier(itemId) === 'bundled-inbound') {
                    results.push({
                        name: itemId,
                        type: itemType,
                        success: false,
                        error: `'${itemId}' is a bundled inbound endpoint shipped with the MI runtime — no need to add it to pom.xml. Use get_connector_info({artifact_id: "${itemId}"}) to read its parameters directly.`,
                    });
                    continue;
                }

                const { item: storeItem } = await lookupConnectorFromCache(
                    projectPath,
                    itemId,
                    CONNECTOR_DB,
                    INBOUND_DB
                );
                const dbEntry = storeItem ?? null;
                const versionOverride = pickVersionOverride(versions, itemId);
                const result = await processItem(
                    projectPath,
                    itemId,
                    itemType,
                    dbEntry,
                    existingDependencies,
                    miVisualizerRpcManager,
                    isAdd,
                    operation,
                    toolName,
                    versionOverride,
                    mainAbortSignal
                );
                results.push(result);
            }

            logDebug(`[${toolName}] Results: ${JSON.stringify(results)}`);

            // Update connector dependencies (refresh connector list)
            try {
                ensureOperationNotAborted(mainAbortSignal, 'refreshing connector dependencies');
                await miVisualizerRpcManager.updateConnectorDependencies();
                logDebug(`[${toolName}] Connector dependencies updated`);
            } catch (updateError) {
                logError(`[${toolName}] Failed to update connector dependencies`, updateError);
            }

            // Reload dependencies after operation
            try {
                ensureOperationNotAborted(mainAbortSignal, 'reloading dependencies');
                await miVisualizerRpcManager.reloadDependencies();
                logDebug(`[${toolName}] Dependencies reloaded successfully`);
            } catch (error) {
                logDebug(`[${toolName}] Warning: Failed to reload dependencies: ${error instanceof Error ? error.message : String(error)}`);
            }

            // Build response message
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            let message = '';

            const formatItemLine = (r: ProcessItemResult, suffix?: string): string => {
                const versionPart = r.versionSource ? `, ${r.versionSource}` : '';
                const suffixPart = suffix ? `, ${suffix}` : '';
                return `  - ${r.name} (${r.type}${versionPart}${suffixPart})\n`;
            };

            if (isAdd) {
                const alreadyAdded = results.filter(r => r.success && r.alreadyAdded);
                const newlyAdded = results.filter(r => r.success && !r.alreadyAdded);

                if (newlyAdded.length > 0) {
                    message += `Successfully added ${newlyAdded.length} item(s):\n`;
                    newlyAdded.forEach(r => {
                        message += formatItemLine(r);
                    });
                }

                if (alreadyAdded.length > 0) {
                    if (message) message += '\n';
                    message += `${alreadyAdded.length} item(s) already present in project:\n`;
                    alreadyAdded.forEach(r => {
                        message += formatItemLine(r, 'already added');
                    });
                }

                logDebug(`[${toolName}] Completed: ${newlyAdded.length} added, ${alreadyAdded.length} already present, ${failed.length} failed`);
            } else {
                if (successful.length > 0) {
                    message += `Successfully removed ${successful.length} item(s):\n`;
                    successful.forEach(r => {
                        message += formatItemLine(r);
                    });
                }

                logDebug(`[${toolName}] Removed ${successful.length}/${allIds.length} items`);
            }

            if (failed.length > 0) {
                if (message) message += '\n';
                message += `Failed to ${operation} ${failed.length} item(s):\n`;
                failed.forEach(r => {
                    message += `  - ${r.name} (${r.type}): ${r.error}\n`;
                });
            }

            return {
                success: successful.length > 0,
                message: message.trim()
            };
        } catch (error) {
            // User-initiated aborts must propagate. Wrapping them in a regular
            // tool failure result would hide the cancel from the agent loop
            // and allow it to "recover" after the user already hit stop.
            if (isOperationAbortedError(error)) {
                throw error;
            }
            logError(`[${toolName}] Error ${isAdd ? 'adding' : 'removing'} items: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                message: `Failed to ${operation} connectors/inbound endpoints`,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    };
}

/**
 * Helper function to process a single connector or inbound endpoint
 */
async function processItem(
    projectPath: string,
    itemName: string,
    itemType: 'connector' | 'inbound',
    dbEntry: ConnectorDefinition | null,
    existingDependencies: ExistingDependencies,
    miVisualizerRpcManager: MiVisualizerRpcManager,
    isAdd: boolean,
    operation: 'add' | 'remove',
    toolName: string,
    versionOverride: string | undefined,
    mainAbortSignal: AbortSignal | undefined
): Promise<ProcessItemResult> {
    try {
        ensureOperationNotAborted(mainAbortSignal, `processing ${itemType} ${itemName}`);
        if (!dbEntry) {
            return {
                name: itemName,
                type: itemType,
                success: false,
                error: `${itemType === 'connector' ? 'Connector' : 'Inbound endpoint'} '${itemName}' not found`
            };
        }

        const mavenGroupId = typeof dbEntry.mavenGroupId === 'string' ? dbEntry.mavenGroupId.trim() : '';
        const mavenArtifactId = typeof dbEntry.mavenArtifactId === 'string' ? dbEntry.mavenArtifactId.trim() : '';
        const latestVersion = typeof dbEntry.version?.tagName === 'string' ? dbEntry.version.tagName.trim() : '';

        if (!mavenGroupId || !mavenArtifactId) {
            return {
                name: itemName,
                type: itemType,
                success: false,
                error: `${itemType === 'connector' ? 'Connector' : 'Inbound endpoint'} definition is missing Maven coordinates`
            };
        }

        // Resolve target version.
        //
        // For 'add', default strategy is "latest" — pom-version isn't meaningful
        // because "install the version that's already installed" is a no-op.
        //
        // For 'remove', the underlying updateAiDependencies RPC matches only on
        // groupId + artifact and ignores the version. We still need *some* string
        // because DependencyDetails requires one, but we must not fail the remove
        // just because the store/cache has no latestVersion (offline, new runtime
        // version without a catalog, etc.). Try 'pom' first as a best-effort, then
        // fall back to latestVersion, then to an empty placeholder.
        ensureOperationNotAborted(mainAbortSignal, `resolving version for ${itemName}`);
        let resolved: ResolvedVersion;
        try {
            if (isAdd) {
                resolved = await resolveTargetVersion(
                    projectPath,
                    { name: itemName, groupId: mavenGroupId, artifactId: mavenArtifactId, latestVersion },
                    versionOverride,
                    'latest'
                );
            } else {
                resolved = await resolveRemoveVersion(
                    projectPath,
                    { name: itemName, groupId: mavenGroupId, artifactId: mavenArtifactId, latestVersion },
                    versionOverride
                );
            }
        } catch (err) {
            if (err instanceof VersionResolutionError) {
                return {
                    name: itemName,
                    type: itemType,
                    success: false,
                    error: err.message,
                };
            }
            throw err;
        }

        // For add operation, check if item is already in pom.xml
        if (isAdd) {
            const alreadyExists = existingDependencies.connectorDependencies?.some(
                (existingDep: ExistingDependency) =>
                    existingDep.groupId === mavenGroupId &&
                    existingDep.artifact === mavenArtifactId
            );

            if (alreadyExists) {
                logDebug(`[${toolName}] ${itemType} ${itemName} already exists in pom.xml`);
                return {
                    name: itemName,
                    type: itemType,
                    success: true,
                    alreadyAdded: true,
                    versionUsed: resolved.version,
                    versionSource: describeVersionSource(resolved),
                };
            }
        }

        // Prepare dependency details
        const dependencies: DependencyDetails[] = [{
            groupId: mavenGroupId,
            artifact: mavenArtifactId,
            version: resolved.version,
            type: "zip"
        }];

        logDebug(`[${toolName}] ${isAdd ? 'Adding' : 'Removing'} ${itemType}: ${itemName} (${mavenArtifactId}:${resolved.version}, source: ${resolved.source})`);

        ensureOperationNotAborted(mainAbortSignal, `updating pom.xml for ${itemName}`);
        // Update pom.xml
        const response = await miVisualizerRpcManager.updateAiDependencies({
            dependencies,
            operation: operation
        });

        if (response) {
            return {
                name: itemName,
                type: itemType,
                success: true,
                versionUsed: resolved.version,
                versionSource: describeVersionSource(resolved),
            };
        } else {
            return {
                name: itemName,
                type: itemType,
                success: false,
                error: 'Failed to update pom.xml'
            };
        }
    } catch (error) {
        // Never swallow user-initiated aborts — let them propagate so the
        // overall tool call terminates instead of silently marking the item
        // as failed.
        if (isOperationAbortedError(error)) {
            throw error;
        }
        return {
            name: itemName,
            type: itemType,
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}


// ============================================================================
// Tool Definitions (Vercel AI SDK format)
// ============================================================================

const manageConnectorInputSchema = z.object({
    operation: z.enum(['add', 'remove'])
        .describe('Operation to perform: "add" to add items, "remove" to remove them'),
    connector_artifact_ids: z.array(z.string())
        .optional()
        .describe('Maven artifact ids of connectors (e.g. ["mi-connector-gmail", "mi-connector-salesforce"]). NOT display names — use the ids from <AVAILABLE_CONNECTOR_ARTIFACT_IDS>.'),
    inbound_artifact_ids: z.array(z.string())
        .optional()
        .describe('Maven artifact ids of downloadable inbound endpoints (e.g. ["mi-inbound-amazonsqs", "mi-inbound-kafka"]). Bundled inbound ids like "http"/"jms" are rejected — those are shipped with the runtime and do not need to be added to pom.xml.'),
    versions: z.record(z.string(), z.string())
        .optional()
        .describe('Optional per-item version override map keyed by artifact id. Each value is either a concrete version string (e.g. "3.1.6") or the literal "latest". Items not present default to "latest" (the latest version from the store cache). Example: { "mi-connector-redis": "3.1.6", "mi-connector-gmail": "latest" }. Lookup is case-insensitive.'),
});

/**
 * Creates the add_or_remove_connector tool (unified add/remove for connectors and inbound endpoints).
 */
export function createManageConnectorTool(execute: ManageConnectorExecuteFn) {
    return tool({
        description: `Add or remove MI connector / downloadable-inbound dependencies in pom.xml by Maven artifact id.
            Use 'add' when Synapse configs reference connector operations or inbound endpoints that are not yet in pom.xml.
            Artifact ids must come from <AVAILABLE_CONNECTOR_ARTIFACT_IDS> or <AVAILABLE_INBOUND_ARTIFACT_IDS>. Bundled inbound ids (<AVAILABLE_BUNDLED_INBOUND_IDS>) are runtime-shipped and will be rejected by this tool — use them directly with get_connector_info instead.
            Defaults to the LATEST version from the store cache. Pin specific versions per item via the versions map, e.g. { "mi-connector-redis": "3.1.6" } — a single call can mix latest and pinned versions across items.
            The response reports which version was used and its source (latest from store / explicit override).
            Dependencies auto-reload after changes.`,
        inputSchema: manageConnectorInputSchema,
        execute
    });
}
