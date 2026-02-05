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

/**
 * Common HTTP headers with their possible values for auto-completion
 */
export const COMMON_HEADERS = [
    { name: 'Content-Type', values: ['application/json', 'application/xml', 'text/plain', 'text/html', 'multipart/form-data', 'application/x-www-form-urlencoded'] },
    { name: 'Accept', values: ['application/json', 'application/xml', 'text/plain', 'text/html', '*/*'] },
    { name: 'Authorization', values: ['Bearer ', 'Basic ', 'Digest '] },
    { name: 'Cache-Control', values: ['no-cache', 'no-store', 'max-age=0', 'must-revalidate'] },
    { name: 'Accept-Language', values: ['en-US', 'en-GB', 'es', 'fr', 'de'] },
    { name: 'Accept-Encoding', values: ['gzip', 'deflate', 'br', 'identity'] },
    { name: 'Connection', values: ['keep-alive', 'close'] },
    { name: 'User-Agent', values: ['Mozilla/5.0', 'curl/7.64.1'] },
    { name: 'X-Request-ID', values: [] },
    { name: 'X-Correlation-ID', values: [] },
    { name: 'X-API-Key', values: [] },
    { name: 'If-None-Match', values: [] },
    { name: 'If-Modified-Since', values: [] },
];

/**
 * Common query parameter names for auto-completion
 */
export const COMMON_QUERY_KEYS = [
    'page', 'limit', 'offset', 'sort', 'order', 'filter', 'search', 'q', 'id', 'fields'
];

/**
 * JSON snippets for body section auto-completion
 */
export const COMMON_BODY_SNIPPETS = [
    { label: 'JSON Object', insertText: '{\n\t"$1": "$2"\n}', description: 'Insert a JSON object' },
    { label: 'JSON Array', insertText: '[\n\t$1\n]', description: 'Insert a JSON array' },
    { label: 'Key-Value Pair', insertText: '"$1": "$2"', description: 'Insert a key-value pair' }
];