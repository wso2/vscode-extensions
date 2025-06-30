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
import { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs } from './Tabs';
import { Button } from '../Button/Button';
import { Codicon } from '../Codicon/Codicon';

const meta: Meta<typeof Tabs> = {
    component: Tabs,
    title: 'Tabs',
};
export default meta;

type Story = StoryObj<typeof Tabs>;

export const ViewSelector: Story = {
    render: () => {
        const [selectedId, setSelectedId] = React.useState<string | null>('1');
        const handleClick = (id: string) => setSelectedId(id);
        return (
            <Tabs
                views={[
                    { id: '1', name: 'View 1' },
                    { id: '2', name: 'View 2' },
                    { id: '3', name: 'View 3' },
                ]}
                currentViewId={selectedId}
                onViewChange={handleClick}
            >
                <div id="1">Hello View 1</div>
                <div id="2">Hello View 2</div>
                <div id="3">Hello View 3</div>
            </Tabs>
        );
    },
};

export const ViewSelectorWithMoreOptions: Story = {
    render: () => {
        const [selectedId, setSelectedId] = React.useState<string | null>('1');
        const handleClick = (id: string) => setSelectedId(id);
        return (
            <Tabs
                views={[
                    {
                        id: '1',
                        name: 'View 1',
                        moreOptions: (
                            <Button buttonSx={{ height: 15, marginLeft: 4, color: 'var(--vscode-focusBorder)' }} appearance='icon'>
                                <Codicon name='ellipsis' />
                            </Button>
                        ),
                    },
                    { id: '2', name: 'View 2' },
                    { id: '3', name: 'View 3' },
                ]}
                currentViewId={selectedId}
                onViewChange={handleClick}
            >
                <div id="1">Hello View 1</div>
                <div id="2">Hello View 2</div>
                <div id="3">Hello View 3</div>
            </Tabs>
        );
    },
};
