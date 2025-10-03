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

import { window } from "vscode";
import { z } from "zod/v3";
import { getChoreoEnv } from "./choreo-rpc/cli-install";

const ghAppSchema = z.object({
	installUrl: z.string().min(1),
	authUrl: z.string().min(1),
	clientId: z.string().min(1),
	redirectUrl: z.string().min(1),
	devantRedirectUrl: z.string().min(1),
});

const envSchemaItem = z.object({
	ghApp: ghAppSchema,
	choreoConsoleBaseUrl: z.string().min(1),
	billingConsoleBaseUrl: z.string().min(1),
	devantConsoleBaseUrl: z.string().min(1),
	devantAsgardeoClientId: z.string().min(1),
});

const envSchema = z.object({
	CLI_RELEASES_BASE_URL: z.string().min(1),
	defaultEnvs: envSchemaItem,
	stageEnvs: envSchemaItem,
	devEnvs: envSchemaItem,
});

const _env = envSchema.safeParse({
	CLI_RELEASES_BASE_URL: process.env.PLATFORM_CHOREO_CLI_RELEASES_BASE_URL,
	defaultEnvs: {
		ghApp: {
			installUrl: process.env.PLATFORM_DEFAULT_GHAPP_INSTALL_URL ?? "",
			authUrl: process.env.PLATFORM_DEFAULT_GHAPP_AUTH_URL ?? "",
			clientId: process.env.PLATFORM_DEFAULT_GHAPP_CLIENT_ID ?? "",
			redirectUrl: process.env.PLATFORM_DEFAULT_GHAPP_REDIRECT_URL ?? "",
			devantRedirectUrl: process.env.PLATFORM_DEFAULT_GHAPP_DEVANT_REDIRECT_URL ?? "",
		},
		choreoConsoleBaseUrl: process.env.PLATFORM_DEFAULT_CHOREO_CONSOLE_BASE_URL ?? "",
		billingConsoleBaseUrl: process.env.PLATFORM_DEFAULT_BILLING_CONSOLE_BASE_URL ?? "",
		devantConsoleBaseUrl: process.env.PLATFORM_DEFAULT_DEVANT_CONSOLE_BASE_URL ?? "",
		devantAsgardeoClientId: process.env.PLATFORM_DEFAULT_DEVANT_ASGARDEO_CLIENT_ID ?? "",
	},
	stageEnvs: {
		ghApp: {
			installUrl: process.env.PLATFORM_STAGE_GHAPP_INSTALL_URL ?? "",
			authUrl: process.env.PLATFORM_STAGE_GHAPP_AUTH_URL ?? "",
			clientId: process.env.PLATFORM_STAGE_GHAPP_CLIENT_ID ?? "",
			redirectUrl: process.env.PLATFORM_STAGE_GHAPP_REDIRECT_URL ?? "",
			devantRedirectUrl: process.env.PLATFORM_STAGE_GHAPP_DEVANT_REDIRECT_URL ?? "",
		},
		choreoConsoleBaseUrl: process.env.PLATFORM_STAGE_CHOREO_CONSOLE_BASE_URL ?? "",
		billingConsoleBaseUrl: process.env.PLATFORM_STAGE_BILLING_CONSOLE_BASE_URL ?? "",
		devantConsoleBaseUrl: process.env.PLATFORM_STAGE_DEVANT_CONSOLE_BASE_URL ?? "",
		devantAsgardeoClientId: process.env.PLATFORM_STAGE_DEVANT_ASGARDEO_CLIENT_ID ?? "",
	},
	devEnvs: {
		ghApp: {
			installUrl: process.env.PLATFORM_DEV_GHAPP_INSTALL_URL ?? "",
			authUrl: process.env.PLATFORM_DEV_GHAPP_AUTH_URL ?? "",
			clientId: process.env.PLATFORM_DEV_GHAPP_CLIENT_ID ?? "",
			redirectUrl: process.env.PLATFORM_DEV_GHAPP_REDIRECT_URL ?? "",
			devantRedirectUrl: process.env.PLATFORM_DEV_GHAPP_DEVANT_REDIRECT_URL ?? "",
		},
		choreoConsoleBaseUrl: process.env.PLATFORM_DEV_CHOREO_CONSOLE_BASE_URL ?? "",
		billingConsoleBaseUrl: process.env.PLATFORM_DEV_BILLING_CONSOLE_BASE_URL ?? "",
		devantConsoleBaseUrl: process.env.PLATFORM_DEV_DEVANT_CONSOLE_BASE_URL ?? "",
		devantAsgardeoClientId: process.env.PLATFORM_DEV_DEVANT_ASGARDEO_CLIENT_ID ?? "",
	},
} as z.infer<typeof envSchema>);

if (!_env.success) {
	window.showErrorMessage(`Invalid environment variables. ${_env.error.message}`);
	console.error("Invalid environment variables:", _env.error.flatten().fieldErrors);
}

class ChoreoEnvConfig {
	constructor(private _config: z.infer<typeof envSchemaItem> = _env.data!.defaultEnvs) {}

	public getCliInstallUrl() {
		return _env.data?.CLI_RELEASES_BASE_URL;
	}

	public getGHAppConfig() {
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

	public getDevantAsgardeoClientId(): string {
		return this._config.devantAsgardeoClientId;
	}
}

const choreoEnv = getChoreoEnv();

let pickedEnvConfig: z.infer<typeof envSchemaItem>;

switch (choreoEnv) {
	case "prod":
		pickedEnvConfig = _env.data!.defaultEnvs;
		break;
	case "stage":
		pickedEnvConfig = _env.data!.stageEnvs;
		break;
	case "dev":
		pickedEnvConfig = _env.data!.devEnvs;
		break;
	default:
		pickedEnvConfig = _env.data!.defaultEnvs;
}

export const choreoEnvConfig: ChoreoEnvConfig = new ChoreoEnvConfig(pickedEnvConfig);
