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
import { ParameterTreeViewItem } from '../ParameterTreeViewItem/ParameterTreeViewItem';
import { PathID, Views } from '../../../../constants';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';

interface ParameterViewItemProps {
    openAPI: OpenAPI;
    onParameterTreeViewChange: (openAPI: OpenAPI) => void;
}

export function ParameterTreeView(props: ParameterViewItemProps) {
    const { openAPI, onParameterTreeViewChange } = props;
    const { rpcClient } = useVisualizerContext();
    const { 
        props: { selectedComponentID },
        api: { onSelectedComponentIDChange, onCurrentViewChange }
    } = useContext(APIDesignerContext);

    const handleDeleteParameter = (parameter: string) => {
        rpcClient.showConfirmMessage({ message: `Are you sure you want to delete the Parameter '${parameter}'?`, buttonText: "Delete" }).then(res => {
            if (res) {
                const clonedParameters = { ...openAPI.components?.parameters };
                delete clonedParameters[parameter];
                const updatedOpenAPIDefinition: OpenAPI = {
                    ...openAPI,
                    components: {
                        ...openAPI.components,
                        parameters: clonedParameters
                    }
                };
                onParameterTreeViewChange(updatedOpenAPIDefinition);
                onSelectedComponentIDChange(PathID.OVERVIEW);
            }
        });
    };

    const handleAddParameter = (evt : React.MouseEvent) => {
        evt.stopPropagation();
        if (openAPI.components === undefined) {
            openAPI.components = {};
        }
        if (openAPI.components.parameters === undefined) {
            openAPI.components.parameters = {};
        }
        const newParameterName = Object.keys(openAPI.components.parameters).find((key) =>
            key.toLocaleLowerCase() === "parameter") ? `Parameter${Object.keys(openAPI.components.parameters).length + 1}` :
            "Parameter";
        openAPI.components.parameters[newParameterName] = {
            in: "query",
            name: `param${Object.keys(openAPI.components.parameters).length + 1}`,
            required: false,
            schema: {
                type: "string"
            }
        };
        onParameterTreeViewChange(openAPI);
        onSelectedComponentIDChange(`${PathID.PARAMETERS_COMPONENTS}${PathID.SEPERATOR}${newParameterName}`);
        onCurrentViewChange(Views.EDIT);
    };

    const parameterArray = openAPI?.components?.parameters ? Object.keys(openAPI?.components?.parameters) : [];

    return (
        <TreeView
            sx={{ paddingBottom: 2 }}
            id={PathID.PARAMETERS_COMPONENTS}
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
                            variant="h4">Parameters
                        </Typography>
                    </LeftPathContainer>
                    <RightPathContainerButtons className="buttons-container">
                        <Button tooltip="Add Parameter" appearance="icon" onClick={handleAddParameter}><Codicon name="plus" /></Button>
                    </RightPathContainerButtons>
                </PathContainer>
            }
            selectedId={selectedComponentID}
            onSelect={onSelectedComponentIDChange}
        >
            {parameterArray.map((parameterName: string) => {
                return (
                    <ParameterTreeViewItem
                        id={`${PathID.PARAMETERS_COMPONENTS}${PathID.SEPERATOR}${parameterName}`}
                        parameterName={parameterName}
                        parameterType={openAPI.components?.parameters[parameterName].in}
                        onDeleteParameter={handleDeleteParameter}
                    />
                );
            })}
        </TreeView>
    )
}
