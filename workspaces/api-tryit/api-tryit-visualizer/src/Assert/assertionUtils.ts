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

export const evaluateAssertion = (assertion: string, apiResponse?: ApiResponse): boolean | undefined => {
    if (!apiResponse) {
        return undefined;
    }

    const trimmed = assertion.trim();
    if (!trimmed) {
        return undefined;
    }

    const match = trimmed.match(/^([a-z]+)(?:\.(.+?))?\s*(contains|notContains|startsWith|endsWith|matches|notMatches|isNull|isNotEmpty|isEmpty|isDefined|isUndefined|isTruthy|isFalsy|isNumber|isString|isBoolean|isArray|isJson|={1,2}|!=|<=|>=|<|>)\s*(.*)$/i);
    if (!match) {
        return false;
    }

    const [, target, property, operator, rawExpected] = match;
    const expected = rawExpected.trim().replace(/^['"]|['"]$/g, '');

    const compareValues = (actual: string, expected: string, operator: string): boolean => {
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
    };

    const evalOperator = (actual: string, expected: string, operator: string): boolean => {
        const op = operator;
        const lowerOp = op.toLowerCase();
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
                try { return new RegExp(expected).test(actual); } catch { return false; }
            case 'notmatches':
                try { return !new RegExp(expected).test(actual); } catch { return false; }
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
                return !isNaN(Number(actual));
            case 'isboolean':
                return ['true', 'false'].includes(actual.toLowerCase());
            case 'isarray':
                try { const p = JSON.parse(actual); return Array.isArray(p); } catch { return false; }
            case 'isjson':
                try { JSON.parse(actual); return true; } catch { return false; }
            default:
                return compareValues(actual, expected, operator);
        }
    };

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
