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

export type CloudErrorCode =
	| "unauthenticated"
	| "session_expired"
	| "forbidden"
	| "plan_limit"
	| "not_found"
	| "conflict"
	| "bad_request"
	| "rate_limited"
	| "server"
	| "unavailable"
	| "network"
	| "timeout"
	| "login_cancelled"
	| "login_failed"
	| "not_supported";

export interface CloudErrorDetails {
	/** The HTTP status the API answered with, when there was one. */
	status?: number;
	/** The API's short error name (`ErrorResponse.error`). */
	apiError?: string;
	/** The API's own description (`ErrorResponse.message`). */
	apiMessage?: string;
	/** A finer reason the code alone does not carry, such as `session_expired`. */
	reason?: string;
	/** Whether the same call may succeed if repeated. */
	retryable?: boolean;
	/** Seconds to wait, from a 429's Retry-After. */
	retryAfterSeconds?: number;
	/** The path that was called, for diagnostics. */
	path?: string;
	cause?: unknown;
}

export interface SerializedCloudError {
	cloudError: true;
	code: CloudErrorCode;
	message: string;
	details: Omit<CloudErrorDetails, "cause">;
}

/**
 * Every failure the client reports.
 *
 * `cloudError` is an own enumerable marker and {@link isCloudError} checks it
 * structurally: the WSO2 Integrator and Ballerina extensions each bundle their
 * own copy of this package, and an error that crosses the exported-API boundary
 * between them is not an `instanceof` this class on the other side.
 */
export class CloudError extends Error {
	readonly cloudError = true as const;
	readonly code: CloudErrorCode;
	readonly details: CloudErrorDetails;

	constructor(code: CloudErrorCode, message: string, details: CloudErrorDetails = {}) {
		super(message);
		this.name = "CloudError";
		this.code = code;
		this.details = details;
	}

	/** The error as plain data, for logs and for crossing an extension boundary. */
	toJSON(): SerializedCloudError {
		const { cause: _cause, ...rest } = this.details;
		return { cloudError: true, code: this.code, message: this.message, details: rest };
	}
}

export type UnauthenticatedReason = "no_session" | "session_expired" | "rejected" | "injected_token_expired";

export class UnauthenticatedError extends CloudError {
	constructor(reason: UnauthenticatedReason, message?: string, details: CloudErrorDetails = {}) {
		super(reason === "session_expired" ? "session_expired" : "unauthenticated", message ?? unauthenticatedMessage(reason), {
			...details,
			reason,
		});
		this.name = "UnauthenticatedError";
	}
}

/** What to tell the person for each way the session can be refused. */
function unauthenticatedMessage(reason: UnauthenticatedReason): string {
	switch (reason) {
		case "no_session":
			return "Not signed in to WSO2 Cloud.";
		case "session_expired":
			return "The WSO2 Cloud session has expired. Sign in again.";
		case "rejected":
			return "WSO2 Cloud rejected the session's token. Sign in again.";
		case "injected_token_expired":
			return "The token this editor was started with has expired.";
	}
}

export class ForbiddenError extends CloudError {
	constructor(message: string, details: CloudErrorDetails = {}) {
		super("forbidden", message, details);
		this.name = "ForbiddenError";
	}
}

export class PlanLimitError extends CloudError {
	constructor(message: string, details: CloudErrorDetails = {}) {
		super("plan_limit", message, details);
		this.name = "PlanLimitError";
	}
}

export class NotFoundError extends CloudError {
	constructor(message: string, details: CloudErrorDetails = {}) {
		super("not_found", message, details);
		this.name = "NotFoundError";
	}
}

export class ConflictError extends CloudError {
	constructor(message: string, details: CloudErrorDetails = {}) {
		super("conflict", message, details);
		this.name = "ConflictError";
	}
}

export class BadRequestError extends CloudError {
	constructor(message: string, details: CloudErrorDetails = {}) {
		super("bad_request", message, details);
		this.name = "BadRequestError";
	}
}

export class RateLimitedError extends CloudError {
	constructor(message: string, details: CloudErrorDetails = {}) {
		super("rate_limited", message, { retryable: true, ...details });
		this.name = "RateLimitedError";
	}
}

/** The message of anything thrown, preferring a wrapped cause's. */
export function errorMessage(error: unknown): string {
	if (error instanceof Error) {
		return (error as Error & { cause?: { message?: string } }).cause?.message ?? error.message;
	}
	return String(error);
}

export class ServerError extends CloudError {
	constructor(message: string, details: CloudErrorDetails = {}) {
		super("server", message, details);
		this.name = "ServerError";
	}
}

export class UnavailableError extends CloudError {
	constructor(message: string, details: CloudErrorDetails = {}) {
		super("unavailable", message, { retryable: true, ...details });
		this.name = "UnavailableError";
	}
}

export class NetworkError extends CloudError {
	constructor(message: string, details: CloudErrorDetails = {}) {
		super("network", message, { retryable: true, ...details });
		this.name = "NetworkError";
	}
}

export class TimeoutError extends CloudError {
	constructor(message: string, details: CloudErrorDetails = {}) {
		super("timeout", message, { retryable: true, ...details });
		this.name = "TimeoutError";
	}
}

export type LoginFailureReason =
	| "cancelled"
	| "timed_out"
	| "state_mismatch"
	| "nonce_mismatch"
	| "provider_error"
	| "discovery_failed"
	| "claims_missing"
	| "no_redirect_available"
	| "not_available_in_cloud_editor"
	| "token_endpoint_failed";

export class LoginError extends CloudError {
	constructor(reason: LoginFailureReason, message: string, details: CloudErrorDetails = {}) {
		super(reason === "cancelled" ? "login_cancelled" : "login_failed", message, { ...details, reason });
		this.name = "LoginError";
	}
}

/** A contract method the platform API offers nothing for. */
export class NotSupportedError extends CloudError {
	constructor(message: string, details: CloudErrorDetails = {}) {
		super("not_supported", message, details);
		this.name = "NotSupportedError";
	}
}

/** Whether `value` is a `CloudError` from any bundle: checked by its marker, since `instanceof` fails across bundles. */
export function isCloudError(value: unknown): value is CloudError {
	return (
		typeof value === "object" &&
		value !== null &&
		(value as { cloudError?: unknown }).cloudError === true &&
		typeof (value as { code?: unknown }).code === "string"
	);
}

/** The API's `ErrorResponse`, as far as a failed answer carried one. */
export interface ApiErrorBody {
	error?: string;
	message?: string;
}

/** How much of a body that is not the API's JSON (a gateway's HTML page, say) is kept as the message. */
const ERROR_TEXT_LIMIT = 300;

/** The API's error body (`{ error, message }`), from JSON text or an object; empty for anything else. */
export function parseApiErrorBody(body: unknown): ApiErrorBody {
	if (typeof body === "string") {
		try {
			return parseApiErrorBody(JSON.parse(body));
		} catch {
			const text = body.trim();
			if (!text) {
				return {};
			}
			return { message: text.length > ERROR_TEXT_LIMIT ? `${text.slice(0, ERROR_TEXT_LIMIT)}…` : text };
		}
	}
	if (typeof body === "object" && body !== null) {
		const record = body as Record<string, unknown>;
		return {
			error: typeof record.error === "string" ? record.error : undefined,
			message: typeof record.message === "string" ? record.message : undefined,
		};
	}
	return {};
}

/** Maps a non-2xx answer to the error class its status means. */
export function fromHttpResponse(
	status: number,
	body: unknown,
	path: string,
	options: { retryAfterSeconds?: number; statusText?: string } = {},
): CloudError {
	const api = parseApiErrorBody(body);
	const words = api.message ?? api.error ?? options.statusText ?? `the API answered ${status}`;
	const details: CloudErrorDetails = { status, apiError: api.error, apiMessage: api.message, path };
	switch (status) {
		case 401:
			return new UnauthenticatedError("rejected", `WSO2 Cloud rejected the session's token: ${words}`, details);
		case 402:
			return new PlanLimitError(`The organization's plan does not allow this: ${words}`, details);
		case 403:
			return new ForbiddenError(`WSO2 Cloud refused this access: ${words}`, details);
		case 404:
			return new NotFoundError(`WSO2 Cloud found nothing at ${path}: ${words}`, details);
		case 409:
			return new ConflictError(words, details);
		case 429:
			return new RateLimitedError(`WSO2 Cloud is rate limiting this client: ${words}`, {
				...details,
				retryAfterSeconds: options.retryAfterSeconds,
			});
		case 502:
		case 503:
		case 504:
			return new UnavailableError(`WSO2 Cloud could not complete this right now: ${words}`, details);
		default:
			if (status >= 500) {
				return new ServerError(`WSO2 Cloud failed to answer: ${words}`, details);
			}
			return new BadRequestError(words, details);
	}
}
