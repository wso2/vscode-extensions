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

import * as vscode from "vscode";
import { untilAborted } from "../../abort";
import { LoginError } from "../../errors";
import type { UriCallbackSink } from "../../vscode/uri-callback";
import { SIGN_IN_PATH } from "../../vscode/uri-callback";
import type { DevantCallback, DevantCallbackResult } from "../auth/login";

/** The query parameter a Devant sign-in's callback address carries, so the host's URI handler tells it apart. */
export const DEVANT_CALLBACK_MARKER = "platform=devant";

/**
 * The sign-in callback of a Devant editor: `<scheme>://<extensionId>/signin?platform=devant&nonce=<n>`, through
 * `asExternalUri` so it comes back to this window. Devant's console accepts any scheme for an authority
 * `wso2.<name>` and the path `/signin`, keeps the query, and adds `code` (encoded once more) and `region`.
 */
export class DevantUriReceiver implements DevantCallback, UriCallbackSink {
	private pending?: { nonce: string; resolve: (result: DevantCallbackResult) => void; reject: (error: unknown) => void };

	constructor(private readonly extensionId: string) {}

	async callbackUri(nonce: string): Promise<string> {
		const uri = vscode.Uri.parse(`${vscode.env.uriScheme}://${this.extensionId}${SIGN_IN_PATH}?${DEVANT_CALLBACK_MARKER}&nonce=${nonce}`);
		// Encoded as the console expects: it decodes the address once before it adds the code.
		return (await vscode.env.asExternalUri(uri)).toString();
	}

	waitForCallback(nonce: string, signal?: AbortSignal): Promise<DevantCallbackResult> {
		this.pending?.reject(new LoginError("cancelled", "Another WSO2 Cloud sign-in was started."));
		const promise = new Promise<DevantCallbackResult>((resolve, reject) => {
			this.pending = { nonce, resolve, reject };
		});
		return untilAborted(promise, signal, () => {
			this.pending = undefined;
			return new LoginError("cancelled", "The WSO2 Cloud sign-in was cancelled.");
		});
	}

	accepts(uri: vscode.Uri): boolean {
		return uri.path === SIGN_IN_PATH && new URLSearchParams(uri.query).get("platform") === "devant";
	}

	/** Hands a callback in; answers whether it was the sign-in waiting. The console encodes the code twice, so one decoding is left. */
	pushUri(uri: vscode.Uri): boolean {
		const params = new URLSearchParams(uri.query);
		const pending = this.pending;
		if (!pending || params.get("nonce") !== pending.nonce) {
			return false;
		}
		this.pending = undefined;
		const code = params.get("code");
		if (!code) {
			pending.reject(new LoginError("provider_error", "WSO2 Cloud's console sent no authorization code."));
			return true;
		}
		pending.resolve({ code, region: params.get("region") ?? undefined });
		return true;
	}

	dispose(): void {
		this.pending?.reject(new LoginError("cancelled", "The WSO2 Cloud sign-in was cancelled."));
		this.pending = undefined;
	}
}
