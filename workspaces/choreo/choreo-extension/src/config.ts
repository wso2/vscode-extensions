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

import type { GHAppConfig } from "@wso2/choreo-core";
import { workspace } from "vscode";

interface IChoreoEnvConfig {
	ghApp: GHAppConfig;
	choreoConsoleBaseUrl: string;
	billingConsoleBaseUrl: string;
}

const DEFAULT_CHOREO_ENV_CONFIG: IChoreoEnvConfig = {
	ghApp: {
		installUrl: "https://github.com/apps/wso2-cloud-app/installations/new",
		authUrl: "https://github.com/login/oauth/authorize",
		clientId: "Iv1.804167a242012c66",
		redirectUrl: "https://console.choreo.dev/ghapp",
	},
	choreoConsoleBaseUrl: "https://console.choreo.dev",
	billingConsoleBaseUrl: "https://subscriptions.wso2.com",
};

const CHOREO_ENV_CONFIG_STAGE: IChoreoEnvConfig = {
	ghApp: {
		installUrl: "https://github.com/apps/wso2-cloud-app-stage/installations/new",
		authUrl: "https://github.com/login/oauth/authorize",
		clientId: "Iv1.20fd2645fc8a5aab",
		redirectUrl: "https://console.st.choreo.dev/ghapp",
	},
	choreoConsoleBaseUrl: "https://console.st.choreo.dev",
	billingConsoleBaseUrl: "https://subscriptions.st.wso2.com",
};

const CHOREO_ENV_CONFIG_DEV: IChoreoEnvConfig = {
	ghApp: {
		installUrl: "https://github.com/apps/wso2-cloud-app-dev/installations/new",
		authUrl: "https://github.com/login/oauth/authorize",
		clientId: "Iv1.f6cf2cd585148ee7",
		redirectUrl: "https://consolev2.preview-dv.choreo.dev/ghapp",
	},
	choreoConsoleBaseUrl: "https://consolev2.preview-dv.choreo.dev",
	billingConsoleBaseUrl: "https://subscriptions.dv.wso2.com",
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
}

const choreoEnv = process.env.TEST_CHOREO_EXT_ENV ?? workspace.getConfiguration().get("Advanced.ChoreoEnvironment");

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
