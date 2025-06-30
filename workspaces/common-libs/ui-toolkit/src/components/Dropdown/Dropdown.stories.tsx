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
import { Dropdown } from "./Dropdown";

const meta = {
    component: Dropdown,
    title: "Dropdown",
} satisfies Meta<typeof Dropdown>;
export default meta;

type Story = StoryObj<typeof Dropdown>;

export const Select: Story = {
    args: {
        id: "drop-down",
        label: "Test Dropdown",
        isLoading: false,
        value: "",
        items: [
            { id: "option-1", content: "Option 1", value: "op1" },
            { id: "option-2", content: "Option 2", value: "op2" },
            { id: "option-3", content: "Option 3", value: "op3" }
        ],
        description: "Test",
        onValueChange: (value: string) => { console.log(value); },
        errorMsg: "Error",
        disabled: false,
        isRequired: true
    },
    render: args => (
        <div style={{width: 300}}>
            <Dropdown {...args} ref={undefined}/>
        </div>
    ),
};
