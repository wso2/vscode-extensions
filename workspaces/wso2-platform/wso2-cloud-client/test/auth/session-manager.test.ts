import assert from "node:assert/strict";
import {
	BrowserLoginTokenSource,
	type CloudError,
	DeferredReceiver,
	ExchangingTokenSource,
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
import { FakeIssuer, composeFetch, fakeFetch, unsignedJwt } from "../../src/testing";
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

describe("ExchangingTokenSource", () => {
	beforeEach(() => resetDiscoveryCache());

	it("exchanges the login token for one bound to the resource, once per resource", async () => {
		const clock = clockFrom(new Date("2026-11-05T10:00:00Z"));
		const issuer = new FakeIssuer({ now: clock.now });
		const manager = new SessionManager({ env, store: new InMemorySessionStore(), fetch: issuer.fetch, now: clock.now });
		await manager.setSession(await signIn(issuer, clock.now));
		const source = new ExchangingTokenSource(new BrowserLoginTokenSource(manager), {
			issuer: env.issuer,
			clientId: env.clientId,
			fetch: issuer.fetch,
			now: clock.now,
		});

		const first = await source.getAccessToken({ resource: env.apiBaseUrl });
		const second = await source.getAccessToken({ resource: env.apiBaseUrl });

		assert.equal(first, second);
		assert.equal(readPlatformClaims(first)?.aud, env.apiBaseUrl);
		const exchanges = issuer.calls.filter((c) => c.form.grant_type === "urn:ietf:params:oauth:grant-type:token-exchange");
		assert.equal(exchanges.length, 1);
		assert.equal(exchanges[0].form.resource, env.apiBaseUrl);
		assert.notEqual(await source.getAccessToken(), first, "without a resource the login token itself is answered");
	});
});
