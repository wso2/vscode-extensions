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

import * as path from 'path';
import {
	ApiCollection,
	ApiRequest,
	ApiRequestItem,
	ApiResponse,
	BinaryFileParameter,
	FormDataParameter,
	FormUrlEncodedParameter,
	HeaderParameter,
	QueryParameter
} from '@wso2/api-tryit-core';

type RequestSectionName = 'basic-auth' | 'query' | 'form' | 'multipart' | 'cookies' | 'options';
type ResponseSectionName = 'captures' | 'asserts';

const REQUEST_LINE_REGEX = /^([A-Z][A-Z0-9_-]*)\s+(.+)$/;
const RESPONSE_LINE_REGEX = /^HTTP(?:\/1\.0|\/1\.1|\/2)?\s+([0-9]+)(?:\s+.*)?$/i;
const HEADER_ASSERTION_OPERATORS = 'contains|notContains|startsWith|endsWith|matches|notMatches|isNull|isNotEmpty|isEmpty|isDefined|isUndefined|isTruthy|isFalsy|isNumber|isString|isBoolean|isArray|isJson|==|!=|>=|<=|>|<|=';

export interface ParseHurlCollectionOptions {
	collectionId?: string;
	collectionName?: string;
	sourceFilePath?: string;
}

export interface SerializeHurlCollectionOptions {
	includeMetadataComments?: boolean;
	includeFolderComments?: boolean;
}

export interface HurlRequestPayload {
	name?: string;
	content: string;
	folderPath?: string;
}

export interface HurlFolderPayload {
	name: string;
	items: HurlRequestPayload[];
}

export interface HurlCollectionPayload {
	name: string;
	description?: string;
	id?: string;
	requests?: HurlRequestPayload[];
	rootItems?: HurlRequestPayload[];
	folders?: HurlFolderPayload[];
}

interface ParsedRequestPart {
	headers: HeaderParameter[];
	queryParameters: QueryParameter[];
	body?: string;
	bodyFormData?: FormDataParameter[];
	bodyFormUrlEncoded?: FormUrlEncodedParameter[];
	bodyBinaryFiles?: BinaryFileParameter[];
}

export * from './hurl-collection-file';
export { HurlFormatAdapter } from './hurl-format-adapter';

export function parseHurlCollection(hurlContent: string, options: ParseHurlCollectionOptions = {}): ApiCollection {
	if (typeof hurlContent !== 'string' || hurlContent.trim().length === 0) {
		throw new Error('Invalid hurl content provided');
	}

	const normalizedInput = hurlContent.includes('\\n') && !hurlContent.includes('\n')
		? hurlContent.replace(/\\n/g, '\n')
		: hurlContent;
	const normalizedContent = normalizeLineEndings(normalizedInput).trim();
	const requestBlocks = splitIntoRequestBlocks(normalizedContent);

	if (requestBlocks.length === 0) {
		throw new Error('Could not parse Hurl content: no request entries found');
	}

	const fallbackBaseName = deriveCollectionBaseName(options.sourceFilePath);
	const collectionId = sanitizeId(options.collectionId) || sanitizeId(fallbackBaseName) || `hurl-collection-${Date.now()}`;
	const collectionName = normalizeCollectionName(options.collectionName, fallbackBaseName);

	const rootItems: ApiRequestItem[] = [];
	const foldersMap = new Map<string, ApiRequestItem[]>();

	requestBlocks.forEach((block, index) => {
		const item = parseRequestBlock(block, index + 1);
		const folderName = extractFolderName(block);
		if (folderName) {
			if (!foldersMap.has(folderName)) { foldersMap.set(folderName, []); }
			foldersMap.get(folderName)!.push(item);
		} else {
			rootItems.push(item);
		}
	});

	const folders = Array.from(foldersMap.entries()).map(([name, items]) => ({
		id: sanitizeId(name) || name,
		name,
		items
	}));

	return {
		id: collectionId,
		name: collectionName,
		folders,
		rootItems
	};
}

export function hurlToApiRequestItem(hurlContent: string): ApiRequestItem {
	const collection = parseHurlCollection(hurlContent, { collectionName: 'Imported Hurl Request' });
	const firstRequest = collection.rootItems?.[0];
	if (!firstRequest) {
		throw new Error('Could not parse Hurl content');
	}
	return firstRequest;
}

export function apiCollectionToHurl(
	collection: ApiCollection,
	options: SerializeHurlCollectionOptions = {}
): string {
	if (!collection || typeof collection !== 'object') {
		throw new Error('Invalid ApiCollection provided');
	}

	const includeMetadataComments = options.includeMetadataComments !== false;
	const includeFolderComments = options.includeFolderComments !== false;
	const requestEntries: Array<{ item: ApiRequestItem; folderName?: string }> = [];

	for (const item of collection.rootItems || []) {
		requestEntries.push({ item });
	}

	for (const folder of collection.folders || []) {
		for (const item of folder.items || []) {
			requestEntries.push({ item, folderName: folder.name });
		}
	}

	if (requestEntries.length === 0) {
		throw new Error('ApiCollection has no request items to serialize');
	}

	const blocks = requestEntries.map((entry, index) =>
		apiRequestItemToHurl(entry.item, {
			includeMetadataComments,
			includeFolderComment: includeFolderComments,
			folderName: entry.folderName,
			emitLeadingSeparator: index > 0
		})
	);

	return blocks.join('\n\n').trimEnd() + '\n';
}

interface SerializeRequestOptions {
	includeMetadataComments: boolean;
	includeFolderComment: boolean;
	folderName?: string;
	emitLeadingSeparator: boolean;
}

function apiRequestItemToHurl(item: ApiRequestItem, options: SerializeRequestOptions): string {
	if (!item || !item.request) {
		throw new Error('Invalid ApiRequestItem provided');
	}

	const request = item.request;
	const lines: string[] = [];

	if (options.emitLeadingSeparator) {
		lines.push('');
	}

	if (options.includeFolderComment && options.folderName && options.folderName.trim()) {
		lines.push(`# @folder ${options.folderName.trim()}`);
	}

	if (options.includeMetadataComments) {
		if (request.id || item.id) {
			lines.push(`# @id ${request.id || item.id}`);
		}
		if (request.name || item.name) {
			lines.push(`# @name ${request.name || item.name}`);
		}
	}

	const method = (request.method || 'GET').toUpperCase();
	const fullUrl = buildRequestUrl(request.url, request.queryParameters || []);
	lines.push(`${method} ${fullUrl}`);

	const activeHeaders = (request.headers || []).filter(header => header?.key?.trim());
	for (const header of activeHeaders) {
		lines.push(`${header.key}: ${header.value ?? ''}`);
	}

	const hasFormSection = Array.isArray(request.bodyFormUrlEncoded) && request.bodyFormUrlEncoded.length > 0;
	const hasMultipartSection = Array.isArray(request.bodyFormData) && request.bodyFormData.length > 0;
	const hasRawBody = typeof request.body === 'string' && request.body.trim().length > 0;

	if (hasRawBody && !hasFormSection && !hasMultipartSection) {
		lines.push('');
		lines.push(...splitToLinesPreserveEmpty(request.body || ''));
	}

	if (hasFormSection) {
		lines.push('[Form]');
		for (const formParam of request.bodyFormUrlEncoded || []) {
			lines.push(`${formParam.key}: ${formParam.value ?? ''}`);
		}
	}

	if (hasMultipartSection) {
		lines.push('[Multipart]');
		for (const part of request.bodyFormData || []) {
			if (part.filePath) {
				const suffix = part.contentType ? ` ${part.contentType}` : '';
				lines.push(`${part.key}: file,${part.filePath};${suffix}`);
			} else {
				lines.push(`${part.key}: ${part.value ?? ''}`);
			}
		}
	}

	const hasBinarySection = Array.isArray(request.bodyBinaryFiles) && request.bodyBinaryFiles.length > 0;
	if (hasBinarySection && !hasFormSection && !hasMultipartSection) {
		lines.push('[Multipart]');
		for (const file of request.bodyBinaryFiles || []) {
			const suffix = file.contentType ? ` ${file.contentType}` : '';
			lines.push(`file: file,${file.filePath || ''};${suffix}`);
		}
	}

	const assertions = mergeAssertions(item.assertions, request.assertions);
	const { statusLine, otherAssertions } = splitStatusAssertion(assertions);

	if (statusLine || otherAssertions.length > 0) {
		lines.push('');
		if (statusLine) {
			lines.push(statusLine);
		}
		if (otherAssertions.length > 0) {
			lines.push('[Asserts]');
			for (const assertion of otherAssertions) {
				lines.push(convertAssertionToHurlFormat(assertion));
			}
		}
	}

	return lines.join('\n').trim();
}

export function normalizeHurlCollectionPayload(input: unknown): HurlCollectionPayload {
	const obj = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

	const name = ensureString(obj.name);
	if (!name) {
		throw new Error('Collection payload must have a `name` string');
	}

	const description = ensureString(obj.description);
	const id = ensureString(obj.id);

	const rawRequests = Array.isArray(obj.requests)
		? (obj.requests as unknown[])
		: (Array.isArray(obj.rootItems) ? (obj.rootItems as unknown[]) : []);

	const requests: HurlRequestPayload[] = rawRequests.map((entry, index) => normalizeRequestEntry(entry, index));

	const rawFolders = Array.isArray(obj.folders) ? (obj.folders as unknown[]) : [];
	const folders: HurlFolderPayload[] = rawFolders.map((folder, folderIndex) => {
		if (!folder || typeof folder !== 'object') {
			throw new Error('Invalid folder entry in payload');
		}

		const folderObject = folder as Record<string, unknown>;
		const folderName = ensureString(folderObject.name) || `Folder ${folderIndex + 1}`;
		const folderItemsRaw = Array.isArray(folderObject.items)
			? folderObject.items
			: (Array.isArray(folderObject.requests) ? folderObject.requests : []);

		const items: HurlRequestPayload[] = folderItemsRaw.map((item, itemIndex) => normalizeRequestEntry(item, itemIndex));

		return {
			name: folderName,
			items
		};
	});

	return {
		name,
		description,
		id,
		requests,
		folders
	};
}

function normalizeRequestEntry(entry: unknown, index: number): HurlRequestPayload {
	if (typeof entry === 'string') {
		return {
			name: `Request ${index + 1}`,
			content: validateHurlContent(entry)
		};
	}

	if (!entry || typeof entry !== 'object') {
		throw new Error('Invalid request entry in payload');
	}

	const entryObject = entry as Record<string, unknown>;
	const content = validateHurlContent(entryObject.content ?? entryObject.request ?? entryObject.hurl);
	const name = ensureString(entryObject.name) || `Request ${index + 1}`;
	const folderPath = ensureString(entryObject.folderPath) || ensureString(entryObject.folder);

	return {
		name,
		content,
		folderPath
	};
}

function validateHurlContent(content: unknown): string {
	if (typeof content !== 'string' || content.trim().length === 0) {
		throw new Error('Each request must have a valid `content` string with Hurl text');
	}

	const parsed = parseHurlCollection(content, { collectionName: 'Validation' });
	if (!parsed.rootItems || parsed.rootItems.length === 0) {
		throw new Error('Could not parse Hurl content');
	}

	return content;
}

function extractFolderName(block: string): string | undefined {
	for (const line of block.split('\n')) {
		const trimmed = line.trim();
		if (trimmed.startsWith('# @folder ')) {
			return trimmed.substring(10).trim() || undefined;
		}
	}
	return undefined;
}

function parseRequestBlock(block: string, requestIndex: number): ApiRequestItem {
	const lines = normalizeLineEndings(block).split('\n');
	let cursor = 0;
	let requestLineFound = false;
	let method = 'GET';
	let rawUrl = '';
	const metadata: { id?: string; name?: string } = {};

	for (; cursor < lines.length; cursor++) {
		const trimmed = lines[cursor].trim();
		if (!trimmed) {
			continue;
		}

		if (trimmed.startsWith('#')) {
			if (trimmed.startsWith('# @id ')) {
				metadata.id = trimmed.substring(6).trim();
			} else if (trimmed.startsWith('# @name ')) {
				metadata.name = trimmed.substring(8).trim();
			}
			continue;
		}

		const requestLineMatch = parseRequestLine(trimmed);
		if (!requestLineMatch) {
			throw new Error(`Invalid Hurl request line near: ${trimmed}`);
		}

		method = normalizeMethod(requestLineMatch.method);
		rawUrl = requestLineMatch.url;
		requestLineFound = true;
		cursor += 1;
		break;
	}

	if (!requestLineFound || !rawUrl) {
		throw new Error('Invalid Hurl request: missing METHOD URL line');
	}

	const responseStartIndex = findResponseStartIndex(lines, cursor);
	const requestLines = responseStartIndex >= 0 ? lines.slice(cursor, responseStartIndex) : lines.slice(cursor);
	const responseLines = responseStartIndex >= 0 ? lines.slice(responseStartIndex) : [];

	const { url, queryParameters: queryParamsFromUrl } = parseUrlAndQuery(rawUrl, requestIndex);
	const parsedRequestPart = parseRequestPart(requestLines, requestIndex, queryParamsFromUrl.length);
	const assertions = parseResponsePart(responseLines);

	const requestId = sanitizeId(metadata.id) || `request-${requestIndex}`;
	const requestName = metadata.name?.trim() || `${method} ${url}`;
	const request: ApiRequest = {
		id: requestId,
		name: requestName,
		method: method as ApiRequest['method'],
		url,
		queryParameters: [...queryParamsFromUrl, ...parsedRequestPart.queryParameters],
		headers: parsedRequestPart.headers
	};

	if (parsedRequestPart.body) {
		request.body = parsedRequestPart.body;
	}

	if (parsedRequestPart.bodyFormData && parsedRequestPart.bodyFormData.length > 0) {
		request.bodyFormData = parsedRequestPart.bodyFormData;
	}

	if (parsedRequestPart.bodyFormUrlEncoded && parsedRequestPart.bodyFormUrlEncoded.length > 0) {
		request.bodyFormUrlEncoded = parsedRequestPart.bodyFormUrlEncoded;
	}

	if (parsedRequestPart.bodyBinaryFiles && parsedRequestPart.bodyBinaryFiles.length > 0) {
		request.bodyBinaryFiles = parsedRequestPart.bodyBinaryFiles;
	}

	if (assertions.length > 0) {
		request.assertions = assertions;
	}

	const item: ApiRequestItem = {
		id: requestId,
		name: requestName,
		request
	};

	if (assertions.length > 0) {
		item.assertions = assertions;
	}

	// When there is no real HTTP response line, the stored response comments live in requestLines.
	// Pass all lines from cursor onwards so parseResponseComments can find them.
	const cachedResponse = parseResponseComments(responseStartIndex >= 0 ? responseLines : lines.slice(cursor));
	if (cachedResponse) {
		item.response = cachedResponse;
	}

	return item;
}

function parseResponseComments(lines: string[]): ApiResponse | undefined {
	let inResponseSection = false;
	let inHeaderSection = false;
	let inBodySection = false;
	const response: Partial<ApiResponse & { headers: Array<{ key: string; value: string }> }> = {};
	const bodyLines: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();

		if (trimmed === '# Response:') {
			inResponseSection = true;
			inHeaderSection = false;
			inBodySection = false;
			continue;
		}

		if (!inResponseSection) { continue; }

		if (trimmed.startsWith('# Status:')) {
			response.statusCode = parseInt(trimmed.substring(9).trim(), 10);
		} else if (trimmed === '# Headers:') {
			inHeaderSection = true;
			inBodySection = false;
			if (!response.headers) { response.headers = []; }
		} else if (trimmed === '# Body:') {
			inHeaderSection = false;
			inBodySection = true;
		} else if (inHeaderSection && trimmed.startsWith('#   ')) {
			const headerLine = trimmed.substring(4);
			const colonIdx = headerLine.indexOf(':');
			if (colonIdx > 0) {
				response.headers!.push({
					key: headerLine.substring(0, colonIdx).trim(),
					value: headerLine.substring(colonIdx + 1).trim()
				});
			}
		} else if (inBodySection && trimmed.startsWith('#')) {
			bodyLines.push(line.startsWith('# ') ? line.slice(2) : line.slice(1));
		}
	}

	if (!response.statusCode) { return undefined; }

	if (bodyLines.length > 0) {
		response.body = bodyLines.join('\n').trimEnd();
	}

	return response as ApiResponse;
}

function parseRequestPart(lines: string[], requestIndex: number, initialQueryCount: number): ParsedRequestPart {
	const headers: HeaderParameter[] = [];
	const queryParameters: QueryParameter[] = [];
	const formParams: FormUrlEncodedParameter[] = [];
	const multipartParams: FormDataParameter[] = [];
	const bodyLines: string[] = [];
	const cookies: Array<{ key: string; value: string }> = [];
	const basicAuthPairs: Array<{ key: string; value: string }> = [];

	let activeSection: RequestSectionName | null = null;
	let bodyStarted = false;
	let headerCount = 0;
	let queryCount = initialQueryCount;
	let formCount = 0;
	let multipartCount = 0;

	for (const line of lines) {
		const trimmed = line.trim();

		if (!trimmed) {
			if (bodyStarted) {
				bodyLines.push('');
			}
			continue;
		}

		if (trimmed.startsWith('#')) {
			continue;
		}

		const sectionName = parseRequestSectionName(trimmed);
		if (sectionName) {
			activeSection = sectionName;
			bodyStarted = false;
			continue;
		}

		if (activeSection) {
			if (activeSection === 'options') {
				continue;
			}

			const entry = parseKeyValueLine(line);
			if (!entry) {
				continue;
			}

			switch (activeSection) {
				case 'query':
					queryCount += 1;
					queryParameters.push({
						id: `query-${requestIndex}-${queryCount}`,
						key: entry.key,
						value: entry.value
					});
					break;
				case 'form':
					formCount += 1;
					formParams.push({
						id: `form-${requestIndex}-${formCount}`,
						key: entry.key,
						value: entry.value
					});
					break;
				case 'multipart': {
					multipartCount += 1;
					const multipartParam = parseMultipartParam(entry, requestIndex, multipartCount);
					if (multipartParam) {
						multipartParams.push(multipartParam);
					}
					break;
				}
				case 'cookies':
					cookies.push({ key: entry.key, value: entry.value });
					break;
				case 'basic-auth':
					basicAuthPairs.push(entry);
					break;
				default:
					break;
			}
			continue;
		}

		if (!bodyStarted) {
			const header = parseKeyValueLine(line);
			if (header && isLikelyHeaderKey(header.key)) {
				headerCount += 1;
				headers.push({
					id: `header-${requestIndex}-${headerCount}`,
					key: header.key,
					value: header.value
				});
				continue;
			}
		}

		bodyStarted = true;
		bodyLines.push(line);
	}

	if (cookies.length > 0) {
		headerCount += 1;
		headers.push({
			id: `header-${requestIndex}-${headerCount}`,
			key: 'Cookie',
			value: cookies.map(cookie => `${cookie.key}=${cookie.value}`).join('; ')
		});
	}

	const basicAuthHeaderValue = buildBasicAuthHeader(basicAuthPairs);
	if (basicAuthHeaderValue) {
		headerCount += 1;
		headers.push({
			id: `header-${requestIndex}-${headerCount}`,
			key: 'Authorization',
			value: basicAuthHeaderValue
		});
	}

	const requestPart: ParsedRequestPart = {
		headers,
		queryParameters
	};

	if (formParams.length > 0) {
		requestPart.bodyFormUrlEncoded = formParams;
	}

	if (multipartParams.length > 0) {
		requestPart.bodyFormData = multipartParams;
	}

	const binaryBodyLines: string[] = [];
	const remainingBodyLines: string[] = [];
	for (const line of bodyLines) {
		const binaryMatch = line.trim().match(/^file,([^;]+);(?:\s*(.+))?$/i);
		if (binaryMatch) {
			binaryBodyLines.push(line);
		} else {
			remainingBodyLines.push(line);
		}
	}

	if (binaryBodyLines.length > 0) {
		requestPart.bodyBinaryFiles = binaryBodyLines.map((line, i) => {
			const m = line.trim().match(/^file,([^;]+);(?:\s*(.+))?$/i)!;
			return { id: `binary-${i + 1}`, filePath: m[1].trim(), contentType: m[2]?.trim() ?? '' };
		});
	}

	const body = trimEdgeEmptyLines(remainingBodyLines).join('\n').trim();
	if (body) {
		requestPart.body = body;
	}

	return requestPart;
}

function parseResponsePart(lines: string[]): string[] {
	if (lines.length === 0) {
		return [];
	}

	const assertions: string[] = [];
	let cursor = 0;

	while (cursor < lines.length) {
		const trimmed = lines[cursor].trim();
		if (!trimmed || trimmed.startsWith('#')) {
			cursor += 1;
			continue;
		}
		break;
	}

	if (cursor >= lines.length) {
		return assertions;
	}

	const statusMatch = lines[cursor].trim().match(RESPONSE_LINE_REGEX);
	if (!statusMatch) {
		return assertions;
	}

	assertions.push(`HTTP ${statusMatch[1]}`);
	cursor += 1;

	let activeSection: ResponseSectionName | null = null;
	let responseBodyStarted = false;

	for (; cursor < lines.length; cursor++) {
		const line = lines[cursor];
		const trimmed = line.trim();

		if (!trimmed) {
			continue;
		}

		if (trimmed.startsWith('#')) {
			continue;
		}

		const sectionName = parseResponseSectionName(trimmed);
		if (sectionName) {
			activeSection = sectionName;
			responseBodyStarted = false;
			continue;
		}

		if (activeSection === 'captures') {
			continue;
		}

		if (activeSection === 'asserts') {
			assertions.push(convertAssertionFromHurlFormat(trimmed));
			continue;
		}

		if (responseBodyStarted) {
			continue;
		}

		if (/^status\s+/i.test(trimmed) || /^HTTP\s+/i.test(trimmed)) {
			assertions.push(convertAssertionFromHurlFormat(trimmed));
			continue;
		}

		const header = parseKeyValueLine(line);
		if (header) {
			assertions.push(`headers.${header.key} == ${header.value}`);
			continue;
		}

		responseBodyStarted = true;
	}

	return assertions;
}

function parseUrlAndQuery(rawUrl: string, requestIndex: number): { url: string; queryParameters: QueryParameter[] } {
	const queryStart = rawUrl.indexOf('?');
	const baseUrl = queryStart >= 0 ? rawUrl.slice(0, queryStart) : rawUrl;
	const rawQuery = queryStart >= 0 ? rawUrl.slice(queryStart + 1) : '';
	const queryParameters: QueryParameter[] = [];

	if (rawQuery) {
		let paramIndex = 0;
		for (const param of rawQuery.split('&')) {
			if (!param) {
				continue;
			}

			paramIndex += 1;
			const [rawKey, ...rest] = param.split('=');
			const rawValue = rest.join('=');

			queryParameters.push({
				id: `query-${requestIndex}-${paramIndex}`,
				key: safeDecode(rawKey || ''),
				value: safeDecode(rawValue || '')
			});
		}
	}

	return {
		url: baseUrl,
		queryParameters
	};
}

function normalizeMethod(method: string): string {
	return method.trim().toUpperCase();
}

function splitIntoRequestBlocks(content: string): string[] {
	const lines = content.split('\n');
	const requestLineIndexes: number[] = [];

	for (let index = 0; index < lines.length; index++) {
		if (parseRequestLine(lines[index].trim())) {
			requestLineIndexes.push(index);
		}
	}

	if (requestLineIndexes.length === 0) {
		return [];
	}

	const blockStartIndexes: number[] = [];
	for (let index = 0; index < requestLineIndexes.length; index++) {
		const requestLineIndex = requestLineIndexes[index];
		const lowerBound = index === 0 ? 0 : requestLineIndexes[index - 1] + 1;
		let blockStart = requestLineIndex;

		for (let lineIndex = requestLineIndex - 1; lineIndex >= lowerBound; lineIndex--) {
			const trimmed = lines[lineIndex].trim();
			if (!trimmed) {
				// Stop at empty lines (consistent with computeRequestBlockStarts behaviour)
				break;
			}
			if (trimmed.startsWith('#')) {
				blockStart = lineIndex;
				continue;
			}
			break;
		}

		blockStartIndexes.push(blockStart);
	}

	const blocks: string[] = [];
	for (let index = 0; index < blockStartIndexes.length; index++) {
		const start = blockStartIndexes[index];
		const end = index < blockStartIndexes.length - 1 ? blockStartIndexes[index + 1] : lines.length;
		const block = lines.slice(start, end).join('\n').trim();
		if (block) {
			blocks.push(block);
		}
	}

	return blocks;
}

function parseRequestLine(line: string): { method: string; url: string } | null {
	const match = line.match(REQUEST_LINE_REGEX);
	if (!match) {
		return null;
	}

	const method = match[1].toUpperCase();
	if (method === 'HTTP') {
		return null;
	}

	return {
		method,
		url: match[2].trim()
	};
}

function findResponseStartIndex(lines: string[], startIndex: number): number {
	for (let index = startIndex; index < lines.length; index++) {
		const trimmed = lines[index].trim();
		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}

		if (RESPONSE_LINE_REGEX.test(trimmed)) {
			return index;
		}
	}
	return -1;
}

function parseKeyValueLine(line: string): { key: string; value: string } | null {
	const separatorIndex = line.indexOf(':');
	if (separatorIndex <= 0) {
		return null;
	}

	const key = line.slice(0, separatorIndex).trim();
	const value = line.slice(separatorIndex + 1).trim();
	if (!key) {
		return null;
	}

	return { key, value };
}

function isLikelyHeaderKey(key: string): boolean {
	return /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(key);
}

function parseRequestSectionName(line: string): RequestSectionName | null {
	if (/^\[(QueryStringParams|Query)\]$/i.test(line)) {
		return 'query';
	}
	if (/^\[(FormParams|Form)\]$/i.test(line)) {
		return 'form';
	}
	if (/^\[(MultipartFormData|Multipart)\]$/i.test(line)) {
		return 'multipart';
	}
	if (/^\[Cookies\]$/i.test(line)) {
		return 'cookies';
	}
	if (/^\[BasicAuth\]$/i.test(line)) {
		return 'basic-auth';
	}
	if (/^\[Options\]$/i.test(line)) {
		return 'options';
	}
	return null;
}

function parseResponseSectionName(line: string): ResponseSectionName | null {
	if (/^\[Captures\]$/i.test(line)) {
		return 'captures';
	}
	if (/^\[Asserts\]$/i.test(line)) {
		return 'asserts';
	}
	return null;
}

function parseMultipartParam(entry: { key: string; value: string }, requestIndex: number, paramIndex: number): FormDataParameter | null {
	if (!entry.key) {
		return null;
	}

	const fileMatch = entry.value.match(/^file,\s*([^;]+)\s*;\s*(.*)$/i);
	if (fileMatch) {
		return {
			id: `multipart-${requestIndex}-${paramIndex}`,
			key: entry.key,
			contentType: fileMatch[2]?.trim() || '',
			filePath: fileMatch[1].trim()
		};
	}

	return {
		id: `multipart-${requestIndex}-${paramIndex}`,
		key: entry.key,
		value: entry.value,
		contentType: ''
	};
}

function buildBasicAuthHeader(pairs: Array<{ key: string; value: string }>): string | undefined {
	if (pairs.length === 0) {
		return undefined;
	}

	let username = '';
	let password = '';

	for (const pair of pairs) {
		const key = pair.key.toLowerCase();
		if (!username && (key === 'username' || key === 'user')) {
			username = pair.value;
		}
		if (!password && (key === 'password' || key === 'pass')) {
			password = pair.value;
		}
	}

	if (!username && pairs.length > 0) {
		username = pairs[0].value;
	}
	if (!password && pairs.length > 1) {
		password = pairs[1].value;
	}
	if (!username && !password) {
		return undefined;
	}

	return `Basic ${globalThis.Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function buildRequestUrl(url: string, queryParameters: QueryParameter[]): string {
	if (!url) {
		return '';
	}

	if (url.includes('?') || queryParameters.length === 0) {
		return url;
	}

	const queryString = queryParameters
		.filter(param => param.key)
		.map(param => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value || '')}`)
		.join('&');

	return queryString ? `${url}?${queryString}` : url;
}

function splitToLinesPreserveEmpty(content: string): string[] {
	return normalizeLineEndings(content).split('\n');
}

function mergeAssertions(...sources: Array<string[] | undefined>): string[] {
	const merged: string[] = [];
	for (const source of sources) {
		for (const assertion of source || []) {
			if (!assertion || typeof assertion !== 'string') {
				continue;
			}
			if (!merged.includes(assertion)) {
				merged.push(assertion);
			}
		}
	}
	return merged;
}

function splitStatusAssertion(assertions: string[]): { statusLine?: string; otherAssertions: string[] } {
	let statusLine: string | undefined;
	const otherAssertions: string[] = [];

	for (const rawAssertion of assertions) {
		const assertion = rawAssertion.trim();
		if (!assertion) {
			continue;
		}

		if (!statusLine && /^HTTP\s+/i.test(assertion)) {
			statusLine = assertion.replace(/^HTTP\s+/i, 'HTTP ');
			continue;
		}

		if (!statusLine) {
			const statusDirect = assertion.match(/^status\s+([0-9]{3}|[1-5]xx)$/i);
			if (statusDirect) {
				statusLine = `HTTP ${statusDirect[1]}`;
				continue;
			}
			const statusEq = assertion.match(/^status\s*(?:==|=)\s*([0-9]{3}|[1-5]xx)$/i);
			if (statusEq) {
				statusLine = `HTTP ${statusEq[1]}`;
				continue;
			}
		}

		otherAssertions.push(assertion);
	}

	return { statusLine, otherAssertions };
}

function convertAssertionToHurlFormat(assertion: string): string {
	const trimmed = assertion.trim();

	if (/^status\s+/i.test(trimmed) || /^HTTP\s+/i.test(trimmed)) {
		return trimmed;
	}

	const headerRegex = new RegExp(
		`^headers\\.([^\\s]+)\\s+(${HEADER_ASSERTION_OPERATORS})\\s*(.*)$`,
		'i'
	);
	const headerMatch = trimmed.match(headerRegex);
	if (headerMatch) {
		const [, key, operator, rawValue] = headerMatch;
		const value = rawValue.trim().replace(/^"|"$/g, '');
		const unaryOps = new Set([
			'isNull', 'isNotEmpty', 'isEmpty', 'isDefined', 'isUndefined',
			'isTruthy', 'isFalsy', 'isNumber', 'isString', 'isBoolean', 'isArray', 'isJson'
		]);

		if (unaryOps.has(operator)) {
			return `header "${key}" ${operator}`;
		}
		return `header "${key}" ${operator} "${value}"`;
	}

	return trimmed;
}

function convertAssertionFromHurlFormat(assertion: string): string {
	const trimmed = assertion.trim();

	if (/^status\s+/i.test(trimmed) || /^HTTP\s+/i.test(trimmed)) {
		return trimmed;
	}

	const quotedHeaderRegex = new RegExp(`^header\\s+"([^"]+)"\\s+(${HEADER_ASSERTION_OPERATORS})\\s*(.*)$`, 'i');
	const quotedHeaderMatch = trimmed.match(quotedHeaderRegex);
	if (quotedHeaderMatch) {
		const [, key, operator, rawValue] = quotedHeaderMatch;
		const value = rawValue.trim().replace(/^"|"$/g, '');
		return value ? `headers.${key} ${operator} ${value}` : `headers.${key} ${operator}`;
	}

	const unquotedHeaderRegex = new RegExp(`^header\\s+([^\\s]+)\\s+(${HEADER_ASSERTION_OPERATORS})\\s*(.*)$`, 'i');
	const unquotedHeaderMatch = trimmed.match(unquotedHeaderRegex);
	if (unquotedHeaderMatch) {
		const [, key, operator, rawValue] = unquotedHeaderMatch;
		const value = rawValue.trim().replace(/^"|"$/g, '');
		return value ? `headers.${key} ${operator} ${value}` : `headers.${key} ${operator}`;
	}

	return trimmed;
}

function normalizeLineEndings(content: string): string {
	return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function trimEdgeEmptyLines(lines: string[]): string[] {
	let start = 0;
	let end = lines.length;

	while (start < end && lines[start].trim() === '') {
		start += 1;
	}

	while (end > start && lines[end - 1].trim() === '') {
		end -= 1;
	}

	return lines.slice(start, end);
}

function safeDecode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function deriveCollectionBaseName(sourceFilePath?: string): string {
	if (!sourceFilePath) {
		return 'hurl-collection';
	}

	const extension = path.extname(sourceFilePath);
	const baseName = path.basename(sourceFilePath, extension);
	return baseName || 'hurl-collection';
}

function normalizeCollectionName(value: string | undefined, fallbackBaseName: string): string {
	if (value && value.trim()) {
		return value.trim();
	}

	const readable = fallbackBaseName
		.replace(/[-_]+/g, ' ')
		.trim();

	return readable || 'Imported Hurl Collection';
}

function sanitizeId(value: string | undefined): string {
	if (!value) {
		return '';
	}

	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+/, '')
		.replace(/-+$/, '');
}

function ensureString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}
