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
import { PullUpButton } from "./PullUPButton";
import styled from "@emotion/styled";
import { Button } from "../Button/Button";

const meta = {
    component: PullUpButton,
    title: 'PullUpButton',
} satisfies Meta<typeof PullUpButton>;
export default meta;

const Container = styled.div`
    min-height: 500px;
`;

const options = ["Option 1", "Option 2", "Option 3"];

type Story = StoryObj<typeof PullUpButton>;

export const PullDownButton: Story = {
    render: () => {
        const [, setValues] = useState<string[]>(options);
        return (
            <Container>
                <PullUpButton options={options} onOptionChange={setValues}>
                    <Button appearance={"primary"}>
                        Add More
                    </Button>
                </PullUpButton>
            </Container>
        );
    }
};

export const PullDownButtonSingleOptionStory: Story = {
    render: () => {
        const [values, setValues] = useState<string[]>(options);
        const handleOptionChange = (options: string[]) => {
            console.log("Selected Options: ", options);
            setValues(options);
        };
        return (
            <Container>
                <PullUpButton options={options} selectSingleOption selectedOptions={values} onOptionChange={handleOptionChange}>
                    <Button appearance={"primary"}>
                        Add More
                    </Button>
                </PullUpButton>
            </Container>
        );
    }
};
