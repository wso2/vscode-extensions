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

/**
 * Distinct error class so generic `catch(err)` blocks can re-throw user-aborts
 * instead of converting them into ordinary tool failures. Callers should check
 * `isOperationAbortedError(err)` (or `err instanceof OperationAbortedError`)
 * before swallowing errors.
 */
export class OperationAbortedError extends Error {
    constructor(context: string) {
        super(`Operation aborted by user while ${context}`);
        this.name = 'AbortError';
    }
}

export function isOperationAbortedError(err: unknown): boolean {
    if (err instanceof OperationAbortedError) {
        return true;
    }
    // Also treat any error whose name is AbortError (e.g. from DOM AbortController
    // or hand-constructed errors in other tools) as an abort so catch-rethrow
    // logic doesn't miss them.
    return typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError';
}

/**
 * Throw a user-abort error if the supplied signal has already been aborted.
 * Point-in-time check — call between steps of a multi-step tool to ensure
 * the tool doesn't proceed to the next step after a user interrupt.
 */
export function ensureOperationNotAborted(
    mainAbortSignal: AbortSignal | undefined,
    context: string
): void {
    if (mainAbortSignal?.aborted) {
        throw new OperationAbortedError(context);
    }
}
