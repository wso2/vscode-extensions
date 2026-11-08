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

import { LoginError } from "../../errors";

/**
 * Where the browser sends the authorization code back. The host decides:
 * a `vscode://` URI handler on the official builds, a loopback listener on
 * forks, something else in a web host.
 */
export interface CallbackReceiver {
	/** Must be registered at the identity provider for the client. */
	readonly redirectUri: string;
	/** Makes the receiver ready, when it has anything to prepare. */
	start?(): Promise<void>;
	/** Resolves with the code once the browser comes back with `state`. */
	waitForCode(state: string, signal?: AbortSignal): Promise<string>;
	dispose?(): void;
}

/** Whether a callback URI carries the `state` of the sign-in that is waiting. */
export function isCallbackFor(uri: URL, expectedState: string): boolean {
	return uri.searchParams.get("state") === expectedState;
}

/**
 * Reads the code out of a callback URI. The `state` is checked first: an
 * `error` or a `code` that did not come back for this sign-in is nobody's
 * business, so it is refused before it is read.
 */
export function parseCallback(uri: URL, expectedState: string): string {
	const params = uri.searchParams;
	if (!isCallbackFor(uri, expectedState)) {
		throw new LoginError("state_mismatch", "The sign-in that came back is not the one that was started.");
	}
	const error = params.get("error");
	if (error) {
		const description = params.get("error_description") ?? "";
		throw new LoginError(
			error === "access_denied" ? "cancelled" : "provider_error",
			description ? `${error}: ${description}` : `The identity provider answered ${error}.`,
			{
				apiError: error,
				apiMessage: description || undefined,
			},
		);
	}
	const code = params.get("code");
	if (!code) {
		throw new LoginError("provider_error", "The identity provider sent no authorization code.");
	}
	return code;
}

/** The error a sign-in whose wait was abandoned ends with. */
export function cancelledSignIn(): LoginError {
	return new LoginError("cancelled", "The sign-in was cancelled.");
}
