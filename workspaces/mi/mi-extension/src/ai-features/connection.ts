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
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import * as vscode from "vscode";
import { getAccessToken, getCopilotLlmApiBaseUrl, getLoginMethod, getRefreshedAccessToken, getAwsBedrockCredentials } from "./auth";
import { StateMachineAI, openAIWebview } from "./aiMachine";
import { AI_EVENT_TYPE, LoginMethod } from "@wso2/mi-core";
import { logInfo, logDebug, logError } from "./copilot/logger";

export const ANTHROPIC_HAIKU_4_5 = "claude-haiku-4-5";
export const ANTHROPIC_SONNET_4_6 = "claude-sonnet-4-6";
// Backward-compatible alias for existing imports.
export const ANTHROPIC_SONNET_4_5 = ANTHROPIC_SONNET_4_6;

export type AnthropicModel =
    | typeof ANTHROPIC_HAIKU_4_5
    | typeof ANTHROPIC_SONNET_4_6;

// Bedrock model ID mappings
const BEDROCK_MODEL_MAP: Record<string, string> = {
    [ANTHROPIC_HAIKU_4_5]: "anthropic.claude-3-5-haiku-20241022-v1:0",
    [ANTHROPIC_SONNET_4_6]: "anthropic.claude-sonnet-4-20250514-v1:0",
};

/**
 * Get the regional prefix for Bedrock model IDs based on AWS region.
 * Cross-region inference requires a regional prefix (e.g., us., eu.).
 */
export const getBedrockRegionalPrefix = (region: string): string => {
    const prefix = region.split('-')[0];
    switch (prefix) {
        case 'us':
        case 'eu':
        case 'ap':
        case 'ca':
        case 'sa':
        case 'me':
        case 'af':
            return prefix;
        default:
            return 'us';
    }
};

let cachedAnthropic: ReturnType<typeof createAnthropic> | null = null;
let cachedBedrock: ReturnType<typeof createAmazonBedrock> | null = null;
let cachedAuthMethod: LoginMethod | null = null;
let reLoginPromptInFlight = false;

/**
 * Get the backend URL for MI Copilot
 */
const getAnthropicProxyUrl = (): string => {
    const proxyUrl = getCopilotLlmApiBaseUrl();
    if (!proxyUrl) {
        throw new Error('Copilot LLM API URL is not set. Configure COPILOT_ROOT_URL (or COPILOT_DEV_ROOT_URL when CLOUD_ENV=dev) so getCopilotLlmApiBaseUrl() resolves correctly.');
    }
    return proxyUrl;
};

const promptReLogin = () => {
    if (reLoginPromptInFlight) {
        return;
    }

    reLoginPromptInFlight = true;
    void vscode.window.showWarningMessage(
        'Your MI Copilot session is no longer valid for the current environment. Please sign in again.',
        'Sign In'
    ).then((selection) => {
        if (selection === 'Sign In') {
            openAIWebview();
            StateMachineAI.sendEvent(AI_EVENT_TYPE.LOGIN);
        }
    }, () => undefined).then(() => {
        reLoginPromptInFlight = false;
    });
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
        const loginMethod = await getLoginMethod();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'MI-VSCode-Plugin',
            'Connection': 'keep-alive',
            'x-product': 'mi',
            'x-usage-context': 'copilot',
            'x-metadata': JSON.stringify({ isCloudEditor: !!process.env.CLOUD_ENV }),
        };

        if (accessToken && loginMethod === LoginMethod.MI_INTEL) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }
        // AWS_BEDROCK auth is handled by the AWS SDK directly, no auth headers needed here

        // Ensure headers object exists
        // Note: anthropic-beta header for prompt caching is added by the AI SDK
        options.headers = {
            ...options.headers,
            ...headers,
        };
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        // Debug: Log request details for cache debugging
        if (url.includes('/messages')) {
            const requestHeaders = options.headers as Record<string, string>;
            const betaHeader = requestHeaders['anthropic-beta'] || requestHeaders['Anthropic-Beta'] || 'none';
            logDebug(`[Cache] Request URL: ${url}`);
            logDebug(`[Cache] Request headers - anthropic-beta: ${betaHeader}`);
            
            try {
                const body = options.body ? JSON.parse(options.body as string) : null;
                if (body?.messages) {
                    const cacheBreakpoints = body.messages
                        .map((m: any, i: number) => {
                            // Check for cache_control in message or content parts
                            const hasCache = m.cache_control || 
                                (Array.isArray(m.content) && m.content.some((c: any) => c.cache_control));
                            return hasCache ? `${i}:${m.role}` : null;
                        })
                        .filter(Boolean);
                    logDebug(`[Cache] Request: ${body.messages.length} messages, cache_control at: [${cacheBreakpoints.join(', ')}]`);
                }
            } catch (e) {
                // Ignore parse errors for non-JSON bodies
            }
        }

        let response = await fetch(input, options);
        if (url.includes('/messages') && !response.ok) {
            logError(`[Cache] Request failed for URL ${url} with status ${response.status} ${response.statusText}`);
        }

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

        // Handle authentication failures.
        // 403 can happen when env switches (token issued for a different backend environment).
        if (response.status === 401 || response.status === 403) {
            if (loginMethod === LoginMethod.MI_INTEL) {
                logInfo(`Auth failure (${response.status}). Refreshing token via STS exchange...`);
                try {
                    const newToken = await getRefreshedAccessToken();
                    options.headers = {
                        ...options.headers,
                        'Authorization': `Bearer ${newToken}`,
                    };
                    response = await fetch(input, options);

                    if (response.status === 401 || response.status === 403) {
                        StateMachineAI.sendEvent(AI_EVENT_TYPE.SILENT_LOGOUT);
                        promptReLogin();
                        throw new Error(`Authentication failed after token refresh (${response.status})`);
                    }
                } catch (refreshError) {
                    StateMachineAI.sendEvent(AI_EVENT_TYPE.SILENT_LOGOUT);
                    promptReLogin();
                    throw new Error(`Authentication failed: ${refreshError instanceof Error ? refreshError.message : 'Unable to refresh token'}`);
                }
            } else if (loginMethod === LoginMethod.ANTHROPIC_KEY) {
                StateMachineAI.sendEvent(AI_EVENT_TYPE.SILENT_LOGOUT);
                throw new Error('Authentication failed: Anthropic API key is invalid or expired');
            } else if (loginMethod === LoginMethod.AWS_BEDROCK) {
                StateMachineAI.sendEvent(AI_EVENT_TYPE.SILENT_LOGOUT);
                throw new Error('Authentication failed: AWS Bedrock credentials are invalid or expired');
            }
        }

        return response;
    } catch (error: any) {
        if (error?.message === "TOKEN_EXPIRED") {
            StateMachineAI.sendEvent(AI_EVENT_TYPE.SILENT_LOGOUT);
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
export const getAnthropicProvider = async (): Promise<ReturnType<typeof createAnthropic>> => {
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
            // For Bedrock, Anthropic provider is not used directly.
            // Return a dummy provider; actual model creation happens in getAnthropicClient.
            cachedAnthropic = createAnthropic({
                baseURL: "https://api.anthropic.com/v1",
                apiKey: "xx", // dummy; not used for Bedrock
            });
        } else {
            throw new Error(`Unsupported login method: ${loginMethod}`);
        }

        cachedAuthMethod = loginMethod;
    } else {
        logDebug('Using cached Anthropic client');
    }

    return cachedAnthropic!;
};

/**
 * Get or create a cached Bedrock provider instance.
 */
const getBedrockProvider = async (): Promise<{
    provider: ReturnType<typeof createAmazonBedrock>;
    credentials: Awaited<ReturnType<typeof getAwsBedrockCredentials>> & {};
}> => {
    const credentials = await getAwsBedrockCredentials();
    if (!credentials) {
        throw new Error("Authentication failed: Unable to get AWS Bedrock credentials");
    }

    // Always recreate to ensure fresh credentials
    cachedBedrock = createAmazonBedrock({
        region: credentials.region,
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
    });

    return { provider: cachedBedrock, credentials };
};

export const getAnthropicClient = async (model: AnthropicModel): Promise<any> => {
    const loginMethod = await getLoginMethod();

    if (loginMethod === LoginMethod.AWS_BEDROCK) {
        const { provider: bedrockProvider, credentials } = await getBedrockProvider();
        const regionalPrefix = getBedrockRegionalPrefix(credentials.region);
        const bedrockModelId = BEDROCK_MODEL_MAP[model];
        if (!bedrockModelId) {
            throw new Error(`No Bedrock model mapping found for: ${model}`);
        }
        const fullModelId = `${regionalPrefix}.${bedrockModelId}`;
        logDebug(`Using Bedrock model: ${fullModelId}`);
        return bedrockProvider(fullModelId);
    }

    const provider = await getAnthropicProvider();
    return provider(model);
};

/**
 * Returns cache control options for prompt caching
 * @returns Cache control options for Anthropic or Bedrock
 */
export const getProviderCacheControl = async (): Promise<Record<string, { cacheControl: { type: string } }>> => {
    const loginMethod = await getLoginMethod();
    if (loginMethod === LoginMethod.AWS_BEDROCK) {
        return { bedrock: { cacheControl: { type: "ephemeral" } } };
    }
    return { anthropic: { cacheControl: { type: "ephemeral" } } };
};
