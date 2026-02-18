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

import { ApiRequest, ApiResponse, HeaderParameter, QueryParameter, FormDataParameter, FormUrlEncodedParameter, BinaryFileParameter } from '@wso2/api-tryit-core';

/**
 * Hurl Format Adapter
 * 
 * Handles serialization and deserialization of API requests in Hurl format.
 * Hurl is a language for HTTP testing.
 * See: https://hurl.dev
 */
export class HurlFormatAdapter {
	/**
	 * Serialize an ApiRequest to Hurl format
	 */
	static serializeRequest(request: ApiRequest, response?: ApiResponse, assertions?: string[]): string {
		let hurl = '';

		// Add metadata comments at the top
		if (request.id) {
			hurl += `# @id ${request.id}\n`;
		}
		if (request.name) {
			hurl += `# @name ${request.name}\n`;
		}

		// Build the URL with query parameters
		let fullUrl = request.url;
		if (request.queryParameters && request.queryParameters.length > 0 && !request.url.includes('?')) {
			const queryString = request.queryParameters
				.filter(p => p.key && p.value)
				.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
				.join('&');
			if (queryString) {
				fullUrl += `?${queryString}`;
			}
		}

		// Add request line with URL
		hurl += `${request.method} ${fullUrl}\n`;

		// Add headers
		if (request.headers && request.headers.length > 0) {
			for (const header of request.headers) {
				if (header.key && header.value) {
					hurl += `${header.key}: ${header.value}\n`;
				}
			}
		}

		// Add blank line before body
		if (
			request.body ||
			(request.bodyFormData && request.bodyFormData.length > 0) ||
			(request.bodyFormUrlEncoded && request.bodyFormUrlEncoded.length > 0) ||
			(request.bodyBinaryFiles && request.bodyBinaryFiles.length > 0)
		) {
			hurl += '\n';

			// Handle raw body
			if (request.body) {
				hurl += request.body;
				if (!request.body.endsWith('\n')) {
					hurl += '\n';
				}
			}

			// Handle form data
			if (request.bodyFormData && request.bodyFormData.length > 0) {
				for (const param of request.bodyFormData) {
					if (param.filePath) {
						hurl += `[FormData]\n${param.key}: file,${param.filePath}\n`;
					} else if (param.value) {
						hurl += `[FormData]\n${param.key}: ${param.value}\n`;
					}
				}
			}

			// Handle form URL encoded
			if (request.bodyFormUrlEncoded && request.bodyFormUrlEncoded.length > 0) {
				hurl += '[FormUrlEncoded]\n';
				for (const param of request.bodyFormUrlEncoded) {
					if (param.key && param.value) {
						hurl += `${param.key}=${encodeURIComponent(param.value)}\n`;
					}
				}
			}

			// Handle binary files
			if (request.bodyBinaryFiles && request.bodyBinaryFiles.length > 0) {
				hurl += '\n# Binary Files:\n';
				for (const file of request.bodyBinaryFiles) {
					if (file.filePath) {
						hurl += `# filePath: ${file.filePath}, contentType: ${file.contentType}\n`;
					}
				}
			}
		}

		// Add response (if available)
		if (response) {
			hurl += '\n# Response:\n';
			hurl += `# Status: ${response.statusCode}\n`;
			if (response.headers && response.headers.length > 0) {
				hurl += '# Headers:\n';
				for (const header of response.headers) {
					hurl += `#   ${header.key}: ${header.value}\n`;
				}
			}
		}

		// Add assertions
		if (assertions && assertions.length > 0) {
			hurl += '\n# Assertions:\n';
			for (const assertion of assertions) {
				hurl += `# - ${assertion}\n`;
			}
		}

		return hurl;
	}

	/**
	 * Parse a Hurl file and extract request information
	 * Returns a normalized request object compatible with ApiRequest
	 */
	static parseHurlContent(content: string, filePath: string): { request: ApiRequest; response?: ApiResponse; assertions?: string[] } | null {
		try {
			const lines = content.split('\n');
			const request: Partial<ApiRequest> = {
				queryParameters: [],
				headers: [],
			};
			const metadata: Record<string, string> = {};
			let currentLineIdx = 0;
			let body = '';
			const assertions: string[] = [];
			const responseMetadata: Partial<ApiResponse> = {};
			let foundRequestLine = false;

			console.log(`[HurlFormatAdapter] Parsing ${filePath}, total lines: ${lines.length}`);

			// Parse metadata and request line
			for (; currentLineIdx < lines.length; currentLineIdx++) {
				const line = lines[currentLineIdx];
				const trimmed = line.trim();

				// Extract metadata from comments
				if (trimmed.startsWith('#')) {
					if (trimmed.startsWith('# @id ')) {
						metadata.id = trimmed.substring(6).trim();
						console.log(`[HurlFormatAdapter] Found id: ${metadata.id}`);
					} else if (trimmed.startsWith('# @name ')) {
						metadata.name = trimmed.substring(8).trim();
						console.log(`[HurlFormatAdapter] Found name: ${metadata.name}`);
					} else if (trimmed.startsWith('# Status:')) {
						responseMetadata.statusCode = parseInt(trimmed.substring(9).trim(), 10);
					} else if (trimmed.startsWith('# - ')) {
						assertions.push(trimmed.substring(4).trim());
					}
					continue;
				}

				// Skip empty lines before request line
				if (!trimmed) {
					continue;
				}

				// Parse request line (METHOD URL)
				const requestLineMatch = trimmed.match(/^(\w+)\s+(.+)$/);
				if (requestLineMatch) {
					request.method = requestLineMatch[1].toUpperCase() as ApiRequest['method'];
					const urlPart = requestLineMatch[2];

					console.log(`[HurlFormatAdapter] Found request line: ${request.method} ${urlPart}`);

					// Parse URL and query parameters
					const urlMatch = urlPart.match(/^([^\?]+)(?:\?(.+))?$/);
					if (urlMatch) {
						request.url = urlMatch[1];

						// Parse query parameters from URL
						if (urlMatch[2]) {
							const queryParams = urlMatch[2].split('&');
							for (const param of queryParams) {
								const [key, value] = param.split('=');
								if (key) {
									request.queryParameters!.push({
										id: `param-${Math.random().toString(36).substring(2, 9)}`,
										key: decodeURIComponent(key),
										value: value ? decodeURIComponent(value) : ''
									});
								}
							}
						}
					}

					foundRequestLine = true;
					currentLineIdx++;
					break;
				}
			}

			if (!foundRequestLine) {
				console.warn(`[HurlFormatAdapter] No valid request line found in ${filePath}`);
				return null;
			}

			// Parse headers
			for (; currentLineIdx < lines.length; currentLineIdx++) {
				const line = lines[currentLineIdx];
				const trimmed = line.trim();

				// Stop at blank line (body starts after)
				if (!trimmed) {
					currentLineIdx++;
					break;
				}

				// Skip comments and empty lines
				if (trimmed.startsWith('#') || !trimmed) {
					continue;
				}

				// Parse header (Key: Value)
				const headerMatch = line.match(/^([^:]+):\s*(.*)$/);
				if (headerMatch) {
					request.headers!.push({
						id: `header-${Math.random().toString(36).substring(2, 9)}`,
						key: headerMatch[1].trim(),
						value: headerMatch[2].trim()
					});
				}
			}

			// Parse body
			for (; currentLineIdx < lines.length; currentLineIdx++) {
				const line = lines[currentLineIdx];
				const trimmed = line.trim();

				// Stop at response/assertions comments
				if (trimmed.startsWith('# Response:') || trimmed.startsWith('# Assertions:')) {
					break;
				}

				if (!trimmed.startsWith('#')) {
					body += line + '\n';
				}
			}

			// Set body if present
			if (body.trim()) {
				request.body = body.trim();
			}

			// Generate IDs if not present
			if (!metadata.id) {
				// Use filename as ID base
				const fileBaseName = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || 'api-request';
				metadata.id = fileBaseName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
				console.log(`[HurlFormatAdapter] Generated id from filename: ${metadata.id}`);
			}
			if (!metadata.name) {
				// Extract name from filename first, then URL path
				const fileBaseName = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
				const urlPath = request.url ? new URL(request.url, 'http://localhost').pathname : '';
				const nameFromUrl = urlPath.split('/').filter(p => p).pop() || '';
				metadata.name = fileBaseName || nameFromUrl || 'api-request';
				console.log(`[HurlFormatAdapter] Generated name: ${metadata.name}`);
			}

			// Finalize request object
			const finalRequest: ApiRequest = {
				id: metadata.id,
				name: metadata.name,
				method: request.method || 'GET',
				url: request.url || '',
				queryParameters: request.queryParameters || [],
				headers: request.headers || [],
				...(request.body && { body: request.body }),
				...(assertions.length > 0 && { assertions })
			};

			console.log(`[HurlFormatAdapter] Successfully parsed ${filePath}: id=${finalRequest.id}, name=${finalRequest.name}, url=${finalRequest.url}`);

			return {
				request: finalRequest,
				response: responseMetadata.statusCode ? (responseMetadata as ApiResponse) : undefined,
				assertions: assertions.length > 0 ? assertions : undefined
			};
		} catch (error) {
			console.error(`[HurlFormatAdapter] Error parsing ${filePath}:`, error);
			return null;
		}
	}

	/**
	 * Determine if a file path is a Hurl file
	 */
	static isHurlFile(filePath: string): boolean {
		return filePath.endsWith('.hurl');
	}

	/**
	 * Determine if a file path is a YAML file (for backward compatibility)
	 */
	static isYamlFile(filePath: string): boolean {
		return filePath.endsWith('.yaml') || filePath.endsWith('.yml');
	}
}
