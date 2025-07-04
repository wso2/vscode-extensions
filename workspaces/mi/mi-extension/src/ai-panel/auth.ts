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

import axios from 'axios';
import { StateMachineAI } from './aiMachine';
import { AI_EVENT_TYPE, AIUserTokens } from '@wso2/mi-core';
import { extension } from '../MIExtensionContext';
import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { MiDiagramRpcManager } from '../rpc-managers/mi-diagram/rpc-manager';

export interface AccessToken {
    accessToken: string;
    expirationTime?: number;
    loginTime: string;
    refreshToken?: string;
}

const CommonReqHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=utf8',
    'Accept': 'application/json'
};

const config = vscode.workspace.getConfiguration('MI');
const AUTH_ORG = process.env.MI_AUTH_ORG || config.get('authOrg') as string;
const AUTH_CLIENT_ID = process.env.MI_AUTH_CLIENT_ID || config.get('authClientID') as string;
const MI_AUTH_REDIRECT_URL = process.env.MI_AUTH_REDIRECT_URL || config.get('authRedirectURL') as string;

export async function getAuthUrl(callbackUri: string): Promise<string> {

    // return `${this._config.loginUrl}?profile=vs-code&client_id=${this._config.clientId}`
    //     + `&state=${stateBase64}&code_challenge=${this._challenge.code_challenge}`;

    const state = encodeURIComponent(btoa(JSON.stringify({ callbackUri: 'vscode://wso2.micro-integrator/signin' })));
    return `https://api.asgardeo.io/t/${AUTH_ORG}/oauth2/authorize?response_type=code&redirect_uri=${MI_AUTH_REDIRECT_URL}&client_id=${AUTH_CLIENT_ID}&scope=openid%20email&state=${state}`;
}

export async function exchangeAuthCodeNew(authCode: string): Promise<AccessToken> {
    const params = new URLSearchParams({
        client_id: AUTH_CLIENT_ID,
        code: authCode,
        grant_type: 'authorization_code',
        // redirect_uri: 'vscode://wso2.micro-integrator/signin',
        redirect_uri: MI_AUTH_REDIRECT_URL,
        scope: 'openid email'
    });
    try {
        const response = await axios.post(`https://api.asgardeo.io/t/${AUTH_ORG}/oauth2/token`, params.toString(), { headers: CommonReqHeaders });
        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token,
            loginTime: new Date().toISOString(),
            expirationTime: response.data.expires_in
        };
    } catch (err) {
        throw new Error(`Error while exchanging auth code to token: ${err}`);
    }
}


export async function exchangeAuthCode(authCode: string) {
    if (!authCode) {
        throw new Error("Auth code is not provided.");
    } else {
        try {
            console.log("Exchanging auth code to token...");
            const response = await exchangeAuthCodeNew(authCode);
            console.log("Access token: " + response.accessToken);
            console.log("Refresh token: " + response.refreshToken);
            console.log("Login time: " + response.loginTime);
            console.log("Expiration time: " + response.expirationTime);
            await extension.context.secrets.store('MIAIUser', response.accessToken);
            await extension.context.secrets.store('MIAIRefreshToken', response.refreshToken ?? '');

            // TODO: This is a temporary fix to get the backend root url. Once multiple workspace support is added, this should be removed.
            const rpcManager = new MiDiagramRpcManager(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "");
            const backendRootUrlResponse = await rpcManager.getBackendRootUrl();
            const url = backendRootUrlResponse.url + '/user/usage';
            
            const fetch_response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${response.accessToken}`,
                },
            });

            if(fetch_response.ok) {
                const responseBody = await fetch_response.json() as AIUserTokens | undefined;
                const context = StateMachineAI.context();
                context.userTokens = responseBody;
            }else{
                throw new Error(`Error while checking token usage: ${fetch_response.statusText}`);
            }

            StateMachineAI.sendEvent(AI_EVENT_TYPE.SIGN_IN_SUCCESS);
        } catch (error: any) {
            const errMsg = "Error while signing in to MI AI! " + error?.message;
            throw new Error(errMsg);
        }
    }
}

export async function refreshAuthCode(): Promise<string>{
    const refresh_token = await extension.context.secrets.get('MIAIRefreshToken');
    if (!refresh_token) {
        throw new Error("Refresh token is not available.");
    } else {
        try {
            console.log("Refreshing token...");
            const params = new URLSearchParams({
                client_id: AUTH_CLIENT_ID,
                refresh_token: refresh_token,
                grant_type: 'refresh_token',
                scope: 'openid email'
            });
            const response = await axios.post(`https://api.asgardeo.io/t/${AUTH_ORG}/oauth2/token`, params.toString(), { headers: CommonReqHeaders });
            const newAccessToken = response.data.access_token;
            const newRefreshToken = response.data.refresh_token;
            await extension.context.secrets.store('MIAIUser', newAccessToken);
            await extension.context.secrets.store('MIAIRefreshToken', newRefreshToken);
            console.log("Token refreshed successfully!");
            return newAccessToken;
        } catch (error: any) {
            const errMsg = "Error while refreshing token! " + error?.message;
            console.error(errMsg);
            return "";
        }
    }
}
