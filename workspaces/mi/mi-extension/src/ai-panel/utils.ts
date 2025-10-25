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
import { AIUserToken, LoginMethod, AuthCredentials } from '@wso2/mi-core';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { getAuthUrl, getLogoutUrl } from './auth';
import { extension } from '../MIExtensionContext';
import { getAccessToken, clearAuthCredentials, storeAuthCredentials, getLoginMethod, cleanupLegacyTokens } from './utils/auth';

export const checkToken = async (): Promise<{ token: string; loginMethod: LoginMethod } | undefined> => {
    return new Promise(async (resolve, reject) => {
        try {
            // Clean up any legacy tokens on initialization
            await cleanupLegacyTokens();

            const token = await getAccessToken();
            const loginMethod = await getLoginMethod();
            if (!token || !loginMethod) {
                resolve(undefined);
                return;
            }
            resolve({ token, loginMethod });
        } catch (error) {
            reject(error);
        }
    });
};

export const logout = async (isUserLogout: boolean = true) => {
    // For user-initiated logout, invalidate the session on the server
    if (isUserLogout) {
        try {
            const tokenData = await checkToken();
            if (tokenData?.token && tokenData.loginMethod === LoginMethod.MI_INTEL) {
                // Send logout request to Asgardeo to invalidate the session
                const logoutURL = getLogoutUrl();
                await fetch(logoutURL, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${tokenData.token}`
                    }
                }).catch(err => {
                    // Ignore errors - we'll clear local credentials anyway
                    console.log('Logout request to server failed (non-critical):', err);
                });
            }
        } catch (error) {
            // Ignore errors during token check
            console.log('Error during logout token check (non-critical):', error);
        }
    }

    // Always clear stored credentials locally
    await clearAuthCredentials();
};

export async function initiateInbuiltAuth() {
    const callbackUri = await vscode.env.asExternalUri(
        vscode.Uri.parse(`${vscode.env.uriScheme}://wso2.micro-integrator/signin`)
    );
    const oauthURL = await getAuthUrl(callbackUri.toString());
    return vscode.env.openExternal(vscode.Uri.parse(oauthURL));
}

export const validateApiKey = async (apiKey: string, loginMethod: LoginMethod): Promise<AIUserToken> => {
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
            model: directAnthropic('claude-3-5-haiku-20241022'),
            maxOutputTokens: 1,
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

        return { token: apiKey };

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


