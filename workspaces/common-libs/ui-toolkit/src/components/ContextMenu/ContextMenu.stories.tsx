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
import { ContextMenu } from "./ContextMenu";
import styled from "@emotion/styled";

const Container = styled.div`
    height: 100vh;
    width: 100vw;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const verticalIconStyles = {
    transform: "rotate(90deg)",
    ":hover": {
        backgroundColor: "var(--vscode-welcomePage-tileHoverBackground)",
    }
};

const rounderIconStyles = {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    transform: "rotate(90deg)",
    border: "1px solid var(--vscode-dropdown-border)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center"
};

const meta = {
    component: ContextMenu,
    title: "ContextMenu",
} satisfies Meta<typeof ContextMenu>;
export default meta;

type Story = StoryObj<typeof ContextMenu>;

export const HorizontalMenu: Story = {
    render: () => (
        <ContextMenu menuItems={[
            { id: "", label: <>Test Item</>, onClick: () => {console.log("Item Selected")} }
        ]}/>
    )
};

export const VerticalMenu: Story = {
    render: () => (
        <ContextMenu iconSx={verticalIconStyles} menuItems={[
            { id: "", label: <>Test Item</>, onClick: () => {console.log("Item Selected")} }
        ]}/>
    )
};

export const VerticalMenuWithCircularBorder: Story = {
    render: () => (
        <ContextMenu iconSx={rounderIconStyles} menuItems={[
            { id: "", label: <>Test Item</>, onClick: () => {console.log("Item Selected")} }
        ]}/>
    )
};

export const ContextMenuPosition: Story = {
    render: () => (
        <Container>
            <ContextMenu
                iconSx={verticalIconStyles}
                position="bottom-left"
                menuItems={[
                    { id: "1", label: <>Test Item 1</>, onClick: () => {console.log("Item 1 Selected")} },
                    { id: "2", label: <>Test Item 2</>, onClick: () => {console.log("Item 2 Selected")} }
                ]}
            />
        </Container>
    )
};

export const VerticalSubMenu: Story = {
    render: () => (
        <ContextMenu
            iconSx={verticalIconStyles}
            menuItems={[
                {
                    id: "",
                    label: <>Test Item 1</>,
                    onClick: () => {},
                    sunMenuItems: [
                        {
                            id: "",
                            label: <>Sub Menu Item 1</>,
                            onClick: () => {console.log("Sub Menu Item 1 Selected")}
                        },
                        {
                            id: "",
                            label: <>Sub Menu Item 2</>,
                            onClick: () => {console.log("Sub Menu Item 2 Selected")}
                        }
                    ]
                },
                { id: "", label: <>Test Item 2</>, onClick: () => {console.log("Item Selected")} },
                { id: "", label: <>Test Item 3</>, onClick: () => {console.log("Item Selected")} }
            ]}
        />
    )
};
