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
import { LoginError } from "../../src";
import type { DevantClient } from "../../src/devant/vscode";
import { DEVANT_PLATFORM, DEVANT_REGION_STATE_KEY, DevantUriReceiver, devantBackend } from "../../src/devant/vscode";
import { createPlatformClients, scopeForPlatform } from "../../src/vscode";
import { FakeSecretStorage, Uri, resetVscode, state } from "../doubles/vscode";
import { rejection } from "../support";
import { EU, US, fakeDevant } from "./fake-devant";

class FakeMemento {
	readonly values = new Map<string, unknown>();
	get<T>(key: string): T | undefined {
		return this.values.get(key) as T | undefined;
	}
	async update(key: string, value: unknown): Promise<void> {
		this.values.set(key, value);
	}
}

/** Waits until the sign-in page was opened, and answers the callback address the console was told. */
async function openedCallback(): Promise<string> {
	for (let i = 0; i < 200 && state.opened.length === 0; i++) {
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
	const opened = new URL(state.opened[0]);
	return JSON.parse(Buffer.from(opened.searchParams.get("state") ?? "", "base64").toString()).callbackUri;
}

/** A callback as VS Code hands it to the extension. */
function vscodeUri(value: string): never {
	return Uri.parse(value) as never;
}

/** The console's editor page: the code appended encoded, by a URL that encodes it again. */
function consoleRedirect(callbackUri: string, code: string, region: string): string {
	const url = new URL(callbackUri);
	url.searchParams.append("code", encodeURIComponent(code));
	url.searchParams.append("region", region);
	return url.toString();
}

describe("Devant callback receiver", () => {
	beforeEach(() => resetVscode());

	it("takes only Devant's callbacks, and reads the code the console encoded twice", async () => {
		const receiver = new DevantUriReceiver("wso2.wso2-integrator");
		const callbackUri = await receiver.callbackUri("n1");
		assert.equal(callbackUri, "vscode://wso2.wso2-integrator/signin?platform=devant&nonce=n1");
		assert.ok(!receiver.accepts(vscodeUri("vscode://wso2.wso2-integrator/signin?code=x")), "Choreo Cloud's callback is not Devant's");
		const waiting = receiver.waitForCallback("n1");
		const other = vscodeUri(consoleRedirect(callbackUri.replace("n1", "n2"), "c", "US"));
		assert.ok(receiver.accepts(other));
		assert.equal(receiver.pushUri(other), false, "a callback of another sign-in is left alone");
		const uri = vscodeUri(consoleRedirect(callbackUri, "a+b/c=d", "EU"));
		assert.equal(receiver.pushUri(uri), true);
		assert.deepEqual(await waiting, { code: "a+b/c=d", region: "EU" });
	});

	it("ends a sign-in waiting when it is disposed", async () => {
		const receiver = new DevantUriReceiver("wso2.wso2-integrator");
		const waiting = receiver.waitForCallback("n1");
		receiver.dispose();
		assert.ok((await rejection(waiting)) instanceof LoginError);
	});
});

describe("Devant as a platform", () => {
	beforeEach(() => resetVscode());

	it("is offered only where its deployment is described", () => {
		assert.ok(devantBackend());
		assert.equal(devantBackend({ deployment: "dev", env: {} }), undefined);
	});

	it("signs in through the console, follows the region signed in to, and switches organization", async () => {
		const fake = fakeDevant();
		const secrets = new FakeSecretStorage();
		const globalState = new FakeMemento();
		const backend = devantBackend({ env: {} });
		assert.ok(backend);
		const platform = createPlatformClients({
			extensionId: "wso2.wso2-integrator",
			context: { secrets, globalState, subscriptions: [] } as never,
			fetch: fake.fetch,
			backends: [backend],
			initialPlatform: DEVANT_PLATFORM,
		});
		try {
			assert.equal(platform.platform, DEVANT_PLATFORM);
			assert.equal(platform.environment.apiBaseUrl, US.apiHost);
			const environments: string[] = [];
			platform.onDidChangeEnvironment((environment) => environments.push(environment.apiBaseUrl));

			const signingIn = platform.auth.createSession(["env:prod", scopeForPlatform(DEVANT_PLATFORM)]);
			const callbackUri = await openedCallback();
			assert.ok(new URL(state.opened[0]).href.startsWith(`${US.consoleUrl}/login?`));
			const uri = vscodeUri(consoleRedirect(callbackUri, "code-1", "EU"));
			assert.ok(platform.uriReceiver?.accepts(uri));
			assert.equal(platform.uriReceiver?.pushUri(uri), true);
			const session = await signingIn;
			assert.equal(session.account.label, "dev@example.com (Acme)");

			const client = platform.backendClient<DevantClient>(DEVANT_PLATFORM);
			assert.ok(client);
			for (let i = 0; i < 100 && client.region !== "EU"; i++) {
				await new Promise((resolve) => setTimeout(resolve, 5));
			}
			assert.equal(client.region, "EU");
			assert.equal(platform.environment.apiBaseUrl, EU.apiHost);
			assert.deepEqual(environments, [EU.apiHost]);
			assert.equal(globalState.get(DEVANT_REGION_STATE_KEY), "EU");
			fake.route({ match: "POST /projects/1.0.0/graphql", body: { data: { projects: [{ id: "p1" }] } } });
			assert.deepEqual(await client.api.getProjects("101"), [{ id: "p1" }]);
			const call = fake.last("POST /projects/1.0.0/graphql");
			assert.equal(call?.url.host, "apis.eu.choreo.dev", "the API follows the region signed in to");
			assert.equal(call?.headers.authorization, `Bearer ${(await platform.sessions.current())?.tokens.accessToken}`);
			assert.ok(await secrets.get("wso2-cloud.devant.session.prod"), "Devant's session is kept apart from Choreo Cloud's");
			assert.equal(await secrets.get("wso2-cloud.session.prod"), undefined);

			const moved = await client.selectOrganization("beta");
			assert.equal(moved.org.handle, "beta");
			assert.equal((await platform.sessions.current())?.org.handle, "beta");
			assert.equal(fake.stsForms().at(-1)?.get("orgHandle"), "beta");
			await rejection(client.selectOrganization("gamma"));
		} finally {
			platform.dispose();
		}
	});
});
