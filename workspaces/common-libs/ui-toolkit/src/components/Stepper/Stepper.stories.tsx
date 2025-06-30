/*
 *  Copyright (c) 2023, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 *  This software is the property of WSO2 LLC. and its suppliers, if any.
 *  Dissemination of any information or reproduction of any material contained
 *  herein is strictly forbidden, unless permitted by WSO2 in accordance with
 *  the WSO2 Commercial License available at http://wso2.com/licenses.
 *  For specific language governing the permissions and limitations under
 *  this license, please see the license as well as any agreement you’ve
 *  entered into with WSO2 governing the purchase of this software and any
 *  associated services.
 */
import { Meta, StoryObj } from "@storybook/react-vite";
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
