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

    const match = trimmed.match(/^([a-z]+)(?:\.(.+?))?\s*(={1,2}|!=|<=|>=|<|>)\s*(.+)$/i);
    if (!match) {
        return undefined;
    }

    const [, , , , rawExpected] = match;
    const expected = rawExpected.trim().replace(/^['"]|['"]$/g, '');
    return expected;
};

export const getOperator = (assertion: string): string | undefined => {
    const trimmed = assertion.trim();
    if (!trimmed) {
        return undefined;
    }

    const match = trimmed.match(/^([a-z]+)(?:\.(.+?))?\s*(={1,2}|!=|<=|>=|<|>)\s*(.+)$/i);
    if (!match) {
        return undefined;
    }

    const [, , , operator] = match;
    return operator;
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

    const match = trimmed.match(/^([a-z]+)(?:\.(.+?))?\s*(={1,2}|!=|<=|>=|<|>)\s*(.+)$/i);
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

    const match = trimmed.match(/^([a-z]+)(?:\.(.+?))?\s*(={1,2}|!=|<=|>=|<|>)\s*(.+)$/i);
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

    if (target.toLowerCase() === 'status') {
        return compareValues(String(apiResponse.statusCode), expected, operator);
    }

    if (target.toLowerCase() === 'body') {
        const responseBody = apiResponse.body ?? '';

        if (property) {
            // Handle nested property access
            try {
                const bodyObj = JSON.parse(responseBody);
                const value = getNestedProperty(bodyObj, property);
                const actualStr = String(value ?? '');
                return compareValues(actualStr, expected, operator);
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
            return compareValues(responseBody, expected, operator);
        }
    }

    if (target.toLowerCase() === 'headers' && property) {
        const headerValue = (apiResponse.headers || []).find(
            (h) => h.key.toLowerCase() === property.toLowerCase()
        )?.value;
        if (headerValue === undefined) {
            return false;
        }
        return compareValues(headerValue.trim(), expected, operator);
    }

    return false;
};
