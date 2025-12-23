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

import type { Meta, StoryObj } from '@storybook/react';
import { MainPanel } from './MainPanel';

const meta: Meta<typeof MainPanel> = {
    title: 'API TryIt/MainPanel',
    component: MainPanel,
    parameters: {
        layout: 'fullscreen',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MainPanel>;

export const Default: Story = {};

export const WithSelectedItem: Story = {
    play: async ({ canvasElement }) => {
        // Simulate API item selection
        window.postMessage({
            type: 'apiItemSelected',
            data: {
                label: 'GET /users',
                method: 'GET',
                type: 'endpoint',
                url: 'https://api.example.com/users'
            }
        }, '*');
    },
};

export const PostRequest: Story = {
    play: async ({ canvasElement }) => {
        // Simulate POST request selection
        window.postMessage({
            type: 'apiItemSelected',
            data: {
                label: 'POST /users',
                method: 'POST',
                type: 'endpoint',
                url: 'https://api.example.com/users'
            }
        }, '*');
    },
};

export const DeleteRequest: Story = {
    play: async ({ canvasElement }) => {
        // Simulate DELETE request selection
        window.postMessage({
            type: 'apiItemSelected',
            data: {
                label: 'DELETE /users/123',
                method: 'DELETE',
                type: 'endpoint',
                url: 'https://api.example.com/users/123'
            }
        }, '*');
    },
};
