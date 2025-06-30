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
import React from "react";
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentCard } from "./ComponentCard";
import { Typography } from "../Typography/Typography";
import { Icon } from "../Icon/Icon";

const meta = {
    component: ComponentCard,
    title: "ComponentCard",
} satisfies Meta<typeof ComponentCard>;
export default meta;

type Story = StoryObj<typeof ComponentCard>;

export const EditorCard: Story = {
    args: {
        id: "Test",
        isSelected: false,
        sx: {
            display: "flex",
            height: 50,
            width: 200,
            cursor: "pointer",
            borderRadius: 5,
            alignItems: "center",
            padding: 10,
            justifyContent: "left",
            marginRight: 16,
            marginBottom: 16,
            transition: "0.3s",
            border: "1px solid var(--vscode-editor-foreground)",
            "&:hover, &.active": {
                border: "1px solid var(--vscode-focusBorder)",
                backgroundColor: "var(--vscode-pickerGroup-border)",
                ".icon svg g": {
                    fill: "var(--vscode-editor-foreground)"
                }
            }
        },
        onClick: (e: any) => { console.log(e) }
    },
    render: args => (
        <ComponentCard {...args}>
            <Icon name="ArchitectureViewIcon" sx={{marginRight: 5}} />
            <Typography variant="h4">Test Component</Typography>
        </ComponentCard>
    ),
};

export const ChoreoCard: Story = {
    args: {
        id: "Test",
        isSelected: false,
        sx: { width: 900, height: 50 },
        onClick: (e: any) => { console.log(e) }
    },
    render: args => (
        <ComponentCard {...args}>
            <Icon name="ArchitectureViewIcon" sx={{marginRight: 5}} />
            <Typography variant="h4">Test Component</Typography>
        </ComponentCard>
    ),
};
