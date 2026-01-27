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
import { Button, Codicon, TreeViewItem, Typography } from '@wso2/ui-toolkit';
import { RightPathContainerButtons } from '../ComponentNavigator';
import styled from '@emotion/styled';
import { useContext } from 'react';
import { APIDesignerContext } from '../../../../APIDesignerContext';
import { PathID } from '../../../../constants';

const ResponseViewItemWrapper = styled.div`
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

interface ResponseViewItemProps {
    id: string;
    response: string;
    onDeleteResponse: (schema: string) => void;
}

export function ResponseViewItem(props: ResponseViewItemProps) {
    const { id, response: response, onDeleteResponse } = props;
    const { 
        props: { selectedComponentID },
        api: { onSelectedComponentIDChange }
    } = useContext(APIDesignerContext);

    const handleDeleteResponse = (e: React.MouseEvent, response: string) => {
        e.stopPropagation();
        onDeleteResponse(response);
    };

    return (
        <div onClick={() => onSelectedComponentIDChange(`${PathID.RESPONSE_COMPONENTS}${PathID.SEPERATOR}${response}`)}>
            <TreeViewItem id={id} selectedId={selectedComponentID}>
                <ResponseViewItemWrapper>
                    <Typography
                        sx={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            margin: "0 0 0 2px",
                            fontWeight: 300
                        }}
                        variant="h4">
                        {response}
                    </Typography>
                    <RightPathContainerButtons className="buttons-container">
                        <Button tooltip="Delete Response" appearance="icon" onClick={(e) => handleDeleteResponse(e, response)}><Codicon name="trash" /></Button>
                    </RightPathContainerButtons>
                </ResponseViewItemWrapper>
            </TreeViewItem>
        </div>
    )
}
