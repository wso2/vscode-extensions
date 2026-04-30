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
 * software distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebouncedSave } from './useDebouncedSave';

export interface UseBidirectionalSyncOptions<T> {
    /** Current value from parent (external source) */
    externalValue: T;
    /** Callback to save changes (debounced) */
    onAutoSave?: (value: T) => void;
    /** Callback for explicit save button click */
    onSave?: (value: T) => void;
    /** Delay for debounced auto-save in ms */
    delay?: number;
    /** Custom comparison function */
    compare?: (a: T, b: T) => boolean;
    /** Whether the editor is currently open */
    isOpen: boolean;
    /** Optional key to track different instances (e.g., path-method for operations) */
    syncKey?: string;
    /** Function to build complete value from local state (for complex editors) - receives current localValue */
    buildValue?: (currentValue: T) => T;
}

export interface UseBidirectionalSyncReturn<T> {
    /** Local value to use in editor */
    localValue: T;
    /** Set local value (triggers auto-save) */
    setLocalValue: (value: T | ((prev: T) => T)) => void;
    /** Build complete value from current state (for complex editors) */
    buildCompleteValue: () => T;
    /** Handle explicit save button click */
    handleSave: () => void;
}

/**
 * Hook for bidirectional sync between editor and external source
 * - Auto-saves changes from editor to external source (debounced)
 * - Syncs changes from external source to editor (real-time)
 * - Prevents glitches and save loops
 */
export function useBidirectionalSync<T>(
    options: UseBidirectionalSyncOptions<T>
): UseBidirectionalSyncReturn<T> {
    const {
        externalValue,
        onAutoSave,
        onSave,
        delay = 500,
        compare,
        isOpen,
        syncKey,
        buildValue
    } = options;

    // Local state for editor
    const [localValue, setLocalValueState] = useState<T>(externalValue);
    
    // Refs to track sync state
    const lastSyncedValueRef = useRef<string>(JSON.stringify(externalValue));
    const lastSyncKeyRef = useRef<string>(syncKey || '');
    const wasOpenRef = useRef<boolean>(isOpen);
    const isSyncingRef = useRef<boolean>(false);
    const pendingSaveRef = useRef<T | null>(null);
    const buildValueRef = useRef(buildValue);

    // Update build function ref when it changes
    useEffect(() => {
        buildValueRef.current = buildValue;
    }, [buildValue]);

    // Build complete value
    const buildCompleteValue = useCallback((): T => {
        if (buildValueRef.current) {
            return buildValueRef.current(localValue);
        }
        return localValue;
    }, [localValue]);

    // Debounced auto-save
    const { save: debouncedAutoSave } = useDebouncedSave<T>({
        onSave: (updatedValue) => {
            if (onAutoSave) {
                onAutoSave(updatedValue);
                // Update lastSyncedValueRef to prevent immediate re-save after sync
                lastSyncedValueRef.current = JSON.stringify(updatedValue);
            }
            pendingSaveRef.current = null;
        },
        delay,
        compare
    });

    // Auto-save when localValue changes
    useEffect(() => {
        if (!isOpen || !onAutoSave || isSyncingRef.current) return;

        const completeValue = buildValueRef.current 
            ? buildValueRef.current(localValue)
            : localValue;
        const completeValueStr = JSON.stringify(completeValue);
        
        // Only save if value actually changed
        if (completeValueStr !== lastSyncedValueRef.current) {
            pendingSaveRef.current = completeValue;
            debouncedAutoSave(completeValue);
        }
    }, [localValue, isOpen, onAutoSave, debouncedAutoSave]);

    // Set local value
    const setLocalValue = useCallback((value: T | ((prev: T) => T)) => {
        setLocalValueState(value);
    }, []);

    // Sync from external value
    useEffect(() => {
        if (!isOpen) return;

        const currentSyncKey = syncKey || '';
        const syncKeyChanged = lastSyncKeyRef.current !== currentSyncKey;
        const modalJustOpened = !wasOpenRef.current && isOpen;
        const currentValueStr = JSON.stringify(externalValue);
        const valueChanged = lastSyncedValueRef.current !== currentValueStr;

        // Update refs
        if (syncKeyChanged) {
            lastSyncKeyRef.current = currentSyncKey;
        }
        wasOpenRef.current = isOpen;

        // Sync from external if:
        // 1. Modal just opened (initial load)
        // 2. Sync key changed (switching to different item)
        // 3. Value changed while modal is open (external edit)
        if (modalJustOpened || syncKeyChanged || (isOpen && valueChanged)) {
            const pendingSaveStr = pendingSaveRef.current ? JSON.stringify(pendingSaveRef.current) : null;

            // If the incoming value matches our pending save, it means our save just completed
            // Don't sync in this case to avoid flickering
            if (pendingSaveStr && pendingSaveStr === currentValueStr) {
                lastSyncedValueRef.current = currentValueStr;
                pendingSaveRef.current = null;
                return;
            }

            // Mark that we're syncing (prevents auto-save during sync)
            isSyncingRef.current = true;

            setLocalValueState(externalValue);
            lastSyncedValueRef.current = currentValueStr;

            // Reset syncing flag after a short delay
            setTimeout(() => {
                isSyncingRef.current = false;
            }, 100);
        }
    }, [externalValue, syncKey, isOpen]);

    // Handle explicit save button click
    const handleSave = useCallback(() => {
        if (onSave) {
            const completeValue = buildCompleteValue();
            // Cancel any pending auto-save
            if (pendingSaveRef.current) {
                pendingSaveRef.current = null;
            }
            onSave(completeValue);
        }
    }, [onSave, buildCompleteValue]);

    return {
        localValue,
        setLocalValue,
        buildCompleteValue,
        handleSave
    };
}
