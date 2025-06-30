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
import { BreadcrumbProps, Breadcrumbs } from "./Breadcrumb";
import { Codicon } from "../Codicon/Codicon";

const meta = {
    component: Breadcrumbs,
    title: "Breadcrumb",
} satisfies Meta<typeof Breadcrumbs>;
export default meta;

type Story = StoryObj<typeof Breadcrumbs>;

export const Default: Story = {
    args: {
        maxItems: 3,
        separator: <Codicon name="chevron-right" />,
    },
    render: (args: BreadcrumbProps) => (
        <Breadcrumbs {...args}>
            <div key={1}>Home</div>
            <div key={2}>Products</div>
            <div key={3}>Category</div>
            <div key={4}>Sub Category</div>
            <div key={5}>Product</div>
        </Breadcrumbs>
    ),
};
