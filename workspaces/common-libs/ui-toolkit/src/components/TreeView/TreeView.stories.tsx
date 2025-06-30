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

import React from 'react';
import styled from '@emotion/styled';
import Typography from '../Typography/Typography';
import { Meta, StoryObj } from '@storybook/react-vite';
import { TreeView } from './TreeView';
import { TreeViewItem } from './TreeViewItem';

const meta: Meta<typeof TreeView> = {
    component: TreeView,
    title: 'TreeView',
};
export default meta;

type Story = StoryObj<typeof TreeView>;

interface OperationProps {
    backgroundColor: string;
    selected: boolean;
}

const Operation = styled.div<OperationProps>`
    background-color: ${(props: OperationProps) => props.backgroundColor};
    border: ${(props: OperationProps) => props.selected ? "2px solid var(--vscode-inputOption-activeForeground)" : "2px solid transparent"};
    border-radius: 4px;
    margin-bottom: 2px;
    width: fit-content;
    color: white;
    cursor: pointer;
`;

export const TreeViewStory: Story = {
    render: () => {
        const [selectedId, setSelectedId] = React.useState<string | null>(null);
        const handleClick = (id: string) => {
            setSelectedId(id);
        };
        return (
            <TreeView rootTreeView id="1" content={<Typography sx={{margin: 0}} variant="h4">Item 1</Typography>} selectedId={selectedId} onSelect={handleClick}>
                <TreeViewItem id="1-1">
                    <Operation backgroundColor="#3d7eff" selected={selectedId === "1-1"}>
                        <Typography variant="h5" sx={{ margin: 0, padding: 6 }}>GET</Typography>
                    </Operation>
                </TreeViewItem>
                <TreeViewItem id="1-2">
                    <Operation backgroundColor="#49cc90" selected={selectedId === "1-1"}>
                        <Typography variant="h5" sx={{ margin: 0, padding: 6 }}>POST</Typography>
                    </Operation>
                </TreeViewItem>
                <TreeView id="1-3" content={<Typography sx={{margin: 0}} variant="h4">Item 1.1</Typography>} selectedId={selectedId} onSelect={handleClick}>
                    <TreeViewItem id="1-3-1">Body 1.3.1</TreeViewItem>
                </TreeView>
                <TreeView id="1-4" content={<Typography sx={{margin: 0}} variant="h4">Item 1.2</Typography>} />
            </TreeView>
        );
    },
};
