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
 * The WSO2 Cloud deployments the Integration Platform runs in. Production
 * runs in two regions, each a deployment of its own with its own identity
 * provider and API: `prod` in the United States and `prod-eu` in Europe.
 */
export type CloudEnvName = "dev" | "stage" | "prod" | "prod-eu";

export const CLOUD_ENV_NAMES: readonly CloudEnvName[] = ["dev", "stage", "prod", "prod-eu"];

/** Where a deployment that runs in more than one region runs, as the person choosing one is shown it. */
export interface CloudRegion {
	/** Short, for labels: `US`, `EU`. */
	readonly code: string;
	readonly label: string;
}

/**
 * Everything the client needs to know about one WSO2 Cloud deployment.

 * The ThunderID login token is sent to the API as it is, as the platform
 * console does.
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
	/**
	 * The WSO2 Integrator Copilot backend, empty where the deployment has none. A host exchanges the WSO2 Cloud token
	 * for a Copilot token only here, and a consumer sends its Copilot requests here.
	 */
	readonly copilotUrl: string;
	/** The public OAuth client registered for VS Code at this deployment's ThunderID. */
	readonly clientId: string;
	/** Set for an environment that is one region of a deployment running in several: see {@link regionsOf}. */
	readonly region?: CloudRegion;
}

// Stage and the two production regions carry their published hosts. The
// development deployment is internal and its hosts stay out of this
// repository: with `dev`, every URL comes from the overrides
// (`WSO2_CLOUD_API_URL`, `WSO2_CLOUD_ISSUER`, `WSO2_CLOUD_OBSERVABILITY_URL`,
// `WSO2_CLOUD_CONSOLE_URL`, `WSO2_CLOUD_COPILOT_URL`). Stage has no Copilot
// backend yet.
export const ENVIRONMENTS: Readonly<Record<CloudEnvName, CloudEnvironment>> = {
	dev: {
		name: "dev",
		apiBaseUrl: "",
		issuer: "",
		observabilityBaseUrl: "",
		consoleUrl: "",
		copilotUrl: "",
		clientId: "WSO2_INTEGRATOR_EXTENSION",
	},
	stage: {
		name: "stage",
		apiBaseUrl: "https://api.stg.cloud.choreolabs.com/ipaas-service-ipaas-api-endpoint",
		issuer: "https://accounts.stg.cloud.choreolabs.com",
		observabilityBaseUrl: "https://cloud-obs-proxy.obs.dp.stg.cloud.choreolabs.io/wso2cloud-obs",
		consoleUrl: "https://console.stg.cloud.choreolabs.com",
		copilotUrl: "",
		clientId: "WSO2_INTEGRATOR_EXTENSION",
	},
	prod: {
		name: "prod",
		apiBaseUrl: "https://api.cloud.choreolabs.com/ipaas-service-ipaas-api-endpoint",
		issuer: "https://accounts.cloud.choreolabs.com",
		observabilityBaseUrl: "https://cloud-obs-proxy.obs.dp.us.cloud.choreolabs.io/wso2cloud-obs",
		consoleUrl: "https://console.cloud.choreolabs.com",
		copilotUrl: "https://apis.devant.dev/copilot",
		clientId: "WSO2_INTEGRATOR_EXTENSION",
		region: { code: "US", label: "United States" },
	},
	"prod-eu": {
		name: "prod-eu",
		apiBaseUrl: "https://api.eu.cloud.choreolabs.com/ipaas-service-ipaas-api-endpoint",
		issuer: "https://accounts.eu.cloud.choreolabs.com",
		observabilityBaseUrl: "https://cloud-obs-proxy.obs.dp.eu.cloud.choreolabs.io/wso2cloud-obs",
		consoleUrl: "https://console.eu.cloud.choreolabs.com",
		copilotUrl: "https://366b8031-ab7f-4a98-a1bd-3369fbd00eee-prod.e1-eu-west-cdp.choreoapis.dev/copilot",
		clientId: "WSO2_INTEGRATOR_EXTENSION",
		region: { code: "EU", label: "Europe" },
	},
};

/**
 * Whether `name` names a deployment as a person chooses one in the settings:
 * `dev`, `stage` or `prod`. Production's region is chosen when signing in, so
 * the settings name no region; a variable can (the cloud editor's).
 */
export function isCloudDeploymentName(value: unknown): value is CloudEnvName {
	return isCloudEnvName(value) && regionsOf(value)[0] === value;
}

/** The environments that are regions of one deployment, in the order they are offered. */
const REGION_GROUPS: readonly (readonly CloudEnvName[])[] = [["prod", "prod-eu"]];

/**
 * The regions of the deployment `name` belongs to, `name` among them. A
 * deployment that runs in one region has only `name`. Each region keeps its
 * own sessions: a person may be signed in to each, and a token is only ever
 * sent to its own region's hosts.
 */
export function regionsOf(name: CloudEnvName): readonly CloudEnvName[] {
	return REGION_GROUPS.find((group) => group.includes(name)) ?? [name];
}

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
export const ENVIRONMENT_URL_KEYS = ["apiBaseUrl", "issuer", "observabilityBaseUrl", "consoleUrl", "copilotUrl"] as const;

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
		throw new Error(`The Choreo Cloud environment "${environment.name}" has no ${missing.join(" or ")} configured; ${hint}.`);
	}
	return environment;
}

/** Trims a trailing slash so paths can always be appended with a leading one. */
export function trimBaseUrl(url: string): string {
	return url.replace(/\/+$/, "");
}
