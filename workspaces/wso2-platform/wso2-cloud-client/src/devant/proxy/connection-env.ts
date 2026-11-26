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

import type { ConnectionListItem } from "@wso2/wso2-platform-core";
import type { Logger } from "../../logger";
import { silentLogger } from "../../logger";
import { getConnectionItem, resolveConnectionSecrets } from "../api/connections";
import type { DevantHttp } from "../api/http";

/** What connections turn into: environment variables, and the hosts the bridge calls over HTTPS. */
export interface ConnectionEnv {
	envVars: Record<string, string>;
	secureHosts: Set<string>;
}

export interface ConnectionEnvTarget {
	orgId: string;
	projectId: string;
	/** The component whose connections these are; absent for the project's own. */
	componentId?: string;
	/** The environment's template, which connection configurations are keyed by. */
	envTemplateId: string;
	/** Connection names left out. */
	skip?: readonly string[];
}

interface SecretRef {
	key: string;
	valueRef: string;
}

/**
 * Adds the connections' configuration values for the environment to `into`. An organization-level service URL on
 * HTTPS is handed out as HTTP, its host marked secure so the bridge calls it over HTTPS. Secret values are resolved per
 * connection group; a group whose secrets cannot be resolved is left without them.
 */
export async function addConnectionEnvs(
	http: DevantHttp,
	connections: readonly ConnectionListItem[],
	target: ConnectionEnvTarget,
	into: ConnectionEnv,
	logger: Logger = silentLogger,
): Promise<void> {
	const secretGroups = new Map<string, SecretRef[]>();
	const secretEnvNames = new Map<string, Map<string, string>>();
	const { envVars } = into;

	for (const item of connections) {
		if (target.skip?.includes(item.name)) {
			continue;
		}
		if (!secretEnvNames.has(item.groupUuid)) {
			secretEnvNames.set(item.groupUuid, new Map());
		}
		const details = await getConnectionItem(http, { orgId: target.orgId, connectionGroupId: item.groupUuid });
		const config = details.configurations?.[target.envTemplateId];
		if (!config?.environmentUuid) {
			continue;
		}
		for (const entry of Object.values(config.entries ?? {})) {
			const name = entry.envVariableName;
			if (entry.value !== "") {
				if (item.schemaName.toLowerCase().includes("organization") && entry.key === "ServiceURL" && entry.value.startsWith("https://")) {
					into.secureHosts.add(domainOf(entry.value));
					envVars[name] = entry.value.replace("https://", "http://");
				} else {
					envVars[name] = entry.value;
				}
				const value = envVars[name];
				if ((value.startsWith("https://") || value.startsWith("http://")) && value.endsWith("/")) {
					envVars[name] = value.slice(0, -1);
				}
			} else if (entry.isSensitive && !entry.isFile && !envVars[name]) {
				const group = secretGroups.get(item.groupUuid) ?? [];
				group.push({ valueRef: entry.valueRef, key: entry.key });
				secretGroups.set(item.groupUuid, group);
				secretEnvNames.get(item.groupUuid)?.set(entry.key, name);
			}
		}
	}

	for (const [groupId, secrets] of secretGroups) {
		let resolved: { key: string; value: string }[];
		try {
			const answer = await resolveConnectionSecrets(http, {
				orgId: target.orgId,
				groupId,
				projectId: target.projectId,
				componentId: target.componentId ?? "",
				envTemplateId: target.envTemplateId,
				secrets,
			});
			resolved = answer.secrets ?? [];
		} catch {
			logger.warn(`The secrets of connection group ${groupId} could not be resolved; their variables are left unset.`);
			continue;
		}
		for (const secret of resolved) {
			const name = secretEnvNames.get(groupId)?.get(secret.key);
			if (name) {
				envVars[name] = secret.value;
			}
		}
	}
}

/**
 * The host of a URL, without its port: what the proxy matches a request's host against. A URL with no authority
 * answers "".
 */
export function domainOf(rawUrl: string): string {
	const host = authorityOf(rawUrl);
	return splitHostPort(host)?.host ?? host;
}

/** The host and port of a URL's authority, without user info; "" when the URL has no authority. */
export function authorityOf(rawUrl: string): string {
	const match = /^[A-Za-z][A-Za-z0-9+.-]*:\/\/([^/?#]*)/.exec(rawUrl);
	if (!match) {
		return "";
	}
	const authority = match[1];
	return authority.slice(authority.lastIndexOf("@") + 1);
}

/** Splits `host:port` (`[v6]:port` for IPv6); undefined when there is no port to split off. */
export function splitHostPort(hostPort: string): { host: string; port: string } | undefined {
	if (hostPort.startsWith("[")) {
		const end = hostPort.indexOf("]");
		if (end < 0 || hostPort[end + 1] !== ":") {
			return undefined;
		}
		return { host: hostPort.slice(1, end), port: hostPort.slice(end + 2) };
	}
	const colon = hostPort.indexOf(":");
	if (colon < 0 || colon !== hostPort.lastIndexOf(":")) {
		return undefined;
	}
	return { host: hostPort.slice(0, colon), port: hostPort.slice(colon + 1) };
}
