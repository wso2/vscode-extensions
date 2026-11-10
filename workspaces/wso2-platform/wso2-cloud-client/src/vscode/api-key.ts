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

import { randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The key to the host's exported API. Other extensions in the editor have
 * no identity a host could check, but VS Code checks theirs when they ask
 * for a `wso2-cloud` session; so the session carries this key instead of
 * the WSO2 Cloud token, and the exported API answers only to the key. It is
 * random, lives only in this window's memory, and is replaced whenever the
 * person, the organization or the window changes, so it never outlives the
 * session it was handed out with.
 */
export class ApiKeys {
	private key?: string;

	/** The key handed out now, issuing one if there is none. */
	current(): string {
		this.key ??= randomBytes(32).toString("base64url");
		return this.key;
	}

	/** Replaces the key: the one handed out before stops working. */
	rotate(): void {
		this.key = undefined;
	}

	/** Whether `candidate` is the key handed out now. Compared in constant time. */
	verify(candidate: unknown): boolean {
		if (typeof candidate !== "string" || this.key === undefined) {
			return false;
		}
		const given = Buffer.from(candidate);
		const expected = Buffer.from(this.key);
		return given.length === expected.length && timingSafeEqual(given, expected);
	}
}
