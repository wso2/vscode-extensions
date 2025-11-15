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
import { Meta, StoryObj } from "@storybook/react";
import { Stepper } from "./Stepper";

const defaultSteps = [
    "Create Test Component",
    "Add Component",
    "Select Git Repo",
    "Verify Information"
];

const meta: Meta<typeof Stepper> = {
    component: Stepper,
    title: "Stepper",
};
export default meta;

type Story = StoryObj<typeof Stepper>;

export const CenterAligned: Story = {
    args: { steps: defaultSteps, currentStep: 3 },
};

export const LeftAligned: Story = {
    args: { steps: defaultSteps, currentStep: 0, alignment: "flex-start" },
};

export const RightAligned: Story = {
    args: { steps: defaultSteps, currentStep: 2, alignment: "flex-end", variant: "bottom" },
};
