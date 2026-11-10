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
import { ENVIRONMENTS, assertEnvironmentConfigured, missingEnvironmentUrls, resolveCloudEnvironment } from "../../src/config/environments";

describe("environments", () => {
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

	it("applies overrides to a built-in environment too", () => {
		const env = resolveCloudEnvironment("prod", { clientId: "WSO2_INTEGRATOR_EXTENSION_CANARY", apiBaseUrl: "http://localhost:8080/" });
		assert.equal(env.clientId, "WSO2_INTEGRATOR_EXTENSION_CANARY");
		assert.equal(env.apiBaseUrl, "http://localhost:8080/");
		assert.equal(env.issuer, ENVIRONMENTS.prod.issuer);
	});
});
