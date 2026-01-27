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
import { Button, Codicon, Typography, TreeViewItem } from '@wso2/ui-toolkit';
import { RightPathContainerButtons } from '../ComponentNavigator';
import styled from '@emotion/styled';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../../APIDesignerContext';
import { PathID } from '../../../../constants';

const ParameterItemWrapper = styled.div`
    display: flex;
    flex-direction: row;
    gap: 6px;
    width: 100%;
    padding: 2px 0;
    cursor: pointer;
    margin-left: 5px;
    margin-top: 5px;
    position: relative;
    &:hover div.buttons-container {
        opacity: 1;
    }
`;

const ParamTypeWrapper = styled.div`
    margin-left: 5px;
    color: var(--vscode-list-deemphasizedForeground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0 0 0 2px;
`;

interface PathTreeViewItemProps {
    id: string;
    parameterName: string;
    parameterType: string;
    onDeleteParameter: (schema: string) => void;
}

export function ParameterTreeViewItem(props: PathTreeViewItemProps) {
    const { id, parameterName, parameterType, onDeleteParameter } = props;
    const { 
        props: { selectedComponentID },
        api: { onSelectedComponentIDChange }
    } = useContext(APIDesignerContext);

    const handleDeleteParameter = (e: React.MouseEvent, schema: string) => {
        e.stopPropagation();
        onDeleteParameter(schema);
    };

    return (
        <div onClick={() => onSelectedComponentIDChange(`${PathID.PARAMETERS_COMPONENTS}${PathID.SEPERATOR}${parameterName}`)}>
            <TreeViewItem id={id} selectedId={selectedComponentID}>
                <ParameterItemWrapper>
                    <Typography
                        sx={{
                            display: "flex",
                            flexDirection: "row",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            margin: "0 0 0 2px",
                            fontWeight: 300
                        }}
                        variant="h4"
                    >
                        {parameterName}
                        <ParamTypeWrapper>{`[${parameterType}]`}</ParamTypeWrapper>
                    </Typography>
                    <RightPathContainerButtons className="buttons-container">
                        <Button tooltip="Delete Parameter" appearance="icon" onClick={(e) => handleDeleteParameter(e, parameterName)}><Codicon name="trash" /></Button>
                    </RightPathContainerButtons>
                </ParameterItemWrapper>
            </TreeViewItem>
        </div>
    )
}
