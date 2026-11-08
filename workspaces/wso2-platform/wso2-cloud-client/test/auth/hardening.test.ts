import assert from "node:assert/strict";
import { connect } from "node:net";
import {
	type CloudError,
	DeferredReceiver,
	ENVIRONMENTS,
	InMemorySessionStore,
	LoginFlow,
	LoopbackReceiver,
	SessionManager,
	discover,
	parseCallback,
	resetDiscoveryCache,
} from "../../src";
import { linkAbort } from "../../src/abort";
import { FakeIssuer, fakeFetch } from "../doubles";
import { rejection } from "../support";

const env = { ...ENVIRONMENTS.dev, issuer: "https://idp.example.invalid", clientId: "WSO2_INTEGRATOR_EXTENSION" };

describe("linkAbort", () => {
	it("is aborted at once by a signal that already was, and tells a timeout from a cancellation", async () => {
		const outer = new AbortController();
		outer.abort();
		const linked = linkAbort(outer.signal, 10_000);
		assert.equal(linked.signal.aborted, true);
		assert.equal(linked.timedOut(), false);
		linked.dispose();

		const timed = linkAbort(undefined, 1);
		await new Promise((resolve) => setTimeout(resolve, 10));
		assert.equal(timed.signal.aborted, true);
		assert.equal(timed.timedOut(), true);
		timed.dispose();
	});
});

describe("parseCallback", () => {
	const failure = (uri: string, state: string): CloudError => {
		try {
			parseCallback(new URL(uri), state);
		} catch (error) {
			return error as CloudError;
		}
		throw new Error("expected parseCallback to throw");
	};

	it("checks the state before it believes an error or a code", () => {
		const stray = failure("http://127.0.0.1:1/callback?error=access_denied&error_description=nope&state=other", "mine");
		assert.equal(stray.details.reason, "state_mismatch");
		const denied = failure("http://127.0.0.1:1/callback?error=access_denied&state=mine", "mine");
		assert.equal(denied.code, "login_cancelled");
		assert.equal(parseCallback(new URL("http://127.0.0.1:1/callback?code=c&state=mine"), "mine"), "c");
	});
});

describe("discover", () => {
	beforeEach(() => resetDiscoveryCache());

	const document = (overrides: Record<string, unknown>) => ({
		issuer: "https://idp.example.invalid",
		authorization_endpoint: "https://idp.example.invalid/authorize",
		token_endpoint: "https://idp.example.invalid/token",
		...overrides,
	});

	it("refuses a document for another issuer, or with an endpoint that is not https", async () => {
		const other = fakeFetch([{ match: "GET /.well-known/openid-configuration", body: document({ issuer: "https://other.example.invalid" }) }]);
		const mismatch = (await rejection(discover("https://idp.example.invalid", other.fetch))) as CloudError;
		assert.equal(mismatch.details.reason, "discovery_failed");
		assert.match(mismatch.message, /another issuer/);

		const plain = fakeFetch([
			{ match: "GET /.well-known/openid-configuration", body: document({ token_endpoint: "http://idp.example.invalid/token" }) },
		]);
		const insecure = (await rejection(discover("https://idp.example.invalid", plain.fetch))) as CloudError;
		assert.equal(insecure.details.reason, "discovery_failed");
		assert.match(insecure.message, /token_endpoint/);

		const good = fakeFetch([{ match: "GET /.well-known/openid-configuration", body: document({ issuer: "https://idp.example.invalid/" }) }]);
		const accepted = await discover("https://idp.example.invalid", good.fetch);
		assert.equal(accepted.token_endpoint, "https://idp.example.invalid/token");
	});
});

describe("LoopbackReceiver", () => {
	it("answers a stray or mismatched request without ending the sign-in", async () => {
		const receiver = new LoopbackReceiver([0]);
		await receiver.start();
		const waiting = receiver.waitForCode("mine");
		const base = receiver.redirectUri;

		const stray = await fetch(`${base}?code=x&state=other`);
		assert.equal(stray.status, 400);
		assert.match(await stray.text(), /another sign-in/);
		const elsewhere = await fetch(`${base.replace("/callback", "/nope")}`);
		assert.equal(elsewhere.status, 404);
		const posted = await fetch(`${base}?code=x&state=mine`, { method: "POST" });
		assert.equal(posted.status, 405);

		const real = await fetch(`${base}?code=the-code&state=mine`);
		assert.equal(real.status, 200);
		assert.match(await real.text(), /Sign-in received/);
		assert.equal(await waiting, "the-code");
		receiver.dispose();
	});

	it("answers a request target no URL can be made of with a 400, without throwing", async () => {
		const receiver = new LoopbackReceiver([0]);
		await receiver.start();
		const waiting = receiver.waitForCode("mine");
		const { port } = new URL(receiver.redirectUri);
		const answer = await new Promise<string>((resolve, reject) => {
			const socket = connect(Number(port), "127.0.0.1", () =>
				socket.write("GET http://[x/ HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n"),
			);
			let text = "";
			socket.on("data", (chunk) => {
				text += chunk.toString();
			});
			socket.on("end", () => resolve(text));
			socket.on("error", reject);
		});
		assert.match(answer, /^HTTP\/1\.1 400/);

		const real = await fetch(`${receiver.redirectUri}?code=the-code&state=mine`);
		assert.equal(real.status, 200, "the sign-in is still waiting");
		assert.equal(await waiting, "the-code");
		receiver.dispose();
	});
});

describe("LoginFlow", () => {
	beforeEach(() => resetDiscoveryCache());

	it("signs in again right after a cancel, without the old run closing the new one's receiver", async () => {
		const issuer = new FakeIssuer();
		const receiver = new DeferredReceiver("vscode://x/signin");
		let attempt = 0;
		const flow = new LoginFlow({
			env,
			fetch: issuer.fetch,
			receiver,
			openBrowser: async (url) => {
				attempt++;
				if (attempt === 2) {
					setImmediate(() => receiver.push(issuer.authorize(url)));
				}
			},
		});
		const first = rejection(flow.run());
		await new Promise((resolve) => setImmediate(resolve));
		flow.cancel();
		const session = await flow.run();
		assert.equal(((await first) as CloudError).code, "login_cancelled");
		assert.equal(session.org.handle, "acme");
		assert.equal(attempt, 2);
	});

	it("refuses a second sign-in while one is waiting, and forgets it once cancelled", async () => {
		const issuer = new FakeIssuer();
		const receiver = new DeferredReceiver("vscode://x/signin");
		let opened = 0;
		const flow = new LoginFlow({
			env,
			fetch: issuer.fetch,
			receiver,
			openBrowser: async () => {
				opened++;
			},
		});
		const first = flow.run();
		await new Promise((resolve) => setImmediate(resolve));
		const second = (await rejection(flow.run())) as CloudError;
		assert.match(second.message, /already in progress/);
		assert.equal(flow.running, true);

		flow.cancel();
		const cancelled = (await rejection(first)) as CloudError;
		assert.equal(cancelled.code, "login_cancelled");
		assert.equal(flow.running, false);
		assert.equal(opened, 1);
	});
});

describe("SessionManager", () => {
	beforeEach(() => resetDiscoveryCache());

	/** A signed-in manager whose clock and token endpoint the test controls. */
	async function managerWithGate() {
		let t = Date.parse("2026-11-05T10:00:00Z");
		const now = () => new Date(t);
		const issuer = new FakeIssuer({ expiresIn: 600, now });
		const receiver = new DeferredReceiver("vscode://x/signin");
		const session = await new LoginFlow({
			env,
			fetch: issuer.fetch,
			receiver,
			now,
			openBrowser: async (url) => {
				setImmediate(() => receiver.push(issuer.authorize(url)));
			},
		}).run();
		let release: () => void = () => undefined;
		let gate = Promise.resolve();
		const hold = () => {
			gate = new Promise<void>((resolve) => {
				release = resolve;
			});
		};
		const gatedFetch: typeof issuer.fetch = async (input, init) => {
			if (new URL(input).pathname.endsWith("/token")) {
				await gate;
			}
			return issuer.fetch(input, init);
		};
		const store = new InMemorySessionStore();
		const manager = new SessionManager({ env, store, fetch: gatedFetch, now });
		await manager.setSession(session);
		return {
			manager,
			store,
			issuer,
			session,
			hold,
			release: () => release(),
			advance: (ms: number) => {
				t += ms;
			},
		};
	}

	it("keeps the session when the issuer answers a refresh with something other than invalid_grant", async () => {
		const { manager, store, issuer, session, advance } = await managerWithGate();
		advance(9.5 * 60_000);
		issuer.refreshRefusal = "invalid_scope";

		assert.equal(await manager.getAccessToken(), session.tokens.accessToken, "the current token is still handed out");
		assert.ok(await store.load("dev"), "an invalid_scope answer does not sign the person out");
	});

	it("finishes a shared refresh for the others when the caller that started it gives up", async () => {
		const { manager, session, hold, release, advance } = await managerWithGate();
		advance(9.5 * 60_000);
		hold();
		const quitter = new AbortController();
		const first = rejection(manager.getAccessToken({ signal: quitter.signal }));
		const second = manager.getAccessToken();
		await new Promise((resolve) => setImmediate(resolve));
		quitter.abort();
		assert.equal(((await first) as CloudError).details.reason, "cancelled");
		release();
		const token = await second;
		assert.notEqual(token, session.tokens.accessToken, "the refresh went through for the caller still waiting");
	});

	it("keeps an update made while a refresh was in flight", async () => {
		const { manager, store, hold, release, advance } = await managerWithGate();
		advance(9.5 * 60_000);
		hold();
		const refreshing = manager.getAccessToken();
		await new Promise((resolve) => setImmediate(resolve));
		await manager.update((current) => ({ ...current, org: { ...current.org, uuid: "org-uuid" } }));
		release();
		await refreshing;

		assert.equal((await manager.current())?.org.uuid, "org-uuid");
		assert.equal((await store.load("dev"))?.org.uuid, "org-uuid");
	});

	it("drops a refresh that finishes after the person signed out", async () => {
		let t = Date.parse("2026-11-05T10:00:00Z");
		const now = () => new Date(t);
		const issuer = new FakeIssuer({ expiresIn: 10, now });
		const receiver = new DeferredReceiver("vscode://x/signin");
		const session = await new LoginFlow({
			env,
			fetch: issuer.fetch,
			receiver,
			now,
			openBrowser: async (url) => {
				setImmediate(() => receiver.push(issuer.authorize(url)));
			},
		}).run();
		let release: () => void = () => undefined;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const slowFetch: typeof issuer.fetch = async (input, init) => {
			if (new URL(input).pathname.endsWith("/token")) {
				await gate;
			}
			return issuer.fetch(input, init);
		};
		const store = new InMemorySessionStore();
		const manager = new SessionManager({ env, store, fetch: slowFetch, now });
		await manager.setSession(session);
		t += 60_000;

		const refreshing = rejection(manager.getAccessToken());
		await new Promise((resolve) => setImmediate(resolve));
		await manager.signOut({ revoke: false });
		release();

		const error = (await refreshing) as CloudError;
		assert.equal(error.details.reason, "no_session");
		assert.equal(await store.load("dev"), undefined, "the refreshed tokens were not stored");
		assert.equal(await manager.current(), undefined);
	});

	it("keeps the session when the issuer is down, while the token lasts", async () => {
		let t = Date.parse("2026-11-05T10:00:00Z");
		const now = () => new Date(t);
		const issuer = new FakeIssuer({ expiresIn: 600, now });
		const receiver = new DeferredReceiver("vscode://x/signin");
		const session = await new LoginFlow({
			env,
			fetch: issuer.fetch,
			receiver,
			now,
			openBrowser: async (url) => {
				setImmediate(() => receiver.push(issuer.authorize(url)));
			},
		}).run();
		let down = false;
		const fetchImpl: typeof issuer.fetch = async (input, init) => {
			if (down && new URL(input).pathname.endsWith("/token")) {
				return new Response("upstream request timeout", { status: 503 });
			}
			return issuer.fetch(input, init);
		};
		const store = new InMemorySessionStore();
		const manager = new SessionManager({ env, store, fetch: fetchImpl, now });
		const events: string[] = [];
		manager.onDidChange((e) => events.push(e.reason));
		await manager.setSession(session);

		t += 9.5 * 60_000;
		down = true;
		assert.equal(await manager.getAccessToken(), session.tokens.accessToken, "the old token is handed out");
		assert.ok(await store.load("dev"), "the session is still stored");
		assert.deepEqual(events, ["signed-in"]);

		t += 60_000;
		const expired = (await rejection(manager.getAccessToken())) as CloudError;
		assert.equal(expired.code, "login_failed");
		assert.ok(await store.load("dev"), "an outage still does not sign the person out");
	});
});
