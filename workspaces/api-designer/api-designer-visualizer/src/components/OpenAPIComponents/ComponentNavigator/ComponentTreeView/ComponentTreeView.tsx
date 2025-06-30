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
import { TreeView, Typography } from '@wso2/ui-toolkit';
import { LeftPathContainer, PathContainer } from '../ComponentNavigator';
import { OpenAPI } from '../../../../Definitions/ServiceDefinitions';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../../APIDesignerContext';
import { SchemaTreeView } from '../SchemaTreeView/SchemaTreeView';
import { ParameterTreeView } from '../ParameterTreeView/ParameterTreeView';
import { RequestBodyTreeView } from '../RequestBodyTreeView/RequestBodyTreeView';
import { ResponsesTreeView } from '../ResponsesTreeView/ResponsesTreeView';
import { PathID } from '../../../../constants';

interface PathTreeViewItemProps {
    openAPI: OpenAPI;
    onSchemaTreeViewChange: (openAPI: OpenAPI) => void;
}

export function ComponentTreeView(props: PathTreeViewItemProps) {
    const { openAPI, onSchemaTreeViewChange } = props;
    const { 
        props: { selectedComponentID },
        api: { onSelectedComponentIDChange }
    } = useContext(APIDesignerContext);
    return (
        <TreeView
            sx={{ paddingBottom: 2 }}
            rootTreeView
            id={PathID.COMPONENTS_COMPONENTS}
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
                            Components
                        </Typography>
                    </LeftPathContainer>
                </PathContainer>
            }
            selectedId={selectedComponentID}
            onSelect={onSelectedComponentIDChange}
        >
            <SchemaTreeView
                openAPI={openAPI}
                onSchemaTreeViewChange={onSchemaTreeViewChange}
            />
            <ParameterTreeView
                openAPI={openAPI}
                onParameterTreeViewChange={onSchemaTreeViewChange}
            />
            <RequestBodyTreeView
                openAPI={openAPI}
                onRequestBodyTreeViewChange={onSchemaTreeViewChange}
            />
            <ResponsesTreeView
                openAPI={openAPI}
                onResponseTreeViewChange={onSchemaTreeViewChange}
            />
        </TreeView>
    )
}
