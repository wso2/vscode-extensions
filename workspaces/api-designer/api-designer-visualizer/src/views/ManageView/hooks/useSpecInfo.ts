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
import { loadYaml } from '@wso2/api-designer-core';
import { logger } from '../../../utils/logger';

export interface SpecInfo {
    title?: string;
    description?: string;
    version?: string;
    openApiVersion?: string;
    mainEndpoint?: string;
    specType?: 'openapi' | 'asyncapi';
}

export interface UseSpecInfoReturn {
    specInfo: SpecInfo | null;
}

/**
 * Hook for loading and managing API specification info
 */
export function useSpecInfo(fileUri: string): UseSpecInfoReturn {
    const { rpcClient } = useVisualizerContext();
    const [specInfo, setSpecInfo] = useState<SpecInfo | null>(null);

    useEffect(() => {
        if (!rpcClient || !fileUri) return;

        const fetchSpecInfo = async () => {
            try {
                const response = await rpcClient.getApiDesignerVisualizerRpcClient().getAPISpecContent({
                    filePath: fileUri
                });
                
                let parsed: any;
                try {
                    parsed = JSON.parse(response.content);
                } catch {
                    // Try YAML parsing if JSON fails
                    parsed = loadYaml(response.content);
                }

                // Extract main endpoint from servers
                let mainEndpointFromSpec = '';
                if (parsed?.servers && Array.isArray(parsed.servers) && parsed.servers.length > 0) {
                    mainEndpointFromSpec = parsed.servers[0]?.url || '';
                }

                setSpecInfo({
                    title: parsed?.info?.title,
                    description: parsed?.info?.description,
                    version: parsed?.info?.version,
                    openApiVersion: parsed?.openapi || parsed?.swagger,
                    mainEndpoint: mainEndpointFromSpec,
                    specType: parsed?.asyncapi ? 'asyncapi' : 'openapi'
                });
            } catch (error) {
                logger.error('Failed to load API spec:', error);
            }
        };

        fetchSpecInfo();
    }, [rpcClient, fileUri]);

    return {
        specInfo
    };
}

