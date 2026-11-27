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

import { readFileSync } from "node:fs";
import type { CloudEnvName, CloudEnvironment } from "../config/environments";
import { ENVIRONMENTS } from "../config/environments";
import { BadRequestError, errorMessage } from "../errors";

/** The regions Devant runs in; a person's organizations live in one of them. */
export type DevantRegion = "US" | "EU";

export const DEVANT_REGIONS: readonly DevantRegion[] = ["US", "EU"];

/** One region of a Devant deployment: the hosts and public OAuth clients its API is reached through. */
export interface DevantDeployment {
	/** `prod`, `stage` or `dev`: the deployment, whatever the region. */
	readonly deployment: CloudEnvName;
	readonly region: DevantRegion;
	/** The Devant console: sign-in, its editor callback page and links. */
	readonly consoleUrl: string;
	/** Asgardeo's token endpoint, where the console's authorization code is exchanged. */
	readonly asgardeoTokenUrl: string;
	/** The public Asgardeo client Devant's console signs in with for editors. */
	readonly asgardeoClientId: string;
	/** The API gateway every Devant service is under (`/projects/1.0.0/graphql`, `/devops/1.0.0`, ...). */
	readonly apiHost: string;
	/** The platform's token service, which exchanges the Asgardeo token for an organization's token. */
	readonly stsTokenUrl: string;
	readonly stsClientId: string;
	readonly stsScopes: readonly string[];
	readonly apimPublisherUrl: string;
	readonly billingUrl: string;
	/** The prefix of the data plane's system API hosts, which build logs are read through. */
	readonly sysApiPrefixUrl: string;
	readonly appHost: string;
	readonly githubApp: { readonly clientId: string; readonly installUrl: string };
	/** The Copilot backend of this region, empty where there is none. */
	readonly copilotUrl: string;
}

/** The scopes the token service grants an editor, as the Choreo CLI asked for them. */
const CLIENT_SCOPES = [
	"choreo:log_view_prod",
	"choreo:log_view_non_prod",
	"apim:api_manage",
	"apim:subscription_manage",
	"apim:tier_manage",
	"apim:admin",
	"apim:publisher_settings",
	"environments:view_prod",
	"environments:view_dev",
	"choreo:user_manage",
	"choreo:role_manage",
	"apim:dcr:app_manage",
	"choreo:deployment_manage",
	"choreo:non_prod_env_manage",
	"choreo:prod_env_manage",
	"choreo:component_manage",
	"choreo:project_manage",
	"apim:api_publish",
	"apim:document_manage",
	"apim:api_settings",
	"apim:subscription_view",
	"choreo:env_manage",
	"choreo:log_view",
];

/** The system scopes of a deployment's services, named under `prefix` (`urn:choreosystem`). */
export function systemScopes(prefix: string): string[] {
	return [
		`${prefix}:componentutils:component_manage`,
		`${prefix}:componentutils:component_file_view`,
		`${prefix}:configmanagement:config_create`,
		`${prefix}:configmanagement:config_delete`,
		`${prefix}:configmanagement:config_manage`,
		`${prefix}:configmanagement:config_view`,
		`${prefix}:componentsmanagement:component_create`,
		`${prefix}:choreodevopsportalapi:component_manage`,
		`${prefix}:choreodevopsportalapi:deployment_manage`,
		`${prefix}:choreodevopsportalapi:deployment_view`,
		`${prefix}:componentsmanagement:component_logs_view`,
		`${prefix}:componentsmanagement:component_init_view`,
		"choreo:project_view",
		`${prefix}:organizationapi:org_manage`,
		`${prefix}:componentsmanagement:component_file_view`,
		`${prefix}:componentsmanagement:component_manage`,
		"choreo:domain_manage",
		"choreo:domain_view",
		"choreo:url_mapping_manage",
		"choreo:url_mapping_approve",
		"choreo:url_mapping_view",
		"apim:environment_manage",
	];
}

const PROD_SCOPES = [...CLIENT_SCOPES, ...systemScopes("urn:choreosystem")];

/**
 * Devant's production regions. The development and staging deployments are internal, so their hosts and clients
 * stay out of this repository; they come from the file {@link DEVANT_CONFIG_VAR} names.
 */
export const DEVANT_PRODUCTION: Readonly<Record<DevantRegion, DevantDeployment>> = {
	US: {
		deployment: "prod",
		region: "US",
		consoleUrl: "https://console.devant.dev",
		asgardeoTokenUrl: "https://api.asgardeo.io/t/a/oauth2/token",
		asgardeoClientId: "09YlJuqQZdFNRDC0sx3DHHDnZvIa",
		apiHost: "https://apis.choreo.dev",
		stsTokenUrl: "https://sts.choreo.dev/oauth2/token",
		stsClientId: "Fu48ZbRFQsvzGe3ZVkGt2W5K1yga",
		stsScopes: PROD_SCOPES,
		apimPublisherUrl: "https://sts.choreo.dev/api/am/publisher/v2",
		billingUrl: "https://subscriptions.wso2.com",
		sysApiPrefixUrl: "https://5659b6b7-1063-41ed-8e39-d91857699255-systemapis",
		appHost: "https://app.choreo.dev",
		githubApp: { clientId: "Iv1.804167a242012c66", installUrl: "https://github.com/apps/wso2-cloud-app/installations/new" },
		copilotUrl: ENVIRONMENTS.prod.copilotUrl,
	},
	EU: {
		deployment: "prod",
		region: "EU",
		consoleUrl: "https://console.eu.devant.dev",
		asgardeoTokenUrl: "https://api.eu.asgardeo.io/t/a/oauth2/token",
		asgardeoClientId: "IIQPy5qNaETGE_aGXr8nkV5GszYa",
		apiHost: "https://apis.eu.choreo.dev",
		stsTokenUrl: "https://sts.eu.choreo.dev/oauth2/token",
		stsClientId: "choreoclif3b070a3d4866bb5",
		stsScopes: PROD_SCOPES,
		apimPublisherUrl: "https://sts.eu.choreo.dev/api/am/publisher/v2",
		billingUrl: "https://subscriptions.eu.wso2.com",
		sysApiPrefixUrl: "https://525aafa3-b9c1-4d4e-b8fb-18fd0e39b137-systemapis",
		appHost: "https://app.eu.choreo.dev",
		githubApp: { clientId: "Iv1.804167a242012c66", installUrl: "https://github.com/apps/wso2-cloud-app/installations/new" },
		copilotUrl: ENVIRONMENTS["prod-eu"].copilotUrl,
	},
};

/**
 * The variable naming a JSON file that describes a Devant deployment other than production:
 * `{ "US": DevantDeployment, "EU": DevantDeployment }`, each without `deployment`, which is the name of the
 * environment it is read for. `stsScopes` may be given as a `scopePrefix` (`urn:choreocontrolplane`) instead.
 */
export const DEVANT_CONFIG_VAR = "WSO2_DEVANT_CONFIG";

/**
 * The regions of the Devant deployment `name` names: production's built in, another's read from the file
 * {@link DEVANT_CONFIG_VAR} names. Undefined when the deployment has no description, as dev and stage have none
 * unless the file is given.
 */
export function devantDeployment(
	name: CloudEnvName,
	env: NodeJS.ProcessEnv = process.env,
): Readonly<Record<DevantRegion, DevantDeployment>> | undefined {
	const deployment = name === "prod-eu" ? "prod" : name;
	const file = env[DEVANT_CONFIG_VAR]?.trim();
	if (file) {
		return readDeploymentFile(file, deployment);
	}
	return deployment === "prod" ? DEVANT_PRODUCTION : undefined;
}

function readDeploymentFile(file: string, deployment: CloudEnvName): Readonly<Record<DevantRegion, DevantDeployment>> {
	let parsed: Record<string, Record<string, unknown>>;
	try {
		parsed = JSON.parse(readFileSync(file, "utf8")) as Record<string, Record<string, unknown>>;
	} catch (error) {
		throw new BadRequestError(`${DEVANT_CONFIG_VAR} names ${file}, which cannot be read as JSON: ${errorMessage(error)}`);
	}
	const regions = {} as Record<DevantRegion, DevantDeployment>;
	for (const region of DEVANT_REGIONS) {
		const raw = parsed?.[region];
		if (!raw || typeof raw !== "object") {
			throw new BadRequestError(`${file} describes no ${region} region.`);
		}
		const scopes = Array.isArray(raw.stsScopes)
			? (raw.stsScopes as string[])
			: [...CLIENT_SCOPES, ...systemScopes(typeof raw.scopePrefix === "string" ? raw.scopePrefix : "urn:choreosystem")];
		const defaults = { copilotUrl: "", billingUrl: "", sysApiPrefixUrl: "", appHost: "", apimPublisherUrl: "" };
		const entry = { ...defaults, ...raw, deployment, region, stsScopes: scopes } as unknown as DevantDeployment;
		for (const key of ["consoleUrl", "asgardeoTokenUrl", "asgardeoClientId", "apiHost", "stsTokenUrl", "stsClientId"] as const) {
			if (typeof entry[key] !== "string" || !entry[key]) {
				throw new BadRequestError(`${file} gives the ${region} region no ${key}.`);
			}
		}
		regions[region] = entry;
	}
	return regions;
}

/**
 * A Devant region as the shared clients describe an environment. `name` is what a consumer asks for sessions with:
 * production's regions are `prod` and `prod-eu`, as for Choreo Cloud; another deployment keeps its name in both.
 */
export function asCloudEnvironment(deployment: DevantDeployment): CloudEnvironment {
	const name: CloudEnvName = deployment.deployment === "prod" && deployment.region === "EU" ? "prod-eu" : deployment.deployment;
	return {
		name,
		apiBaseUrl: deployment.apiHost,
		issuer: deployment.stsTokenUrl,
		observabilityBaseUrl: "",
		consoleUrl: deployment.consoleUrl,
		copilotUrl: deployment.copilotUrl,
		clientId: deployment.asgardeoClientId,
		region: { code: deployment.region, label: deployment.region === "EU" ? "Europe" : "United States" },
	};
}
