#!/usr/bin/env node
/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
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
const ts = require('typescript');

function stripQueryString(url) {
    const idx = url.indexOf('?');
    return idx >= 0 ? url.slice(0, idx) : url;
}

function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Required environment variable ${name} is not set. See .env.example for reference.`);
    }
    return value;
}

const SUMMARIES_BASE_URL = stripQueryString(requireEnv('MI_CONNECTOR_STORE_BACKEND_SUMMARIES'));
const DETAILS_URL = stripQueryString(requireEnv('MI_CONNECTOR_STORE_BACKEND_DETAILS_FILTER'));
const PRODUCT = 'MI';
const RUNTIME_VERSION = process.env.MI_RUNTIME_VERSION || '4.6.0';
const MAX_NAMES_PER_REQUEST = 3;
const REQUEST_TIMEOUT_MS = 120000;
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1250;
const BATCH_DELAY_MS = 250;
const SUMMARY_PAGE_SIZE = 100;

const CONTEXT_DIR = path.resolve(__dirname, '../src/ai-features/agent-mode/context');
const TARGETS = [
    { type: 'Connector', fileName: 'connector_db.ts', exportName: 'CONNECTOR_DB' },
    { type: 'Inbound', fileName: 'inbound_db.ts', exportName: 'INBOUND_DB' },
];

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
        let response;
        let retryableStatus = false;
        try {
            response = await fetchWithTimeout(url, init);
            retryableStatus = response.status === 429 || response.status >= 500;

            if (!response.ok && !retryableStatus) {
                // Non-retryable client failures (for example auth/config issues) should fail fast.
                return await parseResponse(response, label);
            }

            return await parseResponse(response, label);
        } catch (error) {
            lastError = error;
            if (response && !retryableStatus) {
                throw error;
            }
            if (attempt < RETRY_COUNT) {
                console.warn(`${label} attempt ${attempt}/${RETRY_COUNT} failed. Retrying...`);
                await sleep(RETRY_DELAY_MS * attempt);
            }
        }
    }

    throw lastError;
}

function getSummaryUrl(type, offset = 0, limit = SUMMARY_PAGE_SIZE) {
    return `${SUMMARIES_BASE_URL}?type=${encodeURIComponent(type)}&limit=${limit}&offset=${offset}&product=${encodeURIComponent(PRODUCT)}`;
}

async function fetchSummaries(type) {
    const summaries = [];
    let offset = 0;

    while (true) {
        const summaryUrl = getSummaryUrl(type, offset, SUMMARY_PAGE_SIZE);
        const payload = await requestJson(
            summaryUrl,
            {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                },
            },
            `${type} summaries (offset=${offset}, limit=${SUMMARY_PAGE_SIZE})`
        );

        const page = normalizeArrayPayload(payload, `${type} summaries`);
        summaries.push(...page);

        if (page.length < SUMMARY_PAGE_SIZE) {
            break;
        }

        offset += SUMMARY_PAGE_SIZE;
    }

    return summaries;
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

async function readExistingRecordsByName(filePath, exportName) {
    const existing = await fs.readFile(filePath, 'utf8');
    const exportIndex = existing.indexOf(`export const ${exportName} =`);
    if (exportIndex < 0) {
        throw new Error(`Could not find export declaration for ${exportName} in ${filePath}.`);
    }

    const arrayStart = existing.indexOf('[', exportIndex);
    if (arrayStart < 0) {
        throw new Error(`Could not parse array contents from ${filePath}.`);
    }

    const arrayEnd = findArrayEndIndex(existing, arrayStart, filePath, exportName);
    if (arrayEnd < 0 || arrayEnd < arrayStart) {
        throw new Error(`Could not parse array contents from ${filePath}.`);
    }

    const arrayLiteral = existing.slice(arrayStart, arrayEnd + 1);
    let parsed;
    try {
        parsed = parseArrayLiteralWithTypeScript(arrayLiteral, filePath, exportName);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
            `Failed to parse existing records for ${exportName} in ${filePath}. `
            + `Returning empty fallback map. Reason: ${message}`
        );
        return new Map();
    }

    if (!Array.isArray(parsed)) {
        console.warn(
            `Parsed existing data for ${exportName} in ${filePath} is not an array. `
            + 'Returning empty fallback map.'
        );
        return new Map();
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

function parseArrayLiteralWithTypeScript(arrayLiteral, filePath, exportName) {
    const sourceText = `const __parsed = ${arrayLiteral};`;
    const sourceFile = ts.createSourceFile(
        `${exportName}.ts`,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
    );

    if (sourceFile.parseDiagnostics.length > 0) {
        const diagnostic = sourceFile.parseDiagnostics[0];
        const diagnosticText = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        throw new Error(`TypeScript parse error near position ${diagnostic.start ?? 0}: ${diagnosticText}`);
    }

    const statement = sourceFile.statements[0];
    if (!statement || !ts.isVariableStatement(statement)) {
        throw new Error(`Expected a variable declaration while parsing ${exportName} in ${filePath}.`);
    }

    const declaration = statement.declarationList.declarations[0];
    const initializer = declaration?.initializer;
    if (!initializer || !ts.isArrayLiteralExpression(initializer)) {
        throw new Error(`Expected ${exportName} in ${filePath} to be an array literal.`);
    }

    return tsNodeToValue(initializer, filePath, exportName);
}

function tsNodeToValue(node, filePath, exportName) {
    if (ts.isParenthesizedExpression(node)) {
        return tsNodeToValue(node.expression, filePath, exportName);
    }

    if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
        return tsNodeToValue(node.expression, filePath, exportName);
    }

    if (ts.isArrayLiteralExpression(node)) {
        return node.elements.map((element) => {
            if (ts.isSpreadElement(element)) {
                throw new Error(`Spread elements are not supported while parsing ${exportName} in ${filePath}.`);
            }
            if (ts.isOmittedExpression(element)) {
                throw new Error(`Array holes are not supported while parsing ${exportName} in ${filePath}.`);
            }
            return tsNodeToValue(element, filePath, exportName);
        });
    }

    if (ts.isObjectLiteralExpression(node)) {
        const obj = {};
        for (const property of node.properties) {
            if (!ts.isPropertyAssignment(property)) {
                throw new Error(`Only plain object properties are supported while parsing ${exportName} in ${filePath}.`);
            }

            if (property.name && ts.isComputedPropertyName(property.name)) {
                throw new Error(`Computed property names are not supported while parsing ${exportName} in ${filePath}.`);
            }

            let key;
            if (ts.isIdentifier(property.name)) {
                key = property.name.text;
            } else if (ts.isStringLiteral(property.name) || ts.isNumericLiteral(property.name)) {
                key = property.name.text;
            } else {
                throw new Error(`Unsupported object property name while parsing ${exportName} in ${filePath}.`);
            }

            obj[key] = tsNodeToValue(property.initializer, filePath, exportName);
        }
        return obj;
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        return node.text;
    }

    if (ts.isNumericLiteral(node)) {
        return Number(node.text);
    }

    if (node.kind === ts.SyntaxKind.TrueKeyword) {
        return true;
    }

    if (node.kind === ts.SyntaxKind.FalseKeyword) {
        return false;
    }

    if (node.kind === ts.SyntaxKind.NullKeyword) {
        return null;
    }

    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) {
        return -Number(node.operand.text);
    }

    throw new Error(
        `Unsupported syntax kind "${ts.SyntaxKind[node.kind]}" while parsing ${exportName} in ${filePath}.`
    );
}

function findArrayEndIndex(content, arrayStart, filePath, exportName) {
    let depth = 0;
    let inString = false;
    let stringQuote = '';
    let escaped = false;
    let inLineComment = false;
    let inBlockComment = false;
    let inTemplateExpression = false;
    let templateExpressionDepth = 0;
    const templateResumeDepths = [];

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

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (stringQuote === '`' && char === '$' && next === '{') {
                inTemplateExpression = true;
                templateExpressionDepth++;
                templateResumeDepths.push(templateExpressionDepth - 1);
                inString = false;
                stringQuote = '';
                i++;
                continue;
            }
            if (char === stringQuote) {
                inString = false;
                stringQuote = '';
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

        if (char === '"' || char === '\'' || char === '`') {
            inString = true;
            stringQuote = char;
            continue;
        }

        if (inTemplateExpression) {
            if (char === '{') {
                templateExpressionDepth++;
                continue;
            }
            if (char === '}') {
                templateExpressionDepth--;
                if (
                    templateResumeDepths.length > 0
                    && templateExpressionDepth === templateResumeDepths[templateResumeDepths.length - 1]
                ) {
                    templateResumeDepths.pop();
                    inString = true;
                    stringQuote = '`';
                }
                if (templateExpressionDepth === 0) {
                    inTemplateExpression = false;
                }
                continue;
            }
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

    throw new Error(`Could not find end of exported array for ${exportName} in ${filePath}.`);
}

async function writeTsArrayFile(filePath, exportName, records) {
    const existing = await fs.readFile(filePath, 'utf8');
    const exportRegex = new RegExp(`export const\\s+${exportName}\\s*=\\s*`);
    const match = exportRegex.exec(existing);

    if (!match) {
        throw new Error(`Could not find export declaration for ${exportName} in ${filePath}.`);
    }

    const arrayStart = existing.indexOf('[', match.index + match[0].length);
    if (arrayStart < 0) {
        throw new Error(`Could not find array start for ${exportName} in ${filePath}.`);
    }

    const arrayEnd = findArrayEndIndex(existing, arrayStart, filePath, exportName);
    const prefix = existing.slice(0, arrayStart);
    const semicolonIndex = findStatementTerminatorIndex(existing, arrayEnd + 1);
    const assertionSuffix = semicolonIndex >= 0 ? existing.slice(arrayEnd + 1, semicolonIndex) : '';
    const remainingSuffix = semicolonIndex >= 0 ? existing.slice(semicolonIndex + 1) : existing.slice(arrayEnd + 1);
    const content = `${prefix}${JSON.stringify(records, null, 4)}${assertionSuffix};${remainingSuffix}`;
    await fs.writeFile(filePath, content, 'utf8');
}

function findStatementTerminatorIndex(content, startIndex) {
    let inString = false;
    let stringQuote = '';
    let escaped = false;
    let inLineComment = false;
    let inBlockComment = false;
    let braceDepth = 0;
    let parenDepth = 0;
    let bracketDepth = 0;
    let angleDepth = 0;
    let inTypeContext = false;

    const isIdentifierStart = (char) => /[A-Za-z_$]/.test(char);
    const isIdentifierPart = (char) => /[A-Za-z0-9_$]/.test(char);
    const findNextNonWhitespaceChar = (index) => {
        for (let cursor = index; cursor < content.length; cursor++) {
            if (!/\s/.test(content[cursor])) {
                return content[cursor];
            }
        }
        return '';
    };

    for (let i = startIndex; i < content.length; i++) {
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

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === stringQuote) {
                inString = false;
                stringQuote = '';
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

        if (char === '"' || char === '\'' || char === '`') {
            inString = true;
            stringQuote = char;
            continue;
        }

        if (isIdentifierStart(char)) {
            let end = i + 1;
            while (end < content.length && isIdentifierPart(content[end])) {
                end++;
            }
            const identifier = content.slice(i, end).toLowerCase();
            if (identifier === 'as' || identifier === 'satisfies') {
                inTypeContext = true;
            }
            i = end - 1;
            continue;
        }

        if (char === '{') {
            braceDepth++;
            continue;
        }

        if (char === '}' && braceDepth > 0) {
            braceDepth--;
            continue;
        }

        if (char === '(') {
            parenDepth++;
            continue;
        }

        if (char === ')' && parenDepth > 0) {
            parenDepth--;
            continue;
        }

        if (char === '[') {
            bracketDepth++;
            continue;
        }

        if (char === ']' && bracketDepth > 0) {
            bracketDepth--;
            continue;
        }

        if (char === '<' && (inTypeContext || angleDepth > 0)) {
            const nextNonWhitespace = findNextNonWhitespaceChar(i + 1);
            if (nextNonWhitespace && nextNonWhitespace !== '=') {
                angleDepth++;
            }
            continue;
        }

        if (char === '>' && angleDepth > 0) {
            angleDepth--;
            continue;
        }

        if (
            char === ';' &&
            braceDepth === 0 &&
            parenDepth === 0 &&
            bracketDepth === 0 &&
            angleDepth === 0
        ) {
            return i;
        }
    }

    return -1;
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

    for (const target of TARGETS) {
        await updateTarget(target);
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(`Failed to update connector context DB files: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    });
}
