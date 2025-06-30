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
import { Button, Codicon, TreeView, Typography } from '@wso2/ui-toolkit';
import { LeftPathContainer, PathContainer, RightPathContainerButtons } from '../ComponentNavigator';
import { OpenAPI } from '../../../../Definitions/ServiceDefinitions';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../../APIDesignerContext';
import { PathID, Views } from '../../../../constants';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { RequestBodyTreeViewItem } from '../RequestBodyTreeViewItem/RequestBodyTreeViewItem';

interface RequestBodyTreeViewProps {
    openAPI: OpenAPI;
    onRequestBodyTreeViewChange: (openAPI: OpenAPI) => void;
}

export function RequestBodyTreeView(props: RequestBodyTreeViewProps) {
    const { openAPI, onRequestBodyTreeViewChange } = props;
    const { rpcClient } = useVisualizerContext();
    const { 
        props: { selectedComponentID },
        api: { onSelectedComponentIDChange, onCurrentViewChange }
    } = useContext(APIDesignerContext);

    const handleDeleteRequestBody = (requestBody: string) => {
        rpcClient.showConfirmMessage({ message: `Are you sure you want to delete the Request Body '${requestBody}'?`, buttonText: "Delete" }).then(res => {
            if (res) {
                const clonedRequestBodies = { ...openAPI.components?.requestBodies };
                delete clonedRequestBodies[requestBody];
                const updatedOpenAPIDefinition: OpenAPI = {
                    ...openAPI,
                    components: {
                        ...openAPI.components,
                        requestBodies: clonedRequestBodies
                    }
                };
                onRequestBodyTreeViewChange(updatedOpenAPIDefinition);
                onSelectedComponentIDChange(PathID.OVERVIEW);
            }
        });
    };

    const handleAddRequestBody = (evt : React.MouseEvent) => {
        evt.stopPropagation();
        if (openAPI.components === undefined) {
            openAPI.components = {};
        }
        if (openAPI.components.parameters === undefined) {
            openAPI.components.parameters = {};
        }
        const newRequestBodyName = Object.keys(openAPI.components.requestBodies).find((key) =>
            key.toLowerCase().includes("requestbody")) ? `RequestBody${Object.keys(openAPI.components.requestBodies).length + 1}` :
            "RequestBody";
        openAPI.components.requestBodies = {
            ...openAPI.components.requestBodies,
            [newRequestBodyName]: {
                description: "",
                content: {
                    "application/json": {
                        schema: {
                            type: "object"
                        }
                    }
                }
            }
        };
        onRequestBodyTreeViewChange(openAPI);
        onSelectedComponentIDChange(`${PathID.REQUEST_BODY_COMPONENTS}${PathID.SEPERATOR}${newRequestBodyName}`);
        onCurrentViewChange(Views.EDIT);
    };

    const requestBodyArray = openAPI?.components?.requestBodies ? Object.keys(openAPI?.components?.requestBodies) : [];

    return (
        <TreeView
            sx={{ paddingBottom: 2 }}
            id={`${PathID.REQUEST_BODY_COMPONENTS}`}
            content={
                <PathContainer>
                    <LeftPathContainer>
                        <Typography 
                            sx={{ 
                                margin: "0 0 0 2px",
                                fontWeight: 300,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                            }}
                            variant="h4"
                        >
                            Request Bodies
                        </Typography>
                    </LeftPathContainer>
                    <RightPathContainerButtons className="buttons-container">
                        <Button tooltip="Add Request Body" appearance="icon" onClick={handleAddRequestBody}><Codicon name="plus" /></Button>
                    </RightPathContainerButtons>
                </PathContainer>
            }
            selectedId={selectedComponentID}
            onSelect={onSelectedComponentIDChange}
        >
            {requestBodyArray.map((requestBody: string) => {
                return (
                    <RequestBodyTreeViewItem
                        id={`${PathID.REQUEST_BODY_COMPONENTS}${PathID.SEPERATOR}${requestBody}`}
                        requestBody={requestBody}
                        onDeleteRequestBody={handleDeleteRequestBody}
                    />
                );
            })}
        </TreeView>
    )
}
