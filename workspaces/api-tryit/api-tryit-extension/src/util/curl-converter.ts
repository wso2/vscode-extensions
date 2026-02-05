/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { ApiRequestItem, ApiRequest, HeaderParameter } from '@wso2/api-tryit-core';

/**
 * Generate a unique ID using timestamp and random string
 */
function generateId(): string {
	return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

/**
 * Parse a curl command string into components
 * Handles quoted strings and various curl options
 */
function parseCurl(curl: string): {
	method: string;
	url: string;
	headers: Record<string, string>;
	body: string;
} {
	// Remove line breaks and continuations
	const cleanCurl = curl.replace(/\\\s*\n/g, ' ').trim();
	
	let method = 'GET';
	let url = '';
	const headers: Record<string, string> = {};
	let body = '';
	
	// Parse the curl string while respecting quoted values
	const tokens = tokenizeCurl(cleanCurl);
	
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		
		if (token === 'curl') {
			continue;
		}
		
		if (token === '-X' || token === '--request') {
			if (i + 1 < tokens.length) {
				method = tokens[i + 1];
				i++;
			}
		} else if (token === '-H' || token === '--header') {
			if (i + 1 < tokens.length) {
				const headerStr = tokens[i + 1];
				const colonIndex = headerStr.indexOf(':');
				if (colonIndex !== -1) {
					const key = headerStr.substring(0, colonIndex).trim();
					const value = headerStr.substring(colonIndex + 1).trim();
					headers[key] = value;
				}
				i++;
			}
		} else if (token === '-d' || token === '--data' || token === '--data-raw') {
			if (i + 1 < tokens.length) {
				body = tokens[i + 1];
				i++;
			}
		} else if (token.startsWith('http://') || token.startsWith('https://')) {
			url = token;
		}
	}
	
	return { method, url, headers, body };
}

/**
 * Tokenize curl command while respecting quoted strings
 */
function tokenizeCurl(curl: string): string[] {
	const tokens: string[] = [];
	let current = '';
	let inQuotes = false;
	let quoteChar = '';
	
	for (let i = 0; i < curl.length; i++) {
		const char = curl[i];
		const nextChar = curl[i + 1];
		
		if ((char === '"' || char === "'") && (i === 0 || curl[i - 1] !== '\\')) {
			if (!inQuotes) {
				inQuotes = true;
				quoteChar = char;
			} else if (char === quoteChar) {
				inQuotes = false;
				quoteChar = '';
			} else {
				current += char;
			}
		} else if (char === ' ' && !inQuotes) {
			if (current) {
				tokens.push(current);
				current = '';
			}
		} else {
			current += char;
		}
	}
	
	if (current) {
		tokens.push(current);
	}
	
	return tokens;
}

/**
 * Convert a curl command string to an ApiRequestItem object
 * @param curl - The curl command string
 * @returns An ApiRequestItem object with the parsed curl data
 * @throws Error if the curl string is invalid or URL cannot be parsed
 */
export function curlToApiRequestItem(curl: string): ApiRequestItem {
	if (!curl || typeof curl !== 'string') {
		throw new Error('Invalid curl string provided');
	}

	const parsed = parseCurl(curl);

	if (!parsed.url) {
		throw new Error('No URL found in curl command');
	}

	const id = generateId();
	const name = `${parsed.method} ${parsed.url}`;

	const headers: HeaderParameter[] = Object.entries(parsed.headers).map(
		([key, value]) => ({
			id: generateId(),
			key,
			value,
		})
	);

	const request: ApiRequest = {
		id,
		name,
		method: parsed.method as ApiRequest['method'],
		url: parsed.url,
		queryParameters: [],
		headers,
		body: parsed.body || undefined,
	};

	return {
		id,
		name,
		request,
	};
}
