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
import { LoginError } from "../../src";
import { challengeS256 } from "../../src/auth/pkce";
import { DevantLogin, devantRefresher, isDevantSession, switchOrganization } from "../../src/devant";
import { rejection } from "../support";
import { EU, ManualCallback, US, fakeDevant } from "./fake-devant";

const DEPLOYMENTS = { US, EU };

function login(fake: ReturnType<typeof fakeDevant>, callback: ManualCallback, opened: string[] = [], timeoutMs?: number) {
	return new DevantLogin({
		deployments: DEPLOYMENTS,
		fetch: fake.fetch,
		callback,
		timeoutMs,
		openBrowser: async (url) => {
			opened.push(url);
		},
	});
}

describe("Devant sign-in", () => {
	it("opens the console's editor sign-in with PKCE and a state naming the callback and both regions", () => {
		const url = new URL(
			login(fakeDevant(), new ManualCallback()).signInUrl("EU", "vscode://wso2.wso2-integrator/signin?platform=devant&nonce=n1", "verifier-1"),
		);
		assert.equal(`${url.origin}${url.pathname}`, `${EU.consoleUrl}/login`);
		assert.equal(url.searchParams.get("profile"), "vs-code");
		assert.equal(url.searchParams.get("client_id"), EU.asgardeoClientId);
		assert.equal(url.searchParams.get("code_challenge"), challengeS256("verifier-1"));
		assert.equal(url.searchParams.get("code_challenge_method"), "S256");
		const state = JSON.parse(Buffer.from(url.searchParams.get("state") ?? "", "base64").toString());
		assert.deepEqual(state, {
			origin: "vscode.choreo.ext",
			callbackUri: "vscode://wso2.wso2-integrator/signin?platform=devant&nonce=n1",
			regions: [
				{ region: "US", clientId: US.asgardeoClientId },
				{ region: "EU", clientId: EU.asgardeoClientId },
			],
		});
	});

	it("exchanges the code, reads the account, and answers the session of the organization asked for", async () => {
		const fake = fakeDevant();
		const callback = new ManualCallback();
		const opened: string[] = [];
		const running = login(fake, callback, opened).run({ organization: "beta" });
		await callback.send({ code: "code-1", region: "US" });
		const session = await running;

		assert.equal(opened.length, 1);
		const verifierChallenge = new URL(opened[0]).searchParams.get("code_challenge");
		const exchange = new URLSearchParams(fake.last("POST /t/a/oauth2/token")?.rawBody);
		assert.equal(fake.last("POST /t/a/oauth2/token")?.url.host, "api.asgardeo.io");
		assert.equal(exchange.get("code"), "code-1");
		assert.equal(exchange.get("redirect_uri"), `${US.consoleUrl}/vscode-auth`);
		assert.equal(challengeS256(exchange.get("code_verifier") ?? ""), verifierChallenge);
		assert.equal(fake.last("GET /user-mgt/1.0.0/validate/user")?.headers.authorization, "Bearer asgardeo-token");

		const [orgExchange] = fake.stsForms();
		assert.equal(orgExchange.get("grant_type"), "urn:ietf:params:oauth:grant-type:token-exchange");
		assert.equal(orgExchange.get("subject_token"), "asgardeo-token");
		assert.equal(orgExchange.get("orgHandle"), "beta");
		assert.equal(orgExchange.get("client_id"), US.stsClientId);

		assert.ok(isDevantSession(session));
		assert.equal(session.env, "prod");
		assert.equal(session.devant.region, "US");
		assert.deepEqual(session.org, { id: "102", handle: "beta", name: "Beta", uuid: "uuid-beta", numericId: 102 });
		assert.equal(session.account.label, "dev@example.com");
		assert.equal(session.tokens.refreshToken, "rt-beta");
		assert.equal(session.claims.ouHandle, "beta");
		assert.deepEqual(
			session.devant.organizations.map((org) => org.handle),
			["acme", "beta"],
		);
	});

	it("finishes in the region the person signed in to on the console", async () => {
		const fake = fakeDevant();
		const callback = new ManualCallback();
		const running = login(fake, callback).run();
		await callback.send({ code: "code-1", region: "EU" });
		const session = await running;
		assert.equal(session.devant.region, "EU");
		assert.equal(fake.last("POST /t/a/oauth2/token")?.url.host, "api.eu.asgardeo.io");
		assert.equal(fake.last("POST /oauth2/token")?.url.host, "sts.eu.choreo.dev");
		assert.equal(session.org.handle, "acme", "the first organization when none is asked for");
	});

	it("points a person with no Devant account to Choreo Cloud", async () => {
		const callback = new ManualCallback();
		const running = login(fakeDevant({ noAccount: true }), callback).run();
		await callback.send({ code: "code-1" });
		const error = (await rejection(running)) as LoginError;
		assert.ok(error instanceof LoginError);
		assert.equal(error.details.reason, "no_account");
		assert.match(error.message, /Choreo Cloud/);
	});

	it("gives up when the browser does not come back in time", async () => {
		const error = (await rejection(login(fakeDevant(), new ManualCallback(), [], 20).run())) as LoginError;
		assert.equal(error.details.reason, "timed_out");
	});

	it("refreshes at the token service and exchanges the new token for the session's organization again", async () => {
		const fake = fakeDevant();
		const callback = new ManualCallback();
		const running = login(fake, callback).run({ organization: "acme" });
		await callback.send({ code: "code-1" });
		const session = await running;

		const refresh = await devantRefresher(DEPLOYMENTS, fake.fetch).prepare(session);
		const { tokens, claims } = await refresh("rt-acme");
		const [, refreshForm, exchangeForm] = fake.stsForms();
		assert.equal(refreshForm.get("grant_type"), "refresh_token");
		assert.equal(refreshForm.get("refresh_token"), "rt-acme");
		assert.equal(exchangeForm.get("subject_token"), "plain-refreshed");
		assert.equal(exchangeForm.get("orgHandle"), "acme");
		assert.equal(tokens.refresh_token, "rt-acme");
		assert.equal(claims.ouHandle, "acme");
	});

	it("moves a session to another of the person's organizations without the browser", async () => {
		const fake = fakeDevant();
		const callback = new ManualCallback();
		const running = login(fake, callback).run();
		await callback.send({ code: "code-1" });
		const session = await running;

		const next = await switchOrganization(session, session.devant.organizations[1], DEPLOYMENTS, fake.fetch);
		const exchange = fake.stsForms().at(-1);
		assert.equal(exchange?.get("subject_token"), session.tokens.accessToken);
		assert.equal(exchange?.get("orgHandle"), "beta");
		assert.equal(next.org.handle, "beta");
		assert.deepEqual(next.devant, session.devant);
	});
});
