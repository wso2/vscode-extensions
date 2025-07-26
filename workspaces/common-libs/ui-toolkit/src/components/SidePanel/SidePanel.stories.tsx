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
import { SidePanel } from "./SidePanel";
import { SidePanelBody, SidePanelTitleContainer } from "../../styles/SidePanel";
import { Button } from "../Button/Button";
import { Codicon } from "../Codicon/Codicon";
import { ActionButtons } from "../ActionButtons/ActionButtons";
import { colors } from "../Commons/Colors";

const meta: Meta<typeof SidePanel> = {
    component: SidePanel,
    title: "SidePanel",
};
export default meta;

type Story = StoryObj<typeof SidePanel>;

export const Default: Story = {
    render: () => {
        const [isOpen, setIsOpen] = React.useState(false);
        const openPanel = () => setIsOpen(!isOpen);
        const closePanel = () => setIsOpen(false);
        return (
            <>
                <div style={{ display: "flex", justifyContent: "center", cursor: "pointer", color: colors.editorForeground }} onClick={openPanel}>
                    Click to Open Side Panel
                </div>
                <SidePanel isOpen={isOpen} alignment="right" onClose={closePanel}>
                    <SidePanelTitleContainer>
                        <div>Side Panel Title</div>
                        <Button onClick={closePanel} appearance="icon"><Codicon name="close" /></Button>
                    </SidePanelTitleContainer>
                </SidePanel>
            </>
        );
    },
};

export const LeftSidePanel: Story = {
    render: () => {
        const [isOpen, setIsOpen] = React.useState(false);
        const openPanel = () => setIsOpen(!isOpen);
        const closePanel = () => setIsOpen(false);
        return (
            <>
                <div style={{ display: "flex", justifyContent: "center", cursor: "pointer", color: colors.editorForeground }} onClick={openPanel}>
                    Click to Open Side Panel
                </div>
                <SidePanel isOpen={isOpen} alignment="left" onClose={closePanel}>
                    <SidePanelTitleContainer>
                        <div>Side Panel Title</div>
                        <Button onClick={closePanel} appearance="icon"><Codicon name="close" /></Button>
                    </SidePanelTitleContainer>
                </SidePanel>
            </>
        );
    },
};

export const WithAnimation: Story = {
    render: () => {
        const [isOpen, setIsOpen] = React.useState(false);
        const openPanel = () => setIsOpen(!isOpen);
        const closePanel = () => setIsOpen(false);
        return (
            <>
                <div style={{ display: "flex", justifyContent: "center", cursor: "pointer", color: colors.editorForeground }} onClick={openPanel}>
                    Click to Open Side Panel
                </div>
                <SidePanel isOpen={isOpen} alignment="right" sx={{ transition: "all 0.3s ease-in-out" }} onClose={closePanel}>
                    <SidePanelTitleContainer>
                        <div>Side Panel Title</div>
                        <Button onClick={closePanel} appearance="icon"><Codicon name="close" /></Button>
                    </SidePanelTitleContainer>
                </SidePanel>
            </>
        );
    },
};

export const WithContent: Story = {
    render: () => {
        const [isOpen, setIsOpen] = React.useState(false);
        const openPanel = () => setIsOpen(!isOpen);
        const closePanel = () => setIsOpen(false);
        return (
            <>
                <div style={{ display: "flex", justifyContent: "center", cursor: "pointer", color: colors.editorForeground }} onClick={openPanel}>
                    Click to Open Side Panel
                </div>
                <SidePanel isOpen={isOpen} alignment="right" sx={{ transition: "all 0.3s ease-in-out" }} onClose={closePanel}>
                    <SidePanelTitleContainer>
                        <div>Side Panel Title</div>
                        <Button onClick={closePanel} appearance="icon"><Codicon name="close" /></Button>
                    </SidePanelTitleContainer>
                    <SidePanelBody>
                        <ActionButtons
                            primaryButton={{ text: "Save", onClick: () => console.log("Save Button Clicked"), tooltip: "Save Button" }}
                            secondaryButton={{ text: "Cancel", onClick: closePanel, tooltip: "Cancel Button" }}
                            sx={{ justifyContent: "flex-end" }}
                        />
                    </SidePanelBody>
                </SidePanel>
            </>
        );
    },
};
