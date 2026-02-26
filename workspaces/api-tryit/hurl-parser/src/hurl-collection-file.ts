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

export interface HurlRequestBlock {
	index: number;
	text: string;
	name?: string;
	requestId?: string;
	method?: string;
	url?: string;
	hasNameComment: boolean;
	hasIdComment: boolean;
}

const REQUEST_LINE_REGEX = /^([A-Z][A-Z0-9_-]*)\s+(.+)$/;
const COLLECTION_NAME_REGEX = /^#\s*@collectionName\s+(.+)$/im;
const REQUEST_NAME_REGEX = /^#\s*@name\s+(.+)$/im;
const REQUEST_ID_REGEX = /^#\s*@id\s+(.+)$/im;

export function normalizeHurlLineEndings(content: string): string {
	return content.replace(/\r\n/g, '\n');
}

export function getCollectionNameFromPath(filePath: string): string {
	const baseName = path.basename(filePath, path.extname(filePath));
	return baseName
		.replace(/[-_]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, ch => ch.toUpperCase()) || 'Hurl Collection';
}

export function extractCollectionNameFromHurl(content: string): string | undefined {
	const normalized = normalizeHurlLineEndings(content);
	const match = normalized.match(COLLECTION_NAME_REGEX);
	if (!match) {
		return undefined;
	}
	const name = match[1]?.trim();
	return name || undefined;
}

export function parseHurlDocument(content: string): { header: string; blocks: HurlRequestBlock[] } {
	const normalized = normalizeHurlLineEndings(content);
	const lines = normalized.split('\n');
	const blockStarts = computeRequestBlockStarts(lines);

	if (blockStarts.length === 0) {
		return {
			header: normalized.trim(),
			blocks: []
		};
	}

	const blocks: HurlRequestBlock[] = [];
	for (let index = 0; index < blockStarts.length; index++) {
		const start = blockStarts[index];
		const end = index < blockStarts.length - 1 ? blockStarts[index + 1] : lines.length;
		const blockText = lines.slice(start, end).join('\n').trim();
		if (!blockText) {
			continue;
		}

		const parsedRequestLine = blockText
			.split('\n')
			.map(line => line.trim())
			.map(line => parseRequestLine(line))
			.find((value): value is { method: string; url: string } => value !== null);

		const nameMatch = blockText.match(REQUEST_NAME_REGEX);
		const idMatch = blockText.match(REQUEST_ID_REGEX);

		blocks.push({
			index: blocks.length,
			text: blockText,
			name: nameMatch?.[1]?.trim(),
			requestId: idMatch?.[1]?.trim(),
			method: parsedRequestLine?.method,
			url: parsedRequestLine?.url,
			hasNameComment: Boolean(nameMatch),
			hasIdComment: Boolean(idMatch)
		});
	}

	const header = lines.slice(0, blockStarts[0]).join('\n').trim();
	return {
		header,
		blocks
	};
}

function parseRequestLine(line: string): { method: string; url: string } | null {
	const match = line.match(REQUEST_LINE_REGEX);
	if (!match) {
		return null;
	}
	const method = match[1].toUpperCase();
	// `HTTP 200` lines are response assertions, not request starts
	if (method === 'HTTP') {
		return null;
	}
	return {
		method,
		url: match[2].trim()
	};
}

function computeRequestBlockStarts(lines: string[]): number[] {
	const starts: number[] = [];

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const trimmed = lines[lineIndex].trim();
		if (!parseRequestLine(trimmed)) {
			continue;
		}

		let blockStart = lineIndex;
		for (let backIndex = lineIndex - 1; backIndex >= 0; backIndex--) {
			const backLine = lines[backIndex].trim();
			if (!backLine) {
				break;
			}
			if (backLine.startsWith('#')) {
				// Keep collection metadata in document header, not in request blocks.
				if (/^#\s*@collectionname\b/i.test(backLine)) {
					break;
				}
				blockStart = backIndex;
				continue;
			}
			break;
		}

		starts.push(blockStart);
	}

	return starts;
}

export function splitHurlRequestBlocks(content: string): string[] {
	return parseHurlDocument(content).blocks.map(block => block.text);
}

export function composeHurlDocument(header: string, blocks: string[]): string {
	const normalizedHeader = normalizeHurlLineEndings(header).trim();
	const normalizedBlocks = blocks
		.map(block => normalizeHurlLineEndings(block).trim())
		.filter(block => block.length > 0);

	const sections: string[] = [];
	if (normalizedHeader) {
		sections.push(normalizedHeader);
	}
	sections.push(...normalizedBlocks);

	if (sections.length === 0) {
		return '';
	}

	return `${sections.join('\n\n').trimEnd()}\n`;
}

export function upsertCollectionNameInHurl(content: string, collectionName: string): string {
	const safeName = collectionName.trim();
	if (!safeName) {
		return composeHurlDocument(parseHurlDocument(content).header, splitHurlRequestBlocks(content));
	}

	const parsed = parseHurlDocument(content);
	const header = parsed.header;
	const marker = `# @collectionName ${safeName}`;
	let updatedHeader: string;

	if (COLLECTION_NAME_REGEX.test(header)) {
		updatedHeader = header.replace(COLLECTION_NAME_REGEX, marker);
	} else if (header.trim()) {
		updatedHeader = `${marker}\n${header.trim()}`;
	} else {
		updatedHeader = marker;
	}

	return composeHurlDocument(updatedHeader, parsed.blocks.map(block => block.text));
}

/**
 * Replace (or insert) a `# @name` comment inside a particular request block.
 *
 * This utility is used by the extension when the user renames a request in the
 * UI; it needs to update the comment but not otherwise disturb the block.
 */
export function replaceRequestBlockName(blockText: string, newName: string): string {
	const safeName = newName.trim();
	if (!safeName) {
		return blockText.trim();
	}

	const normalized = normalizeHurlLineEndings(blockText);
	const lines = normalized.split('\n');
	const nameLineIndex = lines.findIndex(line => /^#\s*@name\s+/.test(line.trim()));
	if (nameLineIndex >= 0) {
		lines[nameLineIndex] = `# @name ${safeName}`;
		return lines.join('\n').trim();
	}

	const requestLineIndex = lines.findIndex(line => parseRequestLine(line.trim()) !== null);
	if (requestLineIndex >= 0) {
		lines.splice(requestLineIndex, 0, `# @name ${safeName}`);
		return lines.join('\n').trim();
	}

	lines.unshift(`# @name ${safeName}`);
	return lines.join('\n').trim();
}
