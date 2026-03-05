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

function escapeRegexChar(value: string): string {
	return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function wildcardToRegex(pattern: string): RegExp {
	let expression = '';

	for (let i = 0; i < pattern.length; i++) {
		const char = pattern[i];
		const next = pattern[i + 1];

		if (char === '*' && next === '*') {
			expression += '.*';
			i += 1;
			continue;
		}

		if (char === '*') {
			expression += '[^/]*';
			continue;
		}

		expression += escapeRegexChar(char);
	}

	return new RegExp(`^${expression}$`);
}

export function normalizeForPattern(pathValue: string): string {
	return pathValue.replace(/\\/g, '/');
}

export function matchesPattern(pathValue: string, pattern: string): boolean {
	const normalizedPath = normalizeForPattern(pathValue);
	const normalizedPattern = normalizeForPattern(pattern);
	const regex = wildcardToRegex(normalizedPattern);
	return regex.test(normalizedPath);
}
