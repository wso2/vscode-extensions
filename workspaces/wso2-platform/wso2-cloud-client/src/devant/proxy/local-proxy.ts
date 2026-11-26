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

import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { AddressInfo, Socket } from "node:net";
import type { Duplex } from "node:stream";
import type { FetchLike } from "../../api/http";
import { defaultFetch } from "../../api/http";
import { errorMessage } from "../../errors";
import type { Logger } from "../../logger";
import { silentLogger } from "../../logger";
import { authorityOf, domainOf, splitHostPort } from "./connection-env";

/** The largest request body forwarded to the bridge. */
export const DEFAULT_MAX_BODY_BYTES = 10 * 1024 * 1024;

const LOOPBACK = "127.0.0.1";

/** A key is fetched again this long before the validity the publisher stated runs out. */
const KEY_EXPIRY_MARGIN_MS = 20_000;

/** Headers of the bridge's answer that describe its own message, not the one written back. */
const HOP_BY_HOP = new Set(["connection", "keep-alive", "transfer-encoding", "content-length", "upgrade", "proxy-connection", "trailer", "te"]);

/** A request as the bridge's `/handle-client-req` takes it. */
export interface RequestDetails {
	request_id: string;
	method: string;
	domain: string;
	path: string;
	headers: Record<string, string>;
	query: Record<string, string>;
	body: string;
	port: string;
	isSecure: boolean;
}

/** The bridge's answer, written back to the caller. */
export interface ResponseDetails {
	request_id?: string;
	status_code: number;
	headers?: Record<string, string> | null;
	body?: string | null;
}

export interface BridgeApiKey {
	apiKey: string;
	/** Seconds the key is valid for; 0 when unknown. */
	validityTime: number;
}

export interface LocalProxyOptions {
	/** The bridge's REST endpoint, which `/handle-client-req` is under. */
	bridgeUrl: string;
	/** The header the key goes in: `Api-Key`, or `Test-Key` on a development deployment. */
	apiKeyHeader: string;
	/** Fetches a key for the bridge; called on the first request, on expiry and once when the bridge refuses the key. */
	fetchApiKey: () => Promise<BridgeApiKey>;
	/** Hosts the bridge calls over HTTPS although the caller asked for HTTP. */
	secureHosts: ReadonlySet<string>;
	fetch?: FetchLike;
	logger?: Logger;
	maxBodyBytes?: number;
	now?: () => number;
}

/** A forward proxy on the loopback interface that hands every request to the bridge component and writes back its answer. */
export class LocalProxy {
	private readonly keys: KeyCache;
	private readonly fetch: FetchLike;
	private readonly logger: Logger;
	private readonly maxBodyBytes: number;
	private readonly closing = new AbortController();
	private readonly sockets = new Set<Socket | Duplex>();

	private constructor(
		private readonly server: Server,
		private readonly options: LocalProxyOptions,
	) {
		this.keys = new KeyCache(options.fetchApiKey, options.now ?? Date.now);
		this.fetch = options.fetch ?? defaultFetch;
		this.logger = options.logger ?? silentLogger;
		this.maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
	}

	/** Starts a proxy on a free port of 127.0.0.1. */
	static async start(options: LocalProxyOptions): Promise<LocalProxy> {
		const server = createServer();
		const proxy = new LocalProxy(server, options);
		server.on("request", (req: IncomingMessage, res: ServerResponse) => {
			proxy.handle(req, res).catch((error) => {
				proxy.logger.error("The local proxy failed to answer a request.", errorMessage(error));
				if (!res.headersSent) {
					plain(res, 502, "failed to forward request to bridge component");
				} else {
					res.destroy();
				}
			});
		});
		server.on("connection", (socket: Socket) => proxy.track(socket));
		server.on("connect", (_req: IncomingMessage, socket: Duplex) => {
			proxy.track(socket);
			socket.on("error", () => undefined);
			const body = "CONNECT is not supported\n";
			socket.end(
				`HTTP/1.1 405 Method Not Allowed\r\nAllow: GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\n\r\n${body}`,
			);
		});
		await new Promise<void>((resolve, reject) => {
			server.once("error", reject);
			server.listen(0, LOOPBACK, () => {
				server.off("error", reject);
				resolve();
			});
		});
		return proxy;
	}

	get port(): number {
		return (this.server.address() as AddressInfo).port;
	}

	get address(): string {
		return (this.server.address() as AddressInfo).address;
	}

	/** Stops listening, ends every open connection and abandons calls to the bridge in flight. */
	async close(): Promise<void> {
		this.closing.abort();
		const closed = new Promise<void>((resolve) => this.server.close(() => resolve()));
		for (const socket of this.sockets) {
			socket.destroy();
		}
		await closed;
	}

	private track(socket: Socket | Duplex): void {
		this.sockets.add(socket);
		socket.once("close", () => this.sockets.delete(socket));
	}

	private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
		if (req.method === "CONNECT") {
			plain(res, 405, "CONNECT is not supported");
			return;
		}
		const body = await this.readBody(req, res);
		if (!body) {
			return;
		}
		const details = requestDetails(req, body, this.options.secureHosts);
		const payload = JSON.stringify(details);

		const call = new AbortController();
		const abort = () => call.abort();
		this.closing.signal.addEventListener("abort", abort, { once: true });
		res.once("close", abort);
		try {
			let key: string;
			try {
				key = await this.keys.get();
			} catch (error) {
				this.logger.warn(`No API key for the bridge component: ${errorMessage(error)}`);
				plain(res, 502, "failed to retrieve API key for bridge component");
				return;
			}
			let answer: Response;
			try {
				answer = await this.callBridge(payload, key, call.signal);
				if (answer.status === 401 || answer.status === 403) {
					await answer.body?.cancel().catch(() => undefined);
					key = await this.keys.get(key);
					answer = await this.callBridge(payload, key, call.signal);
				}
			} catch (error) {
				if (call.signal.aborted) {
					res.destroy();
					return;
				}
				this.logger.warn(`The bridge component could not be reached: ${errorMessage(error)}`);
				plain(res, 502, "failed to forward request to bridge component");
				return;
			}
			let text: string;
			try {
				text = await answer.text();
			} catch {
				plain(res, 502, "failed to read response body from bridge component");
				return;
			}
			const response = parseResponseDetails(text);
			if (!response) {
				this.logger.warn(`The bridge component answered ${answer.status} with something other than a response to relay.`);
				plain(res, 502, "failed to parse response details from bridge component");
				return;
			}
			writeBack(res, response);
		} finally {
			this.closing.signal.removeEventListener("abort", abort);
			res.off("close", abort);
		}
	}

	/** The request's body; undefined when it was too large and has been answered 413. */
	private readBody(req: IncomingMessage, res: ServerResponse): Promise<Buffer | undefined> {
		const limit = this.maxBodyBytes;
		const declared = Number(req.headers["content-length"]);
		if (Number.isFinite(declared) && declared > limit) {
			tooLarge(req, res, limit);
			return Promise.resolve(undefined);
		}
		return new Promise((resolve, reject) => {
			const chunks: Buffer[] = [];
			let size = 0;
			const cleanup = () => {
				req.off("data", onData);
				req.off("end", onEnd);
				req.off("error", onError);
			};
			const onData = (chunk: Buffer) => {
				size += chunk.length;
				if (size > limit) {
					cleanup();
					tooLarge(req, res, limit);
					resolve(undefined);
					return;
				}
				chunks.push(chunk);
			};
			const onEnd = () => {
				cleanup();
				resolve(Buffer.concat(chunks));
			};
			const onError = (error: Error) => {
				cleanup();
				reject(error);
			};
			req.on("data", onData);
			req.once("end", onEnd);
			req.once("error", onError);
		});
	}

	private callBridge(payload: string, key: string, signal: AbortSignal): Promise<Response> {
		return this.fetch(`${this.options.bridgeUrl}/handle-client-req`, {
			method: "POST",
			headers: { "Content-Type": "application/json", [this.options.apiKeyHeader]: key },
			body: payload,
			signal,
		});
	}
}

/** The proxy's one key, fetched on first use and again on expiry or when the bridge refuses it. */
class KeyCache {
	private key: string | undefined;
	private expiresAt = Number.POSITIVE_INFINITY;
	private pending: Promise<string> | undefined;

	constructor(
		private readonly fetchKey: () => Promise<BridgeApiKey>,
		private readonly now: () => number,
	) {}

	/** The current key; a fresh one when `refused` is the key held, so concurrent refusals fetch only once. */
	get(refused?: string): Promise<string> {
		if (refused !== undefined && refused === this.key) {
			this.key = undefined;
		}
		if (this.key !== undefined && this.now() < this.expiresAt) {
			return Promise.resolve(this.key);
		}
		if (!this.pending) {
			const fetchedAt = this.now();
			this.pending = this.fetchKey()
				.then((answer) => {
					this.key = answer.apiKey;
					// A validity too short to keep a margin from is taken as unknown: the key is kept until refused.
					this.expiresAt =
						answer.validityTime * 1000 > KEY_EXPIRY_MARGIN_MS
							? fetchedAt + answer.validityTime * 1000 - KEY_EXPIRY_MARGIN_MS
							: Number.POSITIVE_INFINITY;
					return answer.apiKey;
				})
				.finally(() => {
					this.pending = undefined;
				});
		}
		return this.pending;
	}
}

/** The request as the bridge takes it, with the fields the Choreo CLI sent. */
export function requestDetails(req: IncomingMessage, body: Buffer, secureHosts: ReadonlySet<string>): RequestDetails {
	const rawUrl = req.url ?? "/";
	const domain = domainOf(rawUrl) || (req.headers.host ?? "");
	const isSecure = secureHosts.has(domain);
	let port = splitHostPort(authorityOf(rawUrl))?.port ?? "";
	if (port === "80" && isSecure) {
		port = "";
	}
	return {
		request_id: "",
		method: req.method ?? "GET",
		domain,
		path: pathOf(rawUrl),
		headers: firstHeaderValues(req.rawHeaders),
		query: firstQueryValues(rawUrl),
		body: body.toString("utf8"),
		port,
		isSecure,
	};
}

/** The decoded path of a request target, absolute (`http://host/a`) or not (`/a`). */
function pathOf(rawUrl: string): string {
	const afterAuthority = /^[A-Za-z][A-Za-z0-9+.-]*:\/\/[^/?#]*(.*)$/.exec(rawUrl);
	const target = afterAuthority ? afterAuthority[1] : rawUrl;
	const path = target.split(/[?#]/, 1)[0];
	try {
		return decodeURIComponent(path);
	} catch {
		return path;
	}
}

function firstQueryValues(rawUrl: string): Record<string, string> {
	const queryStart = rawUrl.indexOf("?");
	const query: Record<string, string> = {};
	if (queryStart < 0) {
		return query;
	}
	const raw = rawUrl.slice(queryStart + 1).split("#", 1)[0];
	for (const [key, value] of new URLSearchParams(raw)) {
		if (!(key in query)) {
			query[key] = value;
		}
	}
	return query;
}

/** Each header's first value, under its canonical name (`Content-Type`); `Host` is the request's, not a header to pass. */
function firstHeaderValues(rawHeaders: readonly string[]): Record<string, string> {
	const headers: Record<string, string> = {};
	for (let i = 0; i + 1 < rawHeaders.length; i += 2) {
		const name = canonicalHeaderName(rawHeaders[i]);
		if (name === "Host" || name === "Transfer-Encoding" || name in headers) {
			continue;
		}
		headers[name] = rawHeaders[i + 1];
	}
	return headers;
}

function canonicalHeaderName(name: string): string {
	return name.toLowerCase().replace(/(^|-)([a-z])/g, (_match, dash: string, letter: string) => dash + letter.toUpperCase());
}

/** The bridge's answer when it is one: a status code and, when present, string headers and a string body. */
function parseResponseDetails(text: string): ResponseDetails | undefined {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		return undefined;
	}
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}
	const answer = value as Record<string, unknown>;
	const status = answer.status_code;
	if (typeof status !== "number" || !Number.isInteger(status) || status < 100 || status > 999) {
		return undefined;
	}
	const headers = answer.headers;
	if (headers !== undefined && headers !== null) {
		if (typeof headers !== "object" || Array.isArray(headers) || Object.values(headers).some((item) => typeof item !== "string")) {
			return undefined;
		}
	}
	if (answer.body !== undefined && answer.body !== null && typeof answer.body !== "string") {
		return undefined;
	}
	return answer as unknown as ResponseDetails;
}

function writeBack(res: ServerResponse, response: ResponseDetails): void {
	try {
		for (const [name, value] of Object.entries(response.headers ?? {})) {
			if (!HOP_BY_HOP.has(name.toLowerCase())) {
				res.setHeader(name, value);
			}
		}
		res.writeHead(response.status_code);
	} catch {
		for (const name of res.getHeaderNames()) {
			res.removeHeader(name);
		}
		plain(res, 502, "failed to parse response details from bridge component");
		return;
	}
	res.end(Buffer.from(response.body ?? "", "utf8"));
}

/** Answers 413 and closes the connection; the rest of the body is read and dropped meanwhile. */
function tooLarge(req: IncomingMessage, res: ServerResponse, limit: number): void {
	res.setHeader("Connection", "close");
	plain(res, 413, `request body exceeds ${limit} bytes`);
	req.resume();
}

function plain(res: ServerResponse, status: number, message: string): void {
	const body = `${message}\n`;
	res.writeHead(status, {
		"Content-Type": "text/plain; charset=utf-8",
		"X-Content-Type-Options": "nosniff",
		"Content-Length": Buffer.byteLength(body),
	});
	res.end(body);
}
