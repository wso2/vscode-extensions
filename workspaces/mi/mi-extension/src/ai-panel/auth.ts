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
 * - OAuth/SSO flow (MI_INTEL login method)
 * - API key validation (ANTHROPIC_KEY login method)
 * - Token refresh
 * - Login/Logout operations
 */

import axios from 'axios';
import { StateMachineAI } from './aiMachine';
import { AI_EVENT_TYPE, AIUserToken, AuthCredentials, LoginMethod } from '@wso2/mi-core';
import { extension } from '../MIExtensionContext';
import * as vscode from 'vscode';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

// ==================================
// Configuration
// ==================================
const config = vscode.workspace.getConfiguration('MI');
const AUTH_ORG = process.env.MI_AUTH_ORG || config.get('authOrg') as string;
const AUTH_CLIENT_ID = process.env.MI_AUTH_CLIENT_ID || config.get('authClientID') as string;
const MI_AUTH_REDIRECT_URL = process.env.MI_AUTH_REDIRECT_URL || config.get('authRedirectURL') as string;

const CommonReqHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=utf8',
    'Accept': 'application/json'
};

// Credential storage key
const AUTH_CREDENTIALS_SECRET_KEY = 'MIAuthCredentials';

// Legacy keys (for migration)
const LEGACY_ACCESS_TOKEN_SECRET_KEY = 'MIAIUser';
const LEGACY_REFRESH_TOKEN_SECRET_KEY = 'MIAIRefreshToken';

// ==================================
// Credential Storage (Core)
// ==================================

/**
 * Store authentication credentials in VSCode secrets
 */
export const storeAuthCredentials = async (credentials: AuthCredentials): Promise<void> => {
    const credentialsJson = JSON.stringify(credentials);
    await extension.context.secrets.store(AUTH_CREDENTIALS_SECRET_KEY, credentialsJson);
};

/**
 * Retrieve authentication credentials from VSCode secrets
 */
export const getAuthCredentials = async (): Promise<AuthCredentials | undefined> => {
    const credentialsJson = await extension.context.secrets.get(AUTH_CREDENTIALS_SECRET_KEY);
    if (!credentialsJson) {
        return undefined;
    }

    try {
        return JSON.parse(credentialsJson) as AuthCredentials;
    } catch (error) {
        console.error('Error parsing auth credentials:', error);
        return undefined;
    }
};

/**
 * Clear all authentication credentials
 */
export const clearAuthCredentials = async (): Promise<void> => {
    await extension.context.secrets.delete(AUTH_CREDENTIALS_SECRET_KEY);
};

/**
 * Get the current login method
 */
export const getLoginMethod = async (): Promise<LoginMethod | undefined> => {
    const credentials = await getAuthCredentials();
    return credentials?.loginMethod;
};

/**
 * Get access token/API key based on login method
 * Automatically refreshes MI_INTEL tokens if expired
 */
export const getAccessToken = async (): Promise<string | undefined> => {
    return new Promise(async (resolve, reject) => {
        try {
            const credentials = await getAuthCredentials();

            if (!credentials) {
                resolve(undefined);
                return;
            }

            switch (credentials.loginMethod) {
                case LoginMethod.MI_INTEL:
                    try {
                        const { accessToken } = credentials.secrets;
                        let finalToken = accessToken;

                        // Decode token and check expiration
                        const decoded = jwtDecode<JwtPayload>(accessToken);
                        const now = Math.floor(Date.now() / 1000);
                        if (decoded.exp && decoded.exp < now) {
                            finalToken = await getRefreshedAccessToken();
                        }
                        resolve(finalToken);
                        return;
                    } catch (err) {
                        if (axios.isAxiosError(err)) {
                            const status = err.response?.status;
                            if (status === 400) {
                                reject(new Error("TOKEN_EXPIRED"));
                                return;
                            }
                        }
                        reject(err);
                        return;
                    }

                case LoginMethod.ANTHROPIC_KEY:
                    resolve(credentials.secrets.apiKey);
                    return;
            }
        } catch (error: any) {
            reject(error);
        }
    });
};

/**
 * Refresh MI_INTEL access token using refresh token
 */
export const getRefreshedAccessToken = async (): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        try {
            const credentials = await getAuthCredentials();
            if (!credentials || credentials.loginMethod !== LoginMethod.MI_INTEL) {
                reject(new Error('Token refresh is only supported for MI Intelligence authentication'));
                return;
            }

            const { refreshToken } = credentials.secrets;
            if (!refreshToken) {
                reject(new Error('Refresh token is not available'));
                return;
            }

            const params = new URLSearchParams({
                client_id: AUTH_CLIENT_ID,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
                scope: 'openid email'
            });

            const response = await axios.post(
                `https://api.asgardeo.io/t/${AUTH_ORG}/oauth2/token`,
                params.toString(),
                { headers: CommonReqHeaders }
            );

            const newAccessToken = response.data.access_token;
            const newRefreshToken = response.data.refresh_token;

            // Update stored credentials
            const updatedCredentials: AuthCredentials = {
                ...credentials,
                secrets: {
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken
                }
            };
            await storeAuthCredentials(updatedCredentials);

            resolve(newAccessToken);
        } catch (error: any) {
            reject(error);
        }
    });
};

/**
 * Cleanup legacy tokens from old authentication system
 */
export const cleanupLegacyTokens = async (): Promise<void> => {
    try {
        const legacyToken = await extension.context.secrets.get(LEGACY_ACCESS_TOKEN_SECRET_KEY);
        const legacyRefreshToken = await extension.context.secrets.get(LEGACY_REFRESH_TOKEN_SECRET_KEY);

        if (legacyToken || legacyRefreshToken) {
            await extension.context.secrets.delete(LEGACY_ACCESS_TOKEN_SECRET_KEY);
            await extension.context.secrets.delete(LEGACY_REFRESH_TOKEN_SECRET_KEY);
            console.log('Legacy tokens cleaned up successfully.');
        }
    } catch (error) {
        console.error('Error cleaning up legacy tokens:', error);
    }
};

// ==================================
// OAuth/SSO Functions (MI_INTEL)
// ==================================

/**
 * Generate OAuth authorization URL
 */
export async function getAuthUrl(callbackUri: string): Promise<string> {
    const state = encodeURIComponent(btoa(JSON.stringify({ callbackUri })));
    return `https://api.asgardeo.io/t/${AUTH_ORG}/oauth2/authorize?response_type=code&redirect_uri=${MI_AUTH_REDIRECT_URL}&client_id=${AUTH_CLIENT_ID}&scope=openid%20email&state=${state}`;
}

/**
 * Get logout URL for Asgardeo
 */
export function getLogoutUrl(): string {
    return `https://api.asgardeo.io/t/${AUTH_ORG}/oidc/logout`;
}

/**
 * Exchange OAuth authorization code for access and refresh tokens
 */
export async function exchangeAuthCode(authCode: string): Promise<void> {
    if (!authCode) {
        throw new Error("Auth code is not provided.");
    }

    try {
        console.log("Exchanging auth code for tokens...");
        
        const params = new URLSearchParams({
            client_id: AUTH_CLIENT_ID,
            code: authCode,
            grant_type: 'authorization_code',
            redirect_uri: MI_AUTH_REDIRECT_URL,
            scope: 'openid email'
        });

        const response = await axios.post(
            `https://api.asgardeo.io/t/${AUTH_ORG}/oauth2/token`,
            params.toString(),
            { headers: CommonReqHeaders }
        );

        const accessToken = response.data.access_token;
        const refreshToken = response.data.refresh_token;

        console.log("Tokens obtained successfully");

        // Store credentials
        const credentials: AuthCredentials = {
            loginMethod: LoginMethod.MI_INTEL,
            secrets: {
                accessToken: accessToken,
                refreshToken: refreshToken
            }
        };
        await storeAuthCredentials(credentials);

        // Notify state machine
        StateMachineAI.sendEvent(AI_EVENT_TYPE.SIGN_IN_SUCCESS);
    } catch (error: any) {
        const errMsg = "Error while signing in to MI AI! " + error?.message;
        throw new Error(errMsg);
    }
}

// ==================================
// High-Level Auth Operations
// ==================================

/**
 * Check if valid authentication credentials exist
 */
export const checkToken = async (): Promise<{ token: string; loginMethod: LoginMethod } | undefined> => {
    return new Promise(async (resolve, reject) => {
        try {
            // Clean up any legacy tokens
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

/**
 * Initiate OAuth/SSO login flow (MI_INTEL)
 */
export async function initiateInbuiltAuth(): Promise<boolean> {
    const callbackUri = await vscode.env.asExternalUri(
        vscode.Uri.parse(`${vscode.env.uriScheme}://wso2.micro-integrator/signin`)
    );
    const oauthURL = await getAuthUrl(callbackUri.toString());
    return vscode.env.openExternal(vscode.Uri.parse(oauthURL));
}

/**
 * Validate Anthropic API key
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
        console.log('Validating Anthropic API key...');
        
        // Test the API key by making a minimal request
        const directAnthropic = createAnthropic({
            apiKey: apiKey,
            baseURL: 'https://api.anthropic.com/v1'
        });

        await generateText({
            model: directAnthropic('claude-3-5-haiku-20241022'),
            maxOutputTokens: 1,
            messages: [{ role: 'user', content: 'Hi' }]
        });

        console.log('API key validated successfully');

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
            } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
                throw new Error('Connection failed. Please check your internet connection.');
            }
        }
        
        throw new Error('API key validation failed. Please ensure your key is valid and has access to Claude models.');
    }
};

/**
 * Logout and clear authentication credentials
 */
export const logout = async (isUserLogout: boolean = true): Promise<void> => {
    // For user-initiated logout, invalidate the session on the server (MI_INTEL only)
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

// ==================================
// Deprecated/Legacy Functions
// ==================================

/**
 * @deprecated Use getRefreshedAccessToken() instead
 */
export async function refreshAuthCode(): Promise<string> {
    console.warn('refreshAuthCode() is deprecated. Use getRefreshedAccessToken() instead.');
    try {
        return await getRefreshedAccessToken();
    } catch (error) {
        console.error('Token refresh failed:', error);
        return "";
    }
}
