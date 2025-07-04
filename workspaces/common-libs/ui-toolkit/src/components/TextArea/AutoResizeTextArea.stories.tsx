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
import { AutoResizeTextArea } from './TextArea';

const meta: Meta<typeof AutoResizeTextArea> = {
    title: 'Auto Resize Text Area',
    component: AutoResizeTextArea,
};
export default meta;

type Story = StoryObj<typeof AutoResizeTextArea>;

export const Default: Story = {
    render: () => {
        const [value, setValue] = React.useState<string>('Hello ${world}Hello ${world}Hello ${world}Hello ${world}Hello ${world}Hello ${world}Hello ${world}Hello ${world}');
        return (
            <div style={{ width: '300px' }}>
                <AutoResizeTextArea
                    value={value}
                    growRange={{ start: 1, offset: 5 }}
                    onChange={e => setValue(e.target.value)}
                />
            </div>
        );
    },
};
