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

import type { LinkedAbort } from "../abort";
import { linkAbort } from "../abort";
import type { TokenSource } from "../auth/types";
import { trimBaseUrl } from "../config/environments";
import type { ApiErrorBody, CloudError, UnauthenticatedError } from "../errors";
import { NetworkError, ServerError, TimeoutError, errorMessage, fromHttpResponse, isCloudError, parseApiErrorBody } from "../errors";

export { errorMessage };
import type { Logger } from "../logger";
import { silentLogger } from "../logger";

/** `fetch` as the client needs it, so a test can hand in a fake and a host a proxied one. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** One call. Bounds the Go reference client's requestTimeout. */
export const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * The most of one answer that is read; the rest is dropped and the call
 * fails. The API's largest answers are log listings capped at a few
 * thousand lines; anything near this is not one.
 */
export const RESPONSE_LIMIT_BYTES = 8 << 20;

/** `fetch` as the platform ships it; exported so hosts and scripts pass the same one. */
export const defaultFetch: FetchLike = (input, init) => fetch(input, init);

export interface HttpClientOptions {
	baseUrl: string;
	tokenSource: TokenSource;
	fetch?: FetchLike;
	timeoutMs?: number;
	userAgent?: string;
	logger?: Logger;
	/**
	 * Called once when the API rejects the token twice in a row, which means the
	 * session is no good any more: the host signs out and says so.
	 */
	onUnauthenticated?: (error: UnauthenticatedError) => void;
}

export interface RequestOptions {
	query?: Record<string, string | number | boolean | undefined>;
	/** JSON-encoded when present. */
	body?: unknown;
	headers?: Record<string, string>;
	signal?: AbortSignal;
	/**
	 * What a 2xx answer with no body means. The deployment read answers 200
	 * with nothing when an integration was never deployed, so the default is a
	 * value a caller can test for rather than a parse failure.
	 */
	emptyBodyAs?: "undefined" | "error";
	/**
	 * Reinterprets a status before the general mapping runs, for routes whose
	 * answers mean something other than what the status says (the build read
	 * answers an unknown name with a 500).
	 */
	mapStatus?: (status: number, body: ApiErrorBody) => CloudError | undefined;
	/** The timeout for this call alone. */
	timeoutMs?: number;
	/**
	 * A pass-through route (`/git/...`, the observability proxy) whose 401 is
	 * the upstream's verdict on the token, not the platform's: the error is
	 * thrown but `onUnauthenticated` is not called.
	 */
	passThrough?: boolean;
	/**
	 * Whether a 401 is retried once with a refreshed token (the default). Off
	 * for a route whose 401 is an upstream's verdict a new token cannot
	 * change, such as git-app-service's audience allowlist, so each such call
	 * does not spend a refresh and a second request.
	 */
	retryOn401?: boolean;
}

/**
 * Calls one base URL with the bearer token a {@link TokenSource} supplies.
 *
 * Non-2xx answers become the error class their status means; a 401 is
 * retried exactly once with a token the source was told to refresh, since the
 * stored token may simply have aged; a second 401 is reported and
 * `onUnauthenticated` fires. Nothing is retried otherwise: callers decide
 * whether a `retryable` failure is worth another attempt.
 */
export class HttpClient {
	readonly baseUrl: string;
	private readonly tokenSource: TokenSource;
	private readonly fetchImpl: FetchLike;
	private readonly timeoutMs: number;
	private readonly userAgent?: string;
	private readonly logger: Logger;
	private readonly onUnauthenticated?: (error: UnauthenticatedError) => void;

	constructor(options: HttpClientOptions) {
		this.baseUrl = trimBaseUrl(options.baseUrl);
		this.tokenSource = options.tokenSource;
		this.fetchImpl = options.fetch ?? defaultFetch;
		this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
		this.userAgent = options.userAgent;
		this.logger = options.logger ?? silentLogger;
		this.onUnauthenticated = options.onUnauthenticated;
	}

	/** `GET path`, the JSON answer decoded. */
	get<T>(path: string, options?: RequestOptions): Promise<T> {
		return this.request<T>("GET", path, options);
	}

	/** `POST path` with `body` as JSON, the answer decoded. */
	post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
		return this.request<T>("POST", path, { ...options, body });
	}

	/** `PUT path` with `body` as JSON, the answer decoded. */
	put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
		return this.request<T>("PUT", path, { ...options, body });
	}

	/** `PATCH path` with `body` as JSON, the answer decoded. */
	patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
		return this.request<T>("PATCH", path, { ...options, body });
	}

	/** `DELETE path`, the answer decoded if there is one. */
	delete<T = undefined>(path: string, options?: RequestOptions): Promise<T> {
		return this.request<T>("DELETE", path, options);
	}

	/** Sends one request and decodes its JSON answer. */
	async request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
		const { response, abort } = await this.exchange(method, path, options);
		let text: string;
		try {
			text = await readWithin(response, path, abort);
		} finally {
			abort.dispose();
		}
		if (text.length === 0) {
			if (options.emptyBodyAs === "error") {
				throw new NetworkError(`WSO2 Cloud answered ${path} with no body.`, { status: response.status, path });
			}
			return undefined as T;
		}
		try {
			return JSON.parse(text) as T;
		} catch (error) {
			throw new NetworkError(`WSO2 Cloud answered ${path} with something other than JSON.`, { status: response.status, path, cause: error });
		}
	}

	/**
	 * One exchange with the platform: the token, one retry on 401, the error
	 * mapping. A successful answer comes back with its abort still linked, so
	 * the caller's cancellation and the timeout cover reading the body too;
	 * the caller disposes it.
	 */
	private async exchange(method: HttpMethod, path: string, options: RequestOptions): Promise<{ response: Response; abort: LinkedAbort }> {
		const url = this.urlFor(path, options.query);
		let forceRefresh = false;
		for (;;) {
			const token = await this.tokenSource.getAccessToken({ forceRefresh, signal: options.signal });
			const { response, abort } = await this.fetchOnce(method, url, token, options);
			try {
				if (response.status === 401 && !forceRefresh && options.retryOn401 !== false) {
					this.logger.debug(`${method} ${path} answered 401; refreshing the token and retrying once`);
					// The unread body would otherwise hold the connection until it is collected.
					await response.body?.cancel().catch(() => undefined);
					forceRefresh = true;
					continue;
				}
				if (response.status >= 300 && response.status < 400) {
					await response.body?.cancel().catch(() => undefined);
					throw new ServerError(`WSO2 Cloud answered ${path} with a redirect (${response.status}), which the client does not follow.`, {
						status: response.status,
						path,
					});
				}
				if (response.ok) {
					const kept = abort;
					return { response, abort: kept };
				}
				const text = await readWithin(response, path, abort);
				const body = parseApiErrorBody(text);
				const mapped = options.mapStatus?.(response.status, body);
				const error =
					mapped ?? fromHttpResponse(response.status, body, path, { retryAfterSeconds: retryAfter(response), statusText: response.statusText });
				if (!options.passThrough && isCloudError(error) && error.code === "unauthenticated") {
					this.onUnauthenticated?.(error as UnauthenticatedError);
				}
				throw error;
			} finally {
				if (!response.ok) {
					abort.dispose();
				}
			}
		}
	}

	/** The full URL of `path` on the base URL, with the query's defined members set. */
	urlFor(path: string, query?: RequestOptions["query"]): string {
		const url = new URL(this.baseUrl + path);
		if (query) {
			for (const [key, value] of Object.entries(query)) {
				if (value !== undefined) {
					url.searchParams.set(key, String(value));
				}
			}
		}
		return url.toString();
	}

	private async fetchOnce(
		method: HttpMethod,
		url: string,
		token: string,
		options: RequestOptions,
	): Promise<{ response: Response; abort: LinkedAbort }> {
		const headers: Record<string, string> = {
			Authorization: `Bearer ${token}`,
			Accept: "application/json",
			...options.headers,
		};
		if (this.userAgent) {
			headers["User-Agent"] = this.userAgent;
		}
		let body: string | undefined;
		if (options.body !== undefined) {
			headers["Content-Type"] = "application/json";
			body = JSON.stringify(options.body);
		}
		const timeoutMs = options.timeoutMs ?? this.timeoutMs;
		const abort = linkAbort(options.signal, timeoutMs);
		try {
			// A redirect is answered as such and refused above: the token must not follow one elsewhere.
			const response = await this.fetchImpl(url, { method, headers, body, signal: abort.signal, redirect: "manual" });
			return { response, abort };
		} catch (error) {
			abort.dispose();
			const path = new URL(url).pathname;
			if (abort.timedOut()) {
				throw new TimeoutError(`WSO2 Cloud did not answer ${path} within ${Math.round(timeoutMs / 1000)} seconds.`, { path, cause: error });
			}
			if (abort.signal.aborted) {
				throw new TimeoutError(`The call to ${path} was cancelled.`, { path, cause: error, reason: "cancelled", retryable: false });
			}
			throw new NetworkError(`WSO2 Cloud could not be reached at ${this.baseUrl}: ${errorMessage(error)}`, { path, cause: error });
		}
	}
}

/**
 * Reads the body within the call's abort: a read the timer or the caller cut
 * off is a `TimeoutError`, like a request that never answered.
 */
async function readWithin(response: Response, path: string, abort: LinkedAbort): Promise<string> {
	try {
		return await readBounded(response, path);
	} catch (error) {
		if (!isCloudError(error) && abort.signal.aborted) {
			throw abort.timedOut()
				? new TimeoutError(`WSO2 Cloud did not finish answering ${path} in time.`, { path, cause: error })
				: new TimeoutError(`The call to ${path} was cancelled.`, { path, cause: error, reason: "cancelled", retryable: false });
		}
		throw error;
	}
}

/** Reads the body up to {@link RESPONSE_LIMIT_BYTES}; a longer one is cut off and refused. */
async function readBounded(response: Response, path: string): Promise<string> {
	const tooLong = () =>
		new NetworkError(`WSO2 Cloud answered ${path} with more than ${RESPONSE_LIMIT_BYTES >> 20} MiB.`, { status: response.status, path });
	const declared = Number(response.headers.get("content-length"));
	if (Number.isFinite(declared) && declared > RESPONSE_LIMIT_BYTES) {
		await response.body?.cancel().catch(() => undefined);
		throw tooLong();
	}
	if (!response.body) {
		return "";
	}
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let read = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		read += value.byteLength;
		if (read > RESPONSE_LIMIT_BYTES) {
			await reader.cancel().catch(() => undefined);
			throw tooLong();
		}
		chunks.push(value);
	}
	return new TextDecoder().decode(concat(chunks, read));
}

/** Joins the body's chunks into one buffer of `length` bytes. */
function concat(chunks: Uint8Array[], length: number): Uint8Array {
	if (chunks.length === 1) {
		return chunks[0];
	}
	const out = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		out.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return out;
}

/** The `Retry-After` header in seconds, when it is a number. */
function retryAfter(response: Response): number | undefined {
	const header = response.headers.get("retry-after");
	if (!header) {
		return undefined;
	}
	const seconds = Number(header);
	return Number.isFinite(seconds) ? seconds : undefined;
}
