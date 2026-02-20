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

import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { logInfo, logError } from '../copilot/logger';

let sdk: NodeSDK | null = null;

/**
 * Initialize Langfuse OpenTelemetry integration
 * This should be called once when the extension activates
 */
export function initializeLangfuse(): void {
    try {
        sdk = new NodeSDK({
            spanProcessors: [
                new LangfuseSpanProcessor({
                    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
                    secretKey: process.env.LANGFUSE_SECRET_KEY,
                    baseUrl: 'https://cloud.langfuse.com',
                }),
            ],
        });

        sdk.start();
        logInfo('[Langfuse] OpenTelemetry SDK initialized - traces will be sent to https://cloud.langfuse.com');
    } catch (error) {
        logError('[Langfuse] Failed to initialize OpenTelemetry SDK', error);
    }
}

/**
 * Shutdown Langfuse OpenTelemetry integration
 * This should be called when the extension deactivates
 */
export async function shutdownLangfuse(): Promise<void> {
    if (sdk) {
        try {
            await sdk.shutdown();
            logInfo('[Langfuse] OpenTelemetry SDK shutdown complete');
        } catch (error) {
            logError('[Langfuse] Failed to shutdown OpenTelemetry SDK', error);
        }
    }
}
