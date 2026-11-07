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

import type { HttpClient } from "./http";

/** The log query of WSO2 Cloud's observability proxy, relative to its base URL. */
export const LOGS_QUERY_PATH = "/api/v1/logs/query";

/** The most lines one query is answered with, the bound the platform itself uses. */
export const LOGS_QUERY_LIMIT = 1000;

/** Widens a build's run on both sides so lines stamped just outside it are kept. */
export const LOG_WINDOW_MARGIN_MS = 5 * 60_000;

/** The window searched for a build that states no start. */
const DEFAULT_LOOKBACK_MS = 30 * 24 * 60 * 60_000;

/** A build's log is found by its workflow run; a runtime log by where it runs. */
export type LogScope = { workflowRunName: string } | { project: string; component: string; environment: string };

export interface LogWindow {
	start: Date;
	end: Date;
}

export interface LogQueryOptions {
	/** Only the newest this many lines (still oldest first); 0 or absent means up to the limit. */
	tail?: number;
	signal?: AbortSignal;
}

export interface LogLines {
	/** `"<timestamp> <line>"`, oldest first. */
	lines: string[];
	/** How many lines the proxy matched, which may exceed what was returned. */
	total: number;
}

interface ProxyAnswer {
	logs?: { timestamp?: string; log?: string }[];
	total?: number;
}

/**
 * The time range to search for a build's log: its run, widened by the margin,
 * up to now while it has not completed, and the last 30 days when it states
 * no start.
 */
export function buildLogWindow(build: { startedAt?: string; completedAt?: string }, now: Date = new Date()): LogWindow {
	const started = build.startedAt ? Date.parse(build.startedAt) : Number.NaN;
	if (Number.isNaN(started)) {
		return { start: new Date(now.getTime() - DEFAULT_LOOKBACK_MS), end: now };
	}
	const completed = build.completedAt ? Date.parse(build.completedAt) : Number.NaN;
	const end = Number.isNaN(completed) ? now : new Date(completed + LOG_WINDOW_MARGIN_MS);
	return { start: new Date(started - LOG_WINDOW_MARGIN_MS), end };
}

/**
 * Reads logs from WSO2 Cloud's observability proxy, the way the platform
 * console does. The proxy is presented the same token as the API: it checks
 * the token's signature and organization claims, and no audience. It sets the
 * search namespace from the token, so that member is sent empty.
 */
export class ObservabilityApi {
	constructor(private readonly http: HttpClient) {}

	/**
	 * One query for `scope` between `window.start` and `window.end`, oldest
	 * first. A tail below the limit asks for the newest lines first, so a long
	 * log is not cut off before its end, and puts them back in order.
	 */
	async query(scope: LogScope, window: LogWindow, options: LogQueryOptions = {}): Promise<LogLines> {
		const tail = options.tail ?? 0;
		const newestFirst = tail > 0 && tail < LOGS_QUERY_LIMIT;
		const body = {
			searchScope: { namespace: "", ...scope },
			startTime: toRfc3339(window.start),
			endTime: toRfc3339(window.end),
			limit: newestFirst ? tail : LOGS_QUERY_LIMIT,
			sortOrder: newestFirst ? "desc" : "asc",
		};
		const answer = await this.http.post<ProxyAnswer>(LOGS_QUERY_PATH, body, { signal: options.signal, passThrough: true });
		const lines = (answer?.logs ?? []).map((entry) => {
			const line = (entry.log ?? "").replace(/\n+$/, "");
			return entry.timestamp ? `${entry.timestamp} ${line}` : line;
		});
		if (newestFirst) {
			lines.reverse();
		}
		return { lines, total: answer?.total ?? lines.length };
	}

	/** A build's log, by the name of its workflow run. */
	buildLogs(build: { name?: string; startedAt?: string; completedAt?: string }, options: LogQueryOptions & { now?: Date } = {}): Promise<LogLines> {
		if (!build.name) {
			return Promise.resolve({ lines: [], total: 0 });
		}
		return this.query({ workflowRunName: build.name }, buildLogWindow(build, options.now), options);
	}

	/** What an integration logged in one environment over the last `sinceMs`. */
	runtimeLogs(
		scope: { project: string; component: string; environment: string },
		sinceMs: number,
		options: LogQueryOptions & { now?: Date } = {},
	): Promise<LogLines> {
		const end = options.now ?? new Date();
		const truncated = new Date(Math.floor(end.getTime() / 1000) * 1000);
		return this.query(scope, { start: new Date(truncated.getTime() - sinceMs), end: truncated }, options);
	}
}

function toRfc3339(date: Date): string {
	return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}
