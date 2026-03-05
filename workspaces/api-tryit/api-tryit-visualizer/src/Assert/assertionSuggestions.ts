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

import { ApiResponse } from '@wso2/api-tryit-core';
import { COMMON_HEADERS } from '../Input/InputEditor/SuggestionsConstants';

/**
 * Get initial suggestions for the target field (always show base targets)
 */
export const getInitialTargetSuggestions = (): string[] => {
    return [
        // Operatorless / simple targets
        'HTTP', 'status', 'body', 'duration', 'url', 'bytes',
        // Extractor targets that require a quoted expression
        'jsonpath', 'xpath', 'header', 'cookie', 'regex',
        // Legacy dot-notation (kept for backward compatibility)
        'headers'
    ];
};

/**
 * Get suggestions for the target field (HTTP, status, headers, body, etc.)
 * This filters and expands based on what the user is typing
 */
export const getTargetSuggestions = (prefix: string): string[] => {
    const baseTargets = ['HTTP', 'status', 'body', 'duration', 'url', 'bytes', 'jsonpath', 'xpath', 'header', 'cookie', 'regex', 'headers'];

    if (prefix === '') {
        return baseTargets;
    }

    const lowerPrefix = prefix.toLowerCase();
    const headerNames = COMMON_HEADERS.map((h: any) => h.name);

    // Extractor-with-expression: suggest starter expressions
    if (lowerPrefix === 'jsonpath' || prefix.startsWith('jsonpath ') || prefix.startsWith('jsonpath"')) {
        return ['jsonpath "$.field"', 'jsonpath "$.arr[0].id"', 'jsonpath "$.nested.value"'];
    }
    if (lowerPrefix === 'xpath' || prefix.startsWith('xpath ')) {
        return ['xpath "string(//title)"', 'xpath "normalize-space(//h1)"'];
    }
    if (lowerPrefix === 'header' || prefix.startsWith('header "')) {
        return headerNames.map((name: string) => `header "${name}"`);
    }
    if (lowerPrefix === 'cookie' || prefix.startsWith('cookie "')) {
        return ['cookie "session"', 'cookie "JSESSIONID"'];
    }
    if (lowerPrefix === 'regex' || prefix.startsWith('regex "')) {
        return ['regex "([0-9]+)"'];
    }

    // If prefix is "headers." or starts with headers., return header names (legacy)
    if (prefix.startsWith('headers.')) {
        const headerPrefix = prefix.substring('headers.'.length);
        return headerNames
            .filter((name: string) => name.toLowerCase().includes(headerPrefix.toLowerCase()))
            .map((name: string) => `headers.${name}`);
    }

    // If user types a header name directly (e.g. "Cache"), suggest `header "Name"` targets
    const looseHeaderMatches = headerNames
        .filter((name: string) => name.toLowerCase().includes(lowerPrefix))
        .map((name: string) => `header "${name}"`);
    if (looseHeaderMatches.length > 0) {
        return looseHeaderMatches;
    }

    // If prefix is "body." or starts with body., could extend for JSON paths
    if (prefix.startsWith('body.')) {
        return [prefix];
    }

    // Filter base targets
    return baseTargets.filter(target => target.toLowerCase().includes(lowerPrefix));
};

/**
 * Get suggestions for completing the target when a base target is selected
 */
export const completeTarget = (target: string): string => {
    if (target === 'headers') {
        return 'headers.';
    }
    if (target === 'body') {
        return 'body';
    }
    // For extractor types that need an expression, append a space+quote
    if (['jsonpath', 'xpath', 'header', 'cookie', 'regex'].includes(target)) {
        return `${target} "`;
    }
    return target;
};

/**
 * Get operator suggestions
 * Note: HTTP assertions don't use operators per Hurl spec
 * Status can be operatorless or with operators
 */
export const getOperatorSuggestions = (target?: string): string[] => {
    // No operators for HTTP assertions (strictly operatorless)
    if (target && target.toUpperCase() === 'HTTP') {
        return [];
    }
    
    // include function-style operators and symbol comparisons; prefer `==` over `=` for equality
    return [
        '==', '!=', '>', '<', '>=', '<=',
        'contains', 'notContains', 'startsWith', 'endsWith',
        'matches', 'notMatches',
        'isNull', 'isNotEmpty', 'isEmpty', 'isDefined', 'isUndefined',
        'isTruthy', 'isFalsy',
        'isNumber', 'isString', 'isBoolean', 'isArray', 'isJson'
    ];
};

/**
 * Get value suggestions based on the target field
 */
export const getValueSuggestions = (target: string, response?: ApiResponse): string[] => {
    // For status, suggest common HTTP status codes and classes
    if (target.toLowerCase() === 'status' || target.toUpperCase() === 'HTTP') {
        const suggestions = ['200', '201', '204', '400', '401', '403', '404', '500', '502', '503'];
        // Add actual response status if available
        if (response?.statusCode) {
            const statusStr = String(response.statusCode);
            if (!suggestions.includes(statusStr)) {
                suggestions.unshift(statusStr);
            }
        }
        return suggestions;
    }
    
    // If target is a header (e.g., headers.Content-Type), suggest header values
    if (target.startsWith('headers.')) {
        const headerKey = target.substring('headers.'.length).trim();
        const headerConfig = COMMON_HEADERS.find((h: any) => h.name.toLowerCase() === headerKey.toLowerCase());
        if (headerConfig && headerConfig.values) {
            return headerConfig.values;
        }

        // Also check actual response headers
        if (response?.headers) {
            const responseHeader = response.headers.find((h: any) => h.key?.toLowerCase() === headerKey.toLowerCase());
            if (responseHeader?.value) {
                return [responseHeader.value];
            }
        }
    }

    // For status or body, no pre-defined suggestions
    return [];
};

/**
 * Parse assertion string into target, operator, and value
 * Format: "target operator value" or for HTTP/status: "HTTP <code|class>" / "status <code|class>"
 * e.g., "HTTP 200", "status 200", "status == 200", "headers.Content-Type == application/json"
 */
export const parseAssertion = (assertion: string): { target: string; operator: string; value: string } => {
    const trimmed = assertion.trim();

    // Special handling for HTTP assertions (operatorless per Hurl spec)
    // HTTP can be: "HTTP 200", "HTTP 2xx", etc.
    const httpMatch = trimmed.match(/^HTTP\s+(.+)$/i);
    if (httpMatch) {
        return {
            target: 'HTTP',
            operator: '',
            value: httpMatch[1].trim()
        };
    }

    // Special handling for status assertions (operatorless legacy, or with operator)
    // status can be: "status 200", "status 2xx", "status == 200", etc.
    const statusMatch = trimmed.match(/^status\s+(.+)$/i);
    if (statusMatch) {
        const rest = statusMatch[1].trim();
        // Check if it has an operator
        const statusOpMatch = rest.match(/^(==|!=|>|<|>=|<=)\s*(.*)$/);
        if (statusOpMatch) {
            return {
                target: 'status',
                operator: statusOpMatch[1],
                value: statusOpMatch[2].trim()
            };
        }
        // Operatorless status (legacy format)
        return {
            target: 'status',
            operator: '',
            value: rest
        };
    }

    // Try to match: target operator value
    // Operators: ==, !=, >, <, >=, <=, =
    const match = trimmed.match(/^(.+?)\s+(contains|notContains|startsWith|endsWith|matches|notMatches|isNull|isNotEmpty|isEmpty|isDefined|isUndefined|isTruthy|isFalsy|isNumber|isString|isBoolean|isArray|isJson|==|!=|>=|<=|>|<|=)\s*(.*)$/i);

    if (match) {
        const rawOp = match[2].trim();
        const operator = rawOp === '=' ? '==' : rawOp;
        return {
            target: match[1].trim(),
            operator,
            value: match[3].trim().replace(/^['"]|['"]$/g, '') // Remove surrounding quotes
        };
    }

    // If there's no operator, treat the whole string as target
    if (trimmed) {
        return {
            target: trimmed,
            operator: '',
            value: ''
        };
    }

    // Fallback if parsing fails
    return {
        target: '',
        operator: '',
        value: ''
    };
};

/**
 * Build assertion string from target, operator, and value
 * Special handling for HTTP and status which are operatorless or operator-based
 */
export const buildAssertion = (target: string, operator: string, value: string): string => {
    if (!target) {
        return '';
    }

    // Special case: HTTP assertions are operatorless
    if (target.toUpperCase() === 'HTTP') {
        if (!value) {
            return 'HTTP';
        }
        return `HTTP ${value}`;
    }

    // Special case: status can be operatorless or with operator
    if (target.toLowerCase() === 'status') {
        if (!value) {
            return 'status';
        }
        // If operator is provided, include it; otherwise operatorless
        if (operator) {
            const normalizedOp = operator === '=' ? '==' : operator;
            return `status ${normalizedOp} ${value}`;
        }
        return `status ${value}`;
    }

    // If operator is missing, keep the target so partial input isn't lost
    if (!operator) {
        return target;
    }

    const normalizedOp = operator === '=' ? '==' : operator;
    return `${target} ${normalizedOp} ${value}`;
};
