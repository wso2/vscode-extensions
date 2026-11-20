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

import * as assert from "node:assert/strict";
import {
	ENVIRONMENTS,
	assertEnvironmentConfigured,
	isCloudDeploymentName,
	isCloudEnvName,
	missingEnvironmentUrls,
	regionsOf,
	resolveCloudEnvironment,
} from "../../src/config/environments";

describe("environments", () => {
	it("runs production in the United States and Europe, each on its own hosts", () => {
		assert.ok(isCloudEnvName("prod-eu"));
		assert.deepEqual(regionsOf("prod"), ["prod", "prod-eu"]);
		assert.deepEqual(regionsOf("prod-eu"), ["prod", "prod-eu"]);
		assert.deepEqual(regionsOf("stage"), ["stage"]);
		assert.ok(isCloudDeploymentName("prod") && isCloudDeploymentName("stage") && isCloudDeploymentName("dev"));
		assert.ok(!isCloudDeploymentName("prod-eu"), "a region of production is not a deployment of its own");
		const us = ENVIRONMENTS.prod;
		const eu = ENVIRONMENTS["prod-eu"];
		assert.equal(us.region?.code, "US");
		assert.equal(eu.region?.code, "EU");
		for (const key of ["apiBaseUrl", "issuer", "observabilityBaseUrl", "consoleUrl", "copilotUrl"] as const) {
			assert.ok(eu[key].startsWith("https://"), key);
			assert.notEqual(new URL(eu[key]).host, new URL(us[key]).host, `${key} is Europe's own`);
		}
	});

	it("falls back to prod for an unknown name and keeps the built-in hosts", () => {
		const env = resolveCloudEnvironment("nope");
		assert.equal(env.name, "prod");
		assert.equal(env, env);
		assert.deepEqual(missingEnvironmentUrls(env), []);
		assert.ok(ENVIRONMENTS.stage.apiBaseUrl.startsWith("https://"));
	});

	it("keeps the internal development hosts out of the package and takes them from overrides", () => {
		assert.deepEqual(missingEnvironmentUrls(ENVIRONMENTS.dev), ["apiBaseUrl", "issuer"]);
		assert.throws(
			() => assertEnvironmentConfigured(resolveCloudEnvironment("dev")),
			/"dev" has no apiBaseUrl or issuer configured; set WSO2_CLOUD_API_URL/,
		);

		const env = resolveCloudEnvironment("dev", {
			apiBaseUrl: "https://api.dev.example/ipaas",
			issuer: "https://idp.dev.example",
			observabilityBaseUrl: "",
			clientId: undefined,
		});
		assert.equal(env.apiBaseUrl, "https://api.dev.example/ipaas");
		assert.equal(env.issuer, "https://idp.dev.example");
		assert.equal(env.clientId, "WSO2_INTEGRATOR_EXTENSION", "an empty or undefined override keeps the default");
		assert.equal(assertEnvironmentConfigured(env), env);
	});

	it("names Copilot's backend for production only, and takes dev's from an override", () => {
		assert.equal(ENVIRONMENTS.prod.copilotUrl, "https://apis.devant.dev/copilot");
		assert.ok(ENVIRONMENTS["prod-eu"].copilotUrl.startsWith("https://"));
		assert.equal(ENVIRONMENTS.stage.copilotUrl, "", "stage has no Copilot backend yet");
		assert.equal(ENVIRONMENTS.dev.copilotUrl, "", "dev's hosts are not in the package");
		assert.equal(
			resolveCloudEnvironment("dev", { copilotUrl: "https://copilot.dev.example/copilot" }).copilotUrl,
			"https://copilot.dev.example/copilot",
		);
		assert.throws(
			() => resolveCloudEnvironment("dev", { copilotUrl: "http://copilot.dev.example/copilot" }),
			/copilotUrl override .* must use https/,
		);
	});

	it("applies overrides to a built-in environment too", () => {
		const env = resolveCloudEnvironment("prod", { clientId: "WSO2_INTEGRATOR_EXTENSION_CANARY", apiBaseUrl: "http://localhost:8080/" });
		assert.equal(env.clientId, "WSO2_INTEGRATOR_EXTENSION_CANARY");
		assert.equal(env.apiBaseUrl, "http://localhost:8080/");
		assert.equal(env.issuer, ENVIRONMENTS.prod.issuer);
	});
});
