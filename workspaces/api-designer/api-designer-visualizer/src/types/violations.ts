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

import { GovernanceViolation } from '@wso2/api-designer-core';

/**
 * Normalized governance violation with consistent path format
 */
export interface NormalizedGovernanceViolation {
    pathSegments: string[];
    displayPath: string;
    message: string;
    severity: 'error' | 'warn' | 'info' | 'hint';
    rule?: string;
    code?: string;
}

/**
 * Filter type for violations
 */
export type ViolationFilter = 'error' | 'warn' | 'info' | 'passed';

/**
 * Governance ruleset data with violations
 */
export interface GovernanceRulesetData {
    name: string;
    violations: NormalizedGovernanceViolation[];
    passedChecks: number;
    failedChecks: number;
    totalChecks: number;
    score: number;
}

/**
 * Normalize a governance violation to a consistent format
 */
export function normalizeGovernanceViolation(violation: GovernanceViolation): NormalizedGovernanceViolation {
    const rawSegments = Array.isArray(violation.path)
        ? violation.path.map((segment) => String(segment))
        : typeof violation.path === 'string'
            ? violation.path.split('>').map((segment: string) => segment.trim()).filter(Boolean)
            : [];

    const displayPath = rawSegments.length > 0
        ? rawSegments.join(' > ')
        : (Array.isArray(violation.path) ? violation.path.join(' > ') : (violation.path || 'Unknown path'));

    return {
        ...violation,
        pathSegments: rawSegments,
        displayPath,
        message: violation.message || 'No message provided',
        severity: (violation.severity || 'info') as 'error' | 'warn' | 'info' | 'hint'
    };
}

/**
 * Filter violations by severity
 */
export function filterViolations(
    violations: NormalizedGovernanceViolation[],
    filter: ViolationFilter,
    passed?: NormalizedGovernanceViolation[]
): NormalizedGovernanceViolation[] {
    if (filter === 'passed') {
        return passed || [];
    }
    return violations?.filter((violation) => {
        const severity = violation.severity || 'info';
        if (filter === 'info') {
            return severity === 'info' || severity === 'hint';
        }
        return severity === filter;
    }) || [];
}

