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

import * as vscode from 'vscode';
import {
    CheckAIAvailabilityRequest,
    CheckAIAvailabilityResponse
} from '@wso2/api-designer-core';
import { BaseRpcManager } from './base-rpc-manager';

type VSCodeWithLM = typeof vscode & { lm?: unknown };
const vscodeWithLM = vscode as VSCodeWithLM;

/**
 * Manager for AI-related RPC operations
 * Handles AI availability checks
 */
export class AIRpcManager extends BaseRpcManager {
    constructor() {
        super('AIRpcManager');
    }

    async checkAIAvailability(params: CheckAIAvailabilityRequest): Promise<CheckAIAvailabilityResponse> {
        try {
            // Check if Language Model API is available
            if (!vscodeWithLM.lm) {
                this.logDebug('Language Model API not available');
                return { available: false };
            }

            // Check for any available AI provider using factory
            try {
                const { AIProviderFactory } = await import('../../../ai/ai-provider-factory');
                const available = await AIProviderFactory.hasAvailableProvider();
                this.logDebug(`AI Chat available: ${available}`);
                return { available };
            } catch (error) {
                this.logDebug(`Error checking AI availability: ${error}`);
                return { available: false };
            }
        } catch (error) {
            this.logError('Error checking AI availability', error);
            return { available: false };
        }
    }
}

