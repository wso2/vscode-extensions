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

import { TimeoutError } from "../errors";

/** How often a wait asks the platform again. */
export const DEFAULT_POLL_INTERVAL_MS = 5_000;

/** How long a wait goes on when the caller says nothing. */
export const DEFAULT_WAIT_TIMEOUT_MS = 15 * 60_000;

/** The most a wait may be asked to go on. */
export const MAX_WAIT_TIMEOUT_MS = 25 * 60_000;

export interface PollOptions {
	timeoutMs?: number;
	intervalMs?: number;
	signal?: AbortSignal;
	/** For tests; defaults to the wall clock. */
	now?: () => number;
	/** For tests; defaults to a real timer. */
	sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
	/** What the timeout error says ran out. */
	describe?: () => string;
}

/**
 * Calls `check` until it reports done, until `timeoutMs` has passed (a
 * {@link TimeoutError} whose `details.reason` is `wait_timeout`), or until
 * `signal` aborts. A check that throws ends the wait with its error.
 */
export async function poll<T>(check: () => Promise<{ done: boolean; value: T }>, options: PollOptions = {}): Promise<T> {
	const timeoutMs = Math.min(options.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS, MAX_WAIT_TIMEOUT_MS);
	const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
	const now = options.now ?? Date.now;
	const sleep = options.sleep ?? defaultSleep;
	const deadline = now() + timeoutMs;
	for (;;) {
		const result = await check();
		if (result.done) {
			return result.value;
		}
		if (now() + intervalMs > deadline) {
			throw new TimeoutError(`${options.describe?.() ?? "The wait"} did not finish within ${Math.round(timeoutMs / 1000)} seconds.`, {
				reason: "wait_timeout",
			});
		}
		await sleep(intervalMs, options.signal);
		if (options.signal?.aborted) {
			throw new TimeoutError(`${options.describe?.() ?? "The wait"} was cancelled.`, { reason: "cancelled" });
		}
	}
}

/** Sleeps `ms`, or less when `signal` aborts (not at all when it already has). */
function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) {
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			resolve();
		};
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}
