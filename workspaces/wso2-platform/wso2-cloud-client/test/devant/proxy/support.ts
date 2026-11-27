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

import { createServer, request } from "node:http";
import type { IncomingHttpHeaders, IncomingMessage, Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { Environment } from "@wso2/wso2-platform-core";
import type { Logger } from "../../../src/logger";
import type { FakeRoute, RecordedRequest } from "../../doubles";
import { GRAPHQL } from "../api/support";

export const ORG = { id: "101", uuid: "uuid-acme", handle: "acme" };

export const DEV_ENV = { id: "env-dev", name: "Development", choreoEnv: "dev", critical: false, templateId: "tpl-dev" } as Environment;
export const PROD_ENV = { id: "env-prod", name: "Production", choreoEnv: "prod", critical: true, templateId: "tpl-prod" } as Environment;

type GraphqlAnswer = unknown | ((query: string, call: number) => unknown);

/** One GraphQL route answering each query by the first pattern it matches; an unmatched query answers 500. */
export function graphqlBy(handlers: [RegExp, GraphqlAnswer][]): FakeRoute {
	const calls = new Map<RegExp, number>();
	return {
		match: GRAPHQL,
		respond: (request: RecordedRequest) => {
			const query = (request.body as { query: string }).query;
			for (const [pattern, answer] of handlers) {
				if (pattern.test(query)) {
					const call = calls.get(pattern) ?? 0;
					calls.set(pattern, call + 1);
					return { body: { data: typeof answer === "function" ? (answer as (q: string, n: number) => unknown)(query, call) : answer } };
				}
			}
			return { status: 500, body: { message: `no fake answer for ${query}` } };
		},
	};
}

/** An endpoint of the bridge in an environment. */
export function endpoint(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: "ep-1",
		environmentId: DEV_ENV.id,
		type: "REST",
		apimId: "apim-1",
		publicUrl: "https://bridge.example/rest",
		state: "Active",
		stateReason: { code: "", message: "", details: "", workerId: "" },
		...overrides,
	};
}

export interface ReceivedRequest {
	method: string;
	url: string;
	headers: IncomingHttpHeaders;
	body: string;
}

export interface FakeBridge {
	url: string;
	received: ReceivedRequest[];
	answer: (request: ReceivedRequest, res: ServerResponse) => void;
	close(): Promise<void>;
}

/** A real HTTP server on 127.0.0.1 standing in for the bridge's REST endpoint; answers 200 with `{}` until told otherwise. */
export async function fakeBridge(): Promise<FakeBridge> {
	const bridge: FakeBridge = {
		url: "",
		received: [],
		answer: (_request, res) => json(res, 200, { request_id: "", status_code: 200, headers: {}, body: "" }),
		close: () => new Promise<void>((resolve) => server.close(() => resolve())),
	};
	const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer) => chunks.push(chunk));
		req.on("end", () => {
			const received = { method: req.method ?? "", url: req.url ?? "", headers: req.headers, body: Buffer.concat(chunks).toString("utf8") };
			bridge.received.push(received);
			bridge.answer(received, res);
		});
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	bridge.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	const close = bridge.close;
	bridge.close = () => {
		server.closeAllConnections?.();
		return close();
	};
	return bridge;
}

export function json(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "content-type": "application/json" });
	res.end(JSON.stringify(body));
}

export interface ProxyAnswer {
	status: number;
	headers: IncomingHttpHeaders;
	body: string;
}

/** Sends a request through the proxy on `port`, as an HTTP client configured with `http_proxy` does. */
export function viaProxy(
	port: number,
	target: string,
	options: { method?: string; headers?: Record<string, string>; body?: string | Buffer } = {},
): Promise<ProxyAnswer> {
	return new Promise((resolve, reject) => {
		const req = request({ host: "127.0.0.1", port, method: options.method ?? "GET", path: target, headers: options.headers, agent: false }, (res) => {
			const chunks: Buffer[] = [];
			res.on("data", (chunk: Buffer) => chunks.push(chunk));
			res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
			res.on("error", reject);
		});
		req.on("error", reject);
		req.end(options.body);
	});
}

/** A logger that keeps every line, to check what is never written. */
export function recordingLogger(): Logger & { lines: string[] } {
	const lines: string[] = [];
	const keep = (message: string, error?: unknown) => {
		lines.push(error === undefined ? message : `${message} ${String(error)}`);
	};
	return { lines, debug: keep, info: keep, warn: keep, error: keep };
}
