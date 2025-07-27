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
import { useQuery } from '@tanstack/react-query';
import { useRpcContext } from '@wso2/ballerina-rpc-client';
import { IDMViewState } from '@wso2/ballerina-core';

export const useInlineDataMapperModel = (
    filePath: string,
    viewState: IDMViewState
) => {
    const { rpcClient } = useRpcContext();
    const viewId = viewState?.viewId;
    const codedata = viewState?.codedata;

    const getIDMModel = async () => {
        try {
            const modelParams = {
                filePath,
                codedata,
                targetField: viewId,
                position: {
                    line: codedata.lineRange.startLine.line,
                    offset: codedata.lineRange.startLine.offset
                }
            };
            const res = await rpcClient
                .getInlineDataMapperRpcClient()
                .getDataMapperModel(modelParams);

            console.log('>>> [Inline Data Mapper] Model:', res);
            return res.mappingsModel;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const {
        data: model,
        isFetching,
        isError,
        refetch
    } = useQuery({
        queryKey: ['getIDMModel', { filePath, codedata, viewId }],
        queryFn: () => getIDMModel(),
        networkMode: 'always'
    });

    return {model, isFetching, isError, refetch};
};
