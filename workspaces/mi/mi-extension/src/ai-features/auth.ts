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
import { AIUserToken, AuthCredentials, LoginMethod, AwsBedrockSecrets } from '@wso2/mi-core';
import { extension } from '../MIExtensionContext';
import * as vscode from 'vscode';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createBedrockAnthropic } from '@ai-sdk/amazon-bedrock/anthropic';
import { generateText } from 'ai';
import { WICommandIds, IWso2PlatformExtensionAPI } from '@wso2/wso2-platform-core';
import { logInfo, logWarn, logError } from './copilot/logger';
import { WI_EXTENSION_ID } from '../constants';
import { checkForWso2IntegratorExt } from '../extension';

export const TOKEN_NOT_AVAILABLE_ERROR_MESSAGE = 'Access token is not available.';
export const STS_TOKEN_NOT_AVAILABLE_ERROR_MESSAGE = 'Failed to get STS token from platform extension';
export const TOKEN_REFRESH_ONLY_SUPPORTED_FOR_MI_INTEL = 'Token refresh is only supported for MI Intelligence authentication';
export const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5';

// Credential storage key
const AUTH_CREDENTIALS_SECRET_KEY = 'MIAuthCredentials';
const EXPLICIT_LOGOUT_STATE_KEY = 'MIAuthExplicitLogout';

// Legacy keys (for migration)
const LEGACY_ACCESS_TOKEN_SECRET_KEY = 'MIAIUser';
const LEGACY_REFRESH_TOKEN_SECRET_KEY = 'MIAIRefreshToken';

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const PLATFORM_USER_NOT_LOGGED_IN_MESSAGE = 'user not logged in';
const STS_TOKEN_DEFAULT_RETRY_DELAY_MS = 500;
const STS_TOKEN_REFRESH_RETRY_COUNT = 6;
const STS_TOKEN_REFRESH_RETRY_DELAY_MS = 500;

interface MIIntelTokenSecrets {
    accessToken: string;
    expiresAt?: number;
}

interface StsTokenFetchOptions {
    retries?: number;
    retryDelayMs?: number;
}

const normalizeUrl = (url: string): string => url.replace(/\/+$/, '');
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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
 * Resolve usage API URL.
 */
export const getCopilotUsageApiUrl = (): string | undefined => {
    const rootUrl = getCopilotRootUrl();
    if (rootUrl) {
        return `${rootUrl}/llm-api/v1.0/usage`;
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
 * Check if the WSO2 Integrator extension is installed.
 */
export const isIntegratorExtensionAvailable = (): boolean => {
    return !!vscode.extensions.getExtension(WI_EXTENSION_ID);
};

export const getIntegratorExtensionAPI = async (): Promise<IWso2PlatformExtensionAPI | undefined> => {
    const integratorExt = vscode.extensions.getExtension(WI_EXTENSION_ID);
    if (!integratorExt) {
        return undefined;
    }

    try {
        if (!integratorExt.isActive) {
            await integratorExt.activate();
        }
        return integratorExt.exports?.cloudAPIs as IWso2PlatformExtensionAPI;
    } catch (error) {
        logError('Failed to activate WSO2 Integrator extension', error);
        return undefined;
    }
};

/**
 * Get STS token from the platform extension.
 */
const getPlatformStsTokenOnce = async (): Promise<string | undefined> => {
    const api = await getIntegratorExtensionAPI();
    if (!api) {
        return undefined;
    }

    try {
        if (!api.isLoggedIn()) {
            return undefined;
        }
        return await api.getStsToken();
    } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes(PLATFORM_USER_NOT_LOGGED_IN_MESSAGE)) {
            // Expected when platform session is not active.
            return undefined;
        }
        logError('Error getting STS token from platform extension', error);
        return undefined;
    }
};

/**
 * Get STS token from the platform extension with optional retries.
 */
export const getPlatformStsToken = async (options: StsTokenFetchOptions = {}): Promise<string | undefined> => {
    const retries = Math.max(0, options.retries ?? 0);
    const retryDelayMs = Math.max(0, options.retryDelayMs ?? STS_TOKEN_DEFAULT_RETRY_DELAY_MS);

    for (let attempt = 0; attempt <= retries; attempt++) {
        const stsToken = await getPlatformStsTokenOnce();
        if (stsToken) {
            return stsToken;
        }

        if (attempt < retries) {
            await sleep(retryDelayMs);
        }
    }

    return undefined;
};

/**
 * Check if user is logged into Devant via platform extension.
 */
export const isDevantUserLoggedIn = async (): Promise<boolean> => {
    const api = await getIntegratorExtensionAPI();
    if (!api) {
        return false;
    }

    try {
        return api.isLoggedIn();
    } catch (error) {
        logError('Error checking WSO2 Integrator login status', error);
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
            const expiresInSeconds = typeof expires_in === 'number'
                ? expires_in
                : Number(expires_in);

            return {
                accessToken: access_token,
                expiresAt: Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
                    ? Date.now() + (expiresInSeconds * 1000)
                    : undefined,
            };
        }

        throw new Error(response.data?.message || response.data?.reason || `Status ${response.status}`);
    } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`WSO2 Integrator Copilot authentication failed: ${reason}`);
    }
};

/**
 * Refresh the MI Copilot token using STS token from platform extension.
 */
export const refreshTokenViaStsExchange = async (): Promise<MIIntelTokenSecrets> => {
    const stsToken = await getPlatformStsToken({
        retries: STS_TOKEN_REFRESH_RETRY_COUNT,
        retryDelayMs: STS_TOKEN_REFRESH_RETRY_DELAY_MS,
    });
    if (!stsToken) {
        throw new Error(STS_TOKEN_NOT_AVAILABLE_ERROR_MESSAGE);
    }

    return await exchangeStsToCopilotToken(stsToken);
};

export const isStsTokenUnavailableError = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
        return false;
    }

    return error.message.includes(STS_TOKEN_NOT_AVAILABLE_ERROR_MESSAGE);
};

// ==================================
// Credential Storage (Core)
// ==================================

export const hasExplicitLogoutState = (): boolean => {
    return extension.context.globalState.get<boolean>(EXPLICIT_LOGOUT_STATE_KEY, false);
};

const setExplicitLogoutState = async (): Promise<void> => {
    await extension.context.globalState.update(EXPLICIT_LOGOUT_STATE_KEY, true);
};

const clearExplicitLogoutState = async (): Promise<void> => {
    await extension.context.globalState.update(EXPLICIT_LOGOUT_STATE_KEY, undefined);
};

/**
 * Store authentication credentials in VSCode secrets.
 */
export const storeAuthCredentials = async (credentials: AuthCredentials): Promise<void> => {
    const credentialsJson = JSON.stringify(credentials);
    await extension.context.secrets.store(AUTH_CREDENTIALS_SECRET_KEY, credentialsJson);
    await clearExplicitLogoutState();
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

            if (!secrets.expiresAt || (secrets.expiresAt - TOKEN_EXPIRY_BUFFER_MS) < Date.now()) {
                return await getRefreshedAccessToken();
            }

            return secrets.accessToken;
        }
        case LoginMethod.ANTHROPIC_KEY:
            return credentials.secrets.apiKey;
        case LoginMethod.AWS_BEDROCK: {
            const secrets = credentials.secrets as AwsBedrockSecrets;
            return secrets.authType === 'api_key' ? secrets.apiKey : secrets.accessKeyId;
        }
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
 * If not found but user is already logged in to Devant, bootstrap credentials via STS exchange unless the user explicitly logged out.
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

    if (hasExplicitLogoutState()) {
        return undefined;
    }

    if (!isIntegratorExtensionAvailable()) {
        return undefined;
    }

    const isLoggedIn = await isDevantUserLoggedIn();
    if (!isLoggedIn) {
        return undefined;
    }

    const stsToken = await getPlatformStsToken({
        retries: STS_TOKEN_REFRESH_RETRY_COUNT,
        retryDelayMs: STS_TOKEN_REFRESH_RETRY_DELAY_MS,
    });
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
    if (!checkForWso2IntegratorExt()) {
        throw new Error('The WSO2 Integrator extension is not installed. Please install it to use WSO2 Integrator Copilot.');
    }

    await vscode.commands.executeCommand(WICommandIds.SignIn);
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

interface AwsBedrockValidationInput {
    authType?: 'iam' | 'api_key';
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    sessionToken?: string;
    apiKey?: string;
    /** Optional Tavily key bundled with Bedrock credentials so users can opt into web tools. */
    tavilyApiKey?: string;
}

const validateBedrockRegion = (region: string): void => {
    if (!region) {
        throw new Error('AWS region is required.');
    }

    if (!/^[a-z]{2}(?:-gov)?-[a-z]+-\d+$/.test(region)) {
        throw new Error('Invalid AWS region. Please enter a region like us-east-1 or us-west-2.');
    }

    // The `global.` Bedrock inference profile (used by getBedrockValidationModelId
    // / getBedrockRegionalPrefix in connection.ts) is only published in the
    // commercial AWS partition. GovCloud (`us-gov-*`) and China (`cn-*`) regions
    // would silently fail at runtime with "model not found", so reject up front.
    if (region.startsWith('us-gov-') || region.startsWith('cn-')) {
        throw new Error(
            `AWS region "${region}" is not supported. The Anthropic models on Bedrock ` +
            `(Haiku 4.5, Sonnet 4.6, Opus 4.7) are only available via the global. ` +
            `inference profile in the commercial AWS partition — GovCloud and China ` +
            `partitions are not supported. Use a commercial region like us-east-1 or eu-west-1.`
        );
    }
};

const getBedrockValidationModelId = async (region: string): Promise<string> => {
    const { getBedrockValidationModelId: resolveValidationModelId } = await import('./connection');
    return resolveValidationModelId(region);
};

/**
 * Validate AWS Bedrock credentials by making a minimal test API call.
 */
export const validateAwsCredentials = async (credentials: AwsBedrockValidationInput): Promise<AIUserToken> => {
    const authType = credentials.authType === 'api_key' ? 'api_key' : 'iam';
    const region = credentials.region?.trim() ?? '';
    const tavilyApiKey = credentials.tavilyApiKey?.trim() || undefined;

    validateBedrockRegion(region);

    try {
        logInfo(`Validating AWS Bedrock ${authType === 'api_key' ? 'API key' : 'IAM credentials'}...`);

        if (authType === 'api_key') {
            const apiKey = credentials.apiKey?.trim() ?? '';
            if (!apiKey) {
                throw new Error('Amazon Bedrock API key is required.');
            }

            const bedrock = createBedrockAnthropic({
                region,
                apiKey,
            });
            const bedrockClient = bedrock(await getBedrockValidationModelId(region));

            await generateText({
                model: bedrockClient,
                maxOutputTokens: 1,
                messages: [{ role: 'user', content: 'Hi' }]
            });

            const authCredentials: AuthCredentials = {
                loginMethod: LoginMethod.AWS_BEDROCK,
                secrets: {
                    authType: 'api_key',
                    apiKey,
                    region,
                    tavilyApiKey,
                }
            };
            await storeAuthCredentials(authCredentials);

            logInfo('AWS Bedrock API key validated successfully');
            return { token: apiKey };
        }

        const accessKeyId = credentials.accessKeyId?.trim() ?? '';
        const secretAccessKey = credentials.secretAccessKey?.trim() ?? '';
        const sessionToken = credentials.sessionToken?.trim() || undefined;

        if (!accessKeyId || !secretAccessKey) {
            throw new Error('AWS access key ID and secret access key are required.');
        }

        if (!accessKeyId.startsWith('AKIA') && !accessKeyId.startsWith('ASIA')) {
            throw new Error('Please enter a valid AWS access key ID.');
        }

        if (secretAccessKey.length < 20) {
            throw new Error('Please enter a valid AWS secret access key.');
        }

        const bedrock = createBedrockAnthropic({
            region,
            accessKeyId,
            secretAccessKey,
            sessionToken,
        });
        const bedrockClient = bedrock(await getBedrockValidationModelId(region));

        await generateText({
            model: bedrockClient,
            maxOutputTokens: 1,
            messages: [{ role: 'user', content: 'Hi' }]
        });

        const authCredentials: AuthCredentials = {
            loginMethod: LoginMethod.AWS_BEDROCK,
            secrets: {
                authType: 'iam',
                accessKeyId,
                secretAccessKey,
                region,
                sessionToken,
                tavilyApiKey,
            }
        };
        await storeAuthCredentials(authCredentials);

        logInfo('AWS Bedrock IAM credentials validated successfully');
        return { token: accessKeyId };

    } catch (error) {
        logError('AWS Bedrock credential validation failed', error);
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Validation failed. Please check your AWS Bedrock authentication details and model access. (${detail})`);
    }
};

/**
 * Get stored AWS Bedrock credentials.
 */
export const getAwsBedrockCredentials = async (): Promise<AwsBedrockSecrets | undefined> => {
    const credentials = await getAuthCredentials();
    if (!credentials || credentials.loginMethod !== LoginMethod.AWS_BEDROCK) {
        return undefined;
    }
    return credentials.secrets;
};

/**
 * Read the Tavily API key bundled with Bedrock credentials, if any.
 * Returns undefined for non-Bedrock auth methods or when the key is unset.
 */
export const getTavilyApiKey = async (): Promise<string | undefined> => {
    const secrets = await getAwsBedrockCredentials();
    return secrets?.tavilyApiKey?.trim() || undefined;
};

/**
 * Update the Tavily API key on the stored Bedrock credentials.
 * Pass undefined or empty string to clear it.
 *
 * Throws if no Bedrock credentials are stored — Tavily is currently a Bedrock-only opt-in.
 */
export const setTavilyApiKey = async (apiKey: string | undefined): Promise<void> => {
    const credentials = await getAuthCredentials();
    if (!credentials || credentials.loginMethod !== LoginMethod.AWS_BEDROCK) {
        throw new Error('Tavily API key is only configurable when signed in via AWS Bedrock.');
    }
    const trimmed = apiKey?.trim() || undefined;
    const updated: AuthCredentials = {
        loginMethod: LoginMethod.AWS_BEDROCK,
        secrets: {
            ...credentials.secrets,
            tavilyApiKey: trimmed,
        } as AwsBedrockSecrets,
    };
    await storeAuthCredentials(updated);
};

/**
 * Logout and clear only MI Copilot authentication credentials.
 * The WSO2 platform session is owned by the platform extension and is intentionally left untouched.
 */
export const logout = async (isUserLogout: boolean = true): Promise<void> => {
    await clearAuthCredentials();
    if (isUserLogout) {
        await setExplicitLogoutState();
    }
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
