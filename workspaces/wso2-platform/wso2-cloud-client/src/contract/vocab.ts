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

import type { IntegrationRuntime, IntegrationType } from "../api/components";
import { INTEGRATION_TYPES } from "../api/components";

/**
 * The integration scopes the Ballerina and Integrator extensions already
 * speak (`DevantScopes` in wso2-platform-core), mapped to the platform's
 * integration types. `workflow` and `library` have no platform type yet,
 * so they map to nothing: creating one is a platform dependency.
 */
export const SCOPE_TO_INTEGRATION_TYPE: Readonly<Record<string, IntegrationType | undefined>> = {
	automation: "automation",
	"integration-as-api": "integration-as-api",
	"event-integration": "event-integration",
	"file-integration": "file-integration",
	"ai-agent": "ai-agent",
	"mcp-server": "mcp-server",
	workflow: undefined,
	library: undefined,
	any: undefined,
};

/** The integration type a Ballerina project scope stands for, if any. */
export function integrationTypeFromScope(scope: string | undefined): IntegrationType | undefined {
	return scope && hasOwn(SCOPE_TO_INTEGRATION_TYPE, scope) ? SCOPE_TO_INTEGRATION_TYPE[scope] : undefined;
}

/** Whether `value` is one of the integration types. */
export function isIntegrationType(value: string | undefined): value is IntegrationType {
	return value !== undefined && hasOwn(INTEGRATION_TYPES, value);
}

/** Only a table's own keys count: `"toString"` or `"constructor"` must not find `Object.prototype`. */
function hasOwn(table: object, key: string): boolean {
	return Object.prototype.hasOwnProperty.call(table, key);
}

/** The runtime for the language a build pack speaks. */
export function runtimeForBuildPack(buildPackLang: "ballerina" | "microintegrator" | "docker" | string | undefined): IntegrationRuntime {
	switch (buildPackLang) {
		case "microintegrator":
			return "wso2-integrator-mi";
		case "docker":
			return "dockerfile";
		default:
			return "wso2-integrator";
	}
}

/** What a person sees for an integration type. */
export function integrationTypeLabel(type: IntegrationType | "proxy" | string | undefined): string {
	switch (type) {
		case "automation":
			return "Automation";
		case "integration-as-api":
			return "Integration as API";
		case "event-integration":
			return "Event Integration";
		case "file-integration":
			return "File Integration";
		case "ai-agent":
			return "AI Agent";
		case "mcp-server":
			return "MCP Server";
		case "proxy":
			return "API Proxy";
		default:
			return type ?? "";
	}
}
