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

import { getLoginMethod, getBiIntelId } from "../../utils/ai/auth";
import { LoginMethod } from "@wso2/ballerina-core";

let cachedLoginMethod: LoginMethod | undefined = undefined;
let cachedBiIntelId: string | undefined = undefined;
let isInitializing = false;

export function initializeTelemetryContext(): void {
    if (isInitializing) {
        return;
    }

    isInitializing = true;

    const timeoutPromise = new Promise<[LoginMethod | undefined, string | undefined]>((resolve) => {
        setTimeout(() => {
            console.warn('Telemetry context initialization timed out after 10 seconds');
            resolve([undefined, undefined]);
        }, 10000);
    });

    Promise.race([
        Promise.all([
            getLoginMethod().catch(() => undefined),
            getBiIntelId().catch(() => undefined)
        ]),
        timeoutPromise
    ])
    .then(([loginMethod, biIntelId]) => {
        cachedLoginMethod = loginMethod;
        cachedBiIntelId = biIntelId;
    })
    .catch((error) => {
        console.error('Failed to initialize telemetry context:', error);
    })
    .finally(() => {
        isInitializing = false;
    });
}

export function getCachedLoginMethod(): LoginMethod | undefined {
    return cachedLoginMethod;
}

export function getCachedBiIntelId(): string | undefined {
    return cachedBiIntelId;
}
