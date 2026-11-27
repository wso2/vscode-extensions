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
import { BrowserLoginTokenSource, type CloudEnvironment, type CloudError, ENVIRONMENTS, SessionManager, type StoredSession } from "../../src";
import {
	CHOREO_CLOUD_PLATFORM,
	CLOUD_ENV_VARS,
	CLOUD_PLATFORM_STATE_KEY,
	type PlatformBackend,
	type PlatformBundle,
	SecretStorageSessionStore,
	createPlatformClients,
	scopeForPlatform,
} from "../../src/vscode";
import { StaticTokenSource } from "../doubles";
import { FakeSecretStorage, resetVscode } from "../doubles/vscode";
import { rejection } from "../support";

const VARS = [
	...CLOUD_ENV_VARS,
	"WSO2_CLOUD_API_URL",
	"WSO2_CLOUD_ISSUER",
	"WSO2_CLOUD_OBSERVABILITY_URL",
	"WSO2_CLOUD_CONSOLE_URL",
	"WSO2_CLOUD_COPILOT_URL",
	"WSO2_CLOUD_CLIENT_ID",
	"WSO2_CLOUD_TOKEN",
	"WSO2_CLOUD_TOKEN_FILE",
];

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
		clientId: "CLIENT",
		tokens: { accessToken: `${email}-token`, expiresAt: new Date(exp * 1000).toISOString(), scope: "openid" },
		claims: { sub: email, iss: `https://${env}.idp.example.invalid`, client_id: "CLIENT", ouId: "o1", ouName: "Acme", ouHandle: "acme", exp, email },
		org: { id: "o1", handle: "acme", name: "Acme" },
		account: { id: email, label: email },
		obtainedVia: "browser",
		createdAt: new Date().toISOString(),
	};
}

const OTHER_US: CloudEnvironment = { ...ENVIRONMENTS.prod, apiBaseUrl: "https://api.other.example.invalid" };
const OTHER_EU: CloudEnvironment = { ...ENVIRONMENTS["prod-eu"], apiBaseUrl: "https://api.eu.other.example.invalid" };

/** A second platform whose sessions live under their own keys, and whose region follows the session. */
class OtherPlatform implements PlatformBackend {
	readonly name = "other";
	readonly label = "Other Cloud";
	builds = 0;
	disposals = 0;
	private moveTo?: (environment: CloudEnvironment) => void;

	build(host: Parameters<PlatformBackend["build"]>[0]): PlatformBundle {
		this.builds++;
		let environment = OTHER_US;
		const listeners = new Set<(environment: CloudEnvironment) => void>();
		const sessions = new SessionManager({
			env: OTHER_US,
			store: new SecretStorageSessionStore(host.context.secrets, this.name),
			fetch: host.fetch,
			serviceName: this.label,
		});
		const tokenSource = new BrowserLoginTokenSource(sessions);
		this.moveTo = (next) => {
			environment = next;
			for (const listener of listeners) {
				listener(next);
			}
		};
		return {
			get environment() {
				return environment;
			},
			sessions,
			tokenSource,
			client: { platform: "other" },
			providerRegion: () => ({ env: environment, sessions, tokenSource }),
			cancelLogin: () => undefined,
			onDidChangeEnvironment: (listener) => {
				listeners.add(listener);
				return () => listeners.delete(listener);
			},
			dispose: () => {
				this.disposals++;
				sessions.dispose();
			},
		};
	}

	/** Moves the bundle built last to another region, as a sign-in there would. */
	move(environment: CloudEnvironment): void {
		this.moveTo?.(environment);
	}
}

describe("platforms beside Choreo Cloud", () => {
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

	it("switches to another platform live, each with its own session and key, and remembers the choice", async () => {
		const secrets = new FakeSecretStorage();
		const globalState = new FakeMemento();
		await new SecretStorageSessionStore(secrets as never).save(session("prod", "choreo@example.com"));
		await new SecretStorageSessionStore(secrets as never, "other").save(session("prod", "other@example.com"));
		const other = new OtherPlatform();
		const platform = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context(secrets, globalState), backends: [other] });
		try {
			assert.equal(platform.platform, CHOREO_CLOUD_PLATFORM);
			assert.deepEqual(
				platform.platforms.map((p) => p.name),
				[CHOREO_CLOUD_PLATFORM, "other"],
			);
			assert.equal(other.builds, 0, "a platform not in use is not built");
			assert.equal(platform.backendClient("other"), undefined);
			const choreoKey = platform.apiKeys.current();
			const [choreoSession] = await platform.auth.getSessions(["env:prod"]);
			assert.equal(choreoSession.account.id, "choreo@example.com");

			const events: string[] = [];
			platform.onDidChangePlatform((name) => events.push(`platform ${name}`));
			platform.onDidChangeEnvironment((environment) => events.push(`environment ${environment.apiBaseUrl}`));
			const reported: { added: string[]; removed: string[] }[] = [];
			platform.auth.onDidChangeSessions((event) =>
				reported.push({ added: (event.added ?? []).map((s) => s.account.id), removed: (event.removed ?? []).map((s) => s.account.id) }),
			);

			await platform.switchPlatform("other");
			assert.equal(platform.platform, "other");
			assert.equal(platform.environment.apiBaseUrl, OTHER_US.apiBaseUrl);
			assert.deepEqual(
				platform.regions.map((region) => region.apiBaseUrl),
				[OTHER_US.apiBaseUrl],
				"no region switch while another platform is in use",
			);
			assert.deepEqual(platform.backendClient("other"), { platform: "other" });
			assert.equal(((await rejection(Promise.resolve().then(() => platform.cloud))) as CloudError).details.reason, "platform_mismatch");
			assert.equal((await platform.sessions.current())?.account.id, "other@example.com");
			assert.notEqual(platform.apiKeys.current(), choreoKey);
			assert.ok(!platform.apiKeys.verify(choreoKey), "the key handed out for Choreo Cloud stops working");
			assert.deepEqual(events, ["platform other", `environment ${OTHER_US.apiBaseUrl}`]);
			assert.deepEqual(reported, [{ added: ["other@example.com"], removed: ["choreo@example.com"] }]);
			assert.deepEqual(await platform.auth.getSessions(["env:prod"]), [], "an extension that names no platform gets no key to this one");
			const [named] = await platform.auth.getSessions(["env:prod", scopeForPlatform("other")]);
			assert.equal(named.account.id, "other@example.com");
			assert.equal(globalState.get(CLOUD_PLATFORM_STATE_KEY), "other");
			await rejection(platform.switchEnvironment("prod-eu"));

			await platform.switchPlatform(CHOREO_CLOUD_PLATFORM);
			assert.equal(platform.platform, CHOREO_CLOUD_PLATFORM);
			assert.equal(other.disposals, 1, "the platform left is disposed");
			assert.deepEqual(
				platform.regions.map((region) => region.name),
				["prod", "prod-eu"],
			);
			assert.equal((await platform.sessions.current())?.account.id, "choreo@example.com", "the session left behind is still there");
			assert.equal(globalState.get(CLOUD_PLATFORM_STATE_KEY), CHOREO_CLOUD_PLATFORM);
		} finally {
			platform.dispose();
		}
	});

	it("starts on the platform asked for, else the one last switched to", () => {
		const globalState = new FakeMemento();
		globalState.values.set(CLOUD_PLATFORM_STATE_KEY, "other");
		const remembered = createPlatformClients({
			extensionId: "wso2.wso2-integrator",
			context: context(new FakeSecretStorage(), globalState),
			backends: [new OtherPlatform()],
		});
		const asked = createPlatformClients({
			extensionId: "wso2.wso2-integrator",
			context: context(new FakeSecretStorage(), globalState),
			backends: [new OtherPlatform()],
			initialPlatform: CHOREO_CLOUD_PLATFORM,
		});
		const unknown = createPlatformClients({
			extensionId: "wso2.wso2-integrator",
			context: context(new FakeSecretStorage(), new FakeMemento()),
			backends: [new OtherPlatform()],
			initialPlatform: "retired",
		});
		try {
			assert.equal(remembered.platform, "other");
			assert.equal(asked.platform, CHOREO_CLOUD_PLATFORM);
			assert.equal(unknown.platform, CHOREO_CLOUD_PLATFORM, "a platform no longer offered falls back to Choreo Cloud");
		} finally {
			remembered.dispose();
			asked.dispose();
			unknown.dispose();
		}
	});

	it("offers no other platform when Choreo Cloud's token or environment is fixed", () => {
		const other = new OtherPlatform();
		const platform = createPlatformClients({
			extensionId: "wso2.wso2-integrator",
			context: context(new FakeSecretStorage(), new FakeMemento()),
			tokenSource: new StaticTokenSource("token"),
			backends: [other],
			initialPlatform: "other",
		});
		try {
			assert.equal(platform.platform, CHOREO_CLOUD_PLATFORM);
			assert.deepEqual(
				platform.platforms.map((p) => p.name),
				[CHOREO_CLOUD_PLATFORM],
			);
			assert.equal(other.builds, 0);
		} finally {
			platform.dispose();
		}
	});

	it("passes on the region a platform's session moves to, only while that platform is in use", async () => {
		const other = new OtherPlatform();
		const platform = createPlatformClients({
			extensionId: "wso2.wso2-integrator",
			context: context(new FakeSecretStorage(), new FakeMemento()),
			backends: [other],
			initialPlatform: "other",
		});
		try {
			const environments: string[] = [];
			platform.onDidChangeEnvironment((environment) => environments.push(environment.apiBaseUrl));
			other.move(OTHER_EU);
			assert.equal(platform.environment.apiBaseUrl, OTHER_EU.apiBaseUrl);
			assert.deepEqual(environments, [OTHER_EU.apiBaseUrl]);

			await platform.switchPlatform(CHOREO_CLOUD_PLATFORM);
			environments.length = 0;
			other.move(OTHER_US);
			assert.deepEqual(environments, [], "a platform left reports nothing");
		} finally {
			platform.dispose();
		}
	});

	it("refuses a platform that is not on offer", async () => {
		const platform = createPlatformClients({ extensionId: "wso2.wso2-integrator", context: context(new FakeSecretStorage(), new FakeMemento()) });
		try {
			assert.equal(((await rejection(platform.switchPlatform("other"))) as CloudError).code, "bad_request");
			assert.equal(platform.platform, CHOREO_CLOUD_PLATFORM);
		} finally {
			platform.dispose();
		}
	});
});
