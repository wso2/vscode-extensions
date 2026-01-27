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
import { OpenAPI, PathItem, Paths } from '../../../../Definitions/ServiceDefinitions';
import { PathTreeView } from '../PathTreeView/PathTreeView';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../../APIDesignerContext';
import { PathID, Views } from '../../../../constants';

interface PathsTreeViewProps {
    openAPI: OpenAPI;
    paths: Paths;
    onPathTreeViewChange: (openAPI: OpenAPI) => void;
}

export function PathsTreeView(props: PathsTreeViewProps) {
    const { openAPI, paths, onPathTreeViewChange } = props;
    const { 
        props: { selectedComponentID },
        api: { onSelectedComponentIDChange, onPathInitiatedChange, onCurrentViewChange }
    } = useContext(APIDesignerContext);

    const handleAddPathMethod = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        const newPathVal = openAPI.paths && Object.keys(openAPI.paths).find((key) => key === "/path") ? `/path${Object.keys(openAPI.paths).length + 1}` : "/path";
        const method: PathItem = {
            get: {
                parameters: [],
                responses: {
                    200: {
                        description: "Successful response",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "string",
                                }
                            }
                        }
                    }
                }
            }
        };
        if (!openAPI.paths) {
            openAPI.paths = {};
        }
        openAPI.paths[newPathVal] = method;
        onPathTreeViewChange(openAPI);
        onPathInitiatedChange(true);
        onCurrentViewChange(Views.EDIT);
        onSelectedComponentIDChange(`${PathID.PATHS_COMPONENTS}${PathID.SEPERATOR}${newPathVal}`);
    };

    let pathsArray: string[] = [];
    let pathItems: any[] = [];
    if (paths) {
        Object.entries(paths).forEach(([key, value]) => {
            if (typeof value === "object" && value !== null && key !== "servers" && key !== "parameters" && key !== "description" && key !== "summary") {
                pathsArray.push(key);
                pathItems.push(value);
            }
        });
    } else {
        console.warn("Paths object is null or undefined");
    }

    return (
        <TreeView
            rootTreeView
            id={PathID.PATHS_RESOURCES}
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
                            Paths
                        </Typography>
                    </LeftPathContainer>
                    <RightPathContainerButtons className="buttons-container">
                        <Button tooltip="Add Path" appearance="icon" onClick={handleAddPathMethod}><Codicon name="plus" /></Button>
                    </RightPathContainerButtons>
                </PathContainer>
            }
            selectedId={selectedComponentID}
            onSelect={() => onSelectedComponentIDChange(PathID.PATHS_RESOURCES)}
        >
            {
                pathsArray.map((path, index) => {
                    const pathItem = pathItems[index];
                    const operations = pathItem && Object.keys(pathItem);
                    const sanitizedOperations = operations?.filter((operation) => operation !== "description" && operation !== "summary" && operation !== "parameters" && operation !== "servers");
                    return (
                        <PathTreeView
                            id={`${PathID.PATHS_COMPONENTS}${PathID.SEPERATOR}${path}`}
                            openAPI={openAPI}
                            path={path}
                            operations={sanitizedOperations}
                            onPathTreeViewChange={onPathTreeViewChange}
                        />
                    );
                }
                )
            }
        </TreeView>
    )
}
