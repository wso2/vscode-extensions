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
import { Grid } from "./Grid";
import { GridItem } from "./GridItem";

interface Item {
    id: number | string;
    label: React.ReactNode;
    onClick: () => void;
}
  
const items: Item[] = [
    {id: "i1", label: <>Item 1</>, onClick: () => {console.log("Item1 Selected")}},
    {id: "i2", label: <>Item 2</>, onClick: () => {console.log("Item2 Selected")}},
    {id: "i3", label: <>Item 3</>, onClick: () => {console.log("Item3 Selected")}},
    {id: "i4", label: <>Item 4</>, onClick: () => {console.log("Item4 Selected")}},
    {id: "i5", label: <>Item 5</>, onClick: () => {console.log("Item5 Selected")}},
    {id: "i6", label: <>Item 6</>, onClick: () => {console.log("Item6 Selected")}}
];

const meta = {
    component: Grid,
    title: "Grid",
} satisfies Meta<typeof Grid>;
export default meta;

type Story = StoryObj<typeof Grid>;

export const GridC: Story = {
    args: { columns: 3 },
    render: args => (
        <Grid {...args}>
            {items.map(item => (
                <GridItem
                    id={item.id}
                    key={item.id}
                    onClick={item.onClick}
                    sx={{color: 'var(--foreground)'}}
                >
                    {item.label}
                </GridItem>
            ))}
        </Grid>
    ),
};
