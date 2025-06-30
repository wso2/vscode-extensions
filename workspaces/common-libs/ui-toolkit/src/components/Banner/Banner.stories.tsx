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
import { Banner } from "./Banner";
import { Codicon } from "../Codicon/Codicon";

const meta = {
    component: Banner,
    title: "Banner",
} satisfies Meta<typeof Banner>;
export default meta;

type Story = StoryObj<typeof Banner>;

export const BannerWithoutTitle: Story = {
    args: {
        icon: <Codicon iconSx={{ fontSize: 18 }} name="info" />, 
        message: "This is a sample banner without title",
        onClose: () => {console.log("Banner closed")}
    }
};

export const InfoBanner: Story = {
    args: {
        icon: <Codicon iconSx={{ fontSize: 18 }} name="info" />, 
        type: "info",
        message: "This is a sample info banner"
    }
};

export const ErrorBanner: Story = {
    args: {
        icon: <Codicon iconSx={{ fontSize: 18 }} name="error" />, 
        type: "error",
        message: "This is a sample error banner",
        title: "Error Banner"
    }
};

export const SuccessBanner: Story = {
    args: {
        icon: <Codicon iconSx={{ fontSize: 18 }} name="check" />, 
        type: "success",
        message: "This is a sample success banner",
        title: "Success Banner",
        onClose: undefined
    }
};

export const WarningBanner: Story = {
    args: {
        icon: <Codicon iconSx={{ fontSize: 18 }} name="warning" />, 
        type: "warning",
        message: "This is a sample warning banner",
        title: "Warning Banner",
        onClose: undefined
    }
};
