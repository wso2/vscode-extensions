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

import { useRef, useCallback, useEffect } from 'react';
import { postMessage as postVSCodeMessage } from '../utils/vscode-api';

export interface UseDebouncedValidationOptions {
    delay?: number;
    requestValidation?: () => void;
    requestAIReadiness?: () => void;
}

export interface UseDebouncedValidationReturn {
    requestValidation: () => void;
    requestAIReadiness: () => void;
    cancel: () => void;
}

/**
 * Hook for debounced validation requests
 * Prevents rapid validation requests by debouncing the request function
 */
export function useDebouncedValidation(
    options: UseDebouncedValidationOptions = {}
): UseDebouncedValidationReturn {
    const { delay = 500, requestValidation: customRequestValidation, requestAIReadiness: customRequestAIReadiness } = options;
    const validationTimerRef = useRef<NodeJS.Timeout | null>(null);
    const aiReadinessTimerRef = useRef<NodeJS.Timeout | null>(null);

    const defaultRequestValidation = useCallback(() => {
        postVSCodeMessage({ command: 'requestValidation' });
    }, []);

    const defaultRequestAIReadiness = useCallback(() => {
        postVSCodeMessage({ command: 'requestAIReadiness' });
    }, []);

    const requestValidation = useCallback(() => {
        const requestFn = customRequestValidation || defaultRequestValidation;
        
        // Clear existing timer
        if (validationTimerRef.current) {
            clearTimeout(validationTimerRef.current);
        }

        // Set new timer
        validationTimerRef.current = setTimeout(() => {
            requestFn();
        }, delay);
    }, [customRequestValidation, defaultRequestValidation, delay]);

    const requestAIReadiness = useCallback(() => {
        const requestFn = customRequestAIReadiness || defaultRequestAIReadiness;
        
        // Clear existing timer
        if (aiReadinessTimerRef.current) {
            clearTimeout(aiReadinessTimerRef.current);
        }

        // Set new timer
        aiReadinessTimerRef.current = setTimeout(() => {
            requestFn();
        }, delay);
    }, [customRequestAIReadiness, defaultRequestAIReadiness, delay]);

    const cancel = useCallback(() => {
        if (validationTimerRef.current) {
            clearTimeout(validationTimerRef.current);
            validationTimerRef.current = null;
        }
        if (aiReadinessTimerRef.current) {
            clearTimeout(aiReadinessTimerRef.current);
            aiReadinessTimerRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (validationTimerRef.current) {
                clearTimeout(validationTimerRef.current);
            }
            if (aiReadinessTimerRef.current) {
                clearTimeout(aiReadinessTimerRef.current);
            }
        };
    }, []);

    return { requestValidation, requestAIReadiness, cancel };
}

