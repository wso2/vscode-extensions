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

import type { IChildLogger } from "@vscode-logging/logger";
import type { TelemetryReporter } from "@vscode/extension-telemetry";

// This is the telemetry wrapper class that is used to send telemetry data to the App Insights backend.
// It will implment the IChildLogger interface by wrapping a provided logger instance.
// It will only send telemetry for error events.

export class TelemetryWrapper implements IChildLogger {
	private logger: IChildLogger;
	private reporter: TelemetryReporter;

	constructor(logger: IChildLogger, reporter: TelemetryReporter) {
		this.logger = logger;
		this.reporter = reporter;
	}
	public fatal(msg: string, ...args: any[]): void {
		this.logger.fatal(msg, args);
		// TODO: Enable once when the language server telemetry complete
		// this.reporter.sendTelemetryErrorEvent("vscode-error-occurred", {
		// 	message: msg,
		// });
	}

	public error(message: string, error?: Error): void {
		this.logger.error(message, error);
		// TODO: Enable once when the language server telemetry complete
		// this.reporter.sendDangerousTelemetryErrorEvent("vscode-error-occurred", {
		// 	message: message,
		// 	error: error ? error.toString() : "",
		// });
	}

	public warn(message: string, error?: Error): void {
		this.logger.warn(message, error);
	}

	public info(message: string): void {
		this.logger.info(message);
	}

	public debug(message: string): void {
		this.logger.debug(message);
	}

	public trace(message: string): void {
		this.logger.trace(message);
	}

	public getChildLogger(opts: { label: string }): IChildLogger {
		return new TelemetryWrapper(this.logger.getChildLogger(opts), this.reporter);
	}
}
