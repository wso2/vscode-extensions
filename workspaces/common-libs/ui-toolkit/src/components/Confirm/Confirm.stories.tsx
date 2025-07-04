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
import { Confirm } from "./Confirm";
import { Button } from "../Button/Button";

const meta = {
    component: Confirm,
    title: "Confirm",
} satisfies Meta<typeof Confirm>;
export default meta;

type Story = StoryObj<typeof Confirm>;

export const ConfirmDefault: Story = {
    args: {
        message: "Modifying the output type will reset the function body. Are you sure you want to proceed?",
        confirmText: "Okay",
        anchorOrigin: {
            vertical: "bottom",
            horizontal: "right",
        },
        transformOrigin: {
            vertical: "top",
            horizontal: "left",
        },
    },
    render: args => {
        const [isOpen, setIsOpen] = useState(false);
        const [anchorEvent, setAnchorEvent] = useState<null | HTMLElement>(null);
        const openPanel = (event: React.MouseEvent<HTMLElement | SVGSVGElement>) => {
            setIsOpen(true);
            setAnchorEvent(event.currentTarget as HTMLElement);
        };

        const handleConfirm = (status: boolean) => {
            console.log(status);
            setIsOpen(false);
            setAnchorEvent(null);
        };

        return (
            <>
                <Button onClick={e => openPanel(e)}> Confirm Me! </Button>
                <Confirm {...args} isOpen={isOpen} anchorEl={anchorEvent} onConfirm={handleConfirm} />
            </>
        );
    },
};
