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

import { authStore } from "../stores/auth-store";
import { getTelemetryReporter } from "./telemetry";

// export async function sendProjectTelemetryEvent(eventName: string, properties?: { [key: string]: string; }, measurements?: { [key: string]: number; }) {
//     try {
//         const choreoProject = await ext.api.getChoreoProject();
//         if (choreoProject) {
//             sendTelemetryEvent(eventName, { ...properties, ...{ 'project': choreoProject?.name } }, measurements);
//         } else {
//             sendTelemetryEvent(eventName, properties, measurements);
//         }
//     } catch (error) {
//         getLogger().error("Failed to send telemetry event", error);
//     }
// };

// this will inject custom dimensions to the event and send it to the telemetry server
export function sendTelemetryEvent(eventName: string, properties?: { [key: string]: string }, measurements?: { [key: string]: number }) {
	const reporter = getTelemetryReporter();
	reporter.sendTelemetryEvent(eventName, { ...properties, ...getCommonProperties() }, measurements);
}

export function sendTelemetryException(error: Error, properties?: { [key: string]: string }, measurements?: { [key: string]: number }) {
	const reporter = getTelemetryReporter();
	reporter.sendTelemetryErrorEvent(`error:${error.message}`, { ...properties, ...getCommonProperties() }, measurements);
}

// Create common properties for all events
export function getCommonProperties(): { [key: string]: string } {
	return {
		idpId: authStore.getState().state?.userInfo?.userId!,
		// check if the email ends with "@wso2.com"
		isWSO2User: authStore.getState().state?.userInfo?.userEmail?.endsWith("@wso2.com") ? "true" : "false",
	};
}
