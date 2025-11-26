// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { createAnthropic } from "@ai-sdk/anthropic";
import * as vscode from "vscode";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { getAccessToken, getLoginMethod, getRefreshedAccessToken, getAwsBedrockCredentials } from "../auth";
import { StateMachineAI, openAIWebview } from "../aiMachine";
import { AI_EVENT_TYPE, LoginMethod } from "@wso2/mi-core";
import { logInfo, logDebug, logError } from "./logger";

export const ANTHROPIC_HAIKU_4_5 = "claude-haiku-4-5-20251001";
export const ANTHROPIC_SONNET_4_5 = "claude-sonnet-4-5-20250929";

type AnthropicModel =
    | typeof ANTHROPIC_HAIKU_4_5
    | typeof ANTHROPIC_SONNET_4_5;

/**
 * Maps AWS regions to their corresponding Bedrock inference profile prefixes
 * @param region - AWS region string (e.g., 'us-east-1', 'eu-west-1', 'ap-southeast-1')
 * @returns The appropriate regional prefix for Bedrock model IDs
 */
export function getBedrockRegionalPrefix(region: string): string {
    const regionPrefix = region.split('-')[0].toLowerCase();
    
    switch (regionPrefix) {
        case 'us':
            return region.startsWith('us-gov-') ? 'us-gov' : 'us';
        case 'eu':
            return 'eu';
        case 'ap':
            return 'apac';
        case 'ca':
        case 'sa':
            return 'us'; // Canada and South America regions use US prefix
        default:
            console.warn(`Unknown region prefix: ${regionPrefix}, defaulting to 'us'`);
            return 'us';
    }
}

let cachedAnthropic: ReturnType<typeof createAnthropic> | null = null;
let cachedAuthMethod: LoginMethod | null = null;

/**
 * Get the backend URL for MI Copilot
 */
const getAnthropicProxyUrl = (): string => {
    const proxyUrl = process.env.MI_COPILOT_ANTHROPIC_PROXY_URL;
    if (!proxyUrl) {
        throw new Error('MI_COPILOT_ANTHROPIC_PROXY_URL environment variable is not set');
    }
    return `${proxyUrl}/proxy/anthropic/v1`;
};

/**
 * Reusable fetch function that handles authentication with token refresh
 * @param input - The URL, Request object, or string to fetch
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export async function fetchWithAuth(input: string | URL | Request, options: RequestInit = {}): Promise<Response> {
    try {
        const accessToken = await getAccessToken();

        // Ensure headers object exists
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'MI-VSCode-Plugin',
            'Connection': 'keep-alive',
        };

        let response = await fetch(input, options);

        // Handle rate limit/quota errors (429)
        if (response.status === 429) {
            logInfo("Rate limit/quota exceeded (429)");
            let errorDetail = "";
            try {
                const body = await response.json();
                errorDetail = body.detail || "";
            } catch (e) {
                logError("Failed to parse 429 response body", e);
            }

            // Transition to UsageExceeded state
            StateMachineAI.sendEvent(AI_EVENT_TYPE.USAGE_EXCEEDED);

            // Notify user and prompt to use their own API key
            vscode.window.showWarningMessage(
                "Your free usage quota has been exceeded. Set your own Anthropic API key to continue using MI Copilot with unlimited access.",
                "Set API Key",
                "Learn More"
            ).then(selection => {
                if (selection === "Set API Key") {
                    openAIWebview();
                    StateMachineAI.sendEvent(AI_EVENT_TYPE.AUTH_WITH_API_KEY);
                } else if (selection === "Learn More") {
                    vscode.env.openExternal(vscode.Uri.parse("https://console.anthropic.com/"));
                }
            });

            // Create a special error that should not be retried
            const error: any = new Error(`USAGE_QUOTA_EXCEEDED: ${errorDetail}`.trim());
            error.isUsageQuotaError = true;
            error.status = 429;
            throw error;
        }

        // Handle token expiration
        if (response.status === 401) {
            logInfo("Token expired. Refreshing token...");
            const newToken = await getRefreshedAccessToken();
            if (newToken) {
                options.headers = {
                    ...options.headers,
                    'Authorization': `Bearer ${newToken}`,
                };
                response = await fetch(input, options);
            } else {
                StateMachineAI.sendEvent(AI_EVENT_TYPE.LOGOUT);
                throw new Error("Authentication failed: Unable to refresh token");
            }
        }

        return response;
    } catch (error: any) {
        if (error?.message === "TOKEN_EXPIRED") {
            StateMachineAI.sendEvent(AI_EVENT_TYPE.LOGOUT);
            throw new Error("Authentication failed: Token expired");
        } else {
            throw error;
        }
    }
}

/**
 * Returns a singleton Anthropic client instance.
 * Re-initializes the client if the login method has changed.
 */
export const getAnthropicClient = async (model: AnthropicModel): Promise<any> => {
    const loginMethod = await getLoginMethod();

    // Recreate client if login method has changed or no cached instance
    if (!cachedAnthropic || cachedAuthMethod !== loginMethod) {
        if (loginMethod === LoginMethod.MI_INTEL) {
            const backendUrl = getAnthropicProxyUrl();
            cachedAnthropic = createAnthropic({
                baseURL: backendUrl,
                apiKey: "xx", // dummy value; real auth is via fetchWithAuth
                fetch: fetchWithAuth,
            });
        } else if (loginMethod === LoginMethod.ANTHROPIC_KEY) {
            const apiKey = await getAccessToken();
            if (!apiKey) {
                throw new Error("Authentication failed: Unable to get API key");
            }
            cachedAnthropic = createAnthropic({
                baseURL: "https://api.anthropic.com/v1",
                apiKey: apiKey,
            });
        } else if (loginMethod === LoginMethod.AWS_BEDROCK) {
            const awsCredentials = await getAwsBedrockCredentials();
            if (!awsCredentials) {
                throw new Error('AWS Bedrock credentials not found');
            }
            
            const bedrock = createAmazonBedrock({
                region: awsCredentials.region,
                accessKeyId: awsCredentials.accessKeyId,
                secretAccessKey: awsCredentials.secretAccessKey,
                sessionToken: awsCredentials.sessionToken,
            });
            
            // Map Anthropic model names to AWS Bedrock model IDs (base models without region prefix)
            const baseModelMap: Record<AnthropicModel, string> = {
                [ANTHROPIC_HAIKU_4_5]: "anthropic.claude-haiku-4-5-20251001-v1:0",
                [ANTHROPIC_SONNET_4_5]: "anthropic.claude-sonnet-4-5-20250929-v1:0",
            };
            
            const baseModelId = baseModelMap[model];
            if (!baseModelId) {
                throw new Error(`Unsupported model for AWS Bedrock: ${model}`);
            }
            
            // Get regional prefix based on AWS region
            const regionalPrefix = getBedrockRegionalPrefix(awsCredentials.region);
            const bedrockModelId = `${regionalPrefix}.${baseModelId}`;
            
            return bedrock(bedrockModelId);
        } else {
            throw new Error(`Unsupported login method: ${loginMethod}`);
        }

        cachedAuthMethod = loginMethod;
    } else {
        logDebug('Using cached Anthropic client');
    }

    return cachedAnthropic!(model);
};

/**
 * Returns provider-aware cache control options for prompt caching
 * @returns Cache control options based on the current login method
 */
export const getProviderCacheControl = async () => {
    const loginMethod = await getLoginMethod();
    
    switch (loginMethod) {
        case LoginMethod.AWS_BEDROCK:
            return { bedrock: { cachePoint: { type: 'default' } } };
        case LoginMethod.ANTHROPIC_KEY:
        case LoginMethod.MI_INTEL:
        default:
            return { anthropic: { cacheControl: { type: "ephemeral" } } };
    }
};
