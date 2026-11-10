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

import type { GetAccessTokenOptions, TokenSource } from "../../src/auth/types";
import type { PlatformClaims } from "../../src/jwt";

/**
 * A token source that always answers the same token, for tests and for a
 * host that already holds one. Records how it was asked, so a test can prove
 * a 401 asked for a refresh.
 */
export class StaticTokenSource implements TokenSource {
	readonly kind = "static" as const;
	readonly requests: GetAccessTokenOptions[] = [];
	private token: string;

	constructor(
		token: string,
		private readonly claims?: PlatformClaims,
	) {
		this.token = token;
	}

	/** What the next `getAccessToken` answers, as a refresh would change it. */
	rotate(token: string): void {
		this.token = token;
	}

	async getAccessToken(options: GetAccessTokenOptions = {}): Promise<string> {
		this.requests.push(options);
		return this.token;
	}

	async getClaims(): Promise<PlatformClaims | undefined> {
		return this.claims;
	}
}
