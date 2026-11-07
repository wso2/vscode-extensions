/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import * as vscode from "vscode";
import type { CloudEnvName, CloudEnvironment } from "../config/environments";
import { assertEnvironmentConfigured, isCloudEnvName, resolveCloudEnvironment } from "../config/environments";

/** The setting both extensions read for the WSO2 Cloud deployment to use. */
export const CLOUD_ENV_SETTING = "integrator.advanced.cloudEnv";

/** Hidden overrides for rolling a new client id or API host out without a release. */
export const CLOUD_CLIENT_ID_SETTING = "integrator.advanced.cloudClientId";
export const CLOUD_API_URL_SETTING = "integrator.advanced.cloudApiBaseUrl";

/** The environment variables an environment may be chosen by, newest name first. */
export const CLOUD_ENV_VARS = ["WSO2_CLOUD_ENV", "CLOUD_ENV", "CHOREO_ENV"] as const;

/** `WSO2_CLOUD_API_URL` overrides the API host, for a developer pointing at a local service or at the internal development deployment. */
export const CLOUD_API_URL_VAR = "WSO2_CLOUD_API_URL";
/** The other hosts a `dev` environment needs, and overrides for any environment. */
export const CLOUD_ISSUER_VAR = "WSO2_CLOUD_ISSUER";
export const CLOUD_OBSERVABILITY_URL_VAR = "WSO2_CLOUD_OBSERVABILITY_URL";
export const CLOUD_CONSOLE_URL_VAR = "WSO2_CLOUD_CONSOLE_URL";
export const CLOUD_CLIENT_ID_VAR = "WSO2_CLOUD_CLIENT_ID";

/**
 * Which deployment to use: an environment variable first, then the setting,
 * then `prod`. The cloud editor sets the variable; a person sets the setting.
 */
export function readCloudEnvName(env: NodeJS.ProcessEnv = process.env): CloudEnvName {
	for (const name of CLOUD_ENV_VARS) {
		const value = env[name]?.trim().toLowerCase();
		if (isCloudEnvName(value)) {
			return value;
		}
	}
	const setting = userSetting(CLOUD_ENV_SETTING)?.toLowerCase();
	return isCloudEnvName(setting) ? setting : "prod";
}

/**
 * A setting's value from the person's own (user) settings only. The hosts
 * contribute these settings with `"scope": "machine"`, which keeps a
 * workspace from setting them; this does the same for a host that forgot,
 * so a cloned repository's `.vscode/settings.json` can never point the
 * client's tokens elsewhere.
 */
export function userSetting(key: string): string | undefined {
	const value = vscode.workspace.getConfiguration().inspect<string>(key)?.globalValue;
	const trimmed = typeof value === "string" ? value.trim() : "";
	return trimmed || undefined;
}

/**
 * The environment with every override applied. Throws when it lacks the API
 * or issuer URL, which `dev` does unless the variables are set.
 */
export function readCloudEnvironment(env: NodeJS.ProcessEnv = process.env): CloudEnvironment {
	const environment = resolveCloudEnvironment(readCloudEnvName(env), {
		clientId: env[CLOUD_CLIENT_ID_VAR] || userSetting(CLOUD_CLIENT_ID_SETTING),
		apiBaseUrl: env[CLOUD_API_URL_VAR] || userSetting(CLOUD_API_URL_SETTING),
		issuer: env[CLOUD_ISSUER_VAR],
		observabilityBaseUrl: env[CLOUD_OBSERVABILITY_URL_VAR],
		consoleUrl: env[CLOUD_CONSOLE_URL_VAR],
	});
	return assertEnvironmentConfigured(
		environment,
		`set ${CLOUD_API_URL_VAR} and ${CLOUD_ISSUER_VAR} (and ${CLOUD_OBSERVABILITY_URL_VAR}, ${CLOUD_CONSOLE_URL_VAR}) or choose another ${CLOUD_ENV_SETTING}`,
	);
}
