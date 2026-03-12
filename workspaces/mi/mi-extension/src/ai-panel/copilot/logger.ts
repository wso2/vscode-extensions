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

import { logWithDebugLevel } from '../../util/logger';

const COPILOT_LABEL = 'AI Copilot';

/**
 * Log info message to the MI Extension output channel
 */
export function logInfo(message: string): void {
    logWithDebugLevel(message, COPILOT_LABEL, 'INFO');
}

/**
 * Log debug message to the MI Extension output channel
 */
export function logDebug(message: string): void {
    logWithDebugLevel(message, COPILOT_LABEL, 'DEBUG');
}

/**
 * Log warning message to the MI Extension output channel
 */
export function logWarn(message: string): void {
    logWithDebugLevel(message, COPILOT_LABEL, 'WARN');
}

/**
 * Log error message to the MI Extension output channel
 * For critical errors that should also go to console, use console.error directly
 */
export function logError(message: string, error?: unknown): void {
    const errorMessage = error === undefined
        ? message
        : error instanceof Error
            ? `${message}: ${error.message}\n${error.stack}`
            : `${message}: ${String(error)}`;
    logWithDebugLevel(errorMessage, COPILOT_LABEL, 'ERROR');
}
