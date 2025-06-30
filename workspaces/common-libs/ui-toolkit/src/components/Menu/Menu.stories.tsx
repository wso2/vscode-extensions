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
import { Item, Menu } from "./Menu";
import { MenuItem } from "./MenuItem";

const items: Item[] = [
    {id: "test", label: <>Test Item</>, onClick: () => {console.log("Item Selected")}, disabled: false},
    {id: "test2", label: <>Test Item 2</>, onClick: () => {console.log("Item Selected")}, disabled: false}
];

const meta = {
    component: Menu,
    title: "Menu",
} satisfies Meta<typeof Menu>;
export default meta;

type Story = StoryObj<typeof Menu>;

export const MenuC: Story = {
    args: { id: "menu" },
    render: args => (
        <Menu {...args}>
            {items.map((item: Item) => (
                <MenuItem key={`item ${item.id}`} item={item} onClick={() => {console.log(`Clicked Item ${item.id}`)}} />
            ))}
        </Menu>
    ),
};
