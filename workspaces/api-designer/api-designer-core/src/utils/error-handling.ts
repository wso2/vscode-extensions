/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

/**
 * Standard error types for API Designer
 */
export class APIDesignerError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly context?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'APIDesignerError';
        Object.setPrototypeOf(this, APIDesignerError.prototype);
    }
}

/**
 * File operation errors
 */
export class FileOperationError extends APIDesignerError {
    constructor(
        message: string,
        public readonly filePath?: string,
        context?: Record<string, unknown>
    ) {
        super(message, 'FILE_OPERATION_ERROR', { filePath, ...context });
        this.name = 'FileOperationError';
        Object.setPrototypeOf(this, FileOperationError.prototype);
    }
}

/**
 * Validation errors
 */
export class APIDesignerValidationError extends APIDesignerError {
    constructor(
        message: string,
        public readonly validationPath?: string[],
        context?: Record<string, unknown>
    ) {
        super(message, 'VALIDATION_ERROR', { validationPath, ...context });
        this.name = 'APIDesignerValidationError';
        Object.setPrototypeOf(this, APIDesignerValidationError.prototype);
    }
}

/**
 * RPC communication errors
 */
export class RPCError extends APIDesignerError {
    constructor(
        message: string,
        public readonly method?: string,
        context?: Record<string, unknown>
    ) {
        super(message, 'RPC_ERROR', { method, ...context });
        this.name = 'RPCError';
        Object.setPrototypeOf(this, RPCError.prototype);
    }
}

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String(error.message);
    }
    return 'Unknown error occurred';
}

/**
 * Safely extract error code from unknown error type
 */
export function getErrorCode(error: unknown): string | undefined {
    if (error instanceof APIDesignerError) {
        return error.code;
    }
    if (error && typeof error === 'object' && 'code' in error) {
        return String(error.code);
    }
    return undefined;
}

/**
 * Check if error is an instance of APIDesignerError
 */
export function isAPIDesignerError(error: unknown): error is APIDesignerError {
    return error instanceof APIDesignerError;
}

/**
 * Wrap async function with standardized error handling
 */
export async function withErrorHandling<T>(
    fn: () => Promise<T>,
    context?: string
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        const message = getErrorMessage(error);
        const errorMessage = context ? `${context}: ${message}` : message;
        
        if (isAPIDesignerError(error)) {
            throw error;
        }
        
        throw new APIDesignerError(errorMessage, 'UNKNOWN_ERROR', {
            originalError: error
        });
    }
}
