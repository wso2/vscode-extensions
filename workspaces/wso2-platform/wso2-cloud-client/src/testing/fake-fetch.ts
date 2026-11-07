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

import type { FetchLike } from "../api/http";

/** One request the fake saw, as the code under test sent it. */
export interface RecordedRequest {
	method: string;
	url: URL;
	/** The path and query, as `"GET /projects?x=y"`, for assertions. */
	line: string;
	headers: Record<string, string>;
	body: unknown;
	rawBody: string | undefined;
}

export interface FakeRoute {
	/** `"GET /projects"`, or a RegExp matched against the same `"METHOD /path?query"` line. */
	match: string | RegExp;
	status?: number;
	/** An object is JSON-encoded; a string is sent as is; `undefined` sends no body. */
	body?: unknown;
	headers?: Record<string, string>;
	/** Answers in turn for repeated calls, the last one repeating. */
	sequence?: Omit<FakeRoute, "match" | "sequence">[];
	/** Computes the answer from the request instead. */
	respond?: (request: RecordedRequest) => Omit<FakeRoute, "match" | "sequence" | "respond">;
	/** Fails the call the way an unreachable host does. */
	throws?: Error;
}

export interface FakeFetch {
	fetch: FetchLike;
	requests: RecordedRequest[];
	/** The last request matching `line`, or the last request when none is given. */
	last(line?: string | RegExp): RecordedRequest | undefined;
	calls(line: string | RegExp): RecordedRequest[];
	/** Adds or replaces a route. */
	route(route: FakeRoute): void;
}

/**
 * A `fetch` that answers from routes, recording what it was asked. An
 * unmatched request answers 404 with an `ErrorResponse`, so a test that
 * forgets a route fails with the status the code maps rather than hanging.
 */
export function fakeFetch(routes: FakeRoute[] = []): FakeFetch {
	const table = [...routes];
	const hits = new Map<FakeRoute, number>();
	const requests: RecordedRequest[] = [];

	const fetch: FetchLike = async (input, init) => {
		const url = new URL(input);
		const method = (init?.method ?? "GET").toUpperCase();
		const rawBody = typeof init?.body === "string" ? init.body : undefined;
		let body: unknown;
		if (rawBody !== undefined) {
			try {
				body = JSON.parse(rawBody);
			} catch {
				body = rawBody;
			}
		}
		const headers: Record<string, string> = {};
		for (const [key, value] of Object.entries((init?.headers as Record<string, string>) ?? {})) {
			headers[key.toLowerCase()] = value;
		}
		const line = `${method} ${url.pathname}${url.search}`;
		const recorded: RecordedRequest = { method, url, line, headers, body, rawBody };
		requests.push(recorded);

		const route = table.find((r) => (typeof r.match === "string" ? matchesLine(r.match, line) : r.match.test(line)));
		if (!route) {
			return new Response(JSON.stringify({ error: "Not Found", message: `no fake route for ${line}` }), {
				status: 404,
				headers: { "content-type": "application/json" },
			});
		}
		if (route.throws) {
			throw route.throws;
		}
		let answer: Omit<FakeRoute, "match" | "sequence" | "respond"> = route;
		if (route.respond) {
			answer = route.respond(recorded);
		} else if (route.sequence && route.sequence.length > 0) {
			const n = hits.get(route) ?? 0;
			hits.set(route, n + 1);
			answer = route.sequence[Math.min(n, route.sequence.length - 1)];
		}
		const status = answer.status ?? 200;
		const responseHeaders: Record<string, string> = { ...answer.headers };
		let text: string | null = null;
		if (typeof answer.body === "string") {
			text = answer.body;
		} else if (answer.body !== undefined) {
			text = JSON.stringify(answer.body);
			responseHeaders["content-type"] ??= "application/json";
		}
		if (status === 204) {
			text = null;
		}
		return new Response(text, { status, headers: responseHeaders });
	};

	return {
		fetch,
		requests,
		last: (line) => {
			const matching = line ? requests.filter((r) => (typeof line === "string" ? matchesLine(line, r.line) : line.test(r.line))) : requests;
			return matching[matching.length - 1];
		},
		calls: (line) => requests.filter((r) => (typeof line === "string" ? matchesLine(line, r.line) : line.test(r.line))),
		route: (route) => {
			const index = table.findIndex((r) => String(r.match) === String(route.match));
			if (index >= 0) {
				table[index] = route;
			} else {
				table.push(route);
			}
		},
	};
}

/** A string route matches the request line exactly, or its path when the route names no query. */
function matchesLine(route: string, line: string): boolean {
	if (route === line) {
		return true;
	}
	if (!route.includes("?")) {
		return line.split("?")[0] === route;
	}
	return false;
}
