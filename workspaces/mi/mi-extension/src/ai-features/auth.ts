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

/**
 * Unified Authentication Module
 *
 * This file contains ALL authentication logic for MI Copilot:
 * - Credential storage and retrieval
 * - Devant platform-extension authentication flow (MI_INTEL login method)
 * - API key validation (ANTHROPIC_KEY login method)
 * - Token refresh via STS re-exchange
 * - Login/Logout operations
 */

import axios from 'axios';
import { AIUserToken, AuthCredentials, LoginMethod } from '@wso2/mi-core';
import { extension } from '../MIExtensionContext';
import * as vscode from 'vscode';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { CommandIds as PlatformExtCommandIds, IWso2PlatformExtensionAPI } from '@wso2/wso2-platform-core';
import { logInfo, logWarn, logError } from './copilot/logger';

export const TOKEN_NOT_AVAILABLE_ERROR_MESSAGE = 'Access token is not available.';
export const PLATFORM_EXTENSION_ID = 'wso2.wso2-platform';
export const TOKEN_REFRESH_ONLY_SUPPORTED_FOR_MI_INTEL = 'Token refresh is only supported for MI Intelligence authentication';
export const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5';

// Credential storage key
const AUTH_CREDENTIALS_SECRET_KEY = 'MIAuthCredentials';

// Legacy keys (for migration)
const LEGACY_ACCESS_TOKEN_SECRET_KEY = 'MIAIUser';
const LEGACY_REFRESH_TOKEN_SECRET_KEY = 'MIAIRefreshToken';

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

interface MIIntelTokenSecrets {
    accessToken: string;
    expiresAt?: number;
}

const normalizeUrl = (url: string): string => url.replace(/\/+$/, '');

/**
 * Resolve the base Copilot root URL.
 */
export const getCopilotRootUrl = (): string | undefined => {
    const isDevantDev = process.env.CLOUD_ENV === 'dev';
    const rootUrl = (
        isDevantDev
            ? process.env.COPILOT_DEV_ROOT_URL?.trim() || process.env.COPILOT_ROOT_URL?.trim()
            : process.env.COPILOT_ROOT_URL?.trim()
    );
    if (!rootUrl) {
        return undefined;
    }
    return normalizeUrl(rootUrl);
};

/**
 * Resolve LLM API base URL.
 * Prefers COPILOT_ROOT_URL-derived endpoint and falls back to legacy proxy env vars.
 */
export const getCopilotLlmApiBaseUrl = (): string | undefined => {
    const rootUrl = getCopilotRootUrl();
    if (rootUrl) {
        return `${rootUrl}/llm-api/v1.0/claude`;
    }

    return undefined;
};

/**
 * Resolve token exchange URL.
 * Prefers COPILOT_ROOT_URL-derived endpoint and falls back to explicit env vars.
 */
export const getCopilotTokenExchangeUrl = (): string | undefined => {
    const rootUrl = getCopilotRootUrl();
    if (rootUrl) {
        return `${rootUrl}/auth-api/v1.0/auth/token-exchange`;
    }

    const explicitExchangeUrl = process.env.DEVANT_TOKEN_EXCHANGE_URL?.trim()
        || process.env.MI_COPILOT_TOKEN_EXCHANGE_URL?.trim();
    if (explicitExchangeUrl) {
        return normalizeUrl(explicitExchangeUrl);
    }

    return undefined;
};

// ==================================
// Platform Extension (Devant) Auth Utils
// ==================================

/**
 * Check if the WSO2 Platform extension is installed.
 */
export const isPlatformExtensionAvailable = (): boolean => {
    return !!vscode.extensions.getExtension(PLATFORM_EXTENSION_ID);
};

const getPlatformExtensionAPI = async (): Promise<IWso2PlatformExtensionAPI | undefined> => {
    const platformExt = vscode.extensions.getExtension(PLATFORM_EXTENSION_ID);
    if (!platformExt) {
        return undefined;
    }

    try {
        return await platformExt.activate() as IWso2PlatformExtensionAPI;
    } catch (error) {
        logError('Failed to activate platform extension', error);
        return undefined;
    }
};

/**
 * Get STS token from the platform extension.
 */
export const getPlatformStsToken = async (): Promise<string | undefined> => {
    const api = await getPlatformExtensionAPI();
    if (!api) {
        return undefined;
    }

    try {
        return await api.getStsToken();
    } catch (error) {
        logError('Error getting STS token from platform extension', error);
        return undefined;
    }
};

/**
 * Check if user is logged into Devant via platform extension.
 */
export const isDevantUserLoggedIn = async (): Promise<boolean> => {
    const api = await getPlatformExtensionAPI();
    if (!api) {
        return false;
    }

    try {
        return api.isLoggedIn();
    } catch (error) {
        logError('Error checking Devant login status', error);
        return false;
    }
};

/**
 * Exchange STS token for MI Copilot token via token exchange endpoint.
 */
export const exchangeStsToCopilotToken = async (stsToken: string): Promise<MIIntelTokenSecrets> => {
    const tokenExchangeUrl = getCopilotTokenExchangeUrl();
    if (!tokenExchangeUrl) {
        throw new Error('Token exchange URL is not set. Configure COPILOT_ROOT_URL (or COPILOT_DEV_ROOT_URL when CLOUD_ENV=dev) or DEVANT_TOKEN_EXCHANGE_URL.');
    }

    try {
        const response = await axios.post(
            tokenExchangeUrl,
            { subjectToken: stsToken },
            {
                headers: { 'Content-Type': 'application/json' },
                validateStatus: () => true
            }
        );

        if (response.status === 200 || response.status === 201) {
            const { access_token, expires_in } = response.data ?? {};
            if (!access_token) {
                throw new Error('Token exchange response did not include access_token');
            }

            return {
                accessToken: access_token,
                expiresAt: typeof expires_in === 'number' ? Date.now() + (expires_in * 1000) : undefined,
            };
        }

        throw new Error(response.data?.message || response.data?.reason || `Status ${response.status}`);
    } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`MI Copilot authentication failed: ${reason}`);
    }
};

/**
 * Refresh the MI Copilot token using STS token from platform extension.
 */
export const refreshTokenViaStsExchange = async (): Promise<MIIntelTokenSecrets> => {
    const stsToken = await getPlatformStsToken();
    if (!stsToken) {
        throw new Error('Failed to get STS token from platform extension');
    }

    return await exchangeStsToCopilotToken(stsToken);
};

// ==================================
// Credential Storage (Core)
// ==================================

/**
 * Store authentication credentials in VSCode secrets.
 */
export const storeAuthCredentials = async (credentials: AuthCredentials): Promise<void> => {
    const credentialsJson = JSON.stringify(credentials);
    await extension.context.secrets.store(AUTH_CREDENTIALS_SECRET_KEY, credentialsJson);
};

/**
 * Retrieve authentication credentials from VSCode secrets.
 */
export const getAuthCredentials = async (): Promise<AuthCredentials | undefined> => {
    const credentialsJson = await extension.context.secrets.get(AUTH_CREDENTIALS_SECRET_KEY);
    if (!credentialsJson) {
        return undefined;
    }

    try {
        return JSON.parse(credentialsJson) as AuthCredentials;
    } catch (error) {
        logError('Error parsing auth credentials', error);
        return undefined;
    }
};

/**
 * Clear all authentication credentials.
 */
export const clearAuthCredentials = async (): Promise<void> => {
    await extension.context.secrets.delete(AUTH_CREDENTIALS_SECRET_KEY);
};

/**
 * Get the current login method.
 */
export const getLoginMethod = async (): Promise<LoginMethod | undefined> => {
    const credentials = await getAuthCredentials();
    return credentials?.loginMethod;
};

/**
 * Get access token/API key based on login method.
 * Automatically refreshes MI_INTEL token if close to expiry.
 */
export const getAccessToken = async (): Promise<string | undefined> => {
    const credentials = await getAuthCredentials();
    if (!credentials) {
        return undefined;
    }

    switch (credentials.loginMethod) {
        case LoginMethod.MI_INTEL: {
            const secrets = credentials.secrets as MIIntelTokenSecrets;
            if (!secrets.accessToken) {
                throw new Error(TOKEN_NOT_AVAILABLE_ERROR_MESSAGE);
            }

            if (secrets.expiresAt && (secrets.expiresAt - TOKEN_EXPIRY_BUFFER_MS) < Date.now()) {
                return await getRefreshedAccessToken();
            }

            return secrets.accessToken;
        }
        case LoginMethod.ANTHROPIC_KEY:
            return credentials.secrets.apiKey;
    }

    return undefined;
};

/**
 * Refresh MI_INTEL access token using STS re-exchange.
 */
export const getRefreshedAccessToken = async (): Promise<string> => {
    const credentials = await getAuthCredentials();
    if (!credentials || credentials.loginMethod !== LoginMethod.MI_INTEL) {
        throw new Error(TOKEN_REFRESH_ONLY_SUPPORTED_FOR_MI_INTEL);
    }

    const newSecrets = await refreshTokenViaStsExchange();

    const updatedCredentials: AuthCredentials = {
        loginMethod: LoginMethod.MI_INTEL,
        secrets: newSecrets
    };
    await storeAuthCredentials(updatedCredentials);

    return newSecrets.accessToken;
};

/**
 * Cleanup legacy tokens from old authentication system.
 */
export const cleanupLegacyTokens = async (): Promise<void> => {
    try {
        const legacyToken = await extension.context.secrets.get(LEGACY_ACCESS_TOKEN_SECRET_KEY);
        const legacyRefreshToken = await extension.context.secrets.get(LEGACY_REFRESH_TOKEN_SECRET_KEY);

        if (legacyToken || legacyRefreshToken) {
            await extension.context.secrets.delete(LEGACY_ACCESS_TOKEN_SECRET_KEY);
            await extension.context.secrets.delete(LEGACY_REFRESH_TOKEN_SECRET_KEY);
            logInfo('Legacy tokens cleaned up successfully.');
        }
    } catch (error) {
        logError('Error cleaning up legacy tokens', error);
    }
};

// ==================================
// High-Level Auth Operations
// ==================================

/**
 * Check if valid authentication credentials exist.
 * If not found but user is already logged in to Devant, bootstrap credentials via STS exchange.
 */
export const checkToken = async (): Promise<{ token: string; loginMethod: LoginMethod } | undefined> => {
    await cleanupLegacyTokens();

    let token: string | undefined;
    let loginMethod: LoginMethod | undefined;

    try {
        [token, loginMethod] = await Promise.all([
            getAccessToken(),
            getLoginMethod()
        ]);
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        if (reason !== TOKEN_NOT_AVAILABLE_ERROR_MESSAGE) {
            logWarn(`Failed to read local MI Copilot credentials. Falling back to Devant session bootstrap. ${reason}`);
        }
        token = undefined;
        loginMethod = undefined;
    }

    if (token && loginMethod) {
        return { token, loginMethod };
    }

    if (!isPlatformExtensionAvailable()) {
        return undefined;
    }

    const isLoggedIn = await isDevantUserLoggedIn();
    if (!isLoggedIn) {
        return undefined;
    }

    const stsToken = await getPlatformStsToken();
    if (!stsToken) {
        return undefined;
    }

    const secrets = await exchangeStsToCopilotToken(stsToken);
    await storeAuthCredentials({
        loginMethod: LoginMethod.MI_INTEL,
        secrets
    });

    return {
        token: secrets.accessToken,
        loginMethod: LoginMethod.MI_INTEL
    };
};

/**
 * Initiate Devant login via platform extension command.
 */
export async function initiateDevantAuth(): Promise<boolean> {
    if (!isPlatformExtensionAvailable()) {
        throw new Error('The WSO2 Platform extension is not installed. Please install it to use MI Copilot login.');
    }

    await vscode.commands.executeCommand(PlatformExtCommandIds.SignIn);
    return true;
}

/**
 * Backward compatible login entry point.
 */
export async function initiateInbuiltAuth(): Promise<boolean> {
    return initiateDevantAuth();
}

/**
 * Validate Anthropic API key.
 */
export const validateApiKey = async (apiKey: string, loginMethod: LoginMethod): Promise<AIUserToken> => {
    if (loginMethod !== LoginMethod.ANTHROPIC_KEY) {
        throw new Error('This login method is not supported. Please use SSO login instead.');
    }

    // Validate format
    if (!apiKey || !apiKey.startsWith('sk-ant-') || apiKey.length < 20) {
        throw new Error('Please enter a valid Anthropic API key (format: sk-ant-...)');
    }

    try {
        logInfo('Validating Anthropic API key...');

        // Test the API key by making a minimal request
        const directAnthropic = createAnthropic({
            apiKey: apiKey,
            baseURL: 'https://api.anthropic.com/v1'
        });

        await generateText({
            model: directAnthropic(DEFAULT_ANTHROPIC_MODEL),
            maxOutputTokens: 1,
            messages: [{ role: 'user', content: 'Hi' }],
            maxRetries: 0, // Disable retries to prevent retry loops on quota errors (429)
        });

        logInfo('API key validated successfully');

        // Store credentials
        const credentials: AuthCredentials = {
            loginMethod: LoginMethod.ANTHROPIC_KEY,
            secrets: {
                apiKey: apiKey
            }
        };
        await storeAuthCredentials(credentials);

        return { token: apiKey };

    } catch (error) {
        logError('API key validation failed', error);

        const statusCode = typeof error === 'object'
            && error !== null
            && 'statusCode' in error
            && typeof (error as { statusCode?: unknown }).statusCode === 'number'
            ? (error as { statusCode: number }).statusCode
            : undefined;

        if (statusCode === 429) {
            throw new Error('Too many requests. Please wait a moment and try again.');
        }

        if (error instanceof Error) {
            if (error.message.includes('401') || error.message.includes('authentication')) {
                throw new Error('Invalid API key. Please check your key and try again.');
            } else if (error.message.includes('403')) {
                throw new Error('Your API key does not have access to Claude. Please check your Anthropic account.');
            } else if (error.message.includes('rate_limit')) {
                throw new Error('Too many requests. Please wait a moment and try again.');
            } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
                throw new Error('Connection failed. Please check your internet connection.');
            }
        }

        throw new Error('API key validation failed. Please ensure your key is valid and has access to Claude models.');
    }
};

/**
 * Logout and clear authentication credentials.
 * Devant session is managed by platform extension separately.
 */
export const logout = async (_isUserLogout: boolean = true): Promise<void> => {
    await clearAuthCredentials();
};

// ==================================
// Deprecated/Legacy Functions
// ==================================

/**
 * @deprecated Use getRefreshedAccessToken() instead.
 */
export async function refreshAuthCode(): Promise<string> {
    logWarn('refreshAuthCode() is deprecated. Use getRefreshedAccessToken() instead.');
    try {
        return await getRefreshedAccessToken();
    } catch (error) {
        logError('Token refresh failed', error);
        return '';
    }
}
