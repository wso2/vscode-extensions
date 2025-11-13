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

import * as fs from 'fs';
import * as path from 'path';
import { extensions } from 'vscode';
import { IWso2PlatformExtensionAPI } from "@wso2/wso2-platform-core";
import { extension } from '../BalExtensionContext';

/**
 * Checks if we're running in a cloud editor environment
 * @returns boolean - true if CLOUD_STS_TOKEN environment variable exists
 */
export function isCloudEditorEnvironment(): boolean {
    return !!process.env.CLOUD_STS_TOKEN;
}

/**
 * Reads the current access token from Settings.toml
 * @returns Promise<string | undefined> - The current access token or undefined if not found
 */
export async function getCurrentAccessToken(): Promise<string | undefined> {
    try {
        const settingsPath = path.join(extension.ballerinaExtInstance.getBallerinaUserHome(), 'Settings.toml');
        
        if (!fs.existsSync(settingsPath)) {
            return undefined;
        }

        const content = fs.readFileSync(settingsPath, 'utf8');
        const tokenMatch = content.match(/accesstoken\s*=\s*"([^"]*)"/);
        
        return tokenMatch ? tokenMatch[1] : undefined;
    } catch (error) {
        console.error('Failed to read current access token:', error);
        return undefined;
    }
}

/**
 * Checks if a JWT token is expired or about to expire (within 5 minutes)
 * @param token - The JWT token to check
 * @returns boolean - true if token is expired or about to expire
 */
export function isTokenExpiredOrExpiring(token: string): boolean {
    try {
        // JWT tokens have 3 parts separated by dots
        const parts = token.split('.');
        if (parts.length !== 3) {
            return true; // Not a valid JWT format
        }

        // Decode the payload (second part)
        const payload = JSON.parse(atob(parts[1]));
        
        if (!payload.exp) {
            return true; // No expiration time means we should refresh
        }

        // Check if token expires within 5 minutes (300 seconds)
        const currentTime = Math.floor(Date.now() / 1000);
        const expirationTime = payload.exp;
        const bufferTime = 300; // 5 minutes buffer
        
        return (expirationTime - currentTime) <= bufferTime;
		} catch (error) {
        console.warn('Failed to decode token, treating as expired:', error);
        return true; // If we can't decode it, treat as expired
    }
}

/**
 * Checks if the token needs to be updated based on current vs new token
 * @param currentToken - The token currently in Settings.toml
 * @param newToken - The new STS token from platform extension
 * @returns boolean - true if token needs updating
 */
export function shouldUpdateToken(currentToken: string | undefined, newToken: string): boolean {
    // No current token exists
    if (!currentToken) {
        return true;
    }

    // Tokens are different
    if (currentToken !== newToken) {
        return true;
    }

    // Current token is expired or expiring soon
    if (isTokenExpiredOrExpiring(currentToken)) {
        return true;
    }

    return false;
}

/**
 * Updates the Ballerina Settings.toml file with the provided STS token
 * @param stsToken - The STS token to set as accesstoken
 */
export async function updateBallerinaSettingsWithStsToken(stsToken: string): Promise<void> {
	try {
        const settingsPath = path.join(extension.ballerinaExtInstance.getBallerinaUserHome(), 'Settings.toml');
        
        if (!fs.existsSync(settingsPath)) {
            // Create the .ballerina directory if it doesn't exist
            const ballerinaDir = path.dirname(settingsPath);
            if (!fs.existsSync(ballerinaDir)) {
                fs.mkdirSync(ballerinaDir, { recursive: true });
            }
            
            // Create new Settings.toml with STS token
            const newContent = `[central]\naccesstoken="${stsToken}"\n`;
            fs.writeFileSync(settingsPath, newContent, 'utf8');
            return;
        }

        // Read existing Settings.toml
        let content = fs.readFileSync(settingsPath, 'utf8');
        
        // Check if [central] section exists
        if (content.includes('[central]')) {
            // Replace existing accesstoken
            content = content.replace(
                /accesstoken\s*=\s*"[^"]*"/g,
                `accesstoken="${stsToken}"`
            );
        } else {
            // Add [central] section with accesstoken
            content += `\n[central]\naccesstoken="${stsToken}"\n`;
        }
        
        // Write back to file
        fs.writeFileSync(settingsPath, content, 'utf8');
        console.log('Updated Settings.toml with STS token');
        
    } catch (error) {
        console.error('Failed to update Settings.toml with STS token:', error);
        throw error;
    }
}

/**
 * Retrieves the STS token from the platform extension for authenticated requests
 * @returns Promise<string | undefined> - The STS token if available, undefined otherwise
 */
export async function getDevantStsToken(): Promise<string | undefined> {
    try {
        // Try to get STS token from platform extension
        const platformExt = extensions.getExtension("wso2.wso2-platform");
        if (!platformExt) {
            return undefined;
        }

        // Check if extension is already active before activating
        if (!platformExt.isActive) {
            await platformExt.activate();
        }
        
        const platformExtAPI: IWso2PlatformExtensionAPI = platformExt.exports;
        
        const platformStsToken = await platformExtAPI.getStsToken();
        if (platformStsToken && platformStsToken.trim() !== "") {
            return platformStsToken;
        }
    } catch (error) {
        console.error("Failed to get STS token from platform extension:", error);
    }
    
    return undefined;
}
