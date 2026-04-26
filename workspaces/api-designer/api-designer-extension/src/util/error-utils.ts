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

import * as vscode from 'vscode';
import { APIDesignerError, isAPIDesignerError } from '@wso2/api-designer-core';
import { logError } from './logger';

/**
 * Re-export unified error type from core (single APIDesignerError across packages).
 */
export { APIDesignerError, isAPIDesignerError };

/**
 * Error codes for API Designer extension
 */
export enum ErrorCode {
    // File operations
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    FILE_READ_ERROR = 'FILE_READ_ERROR',
    FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
    FILE_PARSE_ERROR = 'FILE_PARSE_ERROR',

    // Specification errors
    SPEC_INVALID = 'SPEC_INVALID',
    SPEC_TYPE_UNKNOWN = 'SPEC_TYPE_UNKNOWN',
    SPEC_PARSE_ERROR = 'SPEC_PARSE_ERROR',

    // Validation errors
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    VALIDATION_RULESET_ERROR = 'VALIDATION_RULESET_ERROR',

    // RPC errors
    RPC_ERROR = 'RPC_ERROR',
    RPC_TIMEOUT = 'RPC_TIMEOUT',

    // AI errors
    AI_UNAVAILABLE = 'AI_UNAVAILABLE',
    AI_GENERATION_ERROR = 'AI_GENERATION_ERROR',

    // Project errors
    PROJECT_INIT_ERROR = 'PROJECT_INIT_ERROR',
    PROJECT_CONFIG_ERROR = 'PROJECT_CONFIG_ERROR',

    // Mock server errors
    MOCK_SERVER_START_ERROR = 'MOCK_SERVER_START_ERROR',
    MOCK_SERVER_STOP_ERROR = 'MOCK_SERVER_STOP_ERROR',
    MOCK_CONFIG_ERROR = 'MOCK_CONFIG_ERROR',

    // Generic errors
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    OPERATION_FAILED = 'OPERATION_FAILED'
}

/**
 * User-friendly error messages mapped to error codes
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
    [ErrorCode.FILE_NOT_FOUND]: 'File not found. Please check the file path and try again.',
    [ErrorCode.FILE_READ_ERROR]: 'Failed to read file. Please check file permissions.',
    [ErrorCode.FILE_WRITE_ERROR]: 'Failed to write file. Please check file permissions.',
    [ErrorCode.FILE_PARSE_ERROR]: 'Failed to parse file. Please check the file format.',

    [ErrorCode.SPEC_INVALID]: 'Invalid API specification. Please check the specification format.',
    [ErrorCode.SPEC_TYPE_UNKNOWN]: 'Unknown API specification type. Supported type: OpenAPI.',
    [ErrorCode.SPEC_PARSE_ERROR]: 'Failed to parse API specification. Please check the syntax.',

    [ErrorCode.VALIDATION_ERROR]: 'Validation failed. Please check the validation errors.',
    [ErrorCode.VALIDATION_RULESET_ERROR]: 'Validation ruleset error. Please check the ruleset configuration.',

    [ErrorCode.RPC_ERROR]: 'Communication error. Please try again.',
    [ErrorCode.RPC_TIMEOUT]: 'Operation timed out. Please try again.',

    [ErrorCode.AI_UNAVAILABLE]: 'AI provider is not available. Please install and configure an AI provider.',
    [ErrorCode.AI_GENERATION_ERROR]: 'AI generation failed. Please try again.',

    [ErrorCode.PROJECT_INIT_ERROR]: 'Failed to initialize project. Please check the project configuration.',
    [ErrorCode.PROJECT_CONFIG_ERROR]: 'Project configuration error. Please check the configuration file.',

    [ErrorCode.MOCK_SERVER_START_ERROR]: 'Failed to start mock server. Please check the server configuration.',
    [ErrorCode.MOCK_SERVER_STOP_ERROR]: 'Failed to stop mock server.',
    [ErrorCode.MOCK_CONFIG_ERROR]: 'Mock server configuration error. Please check the configuration.',

    [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
    [ErrorCode.OPERATION_FAILED]: 'Operation failed. Please try again.'
};

function isExtensionErrorCode(code: string): code is ErrorCode {
    return (Object.values(ErrorCode) as string[]).includes(code);
}

/**
 * Resolve UI message: prefer explicit message, then catalog for extension {@link ErrorCode}s, else unknown.
 */
function messageForErrorCode(code: string, customMessage?: string): string {
    const catalog = isExtensionErrorCode(code) ? ERROR_MESSAGES[code] : undefined;
    return customMessage || catalog || ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR];
}

/**
 * Get user-friendly error message for an error code
 */
export function getErrorMessage(code: ErrorCode, customMessage?: string): string {
    return messageForErrorCode(code, customMessage);
}

/**
 * Centralized error handler
 * Logs errors and shows user-friendly messages
 *
 * @param error - The error to handle (can be APIDesignerError, Error, or unknown)
 * @param context - Context where the error occurred (e.g., 'FileManager.readFile')
 */
export function handleError(error: unknown, context: string): void {
    if (isAPIDesignerError(error)) {
        logError(`${context}: ${error.code}`, error);

        const userMessage = messageForErrorCode(error.code, error.message);
        vscode.window.showErrorMessage(userMessage);
    } else if (error instanceof Error) {
        logError(`${context}: Unexpected error`, error);

        vscode.window.showErrorMessage(`An error occurred: ${error.message}`);
    } else {
        logError(`${context}: Unknown error`, error);

        vscode.window.showErrorMessage('An unexpected error occurred');
    }
}

/**
 * Create an APIDesignerError with a user-friendly message
 */
export function createError(
    code: ErrorCode,
    operationContext?: string,
    customMessage?: string
): APIDesignerError {
    const message = getErrorMessage(code, customMessage);
    return new APIDesignerError(
        message,
        code,
        operationContext !== undefined ? { operationContext } : undefined
    );
}

/**
 * Wrap an async function with error handling
 */
export async function withErrorHandling<T>(
    fn: () => Promise<T>,
    context: string,
    errorCode: ErrorCode = ErrorCode.OPERATION_FAILED
): Promise<T | null> {
    try {
        return await fn();
    } catch (error) {
        if (isAPIDesignerError(error)) {
            handleError(error, context);
        } else {
            handleError(createError(errorCode, context), context);
        }
        return null;
    }
}

/**
 * Wrap a sync function with error handling
 */
export function withErrorHandlingSync<T>(
    fn: () => T,
    context: string,
    errorCode: ErrorCode = ErrorCode.OPERATION_FAILED
): T | null {
    try {
        return fn();
    } catch (error) {
        if (isAPIDesignerError(error)) {
            handleError(error, context);
        } else {
            handleError(createError(errorCode, context), context);
        }
        return null;
    }
}
