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

import { useEffect, useRef, useCallback } from 'react';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { ApiSpecType, loadYaml } from '@wso2/api-designer-core';
import { postMessage as postVSCodeMessage } from '../../../utils/vscode-api';
import { logger } from '../../../utils/logger';
import { useDebouncedValidation } from '../../../hooks/useDebouncedValidation';

interface OpenAPISpec {
    openapi?: string;
    info?: any;
    servers?: any;
    tags?: any[];
    paths?: Record<string, any>;
    components?: any;
}

interface UseAPIEditorSpecLoaderOptions {
    fileUri: string;
    onSpecLoaded: (spec: OpenAPISpec | null, specType: ApiSpecType | null) => void;
    onError: (error: string) => void;
    onLoadingChange: (loading: boolean) => void;
}

/**
 * Hook for loading API specification from fileUri
 * Handles spec loading, parsing, and type detection
 */
export function useAPIEditorSpecLoader(options: UseAPIEditorSpecLoaderOptions): void {
    const { fileUri, onSpecLoaded, onError, onLoadingChange } = options;
    const { rpcClient } = useVisualizerContext();
    const previousFileUriRef = useRef<string>('');
    
    // Debounced validation hook
    const { requestValidation: debouncedRequestValidation, requestAIReadiness: debouncedRequestAIReadiness } = useDebouncedValidation({
        delay: 500
    });
    
    // Use refs for callbacks to avoid unnecessary effect re-runs
    const onSpecLoadedRef = useRef(onSpecLoaded);
    const onErrorRef = useRef(onError);
    const onLoadingChangeRef = useRef(onLoadingChange);
    
    // Update refs when callbacks change
    useEffect(() => {
        onSpecLoadedRef.current = onSpecLoaded;
        onErrorRef.current = onError;
        onLoadingChangeRef.current = onLoadingChange;
    }, [onSpecLoaded, onError, onLoadingChange]);

    useEffect(() => {
        // Skip if fileUri hasn't actually changed
        if (!fileUri || fileUri === previousFileUriRef.current) {
            return;
        }
        
        // Update previous fileUri
        previousFileUriRef.current = fileUri;
        
        // Reset state when fileUri changes
        onSpecLoadedRef.current(null, null);
        onErrorRef.current(null);
        onLoadingChangeRef.current(true);
        
        if (!rpcClient) {
            return;
        }
        
        // Load spec directly via RPC - this is the most reliable way
        const loadSpec = async () => {
            try {
                const response = await rpcClient.getApiDesignerVisualizerRpcClient().getAPISpecContent({
                    filePath: fileUri
                });
                
                if (response.content) {
                    try {
                        let parsed: any;
                        if (response.type === 'json') {
                            parsed = JSON.parse(response.content);
                        } else {
                            parsed = loadYaml(response.content);
                        }
                        
                        if (parsed) {
                            // Detect spec type
                            let specType: ApiSpecType | null = null;
                            if (parsed.openapi) {
                                specType = ApiSpecType.OPENAPI;
                            }
                            
                            onSpecLoadedRef.current(parsed, specType);
                            onErrorRef.current(null);
                        }
                    } catch (error) {
                        logger.error('Failed to parse spec:', error);
                        onErrorRef.current('Failed to parse API specification.');
                        onSpecLoadedRef.current(null, null);
                    }
                }
            } catch (error) {
                logger.error('Failed to load spec:', error);
                onErrorRef.current('Failed to load API specification.');
                onSpecLoadedRef.current(null, null);
            } finally {
                onLoadingChangeRef.current(false);
                // Request validation and AI readiness after loading (debounced)
                debouncedRequestValidation();
                debouncedRequestAIReadiness();
            }
        };
        
        loadSpec();
    }, [fileUri, rpcClient]); // Only depend on fileUri and rpcClient, not callbacks
}

