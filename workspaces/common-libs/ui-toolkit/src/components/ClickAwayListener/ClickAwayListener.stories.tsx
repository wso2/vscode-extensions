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
import styled from "@emotion/styled";
import { ClickAwayListener } from "./ClickAwayListener";

const TextContainer = styled.div`
    border: 1px solid black;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100px;
    width: 200px;
`;

const meta = {
    component: ClickAwayListener,
    title: "ClickAwayListener",
} satisfies Meta<typeof ClickAwayListener>;
export default meta;

type Story = StoryObj<typeof ClickAwayListener>;

export const Example: Story = {
    render: () => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <ClickAwayListener onClickAway={() => setIsOpen(false)}>
                {isOpen && <TextContainer>Click Away</TextContainer>}
            </ClickAwayListener>
        );
    },
};
