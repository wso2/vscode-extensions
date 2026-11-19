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
import { ENVIRONMENTS, InMemorySessionStore, SessionManager, type StoredSession, isCloudError } from "../../src";
import {
	ApiKeys,
	CLOUD_ENV_VARS,
	CLOUD_REGION_STATE_KEY,
	SecretStorageSessionStore,
	WSO2CloudAuthenticationProvider,
	createPlatformClients,
} from "../../src/vscode";
import { StaticTokenSource } from "../doubles";
import { FakeSecretStorage, resetVscode } from "../doubles/vscode";
import { rejection } from "../support";

/** The variables that choose or pin an environment, or inject a token; cleared so the settings decide. */
const VARS = [
	...CLOUD_ENV_VARS,
	"WSO2_CLOUD_API_URL",
	"WSO2_CLOUD_ISSUER",
	"WSO2_CLOUD_OBSERVABILITY_URL",
	"WSO2_CLOUD_CONSOLE_URL",
	"WSO2_CLOUD_CLIENT_ID",
	"WSO2_CLOUD_TOKEN",
	"WSO2_CLOUD_TOKEN_FILE",
];

/** Secret storage whose reads wait until `release` is called, to hold a session read in flight. */
class HeldSecretStorage extends FakeSecretStorage {
	private gate: Promise<void> = Promise.resolve();
	release: () => void = () => undefined;
	hold(): void {
		this.gate = new Promise((resolve) => {
			this.release = resolve;
		});
	}
	override async get(key: string): Promise<string | undefined> {
		await this.gate;
		return super.get(key);
	}
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

class FakeMemento {
	readonly values = new Map<string, unknown>();
	get<T>(key: string): T | undefined {
		return this.values.get(key) as T | undefined;
	}
	async update(key: string, value: unknown): Promise<void> {
		this.values.set(key, value);
	}
}

function session(env: StoredSession["env"], email: string): StoredSession {
	const exp = Math.floor(Date.now() / 1000) + 3600;
	return {
		version: 1,
		env,
		issuer: `https://${env}.idp.example.invalid`,
		clientId: "WSO2_INTEGRATOR_EXTENSION",
		tokens: { accessToken: `${env}-token`, expiresAt: new Date(exp * 1000).toISOString(), scope: "openid" },
		claims: {
			sub: email,
			iss: `https://${env}.idp.example.invalid`,
			client_id: "WSO2_INTEGRATOR_EXTENSION",
			ouId: "o1",
			ouName: "Acme",
			ouHandle: "acme",
			exp,
			email,
		},
		org: { id: "o1", handle: "acme", name: "Acme" },
		account: { id: email, label: email },
		obtainedVia: "browser",
		createdAt: new Date().toISOString(),
	};
}

describe("production regions", () => {
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

	const context = (secrets: FakeSecretStorage, globalState: FakeMemento) => ({ secrets, globalState, subscriptions: [] }) as never;

	it("switches between the United States and Europe live, each with its own session, and remembers the choice", async () => {
		const secrets = new FakeSecretStorage();
		const globalState = new FakeMemento();
		await new SecretStorageSessionStore(secrets as never).save(session("prod-eu", "eu@example.com"));
		const platform = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context(secrets, globalState) });
		try {
			assert.equal(platform.environment.name, "prod");
			assert.deepEqual(
				platform.regions.map((region) => region.name),
				["prod", "prod-eu"],
			);
			assert.equal(await platform.sessions.current(), undefined, "no one is signed in to the United States");

			const providerEvents: { added: number; removed: number }[] = [];
			platform.auth.onDidChangeSessions((event) => providerEvents.push({ added: event.added?.length ?? 0, removed: event.removed?.length ?? 0 }));
			const environments: string[] = [];
			platform.onDidChangeEnvironment((environment) => environments.push(environment.name));
			const usCloud = platform.cloud;
			const usKey = platform.apiKeys.current();

			await platform.switchEnvironment("prod-eu");
			assert.equal(platform.environment.name, "prod-eu");
			assert.equal(platform.environment.issuer, "https://accounts.eu.cloud.choreolabs.com");
			assert.notEqual(platform.cloud, usCloud, "Europe has its own API client");
			assert.equal((await platform.sessions.current())?.account.id, "eu@example.com");
			assert.deepEqual(environments, ["prod-eu"]);
			assert.deepEqual(providerEvents, [{ added: 1, removed: 0 }]);
			assert.notEqual(platform.apiKeys.current(), usKey, "a key handed out for the other region stops working");
			const [granted] = await platform.auth.getSessions(["env:prod-eu"]);
			assert.equal(
				granted.account.label,
				"eu@example.com (Acme)",
				"the label stays the same across regions, so access granted to another extension carries over",
			);
			assert.deepEqual(await platform.auth.getSessions(["env:prod"]), [], "the region left is not served");
			assert.deepEqual(globalState.get(CLOUD_REGION_STATE_KEY), { configured: "prod", chosen: "prod-eu" });

			const restarted = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context(secrets, globalState) });
			assert.equal(restarted.environment.name, "prod-eu", "the next start begins where the person left");
			restarted.dispose();

			const sessionEvents: string[] = [];
			platform.onDidChangeSession((event) => sessionEvents.push(event.reason));
			await platform.switchEnvironment("prod");
			assert.equal(await platform.sessions.current(), undefined);
			assert.deepEqual(providerEvents.at(-1), { added: 0, removed: 1 });
			await platform.switchEnvironment("prod-eu");
			await platform.sessions.signOut({ revoke: false });
			assert.deepEqual(sessionEvents, ["signed-out"], "session events follow the region in use");
			assert.equal(await new SecretStorageSessionStore(secrets as never).load("prod-eu"), undefined);

			const refused = await rejection(platform.switchEnvironment("stage"));
			assert.ok(isCloudError(refused) && refused.code === "bad_request");
			assert.equal(platform.environment.name, "prod-eu");
		} finally {
			platform.dispose();
		}
	});

	it("moves the clients, the provider and the key together, and drops a session read the switch overtook", async () => {
		const secrets = new HeldSecretStorage();
		await new SecretStorageSessionStore(secrets as never).save(session("prod", "us@example.com"));
		const platform = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context(secrets, new FakeMemento()) });
		try {
			const usKey = platform.apiKeys.current();
			const seen: { oldKeyValid: boolean; served: Promise<unknown[]> }[] = [];
			platform.onDidChangeEnvironment(() =>
				seen.push({ oldKeyValid: platform.apiKeys.verify(usKey), served: platform.auth.getSessions(["env:prod"]) }),
			);
			secrets.hold();
			const usRead = platform.auth.getSessions(["env:prod"]);
			const switching = platform.switchEnvironment("prod-eu");
			await tick();
			secrets.release();
			await switching;
			assert.deepEqual(await usRead, [], "the United States session is not handed out with Europe's key");
			assert.equal(seen.length, 1);
			assert.equal(seen[0].oldKeyValid, false, "the old key is gone when the switch is announced");
			assert.deepEqual(await seen[0].served, [], "the provider already serves Europe");
		} finally {
			platform.dispose();
		}
	});

	it("keeps a sign-in in the region it started in, and ends it as cancelled when the region changes", async () => {
		const store = new InMemorySessionStore();
		const fetch = async () => new Response("{}");
		let finishLogin: (value: StoredSession) => void = () => undefined;
		const us = {
			env: ENVIRONMENTS.prod,
			sessions: new SessionManager({ env: ENVIRONMENTS.prod, store, fetch }),
			tokenSource: new StaticTokenSource("t"),
			startLogin: () =>
				new Promise<StoredSession>((resolve) => {
					finishLogin = resolve;
				}),
		};
		const eu = {
			env: ENVIRONMENTS["prod-eu"],
			sessions: new SessionManager({ env: ENVIRONMENTS["prod-eu"], store, fetch }),
			tokenSource: new StaticTokenSource("t"),
		};
		const provider = new WSO2CloudAuthenticationProvider({ ...us, apiKeys: new ApiKeys() });
		try {
			const signingIn = provider.createSession(["env:prod"]);
			await tick();
			await provider.useRegion(eu);
			finishLogin(session("prod", "us@example.com"));
			const refused = await rejection(signingIn);
			assert.ok(isCloudError(refused) && refused.code === "login_cancelled", String(refused));
			assert.equal((await us.sessions.current())?.account.id, "us@example.com", "the session is kept in its own region");
			assert.equal(await eu.sessions.current(), undefined, "and not in the region switched to");
		} finally {
			provider.dispose();
		}
	});

	it("does not let a sign-in finishing in a region left write over a newer sign-in there", async () => {
		const store = new InMemorySessionStore();
		const fetch = async () => new Response("{}");
		let orgRead: (org: { id: string; handle: string; name: string }) => void = () => undefined;
		const region = (env: "prod" | "prod-eu") => ({
			env: ENVIRONMENTS[env],
			sessions: new SessionManager({ env: ENVIRONMENTS[env], store, fetch }),
			tokenSource: new StaticTokenSource("t"),
		});
		const usBefore = {
			...region("prod"),
			startLogin: async () => session("prod", "first@example.com"),
			resolveOrg: () =>
				new Promise<{ id: string; handle: string; name: string }>((resolve) => {
					orgRead = resolve;
				}),
		};
		const provider = new WSO2CloudAuthenticationProvider({ ...usBefore, apiKeys: new ApiKeys() });
		try {
			const first = provider.createSession(["env:prod"]);
			await tick();
			await provider.useRegion(region("prod-eu"));
			const usAgain = region("prod");
			await provider.useRegion(usAgain);
			await usAgain.sessions.setSession(session("prod", "second@example.com"));
			orgRead({ id: "o1", handle: "acme", name: "Acme Renamed" });
			const refused = await rejection(first);
			assert.ok(isCloudError(refused) && refused.code === "login_cancelled", String(refused));
			const kept = await store.load("prod");
			assert.equal(kept?.account.id, "second@example.com", "the newer sign-in is kept");
			assert.equal(kept?.org.name, "Acme", "and not given the first sign-in's organization");
		} finally {
			provider.dispose();
		}
	});

	it("does not remember a region a switch reached after the clients were disposed", async () => {
		const secrets = new HeldSecretStorage();
		const globalState = new FakeMemento();
		const platform = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context(secrets, globalState) });
		secrets.hold();
		const switching = platform.switchEnvironment("prod-eu");
		await tick();
		platform.dispose();
		secrets.release();
		await switching;
		assert.equal(globalState.get(CLOUD_REGION_STATE_KEY), undefined);
	});

	it("does not switch once disposed", async () => {
		const platform = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context(new FakeSecretStorage(), new FakeMemento()) });
		const queued = platform.switchEnvironment("prod-eu");
		platform.dispose();
		assert.ok(isCloudError(await rejection(queued)));
		assert.equal(platform.environment.name, "prod");
	});

	it("does not switch an environment a variable or an override fixes, nor take a choice made under another setting", async () => {
		const globalState = new FakeMemento();
		globalState.values.set(CLOUD_REGION_STATE_KEY, { configured: "stage", chosen: "prod-eu" });
		const unpinned = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context(new FakeSecretStorage(), globalState) });
		assert.equal(unpinned.environment.name, "prod", "a choice made while the settings named stage is not taken for prod");
		unpinned.dispose();

		process.env.WSO2_CLOUD_ENV = "prod";
		const pinned = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context(new FakeSecretStorage(), new FakeMemento()) });
		try {
			assert.deepEqual(
				pinned.regions.map((region) => region.name),
				["prod"],
			);
			assert.ok(isCloudError(await rejection(pinned.switchEnvironment("prod-eu"))));
		} finally {
			pinned.dispose();
		}

		Reflect.deleteProperty(process.env, "WSO2_CLOUD_ENV");
		process.env.WSO2_CLOUD_API_URL = "https://gateway.example.com/api";
		const overridden = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context(new FakeSecretStorage(), new FakeMemento()) });
		assert.equal(overridden.regions.length, 1, "an API override would otherwise be left behind in another region");
		overridden.dispose();
	});
});
