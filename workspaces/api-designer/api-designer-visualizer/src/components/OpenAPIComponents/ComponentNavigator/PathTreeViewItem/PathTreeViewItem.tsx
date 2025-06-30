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
import { Button, Codicon, Tooltip, TreeViewItem, Typography } from '@wso2/ui-toolkit';
import { Operation, PathItemWrapper, RightPathContainerButtons } from '../ComponentNavigator';
import { OpenAPI } from '../../../../Definitions/ServiceDefinitions';
import { getBackgroundColorByMethod, getColorByMethod } from '../../../Utils/OpenAPIUtils';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../../APIDesignerContext';
import { PathID } from '../../../../constants';

interface PathTreeViewItemProps {
    id: string;
    openAPI: OpenAPI;
    path: string;
    operation: string;
    onPathTreeViewItemChange: (openAPI : OpenAPI) => void;
}

export function PathTreeViewItem(props: PathTreeViewItemProps) {
    const { id, openAPI, path, operation, onPathTreeViewItemChange } = props;
    const { rpcClient } = useVisualizerContext();
    const { 
        props: { selectedComponentID },
        api: { onSelectedComponentIDChange }
    } = useContext(APIDesignerContext);

    const handlePathTreeViewItemChange = (openAPI: OpenAPI) => {
        onPathTreeViewItemChange(openAPI);
    };

    const handleDeleteMethod = (e: React.MouseEvent, path: string, operation: string) => {
        e.stopPropagation();
        rpcClient.showConfirmMessage({ message: `Are you sure you want to delete the Operation '${operation}'?`, buttonText: "Delete" }).then(res => {
            if (res) {
                const { paths } = openAPI;
                const updatedPaths = { ...paths };
                delete updatedPaths[path][operation];
                handlePathTreeViewItemChange({ ...openAPI, paths: updatedPaths });
            }
        });
    };

    return (
        <div onClick={() => onSelectedComponentIDChange(`${PathID.PATHS_COMPONENTS}${PathID.SEPERATOR}${path}${PathID.SEPERATOR}${operation}`)}>
            <TreeViewItem id={id} selectedId={selectedComponentID}>
                <PathItemWrapper>
                    <Tooltip>
                        <Operation
                            foreGroundColor={getColorByMethod(operation.toUpperCase())}
                            hoverForeGroundColor={getBackgroundColorByMethod(operation.toUpperCase())}
                        >
                            <Typography variant="h5" sx={{ margin: 0, padding: 4, display: "flex", justifyContent: "flex-start", width: 45, fontWeight: 300 }}>{operation.toUpperCase()}</Typography>
                        </Operation>
                    </Tooltip>
                    <RightPathContainerButtons className="buttons-container">
                        <Button tooltip="Delete Method" appearance="icon" onClick={(e) => handleDeleteMethod(e, path, operation)}><Codicon name="trash" /></Button>
                    </RightPathContainerButtons>
                </PathItemWrapper>
            </TreeViewItem>
        </div>
    )
}
