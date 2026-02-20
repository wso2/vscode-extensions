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
import * as path from 'path';
import { parseStringPromise } from 'xml2js';
import { APIS } from '../../../constants';
import { logDebug, logError, logInfo } from '../../copilot/logger';
import { getCopilotProjectStorageDir } from '../storage-paths';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORE_FETCH_TIMEOUT_MS = 5000;
const CONNECTOR_CACHE_FILE_NAME = 'connector-store-connectors.json';
const INBOUND_CACHE_FILE_NAME = 'connector-store-inbounds.json';

interface StoreCacheFile {
    fetchedAt: string;
    runtimeVersion: string | null;
    items: any[];
}

interface LoadStoreItemsParams {
    projectPath: string;
    cacheFileName: string;
    urlTemplate: string | undefined;
    runtimeVersion: string | null;
    fallbackItems: any[];
    label: 'connectors' | 'inbound endpoints';
}

export interface ConnectorStoreCatalog {
    connectors: any[];
    inbounds: any[];
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

async function readCacheFile(cachePath: string): Promise<StoreCacheFile | null> {
    try {
        const content = await fs.promises.readFile(cachePath, 'utf8');
        const parsed = JSON.parse(content);

        if (Array.isArray(parsed)) {
            // Backward compatibility for plain-array cache files.
            return {
                fetchedAt: new Date(0).toISOString(),
                runtimeVersion: null,
                items: parsed,
            };
        }

        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            Array.isArray((parsed as StoreCacheFile).items) &&
            typeof (parsed as StoreCacheFile).fetchedAt === 'string'
        ) {
            const runtimeVersion = typeof (parsed as StoreCacheFile).runtimeVersion === 'string'
                ? (parsed as StoreCacheFile).runtimeVersion
                : null;

            return {
                fetchedAt: (parsed as StoreCacheFile).fetchedAt,
                runtimeVersion,
                items: (parsed as StoreCacheFile).items,
            };
        }
    } catch {
        return null;
    }

    return null;
}

function isCacheFresh(cache: StoreCacheFile, runtimeVersion: string | null): boolean {
    const fetchedAtMs = Date.parse(cache.fetchedAt);
    if (Number.isNaN(fetchedAtMs)) {
        return false;
    }

    if (Date.now() - fetchedAtMs >= CACHE_TTL_MS) {
        return false;
    }

    // If runtime version cannot be resolved from pom.xml, accept cache recency only.
    if (runtimeVersion === null) {
        return true;
    }

    return cache.runtimeVersion === runtimeVersion;
}

function isCacheForRuntime(cache: StoreCacheFile, runtimeVersion: string | null): boolean {
    // When runtime cannot be resolved, allow using available cache.
    if (runtimeVersion === null) {
        return true;
    }

    return cache.runtimeVersion === runtimeVersion;
}

async function writeCacheFile(
    cachePath: string,
    runtimeVersion: string | null,
    items: any[]
): Promise<void> {
    const content: StoreCacheFile = {
        fetchedAt: new Date().toISOString(),
        runtimeVersion,
        items,
    };

    await fs.promises.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.promises.writeFile(cachePath, JSON.stringify(content, null, 2), 'utf8');
}

function resolveStoreUrl(urlTemplate: string, runtimeVersion: string | null): string {
    return urlTemplate.replace('${version}', runtimeVersion ?? '');
}

function enhanceStoreUrl(rawUrl: string, label: LoadStoreItemsParams['label']): string {
    try {
        const url = new URL(rawUrl);

        // Connector store returns operation/parameter fields only when params=True.
        url.searchParams.set('params', 'True');

        // Backend expects this casing for inbound type values.
        if (label === 'inbound endpoints') {
            const typeValue = url.searchParams.get('type');
            if (typeValue && typeValue.toLowerCase() === 'inbound') {
                url.searchParams.set('type', 'Inbound');
            }
        }

        return url.toString();
    } catch {
        return rawUrl;
    }
}

async function fetchStoreItems(
    urlTemplate: string,
    runtimeVersion: string | null,
    label: LoadStoreItemsParams['label']
): Promise<any[]> {
    const resolvedUrl = resolveStoreUrl(urlTemplate, runtimeVersion);
    const storeUrl = enhanceStoreUrl(resolvedUrl, label);
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), STORE_FETCH_TIMEOUT_MS);
    let response: Response;
    try {
        response = await fetch(storeUrl, { signal: controller.signal });
    } finally {
        clearTimeout(timeoutHandle);
    }

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const storeData = await response.json();
    if (!Array.isArray(storeData)) {
        throw new Error('Store API response is not an array');
    }

    return storeData;
}

async function loadStoreItems(params: LoadStoreItemsParams): Promise<any[]> {
    const { projectPath, cacheFileName, urlTemplate, runtimeVersion, fallbackItems, label } = params;
    const cachePath = path.join(getCopilotProjectStorageDir(projectPath), cacheFileName);
    const cached = await readCacheFile(cachePath);

    if (cached && isCacheFresh(cached, runtimeVersion)) {
        logDebug(`[ConnectorStoreCache] Using fresh ${label} cache (${cachePath})`);
        return cached.items;
    }

    if (!urlTemplate) {
        if (cached?.items.length && isCacheForRuntime(cached, runtimeVersion)) {
            logInfo(`[ConnectorStoreCache] ${label} store URL not configured. Using cached ${label}.`);
            return cached.items;
        }

        if (cached?.items.length) {
            logInfo(`[ConnectorStoreCache] ${label} cached data runtime mismatch. Skipping cached ${label}.`);
        }
        logInfo(`[ConnectorStoreCache] ${label} store URL not configured. Using static fallback ${label}.`);
        return fallbackItems;
    }

    if (runtimeVersion === null) {
        if (cached?.items.length) {
            logInfo(`[ConnectorStoreCache] Runtime version unavailable. Using cached ${label}.`);
            return cached.items;
        }
        logInfo(`[ConnectorStoreCache] Runtime version unavailable. Using static fallback ${label}.`);
        return fallbackItems;
    }

    try {
        const storeItems = await fetchStoreItems(urlTemplate, runtimeVersion, label);
        await writeCacheFile(cachePath, runtimeVersion, storeItems);
        logDebug(`[ConnectorStoreCache] Refreshed ${label} cache with ${storeItems.length} item(s)`);
        return storeItems;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            logError(
                `[ConnectorStoreCache] Timed out fetching ${label} from store after ${STORE_FETCH_TIMEOUT_MS}ms`,
                error
            );
        } else {
            logError(`[ConnectorStoreCache] Failed to refresh ${label} from store`, error);
        }

        if (cached?.items.length && isCacheForRuntime(cached, runtimeVersion)) {
            logInfo(`[ConnectorStoreCache] Using stale cached ${label} due to refresh failure.`);
            return cached.items;
        }

        if (cached?.items.length) {
            logInfo(`[ConnectorStoreCache] Stale ${label} cache runtime mismatch. Using fallback ${label}.`);
        }
        logInfo(`[ConnectorStoreCache] Using static fallback ${label} due to refresh failure.`);
        return fallbackItems;
    }
}

export async function getConnectorStoreCatalog(
    projectPath: string,
    fallbackConnectors: any[],
    fallbackInbounds: any[]
): Promise<ConnectorStoreCatalog> {
    const runtimeVersion = await getRuntimeVersionFromPom(projectPath);

    const [connectors, inbounds] = await Promise.all([
        loadStoreItems({
            projectPath,
            cacheFileName: CONNECTOR_CACHE_FILE_NAME,
            urlTemplate: APIS.MI_CONNECTOR_STORE_BACKEND,
            runtimeVersion,
            fallbackItems: fallbackConnectors,
            label: 'connectors',
        }),
        loadStoreItems({
            projectPath,
            cacheFileName: INBOUND_CACHE_FILE_NAME,
            urlTemplate: process.env.MI_CONNECTOR_STORE_BACKEND_INBOUND_ENDPOINTS,
            runtimeVersion,
            fallbackItems: fallbackInbounds,
            label: 'inbound endpoints',
        }),
    ]);

    return { connectors, inbounds };
}
