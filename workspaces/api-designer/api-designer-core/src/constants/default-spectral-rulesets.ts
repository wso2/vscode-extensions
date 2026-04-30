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

import type { SpectralRuleset } from '../rpc-types/api-designer-visualizer/analyze';

/** JSONPath / key inside each ruleset YAML where Spectral `rules` live */
export const DEFAULT_SPECTRAL_RULESET_CONTENT_PATH = 'rulesetContent';

function ruleset(
    name: string,
    fileName: string,
    sourceFolder: string
): SpectralRuleset {
    return {
        name,
        sourceFolder,
        fileName,
        rulesetContentPath: DEFAULT_SPECTRAL_RULESET_CONTENT_PATH
    };
}

/**
 * Default governance rulesets when no `.api-platform/config.yaml` (or empty list) — Analyze / governance dashboards.
 * Caller must provide the base source folder that contains bundled rulesets.
 */
export function getDefaultGovernanceSpectralRulesets(baseSourceFolder: string): SpectralRuleset[] {
    const normalizedBase = (baseSourceFolder || '').replace(/[\\/]+$/, '');
    return [
        ruleset('WSO2 REST API AI Readiness Guidelines', 'ai-readiness.yaml', normalizedBase),
        ruleset('OWASP Top 10 Security', 'owasp_top_10.yaml', normalizedBase),
        ruleset('WSO2 REST API Design Guidelines', 'wso2_rest_api_design_guidelines.yaml', normalizedBase)
    ];
}
