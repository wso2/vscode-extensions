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

/**
 * React hook to check if AI Chat is available
 * Currently checks for GitHub Copilot, but designed to support multiple AI providers
 * @returns {boolean} true if AI Chat is available, false otherwise
 */
export function useAIAvailability(): boolean {
    const { rpcClient } = useVisualizerContext();
    const [isAvailable, setIsAvailable] = useState<boolean>(false);

    useEffect(() => {
        let mounted = true;

        const checkAvailability = async () => {
            try {
                if (!rpcClient) {
                    if (mounted) {
                        setIsAvailable(false);
                    }
                    return;
                }

                const response = await rpcClient.getApiDesignerVisualizerRpcClient().checkAIAvailability({});
                if (mounted) {
                    setIsAvailable(response.available);
                }
            } catch (error) {
                if (mounted) {
                    setIsAvailable(false);
                }
            }
        };

        checkAvailability();

        return () => {
            mounted = false;
        };
    }, [rpcClient]);

    return isAvailable;
}

