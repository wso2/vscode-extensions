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
import * as vscode from 'vscode';
import { getAuthCredentials, getRefreshedAccessToken } from './auth';
import { getAnthropicProxyUrl } from './copilot/connection';
import { LoginMethod } from '@wso2/mi-core';

// Configuration keys
const SERVICE_URL_KEY = 'WSO2_AI_SERVICE_URL';
const ACCESS_TOKEN_KEY = 'WSO2_AI_ACCESS_TOKEN';

// File paths
const CONFIG_PROPERTIES_RELATIVE_PATH = ['src', 'main', 'wso2mi', 'resources', 'conf', 'config.properties'];
const ENV_FILE_NAME = '.env';

// Messages
const PROGRESS_MESSAGE = 'Configuring WSO2 default model provider...';
const SUCCESS_MESSAGE = 'WSO2 default model provider configuration was added to the project.';
const NO_PROJECT_MESSAGE = 'No MI project found in the workspace.';
const LOGIN_REQUIRED_MESSAGE = 'Please sign in to MI Intelligence to configure the WSO2 default model provider.';
const MI_INTEL_ONLY_MESSAGE = 'This feature is only available for MI Intelligence users.';
const SIGN_IN_BUTTON = 'Sign in to MI Copilot';

/**
 * Get the refreshed access token for the default model configuration.
 * Only works for MI_INTEL login method.
 */
export async function getTokenForDefaultModel(): Promise<string> {
    const credentials = await getAuthCredentials();

    if (!credentials) {
        throw new Error('No authentication credentials found.');
    }

    if (credentials.loginMethod !== LoginMethod.MI_INTEL) {
        throw new Error(MI_INTEL_ONLY_MESSAGE);
    }

    const token = await getRefreshedAccessToken();
    return token;
}

/**
 * Get the MI project path from the workspace.
 * Returns the first workspace folder that contains a pom.xml file.
 */
export function getMIProjectPath(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }

    for (const folder of workspaceFolders) {
        const pomPath = path.join(folder.uri.fsPath, 'pom.xml');
        if (fs.existsSync(pomPath)) {
            return folder.uri.fsPath;
        }
    }

    return undefined;
}

/**
 * Add or update an entry in a .env file.
 * Preserves existing entries and updates/adds the specified key.
 */
function addOrUpdateEnvEntry(filePath: string, key: string, value: string): void {
    let content = '';
    if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8');
    }

    const lines = content.split('\n');
    const keyIndex = lines.findIndex(line => line.startsWith(`${key}=`));

    if (keyIndex !== -1) {
        lines[keyIndex] = `${key}=${value}`;
    } else {
        // Add new entry, but avoid adding to an empty line at the end
        if (lines.length > 0 && lines[lines.length - 1].trim() === '') {
            lines[lines.length - 1] = `${key}=${value}`;
            lines.push('');
        } else {
            lines.push(`${key}=${value}`);
        }
    }

    // Clean up multiple empty lines at the end
    while (lines.length > 1 && lines[lines.length - 1].trim() === '' && lines[lines.length - 2].trim() === '') {
        lines.pop();
    }

    const result = lines.join('\n');
    fs.writeFileSync(filePath, result.endsWith('\n') ? result : result + '\n');
}

/**
 * Add or update an entry in a config.properties file.
 * Format: key:type
 * Preserves existing entries and updates/adds the specified key.
 */
function addOrUpdateConfigPropertyEntry(filePath: string, key: string, type: string): void {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    let content = '';
    if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf-8');
    }

    const lines = content.split('\n');
    const keyIndex = lines.findIndex(line => line.startsWith(`${key}:`));

    if (keyIndex !== -1) {
        lines[keyIndex] = `${key}:${type}`;
    } else {
        // Add new entry, but avoid adding to an empty line at the end
        if (lines.length > 0 && lines[lines.length - 1].trim() === '') {
            lines[lines.length - 1] = `${key}:${type}`;
            lines.push('');
        } else {
            lines.push(`${key}:${type}`);
        }
    }

    // Clean up multiple empty lines at the end
    while (lines.length > 1 && lines[lines.length - 1].trim() === '' && lines[lines.length - 2].trim() === '') {
        lines.pop();
    }

    const result = lines.join('\n');
    fs.writeFileSync(filePath, result.endsWith('\n') ? result : result + '\n');
}

/**
 * Add the default model configuration to the project.
 * Updates both .env and config.properties files.
 */
function addDefaultModelConfig(projectPath: string, token: string, backendUrl: string): boolean {
    // Build file paths
    const envFilePath = path.join(projectPath, ENV_FILE_NAME);
    const configPropertiesPath = path.join(projectPath, ...CONFIG_PROPERTIES_RELATIVE_PATH);

    // Update .env file with values
    addOrUpdateEnvEntry(envFilePath, SERVICE_URL_KEY, backendUrl);
    addOrUpdateEnvEntry(envFilePath, ACCESS_TOKEN_KEY, token);

    // Update config.properties file with type declarations
    addOrUpdateConfigPropertyEntry(configPropertiesPath, SERVICE_URL_KEY, 'string');
    addOrUpdateConfigPropertyEntry(configPropertiesPath, ACCESS_TOKEN_KEY, 'string');

    return true;
}

/**
 * Main function to add the config file with progress notification.
 */
export async function addConfigFile(projectPath: string): Promise<boolean> {
    return vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: PROGRESS_MESSAGE,
            cancellable: false,
        },
        async () => {
            const token = await getTokenForDefaultModel();
            const backendUrl = getAnthropicProxyUrl();
            return addDefaultModelConfig(projectPath, token, backendUrl);
        }
    );
}

/**
 * Add WSO2_AI configuration entries to config.properties only.
 * This is called when a WSO2_AI connection is created.
 * Does not modify .env file - values are injected at runtime.
 */
export function addWSO2AIConfigProperties(projectPath: string): void {
    const configPropertiesPath = path.join(projectPath, ...CONFIG_PROPERTIES_RELATIVE_PATH);

    // Check if entries already exist
    let content = '';
    if (fs.existsSync(configPropertiesPath)) {
        content = fs.readFileSync(configPropertiesPath, 'utf-8');
    }

    const hasServiceUrl = content.includes(`${SERVICE_URL_KEY}:`);
    const hasAccessToken = content.includes(`${ACCESS_TOKEN_KEY}:`);

    // Only add entries that don't already exist
    if (!hasServiceUrl) {
        addOrUpdateConfigPropertyEntry(configPropertiesPath, SERVICE_URL_KEY, 'string');
    }
    if (!hasAccessToken) {
        addOrUpdateConfigPropertyEntry(configPropertiesPath, ACCESS_TOKEN_KEY, 'string');
    }
}

/**
 * Get WSO2_AI environment variables for runtime injection.
 * Returns empty object if user is not logged in or not using MI_INTEL login method.
 * These values are injected at runtime before .env values, so .env can override them.
 */
export async function getWSO2AIEnvVariables(): Promise<{ [key: string]: string }> {
    try {
        const credentials = await getAuthCredentials();
        if (!credentials || credentials.loginMethod !== LoginMethod.MI_INTEL) {
            return {};
        }

        const token = await getRefreshedAccessToken();
        const backendUrl = getAnthropicProxyUrl();

        return {
            [SERVICE_URL_KEY]: backendUrl,
            [ACCESS_TOKEN_KEY]: token
        };
    } catch (error) {
        // User not logged in or token refresh failed - return empty
        // This allows the integration to run without WSO2_AI if not configured
        return {};
    }
}

// Export messages for use in activate.ts
export {
    SUCCESS_MESSAGE,
    NO_PROJECT_MESSAGE,
    LOGIN_REQUIRED_MESSAGE,
    MI_INTEL_ONLY_MESSAGE,
    SIGN_IN_BUTTON
};
