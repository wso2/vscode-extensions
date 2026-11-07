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

import type { CallbackReceiver } from "./types";
import { abortable, isCallbackFor, parseCallback } from "./types";

/**
 * A receiver the host feeds: the browser opens a `vscode://` URI, VS Code
 * hands it to the extension's URI handler, and the handler calls `push`.
 * The login waits before it opens the browser, so a callback never comes
 * first; one that arrives with nobody waiting, or for another sign-in, is
 * ignored.
 */
export class DeferredReceiver implements CallbackReceiver {
	private pending?: { state: string; resolve: (code: string) => void; reject: (error: unknown) => void };

	constructor(readonly redirectUri: string) {}

	waitForCode(state: string, signal?: AbortSignal): Promise<string> {
		const promise = new Promise<string>((resolve, reject) => {
			this.pending = { state, resolve, reject };
		});
		return abortable(promise, signal, () => {
			this.pending = undefined;
		});
	}

	/** Hands a callback URI in. Returns whether it was the one a login was waiting for. */
	push(uri: URL): boolean {
		const pending = this.pending;
		if (!pending || !isCallbackFor(uri, pending.state)) {
			return false;
		}
		this.pending = undefined;
		try {
			pending.resolve(parseCallback(uri, pending.state));
		} catch (error) {
			pending.reject(error);
		}
		return true;
	}

	dispose(): void {
		this.pending = undefined;
	}
}
