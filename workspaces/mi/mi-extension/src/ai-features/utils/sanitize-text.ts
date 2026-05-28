/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Strips ANSI escape sequences and stray ASCII control bytes from text
 * destined for the Anthropic Messages API.
 *
 * Why: Maven/Gradle/npm captured-to-file logs embed ANSI color codes
 * (ESC + `[...m`). When such text becomes a tool-result value, the
 * Copilot proxy fails the request with `unexpected control character in
 * string` — JSON.stringify produces a valid `` escape, but the
 * upstream JSON parser still rejects raw control chars elsewhere in the
 * pipeline. Stripping at the tool boundary removes the bytes before they
 * can leak into the wire body.
 *
 * Preserves \t, \n, \r since those are common in tool output and survive
 * JSON serialization without issue.
 */
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_RE = /\x1b(?:\[[0-9;?]*[A-Za-z]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[@-Z\\-_])/g;
// eslint-disable-next-line no-control-regex
const STRAY_CONTROL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

export function stripAnsiAndControl(input: string): string {
    if (!input) {
        return input;
    }
    return input.replace(ANSI_ESCAPE_RE, '').replace(STRAY_CONTROL_RE, '');
}
