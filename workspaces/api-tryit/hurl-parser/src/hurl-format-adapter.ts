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

import { ApiRequest, ApiResponse, FormDataParameter } from '@wso2/api-tryit-core';

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

		// Categorize assertions:
		// - HTTP assertions: operatorless response line (e.g., "HTTP 200")
		// - Operatorless status assertions: also become HTTP response lines (e.g., "status 200" -> "HTTP 200")
		// - Other assertions: emit in [Asserts] section (including operator-based status like "status == 502")
		const httpAssertions = (assertions || [])
			.map(a => a.trim())
			.filter(a => /^HTTP\s+/i.test(a));

		const operatorlessStatusAssertions = (assertions || [])
			.map(a => a.trim())
			.filter(a => /^status\s+/i.test(a) && !/^status\s+(==|!=|>|<|>=|<=)/.test(a))
			.map(a => {
				const match = a.match(/^status\s+(.+)$/i);
				return match ? `HTTP ${match[1].trim()}` : a;
			});

		const otherAssertions = (assertions || [])
			.map(a => a.trim())
			.filter(a => {
				if (/^HTTP\s+/i.test(a)) return false;
				if (/^status\s+/i.test(a) && !/^status\s+(==|!=|>|<|>=|<=)/.test(a)) return false;
				return a.length > 0;
			});

		const allResponseLines = [...httpAssertions, ...operatorlessStatusAssertions];

		const hasFormUrlEncodedBody = !!(request.bodyFormUrlEncoded && request.bodyFormUrlEncoded.length > 0);

		// Detect form-data early (before headers).
		// If form-urlencoded data exists, prefer it and skip multipart to avoid mixed body sections.
		let formDataParams =
			!hasFormUrlEncodedBody && request.bodyFormData && request.bodyFormData.length > 0
				? request.bodyFormData
				: undefined;
		if (
			!formDataParams &&
			!hasFormUrlEncodedBody &&
			!(request.bodyBinaryFiles && request.bodyBinaryFiles.length > 0) &&
			request.body &&
			typeof request.body === 'string'
		) {
			const raw = request.body.trim();
			const looksLikeFormData = /(^@file:)|(^[^\s:{[]+\s*:\s*[^\n]+)/m.test(raw) && !/^\s*\{/.test(raw) && !/^\s*\[/.test(raw) && !/^\s*</.test(raw);
			if (looksLikeFormData) {
				const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
				const parsed: Array<{id: string; key: string; value?: string; filePath?: string; contentType?: string}> = [];
				for (const line of lines) {
					// key: @file: contentType
					const fileAt = line.match(/^([^:]+):\s*@file:\s*(.+)$/i);
					if (fileAt) {
						parsed.push({ id: `f-${Math.random().toString(36).substring(2,9)}`, key: fileAt[1].trim(), filePath: undefined, contentType: fileAt[2].trim() });
						continue;
					}

					// key: value: contentType
					const kvct = line.match(/^([^:]+):\s*([^:{["]+):\s*(.+)$/);
					if (kvct) {
						parsed.push({ id: `f-${Math.random().toString(36).substring(2,9)}`, key: kvct[1].trim(), value: kvct[2].trim(), contentType: kvct[3].trim() });
						continue;
					}

					// key: value
					const kv = line.match(/^([^:]+):\s*(.+)$/);
					if (kv) {
						parsed.push({ id: `f-${Math.random().toString(36).substring(2,9)}`, key: kv[1].trim(), value: kv[2].trim() });
						continue;
					}
				}
				if (parsed.length) formDataParams = parsed as unknown as FormDataParameter[];
			}
		}

		// Add headers exactly as provided by the user.
		if (request.headers && request.headers.length > 0) {
			for (const header of request.headers) {
				if (header.key && header.value) {
					hurl += `${header.key}: ${header.value}\n`;
				}
			}
		}

		const hasBinaryFileBody = !!(request.bodyBinaryFiles && request.bodyBinaryFiles.some(file => !!file.filePath));

		const hasStructuredBody =
			(formDataParams && formDataParams.length > 0) ||
			(request.bodyFormUrlEncoded && request.bodyFormUrlEncoded.length > 0) ||
			hasBinaryFileBody;

		const methodSupportsBody = !['GET', 'HEAD', 'OPTIONS'].includes((request.method || '').toUpperCase());
		const hasBody = methodSupportsBody && (request.body || hasStructuredBody);

		if (hasBody) {
			hurl += '\n';

			// If structured body sections are present, don't duplicate raw body text.
			if (request.body && !hasStructuredBody) {
				hurl += request.body;
				if (!request.body.endsWith('\n')) {
					hurl += '\n';
				}
			}

			// Serialize multipart/form-data in Hurl [Multipart] section format
			if (formDataParams && formDataParams.length > 0) {
				hurl += '[Multipart]\n';
				for (const param of formDataParams) {
					if (param.filePath) {
						// File reference: key: file,filepath; contentType
						const contentType = param.contentType ? `; ${param.contentType}` : ';';
						hurl += `${param.key}: file,${param.filePath}${contentType}\n`;
					} else {
						// Simple key: value
						hurl += `${param.key}: ${param.value || ''}\n`;
					}
				}
			}

			// Handle form URL encoded
			if (request.bodyFormUrlEncoded && request.bodyFormUrlEncoded.length > 0) {
				// Use native Hurl form parameters section.
				hurl += '[Form]\n';
				for (const param of request.bodyFormUrlEncoded) {
					if (param.key) {
						hurl += `${param.key}: ${param.value ?? ''}\n`;
					}
				}
			}

			// Handle binary file body in native Hurl syntax: file,<path>;
			if (hasBinaryFileBody && request.bodyBinaryFiles) {
				const firstFile = request.bodyBinaryFiles.find(file => !!file.filePath);
				if (firstFile?.filePath) {
					hurl += `file,${firstFile.filePath};\n`;
				}
			}
		}

		// HTTP response lines come after body sections, before [Asserts]
		if (allResponseLines.length > 0) {
			if (hasBody) {
				hurl += '\n';
			}
			for (const assertion of allResponseLines) {
				hurl += `${assertion}\n`;
			}
		}

		// Add other assertions (including operator-based status) as native Hurl [Asserts] section
		if (otherAssertions.length > 0) {
			hurl += '\n[Asserts]\n';
			for (const assertion of otherAssertions) {
				const hurlAssertion = HurlFormatAdapter.convertAssertionToHurlFormat(assertion);
				hurl += `${hurlAssertion}\n`;
			}
		}

		// Add response (if available) - as reference only, after assertions
		if (response) {
			hurl += '\n# Response:\n';
			hurl += `# Status: ${response.statusCode}\n`;
			if (response.headers && response.headers.length > 0) {
				hurl += '# Headers:\n';
				for (const header of response.headers) {
					hurl += `#   ${header.key}: ${header.value}\n`;
				}
			}
			if (response.body) {
				hurl += '# Body:\n';
				for (const line of response.body.split('\n')) {
					hurl += `# ${line}\n`;
				}
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
					const urlMatch = urlPart.match(/^([^?]+)(?:\?(.+))?$/);
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

				// Skip comments
				if (trimmed.startsWith('#')) {
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
				} else {
					// If line doesn't match header pattern and isn't a comment, stop parsing headers
					// This handles cases like response assertions (HTTP 78) that appear before the body
					break;
				}
			}

		// Parse body and sections
		let inAssertsSection = false;
		for (; currentLineIdx < lines.length; currentLineIdx++) {
			const line = lines[currentLineIdx];
			const trimmed = line.trim();

			// Check for [Asserts] section start
			if (trimmed === '[Asserts]') {
				inAssertsSection = true;
				continue;
			}

			// Check for response/assertions comments (legacy format)
			if (trimmed.startsWith('# Response:') || trimmed.startsWith('# Assertions:')) {
				inAssertsSection = false;
				break;
			}

			// If in Asserts section, parse assertions
			if (inAssertsSection) {
				if (trimmed && !trimmed.startsWith('#')) {
					// Convert Hurl format to internal format
					const internalAssertion = HurlFormatAdapter.convertAssertionFromHurlFormat(trimmed);
					assertions.push(internalAssertion);
				}
				continue;
			}

			// Status assertions may appear outside [Asserts]
			if (/^status\s+/i.test(trimmed)) {
				const internalAssertion = HurlFormatAdapter.convertAssertionFromHurlFormat(trimmed);
				assertions.push(internalAssertion);
				continue;
			}

			// HTTP status line (preferred Hurl response assertion style)
			if (/^HTTP\s+/i.test(trimmed)) {
				const internalAssertion = HurlFormatAdapter.convertAssertionFromHurlFormat(trimmed);
				assertions.push(internalAssertion);
				continue;
			}

			// Body sections like [Multipart], [FormData], [Form], [FormParams] are part of body content
			if (/^\[(?:FormData|Multipart|MultipartFormData|FormUrlEncoded|Form|FormParams)\]/i.test(trimmed)) {
				body += line + '\n';
				continue;
			}

			// Stop at other unknown sections
			if (trimmed.startsWith('[')) {
				break;
			}

			// Parse body (only before Asserts section)
			if (!inAssertsSection) {
				if (trimmed.startsWith('# Response:') || trimmed.startsWith('# Assertions:')) {
					break;
				}

				if (!trimmed.startsWith('#')) {
					body += line + '\n';
				}
			}
		}

		// Parse response comment section (# Response: / # Status: / # Headers: / # Body:)
		let inResponseBody = false;
		const responseBodyLines: string[] = [];
		for (; currentLineIdx < lines.length; currentLineIdx++) {
			const raw = lines[currentLineIdx];
			const trimmed = raw.trim();
			if (inResponseBody) {
				if (trimmed.startsWith('#')) {
					responseBodyLines.push(raw.startsWith('# ') ? raw.slice(2) : raw.slice(1));
				} else {
					break;
				}
				continue;
			}
			if (trimmed.startsWith('# Status:')) {
				responseMetadata.statusCode = parseInt(trimmed.substring(9).trim(), 10);
			} else if (trimmed === '# Headers:') {
				if (!responseMetadata.headers) { responseMetadata.headers = []; }
			} else if (trimmed.startsWith('#   ') && responseMetadata.headers !== undefined) {
				const headerLine = trimmed.substring(4);
				const colonIdx = headerLine.indexOf(':');
				if (colonIdx > 0) {
					(responseMetadata.headers as Array<{ key: string; value: string }>).push({
						key: headerLine.substring(0, colonIdx).trim(),
						value: headerLine.substring(colonIdx + 1).trim()
					});
				}
			} else if (trimmed === '# Body:') {
				inResponseBody = true;
			}
		}
		if (responseBodyLines.length > 0) {
			responseMetadata.body = responseBodyLines.join('\n').trimEnd();
		}

		// Parse body and special sections (FormData, Form/FormParams, multipart, legacy shorthands)
		const bodyText = body.trim();
		if (bodyText) {
			// Helper: push a form-data param
			const pushFormParam = (arr: Array<{id: string; key: string; value?: string; filePath?: string; contentType?: string}>, key: string, value?: string, filePath?: string, contentType?: string) => {
				arr.push({ id: `form-${Math.random().toString(36).substring(2, 9)}`, key: (key || '').toString(), value: value || undefined, filePath: filePath || undefined, contentType: contentType || undefined });
			};

			// 1) If body contains explicit [FormData] or [Form]/[FormParams] sections — parse them first
			if (/^\[(?:FormData|Multipart|MultipartFormData|FormUrlEncoded|Form|FormParams)\]/im.test(bodyText)) {
				const lines = bodyText.split('\n');
				let currentSection: string | null = null;
				const formData: FormDataParameter[] = [];
				const urlEncoded: Array<{id: string; key: string; value: string}> = [];
				const formDataBodyLines: string[] = [];
				const urlEncodedBodyLines: string[] = [];
				for (const rawLine of lines) {
					const line = rawLine.trim();
					if (!line) continue;
					if (line.startsWith('#')) continue;
					// Accept both [FormData] and shorthand [Multipart] as equivalent sections
					if (/^\[(?:FormData|Multipart|MultipartFormData)\]/i.test(line)) { currentSection = 'form-data'; continue; }
					if (/^\[(?:FormUrlEncoded|Form|FormParams)\]/i.test(line)) { currentSection = 'form-urlencoded'; continue; }
					if (!currentSection) continue;

					if (currentSection === 'form-data') {
						formDataBodyLines.push(line);
						// Parse form-data lines in Hurl [Multipart] format:
						// key: value                                (simple value)
						// key: file,filepath;                      (file reference)
						// key: file,filepath; contentType          (file with content type)
						const fileMatch = line.match(/^([^:]+):\s*file,([^;]+);(?:\s*(.+))?$/i);
						const kv = line.match(/^([^:]+):\s*(.+)$/i);
						
						if (fileMatch) {
							// key: file,filepath; [contentType]
							const key = fileMatch[1].trim();
							const filePath = fileMatch[2].trim();
							const contentType = fileMatch[3]?.trim();
							pushFormParam(formData, key, undefined, filePath, contentType);
						} else if (kv) {
							// key: value
							pushFormParam(formData, kv[1].trim(), kv[2].trim());
						}
					} else if (currentSection === 'form-urlencoded') {
						urlEncodedBodyLines.push(line);
						// Native Hurl [Form] format: key: value (preferred)
						const colon = line.match(/^([^:]+):\s*(.*)$/);
						if (colon) {
							urlEncoded.push({
								id: `fue-${Math.random().toString(36).substring(2,9)}`,
								key: colon[1].trim(),
								value: colon[2] ?? ''
							});
							continue;
						}

						// Backward compatibility for legacy saved format: key=value
						const eq = line.match(/^([^=]+)=(.*)$/);
						if (eq) {
							urlEncoded.push({
								id: `fue-${Math.random().toString(36).substring(2,9)}`,
								key: decodeURIComponent(eq[1]),
								value: decodeURIComponent(eq[2] || '')
							});
						}
					}
				}

				if (formData.length) {
					request.bodyFormData = formData as unknown as FormDataParameter[];
				}
				if (urlEncoded.length) {
					request.bodyFormUrlEncoded = urlEncoded as unknown as typeof request.bodyFormUrlEncoded;
				}
				// Populate UI body without section markers like [Multipart]/[FormData]/[Form]/[FormParams].
				// Keep raw body only when no structured sections were parsed.
				if (formData.length && !urlEncoded.length) {
					request.body = formDataBodyLines.join('\n');
				} else if (urlEncoded.length && !formData.length) {
					request.body = urlEncodedBodyLines.join('\n');
				} else if (formData.length && urlEncoded.length) {
					request.body = [...formDataBodyLines, ...urlEncodedBodyLines].join('\n');
				} else {
					request.body = bodyText;
				}
			} else if (/^--[\S]+/m.test(bodyText)) {
				// 2) RFC multipart body parsing (detect boundary via header or first --boundary line)
				let boundary: string | null = null;
				// Try to read from Content-Type header
				const ctHeader = (request.headers || []).find(h => /^content-type$/i.test(h.key));
				if (ctHeader) {
					const bmatch = ctHeader.value.match(/boundary=(?:"?)([^";]+)/i);
					if (bmatch) boundary = bmatch[1];
				}
				// Fallback: take first line that starts with --
				if (!boundary) {
					const firstBoundaryLine = bodyText.split('\n').find(l => l.trim().startsWith('--'));
					if (firstBoundaryLine) boundary = firstBoundaryLine.trim().replace(/^--/, '').replace(/--$/, '');
				}

				if (boundary) {
					const parts = bodyText.split(new RegExp(`--${boundary}(?:--)?\\r?\\n`));
					const parsedParts: FormDataParameter[] = [];
					for (const rawPart of parts) {
						if (!rawPart || /^\s*$/.test(rawPart)) continue;
						// Each part contains headers then a blank line then content
						const [rawHeaders, ...rest] = rawPart.split(/\r?\n\r?\n/);
						if (!rawHeaders) continue;
						const headerLines = rawHeaders.split(/\r?\n/).map(h => h.trim()).filter(Boolean);
						let name: string | undefined;
						let filename: string | undefined;
						let pContentType: string | undefined;
						for (const hl of headerLines) {
							const hm = hl.match(/^Content-Disposition:\s*form-data;\s*(.*)$/i);
							if (hm) {
								const attrs = hm[1];
								const nMatch = attrs.match(/name="([^"]+)"/);
								const fMatch = attrs.match(/filename="([^"]+)"/);
								if (nMatch) name = nMatch[1];
								if (fMatch) filename = fMatch[1];
							}
							const ctm = hl.match(/^Content-Type:\s*(.+)$/i);
							if (ctm) pContentType = ctm[1].trim();
						}
						const content = rest.join('\n\n').trim();
						// If content references a file with leading '<', treat it as filePath
						const fileRefMatch = content.match(/^<\s*(.+)$/m);
						if (fileRefMatch || filename) {
							const filePath = fileRefMatch ? fileRefMatch[1].trim() : undefined;
							parsedParts.push({ id: `form-${Math.random().toString(36).substring(2,9)}`, key: name || filename || 'file', filePath: filePath || undefined, contentType: pContentType || undefined } as unknown as FormDataParameter);
						} else {
							parsedParts.push({ id: `form-${Math.random().toString(36).substring(2,9)}`, key: name || 'field', value: content, contentType: pContentType || undefined } as unknown as FormDataParameter);
						}
					}
					if (parsedParts.length) request.bodyFormData = parsedParts as unknown as FormDataParameter[];
					request.body = bodyText;
				}
			} else {
				// 3) Legacy/editor shorthand parsing inside body text
				const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);
				const formData: FormDataParameter[] = [];
				const binaryFiles: Array<{id: string; filePath?: string; contentType: string}> = [];
				for (const line of lines) {
					// inline form-data shorthand: key: value: contentType  OR key: @file: contentType
					const kvct = line.match(/^([^:]+):\s*([^:{["]+):\s*(.+)$/);
					const fileAt = line.match(/^([^:]+):\s*@file:\s*(.+)$/i);
					const atFileOnly = line.match(/^@file:\s*(.+)$/i);
					const binaryFileBody = line.match(/^file,([^;]+);(?:\s*(.+))?$/i);
					if (kvct) {
						// key: value: contentType
						formData.push({ id: `form-${Math.random().toString(36).substring(2,9)}`, key: kvct[1].trim(), value: kvct[2].trim(), contentType: kvct[3].trim() } as unknown as FormDataParameter);
						continue;
					}
					if (fileAt) {
						formData.push({ id: `form-${Math.random().toString(36).substring(2,9)}`, key: fileAt[1].trim(), contentType: fileAt[2].trim() } as unknown as FormDataParameter);
						continue;
					}
					if (atFileOnly) {
						binaryFiles.push({ id: `bf-${Math.random().toString(36).substring(2,9)}`, filePath: undefined, contentType: atFileOnly[1].trim() });
						continue;
					}
					if (binaryFileBody) {
						binaryFiles.push({
							id: `bf-${Math.random().toString(36).substring(2,9)}`,
							filePath: binaryFileBody[1].trim(),
							contentType: binaryFileBody[2]?.trim() || 'application/octet-stream'
						});
						continue;
					}
					// Commented Binary Files metadata ("# filePath: /path, contentType: type")
					const commentFile = line.match(/^#\s*filePath:\s*([^,]+),\s*contentType:\s*(.+)$/i);
					if (commentFile) {
						binaryFiles.push({ id: `bf-${Math.random().toString(36).substring(2,9)}`, filePath: commentFile[1].trim(), contentType: commentFile[2].trim() });
						continue;
					}
				}
				if (formData.length) request.bodyFormData = formData as unknown as FormDataParameter[];
				if (binaryFiles.length) request.bodyBinaryFiles = binaryFiles as unknown as typeof request.bodyBinaryFiles;
				// always keep raw body as fallback
				request.body = bodyText;
			}
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
			const urlPath = request.url ? request.url.replace(/^https?:\/\/[^/]*/, '').split('?')[0] : '';
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
				...(request.bodyFormData && request.bodyFormData.length > 0 && { bodyFormData: request.bodyFormData }),
				...(request.bodyFormUrlEncoded && request.bodyFormUrlEncoded.length > 0 && { bodyFormUrlEncoded: request.bodyFormUrlEncoded }),
				...(request.bodyBinaryFiles && request.bodyBinaryFiles.length > 0 && { bodyBinaryFiles: request.bodyBinaryFiles }),
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

	/**
	 * Convert internal assertion format to Hurl format
	 * Internal: "headers.Content-Type == application/json"
	 * Hurl: "header Content-Type == application/json"
	 * 
	 * Note: Status assertions with operators stay as-is in [Asserts] section
	 * Only operatorless status assertions are converted to HTTP response lines
	 */
	static convertAssertionToHurlFormat(assertion: string): string {
		const trimmed = assertion.trim();

		// Keep status assertions with operators as-is (they go in [Asserts] section)
		// Only operatorless status assertions get converted to HTTP
		if (/^status\s+/i.test(trimmed)) {
			const statusMatch = trimmed.match(/^status\s+(.+)$/i);
			if (statusMatch) {
				const rest = statusMatch[1].trim();
				// If it has an operator, keep as status assertion in [Asserts]
				if (/^(==|!=|>|<|>=|<=)/.test(rest)) {
					return trimmed; // Keep as-is
				}
			}
			// Operatorless status would be converted to HTTP, but those go in response line
			// so this shouldn't be called for them. Return as-is for safety.
			return trimmed;
		}

		// Convert headers.Key <op> value -> header "Key" <op> "value"
		const headerMatch = trimmed.match(/^headers\.([^\s]+)\s+(contains|notContains|startsWith|endsWith|matches|notMatches|isNull|isNotEmpty|isEmpty|isDefined|isUndefined|isTruthy|isFalsy|isNumber|isString|isBoolean|isArray|isJson|==|!=|>=|<=|>|<|=)\s*(.*)$/i);
		if (headerMatch) {
			const [, rawKey, rawOperator, rawValue] = headerMatch;
			const operator = rawOperator === '=' ? '==' : rawOperator;
			const key = rawKey.replace(/^"|"$/g, '');
			const cleanedValue = rawValue.trim().replace(/^"|"$/g, '');

			// Unary operators have no value segment
			const unaryOps = new Set([
				'isNull', 'isNotEmpty', 'isEmpty', 'isDefined', 'isUndefined',
				'isTruthy', 'isFalsy', 'isNumber', 'isString', 'isBoolean', 'isArray', 'isJson'
			]);
			if (unaryOps.has(operator)) {
				return `header "${key}" ${operator}`;
			}

			return `header "${key}" ${operator} "${cleanedValue}"`;
		}

		return trimmed;
	}

	/**
	 * Convert Hurl assertion format to internal format
	 * Hurl: "header Content-Type == application/json"
	 * Internal: "headers.Content-Type == application/json"
	 */
	static convertAssertionFromHurlFormat(assertion: string): string {
		const trimmed = assertion.trim();

		// Keep status assertions as-is (operatorless or with operator)
		if (/^status\s+/i.test(trimmed)) {
			return trimmed;
		}

		// Keep HTTP assertions as-is (operatorless response line)
		// HTTP is distinct from status - HTTP is a response line, status goes in [Asserts]
		const httpStatusMatch = trimmed.match(/^HTTP\s+(.+)$/i);
		if (httpStatusMatch) {
			return trimmed; // Keep as HTTP format
		}

		// Convert header "Key" <op> "value" -> headers.Key <op> value
		const quotedHeaderMatch = trimmed.match(/^header\s+"([^"]+)"\s+(contains|notContains|startsWith|endsWith|matches|notMatches|isNull|isNotEmpty|isEmpty|isDefined|isUndefined|isTruthy|isFalsy|isNumber|isString|isBoolean|isArray|isJson|==|!=|>=|<=|>|<|=)\s*(.*)$/i);
		if (quotedHeaderMatch) {
			const [, key, operator, rawValue] = quotedHeaderMatch;
			const value = rawValue.trim().replace(/^"|"$/g, '');

			const unaryOps = new Set([
				'isNull', 'isNotEmpty', 'isEmpty', 'isDefined', 'isUndefined',
				'isTruthy', 'isFalsy', 'isNumber', 'isString', 'isBoolean', 'isArray', 'isJson'
			]);
			if (unaryOps.has(operator)) {
				return `headers.${key} ${operator}`;
			}

			return `headers.${key} ${operator} ${value}`;
		}

		// Fallback: unquoted header key
		const unquotedHeaderMatch = trimmed.match(/^header\s+([^\s]+)\s+(contains|notContains|startsWith|endsWith|matches|notMatches|isNull|isNotEmpty|isEmpty|isDefined|isUndefined|isTruthy|isFalsy|isNumber|isString|isBoolean|isArray|isJson|==|!=|>=|<=|>|<|=)\s*(.*)$/i);
		if (unquotedHeaderMatch) {
			const [, key, operator, rawValue] = unquotedHeaderMatch;
			const value = rawValue.trim().replace(/^"|"$/g, '');
			return value ? `headers.${key} ${operator} ${value}` : `headers.${key} ${operator}`;
		}

		return trimmed;
	}

	/**
	 * Convert internal status assertion to Hurl HTTP status line.
	 * Internal: "status 200" / "status 2xx"
	 * Hurl: "HTTP 200" / "HTTP 2xx"
	 */
	static convertStatusAssertionToHttpLine(assertion: string): string {
		const trimmed = assertion.trim();
		const statusMatch = trimmed.match(/^status\s+(.+)$/i);
		if (statusMatch) {
			return `HTTP ${statusMatch[1].trim()}`;
		}
		return trimmed;
	}
}
