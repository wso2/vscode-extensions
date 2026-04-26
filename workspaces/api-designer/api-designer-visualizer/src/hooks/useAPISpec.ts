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

import { useState, useEffect, useRef, useCallback } from 'react';
import { postMessage as postVSCodeMessage } from '../utils/vscode-api';

export interface APISpec {
    openapi?: string;
    info?: any;
    servers?: any[];
    tags?: any[];
    paths?: Record<string, any>;
    components?: Record<string, any>;
}

export interface UseAPISpecOptions {
    initialSpec?: APISpec | null;
    onSave?: (spec: APISpec) => void;
    debounceMs?: number;
}

export interface UseAPISpecReturn {
    spec: APISpec | null;
    parseError: string | null;
    updateSpec: (newSpec: APISpec) => void;
    saveSpec: (newSpec: APISpec) => void;
}

/**
 * Hook for managing API specification state (OpenAPI)
 * Handles spec updates, saving, and message listening
 */
export function useAPISpec(
    options: UseAPISpecOptions
): UseAPISpecReturn {
    const { initialSpec, onSave, debounceMs = 500 } = options;
    
    const [spec, setSpec] = useState<APISpec | null>(initialSpec || null);
    const [parseError, setParseError] = useState<string | null>(null);
    const saveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedSpecRef = useRef<string | null>(null);

    // Update spec if initialSpec changes
    useEffect(() => {
        if (initialSpec) {
            setSpec(initialSpec);
            setParseError(null);
        }
    }, [initialSpec]);

    // Listen for spec updates from extension
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'updateSpec':
                case 'update':
                    setParseError(null);
                    setSpec(message.data);
                    break;
                case 'specParseError':
                    setParseError(message.data?.message || 'Failed to parse API specification.');
                    setSpec(null);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const updateSpec = useCallback((newSpec: APISpec) => {
        setSpec(newSpec);
    }, []);

    const saveSpec = useCallback((newSpec: APISpec) => {
        setSpec(newSpec);
        
        // Serialize spec to check if it actually changed
        const serialized = JSON.stringify(newSpec);
        if (lastSavedSpecRef.current === serialized) {
            return; // No change, skip save
        }
        lastSavedSpecRef.current = serialized;
        
        // Debounce saves to prevent rapid file writes
        if (saveDebounceTimerRef.current) {
            clearTimeout(saveDebounceTimerRef.current);
        }
        
        saveDebounceTimerRef.current = setTimeout(() => {
            if (onSave) {
                onSave(newSpec);
            } else {
                postVSCodeMessage({ command: 'saveSpec', data: newSpec });
            }
            setTimeout(() => {
                postVSCodeMessage({ command: 'requestValidation' });
                postVSCodeMessage({ command: 'requestAIReadiness' });
            }, 600);
        }, debounceMs);
    }, [onSave, debounceMs]);
    
    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (saveDebounceTimerRef.current) {
                clearTimeout(saveDebounceTimerRef.current);
            }
        };
    }, []);

    return {
        spec,
        parseError,
        updateSpec,
        saveSpec
    };
}

