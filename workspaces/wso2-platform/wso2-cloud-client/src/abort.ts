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

/** An abort signal linked to a caller's signal and a timer; see {@link linkAbort}. */
export interface LinkedAbort {
	signal: AbortSignal;
	/** Whether the timer, not the caller, ended it. */
	timedOut(): boolean;
	/** Stops the timer and unlinks the caller's signal; call it when the work is over. */
	dispose(): void;
}

/**
 * A signal that aborts when `outer` does (including one already aborted) or
 * after `timeoutMs`. The one place the client links a caller's cancellation
 * with its own bound on how long a call may take.
 */
export function linkAbort(outer: AbortSignal | undefined, timeoutMs?: number): LinkedAbort {
	const controller = new AbortController();
	let timedOut = false;
	const onOuterAbort = () => controller.abort();
	const timer =
		timeoutMs === undefined
			? undefined
			: setTimeout(() => {
					timedOut = true;
					controller.abort();
				}, timeoutMs);
	if (outer?.aborted) {
		controller.abort();
	} else {
		outer?.addEventListener("abort", onOuterAbort, { once: true });
	}
	return {
		signal: controller.signal,
		timedOut: () => timedOut,
		dispose: () => {
			if (timer !== undefined) {
				clearTimeout(timer);
			}
			outer?.removeEventListener("abort", onOuterAbort);
		},
	};
}

/**
 * Waits for `promise`, or rejects with `onAbort()` as soon as `signal` aborts
 * (at once when it already has). The promise itself runs on: this bounds one
 * caller's wait on work that others share. A promise left behind this way
 * may still fail; that failure is nobody's, so it is not reported as
 * unhandled.
 */
export function untilAborted<T>(promise: Promise<T>, signal: AbortSignal | undefined, onAbort: () => Error): Promise<T> {
	if (!signal) {
		return promise;
	}
	promise.catch(() => undefined);
	if (signal.aborted) {
		return Promise.reject(onAbort());
	}
	return new Promise<T>((resolve, reject) => {
		const abort = () => reject(onAbort());
		signal.addEventListener("abort", abort, { once: true });
		promise.then(
			(value) => {
				signal.removeEventListener("abort", abort);
				resolve(value);
			},
			(error) => {
				signal.removeEventListener("abort", abort);
				reject(error);
			},
		);
	});
}
