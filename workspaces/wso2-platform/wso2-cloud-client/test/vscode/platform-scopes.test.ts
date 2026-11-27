import assert from "node:assert/strict";
import {
	BrowserLoginTokenSource,
	DeferredReceiver,
	InMemorySessionStore,
	LoginFlow,
	SessionManager,
	type StoredSession,
	sessionKey,
} from "../../src";
import { ApiKeys, SecretStorageSessionStore, WSO2CloudAuthenticationProvider, scopeForPlatform, sessionId } from "../../src/vscode";
import { FakeIssuer } from "../doubles";
import { FakeSecretStorage, resetVscode } from "../doubles/vscode";
import { DEV } from "../support";

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

async function signedInProvider(platform?: string) {
	const issuer = new FakeIssuer();
	const sessions = new SessionManager({ env, store: new InMemorySessionStore(), fetch: issuer.fetch });
	const auth = new WSO2CloudAuthenticationProvider({
		env,
		sessions,
		apiKeys: new ApiKeys(),
		tokenSource: new BrowserLoginTokenSource(sessions),
		startLogin: () => signIn(issuer),
		platform,
	});
	const session = await signIn(issuer);
	await sessions.setSession(session);
	return { auth, session };
}

describe("sessions of another platform", () => {
	beforeEach(() => resetVscode());

	it("hand a session to a request naming an environment only when it also names the platform", async () => {
		const { auth, session } = await signedInProvider("devant");

		assert.deepEqual(await auth.getSessions(["env:dev"]), [], "an extension that knows only the default platform gets no key to another");
		const [named] = await auth.getSessions(["env:dev", scopeForPlatform("devant")]);
		assert.ok(named);
		assert.ok(named.scopes.includes(scopeForPlatform("devant")));
		assert.equal(named.id, sessionId(session, "devant"));
		assert.deepEqual(await auth.getSessions(["env:dev", scopeForPlatform("other")]), []);
		assert.equal((await auth.getSessions()).length, 1, "VS Code's own account list still sees the session");
		// Scopes that name neither an environment nor the platform are no request for this platform's key.
		assert.deepEqual(await auth.getSessions([]), []);
		assert.deepEqual(await auth.getSessions(["org:acme"]), []);
		await assert.rejects(auth.createSession(["prompt:login"]));
	});

	it("are refused a sign-in a request starts without naming the platform", async () => {
		const { auth } = await signedInProvider("devant");
		await assert.rejects(auth.createSession(["env:dev"]), /names another platform or environment/);
	});

	it("leave the default platform's sessions to requests that name no platform", async () => {
		const { auth, session } = await signedInProvider();

		const [plain] = await auth.getSessions(["env:dev"]);
		assert.ok(plain);
		assert.ok(!plain.scopes.some((s) => s.startsWith("platform:")));
		assert.equal(plain.id, sessionId(session), "ids of the default platform's sessions are unchanged");
		assert.deepEqual(await auth.getSessions(["env:dev", scopeForPlatform("devant")]), []);
		assert.notEqual(sessionId(session, "devant"), sessionId(session));
	});

	it("are stored under their own keys, and report only their own changes", async () => {
		const secrets = new FakeSecretStorage();
		const plain = new SecretStorageSessionStore(secrets as never);
		const devant = new SecretStorageSessionStore(secrets as never, "devant");
		const session = await signIn(new FakeIssuer());
		const devantChanges: string[] = [];
		devant.onDidChange((name) => devantChanges.push(name));

		await plain.save(session);
		assert.equal(await devant.load("dev"), undefined);
		assert.deepEqual(devantChanges, [], "a change to the default platform's key is not reported");

		await devant.save({ ...session, account: { ...session.account, label: "devant" } });
		assert.equal((await devant.load("dev"))?.account.label, "devant");
		assert.equal((await plain.load("dev"))?.account.label, session.account.label);
		assert.deepEqual(devantChanges, ["dev"]);
		assert.equal(sessionKey("dev", "devant"), "wso2-cloud.devant.session.dev");
		assert.equal(sessionKey("dev"), "wso2-cloud.session.dev");

		await devant.clear("dev");
		assert.equal(await devant.load("dev"), undefined);
		assert.ok(await plain.load("dev"));
	});
});
