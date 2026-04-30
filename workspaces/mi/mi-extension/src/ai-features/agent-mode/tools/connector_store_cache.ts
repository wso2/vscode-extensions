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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseStringPromise } from 'xml2js';
import { logDebug, logError, logInfo, logWarn } from '../../copilot/logger';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const STORE_FETCH_TIMEOUT_MS = 5000;
const DEFAULT_RUNTIME_VERSION = process.env.MI_RUNTIME_VERSION || '4.6.0';
const SAFE_RUNTIME_VERSION_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;

export type ConnectorStoreItemType = 'connector' | 'inbound';
export type ConnectorStoreSource = 'fresh-cache' | 'stale-cache' | 'store' | 'local-db';
export type ConnectorStoreStatus = 'healthy' | 'degraded';

const FULL_ARTIFACT_ID_PATTERN = /^(mi-(connector|module|inbound)|esb-connector)-/i;

/**
 * True when the id looks like a fully-qualified Maven artifact id
 * (e.g. "mi-inbound-file"). Exact-match lookups are required for these —
 * stripped matching would unify "mi-inbound-file" and "mi-connector-file".
 */
export function isFullArtifactId(identifier: string): boolean {
    return FULL_ARTIFACT_ID_PATTERN.test(identifier);
}

export interface ConnectorStoreItem {
    connectorName: string;
    description: string;
    connectorType: string;
    mavenGroupId: string;
    mavenArtifactId: string;
    repoName: string;
    version: { tagName: string };
    connections?: any[];
}

interface CatalogCacheFile {
    fetchedAt: string;
    runtimeVersion: string;
    type: ConnectorStoreItemType;
    data: ConnectorStoreItem[];
}

interface CatalogLoadResult {
    items: ConnectorStoreItem[];
    source: ConnectorStoreSource;
    warnings: string[];
}

export interface ConnectorStoreCatalog {
    connectors: ConnectorStoreItem[];
    inbounds: ConnectorStoreItem[];
    storeStatus: ConnectorStoreStatus;
    warnings: string[];
    runtimeVersionUsed: string;
    source: {
        connectors: ConnectorStoreSource;
        inbounds: ConnectorStoreSource;
    };
}

export interface ConnectorStoreLookupResult {
    item: ConnectorStoreItem | null;
    source: ConnectorStoreSource;
}

const CACHE_ROOT_DIR = path.join(os.homedir(), '.wso2-mi', 'copilot', 'cache');
const CATALOG_FILE_NAME = 'catalog.json';

function normalizeName(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim().toLowerCase();
}

function stripConnectorPrefix(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }
    return value.replace(/^mi-(connector|module|inbound)-/i, '');
}

function sanitizeRuntimeVersionSegment(runtimeVersion: string): string {
    const trimmed = runtimeVersion.trim();
    if (
        trimmed.length === 0
        || trimmed === '.'
        || trimmed === '..'
        || !SAFE_RUNTIME_VERSION_SEGMENT_PATTERN.test(trimmed)
    ) {
        const canonicalized = trimmed
            .replace(/[\\/]/g, '-')
            .replace(/[^a-zA-Z0-9._-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^[.-]+/, '')
            .replace(/[.-]+$/, '')
            .slice(0, 64);
        if (
            canonicalized.length === 0
            || canonicalized === '.'
            || canonicalized === '..'
            || !SAFE_RUNTIME_VERSION_SEGMENT_PATTERN.test(canonicalized)
        ) {
            return DEFAULT_RUNTIME_VERSION;
        }
        return canonicalized;
    }

    return trimmed;
}

function getRuntimeVersionUsed(runtimeVersion: string | null): string {
    if (runtimeVersion === null) {
        return DEFAULT_RUNTIME_VERSION;
    }
    return sanitizeRuntimeVersionSegment(runtimeVersion);
}

function buildItemDirectory(itemType: ConnectorStoreItemType, runtimeVersion: string): string {
    const safeRuntimeVersion = sanitizeRuntimeVersionSegment(runtimeVersion);
    return path.join(CACHE_ROOT_DIR, itemType, safeRuntimeVersion);
}

function buildCatalogFilePath(itemType: ConnectorStoreItemType, runtimeVersion: string): string {
    return path.join(buildItemDirectory(itemType, runtimeVersion), CATALOG_FILE_NAME);
}

function dedupeWarnings(warnings: string[]): string[] {
    return Array.from(new Set(warnings.filter((warning) => warning.trim().length > 0)));
}

function isEntryFresh(fetchedAt: string): boolean {
    const fetchedAtMs = Date.parse(fetchedAt);
    if (Number.isNaN(fetchedAtMs)) {
        return false;
    }
    return Date.now() - fetchedAtMs < CACHE_TTL_MS;
}

// ============================================================================
// Store Item Mapping
// ============================================================================

function toConnectorStoreItem(raw: any, itemType: ConnectorStoreItemType): ConnectorStoreItem | null {
    const connectorName = typeof raw?.connectorName === 'string' ? raw.connectorName.trim() : '';
    if (connectorName.length === 0) {
        return null;
    }

    return {
        connectorName,
        description: typeof raw?.description === 'string' ? raw.description : '',
        connectorType: typeof raw?.connectorType === 'string'
            ? raw.connectorType
            : (itemType === 'connector' ? 'Connector' : 'Inbound'),
        mavenGroupId: typeof raw?.mavenGroupId === 'string' ? raw.mavenGroupId : '',
        mavenArtifactId: typeof raw?.mavenArtifactId === 'string' ? raw.mavenArtifactId : '',
        repoName: typeof raw?.repoName === 'string' ? raw.repoName : '',
        version: {
            tagName: typeof raw?.version?.tagName === 'string' ? raw.version.tagName : '',
        },
        connections: Array.isArray(raw?.version?.connections) ? raw.version.connections : undefined,
    };
}

function toFallbackStoreItems(fallbackItems: any[], itemType: ConnectorStoreItemType): ConnectorStoreItem[] {
    return fallbackItems
        .map((item) => {
            const connectorName = typeof item?.connectorName === 'string' ? item.connectorName : '';
            if (connectorName.trim().length === 0) {
                return null;
            }

            return {
                connectorName,
                description: typeof item?.description === 'string' ? item.description : '',
                connectorType: typeof item?.connectorType === 'string'
                    ? item.connectorType
                    : (itemType === 'connector' ? 'Connector' : 'Inbound'),
                mavenGroupId: typeof item?.mavenGroupId === 'string' ? item.mavenGroupId : '',
                mavenArtifactId: typeof item?.mavenArtifactId === 'string' ? item.mavenArtifactId : '',
                repoName: typeof item?.repoName === 'string' ? item.repoName : '',
                version: {
                    tagName: typeof item?.version?.tagName === 'string' ? item.version.tagName : '',
                },
            } as ConnectorStoreItem;
        })
        .filter((item): item is ConnectorStoreItem => item !== null);
}

// ============================================================================
// Cache I/O
// ============================================================================

async function readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return JSON.parse(content) as T;
    } catch {
        return null;
    }
}

async function writeJsonFile(filePath: string, content: unknown): Promise<void> {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8');
}

async function readCatalogCache(filePath: string): Promise<CatalogCacheFile | null> {
    const parsed = await readJsonFile<CatalogCacheFile>(filePath);
    if (
        parsed
        && typeof parsed.fetchedAt === 'string'
        && typeof parsed.runtimeVersion === 'string'
        && (parsed.type === 'connector' || parsed.type === 'inbound')
        && Array.isArray(parsed.data)
    ) {
        return parsed;
    }
    return null;
}

async function writeCatalogCache(
    filePath: string,
    itemType: ConnectorStoreItemType,
    runtimeVersion: string,
    data: ConnectorStoreItem[]
): Promise<void> {
    const content: CatalogCacheFile = {
        fetchedAt: new Date().toISOString(),
        runtimeVersion,
        type: itemType,
        data,
    };
    await writeJsonFile(filePath, content);
}

// ============================================================================
// Store API
// ============================================================================

function getConnectorCatalogUrl(runtimeVersion: string): string {
    return (process.env.MI_CONNECTOR_STORE_BACKEND ?? '').replace('${version}', runtimeVersion);
}

function getInboundCatalogUrl(runtimeVersion: string): string {
    return (process.env.MI_CONNECTOR_STORE_BACKEND_INBOUND_ENDPOINTS ?? '').replace('${version}', runtimeVersion);
}

async function fetchWithTimeout(
    url: string,
    init: RequestInit,
    externalSignal?: AbortSignal
): Promise<Response> {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), STORE_FETCH_TIMEOUT_MS);
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
        if (externalSignal.aborted) {
            controller.abort();
        } else {
            externalSignal.addEventListener('abort', onExternalAbort, { once: true });
        }
    }
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeoutHandle);
        externalSignal?.removeEventListener('abort', onExternalAbort);
    }
}

async function fetchCatalogFromStore(itemType: ConnectorStoreItemType, runtimeVersion: string): Promise<ConnectorStoreItem[]> {
    const url = itemType === 'connector'
        ? getConnectorCatalogUrl(runtimeVersion)
        : getInboundCatalogUrl(runtimeVersion);

    if (!url) {
        throw new Error(`No URL configured for ${itemType} catalog`);
    }

    const response = await fetchWithTimeout(url, { method: 'GET' });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
        throw new Error('Connector store response is not an array');
    }

    return payload
        .map((item) => toConnectorStoreItem(item, itemType))
        .filter((item): item is ConnectorStoreItem => item !== null);
}

// ============================================================================
// Catalog Loading (with cache + fallback chain)
// ============================================================================

async function loadCatalog(
    itemType: ConnectorStoreItemType,
    runtimeVersion: string,
    fallbackItems: any[],
    forceRefresh: boolean = false
): Promise<CatalogLoadResult> {
    const cachePath = buildCatalogFilePath(itemType, runtimeVersion);
    const cached = await readCatalogCache(cachePath);
    const label = itemType === 'connector' ? 'connectors' : 'inbound endpoints';
    const warnings: string[] = [];

    if (!forceRefresh && cached && isEntryFresh(cached.fetchedAt)) {
        logDebug(`[ConnectorStoreCache] Using fresh ${label} cache (${cachePath})`);
        return {
            items: cached.data,
            source: 'fresh-cache',
            warnings,
        };
    }

    try {
        const fetchedItems = await fetchCatalogFromStore(itemType, runtimeVersion);
        await writeCatalogCache(cachePath, itemType, runtimeVersion, fetchedItems);
        logDebug(`[ConnectorStoreCache] Refreshed ${label} cache with ${fetchedItems.length} item(s)`);
        return {
            items: fetchedItems,
            source: 'store',
            warnings,
        };
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            logError(`[ConnectorStoreCache] Timed out fetching ${label} after ${STORE_FETCH_TIMEOUT_MS}ms`, error);
        } else {
            logError(`[ConnectorStoreCache] Failed to fetch ${label} from connector store`, error);
        }

        const warning = `[ConnectorStoreCache] Connector store unavailable for ${label}.`;
        warnings.push(warning);

        if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
            logWarn(`[ConnectorStoreCache] Using stale ${label} cache due to store failure.`);
            warnings.push(`[ConnectorStoreCache] Using stale cached ${label}.`);
            return {
                items: cached.data,
                source: 'stale-cache',
                warnings,
            };
        }

        const fallbackCatalog = toFallbackStoreItems(fallbackItems, itemType);
        logWarn(`[ConnectorStoreCache] Falling back to local ${label} list (${fallbackCatalog.length} item(s)).`);
        warnings.push(`[ConnectorStoreCache] Using local fallback ${label}.`);
        return {
            items: fallbackCatalog,
            source: 'local-db',
            warnings,
        };
    }
}

// ============================================================================
// Name Matching
// ============================================================================

function matchesStoreItem(item: ConnectorStoreItem, name: string): boolean {
    const normalized = normalizeName(name);
    if (normalized.length === 0) {
        return false;
    }

    const itemName = normalizeName(item.connectorName);
    const itemArtifact = normalizeName(item.mavenArtifactId);

    if (isFullArtifactId(normalized)) {
        return normalized === itemArtifact;
    }

    // Bare identifier ("file", "File") — fall back to loose matching so legacy
    // callers that pass display names or un-prefixed ids still resolve.
    const stripped = normalizeName(stripConnectorPrefix(name));
    const itemArtifactStripped = normalizeName(stripConnectorPrefix(item.mavenArtifactId));
    return normalized === itemName
        || normalized === itemArtifact
        || normalized === itemArtifactStripped
        || stripped === itemName
        || stripped === itemArtifact;
}

// ============================================================================
// Public API
// ============================================================================

export async function getRuntimeVersionFromPom(projectPath: string): Promise<string | null> {
    const pomPath = path.join(projectPath, 'pom.xml');

    try {
        const pomContent = await fs.promises.readFile(pomPath, 'utf8');
        const parsedPom = await parseStringPromise(pomContent, {
            explicitArray: false,
            ignoreAttrs: true,
        });
        const runtimeVersion = parsedPom?.project?.properties?.['project.runtime.version'];
        if (typeof runtimeVersion !== 'string') {
            return null;
        }

        const trimmedVersion = runtimeVersion.trim();
        return trimmedVersion.length > 0 ? trimmedVersion : null;
    } catch {
        return null;
    }
}

export async function getConnectorStoreCatalog(
    projectPath: string,
    fallbackConnectors: any[],
    fallbackInbounds: any[],
    options: { forceRefresh?: boolean } = {}
): Promise<ConnectorStoreCatalog> {
    const runtimeVersion = await getRuntimeVersionFromPom(projectPath);
    const runtimeVersionUsed = getRuntimeVersionUsed(runtimeVersion);
    const forceRefresh = options.forceRefresh === true;

    if (runtimeVersion === null) {
        logInfo(`[ConnectorStoreCache] Runtime version unavailable. Defaulting connector store runtime to ${DEFAULT_RUNTIME_VERSION}.`);
    }

    const [connectorResult, inboundResult] = await Promise.all([
        loadCatalog('connector', runtimeVersionUsed, fallbackConnectors, forceRefresh),
        loadCatalog('inbound', runtimeVersionUsed, fallbackInbounds, forceRefresh),
    ]);

    const warnings = dedupeWarnings([...connectorResult.warnings, ...inboundResult.warnings]);
    const degradedSources = new Set<ConnectorStoreSource>(['stale-cache', 'local-db']);
    const storeStatus: ConnectorStoreStatus = degradedSources.has(connectorResult.source) || degradedSources.has(inboundResult.source)
        ? 'degraded'
        : 'healthy';

    return {
        connectors: connectorResult.items,
        inbounds: inboundResult.items,
        storeStatus,
        warnings,
        runtimeVersionUsed,
        source: {
            connectors: connectorResult.source,
            inbounds: inboundResult.source,
        },
    };
}

/**
 * Look up a single connector/inbound by name from the cached store data.
 * Fallback chain: fresh cache → store API → stale cache → static DB.
 */
export async function lookupConnectorFromCache(
    projectPath: string,
    name: string,
    fallbackConnectors: any[],
    fallbackInbounds: any[]
): Promise<ConnectorStoreLookupResult> {
    const runtimeVersion = await getRuntimeVersionFromPom(projectPath);
    const runtimeVersionUsed = getRuntimeVersionUsed(runtimeVersion);

    // 1. Check fresh cache for both types
    for (const itemType of ['connector', 'inbound'] as ConnectorStoreItemType[]) {
        const cachePath = buildCatalogFilePath(itemType, runtimeVersionUsed);
        const cached = await readCatalogCache(cachePath);
        if (cached && isEntryFresh(cached.fetchedAt)) {
            const found = cached.data.find(item => matchesStoreItem(item, name));
            if (found) {
                return { item: found, source: 'fresh-cache' };
            }
        }
    }

    // 2. Cache miss or stale — fetch both types in parallel from store (with
    //    per-type stale-cache fallback on failure). We scan the full result
    //    set for a match after both settle; connectors and inbounds don't
    //    share names in practice, so the extra work is negligible.
    const types: ConnectorStoreItemType[] = ['connector', 'inbound'];
    const fetchResults = await Promise.all(types.map(async (itemType) => {
        const cachePath = buildCatalogFilePath(itemType, runtimeVersionUsed);
        try {
            const fetched = await fetchCatalogFromStore(itemType, runtimeVersionUsed);
            await writeCatalogCache(cachePath, itemType, runtimeVersionUsed, fetched);
            return { data: fetched, source: 'store' as ConnectorStoreSource };
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logWarn(`[ConnectorStoreCache] Falling back to stale ${itemType} cache at ${cachePath} after store fetch failure: ${errMsg}`);
            const cached = await readCatalogCache(cachePath);
            return { data: cached?.data ?? [], source: 'stale-cache' as ConnectorStoreSource };
        }
    }));

    for (const { data, source } of fetchResults) {
        const found = data.find(item => matchesStoreItem(item, name));
        if (found) {
            return { item: found, source };
        }
    }

    // 3. Final fallback: static DB. Check connectors and inbounds separately
    //    so the correct itemType is threaded into toFallbackStoreItems (which
    //    controls connectorType defaulting).
    const matchesFallback = (item: any): boolean => {
        const normalizedInput = normalizeName(name);
        const fullId = isFullArtifactId(normalizedInput);
        const itemArtifact = normalizeName(item?.mavenArtifactId);
        if (fullId) {
            return normalizedInput === itemArtifact;
        }
        const itemName = normalizeName(item?.connectorName);
        const itemArtifactStripped = normalizeName(stripConnectorPrefix(item?.mavenArtifactId));
        const stripped = normalizeName(stripConnectorPrefix(name));
        return normalizedInput === itemName
            || normalizedInput === itemArtifact
            || normalizedInput === itemArtifactStripped
            || stripped === itemName
            || stripped === itemArtifact;
    };

    const connectorMatch = fallbackConnectors.find(matchesFallback);
    if (connectorMatch) {
        const mapped = toFallbackStoreItems([connectorMatch], 'connector')[0] ?? null;
        return { item: mapped, source: 'local-db' };
    }

    const inboundMatch = fallbackInbounds.find(matchesFallback);
    if (inboundMatch) {
        const mapped = toFallbackStoreItems([inboundMatch], 'inbound')[0] ?? null;
        return { item: mapped, source: 'local-db' };
    }

    return { item: null, source: 'local-db' };
}
