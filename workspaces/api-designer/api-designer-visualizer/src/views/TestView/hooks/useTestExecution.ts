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

import { useState, useCallback } from 'react';
import { RpcClient } from '@wso2/api-designer-rpc-client';
import { TestRequest, TestResult, TestEnvironment } from '@wso2/api-designer-core';

export const useTestExecution = (
    rpcClient: RpcClient | null,
    fileUri: string | null
) => {
    const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
    const [isExecuting, setIsExecuting] = useState(false);

    const executeTestRequest = useCallback(async (
        request: TestRequest,
        environment: TestEnvironment | null,
        baseUrl: string
    ) => {
        if (!rpcClient || !fileUri) return;

        setIsExecuting(true);

        // Don't clear previous results immediately, or maybe clear only for this request?
        // setTestResult(null); // No longer needed as we update map

        try {
            const response = await rpcClient.executeTest({
                request,
                environment: environment || undefined,
                baseUrl: baseUrl || undefined,
            });

            if (response && response.result) {
                setTestResults(prev => ({
                    ...prev,
                    [request.id]: response.result
                }));
            }
        } catch (error) {
            console.error('Failed to execute test:', error);
            setTestResults(prev => ({
                ...prev,
                [request.id]: {
                    requestId: request.id,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: Date.now(),
                }
            }));
        } finally {
            setIsExecuting(false);
        }
    }, [rpcClient, fileUri]);

    return {
        results: testResults,
        isExecuting,
        executeTest: executeTestRequest,
    };
};

