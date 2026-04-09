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

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseStringPromise } from 'xml2js';
import { logDebug, logError, logInfo, logWarn } from '../../copilot/logger';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORE_FETCH_TIMEOUT_MS = 5000;
const DEFAULT_RUNTIME_VERSION = process.env.MI_RUNTIME_VERSION || '4.6.0';
const SAFE_RUNTIME_VERSION_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;

export type ConnectorStoreItemType = 'connector' | 'inbound';
export type ConnectorStoreSource = 'fresh-cache' | 'stale-cache' | 'store' | 'local-db';
export type ConnectorStoreStatus = 'healthy' | 'degraded';

interface CatalogCacheFile {
    fetchedAt: string;
    runtimeVersion: string;
    type: ConnectorStoreItemType;
    data: CatalogItem[];
}

interface DefinitionCacheFile {
    fetchedAt: string;
    runtimeVersion: string;
    type: ConnectorStoreItemType;
    name: string;
    data: any;
}

interface CatalogLoadResult {
    items: CatalogItem[];
    source: ConnectorStoreSource;
    warnings: string[];
}

export interface CatalogItem {
    connectorName: string;
    description: string;
    connectorType: string;
}

export interface ConnectorStoreCatalog {
    connectors: CatalogItem[];
    inbounds: CatalogItem[];
    storeStatus: ConnectorStoreStatus;
    warnings: string[];
    runtimeVersionUsed: string;
    source: {
        connectors: ConnectorStoreSource;
        inbounds: ConnectorStoreSource;
    };
}

export interface ConnectorDefinitionLookupResult {
    definitionsByName: Record<string, any>;
    missingNames: string[];
    fallbackUsedNames: string[];
    storeFailureNames: string[];
    warnings: string[];
    runtimeVersionUsed: string;
}

interface CacheReadResult {
    fresh?: any;
    stale?: any;
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

function sanitizeFileNameSegment(value: string): string {
    return value
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 96) || 'item';
}

function buildItemDirectory(itemType: ConnectorStoreItemType, runtimeVersion: string): string {
    const safeRuntimeVersion = sanitizeRuntimeVersionSegment(runtimeVersion);
    return path.join(CACHE_ROOT_DIR, itemType, safeRuntimeVersion);
}

function buildCatalogFilePath(itemType: ConnectorStoreItemType, runtimeVersion: string): string {
    return path.join(buildItemDirectory(itemType, runtimeVersion), CATALOG_FILE_NAME);
}

function buildDefinitionFilePath(itemType: ConnectorStoreItemType, runtimeVersion: string, name: string): string {
    const normalized = normalizeName(name);
    const displayPart = sanitizeFileNameSegment(normalized);
    const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12);
    const fileName = `${displayPart}-${hash}.json`;
    return path.join(buildItemDirectory(itemType, runtimeVersion), fileName);
}

function toRequestAliases(name: string): string[] {
    const aliases = new Set<string>();
    const normalized = normalizeName(name);
    if (normalized.length > 0) {
        aliases.add(normalized);
    }

    const stripped = normalizeName(stripConnectorPrefix(name));
    if (stripped.length > 0) {
        aliases.add(stripped);
    }

    return Array.from(aliases);
}

function getDefinitionAliases(definition: any): string[] {
    const aliases = new Set<string>();
    const connectorName = normalizeName(definition?.connectorName);
    const artifactId = normalizeName(definition?.mavenArtifactId);
    const strippedArtifact = normalizeName(stripConnectorPrefix(definition?.mavenArtifactId));

    if (connectorName.length > 0) {
        aliases.add(connectorName);
    }
    if (artifactId.length > 0) {
        aliases.add(artifactId);
    }
    if (strippedArtifact.length > 0) {
        aliases.add(strippedArtifact);
    }

    return Array.from(aliases);
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

function toCatalogItem(raw: any): CatalogItem | null {
    const connectorName = typeof raw?.connector_name === 'string'
        ? raw.connector_name
        : (typeof raw?.connectorName === 'string' ? raw.connectorName : '');
    if (connectorName.trim().length === 0) {
        return null;
    }

    const description = typeof raw?.description === 'string' ? raw.description : '';
    const connectorType = typeof raw?.connector_type === 'string'
        ? raw.connector_type
        : (typeof raw?.connectorType === 'string' ? raw.connectorType : '');

    return {
        connectorName,
        description,
        connectorType,
    };
}

function toCatalogFallbackItems(fallbackItems: any[], itemType: ConnectorStoreItemType): CatalogItem[] {
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
            } as CatalogItem;
        })
        .filter((item): item is CatalogItem => item !== null);
}

function matchesDefinition(definition: any, requestedName: string): boolean {
    const normalizedRequested = normalizeName(requestedName);
    if (normalizedRequested.length === 0) {
        return false;
    }

    const connectorName = normalizeName(definition?.connectorName);
    const artifactId = normalizeName(definition?.mavenArtifactId);
    const strippedArtifact = normalizeName(stripConnectorPrefix(definition?.mavenArtifactId));

    return normalizedRequested === connectorName
        || normalizedRequested === artifactId
        || normalizedRequested === strippedArtifact;
}

function findFallbackDefinition(requestedName: string, fallbackItems: any[]): any | null {
    for (const item of fallbackItems) {
        if (matchesDefinition(item, requestedName)) {
            return item;
        }
    }

    return null;
}

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

async function readDefinitionCache(filePath: string): Promise<DefinitionCacheFile | null> {
    const parsed = await readJsonFile<DefinitionCacheFile>(filePath);
    if (
        parsed
        && typeof parsed.fetchedAt === 'string'
        && typeof parsed.runtimeVersion === 'string'
        && (parsed.type === 'connector' || parsed.type === 'inbound')
        && typeof parsed.name === 'string'
        && Object.prototype.hasOwnProperty.call(parsed, 'data')
    ) {
        return parsed;
    }

    return null;
}

async function writeCatalogCache(
    filePath: string,
    itemType: ConnectorStoreItemType,
    runtimeVersion: string,
    data: CatalogItem[]
): Promise<void> {
    const content: CatalogCacheFile = {
        fetchedAt: new Date().toISOString(),
        runtimeVersion,
        type: itemType,
        data,
    };
    await writeJsonFile(filePath, content);
}

async function writeDefinitionCaches(
    itemType: ConnectorStoreItemType,
    runtimeVersion: string,
    definition: any,
    aliases: string[]
): Promise<void> {
    const uniqueAliases = new Set<string>(aliases.map((alias) => normalizeName(alias)).filter((alias) => alias.length > 0));
    for (const alias of uniqueAliases) {
        const filePath = buildDefinitionFilePath(itemType, runtimeVersion, alias);
        const content: DefinitionCacheFile = {
            fetchedAt: new Date().toISOString(),
            runtimeVersion,
            type: itemType,
            name: alias,
            data: definition,
        };
        await writeJsonFile(filePath, content);
    }
}

function getSummaryUrl(itemType: ConnectorStoreItemType): string {
    const template = process.env.MI_CONNECTOR_STORE_BACKEND_SUMMARIES ?? '';
    const typeValue = itemType === 'connector' ? 'Connector' : 'Inbound';
    return template.replace('${type}', typeValue);
}

function getDetailsUrl(): string {
    return process.env.MI_CONNECTOR_STORE_BACKEND_DETAILS_FILTER
        || process.env.MI_CONNECTOR_STORE_BACKEND_DETAILS
        || '';
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), STORE_FETCH_TIMEOUT_MS);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeoutHandle);
    }
}

async function fetchCatalogFromStore(itemType: ConnectorStoreItemType): Promise<CatalogItem[]> {
    const summaryUrl = getSummaryUrl(itemType);
    const response = await fetchWithTimeout(summaryUrl, { method: 'GET' });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
        throw new Error('Connector summary response is not an array');
    }

    return payload
        .map((item) => toCatalogItem(item))
        .filter((item): item is CatalogItem => item !== null);
}

async function fetchDefinitionsFromStore(names: string[], runtimeVersion: string): Promise<any[]> {
    const detailsUrl = getDetailsUrl();
    const response = await fetchWithTimeout(detailsUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            connectorNames: names,
            runtimeVersion,
            product: 'MI',
            latest: true,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload)) {
        throw new Error('Connector details response is not an array');
    }

    return payload;
}

async function loadCatalog(
    itemType: ConnectorStoreItemType,
    runtimeVersion: string,
    fallbackItems: any[]
): Promise<CatalogLoadResult> {
    const cachePath = buildCatalogFilePath(itemType, runtimeVersion);
    const cached = await readCatalogCache(cachePath);
    const label = itemType === 'connector' ? 'connectors' : 'inbound endpoints';
    const warnings: string[] = [];

    if (cached && isEntryFresh(cached.fetchedAt)) {
        logDebug(`[ConnectorStoreCache] Using fresh ${label} summary cache (${cachePath})`);
        return {
            items: cached.data,
            source: 'fresh-cache',
            warnings,
        };
    }

    try {
        const fetchedItems = await fetchCatalogFromStore(itemType);
        await writeCatalogCache(cachePath, itemType, runtimeVersion, fetchedItems);
        logDebug(`[ConnectorStoreCache] Refreshed ${label} summary cache with ${fetchedItems.length} item(s)`);
        return {
            items: fetchedItems,
            source: 'store',
            warnings,
        };
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            logError(`[ConnectorStoreCache] Timed out fetching ${label} summaries after ${STORE_FETCH_TIMEOUT_MS}ms`, error);
        } else {
            logError(`[ConnectorStoreCache] Failed to fetch ${label} summaries from connector store`, error);
        }

        const warning = `[ConnectorStoreCache] Connector store summaries unavailable for ${label}.`;
        warnings.push(warning);

        if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
            logWarn(`[ConnectorStoreCache] Using stale ${label} summary cache due to store failure.`);
            warnings.push(`[ConnectorStoreCache] Using stale cached ${label}.`);
            return {
                items: cached.data,
                source: 'stale-cache',
                warnings,
            };
        }

        const fallbackCatalog = toCatalogFallbackItems(fallbackItems, itemType);
        logWarn(`[ConnectorStoreCache] Falling back to local ${label} list (${fallbackCatalog.length} item(s)).`);
        warnings.push(`[ConnectorStoreCache] Using local fallback ${label}.`);
        return {
            items: fallbackCatalog,
            source: 'local-db',
            warnings,
        };
    }
}

async function readDefinitionCacheForName(
    itemType: ConnectorStoreItemType,
    runtimeVersion: string,
    requestedName: string
): Promise<CacheReadResult> {
    const aliases = toRequestAliases(requestedName);
    let freshestStale: { fetchedAtMs: number; data: any } | null = null;

    for (const alias of aliases) {
        const filePath = buildDefinitionFilePath(itemType, runtimeVersion, alias);
        const cached = await readDefinitionCache(filePath);
        if (!cached) {
            continue;
        }

        if (isEntryFresh(cached.fetchedAt)) {
            return { fresh: cached.data };
        }

        const fetchedAtMs = Date.parse(cached.fetchedAt);
        const staleScore = Number.isNaN(fetchedAtMs) ? 0 : fetchedAtMs;
        if (!freshestStale || staleScore > freshestStale.fetchedAtMs) {
            freshestStale = {
                fetchedAtMs: staleScore,
                data: cached.data,
            };
        }
    }

    if (freshestStale) {
        return { stale: freshestStale.data };
    }

    return {};
}

async function resolveDefinitions(
    projectPath: string,
    itemType: ConnectorStoreItemType,
    names: string[],
    fallbackItems: any[]
): Promise<ConnectorDefinitionLookupResult> {
    const trimmedNames = names.map((name) => name.trim()).filter((name) => name.length > 0);
    const requestedNames = Array.from(new Set(trimmedNames));
    const detectedRuntimeVersion = await getRuntimeVersionFromPom(projectPath);
    const runtimeVersionUsed = getRuntimeVersionUsed(detectedRuntimeVersion);

    const definitionsByName: Record<string, any> = {};
    const missingNames: string[] = [];
    const fallbackUsedNames: string[] = [];
    const storeFailureNames: string[] = [];
    const warnings: string[] = [];
    const staleByName: Record<string, any> = {};
    const namesToFetch: string[] = [];

    for (const name of requestedNames) {
        const cached = await readDefinitionCacheForName(itemType, runtimeVersionUsed, name);
        if (cached.fresh) {
            definitionsByName[name] = cached.fresh;
            continue;
        }

        if (cached.stale) {
            staleByName[name] = cached.stale;
        }

        namesToFetch.push(name);
    }

    if (namesToFetch.length === 0) {
        return {
            definitionsByName,
            missingNames,
            fallbackUsedNames,
            storeFailureNames,
            warnings,
            runtimeVersionUsed,
        };
    }

    const label = itemType === 'connector' ? 'connector' : 'inbound endpoint';
    let fetchedDefinitions: any[] = [];
    let storeFailed = false;
    try {
        fetchedDefinitions = await fetchDefinitionsFromStore(namesToFetch, runtimeVersionUsed);
    } catch (error) {
        storeFailed = true;
        if (error instanceof Error && error.name === 'AbortError') {
            logError(`[ConnectorStoreCache] Timed out fetching ${label} details after ${STORE_FETCH_TIMEOUT_MS}ms`, error);
        } else {
            logError(`[ConnectorStoreCache] Failed to fetch ${label} details from connector store`, error);
        }
        warnings.push(`[ConnectorStoreCache] Connector store details unavailable for ${label} lookups.`);
    }

    if (storeFailed) {
        for (const name of namesToFetch) {
            if (staleByName[name]) {
                definitionsByName[name] = staleByName[name];
                warnings.push(`[ConnectorStoreCache] Using stale cached ${label} definition for '${name}'.`);
                continue;
            }

            const fallbackDefinition = findFallbackDefinition(name, fallbackItems);
            if (fallbackDefinition) {
                definitionsByName[name] = fallbackDefinition;
                fallbackUsedNames.push(name);
                storeFailureNames.push(name);
                const aliases = [...toRequestAliases(name), ...getDefinitionAliases(fallbackDefinition)];
                await writeDefinitionCaches(itemType, runtimeVersionUsed, fallbackDefinition, aliases);
                continue;
            }

            missingNames.push(name);
            storeFailureNames.push(name);
        }
    } else {
        for (const name of namesToFetch) {
            const fromStore = fetchedDefinitions.find((definition) => matchesDefinition(definition, name));
            if (fromStore) {
                definitionsByName[name] = fromStore;
                const aliases = [...toRequestAliases(name), ...getDefinitionAliases(fromStore)];
                await writeDefinitionCaches(itemType, runtimeVersionUsed, fromStore, aliases);
                continue;
            }

            const fallbackDefinition = findFallbackDefinition(name, fallbackItems);
            if (fallbackDefinition) {
                definitionsByName[name] = fallbackDefinition;
                fallbackUsedNames.push(name);
                warnings.push(`[ConnectorStoreCache] '${name}' was not returned by connector store. Using local fallback definition.`);
                const aliases = [...toRequestAliases(name), ...getDefinitionAliases(fallbackDefinition)];
                await writeDefinitionCaches(itemType, runtimeVersionUsed, fallbackDefinition, aliases);
                continue;
            }

            if (staleByName[name]) {
                definitionsByName[name] = staleByName[name];
                warnings.push(`[ConnectorStoreCache] '${name}' was not returned by connector store. Using stale cached definition.`);
                continue;
            }

            missingNames.push(name);
        }
    }

    return {
        definitionsByName,
        missingNames,
        fallbackUsedNames,
        storeFailureNames,
        warnings: dedupeWarnings(warnings),
        runtimeVersionUsed,
    };
}

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

export async function getConnectorDefinitions(
    projectPath: string,
    connectorNames: string[],
    fallbackConnectors: any[]
): Promise<ConnectorDefinitionLookupResult> {
    return resolveDefinitions(projectPath, 'connector', connectorNames, fallbackConnectors);
}

export async function getInboundDefinitions(
    projectPath: string,
    inboundNames: string[],
    fallbackInbounds: any[]
): Promise<ConnectorDefinitionLookupResult> {
    return resolveDefinitions(projectPath, 'inbound', inboundNames, fallbackInbounds);
}

export async function getConnectorStoreCatalog(
    projectPath: string,
    fallbackConnectors: any[],
    fallbackInbounds: any[]
): Promise<ConnectorStoreCatalog> {
    const runtimeVersion = await getRuntimeVersionFromPom(projectPath);
    const runtimeVersionUsed = getRuntimeVersionUsed(runtimeVersion);

    if (runtimeVersion === null) {
        logInfo(`[ConnectorStoreCache] Runtime version unavailable. Defaulting connector store runtime to ${DEFAULT_RUNTIME_VERSION}.`);
    }

    const [connectorResult, inboundResult] = await Promise.all([
        loadCatalog('connector', runtimeVersionUsed, fallbackConnectors),
        loadCatalog('inbound', runtimeVersionUsed, fallbackInbounds),
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
