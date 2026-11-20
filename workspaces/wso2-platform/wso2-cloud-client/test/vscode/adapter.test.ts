import assert from "node:assert/strict";
import {
	BrowserLoginTokenSource,
	type CloudError,
	DeferredReceiver,
	ENVIRONMENTS,
	InMemorySessionStore,
	InjectedTokenSource,
	LoginFlow,
	LoopbackReceiver,
	SessionManager,
	type StoredSession,
} from "../../src";
import {
	ApiKeys,
	CLOUD_API_URL_VAR,
	CLOUD_ENV_SETTING,
	CLOUD_ENV_VARS,
	CLOUD_ISSUER_VAR,
	ConsoleForwardReceiver,
	SecretStorageSessionStore,
	UriCallbackReceiver,
	WSO2CloudAuthenticationProvider,
	chooseReceivers,
	createPlatformClients,
	readCloudEnvName,
	scopeForOrg,
	sessionId,
	userSetting,
} from "../../src/vscode";
import { FakeIssuer, StaticTokenSource } from "../doubles";
import { FakeSecretStorage, Uri, resetVscode, state } from "../doubles/vscode";
import { DEV, rejection } from "../support";

const env = { ...DEV, issuer: "https://idp.example.invalid", clientId: "WSO2_INTEGRATOR_EXTENSION" };

async function signIn(issuer: FakeIssuer): Promise<StoredSession> {
	const receiver = new DeferredReceiver("vscode://x/signin");
	return new LoginFlow({
		env,
		fetch: issuer.fetch,
		receiver,
		openBrowser: async (url) => {
			setImmediate(() => receiver.push(issuer.authorize(url)));
		},
	}).run();
}

/**
 * A URI as a web host hands it to the extension. Its callback page serializes
 * the parameters with `URLSearchParams.toString()`, so the query arrives
 * percent-encoded -- unlike the desktop URI handler's, which VS Code decodes.
 */
function browserCallback(path: string, params: Record<string, string>): { path: string; query: string } {
	return { path, query: new URLSearchParams(params).toString() };
}

describe("VS Code adapter", () => {
	beforeEach(() => resetVscode());

	it("hands a URI callback's code over as the provider sent it, `+` and `/` included", async () => {
		const receiver = new UriCallbackReceiver({ extensionId: "wso2.wso2-integrator" });
		const waiting = receiver.waitForCode("s1");
		assert.equal(receiver.pushUri(Uri.parse("vscode://wso2.wso2-integrator/signin?code=ab%2Bcd%2F%3D&state=s1") as never), true);
		assert.equal(await waiting, "ab+cd/=");
	});

	it("reads settings from the person's own settings only, never a workspace's", () => {
		state.settings[CLOUD_ENV_SETTING] = { workspaceValue: "dev", workspaceFolderValue: "dev" };
		assert.equal(userSetting(CLOUD_ENV_SETTING), undefined);
		assert.equal(readCloudEnvName({}), "prod");

		state.settings[CLOUD_ENV_SETTING] = { globalValue: " Stage " };
		assert.equal(readCloudEnvName({}), "stage");
		assert.equal(readCloudEnvName({ WSO2_CLOUD_ENV: "dev" }), "dev", "the variable comes first");

		state.settings[CLOUD_ENV_SETTING] = { globalValue: "prod-eu" };
		assert.equal(readCloudEnvName({}), "prod", "the setting names a deployment; production's region is chosen at sign-in");
		assert.equal(readCloudEnvName({ WSO2_CLOUD_ENV: "prod-eu" }), "prod-eu", "a variable may name a region");
	});

	it("takes the URI for a known scheme, listens on the loopback for an unknown desktop fork, and refuses an unknown remote", () => {
		const local = chooseReceivers({ extensionId: "wso2.wso2-integrator" }, { uriScheme: "vscode", uiKind: 1, remoteName: undefined });
		assert.ok(local.uriReceiver);
		assert.equal(local.receiver, local.uriReceiver, "the stage and prod edge refuses loopback redirects");

		const remote = chooseReceivers({ extensionId: "wso2.wso2-integrator" }, { uriScheme: "vscode", uiKind: 1, remoteName: "ssh-remote" });
		assert.equal(remote.receiver, remote.uriReceiver);

		const fork = chooseReceivers({ extensionId: "wso2.wso2-integrator" }, { uriScheme: "code-oss", uiKind: 1, remoteName: undefined });
		assert.ok(fork.receiver instanceof LoopbackReceiver);
		assert.equal(fork.uriReceiver, undefined);

		assert.throws(
			() => chooseReceivers({ extensionId: "wso2.wso2-integrator" }, { uriScheme: "code-oss", uiKind: 1, remoteName: "ssh-remote" }),
			/not supported/,
		);
	});

	it("signs a browser editor in through the console, which forwards the result to the address in `state`", async () => {
		// A cloud editor as code-server reports it: no registered scheme, a web
		// UI, and its own per-component address.
		state.uriScheme = "code-oss";
		state.uiKind = 2;
		state.remoteName = "editor-code-server-abc-development.dp1.us.cloud.choreolabs.io";
		state.externalUriOrigin = "https://editor-code-server-abc-development.dp1.us.cloud.choreolabs.io/stable-x/callback";

		const issuer = new FakeIssuer();
		const chosen = chooseReceivers(
			{ extensionId: "wso2.wso2-integrator", consoleUrl: "https://console.cloud.choreolabs.com" },
			{ uriScheme: state.uriScheme, uiKind: state.uiKind, remoteName: state.remoteName },
		);
		const receiver = chosen.receiver as ConsoleForwardReceiver;
		assert.ok(receiver instanceof ConsoleForwardReceiver);
		assert.equal(
			receiver.redirectUri,
			"https://console.cloud.choreolabs.com/signin",
			"the provider redirects to the console, which has a registered callback",
		);
		assert.equal(chosen.uriReceiver, receiver, "the result comes home through the extension's URI handler");

		const session = await new LoginFlow({
			env: { ...env, issuer: issuer.issuer },
			fetch: issuer.fetch,
			receiver,
			openBrowser: async (authorizeUrl) => {
				setImmediate(() => {
					// The provider redirects to the console with the state it was given.
					const atConsole = issuer.authorize(authorizeUrl);
					// The console reads where to forward from `state`, exactly as
					// its editorCallbackUri does, and hands `state` back untouched.
					const wire = atConsole.searchParams.get("state") ?? "";
					const { callbackUri } = JSON.parse(atob(wire)) as { callbackUri: string };
					assert.equal(new URL(callbackUri).origin, "https://editor-code-server-abc-development.dp1.us.cloud.choreolabs.io");
					const toEditor = new URL(callbackUri);
					toEditor.searchParams.set("code", atConsole.searchParams.get("code") ?? "");
					toEditor.searchParams.set("state", wire);
					// The editor's origin routes it back into the URI handler.
					receiver.pushUri(browserCallback("/signin", Object.fromEntries(toEditor.searchParams)) as never);
				});
			},
		}).run();

		assert.ok(session.tokens.accessToken, "the code was exchanged with the redirect the provider was given");
	});

	it("ignores a forwarded result that belongs to no sign-in of this editor", async () => {
		state.uriScheme = "code-oss";
		state.uiKind = 2;
		state.externalUriOrigin = "https://editor-abc.dp1.us.cloud.choreolabs.io/callback";

		const receiver = new ConsoleForwardReceiver({ extensionId: "wso2.wso2-integrator", consoleUrl: "https://console.cloud.choreolabs.com" });
		await receiver.start();
		const waiting = receiver.waitForCode("s1");
		const foreign = btoa(JSON.stringify({ callbackUri: "https://editor-abc.dp1.us.cloud.choreolabs.io/callback", nonce: "another" }));

		assert.equal(receiver.pushUri(browserCallback("/signin", { code: "c", state: foreign }) as never), false);
		assert.equal(
			receiver.pushUri(browserCallback("/signin", { code: "c", state: "opaque" }) as never),
			false,
			"a state that is not an editor's is nobody's",
		);

		const mine = btoa(JSON.stringify({ callbackUri: "https://editor-abc.dp1.us.cloud.choreolabs.io/callback", nonce: "s1" }));
		assert.equal(receiver.pushUri(browserCallback("/signin", { code: "mine", state: mine }) as never), true);
		assert.equal(await waiting, "mine");
	});

	it("reads a browser callback's query as the callback page serialized it, `+`, `/` and padding included", async () => {
		state.uriScheme = "code-oss";
		state.uiKind = 2;
		state.externalUriOrigin = "https://editor-abc.dp1.us.cloud.choreolabs.io/callback";

		const receiver = new ConsoleForwardReceiver({ extensionId: "wso2.wso2-integrator", consoleUrl: "https://console.cloud.choreolabs.com" });
		await receiver.start();
		const waiting = receiver.waitForCode("s1");
		const wire = receiver.wireState("s1");
		// base64 of the editor's address: the characters a query has to carry
		// through encoding, which is where this used to come apart.
		assert.ok(/[+/=]/.test(wire), `the state carried needs encoding: ${wire}`);

		const callback = browserCallback("/signin", { code: "ab+cd/ef=", state: wire });
		assert.ok(/%2B|%2F|%3D/.test(callback.query), `the callback page encodes them: ${callback.query}`);

		assert.equal(receiver.pushUri(callback as never), true);
		assert.equal(await waiting, "ab+cd/ef=", "the code comes out as the provider sent it");
	});

	it("sends the provider to the console's /signin whatever path the result comes back to in the editor", async () => {
		state.uriScheme = "code-oss";
		state.uiKind = 2;
		state.externalUriOrigin = "https://editor-abc.dp1.us.cloud.choreolabs.io/callback";

		const receiver = new ConsoleForwardReceiver({
			extensionId: "wso2.wso2-integrator",
			path: "/cloud-signin",
			consoleUrl: "https://console.cloud.choreolabs.com/",
		});
		assert.equal(
			receiver.redirectUri,
			"https://console.cloud.choreolabs.com/signin",
			"the console forwards from one endpoint, and a trailing slash does not double it",
		);

		await receiver.start();
		const waiting = receiver.waitForCode("s1");
		const wire = receiver.wireState("s1");
		const { callbackUri } = JSON.parse(atob(wire)) as { callbackUri: string };
		assert.ok(/[?&]vscode-path=(%2F|\/)cloud-signin/.test(callbackUri), `the editor is still returned to its own path: ${callbackUri}`);

		assert.equal(receiver.pushUri(browserCallback("/cloud-signin", { code: "c1", state: wire }) as never), true);
		assert.equal(await waiting, "c1");
	});

	it("refuses a browser editor when the deployment names no console to come back through", () => {
		state.uriScheme = "code-oss";
		state.uiKind = 2;
		assert.throws(
			() => chooseReceivers({ extensionId: "wso2.wso2-integrator" }, { uriScheme: "code-oss", uiKind: 2, remoteName: "editor-abc" }),
			/names no console/,
		);
	});

	it("activates on a configuration it cannot use, with a warning, instead of throwing", () => {
		const keys = [
			...CLOUD_ENV_VARS,
			CLOUD_API_URL_VAR,
			CLOUD_ISSUER_VAR,
			"WSO2_CLOUD_OBSERVABILITY_URL",
			"WSO2_CLOUD_CONSOLE_URL",
			"WSO2_CLOUD_CLIENT_ID",
		];
		const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
		const create = () =>
			createPlatformClients({
				extensionId: "wso2.wso2-integrator",
				context: { secrets: new FakeSecretStorage(), subscriptions: [] } as never,
				tokenSource: new StaticTokenSource("t"),
			});
		try {
			for (const key of keys) {
				delete process.env[key];
			}
			process.env.WSO2_CLOUD_ENV = "dev";
			const dev = create();
			dev.dispose();
			assert.equal(dev.environment.name, "prod", "dev has no hosts of its own to fall back to");
			assert.equal(state.warnings.length, 1);
			assert.match(state.warnings[0], /dev/);

			process.env.WSO2_CLOUD_ENV = "stage";
			process.env[CLOUD_API_URL_VAR] = "http://gateway.example.invalid";
			const stage = create();
			stage.dispose();
			assert.equal(stage.environment.name, "stage");
			assert.equal(stage.environment.apiBaseUrl, ENVIRONMENTS.stage.apiBaseUrl, "the override that is not https is not used");
			assert.equal(state.warnings.length, 2);
		} finally {
			for (const key of keys) {
				if (saved[key] === undefined) {
					delete process.env[key];
				} else {
					process.env[key] = saved[key];
				}
			}
		}
	});

	it("picks up a session another window signed in to, refreshed or signed out of", async () => {
		// From the real clock, since the sign-in here checks the ID token against it.
		let t = Date.now();
		const now = () => new Date(t);
		const issuer = new FakeIssuer({ expiresIn: 600, now });
		const secrets = new FakeSecretStorage();
		const windowA = new SessionManager({ env, store: new SecretStorageSessionStore(secrets as never), fetch: issuer.fetch, now });
		const windowB = new SessionManager({ env, store: new SecretStorageSessionStore(secrets as never), fetch: issuer.fetch, now });
		const eventsA: string[] = [];
		const eventsB: string[] = [];
		windowA.onDidChange((e) => eventsA.push(e.reason));
		windowB.onDidChange((e) => eventsB.push(e.reason));
		const settle = async () => {
			for (let i = 0; i < 5; i++) {
				await new Promise((resolve) => setImmediate(resolve));
			}
		};
		await windowB.current();

		await windowA.setSession(await signIn(issuer));
		await settle();
		assert.equal((await windowB.current())?.tokens.accessToken, (await windowA.current())?.tokens.accessToken);

		t += 9.5 * 60_000;
		const refreshed = await windowA.getAccessToken();
		await settle();
		assert.equal(await windowB.getAccessToken(), refreshed, "window B takes window A's refresh instead of refreshing with a rotated-away token");
		assert.equal(issuer.calls.filter((c) => c.form.grant_type === "refresh_token").length, 1);

		await windowA.signOut({ revoke: false });
		await settle();
		assert.equal(await windowB.current(), undefined);
		assert.deepEqual(eventsA, ["signed-in", "refreshed", "signed-out"], "a window's own writes are not reported back to it");
		assert.deepEqual(eventsB, ["signed-in", "refreshed", "signed-out"]);
		windowA.dispose();
		windowB.dispose();
	});

	describe("authentication provider", () => {
		async function provider(options: { resolveOrg?: (session: StoredSession) => Promise<{ uuid?: string }> } = {}) {
			const issuer = new FakeIssuer();
			const sessions = new SessionManager({ env, store: new InMemorySessionStore(), fetch: issuer.fetch });
			const auth = new WSO2CloudAuthenticationProvider({
				env,
				sessions,
				apiKeys: new ApiKeys(),
				tokenSource: new BrowserLoginTokenSource(sessions),
				startLogin: () => signIn(issuer),
				resolveOrg: options.resolveOrg as never,
			});
			return { issuer, sessions, auth };
		}

		it("answers only the scopes its session meets", async () => {
			const { issuer, sessions, auth } = await provider();
			const session = await signIn(issuer);
			await sessions.setSession(session);

			assert.equal((await auth.getSessions([])).length, 1);
			assert.equal((await auth.getSessions([scopeForOrg(session.org.handle)])).length, 1);
			assert.deepEqual(await auth.getSessions([scopeForOrg("someone-else")]), [], "another organization's token is not handed out");
			assert.deepEqual(await auth.getSessions(["prompt:login"]), [], "a new sign-in was asked for");
			assert.deepEqual(await auth.getSessions(["env:stage"]), []);
		});

		it("says why it cannot sign in, not that the editor holds an injected token", async () => {
			const sessions = new SessionManager({ env, store: new InMemorySessionStore(), fetch: new FakeIssuer().fetch });
			const auth = new WSO2CloudAuthenticationProvider({
				env,
				sessions,
				apiKeys: new ApiKeys(),
				tokenSource: new BrowserLoginTokenSource(sessions),
				loginUnavailable: "this editor has no URI scheme the identity provider knows",
			});

			const error = (await rejection(auth.createSession([]))) as CloudError;
			assert.equal(error.details.reason, "no_redirect_available");
			assert.match(error.message, /no URI scheme the identity provider knows/);
		});

		it("hands out the key to the host's API, never the WSO2 Cloud token, and a new key for a new sign-in", async () => {
			const issuer = new FakeIssuer();
			const sessions = new SessionManager({ env, store: new InMemorySessionStore(), fetch: issuer.fetch });
			const apiKeys = new ApiKeys();
			const auth = new WSO2CloudAuthenticationProvider({ env, sessions, apiKeys, tokenSource: new BrowserLoginTokenSource(sessions) });
			const session = await signIn(issuer);
			await sessions.setSession(session);

			const [handed] = await auth.getSessions([]);
			assert.notEqual(handed.accessToken, session.tokens.accessToken);
			assert.ok(apiKeys.verify(handed.accessToken));

			await sessions.signOut({ revoke: false });
			assert.deepEqual(await auth.getSessions([]), []);
			assert.ok(!apiKeys.verify(handed.accessToken), "a key handed out before a sign-out stops working");
			await sessions.setSession(await signIn(issuer));
			const [again] = await auth.getSessions([]);
			assert.notEqual(again.accessToken, handed.accessToken);
			assert.ok(apiKeys.verify(again.accessToken));
		});

		it("keeps the key across a refresh of the WSO2 Cloud token", async () => {
			const issuer = new FakeIssuer();
			const sessions = new SessionManager({ env, store: new InMemorySessionStore(), fetch: issuer.fetch });
			const apiKeys = new ApiKeys();
			const auth = new WSO2CloudAuthenticationProvider({ env, sessions, apiKeys, tokenSource: new BrowserLoginTokenSource(sessions) });
			await sessions.setSession(await signIn(issuer));
			const [handed] = await auth.getSessions([]);

			await sessions.getAccessToken({ forceRefresh: true });

			assert.ok(apiKeys.verify(handed.accessToken));
		});

		it("answers only the injected token's session in an editor started with one, whatever storage holds", async () => {
			const issuer = new FakeIssuer();
			const sessions = new SessionManager({ env, store: new InMemorySessionStore(), fetch: issuer.fetch });
			await sessions.setSession(await signIn(issuer));
			const injected = issuer.accessToken({ sub: "user-2", email: "someone@example.com" });
			const apiKeys = new ApiKeys();
			const auth = new WSO2CloudAuthenticationProvider({ env, sessions, apiKeys, tokenSource: new InjectedTokenSource({ read: () => injected }) });

			const handed = await auth.getSessions([]);

			assert.equal(handed.length, 1);
			assert.ok(apiKeys.verify(handed[0].accessToken), "the key, not the editor's token");
			assert.equal(handed[0].account.id, "user-2");
		});

		it("does not report a session the person signed out of while the organization was read", async () => {
			const held: { sessions?: SessionManager } = {};
			const built = await provider({
				resolveOrg: async () => {
					await held.sessions?.signOut({ revoke: false });
					return { uuid: "org-uuid" };
				},
			});
			held.sessions = built.sessions;

			const error = (await rejection(built.auth.createSession([]))) as CloudError;
			assert.equal(error.code, "login_cancelled");
			assert.equal(await built.sessions.current(), undefined);
		});

		it("does not put one sign-in's organization onto a session another sign-in replaced it with", async () => {
			const held: { sessions?: SessionManager; other?: StoredSession } = {};
			const built = await provider({
				resolveOrg: async () => {
					held.other = await signIn(built.issuer);
					await held.sessions?.setSession(held.other);
					return { uuid: "first-sign-in" };
				},
			});
			held.sessions = built.sessions;

			const handed = await built.auth.createSession([]);
			assert.equal(handed.id, sessionId(held.other as StoredSession), "the session held now is the one reported");
			assert.equal((await built.sessions.current())?.org.uuid, undefined);
		});
	});
});

describe("ApiKeys", () => {
	it("answers only to the key handed out now", () => {
		const keys = new ApiKeys();
		assert.ok(!keys.verify("anything"), "no key before one is handed out");
		const key = keys.current();
		assert.equal(keys.current(), key);
		assert.ok(keys.verify(key));
		assert.ok(!keys.verify(`${key}x`));
		assert.ok(!keys.verify(undefined));
		keys.rotate();
		assert.ok(!keys.verify(key));
		assert.notEqual(keys.current(), key);
	});
});
