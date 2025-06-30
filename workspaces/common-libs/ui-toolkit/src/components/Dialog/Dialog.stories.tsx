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
import { Dialog } from "./Dialog";
import { Button } from "../Button/Button";

const meta = {
    component: Dialog,
    title: "Dialog",
} satisfies Meta<typeof Dialog>;
export default meta;

type Story = StoryObj<typeof Dialog>;

export const DialogBox: Story = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);
        const openDialog = () => {
            setIsOpen(!isOpen);
        };
        const handleOnClose = () => {
            setIsOpen(false);
            console.log("Dialog Closed");
        };
        return (
            <>
                <Button appearance="primary" onClick={openDialog}> Dialog </Button>
                <Dialog isOpen={isOpen} onClose={handleOnClose}>
                    Hello World
                </Dialog>
            </>
        );
    },
};
