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

import { ModelConfig } from '../types';
import { DEFAULT_MODEL_CONFIG } from '../config/defaults';

/**
 * Calculates the auto-compaction token threshold from model configuration.
 *
 * Formula:
 *   effectiveWindow = maxContextWindow - maxOutputTokens
 *   threshold       = effectiveWindow - autoCompactBuffer
 *
 * Default (Claude Sonnet 4):
 *   200_000 - 8_192 - 13_000 = 178_808 tokens
 */
export class ThresholdCalculator {
    private config: ModelConfig;

    constructor(config: ModelConfig = DEFAULT_MODEL_CONFIG) {
        this.config = config;
    }

    /**
     * The token count at which automatic compaction is triggered.
     */
    getAutoCompactThreshold(): number {
        const effectiveWindow = this.config.maxContextWindow - this.config.maxOutputTokens;
        return effectiveWindow - this.config.autoCompactBuffer;
    }

    /**
     * Returns true if the given token count is at or above the compaction threshold.
     */
    isAboveAutoCompactThreshold(tokenCount: number): boolean {
        return tokenCount >= this.getAutoCompactThreshold();
    }
}
