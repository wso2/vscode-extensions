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
import { ext } from "./extensionVariables";

const envSchemaItem = z.object({});

const envSchema = z.object({
	CLI_RELEASES_BASE_URL: z.string().min(1),
	defaultEnvs: envSchemaItem,
	stageEnvs: envSchemaItem,
	devEnvs: envSchemaItem,
});

const _env = envSchema.safeParse({
	CLI_RELEASES_BASE_URL: process.env.PLATFORM_CHOREO_CLI_RELEASES_BASE_URL,
	defaultEnvs: {},
	stageEnvs: {},
	devEnvs: {},
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
}

let pickedEnvConfig: z.infer<typeof envSchemaItem>;

switch (ext.choreoEnv) {
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
