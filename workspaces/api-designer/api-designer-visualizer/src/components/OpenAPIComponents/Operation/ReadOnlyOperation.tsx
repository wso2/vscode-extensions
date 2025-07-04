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
import { Typography } from '@wso2/ui-toolkit';
import styled from "@emotion/styled";
import { Operation as O } from '../../../Definitions/ServiceDefinitions';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { getColorByMethod } from '../../Utils/OpenAPIUtils';
import { MarkdownRenderer } from '../Info/ReadOnlyInfo';
import { ReadOnlyParameters } from '../Parameters/ReadOnlyParameters';
import { ReadOnlyRequestBody } from '../RequestBody/ReadOnlyRequestBody';
import { ReadOnlyResponses } from '../Responses/ReadOnlyResponses';

export const PanelBody = styled.div`
    height: calc(100% - 87px);
    overflow-y: auto;
    padding: 16px;
    gap: 15px;
    display: flex;
    flex-direction: column;
`;
export const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const SubSectionWrapper = styled.div`
    display: flex;
    flex-direction: column;
    padding-top: 5px;
    gap: 5px;
`;
interface MethodWrapperProps {
    color: string;
}
const MethodWrapper = styled.div<MethodWrapperProps>`
    display: flex;
    width: fit-content;
    border-radius: 2px;
    color: white;
    background-color: ${(props: MethodWrapperProps) => props.color};
`;
const PathWrapper = styled.div`
    display: flex;
    flex-direction: row;
    border-radius: 2px;
    gap: 10px;
    padding: 10px;
    width: fit-content;
    background-color: var(--vscode-quickInput-background);
`;

interface ReadOnlyOperationProps {
    operation: O;
    method: string;
    path: string;
}

export function ReadOnlyOperation(props: ReadOnlyOperationProps) {
    const { operation, method, path } = props;
    return (
        <PanelBody>
            <PathWrapper>
                <MethodWrapper color={getColorByMethod(method)}>
                    <Typography
                        variant="h3"
                        sx={{ margin: 0, padding: 4, display: "flex", justifyContent: "center", minWidth: 60 }}
                    >
                        {method.toUpperCase()}
                    </Typography>
                </MethodWrapper>
                <Typography sx={{ margin: 0, marginTop: 4 }} variant="h3">{path}</Typography>
            </PathWrapper>
            { operation.summary && (
                <>
                    <Typography sx={{ margin: 0 }} variant='h3'> Summary </Typography>
                    <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body3'> {operation.summary} </Typography>
                </>
            )}
            { operation.description && (
                <>
                    <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body3'>
                        <MarkdownRenderer key="description" markdownContent={operation.description} />
                    </Typography>
                </>
            )}
            { operation.operationId && (
                <>
                    <Typography sx={{ margin: 0 }} variant='h3'> Operation ID </Typography>
                    <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body3'> {operation.operationId} </Typography>
                </>
            )}
            { operation.parameters && (
                <ReadOnlyParameters
                    parameters={operation.parameters}
                    title="Path Parameters"
                    type="path"
                />
            )}
            { operation.parameters && (
                <ReadOnlyParameters
                    parameters={operation.parameters}
                    title="Query Parameters"
                    type="query"
                />
            )}
            { operation.parameters && (
                <ReadOnlyParameters
                    parameters={operation.parameters}
                    title="Header Parameters"
                    type="header"
                />
            )}
            { operation.requestBody && method !== "get" && (
                <ReadOnlyRequestBody
                    requestBody={operation.requestBody}
                />
            )}
            { operation.responses && (
                <ReadOnlyResponses
                    responses={operation.responses}
                />
            )}
        </PanelBody>
    )
}
