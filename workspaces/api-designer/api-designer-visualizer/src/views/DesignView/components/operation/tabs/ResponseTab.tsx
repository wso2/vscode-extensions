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
import styled from '@emotion/styled';
import { Operation as O, OpenAPI } from '../../../../../definitions/ServiceDefinitions';
import { ResponseList } from '../../response/ResponseList';

const ResponseSection = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    min-height: 0;
`;

export interface ResponseTabProps {
    operation: O;
    openAPI: OpenAPI;
    path: string;
    method: string;
    summary: string;
    description: string;
    onOperationChange: (operation: O | ((prev: O) => O)) => void;
}

export const ResponseTab: React.FC<ResponseTabProps> = ({
    operation,
    openAPI,
    path,
    method,
    summary,
    description,
    onOperationChange
}) => {
    return (
        <ResponseSection>
            <ResponseList
                responses={operation?.responses || {}}
                onResponsesChange={(responses) => {
                    onOperationChange((prev) => ({ ...prev, responses }));
                }}
                openAPI={openAPI}
                operationPath={path}
                operationMethod={method}
                operationSummary={summary}
                operationDescription={description}
                requestBody={operation?.requestBody}
            />
        </ResponseSection>
    );
};

