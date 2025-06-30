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
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVisualizerContext } from "@wso2/mi-rpc-client";

export const useIOTypes = (filePath: string, functionName: string, nonMappingFileContent: string) => {
    const { rpcClient } = useVisualizerContext();
    const getIOTypes = async () => {
        try {
            const res = await rpcClient
                .getMiDataMapperRpcClient()
                .getIOTypes({ filePath, functionName });
            return res;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    const {
        data: dmIOTypes,
        isFetching: isFetchingIOTypes,
        isError: isIOTypeError,
        refetch
    } = useQuery({
        queryKey: ['getIOTypes', { filePath, functionName, nonMappingFileContent }],
        queryFn: () => getIOTypes(),
        networkMode: 'always'

    });
    return { dmIOTypes, isFetchingIOTypes, isIOTypeError, refetch };
};

