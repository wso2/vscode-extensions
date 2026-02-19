/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import React, { useState } from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { DirectorySelector, DirectorySelectorProps } from './DirectorySelector';

const meta: Meta<typeof DirectorySelector> = {
    title: 'Components/DirectorySelector',
    component: DirectorySelector,
    tags: ['autodocs'],
    argTypes: {
        label: {
            control: 'text',
            description: 'Label text for the directory selector',
        },
        placeholder: {
            control: 'text',
            description: 'Placeholder text shown in the input field',
        },
        selectedPath: {
            control: 'text',
            description: 'Currently selected directory path',
        },
        required: {
            control: 'boolean',
            description: 'Whether the field is required',
        },
        description: {
            control: 'text',
            description: 'Helper text shown below the label',
        },
        errorMsg: {
            control: 'text',
            description: 'Error message to display',
        },
    },
};

export default meta;
type Story = StoryObj<typeof DirectorySelector>;

const DirectorySelectorWithState = (args: DirectorySelectorProps) => {
    const [selectedPath, setSelectedPath] = useState(args.selectedPath || '');

    const handleSelect = () => {
        // Simulating a directory selection via browse button
        setSelectedPath('/Users/username/projects/my-project');
    };

    const handleChange = (value: string) => {
        // Handle manual text input
        setSelectedPath(value);
    };

    return (
        <DirectorySelector
            {...args}
            selectedPath={selectedPath}
            onSelect={handleSelect}
            onChange={handleChange}
        />
    );
};

export const Default: Story = {
    render: (args: DirectorySelectorProps) => <DirectorySelectorWithState {...args} />,
    args: {
        label: 'Select Path',
        placeholder: 'Enter path or browse to select a folder...',
    },
};

export const WithSelectedPath: Story = {
    render: (args: DirectorySelectorProps) => <DirectorySelectorWithState {...args} />,
    args: {
        label: 'Select Path',
        placeholder: 'Enter path or browse to select a folder...',
        selectedPath: '/Users/username/projects/my-project',
    },
};

export const Required: Story = {
    render: (args: DirectorySelectorProps) => <DirectorySelectorWithState {...args} />,
    args: {
        label: 'Select Path',
        placeholder: 'Enter path or browse to select a folder...',
        required: true,
    },
};

export const WithDescription: Story = {
    render: (args: DirectorySelectorProps) => <DirectorySelectorWithState {...args} />,
    args: {
        label: 'Select Path',
        placeholder: 'Enter path or browse to select a folder...',
        description: 'Select the directory where you want to create your project',
    },
};

export const WithError: Story = {
    render: (args: DirectorySelectorProps) => <DirectorySelectorWithState {...args} />,
    args: {
        label: 'Select Path',
        placeholder: 'Enter path or browse to select a folder...',
        errorMsg: 'This directory does not exist or you do not have permission to access it',
    },
};

export const Complete: Story = {
    render: (args: DirectorySelectorProps) => <DirectorySelectorWithState {...args} />,
    args: {
        label: 'Project Directory',
        placeholder: 'Enter path or browse to select a folder...',
        selectedPath: '/Users/username/projects/my-project',
        required: true,
        description: 'Select the directory where you want to create your project',
    },
};
