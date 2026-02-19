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

import { ApiResponse } from '@wso2/api-tryit-core';
import { COMMON_HEADERS } from '../Input/InputEditor/SuggestionsConstants';

/**
 * Get initial suggestions for the target field (always show base targets)
 */
export const getInitialTargetSuggestions = (): string[] => {
    return ['status', 'headers', 'body'];
};

/**
 * Get suggestions for the target field (status, headers, body, etc.)
 * This filters and expands based on what the user is typing
 */
export const getTargetSuggestions = (prefix: string): string[] => {
    const baseTargets = ['status', 'headers', 'body'];

    if (prefix === '') {
        return baseTargets;
    }

    const headerNames = COMMON_HEADERS.map((h: any) => h.name);

    // If prefix is "headers." or starts with headers., return header names
    if (prefix.startsWith('headers.')) {
        const headerPrefix = prefix.substring('headers.'.length);
        return headerNames
            .filter((name: string) => name.toLowerCase().includes(headerPrefix.toLowerCase()))
            .map((name: string) => `headers.${name}`);
    }

    // If user types a header name directly (e.g. "Cache"), suggest `headers.<Name>` targets
    const looseHeaderMatches = headerNames
        .filter((name: string) => name.toLowerCase().includes(prefix.toLowerCase()))
        .map((name: string) => `headers.${name}`);
    if (looseHeaderMatches.length > 0) {
        return looseHeaderMatches;
    }

    // If prefix is "body." or starts with body., could extend for JSON paths
    if (prefix.startsWith('body.')) {
        // For now, just return as-is. In future, could parse response body
        return [prefix];
    }

    // Filter base targets
    return baseTargets.filter(target => target.toLowerCase().includes(prefix.toLowerCase()));
};

/**
 * Get suggestions for completing the target when a base target is selected
 */
export const completeTarget = (target: string): string => {
    // If target is exactly "headers" or "body", append a dot for sub-property
    if (target === 'headers') {
        return 'headers.';
    }
    if (target === 'body') {
        return 'body';
    }
    return target;
};

/**
 * Get operator suggestions
 */
export const getOperatorSuggestions = (): string[] => {
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
 * Format: "target operator value"
 * e.g., "status == 200" or "headers.Content-Type == application/json"
 */
export const parseAssertion = (assertion: string): { target: string; operator: string; value: string } => {
    const trimmed = assertion.trim();

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
 */
export const buildAssertion = (target: string, operator: string, value: string): string => {
    if (!target) {
        return '';
    }

    // If operator is missing, keep the target so partial input isn't lost
    if (!operator) {
        return target;
    }

    const normalizedOp = operator === '=' ? '==' : operator;
    return `${target} ${normalizedOp} ${value}`;
};
