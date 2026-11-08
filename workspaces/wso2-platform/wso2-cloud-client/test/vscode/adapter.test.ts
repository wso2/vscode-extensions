import assert from "node:assert/strict";
import {
	BrowserLoginTokenSource,
	type CloudError,
	DeferredReceiver,
	FallbackReceiver,
	InMemorySessionStore,
	LoginFlow,
	SessionManager,
	type StoredSession,
} from "../../src";
import {
	CLOUD_ENV_SETTING,
	UriCallbackReceiver,
	WSO2CloudAuthenticationProvider,
	chooseReceivers,
	readCloudEnvName,
	scopeForOrg,
	userSetting,
} from "../../src/vscode";
import { FakeIssuer } from "../doubles";
import { Uri, resetVscode, state } from "../doubles/vscode";
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
	});

	it("listens on the loopback on the local desktop, takes the URI over a remote, and refuses an unknown remote", () => {
		const local = chooseReceivers({ extensionId: "wso2.wso2-integrator" }, { uriScheme: "vscode", uiKind: 1, remoteName: undefined });
		assert.ok(local.receiver instanceof FallbackReceiver);
		assert.ok(local.uriReceiver);

		const remote = chooseReceivers({ extensionId: "wso2.wso2-integrator" }, { uriScheme: "vscode", uiKind: 1, remoteName: "ssh-remote" });
		assert.equal(remote.receiver, remote.uriReceiver);

		assert.throws(
			() => chooseReceivers({ extensionId: "wso2.wso2-integrator" }, { uriScheme: "code-oss", uiKind: 1, remoteName: "ssh-remote" }),
			/not supported/,
		);
	});

	describe("authentication provider", () => {
		async function provider(options: { resolveOrg?: (session: StoredSession) => Promise<{ uuid?: string }> } = {}) {
			const issuer = new FakeIssuer();
			const sessions = new SessionManager({ env, store: new InMemorySessionStore(), fetch: issuer.fetch });
			const auth = new WSO2CloudAuthenticationProvider({
				env,
				sessions,
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
			assert.equal(handed.accessToken, held.other?.tokens.accessToken, "the session held now is the one reported");
			assert.equal((await built.sessions.current())?.org.uuid, undefined);
		});
	});
});
