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

import { useState, useEffect } from 'react';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { loadYaml, detectSpecType, ApiSpecType, SpecificationFactory } from '@wso2/api-designer-core';
import { logger } from '../../../utils/logger';

export interface SpecInfo {
    title?: string;
    description?: string;
    version?: string;
    openApiVersion?: string;
    specType?: 'openapi' | 'asyncapi';
}

export interface UseMockSpecInfoReturn {
    specInfo: SpecInfo | null;
    endpoints: Array<{ method: string; path: string }>;
}

/**
 * Hook for loading and managing spec information for mock view
 */
export function useMockSpecInfo(fileUri: string): UseMockSpecInfoReturn {
    const { rpcClient } = useVisualizerContext();
    const [specInfo, setSpecInfo] = useState<SpecInfo | null>(null);
    const [endpoints, setEndpoints] = useState<Array<{ method: string; path: string }>>([]);

    useEffect(() => {
        if (!rpcClient || !fileUri) return;

        const fetchSpecInfo = async () => {
            try {
                const response = await rpcClient.getApiDesignerVisualizerRpcClient().getAPISpecContent({
                    filePath: fileUri
                });
                
                // Detect spec type
                const detection = detectSpecType(response.content);
                const detectedSpecType = detection.type === ApiSpecType.ASYNCAPI ? 'asyncapi' : 'openapi';
                
                let parsed: unknown;
                try {
                    parsed = JSON.parse(response.content) as unknown;
                } catch {
                    // Try YAML parsing if JSON fails
                    parsed = loadYaml(response.content) as unknown;
                }

                // Use SpecificationService to extract endpoints/channels
                let extractedEndpoints: Array<{ method: string; path: string }> = [];
                if (detection.type && parsed) {
                    const service = SpecificationFactory.getService(detection.type);
                    const parsedSpec = service.parse(response.content);
                    
                    if (parsedSpec.success && parsedSpec.spec) {
                        const endpoints = service.getEndpoints(parsedSpec.spec);
                        extractedEndpoints = endpoints.map(e => ({
                            method: e.method || 'GET',
                            path: e.path
                        }));
                    }
                }

                // Extract spec info
                const parsedObj = parsed as Record<string, any>;
                setSpecInfo({
                    title: parsedObj?.info?.title,
                    description: parsedObj?.info?.description,
                    version: parsedObj?.info?.version,
                    openApiVersion: parsedObj?.openapi || parsedObj?.asyncapi || parsedObj?.swagger,
                    specType: detectedSpecType
                });

                setEndpoints(extractedEndpoints);
            } catch (error) {
                logger.error('Failed to load API spec:', error);
            }
        };

        fetchSpecInfo();
    }, [rpcClient, fileUri]);

    return {
        specInfo,
        endpoints
    };
}

