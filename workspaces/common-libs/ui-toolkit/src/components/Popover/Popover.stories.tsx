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
import { Popover } from "./Popover";
import styled from "@emotion/styled";

const popOverStyle = {
    backgroundColor: "white",
    border: "1px solid black",
    padding: "10px",
    borderRadius: "5px",
    display: "flex",
    flexDirection: "column",
    maxWidth: "280px",
    gap: "8px",
};

const TextContainer = styled.div`
    width: fit-content;
    padding: 16px;
    border: 1px solid black;
`;

const meta = {
    component: Popover,
    title: "Popover",
} satisfies Meta<typeof Popover>;
export default meta;

type Story = StoryObj<typeof Popover>;

export const PopoverDefault: Story = {
    args: {
        anchorOrigin: {
            vertical: "bottom",
            horizontal: "center",
        },
        transformOrigin: {
            vertical: "center",
            horizontal: "left",
        },
        sx: popOverStyle,
    },
    render: args => {
        const [isOpen, setIsOpen] = useState(false);
        const [anchorEvent, setAnchorEvent] = useState<null | HTMLElement>(null);
        const openPanel = (event: React.MouseEvent<HTMLElement>) => {
            setIsOpen(true);
            setAnchorEvent(event.currentTarget);
        };
        const closePanel = () => {
            setIsOpen(false);
            setAnchorEvent(null);
        };
        return (
            <>
                <TextContainer onMouseOver={openPanel} onMouseLeave={closePanel}> Hover Over </TextContainer>
                <Popover {...args} open={isOpen} anchorEl={anchorEvent}>
                    <div>Test Content</div>
                </Popover>
            </>
        );
    },
};
