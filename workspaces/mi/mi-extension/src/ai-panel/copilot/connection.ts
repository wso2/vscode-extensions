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
import { getAccessToken, getLoginMethod, getRefreshedAccessToken } from "../auth";
import { StateMachineAI, openAIWebview } from "../aiMachine";
import { AI_EVENT_TYPE, LoginMethod } from "@wso2/mi-core";

export const ANTHROPIC_HAIKU_4_5 = "claude-haiku-4-5-20251001";
export const ANTHROPIC_SONNET_4_5 = "claude-sonnet-4-5-20250929";

type AnthropicModel =
    | typeof ANTHROPIC_HAIKU_4_5
    | typeof ANTHROPIC_SONNET_4_5;

let cachedAnthropic: ReturnType<typeof createAnthropic> | null = null;
let cachedAuthMethod: LoginMethod | null = null;

/**
 * Get the backend URL for MI Copilot
 */
const getAnthropicProxyUrl = (): string => {
    return process.env.MI_COPILOT_ANTHROPIC_PROXY_URL + '/proxy/anthropic/v1' as string;
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
        console.log("options: ", options);

        // Handle rate limit/quota errors (429)
        if (response.status === 429) {
            console.log("Rate limit/quota exceeded (429)");
            let errorDetail = "";
            try {
                const body = await response.json();
                errorDetail = body.detail || "";
            } catch (e) {
                console.error("Failed to parse 429 response body:", e);
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
            console.log("Token expired. Refreshing token...");
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
            cachedAnthropic = createAnthropic({
                baseURL: "https://api.anthropic.com/v1",
                apiKey: apiKey,
            });
        } else {
            throw new Error(`Unsupported login method: ${loginMethod}`);
        }

        cachedAuthMethod = loginMethod;
    }

    return cachedAnthropic!(model);
};

/**
 * Returns cache control options for prompt caching
 * @returns Cache control options for Anthropic
 */
export const getProviderCacheControl = async () => {
    return { anthropic: { cacheControl: { type: "ephemeral" } } };
};
