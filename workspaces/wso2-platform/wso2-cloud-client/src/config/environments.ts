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

/** The WSO2 Cloud deployments the Integration Platform runs in. */
export type CloudEnvName = "dev" | "stage" | "prod";

export const CLOUD_ENV_NAMES: readonly CloudEnvName[] = ["dev", "stage", "prod"];

/**
 * Everything the client needs to know about one WSO2 Cloud deployment.
 *
 * `tokenExchange` says how the login token reaches the API: `"none"` sends the
 * ThunderID login token itself, as the platform console does; `"resource"`
 * exchanges it (RFC 8693) for one bound to the API's resource first. The
 * platform accepts the login token today, so `"none"` is the default and the
 * exchange stays available as a one-line switch.
 */
export interface CloudEnvironment {
	readonly name: CloudEnvName;
	/** The Integration Platform API (ipaas-service), including its path prefix. */
	readonly apiBaseUrl: string;
	/** The ThunderID issuer the OpenID discovery document is read from. */
	readonly issuer: string;
	/** WSO2 Cloud's observability proxy, which build and runtime logs are read from. */
	readonly observabilityBaseUrl: string;
	/** The Integration Platform console, for links. */
	readonly consoleUrl: string;
	/** The public OAuth client registered for VS Code at this deployment's ThunderID. */
	readonly clientId: string;
	readonly tokenExchange: "none" | "resource";
}

// Stage and prod carry the documented API and issuer hosts; their observability
// proxy, console URL and client id are platform dependencies to be confirmed
// before those environments are used. The development deployment is internal
// and its hosts stay out of this repository: with `dev`, every URL comes from
// the overrides (`WSO2_CLOUD_API_URL`, `WSO2_CLOUD_ISSUER`,
// `WSO2_CLOUD_OBSERVABILITY_URL`, `WSO2_CLOUD_CONSOLE_URL`).
export const ENVIRONMENTS: Readonly<Record<CloudEnvName, CloudEnvironment>> = {
	dev: {
		name: "dev",
		apiBaseUrl: "",
		issuer: "",
		observabilityBaseUrl: "",
		consoleUrl: "",
		clientId: "WSO2_INTEGRATOR_EXTENSION",
		tokenExchange: "none",
	},
	stage: {
		name: "stage",
		apiBaseUrl: "https://stage-wso2cloud.gateway.stg.cloud.wso2.com/ipaas-service-ipaas-api-endpoint",
		issuer: "https://accounts.stg.cloud.wso2.com",
		observabilityBaseUrl: "https://cloud-obs-proxy.obs.dp.stg.cloud.wso2.com/wso2cloud-obs",
		consoleUrl: "https://console.stg.cloud.wso2.com",
		clientId: "WSO2_INTEGRATOR_EXTENSION",
		tokenExchange: "none",
	},
	prod: {
		name: "prod",
		apiBaseUrl: "https://production-wso2cloud.gateway.cloud.wso2.com/ipaas-service-ipaas-api-endpoint",
		issuer: "https://accounts.cloud.wso2.com",
		observabilityBaseUrl: "https://cloud-obs-proxy.obs.dp.cloud.wso2.com/wso2cloud-obs",
		consoleUrl: "https://console.cloud.wso2.com",
		clientId: "WSO2_INTEGRATOR_EXTENSION",
		tokenExchange: "none",
	},
};

/** Whether `value` names one of the environments. */
export function isCloudEnvName(value: unknown): value is CloudEnvName {
	return typeof value === "string" && (CLOUD_ENV_NAMES as readonly string[]).includes(value);
}

/**
 * Picks the environment `name` names, `prod` when it names none, and applies
 * any overrides on top (a hidden setting, an environment variable).
 */
export function resolveCloudEnvironment(name: string | undefined, overrides: Partial<Omit<CloudEnvironment, "name">> = {}): CloudEnvironment {
	const base = ENVIRONMENTS[isCloudEnvName(name) ? name : "prod"];
	const applied: Partial<CloudEnvironment> = {};
	for (const [key, value] of Object.entries(overrides)) {
		if (value !== undefined && value !== "") {
			if ((ENVIRONMENT_URL_KEYS as readonly string[]).includes(key)) {
				assertSecureUrl(key, value as string);
			}
			(applied as Record<string, unknown>)[key] = value;
		}
	}
	return { ...base, ...applied };
}

/** The members of an environment that are URLs a token or a browser is sent to. */
export const ENVIRONMENT_URL_KEYS = ["apiBaseUrl", "issuer", "observabilityBaseUrl", "consoleUrl"] as const;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * A URL an override may point the client at: `https`, or `http` on this
 * machine only (a developer's local service). Anything else would send
 * bearer tokens in the clear, so it is refused.
 */
export function assertSecureUrl(name: string, value: string): void {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error(`The ${name} override "${value}" is not a URL.`);
	}
	if (url.protocol === "https:" || (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname))) {
		return;
	}
	throw new Error(`The ${name} override "${value}" must use https (http is allowed for localhost only).`);
}

/** The URLs an environment must carry before a client can be built on it; the ones a `dev` environment gets from overrides. */
export const REQUIRED_ENVIRONMENT_URLS = ["apiBaseUrl", "issuer"] as const;

/** The names of the URLs an environment still lacks, empty when it is usable. */
export function missingEnvironmentUrls(environment: CloudEnvironment): string[] {
	return REQUIRED_ENVIRONMENT_URLS.filter((key) => !environment[key]);
}

/** Throws when the environment cannot be used, naming what to set. */
export function assertEnvironmentConfigured(environment: CloudEnvironment, hint = "set WSO2_CLOUD_API_URL and WSO2_CLOUD_ISSUER"): CloudEnvironment {
	const missing = missingEnvironmentUrls(environment);
	if (missing.length > 0) {
		throw new Error(`The WSO2 Cloud environment "${environment.name}" has no ${missing.join(" or ")} configured; ${hint}.`);
	}
	return environment;
}

/** Trims a trailing slash so paths can always be appended with a leading one. */
export function trimBaseUrl(url: string): string {
	return url.replace(/\/+$/, "");
}
