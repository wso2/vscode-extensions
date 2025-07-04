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
import { SplitView } from "./SplitView";
import styled from "@emotion/styled";

const Container = styled.div`
    min-height: 500px;
`;

const meta: Meta<typeof SplitView> = {
    component: SplitView,
    title: "SplitView",
};
export default meta;

type Story = StoryObj<typeof SplitView>;

export const Default: Story = {
    render: () => (
        <Container>
            <SplitView sx={{ height: "100vh" }}>
                <div><h1>Div1</h1></div>
                <div><h1>Div2</h1></div>
                <div><h1>Div3</h1></div>
            </SplitView>
        </Container>
    ),
};
