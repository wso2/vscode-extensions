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
import { ResponseViewItem } from '../ResponsesViewItem/ResponsesViewItem';

interface ResponsesTreeViewProps {
    openAPI: OpenAPI;
    onResponseTreeViewChange: (openAPI: OpenAPI) => void;
}

export function ResponsesTreeView(props: ResponsesTreeViewProps) {
    const { openAPI, onResponseTreeViewChange } = props;
    const { rpcClient } = useVisualizerContext();
    const { 
        props: { selectedComponentID },
        api: { onSelectedComponentIDChange, onCurrentViewChange }
    } = useContext(APIDesignerContext);

    const handleDeleteResponse = (response: string) => {
        rpcClient.showConfirmMessage({ message: `Are you sure you want to delete the Response '${response}'?`, buttonText: "Delete" }).then(res => {
            if (res) {
                const clonedResponses = { ...openAPI.components?.responses };
                delete clonedResponses[response];
                const updatedOpenAPIDefinition: OpenAPI = {
                    ...openAPI,
                    components: {
                        ...openAPI.components,
                        responses: clonedResponses
                    }
                };
                onResponseTreeViewChange(updatedOpenAPIDefinition);
                onSelectedComponentIDChange("Overview");
            }
        });
    };

    const handleAddResponse = (evt : React.MouseEvent) => {
        evt.stopPropagation();
        if (openAPI.components === undefined) {
            openAPI.components = {};
        }
        if (openAPI.components.parameters === undefined) {
            openAPI.components.parameters = {};
        }
        const newResponseName = Object.keys(openAPI.components.responses).find((key) =>
            key.toLowerCase().includes("response")) ? `Response${Object.keys(openAPI.components.responses).length + 1}` :
            "Response";
        openAPI.components.responses = {
            ...openAPI.components.responses,
            [newResponseName]: {
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
        onResponseTreeViewChange(openAPI);
        onSelectedComponentIDChange(`${PathID.RESPONSE_COMPONENTS}${PathID.SEPERATOR}${newResponseName}`);
        onCurrentViewChange(Views.EDIT);
    };

    const responseArray = openAPI?.components?.responses ? Object.keys(openAPI?.components?.responses) : [];

    return (
        <TreeView
            sx={{ paddingBottom: 2 }}
            id={`${PathID.RESPONSE_COMPONENTS}`}
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
                            Responses
                        </Typography>
                    </LeftPathContainer>
                    <RightPathContainerButtons className="buttons-container">
                        <Button tooltip="Add Response" appearance="icon" onClick={handleAddResponse}><Codicon name="plus" /></Button>
                    </RightPathContainerButtons>
                </PathContainer>
            }
            selectedId={selectedComponentID}
            onSelect={onSelectedComponentIDChange}
        >
            {responseArray.map((requestBody: string) => {
                return (
                    <ResponseViewItem
                        id={`${PathID.RESPONSE_COMPONENTS}${PathID.SEPERATOR}${requestBody}`}
                        response={requestBody}
                        onDeleteResponse={handleDeleteResponse}
                    />
                );
            })}
        </TreeView>
    )
}
