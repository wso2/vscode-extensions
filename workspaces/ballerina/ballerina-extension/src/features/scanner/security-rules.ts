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

export type ScannerRuleSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Static security rule definitions for the Ballerina Security Scanner.
 * Each entry maps a rule ID to its human-readable hint and severity level.
 *
 * Format: [Rule ID, Hint Message, Severity]
 *
 * This table is the single source of truth for rule severity classification,
 * used by both the scanner UI (to display correct severity badges) and the
 * AI agent tool (to provide hints to the user).
 */
export const SECURITY_RULES: [string, string, ScannerRuleSeverity][] = [
// [        Rule ID        |       Hint Message    | Severity ]
    ['ballerina:1',             "Handle errors explicitly using the `check` keyword or `json|error` return types instead of `checkpanic`.", 'MEDIUM'],
    ['ballerina:2',             "Remove the unused function parameter or document it if intended for future use. DO NOT USE the _ (the Ballerina wildcard/ignore pattern).", 'LOW'],
    ['ballerina:3',             "Mark the public function as `isolated` to allow concurrent calls.", 'MEDIUM'],
    ['ballerina:4',             "Mark the public class method as `isolated` inside the class definition.", 'MEDIUM'],
    ['ballerina:5',             "Mark the public class as `isolated` to ensure concurrency safety.", 'MEDIUM'],
    ['ballerina:6',             "Mark the public object type as `isolated`.", 'MEDIUM'],
    ['ballerina:7',             "Remove the redundant condition that always evaluates to `true`.", 'LOW'],
    ['ballerina:8',             "Remove the unreachable logic caused by a condition that always evaluates to `false`.", 'LOW'],
    ['ballerina:9',             "Simplify logic that always evaluates to the same value (e.g., modulo 1).", 'LOW'],
    ['ballerina:10',            "Remove the redundant self-assignment (e.g., `x = x`).", 'LOW'],
    ['ballerina:11',            "Remove the unused private field or method from the class.", 'LOW'],
    ['ballerina:12',            "Ensure the range expression counter moves in the correct direction (e.g., `0...9` instead of `9...0`).", 'LOW'],

    ['ballerina/crypto:1',      "Use secure modes like AES-GCM or RSA-OAEP. Avoid ECB mode and PKCS1v1.5 padding.", 'HIGH'],
    ['ballerina/crypto:2',      "Use Argon2id with sufficient memory/iterations or BCrypt (factor >= 10). Avoid MD5/SHA-1 for passwords.", 'HIGH'],
    ['ballerina/crypto:3',      "Generate a unique, random Initialization Vector (IV) for every encryption operation. Do not reuse static IVs.", 'HIGH'],
    ['ballerina/file:1',        "Avoid using global writable directories (like /tmp). Use dedicated sub-directories.", 'MEDIUM'],
    ['ballerina/file:2',        "Validate and normalize file paths using `file:normalizePath` and `file:parentPath` to prevent directory traversal.", 'HIGH'],
    ['ballerina/http:1',        "Explicitly define the HTTP method (resource function get/post/delete) instead of using `default`.", 'MEDIUM'],
    ['ballerina/http:2',        "Restrict CORS `allowOrigins` to specific trusted domains instead of allowing all (`*`).", 'MEDIUM'],
    ['ballerina/http:3',        "Validate and sanitize user input before using it in client URLs to prevent Server-Side Request Forgery.", 'HIGH'],
    ['ballerina/http:4',        "Validate user input before using it in the `Location` header to prevent Open Redirect attacks.", 'HIGH'],
    ['ballerina/io:1',          "Normalize paths (`file:normalizePath`) and check parent directories before performing file I/O.", 'HIGH'],
    ['ballerina/log:1',         "Do not log configurable variables or sensitive data (passwords, secrets) in clear text.", 'MEDIUM'],
    ['ballerina/os:1',          "Use an allow-list to sanitize arguments before passing user input to `os:exec`.", 'HIGH'],
    ['ballerina/os:2',          "Validate input (e.g., alphanumeric check) before setting environment variables.", 'MEDIUM'],
    ['ballerina/jwt:1',         "Use strong signing algorithms like `RS256`. Do not use `NONE`.", 'HIGH'],
    ['ballerina/email:1',       "Enable `verifyHostName: true` in the secure socket configuration to prevent MITM attacks.", 'HIGH'],

    ['ballerinax/mysql:1',      "Use parameterized queries (`sql:ParameterizedQuery`) to prevent SQL injection.", 'HIGH'],
    ['scannertest/mysql:1',     "Use parameterized queries (`sql:ParameterizedQuery`) to prevent SQL injection.", 'HIGH'],
];

/**
 * Pre-built lookup map from rule ID.
 */
const SEVERITY_BY_RULE_ID = new Map<string, ScannerRuleSeverity>(
    SECURITY_RULES.map(([ruleId, , severity]) => [ruleId, severity])
);

/**
 * Pre-built lookup map from rule ID.
 */
const HINT_BY_RULE_ID = new Map<string, string>(
    SECURITY_RULES.map(([ruleId, hint]) => [ruleId, hint])
);

/**
 * Returns the security severity for a given rule ID.
 */
export function getRuleSeverity(ruleId: string): ScannerRuleSeverity {
    return SEVERITY_BY_RULE_ID.get(ruleId);
}

/**
 * Returns the hint message for a given rule ID, if available.
 */
export function getRuleHint(ruleId: string): string | undefined {
    return HINT_BY_RULE_ID.get(ruleId);
}
