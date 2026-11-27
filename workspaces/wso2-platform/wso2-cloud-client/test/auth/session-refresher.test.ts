import assert from "node:assert/strict";
import {
	type CloudError,
	DeferredReceiver,
	InMemorySessionStore,
	LoginFlow,
	OAuthError,
	RefreshInterruptedError,
	type RefreshedTokens,
	SessionManager,
	type SessionRefresher,
	type StoredSession,
	resetDiscoveryCache,
} from "../../src";
import { FakeIssuer } from "../doubles";
import { DEV, rejection } from "../support";

const env = { ...DEV, issuer: "https://idp.example.invalid", clientId: "WSO2_INTEGRATOR_EXTENSION" };

async function signIn(issuer: FakeIssuer, now: () => Date): Promise<StoredSession> {
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

/** A refresher that answers from a script and records what it was asked. */
function scriptedRefresher(script: { prepare?: () => Promise<void>; refresh?: (token: string) => Promise<RefreshedTokens> }) {
	const calls = { prepared: 0, refreshed: [] as string[], revoked: [] as string[] };
	const refresher: SessionRefresher = {
		async prepare() {
			calls.prepared++;
			await script.prepare?.();
			return async (refreshToken) => {
				calls.refreshed.push(refreshToken);
				if (!script.refresh) {
					throw new Error("no refresh scripted");
				}
				return script.refresh(refreshToken);
			};
		},
		async revoke(session) {
			calls.revoked.push(session.tokens.refreshToken ?? "");
		},
	};
	return { refresher, calls };
}

describe("SessionManager with another identity provider's refresher", () => {
	beforeEach(() => resetDiscoveryCache());

	const start = new Date("2026-11-05T10:00:00Z");

	it("refreshes and revokes through the refresher, never the session's issuer", async () => {
		let t = start.getTime();
		const now = () => new Date(t);
		const issuer = new FakeIssuer({ expiresIn: 600, now });
		const session = await signIn(issuer, now);
		const { refresher, calls } = scriptedRefresher({
			refresh: async () => ({
				tokens: { access_token: "access-2", refresh_token: "refresh-2", expires_in: 600 },
				claims: session.claims,
			}),
		});
		const store = new InMemorySessionStore();
		const manager = new SessionManager({ env, store, fetch: issuer.fetch, now, refresher });
		await manager.setSession(session);
		const issuerCalls = issuer.calls.length;

		t += 9.5 * 60_000;
		assert.equal(await manager.getAccessToken(), "access-2");
		assert.deepEqual(calls.refreshed, [session.tokens.refreshToken]);
		assert.equal((await store.load("dev"))?.tokens.refreshToken, "refresh-2");

		await manager.signOut();
		assert.deepEqual(calls.revoked, ["refresh-2"]);
		assert.equal(issuer.calls.length, issuerCalls, "the issuer is not asked to refresh or revoke");
		assert.deepEqual(issuer.revoked, []);
	});

	it("ends the session when the refresher's provider refuses the refresh token", async () => {
		let t = start.getTime();
		const now = () => new Date(t);
		const issuer = new FakeIssuer({ expiresIn: 600, now });
		const { refresher } = scriptedRefresher({
			refresh: async () => {
				throw new OAuthError("invalid_grant", "refresh token revoked", 400);
			},
		});
		const store = new InMemorySessionStore();
		const manager = new SessionManager({ env, store, fetch: issuer.fetch, now, refresher });
		await manager.setSession(await signIn(issuer, now));

		t += 9.5 * 60_000;
		const error = (await rejection(manager.getAccessToken())) as CloudError;
		assert.equal(error.code, "session_expired");
		assert.equal(await store.load("dev"), undefined);
	});

	it("keeps an unexpired session when the refresher cannot get ready, as when its provider is down", async () => {
		let t = start.getTime();
		const now = () => new Date(t);
		const issuer = new FakeIssuer({ expiresIn: 600, now });
		const session = await signIn(issuer, now);
		const { refresher, calls } = scriptedRefresher({
			prepare: async () => {
				throw new TypeError("fetch failed");
			},
		});
		const manager = new SessionManager({ env, store: new InMemorySessionStore(), fetch: issuer.fetch, now, refresher });
		await manager.setSession(session);

		t += 9.5 * 60_000;
		assert.equal(await manager.getAccessToken(), session.tokens.accessToken);
		assert.equal(calls.prepared, 1);
		assert.deepEqual(calls.refreshed, []);

		t += 60_000;
		const error = (await rejection(manager.getAccessToken())) as CloudError;
		assert.equal(error.code, "network");
	});

	it("keeps the refresh token a refresh got before it failed, and refreshes with it next", async () => {
		let t = start.getTime();
		const now = () => new Date(t);
		const issuer = new FakeIssuer({ expiresIn: 600, now });
		const session = await signIn(issuer, now);
		let interrupted = true;
		const { refresher, calls } = scriptedRefresher({
			refresh: async () => {
				if (interrupted) {
					throw new RefreshInterruptedError("refresh-2", new TypeError("fetch failed"));
				}
				return { tokens: { access_token: "access-3", refresh_token: "refresh-3", expires_in: 600 }, claims: session.claims };
			},
		});
		const store = new InMemorySessionStore();
		const manager = new SessionManager({ env, store, fetch: issuer.fetch, now, refresher });
		await manager.setSession(session);

		t += 9.5 * 60_000;
		assert.equal(await manager.getAccessToken(), session.tokens.accessToken, "the current token while it lasts");
		assert.equal((await store.load("dev"))?.tokens.refreshToken, "refresh-2");
		assert.equal((await store.load("dev"))?.tokens.accessToken, session.tokens.accessToken);

		interrupted = false;
		assert.equal(await manager.getAccessToken({ forceRefresh: true }), "access-3");
		assert.deepEqual(calls.refreshed, [session.tokens.refreshToken, "refresh-2"]);
	});

	it("ends the session when the step after the new refresh token is refused", async () => {
		let t = start.getTime();
		const now = () => new Date(t);
		const issuer = new FakeIssuer({ expiresIn: 600, now });
		const { refresher } = scriptedRefresher({
			refresh: async () => {
				throw new RefreshInterruptedError("refresh-2", new OAuthError("invalid_grant", "no longer a member", 400));
			},
		});
		const store = new InMemorySessionStore();
		const manager = new SessionManager({ env, store, fetch: issuer.fetch, now, refresher });
		await manager.setSession(await signIn(issuer, now));

		t += 9.5 * 60_000;
		const error = (await rejection(manager.getAccessToken())) as CloudError;
		assert.equal(error.code, "session_expired");
		assert.equal(await store.load("dev"), undefined);
	});
});
