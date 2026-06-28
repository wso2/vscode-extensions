/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 3 * 60 * 1000;
export const DEFAULT_STREAM_TOTAL_TIMEOUT_MS = 15 * 60 * 1000;
export const DEFAULT_FINAL_RESPONSE_WAIT_TIMEOUT_MS = 5000;
export const STREAM_WATCHDOG_TICK_MS = 5000;

export const STREAM_IDLE_TIMEOUT_ERROR_CODE = 'AGENT_STREAM_IDLE_TIMEOUT';
export const STREAM_TOTAL_TIMEOUT_ERROR_CODE = 'AGENT_STREAM_TOTAL_TIMEOUT';
export const RESPONSE_WAIT_TIMEOUT_ERROR_CODE = 'AGENT_RESPONSE_WAIT_TIMEOUT';
export const PROXY_STREAM_TERMINATED_ERROR_CODE = 'AGENT_PROXY_STREAM_TERMINATED';

type StreamTimeoutCode =
    | typeof STREAM_IDLE_TIMEOUT_ERROR_CODE
    | typeof STREAM_TOTAL_TIMEOUT_ERROR_CODE;

export function createStreamTimeoutError(code: StreamTimeoutCode, message: string): Error & { code: string } {
    const error = new Error(message) as Error & { code: string };
    error.code = code;
    return error;
}

export function createResponseWaitTimeoutError(timeoutMs: number): Error & { code: string } {
    const error = new Error(`Timed out waiting ${Math.round(timeoutMs / 1000)}s for final model response metadata.`) as Error & { code: string };
    error.code = RESPONSE_WAIT_TIMEOUT_ERROR_CODE;
    return error;
}

export function isStreamTimeoutError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const code = (error as { code?: unknown }).code;
    return code === STREAM_IDLE_TIMEOUT_ERROR_CODE || code === STREAM_TOTAL_TIMEOUT_ERROR_CODE;
}

export async function awaitWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timeoutError = createResponseWaitTimeoutError(timeoutMs);
        const timer = setTimeout(() => reject(timeoutError), timeoutMs);
        (timer as NodeJS.Timeout).unref?.();

        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            }
        );
    });
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message?: unknown }).message);
    }
    return 'An unknown error occurred';
}

/**
 * Pull a human-readable message out of a provider/proxy error body. Handles the
 * common JSON envelopes:
 *   { error: { message } }              (Anthropic / OpenAI style)
 *   { error: "..." }                    (string error)
 *   { message }                         (bare message)
 *   { detail } / { detail: { message } } (FastAPI / proxy style)
 */
function pickProviderMessage(obj: Record<string, unknown>): string | undefined {
    const err = obj.error;
    if (err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string') {
        const msg = (err as { message: string }).message.trim();
        if (msg) {
            return msg;
        }
    }
    if (typeof err === 'string' && err.trim()) {
        return err.trim();
    }
    if (typeof obj.message === 'string' && obj.message.trim()) {
        return obj.message.trim();
    }
    const detail = obj.detail;
    if (typeof detail === 'string' && detail.trim()) {
        return detail.trim();
    }
    if (detail && typeof detail === 'object' && typeof (detail as { message?: unknown }).message === 'string') {
        const msg = (detail as { message: string }).message.trim();
        if (msg) {
            return msg;
        }
    }
    return undefined;
}

/**
 * Best-effort extraction of the message the upstream provider/proxy actually sent.
 * The Vercel AI SDK's APICallError stores the parsed body in `data` and the raw
 * body in `responseBody`; when the body doesn't match the provider's error schema
 * the SDK falls back to the bare HTTP status text for `.message`, so actionable
 * detail (e.g. "Opus models are not available on this plan") only lives in
 * `responseBody`. We look there so it can be surfaced to the user.
 */
function extractProviderErrorMessageFrom(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
        return undefined;
    }
    const r = error as Record<string, unknown>;
    if (r.data && typeof r.data === 'object') {
        const fromData = pickProviderMessage(r.data as Record<string, unknown>);
        if (fromData) {
            return fromData;
        }
    }
    if (typeof r.responseBody === 'string' && r.responseBody.trim()) {
        const body = r.responseBody.trim();
        try {
            const parsed = JSON.parse(body);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                const fromBody = pickProviderMessage(parsed as Record<string, unknown>);
                if (fromBody) {
                    return fromBody;
                }
            }
        } catch {
            // Non-JSON body — surface short plain-text bodies as-is.
            if (body.length <= 500) {
                return body;
            }
        }
    }
    return undefined;
}

/**
 * The AI SDK sometimes wraps the provider's APICallError, so the body-bearing
 * error can sit on `.cause`. Walk a couple of levels of the cause chain.
 */
function extractProviderErrorMessage(error: unknown): string | undefined {
    let current: unknown = error;
    for (let depth = 0; depth < 3 && current && typeof current === 'object'; depth++) {
        const found = extractProviderErrorMessageFrom(current);
        if (found) {
            return found;
        }
        current = (current as { cause?: unknown }).cause;
    }
    return undefined;
}

const MAX_DISPLAY_ERROR_LENGTH = 1000;

/**
 * Build the user-facing error string for the chat error card. Prefers the
 * upstream provider/proxy message (which carries actionable detail such as a
 * blocked-model notice) over the SDK's generic status text, falling back to the
 * plain error message when no richer detail is available.
 */
export function getDisplayErrorMessage(error: unknown): string {
    const base = getErrorMessage(error).trim();
    const provider = extractProviderErrorMessage(error)?.trim();
    let message = base;
    // base is often just "Bad Request"/"Forbidden"; prefer the provider detail
    // unless base already contains it (so we don't drop extra context).
    if (provider && provider !== base && !base.includes(provider)) {
        message = provider;
    }
    if (message.length > MAX_DISPLAY_ERROR_LENGTH) {
        message = message.slice(0, MAX_DISPLAY_ERROR_LENGTH) + '…';
    }
    return message || 'An unknown error occurred';
}

function getErrorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
        return undefined;
    }

    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' || typeof code === 'number') {
        return String(code);
    }

    return undefined;
}

function getErrorName(error: unknown): string | undefined {
    if (error instanceof Error) {
        return error.name;
    }

    if (!error || typeof error !== 'object') {
        return undefined;
    }

    const name = (error as { name?: unknown }).name;
    return typeof name === 'string' ? name : undefined;
}

export function getErrorDiagnostics(error: unknown): string {
    const extractApiCallFields = (err: unknown): Record<string, unknown> => {
        if (!err || typeof err !== 'object') {
            return {};
        }
        const r = err as Record<string, unknown>;
        const fields: Record<string, unknown> = {};
        // Vercel AI SDK APICallError surface — most useful for provider 4xx debugging.
        if (r.statusCode !== undefined) fields.statusCode = r.statusCode;
        if (r.url !== undefined) fields.url = r.url;
        if (typeof r.responseBody === 'string') {
            fields.responseBody = r.responseBody.length > 2000
                ? r.responseBody.slice(0, 2000) + '…[truncated]'
                : r.responseBody;
        }
        if (r.data !== undefined) {
            try {
                const dataStr = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
                fields.data = dataStr.length > 2000
                    ? dataStr.slice(0, 2000) + '…[truncated]'
                    : dataStr;
            } catch {
                fields.data = '[unserializable]';
            }
        }
        if (r.responseHeaders !== undefined && r.responseHeaders !== null && typeof r.responseHeaders === 'object') {
            // Whitelist known-safe headers — set-cookie, authorization echoes,
            // x-amz-security-token, etc. must never reach logs.
            const safeKeys = new Set([
                'content-type',
                'content-length',
                'date',
                'x-request-id',
                'request-id',
                'retry-after',
                'x-ratelimit-limit',
                'x-ratelimit-remaining',
                'x-ratelimit-reset',
                'anthropic-ratelimit-requests-limit',
                'anthropic-ratelimit-requests-remaining',
                'anthropic-ratelimit-requests-reset',
                'anthropic-ratelimit-tokens-limit',
                'anthropic-ratelimit-tokens-remaining',
                'anthropic-ratelimit-tokens-reset',
            ]);
            const filtered: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(r.responseHeaders as Record<string, unknown>)) {
                if (safeKeys.has(key.toLowerCase())) {
                    filtered[key] = value;
                }
            }
            fields.responseHeaders = filtered;
        }
        return fields;
    };

    if (error instanceof Error) {
        const topOfStack = typeof error.stack === 'string'
            ? error.stack.split('\n').slice(0, 3).join(' | ')
            : undefined;
        const cause = (error as { cause?: unknown }).cause;
        return JSON.stringify({
            name: error.name,
            code: getErrorCode(error),
            message: error.message,
            cause: cause ? getErrorMessage(cause) : undefined,
            ...extractApiCallFields(error),
            causeDiagnostics: cause ? extractApiCallFields(cause) : undefined,
            stack: topOfStack,
        });
    }

    if (error && typeof error === 'object') {
        const record = error as Record<string, unknown>;
        return JSON.stringify({
            name: getErrorName(error),
            code: getErrorCode(error),
            message: typeof record.message === 'string' ? record.message : undefined,
            type: typeof record.type === 'string' ? record.type : undefined,
            ...extractApiCallFields(error),
        });
    }

    return JSON.stringify({ value: String(error) });
}

export function isProxyTerminatedStreamError(message?: string): boolean {
    if (!message) {
        return false;
    }

    const normalized = message.toLowerCase();
    return (
        normalized === 'terminated' ||
        normalized.includes('terminated') ||
        normalized.includes('econnreset') ||
        normalized.includes('connection reset') ||
        normalized.includes('socket hang up') ||
        normalized.includes('fetch failed') ||
        normalized.includes('network error') ||
        normalized.includes('stream closed')
    );
}

export function createProxyTerminatedError(message: string): Error & { code: string } {
    const error = new Error(message) as Error & { code: string };
    error.code = PROXY_STREAM_TERMINATED_ERROR_CODE;
    return error;
}

export interface StreamWatchdog {
    abortSignal: AbortSignal;
    markActivity: () => void;
    abort: (reason: unknown) => void;
    getAbortReason: () => unknown;
    isUserAbortRequested: () => boolean;
    cleanup: () => void;
}

interface StreamWatchdogParams {
    requestAbortSignal?: AbortSignal;
    idleTimeoutMs: number;
    totalTimeoutMs: number;
    shouldPauseIdleTimeout: () => boolean;
    onTimeout?: (kind: 'idle' | 'total', error: Error & { code: string }) => void;
}

function normalizeAbortReason(reason: unknown): Error {
    if (reason instanceof Error) {
        return reason;
    }

    if (typeof reason === 'string' && reason.trim().length > 0) {
        return new Error(reason);
    }

    return new Error('AbortError: Stream aborted');
}

export function createStreamWatchdog(params: StreamWatchdogParams): StreamWatchdog {
    const controller = new AbortController();
    let lastStreamActivityAt = Date.now();
    const streamStartedAt = Date.now();
    let userAbortRequested = false;
    let requestAbortListener: (() => void) | undefined;

    const abort = (reason: unknown) => {
        if (controller.signal.aborted) {
            return;
        }
        controller.abort(normalizeAbortReason(reason));
    };

    if (params.requestAbortSignal) {
        requestAbortListener = () => {
            userAbortRequested = true;
            abort(params.requestAbortSignal?.reason || new Error('AbortError: Operation aborted by user'));
        };

        if (params.requestAbortSignal.aborted) {
            requestAbortListener();
        } else {
            params.requestAbortSignal.addEventListener('abort', requestAbortListener, { once: true });
        }
    }

    const watchdog = setInterval(() => {
        if (controller.signal.aborted) {
            return;
        }

        const now = Date.now();
        const idleElapsed = now - lastStreamActivityAt;
        const totalElapsed = now - streamStartedAt;

        if (!params.shouldPauseIdleTimeout() && idleElapsed >= params.idleTimeoutMs) {
            const timeoutError = createStreamTimeoutError(
                STREAM_IDLE_TIMEOUT_ERROR_CODE,
                `Agent stream timed out after ${Math.round(params.idleTimeoutMs / 1000)} seconds of inactivity.`
            );
            params.onTimeout?.('idle', timeoutError);
            abort(timeoutError);
            return;
        }

        if (totalElapsed >= params.totalTimeoutMs) {
            const timeoutError = createStreamTimeoutError(
                STREAM_TOTAL_TIMEOUT_ERROR_CODE,
                `Agent stream exceeded maximum runtime of ${Math.round(params.totalTimeoutMs / 1000)} seconds.`
            );
            params.onTimeout?.('total', timeoutError);
            abort(timeoutError);
        }
    }, STREAM_WATCHDOG_TICK_MS);

    return {
        abortSignal: controller.signal,
        markActivity: () => {
            lastStreamActivityAt = Date.now();
        },
        abort,
        getAbortReason: () => controller.signal.reason,
        isUserAbortRequested: () => userAbortRequested,
        cleanup: () => {
            clearInterval(watchdog);
            if (params.requestAbortSignal && requestAbortListener) {
                params.requestAbortSignal.removeEventListener('abort', requestAbortListener);
            }
        },
    };
}
