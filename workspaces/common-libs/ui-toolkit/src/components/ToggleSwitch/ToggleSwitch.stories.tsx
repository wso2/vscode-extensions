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
import { Meta, StoryObj } from "@storybook/react-vite";
import { ToggleSwitch } from "./ToggleSwitch";

const meta: Meta<typeof ToggleSwitch> = {
    component: ToggleSwitch,
    title: "ToggleSwitch",
};
export default meta;

type Story = StoryObj<typeof ToggleSwitch>;

export const Default: Story = {
    render: () => {
        const [checked, setChecked] = React.useState(false);
        const toggleSelection = () => setChecked(!checked);
        return <ToggleSwitch checked={checked} onChange={toggleSelection} sx={{ fontSize: 10 }} />;
    },
};
