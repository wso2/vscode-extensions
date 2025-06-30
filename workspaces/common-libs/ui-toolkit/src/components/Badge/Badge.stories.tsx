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
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from "./Badge";

const meta = {
    component: Badge,
    title: "Badge",
} satisfies Meta<typeof Badge>;
export default meta;

type Story = StoryObj<typeof Badge>;

export const InformationalBadge: Story = {
    args: { color: "#6C757D", children: "100" }
};

export const SuccessfulBadge: Story = {
    args: { color: "#28A745", children: "200" }
};

export const RedirectionBadge: Story = {
    args: { color: "#007aff", children: "200" }
};

export const ClientErrorBadge: Story = {
    args: { color: "#FFC107", children: "200" }
};

export const ServerErrorBadge: Story = {
    args: { color: "#f93E3E", children: "500" }
};
