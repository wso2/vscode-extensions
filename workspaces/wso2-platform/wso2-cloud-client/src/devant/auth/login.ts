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

import type { FetchLike } from "../../api/http";
import { challengeS256, createVerifier, randomUrlSafe } from "../../auth/pkce";
import { LoginError } from "../../errors";
import type { Logger } from "../../logger";
import { silentLogger } from "../../logger";
import type { DevantDeployment, DevantRegion } from "../environments";
import { DEVANT_REGIONS } from "../environments";
import type { DevantOrganization, DevantStoredSession } from "./session";
import { sessionFor, signInFailure, validateUser } from "./session";
import { exchangeConsoleCode, exchangeForOrganization } from "./tokens";

/** What the console's editor page hands back: the authorization code, and the region the person signed in to. */
export interface DevantCallbackResult {
	code: string;
	region?: string;
}

/** Where the console's editor page sends a sign-in back to. The page keeps the address's query, so it carries a nonce. */
export interface DevantCallback {
	/** The address the page is told to send the sign-in `nonce` names to. */
	callbackUri(nonce: string): Promise<string>;
	/** Resolves once the page has sent back the sign-in `nonce` names; `signal` abandons the wait. */
	waitForCallback(nonce: string, signal?: AbortSignal): Promise<DevantCallbackResult>;
}

export interface DevantLoginOptions {
	deployments: Readonly<Record<DevantRegion, DevantDeployment>>;
	fetch: FetchLike;
	callback: DevantCallback;
	/** Opens the console's sign-in page; throws when the person declined to open it. */
	openBrowser(url: string): Promise<void>;
	logger?: Logger;
	now?: () => Date;
	/** How long the browser is given to come back. */
	timeoutMs?: number;
}

export interface DevantLoginRun {
	/** The region whose console the sign-in starts on; the person may end up in the other one. */
	region?: DevantRegion;
	/** The organization to sign in to, by handle, when the person belongs to it; else the first one. */
	organization?: string;
}

const DEFAULT_TIMEOUT_MS = 5 * 60_000;

/**
 * The sign-in a Devant editor runs: the console's sign-in page, which hands an Asgardeo authorization code back to
 * the editor through its editor page, then the code exchange, the person's account, and the exchange for one of
 * their organizations at the token service. PKCE binds the code to this sign-in; the nonce in the callback address
 * tells it apart from another one.
 */
export class DevantLogin {
	private readonly logger: Logger;
	private pending?: AbortController;

	constructor(private readonly options: DevantLoginOptions) {
		this.logger = options.logger ?? silentLogger;
	}

	/** The console's sign-in page for a sign-in that starts in `region` and comes back to `callbackUri`. */
	signInUrl(region: DevantRegion, callbackUri: string, codeVerifier: string): string {
		const deployment = this.options.deployments[region];
		const state = {
			origin: "vscode.choreo.ext",
			callbackUri,
			regions: DEVANT_REGIONS.map((item) => ({ region: item, clientId: this.options.deployments[item].asgardeoClientId })),
		};
		const params = [
			"profile=vs-code",
			`client_id=${encodeURIComponent(deployment.asgardeoClientId)}`,
			`code_challenge=${challengeS256(codeVerifier)}`,
			"code_challenge_method=S256",
			`state=${encodeURIComponent(Buffer.from(JSON.stringify(state)).toString("base64"))}`,
		];
		return `${deployment.consoleUrl}/login?${params.join("&")}`;
	}

	/** Signs in through the browser and answers the session of the organization chosen. */
	async run(run: DevantLoginRun = {}): Promise<DevantStoredSession> {
		this.cancel();
		const controller = new AbortController();
		this.pending = controller;
		const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
		try {
			const nonce = randomUrlSafe(16);
			const verifier = createVerifier();
			const callbackUri = await this.options.callback.callbackUri(nonce);
			const waiting = this.options.callback.waitForCallback(nonce, controller.signal);
			// Settled either way before it is awaited, so a failure to open the browser leaves no unhandled rejection.
			waiting.catch(() => undefined);
			const startRegion = run.region ?? "US";
			await this.options.openBrowser(this.signInUrl(startRegion, callbackUri, verifier));
			const { code, region } = await waiting;
			// The console names the region signed in to; without it, the one the sign-in started on.
			const signedInRegion: DevantRegion = region === "EU" || region === "US" ? region : startRegion;
			return await this.complete(signedInRegion, code, verifier, run.organization, controller.signal);
		} catch (error) {
			if (controller.signal.aborted && this.pending !== controller) {
				throw new LoginError("cancelled", "The WSO2 Cloud sign-in was cancelled.");
			}
			if (controller.signal.aborted) {
				throw new LoginError("timed_out", "The WSO2 Cloud sign-in did not come back from the browser in time.");
			}
			throw error;
		} finally {
			clearTimeout(timeout);
			if (this.pending === controller) {
				this.pending = undefined;
			}
		}
	}

	/** Abandons a sign-in waiting for the browser. */
	cancel(): void {
		const pending = this.pending;
		this.pending = undefined;
		pending?.abort();
	}

	/** The rest of a sign-in once the code is back: tokens, the account, and the organization's token. */
	private async complete(
		region: DevantRegion,
		code: string,
		verifier: string,
		preferred: string | undefined,
		signal: AbortSignal,
	): Promise<DevantStoredSession> {
		const deployment = this.options.deployments[region];
		const { fetch } = this.options;
		let asgardeo: Awaited<ReturnType<typeof exchangeConsoleCode>>;
		try {
			asgardeo = await exchangeConsoleCode(deployment, code, verifier, fetch, signal);
		} catch (error) {
			throw signInFailure("exchanging the authorization code", error);
		}
		const { user, organizations } = await validateUser(deployment, asgardeo.access_token, fetch, signal);
		if (organizations.length === 0) {
			throw new LoginError("no_account", "This WSO2 Cloud account belongs to no organization. Sign in to Choreo Cloud instead.");
		}
		const org = organizations.find((item) => item.handle === preferred) ?? organizations[0];
		let tokens: Awaited<ReturnType<typeof exchangeForOrganization>>;
		try {
			tokens = await exchangeForOrganization(deployment, asgardeo.access_token, org.handle, fetch, signal);
		} catch (error) {
			throw signInFailure(`getting a token for the organization ${org.name}`, error);
		}
		this.logger.info(`Signed in to Devant (${region}) as ${user.userEmail || user.displayName}, organization ${org.handle}`);
		return sessionFor(deployment, tokens, org, { region, user, organizations }, this.now());
	}

	private now(): Date {
		return this.options.now?.() ?? new Date();
	}
}

/**
 * The session of another of the person's organizations, for the session they hold: the token service exchanges the
 * current organization's token for one of `org`. No browser is involved.
 */
export async function switchOrganization(
	session: DevantStoredSession,
	org: DevantOrganization,
	deployments: Readonly<Record<DevantRegion, DevantDeployment>>,
	fetch: FetchLike,
	now: Date = new Date(),
): Promise<DevantStoredSession> {
	const deployment = deployments[session.devant.region];
	const tokens = await exchangeForOrganization(deployment, session.tokens.accessToken, org.handle, fetch);
	return sessionFor(deployment, tokens, org, session.devant, now);
}
