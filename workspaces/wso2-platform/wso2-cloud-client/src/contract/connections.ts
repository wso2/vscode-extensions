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

/**
 * The environment variables a connection is written as. Every env-var group
 * of an integration is projected into the same container, so two connections
 * must never write the same variable: each name carries the connection's
 * name as a prefix (`ORDERS_DB_HOST`). Both the extension that writes a
 * connection and the one that reads it back name the variables here.
 */

/** The variables of a database connection, by the entry names the editors use. */
export const DATABASE_CONNECTION_VARS = {
	HostName: "DB_HOST",
	Port: "DB_PORT",
	DatabaseName: "DB_NAME",
	Username: "DB_USER",
	Password: "DB_PASSWORD",
} as const;

/** The database's CA certificate, written when the server has one. */
export const DATABASE_CA_CERT_VAR = "DB_CA_CERT";

/** The variables of a service connection, by the entry names the editors use. */
export const SERVICE_CONNECTION_VARS = {
	ServiceURL: "SERVICE_URL",
	ChoreoAPIKey: "API_KEY",
} as const;

/** The prefix of a connection's variables: its name in upper case, with anything but letters and digits as `_`. */
export function connectionVarPrefix(connectionName: string): string {
	const cleaned = connectionName
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
	if (!cleaned) {
		return "CONNECTION";
	}
	// An environment variable cannot start with a digit.
	return /^[0-9]/.test(cleaned) ? `C_${cleaned}` : cleaned;
}

/** The variable `suffix` (such as `DB_HOST`) of the connection `connectionName`. */
export function connectionVarName(connectionName: string, suffix: string): string {
	return `${connectionVarPrefix(connectionName)}_${suffix}`;
}

/**
 * Which of `suffixes` a variable is, read back from a group. A name without a
 * prefix is matched too: connections written before prefixes have those.
 */
export function connectionVarSuffix(variable: string, suffixes: readonly string[]): string | undefined {
	return suffixes.find((suffix) => variable === suffix || variable.endsWith(`_${suffix}`));
}
