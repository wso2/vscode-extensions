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

import { MILanguageClient } from '../../../lang-client/activator';
import { logDebug, logWarn } from '../../copilot/logger';

// ============================================================================
// Types
// ============================================================================

export type VersionSource = 'pom' | 'latest' | 'override';

export type DefaultVersionStrategy = 'pom-or-latest' | 'latest';

export interface VersionResolutionTarget {
    /** Connector / inbound display name (used in error messages). */
    name: string;
    /** Maven groupId — required to look up pom and to identify "latest". */
    groupId: string;
    /** Maven artifactId — required to look up pom and to identify "latest". */
    artifactId: string;
    /** "Latest" version from store cache or static DB. May be empty if unknown. */
    latestVersion: string;
}

export interface ResolvedVersion {
    version: string;
    source: VersionSource;
}

export class VersionResolutionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'VersionResolutionError';
    }
}

// ============================================================================
// Internal helpers
// ============================================================================

interface PomDependency {
    groupId?: string;
    artifact?: string;
    version?: string;
}

/**
 * Read declared dependencies from the project's pom.xml via the LS.
 * Returns the matching `version` string or null if the dependency is not declared.
 *
 * Uses `synapse/getOverviewPageDetails` which returns
 * `{ dependencies: { connectorDependencies: [{groupId, artifact, version}], ... } }`.
 * Connectors, modules, and inbound endpoints are all reported under
 * `connectorDependencies`, discriminated by groupId.
 */
async function readPomVersion(
    projectPath: string,
    groupId: string,
    artifactId: string
): Promise<string | null> {
    try {
        const langClient = await MILanguageClient.getInstance(projectPath);
        const projectDetails = await langClient.getProjectDetails();
        const deps: PomDependency[] = projectDetails?.dependencies?.connectorDependencies ?? [];
        const match = deps.find(d => d.groupId === groupId && d.artifact === artifactId);
        const version = typeof match?.version === 'string' ? match.version.trim() : '';
        return version.length > 0 ? version : null;
    } catch (error) {
        logWarn(`[ConnectorVersion] Failed to read pom dependencies: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Resolve which version of a connector/inbound the caller wants to operate on.
 *
 * Override semantics (case-insensitive for the magic strings):
 * - `"latest"` → use the latest version from the store cache / static DB. Errors if unknown.
 * - `"pom"`    → use the version currently declared in the project's pom.xml. Errors if not declared.
 * - any other string → treat as a concrete version (e.g. `"3.1.6"`). Returned as-is, source `override`.
 *
 * Default behavior (no override) depends on strategy:
 * - `pom-or-latest` (used by `get_connector_info`): pom version if declared, else latest.
 * - `latest` (used by `add_or_remove_connector`): always latest, ignoring pom.
 *
 * Throws `VersionResolutionError` with a clear message if the requested
 * version cannot be determined — never silently falls back.
 */
export async function resolveTargetVersion(
    projectPath: string,
    target: VersionResolutionTarget,
    override: string | undefined,
    defaultStrategy: DefaultVersionStrategy
): Promise<ResolvedVersion> {
    const overrideRaw = typeof override === 'string' ? override.trim() : '';
    const overrideLower = overrideRaw.toLowerCase();
    const latest = target.latestVersion?.trim() ?? '';

    // Concrete version override — return as-is.
    if (overrideRaw.length > 0 && overrideLower !== 'latest' && overrideLower !== 'pom') {
        logDebug(`[ConnectorVersion] ${target.name}: using override version ${overrideRaw}`);
        return { version: overrideRaw, source: 'override' };
    }

    // "latest" override or no override + latest strategy → use store latest.
    if (overrideLower === 'latest') {
        if (!latest) {
            throw new VersionResolutionError(
                `No latest version available for '${target.name}'. The store cache and static DB do not have a tagName for ${target.groupId}:${target.artifactId}.`
            );
        }
        logDebug(`[ConnectorVersion] ${target.name}: using latest version ${latest}`);
        return { version: latest, source: 'latest' };
    }

    // "pom" override → must be declared in pom.xml.
    if (overrideLower === 'pom') {
        const pomVersion = await readPomVersion(projectPath, target.groupId, target.artifactId);
        if (!pomVersion) {
            throw new VersionResolutionError(
                `'${target.name}' (${target.groupId}:${target.artifactId}) is not declared in the project's pom.xml. Use add_or_remove_connector to add it first, or pass a concrete version / "latest".`
            );
        }
        logDebug(`[ConnectorVersion] ${target.name}: using pom version ${pomVersion}`);
        return { version: pomVersion, source: 'pom' };
    }

    // No override — apply default strategy.
    if (defaultStrategy === 'latest') {
        if (!latest) {
            throw new VersionResolutionError(
                `No latest version available for '${target.name}' and no version override was provided.`
            );
        }
        return { version: latest, source: 'latest' };
    }

    // pom-or-latest: prefer pom if declared, else fall back to latest.
    const pomVersion = await readPomVersion(projectPath, target.groupId, target.artifactId);
    if (pomVersion) {
        return { version: pomVersion, source: 'pom' };
    }
    if (!latest) {
        throw new VersionResolutionError(
            `'${target.name}' is not declared in pom.xml and no latest version is known. Pass an explicit version or 'latest' override.`
        );
    }
    return { version: latest, source: 'latest' };
}

/**
 * Human-readable description of the version source for inclusion in tool output.
 */
export function describeVersionSource(resolved: ResolvedVersion): string {
    switch (resolved.source) {
        case 'pom':
            return `pom (${resolved.version})`;
        case 'latest':
            return `latest from store (${resolved.version})`;
        case 'override':
            return `explicit override (${resolved.version})`;
    }
}
