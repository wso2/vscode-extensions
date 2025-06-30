/*
 *  Copyright (c) 2025, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
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
import React from "react";
import { Meta, StoryObj } from "@storybook/react-vite";
import { TruncatedLabel } from "./TruncatedLabel";

const meta: Meta<typeof TruncatedLabel> = {
    component: TruncatedLabel,
    title: "TruncatedLabel",
};
export default meta;

type Story = StoryObj<typeof TruncatedLabel>;

export const Default: Story = {
    render: () => (
        <TruncatedLabel style={{ width: "50px" }}>
            <span>Truncated</span>
            <span>Label Content</span>
        </TruncatedLabel>
    ),
};
