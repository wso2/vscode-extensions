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
import { Switch } from "./Swich";
import { Codicon } from "../Codicon/Codicon";

const checkedIcon = <Codicon name="star-full"/>;
const unCheckedIcon = <Codicon name="star-empty"/>;

const meta: Meta<typeof Switch> = {
    component: Switch,
    title: "Swich",
};
export default meta;

type Story = StoryObj<typeof Switch>;

export const WithIcon: Story = {
    render: () => {
        const [checked, setChecked] = React.useState(false);
        const toggleSelection = () => setChecked(!checked);
        return (
            <Switch leftLabel="OFF" rightLabel="ON" checked={checked} checkedIcon={checkedIcon} uncheckedIcon={unCheckedIcon} onChange={toggleSelection}/>
        );
    },
};

export const TransitionEnabledWithIcon: Story = {
    render: () => {
        const [checked, setChecked] = React.useState(false);
        const toggleSelection = () => setChecked(!checked);
        return (
            <Switch leftLabel="OFF" rightLabel="ON" checked={checked} checkedIcon={checkedIcon} uncheckedIcon={unCheckedIcon} enableTransition onChange={toggleSelection}/>
        );
    },
};

export const WithoutIcon: Story = {
    render: () => {
        const [checked, setChecked] = React.useState(false);
        const toggleSelection = () => setChecked(!checked);
        return (
            <Switch leftLabel="OFF" rightLabel="ON" checked={checked} onChange={toggleSelection}/>
        );
    },
};

export const WithDifferentColor: Story = {
    render: () => {
        const [checked, setChecked] = React.useState(false);
        const toggleSelection = () => setChecked(!checked);
        return (
            <Switch leftLabel="OFF" rightLabel="ON" checked={checked} checkedColor="var(--vscode-button-background)" onChange={toggleSelection}/>
        );
    },
};

export const WithDifferentColorWithIcon: Story = {
    render: () => {
        const [checked, setChecked] = React.useState(false);
        const toggleSelection = () => setChecked(!checked);
        return (
            <Switch leftLabel="OFF" rightLabel="ON" checked={checked} checkedColor="var(--vscode-button-background)" checkedIcon={checkedIcon} uncheckedIcon={unCheckedIcon} onChange={toggleSelection}/>
        );
    },
};
