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
import {
	type CloudError,
	DeferredReceiver,
	InMemorySessionStore,
	LoginFlow,
	OAuthError,
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
});
