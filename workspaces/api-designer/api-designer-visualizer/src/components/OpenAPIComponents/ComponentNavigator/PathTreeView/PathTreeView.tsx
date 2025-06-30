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
import { PathTreeViewItem } from '../PathTreeViewItem/PathTreeViewItem';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../../APIDesignerContext';
import { PathID } from '../../../../constants';

interface PathTreeViewProps {
    id: string;
    openAPI: OpenAPI;
    path: string;
    operations: string[];
    onPathTreeViewChange: (openAPI: OpenAPI) => void;
}

export function PathTreeView(props: PathTreeViewProps) {
    const { id, openAPI, path, operations, onPathTreeViewChange } = props;
    const { rpcClient } = useVisualizerContext();
    const { 
        props: { selectedComponentID },
        api: { onSelectedComponentIDChange }
    } = useContext(APIDesignerContext);

    const handlePathTreeViewChange = (openAPI: OpenAPI) => {
        onPathTreeViewChange(openAPI);
    };
    const handleDeletePath = (e: React.MouseEvent, path: string) => {
        e.stopPropagation();
        rpcClient.showConfirmMessage({ message: `Are you sure you want to delete the Path '${path}'?`, buttonText: "Delete" }).then(res => {
            if (res) {
                const { paths } = openAPI;
                const updatedPaths = { ...paths };
                delete updatedPaths[path];
                handlePathTreeViewChange({ ...openAPI, paths: updatedPaths });
                if (Object.keys(updatedPaths).length > 0) {
                    onSelectedComponentIDChange(`${PathID.PARAMETERS_COMPONENTS}${PathID.SEPERATOR}${Object.keys(updatedPaths)[0]}`);
                } else {
                    onSelectedComponentIDChange(PathID.OVERVIEW);
                }
            }
        });
    };

    return (
        <TreeView
            id={id}
            content={
                <PathContainer>
                    <LeftPathContainer>
                        <Typography
                            sx={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                margin: "0 0 0 2px",
                                fontWeight: 300
                            }} variant="h4">
                            {path}
                        </Typography>
                    </LeftPathContainer>

                    <RightPathContainerButtons className="buttons-container">
                        <Button tooltip="Delete Path" appearance="icon" onClick={(e) => handleDeletePath(e, String(path))}><Codicon name="trash" /></Button>
                    </RightPathContainerButtons>
                </PathContainer>
            }
            selectedId={selectedComponentID}
            onSelect={(id) => onSelectedComponentIDChange(id)}
        >
            {operations?.map((operation) => {
                return (
                    <PathTreeViewItem
                        id={`${PathID.PATHS_COMPONENTS}${PathID.SEPERATOR}${path}${PathID.SEPERATOR}${operation}`}
                        openAPI={openAPI}
                        path={path}
                        operation={operation}
                        onPathTreeViewItemChange={handlePathTreeViewChange}
                    />
                );
            })}
        </TreeView>
    )
}
