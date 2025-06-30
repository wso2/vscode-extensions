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
import { Tooltip } from "./Tooltip";
import styled from "@emotion/styled";

const Container = styled.div`
    height: 100vh;
    width: 100vw;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const TextContainer = styled.div`
    border: 1px solid black;
    padding: 10px;
`;

const LargeTextContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 90vw;
    height: 90vh;
    border: 1px solid black;
`;

const LargeTooltipContent = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 200px;
    height: 100px;
`;

const meta: Meta<typeof Tooltip> = {
    component: Tooltip,
    title: "Tooltip",
};
export default meta;

type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
    render: args =>
        <Container>
            <Tooltip {...args}>
                <TextContainer>Hover Over Me</TextContainer>
            </Tooltip>
        </Container>,
    args: { content: "Tooltip Content", position: "bottom" },
};

export const TooltipWithOffset: Story = {
    render: args =>
        <Container>
            <Tooltip {...args}>
                <TextContainer>Hover Over Me</TextContainer>
            </Tooltip>
        </Container>,
    args: { content: "Tooltip Content", position: "bottom", offset: { top: 16, left: 20 } },
};

const TooltipContent = () => <LargeTooltipContent>Tooltip Content</LargeTooltipContent>;

export const Overflow: Story = {
    render: args =>
        <Tooltip {...args}>
            <LargeTextContainer>Hover Over Me</LargeTextContainer>
        </Tooltip>,
    args: { content: <TooltipContent />, position: "bottom" },
};
