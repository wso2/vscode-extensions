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
import { SchemaTreeViewItem } from '../SchemaTreeViewItem/SchemaTreeViewItem';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../../APIDesignerContext';
import { PathID, Views } from '../../../../constants';

interface PathTreeViewItemProps {
    openAPI: OpenAPI;
    onSchemaTreeViewChange: (openAPI: OpenAPI) => void;
}

export function SchemaTreeView(props: PathTreeViewItemProps) {
    const { openAPI, onSchemaTreeViewChange } = props;
    const { rpcClient } = useVisualizerContext();
    const { 
        props: { selectedComponentID },
        api: { onSelectedComponentIDChange, onCurrentViewChange }
    } = useContext(APIDesignerContext);

    const handleDeleteSchema = (schema: string) => {
        rpcClient.showConfirmMessage({ message: `Are you sure you want to delete the Schema '${schema}'?`, buttonText: "Delete" }).then(res => {
            if (res) {
                const clonedSchemas = { ...openAPI.components?.schemas };
                delete clonedSchemas[schema];
                const updatedOpenAPIDefinition: OpenAPI = {
                    ...openAPI,
                    components: {
                        ...openAPI.components,
                        schemas: clonedSchemas
                    }
                };
                onSchemaTreeViewChange(updatedOpenAPIDefinition);
                onSelectedComponentIDChange(PathID.OVERVIEW);
            }
        });
    };

    const handleAddSchema = (evt : React.MouseEvent) => {
        evt.stopPropagation();
        if (openAPI.components === undefined) {
            openAPI.components = {};
        }
        if (openAPI.components.schemas === undefined) {
            openAPI.components.schemas = {};
        }
        const newSchemaName = Object.keys(openAPI.components.schemas).find((key) =>
            key.toLocaleLowerCase() === "schema") ? `Schema${Object.keys(openAPI.components.schemas).length + 1}` :
            "Schema";
        openAPI.components.schemas[newSchemaName] = {
            type: "object",
            properties: {}
        };
        onSchemaTreeViewChange(openAPI);
        onSelectedComponentIDChange(`${PathID.SCHEMA_COMPONENTS}${PathID.SEPERATOR}${newSchemaName}`);
        onCurrentViewChange(Views.EDIT);
    };

    const schemaArray = openAPI?.components?.schemas ? Object.keys(openAPI?.components?.schemas) : [];

    return (
        <TreeView
            sx={{ paddingBottom: 2 }}
            id={PathID.SCHEMA_COMPONENTS}
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
                            Schemas
                        </Typography>
                    </LeftPathContainer>
                    <RightPathContainerButtons className="buttons-container">
                        <Button tooltip="Add Schema" appearance="icon" onClick={handleAddSchema}><Codicon name="plus" /></Button>
                    </RightPathContainerButtons>
                </PathContainer>
            }
            selectedId={selectedComponentID}
            onSelect={onSelectedComponentIDChange}
        >
            {schemaArray.map((schema: string) => {
                return (
                    <SchemaTreeViewItem
                        id={`${PathID.SCHEMA_COMPONENTS}${PathID.SEPERATOR}${schema}`}
                        schema={schema}
                        onDeleteSchema={handleDeleteSchema}
                    />
                );
            })}
        </TreeView>
    )
}
