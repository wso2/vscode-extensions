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

import { ok } from "assert";
import { readFile as readFileCallback } from "fs";
import { resolve } from "path";
import { promisify } from "util";
import type { IChildLogger, IVSCodeExtLogger } from "@vscode-logging/types";
import { NOOP_LOGGER, configureLogger } from "@vscode-logging/wrapper";
import { type ExtensionContext, window } from "vscode";
import { getTelemetryReporter } from "../telemetry/telemetry";
import { TelemetryWrapper } from "./telemetry-wrapper";

const readFile = promisify(readFileCallback);

// On file load we initialize our logger to `NOOP_LOGGER`
// this is done because the "real" logger cannot be initialized during file load.
// only once the `activate` function has been called in extension.ts
// as the `ExtensionContext` argument to `activate` contains the required `logPath`
let loggerImpel: IVSCodeExtLogger = NOOP_LOGGER;
let childLogger: IChildLogger = new TelemetryWrapper(loggerImpel, getTelemetryReporter());

export function getLogger(): IChildLogger {
	return childLogger;
}

function setLogger(newLogger: IVSCodeExtLogger): void {
	loggerImpel = newLogger;
	childLogger = new TelemetryWrapper(loggerImpel, getTelemetryReporter());
}

const LOGGING_LEVEL_PROP = "WSO2.WSO2-Platform.Logging.loggingLevel";
const SOURCE_LOCATION_PROP = "WSO2.WSO2-Platform.Logging.sourceLocationTracking";

export async function initLogger(context: ExtensionContext): Promise<void> {
	const meta = JSON.parse(await readFile(resolve(context.extensionPath, "package.json"), "utf8"));

	// By asserting the existence of the properties in the package.json
	// at runtime, we avoid many copy-pasta mistakes...
	const configProps = meta?.contributes?.configuration?.properties;
	ok(configProps?.[LOGGING_LEVEL_PROP]);
	ok(configProps?.[SOURCE_LOCATION_PROP]);

	const extLogger = configureLogger({
		extName: meta.displayName,
		logPath: context.logUri.fsPath,
		logOutputChannel: window.createOutputChannel(meta.displayName, "json"),
		// set to `true` if you also want your VSCode extension to log to the console.
		logConsole: false,
		loggingLevelProp: LOGGING_LEVEL_PROP,
		sourceLocationProp: SOURCE_LOCATION_PROP,
		subscriptions: context.subscriptions,
	});

	setLogger(extLogger);
}
