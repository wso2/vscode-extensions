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


const DEFAULT_CHOREO_ENV_CONFIG: IChoreoEnvConfig = {
    ghApp: {
        installUrl: process.env.DEFAULT_GHAPP_INSTALL_URL || '',
        authUrl: process.env.DEFAULT_GHAPP_AUTH_URL || '',
        clientId: process.env.PLATFORM_DEFAULT_GHAPP_CLIENT_ID || '',
        redirectUrl: process.env.DEFAULT_GHAPP_REDIRECT_URL || '',
        devantRedirectUrl: process.env.DEFAULT_GHAPP_DEVANT_REDIRECT_URL || '',
    },
    choreoConsoleBaseUrl: process.env.DEFAULT_CHOREO_CONSOLE_BASE_URL || '',
    billingConsoleBaseUrl: process.env.DEFAULT_BILLING_CONSOLE_BASE_URL || '',
    devantConsoleBaseUrl: process.env.DEFAULT_DEVANT_CONSOLE_BASE_URL|| '',
    devantAsguadeoClientId: process.env.PLATFORM_DEFAULT_DEVANT_ASGUADEO_CLIENT_ID || '',
};

const CHOREO_ENV_CONFIG_STAGE: IChoreoEnvConfig = {
    ghApp: {
        installUrl: process.env.STAGE_GHAPP_INSTALL_URL || '',
        authUrl: process.env.STAGE_GHAPP_AUTH_URL || '',
        clientId: process.env.PLATFORM_STAGE_GHAPP_CLIENT_ID || '',
        redirectUrl: process.env.STAGE_GHAPP_REDIRECT_URL || '',
        devantRedirectUrl: process.env.STAGE_GHAPP_DEVANT_REDIRECT_URL || '',
    },
    choreoConsoleBaseUrl: process.env.STAGE_CHOREO_CONSOLE_BASE_URL || '',
    billingConsoleBaseUrl: process.env.STAGE_BILLING_CONSOLE_BASE_URL || '',
    devantConsoleBaseUrl: process.env.STAGE_DEVANT_CONSOLE_BASE_URL || '',
    devantAsguadeoClientId: process.env.PLATFORM_STAGE_DEVANT_ASGUADEO_CLIENT_ID || '',
};

const CHOREO_ENV_CONFIG_DEV: IChoreoEnvConfig = {
    ghApp: {
        installUrl: process.env.DEV_GHAPP_INSTALL_URL || '',
        authUrl: process.env.DEV_GHAPP_AUTH_URL || '',
        clientId: process.env.PLATFORM_DEV_GHAPP_CLIENT_ID || '',
        redirectUrl: process.env.DEV_GHAPP_REDIRECT_URL || '',
        devantRedirectUrl: process.env.DEV_GHAPP_DEVANT_REDIRECT_URL || '',
    },
    choreoConsoleBaseUrl: process.env.DEV_CHOREO_CONSOLE_BASE_URL || '',
    billingConsoleBaseUrl: process.env.DEV_BILLING_CONSOLE_BASE_URL || '',
    devantConsoleBaseUrl: process.env.DEV_DEVANT_CONSOLE_BASE_URL || '',
    devantAsguadeoClientId: process.env.PLATFORM_DEV_DEVANT_ASGUADEO_CLIENT_ID || '',
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
