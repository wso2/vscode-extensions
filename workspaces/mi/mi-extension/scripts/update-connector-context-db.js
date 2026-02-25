#!/usr/bin/env node
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

/* eslint-disable no-console */

const fs = require('fs/promises');
const path = require('path');

const API_BASE = process.env.CONNECTOR_STORE_BASE_URL
    || 'https://apis.wso2.com/qgpf/connector-store-backend/endpoint-9090-803/v1.0';
const SUMMARY_URL_TEMPLATE = `${API_BASE}/connectors/summaries?type=\${type}&limit=100&offset=0&product=MI`;
const DETAILS_URL = `${API_BASE}/connectors/details/filter`;
const PRODUCT = 'MI';
const RUNTIME_VERSION = process.env.MI_RUNTIME_VERSION || '4.5.0';
const MAX_NAMES_PER_REQUEST = 3;
const REQUEST_TIMEOUT_MS = 120000;
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1250;
const BATCH_DELAY_MS = 250;

const CONTEXT_DIR = path.resolve(__dirname, '../src/ai-features/agent-mode/context');
const TARGETS = [
    { type: 'Connector', fileName: 'connector_db.ts', exportName: 'CONNECTOR_DB' },
    { type: 'Inbound', fileName: 'inbound_db.ts', exportName: 'INBOUND_DB' },
];

function getRequestedTargets(argv) {
    const args = Array.isArray(argv) ? argv : [];
    const targetArg = args.find((arg) => arg.startsWith('--type='));
    if (!targetArg) {
        return TARGETS;
    }

    const requested = targetArg
        .slice('--type='.length)
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0);

    if (requested.length === 0) {
        throw new Error('No valid target types provided. Use --type=connector,inbound.');
    }

    const validValues = new Set(['connector', 'inbound']);
    for (const value of requested) {
        if (!validValues.has(value)) {
            throw new Error(`Unsupported target type '${value}'. Use connector and/or inbound.`);
        }
    }

    const selected = TARGETS.filter((target) => requested.includes(target.type.toLowerCase()));
    if (selected.length === 0) {
        throw new Error('No matching targets found for --type argument.');
    }

    return selected;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray(items, size) {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

function getConnectorName(item) {
    if (!item || typeof item !== 'object') {
        return '';
    }

    const rawName = item.connectorName || item.connector_name || item.name;
    if (typeof rawName !== 'string') {
        return '';
    }

    return rawName.trim();
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatchingArrayEnd(content, arrayStart, filePath, exportName) {
    if (content[arrayStart] !== '[') {
        throw new Error(`Expected array start for ${exportName} in ${filePath}.`);
    }

    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inTemplateLiteral = false;
    let inLineComment = false;
    let inBlockComment = false;
    let escaped = false;

    for (let i = arrayStart; i < content.length; i++) {
        const char = content[i];
        const next = content[i + 1];

        if (inLineComment) {
            if (char === '\n') {
                inLineComment = false;
            }
            continue;
        }

        if (inBlockComment) {
            if (char === '*' && next === '/') {
                inBlockComment = false;
                i++;
            }
            continue;
        }

        if (inSingleQuote) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === '\'') {
                inSingleQuote = false;
            }
            continue;
        }

        if (inDoubleQuote) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === '"') {
                inDoubleQuote = false;
            }
            continue;
        }

        if (inTemplateLiteral) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === '`') {
                inTemplateLiteral = false;
            }
            continue;
        }

        if (char === '/' && next === '/') {
            inLineComment = true;
            i++;
            continue;
        }

        if (char === '/' && next === '*') {
            inBlockComment = true;
            i++;
            continue;
        }

        if (char === '\'') {
            inSingleQuote = true;
            continue;
        }

        if (char === '"') {
            inDoubleQuote = true;
            continue;
        }

        if (char === '`') {
            inTemplateLiteral = true;
            continue;
        }

        if (char === '[') {
            depth++;
            continue;
        }

        if (char === ']') {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }

    throw new Error(`Could not find the end of the array export for ${exportName} in ${filePath}.`);
}

function findExportArrayRange(content, filePath, exportName) {
    const exportRegex = new RegExp(`\\bexport\\s+const\\s+${escapeRegex(exportName)}\\b`);
    const match = exportRegex.exec(content);

    if (!match) {
        throw new Error(`Could not find export declaration for ${exportName} in ${filePath}.`);
    }

    const equalsIndex = content.indexOf('=', match.index + match[0].length);
    if (equalsIndex < 0) {
        throw new Error(`Could not find '=' for export ${exportName} in ${filePath}.`);
    }

    const arrayStart = content.indexOf('[', equalsIndex);
    if (arrayStart < 0) {
        throw new Error(`Could not find array start for export ${exportName} in ${filePath}.`);
    }

    const arrayEnd = findMatchingArrayEnd(content, arrayStart, filePath, exportName);
    return { arrayStart, arrayEnd };
}

function normalizeArrayPayload(payload, label) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (payload && typeof payload === 'object') {
        if (Array.isArray(payload.data)) {
            return payload.data;
        }
        if (Array.isArray(payload.items)) {
            return payload.items;
        }
        if (Array.isArray(payload.connectors)) {
            return payload.connectors;
        }
    }

    throw new Error(`${label} payload is not an array.`);
}

async function fetchWithTimeout(url, init) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        return await fetch(url, {
            ...init,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeout);
    }
}

async function parseResponse(response, label) {
    const text = await response.text();

    if (!response.ok) {
        const bodySnippet = text ? ` - ${text.slice(0, 300)}` : '';
        throw new Error(`${label} failed: HTTP ${response.status} ${response.statusText}${bodySnippet}`);
    }

    if (text.trim().length === 0) {
        return [];
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`${label} returned non-JSON content.`);
    }
}

async function requestJson(url, init, label) {
    let lastError;

    for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
        try {
            const response = await fetchWithTimeout(url, init);
            return await parseResponse(response, label);
        } catch (error) {
            lastError = error;
            if (attempt < RETRY_COUNT) {
                console.warn(`${label} attempt ${attempt}/${RETRY_COUNT} failed. Retrying...`);
                await sleep(RETRY_DELAY_MS * attempt);
            }
        }
    }

    throw lastError;
}

async function fetchSummaries(type) {
    const summaryUrl = SUMMARY_URL_TEMPLATE.replace('${type}', encodeURIComponent(type));
    const payload = await requestJson(
        summaryUrl,
        {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        },
        `${type} summaries`
    );

    return normalizeArrayPayload(payload, `${type} summaries`);
}

function extractUniqueNames(summaries, type) {
    const names = [];
    const seen = new Set();

    for (const summary of summaries) {
        const name = getConnectorName(summary);
        if (!name || seen.has(name)) {
            continue;
        }
        seen.add(name);
        names.push(name);
    }

    if (names.length === 0) {
        throw new Error(`No ${type} names found from summaries.`);
    }

    return names;
}

function getConnectorDescription(item) {
    if (!item || typeof item !== 'object') {
        return '';
    }

    const rawDescription = item.description;
    return typeof rawDescription === 'string' ? rawDescription : '';
}

function getConnectorTypeValue(item, fallbackType) {
    if (!item || typeof item !== 'object') {
        return fallbackType;
    }

    const rawType = item.connectorType || item.connector_type;
    if (typeof rawType === 'string' && rawType.trim().length > 0) {
        return rawType.trim();
    }

    return fallbackType;
}

function createSummaryFallbackRecord(name, summary, type) {
    const baseRecord = {
        connectorName: name,
        repoName: '',
        description: getConnectorDescription(summary),
        connectorType: getConnectorTypeValue(summary, type),
        mavenGroupId: '',
        mavenArtifactId: '',
        version: {
            tagName: '',
            releaseId: '',
            isLatest: true,
            isDeprecated: false,
            operations: [],
            connections: [],
        },
        otherVersions: {},
        connectorRank: 0,
        iconUrl: '',
    };

    if (type === 'Inbound') {
        return {
            ...baseRecord,
            id: '',
        };
    }

    return baseRecord;
}

async function fetchDetailsBatch(type, connectorNames) {
    const payload = await requestJson(
        DETAILS_URL,
        {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                connectorNames,
                runtimeVersion: RUNTIME_VERSION,
                product: PRODUCT,
                latest: true,
            }),
        },
        `${type} details (${connectorNames.join(', ')})`
    );

    return normalizeArrayPayload(payload, `${type} details`);
}

async function fetchAllDetails(type, names) {
    const detailsByName = new Map();
    let missing = names.slice();
    const maxPasses = 3;

    for (let pass = 1; pass <= maxPasses && missing.length > 0; pass++) {
        if (pass > 1) {
            console.warn(`[${type}] retry pass ${pass} for ${missing.length} missing item(s).`);
        }

        const batches = chunkArray(missing, MAX_NAMES_PER_REQUEST);
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`[${type}] details batch ${i + 1}/${batches.length} with ${batch.length} item(s).`);

            try {
                const batchDetails = await fetchDetailsBatch(type, batch);
                for (const detail of batchDetails) {
                    const name = getConnectorName(detail);
                    if (name) {
                        detailsByName.set(name, detail);
                    }
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.warn(`[${type}] batch failed and will be retried in next pass: ${message}`);
            }

            await sleep(BATCH_DELAY_MS);
        }

        missing = names.filter((name) => !detailsByName.has(name));
    }

    if (missing.length > 0) {
        console.warn(`[${type}] missing API details for ${missing.length} item(s): ${missing.join(', ')}`);
    }

    return { detailsByName, missing };
}

// Assumes exported array content is pure JSON written by writeTsArrayFile().
// If hand-edits introduce TS/JS syntax (e.g., trailing commas, single quotes, comments),
// parsing may fail; switch to a TS/JS parser if hand-edited sources must be supported.
async function readExistingRecordsByName(filePath, exportName) {
    const existing = await fs.readFile(filePath, 'utf8');
    const { arrayStart, arrayEnd } = findExportArrayRange(existing, filePath, exportName);

    const rawArrayContent = existing.slice(arrayStart, arrayEnd + 1);
    let parsed;
    try {
        parsed = JSON.parse(rawArrayContent);
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(
            `Failed to parse existing export array for ${exportName} in ${filePath}. `
            + `This parser expects pure JSON array content, but found non-JSON syntax. `
            + `Possible causes: trailing commas, single-quoted strings, comments, or other TS/JS-only syntax. `
            + `Use strict JSON formatting for this export (or update this script to use a TS/JS parser). `
            + `Original parse error: ${reason}`
        );
    }

    if (!Array.isArray(parsed)) {
        throw new Error(`Parsed existing data from ${filePath} is not an array.`);
    }

    const recordsByName = new Map();
    for (const record of parsed) {
        const name = getConnectorName(record);
        if (name) {
            recordsByName.set(name, record);
        }
    }

    return recordsByName;
}

async function writeTsArrayFile(filePath, exportName, records) {
    const existing = await fs.readFile(filePath, 'utf8');
    const { arrayStart, arrayEnd } = findExportArrayRange(existing, filePath, exportName);
    const prefix = existing.slice(0, arrayStart);
    const suffix = existing.slice(arrayEnd + 1);
    const content = `${prefix}${JSON.stringify(records, null, 4)}${suffix}`;
    await fs.writeFile(filePath, content, 'utf8');
}

async function updateTarget(target) {
    const { type, fileName, exportName } = target;
    const filePath = path.join(CONTEXT_DIR, fileName);

    console.log(`\n=== Updating ${type} definitions ===`);
    const summaries = await fetchSummaries(type);
    const names = extractUniqueNames(summaries, type);
    const summariesByName = new Map(summaries.map((summary) => [getConnectorName(summary), summary]));
    console.log(`[${type}] fetched ${summaries.length} summaries, ${names.length} unique names.`);

    const { detailsByName, missing } = await fetchAllDetails(type, names);

    if (missing.length > 0) {
        const existingRecordsByName = await readExistingRecordsByName(filePath, exportName);
        let fallbackCount = 0;
        let summaryFallbackCount = 0;

        for (const name of missing) {
            const fallbackRecord = existingRecordsByName.get(name);
            if (fallbackRecord) {
                detailsByName.set(name, fallbackRecord);
                fallbackCount++;
            } else {
                const summary = summariesByName.get(name);
                detailsByName.set(name, createSummaryFallbackRecord(name, summary, type));
                summaryFallbackCount++;
            }
        }

        console.warn(
            `[${type}] used fallback records for ${fallbackCount} item(s) and summary-only placeholders for ${summaryFallbackCount} item(s).`
        );
    }

    const details = names.map((name) => detailsByName.get(name)).filter(Boolean);
    console.log(`[${type}] fetched ${details.length} detailed records.`);

    await writeTsArrayFile(filePath, exportName, details);
    console.log(`[${type}] wrote ${filePath}`);
}

async function main() {
    if (MAX_NAMES_PER_REQUEST > 3) {
        throw new Error('MAX_NAMES_PER_REQUEST must be 3 or less to avoid backend overload.');
    }

    const requestedTargets = getRequestedTargets(process.argv.slice(2));
    for (const target of requestedTargets) {
        await updateTarget(target);
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(`Failed to update connector context DB files: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}
