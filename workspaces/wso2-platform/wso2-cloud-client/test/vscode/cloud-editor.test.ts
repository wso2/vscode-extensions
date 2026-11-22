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

import assert from "node:assert/strict";
import { CLOUD_EDITOR_TOKEN_ENV, ENVIRONMENTS, INJECTED_TOKEN_ENV, INJECTED_TOKEN_FILE_ENV, hasInjectedToken, readInjectedToken } from "../../src";
import { CLOUD_ENV_VARS, createPlatformClients } from "../../src/vscode";
import { unsignedJwt } from "../doubles";
import { FakeSecretStorage, resetVscode, state as vscodeState } from "../doubles/vscode";

/** The variables that choose an environment or hand in a token; cleared so each test sets its own. */
const VARS = [
	...CLOUD_ENV_VARS,
	INJECTED_TOKEN_ENV,
	INJECTED_TOKEN_FILE_ENV,
	CLOUD_EDITOR_TOKEN_ENV,
	"CLOUD_API_BASE_URL",
	"CLOUD_CONSOLE_URL",
	// Every override the environment is read from: one inherited from the shell would decide these tests.
	"WSO2_CLOUD_API_URL",
	"WSO2_CLOUD_ISSUER",
	"WSO2_CLOUD_OBSERVABILITY_URL",
	"WSO2_CLOUD_CONSOLE_URL",
	"WSO2_CLOUD_COPILOT_URL",
	"WSO2_CLOUD_CLIENT_ID",
];

/** A platform token as WSO2 Cloud's cloud editor is started with, issued by `issuer`. */
function editorToken(issuer: string): string {
	return unsignedJwt({
		iss: issuer,
		sub: "u1",
		client_id: "CONSOLE",
		ouId: "o1",
		ouName: "Acme",
		ouHandle: "acme",
		email: "someone@example.com",
		exp: Math.floor(Date.now() / 1000) + 3600,
	});
}

const context = () =>
	({ secrets: new FakeSecretStorage(), globalState: { get: () => undefined, update: async () => undefined }, subscriptions: [] }) as never;

describe("WSO2 Cloud's cloud editor", () => {
	let saved: Record<string, string | undefined>;
	beforeEach(() => {
		resetVscode();
		saved = Object.fromEntries(VARS.map((key) => [key, process.env[key]]));
		for (const key of VARS) {
			delete process.env[key];
		}
	});
	afterEach(() => {
		for (const key of VARS) {
			if (saved[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = saved[key];
			}
		}
	});

	it("takes the token the cloud editor is started with, after the WSO2_CLOUD_TOKEN variables", () => {
		assert.equal(hasInjectedToken({ [CLOUD_EDITOR_TOKEN_ENV]: "editor" }), true);
		assert.equal(readInjectedToken({ [CLOUD_EDITOR_TOKEN_ENV]: " editor " }), "editor");
		assert.equal(readInjectedToken({ [CLOUD_EDITOR_TOKEN_ENV]: "editor", [INJECTED_TOKEN_ENV]: "named" }), "named");
		assert.equal(hasInjectedToken({}), false);
	});

	for (const name of ["prod", "prod-eu", "stage"] as const) {
		it(`works in the environment that issued its token, ${name}, though it names none`, () => {
			process.env[CLOUD_EDITOR_TOKEN_ENV] = editorToken(ENVIRONMENTS[name].issuer);
			const platform = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context() });
			try {
				assert.equal(platform.injected, true, "no browser sign-in is offered");
				assert.equal(platform.tokenSource.kind, "injected");
				assert.equal(platform.environment.name, name);
				assert.deepEqual(
					platform.regions.map((region) => region.name),
					[name],
					"and it stays there",
				);
			} finally {
				platform.dispose();
			}
		});
	}

	it("follows the token's issuer over an environment the variables name", () => {
		process.env[CLOUD_ENV_VARS[1]] = "prod";
		process.env[CLOUD_EDITOR_TOKEN_ENV] = editorToken(`${ENVIRONMENTS["prod-eu"].issuer}/`);
		const platform = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context() });
		try {
			assert.equal(platform.environment.name, "prod-eu");
		} finally {
			platform.dispose();
		}
	});

	it("uses the configured environment when the token's issuer is not a built-in one, and does not send the token there", async () => {
		process.env[CLOUD_EDITOR_TOKEN_ENV] = editorToken("https://idp.example.invalid");
		const platform = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context() });
		try {
			assert.equal(platform.injected, true);
			assert.equal(platform.environment.name, "prod");
			await assert.rejects(platform.tokenSource.getAccessToken(), /issued for another environment/);
			assert.equal(await platform.tokenSource.getClaims(), undefined);
		} finally {
			platform.dispose();
		}
	});

	it("does not send a development token to production when the development deployment names no API", async () => {
		process.env.CLOUD_ENV = "dev";
		process.env[CLOUD_EDITOR_TOKEN_ENV] = editorToken("https://accounts.dev.example.com");
		const platform = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context() });
		try {
			assert.equal(platform.environment.name, "prod", "dev cannot be used without its API, so production is what is left");
			await assert.rejects(platform.tokenSource.getAccessToken(), /issued for another environment/);
		} finally {
			platform.dispose();
		}
	});

	it("says so when an override cannot be used, and stays in the environment that issued the token", () => {
		process.env.WSO2_CLOUD_CONSOLE_URL = "http://console.example.com";
		process.env[CLOUD_EDITOR_TOKEN_ENV] = editorToken(ENVIRONMENTS["prod-eu"].issuer);
		const platform = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context() });
		try {
			assert.equal(platform.environment.name, "prod-eu");
			assert.equal(platform.environment.consoleUrl, ENVIRONMENTS["prod-eu"].consoleUrl);
			assert.equal(vscodeState.warnings.length, 1);
			assert.match(vscodeState.warnings[0], /cannot be used .* using the prod-eu environment without overrides/);
		} finally {
			platform.dispose();
		}
	});

	it("works in a development deployment with what the editor is started with: its API, and its token's issuer", () => {
		process.env.CLOUD_ENV = "dev";
		process.env.CLOUD_API_BASE_URL = "https://api.dev.example.com/ipaas-api";
		process.env.CLOUD_CONSOLE_URL = "https://console.dev.example.com";
		process.env[CLOUD_EDITOR_TOKEN_ENV] = editorToken("https://accounts.dev.example.com");
		const platform = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context() });
		try {
			assert.equal(platform.environment.name, "dev");
			assert.equal(platform.environment.apiBaseUrl, "https://api.dev.example.com/ipaas-api");
			assert.equal(platform.environment.consoleUrl, "https://console.dev.example.com");
			assert.equal(platform.environment.issuer, "https://accounts.dev.example.com");
		} finally {
			platform.dispose();
		}
	});

	it("uses the API and the console the platform started the editor with, but only in an editor", () => {
		process.env.CLOUD_API_BASE_URL = "https://gateway.example.com/ipaas-api";
		process.env.CLOUD_CONSOLE_URL = "https://integration-console.example.com/";
		const desktop = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context() });
		try {
			assert.equal(desktop.environment.apiBaseUrl, ENVIRONMENTS.prod.apiBaseUrl, "outside an editor the names mean nothing");
			assert.equal(desktop.environment.consoleUrl, ENVIRONMENTS.prod.consoleUrl);
		} finally {
			desktop.dispose();
		}
		process.env[CLOUD_EDITOR_TOKEN_ENV] = editorToken(ENVIRONMENTS["prod-eu"].issuer);
		const editor = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context() });
		try {
			assert.equal(editor.environment.name, "prod-eu");
			assert.equal(editor.environment.apiBaseUrl, "https://gateway.example.com/ipaas-api");
			assert.equal(editor.environment.consoleUrl, "https://integration-console.example.com");
			assert.equal(editor.environment.issuer, ENVIRONMENTS["prod-eu"].issuer);
		} finally {
			editor.dispose();
		}
	});
});
