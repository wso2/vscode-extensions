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
import React, { useState } from "react";
import type { Meta, StoryObj } from '@storybook/react-vite';
import { MultiSelect as MS } from "./MultiSelect";
import { Codicon } from "../Codicon/Codicon";

const meta = {
    component: MS,
    title: "MultiSelect",
} satisfies Meta<typeof MS>;
export default meta;

type Story = StoryObj<typeof MS>;

export const MultiSelectDefault: Story = {
    render: () => {
        const [values, setValues] = useState<string[]>(["option1", "option2"]);
        const onChangeValues = (values: string[]) => {
            setValues(values);
        };
        return (
            <MS options={["option1", "option2", "option3", "option4", "option5", "option6"]} values={values} onChange={onChangeValues} />
        );
    }
};

const displayValue = (
    <div style={{display: "flex", flexDirection: "row", height: 30}}>
        <Codicon sx={{height: 30, width: 30}} iconSx={{fontSize: 30, height: 30, width: 30}} name="globe" />
        <Codicon sx={{marginTop: 5}} name="chevron-down" iconSx={{fontWeight: 800}} />
    </div>
);

export const MultiSelectWithDisplayValue: Story = {
    render: () => {
        const [values, setValues] = useState<string[]>([]);
        const onChangeValues = (values: string[]) => {
            setValues(values);
        };
        return (
            <MS options={["option1", "option2", "option3", "option4", "option5", "option6"]} displayValue={displayValue} values={values} onChange={onChangeValues} />
        );
    }
};
