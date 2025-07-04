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
import { PathItem as P } from '../../../Definitions/ServiceDefinitions';
import { getColorByMethod } from '../../Utils/OpenAPIUtils';
import { MarkdownRenderer } from '../Info/ReadOnlyInfo';
import { ReadOnlyParameters } from '../Parameters/ReadOnlyParameters';

const PanelBody = styled.div`
    height: calc(100% - 87px);
    overflow-y: auto;
    padding: 16px;
    gap: 15px;
    display: flex;
    flex-direction: column;
`;

const PathWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 10px;
`;
interface MethodWrapperProps {
    color: string;
}
const MethodWrapper = styled.div<MethodWrapperProps>`
    display: flex;
    width: fit-content;
    color: white;
    border-radius: 2px;
    background-color: ${(props: MethodWrapperProps) => props.color};
`;

interface PathItemProps {
    pathItem: P;
    path: string;
}

const httpMethods = ["get", "post", "put", "delete", "options", "head", "patch", "trace"];

const getAllOperationsFromPathItem = (pathItem: P) => {
    return Object.keys(pathItem).filter(key => httpMethods.includes(key));
}

export function ReadOnlyPathItem(props: PathItemProps) {
    const { pathItem, path } = props;
    
    const operations = getAllOperationsFromPathItem(pathItem);
    const filteredOperations = operations.filter((operation) => operation !== "summary" &&
        operation !== "description" && operation !== "parameters" && operation !== "servers" && 
            operation !== "tags" && operation !== "externalDocs");

    return (
        <PanelBody>
            <Typography sx={{ margin: 0, marginTop: 0, flex: 1 }} variant="h2">{path}</Typography>
            {pathItem.summary && (
                <>
                    <Typography sx={{ margin: 0 }} variant='h3'> Summary </Typography>
                    <Typography sx={{ margin: 0, fontWeight: "lighter" }} variant='body3'> {pathItem.summary} </Typography>
                </>
            )}
            {pathItem.description && (
                <>
                    <Typography sx={{ margin: 0 }} variant='h3'> Description </Typography>
                    <Typography 
                        sx={{ 
                            margin: 0, 
                            fontWeight: "lighter"
                        }} 
                        variant='body3'
                    >
                        <MarkdownRenderer key="description" markdownContent={pathItem.description} />
                    </Typography>
                </>
            )}
            <Typography sx={{ margin: 0 }} variant='h3'> Operations </Typography>
                <PathWrapper>
                    {filteredOperations?.length > 0 && filteredOperations.map((operation) => (
                        <MethodWrapper key={operation} color={getColorByMethod(operation)}>
                            <Typography
                                variant="h3"
                                sx={{ margin: 0, padding: 4, display: "flex", justifyContent: "center", minWidth: 60 }}
                            >
                                {operation.toUpperCase()}
                            </Typography>
                        </MethodWrapper>
                    ))}
                </PathWrapper>
            {pathItem.parameters?.length > 0 && (
                <>
                    <Typography sx={{ margin: 0 }} variant='h3'> Parameters </Typography>
                    <ReadOnlyParameters parameters={pathItem.parameters} type="path" title='Path Parameters' />
                    <ReadOnlyParameters parameters={pathItem.parameters} type="query" title='Query Parameters' />
                    <ReadOnlyParameters parameters={pathItem.parameters} type="header" title='Header Parameters' />
                </>
            )}
        </PanelBody>
    )
}
