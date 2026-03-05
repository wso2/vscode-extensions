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

import { CaptureExtractorType, CaptureVariable, ApiResponse } from '@wso2/api-tryit-core';

/** Extractor types that require a quoted expression in the .hurl file */
const EXPRESSION_EXTRACTORS = new Set<CaptureExtractorType>(['jsonpath', 'xpath', 'header', 'cookie', 'regex']);

export const captureNeedsExpression = (type: CaptureExtractorType): boolean =>
    EXPRESSION_EXTRACTORS.has(type);

/**
 * Evaluate a capture against an API response to get the captured value.
 * Returns undefined if the response is not available or the extraction fails.
 */
export const evaluateCapture = (capture: CaptureVariable, response?: ApiResponse): string | undefined => {
    if (!response || !capture.extractorType) {
        return undefined;
    }

    switch (capture.extractorType) {
        case 'status':
            return String(response.statusCode);

        case 'body':
            return response.body ?? '';

        case 'url':
            return undefined; // URL not available in ApiResponse

        case 'duration':
            return undefined; // Duration not available in ApiResponse

        case 'bytes': {
            if (response.body == null) return '0';
            try {
                return String(new TextEncoder().encode(response.body).length);
            } catch {
                return String(response.body.length);
            }
        }

        case 'header': {
            return (response.headers || []).find(
                h => h.key.toLowerCase() === capture.expression.toLowerCase()
            )?.value;
        }

        case 'cookie': {
            const setCookieHeader = (response.headers || []).find(
                h => h.key.toLowerCase() === 'set-cookie'
            )?.value ?? '';
            try {
                const match = setCookieHeader.match(
                    new RegExp(`(?:^|;\\s*)${capture.expression}=([^;]+)`, 'i')
                );
                return match?.[1];
            } catch {
                return undefined;
            }
        }

        case 'jsonpath': {
            try {
                const obj = JSON.parse(response.body ?? '');
                const val = evaluateSimpleJsonPath(obj, capture.expression);
                return val !== undefined ? String(val) : undefined;
            } catch {
                return undefined;
            }
        }

        case 'xpath':
            // XPath requires a DOM parser; return undefined in this context
            return undefined;

        case 'regex': {
            try {
                const match = (response.body ?? '').match(new RegExp(capture.expression));
                return match?.[1] ?? match?.[0];
            } catch {
                return undefined;
            }
        }

        default:
            return undefined;
    }
};

/**
 * Evaluate common JSONPath patterns against a parsed object.
 * Supports: $.field, $.a.b.c, $.arr[0].id, $[0], $[0].field
 */
function evaluateSimpleJsonPath(obj: unknown, path: string): unknown {
    const normalized = path
        .replace(/^\$/, '')
        .replace(/\[(\d+)\]/g, '.$1');
    const parts = normalized.split('.').filter(Boolean);
    let current: unknown = obj;
    for (const part of parts) {
        if (current == null || typeof current !== 'object') {
            return undefined;
        }
        current = (current as Record<string, unknown>)[part];
    }
    return current;
}
