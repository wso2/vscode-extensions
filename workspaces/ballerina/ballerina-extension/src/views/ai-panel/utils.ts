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
import { LoginMethod, AuthCredentials, DevantEnvSecrets } from '@wso2/ballerina-core';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { getAuthUrl, getLogoutUrl } from './auth';
import { extension } from '../../BalExtensionContext';
import { getAccessToken, clearAuthCredentials, storeAuthCredentials, getAuthCredentials } from '../../utils/ai/auth';
import { DEVANT_API_KEY, DEVANT_STS_TOKEN } from '../../features/ai/utils';

const LEGACY_ACCESS_TOKEN_SECRET_KEY = 'BallerinaAIUser';
const LEGACY_REFRESH_TOKEN_SECRET_KEY = 'BallerinaAIRefreshToken';

export const checkToken = async (): Promise<{ token: string; loginMethod: LoginMethod } | undefined> => {
    return new Promise(async (resolve, reject) => {
        try {
            // Clean up any legacy tokens on initialization
            await cleanupLegacyTokens();

            // Priority 1: Check devant environment (highest priority)
            const devantCredentials = await checkDevantEnvironment();
            if (devantCredentials) {
                const secrets = devantCredentials.secrets as DevantEnvSecrets;
                resolve({ 
                    token: secrets.apiKey, 
                    loginMethod: LoginMethod.DEVANT_ENV 
                });
                return;
            }

            // Priority 2: Check stored credentials
            const result = await getAccessToken();
            if (!result) {
                resolve(undefined);
                return;
            }
            
            // Extract token based on login method
            let token: string;
            switch (result.loginMethod) {
                case LoginMethod.BI_INTEL:
                    token = result.secrets.accessToken;
                    break;
                case LoginMethod.ANTHROPIC_KEY:
                    token = result.secrets.apiKey;
                    break;
                case LoginMethod.DEVANT_ENV:
                    token = result.secrets.apiKey;
                    break;
                default:
                    reject(new Error(`Unsupported login method: ${result["loginMethod"]}`));
                    return;
            }
            
            resolve({ token, loginMethod: result.loginMethod });
        } catch (error) {
            reject(error);
        }
    });
};

const cleanupLegacyTokens = async (): Promise<void> => {
    try {
        const legacyToken = await extension.context.secrets.get(LEGACY_ACCESS_TOKEN_SECRET_KEY);
        const legacyRefreshToken = await extension.context.secrets.get(LEGACY_REFRESH_TOKEN_SECRET_KEY);

        if (legacyToken || legacyRefreshToken) {
            await extension.context.secrets.delete(LEGACY_ACCESS_TOKEN_SECRET_KEY);
            await extension.context.secrets.delete(LEGACY_REFRESH_TOKEN_SECRET_KEY);
        }
    } catch (error) {
        console.error('Error cleaning up legacy tokens:', error);
    }
};

export const logout = async (isUserLogout: boolean = true) => {
    // For user-initiated logout, check if we need to redirect to SSO logout
    if (isUserLogout) {
        const { token, loginMethod } = await checkToken();
        if (token && loginMethod === LoginMethod.BI_INTEL) {
            const logoutURL = getLogoutUrl();
            vscode.env.openExternal(vscode.Uri.parse(logoutURL));
        }
    }

    // Always clear stored credentials
    await clearAuthCredentials();
};

export async function initiateInbuiltAuth() {
    const callbackUri = await vscode.env.asExternalUri(
        vscode.Uri.parse(`${vscode.env.uriScheme}://wso2.ballerina/signin`)
    );
    const oauthURL = await getAuthUrl(callbackUri.toString());
    return vscode.env.openExternal(vscode.Uri.parse(oauthURL));
}

export const validateApiKey = async (apiKey: string, loginMethod: LoginMethod): Promise<AuthCredentials> => {
    if (loginMethod !== LoginMethod.ANTHROPIC_KEY) {
        throw new Error('This login method is not supported. Please use SSO login instead.');
    }

    if (!apiKey || !apiKey.startsWith('sk-') || apiKey.length < 20) {
        throw new Error('Please enter a valid Anthropic API key.');
    }

    try {
        const directAnthropic = createAnthropic({
            apiKey: apiKey,
            baseURL: 'https://api.anthropic.com/v1'
        });

        await generateText({
            model: directAnthropic('claude-3-haiku-20240307'),
            maxTokens: 1,
            messages: [{ role: 'user', content: 'Hi' }]
        });

        // Store credentials
        const credentials: AuthCredentials = {
            loginMethod: LoginMethod.ANTHROPIC_KEY,
            secrets: {
                apiKey: apiKey
            }
        };
        await storeAuthCredentials(credentials);

        return credentials;

    } catch (error) {
        console.error('API key validation failed:', error);
        if (error instanceof Error) {
            if (error.message.includes('401') || error.message.includes('authentication')) {
                throw new Error('Invalid API key. Please check your key and try again.');
            } else if (error.message.includes('403')) {
                throw new Error('Your API key does not have access to Claude. Please check your Anthropic account.');
            } else if (error.message.includes('rate_limit')) {
                throw new Error('Too many requests. Please wait a moment and try again.');
            }
            throw new Error('Connection failed. Please check your internet connection and ensure your API key is valid.');
        }
        throw new Error('Validation failed. Please try again.');
    }
};

export const checkDevantEnvironment = async (): Promise<AuthCredentials | undefined> => {
    // Check if both required devant environment variables are present and non-empty
    if (!DEVANT_API_KEY || !DEVANT_STS_TOKEN ||
        DEVANT_API_KEY.trim() === '' || DEVANT_STS_TOKEN.trim() === '') {
        return undefined;
    }

    // Return devant credentials without storing (always read from env)
    return {
        loginMethod: LoginMethod.DEVANT_ENV,
        secrets: {
            apiKey: DEVANT_API_KEY,
            stsToken: DEVANT_STS_TOKEN
        }
    };
};

export const getLoggedInAuthFlows = async (): Promise<LoginMethod[]> => {
    const loggedInFlows: LoginMethod[] = [];

    // Check if devant environment is available (highest priority)
    const devantCredentials = await checkDevantEnvironment();
    if (devantCredentials) {
        loggedInFlows.push(LoginMethod.DEVANT_ENV);
    }

    // Check if stored credentials exist
    const storedCredentials = await getAuthCredentials();
    if (storedCredentials) {
        // Add the stored flow if it's not already in the list
        if (!loggedInFlows.includes(storedCredentials.loginMethod)) {
            loggedInFlows.push(storedCredentials.loginMethod);
        }
    }

    return loggedInFlows;
};
