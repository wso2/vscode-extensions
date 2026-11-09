import assert from "node:assert/strict";
import {
	BrowserLoginTokenSource,
	type CloudError,
	DeferredReceiver,
	InMemorySessionStore,
	InjectedTokenSource,
	LoginFlow,
	type SessionChangeEvent,
	SessionManager,
	type StoredSession,
	createCloudClient,
	readPlatformClaims,
	resetDiscoveryCache,
} from "../../src";
import { FakeIssuer, composeFetch, fakeFetch, unsignedJwt } from "../doubles";
import { DEV, rejection } from "../support";

const env = { ...DEV, issuer: "https://idp.example.invalid", clientId: "WSO2_INTEGRATOR_EXTENSION" };

/** Signs in through the fake issuer and returns the session it produced. */
async function signIn(issuer: FakeIssuer, now?: () => Date): Promise<StoredSession> {
	const receiver = new DeferredReceiver("vscode://x/signin");
	return new LoginFlow({
		env,
		fetch: issuer.fetch,
		receiver,
		now,
		openBrowser: async (url) => {
			setImmediate(() => receiver.push(issuer.authorize(url)));
		},
	}).run();
}

function clockFrom(start: Date): { now: () => Date; advance: (ms: number) => void } {
	let t = start.getTime();
	return {
		now: () => new Date(t),
		advance: (ms) => {
			t += ms;
		},
	};
}

describe("SessionManager", () => {
	beforeEach(() => resetDiscoveryCache());

	it("hands out the stored token while it is fresh and refreshes it when it is not", async () => {
		const clock = clockFrom(new Date("2026-11-05T10:00:00Z"));
		const issuer = new FakeIssuer({ expiresIn: 600, now: clock.now });
		const store = new InMemorySessionStore();
		const manager = new SessionManager({ env, store, fetch: issuer.fetch, now: clock.now });
		const events: SessionChangeEvent[] = [];
		manager.onDidChange((e) => events.push(e));
		const session = await signIn(issuer, clock.now);
		await manager.setSession(session);

		assert.equal(await manager.getAccessToken(), session.tokens.accessToken);
		assert.equal(issuer.calls.filter((c) => c.form.grant_type === "refresh_token").length, 0);

		clock.advance(9.5 * 60_000);
		const refreshed = await manager.getAccessToken();
		assert.notEqual(refreshed, session.tokens.accessToken);
		assert.equal(issuer.calls.filter((c) => c.form.grant_type === "refresh_token").length, 1);
		const stored = await store.load("dev");
		assert.equal(stored?.tokens.accessToken, refreshed);
		assert.notEqual(stored?.tokens.refreshToken, session.tokens.refreshToken, "the rotated refresh token is kept");
		assert.deepEqual(
			events.map((e) => e.reason),
			["signed-in", "refreshed"],
		);
	});

	it("refreshes once for many concurrent callers", async () => {
		const clock = clockFrom(new Date("2026-11-05T10:00:00Z"));
		const issuer = new FakeIssuer({ expiresIn: 10, now: clock.now });
		const manager = new SessionManager({ env, store: new InMemorySessionStore(), fetch: issuer.fetch, now: clock.now });
		await manager.setSession(await signIn(issuer, clock.now));
		clock.advance(60_000);

		const tokens = await Promise.all(Array.from({ length: 10 }, (_, i) => manager.getAccessToken({ forceRefresh: i % 2 === 0 })));

		assert.equal(new Set(tokens).size, 1);
		assert.equal(issuer.calls.filter((c) => c.form.grant_type === "refresh_token").length, 1);
	});

	it("ends the session when the issuer refuses the refresh", async () => {
		const clock = clockFrom(new Date("2026-11-05T10:00:00Z"));
		const issuer = new FakeIssuer({ expiresIn: 10, now: clock.now });
		const store = new InMemorySessionStore();
		const manager = new SessionManager({ env, store, fetch: issuer.fetch, now: clock.now });
		const events: string[] = [];
		manager.onDidChange((e) => events.push(e.reason));
		await manager.setSession(await signIn(issuer, clock.now));
		clock.advance(60_000);
		issuer.refreshRefusal = "invalid_grant";

		const error = (await rejection(manager.getAccessToken())) as CloudError;

		assert.equal(error.code, "session_expired");
		assert.equal(await store.load("dev"), undefined);
		assert.equal(events[events.length - 1], "expired");
		const again = (await rejection(manager.getAccessToken())) as CloudError;
		assert.equal(again.details.reason, "no_session");
	});

	it("keeps the session when the network loses the refresh, while the token lasts", async () => {
		const clock = clockFrom(new Date("2026-11-05T10:00:00Z"));
		const issuer = new FakeIssuer({ expiresIn: 600, now: clock.now });
		const session = await signIn(issuer, clock.now);
		let offline = false;
		const flaky: typeof issuer.fetch = (input, init) => {
			if (offline && input === issuer.tokenEndpoint) {
				return Promise.reject(new TypeError("fetch failed"));
			}
			return issuer.fetch(input, init);
		};
		const store = new InMemorySessionStore();
		const manager = new SessionManager({ env, store, fetch: flaky, now: clock.now });
		await manager.setSession(session);
		clock.advance(9.5 * 60_000);
		offline = true;

		assert.equal(await manager.getAccessToken(), session.tokens.accessToken);
		assert.ok(await store.load("dev"));

		clock.advance(60_000);
		const error = (await rejection(manager.getAccessToken())) as CloudError;
		assert.equal(error.code, "network");
	});

	it("signs out, revoking the refresh token", async () => {
		const issuer = new FakeIssuer();
		const store = new InMemorySessionStore();
		const manager = new SessionManager({ env, store, fetch: issuer.fetch });
		const session = await signIn(issuer);
		await manager.setSession(session);

		await manager.signOut();

		assert.deepEqual(issuer.revoked, [session.tokens.refreshToken]);
		assert.equal(await store.load("dev"), undefined);
		assert.equal(await manager.current(), undefined);
	});

	it("drives the API client through BrowserLoginTokenSource, including the 401 retry", async () => {
		const clock = clockFrom(new Date("2026-11-05T10:00:00Z"));
		const issuer = new FakeIssuer({ expiresIn: 600, now: clock.now });
		const manager = new SessionManager({ env, store: new InMemorySessionStore(), fetch: issuer.fetch, now: clock.now });
		const session = await signIn(issuer, clock.now);
		await manager.setSession(session);
		const api = fakeFetch([
			{
				match: /GET .*\/projects$/,
				respond: (request) =>
					request.headers.authorization === `Bearer ${session.tokens.accessToken}`
						? { status: 401, body: { error: "Unauthorized" } }
						: { body: { items: [{ id: "p" }] } },
			},
		]);
		const client = createCloudClient({
			environment: env,
			tokenSource: new BrowserLoginTokenSource(manager),
			fetch: composeFetch([
				{ origin: issuer.issuer, fetch: issuer.fetch },
				{ origin: env.apiBaseUrl, fetch: api.fetch },
			]),
		});

		const projects = await client.projects.list();

		assert.equal(projects[0].id, "p");
		assert.equal(api.requests.length, 2);
		assert.equal(issuer.calls.filter((c) => c.form.grant_type === "refresh_token").length, 1);
	});

	it("reports a rejected token the issuer is too down to refresh as a transient failure, not a sign-out", async () => {
		const clock = clockFrom(new Date("2026-11-05T10:00:00Z"));
		const issuer = new FakeIssuer({ expiresIn: 600, now: clock.now });
		const issuerDown: typeof issuer.fetch = (input, init) =>
			input === issuer.tokenEndpoint ? Promise.resolve(new Response("upstream connect error", { status: 503 })) : issuer.fetch(input, init);
		const store = new InMemorySessionStore();
		const manager = new SessionManager({ env, store, fetch: issuerDown, now: clock.now });
		await manager.setSession(await signIn(issuer, clock.now));
		const events: string[] = [];
		manager.onDidChange((e) => events.push(e.reason));
		const api = fakeFetch([{ match: /GET .*\/projects$/, status: 401, body: { error: "Unauthorized" } }]);
		let unauthenticated = 0;
		const client = createCloudClient({
			environment: env,
			tokenSource: new BrowserLoginTokenSource(manager),
			fetch: composeFetch([
				{ origin: issuer.issuer, fetch: issuerDown },
				{ origin: env.apiBaseUrl, fetch: api.fetch },
			]),
			onUnauthenticated: () => unauthenticated++,
		});

		const error = (await rejection(client.projects.list())) as CloudError;

		assert.equal(error.code, "unavailable");
		assert.equal(error.details.retryable, true);
		assert.equal(api.requests.length, 1, "the rejected token is not sent again");
		assert.equal(unauthenticated, 0);
		assert.ok(await store.load("dev"), "the refresh token is kept for when the issuer is back");
		assert.deepEqual(events, []);
	});

	it("takes the session another window refreshed when the issuer refuses a refresh token that window rotated away", async () => {
		const clock = clockFrom(new Date("2026-11-05T10:00:00Z"));
		const issuer = new FakeIssuer({ expiresIn: 600, now: clock.now });
		const store = new InMemorySessionStore();
		const windowA = new SessionManager({ env, store, fetch: issuer.fetch, now: clock.now });
		const windowB = new SessionManager({ env, store, fetch: issuer.fetch, now: clock.now });
		await windowA.setSession(await signIn(issuer, clock.now));
		await windowB.current();
		const events: string[] = [];
		windowB.onDidChange((e) => events.push(e.reason));
		clock.advance(9.5 * 60_000);
		const fromA = await windowA.getAccessToken();

		const fromB = await windowB.getAccessToken();

		assert.equal(fromB, fromA);
		assert.equal((await store.load("dev"))?.tokens.accessToken, fromA, "the session window A stored is not cleared");
		assert.deepEqual(events, ["refreshed"]);
	});
});

describe("InjectedTokenSource", () => {
	it("reads the token on every call and reports an expired one", async () => {
		const issuer = new FakeIssuer();
		let token = issuer.accessToken({});
		const source = new InjectedTokenSource({ read: () => token });

		assert.equal(await source.getAccessToken(), token);
		assert.equal((await source.getClaims())?.ouHandle, "acme");

		token = unsignedJwt({ ...issuer.claims(), exp: 1 });
		const error = (await rejection(source.getAccessToken())) as CloudError;
		assert.equal(error.details.reason, "injected_token_expired");

		token = "";
		const none = (await rejection(source.getAccessToken())) as CloudError;
		assert.equal(none.details.reason, "no_session");
	});
});

describe("SessionManager races", () => {
	beforeEach(() => resetDiscoveryCache());

	it("revokes the refresh token of a session that a new sign-in replaces", async () => {
		const issuer = new FakeIssuer();
		const manager = new SessionManager({ env, store: new InMemorySessionStore(), fetch: issuer.fetch });
		const first = await signIn(issuer);
		await manager.setSession(first);
		const second = await signIn(issuer);
		await manager.setSession(second);
		await new Promise((resolve) => setTimeout(resolve, 10));

		assert.deepEqual(issuer.revoked, [first.tokens.refreshToken]);
		assert.equal((await manager.current())?.tokens.accessToken, second.tokens.accessToken);
	});

	it("does not let a new session's caller join the refresh of the session it replaced", async () => {
		const clock = clockFrom(new Date("2026-11-05T10:00:00Z"));
		const issuer = new FakeIssuer({ expiresIn: 600, now: clock.now });
		let release: (() => void) | undefined;
		// The first refresh (the old session's) is held until the test lets it go.
		const fetch: typeof issuer.fetch = async (input, init) => {
			if (!release && String(init?.body ?? "").includes("grant_type=refresh_token")) {
				await new Promise<void>((resolve) => {
					release = resolve;
				});
			}
			return issuer.fetch(input, init);
		};
		const manager = new SessionManager({ env, store: new InMemorySessionStore(), fetch, now: clock.now });
		await manager.setSession(await signIn(issuer, clock.now));
		clock.advance(11 * 60_000);
		const old = rejection(manager.getAccessToken());
		while (!release) {
			await new Promise((resolve) => setImmediate(resolve));
		}

		const next = await signIn(issuer, clock.now);
		await manager.setSession(next);
		const token = await manager.getAccessToken({ forceRefresh: true });
		release();

		assert.equal(readPlatformClaims(token)?.ouHandle, "acme");
		assert.notEqual(token, next.tokens.accessToken, "the new session refreshed on its own");
		assert.equal(((await old) as CloudError).details.reason, "no_session");
	});

	it("does not let a slow first read of the store overwrite a sign-in made meanwhile", async () => {
		const issuer = new FakeIssuer();
		const stale = await signIn(issuer);
		const fresh = await signIn(issuer);
		const gates: (() => void)[] = [];
		const store = new InMemorySessionStore();
		await store.save(stale);
		const slowStore = {
			load: async (name: "dev" | "stage" | "prod") => {
				const value = await store.load(name);
				await new Promise<void>((resolve) => gates.push(resolve));
				return value;
			},
			save: (session: StoredSession) => store.save(session),
			clear: (name: "dev" | "stage" | "prod") => store.clear(name),
		};
		const manager = new SessionManager({ env, store: slowStore, fetch: issuer.fetch });
		const tick = () => new Promise((resolve) => setImmediate(resolve));

		const reading = manager.current();
		await tick();
		const signingIn = manager.setSession(fresh);
		await tick();
		// The sign-in's own read of what it replaces finishes first, then the slow first read.
		gates[1]();
		await signingIn;
		gates[0]();
		await reading;

		assert.equal((await manager.current())?.tokens.accessToken, fresh.tokens.accessToken);
	});

	it("leaves no unhandled rejection when the only caller of a failing refresh had already given up", async () => {
		let t = Date.parse("2026-11-05T10:00:00Z");
		const now = () => new Date(t);
		const issuer = new FakeIssuer({ expiresIn: 600, now });
		const manager = new SessionManager({ env, store: new InMemorySessionStore(), fetch: issuer.fetch, now });
		await manager.setSession(await signIn(issuer, now));
		t += 11 * 60_000;
		issuer.refreshRefusal = "invalid_grant";
		const unhandled: unknown[] = [];
		const onUnhandled = (reason: unknown) => unhandled.push(reason);
		process.on("unhandledRejection", onUnhandled);
		try {
			const gaveUp = AbortSignal.abort();
			const error = (await rejection(manager.getAccessToken({ signal: gaveUp }))) as CloudError;
			assert.equal(error.details.reason, "cancelled");
			assert.equal(error.details.retryable, false);
			await new Promise((resolve) => setTimeout(resolve, 20));
		} finally {
			process.off("unhandledRejection", onUnhandled);
		}
		assert.deepEqual(unhandled, []);
		assert.equal(await manager.current(), undefined, "the refused refresh still ended the session");
	});

	it("drops an update decided before the session was replaced", async () => {
		const issuer = new FakeIssuer();
		const manager = new SessionManager({ env, store: new InMemorySessionStore(), fetch: issuer.fetch });
		await manager.setSession(await signIn(issuer));
		await manager.signOut({ revoke: false });

		assert.equal(await manager.update((s) => ({ ...s, org: { ...s.org, uuid: "late" } })), undefined);
		assert.equal(await manager.current(), undefined);
	});
});
