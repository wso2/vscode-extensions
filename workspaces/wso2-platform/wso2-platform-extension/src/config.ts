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

import type { GHAppConfig } from "@wso2/wso2-platform-core";
import { workspace } from "vscode";

interface IChoreoEnvConfig {
    ghApp: GHAppConfig;
    choreoConsoleBaseUrl: string;
    billingConsoleBaseUrl: string;
    devantConsoleBaseUrl: string;
    devantAsguadeoClientId: string;
}

const config = workspace.getConfiguration('WSO2.WSO2-Platform');

const DEFAULT_CHOREO_ENV_CONFIG: IChoreoEnvConfig = {
    ghApp: {
        installUrl: process.env.DEFAULT_GHAPP_INSTALL_URL || config.get('Default.ghappInstallUrl') || '',
        authUrl: process.env.DEFAULT_GHAPP_AUTH_URL || config.get('Default.ghappAuthUrl') || '',
        clientId: process.env.PLATFORM_DEFAULT_GHAPP_CLIENT_ID || config.get('Default.ghappClientId') || '',
        redirectUrl: process.env.DEFAULT_GHAPP_REDIRECT_URL || config.get('Default.ghappRedirectUrl') || '',
        devantRedirectUrl: process.env.DEFAULT_GHAPP_DEVANT_REDIRECT_URL || config.get('Default.ghappDevantRedirectUrl') || '',
    },
    choreoConsoleBaseUrl: process.env.DEFAULT_CHOREO_CONSOLE_BASE_URL || config.get('Default.choreoConsoleBaseUrl') || '',
    billingConsoleBaseUrl: process.env.DEFAULT_BILLING_CONSOLE_BASE_URL || config.get('Default.billingConsoleBaseUrl') || '',
    devantConsoleBaseUrl: process.env.DEFAULT_DEVANT_CONSOLE_BASE_URL || config.get('Default.devantConsoleBaseUrl') || '',
    devantAsguadeoClientId: process.env.PLATFORM_DEFAULT_DEVANT_ASGUADEO_CLIENT_ID || config.get('Default.devantAsguadeoClientId') || '',
};

const CHOREO_ENV_CONFIG_STAGE: IChoreoEnvConfig = {
    ghApp: {
        installUrl: process.env.STAGE_GHAPP_INSTALL_URL || config.get('Stage.ghappInstallUrl') || '',
        authUrl: process.env.STAGE_GHAPP_AUTH_URL || config.get('Stage.ghappAuthUrl') || '',
        clientId: process.env.PLATFORM_STAGE_GHAPP_CLIENT_ID || config.get('Stage.ghappClientId') || '',
        redirectUrl: process.env.STAGE_GHAPP_REDIRECT_URL || config.get('Stage.ghappRedirectUrl') || '',
        devantRedirectUrl: process.env.STAGE_GHAPP_DEVANT_REDIRECT_URL || config.get('Stage.ghappDevantRedirectUrl') || '',
    },
    choreoConsoleBaseUrl: process.env.STAGE_CHOREO_CONSOLE_BASE_URL || config.get('Stage.choreoConsoleBaseUrl') || '',
    billingConsoleBaseUrl: process.env.STAGE_BILLING_CONSOLE_BASE_URL || config.get('Stage.billingConsoleBaseUrl') || '',
    devantConsoleBaseUrl: process.env.STAGE_DEVANT_CONSOLE_BASE_URL || config.get('Stage.devantConsoleBaseUrl') || '',
    devantAsguadeoClientId: process.env.PLATFORM_STAGE_DEVANT_ASGUADEO_CLIENT_ID || config.get('Stage.devantAsguadeoClientId') || '',
};

const CHOREO_ENV_CONFIG_DEV: IChoreoEnvConfig = {
    ghApp: {
        installUrl: process.env.DEV_GHAPP_INSTALL_URL || config.get('Dev.ghappInstallUrl') || '',
        authUrl: process.env.DEV_GHAPP_AUTH_URL || config.get('Dev.ghappAuthUrl') || '',
        clientId: process.env.PLATFORM_DEV_GHAPP_CLIENT_ID || config.get('Dev.ghappClientId') || '',
        redirectUrl: process.env.DEV_GHAPP_REDIRECT_URL || config.get('Dev.ghappRedirectUrl') || '',
        devantRedirectUrl: process.env.DEV_GHAPP_DEVANT_REDIRECT_URL || config.get('Dev.ghappDevantRedirectUrl') || '',
    },
    choreoConsoleBaseUrl: process.env.DEV_CHOREO_CONSOLE_BASE_URL || config.get('Dev.choreoConsoleBaseUrl') || '',
    billingConsoleBaseUrl: process.env.DEV_BILLING_CONSOLE_BASE_URL || config.get('Dev.billingConsoleBaseUrl') || '',
    devantConsoleBaseUrl: process.env.DEV_DEVANT_CONSOLE_BASE_URL || config.get('Dev.devantConsoleBaseUrl') || '',
    devantAsguadeoClientId: process.env.PLATFORM_DEV_DEVANT_ASGUADEO_CLIENT_ID || config.get('Dev.devantAsguadeoClientId') || '',
};

class ChoreoEnvConfig {
    constructor(private _config: IChoreoEnvConfig = DEFAULT_CHOREO_ENV_CONFIG) {}

    public getGHAppConfig(): GHAppConfig {
        return this._config.ghApp;
    }

    public getConsoleUrl(): string {
        return this._config.choreoConsoleBaseUrl;
    }

    public getBillingUrl(): string {
        return this._config.billingConsoleBaseUrl;
    }

    public getDevantUrl(): string {
        return this._config.devantConsoleBaseUrl;
    }

    public getDevantAsguadeoClientId(): string {
        return this._config.devantAsguadeoClientId;
    }
}

const choreoEnv = process.env.TEST_CHOREO_EXT_ENV || workspace.getConfiguration().get("WSO2.WSO2-Platform.Advanced.ChoreoEnvironment");

let pickedEnvConfig: IChoreoEnvConfig;

switch (choreoEnv) {
	
    case "prod":
        pickedEnvConfig = DEFAULT_CHOREO_ENV_CONFIG;
        break;
    case "stage":
        pickedEnvConfig = CHOREO_ENV_CONFIG_STAGE;
        break;
    case "dev":
        pickedEnvConfig = CHOREO_ENV_CONFIG_DEV;
        break;
    default:
        pickedEnvConfig = DEFAULT_CHOREO_ENV_CONFIG;
}

export const choreoEnvConfig: ChoreoEnvConfig = new ChoreoEnvConfig(pickedEnvConfig);
