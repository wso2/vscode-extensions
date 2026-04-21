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

import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Tabs } from '@wso2/ui-toolkit';
import { Operation as O, OpenAPI } from '../../../../../Definitions/ServiceDefinitions';
import { ParameterList } from '../../parameter/ParameterList';
import { RequestBody } from '../../request-body/RequestBody';

const RequestSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;
    overflow: hidden;
`;

const RequestTabsContainer = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    min-height: 0;
`;

const RequestTabContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
`;

export interface RequestTabProps {
    method: string;
    path: string;
    operation: O;
    openAPI: OpenAPI;
    onOperationChange: (operation: O | ((prev: O) => O)) => void;
    mergeParametersByType: (allParameters: any[], newParameters: any[], type: string) => any[];
}

export const RequestTab: React.FC<RequestTabProps> = ({
    method,
    path,
    operation,
    openAPI,
    onOperationChange,
    mergeParametersByType
}) => {
    const [requestTab, setRequestTab] = useState<'params' | 'headers' | 'body'>('params');

    return (
        <RequestSection>
            <RequestTabsContainer>
                <Tabs
                    views={[
                        { id: 'params', name: 'Params' },
                        { id: 'headers', name: 'Headers' },
                        ...(method !== 'get' && method !== 'head' ? [{ id: 'body', name: 'Request Body' }] : [])
                    ]}
                    currentViewId={requestTab}
                    onViewChange={(view) => setRequestTab(view as 'params' | 'headers' | 'body')}
                    sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}
                    childrenSx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}
                >
                    <RequestTabContent id="params">
                        <ParameterList
                            parameters={operation?.parameters || []}
                            paramTypes={['string', 'number', 'integer', 'boolean', 'array', 'object']}
                            title="Path Parameters"
                            type="path"
                            openAPI={openAPI}
                            operationPath={path}
                            operationMethod={method}
                            onParametersChange={(parameters) => {
                                onOperationChange((prev) => {
                                    const updatedParams = mergeParametersByType(prev?.parameters || [], parameters, 'path');
                                    return { ...prev, parameters: updatedParams.length > 0 ? updatedParams : undefined };
                                });
                            }}
                        />
                        <ParameterList
                            parameters={operation?.parameters || []}
                            paramTypes={['string', 'number', 'integer', 'boolean', 'array', 'object']}
                            title="Query Parameters"
                            type="query"
                            openAPI={openAPI}
                            operationPath={path}
                            operationMethod={method}
                            onParametersChange={(parameters) => {
                                onOperationChange((prev) => {
                                    const updatedParams = mergeParametersByType(prev?.parameters || [], parameters, 'query');
                                    return { ...prev, parameters: updatedParams.length > 0 ? updatedParams : undefined };
                                });
                            }}
                        />
                    </RequestTabContent>
                    <RequestTabContent id="headers">
                        <ParameterList
                            parameters={operation?.parameters || []}
                            paramTypes={['string', 'number', 'integer', 'boolean', 'array', 'object']}
                            title="Header Parameters"
                            type="header"
                            openAPI={openAPI}
                            operationPath={path}
                            operationMethod={method}
                            onParametersChange={(parameters) => {
                                onOperationChange((prev) => {
                                    const updatedParams = mergeParametersByType(prev?.parameters || [], parameters, 'header');
                                    return { ...prev, parameters: updatedParams.length > 0 ? updatedParams : undefined };
                                });
                            }}
                        />
                    </RequestTabContent>
                    {method !== 'get' && method !== 'head' && (
                        <RequestTabContent id="body">
                            <RequestBody
                                requestBody={operation?.requestBody || { content: { 'application/json': { schema: { type: 'object' } } } }}
                                onRequestBodyChange={(requestBody) => {
                                    onOperationChange((prev) => ({ ...prev, requestBody }));
                                }}
                                openAPI={openAPI}
                                operationPath={path}
                                operationMethod={method}
                            />
                        </RequestTabContent>
                    )}
                </Tabs>
            </RequestTabsContainer>
        </RequestSection>
    );
};

