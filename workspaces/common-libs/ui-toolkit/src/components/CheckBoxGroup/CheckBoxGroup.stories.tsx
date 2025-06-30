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
import { CheckBox, CheckBoxGroup, CheckBoxGroupProps } from "./CheckBoxGroup";
import styled from "@emotion/styled";

const Container = styled.div`
    display: flex;
    gap: 20px;
`;

const meta = {
    component: CheckBoxGroup,
    title: "CheckBoxGroup",
} satisfies Meta<typeof CheckBoxGroup>;
export default meta;

type Story = StoryObj<typeof CheckBoxGroup>;

export const Default: Story = {
    args: {
        direction: "horizontal",
    },
    render: (args: CheckBoxGroupProps) => {
        const [values, setValues] = React.useState({
            option1: true,
            option2: false,
            option3: true,
            option4: false,
            option5: false,
        });

        return (
            <Container>
                <CheckBoxGroup {...args}>
                    <CheckBox label="Option 1" value="option-1" checked={values.option1} onChange={(checked: boolean) => setValues({ ...values, option1: checked })} />
                    <CheckBox label="Option 2" value="option-2" checked={values.option2} onChange={(checked: boolean) => setValues({ ...values, option2: checked })} />
                    <CheckBox label="Option 3" value="option-3" checked={values.option3} onChange={(checked: boolean) => setValues({ ...values, option3: checked })} />
                    <CheckBox label="Option 4" value="option-4" checked={values.option4} onChange={(checked: boolean) => setValues({ ...values, option4: checked })} />
                    <CheckBox label="Option 5" value="option-5" checked={values.option5} onChange={(checked: boolean) => setValues({ ...values, option5: checked })} />
                </CheckBoxGroup>
            </Container>
        );
    },
};
