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
import { Drawer } from "./Drawer";
import { Button } from "../Button/Button";
import { SidePanel } from "../SidePanel/SidePanel";
import { SidePanelTitleContainer } from "../../styles";
import { Codicon } from "../Codicon/Codicon";
import { Breadcrumbs } from "../Breadcrumb/Breadcrumb";
import styled from "@emotion/styled";

const DrawerContainer = styled.div`
    width: 300px;
`;

const drawersTitles = ["Drawer1", "Drawer2", "Drawer3"];

const meta = {
    title: 'Components/Drawer',
    component: Drawer,
} satisfies Meta<typeof Drawer>;
export default meta;

type Story = StoryObj<typeof Drawer>;

export const DrawerDefault: Story = {
    parameters: { layout: 'fullscreen' },
    render: () => {
        const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(true);
        const [openedIndex, setOpenedIndex] = useState<number>();

        const closeSidePanel = () => {
            setIsSidePanelOpen(false);
        };

        const openDrawer = (index: number) => {
            setOpenedIndex(index);
        };

        const closeDrawer = (index: number) => {
            if (index === 0) {
                setOpenedIndex(undefined);
            } else {
                setOpenedIndex(index - 1);
            }
        };

        return (
            <>
                <SidePanel isOpen={isSidePanelOpen} width={300}>
                    {openedIndex !== undefined ? (
                        <Breadcrumbs>
                            {drawersTitles.slice(0, openedIndex + 1).map((element, index) => (
                                <div key={element} onClick={() => openDrawer(index)}>
                                    {element}
                                </div>
                            ))}
                        </Breadcrumbs>
                    ) : null}
                    <SidePanelTitleContainer>
                        <div>Side Panel Title</div>
                        <Button onClick={closeSidePanel} appearance="icon"><Codicon name="close" /></Button>
                    </SidePanelTitleContainer>

                    <Drawer
                        isOpen={openedIndex === 0}
                        id="drawer1"
                        width={300}
                        isSelected={true}
                        sx={{ width: 300 }}
                    >
                        <DrawerContainer>
                            Drawer1 Content
                            <Button onClick={() => openDrawer(1)}>Add</Button>
                            <Button onClick={() => closeDrawer(0)}>Close</Button>
                        </DrawerContainer>
                    </Drawer>
                    <Drawer
                        isOpen={openedIndex === 1}
                        id="drawer2"
                        isSelected={true}
                    >
                        <DrawerContainer>
                            Drawer2 Content
                            <Button onClick={() => openDrawer(2)}>Add</Button>
                            <Button onClick={() => closeDrawer(1)}>Close</Button>
                        </DrawerContainer>
                    </Drawer>
                    <Drawer
                        isOpen={openedIndex === 2}
                        id="drawer3"
                        isSelected={true}
                    >
                        <DrawerContainer>
                            Drawer3 Content
                            <Button onClick={() => closeDrawer(2)}>Close</Button>
                        </DrawerContainer>
                    </Drawer>
                    <Button onClick={() => openDrawer(0)}>Add</Button>
                </SidePanel>
            </>
        );
    },
};
