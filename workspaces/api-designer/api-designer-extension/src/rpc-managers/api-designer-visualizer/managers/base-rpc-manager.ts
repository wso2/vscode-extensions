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

import { logDebug, logInfo, logWarning, logError } from '../../../utils/logger';

/**
 * Base class for RPC managers
 * Provides common logging utilities and context management
 */
export abstract class BaseRpcManager {
    protected readonly CONTEXT: string;
    
    constructor(context: string) {
        this.CONTEXT = context;
    }
    
    protected logDebug(message: string, ...args: unknown[]): void {
        logDebug(`${this.CONTEXT}: ${message}`, ...args);
    }
    
    protected logError(message: string, error?: unknown): void {
        logError(`${this.CONTEXT}: ${message}`, error);
    }
    
    protected logInfo(message: string): void {
        logInfo(`${this.CONTEXT}: ${message}`);
    }
    
    protected logWarning(message: string, ...args: unknown[]): void {
        logWarning(`${this.CONTEXT}: ${message}`, ...args);
    }
}

