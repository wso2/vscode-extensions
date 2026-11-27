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

import type { DevantCallback, DevantCallbackResult } from "../../src/devant";
import { DEVANT_PRODUCTION } from "../../src/devant";
import type { FakeFetch, RecordedRequest } from "../doubles";
import { fakeFetch, unsignedJwt } from "../doubles";

export const US = DEVANT_PRODUCTION.US;
export const EU = DEVANT_PRODUCTION.EU;

export const ORGS = [
	{ id: 101, uuid: "uuid-acme", handle: "acme", name: "Acme" },
	{ id: 102, uuid: "uuid-beta", handle: "beta", name: "Beta" },
];

export interface FakeDevant extends FakeFetch {
	/** The token service's requests, as their forms. */
	stsForms(): URLSearchParams[];
}

/** Devant's sign-in services for both regions: Asgardeo's token endpoint, the user service and the token service. */
export function fakeDevant(
	options: { noAccount?: boolean; organizations?: typeof ORGS; exchangeStatus?: () => number | undefined; exchangeRefreshToken?: boolean } = {},
): FakeDevant {
	let issued = 0;
	const sts = (request: RecordedRequest) => {
		const form = new URLSearchParams(request.rawBody);
		if (form.get("grant_type") === "refresh_token") {
			return { body: { access_token: "plain-refreshed", refresh_token: "rt-rotated", token_type: "Bearer", expires_in: 900 } };
		}
		const failed = options.exchangeStatus?.();
		if (failed) {
			return { status: failed, body: { error: "server_error" } };
		}
		const handle = form.get("orgHandle");
		const now = Math.floor(Date.now() / 1000);
		const token = unsignedJwt({
			sub: "idp-user-1",
			iss: `https://${request.url.host}/oauth2/token`,
			org: { handle },
			idp_claims: { email: "dev@example.com", name: "Dev" },
			exp: now + 3600,
			jti: `t-${++issued}`,
		});
		const refresh = options.exchangeRefreshToken === false ? {} : { refresh_token: `rt-${handle}` };
		return { body: { access_token: token, ...refresh, token_type: "Bearer", expires_in: 3600 } };
	};
	const fake = fakeFetch([
		{ match: "POST /t/a/oauth2/token", body: { access_token: "asgardeo-token", token_type: "Bearer", expires_in: 3600 } },
		{
			match: "GET /user-mgt/1.0.0/validate/user",
			respond: () =>
				options.noAccount
					? { status: 404, body: { code: 1003, message: "User not found" } }
					: {
							body: {
								displayName: "Dev",
								userEmail: "dev@example.com",
								idpId: "idp-user-1",
								userId: "user-1",
								organizations: options.organizations ?? ORGS,
							},
						},
		},
		{ match: "POST /oauth2/token", respond: sts },
	]);
	return {
		...fake,
		stsForms: () => fake.calls("POST /oauth2/token").map((request) => new URLSearchParams(request.rawBody)),
	};
}

/** A callback the test answers by hand, as the console's editor page would. */
export class ManualCallback implements DevantCallback {
	nonce?: string;
	private answer?: (result: DevantCallbackResult) => void;
	private waiting = new Promise<void>((resolve) => {
		this.started = resolve;
	});
	private started!: () => void;

	async callbackUri(nonce: string): Promise<string> {
		return `vscode://wso2.wso2-integrator/signin?platform=devant&nonce=${nonce}`;
	}

	waitForCallback(nonce: string, signal?: AbortSignal): Promise<DevantCallbackResult> {
		this.nonce = nonce;
		return new Promise((resolve, reject) => {
			this.answer = resolve;
			signal?.addEventListener("abort", () => reject(new Error("aborted")));
			this.started();
		});
	}

	/** Answers once the sign-in is waiting. */
	async send(result: DevantCallbackResult): Promise<void> {
		await this.waiting;
		this.answer?.(result);
	}
}
