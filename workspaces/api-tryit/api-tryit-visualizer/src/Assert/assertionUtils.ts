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

export interface AssertionDetails {
    expected: string;
    actual: string;
    operator: string;
}

export const getAssertionKey = (assertion: string): string | undefined => {
    const trimmed = assertion.trim();
    if (!trimmed) {
        return undefined;
    }

    if (/^HTTP\s+/i.test(trimmed)) {
        return 'HTTP status';
    }

    if (/^status\s+/i.test(trimmed) && !/^status\s+(==|!=|<=|>=|<|>)/i.test(trimmed)) {
        return 'status';
    }

    // Native Hurl extractor with expression: jsonpath "$.id" == ...
    const extractorWithExpr = trimmed.match(/^(jsonpath|xpath|header|cookie|regex)\s+"([^"]+)"/i);
    if (extractorWithExpr) {
        return `${extractorWithExpr[1].toLowerCase()} "${extractorWithExpr[2]}"`;
    }

    const match = trimmed.match(/^([a-z]+)(?:\.(.+?))?\s*(={1,2}|!=|<=|>=|<|>)\s*(.+)$/i);
    if (!match) {
        return undefined;
    }

    const [, target, property] = match;
    const lowerTarget = target.toLowerCase();

    if (lowerTarget === 'status') {
        return 'status';
    }

    if (lowerTarget === 'body') {
        return property ? `body.${property}` : 'body';
    }

    if (lowerTarget === 'headers' && property) {
        return `headers.${property}`;
    }

    return undefined;
};

export const getAssertionValue = (assertion: string): string | undefined => {
    const trimmed = assertion.trim();
    if (!trimmed) {
        return undefined;
    }

    const match = trimmed.match(/^([a-z]+)(?:\.(.+?))?\s*(contains|notContains|startsWith|endsWith|matches|notMatches|isNull|isNotEmpty|isEmpty|isDefined|isUndefined|isTruthy|isFalsy|isNumber|isString|isBoolean|isArray|isJson|={1,2}|!=|<=|>=|<|>)\s*(.*)$/i);
    if (!match) {
        return undefined;
    }

    const [, , , operator, rawExpected] = match;
    // Unary operators don't have a value part
    const unaryOps = new Set(['isNull','isNotEmpty','isEmpty','isDefined','isUndefined','isTruthy','isFalsy','isNumber','isString','isBoolean','isArray','isJson']);
    if (unaryOps.has(operator)) {
        return undefined;
    }

    const expected = rawExpected.trim().replace(/^['"]|['"]$/g, '');
    return expected;
};

export const getOperator = (assertion: string): string | undefined => {
    const trimmed = assertion.trim();
    if (!trimmed) {
        return undefined;
    }

    if (/^HTTP\s+/i.test(trimmed)) {
        return '==';
    }

    if (/^status\s+\d/i.test(trimmed)) {
        return '==';
    }

    const match = trimmed.match(/^([a-z]+)(?:\.(.+?))?\s*(contains|notContains|startsWith|endsWith|matches|notMatches|isNull|isNotEmpty|isEmpty|isDefined|isUndefined|isTruthy|isFalsy|isNumber|isString|isBoolean|isArray|isJson|={1,2}|!=|<=|>=|<|>)\s*(.*)$/i);
    if (!match) {
        return undefined;
    }

    const [, , , rawOp] = match;
    return rawOp === '=' ? '==' : rawOp;
};

export const getNestedProperty = (obj: any, path: string): any => {
    try {
        return path.split('.').reduce((current, prop) => current?.[prop], obj);
    } catch {
        return undefined;
    }
};

export const getAssertionDetails = (assertion: string, apiResponse?: ApiResponse): AssertionDetails | undefined => {
    if (!apiResponse) {
        return undefined;
    }

    const trimmed = assertion.trim();
    if (!trimmed) {
        return undefined;
    }

    // Handle HTTP assertions (HTTP 200, HTTP 2xx, etc.)
    const httpMatch = trimmed.match(/^HTTP\s+(.+)$/i);
    if (httpMatch) {
        return {
            expected: httpMatch[1].trim(),
            actual: String(apiResponse.statusCode),
            operator: '=='
        };
    }

    // Handle operatorless status assertions (status 200, status 2xx)
    const statusNoOpMatch = trimmed.match(/^status\s+(\d[\dxX]*)$/i);
    if (statusNoOpMatch) {
        return {
            expected: statusNoOpMatch[1].trim(),
            actual: String(apiResponse.statusCode),
            operator: '=='
        };
    }

    const match = trimmed.match(/^([a-z]+)(?:\.(.+?))?\s*(contains|notContains|startsWith|endsWith|matches|notMatches|isNull|isNotEmpty|isEmpty|isDefined|isUndefined|isTruthy|isFalsy|isNumber|isString|isBoolean|isArray|isJson|={1,2}|!=|<=|>=|<|>)\s*(.*)$/i);
    if (!match) {
        return undefined;
    }

    const [, target, property, operator, rawExpected] = match;
    const expected = rawExpected.trim().replace(/^['"]|['"]$/g, '');

    if (target.toLowerCase() === 'status') {
        return {
            expected,
            actual: String(apiResponse.statusCode),
            operator
        };
    }

    if (target.toLowerCase() === 'body') {
        let actual = apiResponse.body ?? '';
        if (property) {
            try {
                const bodyObj = JSON.parse(apiResponse.body ?? '');
                const value = getNestedProperty(bodyObj, property);
                actual = String(value ?? '');
            } catch {
                actual = '';
            }
        }
        return {
            expected,
            actual,
            operator
        };
    }

    if (target.toLowerCase() === 'headers' && property) {
        const headerValue = (apiResponse.headers || []).find(
            (h) => h.key.toLowerCase() === property.toLowerCase()
        )?.value;
        return {
            expected,
            actual: headerValue ?? '',
            operator
        };
    }

    return undefined;
};

function compareValues(actual: string, expected: string, operator: string): boolean {
    switch (operator) {
        case '=':
        case '==':
            return actual === expected;
        case '!=':
            return actual !== expected;
        case '>':
            return Number(actual) > Number(expected);
        case '<':
            return Number(actual) < Number(expected);
        case '>=':
            return Number(actual) >= Number(expected);
        case '<=':
            return Number(actual) <= Number(expected);
        default:
            return false;
    }
}

function evalOperator(actual: string, expected: string, operator: string): boolean {
    const lowerOp = operator.toLowerCase();
    const isTruthyString = (v: string) => {
        if (!v) return false;
        const lower = v.toLowerCase();
        return !(lower === 'false' || lower === '0' || lower === 'null' || lower === 'undefined' || lower === '');
    };

    switch (lowerOp) {
        case 'contains':
            return actual.includes(expected);
        case 'notcontains':
            return !actual.includes(expected);
        case 'startswith':
            return actual.startsWith(expected);
        case 'endswith':
            return actual.endsWith(expected);
        case 'matches':
            try {
                if (expected.length > 500 || /[+*?}][+*?]/.test(expected) || /\)\s*[+*?{]/.test(expected)) { return false; }
                return new RegExp(expected).test(actual);
            } catch { return false; }
        case 'notmatches':
            try {
                if (expected.length > 500 || /[+*?}][+*?]/.test(expected) || /\)\s*[+*?{]/.test(expected)) { return false; }
                return !new RegExp(expected).test(actual);
            } catch { return false; }
        case 'isnull':
            return actual === '' || actual.toLowerCase() === 'null' || actual === undefined;
        case 'isempty':
            return actual === '';
        case 'isnotempty':
            return actual !== '';
        case 'isdefined':
            return actual !== '';
        case 'isundefined':
            return actual === '';
        case 'istruthy':
            return isTruthyString(actual);
        case 'isfalsy':
            return !isTruthyString(actual);
        case 'isnumber':
            return actual.trim() !== '' && !isNaN(Number(actual));
        case 'isstring':
            return typeof actual === 'string';
        case 'isboolean':
            return ['true', 'false'].includes(actual.toLowerCase());
        case 'isarray':
            try { const p = JSON.parse(actual); return Array.isArray(p); } catch { return false; }
        case 'isjson':
            try { JSON.parse(actual); return true; } catch { return false; }
        default:
            return compareValues(actual, expected, operator);
    }
}

export const evaluateAssertion = (assertion: string, apiResponse?: ApiResponse): boolean | undefined => {
    if (!apiResponse) {
        return undefined;
    }

    const trimmed = assertion.trim();
    if (!trimmed) {
        return undefined;
    }

    // Special handling for HTTP assertions (operatorless per Hurl spec)
    // e.g., "HTTP 200", "HTTP 2xx"
    // HTTP is equivalent to status == <code|class>
    const httpMatch = trimmed.match(/^HTTP\s+(.+)$/i);
    if (httpMatch) {
        const expectedPattern = httpMatch[1].trim();
        const actualStatus = String(apiResponse.statusCode);
        
        // Handle status class patterns (2xx, 3xx, etc.)
        if (expectedPattern.match(/^\d[xX]{2}$/i)) {
            const firstDigit = expectedPattern[0];
            return actualStatus[0] === firstDigit;
        }
        
        // Handle single or multiple status codes (e.g., "200" or "200 201")
        const statusCodes = expectedPattern.split(/\s+/);
        return statusCodes.includes(actualStatus);
    }

    // Special handling for operatorless status assertions (Hurl format)
    // e.g., "status 200", "status 2xx"
    const statusMatch = trimmed.match(/^status\s+(.+)$/i);
    if (statusMatch) {
        const expectedPattern = statusMatch[1].trim();
        const actualStatus = String(apiResponse.statusCode);
        
        // Handle status class patterns (2xx, 3xx, etc.)
        if (expectedPattern.match(/^\d[xX]{2}$/i)) {
            const firstDigit = expectedPattern[0];
            return actualStatus[0] === firstDigit;
        }
        
        // Handle multiple status codes (e.g., "200 201")
        const statusCodes = expectedPattern.split(/\s+/);
        return statusCodes.includes(actualStatus);
    }

    // Native Hurl extractor assertions: jsonpath/xpath/header/cookie/regex/duration/url/bytes
    // Format: extractorType "expression" operator value
    //      or: extractorType operator value (for expression-less types like duration, url)
    const EXTRACTOR_OPS = 'contains|notContains|startsWith|endsWith|matches|notMatches|isNull|isNotEmpty|isEmpty|isDefined|isUndefined|isTruthy|isFalsy|isNumber|isString|isBoolean|isArray|isJson|={1,2}|!=|<=|>=|<|>';
    const extractorWithExprMatch = trimmed.match(
        new RegExp(`^(jsonpath|xpath|header|cookie|regex)\\s+"([^"]*)"\\s+(${EXTRACTOR_OPS})\\s*(.*)$`, 'i')
    );
    if (extractorWithExprMatch) {
        const [, extractorType, expression, operator, rawExpected] = extractorWithExprMatch;
        const expected = rawExpected.trim().replace(/^['"]|['"]$/g, '');
        let actual: string;
        switch (extractorType.toLowerCase()) {
            case 'header':
                actual = (apiResponse.headers || []).find(
                    h => h.key.toLowerCase() === expression.toLowerCase()
                )?.value ?? '';
                break;
            case 'jsonpath': {
                try {
                    const obj = JSON.parse(apiResponse.body ?? '');
                    const val = evaluateSimpleJsonPath(obj, expression);
                    actual = val !== undefined ? String(val) : '';
                } catch { return false; }
                break;
            }
            case 'cookie': {
                const setCookie = (apiResponse.headers || []).find(
                    h => h.key.toLowerCase() === 'set-cookie'
                )?.value ?? '';
                try {
                    const m = setCookie.match(new RegExp(`(?:^|;\\s*)${expression}=([^;]+)`, 'i'));
                    actual = m?.[1] ?? '';
                } catch { return false; }
                break;
            }
            case 'regex': {
                try {
                    const m = (apiResponse.body ?? '').match(new RegExp(expression));
                    actual = m?.[1] ?? m?.[0] ?? '';
                } catch { return false; }
                break;
            }
            default:
                actual = '';
        }
        return evalOperator(actual, expected, operator);
    }

    // No-expression extractor assertions: duration/url/bytes operator value
    const extractorNoExprMatch = trimmed.match(
        new RegExp(`^(duration|url|bytes)\\s+(${EXTRACTOR_OPS})\\s*(.*)$`, 'i')
    );
    if (extractorNoExprMatch) {
        // duration/url not available in ApiResponse — treat as true (evaluated at run time by hurl)
        return undefined;
    }

    // Original parsing for operator-based assertions
    const match = trimmed.match(/^([a-z]+)(?:\.(.+?))?\s*(contains|notContains|startsWith|endsWith|matches|notMatches|isNull|isNotEmpty|isEmpty|isDefined|isUndefined|isTruthy|isFalsy|isNumber|isString|isBoolean|isArray|isJson|={1,2}|!=|<=|>=|<|>)\s*(.*)$/i);
    if (!match) {
        return false;
    }

    const [, target, property, operator, rawExpected] = match;
    const expected = rawExpected.trim().replace(/^['"]|['"]$/g, '');

    if (target.toLowerCase() === 'status') {
        return evalOperator(String(apiResponse.statusCode), expected, operator);
    }

    if (target.toLowerCase() === 'body') {
        const responseBody = apiResponse.body ?? '';

        if (property) {
            // Handle nested property access
            try {
                const bodyObj = JSON.parse(responseBody);
                const value = getNestedProperty(bodyObj, property);
                const actualStr = String(value ?? '');
                return evalOperator(actualStr, expected, operator);
            } catch {
                return false;
            }
        } else {
            // Handle entire body comparison
            const isExpectedJson = expected.startsWith('{') || expected.startsWith('[');
            if (isExpectedJson && (operator === '=' || operator === '==')) {
                try {
                    const expectedJson = JSON.parse(expected);
                    const responseJson = JSON.parse(responseBody);
                    return JSON.stringify(expectedJson) === JSON.stringify(responseJson);
                } catch {
                    return false;
                }
            }
            return evalOperator(responseBody, expected, operator);
        }
    }

    if (target.toLowerCase() === 'headers' && property) {
        const headerValue = (apiResponse.headers || []).find(
            (h) => h.key.toLowerCase() === property.toLowerCase()
        )?.value;
        if (headerValue === undefined) {
            return false;
        }
        return evalOperator(headerValue.trim(), expected, operator);
    }

    return false;
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
