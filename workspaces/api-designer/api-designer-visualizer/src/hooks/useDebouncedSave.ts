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

import { useRef, useCallback, useEffect } from 'react';

export interface UseDebouncedSaveOptions<T> {
    onSave: (value: T) => void;
    delay?: number;
    compare?: (a: T, b: T) => boolean;
}

export interface UseDebouncedSaveReturn<T> {
    save: (value: T) => void;
    cancel: () => void;
}

/**
 * Hook for debounced save operations
 * Prevents rapid saves by debouncing the save function
 */
export function useDebouncedSave<T>(
    options: UseDebouncedSaveOptions<T>
): UseDebouncedSaveReturn<T> {
    const { onSave, delay = 500, compare } = options;
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastValueRef = useRef<T | null>(null);

    const save = useCallback((value: T) => {
        // Check if value actually changed
        if (compare && lastValueRef.current !== null) {
            if (compare(lastValueRef.current, value)) {
                return; // No change, skip save
            }
        } else {
            const serialized = JSON.stringify(value);
            const lastSerialized = lastValueRef.current !== null ? JSON.stringify(lastValueRef.current) : null;
            if (serialized === lastSerialized) {
                return; // No change, skip save
            }
        }

        lastValueRef.current = value;

        // Clear existing timer
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        // Set new timer
        timerRef.current = setTimeout(() => {
            onSave(value);
        }, delay);
    }, [onSave, delay, compare]);

    const cancel = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return { save, cancel };
}

