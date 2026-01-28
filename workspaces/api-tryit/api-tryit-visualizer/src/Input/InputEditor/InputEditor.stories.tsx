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
import type { Meta, StoryObj } from '@storybook/react';
import { InputEditor } from './InputEditor';

const meta: Meta<typeof InputEditor> = {
    title: 'Input/InputEditor',
    component: InputEditor,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        value: {
            control: 'text',
            description: 'The text value to display in the editor',
        },
        minHeight: {
            control: 'text',
            description: 'The minimum height of the editor',
        },
        language: {
            control: 'select',
            options: ['json', 'javascript', 'typescript', 'xml', 'yaml'],
            description: 'The programming language for syntax highlighting',
        },
        theme: {
            control: 'select',
            options: ['vs-dark', 'vs-light'],
            description: 'The theme of the editor',
        },
        onChange: {
            action: 'changed',
            description: 'Callback when the editor value changes',
        },
        onMount: {
            action: 'mounted',
            description: 'Callback when the editor is mounted',
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        value: '{\n  "key": "value",\n  "array": [1, 2, 3]\n}',
        minHeight: '400px',
        language: 'json',
        onChange: (value: string | undefined) => console.log('Editor value changed:', value),
    },
};

export const JavaScript: Story = {
    args: {
        value: 'function hello() {\n  console.log("Hello, World!");\n}',
        minHeight: '300px',
        language: 'javascript',
        onChange: (value: string | undefined) => console.log('Editor value changed:', value),
    },
};

export const LightTheme: Story = {
    args: {
        value: '{\n  "example": "Light theme editor",\n  "data": [1, 2, 3]\n}',
        minHeight: '400px',
        language: 'json',
        theme: 'vs-light', // Explicitly set for story
        onChange: (value: string | undefined) => console.log('Editor value changed:', value),
    },
};

export const Empty: Story = {
    args: {
        value: '',
        minHeight: '300px',
        language: 'json',
        onChange: (value: string | undefined) => console.log('Editor value changed:', value),
    },
};

export const LargeHeight: Story = {
    args: {
        value: '{\n  "example": "This is a larger editor",\n  "data": {\n    "nested": true\n  }\n}',
        minHeight: '600px',
        language: 'json',
        onChange: (value: string | undefined) => console.log('Editor value changed:', value),
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
