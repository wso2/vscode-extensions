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

import { LoginError, errorMessage } from "../../errors";
import type { CallbackReceiver } from "./types";

/**
 * Tries receivers in order and serves the first one that starts. The desktop
 * editor prefers the loopback listener, whose success page ends the browser
 * tab cleanly, and falls back to the `vscode://` URI handler when none of
 * the loopback ports can be opened.
 */
export class FallbackReceiver implements CallbackReceiver {
	private active?: CallbackReceiver;

	constructor(private readonly candidates: readonly CallbackReceiver[]) {
		if (candidates.length === 0) {
			throw new LoginError("no_redirect_available", "No way for the sign-in to come back was configured.");
		}
	}

	/** The redirect of the receiver in use, or of the first one before any has started. */
	get redirectUri(): string {
		return (this.active ?? this.candidates[0]).redirectUri;
	}

	/** The receiver a started sign-in is using, for callers that feed one by hand. */
	get current(): CallbackReceiver | undefined {
		return this.active;
	}

	/** Starts the first receiver that can start, and throws naming why each failed when none can. */
	async start(): Promise<void> {
		if (this.active) {
			return;
		}
		const failures: string[] = [];
		for (const candidate of this.candidates) {
			try {
				await candidate.start?.();
				this.active = candidate;
				return;
			} catch (error) {
				failures.push(errorMessage(error));
			}
		}
		throw new LoginError("no_redirect_available", `The sign-in has no way to come back: ${failures.join("; ")}`);
	}

	/** Waits for the code on the receiver in use. */
	waitForCode(state: string, signal?: AbortSignal): Promise<string> {
		if (!this.active) {
			return Promise.reject(new LoginError("no_redirect_available", "The receiver has not been started."));
		}
		return this.active.waitForCode(state, signal);
	}

	/** Disposes every receiver. */
	dispose(): void {
		this.active?.dispose?.();
		this.active = undefined;
	}
}
