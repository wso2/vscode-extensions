import assert from "node:assert/strict";
import { type CloudError, DeferredReceiver, ENVIRONMENTS, LoginFlow, LoopbackReceiver, resetDiscoveryCache } from "../../src";
import { FakeIssuer } from "../doubles";
import { rejection } from "../support";

const env = { ...ENVIRONMENTS.dev, issuer: "https://idp.example.invalid", clientId: "WSO2_INTEGRATOR_EXTENSION" };

describe("LoginFlow", () => {
	beforeEach(() => resetDiscoveryCache());

	it("signs in with PKCE through a deferred receiver and stores the claims", async () => {
		const issuer = new FakeIssuer();
		const receiver = new DeferredReceiver("vscode://wso2.wso2-integrator/signin");
		const opened: string[] = [];
		const flow = new LoginFlow({
			env,
			fetch: issuer.fetch,
			receiver,
			openBrowser: async (url) => {
				opened.push(url);
				// The browser comes back, as VS Code's URI handler would hand it in.
				setImmediate(() => receiver.push(issuer.authorize(url)));
			},
		});

		const session = await flow.run();

		assert.equal(session.env, "dev");
		assert.equal(session.obtainedVia, "browser");
		assert.equal(session.org.handle, "acme");
		assert.equal(session.account.label, "jane@example.com");
		assert.ok(session.tokens.refreshToken);
		assert.ok(session.tokens.idToken);
		const authorize = new URL(opened[0]);
		assert.equal(authorize.searchParams.get("code_challenge_method"), "S256");
		assert.equal(authorize.searchParams.get("redirect_uri"), "vscode://wso2.wso2-integrator/signin");
		const scope = authorize.searchParams.get("scope")?.split(" ") ?? [];
		assert.deepEqual(scope.slice(0, 4), ["openid", "offline_access", "profile", "email"]);
		assert.ok(scope.includes("cloud:project:read") && scope.includes("ipaas:integration:read"), "asks for the platform permissions");
		assert.equal(authorize.searchParams.get("resource"), "urn:wso2:cloud");
		const tokenCall = issuer.calls.find((c) => c.form.grant_type === "authorization_code");
		assert.ok(tokenCall?.form.code_verifier);
		assert.equal(tokenCall?.form.resource, undefined, "the resource is not repeated on the code exchange");
		assert.equal(tokenCall?.form.client_id, "WSO2_INTEGRATOR_EXTENSION");
	});

	it("takes a callback pushed while the browser is being opened", async () => {
		const issuer = new FakeIssuer();
		const receiver = new DeferredReceiver("vscode://wso2.wso2-integrator/signin");
		const flow = new LoginFlow({
			env,
			fetch: issuer.fetch,
			receiver,
			// Pushing synchronously inside openBrowser: the waiter is already registered, so it resolves.
			openBrowser: async (url) => {
				receiver.push(issuer.authorize(url));
			},
		});
		const session = await flow.run();
		assert.equal(session.claims.ouHandle, "acme");
	});

	it("ignores a callback with another state, refuses a provider error, and can be cancelled", async () => {
		const issuer = new FakeIssuer();
		const receiver = new DeferredReceiver("vscode://x/signin");
		let strayTaken: boolean | undefined;
		const flow = new LoginFlow({
			env,
			fetch: issuer.fetch,
			receiver,
			openBrowser: async (url) => {
				const back = issuer.authorize(url);
				back.searchParams.set("state", "someone-else");
				setImmediate(() => {
					// A callback for another sign-in is nobody's: it is dropped and this one keeps waiting.
					strayTaken = receiver.push(back);
					flow.cancel();
				});
			},
		});
		const mismatch = (await rejection(flow.run())) as CloudError;
		assert.equal(strayTaken, false);
		assert.equal(mismatch.code, "login_cancelled");
		assert.equal(flow.running, false);

		const denied = new LoginFlow({
			env,
			fetch: issuer.fetch,
			receiver,
			openBrowser: async (url) => {
				setImmediate(() => receiver.push(issuer.authorize(url, { error: "access_denied" })));
			},
		});
		const cancelled = (await rejection(denied.run())) as CloudError;
		assert.equal(cancelled.code, "login_cancelled");

		const abandoned = new LoginFlow({ env, fetch: issuer.fetch, receiver, openBrowser: async () => undefined });
		const run = abandoned.run();
		abandoned.cancel();
		const aborted = (await rejection(run)) as CloudError;
		assert.equal(aborted.code, "login_cancelled");
	});

	it("gives up when the browser never comes back", async () => {
		const issuer = new FakeIssuer();
		const flow = new LoginFlow({ env, fetch: issuer.fetch, receiver: new DeferredReceiver("vscode://x/signin"), openBrowser: async () => undefined });
		const error = (await rejection(flow.run({ timeoutMs: 20 }))) as CloudError;
		assert.equal(error.code, "login_failed");
		assert.equal(error.details.reason, "timed_out");
	});

	it("refuses a token without the organization claims", async () => {
		const issuer = new FakeIssuer({ claims: { ouHandle: "" } });
		const receiver = new DeferredReceiver("vscode://x/signin");
		const flow = new LoginFlow({
			env,
			fetch: issuer.fetch,
			receiver,
			openBrowser: async (url) => {
				setImmediate(() => receiver.push(issuer.authorize(url)));
			},
		});
		const error = (await rejection(flow.run())) as CloudError;
		assert.equal(error.details.reason, "claims_missing");
		assert.ok(error.message.includes("ouHandle"));
	});

	it("signs in through a loopback listener on 127.0.0.1", async () => {
		const issuer = new FakeIssuer();
		const receiver = new LoopbackReceiver([0]);
		const flow = new LoginFlow({
			env,
			fetch: issuer.fetch,
			receiver,
			openBrowser: async (url) => {
				const back = issuer.authorize(url);
				// The browser follows the redirect to the listener.
				const response = await fetch(back.toString());
				assert.equal(response.status, 200);
				assert.ok((await response.text()).includes("You are signed in"));
			},
		});

		const session = await flow.run();

		assert.equal(session.org.handle, "acme");
		assert.match(new URL(issuer.calls[0].form.redirect_uri).origin, /^http:\/\/127\.0\.0\.1:\d+$/);
	});

	it("passes extra authorization parameters through, for organization re-selection", async () => {
		const issuer = new FakeIssuer();
		const receiver = new DeferredReceiver("vscode://x/signin");
		let authorizeUrl = "";
		const flow = new LoginFlow({
			env,
			fetch: issuer.fetch,
			receiver,
			openBrowser: async (url) => {
				authorizeUrl = url;
				setImmediate(() => receiver.push(issuer.authorize(url)));
			},
		});
		await flow.run({ extraAuthParams: { prompt: "login" } });
		assert.equal(new URL(authorizeUrl).searchParams.get("prompt"), "login");
	});

	it("refuses an extra parameter that would replace one the flow sets, before opening the browser", async () => {
		const issuer = new FakeIssuer();
		const opened: string[] = [];
		const flow = new LoginFlow({
			env,
			fetch: issuer.fetch,
			receiver: new DeferredReceiver("vscode://x/signin"),
			openBrowser: async (url) => {
				opened.push(url);
			},
		});

		const error = (await rejection(flow.run({ extraAuthParams: { prompt: "login", state: "mine" } }))) as CloudError;

		assert.equal(error.code, "login_failed");
		assert.match(error.message, /state/);
		assert.deepEqual(opened, []);
		assert.equal(flow.running, false);
	});

	it("requires the ID token when openid was asked for, so its checks cannot be skipped", async () => {
		const issuer = new FakeIssuer();
		const withoutIdToken: typeof issuer.fetch = async (input, init) => {
			const response = await issuer.fetch(input, init);
			if (input !== issuer.tokenEndpoint) {
				return response;
			}
			const { id_token: _dropped, ...rest } = (await response.json()) as Record<string, unknown>;
			return new Response(JSON.stringify(rest), { status: response.status, headers: { "content-type": "application/json" } });
		};
		const run = (scopes?: string[]) => {
			const receiver = new DeferredReceiver("vscode://x/signin");
			return new LoginFlow({
				env,
				fetch: withoutIdToken,
				receiver,
				scopes,
				openBrowser: async (url) => {
					setImmediate(() => receiver.push(issuer.authorize(url)));
				},
			}).run();
		};

		const error = (await rejection(run())) as CloudError;
		assert.equal(error.code, "login_failed");
		assert.equal(error.details.reason, "token_endpoint_failed");

		const session = await run(["offline_access"]);
		assert.equal(session.tokens.idToken, undefined, "a sign-in that did not ask for openid needs none");
	});
});
