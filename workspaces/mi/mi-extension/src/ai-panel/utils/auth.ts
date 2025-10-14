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
import { extension } from "../../MIExtensionContext";
import axios from 'axios';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { AuthCredentials, LoginMethod } from '@wso2/mi-core';

const config = vscode.workspace.getConfiguration('MI');
const AUTH_ORG = process.env.MI_AUTH_ORG || config.get('authOrg') as string;
const AUTH_CLIENT_ID = process.env.MI_AUTH_CLIENT_ID || config.get('authClientID') as string;

export const REFRESH_TOKEN_NOT_AVAILABLE_ERROR_MESSAGE = "Refresh token is not available.";
export const TOKEN_REFRESH_ONLY_SUPPORTED_FOR_MI_INTEL = "Token refresh is only supported for MI Intelligence authentication";
export const AUTH_CREDENTIALS_SECRET_KEY = 'MIAuthCredentials';

// Legacy keys for migration
const LEGACY_ACCESS_TOKEN_SECRET_KEY = 'MIAIUser';
const LEGACY_REFRESH_TOKEN_SECRET_KEY = 'MIAIRefreshToken';

// ==================================
// Structured Auth Credentials Utils
// ==================================
export const storeAuthCredentials = async (credentials: AuthCredentials): Promise<void> => {
    const credentialsJson = JSON.stringify(credentials);
    await extension.context.secrets.store(AUTH_CREDENTIALS_SECRET_KEY, credentialsJson);
};

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

export const clearAuthCredentials = async (): Promise<void> => {
    await extension.context.secrets.delete(AUTH_CREDENTIALS_SECRET_KEY);
};

// ==================================
// MI Copilot Auth Utils
// ==================================
export const getLoginMethod = async (): Promise<LoginMethod | undefined> => {
    const credentials = await getAuthCredentials();
    if (credentials) {
        return credentials.loginMethod;
    }
    return undefined;
};

export const getAccessToken = async (): Promise<string | undefined> => {
    return new Promise(async (resolve, reject) => {
        try {
            const credentials = await getAuthCredentials();

            if (credentials) {
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

                    default:
                        const { loginMethod }: AuthCredentials = credentials;
                        reject(new Error(`Unsupported login method: ${loginMethod}`));
                        return;

                }
            }
            resolve(undefined);
        } catch (error: any) {
            reject(error);
        }
    });
};

export const getRefreshedAccessToken = async (): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const CommonReqHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf8',
            'Accept': 'application/json'
        };

        try {
            const credentials = await getAuthCredentials();
            if (!credentials || credentials.loginMethod !== LoginMethod.MI_INTEL) {
                throw new Error(TOKEN_REFRESH_ONLY_SUPPORTED_FOR_MI_INTEL);
            }

            const { refreshToken } = credentials.secrets;
            if (!refreshToken) {
                reject(new Error(REFRESH_TOKEN_NOT_AVAILABLE_ERROR_MESSAGE));
                return;
            }

            const params = new URLSearchParams({
                client_id: AUTH_CLIENT_ID,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
                scope: 'openid email'
            });

            const response = await axios.post(`https://api.asgardeo.io/t/${AUTH_ORG}/oauth2/token`, params.toString(), { headers: CommonReqHeaders });

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

